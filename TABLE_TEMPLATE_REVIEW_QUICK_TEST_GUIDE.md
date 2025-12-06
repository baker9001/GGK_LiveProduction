# Table Template Review - Quick Test Guide

## 🎯 What Was Fixed

Admin users can now save table data in review (edit) mode. Previously, all save operations were failing silently due to a database column name mismatch.

---

## ✅ Quick Test (5 Minutes)

### Step 1: Open Review Mode
1. Go to **System Admin** > **Learning** > **Practice Management** > **Papers Setup**
2. Open any paper import session (or start a new import)
3. Navigate to **Questions** tab
4. Find a question with `table_completion` answer format

### Step 2: Edit Table Template
1. Click to expand the question
2. You should see the table editor
3. Make some changes:
   - Add a row using the "+" button
   - Mark some cells as "editable" (click cell, select type)
   - Enter expected answers in editable cells
   - Set column headers
4. Click **"Save Template"** button

### Step 3: Verify Save
**Expected Success Indicators**:
- ✅ Green toast: "Template saved to review database!"
- ✅ Auto-save status shows "saved" with timestamp
- ✅ No console errors (open browser DevTools)

**Console Logs to Look For**:
```
[TableTemplateImportReviewService] Saving template for review:
[TableTemplateImportReviewService] ✅ Template saved successfully
```

### Step 4: Test Persistence
1. Collapse the question (or navigate away)
2. Expand the same question again

**Expected Result**:
- ✅ Table configuration loads exactly as you saved it
- ✅ Row/column counts correct
- ✅ Cell types preserved (locked/editable)
- ✅ Expected answers still there
- ✅ Headers show correctly

### Step 5: Database Verification (Optional)

Run this query in Supabase SQL Editor:

```sql
-- Check if template was saved
SELECT
  id,
  review_session_id,
  question_identifier,
  rows,
  columns,
  headers,
  created_at
FROM table_templates_import_review
ORDER BY created_at DESC
LIMIT 5;

-- Check if cells were saved
SELECT
  t.question_identifier,
  COUNT(c.id) as cell_count
FROM table_templates_import_review t
LEFT JOIN table_template_cells_import_review c ON c.template_id = t.id
GROUP BY t.question_identifier
ORDER BY t.created_at DESC
LIMIT 5;
```

**Expected Result**:
- ✅ Your template appears in first query
- ✅ Cell count matches your table size (rows × columns)

---

## 🔍 Console Debugging

### Open Browser DevTools
Press `F12` or Right-click > Inspect

### Check for These Logs

**On Save**:
```
[TableCompletion] ========== SAVE TEMPLATE ==========
[TableCompletion] ✅ Using REVIEW MODE save
[TableTemplateImportReviewService] Saving template for review:
[TableTemplateImportReviewService] ✅ Template saved successfully
```

**On Load**:
```
[TableCompletion] 🎯 REVIEW SESSION detected - loading from database
[TableTemplateImportReviewService] 🔍 ====== STARTING LOAD ======
[TableTemplateImportReviewService] ✅ Template found:
[TableTemplateImportReviewService] ✅ Template loaded successfully
```

### ❌ Error Signs (Should NOT See These)

```
❌ Column "import_session_id" does not exist
❌ Template upsert error
❌ No template found in database
❌ RLS policies are blocking access
```

If you see any of these errors, the fix may not be deployed or there's another issue.

---

## 🐛 Troubleshooting

### Issue: "No template found" after saving

**Possible Causes**:
1. **Session ID mismatch**: The importSessionId being passed doesn't match database
2. **RLS policy blocking**: User doesn't have permission to read their own data

**Debug Steps**:
```javascript
// Open browser console and check:
console.log('Session ID:', importSession?.id);

// Should be a valid UUID
// Example: "123e4567-e89b-12d3-a456-426614174000"
```

**Verify in Database**:
```sql
-- Check if review session exists
SELECT id, user_id, created_at
FROM question_import_review_sessions
ORDER BY created_at DESC
LIMIT 5;
```

### Issue: Save button does nothing

**Check Console for**:
- JavaScript errors
- Network errors (Failed to fetch)
- RLS policy errors (code 42501)

**Verify**:
1. User is authenticated (check top-right corner)
2. Session hasn't expired (refresh page if needed)
3. Network is working (check other operations work)

### Issue: Data saves but doesn't load

**This would indicate**:
1. Save operation uses correct column (`review_session_id`) ✅
2. Load operation might have issue (check console logs)

**Verify**:
```sql
-- Check data exists
SELECT * FROM table_templates_import_review
WHERE question_identifier = 'your-question-id'
LIMIT 1;
```

If data exists but doesn't load, check console for load errors.

---

## 📊 What Changed?

### Before (Broken)
```typescript
// Service tried to use wrong column name
.eq('import_session_id', importSessionId)  // ❌ Column doesn't exist
```

### After (Fixed)
```typescript
// Service now uses correct column name
.eq('review_session_id', importSessionId)  // ✅ Matches database schema
```

**Result**: All database operations (INSERT, SELECT, UPDATE, DELETE) now work correctly.

---

## ✨ Expected Behavior

### Save Operations
- **Instant feedback**: Toast notification on success/error
- **Auto-save**: Template saves automatically every few seconds when editing
- **Manual save**: "Save Template" button for immediate save
- **Status indicator**: Shows "saving..." → "saved" → timestamp

### Load Operations
- **On expand**: Template loads when question is expanded
- **On refresh**: Template persists across page reloads
- **Multiple questions**: Each question has independent template

### Update Operations
- **Non-destructive**: UPSERT merges changes, doesn't delete existing data
- **Efficient**: Only changed cells are updated
- **Versioned**: `updated_at` timestamp tracks last change

---

## 🎓 Understanding the Fix

### Database Schema
```sql
CREATE TABLE table_templates_import_review (
  review_session_id uuid REFERENCES question_import_review_sessions(id),
  -- NOT "import_session_id" ⚠️
  ...
);
```

### Service Code (Now Fixed)
```typescript
const payload = {
  review_session_id: template.importSessionId,  // ✅ Correct
  // Was: import_session_id (wrong)
};
```

### Why It Failed Before
- Database expected: `review_session_id`
- Service sent: `import_session_id`
- PostgreSQL error: "column does not exist"
- Result: No data saved, no data loaded

### Why It Works Now
- Database expects: `review_session_id` ✅
- Service sends: `review_session_id` ✅
- PostgreSQL: Success ✅
- Result: Data saves and loads correctly ✅

---

## 📝 Report Issues

If you encounter any problems after testing:

1. **Capture console logs** (F12 > Console tab)
2. **Take screenshots** of any errors
3. **Note the exact steps** to reproduce
4. **Check database** for any saved data (queries above)
5. **Share findings** with development team

---

## ✅ Success Criteria

You'll know it's working when:

1. ✅ Save button shows success toast
2. ✅ Template persists after page refresh
3. ✅ Multiple questions save independently
4. ✅ Console shows successful save/load logs
5. ✅ Database queries show saved data
6. ✅ No errors in browser console

---

**Ready to test!** 🚀

Follow the steps above and verify everything works as expected.
