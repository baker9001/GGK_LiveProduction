/*
  # Force reload of PostgREST schema cache

  1. Problem
    - PostgREST is not recognizing the foreign key relationships between tables
    - Specifically, it cannot find the relationship between questions_master_admin and edu_topics/edu_subtopics
    - This causes 400 Bad Request errors when trying to join these tables in queries

  2. Solution
    - Send a NOTIFY command to the PostgreSQL server
    - This forces PostgREST to reload its schema cache
    - After reload, PostgREST will recognize all foreign key relationships

  3. Impact
    - Resolves "Could not find a relationship between 'questions_master_admin' and 'edu_topics' in the schema cache" errors
    - Enables proper querying of related data across tables
    - No data changes, only affects PostgREST's internal cache
*/

-- Force PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';

-- Wait a moment and notify again to ensure it takes effect
SELECT pg_sleep(0.5);
NOTIFY pgrst, 'reload schema';

-- Wait again and send a final notification
SELECT pg_sleep(0.5);
NOTIFY pgrst, 'reload schema';