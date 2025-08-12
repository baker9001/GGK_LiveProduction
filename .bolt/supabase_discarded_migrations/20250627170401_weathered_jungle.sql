/*
  # Create education catalogue tables

  1. New Tables
    - `edu_subjects`
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `code` (text, required)
      - `status` (text, required: 'active' or 'inactive')
      - `created_at` (timestamp)

    - `edu_courses`
      - `id` (uuid, primary key)
      - `subject_id` (uuid, foreign key to edu_subjects)
      - `name` (text, required)
      - `level` (text, required)
      - `status` (text, required: 'active' or 'inactive')
      - `created_at` (timestamp)

    - `edu_units`
      - `id` (uuid, primary key)
      - `course_id` (uuid, foreign key to edu_courses)
      - `name` (text, required)
      - `code` (text, required)
      - `status` (text, required: 'active' or 'inactive')
      - `created_at` (timestamp)

  2. Foreign Keys
    - edu_courses.subject_id references edu_subjects(id)
    - edu_units.course_id references edu_courses(id)

  3. Security
    - No RLS policies needed as these are admin-managed tables
*/

-- Subjects table
CREATE TABLE IF NOT EXISTS edu_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Courses table
CREATE TABLE IF NOT EXISTS edu_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES edu_subjects(id),
  name text NOT NULL,
  level text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

-- Units table
CREATE TABLE IF NOT EXISTS edu_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES edu_courses(id),
  name text NOT NULL,
  code text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);