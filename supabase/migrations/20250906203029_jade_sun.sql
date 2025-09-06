/*
  # Add Student Licenses Table

  1. New Tables
    - `student_licenses`
      - `id` (uuid, primary key)
      - `license_id` (uuid, foreign key to licenses)
      - `student_id` (uuid, foreign key to students)
      - `assigned_at` (timestamp)
      - `assigned_by` (uuid, foreign key to users)
      - `expires_at` (timestamp)
      - `is_active` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `student_licenses` table
    - Add policies for students to view their own licenses
    - Add policies for admins to manage licenses within their scope

  3. Constraints
    - Unique constraint on (license_id, student_id)
    - Check constraint for valid assignment dates
*/

-- Create student_licenses table
CREATE TABLE IF NOT EXISTS student_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now() NOT NULL,
  assigned_by uuid REFERENCES users(id) ON DELETE SET NULL,
  expires_at timestamptz,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  
  -- Constraints
  CONSTRAINT unique_license_student UNIQUE (license_id, student_id),
  CONSTRAINT valid_assignment_dates CHECK (expires_at IS NULL OR expires_at > assigned_at)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_student_licenses_license_id ON student_licenses(license_id);
CREATE INDEX IF NOT EXISTS idx_student_licenses_student_id ON student_licenses(student_id);
CREATE INDEX IF NOT EXISTS idx_student_licenses_assigned_by ON student_licenses(assigned_by);
CREATE INDEX IF NOT EXISTS idx_student_licenses_active ON student_licenses(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_student_licenses_expires ON student_licenses(expires_at) WHERE expires_at IS NOT NULL;

-- Enable RLS
ALTER TABLE student_licenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Students can view their own licenses"
  ON student_licenses
  FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM students WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Entity admins can manage all student licenses in their company"
  ON student_licenses
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM entity_users eu
      JOIN students s ON s.id = student_licenses.student_id
      WHERE eu.user_id = auth.uid()
        AND eu.company_id = s.company_id
        AND eu.admin_level IN ('entity_admin', 'sub_entity_admin')
        AND eu.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM entity_users eu
      JOIN students s ON s.id = student_licenses.student_id
      WHERE eu.user_id = auth.uid()
        AND eu.company_id = s.company_id
        AND eu.admin_level IN ('entity_admin', 'sub_entity_admin')
        AND eu.is_active = true
    )
  );

CREATE POLICY "School admins can manage licenses for students in their schools"
  ON student_licenses
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM entity_users eu
      JOIN entity_user_schools eus ON eus.entity_user_id = eu.id
      JOIN students s ON s.id = student_licenses.student_id
      WHERE eu.user_id = auth.uid()
        AND eus.school_id = s.school_id
        AND eu.admin_level = 'school_admin'
        AND eu.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM entity_users eu
      JOIN entity_user_schools eus ON eus.entity_user_id = eu.id
      JOIN students s ON s.id = student_licenses.student_id
      WHERE eu.user_id = auth.uid()
        AND eus.school_id = s.school_id
        AND eu.admin_level = 'school_admin'
        AND eu.is_active = true
    )
  );

CREATE POLICY "Branch admins can manage licenses for students in their branches"
  ON student_licenses
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM entity_users eu
      JOIN entity_user_branches eub ON eub.entity_user_id = eu.id
      JOIN students s ON s.id = student_licenses.student_id
      WHERE eu.user_id = auth.uid()
        AND eub.branch_id = s.branch_id
        AND eu.admin_level = 'branch_admin'
        AND eu.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM entity_users eu
      JOIN entity_user_branches eub ON eub.entity_user_id = eu.id
      JOIN students s ON s.id = student_licenses.student_id
      WHERE eu.user_id = auth.uid()
        AND eub.branch_id = s.branch_id
        AND eu.admin_level = 'branch_admin'
        AND eu.is_active = true
    )
  );

CREATE POLICY "Service role has full access to student licenses"
  ON student_licenses
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add updated_at trigger
CREATE TRIGGER update_student_licenses_updated_at
  BEFORE UPDATE ON student_licenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();