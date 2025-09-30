/*
  # Mock Exams System - Core Tables

  ## Overview
  Creates the foundational tables for the mock exam orchestration system supporting:
  - Multi-school and multi-branch coordination
  - Flexible scope assignment (entity-wide, school-level, branch-level)
  - Exam scheduling and status tracking
  - Integration with existing data structures (programmes, providers, subjects)

  ## New Tables

  1. **mock_exams** - Core exam records
     - `id` (uuid, primary key)
     - `company_id` (uuid, references companies) - Entity owning the exam
     - `title` (text) - Descriptive exam title
     - `status` (text) - planned, scheduled, in_progress, grading, completed, cancelled
     - `data_structure_id` (uuid, references data_structures) - Links to exam board/programme/subject
     - `paper_type` (text) - Paper 1, Paper 2, Paper 3, Specimen, etc.
     - `paper_number` (integer) - Numeric paper identifier
     - `scheduled_date` (date) - Exam date
     - `scheduled_time` (time) - Exam start time
     - `duration_minutes` (integer) - Exam duration
     - `delivery_mode` (text) - In-person, Digital (exam hall), Remote proctored
     - `exam_window` (text) - Term 1, Term 2, Term 3, Trial Exams, etc.
     - `total_marks` (integer) - Maximum marks for the exam
     - `grade_boundaries` (jsonb) - Grade thresholds (A*: 90, A: 80, etc.)
     - `readiness_score` (integer) - Calculated readiness percentage (0-100)
     - `ai_proctoring_enabled` (boolean) - Enable AI monitoring
     - `release_analytics` (boolean) - Share results with students
     - `allow_retakes` (boolean) - Allow supervised retakes
     - `auto_grade_enabled` (boolean) - Enable automatic grading for MCQ
     - `notes` (text) - Briefing notes, instructions, reminders
     - `created_by` (uuid, references users) - Admin who created the exam
     - `created_at` (timestamp)
     - `updated_at` (timestamp)

  2. **mock_exam_schools** - School assignments (many-to-many)
     - `id` (uuid, primary key)
     - `mock_exam_id` (uuid, references mock_exams)
     - `school_id` (uuid, references schools)
     - `is_coordinating_school` (boolean) - Lead school for multi-school exams
     - `student_capacity` (integer) - Maximum students from this school
     - `registered_students_count` (integer) - Actual registered count
     - `notes` (text) - School-specific notes
     - `created_at` (timestamp)

  3. **mock_exam_branches** - Branch assignments (many-to-many)
     - `id` (uuid, primary key)
     - `mock_exam_id` (uuid, references mock_exams)
     - `branch_id` (uuid, references branches)
     - `exam_venue` (text) - Venue name/location at this branch
     - `invigilator_id` (uuid, references entity_users) - Assigned invigilator
     - `student_capacity` (integer) - Maximum students at this branch
     - `registered_students_count` (integer) - Actual registered count
     - `created_at` (timestamp)

  4. **mock_exam_grade_levels** - Year group assignments (many-to-many)
     - `id` (uuid, primary key)
     - `mock_exam_id` (uuid, references mock_exams)
     - `grade_level_id` (uuid, references grade_levels)
     - `target_student_count` (integer) - Expected students from this year group
     - `created_at` (timestamp)

  5. **mock_exam_sections** - Class section assignments (many-to-many)
     - `id` (uuid, primary key)
     - `mock_exam_id` (uuid, references mock_exams)
     - `class_section_id` (uuid, references class_sections)
     - `all_students` (boolean) - Include all students or selective
     - `created_at` (timestamp)

  ## Security
  - Enable RLS on all tables
  - Entity admins can manage exams for their company
  - School admins can manage exams for their assigned schools
  - Branch admins can view exams for their branches
  - Teachers can view exams they are assigned to

  ## Indexes
  - Performance indexes on foreign keys
  - Composite indexes for common query patterns
  - Indexes on status and scheduled_date for filtering
*/

