/*
  # Student Practice Module Core Schema

  Creates the core tables required for the student practice experience,
  including gamification, leaderboards, and reporting cache layers.
  The migration is idempotent and only provisions entities that do not
  already exist in the database.
*/

-- ============================================================================
-- Helper: ensure extension for int4range is available (typically built-in)
-- ============================================================================
DO $$
BEGIN
  -- nothing to install but block kept for parity with other migrations
  NULL;
END;
$$;

-- ============================================================================
-- Core Practice Tables
-- ============================================================================
CREATE TABLE IF NOT EXISTS practice_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  subject_id uuid REFERENCES edu_subjects(id) ON DELETE SET NULL,
  topic_id uuid REFERENCES edu_topics(id) ON DELETE SET NULL,
  subtopic_id uuid REFERENCES edu_subtopics(id) ON DELETE SET NULL,
  difficulty_range int4range,
  source text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS practice_set_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_set_id uuid NOT NULL REFERENCES practice_sets(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES questions_master_admin(id) ON DELETE CASCADE,
  weight integer NOT NULL DEFAULT 1,
  time_limit_sec integer,
  order_index integer NOT NULL DEFAULT 0,
  UNIQUE (practice_set_id, question_id, order_index)
);

CREATE TABLE IF NOT EXISTS practice_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  practice_set_id uuid NOT NULL REFERENCES practice_sets(id) ON DELETE RESTRICT,
  started_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  ended_at timestamptz,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','abandoned')),
  total_marks_available numeric DEFAULT 0,
  total_marks_earned numeric DEFAULT 0,
  xp_earned integer NOT NULL DEFAULT 0,
  streak_delta integer NOT NULL DEFAULT 0,
  board text,
  difficulty_mix jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS practice_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES practice_set_items(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES questions_master_admin(id) ON DELETE CASCADE,
  raw_answer_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  auto_mark_json jsonb,
  is_correct boolean,
  marks_earned numeric DEFAULT 0,
  submitted_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (session_id, item_id)
);

