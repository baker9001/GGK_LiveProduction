# Subpart Data Extraction Fix - Quick Reference

## ✅ COMPLETED SUCCESSFULLY

All fixes have been applied to resolve the missing data issue in subparts ii and iii.

---

## What Was Fixed

### Problem
Subparts ii and iii were losing critical fields during database insertion:
- `alternative_type` (e.g., "one_required")
- `linked_alternatives` (arrays like [2, 3, 4])
- `marking_criteria`, `working`, and other marking fields

### Solution
1. ✅ Added 9 new columns to `question_correct_answers` table
2. ✅ Updated 3 locations in code to map all fields
3. ✅ Created indexes for performance

---

## Verification

### Database Columns Added
All 9 columns confirmed in database:
- `alternative_type` (text, default: 'standalone')
- `linked_alternatives` (jsonb, default: [])
- `marking_criteria` (text)
- `working` (text)
- `accepts_equivalent_phrasing` (boolean, default: false)
- `accepts_reverse_argument` (boolean, default: false)
- `error_carried_forward` (boolean, default: false)
- `acceptable_variations` (jsonb, default: [])
- `unit` (text)

### Code Locations Fixed
✅ Line 1612 - Subpart insertion
✅ Line 2457 - Main question insertion
✅ Line 3451 - Update existing answers

---

## How to Test

### 1. Re-import Your JSON
```bash
# Import your biology_0610_61_M_J_2017_Complete_Extraction.json
# All fields will now be captured
```

### 2. Verify Subpart ii (4 Alternative Colors)
Run this SQL:
```sql
SELECT
  sq.question_text,
  qa.answer,
  qa.alternative_type,
  qa.linked_alternatives
FROM sub_questions sq
JOIN question_correct_answers qa ON qa.sub_question_id = sq.id
WHERE sq.question_text LIKE '%colour that shows%'
ORDER BY qa.alternative_id;
```

**Expected:**
- 4 rows: 'purple', 'violet', 'lilac', 'mauve'
- `alternative_type` = 'one_required' for all
- `linked_alternatives` populated with arrays

### 3. Check UI
The UI should now show:
- ✅ "Any ONE of these:" label
- ✅ All 4 color options displayed
- ✅ Proper grouping of alternatives

---

## Before vs After

### BEFORE (Broken)
```typescript
{
  answer: "purple",
  marks: 1,
  alternative_id: 1,
  // ❌ alternative_type: DROPPED
  // ❌ linked_alternatives: DROPPED
}
```

### AFTER (Fixed)
```typescript
{
  answer: "purple",
  marks: 1,
  alternative_id: 1,
  alternative_type: "one_required",        // ✅ SAVED
  linked_alternatives: [2, 3, 4],         // ✅ SAVED
  marking_criteria: "...",                // ✅ SAVED
}
```

---

## Why It Works Now

| Field | Before | After |
|-------|--------|-------|
| `alternative_type` | ❌ Dropped | ✅ Saved to DB |
| `linked_alternatives` | ❌ Dropped | ✅ Saved to DB |
| `marking_criteria` | ❌ Dropped | ✅ Saved to DB |
| `working` | ❌ Dropped | ✅ Saved to DB |
| ECF flags | ❌ Dropped | ✅ Saved to DB |

---

## Summary

**Root Cause:** Database insertion only mapped 7 fields, ignoring 9+ others
**Fix Applied:** Added columns + updated insertion code
**Status:** ✅ READY FOR TESTING
**Action Required:** Re-import your JSON to capture complete data

---

## Support Queries

### Count answers per subpart
```sql
SELECT
  sq.question_text,
  COUNT(qa.id) as answer_count,
  qa.alternative_type
FROM sub_questions sq
JOIN question_correct_answers qa ON qa.sub_question_id = sq.id
WHERE sq.question_number LIKE '%1%'
GROUP BY sq.question_text, qa.alternative_type;
```

### View all alternative types
```sql
SELECT DISTINCT alternative_type, COUNT(*) as count
FROM question_correct_answers
GROUP BY alternative_type;
```

---

**Last Updated:** 2025-11-05
**Status:** FIX COMPLETE - Ready for Testing
