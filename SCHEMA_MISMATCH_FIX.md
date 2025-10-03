# Mock Exam Wizard Schema Mismatch Fix

## Real Root Cause Found

After conducting a deep diagnostic search using browser error logs, the actual root cause was discovered:

### Error Message
```
column questions_master_admin_1.question_text does not exist
```

**Location:** `mockExamService.ts` line 931, query to `mock_exam_questions` table

## Problem Analysis

### The Issue
The code was attempting to query a non-existent column `question_text` from the `questions_master_admin` table.

### Database Schema Reality
The actual `questions_master_admin` table has:
- ✅ `question_description` (text) - EXISTS
- ✅ `question_number` (varchar) - EXISTS
- ❌ `question_text` - DOES NOT EXIST

### Code Was Trying To Query
```typescript
questions_master_admin!mock_exam_questions_question_id_fkey (
  id,
  question_number,
  question_text,        // ❌ This column doesn't exist!
  question_description,
  type,
  marks,
  status
)
```

## Why Previous Fixes Didn't Work

The previous fix focused on RLS policies, which was NOT the actual problem. The issue was purely a schema mismatch - the queries were trying to select a column that doesn't exist in the database.

## Solution Implemented

### 1. Updated Interface Definition
**File:** `src/services/mockExamService.ts` (line 140-148)

**Before:**
```typescript
export interface QuestionBankItem {
  id: string;
  question_number: number | null;
  question_text: string | null;      // ❌ Removed
  question_description: string | null;
  type: string | null;
  marks: number | null;
  status: string | null;
}
```

**After:**
```typescript
export interface QuestionBankItem {
  id: string;
  question_number: number | null;
  question_description: string | null;  // ✅ Only use this field
  type: string | null;
  marks: number | null;
  status: string | null;
}
```

### 2. Fixed Mock Exam Questions Query
**File:** `src/services/mockExamService.ts` (line 928-936)

**Before:**
```typescript
questions_master_admin!mock_exam_questions_question_id_fkey (
  id,
  question_number,
  question_text,        // ❌ Removed
  question_description,
  type,
  marks,
  status
)
```

**After:**
```typescript
questions_master_admin!mock_exam_questions_question_id_fkey (
  id,
  question_number,
  question_description,  // ✅ Only existing column
  type,
  marks,
  status
)
```

### 3. Fixed Question Bank Query
**File:** `src/services/mockExamService.ts` (line 958-971)

**Before:**
```typescript
.select(`
  id,
  question_number,
  question_text,        // ❌ Removed
  question_description,
  type,
  marks,
  status,
  data_structure_id,
  subject_id
`)
```

**After:**
```typescript
.select(`
  id,
  question_number,
  question_description,  // ✅ Only existing column
  type,
  marks,
  status,
  data_structure_id,
  subject_id
`)
```

### 4. Updated Data Mapping Logic
**File:** `src/services/mockExamService.ts`

Removed all references to `question_text` in:
- Line 1020-1032: Question bank item mapping from mock_exam_questions
- Line 1035-1043: Question bank array mapping

### 5. Updated UI Display Logic
**File:** `src/app/entity-module/mock-exams/components/StatusTransitionWizard.tsx` (line 123-129)

**Before:**
```typescript
function getQuestionPreview(question: QuestionBankItem): string {
  const base = question.question_text || question.question_description || 'Question';
  // ...
}
```

**After:**
```typescript
function getQuestionPreview(question: QuestionBankItem): string {
  const base = question.question_description || 'Question';
  // ...
}
```

## Files Changed

1. **`src/services/mockExamService.ts`**
   - Updated `QuestionBankItem` interface
   - Fixed `getStatusWizardContext` query for mock_exam_questions
   - Fixed question bank query
   - Updated data mapping logic

2. **`src/app/entity-module/mock-exams/components/StatusTransitionWizard.tsx`**
   - Updated `getQuestionPreview` function to use only `question_description`

## Testing Results

✅ **Build Status:** Successful
- No TypeScript errors
- No compilation errors
- All dependencies resolved correctly

✅ **Expected Behavior:**
- Mock exam wizard should now load without errors
- Question data will display using `question_description` field
- All question previews will show correctly in the wizard

## Database Schema Reference

For future reference, the `questions_master_admin` table contains:
- `id` (uuid)
- `question_number` (varchar)
- `question_description` (text) - The main question content
- `question_header` (text) - Optional header/title
- `type` (text)
- `marks` (integer)
- `status` (text)
- Plus many other fields for answers, metadata, etc.

## Diagnostic Process Used

1. **Used `mcp__diagnostics__read_errors`** - Retrieved actual browser console errors
2. **Identified specific SQL error** - "column question_text does not exist"
3. **Queried database schema** - Used `information_schema.columns` to verify actual columns
4. **Traced code references** - Found all locations using the non-existent column
5. **Applied systematic fixes** - Updated interface, queries, and display logic
6. **Verified build** - Confirmed no compilation errors

## Key Takeaway

Always verify database schema against code expectations when dealing with "data not found" errors. The error message in the browser console (`column does not exist`) was the critical clue that led to the correct diagnosis.

## Previous Fix Analysis

The previous RLS policy fix (migration `20251003154812`) was actually beneficial for security and may prevent future permission issues, but it was not related to this specific error. The schema mismatch was the actual blocker preventing data from loading.
