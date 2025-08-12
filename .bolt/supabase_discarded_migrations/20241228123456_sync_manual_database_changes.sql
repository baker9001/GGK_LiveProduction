-- Migration: Add manually created tables and columns
-- This migration captures all tables and columns that were created manually in Supabase

-- 1. Add missing columns to existing tables
ALTER TABLE questions_master_admin 
ADD COLUMN IF NOT EXISTS year integer,
ADD COLUMN IF NOT EXISTS question_content_type text,
ADD COLUMN IF NOT EXISTS is_confirmed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS confirmed_at timestamp without time zone,
ADD COLUMN IF NOT EXISTS confirmed_by uuid,
ADD COLUMN IF NOT EXISTS qa_notes text,
ADD COLUMN IF NOT EXISTS context_metadata jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS has_context_structure boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS answer_format character varying,
ADD COLUMN IF NOT EXISTS context_extraction_status character varying DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS answer_requirement text,
ADD COLUMN IF NOT EXISTS total_alternatives integer,
ADD COLUMN IF NOT EXISTS correct_answer text;

ALTER TABLE sub_questions
ADD COLUMN IF NOT EXISTS is_confirmed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS confirmed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS confirmed_by uuid,
ADD COLUMN IF NOT EXISTS context_metadata jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS has_context_structure boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS answer_format character varying,
ADD COLUMN IF NOT EXISTS answer_requirement text,
ADD COLUMN IF NOT EXISTS total_alternatives integer,
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS correct_answer text;

ALTER TABLE papers_setup
ADD COLUMN IF NOT EXISTS qa_started_at timestamp without time zone,
ADD COLUMN IF NOT EXISTS qa_started_by uuid,
ADD COLUMN IF NOT EXISTS qa_completed_at timestamp without time zone,
ADD COLUMN IF NOT EXISTS qa_completed_by uuid,
ADD COLUMN IF NOT EXISTS last_status_change_at timestamp without time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS last_status_change_by uuid,
ADD COLUMN IF NOT EXISTS analytics_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS context_analysis_completed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS total_context_components integer DEFAULT 0;

ALTER TABLE question_options
ADD COLUMN IF NOT EXISTS label character varying,
ADD COLUMN IF NOT EXISTS text text,
ADD COLUMN IF NOT EXISTS image_id uuid,
ADD COLUMN IF NOT EXISTS explanation text,
ADD COLUMN IF NOT EXISTS context_type character varying,
ADD COLUMN IF NOT EXISTS context_value character varying,
ADD COLUMN IF NOT EXISTS context_label character varying;

-- 2. Create answer components table
CREATE TABLE IF NOT EXISTS answer_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid REFERENCES questions_master_admin(id) ON DELETE CASCADE,
  sub_question_id uuid REFERENCES sub_questions(id) ON DELETE CASCADE,
  alternative_id integer NOT NULL,
  answer_text text NOT NULL,
  marks numeric NOT NULL,
  context_type character varying NOT NULL,
  context_value character varying NOT NULL,
  context_label character varying,
  is_correct boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CHECK ((question_id IS NOT NULL AND sub_question_id IS NULL) OR 
         (question_id IS NULL AND sub_question_id IS NOT NULL))
);

-- 3. Create answer requirements table
CREATE TABLE IF NOT EXISTS answer_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid REFERENCES questions_master_admin(id) ON DELETE CASCADE,
  sub_question_id uuid REFERENCES sub_questions(id) ON DELETE CASCADE,
  requirement_type character varying NOT NULL,
  total_alternatives integer NOT NULL,
  min_required integer DEFAULT 1,
  max_required integer,
  created_at timestamp with time zone DEFAULT now(),
  CHECK ((question_id IS NOT NULL AND sub_question_id IS NULL) OR 
         (question_id IS NULL AND sub_question_id IS NOT NULL))
);

-- 4. Create question correct answers table
CREATE TABLE IF NOT EXISTS question_correct_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid REFERENCES questions_master_admin(id) ON DELETE CASCADE,
  sub_question_id uuid REFERENCES sub_questions(id) ON DELETE CASCADE,
  answer text NOT NULL,
  marks integer,
  alternative_id integer,
  context_type text,
  context_value text,
  context_label text,
  created_at timestamp with time zone DEFAULT now(),
  CHECK ((question_id IS NOT NULL AND sub_question_id IS NULL) OR 
         (question_id IS NULL AND sub_question_id IS NOT NULL))
);

-- 5. Create question distractors table
CREATE TABLE IF NOT EXISTS question_distractors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid REFERENCES questions_master_admin(id) ON DELETE CASCADE,
  sub_question_id uuid REFERENCES sub_questions(id) ON DELETE CASCADE,
  option_label text NOT NULL,
  context_type text,
  context_value text,
  context_label text,
  created_at timestamp with time zone DEFAULT now(),
  CHECK ((question_id IS NOT NULL AND sub_question_id IS NULL) OR 
         (question_id IS NULL AND sub_question_id IS NOT NULL))
);

