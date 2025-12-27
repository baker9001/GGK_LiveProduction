# Attachment Display Fix - Complete Summary

## Problem Diagnosed

The "Failed to load image" errors in test simulation and question review are caused by:

1. **Root Cause**: Attachments for sub-questions (parts a, b, c, etc.) are **NOT being saved to the database** during import
2. **Evidence**: Database query shows 55 total attachments, but ALL have `sub_question_id = NULL`, meaning they're only linked to main questions
3. **Impact**: Multi-part questions with figures in their parts show "Failed to load image" because the attachments simply don't exist in the database

## Database Analysis Results

```sql
-- Total attachments: 55
-- Attachments with sub_question_id: 0
-- Attachments with question_id only: 55
```

This confirms that the upload process is working (URLs are valid), but the attachment mapping for sub-questions is failing during import.

## Root Cause in Code

File: `src/lib/data-operations/questionsDataOperations.ts`

The `insertSubQuestion` function (lines 1635-1687) attempts to find attachments for parts using keys like:
- `{questionId}_p{partIndex}`
- `{questionId}_p{partIndex}_s{subpartIndex}`

However, the `uploadedAttachments` object passed to this function likely doesn't have attachments properly keyed for sub-questions, causing them to be skipped.

## Fixes Implemented

### 1. Enhanced Logging in `insertSubQuestion` (✅ DONE)

Added comprehensive logging to track:
- Which attachments are found for each sub-question
- What keys are being searched
- Whether attachments are successfully inserted
- Validation failures (empty URLs, etc.)

**Location**: `src/lib/data-operations/questionsDataOperations.ts:1671-1687`

### 2. Attachment Validation

- Filter out attachments with empty `file_url`
- Trim whitespace from URLs
- Log warnings for skipped attachments
- Return inserted attachment count for verification

## Next Steps Required

### Critical: Fix the Import Workflow

The issue is upstream in the import process. You need to:

1. **Review the JSON transformer** (`src/lib/extraction/jsonTransformer.ts`)
   - Ensure attachments from parts/subparts are properly extracted
   - Verify attachment keys match what `insertSubQuestion` expects

2. **Check the upload function** (`src/lib/data-operations/questionsDataOperations.ts:uploadAttachments`)
   - Verify it processes part/subpart attachments
   - Ensure keys are generated using `generateAttachmentKeyForImport`

3. **Test the import flow**:
   ```javascript
   // Expected structure after upload:
   uploadedAttachments = {
     "q1": [...], // Main question attachments
     "q1_p0": [...], // Part (a) attachments
     "q1_p1": [...], // Part (b) attachments
     "q1_p0_s0": [...] // Part (a) subpart (i) attachments
   }
   ```

### Recommended: Create a Data Repair Migration

Since existing questions have missing sub-question attachments, create a migration to:

1. Identify questions where attachments should be on sub-questions
2. Move attachments from main questions to appropriate sub-questions
3. Update `question_id` and `sub_question_id` foreign keys

Example SQL:
```sql
-- Find multi-part questions with attachments on main question
SELECT
  qm.id,
  qm.question_number,
  COUNT(sq.id) as part_count,
  COUNT(qa.id) as attachment_count
FROM questions_master_admin qm
INNER JOIN sub_questions sq ON sq.question_id = qm.id
INNER JOIN questions_attachments qa ON qa.question_id = qm.id AND qa.sub_question_id IS NULL
GROUP BY qm.id, qm.question_number
HAVING COUNT(sq.id) > 0 AND COUNT(qa.id) > 0;
```

## Testing Checklist

After fixing the import flow:

- [ ] Import a multi-part question with figures in parts (a), (b), (c)
- [ ] Verify attachments are saved with correct `sub_question_id` values
- [ ] Check test simulation displays all part attachments correctly
- [ ] Verify question review workflow shows attachments
- [ ] Confirm no "Failed to load image" errors appear
- [ ] Test with nested subparts (i, ii, iii under parts a, b)

## Files Modified

1. ✅ `/src/lib/data-operations/questionsDataOperations.ts` - Enhanced attachment insertion with validation and logging

## Files Requiring Investigation

1. ⚠️ `/src/lib/extraction/jsonTransformer.ts` - Check attachment extraction from JSON
2. ⚠️ `/src/lib/data-operations/questionsDataOperations.ts:uploadAttachments` - Verify upload keying logic
3. ⚠️ Import workflow in papers-setup - Ensure attachments are uploaded before insertion

## Key Insight

The system architecture is correct:
- ✅ Database schema supports attachments for both questions and sub_questions
- ✅ Storage bucket is configured and public
- ✅ URLs are valid and accessible
- ✅ Frontend components expect and can display attachments

**The problem is purely in the import data pipeline** - attachments are being uploaded to storage successfully, but are not being linked to sub_questions in the database during the import process.

## Immediate Action Required

1. Run a test import with logging enabled
2. Watch the console for `[Attachment]` log messages
3. Identify where attachment keys are missing or mismatched
4. Fix the key generation in the upload or JSON transformation stage
5. Re-import test questions to verify fix

---

**Status**: Diagnosis Complete, Fix Partially Implemented
**Priority**: HIGH - Affects core question display functionality
**Next Owner**: Developer implementing import workflow fixes
