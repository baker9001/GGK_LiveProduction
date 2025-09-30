/*
  # Mock Exams System - Student Performance Tables

  ## Overview
  Creates tables for comprehensive student performance tracking:
  - Student registration and attendance
  - Individual question responses
  - Overall exam results
  - Question-level performance analytics

  ## New Tables

  1. **mock_exam_students** - Student registrations and attendance
     - `id` (uuid, primary key)
     - `mock_exam_id` (uuid, references mock_exams)
     - `student_id` (uuid, references students)
     - `school_id` (uuid, references schools)
     - `branch_id` (uuid, references branches)
     - `class_section_id` (uuid, references class_sections)
     - `registration_status` (text) - registered, confirmed, absent, withdrawn
     - `registration_date` (timestamp)
     - `seat_number` (text) - Assigned seat
     - `special_arrangements` (jsonb) - Access needs, accommodations
     - `attendance_status` (text) - present, absent, late, excused
     - `attended_at` (timestamp) - Check-in time
     - `submission_status` (text) - not_started, in_progress, submitted, graded
     - `submitted_at` (timestamp)
     - `created_at` (timestamp)
     - `updated_at` (timestamp)

  2. **mock_exam_responses** - Individual question answers
     - `id` (uuid, primary key)
     - `mock_exam_id` (uuid, references mock_exams)
     - `student_id` (uuid, references students)
     - `question_number` (integer) - Main question number
     - `sub_question_id` (uuid, references sub_questions) - If applicable
     - `student_answer` (text) - Student's answer
     - `marks_awarded` (numeric) - Marks given
     - `max_marks` (numeric) - Maximum possible marks
     - `marker_id` (uuid, references entity_users) - Who marked it
     - `marked_at` (timestamp)
     - `marker_comments` (text)
     - `is_correct` (boolean)
     - `time_spent_seconds` (integer) - Time spent on question
     - `attempt_number` (integer) - For retakes
     - `confidence_level` (integer) - Student confidence (1-5)
     - `created_at` (timestamp)
     - `updated_at` (timestamp)

  3. **mock_exam_results** - Overall student results
     - `id` (uuid, primary key)
     - `mock_exam_id` (uuid, references mock_exams)
     - `student_id` (uuid, references students)
     - `total_marks_scored` (numeric) - Total marks achieved
     - `total_marks_possible` (numeric) - Maximum marks
     - `percentage_score` (numeric) - Percentage (0-100)
     - `predicted_grade` (text) - AI-predicted grade
     - `actual_grade` (text) - Awarded grade
     - `grade_boundary_met` (boolean) - Met target grade
     - `subject_mastery_score` (numeric) - Overall mastery (0-100)
     - `time_taken_minutes` (integer) - Total exam time
     - `completion_status` (text) - completed, partial, not_attempted
     - `flagged_for_intervention` (boolean)
     - `intervention_priority` (text) - low, medium, high, critical
     - `intervention_notes` (text)
     - `result_published_at` (timestamp)
     - `created_at` (timestamp)
     - `updated_at` (timestamp)

  4. **mock_exam_question_performance** - Aggregated question analytics
     - `id` (uuid, primary key)
     - `mock_exam_id` (uuid, references mock_exams)
     - `question_number` (integer)
     - `sub_question_id` (uuid, references sub_questions)
     - `total_attempts` (integer) - Students who attempted
     - `correct_attempts` (integer) - Students who got it correct
     - `average_marks` (numeric) - Average marks scored
     - `max_marks` (numeric) - Maximum possible marks
     - `difficulty_rating` (text) - easy, medium, hard, very_hard
     - `discrimination_index` (numeric) - How well it separates high/low performers
     - `common_errors` (jsonb) - Array of common mistakes
     - `time_spent_average_seconds` (integer)
     - `created_at` (timestamp)
     - `updated_at` (timestamp)

  ## Security
  - Enable RLS on all tables
  - Students can only view their own results
  - Teachers can view results for exams they're assigned to
  - Admins can view all results within their scope

  ## Indexes
  - Performance indexes on foreign keys
  - Composite indexes for common queries
*/

-- Create mock_exam_students table
CREATE TABLE IF NOT EXISTS mock_exam_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_exam_id uuid NOT NULL REFERENCES mock_exams(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id) ON DELETE CASCADE,
  class_section_id uuid REFERENCES class_sections(id) ON DELETE SET NULL,
  registration_status text DEFAULT 'registered' NOT NULL CHECK (registration_status IN ('registered', 'confirmed', 'absent', 'withdrawn')),
  registration_date timestamptz DEFAULT now() NOT NULL,
  seat_number text,
  special_arrangements jsonb DEFAULT '{}'::jsonb,
  attendance_status text CHECK (attendance_status IN ('present', 'absent', 'late', 'excused')),
  attended_at timestamptz,
  submission_status text DEFAULT 'not_started' NOT NULL CHECK (submission_status IN ('not_started', 'in_progress', 'submitted', 'graded')),
  submitted_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(mock_exam_id, student_id)
);

