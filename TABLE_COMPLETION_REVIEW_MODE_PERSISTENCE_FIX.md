# Table Completion Review Mode Persistence Fix

## Problem Fixed
When navigating back to a question tab in paper setup (review mode), table completion templates were showing empty cells with default headers instead of loading the saved data from `table_templates_import_review` database.

## Root Cause
The component used a `lastLoadedId` ref to prevent redundant loads, which blocked reloading when returning to the same question during tab navigation.

## Solution Implemented

### 1. **Always Reload in Review Mode** (`TableCompletion.tsx`)
- Removed the `lastLoadedId` check that prevented reloading
- Component now always loads fresh data from database when in review mode
- Added better logging to track load attempts

### 2. **Skip Production Tables in Review Mode** (`TableTemplateService.ts`)
- Modified `loadTemplateUniversal()` to load ONLY from review tables when `reviewSessionId` is present
- No fallback to production tables during paper setup
- Returns explicitly when no template found (first-time setup)

### 3. **User Feedback Improvements**
- Shows success toast when template loads: "Template loaded from database"
- Displays info toast when no template exists: "No saved template found"
- Includes cell count in feedback messages

### 4. **Enhanced Logging**
- Logs review session parameters on every mount
- Shows database query source (review vs production)
- Displays loaded template dimensions and cell counts

## Files Modified

1. **src/components/answer-formats/TableInput/TableCompletion.tsx**
   - Lines 279-309: Fixed useEffect loading logic
   - Lines 423-437: Added success feedback
   - Lines 517-526: Added no-template feedback

2. **src/services/TableTemplateService.ts**
   - Lines 480-570: Enhanced loadTemplateUniversal() method

## Testing Guide

### Test 1: Save and Navigate Back
1. Go to Papers Setup → Questions Tab
2. Select a question with table completion answer format
3. Configure the table (set locked/editable cells, add expected answers)
4. Click "Save Template" (or wait for auto-save)
5. Navigate to another question
6. Navigate back to the original question
7. **Expected**: Table should show all previously configured data
8. **Verify**: Toast shows "Template loaded from database"

### Test 2: First-Time Setup
1. Go to Papers Setup → Questions Tab
2. Select a NEW question with table completion format
3. **Expected**: Shows default 5×5 table
4. **Verify**: Toast shows "No saved template found"

### Test 3: Multiple Questions
1. Configure tables for 3 different questions (Q1, Q2, Q3)
2. Navigate: Q1 → Q2 → Q3 → Q1 → Q2
3. **Expected**: Each question loads its own saved template
4. **Verify**: Console shows correct `questionIdentifier` for each load

### Test 4: Auto-Save Verification
1. Configure a table
2. Wait 2 seconds (auto-save interval)
3. **Verify**: Check `table_templates_import_review` table in database
4. Navigate away and back
5. **Expected**: Changes are persisted

## Database Verification

Check saved templates in Supabase:

```sql
-- View all saved templates in review mode
SELECT
  id,
  review_session_id,
  question_identifier,
  rows,
  columns,
  headers,
  created_at,
  updated_at
FROM table_templates_import_review
ORDER BY updated_at DESC;

-- View cells for a specific template
SELECT
  template_id,
  row_index,
  col_index,
  cell_type,
  locked_value,
  expected_answer,
  marks
FROM table_template_cells_import_review
WHERE template_id = 'YOUR_TEMPLATE_ID'
ORDER BY row_index, col_index;
```

## Console Logging

Look for these log messages to verify correct operation:

**On Load:**
```
[TableCompletion] REVIEW SESSION detected - loading from database
[TableTemplateService] Loading from REVIEW TABLES only (paper setup mode)
[TableTemplateImportReviewService] Loading template for review
[TableCompletion] ✅ Loaded template from REVIEW tables
```

**On Save:**
```
[TableCompletion] ✅ Using REVIEW MODE save
[TableTemplateImportReviewService] Saving template for review
[TableCompletion] ✅ Template saved to review database!
```

## Key Behavioral Changes

### Before Fix
- ❌ Returning to same question showed empty table
- ❌ Data appeared lost after navigation
- ❌ No feedback about load status

### After Fix
- ✅ Always loads saved data when returning to question
- ✅ Shows clear feedback about load success/failure
- ✅ Logs all load attempts for debugging
- ✅ Works consistently across all questions in review session

## Important Notes

1. **Review Mode Only**: These changes apply only to paper setup (preview stage)
2. **Production Mode Unchanged**: Questions setup (after import) still uses production tables
3. **Auto-Save**: Template saves automatically every 2 seconds during editing
4. **Manual Save**: Use "Save Template" button for immediate save with confirmation

## Migration Path

When questions are imported from review to production:
- Review templates automatically migrate via `migrate_review_templates_to_production()` function
- Mapping uses `question_identifier` → `question_id` or `sub_question_id`
- After migration, production tables are used instead

## Troubleshooting

**If template doesn't load:**
1. Check console for errors
2. Verify `reviewSessionId` and `questionIdentifier` are passed to component
3. Check database for matching record in `table_templates_import_review`
4. Look for RLS policy errors in console

**If save fails:**
1. Check console for "Cannot save" errors
2. Verify at least one editable cell is configured
3. Check `reviewSessionId` is valid UUID
4. Verify database connection

## Success Criteria

- ✅ Build succeeds without errors
- ✅ Data persists across navigation
- ✅ User sees clear feedback toasts
- ✅ Console shows detailed logging
- ✅ Works for all questions in review session
- ✅ No production table queries in review mode
