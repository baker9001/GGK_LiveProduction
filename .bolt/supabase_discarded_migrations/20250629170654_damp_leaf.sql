/*
  # Create Questions Management Tables

  1. New Tables
    - `questions_master_admin` - Main questions table
      - `id` (uuid, primary key)
      - `paper_id` (uuid, foreign key to papers_setup)
      - `data_structure_id` (uuid, foreign key to data_structures)
      - `region_id` (uuid, foreign key to regions)
      - `program_id` (uuid, foreign key to programs)
      - `provider_id` (uuid, foreign key to providers)
      - `subject_id` (uuid, foreign key to edu_subjects)
      - `chapter_id` (uuid, foreign key to edu_units)
      - `topic_id` (uuid, foreign key to edu_topics)
      - `subtopic_id` (uuid, foreign key to edu_subtopics)
      - `category` (text, 'direct' or 'complex')
      - `type` (text, 'mcq', 'tf', 'descriptive', or null)
      - `question_number` (integer)
      - `question_header` (text)
      - `question_description` (text)
      - `explanation` (text)
      - `hint` (text)
      - `marks` (integer)
      - `difficulty` (text)
      - `status` (text, 'active' or 'inactive')
      - `created_by` (uuid)
      - `updated_by` (uuid)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `import_session_id` (uuid)

    - `sub_questions` - Sub-questions table (recursive structure)
      - `id` (uuid, primary key)
      - `question_id` (uuid, foreign key to questions_master_admin)
      - `parent_id` (uuid, foreign key to sub_questions, nullable)
      - `level` (integer)
      - `order_index` (integer)
      - `type` (text, 'mcq', 'tf', 'descriptive')
      - `topic_id` (uuid, foreign key to edu_topics)
      - `subtopic_id` (uuid, foreign key to edu_subtopics)
      - `part_label` (text)
      - `question_description` (text)
      - `explanation` (text)
      - `marks` (integer)
      - `difficulty` (text)
      - `status` (text, 'active' or 'inactive')
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `question_options` - Options for MCQ and TF questions
      - `id` (uuid, primary key)
      - `question_id` (uuid, foreign key to questions_master_admin, nullable)
      - `sub_question_id` (uuid, foreign key to sub_questions, nullable)
      - `option_text` (text)
      - `is_correct` (boolean)
      - `order` (integer)
      - `created_at` (timestamp)

    - `questions_hints` - Hints for questions
      - `id` (uuid, primary key)
      - `question_id` (uuid, foreign key to questions_master_admin, nullable)
      - `sub_question_id` (uuid, foreign key to sub_questions, nullable)
      - `hint_text` (text)
      - `created_at` (timestamp)

    - `questions_attachments` - Attachments for questions
      - `id` (uuid, primary key)
      - `question_id` (uuid, foreign key to questions_master_admin, nullable)
      - `sub_question_id` (uuid, foreign key to sub_questions, nullable)
      - `file_url` (text)
      - `file_name` (text)
      - `file_type` (text)
      - `file_size` (integer)
      - `uploaded_by` (uuid)
      - `created_at` (timestamp)

    - `question_subtopics` - Many-to-many relationship between questions and subtopics
      - `id` (uuid, primary key)
      - `question_id` (uuid, foreign key to questions_master_admin, nullable)
      - `sub_question_id` (uuid, foreign key to sub_questions, nullable)
      - `subtopic_id` (uuid, foreign key to edu_subtopics)
      - `created_at` (timestamp)

    - `past_paper_import_sessions` - Import sessions for past papers
      - `id` (uuid, primary key)
      - `uploader_id` (uuid)
      - `subject_id` (uuid, foreign key to edu_subjects)
      - `data_structure_id` (uuid, foreign key to data_structures)
      - `paper_id` (uuid, foreign key to papers_setup)
      - `year` (integer)
      - `exam_session` (text)
      - `paper_number` (text)
      - `variant_number` (text)
      - `question_paper_url` (text)
      - `mark_scheme_url` (text)
      - `status` (text, 'importing', 'completed', 'error')
      - `error_message` (text)
      - `metadata` (jsonb)
      - `created_at` (timestamp)
      - `processed_at` (timestamp)

  2. Foreign Keys
    - questions_master_admin.paper_id references papers_setup(id)
    - questions_master_admin.data_structure_id references data_structures(id)
    - questions_master_admin.region_id references regions(id)
    - questions_master_admin.program_id references programs(id)
    - questions_master_admin.provider_id references providers(id)
    - questions_master_admin.subject_id references edu_subjects(id)
    - questions_master_admin.chapter_id references edu_units(id)
    - questions_master_admin.topic_id references edu_topics(id)
    - questions_master_admin.subtopic_id references edu_subtopics(id)
    - sub_questions.question_id references questions_master_admin(id)
    - sub_questions.parent_id references sub_questions(id)
    - sub_questions.topic_id references edu_topics(id)
    - sub_questions.subtopic_id references edu_subtopics(id)
    - question_options.question_id references questions_master_admin(id)
    - question_options.sub_question_id references sub_questions(id)
    - questions_hints.question_id references questions_master_admin(id)
    - questions_hints.sub_question_id references sub_questions(id)
    - questions_attachments.question_id references questions_master_admin(id)
    - questions_attachments.sub_question_id references sub_questions(id)
    - question_subtopics.question_id references questions_master_admin(id)
    - question_subtopics.sub_question_id references sub_questions(id)
    - question_subtopics.subtopic_id references edu_subtopics(id)
    - past_paper_import_sessions.subject_id references edu_subjects(id)
    - past_paper_import_sessions.data_structure_id references data_structures(id)
    - past_paper_import_sessions.paper_id references papers_setup(id)

  3. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create questions_master_admin table
CREATE TABLE IF NOT EXISTS questions_master_admin (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id uuid REFERENCES papers_setup(id) ON DELETE SET NULL,
  data_structure_id uuid REFERENCES data_structures(id) ON DELETE SET NULL,
  region_id uuid REFERENCES regions(id) ON DELETE SET NULL,
  program_id uuid REFERENCES programs(id) ON DELETE SET NULL,
  provider_id uuid REFERENCES providers(id) ON DELETE SET NULL,
  subject_id uuid REFERENCES edu_subjects(id) ON DELETE SET NULL,
  chapter_id uuid REFERENCES edu_units(id) ON DELETE SET NULL,
  topic_id uuid REFERENCES edu_topics(id) ON DELETE SET NULL,
  subtopic_id uuid REFERENCES edu_subtopics(id) ON DELETE SET NULL,
  category text NOT NULL CHECK (category IN ('direct', 'complex')),
  type text CHECK (type IN ('mcq', 'tf', 'descriptive')),
  question_number integer,
  question_header text,
  question_description text NOT NULL,
  explanation text,
  hint text,
  marks integer NOT NULL,
  difficulty text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_by uuid,
  updated_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  import_session_id uuid
);

-- Create sub_questions table
CREATE TABLE IF NOT EXISTS sub_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES questions_master_admin(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES sub_questions(id) ON DELETE CASCADE,
  level integer DEFAULT 1,
  order_index integer DEFAULT 0,
  type text NOT NULL CHECK (type IN ('mcq', 'tf', 'descriptive')),
  topic_id uuid REFERENCES edu_topics(id) ON DELETE SET NULL,
  subtopic_id uuid REFERENCES edu_subtopics(id) ON DELETE SET NULL,
  part_label text,
  question_description text NOT NULL,
  explanation text,
  marks integer NOT NULL,
  difficulty text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create question_options table
CREATE TABLE IF NOT EXISTS question_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid REFERENCES questions_master_admin(id) ON DELETE CASCADE,
  sub_question_id uuid REFERENCES sub_questions(id) ON DELETE CASCADE,
  option_text text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  "order" integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT question_options_parent_check CHECK (
    (question_id IS NOT NULL AND sub_question_id IS NULL) OR
    (question_id IS NULL AND sub_question_id IS NOT NULL)
  )
);

-- Create questions_hints table
CREATE TABLE IF NOT EXISTS questions_hints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid REFERENCES questions_master_admin(id) ON DELETE CASCADE,
  sub_question_id uuid REFERENCES sub_questions(id) ON DELETE CASCADE,
  hint_text text NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT questions_hints_parent_check CHECK (
    (question_id IS NOT NULL AND sub_question_id IS NULL) OR
    (question_id IS NULL AND sub_question_id IS NOT NULL)
  )
);

-- Create questions_attachments table
CREATE TABLE IF NOT EXISTS questions_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid REFERENCES questions_master_admin(id) ON DELETE CASCADE,
  sub_question_id uuid REFERENCES sub_questions(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL,
  uploaded_by uuid,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT questions_attachments_parent_check CHECK (
    (question_id IS NOT NULL AND sub_question_id IS NULL) OR
    (question_id IS NULL AND sub_question_id IS NOT NULL)
  )
);

-- Create question_subtopics table
CREATE TABLE IF NOT EXISTS question_subtopics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid REFERENCES questions_master_admin(id) ON DELETE CASCADE,
  sub_question_id uuid REFERENCES sub_questions(id) ON DELETE CASCADE,
  subtopic_id uuid NOT NULL REFERENCES edu_subtopics(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT question_subtopics_parent_check CHECK (
    (question_id IS NOT NULL AND sub_question_id IS NULL) OR
    (question_id IS NULL AND sub_question_id IS NOT NULL)
  ),
  UNIQUE (question_id, sub_question_id, subtopic_id)
);

-- Create past_paper_import_sessions table
CREATE TABLE IF NOT EXISTS past_paper_import_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uploader_id uuid,
  subject_id uuid REFERENCES edu_subjects(id) ON DELETE SET NULL,
  data_structure_id uuid REFERENCES data_structures(id) ON DELETE SET NULL,
  paper_id uuid REFERENCES papers_setup(id) ON DELETE SET NULL,
  year integer,
  exam_session text,
  paper_number text,
  variant_number text,
  question_paper_url text,
  mark_scheme_url text,
  status text NOT NULL DEFAULT 'importing' CHECK (status IN ('importing', 'completed', 'error')),
  error_message text,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

-- Create storage bucket for question attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('questions-attachments', 'questions-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload/delete attachments
CREATE POLICY "Allow authenticated users to upload question attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'questions-attachments');

CREATE POLICY "Allow authenticated users to update their question attachments"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'questions-attachments');

CREATE POLICY "Allow authenticated users to delete their question attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'questions-attachments');

-- Allow public access to view question attachments
CREATE POLICY "Allow public to view question attachments"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'questions-attachments');

-- Enable Row Level Security
ALTER TABLE questions_master_admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions_hints ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_subtopics ENABLE ROW LEVEL SECURITY;
ALTER TABLE past_paper_import_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for questions_master_admin
CREATE POLICY "Users can read questions_master_admin"
  ON questions_master_admin
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System admins can manage questions_master_admin"
  ON questions_master_admin
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create RLS policies for sub_questions
CREATE POLICY "Users can read sub_questions"
  ON sub_questions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System admins can manage sub_questions"
  ON sub_questions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create RLS policies for question_options
CREATE POLICY "Users can read question_options"
  ON question_options
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System admins can manage question_options"
  ON question_options
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create RLS policies for questions_hints
CREATE POLICY "Users can read questions_hints"
  ON questions_hints
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System admins can manage questions_hints"
  ON questions_hints
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create RLS policies for questions_attachments
CREATE POLICY "Users can read questions_attachments"
  ON questions_attachments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System admins can manage questions_attachments"
  ON questions_attachments
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create RLS policies for question_subtopics
CREATE POLICY "Users can read question_subtopics"
  ON question_subtopics
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System admins can manage question_subtopics"
  ON question_subtopics
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create RLS policies for past_paper_import_sessions
CREATE POLICY "Users can read past_paper_import_sessions"
  ON past_paper_import_sessions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System admins can manage past_paper_import_sessions"
  ON past_paper_import_sessions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_questions_master_admin_paper_id ON questions_master_admin(paper_id);
CREATE INDEX idx_questions_master_admin_data_structure_id ON questions_master_admin(data_structure_id);
CREATE INDEX idx_questions_master_admin_topic_id ON questions_master_admin(topic_id);
CREATE INDEX idx_questions_master_admin_subtopic_id ON questions_master_admin(subtopic_id);
CREATE INDEX idx_questions_master_admin_status ON questions_master_admin(status);
CREATE INDEX idx_questions_master_admin_difficulty ON questions_master_admin(difficulty);
CREATE INDEX idx_questions_master_admin_import_session_id ON questions_master_admin(import_session_id);

CREATE INDEX idx_sub_questions_question_id ON sub_questions(question_id);
CREATE INDEX idx_sub_questions_parent_id ON sub_questions(parent_id);
CREATE INDEX idx_sub_questions_level ON sub_questions(level);
CREATE INDEX idx_sub_questions_status ON sub_questions(status);

CREATE INDEX idx_question_options_question_id ON question_options(question_id);
CREATE INDEX idx_question_options_sub_question_id ON question_options(sub_question_id);

CREATE INDEX idx_questions_hints_question_id ON questions_hints(question_id);
CREATE INDEX idx_questions_hints_sub_question_id ON questions_hints(sub_question_id);

CREATE INDEX idx_questions_attachments_question_id ON questions_attachments(question_id);
CREATE INDEX idx_questions_attachments_sub_question_id ON questions_attachments(sub_question_id);

CREATE INDEX idx_question_subtopics_question_id ON question_subtopics(question_id);
CREATE INDEX idx_question_subtopics_sub_question_id ON question_subtopics(sub_question_id);
CREATE INDEX idx_question_subtopics_subtopic_id ON question_subtopics(subtopic_id);

CREATE INDEX idx_past_paper_import_sessions_paper_id ON past_paper_import_sessions(paper_id);
CREATE INDEX idx_past_paper_import_sessions_status ON past_paper_import_sessions(status);

-- Create triggers to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_questions_master_admin_timestamp
  BEFORE UPDATE ON questions_master_admin
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_sub_questions_timestamp
  BEFORE UPDATE ON sub_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();