/*
  # Fix data_structures foreign key relationships

  1. Changes
    - Drop existing foreign key constraints for program_id and provider_id
    - Re-add foreign key constraints with proper references
    - Force schema cache refresh to update PostgREST's internal cache

  2. Reason
    - The database schema cache does not recognize the relationships between tables
    - This prevents the application from correctly querying related data
    - Re-creating the constraints and refreshing the schema cache resolves the issue
*/

-- Drop existing foreign key constraints
ALTER TABLE data_structures DROP CONSTRAINT IF EXISTS data_structures_program_id_fkey;
ALTER TABLE data_structures DROP CONSTRAINT IF EXISTS data_structures_provider_id_fkey;

-- Re-add foreign key constraints
ALTER TABLE data_structures
ADD CONSTRAINT data_structures_program_id_fkey
FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE;

ALTER TABLE data_structures
ADD CONSTRAINT data_structures_provider_id_fkey
FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE;

-- Notify PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';