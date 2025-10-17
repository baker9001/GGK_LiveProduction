/*
  # Enhanced Practice Results Analytics System

  1. New Tables
    - `practice_results_analytics` - Pre-computed analytics for fast dashboard loading
      - Stores comprehensive performance breakdowns by unit, topic, subtopic, difficulty
      - Includes time metrics, accuracy percentages, and trend data

  2. Schema Extensions
    - Add analytical metadata columns to practice_sessions for quick access
    - Create indexes for optimal query performance on analytical dimensions

  3. Views
    - `practice_performance_by_unit` - Aggregated unit-level performance
    - `practice_performance_by_topic` - Topic-level performance metrics
    - `practice_performance_by_difficulty` - Difficulty analysis view

  4. Security
    - Enable RLS on all new tables
    - Students can only access their own analytics data
    - Admins have full access for monitoring and support
*/

-- ============================================================================
-- Enhanced Analytics Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS practice_results_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,

  -- Overall Performance Metrics
  total_questions integer NOT NULL DEFAULT 0,
  questions_answered integer NOT NULL DEFAULT 0,
  questions_correct integer NOT NULL DEFAULT 0,
  questions_partial integer NOT NULL DEFAULT 0,
  questions_incorrect integer NOT NULL DEFAULT 0,
  overall_accuracy numeric(5,2) NOT NULL DEFAULT 0,
  overall_percentage numeric(5,2) NOT NULL DEFAULT 0,
  grade_prediction text,

  -- Time Analytics
  total_time_seconds integer NOT NULL DEFAULT 0,
  average_time_per_question numeric(10,2),
  time_efficiency_score numeric(5,2),

  -- Unit/Topic/Subtopic Breakdown (JSONB for flexibility)
  unit_performance jsonb DEFAULT '[]'::jsonb,
  topic_performance jsonb DEFAULT '[]'::jsonb,
  subtopic_performance jsonb DEFAULT '[]'::jsonb,

  -- Difficulty Analysis
  difficulty_breakdown jsonb DEFAULT '{}'::jsonb,

  -- Question Type Analysis
  question_type_breakdown jsonb DEFAULT '{}'::jsonb,

  -- Strengths and Weaknesses
  strong_areas jsonb DEFAULT '[]'::jsonb,
  weak_areas jsonb DEFAULT '[]'::jsonb,
  priority_improvements jsonb DEFAULT '[]'::jsonb,

  -- Recommendations
  study_recommendations jsonb DEFAULT '[]'::jsonb,
  estimated_improvement_time integer,

  -- Comparative Data
  previous_attempt_comparison jsonb,
  peer_comparison jsonb,

  -- Metadata
  computed_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),

  UNIQUE(session_id)
);

-- Add analytical metadata to practice_sessions for quick access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'practice_sessions' AND column_name = 'overall_accuracy'
  ) THEN
    ALTER TABLE practice_sessions ADD COLUMN overall_accuracy numeric(5,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'practice_sessions' AND column_name = 'overall_percentage'
  ) THEN
    ALTER TABLE practice_sessions ADD COLUMN overall_percentage numeric(5,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'practice_sessions' AND column_name = 'time_per_question'
  ) THEN
    ALTER TABLE practice_sessions ADD COLUMN time_per_question numeric(10,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'practice_sessions' AND column_name = 'analytics_computed'
  ) THEN
    ALTER TABLE practice_sessions ADD COLUMN analytics_computed boolean DEFAULT false;
  END IF;
END $$;

-- ============================================================================
-- Performance Views
-- ============================================================================

-- Unit-level performance aggregation
CREATE OR REPLACE VIEW practice_performance_by_unit AS
SELECT
  ps.student_id,
  ps.id as session_id,
  pra.unit_performance,
  ps.created_at
FROM practice_sessions ps
JOIN practice_results_analytics pra ON ps.id = pra.session_id
WHERE ps.status = 'completed';

-- Topic-level performance aggregation
CREATE OR REPLACE VIEW practice_performance_by_topic AS
SELECT
  ps.student_id,
  ps.id as session_id,
  pra.topic_performance,
  ps.created_at
FROM practice_sessions ps
JOIN practice_results_analytics pra ON ps.id = pra.session_id
WHERE ps.status = 'completed';

-- Difficulty-based performance
CREATE OR REPLACE VIEW practice_performance_by_difficulty AS
SELECT
  ps.student_id,
  ps.id as session_id,
  pra.difficulty_breakdown,
  pra.overall_accuracy,
  ps.created_at
FROM practice_sessions ps
JOIN practice_results_analytics pra ON ps.id = pra.session_id
WHERE ps.status = 'completed';

