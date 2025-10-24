# Attachment Display Fix - Action Plan

## Executive Summary

The "Failed to load image" errors occur because attachments for question parts (a, b, c, etc.) are NOT being saved to the database during import. The root cause is in how attachments are collected and keyed during the import workflow.

## Root Cause Analysis

### Issue Chain:
1. User uploads PDF and imports questions with JSON
2. User uses PDFSnippingTool to add figures to questions
3. Attachments are added with `dataUrl` (base64 encoded images)
4. **PROBLEM**: Attachments for parts are not properly keyed when passed to `uploadAttachments`
5. `uploadAttachments` uploads files to storage successfully
6. `insertSubQuestion` tries to find attachments by key but finds nothing
7. Result: Sub-questions have NO attachments in database

### Code Flow:
```
QuestionsTab (user adds attachments)
  ↓
handleFinalizeImport (prepares data)
  ↓
uploadAttachments (uploads to storage) ← attachments object needs correct keys
  ↓
insertQuestions (saves to DB)
  ↓
insertSubQuestion (tries to find attachments by key) ← finds nothing!
```

## Solution

### Step 1: Find Attachment Collection Logic

**File**: `src/app/system-admin/learning/practice-management/papers-setup/tabs/QuestionsTab.tsx`

Search for where attachments are collected from the question state before being passed to `uploadAttachments`. Look for:
- PDF snipping tool usage
- Attachment state management
- Where `dataUrl` attachments are stored

### Step 2: Ensure Proper Keying

The attachment object passed to `uploadAttachments` MUST be structured like:

```typescript
const attachments = {
  "question_1": [{ dataUrl: "...", fileName: "..." }], // Main question
  "question_1_p0": [{ dataUrl: "...", fileName: "..." }], // Part (a)
  "question_1_p1": [{ dataUrl: "...", fileName: "..." }], // Part (b)
  "question_1_p0_s0": [{ dataUrl: "...", fileName: "..." }], // Part (a), subpart (i)
};
```

**Key Format**: Use `generateAttachmentKeyForImport(questionId, partIndex, subpartIndex)`

### Step 3: Update Attachment Collection

Modify the code that collects attachments to:

```typescript
// Example pseudo-code
const collectAttachments = (questions) => {
  const attachments = {};

  questions.forEach((question) => {
    const questionId = question.id;

    // Main question attachments
    if (question.attachments?.length > 0) {
      attachments[questionId] = question.attachments;
    }

    // Part attachments
    question.parts?.forEach((part, partIndex) => {
      if (part.attachments?.length > 0) {
        const key = generateAttachmentKeyForImport(questionId, partIndex);
        attachments[key] = part.attachments;
      }

      // Subpart attachments
      part.subparts?.forEach((subpart, subpartIndex) => {
        if (subpart.attachments?.length > 0) {
          const key = generateAttachmentKeyForImport(questionId, partIndex, subpartIndex);
          attachments[key] = subpart.attachments;
        }
      });
    });
  });

  return attachments;
};
```

### Step 4: Verify Upload Process

After fixing the collection logic:

1. Add logging to confirm attachment keys are correct:
   ```typescript
   console.log('[Attachment Collection] Keys:', Object.keys(attachments));
   ```

2. Verify `uploadAttachments` processes all keys:
   ```typescript
   console.log('[Attachment Upload] Uploaded keys:', Object.keys(uploadedAttachments));
   ```

3. Check `insertSubQuestion` finds attachments:
   ```typescript
   console.log('[Attachment Insert] Found', partAttachments.length, 'attachments for', partLabel);
   ```

## Testing Instructions

### Test Case 1: Multi-Part Question with Figures

1. Import a paper JSON with multi-part questions
2. Upload the PDF
3. Use snipping tool to add figure to part (a)
4. Use snipping tool to add figure to part (b)
5. Finalize import
6. Check database:
   ```sql
   SELECT
     qa.id,
     qa.file_url,
     sq.part_label
   FROM questions_attachments qa
   INNER JOIN sub_questions sq ON qa.sub_question_id = sq.id
   LIMIT 10;
   ```
7. Should see attachments linked to sub_questions

### Test Case 2: Nested Subparts

1. Import question with parts (a), (b) each having subparts (i), (ii)
2. Add figures to subparts using snipping tool
3. Verify attachments are keyed as `question_1_p0_s0`, `question_1_p0_s1`, etc.
4. Check database has attachments for all levels

### Test Case 3: Test Simulation Display

1. After import with fixes, start test simulation
2. Navigate to multi-part questions
3. Verify all part figures display without "Failed to load image" errors
4. Check browser console for any `[Attachment]` warnings

## Database Repair (Optional)

For existing questions with misplaced attachments, create a migration:

```sql
-- Identify questions that need fixing
WITH multi_part_questions AS (
  SELECT
    qm.id as question_id,
    qm.question_number,
    COUNT(DISTINCT sq.id) as part_count,
    array_agg(DISTINCT sq.id ORDER BY sq.order_index) as part_ids,
    COUNT(qa.id) as attachment_count
  FROM questions_master_admin qm
  INNER JOIN sub_questions sq ON sq.question_id = qm.id AND sq.parent_id IS NULL
  LEFT JOIN questions_attachments qa ON qa.question_id = qm.id AND qa.sub_question_id IS NULL
  GROUP BY qm.id, qm.question_number
  HAVING COUNT(DISTINCT sq.id) > 0 AND COUNT(qa.id) > 0
)
SELECT * FROM multi_part_questions;

-- Manual review required to determine which attachments belong to which parts
-- Cannot be automated without knowing the original structure
```

## Files Requiring Changes

### Primary File:
- `src/app/system-admin/learning/practice-management/papers-setup/tabs/QuestionsTab.tsx`
  - Find attachment collection logic
  - Add proper keying using `generateAttachmentKeyForImport`
  - Ensure parts and subparts have their attachments collected

### Already Fixed:
- ✅ `src/lib/data-operations/questionsDataOperations.ts` - Enhanced logging

### Reference Files:
- `src/lib/data-operations/questionsDataOperations.ts:uploadAttachments` - Upload function
- `src/lib/data-operations/questionsDataOperations.ts:generateAttachmentKeyForImport` - Key generator
- `src/lib/data-operations/questionsDataOperations.ts:insertSubQuestion` - Attachment insertion

## Success Criteria

✅ Multi-part questions display figures in all parts during test simulation
✅ No "Failed to load image" errors in question review
✅ Database has attachments with `sub_question_id` set correctly
✅ Console shows successful attachment insertion for all parts
✅ Attachment count in DB matches count in imported JSON + snipped figures

## Priority: CRITICAL

This affects the core functionality of the question import and review system. Without correct attachment handling, multi-part questions cannot be properly reviewed or tested.

---

**Next Step**: Locate and fix the attachment collection logic in QuestionsTab.tsx