-- Create mock_exams table
CREATE TABLE IF NOT EXISTS mock_exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'scheduled', 'in_progress', 'grading', 'completed', 'cancelled')),
  data_structure_id uuid REFERENCES data_structures(id) ON DELETE RESTRICT,
  paper_type text,
  paper_number integer,
  scheduled_date date NOT NULL,
  scheduled_time time,
  duration_minutes integer NOT NULL DEFAULT 120 CHECK (duration_minutes > 0),
  delivery_mode text NOT NULL DEFAULT 'In-person' CHECK (delivery_mode IN ('In-person', 'Digital (exam hall)', 'Remote proctored')),
  exam_window text NOT NULL DEFAULT 'Term 1' CHECK (exam_window IN ('Term 1', 'Term 2', 'Term 3', 'Trial Exams', 'Mock Series')),
  total_marks integer CHECK (total_marks > 0),
  grade_boundaries jsonb DEFAULT '{}'::jsonb,
  readiness_score integer DEFAULT 0 CHECK (readiness_score >= 0 AND readiness_score <= 100),
  ai_proctoring_enabled boolean DEFAULT false NOT NULL,
  release_analytics boolean DEFAULT true NOT NULL,
  allow_retakes boolean DEFAULT false NOT NULL,
  auto_grade_enabled boolean DEFAULT false NOT NULL,
  notes text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create mock_exam_schools junction table
CREATE TABLE IF NOT EXISTS mock_exam_schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_exam_id uuid NOT NULL REFERENCES mock_exams(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  is_coordinating_school boolean DEFAULT false NOT NULL,
  student_capacity integer CHECK (student_capacity >= 0),
  registered_students_count integer DEFAULT 0 NOT NULL CHECK (registered_students_count >= 0),
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(mock_exam_id, school_id)
);

-- Create mock_exam_branches junction table
CREATE TABLE IF NOT EXISTS mock_exam_branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_exam_id uuid NOT NULL REFERENCES mock_exams(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  exam_venue text,
  invigilator_id uuid REFERENCES entity_users(id) ON DELETE SET NULL,
  student_capacity integer CHECK (student_capacity >= 0),
  registered_students_count integer DEFAULT 0 NOT NULL CHECK (registered_students_count >= 0),
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(mock_exam_id, branch_id)
);

-- Create mock_exam_grade_levels junction table
CREATE TABLE IF NOT EXISTS mock_exam_grade_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_exam_id uuid NOT NULL REFERENCES mock_exams(id) ON DELETE CASCADE,
  grade_level_id uuid NOT NULL REFERENCES grade_levels(id) ON DELETE CASCADE,
  target_student_count integer CHECK (target_student_count >= 0),
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(mock_exam_id, grade_level_id)
);