-- ============================================================================
-- Indexes for Performance Optimization
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_practice_results_analytics_session
  ON practice_results_analytics(session_id);

CREATE INDEX IF NOT EXISTS idx_practice_results_analytics_student
  ON practice_results_analytics(student_id);

CREATE INDEX IF NOT EXISTS idx_practice_results_analytics_computed
  ON practice_results_analytics(computed_at DESC);

CREATE INDEX IF NOT EXISTS idx_practice_results_analytics_accuracy
  ON practice_results_analytics(overall_accuracy DESC);

-- GIN indexes for JSONB querying
CREATE INDEX IF NOT EXISTS idx_practice_results_analytics_unit_perf
  ON practice_results_analytics USING gin(unit_performance);

CREATE INDEX IF NOT EXISTS idx_practice_results_analytics_topic_perf
  ON practice_results_analytics USING gin(topic_performance);

CREATE INDEX IF NOT EXISTS idx_practice_results_analytics_difficulty
  ON practice_results_analytics USING gin(difficulty_breakdown);

-- Add indexes to practice_answers for analytical queries
CREATE INDEX IF NOT EXISTS idx_practice_answers_correct
  ON practice_answers(is_correct, marks_earned);

CREATE INDEX IF NOT EXISTS idx_practice_answers_session_correct
  ON practice_answers(session_id, is_correct);

-- ============================================================================
-- Row Level Security
-- ============================================================================

ALTER TABLE practice_results_analytics ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'practice_results_analytics'
    AND policyname = 'practice_results_analytics_select_own'
  ) THEN
    CREATE POLICY "practice_results_analytics_select_own"
      ON practice_results_analytics FOR SELECT TO authenticated
      USING (
        is_admin_user(auth.uid()) OR
        student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'practice_results_analytics'
    AND policyname = 'practice_results_analytics_insert_own'
  ) THEN
    CREATE POLICY "practice_results_analytics_insert_own"
      ON practice_results_analytics FOR INSERT TO authenticated
      WITH CHECK (
        is_admin_user(auth.uid()) OR
        student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'practice_results_analytics'
    AND policyname = 'practice_results_analytics_update_own'
  ) THEN
    CREATE POLICY "practice_results_analytics_update_own"
      ON practice_results_analytics FOR UPDATE TO authenticated
      USING (
        is_admin_user(auth.uid()) OR
        student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
      )
      WITH CHECK (
        is_admin_user(auth.uid()) OR
        student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
      );
  END IF;
END $$;

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to calculate grade prediction based on IGCSE boundaries
CREATE OR REPLACE FUNCTION calculate_grade_prediction(percentage numeric)
RETURNS text AS $$
BEGIN
  IF percentage >= 90 THEN RETURN 'A*';
  ELSIF percentage >= 80 THEN RETURN 'A';
  ELSIF percentage >= 70 THEN RETURN 'B';
  ELSIF percentage >= 60 THEN RETURN 'C';
  ELSIF percentage >= 50 THEN RETURN 'D';
  ELSIF percentage >= 40 THEN RETURN 'E';
  ELSIF percentage >= 30 THEN RETURN 'F';
  ELSE RETURN 'G';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate time efficiency (compares actual time vs expected time)
CREATE OR REPLACE FUNCTION calculate_time_efficiency(
  actual_seconds integer,
  expected_seconds integer
)
RETURNS numeric AS $$
BEGIN
  IF expected_seconds = 0 OR expected_seconds IS NULL THEN
    RETURN 100.0;
  END IF;

  -- Return efficiency score (100 = on time, >100 = faster, <100 = slower)
  RETURN ROUND((expected_seconds::numeric / NULLIF(actual_seconds, 0)) * 100, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON TABLE practice_results_analytics IS 'Stores pre-computed comprehensive analytics for practice session results including performance breakdowns by curriculum structure, difficulty, and question types';
COMMENT ON COLUMN practice_results_analytics.unit_performance IS 'Array of unit-level performance objects with accuracy, time, and marks data';
COMMENT ON COLUMN practice_results_analytics.topic_performance IS 'Array of topic-level performance objects with detailed metrics';
COMMENT ON COLUMN practice_results_analytics.difficulty_breakdown IS 'Object containing performance metrics grouped by difficulty level (Easy, Medium, Hard)';
COMMENT ON COLUMN practice_results_analytics.strong_areas IS 'Array of curriculum areas where student performed well (accuracy >= 80%)';
COMMENT ON COLUMN practice_results_analytics.weak_areas IS 'Array of curriculum areas requiring improvement (accuracy < 70%)';
