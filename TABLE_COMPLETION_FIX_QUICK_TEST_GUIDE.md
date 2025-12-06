# Table Completion Fix - Quick Test Guide

**Quick reference for testing the table completion simulation mode fixes**

---

## 🚀 Quick Test Steps

### 1. Open Browser Console
```
Press F12 → Console Tab
```

### 2. Navigate to Table Question
- Go to any question with table completion answer format
- Enter test/simulation mode (admin test mode)

### 3. Check Console Logs

**Look for this sequence:**
```
✅ [TableCompletion] ✅ ====== TEMPLATE LOAD COMPLETE ======
✅ [TableCompletion] 🎯 Final state summary: {editableCellsCount: 5, lockedCellsCount: 20, ...}
✅ [TableCompletion] 📊 Statistics at render: {lockedCount: 20, editableCount: 5, ...}
✅ [TableCompletion] 🏷️ Rendering column headers: {headers: ["Test-tube", "Colour", ...]}
✅ [TableCompletion] 🎨 Admin test mode renderer - Cell 0,0: {isEditable: false, ...}
```

**Red Flags (Problems):**
```
❌ cellTypesCount: 0  (data not loading)
❌ editableCellsCount: 0, lockedCellsCount: 0  (no cell configuration)
❌ undefinedCount: 25  (all cells undefined)
❌ headers: ["Column 1", "Column 2", ...]  (not loading from database)
```

---

## ✅ Visual Checklist

### Table Display:
- [ ] Column headers show actual names (not "Column 1", "Column 2")
- [ ] Some cells have gray background (locked cells)
- [ ] Some cells have yellow/cream background (editable cells)
- [ ] Locked cells show pre-filled data
- [ ] Editable cells are empty
- [ ] Statistics show real numbers (not "0/0")
- [ ] Lock icons (🔒) visible in gray cells

### Interaction:
- [ ] Clicking editable (yellow) cells allows typing
- [ ] Edit bar appears at top when cell selected
- [ ] Clicking locked (gray) cells does not allow editing
- [ ] Can navigate between cells with arrow keys

---

## 🔍 Troubleshooting

### Issue: Column headers show "Column 1", "Column 2"
**Check:**
- Console log: `🏷️ Rendering column headers`
- Verify `headers` array has actual names
- If empty, database template not loading

### Issue: All cells white/default styling
**Check:**
- Console log: `📊 Statistics at render`
- If `cellTypesKeys: 0` → database not loading
- If `cellTypesKeys: 25` → cell renderer not working

### Issue: Statistics show "0/0"
**Check:**
- Console log: `🎯 Final state summary`
- If `cellTypesCount: 0` → data not being set
- Check RLS policies on `table_templates_import_review`

### Issue: Edit bar appears on all cells
**Check:**
- Console log: `🎨 Admin test mode renderer`
- Verify `isEditable` is false for locked cells
- Check `cellTypes` state has correct data

### Issue: No data in locked cells
**Check:**
- Console log: `State being set: {cellValuesCount: ...}`
- If count is 0, locked values not in database
- Verify `table_template_cells_import_review` has `locked_value` data

---

## 🗄️ Database Quick Check

### Verify Template Exists:
```sql
SELECT * FROM table_templates_import_review
WHERE review_session_id = 'YOUR_SESSION_ID'
  AND question_identifier = 'YOUR_QUESTION_ID';
```

### Verify Cells Exist:
```sql
SELECT COUNT(*),
       SUM(CASE WHEN cell_type = 'locked' THEN 1 ELSE 0 END) as locked,
       SUM(CASE WHEN cell_type = 'editable' THEN 1 ELSE 0 END) as editable
FROM table_template_cells_import_review
WHERE template_id = 'YOUR_TEMPLATE_ID';
```

### Check Headers:
```sql
SELECT headers FROM table_templates_import_review
WHERE id = 'YOUR_TEMPLATE_ID';
```

---

## 📋 Expected Console Output (Sample)

```
[TableCompletion] 🔍 ====== STARTING LOAD ======
[TableCompletion] 🔍 Loading template with params: {
  importSessionId: "abc-123",
  questionIdentifier: "q_1-part-0"
}
[TableCompletion] 📦 Received result from service: {
  success: true,
  source: "review",
  hasTemplate: true,
  templateRows: 5,
  templateColumns: 5
}
[TableCompletion] 🔧 Processing 25 cells...
[TableCompletion] 📊 State being set: {
  cellTypesCount: 25,
  cellValuesCount: 20,
  expectedAnswersCount: 5
}
[TableCompletion] ✅ ====== TEMPLATE LOAD COMPLETE ======
[TableCompletion] 🎯 Final state summary: {
  rows: 5,
  columns: 5,
  headers: ["Test-tube", "Colour intensity", "Score", "pH", "Result"],
  editableCellsCount: 5,
  lockedCellsCount: 20,
  isAdminTestMode: true
}
[TableCompletion] 📊 Statistics at render: {
  lockedCount: 20,
  editableCount: 5,
  undefinedCount: 0,
  totalCells: 25,
  cellTypesKeys: 25
}
[TableCompletion] 🏷️ Rendering column headers: {
  headersCount: 5,
  headers: ["Test-tube", "Colour intensity", "Score", "pH", "Result"]
}
[TableCompletion] 🎨 Admin test mode renderer - Cell 0,0: {
  cellKey: "0-0",
  cellType: "locked",
  isEditable: false,
  hasCellTypes: true
}
[TableCompletion] 🎨 Admin test mode renderer - Cell 0,1: {
  cellKey: "0-1",
  cellType: "editable",
  isEditable: true,
  hasCellTypes: true
}
```

---

## 🎨 Visual Reference

### Locked Cell (Gray):
```
┌─────────────────┐
│ 🔒         Test 1│ ← Lock icon
│                  │
│   "LK"           │ ← Pre-filled data
│                  │
└─────────────────┘
Background: #f3f4f6 (light gray)
Border: 1px solid #d1d5db
Font: Medium weight
```

### Editable Cell (Yellow):
```
┌─────────────────┐
│                  │
│      [empty]     │ ← User input area
│                  │
└─────────────────┘
Background: #fffbeb (light cream/yellow)
Border: 2px solid #fbbf24 (golden)
Font: Normal weight
```

---

## 🚨 Common Issues & Solutions

| Issue | Console Indicator | Solution |
|-------|------------------|----------|
| No column names | `headers: ["Column 1", ...]` | Check database template |
| No cell styling | `cellTypesKeys: 0` | Verify data loading |
| All cells white | `hasCellTypes: false` | Check RLS policies |
| Edit bar everywhere | `isEditable: true` always | Verify cellRenderer logic |
| No locked data | `cellValuesCount: 0` | Check database cells table |

---

## ✨ Success Indicators

When everything works correctly, you should see:

1. ✅ Correct column headers from database
2. ✅ Gray cells with lock icons and data
3. ✅ Yellow cells empty and editable
4. ✅ Statistics show real numbers
5. ✅ Console logs show data loading
6. ✅ No errors in console
7. ✅ Edit bar only on yellow cells
8. ✅ User can type in yellow cells

---

## 📞 Need Help?

If issues persist:
1. Copy all console logs starting with `[TableCompletion]`
2. Take screenshot of table display
3. Share both for further diagnosis

---

**Last Updated:** December 6, 2025
**Build Status:** ✅ Successful
