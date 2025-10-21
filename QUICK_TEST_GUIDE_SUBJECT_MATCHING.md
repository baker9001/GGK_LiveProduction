# Quick Test Guide - Universal Subject Matching

## How to Test the Fix

### Step 1: Open Browser Console
Before importing the Biology paper, open your browser's Developer Tools (F12) and go to the Console tab.

### Step 2: Import the Paper
1. Go to System Admin → Learning → Practice Management → Papers Setup
2. Click "Upload Paper" or start a new import
3. Upload the Biology paper JSON file: `0610_21_M_J_2016_Biology_Extended_MCQ.json`
4. Proceed through the upload steps

### Step 3: Watch the Console
When you reach the **Structure Tab**, look for these logs:

```
[Subject Match] Input: "Biology - 0610"
[Subject Match] Matched: true
[Subject Match] Found: Biology (0610)
[Subject Match] Confidence: 98%
[Subject Match] Strategy: exact_code
```

### Step 4: Verify in the UI

✅ **SUCCESS Indicators:**
- Biology subject shows **green checkmark** ✓
- Says "Exists" (not "New")
- No "+" button to create it
- Shows database ID in parentheses

❌ **FAILURE Indicators:**
- Biology shows **yellow warning** icon
- Says "New" or "Create"
- Has a "+" button
- Marked as needing creation

---

## Expected Console Output

### For Biology - 0610

```
[GGK] ImportedStructureReview structureTree: {
  "IGCSE": {
    "Cambridge International (CIE)": {
      "Biology - 0610": {
        ...
      }
    }
  }
}

[Subject Match] Input: "Biology - 0610"
[Subject Match] Matched: true
[Subject Match] Found: Biology (0610)
[Subject Match] Confidence: 98%
[Subject Match] Strategy: exact_code
```

### For Other Subjects

Same pattern for Chemistry, Physics, Mathematics, etc.:

```
[Subject Match] Input: "Chemistry - 0620"
[Subject Match] Matched: true
[Subject Match] Found: Chemistry (0620)
[Subject Match] Confidence: 98%
[Subject Match] Strategy: exact_code
```

---

## Test Cases

### Test Case 1: Biology (Primary Test)
**Input:** `"Biology - 0610"`
**Expected:** Match existing Biology (code: 0610)
**Confidence:** ≥ 95%

### Test Case 2: Chemistry
**Input:** `"Chemistry - 0620"`
**Expected:** Match existing Chemistry (code: 0620)
**Confidence:** ≥ 95%

### Test Case 3: Physics
**Input:** `"Physics - 0625"`
**Expected:** Match existing Physics (code: 0625)
**Confidence:** ≥ 95%

### Test Case 4: Mathematics
**Input:** `"Mathematics"` or `"Mathematics - 0580"`
**Expected:** Match existing Mathematics
**Confidence:** ≥ 90%

---

## What Changed

### Before (OLD System)
```typescript
// Simple lookup by normalized name
const m = maps.subjects.get(normalize("Biology - 0610"));
// Result: undefined (no match found)
// ❌ Treats as NEW subject
```

### After (NEW System)
```typescript
// Multi-strategy matching with 10+ fallback methods
const result = matchSubject("Biology - 0610", subjectIndex);
// Result: {
//   matched: true,
//   subjectId: "abc-123",
//   confidence: 0.98,
//   strategy: "exact_code"
// }
// ✅ Correctly identifies existing subject
```

---

## Debug Commands

### Check Database Directly

Open a database query tool and run:

```sql
-- Check existing subjects
SELECT id, name, code, status
FROM edu_subjects
WHERE status = 'active'
ORDER BY name;

-- Check for Biology specifically
SELECT id, name, code
FROM edu_subjects
WHERE name LIKE '%Biology%';

-- Should return something like:
-- id: abc-123-def-456
-- name: Biology
-- code: 0610
```

### Check Match Programmatically

In browser console (after import starts):

```javascript
// This will be available in the console logs
// Look for the subjectMatchingIndex
```

