/*
  # Remove unique constraint on edu_subjects code column

  1. Problem
    - The application is failing to create new educational subjects due to a duplicate key constraint violation
    - Error: "duplicate key value violates unique constraint 'edu_subjects_code_key'"
    - This prevents creating subjects with the same code, which is needed for the import process

  2. Solution
    - Remove any unique constraints or unique indexes on the 'code' column of the 'edu_subjects' table
    - This will allow multiple subjects to share the same code
    - Add a non-unique index for better query performance

  3. Impact
    - Resolves the "duplicate key value violates unique constraint" error
    - Allows the import process to create subjects with duplicate codes if needed
    - Maintains query performance with a non-unique index
*/

-- Step 1: Drop the unique constraint if it exists
ALTER TABLE edu_subjects 
DROP CONSTRAINT IF EXISTS edu_subjects_code_key;

-- Step 2: Drop any other unique constraints on the code column
DO $$
DECLARE
    constraint_rec record;
BEGIN
    -- Find all unique constraints on code column
    FOR constraint_rec IN
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu 
            ON tc.constraint_name = ccu.constraint_name
            AND tc.table_schema = ccu.table_schema
        WHERE tc.table_name = 'edu_subjects'
            AND ccu.column_name = 'code'
            AND tc.constraint_type = 'UNIQUE'
    LOOP
        EXECUTE format('ALTER TABLE edu_subjects DROP CONSTRAINT %I', constraint_rec.constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_rec.constraint_name;
    END LOOP;
END $$;

-- Step 3: Drop any unique indexes on code column
DO $$
DECLARE
    index_rec record;
BEGIN
    -- Find unique indexes on code column
    FOR index_rec IN
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'edu_subjects'
            AND indexdef LIKE '%code%'
            AND indexdef LIKE '%UNIQUE%'
    LOOP
        EXECUTE format('DROP INDEX %I', index_rec.indexname);
        RAISE NOTICE 'Dropped unique index: %', index_rec.indexname;
    END LOOP;
END $$;

-- Step 4: Create a non-unique index for better query performance
CREATE INDEX IF NOT EXISTS idx_edu_subjects_code ON edu_subjects(code);

-- Step 5: Verify the constraint is removed
DO $$
DECLARE
    constraint_count integer;
BEGIN
    SELECT COUNT(*) INTO constraint_count
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu 
        ON tc.constraint_name = ccu.constraint_name
        AND tc.table_schema = ccu.table_schema
    WHERE tc.table_name = 'edu_subjects'
        AND ccu.column_name = 'code'
        AND tc.constraint_type = 'UNIQUE';
    
    IF constraint_count = 0 THEN
        RAISE NOTICE 'SUCCESS: No unique constraints found on code column';
    ELSE
        RAISE WARNING 'WARNING: Found % unique constraints on code column', constraint_count;
    END IF;
END $$;

-- Notify PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';