/*
  # Fix Infinite Recursion in table_template_cells_import_review RLS Policy

  1. Problem
    - The policy "Users can manage review template cells for own sessions" queries
      table_template_cells_import_review within its own RLS check, causing infinite recursion

  2. Solution
    - Remove the circular self-reference
    - Access the template_id directly from the current row
    - Join only to parent tables (table_templates_import_review, question_import_review_sessions, users)

  3. Changes
    - Drop the problematic policy
    - Recreate it without the self-reference
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can manage review template cells for own sessions" 
  ON table_template_cells_import_review;

-- Recreate the policy without self-reference
CREATE POLICY "Users can manage review template cells for own sessions"
  ON table_template_cells_import_review FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM table_templates_import_review ttir
      INNER JOIN question_import_review_sessions qirs ON qirs.id = ttir.review_session_id
      INNER JOIN users u ON u.id = qirs.user_id
      WHERE ttir.id = table_template_cells_import_review.template_id
      AND u.auth_user_id = auth.uid()
      AND u.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM table_templates_import_review ttir
      INNER JOIN question_import_review_sessions qirs ON qirs.id = ttir.review_session_id
      INNER JOIN users u ON u.id = qirs.user_id
      WHERE ttir.id = table_template_cells_import_review.template_id
      AND u.auth_user_id = auth.uid()
      AND u.is_active = true
    )
  );