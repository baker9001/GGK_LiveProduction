# Table Completion UUID Validation Fix

## Issues Encountered

### Error 1: "Cannot save template for preview question. Please save the question first."
Even though the question ID was a valid UUID (`03c94e35-a8dd-4c68-8360-2b418d99b72a`), the save was failing.

### Error 2 (After first fix): "Either questionId or subQuestionId must be provided"
After filtering both IDs, BOTH became undefined, triggering the service validation error.

## Root Cause
The component was passing BOTH `questionId` AND `subQuestionId` to `TableTemplateService.saveTemplate()`.

**The Problem:**
- If `subQuestionId` was passed as an empty string `""`, null, or any invalid value
- The validation in `TableTemplateService` would fail on line 108:
  ```typescript
  if (template.subQuestionId && !uuidRegex.test(template.subQuestionId)) {
    throw new Error('Cannot save template for preview sub-question...');
  }
  ```

**Why it happened:**
- Component always included both IDs in the template object
- Even if `subQuestionId` was undefined/empty, it was still being passed
- Service validation rejected invalid `subQuestionId` values

## Solution

**Always include `questionId`** (required by service), but **only include `subQuestionId` if it's a valid UUID**.

**File**: `src/components/answer-formats/TableInput/TableCompletion.tsx`

### Changed (2 locations):

**Location 1 - Database Save (line ~1511)**
```typescript
// BEFORE
const template: TableTemplateDTO = {
  questionId,
  subQuestionId,
  rows,
  columns,
  headers,
  ...
};

// AFTER ✅
const template: TableTemplateDTO = {
  questionId, // Always include - required by service
  subQuestionId: (subQuestionId && isValidUUID(subQuestionId)) ? subQuestionId : undefined,
  rows,
  columns,
  headers,
  ...
};
```

**Location 2 - Preview Save (line ~1443)**
```typescript
// BEFORE
const templateData: TableTemplateDTO = {
  questionId,
  subQuestionId,
  rows,
  columns,
  headers,
  ...
};

// AFTER ✅
const templateData: TableTemplateDTO = {
  questionId, // Always include - required by service
  subQuestionId: (subQuestionId && isValidUUID(subQuestionId)) ? subQuestionId : undefined,
  rows,
  columns,
  headers,
  ...
};
```

## Key Insight

The `TableTemplateService.saveTemplate()` requires **at least one** of `questionId` or `subQuestionId`:

```typescript
// Service validation (line 97-98)
if (!template.questionId && !template.subQuestionId) {
  throw new Error('Either questionId or subQuestionId must be provided');
}
```

**The fix**:
- ✅ Always pass `questionId` (don't filter it)
- ✅ Only pass `subQuestionId` if it exists AND is a valid UUID
- ✅ This ensures at least one ID is always provided

## How It Works Now

### UUID Validation
The component uses existing `isValidUUID()` helper:
```typescript
const isValidUUID = (id: string | undefined): boolean => {
  if (!id) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};
```

### Save Flow
1. User clicks "Save Template"
2. Component creates template object:
   - `questionId = "03c94e35-a8dd-4c68-8360-2b418d99b72a"` → Always included ✅
   - `subQuestionId = undefined` (or invalid) → Filtered out ✅
3. Template object created:
   ```javascript
   {
     questionId: "03c94e35-a8dd-4c68-8360-2b418d99b72a", // Always present
     subQuestionId: undefined,  // Only included if valid UUID
     rows: 5,
     columns: 5,
     ...
   }
   ```
4. Service validation passes (questionId is present) ✅
5. Data saves to database ✅

## Test Results

### Before Fix:
- ❌ Error 1: "Cannot save template for preview question. Please save the question first."
- ❌ Error 2: "Either questionId or subQuestionId must be provided"
- ❌ No data in `table_templates`
- ❌ No data in `table_template_cells`

### After Final Fix:
- ✅ Success: "✅ Template saved to database!"
- ✅ Row created in `table_templates` with `question_id`
- ✅ Rows created in `table_template_cells` with all cell data (locked/editable cells, expected answers, marks, etc.)
- ✅ Template loads correctly on page refresh
- ✅ Works for both main questions and sub-questions

## Verification Query

```sql
-- Check if template saved successfully
SELECT
  tt.id,
  tt.question_id,
  tt.sub_question_id,
  tt.rows,
  tt.columns,
  COUNT(tc.id) as cell_count
FROM table_templates tt
LEFT JOIN table_template_cells tc ON tc.template_id = tt.id
WHERE tt.question_id = '03c94e35-a8dd-4c68-8360-2b418d99b72a'
GROUP BY tt.id;
```

## Files Changed
1. `src/components/answer-formats/TableInput/TableCompletion.tsx` - Added UUID validation before passing to service

## Impact
- ✅ Database save now works for main questions
- ✅ Database save works for sub-questions with valid UUIDs
- ✅ Invalid/empty IDs are filtered out automatically
- ✅ No more false "preview question" errors

---

**Status**: ✅ Complete
**Build**: ✅ Verified
**Date**: 2025-11-30
