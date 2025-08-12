/*
  # Reload PostgREST Schema Cache

  1. Purpose
    - Force PostgREST to reload its schema cache
    - Ensure foreign key relationships are recognized by the API
    - Fix queries that reference edu_topics and edu_subtopics from questions tables

  2. Solution
    - Send NOTIFY signal to PostgREST to reload schema
    - This will update the API's understanding of the database structure
*/

-- Force PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';