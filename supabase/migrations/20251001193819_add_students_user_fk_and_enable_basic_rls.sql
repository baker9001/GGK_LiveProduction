/*
  # Add Missing Foreign Key and Enable Basic RLS

  ## Critical Fix
  1. Add missing FK: students.user_id -> users.id
  2. Enable RLS on critical tables
  3. Keep existing policies but ensure RLS is enforced

  ## Impact
  - Enables PostgREST joins to work properly (students -> users)
  - Enforces existing security policies
  - Does not break existing application code
*/

-- ============================================================================
-- STEP 1: Add Missing Foreign Key - students.user_id -> users.id
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'students_user_id_fkey'
      AND table_name = 'students'
  ) THEN
    -- Check for invalid references first
    IF NOT EXISTS (
      SELECT 1 FROM students s
      WHERE s.user_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = s.user_id)
    ) THEN
      ALTER TABLE students
      ADD CONSTRAINT students_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
      
      RAISE NOTICE 'Added foreign key: students.user_id -> users.id';
    ELSE
      RAISE WARNING 'Cannot add FK: Invalid user_id references exist';
    END IF;
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Enable RLS on Critical Tables
-- ============================================================================

-- Only enable RLS, keep existing policies intact
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'RLS enabled on critical tables - existing policies are now enforced';
END $$;
