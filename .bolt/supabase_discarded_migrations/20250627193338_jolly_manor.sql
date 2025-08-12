/*
  # Create education catalog tables

  1. New Tables
    - `edu_subjects` - Subject information
    - `edu_courses` - Course information
    - `edu_units` - Unit/module information
    - `edu_topics` - Topic information
    - `edu_subtopics` - Subtopic information
    - `edu_learning_objectives` - Learning objectives
    - `edu_specific_concepts` - Specific concepts

  2. Foreign Keys
    - edu_courses.subject_id references edu_subjects(id)
    - edu_units.course_id references edu_courses(id)
    - edu_topics.unit_id references edu_units(id)
    - edu_subtopics.topic_id references edu_topics(id)
    - edu_learning_objectives.subtopic_id references edu_subtopics(id)
    - edu_specific_concepts.objective_id references edu_learning_objectives(id)

  3. Security
    - Enable RLS on all tables
*/

-- Create edu_subjects table
CREATE TABLE IF NOT EXISTS edu_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create unique index on code
CREATE UNIQUE INDEX IF NOT EXISTS edu_subjects_code_key ON edu_subjects(code);

-- Create edu_courses table
CREATE TABLE IF NOT EXISTS edu_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES edu_subjects(id),
  name text NOT NULL,
  level text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

-- Create edu_units table
CREATE TABLE IF NOT EXISTS edu_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES edu_courses(id),
  name text NOT NULL,
  code text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

-- Create edu_topics table
CREATE TABLE IF NOT EXISTS edu_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES edu_units(id),
  name text NOT NULL,
  sort integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create edu_subtopics table
CREATE TABLE IF NOT EXISTS edu_subtopics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES edu_topics(id),
  name text NOT NULL,
  sort integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create edu_learning_objectives table
CREATE TABLE IF NOT EXISTS edu_learning_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subtopic_id uuid NOT NULL REFERENCES edu_subtopics(id),
  description text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create edu_specific_concepts table
CREATE TABLE IF NOT EXISTS edu_specific_concepts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id uuid NOT NULL REFERENCES edu_learning_objectives(id),
  description text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);