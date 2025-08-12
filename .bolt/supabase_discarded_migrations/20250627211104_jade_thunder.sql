/*
  # Create edu_courses table

  1. New Tables
    - `edu_courses`
      - `id` (uuid, primary key)
      - `subject_id` (uuid, foreign key to edu_subjects)
      - `name` (text, course name)
      - `level` (text, course level)
      - `status` (text, active/inactive)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `edu_courses` table
    - Add policy for authenticated users to manage courses

  3. Constraints
    - Foreign key constraint to edu_subjects table
    - Check constraint for status values
*/

CREATE TABLE IF NOT EXISTS public.edu_courses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id uuid NOT NULL,
    name text NOT NULL,
    level text NOT NULL,
    status text NOT NULL DEFAULT 'active',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT fk_edu_courses_subject FOREIGN KEY (subject_id) REFERENCES public.edu_subjects(id) ON DELETE CASCADE,
    CONSTRAINT chk_edu_courses_status CHECK (status IN ('active', 'inactive'))
);

-- Enable RLS
ALTER TABLE public.edu_courses ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Allow full access to authenticated users on edu_courses"
  ON public.edu_courses
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_edu_courses_subject_id ON public.edu_courses(subject_id);
CREATE INDEX IF NOT EXISTS idx_edu_courses_status ON public.edu_courses(status);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'set_updated_at_edu_courses'
    ) THEN
        CREATE TRIGGER set_updated_at_edu_courses
            BEFORE UPDATE ON public.edu_courses
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;