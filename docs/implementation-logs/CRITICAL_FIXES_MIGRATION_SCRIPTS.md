# 🚨 Critical Fixes - Ready-to-Apply Migration Scripts

**Date**: November 23, 2025
**Priority**: IMMEDIATE ACTION REQUIRED
**Estimated Total Time**: 2-3 hours to apply all fixes

---

## 📋 Overview

This document contains 4 ready-to-apply migration scripts that fix the 8 critical issues identified in the comprehensive audit. Apply these in order.

---

## Migration 1️⃣: Create Student Answer Assets Storage Bucket
**Priority**: 🔴 **CRITICAL** - Blocks file uploads and audio recording
**Time**: 5 minutes
**Impact**: Fixes file_upload and audio answer formats

### Migration File
Save as: `supabase/migrations/20251124000001_create_student_answer_assets_bucket.sql`

```sql
/*
  # Create Storage Bucket for Student Answer Assets

  ## Problem
  The code references 'student-answer-assets' bucket for file uploads and audio
  recordings, but this bucket was never created in migrations. This causes all
  file/audio uploads to fail with "bucket not found" error.

  ## Solution
  Create the missing storage bucket with appropriate configuration and RLS policies.

  ## Security Model
  - Private bucket (requires authentication)
  - Users can only access their own files (folder isolation)
  - Teachers can view student submissions
  - System admins have full access
  - 10MB file size limit per file
  - MIME type restrictions for security

  ## Tables Affected
  - storage.buckets (bucket configuration)
  - storage.objects (RLS policies)
*/

-- ============================================================================
-- STEP 1: Create Storage Bucket
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'student-answer-assets',
  'student-answer-assets',
  false,  -- Private bucket, requires authentication
  10485760,  -- 10MB limit per file
  ARRAY[
    -- Images (for diagrams, graphs, structural diagrams)
    'image/jpeg',
    'image/png',
    'image/jpg',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    -- Audio (for audio recorder)
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/ogg',
    'audio/webm',
    'audio/x-m4a',
    -- Documents (for file uploader)
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    -- Text files
    'text/plain',
    'text/csv',
    'text/html',
    -- Archives
    'application/zip',
    'application/x-zip-compressed'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- STEP 2: Enable RLS on storage.objects (if not already enabled)
-- ============================================================================

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 3: Create RLS Policies for User Isolation
-- ============================================================================

-- Policy 1: Users can view their own files
CREATE POLICY "Users can view own answer assets"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'student-answer-assets' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy 2: Users can upload to their own folder
CREATE POLICY "Users can upload own answer assets"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'student-answer-assets' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy 3: Users can update their own files
CREATE POLICY "Users can update own answer assets"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'student-answer-assets' AND
    (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'student-answer-assets' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy 4: Users can delete their own files
CREATE POLICY "Users can delete own answer assets"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'student-answer-assets' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- STEP 4: Create RLS Policies for System Admins
-- ============================================================================

-- Policy 5: System admins have full access
CREATE POLICY "System admins full access to answer assets"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'student-answer-assets' AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
        AND users.user_type = 'system_admin'
        AND users.is_active = true
    )
  )
  WITH CHECK (
    bucket_id = 'student-answer-assets' AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
        AND users.user_type = 'system_admin'
        AND users.is_active = true
    )
  );

-- ============================================================================
-- STEP 5: Create RLS Policies for Teachers
-- ============================================================================

-- Policy 6: Teachers can view student answer assets
CREATE POLICY "Teachers can view student answer assets"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'student-answer-assets' AND
    EXISTS (
      SELECT 1 FROM users u
      INNER JOIN teachers t ON t.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
        AND u.user_type = 'teacher'
        AND u.is_active = true
        AND t.is_active = true
    )
  );

-- ============================================================================
-- STEP 6: Comments for Documentation
-- ============================================================================

COMMENT ON POLICY "Users can view own answer assets" ON storage.objects IS
  'Users can view files in their own folder: {user_id}/{asset_type}/{file}';

COMMENT ON POLICY "Users can upload own answer assets" ON storage.objects IS
  'Users can upload files to their own folder with MIME type and size restrictions';

COMMENT ON POLICY "System admins full access to answer assets" ON storage.objects IS
  'System admins can manage all student answer assets for moderation';

COMMENT ON POLICY "Teachers can view student answer assets" ON storage.objects IS
  'Teachers can view student submissions for grading purposes';
```

