/*
  # Create Education Content Tables

  This migration creates the complete educational content structure needed for the learning management system.

  ## New Tables
  1. **edu_subjects** - Educational subjects (renamed from subjects)
     - `id` (uuid, primary key)
     - `name` (text, not null)
     - `code` (text, nullable)
     - `logo` (text, nullable) - renamed from logo_url
     - `status` (text, default 'active')
     - `created_at` (timestamptz, default now())

  2. **edu_courses** - Courses within subjects
     - `id` (uuid, primary key)
     - `subject_id` (uuid, foreign key to edu_subjects)
     - `name` (text, not null)
     - `level` (text, nullable)
     - `status` (text, default 'active')
     - `created_at` (timestamptz, default now())

  3. **edu_units** - Units/modules within courses
     - `id` (uuid, primary key)
     - `subject_id` (uuid, foreign key to edu_subjects)
     - `name` (text, not null)
     - `code` (text, nullable)
     - `status` (text, default 'active')
     - `created_at` (timestamptz, default now())

  4. **edu_topics** - Topics within units
     - `id` (uuid, primary key)
     - `unit_id` (uuid, foreign key to edu_units)
     - `name` (text, not null)
     - `sort` (integer, nullable)
     - `status` (text, default 'active')
     - `created_at` (timestamptz, default now())

  5. **edu_subtopics** - Subtopics within topics
     - `id` (uuid, primary key)
     - `topic_id` (uuid, foreign key to edu_topics)
     - `name` (text, not null)
     - `sort` (integer, nullable)
     - `status` (text, default 'active')
     - `created_at` (timestamptz, default now())

  6. **edu_learning_objectives** - Learning objectives within subtopics
     - `id` (uuid, primary key)
     - `subtopic_id` (uuid, foreign key to edu_subtopics)
     - `description` (text, not null)
     - `sort` (integer, nullable)
     - `status` (text, default 'active')
     - `created_at` (timestamptz, default now())

  7. **edu_specific_concepts** - Specific concepts within learning objectives
     - `id` (uuid, primary key)
     - `objective_id` (uuid, foreign key to edu_learning_objectives)
     - `description` (text, not null)
     - `status` (text, default 'active')
     - `created_at` (timestamptz, default now())

  ## Security
  - Enable RLS on all tables
  - Add policies for authenticated users to read/write data
  - Add policies for system admins to manage all data

  ## Changes to Existing Tables
  - Rename `subjects` table to `edu_subjects`
  - Update `data_structures` foreign key constraint
  - Rename `logo_url` column to `logo` in edu_subjects
*/

-- First, check if subjects table exists and rename it to edu_subjects
DO $$
BEGIN
  -- Check if subjects table exists and edu_subjects doesn't
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subjects' AND table_schema = 'public')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'edu_subjects' AND table_schema = 'public') THEN
    
    -- Rename subjects table to edu_subjects
    ALTER TABLE subjects RENAME TO edu_subjects;
    
    -- Rename logo_url column to logo if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'edu_subjects' AND column_name = 'logo_url') THEN
      ALTER TABLE edu_subjects RENAME COLUMN logo_url TO logo;
    END IF;
    
    -- Add logo column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'edu_subjects' AND column_name = 'logo') THEN
      ALTER TABLE edu_subjects ADD COLUMN logo text;
    END IF;
    
  END IF;
END $$;

-- Create edu_subjects table if it doesn't exist
CREATE TABLE IF NOT EXISTS edu_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text,
  logo text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now()
);

-- Create edu_courses table
CREATE TABLE IF NOT EXISTS edu_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES edu_subjects(id) ON DELETE CASCADE,
  name text NOT NULL,
  level text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now()
);

-- Create edu_units table
CREATE TABLE IF NOT EXISTS edu_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES edu_subjects(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now()
);

-- Create edu_topics table
CREATE TABLE IF NOT EXISTS edu_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES edu_units(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort integer,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now()
);

-- Create edu_subtopics table
CREATE TABLE IF NOT EXISTS edu_subtopics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES edu_topics(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort integer,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now()
);

-- Create edu_learning_objectives table
CREATE TABLE IF NOT EXISTS edu_learning_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subtopic_id uuid NOT NULL REFERENCES edu_subtopics(id) ON DELETE CASCADE,
  description text NOT NULL,
  sort integer,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now()
);

