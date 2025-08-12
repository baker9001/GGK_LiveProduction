/*
  # Remove unique constraint on paper_code in papers_setup table

  1. Changes
    - Remove the unique constraint on paper_code column in papers_setup table
    - Add a non-unique index for better query performance
    - This allows multiple papers with the same paper_code to exist

  2. Reason
    - The application needs to handle duplicate paper codes
    - Users should be able to see existing papers with the same code
    - This prevents the "duplicate key value violates unique constraint" error
*/

-- Step 1: Drop the unique constraint if it exists
DO $$
DECLARE
    constraint_rec record;
BEGIN
    -- Find all unique constraints on paper_code column
    FOR constraint_rec IN
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu 
            ON tc.constraint_name = ccu.constraint_name
            AND tc.table_schema = ccu.table_schema
        WHERE tc.table_name = 'papers_setup'
            AND ccu.column_name = 'paper_code'
            AND tc.constraint_type = 'UNIQUE'
    LOOP
        EXECUTE format('ALTER TABLE papers_setup DROP CONSTRAINT %I', constraint_rec.constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_rec.constraint_name;
    END LOOP;
END $$;

-- Step 2: Drop any unique indexes on paper_code
DO $$
DECLARE
    index_rec record;
BEGIN
    -- Find unique indexes on paper_code column
    FOR index_rec IN
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'papers_setup'
            AND indexdef LIKE '%paper_code%'
            AND indexdef LIKE '%UNIQUE%'
    LOOP
        EXECUTE format('DROP INDEX %I', index_rec.indexname);
        RAISE NOTICE 'Dropped unique index: %', index_rec.indexname;
    END LOOP;
END $$;

-- Step 3: Create a non-unique index for better query performance
CREATE INDEX IF NOT EXISTS idx_papers_setup_paper_code ON papers_setup(paper_code);

-- Step 4: Verify the constraint is removed
DO $$
DECLARE
    constraint_count integer;
BEGIN
    SELECT COUNT(*) INTO constraint_count
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu 
        ON tc.constraint_name = ccu.constraint_name
        AND tc.table_schema = ccu.table_schema
    WHERE tc.table_name = 'papers_setup'
        AND ccu.column_name = 'paper_code'
        AND tc.constraint_type = 'UNIQUE';
    
    IF constraint_count = 0 THEN
        RAISE NOTICE 'SUCCESS: No unique constraints found on paper_code column';
    ELSE
        RAISE WARNING 'WARNING: Found % unique constraints on paper_code column', constraint_count;
    END IF;
END $$;

-- Notify PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';