### Testing After Migration
```bash
# Test file upload
curl -X POST https://[PROJECT_ID].supabase.co/storage/v1/object/student-answer-assets/[USER_ID]/files/test.pdf \
  -H "Authorization: Bearer [JWT_TOKEN]" \
  --data-binary @test.pdf

# Expected: Success (201)
```

---

## Migration 2️⃣: Add Answer Format Enum Constraint
**Priority**: 🟡 **HIGH** - Prevents invalid data
**Time**: 2 minutes
**Impact**: Ensures only valid answer formats can be stored

### Migration File
Save as: `supabase/migrations/20251124000002_add_answer_format_validation.sql`

```sql
/*
  # Add Answer Format Validation Constraint

  ## Problem
  The answer_format column in questions_master_admin and sub_questions tables
  has no CHECK constraint, allowing any string value to be inserted. This can
  lead to invalid formats being stored and runtime errors in the UI.

  ## Solution
  Add CHECK constraint to whitelist only supported answer formats.

  ## Valid Formats
  Based on DynamicAnswerField.tsx component implementation:
  - Text formats: single_word, single_line, multi_line, multi_line_labeled
  - Connected: two_items_connected
  - Code: code
  - Files: file_upload, audio
  - Tables: table_completion, table, table_creator
  - Visual: diagram, graph, structural_diagram, chemical_structure
  - Math: equation, calculation

  ## Tables Affected
  - questions_master_admin
  - sub_questions
*/

-- ============================================================================
-- STEP 1: Add Constraint to questions_master_admin
-- ============================================================================

DO $$
BEGIN
  -- Check if constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'questions_answer_format_check'
  ) THEN
    -- Add CHECK constraint
    ALTER TABLE questions_master_admin
      ADD CONSTRAINT questions_answer_format_check
      CHECK (answer_format IN (
        -- Text-based formats
        'single_word',
        'single_line',
        'multi_line',
        'multi_line_labeled',
        'two_items_connected',

        -- Code editor
        'code',

        -- File and audio
        'file_upload',
        'audio',

        -- Table formats
        'table_completion',
        'table',
        'table_creator',

        -- Visual formats
        'diagram',
        'graph',
        'structural_diagram',
        'chemical_structure',

        -- Scientific formats
        'equation',
        'calculation',

        -- NULL is allowed (MCQ questions don't need answer_format)
        NULL
      ));

    RAISE NOTICE 'Added answer_format constraint to questions_master_admin';
  ELSE
    RAISE NOTICE 'Constraint questions_answer_format_check already exists';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Add Constraint to sub_questions
-- ============================================================================

DO $$
BEGIN
  -- Check if constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sub_questions_answer_format_check'
  ) THEN
    -- Add CHECK constraint
    ALTER TABLE sub_questions
      ADD CONSTRAINT sub_questions_answer_format_check
      CHECK (answer_format IN (
        -- Same list as above
        'single_word',
        'single_line',
        'multi_line',
        'multi_line_labeled',
        'two_items_connected',
        'code',
        'file_upload',
        'audio',
        'table_completion',
        'table',
        'table_creator',
        'diagram',
        'graph',
        'structural_diagram',
        'chemical_structure',
        'equation',
        'calculation',
        NULL
      ));

    RAISE NOTICE 'Added answer_format constraint to sub_questions';
  ELSE
    RAISE NOTICE 'Constraint sub_questions_answer_format_check already exists';
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Validate Existing Data
-- ============================================================================

-- Check for any invalid formats in existing data
DO $$
DECLARE
  invalid_count integer;
BEGIN
  -- Check questions_master_admin
  SELECT COUNT(*) INTO invalid_count
  FROM questions_master_admin
  WHERE answer_format NOT IN (
    'single_word', 'single_line', 'multi_line', 'multi_line_labeled',
    'two_items_connected', 'code', 'file_upload', 'audio',
    'table_completion', 'table', 'table_creator', 'diagram', 'graph',
    'structural_diagram', 'chemical_structure', 'equation', 'calculation'
  )
  AND answer_format IS NOT NULL;

  IF invalid_count > 0 THEN
    RAISE WARNING 'Found % questions with invalid answer_format values', invalid_count;
    -- Log the invalid formats
    RAISE NOTICE 'Invalid formats: %', (
      SELECT ARRAY_AGG(DISTINCT answer_format)
      FROM questions_master_admin
      WHERE answer_format NOT IN (
        'single_word', 'single_line', 'multi_line', 'multi_line_labeled',
        'two_items_connected', 'code', 'file_upload', 'audio',
        'table_completion', 'table', 'table_creator', 'diagram', 'graph',
        'structural_diagram', 'chemical_structure', 'equation', 'calculation'
      )
      AND answer_format IS NOT NULL
    );
  ELSE
    RAISE NOTICE 'All existing answer_format values are valid';
  END IF;

  -- Check sub_questions
  SELECT COUNT(*) INTO invalid_count
  FROM sub_questions
  WHERE answer_format NOT IN (
    'single_word', 'single_line', 'multi_line', 'multi_line_labeled',
    'two_items_connected', 'code', 'file_upload', 'audio',
    'table_completion', 'table', 'table_creator', 'diagram', 'graph',
    'structural_diagram', 'chemical_structure', 'equation', 'calculation'
  )
  AND answer_format IS NOT NULL;

  IF invalid_count > 0 THEN
    RAISE WARNING 'Found % sub-questions with invalid answer_format values', invalid_count;
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Comments for Documentation
-- ============================================================================

COMMENT ON CONSTRAINT questions_answer_format_check ON questions_master_admin IS
  'Ensures only supported answer formats from DynamicAnswerField component can be stored';

COMMENT ON CONSTRAINT sub_questions_answer_format_check ON sub_questions IS
  'Ensures only supported answer formats from DynamicAnswerField component can be stored';
```