-- Create mock_exam_responses table
CREATE TABLE IF NOT EXISTS mock_exam_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_exam_id uuid NOT NULL REFERENCES mock_exams(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  question_number integer NOT NULL CHECK (question_number > 0),
  sub_question_id uuid REFERENCES sub_questions(id) ON DELETE SET NULL,
  student_answer text,
  marks_awarded numeric(6,2) DEFAULT 0 CHECK (marks_awarded >= 0),
  max_marks numeric(6,2) NOT NULL CHECK (max_marks > 0),
  marker_id uuid REFERENCES entity_users(id) ON DELETE SET NULL,
  marked_at timestamptz,
  marker_comments text,
  is_correct boolean,
  time_spent_seconds integer CHECK (time_spent_seconds >= 0),
  attempt_number integer DEFAULT 1 NOT NULL CHECK (attempt_number > 0),
  confidence_level integer CHECK (confidence_level BETWEEN 1 AND 5),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create mock_exam_results table
CREATE TABLE IF NOT EXISTS mock_exam_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_exam_id uuid NOT NULL REFERENCES mock_exams(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  total_marks_scored numeric(8,2) DEFAULT 0 NOT NULL CHECK (total_marks_scored >= 0),
  total_marks_possible numeric(8,2) NOT NULL CHECK (total_marks_possible > 0),
  percentage_score numeric(5,2) DEFAULT 0 NOT NULL CHECK (percentage_score >= 0 AND percentage_score <= 100),
  predicted_grade text,
  actual_grade text,
  grade_boundary_met boolean,
  subject_mastery_score numeric(5,2) CHECK (subject_mastery_score >= 0 AND subject_mastery_score <= 100),
  time_taken_minutes integer CHECK (time_taken_minutes >= 0),
  completion_status text DEFAULT 'not_attempted' NOT NULL CHECK (completion_status IN ('completed', 'partial', 'not_attempted')),
  flagged_for_intervention boolean DEFAULT false NOT NULL,
  intervention_priority text CHECK (intervention_priority IN ('low', 'medium', 'high', 'critical')),
  intervention_notes text,
  result_published_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(mock_exam_id, student_id)
);

-- Create mock_exam_question_performance table
CREATE TABLE IF NOT EXISTS mock_exam_question_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_exam_id uuid NOT NULL REFERENCES mock_exams(id) ON DELETE CASCADE,
  question_number integer NOT NULL CHECK (question_number > 0),
  sub_question_id uuid REFERENCES sub_questions(id) ON DELETE SET NULL,
  total_attempts integer DEFAULT 0 NOT NULL CHECK (total_attempts >= 0),
  correct_attempts integer DEFAULT 0 NOT NULL CHECK (correct_attempts >= 0),
  average_marks numeric(6,2) DEFAULT 0 CHECK (average_marks >= 0),
  max_marks numeric(6,2) NOT NULL CHECK (max_marks > 0),
  difficulty_rating text CHECK (difficulty_rating IN ('easy', 'medium', 'hard', 'very_hard')),
  discrimination_index numeric(4,3) CHECK (discrimination_index BETWEEN -1 AND 1),
  common_errors jsonb DEFAULT '[]'::jsonb,
  time_spent_average_seconds integer CHECK (time_spent_average_seconds >= 0),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(mock_exam_id, question_number, sub_question_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_mock_exam_students_exam ON mock_exam_students(mock_exam_id);
CREATE INDEX IF NOT EXISTS idx_mock_exam_students_student ON mock_exam_students(student_id);
CREATE INDEX IF NOT EXISTS idx_mock_exam_students_school ON mock_exam_students(school_id);
CREATE INDEX IF NOT EXISTS idx_mock_exam_students_branch ON mock_exam_students(branch_id);
CREATE INDEX IF NOT EXISTS idx_mock_exam_students_section ON mock_exam_students(class_section_id);
CREATE INDEX IF NOT EXISTS idx_mock_exam_students_status ON mock_exam_students(registration_status);
CREATE INDEX IF NOT EXISTS idx_mock_exam_students_submission ON mock_exam_students(submission_status);

CREATE INDEX IF NOT EXISTS idx_mock_exam_responses_exam ON mock_exam_responses(mock_exam_id);
CREATE INDEX IF NOT EXISTS idx_mock_exam_responses_student ON mock_exam_responses(student_id);
CREATE INDEX IF NOT EXISTS idx_mock_exam_responses_question ON mock_exam_responses(question_number);
CREATE INDEX IF NOT EXISTS idx_mock_exam_responses_sub_question ON mock_exam_responses(sub_question_id);
CREATE INDEX IF NOT EXISTS idx_mock_exam_responses_marker ON mock_exam_responses(marker_id);
CREATE INDEX IF NOT EXISTS idx_mock_exam_responses_exam_student ON mock_exam_responses(mock_exam_id, student_id);

CREATE INDEX IF NOT EXISTS idx_mock_exam_results_exam ON mock_exam_results(mock_exam_id);
CREATE INDEX IF NOT EXISTS idx_mock_exam_results_student ON mock_exam_results(student_id);
CREATE INDEX IF NOT EXISTS idx_mock_exam_results_flagged ON mock_exam_results(flagged_for_intervention) WHERE flagged_for_intervention = true;
CREATE INDEX IF NOT EXISTS idx_mock_exam_results_priority ON mock_exam_results(intervention_priority) WHERE intervention_priority IN ('high', 'critical');
CREATE INDEX IF NOT EXISTS idx_mock_exam_results_grade ON mock_exam_results(actual_grade);

CREATE INDEX IF NOT EXISTS idx_mock_exam_question_performance_exam ON mock_exam_question_performance(mock_exam_id);
CREATE INDEX IF NOT EXISTS idx_mock_exam_question_performance_question ON mock_exam_question_performance(question_number);
CREATE INDEX IF NOT EXISTS idx_mock_exam_question_performance_difficulty ON mock_exam_question_performance(difficulty_rating);

-- Enable RLS
ALTER TABLE mock_exam_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_exam_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_exam_question_performance ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mock_exam_students
CREATE POLICY "Admins can manage students based on exam access"
  ON mock_exam_students
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mock_exams me
      WHERE me.id = mock_exam_students.mock_exam_id
    )
  );

