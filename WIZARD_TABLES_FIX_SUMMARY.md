# Mock Exam Wizard - Database Tables Fix

## Problem
After the RLS policy fix, the wizard showed "Failed to Load Exam Data" error.

## Root Cause
The migration file `20251005220000_add_mock_exam_status_wizard_support.sql` that creates the required tables was never applied to the database. The tables didn't exist:
- `mock_exam_stage_progress`
- `mock_exam_instructions`
- `mock_exam_questions`

## Error Messages Received
```
relation "public.mock_exam_stage_progress" does not exist
relation "public.mock_exam_instructions" does not exist
relation "public.mock_exam_questions" does not exist
```

## Solution Applied

### 1. Created Missing Tables
Applied migration to create all three wizard tables with proper structure:

**mock_exam_stage_progress**
- Stores completion status for each stage of a mock exam
- Tracks requirements, completion date, notes
- Unique constraint on (mock_exam_id, stage)

**mock_exam_instructions**
- Stores instructions for different audiences (students, teachers, invigilators, etc.)
- Links to mock exams with CASCADE delete
- Auto-updates `updated_at` timestamp

**mock_exam_questions**
- Stores question selections for mock exams
- Supports both bank questions and custom questions
- Tracks sequence, marks, optional status
- Unique constraint on (mock_exam_id, sequence)

### 2. Applied RLS Policies
Created helper functions and applied simplified RLS policies:

**Helper Functions:**
- `user_has_exam_access(exam_id)` - Fast permission check using JOIN
- `is_system_admin()` - Check if user is system admin

**RLS Policies:**
- Separate policies for SELECT, INSERT, UPDATE, DELETE
- Uses helper functions for fast evaluation
- System admin bypass included

### 3. Performance Indexes
Created indexes for fast RLS evaluation:
- `idx_entity_users_user_company` on entity_users
- `idx_mock_exam_stage_progress_exam_user` on stage progress
- `idx_mock_exam_instructions_exam_user` on instructions
- `idx_mock_exam_questions_exam_user` on questions

## Verification

### Tables Created ✅
```sql
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('mock_exam_stage_progress', 'mock_exam_instructions', 'mock_exam_questions');
```
Result: All 3 tables exist

### Helper Functions Created ✅
```sql
SELECT proname FROM pg_proc
WHERE proname IN ('user_has_exam_access', 'is_system_admin');
```
Result: Both functions exist with SECURITY DEFINER

### RLS Policies Applied ✅
```sql
SELECT tablename, policyname, cmd FROM pg_policies
WHERE tablename IN ('mock_exam_stage_progress', 'mock_exam_instructions', 'mock_exam_questions');
```
Result: 12 policies (4 per table: SELECT, INSERT, UPDATE, DELETE)

## What to Test Now

1. **Open Mock Exam Wizard**
   - Navigate to Mock Exams page
   - Click "Change Status" on any exam
   - Should load successfully (no "Failed to Load" error)

2. **Check Console Logs**
   - Open browser DevTools → Console
   - Should see:
     ```
     [MockExamService] Fetching wizard context for exam: ...
     [MockExamService] Exam data fetched successfully: ...
     [Wizard] Building payload for stage: ...
     ```

3. **Test Status Changes**
   - Select different status stages
   - Fill required fields
   - Submit status change
   - Should complete without errors

4. **Test Instructions & Questions**
   - Go to "Materials Ready" stage
   - Add instructions for different audiences
   - Add questions from question bank
   - All should save successfully

## Status

✅ **Tables Created** - All wizard tables now exist in database
✅ **RLS Policies Applied** - Fast, simplified policies using helper functions
✅ **Indexes Created** - Performance optimizations in place
✅ **Helper Functions** - SECURITY DEFINER functions for permission checks

## Next Steps

1. Refresh the application in your browser (Ctrl+Shift+R to clear cache)
2. Try opening the wizard again
3. The "Failed to Load Exam Data" error should be resolved
4. You should now see the wizard stages loading correctly

## Technical Details

### Migrations Applied:
1. `add_mock_exam_status_wizard_tables` - Created the 3 tables
2. `fix_mock_exam_wizard_rls_policies` - Applied RLS policies and helper functions

### Database Changes:
- 3 new tables
- 2 new functions (SECURITY DEFINER)
- 12 new RLS policies
- 4 new indexes

### Security Maintained:
- Company data isolation preserved
- RLS policies enforce permissions
- System admins can access for support
- Audit trail maintained

---

**Fix Applied:** 2025-10-03
**Status:** ✅ COMPLETE - Wizard should now work correctly
**Action Required:** Refresh browser to test