CREATE TABLE IF NOT EXISTS practice_session_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
  item_id uuid REFERENCES practice_set_items(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- ============================================================================
-- Gamification & Leaderboards
-- ============================================================================
CREATE TABLE IF NOT EXISTS student_gamification (
  student_id uuid PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  xp_total integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  longest_streak_days integer NOT NULL DEFAULT 0,
  current_streak_days integer NOT NULL DEFAULT 0,
  badges jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_active_at timestamptz
);

CREATE TABLE IF NOT EXISTS leaderboards_periodic (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL CHECK (scope IN ('class','school','global')),
  period text NOT NULL CHECK (period IN ('daily','weekly','monthly','seasonal')),
  period_start date NOT NULL,
  period_end date NOT NULL,
  subject_id uuid REFERENCES edu_subjects(id) ON DELETE SET NULL,
  rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (scope, period, period_start, subject_id)
);

-- ============================================================================
-- Reporting Cache
-- ============================================================================
CREATE TABLE IF NOT EXISTS reports_cache_student (
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES edu_subjects(id) ON DELETE SET NULL,
  topic_id uuid REFERENCES edu_topics(id) ON DELETE SET NULL,
  month date NOT NULL,
  aggregates_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (student_id, subject_id, topic_id, month)
);

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_practice_sets_subject ON practice_sets(subject_id);
CREATE INDEX IF NOT EXISTS idx_practice_sets_topic ON practice_sets(topic_id);
CREATE INDEX IF NOT EXISTS idx_practice_sets_created_by ON practice_sets(created_by);

CREATE INDEX IF NOT EXISTS idx_practice_set_items_set ON practice_set_items(practice_set_id);
CREATE INDEX IF NOT EXISTS idx_practice_set_items_question ON practice_set_items(question_id);
CREATE INDEX IF NOT EXISTS idx_practice_set_items_order ON practice_set_items(practice_set_id, order_index);

CREATE INDEX IF NOT EXISTS idx_practice_sessions_student ON practice_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_set ON practice_sessions(practice_set_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_status ON practice_sessions(status);

CREATE INDEX IF NOT EXISTS idx_practice_answers_session ON practice_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_practice_answers_item ON practice_answers(item_id);
CREATE INDEX IF NOT EXISTS idx_practice_answers_question ON practice_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_practice_answers_correct_true ON practice_answers(is_correct) WHERE is_correct = true;
CREATE UNIQUE INDEX IF NOT EXISTS idx_practice_answers_session_item ON practice_answers(session_id, item_id);

CREATE INDEX IF NOT EXISTS idx_practice_session_events_session ON practice_session_events(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_student_gamification_activity ON student_gamification(last_active_at);
CREATE INDEX IF NOT EXISTS idx_leaderboards_period ON leaderboards_periodic(scope, period, period_start);
CREATE INDEX IF NOT EXISTS idx_reports_cache_student_month ON reports_cache_student(student_id, month);

-- ============================================================================
-- Row Level Security Policies
-- ============================================================================
-- Practice Sets: readable by authenticated users, managed by admins/creators
ALTER TABLE practice_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "practice_sets_read_authenticated"
  ON practice_sets FOR SELECT TO authenticated
  USING (true);

CREATE POLICY IF NOT EXISTS "practice_sets_manage_creators"
  ON practice_sets FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()) OR created_by = auth.uid())
  WITH CHECK (is_admin_user(auth.uid()) OR created_by = auth.uid());

-- Practice Set Items inherit from practice_sets (read-only for students)
ALTER TABLE practice_set_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "practice_set_items_read_authenticated"
  ON practice_set_items FOR SELECT TO authenticated
  USING (true);

CREATE POLICY IF NOT EXISTS "practice_set_items_manage_creators"
  ON practice_set_items FOR ALL TO authenticated
  USING (
    is_admin_user(auth.uid()) OR
    practice_set_id IN (
      SELECT id FROM practice_sets WHERE created_by = auth.uid()
    )
  )
  WITH CHECK (
    is_admin_user(auth.uid()) OR
    practice_set_id IN (
      SELECT id FROM practice_sets WHERE created_by = auth.uid()
    )
  );

-- Helper CTE for student ownership (re-used inline to avoid function dependency)
-- Practice Sessions policies
ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "practice_sessions_select_own"
  ON practice_sessions FOR SELECT TO authenticated
  USING (
    is_admin_user(auth.uid()) OR
    student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
  );

CREATE POLICY IF NOT EXISTS "practice_sessions_insert_own"
  ON practice_sessions FOR INSERT TO authenticated
  WITH CHECK (
    is_admin_user(auth.uid()) OR
    student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
  );

CREATE POLICY IF NOT EXISTS "practice_sessions_update_own"
  ON practice_sessions FOR UPDATE TO authenticated
  USING (
    is_admin_user(auth.uid()) OR
    student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
  )
  WITH CHECK (
    is_admin_user(auth.uid()) OR
    student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
  );

CREATE POLICY IF NOT EXISTS "practice_sessions_delete_admin"
  ON practice_sessions FOR DELETE TO authenticated
  USING (is_admin_user(auth.uid()));

-- Practice Answers policies
ALTER TABLE practice_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "practice_answers_select_own"
  ON practice_answers FOR SELECT TO authenticated
  USING (
    is_admin_user(auth.uid()) OR
    session_id IN (
      SELECT id FROM practice_sessions
      WHERE student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
    )
  );

CREATE POLICY IF NOT EXISTS "practice_answers_mutate_own"
  ON practice_answers FOR ALL TO authenticated
  USING (
    is_admin_user(auth.uid()) OR
    session_id IN (
      SELECT id FROM practice_sessions
      WHERE student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    is_admin_user(auth.uid()) OR
    session_id IN (
      SELECT id FROM practice_sessions
      WHERE student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
    )
  );

-- Practice Session Events policies
ALTER TABLE practice_session_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "practice_session_events_select_own"
  ON practice_session_events FOR SELECT TO authenticated
  USING (
    is_admin_user(auth.uid()) OR
    session_id IN (
      SELECT id FROM practice_sessions
      WHERE student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
    )
  );

CREATE POLICY IF NOT EXISTS "practice_session_events_mutate_own"
  ON practice_session_events FOR ALL TO authenticated
  USING (
    is_admin_user(auth.uid()) OR
    session_id IN (
      SELECT id FROM practice_sessions
      WHERE student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    is_admin_user(auth.uid()) OR
    session_id IN (
      SELECT id FROM practice_sessions
      WHERE student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
    )
  );

-- Student Gamification policies
ALTER TABLE student_gamification ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "student_gamification_select_own"
  ON student_gamification FOR SELECT TO authenticated
  USING (
    is_admin_user(auth.uid()) OR
    student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
  );

CREATE POLICY IF NOT EXISTS "student_gamification_update_own"
  ON student_gamification FOR UPDATE TO authenticated
  USING (
    is_admin_user(auth.uid()) OR
    student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
  )
  WITH CHECK (
    is_admin_user(auth.uid()) OR
    student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
  );

CREATE POLICY IF NOT EXISTS "student_gamification_insert_own"
  ON student_gamification FOR INSERT TO authenticated
  WITH CHECK (
    is_admin_user(auth.uid()) OR
    student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
  );

-- Leaderboards: read for authenticated, manage by admin
ALTER TABLE leaderboards_periodic ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "leaderboards_periodic_select"
  ON leaderboards_periodic FOR SELECT TO authenticated
  USING (true);

CREATE POLICY IF NOT EXISTS "leaderboards_periodic_manage"
  ON leaderboards_periodic FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- Reports cache: students see own, admins manage
ALTER TABLE reports_cache_student ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "reports_cache_student_select"
  ON reports_cache_student FOR SELECT TO authenticated
  USING (
    is_admin_user(auth.uid()) OR
    student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
  );

CREATE POLICY IF NOT EXISTS "reports_cache_student_manage"
  ON reports_cache_student FOR ALL TO authenticated
  USING (
    is_admin_user(auth.uid()) OR
    student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
  )
  WITH CHECK (
    is_admin_user(auth.uid()) OR
    student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
  );