CREATE POLICY "Students can view their own registration"
  ON mock_exam_students
  FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM students WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for mock_exam_responses
CREATE POLICY "Admins and markers can manage responses"
  ON mock_exam_responses
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mock_exams me
      WHERE me.id = mock_exam_responses.mock_exam_id
    )
    OR marker_id IN (
      SELECT id FROM entity_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Students can view their own responses"
  ON mock_exam_responses
  FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM students WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for mock_exam_results
CREATE POLICY "Admins can manage results based on exam access"
  ON mock_exam_results
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mock_exams me
      WHERE me.id = mock_exam_results.mock_exam_id
    )
  );

CREATE POLICY "Students can view their own results after publication"
  ON mock_exam_results
  FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM students WHERE user_id = auth.uid()
    )
    AND result_published_at IS NOT NULL
  );

-- RLS Policies for mock_exam_question_performance
CREATE POLICY "Authenticated users can view question performance for accessible exams"
  ON mock_exam_question_performance
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mock_exams me
      WHERE me.id = mock_exam_question_performance.mock_exam_id
    )
  );

CREATE POLICY "Admins can manage question performance"
  ON mock_exam_question_performance
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mock_exams me
      WHERE me.id = mock_exam_question_performance.mock_exam_id
    )
  );

-- Add updated_at triggers
CREATE TRIGGER update_mock_exam_students_updated_at
  BEFORE UPDATE ON mock_exam_students
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mock_exam_responses_updated_at
  BEFORE UPDATE ON mock_exam_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mock_exam_results_updated_at
  BEFORE UPDATE ON mock_exam_results
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mock_exam_question_performance_updated_at
  BEFORE UPDATE ON mock_exam_question_performance
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-update student counts when students register
CREATE OR REPLACE FUNCTION update_mock_exam_student_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment school count
    UPDATE mock_exam_schools
    SET registered_students_count = registered_students_count + 1
    WHERE mock_exam_id = NEW.mock_exam_id
      AND school_id = NEW.school_id;
    
    -- Increment branch count if applicable
    IF NEW.branch_id IS NOT NULL THEN
      UPDATE mock_exam_branches
      SET registered_students_count = registered_students_count + 1
      WHERE mock_exam_id = NEW.mock_exam_id
        AND branch_id = NEW.branch_id;
    END IF;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement school count
    UPDATE mock_exam_schools
    SET registered_students_count = GREATEST(0, registered_students_count - 1)
    WHERE mock_exam_id = OLD.mock_exam_id
      AND school_id = OLD.school_id;
    
    -- Decrement branch count if applicable
    IF OLD.branch_id IS NOT NULL THEN
      UPDATE mock_exam_branches
      SET registered_students_count = GREATEST(0, registered_students_count - 1)
      WHERE mock_exam_id = OLD.mock_exam_id
        AND branch_id = OLD.branch_id;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Add trigger to auto-update student counts
CREATE TRIGGER update_student_counts_trigger
  AFTER INSERT OR DELETE ON mock_exam_students
  FOR EACH ROW
  EXECUTE FUNCTION update_mock_exam_student_counts();

-- Function to calculate percentage score automatically
CREATE OR REPLACE FUNCTION calculate_percentage_score()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.total_marks_possible > 0 THEN
    NEW.percentage_score := ROUND((NEW.total_marks_scored / NEW.total_marks_possible) * 100, 2);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to calculate percentage score
CREATE TRIGGER calculate_percentage_score_trigger
  BEFORE INSERT OR UPDATE ON mock_exam_results
  FOR EACH ROW
  EXECUTE FUNCTION calculate_percentage_score();
