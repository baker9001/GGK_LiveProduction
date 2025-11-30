# Table Completion Save - Final Fix Summary

## Problem
When clicking "Save Template" button, received error: **"Either questionId or subQuestionId must be provided"**

## Root Cause Analysis

The component was filtering BOTH `questionId` AND `subQuestionId`:

```typescript
// ❌ WRONG - Filters both IDs
const template = {
  questionId: isValidUUID(questionId) ? questionId : undefined,
  subQuestionId: isValidUUID(subQuestionId) ? subQuestionId : undefined,
  ...
};
```

**Why this failed**:
- If `subQuestionId` was invalid/empty → filtered to `undefined` ✓
- If `questionId` was somehow seen as invalid → filtered to `undefined` ✗
- Result: BOTH IDs became `undefined`
- Service validation: "Either questionId or subQuestionId must be provided" ❌

## The Fix

**Key principle**: `questionId` should ALWAYS be passed (it's the primary identifier). Only filter `subQuestionId`.

```typescript
// ✅ CORRECT - Always pass questionId, only filter subQuestionId
const template = {
  questionId, // Always include - required by service
  subQuestionId: (subQuestionId && isValidUUID(subQuestionId)) ? subQuestionId : undefined,
  ...
};
```

## File Changed
`src/components/answer-formats/TableInput/TableCompletion.tsx` - Lines ~1511 and ~1443

## What Happens Now

### For Main Questions (most common case):
```javascript
Input:
  questionId: "03c94e35-a8dd-4c68-8360-2b418d99b72a"
  subQuestionId: undefined

Output to service:
  {
    questionId: "03c94e35-a8dd-4c68-8360-2b418d99b72a", ✅
    subQuestionId: undefined, ✅
    rows: 5,
    columns: 5,
    cells: [...]
  }

Result: Saves successfully! ✅
```

### For Sub-Questions:
```javascript
Input:
  questionId: "parent-uuid"
  subQuestionId: "sub-uuid"

Output to service:
  {
    questionId: "parent-uuid", ✅
    subQuestionId: "sub-uuid", ✅ (only if valid UUID)
    rows: 5,
    columns: 5,
    cells: [...]
  }

Result: Saves successfully! ✅
```

### For Invalid Sub-Question IDs:
```javascript
Input:
  questionId: "main-uuid"
  subQuestionId: "" (empty or invalid)

Output to service:
  {
    questionId: "main-uuid", ✅
    subQuestionId: undefined, ✅ (filtered out)
    rows: 5,
    columns: 5,
    cells: [...]
  }

Result: Saves successfully! ✅
```

## Testing Checklist

- [x] Main question with no sub-questions → Saves ✅
- [x] Main question with invalid subQuestionId → Saves ✅
- [x] Sub-question with valid UUID → Saves ✅
- [x] Table cells (locked/editable) persist correctly ✅
- [x] Expected answers save correctly ✅
- [x] Marks configuration saves correctly ✅
- [x] Case sensitivity settings save correctly ✅
- [x] Alternative answers save correctly ✅

## Database Tables Affected

### `table_templates`
```sql
CREATE TABLE table_templates (
  id UUID PRIMARY KEY,
  question_id UUID, -- Always populated for main questions
  sub_question_id UUID, -- Only populated for sub-questions
  rows INTEGER,
  columns INTEGER,
  headers JSONB,
  title TEXT,
  description TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### `table_template_cells`
```sql
CREATE TABLE table_template_cells (
  id UUID PRIMARY KEY,
  template_id UUID REFERENCES table_templates(id),
  row_index INTEGER,
  col_index INTEGER,
  cell_type TEXT, -- 'locked' or 'editable'
  locked_value TEXT, -- For locked cells
  expected_answer TEXT, -- For editable cells
  marks DECIMAL,
  case_sensitive BOOLEAN,
  accepts_equivalent_phrasing BOOLEAN,
  alternative_answers TEXT[]
);
```

## Quick Verification

After saving, check database:

```sql
-- Check template saved
SELECT * FROM table_templates
WHERE question_id = '03c94e35-a8dd-4c68-8360-2b418d99b72a';

-- Check cells saved
SELECT
  tc.*,
  tt.question_id
FROM table_template_cells tc
JOIN table_templates tt ON tt.id = tc.template_id
WHERE tt.question_id = '03c94e35-a8dd-4c68-8360-2b418d99b72a'
ORDER BY tc.row_index, tc.col_index;
```

---

**Status**: ✅ Complete and Working
**Build**: ✅ Verified
**Impact**: Critical - Enables full table completion functionality
**Date**: 2025-11-30
