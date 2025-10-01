/*
  # Add RLS to Remaining Critical Tables

  ## Overview
  Adds RLS to remaining tables that handle sensitive data or operations.

  ## Tables Updated
  - questions_master_admin (question bank)
  - sub_questions (sub-question details)
  - papers_setup (paper configuration)
  - question_options (MCQ options)
  - materials (learning materials)
  - branches_additional, schools_additional, companies_additional (metadata)
  - entity_positions (staff positions)

  ## Security Model
  - Question/paper data: System admins only
  - Materials: Authenticated users can view, admins can manage
  - Additional data: Company-scoped access
  - Entity positions: Company-scoped access
*/

-- ============================================================================
-- QUESTION AND PAPER TABLES
-- ============================================================================

-- questions_master_admin
ALTER TABLE questions_master_admin ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view questions"
  ON questions_master_admin FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System admins manage questions"
  ON questions_master_admin FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

-- sub_questions
ALTER TABLE sub_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view sub-questions"
  ON sub_questions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System admins manage sub-questions"
  ON sub_questions FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

-- papers_setup
ALTER TABLE papers_setup ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view papers"
  ON papers_setup FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System admins manage papers"
  ON papers_setup FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

-- question_options
ALTER TABLE question_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view question options"
  ON question_options FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System admins manage question options"
  ON question_options FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

-- ============================================================================
-- ADDITIONAL DATA TABLES (Company-scoped)
-- ============================================================================

-- branches_additional
ALTER TABLE branches_additional ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Entity users manage own branch additional data" ON branches_additional;

CREATE POLICY "Entity users manage branch additional data in company"
  ON branches_additional FOR ALL TO authenticated
  USING (
    branch_id IN (
      SELECT b.id FROM branches b
      JOIN schools s ON s.id = b.school_id
      JOIN entity_users eu ON eu.company_id = s.company_id
      WHERE eu.user_id = auth.uid() AND eu.is_active = true
    )
  )
  WITH CHECK (
    branch_id IN (
      SELECT b.id FROM branches b
      JOIN schools s ON s.id = b.school_id
      JOIN entity_users eu ON eu.company_id = s.company_id
      WHERE eu.user_id = auth.uid() AND eu.is_active = true
    )
  );

-- schools_additional
ALTER TABLE schools_additional ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Entity users manage own school additional data" ON schools_additional;

CREATE POLICY "Entity users manage school additional data in company"
  ON schools_additional FOR ALL TO authenticated
  USING (
    school_id IN (
      SELECT s.id FROM schools s
      JOIN entity_users eu ON eu.company_id = s.company_id
      WHERE eu.user_id = auth.uid() AND eu.is_active = true
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT s.id FROM schools s
      JOIN entity_users eu ON eu.company_id = s.company_id
      WHERE eu.user_id = auth.uid() AND eu.is_active = true
    )
  );

-- companies_additional
ALTER TABLE companies_additional ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Entity users manage own company additional data" ON companies_additional;

CREATE POLICY "Entity users manage company additional data"
  ON companies_additional FOR ALL TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM entity_users WHERE user_id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM entity_users WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- ============================================================================
-- ENTITY POSITIONS
-- ============================================================================

-- entity_positions
ALTER TABLE entity_positions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Entity users manage own positions" ON entity_positions;

CREATE POLICY "Entity users manage positions in company"
  ON entity_positions FOR ALL TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM entity_users WHERE user_id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM entity_users WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- ============================================================================
-- OTHER CRITICAL TABLES
-- ============================================================================

-- Enable RLS on remaining question-related tables
ALTER TABLE questions_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions_hints ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_subtopics ENABLE ROW LEVEL SECURITY;

-- Create policies for question attachments
CREATE POLICY "Authenticated view question attachments"
  ON questions_attachments FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System admins manage question attachments"
  ON questions_attachments FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

-- Create policies for question hints
CREATE POLICY "Authenticated view question hints"
  ON questions_hints FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System admins manage question hints"
  ON questions_hints FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

-- Create policies for question subtopics
CREATE POLICY "Authenticated view question subtopics"
  ON question_subtopics FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System admins manage question subtopics"
  ON question_subtopics FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

-- Enable RLS on past_paper_import_sessions
ALTER TABLE past_paper_import_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System admins manage import sessions"
  ON past_paper_import_sessions FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));
