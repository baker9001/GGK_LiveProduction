# Quick Test Guide - Question Import Fix

## What Was Fixed

Questions appearing to import successfully but not saving to database.

## How to Test

### 1. Open Browser Console
Open Developer Tools (F12) and go to Console tab before importing.

### 2. Start Import Process
Go to Papers Setup → Questions Tab → Click "Import Questions"

### 3. Watch Console Output

#### ✅ Success Indicators:
```
🔍 IMPORT DIAGNOSTICS - STARTING
🔐 PRE-FLIGHT VALIDATION
  ✅ Authentication session valid: your.email@domain.com
  ✅ User has permission to insert questions
  ✅ Prerequisites validated successfully
🔄 Processing Questions
  --- Question 1/X ---
  ✅ Question inserted successfully
🔍 POST-IMPORT VERIFICATION
  ✅ All questions verified successfully in database
  ✅ All MCQ questions have options saved
  ✅ Post-import verification passed
🏁 IMPORT DIAGNOSTICS - COMPLETED
```

#### ❌ Failure Indicators:
```
❌ Authentication check failed
❌ Permission check failed
❌ CRITICAL: Not all questions were saved!
❌ Error verifying questions in database
```

### 4. Verify in Database

Open Supabase Dashboard → SQL Editor → Run:

```sql
-- Check if questions were imported
SELECT COUNT(*) FROM questions_master_admin
WHERE paper_id = '[your-paper-id]'
AND deleted_at IS NULL;

-- Check MCQ options
SELECT q.question_number, COUNT(qo.id) as options
FROM questions_master_admin q
LEFT JOIN question_options qo ON qo.question_id = q.id
WHERE q.paper_id = '[your-paper-id]'
AND q.type = 'mcq'
GROUP BY q.question_number;
```

### 5. Common Issues

#### "Authentication session is invalid"
**Solution**: Sign out and sign in again

#### "User is not a system admin"
**Solution**: Check admin_users table, ensure user exists

#### "Verification failed: Only X out of Y questions found"
**Solution**: Check console for specific error messages, review RLS policies

## Expected Behavior

### Before Fix:
- ✅ Shows success toast
- ❌ No data in database
- ❌ No error messages

### After Fix:
- If successful:
  - ✅ Shows success toast
  - ✅ Data in database
  - ✅ Console shows verification passed

- If failed:
  - ❌ Shows error toast with specific reason
  - ❌ No false success notification
  - ❌ Console shows detailed error

## Quick SQL Diagnostic

Run this in Supabase SQL Editor to check if your user can insert:

```sql
SELECT can_insert_questions();
```

If result shows `"can_insert": false`, you need to fix your user permissions.

## Files Changed

1. `supabase/migrations/20251019200000_fix_question_import_data_persistence.sql` - New migration
2. `src/lib/data-operations/questionsDataOperations.ts` - Enhanced import function

## Next Steps

1. Apply migration (Supabase auto-applies on push)
2. Test import with small question set first
3. Monitor console for any unexpected errors
4. Verify data in database after import
5. Test with larger question sets once confirmed working
