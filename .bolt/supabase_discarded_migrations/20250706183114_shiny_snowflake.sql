/*
  # Remove paper_code unique constraint completely

  1. Changes
    - Forcefully remove all unique constraints on paper_code column
    - Drop any remaining unique indexes on paper_code
    - Recreate the table structure if necessary to ensure constraint is gone
    - Add non-unique index for performance
    - Verify constraint removal

  2. Security
    - Maintain existing RLS policies
    - Preserve all other table constraints and indexes
*/

-- Step 1: Get current table structure for backup
DO $$
DECLARE
    constraint_exists boolean := false;
BEGIN
    -- Check if the problematic constraint still exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'papers_setup' 
        AND constraint_name = 'papers_setup_paper_code_key'
        AND constraint_type = 'UNIQUE'
    ) INTO constraint_exists;
    
    IF constraint_exists THEN
        RAISE NOTICE 'Found papers_setup_paper_code_key constraint - will remove it';
        
        -- Force drop the specific constraint
        ALTER TABLE papers_setup DROP CONSTRAINT papers_setup_paper_code_key;
        RAISE NOTICE 'Successfully dropped papers_setup_paper_code_key constraint';
    ELSE
        RAISE NOTICE 'papers_setup_paper_code_key constraint not found';
    END IF;
END $$;

-- Step 2: Remove any other unique constraints on paper_code
DO $$
DECLARE
    constraint_rec record;
BEGIN
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

-- Step 3: Remove any unique indexes on paper_code
DO $$
DECLARE
    index_rec record;
BEGIN
    FOR index_rec IN
        SELECT schemaname, indexname
        FROM pg_indexes
        WHERE tablename = 'papers_setup'
            AND indexdef ILIKE '%paper_code%'
            AND indexdef ILIKE '%unique%'
    LOOP
        EXECUTE format('DROP INDEX IF EXISTS %I.%I', index_rec.schemaname, index_rec.indexname);
        RAISE NOTICE 'Dropped unique index: %', index_rec.indexname;
    END LOOP;
END $$;

-- Step 4: Ensure we have a non-unique index for performance
DROP INDEX IF EXISTS idx_papers_setup_paper_code;
CREATE INDEX IF NOT EXISTS idx_papers_setup_paper_code ON papers_setup(paper_code);

-- Step 5: Final verification
DO $$
DECLARE
    constraint_count integer;
    unique_index_count integer;
BEGIN
    -- Check for any remaining unique constraints on paper_code
    SELECT COUNT(*) INTO constraint_count
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu 
        ON tc.constraint_name = ccu.constraint_name
        AND tc.table_schema = ccu.table_schema
    WHERE tc.table_name = 'papers_setup'
        AND ccu.column_name = 'paper_code'
        AND tc.constraint_type = 'UNIQUE';
    
    -- Check for any remaining unique indexes on paper_code
    SELECT COUNT(*) INTO unique_index_count
    FROM pg_indexes
    WHERE tablename = 'papers_setup'
        AND indexdef ILIKE '%paper_code%'
        AND indexdef ILIKE '%unique%';
    
    IF constraint_count = 0 AND unique_index_count = 0 THEN
        RAISE NOTICE 'SUCCESS: All unique constraints and indexes on paper_code have been removed';
        RAISE NOTICE 'Non-unique index idx_papers_setup_paper_code is available for performance';
    ELSE
        RAISE WARNING 'WARNING: Found % unique constraints and % unique indexes still remaining on paper_code', constraint_count, unique_index_count;
    END IF;
END $$;

-- Step 6: Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';