-- 6. Create question confirmations table
CREATE TABLE IF NOT EXISTS question_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES questions_master_admin(id) ON DELETE CASCADE,
  action character varying NOT NULL,
  performed_by uuid NOT NULL,
  performed_at timestamp without time zone DEFAULT now(),
  notes text,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- 7. Create paper status history table
CREATE TABLE IF NOT EXISTS paper_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id uuid NOT NULL REFERENCES papers_setup(id) ON DELETE CASCADE,
  previous_status character varying,
  new_status character varying NOT NULL,
  changed_by uuid NOT NULL,
  changed_at timestamp without time zone DEFAULT now(),
  reason text,
  metadata jsonb
);

-- 8. Create analytics tables
CREATE TABLE IF NOT EXISTS analytics_facts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date_key integer NOT NULL,
  student_id uuid,
  question_id uuid REFERENCES questions_master_admin(id),
  sub_question_id uuid REFERENCES sub_questions(id),
  paper_id uuid REFERENCES papers_setup(id),
  data_structure_id uuid REFERENCES data_structures(id),
  subject_id uuid REFERENCES edu_subjects(id),
  unit_id uuid REFERENCES edu_units(id),
  topic_id uuid REFERENCES edu_topics(id),
  subtopic_id uuid REFERENCES edu_subtopics(id),
  context_type character varying NOT NULL,
  context_value character varying NOT NULL,
  difficulty character varying,
  question_type character varying,
  attempts integer DEFAULT 0,
  correct_attempts integer DEFAULT 0,
  total_marks_possible numeric DEFAULT 0,
  total_marks_achieved numeric DEFAULT 0,
  avg_time_spent_seconds numeric,
  success_rate numeric DEFAULT 0.0000,
  mastery_score numeric DEFAULT 0.0000,
  improvement_rate numeric DEFAULT 0.0000,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 9. Create context performance tables
CREATE TABLE IF NOT EXISTS context_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid,
  response_id uuid,
  session_id uuid,
  component_id uuid REFERENCES answer_components(id),
  question_id uuid REFERENCES questions_master_admin(id),
  sub_question_id uuid REFERENCES sub_questions(id),
  paper_id uuid REFERENCES papers_setup(id),
  context_type character varying NOT NULL,
  context_value character varying NOT NULL,
  context_label character varying,
  achieved_marks numeric DEFAULT 0,
  possible_marks numeric NOT NULL,
  is_correct boolean NOT NULL,
  confidence_score numeric,
  response_text text,
  time_spent_seconds integer,
  attempt_number integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT now()
);

-- 10. Create context mastery cache
CREATE TABLE IF NOT EXISTS context_mastery_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid,
  context_type character varying NOT NULL,
  context_value character varying NOT NULL,
  subject_id uuid REFERENCES edu_subjects(id),
  unit_id uuid REFERENCES edu_units(id),
  topic_id uuid REFERENCES edu_topics(id),
  subtopic_id uuid REFERENCES edu_subtopics(id),
  mastery_level numeric DEFAULT 0.00,
  weighted_mastery numeric DEFAULT 0.00,
  total_attempts integer DEFAULT 0,
  successful_attempts integer DEFAULT 0,
  total_marks_achieved numeric DEFAULT 0,
  total_marks_possible numeric DEFAULT 0,
  first_attempt_at timestamp with time zone,
  last_attempt_at timestamp with time zone,
  last_updated timestamp with time zone DEFAULT now()
);

-- 11. Create context difficulty metrics
CREATE TABLE IF NOT EXISTS context_difficulty_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  context_type character varying NOT NULL,
  context_value character varying NOT NULL,
  subject_id uuid REFERENCES edu_subjects(id),
  unit_id uuid REFERENCES edu_units(id),
  topic_id uuid REFERENCES edu_topics(id),
  avg_success_rate numeric DEFAULT 0.0000,
  student_count integer DEFAULT 0,
  attempt_count integer DEFAULT 0,
  discrimination_index numeric,
  std_deviation numeric,
  median_time_seconds integer,
  avg_time_seconds numeric,
  difficulty_level character varying DEFAULT 'medium',
  cognitive_load character varying DEFAULT 'medium',
  calculation_period_start date,
  calculation_period_end date,
  last_calculated timestamp with time zone DEFAULT now()
);

-- 12. Create past paper files table
CREATE TABLE IF NOT EXISTS past_paper_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_session_id uuid REFERENCES past_paper_import_sessions(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_content jsonb NOT NULL,
  uploaded_by uuid,
  created_at timestamp with time zone DEFAULT now()
);