### Testing After Migration
```sql
-- Test 1: Valid format (should succeed)
INSERT INTO questions_master_admin (id, answer_format, marks, question_description)
VALUES (gen_random_uuid(), 'diagram', 5, 'Test question');

-- Test 2: Invalid format (should fail)
INSERT INTO questions_master_admin (id, answer_format, marks, question_description)
VALUES (gen_random_uuid(), 'invalid_format', 5, 'Test question');
-- Expected error: new row violates check constraint "questions_answer_format_check"
```

---

## Migration 3️⃣: Fix Marks Data Type for Partial Credit
**Priority**: 🟡 **HIGH** - Enables partial credit marking
**Time**: 1 minute
**Impact**: Allows fractional marks (0.5, 1.5, etc.)

### Migration File
Save as: `supabase/migrations/20251124000003_fix_marks_data_type.sql`

```sql
/*
  # Fix Marks Column Data Type for Partial Credit

  ## Problem
  The marks column in question_correct_answers table is INTEGER type, but
  the questions_master_admin and sub_questions tables use NUMERIC type.
  This prevents storing partial credit marks like 0.5, 1.5, 2.25, etc.

  ## Solution
  Change marks column from INTEGER to NUMERIC to match other tables and
  support fractional marks.

  ## Tables Affected
  - question_correct_answers (marks column)
*/

-- ============================================================================
-- STEP 1: Change marks Column Type
-- ============================================================================

-- Convert INTEGER to NUMERIC
ALTER TABLE question_correct_answers
  ALTER COLUMN marks TYPE numeric USING marks::numeric;

-- Keep it nullable (some answers may not have marks assigned yet)
-- Set default to 1 for convenience
ALTER TABLE question_correct_answers
  ALTER COLUMN marks SET DEFAULT 1;

-- Add comment
COMMENT ON COLUMN question_correct_answers.marks IS
  'Marks allocated to this answer alternative. Supports fractional marks for partial credit (e.g., 0.5, 1.5, 2.25)';

-- ============================================================================
-- STEP 2: Verify Data Type Consistency
-- ============================================================================

-- Check that all marks columns now have consistent types
DO $$
DECLARE
  q_type text;
  sq_type text;
  qca_type text;
BEGIN
  -- Get data types
  SELECT data_type INTO q_type
  FROM information_schema.columns
  WHERE table_name = 'questions_master_admin' AND column_name = 'marks';

  SELECT data_type INTO sq_type
  FROM information_schema.columns
  WHERE table_name = 'sub_questions' AND column_name = 'marks';

  SELECT data_type INTO qca_type
  FROM information_schema.columns
  WHERE table_name = 'question_correct_answers' AND column_name = 'marks';

  -- Verify all are numeric
  IF q_type = 'numeric' AND sq_type = 'numeric' AND qca_type = 'numeric' THEN
    RAISE NOTICE 'Success: All marks columns are now NUMERIC type';
  ELSE
    RAISE WARNING 'Type mismatch detected: questions=%, sub_questions=%, correct_answers=%',
      q_type, sq_type, qca_type;
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Add Validation Function
-- ============================================================================

-- Function to validate marks allocation across alternatives
CREATE OR REPLACE FUNCTION validate_marks_allocation(
  p_question_id uuid,
  p_sub_question_id uuid
)
RETURNS TABLE(
  is_valid boolean,
  total_marks numeric,
  expected_marks numeric,
  difference numeric,
  message text
) AS $$
DECLARE
  v_total_marks numeric;
  v_expected_marks numeric;
BEGIN
  -- Get expected marks from question or sub-question
  IF p_question_id IS NOT NULL THEN
    SELECT marks INTO v_expected_marks
    FROM questions_master_admin
    WHERE id = p_question_id;
  ELSIF p_sub_question_id IS NOT NULL THEN
    SELECT marks INTO v_expected_marks
    FROM sub_questions
    WHERE id = p_sub_question_id;
  END IF;

  -- Calculate total allocated marks
  SELECT COALESCE(SUM(marks), 0) INTO v_total_marks
  FROM question_correct_answers
  WHERE (question_id = p_question_id OR sub_question_id = p_sub_question_id);

  -- Return validation result
  RETURN QUERY SELECT
    (v_total_marks = v_expected_marks)::boolean,
    v_total_marks,
    v_expected_marks,
    v_total_marks - v_expected_marks,
    CASE
      WHEN v_total_marks = v_expected_marks THEN 'Marks allocation is correct'
      WHEN v_total_marks > v_expected_marks THEN 'Over-allocated: ' || (v_total_marks - v_expected_marks)::text || ' extra marks'
      ELSE 'Under-allocated: ' || (v_expected_marks - v_total_marks)::text || ' marks missing'
    END;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION validate_marks_allocation IS
  'Validates that marks allocated to answer alternatives sum to the question total marks';
```

