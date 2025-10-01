/*
  # Fix License Assignment Function

  This migration recreates the assign_license_to_student function that is missing from the database.
  The function is required for entity admins to assign licenses to students.

  1. Functions Created
    - `assign_license_to_student()` - Assign a license to a student with validation and error handling
    
  2. Security
    - Function is SECURITY DEFINER to allow RLS bypass for authorized operations
    - Validates license exists and is active
    - Validates student exists and is active
    - Checks license capacity before assignment
    - Handles duplicate assignments by reactivating if previously revoked
*/

-- Drop and recreate the function to ensure it's correct
DROP FUNCTION IF EXISTS assign_license_to_student(uuid, uuid, uuid);

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
  v_result json;
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

  -- Check if license has available capacity
  IF v_license_record.used_quantity >= v_license_record.total_quantity THEN
    RETURN json_build_object(
      'success', false,
      'error', 'License has no available capacity',
      'used_quantity', v_license_record.used_quantity,
      'total_quantity', v_license_record.total_quantity
    );
  END IF;

  -- Check if assignment already exists
  SELECT * INTO v_existing_assignment
  FROM student_licenses
  WHERE license_id = p_license_id AND student_id = p_student_id;
  
  IF FOUND THEN
    IF v_existing_assignment.is_active THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Student is already assigned to this license'
      );
    ELSE
      -- Reactivate existing assignment
      UPDATE student_licenses
      SET is_active = true,
          assigned_at = now(),
          assigned_by = p_assigned_by,
          expires_at = v_license_record.end_date,
          updated_at = now()
      WHERE id = v_existing_assignment.id;
      
      RETURN json_build_object(
        'success', true,
        'message', 'License assignment reactivated',
        'assignment_id', v_existing_assignment.id
      );
    END IF;
  END IF;

  -- Create new assignment
  INSERT INTO student_licenses (
    license_id,
    student_id,
    assigned_by,
    expires_at,
    is_active
  ) VALUES (
    p_license_id,
    p_student_id,
    p_assigned_by,
    v_license_record.end_date,
    true
  );

  RETURN json_build_object(
    'success', true,
    'message', 'License assigned successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION assign_license_to_student(uuid, uuid, uuid) TO authenticated;

-- Create comment for documentation
COMMENT ON FUNCTION assign_license_to_student(uuid, uuid, uuid) IS 'Assigns a license to a student with validation. Checks license capacity, student status, and handles reactivation of previously revoked assignments.';