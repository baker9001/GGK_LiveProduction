/*
  # Fix paper_code unique constraint issue

  1. Changes
    - Drop the unique constraint on paper_code in papers_setup table using multiple approaches
    - Remove any unique indexes on paper_code
    - Add a non-unique index for better query performance
    - Verify the constraint is removed

  2. Reason
    - The application needs to allow multiple papers with the same paper_code
    - Current constraint is causing errors when saving papers
*/

-- First approach: Drop constraint by name if it exists
ALTER TABLE papers_setup DROP CONSTRAINT IF EXISTS papers_setup_paper_code_key;

-- Second approach: Find and drop any constraints on paper_code column
DO $$
DECLARE
    constraint_name_var text;
BEGIN
    -- Find constraints on paper_code column
    FOR constraint_name_var IN
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu 
            ON tc.constraint_name = ccu.constraint_name
            AND tc.table_schema = ccu.table_schema
        WHERE tc.table_name = 'papers_setup'
            AND ccu.column_name = 'paper_code'
            AND tc.constraint_type = 'UNIQUE'
    LOOP
        EXECUTE 'ALTER TABLE papers_setup DROP CONSTRAINT ' || constraint_name_var;
        RAISE NOTICE 'Dropped constraint: %', constraint_name_var;
    END LOOP;
END $$;

-- Third approach: Drop any unique indexes on paper_code
DO $$
DECLARE
    index_name_var text;
BEGIN
    -- Find unique indexes on paper_code column
    FOR index_name_var IN
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'papers_setup'
            AND indexdef LIKE '%paper_code%'
            AND indexdef LIKE '%UNIQUE%'
    LOOP
        EXECUTE 'DROP INDEX ' || index_name_var;
        RAISE NOTICE 'Dropped unique index: %', index_name_var;
    END LOOP;
END $$;

-- Create a non-unique index for better query performance
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'papers_setup'
            AND indexname = 'idx_papers_setup_paper_code'
    ) THEN
        CREATE INDEX idx_papers_setup_paper_code ON papers_setup(paper_code);
        RAISE NOTICE 'Created non-unique index on paper_code';
    END IF;
END $$;

-- Verify the constraint is removed
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