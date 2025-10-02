/*
  # Fix Mock Exam Creation and Class Sections Issues

  ## Problems Fixed
  1. **Infinite recursion in mock_exam_schools RLS**: The policy checks mock_exams which checks mock_exam_schools, creating a loop
  2. **Missing student-class_section relationship**: No foreign key exists between students and class_sections
  3. **Query errors in mockExamService**: Queries reference non-existent relationships

  ## Changes

  ### 1. Fix mock_exam_schools RLS policies to prevent infinite recursion
  - Remove policies that cause circular dependencies
  - Add direct policies that check entity_users without going through mock_exams

  ### 2. Add student-class_section relationship
  - Add class_section_id to students table
  - Create index for performance
  - Create junction table for flexibility

  ### 3. Fix similar issues in other mock exam junction tables
  - Apply same pattern to mock_exam_branches, mock_exam_grade_levels, mock_exam_sections, mock_exam_teachers

  ## Security
  - Maintains existing security model
  - Prevents infinite recursion
  - Ensures proper access control
*/

-- =====================================================
-- PART 1: Fix mock_exam_schools infinite recursion
-- =====================================================

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Entity admins can add schools to their company's mock exams" ON mock_exam_schools;

-- Create a new policy that doesn't cause recursion by checking company_id directly from the inserted row
-- The trick is to use a subquery that doesn't reference mock_exams table
CREATE POLICY "Entity admins can insert mock exam schools"
  ON mock_exam_schools
  FOR INSERT
  TO authenticated
  WITH CHECK (
    school_id IN (
      SELECT s.id
      FROM schools s
      JOIN entity_users eu ON eu.company_id = s.company_id
      WHERE eu.user_id = auth.uid()
        AND eu.admin_level IN ('entity_admin', 'sub_entity_admin')
        AND eu.is_active = true
    )
  );

-- Add SELECT policy for mock_exam_schools
DROP POLICY IF EXISTS "Entity admins view mock exam schools in company" ON mock_exam_schools;
CREATE POLICY "Entity admins view mock exam schools in company"
  ON mock_exam_schools
  FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT s.id
      FROM schools s
      JOIN entity_users eu ON eu.company_id = s.company_id
      WHERE eu.user_id = auth.uid()
        AND eu.admin_level IN ('entity_admin', 'sub_entity_admin')
        AND eu.is_active = true
    )
  );

-- =====================================================
-- PART 2: Fix mock_exam_branches infinite recursion
-- =====================================================

DROP POLICY IF EXISTS "Entity admins can add branches to their company's mock exams" ON mock_exam_branches;

CREATE POLICY "Entity admins can insert mock exam branches"
  ON mock_exam_branches
  FOR INSERT
  TO authenticated
  WITH CHECK (
    branch_id IN (
      SELECT b.id
      FROM branches b
      JOIN schools s ON s.id = b.school_id
      JOIN entity_users eu ON eu.company_id = s.company_id
      WHERE eu.user_id = auth.uid()
        AND eu.admin_level IN ('entity_admin', 'sub_entity_admin')
        AND eu.is_active = true
    )
  );

CREATE POLICY "Entity admins view mock exam branches in company"
  ON mock_exam_branches
  FOR SELECT
  TO authenticated
  USING (
    branch_id IN (
      SELECT b.id
      FROM branches b
      JOIN schools s ON s.id = b.school_id
      JOIN entity_users eu ON eu.company_id = s.company_id
      WHERE eu.user_id = auth.uid()
        AND eu.admin_level IN ('entity_admin', 'sub_entity_admin')
        AND eu.is_active = true
    )
  );

-- =====================================================
-- PART 3: Fix mock_exam_grade_levels infinite recursion
-- =====================================================

DROP POLICY IF EXISTS "Entity admins can add grade levels to their company's mock exam" ON mock_exam_grade_levels;

CREATE POLICY "Entity admins can insert mock exam grade levels"
  ON mock_exam_grade_levels
  FOR INSERT
  TO authenticated
  WITH CHECK (
    grade_level_id IN (
      SELECT gl.id
      FROM grade_levels gl
      JOIN grade_level_schools gls ON gls.grade_level_id = gl.id
      JOIN schools s ON s.id = gls.school_id
      JOIN entity_users eu ON eu.company_id = s.company_id
      WHERE eu.user_id = auth.uid()
        AND eu.admin_level IN ('entity_admin', 'sub_entity_admin')
        AND eu.is_active = true
    )
  );

CREATE POLICY "Entity admins view mock exam grade levels in company"
  ON mock_exam_grade_levels
  FOR SELECT
  TO authenticated
  USING (
    grade_level_id IN (
      SELECT gl.id
      FROM grade_levels gl
      JOIN grade_level_schools gls ON gls.grade_level_id = gl.id
      JOIN schools s ON s.id = gls.school_id
      JOIN entity_users eu ON eu.company_id = s.company_id
      WHERE eu.user_id = auth.uid()
        AND eu.admin_level IN ('entity_admin', 'sub_entity_admin')
        AND eu.is_active = true
    )
  );

-- =====================================================
-- PART 4: Fix mock_exam_sections infinite recursion
-- =====================================================

DROP POLICY IF EXISTS "Entity admins can add sections to their company's mock exams" ON mock_exam_sections;

