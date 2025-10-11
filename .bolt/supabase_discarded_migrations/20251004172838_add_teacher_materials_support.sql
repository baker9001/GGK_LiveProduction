/*
  # Add Teacher Materials Support

  ## Overview
  This migration adds support for teachers to upload school-specific learning materials
  while maintaining existing global materials uploaded by system admins.

  ## Changes

  1. Schema Updates - materials table
    - Add `school_id` column (nullable, references schools) - identifies school-specific materials
    - Add `created_by_role` column (text) - tracks whether uploaded by 'system_admin' or 'teacher'
    - Add `visibility_scope` column (text) - defines access scope: 'global', 'school', 'branch'
    - Add `grade_id` column (nullable, references grade_levels) - for teacher materials filtering
    - Add `teacher_id` column (nullable, references entity_users) - tracks which teacher uploaded

  2. New Tables
    - `material_access_log` - tracks student material access for analytics

  3. Indexes
    - Composite indexes for optimized query performance on common access patterns

  4. Security
    - Add RLS policies for teachers to manage school-specific materials
    - Add RLS policies for students to access materials based on licenses
    - Create security function to check student material access permissions

  5. Data Migration
    - Backfill existing materials with default values (global scope, system admin role)
*/

-- ============================================================================
-- STEP 1: Add new columns to materials table
-- ============================================================================

-- Add school_id column for school-specific materials
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'materials' AND column_name = 'school_id'
  ) THEN
    ALTER TABLE materials ADD COLUMN school_id uuid;
    ALTER TABLE materials ADD CONSTRAINT materials_school_id_fkey
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_materials_school_id ON materials(school_id);
  END IF;
END $$;

-- Add created_by_role column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'materials' AND column_name = 'created_by_role'
  ) THEN
    ALTER TABLE materials ADD COLUMN created_by_role text DEFAULT 'system_admin' NOT NULL;
    ALTER TABLE materials ADD CONSTRAINT materials_created_by_role_check
      CHECK (created_by_role IN ('system_admin', 'teacher'));
  END IF;
END $$;

-- Add visibility_scope column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'materials' AND column_name = 'visibility_scope'
  ) THEN
    ALTER TABLE materials ADD COLUMN visibility_scope text DEFAULT 'global' NOT NULL;
    ALTER TABLE materials ADD CONSTRAINT materials_visibility_scope_check
      CHECK (visibility_scope IN ('global', 'school', 'branch'));
  END IF;
END $$;

-- Add grade_id column for teacher materials
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'materials' AND column_name = 'grade_id'
  ) THEN
    ALTER TABLE materials ADD COLUMN grade_id uuid;
    ALTER TABLE materials ADD CONSTRAINT materials_grade_id_fkey
      FOREIGN KEY (grade_id) REFERENCES grade_levels(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_materials_grade_id ON materials(grade_id);
  END IF;
END $$;

-- Add teacher_id column to track which teacher uploaded the material
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'materials' AND column_name = 'teacher_id'
  ) THEN
    ALTER TABLE materials ADD COLUMN teacher_id uuid;
    ALTER TABLE materials ADD CONSTRAINT materials_teacher_id_fkey
      FOREIGN KEY (teacher_id) REFERENCES entity_users(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_materials_teacher_id ON materials(teacher_id);
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Create composite indexes for optimized queries
-- ============================================================================

-- Index for student material access queries (by subject and visibility)
CREATE INDEX IF NOT EXISTS idx_materials_student_access
  ON materials(data_structure_id, visibility_scope, status)
  WHERE status = 'active';

-- Index for school-specific material queries
CREATE INDEX IF NOT EXISTS idx_materials_school_subject
  ON materials(school_id, data_structure_id, status)
  WHERE school_id IS NOT NULL;

-- Index for teacher's own materials
CREATE INDEX IF NOT EXISTS idx_materials_teacher_active
  ON materials(teacher_id, status)
  WHERE teacher_id IS NOT NULL AND status = 'active';

-- Index for visibility scope filtering
CREATE INDEX IF NOT EXISTS idx_materials_visibility
  ON materials(visibility_scope, status)
  WHERE status = 'active';

-- ============================================================================
-- STEP 3: Create material_access_log table
-- ============================================================================

CREATE TABLE IF NOT EXISTS material_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  accessed_at timestamptz DEFAULT now() NOT NULL,
  access_type text NOT NULL CHECK (access_type IN ('view', 'download', 'preview')),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_material_access_log_material
  ON material_access_log(material_id, accessed_at DESC);

CREATE INDEX IF NOT EXISTS idx_material_access_log_student
  ON material_access_log(student_id, accessed_at DESC);

CREATE INDEX IF NOT EXISTS idx_material_access_log_date
  ON material_access_log(accessed_at DESC);

-- Enable RLS on material_access_log
ALTER TABLE material_access_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 4: Create security function for student material access
-- ============================================================================

-- Function to check if a student can access a specific material
CREATE OR REPLACE FUNCTION can_student_access_material(
  p_material_id uuid,
  p_student_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_material_subject_id uuid;
  v_material_school_id uuid;
  v_material_visibility text;
  v_student_school_id uuid;
  v_has_active_license boolean;
BEGIN
  -- Get material details
  SELECT
    ds.subject_id,
    m.school_id,
    m.visibility_scope
  INTO
    v_material_subject_id,
    v_material_school_id,
    v_material_visibility
  FROM materials m
  JOIN data_structures ds ON ds.id = m.data_structure_id
  WHERE m.id = p_material_id AND m.status = 'active';

  -- If material not found or inactive, deny access
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Get student's school
  SELECT school_id INTO v_student_school_id
  FROM students
  WHERE id = p_student_id;

  -- Check if student has active license for the subject
  SELECT EXISTS(
    SELECT 1
    FROM student_licenses sl
    JOIN licenses l ON l.id = sl.license_id
    JOIN data_structures ds ON ds.id = l.data_structure_id
    WHERE sl.student_id = p_student_id
      AND ds.subject_id = v_material_subject_id
      AND sl.is_active = true
      AND l.status IN ('CONSUMED_ACTIVATED', 'active')
      AND (sl.expires_at IS NULL OR sl.expires_at > now())
  ) INTO v_has_active_license;

  -- If no active license, deny access
  IF NOT v_has_active_license THEN
    RETURN false;
  END IF;

  -- Check visibility scope
  IF v_material_visibility = 'global' THEN
    -- Global materials accessible to all students with valid license
    RETURN true;
  ELSIF v_material_visibility = 'school' THEN
    -- School materials only accessible to students from same school
    RETURN v_material_school_id IS NOT NULL
      AND v_student_school_id = v_material_school_id;
  ELSIF v_material_visibility = 'branch' THEN
    -- Branch materials - check branch match (future enhancement)
    RETURN v_material_school_id IS NOT NULL
      AND v_student_school_id = v_material_school_id;
  ELSE
    RETURN false;
  END IF;
END;
$$;

-- ============================================================================
-- STEP 5: Update RLS policies for materials table
-- ============================================================================

-- Drop existing overly permissive policies if they exist
DROP POLICY IF EXISTS "Allow full access to authenticated users on materials" ON materials;

-- System Admin policies (full access)
CREATE POLICY "System admins have full access to all materials"
  ON materials
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Teacher policies
CREATE POLICY "Teachers can view all materials in their school"
  ON materials
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM entity_users eu
      JOIN entity_user_schools eus ON eus.entity_user_id = eu.id
      WHERE eu.user_id = auth.uid()
        AND eu.is_active = true
        AND eus.school_id = materials.school_id
    )
  );