-- 13. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_answer_components_question ON answer_components(question_id);
CREATE INDEX IF NOT EXISTS idx_answer_components_sub_question ON answer_components(sub_question_id);
CREATE INDEX IF NOT EXISTS idx_answer_components_context ON answer_components(context_type, context_value);

CREATE INDEX IF NOT EXISTS idx_answer_requirements_question ON answer_requirements(question_id);
CREATE INDEX IF NOT EXISTS idx_answer_requirements_sub_question ON answer_requirements(sub_question_id);

CREATE INDEX IF NOT EXISTS idx_question_correct_answers_question ON question_correct_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_question_correct_answers_sub_question ON question_correct_answers(sub_question_id);

CREATE INDEX IF NOT EXISTS idx_question_distractors_question ON question_distractors(question_id);
CREATE INDEX IF NOT EXISTS idx_question_distractors_sub_question ON question_distractors(sub_question_id);

CREATE INDEX IF NOT EXISTS idx_analytics_facts_student ON analytics_facts(student_id);
CREATE INDEX IF NOT EXISTS idx_analytics_facts_context ON analytics_facts(context_type, context_value);
CREATE INDEX IF NOT EXISTS idx_analytics_facts_date ON analytics_facts(date_key);

CREATE INDEX IF NOT EXISTS idx_context_performance_student ON context_performance(student_id);
CREATE INDEX IF NOT EXISTS idx_context_performance_context ON context_performance(context_type, context_value);

CREATE INDEX IF NOT EXISTS idx_context_mastery_student ON context_mastery_cache(student_id);
CREATE INDEX IF NOT EXISTS idx_context_mastery_context ON context_mastery_cache(context_type, context_value);

-- 14. Create views
CREATE OR REPLACE VIEW paper_qa_progress AS
SELECT 
  p.id as paper_id,
  p.paper_code,
  p.status,
  COUNT(DISTINCT q.id) as total_questions,
  COUNT(DISTINCT CASE WHEN q.is_confirmed THEN q.id END) as confirmed_questions,
  COUNT(DISTINCT sq.id) as total_sub_questions,
  COUNT(DISTINCT CASE WHEN sq.is_confirmed THEN sq.id END) as confirmed_sub_questions,
  CASE 
    WHEN COUNT(DISTINCT q.id) + COUNT(DISTINCT sq.id) = 0 THEN 0
    ELSE (COUNT(DISTINCT CASE WHEN q.is_confirmed THEN q.id END) + 
          COUNT(DISTINCT CASE WHEN sq.is_confirmed THEN sq.id END))::float / 
         (COUNT(DISTINCT q.id) + COUNT(DISTINCT sq.id))::float * 100
  END as qa_progress_percentage
FROM papers_setup p
LEFT JOIN questions_master_admin q ON q.paper_id = p.id
LEFT JOIN sub_questions sq ON sq.question_id = q.id
GROUP BY p.id, p.paper_code, p.status;

CREATE OR REPLACE VIEW qa_review_summary AS
SELECT 
  p.id as paper_id,
  p.paper_code,
  p.exam_session,
  p.exam_year,
  p.status as paper_status,
  p.last_status_change_by,
  COUNT(DISTINCT q.id) as total_questions,
  COUNT(DISTINCT CASE WHEN q.is_confirmed THEN q.id END) as confirmed_questions,
  COUNT(DISTINCT sq.id) as total_sub_questions,
  COUNT(DISTINCT CASE WHEN sq.is_confirmed THEN sq.id END) as confirmed_sub_questions,
  ROUND(
    CASE 
      WHEN COUNT(DISTINCT q.id) + COUNT(DISTINCT sq.id) = 0 THEN 0
      ELSE (COUNT(DISTINCT CASE WHEN q.is_confirmed THEN q.id END) + 
            COUNT(DISTINCT CASE WHEN sq.is_confirmed THEN sq.id END))::numeric / 
           (COUNT(DISTINCT q.id) + COUNT(DISTINCT sq.id))::numeric * 100
    END, 2
  ) as qa_progress_percentage,
  MAX(q.confirmed_at) as last_question_confirmed_at,
  MAX(sq.confirmed_at) as last_sub_question_confirmed_at
FROM papers_setup p
LEFT JOIN questions_master_admin q ON q.paper_id = p.id
LEFT JOIN sub_questions sq ON sq.question_id = q.id
GROUP BY p.id, p.paper_code, p.exam_session, p.exam_year, p.status, p.last_status_change_by;

CREATE OR REPLACE VIEW recent_context_performance AS
SELECT * FROM context_performance 
WHERE created_at >= NOW() - INTERVAL '30 days';

-- 15. Create RLS policies (if needed)
-- Add your RLS policies here based on your security requirements