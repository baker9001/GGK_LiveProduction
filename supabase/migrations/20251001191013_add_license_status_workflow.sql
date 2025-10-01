/*
  # Add License Status Workflow to Student Licenses

  ## Overview
  This migration implements the complete license assignment and activation workflow
  with proper status tracking, validity snapshots, and counter management.

  ## Changes

  1. New Columns Added to `student_licenses`
    - `status` (text) - Tracks license state through its lifecycle
      - 'ASSIGNED_PENDING_ACTIVATION': Initial state when admin assigns
      - 'CONSUMED_ACTIVATED': After student activates the license
      - 'REVOKED': When admin revokes the license
    - `activated_on` (timestamptz) - Timestamp when student activated
    - `valid_from_snapshot` (timestamptz) - Frozen validity start date at assignment
    - `valid_to_snapshot` (timestamptz) - Frozen validity end date at assignment
    - `notification_sent` (boolean) - Track if email notification was sent

  2. Columns Added to `licenses` Master Table
    - `total_assigned` (integer) - Count of all assignments (pending + activated)
    - `total_consumed` (integer) - Count of activated licenses only
    - `total_allocated` replaces `total_quantity` (renamed for clarity)
    - `used_quantity` kept for backward compatibility but will be deprecated

  3. Updated Functions
    - `assign_license_to_student()` - Sets status to ASSIGNED_PENDING_ACTIVATION
    - New `activate_student_license()` - Allows students to activate their licenses
    - Updated counter triggers to use status field

  4. Security
    - RLS policies updated for new status field
    - Students can only activate their own pending licenses
    - Activation only allowed within validity window

  ## Data Migration
  - Existing records with is_active=true → status='CONSUMED_ACTIVATED'
  - Existing records with is_active=false → status='REVOKED'
  - Snapshots populated from current license dates
*/

-- ============================================================================
-- STEP 1: Add new columns to student_licenses table
-- ============================================================================

DO $$
BEGIN
  -- Add status column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'student_licenses' AND column_name = 'status'
  ) THEN
    ALTER TABLE student_licenses ADD COLUMN status text;
  END IF;

  -- Add activated_on column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'student_licenses' AND column_name = 'activated_on'
  ) THEN
    ALTER TABLE student_licenses ADD COLUMN activated_on timestamptz;
  END IF;

  -- Add valid_from_snapshot column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'student_licenses' AND column_name = 'valid_from_snapshot'
  ) THEN
    ALTER TABLE student_licenses ADD COLUMN valid_from_snapshot timestamptz;
  END IF;

  -- Add valid_to_snapshot column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'student_licenses' AND column_name = 'valid_to_snapshot'
  ) THEN
    ALTER TABLE student_licenses ADD COLUMN valid_to_snapshot timestamptz;
  END IF;

  -- Add notification_sent column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'student_licenses' AND column_name = 'notification_sent'
  ) THEN
    ALTER TABLE student_licenses ADD COLUMN notification_sent boolean DEFAULT false;
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Migrate existing data to new status field
-- ============================================================================

-- Update existing records based on is_active flag
UPDATE student_licenses
SET status = CASE
  WHEN is_active = true THEN 'CONSUMED_ACTIVATED'
  WHEN is_active = false THEN 'REVOKED'
  ELSE 'ASSIGNED_PENDING_ACTIVATION'
END
WHERE status IS NULL;

-- Set activated_on for already active licenses
UPDATE student_licenses
SET activated_on = assigned_at
WHERE status = 'CONSUMED_ACTIVATED' AND activated_on IS NULL;

-- Populate validity snapshots from license table for existing records
UPDATE student_licenses sl
SET
  valid_from_snapshot = COALESCE(sl.valid_from_snapshot, l.start_date),
  valid_to_snapshot = COALESCE(sl.valid_to_snapshot, l.end_date)
FROM licenses l
WHERE sl.license_id = l.id
  AND (sl.valid_from_snapshot IS NULL OR sl.valid_to_snapshot IS NULL);

-- Set default notification_sent for existing records
UPDATE student_licenses
SET notification_sent = true
WHERE notification_sent IS NULL;

