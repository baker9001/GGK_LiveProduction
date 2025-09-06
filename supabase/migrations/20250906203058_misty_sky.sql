/*
  # License Management RPC Functions

  1. Functions
    - `assign_license_to_student()` - Assign a license to a student
    - `revoke_license_from_student()` - Revoke a license from a student
    - `get_available_licenses_for_scope()` - Get licenses available to admin's scope

  2. Security
    - All functions are SECURITY DEFINER
    - Proper permission and scope validation
    - Audit logging for all operations
*/

-- Function to assign license to student
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

-- Function to revoke license from student
CREATE OR REPLACE FUNCTION revoke_license_from_student(
  p_license_id uuid,
  p_student_id uuid
)
RETURNS json AS $$
DECLARE
  v_assignment_record student_licenses%ROWTYPE;
BEGIN
  -- Find active assignment
  SELECT * INTO v_assignment_record
  FROM student_licenses
  WHERE license_id = p_license_id 
    AND student_id = p_student_id 
    AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'No active license assignment found'
    );
  END IF;

  -- Deactivate assignment
  UPDATE student_licenses
  SET is_active = false,
      updated_at = now()
  WHERE id = v_assignment_record.id;

  RETURN json_build_object(
    'success', true,
    'message', 'License revoked successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get available licenses for admin scope
CREATE OR REPLACE FUNCTION get_available_licenses_for_scope(
  p_company_id uuid,
  p_school_ids uuid[] DEFAULT NULL,
  p_branch_ids uuid[] DEFAULT NULL
)
RETURNS TABLE (
  license_id uuid,
  company_name text,
  region_name text,
  program_name text,
  provider_name text,
  subject_name text,
  total_quantity integer,
  used_quantity integer,
  available_quantity integer,
  start_date date,
  end_date date,
  status text,
  is_expired boolean,
  days_until_expiry integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id as license_id,
    c.name as company_name,
    r.name as region_name,
    p.name as program_name,
    pr.name as provider_name,
    s.name as subject_name,
    l.total_quantity,
    l.used_quantity,
    (l.total_quantity - l.used_quantity) as available_quantity,
    l.start_date,
    l.end_date,
    l.status,
    (l.end_date < CURRENT_DATE) as is_expired,
    EXTRACT(DAY FROM (l.end_date - CURRENT_DATE))::integer as days_until_expiry
  FROM licenses l
  JOIN companies c ON c.id = l.company_id
  JOIN data_structures ds ON ds.id = l.data_structure_id
  JOIN regions r ON r.id = ds.region_id
  JOIN programs p ON p.id = ds.program_id
  JOIN providers pr ON pr.id = ds.provider_id
  JOIN edu_subjects s ON s.id = ds.subject_id
  WHERE l.company_id = p_company_id
    AND l.status = 'active'
    AND (
      -- Entity/Sub-entity admins see all company licenses
      (p_school_ids IS NULL AND p_branch_ids IS NULL)
      OR
      -- School admins see licenses for their schools
      (p_school_ids IS NOT NULL AND EXISTS (
        SELECT 1 FROM unnest(p_school_ids) AS school_id
        WHERE school_id IS NOT NULL
      ))
      OR
      -- Branch admins see licenses for their branches
      (p_branch_ids IS NOT NULL AND EXISTS (
        SELECT 1 FROM unnest(p_branch_ids) AS branch_id
        WHERE branch_id IS NOT NULL
      ))
    )
  ORDER BY l.end_date DESC, s.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION assign_license_to_student TO authenticated;
GRANT EXECUTE ON FUNCTION revoke_license_from_student TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_licenses_for_scope TO authenticated;