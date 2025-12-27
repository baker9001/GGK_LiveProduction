# MCQ Options Not Displaying - Complete Diagnosis

## Problem

After importing MCQ questions, all 4 options visible in Paper Setup, but only the correct answer shows in Questions Setup.

## Code Analysis - ALL COMPONENTS ARE CORRECT ✅

### 1. Database Schema ✅
- `question_options` table properly structured
- All required columns present
- Constraints and indexes in place

### 2. Import Code ✅
- File: `questionsDataOperations.ts` lines 2162-2210
- Correctly inserts ALL options into database
- Maps `label`, `option_text`, `is_correct`, `order`

### 3. Query Code ✅
- File: `questions-setup/page.tsx` lines 265-272
- Selects all required fields including `label`
- Proper join to `question_options`

### 4. Display Code ✅
- File: `QuestionCard.tsx` line 816
- Displays all options without filtering
- Sorts by order and renders each option

## Root Cause: LIKELY RLS POLICY ISSUE

Most probable cause: RLS policy on `question_options` table filtering by `is_correct = true`.

## Diagnostic Query

Run in Supabase SQL Editor:

```sql
SELECT
  q.question_number,
  qo.label,
  qo.option_text,
  qo.is_correct
FROM questions_master_admin q
LEFT JOIN question_options qo ON qo.question_id = q.id
WHERE q.created_at > NOW() - INTERVAL '1 day'
ORDER BY q.question_number, qo.order;
```

**Expected**: 4 rows per question
**If only 1**: Issue is RLS or import
**If 4**: Issue is query/UI

## Check RLS Policies

```sql
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'question_options';
```

Look for policies filtering `is_correct = true`.

## Next Step

Run diagnostic queries to pinpoint exact issue location, then apply appropriate fix.