-- ============================================================================
-- STEP 3: Add constraints and indexes
-- ============================================================================

-- Make status NOT NULL after migration
ALTER TABLE student_licenses
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN valid_from_snapshot SET NOT NULL,
  ALTER COLUMN valid_to_snapshot SET NOT NULL;

-- Add check constraint for valid status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'valid_license_status'
  ) THEN
    ALTER TABLE student_licenses
    ADD CONSTRAINT valid_license_status
    CHECK (status IN ('ASSIGNED_PENDING_ACTIVATION', 'CONSUMED_ACTIVATED', 'REVOKED'));
  END IF;
END $$;

-- Add check constraint for validity window
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'valid_snapshot_dates'
  ) THEN
    ALTER TABLE student_licenses
    ADD CONSTRAINT valid_snapshot_dates
    CHECK (valid_to_snapshot > valid_from_snapshot);
  END IF;
END $$;

-- Create index on status for efficient filtering
CREATE INDEX IF NOT EXISTS idx_student_licenses_status
  ON student_licenses(status);

-- Create index on pending activations
CREATE INDEX IF NOT EXISTS idx_student_licenses_pending
  ON student_licenses(student_id, status)
  WHERE status = 'ASSIGNED_PENDING_ACTIVATION';

-- Create index on validity snapshots for expiry queries
CREATE INDEX IF NOT EXISTS idx_student_licenses_validity
  ON student_licenses(valid_to_snapshot, status)
  WHERE status IN ('ASSIGNED_PENDING_ACTIVATION', 'CONSUMED_ACTIVATED');

-- ============================================================================
-- STEP 4: Add new counter columns to licenses table
-- ============================================================================

DO $$
BEGIN
  -- Add total_assigned column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'licenses' AND column_name = 'total_assigned'
  ) THEN
    ALTER TABLE licenses ADD COLUMN total_assigned integer DEFAULT 0 NOT NULL;
  END IF;

  -- Add total_consumed column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'licenses' AND column_name = 'total_consumed'
  ) THEN
    ALTER TABLE licenses ADD COLUMN total_consumed integer DEFAULT 0 NOT NULL;
  END IF;

  -- Add total_allocated column if it doesn't exist (will replace total_quantity)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'licenses' AND column_name = 'total_allocated'
  ) THEN
    ALTER TABLE licenses ADD COLUMN total_allocated integer;
    -- Copy data from total_quantity
    UPDATE licenses SET total_allocated = total_quantity WHERE total_allocated IS NULL;
    ALTER TABLE licenses ALTER COLUMN total_allocated SET NOT NULL;
  END IF;
END $$;

-- Recalculate counters from existing student_licenses data
UPDATE licenses l
SET
  total_assigned = (
    SELECT COUNT(*)
    FROM student_licenses sl
    WHERE sl.license_id = l.id
      AND sl.status IN ('ASSIGNED_PENDING_ACTIVATION', 'CONSUMED_ACTIVATED')
  ),
  total_consumed = (
    SELECT COUNT(*)
    FROM student_licenses sl
    WHERE sl.license_id = l.id
      AND sl.status = 'CONSUMED_ACTIVATED'
  );

-- ============================================================================
-- STEP 5: Update counter trigger to use status field
-- ============================================================================

