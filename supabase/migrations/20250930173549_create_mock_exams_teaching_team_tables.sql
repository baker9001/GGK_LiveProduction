/*
  # Mock Exams System - Teaching Team and Resources Tables

  ## Overview
  Creates tables for managing teaching staff, exam materials, and venues:
  - Teacher assignments with roles (lead teacher, invigilator, marker, examiner)
  - Exam materials management (question papers, mark schemes, instructions)
  - Venue management with capacity and special arrangements

  ## New Tables

  1. **mock_exam_teachers** - Teacher/staff assignments
     - `id` (uuid, primary key)
     - `mock_exam_id` (uuid, references mock_exams)
     - `entity_user_id` (uuid, references entity_users) - The assigned teacher/admin
     - `role` (text) - lead_teacher, invigilator, moderator, examiner, marker
     - `school_id` (uuid, references schools) - Which school context
     - `branch_id` (uuid, references branches) - Which branch they're assigned to
     - `workload_hours` (numeric) - Estimated workload hours
     - `is_confirmed` (boolean) - Teacher confirmed availability
     - `notes` (text) - Assignment notes
     - `created_at` (timestamp)

  2. **mock_exam_materials** - Exam documents and resources
     - `id` (uuid, primary key)
     - `mock_exam_id` (uuid, references mock_exams)
     - `material_type` (text) - question_paper, mark_scheme, candidate_instructions, examiner_report, etc.
     - `file_path` (text) - Storage path
     - `uploaded_by` (uuid, references users)
     - `upload_date` (timestamp)
     - `version` (integer) - Version number for tracking revisions
     - `is_active` (boolean) - Current active version
     - `file_size_bytes` (bigint) - File size for validation
     - `mime_type` (text) - File MIME type
     - `created_at` (timestamp)

  3. **mock_exam_venues** - Exam venue details
     - `id` (uuid, primary key)
     - `mock_exam_id` (uuid, references mock_exams)
     - `branch_id` (uuid, references branches)
     - `room_name` (text) - Room/hall name
     - `capacity` (integer) - Maximum student capacity
     - `special_arrangements` (jsonb) - Accessibility, equipment, etc.
     - `equipment_required` (text[]) - Array of required equipment
     - `booking_status` (text) - pending, confirmed, cancelled
     - `created_at` (timestamp)
     - `updated_at` (timestamp)

  ## Security
  - Enable RLS on all tables
  - Inherit access permissions from parent mock_exams
  - Teachers can view their own assignments

  ## Constraints
  - Prevent teacher double-booking at same date/time
  - Ensure venue capacity isn't exceeded
  - Validate material types
*/

-- Create mock_exam_teachers table
CREATE TABLE IF NOT EXISTS mock_exam_teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_exam_id uuid NOT NULL REFERENCES mock_exams(id) ON DELETE CASCADE,
  entity_user_id uuid NOT NULL REFERENCES entity_users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('lead_teacher', 'invigilator', 'moderator', 'examiner', 'marker', 'support_staff')),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id) ON DELETE CASCADE,
  workload_hours numeric(5,2) DEFAULT 0 CHECK (workload_hours >= 0),
  is_confirmed boolean DEFAULT false NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(mock_exam_id, entity_user_id, role)
);

-- Create mock_exam_materials table
CREATE TABLE IF NOT EXISTS mock_exam_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_exam_id uuid NOT NULL REFERENCES mock_exams(id) ON DELETE CASCADE,
  material_type text NOT NULL CHECK (material_type IN ('question_paper', 'mark_scheme', 'candidate_instructions', 'examiner_report', 'specimen_answers', 'grade_boundaries', 'other')),
  file_path text NOT NULL,
  uploaded_by uuid REFERENCES users(id) ON DELETE SET NULL,
  upload_date timestamptz DEFAULT now() NOT NULL,
  version integer DEFAULT 1 NOT NULL CHECK (version > 0),
  is_active boolean DEFAULT true NOT NULL,
  file_size_bytes bigint CHECK (file_size_bytes > 0),
  mime_type text,
  description text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create mock_exam_venues table
