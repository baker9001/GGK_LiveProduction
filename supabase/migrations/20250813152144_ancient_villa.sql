/*
  # Fix Duplicate Foreign Key Constraints
  
  The error shows there are two foreign key constraints between entity_users and companies:
  1. entity_users_company_id_fkey
  2. fk_entity_users_company_id
  
  This causes ambiguity in Supabase queries. We need to remove the duplicate.
*/

-- First, check what foreign keys exist
SELECT 
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  confrelid::regclass AS foreign_table_name,
  a.attname AS column_name,
  af.attname AS foreign_column_name
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
JOIN pg_attribute af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
WHERE c.contype = 'f'
  AND c.conrelid = 'entity_users'::regclass
  AND c.confrelid = 'companies'::regclass;

-- Drop the duplicate foreign key constraint (keep the standard one)
ALTER TABLE entity_users 
DROP CONSTRAINT IF EXISTS fk_entity_users_company_id;

-- Verify only one constraint remains
SELECT COUNT(*) as fk_count
FROM pg_constraint c
WHERE c.contype = 'f'
  AND c.conrelid = 'entity_users'::regclass
  AND c.confrelid = 'companies'::regclass;

-- The count should be 1

-- If for some reason both were dropped, recreate the standard one:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'entity_users_company_id_fkey' 
    AND conrelid = 'entity_users'::regclass
  ) THEN
    ALTER TABLE entity_users
    ADD CONSTRAINT entity_users_company_id_fkey 
    FOREIGN KEY (company_id) REFERENCES companies(id);
  END IF;
END $$;