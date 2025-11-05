# Subpart Data Extraction Fix - Complete Summary

## Issue Identified

**Problem:** Subparts ii and iii in complex questions were losing critical data fields during database insertion, particularly:
- `alternative_type` (e.g., "one_required", "all_required")
- `linked_alternatives` (arrays of related answer IDs)
- `marking_criteria` (specific marking instructions)
- Other advanced marking fields

**Impact:** Only subpart i was working correctly because it used simple independent answers. Subparts ii and iii, which used alternative answer types and linked alternatives, were having these fields silently dropped during insertion.

---

## Root Cause Analysis

### The Data Flow

1. **JSON → jsonTransformer.ts** ✅ Correctly extracted ALL fields
2. **jsonTransformer.ts → questionsDataOperations.ts** ✅ Passed complete objects
3. **questionsDataOperations.ts → Database** ❌ **ONLY inserted 7 fields, dropped the rest!**

### The Bug Location

File: `/src/lib/data-operations/questionsDataOperations.ts`

**Three locations had the same bug:**
1. **Line 1612-1620** - Subpart correct_answers insertion
2. **Line 2457-2465** - Main question correct_answers insertion
3. **Line 3451-3459** - Updating existing correct_answers

### What Was Wrong

The mapping only included 7 fields:
```typescript
// BEFORE (BROKEN)
const correctAnswersToInsert = part.correct_answers.map((ca: any) => ({
  sub_question_id: subQuestionRecord.id,
  answer: ensureString(ca.answer),
  marks: ca.marks || null,
  alternative_id: ca.alternative_id || null,
  context_type: ca.context?.type || null,
  context_value: ca.context?.value || null,
  context_label: ca.context?.label || null
  // ❌ Missing: alternative_type, linked_alternatives, marking_criteria, etc.
}));
```

---

## Solutions Implemented

### 1. Database Migration Created

**File:** `supabase/migrations/[timestamp]_add_missing_correct_answers_fields.sql`

**Columns Added:**
- `alternative_type` (text) - Type of alternative ('one_required', 'all_required', etc.)
- `linked_alternatives` (jsonb) - Array of linked alternative_ids
- `marking_criteria` (text) - Specific marking instructions
- `working` (text) - Calculation steps/working
- `accepts_equivalent_phrasing` (boolean) - Allow equivalent phrasing
- `accepts_reverse_argument` (boolean) - Allow reverse arguments
- `error_carried_forward` (boolean) - ECF marking applies
- `acceptable_variations` (jsonb) - Array of acceptable variations
- `unit` (text) - Unit for numerical answers

**Indexes Added:**
- Index on `alternative_type` for filtering
- GIN indexes on `linked_alternatives` and `acceptable_variations` for JSONB queries

### 2. Code Fixed in questionsDataOperations.ts

Updated all three insertion locations to include complete field mapping:

```typescript
// AFTER (FIXED)
const correctAnswersToInsert = part.correct_answers.map((ca: any) => ({
  sub_question_id: subQuestionRecord.id,
  answer: ensureString(ca.answer),
  marks: ca.marks || null,
  alternative_id: ca.alternative_id || null,
  alternative_type: ca.alternative_type || 'standalone',               // ✅ ADDED
  linked_alternatives: Array.isArray(ca.linked_alternatives) ? ca.linked_alternatives : [], // ✅ ADDED
  marking_criteria: ca.marking_criteria || null,                      // ✅ ADDED
  working: ca.working || null,                                        // ✅ ADDED
  accepts_equivalent_phrasing: ca.accepts_equivalent_phrasing || false, // ✅ ADDED
  accepts_reverse_argument: ca.accepts_reverse_argument || false,     // ✅ ADDED
  error_carried_forward: ca.error_carried_forward || false,           // ✅ ADDED
  acceptable_variations: Array.isArray(ca.acceptable_variations) ? ca.acceptable_variations : [], // ✅ ADDED
  unit: ca.unit || null,                                              // ✅ ADDED
  context_type: ca.context?.type || null,
  context_value: ca.context?.value || null,
  context_label: ca.context?.label || null
}));
```

---

## Verification for Your JSON

### Question 1, Part a - Expected Results

#### Subpart i (2 answers)
```json
[
  {
    "answer": "0.10",
    "marks": 1,
    "alternative_id": 1,
    "alternative_type": "standalone",
    "working": "(0.50 / 5.00) × 1% = 0.10%"
  },
  {
    "answer": "0.80",
    "marks": 1,
    "alternative_id": 2,
    "alternative_type": "standalone",
    "working": "(4.00 / 5.00) × 1% = 0.80%"
  }
]
```
✅ **Will work** - Uses standalone answers