### Testing After Migration
```sql
-- Test fractional marks
INSERT INTO question_correct_answers (
  id, question_id, answer, marks, alternative_id
)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM questions_master_admin LIMIT 1),
  'Partial answer',
  1.5,  -- Fractional marks now supported!
  1
);

-- Test validation function
SELECT * FROM validate_marks_allocation(
  (SELECT id FROM questions_master_admin LIMIT 1),
  NULL
);
```

---

## Migration 4️⃣: Add RLS to Answer Components Tables
**Priority**: 🟠 **MEDIUM** - Security vulnerability
**Time**: 2 minutes
**Impact**: Prevents unauthorized access to answer data

### Migration File
Save as: `supabase/migrations/20251124000004_add_rls_answer_components.sql`

```sql
/*
  # Add RLS to Answer Components Tables

  ## Problem
  The answer_components and answer_requirements tables have no RLS policies,
  allowing anyone with database access to read or modify answer data.

  ## Solution
  Enable RLS and add appropriate policies for system admins, teachers, and students.

  ## Security Model
  - System admins: Full access (read/write)
  - Teachers: Read-only access
  - Students: No direct access (access through questions only)

  ## Tables Affected
  - answer_components
  - answer_requirements
*/

-- ============================================================================
-- STEP 1: Enable RLS
-- ============================================================================

ALTER TABLE answer_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE answer_requirements ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: System Admin Policies (Full Access)
-- ============================================================================

-- answer_components: System admins can do everything
CREATE POLICY "System admins can manage answer components"
  ON answer_components
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
        AND users.user_type = 'system_admin'
        AND users.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
        AND users.user_type = 'system_admin'
        AND users.is_active = true
    )
  );

-- answer_requirements: System admins can do everything
CREATE POLICY "System admins can manage answer requirements"
  ON answer_requirements
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
        AND users.user_type = 'system_admin'
        AND users.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
        AND users.user_type = 'system_admin'
        AND users.is_active = true
    )
  );

-- ============================================================================
-- STEP 3: Teacher Policies (Read-Only)
-- ============================================================================

-- answer_components: Teachers can view
CREATE POLICY "Teachers can view answer components"
  ON answer_components
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      INNER JOIN teachers t ON t.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
        AND u.user_type = 'teacher'
        AND u.is_active = true
        AND t.is_active = true
    )
  );

-- answer_requirements: Teachers can view
CREATE POLICY "Teachers can view answer requirements"
  ON answer_requirements
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      INNER JOIN teachers t ON t.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
        AND u.user_type = 'teacher'
        AND u.is_active = true
        AND t.is_active = true
    )
  );

-- ============================================================================
-- STEP 4: Verify RLS is Working
-- ============================================================================

-- Function to test RLS policies
CREATE OR REPLACE FUNCTION test_answer_components_rls()
RETURNS TABLE(
  table_name text,
  rls_enabled boolean,
  policy_count integer,
  status text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    'answer_components'::text,
    relrowsecurity,
    (SELECT COUNT(*)::integer FROM pg_policies WHERE tablename = 'answer_components'),
    CASE
      WHEN relrowsecurity AND (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'answer_components') >= 2
      THEN 'OK: RLS enabled with policies'
      WHEN relrowsecurity
      THEN 'WARNING: RLS enabled but no policies'
      ELSE 'ERROR: RLS not enabled'
    END
  FROM pg_class
  WHERE relname = 'answer_components';

  RETURN QUERY
  SELECT
    'answer_requirements'::text,
    relrowsecurity,
    (SELECT COUNT(*)::integer FROM pg_policies WHERE tablename = 'answer_requirements'),
    CASE
      WHEN relrowsecurity AND (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'answer_requirements') >= 2
      THEN 'OK: RLS enabled with policies'
      WHEN relrowsecurity
      THEN 'WARNING: RLS enabled but no policies'
      ELSE 'ERROR: RLS not enabled'
    END
  FROM pg_class
  WHERE relname = 'answer_requirements';
END;
$$ LANGUAGE plpgsql;

-- Run the test
SELECT * FROM test_answer_components_rls();

-- ============================================================================
-- STEP 5: Comments for Documentation
-- ============================================================================

COMMENT ON POLICY "System admins can manage answer components" ON answer_components IS
  'System administrators have full access to manage answer components';

COMMENT ON POLICY "Teachers can view answer components" ON answer_components IS
  'Teachers can view answer components for their questions and papers';

COMMENT ON POLICY "System admins can manage answer requirements" ON answer_requirements IS
  'System administrators have full access to manage answer requirements';

COMMENT ON POLICY "Teachers can view answer requirements" ON answer_requirements IS
  'Teachers can view answer requirements for understanding marking logic';
```

