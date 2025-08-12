/*
  # Create edu_courses table

  1. New Tables
    - `edu_courses`
      - `id` (uuid, primary key)
      - `subject_id` (uuid, foreign key to edu_subjects)
      - `name` (text)
      - `code` (text)
      - `level` (text)
      - `description` (text, optional)
      - `status` (text, default 'active')
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `edu_courses` table
    - Add policy for authenticated users to read courses
    - Add policy for system admins to manage courses

  3. Indexes
    - Add index on subject_id for faster lookups
    - Add index on status for filtering
*/

CREATE TABLE IF NOT EXISTS edu_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES edu_subjects(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  level text DEFAULT 'General',
  description text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE edu_courses ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_edu_courses_subject_id ON edu_courses(subject_id);
CREATE INDEX IF NOT EXISTS idx_edu_courses_status ON edu_courses(status);
CREATE INDEX IF NOT EXISTS idx_edu_courses_code ON edu_courses(code);

-- RLS Policies
CREATE POLICY "Users can read active courses"
  ON edu_courses
  FOR SELECT
  TO authenticated
  USING (status = 'active');

CREATE POLICY "System admins can manage courses"
  ON edu_courses
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'System Admin'
      AND ur.status = 'active'
      AND r.status = 'active'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_edu_courses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_edu_courses_updated_at
  BEFORE UPDATE ON edu_courses
  FOR EACH ROW
  EXECUTE FUNCTION update_edu_courses_updated_at();