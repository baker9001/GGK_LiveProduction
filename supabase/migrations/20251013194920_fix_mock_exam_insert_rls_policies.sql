/*
  # Fix Mock Exams INSERT RLS Policies

  ## Problem
  The INSERT policies for mock_exams have a critical logic error where
  `eu.company_id = eu.company_id` is self-referencing instead of comparing
  against the `mock_exams.company_id` being inserted.

  ## Changes
  - Drop and recreate "Entity admins can create mock exams in their company" policy
  - Drop and recreate "School admins can create mock exams for their schools" policy
  - Fix the WITH CHECK condition to properly reference mock_exams.company_id

  ## Security
  - Maintains existing security model
  - Properly restricts INSERT based on user's company_id
  - No change to other operations
*/

-- Drop existing broken policies
DROP POLICY IF EXISTS "Entity admins can create mock exams in their company" ON mock_exams;
DROP POLICY IF EXISTS "School admins can create mock exams for their schools" ON mock_exams;

-- Recreate with correct logic for Entity Admins
CREATE POLICY "Entity admins can create mock exams in their company"
  ON mock_exams
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM entity_users eu
      WHERE eu.user_id = auth.uid()
        AND eu.company_id = mock_exams.company_id
        AND eu.admin_level IN ('entity_admin', 'sub_entity_admin')
        AND eu.is_active = true
    )
  );

-- Recreate with correct logic for School Admins
CREATE POLICY "School admins can create mock exams for their schools"
  ON mock_exams
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM entity_users eu
      WHERE eu.user_id = auth.uid()
        AND eu.company_id = mock_exams.company_id
        AND eu.admin_level = 'school_admin'
        AND eu.is_active = true
    )
  );