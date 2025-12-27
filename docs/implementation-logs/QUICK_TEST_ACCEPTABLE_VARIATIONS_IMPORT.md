# Quick Test Guide - Acceptable Variations Import Fix

**Purpose**: Verify that acceptable_variations are now being imported correctly from JSON files to the database and displayed in the UI.

---

## Quick Test Steps

### Step 1: Upload JSON File ⏱️ 2 min
1. Navigate to **System Admin** → **Learning** → **Practice Management** → **Papers Setup**
2. Click **Upload New Paper**
3. Upload: `JSON/Sample_0610_21_M_J_2016_Biology_Extended_MCQ.json`
4. Fill in the metadata

### Step 2: Check Questions Tab ⏱️ 3 min
1. Go to the **Questions** tab
2. Expand a few questions
3. Look for the **"Acceptable Variations"** section in answer fields
4. **Open Browser Console** (F12)
5. Search for log entries containing "acceptable_variations"

**Expected Console Output:**
```
[processAnswers] Preserved acceptable_variations for answer: {
  answer: "chloroplast",
  variations: ["chloroplasts", "Chloroplast"]
}
```

### Step 3: Import Questions ⏱️ 2 min
1. Click **"Finalize & Import Questions"**
2. Wait for import to complete
3. Check console for import confirmation
4. Note the number of questions imported

### Step 4: Verify in Questions Setup ⏱️ 3 min
1. Navigate to **Questions Setup** page
2. Filter by the paper you just imported
3. Click on a question to view details
4. Check the **correct answers section**
5. Verify acceptable variations are displayed

---

## What to Look For

### ✅ Success Indicators

1. **In Questions Tab Review:**
   - Acceptable variations field populated with data from JSON
   - Console shows preserved acceptable_variations arrays
   - UI displays the variations for each answer

2. **After Import:**
   - Console shows import completed successfully
   - No errors about missing fields
   - Questions appear in Questions Setup

3. **In Questions Setup:**
   - Acceptable variations displayed in answer cards
   - Variations match the JSON file data
   - Can add/edit/delete variations

### ❌ Failure Indicators

1. **Empty Fields:**
   - Acceptable variations fields are blank/empty
   - Console shows: `acceptable_variations: undefined` or `acceptable_variations: []`

2. **Import Errors:**
   - Console shows errors during import
   - Questions don't appear in Questions Setup
   - Data loss warnings in console

---

## Sample Test Data

The Biology sample file contains questions with acceptable variations:

**Question 1 - Answer alternatives:**
```json
{
  "answer": "chloroplast",
  "acceptable_variations": ["chloroplasts", "Chloroplast", "CHLOROPLAST"]
}
```

**Question 3(a) - Part answer:**
```json
{
  "answer": "rubidium melts",
  "acceptable_variations": ["melts", "melting of rubidium"]
}
```

**Question 5(a)(ii) - Subpart answer:**
```json
{
  "answer": "explosion",
  "acceptable_variations": ["explode", "explodes", "rapid reaction"]
}
```

---

## Database Verification (Optional)

If you have database access, run this query:

```sql
-- Check imported questions have acceptable_variations
SELECT
  q.question_number,
  qa.answer,
  qa.acceptable_variations,
  jsonb_array_length(qa.acceptable_variations) as variation_count
FROM questions_master_admin q
JOIN question_correct_answers qa ON q.id = qa.question_id
WHERE q.paper_code LIKE '%0610_21_M_J_2016%'
AND qa.acceptable_variations IS NOT NULL
AND qa.acceptable_variations != '[]'::jsonb
ORDER BY q.question_number;
```

**Expected Result:**
- Multiple rows returned
- variation_count > 0
- acceptable_variations contains arrays of strings

---

## Troubleshooting

### Issue: Empty Acceptable Variations Fields

**Diagnosis:**
1. Check console for `processAnswers` logs
2. Verify JSON file has acceptable_variations in the correct format
3. Check if import completed without errors

**Solution:**
- The fix has been applied to lines 3291, 3360, and 3408
- Clear browser cache and refresh
- Re-upload the JSON file

### Issue: Import Fails

**Diagnosis:**
1. Check console for detailed error messages
2. Verify database connection
3. Check RLS policies on question tables

**Solution:**
- Review error logs
- Ensure user has proper permissions
- Contact system administrator

---

## Success Criteria

✅ All tests pass when:

1. **JSON Upload**: Acceptable variations extracted from JSON ✓
2. **Questions Tab**: Variations visible in review UI ✓
3. **Console Logs**: Shows preserved variations ✓
4. **Import Process**: Completes without errors ✓
5. **Questions Setup**: Variations displayed correctly ✓
6. **Database**: Data saved in question_correct_answers table ✓

---

## Time Estimate

**Total Testing Time**: ~10 minutes
- Upload and review: 5 minutes
- Import and verify: 3 minutes
- Database check (optional): 2 minutes

---

## Next Steps After Testing

Once verified:
- ✅ Mark this fix as complete
- ✅ Test with other JSON samples
- ✅ Train users on the acceptable variations feature
- ✅ Update user documentation

---

## Related Files

- Fix Applied: `src/app/system-admin/learning/practice-management/papers-setup/tabs/QuestionsTab.tsx`
- Test Sample: `JSON/Sample_0610_21_M_J_2016_Biology_Extended_MCQ.json`
- Documentation: `docs/implementation-logs/ACCEPTABLE_VARIATIONS_IMPORT_FIX_COMPLETE.md`
