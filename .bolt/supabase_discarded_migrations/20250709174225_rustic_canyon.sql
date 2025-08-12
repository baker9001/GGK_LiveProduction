/*
  # Force PostgREST schema cache reload

  1. Problem
    - PostgREST is not recognizing the foreign key relationship between questions_master_admin and papers_setup
    - This causes 400 Bad Request errors when trying to join these tables in queries
    - The relationship exists in the database but PostgREST's schema cache is outdated

  2. Solution
    - Send NOTIFY commands to force PostgREST to reload its schema cache
    - Use multiple notifications with delays to ensure the reload takes effect
    - This will make PostgREST recognize all existing foreign key relationships

  3. Impact
    - Resolves "Could not find a relationship between 'questions_master_admin' and 'papers_setup'" errors
    - Enables proper querying of related data across tables
    - No data changes, only affects PostgREST's internal cache
*/

-- Force PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';

-- Wait and notify again to ensure it takes effect
SELECT pg_sleep(1);
NOTIFY pgrst, 'reload schema';

-- Final notification after another delay
SELECT pg_sleep(1);
NOTIFY pgrst, 'reload schema';