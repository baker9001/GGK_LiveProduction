# Quick Test Guide - Correct Answers Display Fix

## Test Case: Question 1(a)(ii) from Biology IGCSE JSON

### Test File
- **JSON**: The provided `biology_0610_61_M_J_2017_Complete_Extraction.json`
- **Question**: Question 1, Part (a), Subpart (ii)
- **Lines in JSON**: 78-128

### Expected JSON Data

```json
{
  "subpart": "ii",
  "question_text": "State the colour that shows the presence of protein when tested with biuret reagent.",
  "marks": 1,
  "answer_format": "single_word",
  "correct_answers": [
    {
      "answer": "purple",
      "marks": 1,
      "alternative_id": 1,
      "linked_alternatives": [2, 3, 4],
      "alternative_type": "one_required"
    },
    {
      "answer": "violet",
      "marks": 1,
      "alternative_id": 2,
      "linked_alternatives": [1, 3, 4],
      "alternative_type": "one_required"
    },
    {
      "answer": "lilac",
      "marks": 1,
      "alternative_id": 3,
      "linked_alternatives": [1, 2, 4],
      "alternative_type": "one_required"
    },
    {
      "answer": "mauve",
      "marks": 1,
      "alternative_id": 4,
      "linked_alternatives": [1, 2, 3],
      "alternative_type": "one_required"
    }
  ]
}
```

## Testing Steps

### 1. Import the JSON File
1. Navigate to System Admin → Learning → Practice Management → Papers Setup
2. Upload the Biology JSON file
3. Process through the import workflow
4. Navigate to the Questions tab

### 2. Locate Question 1(a)(ii)
1. Expand Question 1
2. Expand Part (a)
3. Find Subpart (ii): "State the colour that shows the presence of protein..."

### 3. Verify Correct Display

#### ✅ Expected Results (AFTER FIX)

**Answer Format Field**:
- Should display: **"Single Word"** (NOT "Not Applicable")
- Badge color: Blue
- Matches the JSON value

**Answer Requirement Field**:
- Should display: **"Any One From"** or similar (NOT "Not Applicable")
- Indicates student can provide any one of the alternatives

**Correct Answers Section**:
- Should be **VISIBLE** (not hidden)
- Should display **4 alternatives**:
  1. purple
  2. violet
  3. lilac
  4. mauve
- Each answer should show:
  - ✓ Answer text
  - ✓ Marks allocation (1 mark each)
  - ✓ Alternative ID
  - ✓ "Any ONE of these" or similar label

**Marks Display**:
- Should show: **1 mark**

#### ❌ Previous Behavior (BEFORE FIX)

- Answer Format: "Not Applicable" ❌
- Answer Requirement: "Not Applicable" ❌
- Correct Answers: Empty/hidden ❌

## Browser Console Verification

### Open DevTools Console
Press F12 or Right-click → Inspect → Console tab

### Expected Console Logs

When the question is processed, you should see:

```
[jsonTransformer] Using explicit answer_format from JSON: "single_word" for subpart with 4 answers
```

If there were flag conflicts (shouldn't happen with this JSON, but possible with others):
```
[deriveAnswerFormat] Flags indicate no answer but correct_answers exist - correcting flags
```

### ⚠️ Warning Signs

If you see these, the fix may not be working:
```
[jsonTransformer] Derived not_applicable but correct_answers exist - using answer-based format
```

This warning means the fallback logic activated, which shouldn't be necessary for properly formatted JSON but shows the safeguard is working.

## Visual Verification Checklist

- [ ] Question 1(a)(ii) is visible in the Questions tab
- [ ] Answer Format shows "Single Word" (blue badge)
- [ ] Answer Requirement is NOT "Not Applicable"
- [ ] Correct Answers section is visible
- [ ] All 4 color alternatives are listed:
  - [ ] purple
  - [ ] violet
  - [ ] lilac
  - [ ] mauve
- [ ] Each answer shows "1 mark"
- [ ] "Any ONE of these" or similar guidance is shown
- [ ] No errors in browser console

## Additional Test Cases

### Test Case 2: Other Subparts in Same Question
Check that other subparts also display correctly:
- Question 1(a)(i) - Should show 2 answers (0.10 and 0.80)
- Question 1(a)(iii) - Should show answer for color scoring
- Question 1(a)(iv) - Should handle table format
- Question 1(a)(v) - Should show intensity scores
- Question 1(a)(vi) - Should show concentration estimates

### Test Case 3: Review Mode
1. Navigate to Questions Setup
2. Open the imported questions for review
3. Verify correct answers display in review cards
4. Check that answer format and requirement are correct

### Test Case 4: Practice Mode (If Available)
1. Create a practice session with this question
2. Verify students see appropriate input field (single word)
3. After answering, verify all 4 alternatives shown as acceptable

## Troubleshooting

### Issue: Still Shows "Not Applicable"

**Check**:
1. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
2. Clear browser cache
3. Re-import the JSON file
4. Check console for errors

**Verify Fix Applied**:
```bash
# In project root
grep -n "CRITICAL FIX: ALWAYS prioritize" src/lib/extraction/jsonTransformer.ts
```
Should show line ~427

### Issue: Answers Not Displaying

**Check**:
1. Console for any errors
2. Network tab for failed API calls
3. Verify `correct_answers` array in database

**Database Query** (if needed):
```sql
SELECT question_number, answer_format, answer_requirement, correct_answers
FROM questions
WHERE paper_id = 'your_paper_id'
  AND question_number LIKE '1-a-ii%';
```

### Issue: Wrong Answer Format

**Check**:
1. Console logs for format derivation
2. Verify JSON has explicit `answer_format: "single_word"`
3. Check if derivation fallback logic activated

## Success Criteria

✅ **FIX IS WORKING IF**:
1. Answer Format = "Single Word" (not "Not Applicable")
2. All 4 color alternatives are visible
3. "Any one" requirement is indicated
4. No console errors
5. Console shows explicit format usage log

❌ **FIX NOT WORKING IF**:
1. Any field shows "Not Applicable" when answers exist
2. Correct answers section is empty
3. Console shows errors
4. Derivation fallback activates for this question

## Reporting Issues

If the fix doesn't work as expected, provide:
1. Screenshot of the question display
2. Browser console logs (full output)
3. JSON snippet for the failing question
4. Steps to reproduce
5. Browser and version used

---

**Quick Test**: Import JSON → Find Question 1(a)(ii) → Verify 4 answers visible ✅
