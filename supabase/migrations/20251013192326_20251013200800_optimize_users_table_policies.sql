/*
  # Optimize Users Table RLS Policies
  
  1. Performance Improvements
    - Replace auth.uid() with (select auth.uid()) in users table policies
    - Critical optimization for authentication performance
  
  2. Changes
    - Update all users table policies
*/

DROP POLICY IF EXISTS "Users can update their own login timestamps" ON users;
DROP POLICY IF EXISTS "Users can update their own record" ON users;
DROP POLICY IF EXISTS "Users can view their own record" ON users;
DROP POLICY IF EXISTS "Users can view their own record by ID" ON users;
DROP POLICY IF EXISTS "Authenticated users can view users table" ON users;
DROP POLICY IF EXISTS "Allow auth trigger updates" ON users;

CREATE POLICY "Users can view their own record"
  ON users FOR SELECT
  TO authenticated
  USING (users.id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own record"
  ON users FOR UPDATE
  TO authenticated
  USING (users.id = (SELECT auth.uid()))
  WITH CHECK (users.id = (SELECT auth.uid()));

CREATE POLICY "Authenticated users can view users table"
  ON users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow auth trigger updates"
  ON users FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);