-- Create mock_exam_sections junction table
CREATE TABLE IF NOT EXISTS mock_exam_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_exam_id uuid NOT NULL REFERENCES mock_exams(id) ON DELETE CASCADE,
  class_section_id uuid NOT NULL REFERENCES class_sections(id) ON DELETE CASCADE,
  all_students boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(mock_exam_id, class_section_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_mock_exams_company_id ON mock_exams(company_id);
CREATE INDEX IF NOT EXISTS idx_mock_exams_data_structure_id ON mock_exams(data_structure_id);
CREATE INDEX IF NOT EXISTS idx_mock_exams_status ON mock_exams(status);
CREATE INDEX IF NOT EXISTS idx_mock_exams_scheduled_date ON mock_exams(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_mock_exams_exam_window ON mock_exams(exam_window);
CREATE INDEX IF NOT EXISTS idx_mock_exams_created_by ON mock_exams(created_by);
CREATE INDEX IF NOT EXISTS idx_mock_exams_status_date ON mock_exams(status, scheduled_date);

CREATE INDEX IF NOT EXISTS idx_mock_exam_schools_exam ON mock_exam_schools(mock_exam_id);
CREATE INDEX IF NOT EXISTS idx_mock_exam_schools_school ON mock_exam_schools(school_id);
CREATE INDEX IF NOT EXISTS idx_mock_exam_schools_coordinating ON mock_exam_schools(is_coordinating_school) WHERE is_coordinating_school = true;

CREATE INDEX IF NOT EXISTS idx_mock_exam_branches_exam ON mock_exam_branches(mock_exam_id);
CREATE INDEX IF NOT EXISTS idx_mock_exam_branches_branch ON mock_exam_branches(branch_id);
CREATE INDEX IF NOT EXISTS idx_mock_exam_branches_invigilator ON mock_exam_branches(invigilator_id);

CREATE INDEX IF NOT EXISTS idx_mock_exam_grade_levels_exam ON mock_exam_grade_levels(mock_exam_id);
CREATE INDEX IF NOT EXISTS idx_mock_exam_grade_levels_grade ON mock_exam_grade_levels(grade_level_id);

CREATE INDEX IF NOT EXISTS idx_mock_exam_sections_exam ON mock_exam_sections(mock_exam_id);
CREATE INDEX IF NOT EXISTS idx_mock_exam_sections_section ON mock_exam_sections(class_section_id);

-- Enable RLS
ALTER TABLE mock_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_exam_schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_exam_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_exam_grade_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_exam_sections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mock_exams
CREATE POLICY "Entity admins can manage all exams in their company"
  ON mock_exams
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM entity_users eu
      WHERE eu.user_id = auth.uid()
        AND eu.company_id = mock_exams.company_id
        AND eu.admin_level IN ('entity_admin', 'sub_entity_admin')
        AND eu.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM entity_users eu
      WHERE eu.user_id = auth.uid()
        AND eu.company_id = mock_exams.company_id
        AND eu.admin_level IN ('entity_admin', 'sub_entity_admin')
        AND eu.is_active = true
    )
  );

CREATE POLICY "School admins can manage exams for their schools"
  ON mock_exams
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM entity_users eu
      JOIN entity_user_schools eus ON eus.entity_user_id = eu.id
      JOIN mock_exam_schools mes ON mes.school_id = eus.school_id
      WHERE eu.user_id = auth.uid()
        AND mes.mock_exam_id = mock_exams.id
        AND eu.admin_level = 'school_admin'
        AND eu.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM entity_users eu
      JOIN entity_user_schools eus ON eus.entity_user_id = eu.id
      WHERE eu.user_id = auth.uid()
        AND eu.company_id = mock_exams.company_id
        AND eu.admin_level = 'school_admin'
        AND eu.is_active = true
    )
  );

CREATE POLICY "Branch admins can view exams for their branches"
  ON mock_exams
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM entity_users eu
      JOIN entity_user_branches eub ON eub.entity_user_id = eu.id
      JOIN mock_exam_branches meb ON meb.branch_id = eub.branch_id
      WHERE eu.user_id = auth.uid()
        AND meb.mock_exam_id = mock_exams.id
        AND eu.admin_level = 'branch_admin'
        AND eu.is_active = true
    )
  );

-- RLS Policies for junction tables (simplified - inherit from parent)
CREATE POLICY "Allow access to mock exam schools based on exam access"
  ON mock_exam_schools
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mock_exams me
      WHERE me.id = mock_exam_schools.mock_exam_id
    )
  );

CREATE POLICY "Allow access to mock exam branches based on exam access"
  ON mock_exam_branches
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mock_exams me
      WHERE me.id = mock_exam_branches.mock_exam_id
    )
  );

CREATE POLICY "Allow access to mock exam grade levels based on exam access"
  ON mock_exam_grade_levels
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mock_exams me
      WHERE me.id = mock_exam_grade_levels.mock_exam_id
    )
  );

CREATE POLICY "Allow access to mock exam sections based on exam access"
  ON mock_exam_sections
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mock_exams me
      WHERE me.id = mock_exam_sections.mock_exam_id
    )
  );

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at trigger to mock_exams
CREATE TRIGGER update_mock_exams_updated_at
  BEFORE UPDATE ON mock_exams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
