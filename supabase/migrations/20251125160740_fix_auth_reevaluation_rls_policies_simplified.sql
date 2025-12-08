/*
  # Fix Auth Function Re-evaluation in RLS Policies - Simplified
  
  1. Changes
    - Wrap auth.uid() with SELECT statements to prevent re-evaluation
    - Focus on the specific policies mentioned in the audit
    
  2. Security Impact
    - Improves query performance significantly
    - Maintains existing access control
*/

-- Fix mock_exams entity admins policy
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'mock_exams' 
    AND policyname = 'Entity admins can create mock exams in their company'
  ) THEN
    DROP POLICY "Entity admins can create mock exams in their company" ON mock_exams;
    CREATE POLICY "Entity admins can create mock exams in their company"
      ON mock_exams FOR INSERT
      TO authenticated
      WITH CHECK (
        company_id IN (
          SELECT eu.company_id
          FROM entity_users eu
          WHERE eu.auth_user_id = (SELECT auth.uid())
          AND eu.is_active = true
        )
      );
  END IF;
END $$;

-- Fix mock_exams school admins policy
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'mock_exams' 
    AND policyname = 'School admins can create mock exams for their schools'
  ) THEN
    DROP POLICY "School admins can create mock exams for their schools" ON mock_exams;
    CREATE POLICY "School admins can create mock exams for their schools"
      ON mock_exams FOR INSERT
      TO authenticated
      WITH CHECK (
        company_id IN (
          SELECT s.company_id
          FROM schools s
          INNER JOIN entity_users eu ON eu.company_id = s.company_id
          WHERE eu.auth_user_id = (SELECT auth.uid())
          AND eu.is_active = true
          AND s.id = ANY(eu.assigned_schools)
        )
      );
  END IF;
END $$;

-- Fix teachers branch admins policy
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'teachers' 
    AND policyname = 'Branch admins manage teachers in branches'
  ) THEN
    DROP POLICY "Branch admins manage teachers in branches" ON teachers;
    CREATE POLICY "Branch admins manage teachers in branches"
      ON teachers FOR ALL
      TO authenticated
      USING (
        branch_id IN (
          SELECT unnest(eu.assigned_branches)
          FROM entity_users eu
          WHERE eu.auth_user_id = (SELECT auth.uid())
          AND eu.is_active = true
        )
      )
      WITH CHECK (
        branch_id IN (
          SELECT unnest(eu.assigned_branches)
          FROM entity_users eu
          WHERE eu.auth_user_id = (SELECT auth.uid())
          AND eu.is_active = true
        )
      );
  END IF;
END $$;

-- Fix teachers entity admins policy
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'teachers' 
    AND policyname = 'Entity admins manage teachers in company'
  ) THEN
    DROP POLICY "Entity admins manage teachers in company" ON teachers;
    CREATE POLICY "Entity admins manage teachers in company"
      ON teachers FOR ALL
      TO authenticated
      USING (
        company_id IN (
          SELECT eu.company_id
          FROM entity_users eu
          WHERE eu.auth_user_id = (SELECT auth.uid())
          AND eu.is_active = true
        )
      )
      WITH CHECK (
        company_id IN (
          SELECT eu.company_id
          FROM entity_users eu
          WHERE eu.auth_user_id = (SELECT auth.uid())
          AND eu.is_active = true
        )
      );
  END IF;
END $$;

-- Fix teachers school admins policy
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'teachers' 
    AND policyname = 'School admins manage teachers in schools'
  ) THEN
    DROP POLICY "School admins manage teachers in schools" ON teachers;
    CREATE POLICY "School admins manage teachers in schools"
      ON teachers FOR ALL
      TO authenticated
      USING (
        school_id IN (
          SELECT unnest(eu.assigned_schools)
          FROM entity_users eu
          WHERE eu.auth_user_id = (SELECT auth.uid())
          AND eu.is_active = true
        )
      )
      WITH CHECK (
        school_id IN (
          SELECT unnest(eu.assigned_schools)
          FROM entity_users eu
          WHERE eu.auth_user_id = (SELECT auth.uid())
          AND eu.is_active = true
        )
      );
  END IF;
END $$;

-- Fix teachers school and branch admins view policy
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'teachers' 
    AND policyname = 'School and branch admins can view teachers'
  ) THEN
    DROP POLICY "School and branch admins can view teachers" ON teachers;
    CREATE POLICY "School and branch admins can view teachers"
      ON teachers FOR SELECT
      TO authenticated
      USING (
        school_id IN (
          SELECT unnest(eu.assigned_schools)
          FROM entity_users eu
          WHERE eu.auth_user_id = (SELECT auth.uid())
          AND eu.is_active = true
        )
        OR
        branch_id IN (
          SELECT unnest(eu.assigned_branches)
          FROM entity_users eu
          WHERE eu.auth_user_id = (SELECT auth.uid())
          AND eu.is_active = true
        )
      );
  END IF;
END $$;

