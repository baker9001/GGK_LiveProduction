/*
  # Fix Foreign Key Constraint for Import Sessions - Final Resolution

  1. Problem
    - The foreign key constraint between papers_setup.import_session_id and past_paper_import_sessions.id
    - Still prevents deletion of import sessions despite previous migration attempts
    - Error: "update or delete on table "past_paper_import_sessions" violates foreign key constraint"

  2. Solution
    - Forcefully drop ALL existing foreign key constraints on import_session_id
    - Recreate with proper ON DELETE SET NULL behavior
    - Add comprehensive error handling and verification

  3. Changes
    - Drop any existing foreign key constraints on papers_setup.import_session_id
    - Add new constraint with ON DELETE SET NULL
    - Verify the constraint is properly configured
    - Add index for performance
*/

-- Step 1: Drop ALL existing foreign key constraints on import_session_id column
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    -- Find and drop all foreign key constraints on papers_setup.import_session_id
    FOR constraint_record IN
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'papers_setup'
            AND tc.constraint_type = 'FOREIGN KEY'
            AND kcu.column_name = 'import_session_id'
            AND tc.table_schema = 'public'
    LOOP
        EXECUTE format('ALTER TABLE papers_setup DROP CONSTRAINT %I', constraint_record.constraint_name);
        RAISE NOTICE 'Dropped foreign key constraint: %', constraint_record.constraint_name;
    END LOOP;
END $$;

-- Step 2: Add the correct foreign key constraint with ON DELETE SET NULL
ALTER TABLE papers_setup 
ADD CONSTRAINT papers_setup_import_session_id_fkey 
FOREIGN KEY (import_session_id) 
REFERENCES past_paper_import_sessions(id) 
ON DELETE SET NULL;

-- Step 3: Create index for better performance if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_papers_setup_import_session_id'
        AND tablename = 'papers_setup'
        AND schemaname = 'public'
    ) THEN
        CREATE INDEX idx_papers_setup_import_session_id 
        ON papers_setup(import_session_id);
        RAISE NOTICE 'Created index idx_papers_setup_import_session_id';
    END IF;
END $$;

-- Step 4: Verify the constraint was created with correct delete behavior
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
    WHERE tc.constraint_name = 'papers_setup_import_session_id_fkey'
        AND tc.table_name = 'papers_setup'
        AND tc.table_schema = 'public';
        
    IF FOUND THEN
        IF constraint_info.delete_rule = 'SET NULL' THEN
            RAISE NOTICE 'SUCCESS: Foreign key constraint % created with correct delete rule: %', 
                constraint_info.constraint_name, constraint_info.delete_rule;
        ELSE
            RAISE EXCEPTION 'ERROR: Foreign key constraint created but delete rule is %, expected SET NULL', 
                constraint_info.delete_rule;
        END IF;
    ELSE
        RAISE EXCEPTION 'ERROR: Failed to create foreign key constraint papers_setup_import_session_id_fkey';
    END IF;
END $$;

-- Step 5: Test the constraint behavior (optional verification)
DO $$
BEGIN
    -- This is just a verification that the constraint allows NULL values
    -- We're not actually inserting data, just checking the constraint definition
    RAISE NOTICE 'Foreign key constraint fix completed successfully';
    RAISE NOTICE 'Import sessions can now be deleted, and referencing papers_setup records will have import_session_id set to NULL';
END $$;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';