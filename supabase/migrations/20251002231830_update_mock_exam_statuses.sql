/*
  # Update Mock Exam Status Workflow
  
  ## Overview
  Enhances the mock exam status workflow to align with IGCSE exam orchestration best practices.
  Adds intermediate statuses for better exam lifecycle management.
  
  ## Changes
  
  1. **Status Updates**
     - Adds 'draft' status - For incomplete mock exams being configured
     - Adds 'materials_ready' status - Question papers and mark schemes uploaded
     - Adds 'moderation' status - Senior teachers reviewing marking consistency
     - Adds 'analytics_released' status - Results shared with students and teachers
     - Keeps existing: planned, scheduled, in_progress, grading, completed, cancelled
  
  2. **New Tables**
     - `mock_exam_status_history` - Tracks all status changes with audit trail
  
  3. **Functions**
     - `validate_status_transition` - Ensures status changes follow business rules
     - `log_status_change` - Automatically logs status changes to history table
  
  ## Status Flow
  draft → planned → scheduled → materials_ready → in_progress → grading → moderation → analytics_released → completed
  (cancelled can be set from any status)
*/

-- Step 1: Create status history table first
CREATE TABLE IF NOT EXISTS mock_exam_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_exam_id uuid NOT NULL REFERENCES mock_exams(id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  changed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  change_reason text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mock_exam_status_history_exam ON mock_exam_status_history(mock_exam_id);
CREATE INDEX IF NOT EXISTS idx_mock_exam_status_history_date ON mock_exam_status_history(created_at);

ALTER TABLE mock_exam_status_history ENABLE ROW LEVEL SECURITY;

-- RLS for status history
CREATE POLICY "Users can view status history for accessible exams"
  ON mock_exam_status_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mock_exams me
      WHERE me.id = mock_exam_status_history.mock_exam_id
        AND me.company_id IN (
          SELECT company_id FROM entity_users 
          WHERE user_id = auth.uid()
        )
    )
  );

-- Step 2: Update the mock_exams status constraint
DO $$ 
BEGIN
  -- Drop the old constraint
  ALTER TABLE mock_exams DROP CONSTRAINT IF EXISTS mock_exams_status_check;
  
  -- Add the new constraint with all statuses
  ALTER TABLE mock_exams ADD CONSTRAINT mock_exams_status_check 
    CHECK (status IN (
      'draft',
      'planned', 
      'scheduled', 
      'materials_ready',
      'in_progress', 
      'grading',
      'moderation',
      'analytics_released',
      'completed', 
      'cancelled'
    ));
END $$;

-- Step 3: Create function to validate status transitions
CREATE OR REPLACE FUNCTION validate_status_transition(
  current_status text,
  new_status text
) RETURNS boolean AS $$
BEGIN
  -- Cancelled can be set from any status
  IF new_status = 'cancelled' THEN
    RETURN true;
  END IF;
  
  -- Cannot change from cancelled or completed
  IF current_status IN ('cancelled', 'completed') THEN
    RETURN false;
  END IF;
  
  -- Define valid transitions
  CASE current_status
    WHEN 'draft' THEN
      RETURN new_status IN ('planned', 'cancelled');
    WHEN 'planned' THEN
      RETURN new_status IN ('draft', 'scheduled', 'cancelled');
    WHEN 'scheduled' THEN
      RETURN new_status IN ('planned', 'materials_ready', 'in_progress', 'cancelled');
    WHEN 'materials_ready' THEN
      RETURN new_status IN ('scheduled', 'in_progress', 'cancelled');
    WHEN 'in_progress' THEN
      RETURN new_status IN ('grading', 'cancelled');
    WHEN 'grading' THEN
      RETURN new_status IN ('moderation', 'analytics_released', 'cancelled');
    WHEN 'moderation' THEN
      RETURN new_status IN ('grading', 'analytics_released', 'cancelled');
    WHEN 'analytics_released' THEN
      RETURN new_status IN ('completed', 'cancelled');
    ELSE
      RETURN false;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 4: Create trigger function to log status changes
CREATE OR REPLACE FUNCTION log_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if status actually changed
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    -- Validate the transition
    IF NOT validate_status_transition(OLD.status, NEW.status) THEN
      RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
    END IF;
    
    -- Log the change
    INSERT INTO mock_exam_status_history (
      mock_exam_id,
      old_status,
      new_status,
      changed_by
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      auth.uid()
    );
  ELSIF (TG_OP = 'INSERT') THEN
    -- Log initial status
    INSERT INTO mock_exam_status_history (
      mock_exam_id,
      old_status,
      new_status,
      changed_by
    ) VALUES (
      NEW.id,
      NULL,
      NEW.status,
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Add trigger to mock_exams table
DROP TRIGGER IF EXISTS log_mock_exam_status_change ON mock_exams;
CREATE TRIGGER log_mock_exam_status_change
  AFTER INSERT OR UPDATE OF status ON mock_exams
  FOR EACH ROW
  EXECUTE FUNCTION log_status_change();

-- Step 6: Update existing 'planned' exams that might be in different states
-- (This is safe to run - it won't change any data, just ensures compatibility)
UPDATE mock_exams 
SET status = 'planned' 
WHERE status = 'planned';