---

## Common Issues and Solutions

### Issue 1: Still Showing as New

**Symptoms:**
- Subject still marked as "New"
- Console shows "Matched: false"

**Solution:**
1. Check if subject exists in database
2. Verify subject code matches
3. Look at "Alternatives" in console log
4. May need to create if truly doesn't exist

### Issue 2: Low Confidence Match

**Symptoms:**
- Match found but confidence < 85%
- Console shows multiple strategies tried

**Solution:**
1. Review the alternatives suggested
2. Check for typos in database
3. May need manual verification
4. Consider updating database entry

### Issue 3: Multiple Alternatives

**Symptoms:**
- Shows several potential matches
- Confidence scores all similar

**Solution:**
1. Use the highest confidence one
2. Check codes to determine correct match
3. Review database for duplicates
4. May indicate database cleanup needed

---

## Verification Checklist

✅ Console logs show `[Subject Match]` messages
✅ Matched: true for Biology - 0610
✅ Confidence score ≥ 95%
✅ Strategy is "exact_code" or "exact_name"
✅ UI shows green checkmark for subject
✅ No duplicate Biology entries in database
✅ Structure tab shows all entities as "Exists"
✅ Can proceed to next tab without errors

---

## Success Metrics

| Metric | Target | Description |
|--------|--------|-------------|
| Match Rate | ≥ 95% | Percentage of subjects correctly matched |
| Avg Confidence | ≥ 90% | Average confidence of successful matches |
| Duplicates Created | 0 | No duplicate subjects should be created |
| False Negatives | 0 | No existing subjects missed |
| Processing Time | < 2s | Time to match all subjects in a paper |

---

## Next Steps After Success

1. ✅ Verify Biology matches correctly
2. ✅ Test with Chemistry paper
3. ✅ Test with Physics paper
4. ✅ Test with other subjects
5. ✅ Monitor for any edge cases
6. ✅ Document any issues found

---

## Quick Commands for Testing

### Test Individual Subject
```typescript
import { matchSubject, buildSubjectIndex } from '@/utils/subjectMatching';

// Assuming subjects array is available
const index = buildSubjectIndex(subjects);
const result = matchSubject("Biology - 0610", index);
console.log(result);
```

### Test Multiple Subjects
```typescript
const testInputs = [
  "Biology - 0610",
  "Chemistry - 0620",
  "Physics - 0625",
  "Mathematics - 0580"
];

testInputs.forEach(input => {
  const result = matchSubject(input, index);
  console.log(`${input}: ${result.matched ? '✅' : '❌'} (${Math.round(result.confidence * 100)}%)`);
});
```

### Get Statistics
```typescript
import { getMatchStatistics } from '@/utils/subjectMatching';

const stats = getMatchStatistics(testInputs, subjects);
console.table(stats);
```

---

## Report Template

If you find any issues, use this template:

```
### Subject Matching Issue

**Subject Input:** "Biology - 0610"
**Expected:** Match existing Biology (0610)
**Actual:** [Describe what happened]

**Console Logs:**
```
[Paste relevant console logs]
```

**Database State:**
```sql
-- Result of checking database
SELECT * FROM edu_subjects WHERE name LIKE '%Biology%';
```

**Match Result:**
- Matched: [true/false]
- Confidence: [X%]
- Strategy: [strategy name]
- Alternatives: [list alternatives if any]

**Screenshot:** [Attach screenshot of Structure Tab]
```

---

## Contact for Issues

If you encounter any problems:
1. Copy all console logs
2. Take screenshot of Structure Tab
3. Note the exact subject that failed
4. Check database for the subject
5. Report with all above information

---

## Summary

The fix is working correctly when:
- ✅ Console shows successful match
- ✅ High confidence score (≥95%)
- ✅ UI shows green checkmark
- ✅ No duplicates created
- ✅ Can proceed through wizard

Test with Biology first, then expand to other subjects. The system is designed to work universally, so success with Biology indicates it will work for all subjects.
