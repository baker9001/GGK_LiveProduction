/*
  # Security Fixes Part 2: RLS Auth Function Optimization

  ## Summary
  Wraps auth.uid() calls in SELECT to prevent per-row re-evaluation
  This significantly improves query performance at scale

  ## Changes
  - Fixes 7 RLS policies across 4 tables
  - Prevents auth function re-evaluation for each row

  ## Impact
  - HIGH: Dramatically improves query performance on large datasets
  - Prevents O(n) auth function calls per query
*/

-- =====================================================
-- Fix RLS Auth Function Re-evaluation
-- =====================================================

-- question_import_review_status policies
DROP POLICY IF EXISTS "Users can create own question review status" ON public.question_import_review_status;
CREATE POLICY "Users can create own question review status"
  ON public.question_import_review_status
  FOR INSERT
  TO authenticated
  WITH CHECK (
    import_session_id IN (
      SELECT past_paper_import_sessions.id
      FROM past_paper_import_sessions
      WHERE past_paper_import_sessions.created_by = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update own question review status" ON public.question_import_review_status;
CREATE POLICY "Users can update own question review status"
  ON public.question_import_review_status
  FOR UPDATE
  TO authenticated
  USING (
    import_session_id IN (
      SELECT past_paper_import_sessions.id
      FROM past_paper_import_sessions
      WHERE past_paper_import_sessions.created_by = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    import_session_id IN (
      SELECT past_paper_import_sessions.id
      FROM past_paper_import_sessions
      WHERE past_paper_import_sessions.created_by = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view own question review status" ON public.question_import_review_status;
CREATE POLICY "Users can view own question review status"
  ON public.question_import_review_status
  FOR SELECT
  TO authenticated
  USING (
    import_session_id IN (
      SELECT past_paper_import_sessions.id
      FROM past_paper_import_sessions
      WHERE past_paper_import_sessions.created_by = (SELECT auth.uid())
    )
  );

-- question_import_simulation_results policies
DROP POLICY IF EXISTS "Users can create own simulation results" ON public.question_import_simulation_results;
CREATE POLICY "Users can create own simulation results"
  ON public.question_import_simulation_results
  FOR INSERT
  TO authenticated
  WITH CHECK (
    import_session_id IN (
      SELECT past_paper_import_sessions.id
      FROM past_paper_import_sessions
      WHERE past_paper_import_sessions.created_by = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view own simulation results" ON public.question_import_simulation_results;
CREATE POLICY "Users can view own simulation results"
  ON public.question_import_simulation_results
  FOR SELECT
  TO authenticated
  USING (
    import_session_id IN (
      SELECT past_paper_import_sessions.id
      FROM past_paper_import_sessions
      WHERE past_paper_import_sessions.created_by = (SELECT auth.uid())
    )
  );

-- table_template_cells_import_review policy
DROP POLICY IF EXISTS "Users can manage review template cells for own sessions" ON public.table_template_cells_import_review;
CREATE POLICY "Users can manage review template cells for own sessions"
  ON public.table_template_cells_import_review
  FOR ALL
  TO authenticated
  USING (
    template_id IN (
      SELECT ttir.id
      FROM table_templates_import_review ttir
      JOIN past_paper_import_sessions pips ON pips.id = ttir.import_session_id
      WHERE pips.created_by = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    template_id IN (
      SELECT ttir.id
      FROM table_templates_import_review ttir
      JOIN past_paper_import_sessions pips ON pips.id = ttir.import_session_id
      WHERE pips.created_by = (SELECT auth.uid())
    )
  );

-- table_templates_import_review policy
DROP POLICY IF EXISTS "Users can manage review templates for own sessions" ON public.table_templates_import_review;
CREATE POLICY "Users can manage review templates for own sessions"
  ON public.table_templates_import_review
  FOR ALL
  TO authenticated
  USING (
    import_session_id IN (
      SELECT past_paper_import_sessions.id
      FROM past_paper_import_sessions
      WHERE past_paper_import_sessions.created_by = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    import_session_id IN (
      SELECT past_paper_import_sessions.id
      FROM past_paper_import_sessions
      WHERE past_paper_import_sessions.created_by = (SELECT auth.uid())
    )
  );
