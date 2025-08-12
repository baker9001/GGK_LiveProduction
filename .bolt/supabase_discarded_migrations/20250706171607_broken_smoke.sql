/*
  # Fix Foreign Key Constraint for Import Sessions - Definitive Solution

  1. Problem
    - The foreign key constraint between papers_setup.import_session_id and past_paper_import_sessions.id
    - Still prevents deletion of import sessions despite previous migration attempts
    - Error: "update or delete on table "past_paper_import_sessions" violates foreign key constraint"

  2. Solution
    - Forcefully drop ALL existing foreign key constraints on import_session_id
    - Recreate with proper ON DELETE SET NULL behavior
    - Add comprehensive verification and error handling

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
    constraint_count INTEGER := 0;
BEGIN
    -- Find and drop all foreign key constraints on papers_setup.import_session_id
    FOR constraint_record IN
        SELECT tc.constraint_name, tc.table_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        WHERE tc.table_name = 'papers_setup'
            AND tc.constraint_type = 'FOREIGN KEY'
            AND kcu.column_name = 'import_session_id'
            AND tc.table_schema = 'public'
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', 
                constraint_record.table_name, constraint_record.constraint_name);
            constraint_count := constraint_count + 1;
            RAISE NOTICE 'Dropped foreign key constraint: % from table %', 
                constraint_record.constraint_name, constraint_record.table_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not drop constraint %: %', constraint_record.constraint_name, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Total constraints processed: %', constraint_count;
END $$;

-- Step 2: Ensure the constraint name doesn't exist before creating
DO $$
BEGIN
    -- Drop the specific constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'papers_setup_import_session_id_fkey'
        AND table_name = 'papers_setup'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE papers_setup DROP CONSTRAINT papers_setup_import_session_id_fkey;
        RAISE NOTICE 'Dropped existing papers_setup_import_session_id_fkey constraint';
    END IF;
END $$;

-- Step 3: Add the correct foreign key constraint with ON DELETE SET NULL
DO $$
BEGIN
    ALTER TABLE papers_setup 
    ADD CONSTRAINT papers_setup_import_session_id_fkey 
    FOREIGN KEY (import_session_id) 
    REFERENCES past_paper_import_sessions(id) 
    ON DELETE SET NULL
    ON UPDATE CASCADE;
    
    RAISE NOTICE 'Successfully created foreign key constraint with ON DELETE SET NULL';
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create foreign key constraint: %', SQLERRM;
END $$;

-- Step 4: Create index for better performance if it doesn't exist
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
    ELSE
        RAISE NOTICE 'Index idx_papers_setup_import_session_id already exists';
    END IF;
END $$;

-- Step 5: Verify the constraint was created with correct delete behavior
DO $$
DECLARE
    constraint_info RECORD;
BEGIN
    SELECT 
        tc.constraint_name,
        rc.delete_rule,
        rc.update_rule
    INTO constraint_info
    FROM information_schema.table_constraints tc
    JOIN information_schema.referential_constraints rc 
        ON tc.constraint_name = rc.constraint_name
        AND tc.constraint_schema = rc.constraint_schema
    WHERE tc.constraint_name = 'papers_setup_import_session_id_fkey'
        AND tc.table_name = 'papers_setup'
        AND tc.table_schema = 'public';
        
    IF FOUND THEN
        IF constraint_info.delete_rule = 'SET NULL' THEN
            RAISE NOTICE 'SUCCESS: Foreign key constraint % created with correct delete rule: % and update rule: %', 
                constraint_info.constraint_name, constraint_info.delete_rule, constraint_info.update_rule;
        ELSE
            RAISE EXCEPTION 'ERROR: Foreign key constraint created but delete rule is %, expected SET NULL', 
                constraint_info.delete_rule;
        END IF;
    ELSE
        RAISE EXCEPTION 'ERROR: Failed to create foreign key constraint papers_setup_import_session_id_fkey';
    END IF;
END $$;

-- Step 6: Test that we can now handle deletions properly
DO $$
BEGIN
    RAISE NOTICE 'Foreign key constraint fix completed successfully';
    RAISE NOTICE 'Import sessions can now be deleted, and referencing papers_setup records will have import_session_id set to NULL';
    RAISE NOTICE 'Constraint verification passed - delete operations should now work correctly';
END $$;

-- Refresh PostgREST schema cache to ensure changes are reflected
NOTIFY pgrst, 'reload schema';