/*
  # Mock Exams System - Analytics Tables and Views (Final)

  Creates advanced analytics infrastructure for mock exam performance tracking
*/

-- Create student_mock_performance_analytics table
CREATE TABLE IF NOT EXISTS student_mock_performance_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  mock_exam_id uuid NOT NULL REFERENCES mock_exams(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES edu_subjects(id) ON DELETE SET NULL,
  topic_breakdown jsonb DEFAULT '{}'::jsonb,
  strength_areas jsonb DEFAULT '[]'::jsonb,
  weakness_areas jsonb DEFAULT '[]'::jsonb,
  improvement_rate numeric(5,2) CHECK (improvement_rate BETWEEN -100 AND 100),
  consistency_score numeric(5,2) CHECK (consistency_score BETWEEN 0 AND 100),
  time_management_score numeric(5,2) CHECK (time_management_score BETWEEN 0 AND 100),
  conceptual_understanding_score numeric(5,2) CHECK (conceptual_understanding_score BETWEEN 0 AND 100),
  application_skills_score numeric(5,2) CHECK (application_skills_score BETWEEN 0 AND 100),
  analytical_depth_score numeric(5,2) CHECK (analytical_depth_score BETWEEN 0 AND 100),
  study_recommendations jsonb DEFAULT '[]'::jsonb,
  generated_at timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(student_id, mock_exam_id)
);

-- Create ai_study_plans table
CREATE TABLE IF NOT EXISTS ai_study_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  mock_exam_id uuid REFERENCES mock_exams(id) ON DELETE CASCADE,
  plan_type text NOT NULL CHECK (plan_type IN ('remedial', 'maintenance', 'acceleration', 'comprehensive')),
  target_grade text NOT NULL,
  current_grade text,
  focus_topics jsonb DEFAULT '[]'::jsonb,
  recommended_resources jsonb DEFAULT '[]'::jsonb,
  practice_schedule jsonb DEFAULT '{}'::jsonb,
  milestones jsonb DEFAULT '[]'::jsonb,
  progress_tracking jsonb DEFAULT '{}'::jsonb,
  ai_confidence_score numeric(5,2) CHECK (ai_confidence_score BETWEEN 0 AND 100),
  generated_by text DEFAULT 'AI' NOT NULL CHECK (generated_by IN ('AI', 'teacher', 'system')),
  approved_by uuid REFERENCES entity_users(id) ON DELETE SET NULL,
  status text DEFAULT 'draft' NOT NULL CHECK (status IN ('draft', 'active', 'completed', 'archived', 'cancelled')),
  valid_from date NOT NULL,
  valid_to date NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CHECK (valid_to > valid_from)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_student_analytics_student ON student_mock_performance_analytics(student_id);
CREATE INDEX IF NOT EXISTS idx_student_analytics_exam ON student_mock_performance_analytics(mock_exam_id);
CREATE INDEX IF NOT EXISTS idx_student_analytics_subject ON student_mock_performance_analytics(subject_id);

CREATE INDEX IF NOT EXISTS idx_ai_study_plans_student ON ai_study_plans(student_id);
CREATE INDEX IF NOT EXISTS idx_ai_study_plans_exam ON ai_study_plans(mock_exam_id);
CREATE INDEX IF NOT EXISTS idx_ai_study_plans_status ON ai_study_plans(status);
CREATE INDEX IF NOT EXISTS idx_ai_study_plans_type ON ai_study_plans(plan_type);

-- Enable RLS
ALTER TABLE student_mock_performance_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_study_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage analytics based on student access"
  ON student_mock_performance_analytics FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM students s JOIN entity_users eu ON eu.company_id = s.company_id WHERE s.id = student_mock_performance_analytics.student_id AND eu.user_id = auth.uid() AND eu.is_active = true));

CREATE POLICY "Students can view their own analytics"
  ON student_mock_performance_analytics FOR SELECT TO authenticated
  USING (student_id IN (SELECT id FROM students WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage study plans based on student access"
  ON ai_study_plans FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM students s JOIN entity_users eu ON eu.company_id = s.company_id WHERE s.id = ai_study_plans.student_id AND eu.user_id = auth.uid() AND eu.is_active = true));

CREATE POLICY "Students can view their own study plans"
  ON ai_study_plans FOR SELECT TO authenticated
  USING (student_id IN (SELECT id FROM students WHERE user_id = auth.uid()));

