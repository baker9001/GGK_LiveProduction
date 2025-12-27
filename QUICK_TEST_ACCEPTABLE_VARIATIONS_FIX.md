# Quick Test Guide: Acceptable Variations Fix

## 🎯 Goal
Verify that `acceptable_variations` are now preserved in your import session.

---

## Step 1: Run SQL Restoration (2 minutes)

### Option A: Using Supabase SQL Editor
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the file: `/restore_acceptable_variations.sql`
4. Copy and paste the entire script
5. Click **Run**

### Option B: Using psql Command Line
```bash
psql "your_connection_string_here" -f restore_acceptable_variations.sql
```

**Expected Output**:
```
NOTICE: Starting restoration for session: 03002cb1-5317-4765-843c-67d547bd16a6
NOTICE: Questions in raw_json: 6
NOTICE: Questions in working_json: 6
NOTICE: Restored variations for Q2 Part 2 answer 1
NOTICE: ✅ Restoration complete!
NOTICE: Total acceptable_variations restored: 1
```

---

## Step 2: Verify in Database (1 minute)

Run this verification query:

```sql
SELECT
  id,
  (working_json->'questions'->1->'parts'->1->'correct_answers'->0->'acceptable_variations') as part_b_answer_1_variations,
  last_synced_at
FROM past_paper_import_sessions
WHERE id = '03002cb1-5317-4765-843c-67d547bd16a6';
```

**Expected Result**:
```
id: 03002cb1-5317-4765-843c-67d547bd16a6
part_b_answer_1_variations: ["conducts heat"]
last_synced_at: [recent timestamp]
```

✅ If you see `["conducts heat"]` → **DATA RESTORED SUCCESSFULLY!**

---

## Step 3: Test in UI (3 minutes)

### 3.1: Load the Review Page
1. Navigate to: **System Admin → Practice Management → Papers Setup**
2. Find your import session: `03002cb1-5317-4765-843c-67d547bd16a6`
3. Click to review questions

### 3.2: Check Console Logs
Open browser DevTools console (F12), you should see:

```javascript
[Review Page] Applying smart merge for acceptable_variations
[Review Page] Smart merge complete: { questionsProcessed: 6 }
```

### 3.3: Verify Question 2, Part b
1. Navigate to Question 2
2. Expand Part b
3. Look at Answer 1
4. **Verify**: "conducts heat" appears in acceptable variations list

✅ If you see "conducts heat" → **UI WORKING CORRECTLY!**

---

## Step 4: Test Auto-Save (2 minutes)

### 4.1: Make a Small Edit
1. Stay on Question 2, Part b
2. Edit the answer text slightly (add a space, then remove it)
3. Wait 2 seconds for auto-save

### 4.2: Check Console for Auto-Save
You should see these logs:

```javascript
[Auto-Save] Starting save process for 6 questions
[Auto-Save] Found questions with acceptable_variations: { count: 1 }
[Auto-Save] working_json ready to save with acceptable_variations
✅ [Auto-Save] Successfully saved 6 questions to working_json
✅ [Auto-Save] Including 1 questions with acceptable_variations
```

✅ If you see these logs → **AUTO-SAVE PRESERVING DATA!**

---

## Step 5: Test Manual Save (2 minutes)

### 5.1: Add a New Variation
1. Still on Question 2, Part b, Answer 1
2. Add a new acceptable variation: "good conductor"
3. Click **Save All** button

### 5.2: Check Console for Manual Save
You should see:

```javascript
[Save] Preserving acceptable_variations in working_json: { count: 1 }
✅ [Save] Successfully saved questions with acceptable_variations preserved
```

### 5.3: Verify in Database Again
Re-run the verification query from Step 2.

**Expected Result**:
```
part_b_answer_1_variations: ["conducts heat", "good conductor"]
```

✅ If you see both variations → **MANUAL SAVE WORKING!**

---

## Step 6: Refresh Test (1 minute)

### 6.1: Refresh the Page
1. Press F5 or refresh the browser
2. Navigate back to Question 2, Part b, Answer 1

### 6.2: Verify Data Persists
- **Check**: "conducts heat" still there?
- **Check**: "good conductor" still there?

✅ If both are still there → **DATA PERSISTING CORRECTLY!**

---

## 🎉 Success Criteria

All of these should be ✅:

- [ ] SQL script ran without errors
- [ ] Database query shows acceptable_variations in working_json
- [ ] UI displays "conducts heat" for Question 2, Part b, Answer 1
- [ ] Console logs show smart merge messages during load
- [ ] Auto-save console logs show preservation messages
- [ ] Manual save console logs show preservation messages
- [ ] Added new variation appears in database
- [ ] Data persists after page refresh

---

## 🚨 If Something Doesn't Work

### Problem: SQL script fails
**Solution**: Check that session ID is correct. Verify session exists:
```sql
SELECT id, status FROM past_paper_import_sessions
WHERE id = '03002cb1-5317-4765-843c-67d547bd16a6';
```

### Problem: No console logs appear
**Solution**:
1. Make sure DevTools console is open
2. Clear console and reload page
3. Check console filter isn't hiding logs

### Problem: Data doesn't persist
**Solution**:
1. Check browser console for error messages
2. Verify auto-save succeeded (look for ✅ messages)
3. Re-run SQL verification query to check database state

### Problem: "conducts heat" still missing
**Solution**:
1. Re-run the SQL restoration script
2. Clear browser cache and reload
3. Check that raw_json has the data:
```sql
SELECT (raw_json->'questions'->1->'parts'->1->'correct_answers'->0->'acceptable_variations')
FROM past_paper_import_sessions
WHERE id = '03002cb1-5317-4765-843c-67d547bd16a6';
```

---

## 📊 Expected Timeline

- **Step 1**: 2 minutes (SQL restoration)
- **Step 2**: 1 minute (Database verification)
- **Step 3**: 3 minutes (UI verification)
- **Step 4**: 2 minutes (Auto-save test)
- **Step 5**: 2 minutes (Manual save test)
- **Step 6**: 1 minute (Refresh test)

**Total Time**: ~11 minutes

---

## 📝 Report Back

After testing, share these results:

1. ✅ or ❌ for each step
2. Any console error messages
3. Database query results
4. Screenshots of Question 2, Part b showing variations (if possible)

---

## 🔄 Rollback (If Needed)

If anything goes wrong, you can rollback to raw_json:

```sql
UPDATE past_paper_import_sessions
SET working_json = raw_json, last_synced_at = NOW()
WHERE id = '03002cb1-5317-4765-843c-67d547bd16a6';
```

This is completely safe - raw_json was never modified.