CREATE TABLE IF NOT EXISTS mock_exam_venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_exam_id uuid NOT NULL REFERENCES mock_exams(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  room_name text NOT NULL,
  capacity integer NOT NULL CHECK (capacity > 0),
  special_arrangements jsonb DEFAULT '{}'::jsonb,
  equipment_required text[],
  booking_status text DEFAULT 'pending' NOT NULL CHECK (booking_status IN ('pending', 'confirmed', 'cancelled')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(mock_exam_id, branch_id, room_name)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_mock_exam_teachers_exam ON mock_exam_teachers(mock_exam_id);
CREATE INDEX IF NOT EXISTS idx_mock_exam_teachers_user ON mock_exam_teachers(entity_user_id);
CREATE INDEX IF NOT EXISTS idx_mock_exam_teachers_school ON mock_exam_teachers(school_id);
CREATE INDEX IF NOT EXISTS idx_mock_exam_teachers_branch ON mock_exam_teachers(branch_id);
CREATE INDEX IF NOT EXISTS idx_mock_exam_teachers_role ON mock_exam_teachers(role);
CREATE INDEX IF NOT EXISTS idx_mock_exam_teachers_confirmed ON mock_exam_teachers(is_confirmed) WHERE is_confirmed = false;

CREATE INDEX IF NOT EXISTS idx_mock_exam_materials_exam ON mock_exam_materials(mock_exam_id);
CREATE INDEX IF NOT EXISTS idx_mock_exam_materials_type ON mock_exam_materials(material_type);
CREATE INDEX IF NOT EXISTS idx_mock_exam_materials_active ON mock_exam_materials(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_mock_exam_materials_uploaded_by ON mock_exam_materials(uploaded_by);

CREATE INDEX IF NOT EXISTS idx_mock_exam_venues_exam ON mock_exam_venues(mock_exam_id);
CREATE INDEX IF NOT EXISTS idx_mock_exam_venues_branch ON mock_exam_venues(branch_id);
CREATE INDEX IF NOT EXISTS idx_mock_exam_venues_status ON mock_exam_venues(booking_status);

-- Enable RLS
ALTER TABLE mock_exam_teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_exam_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_exam_venues ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mock_exam_teachers
CREATE POLICY "Allow access to teachers based on exam access"
  ON mock_exam_teachers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mock_exams me
      WHERE me.id = mock_exam_teachers.mock_exam_id
    )
    OR entity_user_id IN (
      SELECT id FROM entity_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can view their own assignments"
  ON mock_exam_teachers
  FOR SELECT
  TO authenticated
  USING (
    entity_user_id IN (
      SELECT id FROM entity_users WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for mock_exam_materials
CREATE POLICY "Allow access to materials based on exam access"
  ON mock_exam_materials
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mock_exams me
      WHERE me.id = mock_exam_materials.mock_exam_id
    )
  );

-- RLS Policies for mock_exam_venues
CREATE POLICY "Allow access to venues based on exam access"
  ON mock_exam_venues
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mock_exams me
      WHERE me.id = mock_exam_venues.mock_exam_id
    )
  );

-- Add updated_at trigger to mock_exam_venues
CREATE TRIGGER update_mock_exam_venues_updated_at
  BEFORE UPDATE ON mock_exam_venues
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to check teacher availability (prevent double-booking)
CREATE OR REPLACE FUNCTION check_teacher_availability()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if teacher is already assigned to another exam at the same time
  IF EXISTS (
    SELECT 1 
    FROM mock_exam_teachers met
    JOIN mock_exams me ON me.id = met.mock_exam_id
    JOIN mock_exams new_me ON new_me.id = NEW.mock_exam_id
    WHERE met.entity_user_id = NEW.entity_user_id
      AND met.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND me.scheduled_date = new_me.scheduled_date
      AND (
        -- Check for time overlap
        (me.scheduled_time, me.scheduled_time + (me.duration_minutes || ' minutes')::interval)
        OVERLAPS
        (new_me.scheduled_time, new_me.scheduled_time + (new_me.duration_minutes || ' minutes')::interval)
      )
      AND me.status NOT IN ('cancelled', 'completed')
  ) THEN
    RAISE EXCEPTION 'Teacher is already assigned to another exam at this time';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to check teacher availability
CREATE TRIGGER check_teacher_availability_trigger
  BEFORE INSERT OR UPDATE ON mock_exam_teachers
  FOR EACH ROW
  EXECUTE FUNCTION check_teacher_availability();

-- Function to validate venue capacity
CREATE OR REPLACE FUNCTION validate_venue_capacity()
RETURNS TRIGGER AS $$
DECLARE
  total_students integer;
  venue_capacity integer;
BEGIN
  -- Get total registered students for this exam at this branch
  SELECT COALESCE(SUM(meb.registered_students_count), 0)
  INTO total_students
  FROM mock_exam_branches meb
  WHERE meb.mock_exam_id = NEW.mock_exam_id
    AND meb.branch_id = NEW.branch_id;
  
  -- Get venue capacity
  SELECT capacity INTO venue_capacity
  FROM mock_exam_venues
  WHERE id = NEW.id;
  
  -- Check if capacity is exceeded
  IF total_students > venue_capacity THEN
    RAISE WARNING 'Venue capacity (%) may be exceeded with % registered students', 
      venue_capacity, total_students;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to validate venue capacity
CREATE TRIGGER validate_venue_capacity_trigger
  BEFORE INSERT OR UPDATE ON mock_exam_venues
  FOR EACH ROW
  EXECUTE FUNCTION validate_venue_capacity();
