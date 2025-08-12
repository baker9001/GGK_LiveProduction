/*
  # Remove unique constraint on paper_code (Enhanced)

  1. Changes
    - Safely remove unique constraint on `paper_code` column in `papers_setup` table
    - Handle case where constraint might have different names
    - This allows multiple paper entries to share the same paper code if needed

  2. Reasoning
    - The current unique constraint prevents saving papers with duplicate codes
    - Paper codes may legitimately be duplicated across different contexts
    - Application logic should handle uniqueness validation as needed
*/

-- First, check if the constraint exists and drop it
DO $$
BEGIN
    -- Try to drop the constraint if it exists (common name)
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'papers_setup_paper_code_key' 
        AND table_name = 'papers_setup'
    ) THEN
        ALTER TABLE papers_setup DROP CONSTRAINT papers_setup_paper_code_key;
    END IF;
    
    -- Also check for other possible constraint names
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name LIKE '%paper_code%' 
        AND table_name = 'papers_setup'
        AND constraint_type = 'UNIQUE'
    ) THEN
        -- Get the actual constraint name and drop it
        DECLARE
            constraint_name_var text;
        BEGIN
            SELECT constraint_name INTO constraint_name_var
            FROM information_schema.table_constraints 
            WHERE constraint_name LIKE '%paper_code%' 
            AND table_name = 'papers_setup'
            AND constraint_type = 'UNIQUE'
            LIMIT 1;
            
            IF constraint_name_var IS NOT NULL THEN
                EXECUTE 'ALTER TABLE papers_setup DROP CONSTRAINT ' || constraint_name_var;
            END IF;
        END;
    END IF;
    
    -- Also remove any unique index on paper_code if it exists
    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'papers_setup' 
        AND indexname LIKE '%paper_code%'
        AND indexdef LIKE '%UNIQUE%'
    ) THEN
        DROP INDEX IF EXISTS papers_setup_paper_code_key;
        DROP INDEX IF EXISTS idx_papers_setup_paper_code_unique;
    END IF;
END $$;