CREATE POLICY "Teachers can insert materials for their school"
  ON materials
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by_role = 'teacher'
    AND school_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM entity_users eu
      JOIN entity_user_schools eus ON eus.entity_user_id = eu.id
      WHERE eu.user_id = auth.uid()
        AND eu.is_active = true
        AND eus.school_id = materials.school_id
    )
  );

CREATE POLICY "Teachers can update their own materials"
  ON materials
  FOR UPDATE
  TO authenticated
  USING (
    teacher_id IN (
      SELECT id FROM entity_users WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    teacher_id IN (
      SELECT id FROM entity_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can delete their own materials"
  ON materials
  FOR DELETE
  TO authenticated
  USING (
    teacher_id IN (
      SELECT id FROM entity_users WHERE user_id = auth.uid()
    )
  );

-- Student policies
CREATE POLICY "Students can view materials they have access to"
  ON materials
  FOR SELECT
  TO authenticated
  USING (
    status = 'active'
    AND EXISTS (
      SELECT 1 FROM students s
      WHERE s.user_id = auth.uid()
        AND can_student_access_material(materials.id, s.id)
    )
  );

-- ============================================================================
-- STEP 6: RLS policies for material_access_log
-- ============================================================================

CREATE POLICY "Students can log their own material access"
  ON material_access_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    student_id IN (
      SELECT id FROM students WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Students can view their own access logs"
  ON material_access_log
  FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM students WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can view access logs for their school materials"
  ON material_access_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM materials m
      JOIN entity_users eu ON eu.id = m.teacher_id
      WHERE m.id = material_access_log.material_id
        AND eu.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all material access logs"
  ON material_access_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- ============================================================================
-- STEP 7: Backfill existing data
-- ============================================================================

-- Update existing materials to have global visibility and system admin role
UPDATE materials
SET
  visibility_scope = 'global',
  created_by_role = 'system_admin',
  school_id = NULL,
  teacher_id = NULL
WHERE visibility_scope IS NULL OR created_by_role IS NULL;

-- ============================================================================
-- STEP 8: Add helpful comments
-- ============================================================================

COMMENT ON COLUMN materials.school_id IS 'References schools table. NULL for global materials, populated for school-specific materials';
COMMENT ON COLUMN materials.created_by_role IS 'Indicates who uploaded: system_admin (global) or teacher (school-specific)';
COMMENT ON COLUMN materials.visibility_scope IS 'Access scope: global (all students), school (same school only), branch (same branch only)';
COMMENT ON COLUMN materials.grade_id IS 'Optional grade level association for teacher materials';
COMMENT ON COLUMN materials.teacher_id IS 'References entity_users. Tracks which teacher uploaded the material';

COMMENT ON TABLE material_access_log IS 'Tracks student access to materials for analytics and engagement metrics';
COMMENT ON FUNCTION can_student_access_material IS 'Security function to check if student can access a material based on licenses and school association';