-- Create edu_specific_concepts table
CREATE TABLE IF NOT EXISTS edu_specific_concepts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id uuid NOT NULL REFERENCES edu_learning_objectives(id) ON DELETE CASCADE,
  description text NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now()
);

-- Update data_structures table to reference edu_subjects if needed
DO $$
BEGIN
  -- Check if data_structures table exists and has subject_id column
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'data_structures' AND table_schema = 'public')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'data_structures' AND column_name = 'subject_id') THEN
    
    -- Drop existing foreign key constraint if it exists
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name LIKE '%subject_id%' 
               AND table_name = 'data_structures' 
               AND constraint_type = 'FOREIGN KEY') THEN
      
      -- Get the constraint name and drop it
      DECLARE
        constraint_name_var text;
      BEGIN
        SELECT constraint_name INTO constraint_name_var
        FROM information_schema.table_constraints 
        WHERE constraint_name LIKE '%subject_id%' 
        AND table_name = 'data_structures' 
        AND constraint_type = 'FOREIGN KEY'
        LIMIT 1;
        
        IF constraint_name_var IS NOT NULL THEN
          EXECUTE 'ALTER TABLE data_structures DROP CONSTRAINT ' || constraint_name_var;
        END IF;
      END;
    END IF;
    
    -- Add new foreign key constraint to edu_subjects
    ALTER TABLE data_structures 
    ADD CONSTRAINT data_structures_subject_id_fkey 
    FOREIGN KEY (subject_id) REFERENCES edu_subjects(id) ON DELETE CASCADE;
    
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_edu_courses_subject_id ON edu_courses(subject_id);
CREATE INDEX IF NOT EXISTS idx_edu_units_subject_id ON edu_units(subject_id);
CREATE INDEX IF NOT EXISTS idx_edu_topics_unit_id ON edu_topics(unit_id);
CREATE INDEX IF NOT EXISTS idx_edu_subtopics_topic_id ON edu_subtopics(topic_id);
CREATE INDEX IF NOT EXISTS idx_edu_learning_objectives_subtopic_id ON edu_learning_objectives(subtopic_id);
CREATE INDEX IF NOT EXISTS idx_edu_specific_concepts_objective_id ON edu_specific_concepts(objective_id);

-- Create unique constraints to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_edu_subjects_name_unique ON edu_subjects(name) WHERE status = 'active';
CREATE UNIQUE INDEX IF NOT EXISTS idx_edu_courses_subject_name_unique ON edu_courses(subject_id, name) WHERE status = 'active';
CREATE UNIQUE INDEX IF NOT EXISTS idx_edu_units_subject_name_unique ON edu_units(subject_id, name) WHERE status = 'active';
CREATE UNIQUE INDEX IF NOT EXISTS idx_edu_topics_unit_name_unique ON edu_topics(unit_id, name) WHERE status = 'active';
CREATE UNIQUE INDEX IF NOT EXISTS idx_edu_subtopics_topic_name_unique ON edu_subtopics(topic_id, name) WHERE status = 'active';

-- Enable Row Level Security
ALTER TABLE edu_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE edu_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE edu_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE edu_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE edu_subtopics ENABLE ROW LEVEL SECURITY;
ALTER TABLE edu_learning_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE edu_specific_concepts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for edu_subjects
CREATE POLICY "Users can read edu_subjects"
  ON edu_subjects
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System admins can manage edu_subjects"
  ON edu_subjects
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create RLS policies for edu_courses
CREATE POLICY "Users can read edu_courses"
  ON edu_courses
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System admins can manage edu_courses"
  ON edu_courses
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create RLS policies for edu_units
CREATE POLICY "Users can read edu_units"
  ON edu_units
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System admins can manage edu_units"
  ON edu_units
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create RLS policies for edu_topics
CREATE POLICY "Users can read edu_topics"
  ON edu_topics
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System admins can manage edu_topics"
  ON edu_topics
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create RLS policies for edu_subtopics
CREATE POLICY "Users can read edu_subtopics"
  ON edu_subtopics
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System admins can manage edu_subtopics"
  ON edu_subtopics
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create RLS policies for edu_learning_objectives
CREATE POLICY "Users can read edu_learning_objectives"
  ON edu_learning_objectives
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System admins can manage edu_learning_objectives"
  ON edu_learning_objectives
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create RLS policies for edu_specific_concepts
CREATE POLICY "Users can read edu_specific_concepts"
  ON edu_specific_concepts
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System admins can manage edu_specific_concepts"
  ON edu_specific_concepts
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);