# Manual RLS Test Guide for question_options

## Problem Context

MCQ options are not displaying in Questions Setup because RLS policies were dropped but never recreated in migration `20251014174127`.

## Test Procedure

### Option 1: Direct SQL Test (Recommended)

Run these queries in Supabase SQL Editor:

#### 1. Check if RLS is enabled
```sql
SELECT
  relname as table_name,
  relrowsecurity as rls_enabled
FROM pg_class
WHERE relname = 'question_options';
```

**Expected**: `rls_enabled = true`

#### 2. Check existing policies
```sql
SELECT
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'question_options'
ORDER BY cmd, policyname;
```

**Before Fix**: Should show 0 rows (NO POLICIES!)
**After Fix**: Should show 4 rows (SELECT, INSERT, UPDATE, DELETE)

#### 3. Test SELECT access (as authenticated user)
```sql
-- This will fail if no SELECT policy exists
SELECT COUNT(*) FROM question_options;
```

**Before Fix**: ERROR - "new row violates row-level security policy"
**After Fix**: Returns count (e.g., 160 if 40 questions × 4 options)

#### 4. Check actual options data
```sql
SELECT
  q.question_number,
  qo.label,
  qo.option_text,
  qo.is_correct
FROM questions_master_admin q
LEFT JOIN question_options qo ON qo.question_id = q.id
WHERE q.type = 'mcq'
  AND q.created_at > NOW() - INTERVAL '7 days'
ORDER BY q.question_number, qo.order
LIMIT 20;
```

**Expected**: 4 rows per question showing all options (A, B, C, D)
**Bug Symptom**: 0 rows returned even though data exists (RLS blocks it)

### Option 2: Application Test

1. **Sign in as System Admin** to the application
2. Navigate to **Questions Setup > QA Review**
3. Open any MCQ question
4. **Check**: Do you see all 4 options (A, B, C, D)?

**Before Fix**: Only correct answer visible
**After Fix**: All 4 options visible

### Option 3: API Test

Use browser DevTools:

```javascript
// In browser console, after signing in
const supabase = window.supabase; // If exposed globally

// Test SELECT
const { data, error } = await supabase
  .from('question_options')
  .select('label, option_text, is_correct')
  .limit(10);

console.log('Data:', data);
console.log('Error:', error);
```

**Before Fix**: `error` will contain RLS policy violation
**After Fix**: `data` will contain array of options

## Test with JSON Import

### Full End-to-End Test

1. **Import the JSON file** (0610_21_M_J_2016_Biology_Extended_MCQ.json)
2. **Complete Paper Setup** - go through all stages
3. **Navigate to Questions Setup**
4. **Open Question #1**:
   - Question: "Which process causes this change?"
   - Expected options:
     - A: growth
     - B: reproduction
     - C: respiration (CORRECT)
     - D: sensitivity

**Bug Symptom**: Only option C visible
**After Fix**: All 4 options A, B, C, D visible with C marked correct

## Verification Queries

### Count options per question
```sql
SELECT
  q.question_number,
  COUNT(qo.id) as option_count,
  COUNT(*) FILTER (WHERE qo.is_correct) as correct_count
FROM questions_master_admin q
LEFT JOIN question_options qo ON qo.question_id = q.id
WHERE q.type = 'mcq'
GROUP BY q.id, q.question_number
ORDER BY q.question_number::integer
LIMIT 10;
```

**Expected**: Each MCQ should have 4 options, 1 correct
**Bug Symptom**: option_count = 0 due to RLS blocking

### Check data completeness
```sql
SELECT
  COUNT(DISTINCT question_id) as questions_with_options,
  COUNT(*) as total_options,
  COUNT(*) FILTER (WHERE is_correct) as correct_options,
  ROUND(AVG(LENGTH(option_text)), 0) as avg_option_length
FROM question_options;
```

**Expected**:
- questions_with_options: ~40 (number of MCQ questions)
- total_options: ~160 (40 × 4)
- correct_options: ~40 (1 per question)
- avg_option_length: 20-50 characters

## Apply the Fix

### Run Migration

In Supabase SQL Editor:

```sql
-- Copy and paste the entire contents of:
-- supabase/migrations/20251019190000_fix_question_options_missing_rls_policies.sql
```

The migration will:
1. Verify RLS is enabled
2. Drop any partial policies
3. Create 4 new policies (SELECT, INSERT, UPDATE, DELETE)
4. Add documentation
5. Report results

### Verify Fix Applied

```sql
-- Should now show 4 policies
SELECT COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'question_options';

-- Should now return data (not error)
SELECT COUNT(*) FROM question_options;
```

## Expected Results After Fix

### Database Level
- ✅ 4 RLS policies on question_options table
- ✅ SELECT queries return data
- ✅ System admins can INSERT/UPDATE/DELETE

### Application Level
- ✅ All 4 MCQ options display in Questions Setup
- ✅ Correct answer is marked/highlighted
- ✅ Can edit option text
- ✅ Can toggle correct answer
- ✅ Can add/delete options

### Import Process
- ✅ Options are saved to database during import
- ✅ Options are immediately visible after import
- ✅ No double-click or refresh needed

## Troubleshooting

### Still seeing only 1 option after fix?

1. **Clear browser cache** and reload
2. **Check you're signed in as system admin**
3. **Verify migration ran**: Check policy count query
4. **Check browser console** for errors
5. **Try incognito/private browsing**

### Getting "permission denied" errors?

- Ensure you're signed in as a user with admin privileges
- Check `is_admin_user()` function returns true for your user:
  ```sql
  SELECT is_admin_user(auth.uid());
  ```
- Verify your user is in the `admin_users` table

### Options still not displaying?

- Check if options exist in database:
  ```sql
  SELECT COUNT(*) FROM question_options
  WHERE question_id = 'YOUR_QUESTION_ID';
  ```
- If count is 0: Options were never inserted (different issue)
- If count is 4: RLS is still blocking (policies not applied correctly)

## Summary

The root cause is **missing RLS policies** on `question_options` table. The migration `20251019190000_fix_question_options_missing_rls_policies.sql` creates the necessary policies to allow system admins to view and manage question options.

Apply the migration and verify all 4 options display correctly in the Questions Setup interface.
