/*
  # Fix edu_subjects deletion constraint

  1. Problem
    - Deleting subjects fails with foreign key constraint violation
    - Error: "update or delete on table "edu_subjects" violates foreign key constraint "data_structures_subject_id_fkey" on table "data_structures""
    - This prevents deleting subjects that are referenced by data_structures

  2. Solution
    - Drop the existing foreign key constraint
    - Re-add it with ON DELETE CASCADE
    - This will automatically delete dependent data_structures when a subject is deleted

  3. Impact
    - Allows subject deletion through the UI
    - Cascades deletion to dependent data_structures
    - Maintains referential integrity
*/

-- Step 1: Drop the existing foreign key constraint
ALTER TABLE data_structures 
DROP CONSTRAINT IF EXISTS data_structures_subject_id_fkey;

-- Step 2: Re-add the constraint with ON DELETE CASCADE
ALTER TABLE data_structures
ADD CONSTRAINT data_structures_subject_id_fkey
FOREIGN KEY (subject_id) 
REFERENCES edu_subjects(id) 
ON DELETE CASCADE;

-- Step 3: Force PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';

-- Step 4: Verify the constraint was created with the correct delete rule
DO $$
DECLARE
  constraint_info RECORD;
BEGIN
  SELECT 
    tc.constraint_name,
    rc.delete_rule
  INTO constraint_info
  FROM information_schema.table_constraints tc
  JOIN information_schema.referential_constraints rc 
    ON tc.constraint_name = rc.constraint_name
  WHERE tc.constraint_name = 'data_structures_subject_id_fkey'
    AND tc.table_name = 'data_structures'
    AND tc.table_schema = 'public';
    
  IF FOUND THEN
    IF constraint_info.delete_rule = 'CASCADE' THEN
      RAISE NOTICE 'SUCCESS: Foreign key constraint created with correct CASCADE delete rule';
    ELSE
      RAISE WARNING 'WARNING: Foreign key constraint has delete rule % instead of CASCADE', 
        constraint_info.delete_rule;
    END IF;
  ELSE
    RAISE WARNING 'WARNING: Could not find the data_structures_subject_id_fkey constraint';
  END IF;
END $$;