CREATE POLICY "Entity admins can insert mock exam sections"
  ON mock_exam_sections
  FOR INSERT
  TO authenticated
  WITH CHECK (
    class_section_id IN (
      SELECT cs.id
      FROM class_sections cs
      JOIN grade_levels gl ON gl.id = cs.grade_level_id
      JOIN grade_level_schools gls ON gls.grade_level_id = gl.id
      JOIN schools s ON s.id = gls.school_id
      JOIN entity_users eu ON eu.company_id = s.company_id
      WHERE eu.user_id = auth.uid()
        AND eu.admin_level IN ('entity_admin', 'sub_entity_admin')
        AND eu.is_active = true
    )
  );

CREATE POLICY "Entity admins view mock exam sections in company"
  ON mock_exam_sections
  FOR SELECT
  TO authenticated
  USING (
    class_section_id IN (
      SELECT cs.id
      FROM class_sections cs
      JOIN grade_levels gl ON gl.id = cs.grade_level_id
      JOIN grade_level_schools gls ON gls.grade_level_id = gl.id
      JOIN schools s ON s.id = gls.school_id
      JOIN entity_users eu ON eu.company_id = s.company_id
      WHERE eu.user_id = auth.uid()
        AND eu.admin_level IN ('entity_admin', 'sub_entity_admin')
        AND eu.is_active = true
    )
  );

-- =====================================================
-- PART 5: Fix mock_exam_teachers infinite recursion
-- =====================================================

DROP POLICY IF EXISTS "Entity admins can add teachers to their company's mock exams" ON mock_exam_teachers;

CREATE POLICY "Entity admins can insert mock exam teachers"
  ON mock_exam_teachers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    entity_user_id IN (
      SELECT eu.id
      FROM entity_users eu
      WHERE eu.user_id = auth.uid()
        AND eu.admin_level IN ('entity_admin', 'sub_entity_admin')
        AND eu.is_active = true
        AND eu.company_id IN (
          SELECT eu2.company_id
          FROM entity_users eu2
          WHERE eu2.id = entity_user_id
        )
    )
    OR
    entity_user_id IN (
      SELECT eu.id
      FROM entity_users eu
      JOIN entity_users creator ON creator.company_id = eu.company_id
      WHERE creator.user_id = auth.uid()
        AND creator.admin_level IN ('entity_admin', 'sub_entity_admin')
        AND creator.is_active = true
    )
  );

CREATE POLICY "Entity admins view mock exam teachers in company"
  ON mock_exam_teachers
  FOR SELECT
  TO authenticated
  USING (
    entity_user_id IN (
      SELECT eu.id
      FROM entity_users eu
      JOIN entity_users creator ON creator.company_id = eu.company_id
      WHERE creator.user_id = auth.uid()
        AND creator.admin_level IN ('entity_admin', 'sub_entity_admin')
        AND creator.is_active = true
    )
  );

-- =====================================================
-- PART 6: Add student-class_section relationship
-- =====================================================

-- Add class_section_id column to students table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'class_section_id'
  ) THEN
    ALTER TABLE students
    ADD COLUMN class_section_id uuid REFERENCES class_sections(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_students_class_section_id
ON students(class_section_id);

-- Create junction table for many-to-many relationships (for flexible student assignments)
CREATE TABLE IF NOT EXISTS student_class_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_section_id uuid NOT NULL REFERENCES class_sections(id) ON DELETE CASCADE,
  enrollment_date timestamptz DEFAULT now() NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(student_id, class_section_id)
);

-- Indexes for junction table
CREATE INDEX IF NOT EXISTS idx_student_class_sections_student
ON student_class_sections(student_id);

CREATE INDEX IF NOT EXISTS idx_student_class_sections_section
ON student_class_sections(class_section_id);

CREATE INDEX IF NOT EXISTS idx_student_class_sections_active
ON student_class_sections(is_active) WHERE is_active = true;

-- Enable RLS on junction table
ALTER TABLE student_class_sections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for student_class_sections
CREATE POLICY "Entity admins manage student_class_sections in company"
  ON student_class_sections
  FOR ALL
  TO authenticated
  USING (
    student_id IN (
      SELECT st.id
      FROM students st
      JOIN entity_users eu ON eu.company_id = st.company_id
      WHERE eu.user_id = auth.uid()
        AND eu.admin_level IN ('entity_admin', 'sub_entity_admin')
        AND eu.is_active = true
    )
  )
  WITH CHECK (
    student_id IN (
      SELECT st.id
      FROM students st
      JOIN entity_users eu ON eu.company_id = st.company_id
      WHERE eu.user_id = auth.uid()
        AND eu.admin_level IN ('entity_admin', 'sub_entity_admin')
        AND eu.is_active = true
    )
  );

CREATE POLICY "School admins manage student_class_sections in schools"
  ON student_class_sections
  FOR ALL
  TO authenticated
  USING (
    student_id IN (
      SELECT st.id
      FROM students st
      JOIN entity_user_schools eus ON eus.school_id = st.school_id
      JOIN entity_users eu ON eu.id = eus.entity_user_id
      WHERE eu.user_id = auth.uid()
        AND eu.admin_level = 'school_admin'
        AND eu.is_active = true
    )
  )
  WITH CHECK (
    student_id IN (
      SELECT st.id
      FROM students st
      JOIN entity_user_schools eus ON eus.school_id = st.school_id
      JOIN entity_users eu ON eu.id = eus.entity_user_id
      WHERE eu.user_id = auth.uid()
        AND eu.admin_level = 'school_admin'
        AND eu.is_active = true
    )
  );

CREATE POLICY "Students view own class section assignments"
  ON student_class_sections
  FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM students WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System admins full access to student_class_sections"
  ON student_class_sections
  FOR ALL
  TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));