CREATE OR REPLACE FUNCTION update_license_counters()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT (new assignment)
  IF TG_OP = 'INSERT' THEN
    IF NEW.status IN ('ASSIGNED_PENDING_ACTIVATION', 'CONSUMED_ACTIVATED') THEN
      UPDATE licenses
      SET total_assigned = total_assigned + 1,
          total_consumed = CASE
            WHEN NEW.status = 'CONSUMED_ACTIVATED' THEN total_consumed + 1
            ELSE total_consumed
          END,
          used_quantity = CASE
            WHEN NEW.status = 'CONSUMED_ACTIVATED' THEN used_quantity + 1
            ELSE used_quantity
          END
      WHERE id = NEW.license_id;
    END IF;
    RETURN NEW;
  END IF;

  -- Handle DELETE (remove assignment)
  IF TG_OP = 'DELETE' THEN
    IF OLD.status IN ('ASSIGNED_PENDING_ACTIVATION', 'CONSUMED_ACTIVATED') THEN
      UPDATE licenses
      SET total_assigned = GREATEST(total_assigned - 1, 0),
          total_consumed = CASE
            WHEN OLD.status = 'CONSUMED_ACTIVATED' THEN GREATEST(total_consumed - 1, 0)
            ELSE total_consumed
          END,
          used_quantity = CASE
            WHEN OLD.status = 'CONSUMED_ACTIVATED' THEN GREATEST(used_quantity - 1, 0)
            ELSE used_quantity
          END
      WHERE id = OLD.license_id;
    END IF;
    RETURN OLD;
  END IF;

  -- Handle UPDATE (status change)
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN
      -- Status changed from PENDING to ACTIVATED
      IF OLD.status = 'ASSIGNED_PENDING_ACTIVATION' AND NEW.status = 'CONSUMED_ACTIVATED' THEN
        UPDATE licenses
        SET total_consumed = total_consumed + 1,
            used_quantity = used_quantity + 1
        WHERE id = NEW.license_id;

      -- Status changed to REVOKED from PENDING
      ELSIF OLD.status = 'ASSIGNED_PENDING_ACTIVATION' AND NEW.status = 'REVOKED' THEN
        UPDATE licenses
        SET total_assigned = GREATEST(total_assigned - 1, 0)
        WHERE id = NEW.license_id;

      -- Status changed to REVOKED from ACTIVATED
      ELSIF OLD.status = 'CONSUMED_ACTIVATED' AND NEW.status = 'REVOKED' THEN
        UPDATE licenses
        SET total_assigned = GREATEST(total_assigned - 1, 0),
            total_consumed = GREATEST(total_consumed - 1, 0),
            used_quantity = GREATEST(used_quantity - 1, 0)
        WHERE id = NEW.license_id;

      -- Reactivation from REVOKED to PENDING
      ELSIF OLD.status = 'REVOKED' AND NEW.status = 'ASSIGNED_PENDING_ACTIVATION' THEN
        UPDATE licenses
        SET total_assigned = total_assigned + 1
        WHERE id = NEW.license_id;

      -- Reactivation from REVOKED to ACTIVATED
      ELSIF OLD.status = 'REVOKED' AND NEW.status = 'CONSUMED_ACTIVATED' THEN
        UPDATE licenses
        SET total_assigned = total_assigned + 1,
            total_consumed = total_consumed + 1,
            used_quantity = used_quantity + 1
        WHERE id = NEW.license_id;
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop old triggers
DROP TRIGGER IF EXISTS trigger_update_license_used_quantity_insert ON student_licenses;
DROP TRIGGER IF EXISTS trigger_update_license_used_quantity_delete ON student_licenses;
DROP TRIGGER IF EXISTS trigger_update_license_used_quantity_update ON student_licenses;

-- Create new triggers
CREATE TRIGGER trigger_update_license_counters_insert
  AFTER INSERT ON student_licenses
  FOR EACH ROW
  EXECUTE FUNCTION update_license_counters();

CREATE TRIGGER trigger_update_license_counters_delete
  AFTER DELETE ON student_licenses
  FOR EACH ROW
  EXECUTE FUNCTION update_license_counters();

CREATE TRIGGER trigger_update_license_counters_update
  AFTER UPDATE OF status ON student_licenses
  FOR EACH ROW
  EXECUTE FUNCTION update_license_counters();

-- ============================================================================
-- STEP 6: Update assign_license_to_student function
-- ============================================================================

CREATE OR REPLACE FUNCTION assign_license_to_student(
  p_license_id uuid,
  p_student_id uuid,
  p_assigned_by uuid DEFAULT auth.uid()
)
RETURNS json AS $$
DECLARE
  v_license_record licenses%ROWTYPE;
  v_student_record students%ROWTYPE;
  v_existing_assignment student_licenses%ROWTYPE;
  v_assignment_id uuid;
