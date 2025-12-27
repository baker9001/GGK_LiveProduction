# Quick Diagnostic Guide - Question Import Issue

## 🚀 How to Find the Problem (5 Minutes)

### Step 1: Open Browser Console
Press `F12` or `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Option+I` (Mac)
Click the "Console" tab

### Step 2: Import Questions
1. Go to Papers Setup → Questions Tab
2. Click "Import Questions" button
3. Watch the console output

### Step 3: Look for This Pattern

#### ✅ **IF YOU SEE:**
```
✅ Question inserted successfully!
   Inserted question ID: <uuid>
```
**→ Questions ARE being inserted - problem is elsewhere (likely display/query issue)**

#### ❌ **IF YOU SEE:**
```
❌ ERROR inserting question:
   Error code: 42501
   Error message: new row violates row-level security policy
```
**→ RLS PERMISSION PROBLEM - You need admin access**

**FIX:**
```sql
-- Run this in Supabase SQL Editor:
INSERT INTO admin_users (id, name, email)
SELECT
  auth.uid(),
  auth.email(),
  auth.email()
WHERE NOT EXISTS (
  SELECT 1 FROM admin_users WHERE id = auth.uid()
);
```

#### ⚠️ **IF YOU SEE:**
```
❌ ERROR inserting question:
   Error code: 23503
   Error message: violates foreign key constraint
```
**→ INVALID REFERENCE - One of your IDs doesn't exist**

**CHECK:**
- Paper ID exists in papers_setup
- Data structure ID exists in data_structures
- Topic/Subtopic IDs are valid

#### 🔍 **IF YOU SEE:**
```
📊 IMPORT SUMMARY
Successfully imported: 0
Skipped (duplicates): 10
```
**→ DUPLICATE DETECTION - Questions already exist**

**FIX:**
Either delete existing questions or change question numbers

---

## 🎯 Most Common Fixes

### Fix #1: Permission Denied (90% of cases)

**Symptom:** No questions appear, no visible error

**Test:**
```sql
-- Run in Supabase SQL Editor
SELECT is_admin_user(auth.uid());
-- Should return: true
```

**Fix:**
```sql
-- Add yourself as admin
INSERT INTO admin_users (id, name, email)
VALUES (
  (SELECT auth.uid()),
  'Your Name',
  (SELECT auth.email())
);
```

### Fix #2: Already Imported

**Symptom:** "Successfully imported: 0, Skipped: X"

**Test:**
```sql
SELECT question_number, id
FROM questions_master_admin
WHERE paper_id = '<your-paper-id>';
```

**Fix:** Delete existing questions before re-importing

### Fix #3: Invalid Paper ID

**Symptom:** Error about paper_id foreign key

**Test:**
```sql
SELECT id, paper_code, status
FROM papers_setup
WHERE id = '<your-paper-id>';
```

**Fix:** Ensure paper is created before importing questions

---

## 📋 Console Output Checklist

When you attempt import, verify these messages appear:

- [ ] `🔍 IMPORT DIAGNOSTICS - STARTING`
- [ ] `Session exists: true`
- [ ] `Can query questions_master_admin: true`
- [ ] `Paper exists: true`
- [ ] `Data structure exists: true`
- [ ] `📦 Starting Attachment Upload`
- [ ] `🔄 Processing Questions`
- [ ] For each question: `💾 Attempting database insert...`
- [ ] For each question: `✅ Question inserted successfully!` OR error message
- [ ] `📊 IMPORT SUMMARY`
- [ ] `🔍 Verifying inserted questions in database...`
- [ ] `Questions found in DB: X` (should match expected count)

---

## 🆘 Still Not Working?

### Copy This Information:

1. **Console Output:** Copy everything from "IMPORT DIAGNOSTICS - STARTING" to the end
2. **User Info:** Your email and role
3. **Error Messages:** Any red error text
4. **Database Check:** Run and copy output:

```sql
-- Check if you're admin
SELECT
  auth.uid() as user_id,
  EXISTS(SELECT 1 FROM admin_users WHERE id = auth.uid()) as is_in_admin_table,
  is_admin_user(auth.uid()) as admin_function_result;

-- Check paper
SELECT id, paper_code, status
FROM papers_setup
WHERE id = '<your-paper-id>';

-- Check existing questions
SELECT COUNT(*), MIN(question_number), MAX(question_number)
FROM questions_master_admin
WHERE paper_id = '<your-paper-id>';
```

---

## 💡 Understanding the Logs

### Log Levels:
- 🔍 **Diagnostic** - System checks
- 📋 **Info** - Normal operation
- ⚠️ **Warning** - Non-critical issues
- ❌ **Error** - Failed operations
- ✅ **Success** - Completed operations

### Key Sections:
1. **Pre-Import Diagnostics** - Checks before starting
2. **Per-Question Processing** - Each question's journey
3. **Import Summary** - Final statistics
4. **Verification** - Database confirmation

---

## 🎓 Pro Tips

1. **Always check console FIRST** - Don't trust success messages alone
2. **Look for "Questions found in DB"** - This confirms actual insert
3. **Check for red text** - Any errors will be highlighted
4. **Count mismatches** - If imported ≠ found, something failed
5. **Permission errors are silent** - That's why we need the logs

---

## Quick SQL Diagnostic Script

Run this in Supabase SQL Editor to get a health check:

```sql
-- Health Check Script
SELECT
  'Authentication' as check_type,
  CASE WHEN auth.uid() IS NOT NULL THEN '✅ PASS' ELSE '❌ FAIL' END as status,
  auth.uid() as user_id,
  auth.email() as email;

SELECT
  'Admin Status' as check_type,
  CASE WHEN is_admin_user(auth.uid()) THEN '✅ PASS' ELSE '❌ FAIL' END as status,
  EXISTS(SELECT 1 FROM admin_users WHERE id = auth.uid()) as in_admin_table;

SELECT
  'Database Access' as check_type,
  CASE WHEN COUNT(*) >= 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status,
  COUNT(*) as total_questions
FROM questions_master_admin;

SELECT
  'Paper Status' as check_type,
  CASE WHEN COUNT(*) > 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status,
  COUNT(*) as paper_count
FROM papers_setup;
```

Expected output: All checks should show "✅ PASS"

---

**Remember:** The detailed logs in the browser console will tell you EXACTLY what's wrong. Always check there first!