-- Add triggers
CREATE TRIGGER update_ai_study_plans_updated_at BEFORE UPDATE ON ai_study_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create simplified view: mock_exam_cohort_analytics
CREATE OR REPLACE VIEW mock_exam_cohort_analytics AS
SELECT 
  me.id AS exam_id,
  me.company_id,
  me.title AS exam_title,
  mes.school_id,
  s.name AS school_name,
  COUNT(DISTINCT mer.student_id) AS total_students,
  ROUND(AVG(mer.percentage_score)::numeric, 2) AS average_score,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY mer.percentage_score)::numeric, 2) AS median_score,
  ROUND(MAX(mer.percentage_score)::numeric, 2) AS highest_score,
  ROUND(MIN(mer.percentage_score)::numeric, 2) AS lowest_score,
  COUNT(CASE WHEN mer.flagged_for_intervention THEN 1 END) AS students_flagged
FROM mock_exams me
LEFT JOIN mock_exam_schools mes ON mes.mock_exam_id = me.id
LEFT JOIN schools s ON s.id = mes.school_id
LEFT JOIN mock_exam_results mer ON mer.mock_exam_id = me.id
WHERE mer.result_published_at IS NOT NULL
GROUP BY me.id, me.company_id, me.title, mes.school_id, s.name;

-- Create view: mock_exam_overview
CREATE OR REPLACE VIEW mock_exam_overview AS
SELECT 
  me.id,
  me.company_id,
  c.name AS company_name,
  me.title,
  me.status,
  me.data_structure_id,
  pr.name AS exam_board,
  prog.name AS programme,
  subj.name AS subject,
  me.paper_type,
  me.scheduled_date,
  me.scheduled_time,
  me.duration_minutes,
  me.delivery_mode,
  me.exam_window,
  me.readiness_score,
  COUNT(DISTINCT mes.school_id) AS schools_count,
  COUNT(DISTINCT mest.student_id) AS registered_students_count,
  COUNT(DISTINCT CASE WHEN mer.flagged_for_intervention THEN mest.student_id END) AS flagged_students_count,
  me.notes,
  me.created_at
FROM mock_exams me
JOIN companies c ON c.id = me.company_id
LEFT JOIN data_structures ds ON ds.id = me.data_structure_id
LEFT JOIN providers pr ON pr.id = ds.provider_id
LEFT JOIN programs prog ON prog.id = ds.program_id
LEFT JOIN edu_subjects subj ON subj.id = ds.subject_id
LEFT JOIN mock_exam_schools mes ON mes.mock_exam_id = me.id
LEFT JOIN mock_exam_students mest ON mest.mock_exam_id = me.id
LEFT JOIN mock_exam_results mer ON mer.mock_exam_id = me.id AND mer.student_id = mest.student_id
GROUP BY me.id, c.name, pr.name, prog.name, subj.name;

-- Function to calculate readiness score
CREATE OR REPLACE FUNCTION calculate_mock_exam_readiness(exam_id uuid)
RETURNS integer AS $$
DECLARE
  readiness_score integer := 0;
BEGIN
  IF EXISTS (SELECT 1 FROM mock_exam_materials WHERE mock_exam_id = exam_id AND material_type = 'question_paper' AND is_active = true) THEN
    readiness_score := readiness_score + 25;
  END IF;
  IF EXISTS (SELECT 1 FROM mock_exam_teachers WHERE mock_exam_id = exam_id) THEN
    readiness_score := readiness_score + 25;
  END IF;
  IF EXISTS (SELECT 1 FROM mock_exam_students WHERE mock_exam_id = exam_id) THEN
    readiness_score := readiness_score + 25;
  END IF;
  IF EXISTS (SELECT 1 FROM mock_exam_venues WHERE mock_exam_id = exam_id AND booking_status = 'confirmed') THEN
    readiness_score := readiness_score + 15;
  END IF;
  RETURN LEAST(readiness_score + 10, 100);
END;
$$ LANGUAGE plpgsql;

-- Function to generate AI study plan
CREATE OR REPLACE FUNCTION generate_ai_study_plan(p_student_id uuid, p_mock_exam_id uuid)
RETURNS uuid AS $$
DECLARE
  v_plan_id uuid;
  v_percentage numeric;
  v_plan_type text;
  v_target_grade text;
BEGIN
  SELECT percentage_score INTO v_percentage FROM mock_exam_results WHERE student_id = p_student_id AND mock_exam_id = p_mock_exam_id;
  
  IF v_percentage < 50 THEN v_plan_type := 'remedial'; v_target_grade := 'C';
  ELSIF v_percentage < 70 THEN v_plan_type := 'maintenance'; v_target_grade := 'B';
  ELSE v_plan_type := 'acceleration'; v_target_grade := 'A*';
  END IF;
  
  INSERT INTO ai_study_plans (student_id, mock_exam_id, plan_type, target_grade, valid_from, valid_to, status)
  VALUES (p_student_id, p_mock_exam_id, v_plan_type, v_target_grade, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 'draft')
  RETURNING id INTO v_plan_id;
  
  RETURN v_plan_id;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION calculate_mock_exam_readiness TO authenticated;
GRANT EXECUTE ON FUNCTION generate_ai_study_plan TO authenticated;