-- Fix students branch admins policy
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'students' 
    AND policyname = 'Branch admins manage students in branches'
  ) THEN
    DROP POLICY "Branch admins manage students in branches" ON students;
    CREATE POLICY "Branch admins manage students in branches"
      ON students FOR ALL
      TO authenticated
      USING (
        branch_id IN (
          SELECT unnest(eu.assigned_branches)
          FROM entity_users eu
          WHERE eu.auth_user_id = (SELECT auth.uid())
          AND eu.is_active = true
        )
      )
      WITH CHECK (
        branch_id IN (
          SELECT unnest(eu.assigned_branches)
          FROM entity_users eu
          WHERE eu.auth_user_id = (SELECT auth.uid())
          AND eu.is_active = true
        )
      );
  END IF;
END $$;

-- Fix students entity admins policy
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'students' 
    AND policyname = 'Entity admins manage students in company'
  ) THEN
    DROP POLICY "Entity admins manage students in company" ON students;
    CREATE POLICY "Entity admins manage students in company"
      ON students FOR ALL
      TO authenticated
      USING (
        company_id IN (
          SELECT eu.company_id
          FROM entity_users eu
          WHERE eu.auth_user_id = (SELECT auth.uid())
          AND eu.is_active = true
        )
      )
      WITH CHECK (
        company_id IN (
          SELECT eu.company_id
          FROM entity_users eu
          WHERE eu.auth_user_id = (SELECT auth.uid())
          AND eu.is_active = true
        )
      );
  END IF;
END $$;

-- Fix students school admins policy
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'students' 
    AND policyname = 'School admins manage students in schools'
  ) THEN
    DROP POLICY "School admins manage students in schools" ON students;
    CREATE POLICY "School admins manage students in schools"
      ON students FOR ALL
      TO authenticated
      USING (
        school_id IN (
          SELECT unnest(eu.assigned_schools)
          FROM entity_users eu
          WHERE eu.auth_user_id = (SELECT auth.uid())
          AND eu.is_active = true
        )
      )
      WITH CHECK (
        school_id IN (
          SELECT unnest(eu.assigned_schools)
          FROM entity_users eu
          WHERE eu.auth_user_id = (SELECT auth.uid())
          AND eu.is_active = true
        )
      );
  END IF;
END $$;

-- Fix users email lookup policy
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND policyname = 'Users can view their own record by email'
  ) THEN
    DROP POLICY "Users can view their own record by email" ON users;
    CREATE POLICY "Users can view their own record by email"
      ON users FOR SELECT
      TO authenticated
      USING (
        email = (SELECT u.email FROM auth.users u WHERE u.id = (SELECT auth.uid()))
      );
  END IF;
END $$;

-- Fix student_class_sections policies
DO $$
BEGIN
  -- Branch admins
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'student_class_sections' 
    AND policyname = 'Branch admins manage student_class_sections in branches'
  ) THEN
    DROP POLICY "Branch admins manage student_class_sections in branches" ON student_class_sections;
    CREATE POLICY "Branch admins manage student_class_sections in branches"
      ON student_class_sections FOR ALL
      TO authenticated
      USING (
        student_id IN (
          SELECT s.id
          FROM students s
          WHERE s.branch_id IN (
            SELECT unnest(eu.assigned_branches)
            FROM entity_users eu
            WHERE eu.auth_user_id = (SELECT auth.uid())
            AND eu.is_active = true
          )
        )
      )
      WITH CHECK (
        student_id IN (
          SELECT s.id
          FROM students s
          WHERE s.branch_id IN (
            SELECT unnest(eu.assigned_branches)
            FROM entity_users eu
            WHERE eu.auth_user_id = (SELECT auth.uid())
            AND eu.is_active = true
          )
        )
      );
  END IF;

  -- Entity admins
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'student_class_sections' 
    AND policyname = 'Entity admins manage student_class_sections in company'
  ) THEN
    DROP POLICY "Entity admins manage student_class_sections in company" ON student_class_sections;
    CREATE POLICY "Entity admins manage student_class_sections in company"
      ON student_class_sections FOR ALL
      TO authenticated
      USING (
        student_id IN (
          SELECT s.id
          FROM students s
          WHERE s.company_id IN (
            SELECT eu.company_id
            FROM entity_users eu
            WHERE eu.auth_user_id = (SELECT auth.uid())
            AND eu.is_active = true
          )
        )
      )
      WITH CHECK (
        student_id IN (
          SELECT s.id
          FROM students s
          WHERE s.company_id IN (
            SELECT eu.company_id
            FROM entity_users eu
            WHERE eu.auth_user_id = (SELECT auth.uid())
            AND eu.is_active = true
          )
        )
      );
  END IF;

  -- School admins
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'student_class_sections' 
    AND policyname = 'School admins manage student_class_sections in schools'
  ) THEN
    DROP POLICY "School admins manage student_class_sections in schools" ON student_class_sections;
    CREATE POLICY "School admins manage student_class_sections in schools"
      ON student_class_sections FOR ALL
      TO authenticated
      USING (
        student_id IN (
          SELECT s.id
          FROM students s
          WHERE s.school_id IN (
            SELECT unnest(eu.assigned_schools)
            FROM entity_users eu
            WHERE eu.auth_user_id = (SELECT auth.uid())
            AND eu.is_active = true
          )
        )
      )
      WITH CHECK (
        student_id IN (
          SELECT s.id
          FROM students s
          WHERE s.school_id IN (
            SELECT unnest(eu.assigned_schools)
            FROM entity_users eu
            WHERE eu.auth_user_id = (SELECT auth.uid())
            AND eu.is_active = true
          )
        )
      );
  END IF;
END $$;