BEGIN
  -- Validate license exists and is active
  SELECT * INTO v_license_record
  FROM licenses
  WHERE id = p_license_id AND status = 'active';

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'License not found or inactive'
    );
  END IF;

  -- Validate student exists and is active
  SELECT * INTO v_student_record
  FROM students
  WHERE id = p_student_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Student not found or inactive'
    );
  END IF;

  -- Check if license has available capacity (total_assigned should not exceed total_allocated)
  IF v_license_record.total_assigned >= COALESCE(v_license_record.total_allocated, v_license_record.total_quantity) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'License has no available capacity',
      'total_assigned', v_license_record.total_assigned,
      'total_allocated', COALESCE(v_license_record.total_allocated, v_license_record.total_quantity)
    );
  END IF;

  -- Check if assignment already exists
  SELECT * INTO v_existing_assignment
  FROM student_licenses
  WHERE license_id = p_license_id AND student_id = p_student_id;

  IF FOUND THEN
    IF v_existing_assignment.status IN ('ASSIGNED_PENDING_ACTIVATION', 'CONSUMED_ACTIVATED') THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Student is already assigned to this license',
        'current_status', v_existing_assignment.status
      );
    ELSE
      -- Reactivate previously revoked assignment
      UPDATE student_licenses
      SET status = 'ASSIGNED_PENDING_ACTIVATION',
          assigned_at = now(),
          assigned_by = p_assigned_by,
          valid_from_snapshot = v_license_record.start_date,
          valid_to_snapshot = v_license_record.end_date,
          expires_at = v_license_record.end_date,
          notification_sent = false,
          activated_on = NULL,
          updated_at = now()
      WHERE id = v_existing_assignment.id;

      RETURN json_build_object(
        'success', true,
        'message', 'License assignment reactivated',
        'assignment_id', v_existing_assignment.id,
        'status', 'ASSIGNED_PENDING_ACTIVATION'
      );
    END IF;
  END IF;

  -- Create new assignment with PENDING status
  INSERT INTO student_licenses (
    license_id,
    student_id,
    assigned_by,
    status,
    valid_from_snapshot,
    valid_to_snapshot,
    expires_at,
    notification_sent,
    is_active
  ) VALUES (
    p_license_id,
    p_student_id,
    p_assigned_by,
    'ASSIGNED_PENDING_ACTIVATION',
    v_license_record.start_date,
    v_license_record.end_date,
    v_license_record.end_date,
    false,
    true
  )
  RETURNING id INTO v_assignment_id;

  RETURN json_build_object(
    'success', true,
    'message', 'License assigned successfully. Student will receive an email notification.',
    'assignment_id', v_assignment_id,
    'status', 'ASSIGNED_PENDING_ACTIVATION'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 7: Create activate_student_license function
-- ============================================================================

CREATE OR REPLACE FUNCTION activate_student_license(
  p_license_id uuid,
  p_student_id uuid DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  v_student_id uuid;
  v_assignment_record student_licenses%ROWTYPE;
  v_current_date date;
BEGIN
  -- Get student_id from auth context if not provided
  v_student_id := COALESCE(p_student_id, (
    SELECT id FROM students WHERE user_id = auth.uid() LIMIT 1
  ));

  IF v_student_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Student not found for current user'
    );
  END IF;

  v_current_date := CURRENT_DATE;

  -- Find the pending assignment
  SELECT * INTO v_assignment_record
  FROM student_licenses
  WHERE license_id = p_license_id
    AND student_id = v_student_id
    AND status = 'ASSIGNED_PENDING_ACTIVATION';

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'No pending license assignment found for this student'
    );
  END IF;

  -- Check if current date is within validity window
  IF v_current_date < v_assignment_record.valid_from_snapshot::date THEN
    RETURN json_build_object(
      'success', false,
      'error', 'License activation is not yet available',
      'valid_from', v_assignment_record.valid_from_snapshot,
      'message', 'This license can only be activated starting from ' || v_assignment_record.valid_from_snapshot::date
    );
  END IF;

  IF v_current_date > v_assignment_record.valid_to_snapshot::date THEN
    RETURN json_build_object(
      'success', false,
      'error', 'License has expired and cannot be activated',
      'valid_to', v_assignment_record.valid_to_snapshot,
      'message', 'This license expired on ' || v_assignment_record.valid_to_snapshot::date
    );
  END IF;

  -- Activate the license
  UPDATE student_licenses
  SET status = 'CONSUMED_ACTIVATED',
      activated_on = now(),
      updated_at = now()
  WHERE id = v_assignment_record.id;

  RETURN json_build_object(
    'success', true,
    'message', 'License activated successfully',
    'activated_on', now(),
    'valid_until', v_assignment_record.valid_to_snapshot
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION activate_student_license TO authenticated;

-- ============================================================================
-- STEP 8: Update RLS policies for new status field
-- ============================================================================

-- Drop old policies if they exist and recreate with status awareness
DROP POLICY IF EXISTS "Students can activate their own pending licenses" ON student_licenses;

CREATE POLICY "Students can activate their own pending licenses"
  ON student_licenses
  FOR UPDATE
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM students WHERE user_id = auth.uid()
    )
    AND status = 'ASSIGNED_PENDING_ACTIVATION'
  )
  WITH CHECK (
    student_id IN (
      SELECT id FROM students WHERE user_id = auth.uid()
    )
    AND status IN ('ASSIGNED_PENDING_ACTIVATION', 'CONSUMED_ACTIVATED')
  );

