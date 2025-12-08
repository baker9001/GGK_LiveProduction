# Table Completion Data Persistence - Complete Fix

## Issues Fixed

### 1. Infinite Recursion Error (CRITICAL)
**Error**: `infinite recursion detected in policy for relation "table_template_cells_import_review"`

**Root Cause**:
The RLS policy for `table_template_cells_import_review` was querying itself within its own policy check:
```sql
FROM table_template_cells_import_review ttcir
WHERE ttcir.id = table_template_cells_import_review.id
```
This created a circular reference where checking access to a row required checking access to the same row.

**Solution**:
Removed the circular self-reference and accessed the `template_id` directly from the current row:
```sql
-- Migration: fix_table_cells_infinite_recursion_rls
CREATE POLICY "Users can manage review template cells for own sessions"
  ON table_template_cells_import_review FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM table_templates_import_review ttir
      INNER JOIN question_import_review_sessions qirs ON qirs.id = ttir.review_session_id
      INNER JOIN users u ON u.id = qirs.user_id
      WHERE ttir.id = table_template_cells_import_review.template_id
      AND u.auth_user_id = auth.uid()
      AND u.is_active = true
    )
  );
```

### 2. Data Not Loading When Navigating Back
**Issue**: When navigating back to questions during import review, the saved table template data was not being loaded from the database.

**Root Cause**:
The `TableCompletion` component's `useEffect` only triggered data loading when `isTemplateEditor`, `isAdminTestMode`, or `isStudentTestMode` was true. During the import review workflow, none of these flags were set, so the component never attempted to load the saved data.

**Solution**:
Enhanced the loading logic to also trigger when `reviewSessionId` and `questionIdentifier` are provided:

```typescript
// BEFORE: Only loaded for specific modes
const shouldLoadTemplate = isTemplateEditor || isAdminTestMode || isStudentTestMode;

// AFTER: Also loads for review sessions
const shouldLoadTemplate = isTemplateEditor || isAdminTestMode || isStudentTestMode ||
                          (reviewSessionId && questionIdentifier);

// Create unique ID for review sessions
const currentId = reviewSessionId && questionIdentifier
  ? `review-${reviewSessionId}-${questionIdentifier}`
  : `${questionId}-${subQuestionId || 'main'}`;
```

## Data Flow

### Saving Data (Already Working)
1. User edits table template in TableCompletion component
2. Auto-save triggers on changes
3. Data is saved to `table_templates_import_review` and `table_template_cells_import_review` tables
4. Uses `reviewSessionId` and `questionIdentifier` as foreign keys

### Loading Data (NOW WORKING)
1. User navigates to a question during import review
2. `DynamicAnswerField` passes `reviewSessionId` and `questionIdentifier` to `TableCompletion`
3. `TableCompletion` detects review context and triggers `loadExistingTemplate()`
4. `TableTemplateService.loadTemplateUniversal()` is called with review parameters
5. Service checks review tables first using `TableTemplateImportReviewService.loadTemplateForReview()`
6. If found in review tables, data is loaded and displayed
7. If not found, falls back to production tables

## Database Tables

### table_templates_import_review
- Stores table templates during import review phase
- Uses `question_identifier` (string) instead of `question_id` (UUID)
- Linked to `review_session_id` for tracking
- Auto-deleted when review session is cancelled (CASCADE)

### table_template_cells_import_review
- Stores individual cell configurations for review-phase templates
- Each cell has: row_index, col_index, cell_type, locked_value, expected_answer, marks, etc.
- Auto-deleted when parent template is deleted (CASCADE)

## Key Services

### TableTemplateImportReviewService
- `saveTemplateForReview()` - Saves template during review
- `loadTemplateForReview()` - Loads template from review tables
- `migrateTemplatesToProduction()` - Migrates to production when import approved

### TableTemplateService
- `loadTemplateUniversal()` - Universal loader that checks review tables first, then production

## Testing

To verify the fix:

1. **Start Import**: Begin importing a JSON file with table completion questions
2. **Edit Table**: Navigate to a question with table completion and make edits
3. **Verify Save**: Check browser console for success messages from `TableTemplateImportReviewService`
4. **Navigate Away**: Go to another question
5. **Navigate Back**: Return to the edited question
6. **Verify Load**: Table should display with previously saved data
   - Check console for: `[TableCompletion] ✅ Loaded template from REVIEW tables`
   - Table should show saved rows, columns, headers, and cell configurations

## Console Diagnostics

### Successful Save:
```
[TableTemplateImportReviewService] Saving template for review: {reviewSessionId, questionIdentifier, rows, columns}
[TableTemplateImportReviewService] Template saved with ID: <uuid>
[TableTemplateImportReviewService] Inserted <n> cells
[TableTemplateImportReviewService] ✅ Template saved successfully
```

### Successful Load:
```
[TableCompletion] Load decision: {shouldLoadTemplate: true, reviewSessionId, questionIdentifier}
[TableCompletion] 🔄 Loading template from database for: review-<sessionId>-<identifier>
[TableCompletion] 🔍 Loading template with params: {...}
[TableTemplateImportReviewService] Loading template for review: {...}
[TableCompletion] ✅ Loaded template from REVIEW tables: {rows, columns, cellsCount}
```

## Migration Applied

**File**: `supabase/migrations/fix_table_cells_infinite_recursion_rls.sql`

This migration fixes the RLS policy without affecting any existing data.

## Summary

✅ **Saving**: Already working correctly
✅ **Loading**: Now working after fixing infinite recursion and enhancing load logic
✅ **RLS Security**: Fixed circular reference in policy
✅ **Build**: Successful compilation

The table completion feature now properly persists and retrieves data during the import review workflow!
