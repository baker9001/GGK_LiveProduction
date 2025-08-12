/*
  # Reload PostgREST Schema Cache

  1. Purpose
    - Force PostgREST to refresh its understanding of the database schema
    - Resolve issues where columns exist in the database but are not recognized by the API
    
  2. Action
    - Send NOTIFY command to reload PostgREST schema cache
    - This will make the 'tags' column in 'questions_master_admin' table accessible
    
  3. Notes
    - This is a maintenance operation to sync PostgREST with the current database schema
    - Should resolve the "Could not find the 'tags' column" error
*/

-- Force PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';