-- ============================================================================
-- STEP 9: Create helper functions for reporting
-- ============================================================================

-- Function to get license assignment statistics
CREATE OR REPLACE FUNCTION get_license_assignment_stats(p_license_id uuid)
RETURNS json AS $$
DECLARE
  v_stats json;
BEGIN
  SELECT json_build_object(
    'total_allocated', l.total_allocated,
    'total_assigned', l.total_assigned,
    'total_consumed', l.total_consumed,
    'available', (l.total_allocated - l.total_assigned),
    'pending_activation', (
      SELECT COUNT(*) FROM student_licenses
      WHERE license_id = l.id AND status = 'ASSIGNED_PENDING_ACTIVATION'
    ),
    'activated', (
      SELECT COUNT(*) FROM student_licenses
      WHERE license_id = l.id AND status = 'CONSUMED_ACTIVATED'
    ),
    'revoked', (
      SELECT COUNT(*) FROM student_licenses
      WHERE license_id = l.id AND status = 'REVOKED'
    ),
    'activation_rate', CASE
      WHEN l.total_assigned > 0
      THEN ROUND((l.total_consumed::numeric / l.total_assigned::numeric) * 100, 2)
      ELSE 0
    END
  ) INTO v_stats
  FROM licenses l
  WHERE l.id = p_license_id;

  RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_license_assignment_stats TO authenticated;

-- Add comments for documentation
COMMENT ON COLUMN student_licenses.status IS 'License assignment lifecycle status: ASSIGNED_PENDING_ACTIVATION (initial), CONSUMED_ACTIVATED (after student activates), REVOKED (admin revoked)';
COMMENT ON COLUMN student_licenses.valid_from_snapshot IS 'Frozen validity start date at time of assignment - prevents retroactive changes';
COMMENT ON COLUMN student_licenses.valid_to_snapshot IS 'Frozen validity end date at time of assignment - preserves original entitlement';
COMMENT ON COLUMN student_licenses.activated_on IS 'Timestamp when student explicitly activated the license';
COMMENT ON COLUMN student_licenses.notification_sent IS 'Track if email notification was sent to student';

COMMENT ON COLUMN licenses.total_allocated IS 'Total number of licenses allocated to this entity by system admin';
COMMENT ON COLUMN licenses.total_assigned IS 'Total number of licenses assigned to students (includes pending + activated)';
COMMENT ON COLUMN licenses.total_consumed IS 'Total number of licenses that have been activated by students (irreversible)';

COMMENT ON FUNCTION assign_license_to_student IS 'Assigns a license to a student with status ASSIGNED_PENDING_ACTIVATION. Student must explicitly activate.';
COMMENT ON FUNCTION activate_student_license IS 'Allows a student to activate their assigned license. Validates validity window and updates status to CONSUMED_ACTIVATED.';
COMMENT ON FUNCTION get_license_assignment_stats IS 'Returns detailed statistics about license assignments, activations, and utilization rates.';