#### Subpart ii (4 alternative answers)
```json
[
  {
    "answer": "purple",
    "marks": 1,
    "alternative_id": 1,
    "alternative_type": "one_required",           // ✅ NOW SAVED
    "linked_alternatives": [2, 3, 4]              // ✅ NOW SAVED
  },
  {
    "answer": "violet",
    "marks": 1,
    "alternative_id": 2,
    "alternative_type": "one_required",           // ✅ NOW SAVED
    "linked_alternatives": [1, 3, 4]              // ✅ NOW SAVED
  },
  // ... lilac and mauve with same pattern
]
```
✅ **Now works** - alternative_type and linked_alternatives are preserved

#### Subpart iii (1 complex answer)
```json
[
  {
    "answer": "1 = +, 2 and 3 = ++, 4 = +++, 5 and 6 = ++++",
    "marks": 1,
    "alternative_id": 1,
    "alternative_type": "standalone",
    "marking_criteria": "Award 1 mark for showing correct sequence..."  // ✅ NOW SAVED
  }
]
```
✅ **Now works** - marking_criteria is preserved

---

## Testing Instructions

### 1. Re-import Your JSON

After these fixes, when you import your JSON file:

```bash
# Your import should now capture all fields
# Check the database after import
```

### 2. Verify Database Content

Run this SQL to verify the fix worked:

```sql
-- Check subpart ii answers (should show alternative_type and linked_alternatives)
SELECT
  sq.question_text,
  qa.answer,
  qa.alternative_id,
  qa.alternative_type,
  qa.linked_alternatives,
  qa.marking_criteria
FROM sub_questions sq
JOIN question_correct_answers qa ON qa.sub_question_id = sq.id
WHERE sq.question_text LIKE '%colour that shows the presence of protein%'
ORDER BY qa.alternative_id;
```

**Expected Result:**
- 4 rows returned
- `alternative_type` = 'one_required' for all 4
- `linked_alternatives` = [2,3,4], [1,3,4], [1,2,4], [1,2,3] respectively
- All answer values: 'purple', 'violet', 'lilac', 'mauve'

### 3. Check UI Display

The UI should now properly show:
- "Any ONE of these:" label for subpart ii answers
- All 4 alternative color options displayed
- Marking criteria visible for subpart iii
- Working shown for calculation questions in subpart i

---

## Technical Details

### Why Subpart i Worked But ii and iii Failed

| Subpart | Answer Type | Uses alternative_type? | Uses linked_alternatives? | Result Before Fix |
|---------|-------------|------------------------|---------------------------|-------------------|
| **i** | Independent | No | No | ✅ **Worked** - didn't need missing fields |
| **ii** | Alternatives | Yes ("one_required") | Yes ([2,3,4]) | ❌ **Failed** - fields were dropped |
| **iii** | Complex single | No | No | ⚠️ **Partial** - marking_criteria dropped |

### Data Loss Prevention

The fix ensures:
1. **No silent data loss** - All JSON fields are now captured
2. **Proper relationship tracking** - Linked alternatives maintain connections
3. **Complete marking schemes** - All marking instructions preserved
4. **ECF support** - Error carried forward flags saved
5. **Variation handling** - Acceptable answer variations stored

---

## Files Modified

1. ✅ **Database Schema** - New migration created
2. ✅ **questionsDataOperations.ts** - 3 locations fixed (lines 1612, 2457, 3451)
3. ✅ **No changes needed** - jsonTransformer.ts was already correct

---

## Next Steps

1. **Re-import your JSON** - The data will now be captured completely
2. **Test the UI** - Verify that subpart ii shows "Any ONE of these" with all 4 colors
3. **Check marking** - Verify auto-marking works with alternative answers
4. **Monitor logs** - Check console for successful insertion of all fields

---

## Success Criteria

✅ All fields from JSON are inserted into database
✅ Subpart ii shows 4 alternative answers with "one_required" type
✅ Linked alternatives array is preserved in database
✅ Marking criteria and working are saved
✅ No data loss during import process
✅ UI correctly displays alternative answer groups

---

## Prevention

To prevent similar issues in the future:

1. **Always match TypeScript interfaces with database insertion code**
2. **Use database column comments to document field purposes**
3. **Add unit tests for complex answer structures**
4. **Log field counts before/after transformation**
5. **Validate imported data completeness**

---

## Questions Answered

**Q: Why did only the first subpart work?**
A: It used simple standalone answers that didn't require the missing fields.

**Q: Where exactly was data being lost?**
A: During database insertion - the mapping only included 7 of 16+ fields.

**Q: Why didn't we see errors?**
A: Fields were silently dropped (not in the INSERT mapping), so no errors occurred.

**Q: Is the JSON extraction correct?**
A: Yes, jsonTransformer.ts was extracting everything correctly.

**Q: What about existing imported data?**
A: You'll need to re-import to capture the missing fields.

---

## Completion Status

- ✅ Root cause identified
- ✅ Database schema updated with new columns
- ✅ Code fixed in all 3 locations
- ✅ Indexes added for performance
- ✅ Documentation complete
- ⏳ Awaiting re-import and verification

**Status: READY FOR TESTING**

Last Updated: 2025-11-05