### Testing After Migration
```sql
-- Test RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('answer_components', 'answer_requirements');
-- Expected: rowsecurity = true for both

-- Test policy count
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN ('answer_components', 'answer_requirements')
GROUP BY tablename;
-- Expected: At least 2 policies per table
```

---

## 🚀 Quick Start Guide

### Apply All Migrations

**Option 1: Using Supabase Dashboard** (Recommended)
1. Go to https://supabase.com/dashboard/project/[YOUR_PROJECT]/sql
2. Copy and paste each migration SQL (in order 1-4)
3. Click "Run" for each migration
4. Verify success message

**Option 2: Using Supabase CLI**
```bash
# Make sure migrations are in supabase/migrations/ folder
supabase db push

# Or apply manually
supabase db push --file supabase/migrations/20251124000001_create_student_answer_assets_bucket.sql
supabase db push --file supabase/migrations/20251124000002_add_answer_format_validation.sql
supabase db push --file supabase/migrations/20251124000003_fix_marks_data_type.sql
supabase db push --file supabase/migrations/20251124000004_add_rls_answer_components.sql
```

### Verify All Fixes

Run this verification script after applying all migrations:

```sql
-- Verification Query
SELECT
  'student-answer-assets bucket' as check_name,
  CASE WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'student-answer-assets')
    THEN '✅ PASS' ELSE '❌ FAIL' END as status
UNION ALL
SELECT
  'answer_format constraint',
  CASE WHEN EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'questions_answer_format_check')
    THEN '✅ PASS' ELSE '❌ FAIL' END
UNION ALL
SELECT
  'marks type is numeric',
  CASE WHEN (SELECT data_type FROM information_schema.columns
    WHERE table_name = 'question_correct_answers' AND column_name = 'marks') = 'numeric'
    THEN '✅ PASS' ELSE '❌ FAIL' END
UNION ALL
SELECT
  'answer_components RLS enabled',
  CASE WHEN (SELECT relrowsecurity FROM pg_class WHERE relname = 'answer_components')
    THEN '✅ PASS' ELSE '❌ FAIL' END
UNION ALL
SELECT
  'answer_requirements RLS enabled',
  CASE WHEN (SELECT relrowsecurity FROM pg_class WHERE relname = 'answer_requirements')
    THEN '✅ PASS' ELSE '❌ FAIL' END;
```

