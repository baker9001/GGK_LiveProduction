# Table Completion Load Feature - Quick Test Guide

## What Was Fixed

1. **Infinite Recursion Error** - Fixed circular RLS policy reference
2. **Data Loading** - Now properly loads saved table data when navigating back to questions

## How to Test

### Step 1: Start Import Review
1. Go to **System Admin > Learning > Practice Management > Papers Setup**
2. Click **"Start New Import"** or continue an existing review session
3. Upload and process a JSON file with table completion questions

### Step 2: Edit Table Template
1. Navigate to the **Questions** tab
2. Find a question with **Table Completion** answer format
3. The table editor should appear
4. Make some changes:
   - Add/remove rows or columns
   - Edit column headers
   - Mark some cells as "locked" with values
   - Mark some cells as "editable" with expected answers
5. The data should auto-save (watch console for save messages)

### Step 3: Navigate Away
1. Click on a **different question** in the list
2. The current table should disappear
3. The new question should load

### Step 4: Navigate Back (THE KEY TEST)
1. Click back on the **original table completion question**
2. **Expected Result**: The table should load with ALL your previous edits:
   - Same number of rows and columns
   - Same column headers
   - Same locked cells with values
   - Same editable cells with expected answers
   - Same cell configurations (marks, case sensitivity, etc.)

## What to Look For

### In Browser Console

**Successful Save:**
```
[TableTemplateImportReviewService] Saving template for review
[TableTemplateImportReviewService] ✅ Template saved successfully
```

**Successful Load:**
```
[TableCompletion] Load decision: {shouldLoadTemplate: true, ...}
[TableCompletion] 🔄 Loading template from database
[TableCompletion] ✅ Loaded template from REVIEW tables: {rows: 5, columns: 5, cellsCount: 25}
```

### In UI

**Before Fix:**
- Navigating back would show default empty 5x5 table
- All previous edits would be lost
- Would see infinite recursion error in console

**After Fix:**
- Navigating back shows your edited table
- All configurations preserved
- No errors in console

## Database Verification

You can also verify the data is being saved by checking the database directly:

```sql
-- Check saved templates
SELECT
  id,
  question_identifier,
  rows,
  columns,
  headers,
  created_at,
  updated_at
FROM table_templates_import_review
WHERE review_session_id = '<your-session-id>'
ORDER BY updated_at DESC;

-- Check saved cells
SELECT
  ttir.question_identifier,
  ttcir.row_index,
  ttcir.col_index,
  ttcir.cell_type,
  ttcir.locked_value,
  ttcir.expected_answer,
  ttcir.marks
FROM table_template_cells_import_review ttcir
INNER JOIN table_templates_import_review ttir ON ttir.id = ttcir.template_id
WHERE ttir.review_session_id = '<your-session-id>'
ORDER BY ttir.question_identifier, ttcir.row_index, ttcir.col_index;
```

## Troubleshooting

### If Data Doesn't Load:

1. **Check Console Logs**:
   - Look for `[TableCompletion] Load decision`
   - Verify `shouldLoadTemplate: true`
   - Verify `reviewSessionId` and `questionIdentifier` are present

2. **Check Database**:
   - Run the SQL queries above
   - Verify data exists in `table_templates_import_review`

3. **Check RLS Policies**:
   - Ensure you're logged in as a user with proper permissions
   - System admins should have full access

### If You See Errors:

- **"infinite recursion detected"**: The RLS fix migration may not have been applied
- **"No template found"**: The data may not have been saved initially
- **RLS violations**: Check user permissions and authentication

## Success Criteria

✅ Data saves automatically when editing table template
✅ Data loads correctly when navigating back to question
✅ All table configurations are preserved (rows, columns, headers, cells)
✅ No infinite recursion errors
✅ No RLS policy violations
✅ Console shows successful save and load messages

## Next Steps

After testing, you can:
1. Continue editing other questions in the import review
2. Approve the import to migrate templates to production tables
3. Cancel the import to clean up review data (auto-deleted via CASCADE)
