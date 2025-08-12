/*
  # Refresh schema cache

  This migration ensures the schema cache is refreshed after all previous migrations.
*/

-- Notify PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';