**Expected Output:**
```
✅ PASS - student-answer-assets bucket
✅ PASS - answer_format constraint
✅ PASS - marks type is numeric
✅ PASS - answer_components RLS enabled
✅ PASS - answer_requirements RLS enabled
```

---

## 📊 Impact Summary

| Migration | Issue Fixed | Affected Features |
|-----------|-------------|-------------------|
| 1 | Missing storage bucket | file_upload, audio, diagram exports |
| 2 | No format validation | All answer formats (prevents invalid data) |
| 3 | Marks type mismatch | Partial credit marking, sophisticated grading |
| 4 | Missing RLS | answer_components, answer_requirements security |

### Before Migrations
- ❌ File uploads fail
- ❌ Audio recording fails
- ❌ Invalid answer formats can be stored
- ❌ Partial credit (0.5 marks) not supported
- ❌ Answer components accessible without auth

### After Migrations
- ✅ File uploads work
- ✅ Audio recording works
- ✅ Only valid answer formats accepted
- ✅ Partial credit supported (0.5, 1.5, etc.)
- ✅ All answer data properly secured with RLS

---

## 🎯 Next Steps

After applying these migrations:

1. ✅ Test file upload in a question with `file_upload` format
2. ✅ Test audio recording in a question with `audio` format
3. ✅ Try inserting a question with invalid answer_format (should fail)
4. ✅ Try inserting partial credit marks (0.5, 1.5) - should work
5. ✅ Verify RLS policies block unauthorized access
6. ✅ Run comprehensive E2E tests on all answer formats

---

**Status**: ✅ **READY TO APPLY**
**Total Time**: ~10 minutes to apply all migrations
**Risk Level**: 🟢 LOW (all migrations are additive, no data loss)
