# Table Completion - Quick Test Guide

## Quick Test Steps

### 1. Start Import Review
- Go to: **System Admin > Learning > Practice Management > Papers Setup**
- Click: **"Start New Import"** button
- Upload a JSON file with table completion questions

### 2. Edit Table
- Navigate to **Questions** tab
- Find a question with **table_completion** format
- Click **"Edit Template"** button
- Make ANY changes:
  - Add rows: Click "+ Add Row"
  - Edit headers: Click on column header cells
  - Mark cells: Select cells and click "Lock Cell" or "Make Editable"
  - Set answers: For editable cells, add expected answers
- Wait for auto-save (watch console)

### 3. Navigate Away
- Click on a **different question** in the list
- Current table should disappear

### 4. Navigate Back - CRITICAL TEST
- Click back on the **original question**
- **EXPECTED RESULT**: Table shows with ALL your edits
- **FAILED RESULT**: Default empty 5x5 table

## Success Criteria

✅ **Save Works**: Console shows successful save messages
✅ **Load Works**: Console shows successful load from REVIEW tables
✅ **Data Persists**: All table edits are preserved
✅ **No Errors**: No console errors or warnings
✅ **Visual Match**: Table looks exactly as you left it

---

**Test Status**: Ready for testing
**Build Status**: ✅ Successful
**Expected Result**: Data persists across navigation
