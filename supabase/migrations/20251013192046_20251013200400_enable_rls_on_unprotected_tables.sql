/*
  # Enable RLS on Tables with Policies
  
  1. Security Improvements
    - Enable RLS on tables that have policies but RLS is disabled
    - Ensures policies are actually enforced
  
  2. Changes
    - Enable RLS on edu_subtopics
    - Enable RLS on edu_topics
    - Enable RLS on edu_units
*/

-- Enable RLS on education tables that have policies but RLS disabled
ALTER TABLE edu_subtopics ENABLE ROW LEVEL SECURITY;
ALTER TABLE edu_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE edu_units ENABLE ROW LEVEL SECURITY;