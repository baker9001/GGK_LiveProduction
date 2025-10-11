# Questions Tab - Testing Guide

## Quick Test Steps

### ✅ Test 1: Normal Flow (Expected: Questions load successfully)

1. Navigate to **System Admin → Learning → Practice Management → Papers Setup**
2. Upload a valid JSON file with questions
3. Complete the **Academic Structure** step
4. Complete the **Paper Metadata** step
5. Click on the **Questions Review & Import** tab
6. **Expected Result**: Questions should load and display (no white page)

### ✅ Test 2: Direct Navigation (Expected: Helpful error message)

1. Open browser console (F12)
2. Navigate directly to the Questions tab URL:
   ```
   /system-admin/learning/practice-management/papers-setup?tab=questions
   ```
3. **Expected Result**:
   - Error message appears (not white page)
   - Message explains what's missing
   - "Go Back" button is available
   - Diagnostic information is shown (expandable)

### ✅ Test 3: Console Diagnostics (Expected: Detailed logs)

1. Navigate to Questions tab (after completing previous steps)
2. Open browser console (F12)
3. Look for log messages starting with `===`
4. **Expected Result**:
   ```
   === QuestionsTab Props Validation ===
   === loadDataStructureInfo START ===
   === initializeFromParsedData START ===
   === loadDataStructureInfo COMPLETE ===
   === initializeFromParsedData COMPLETE ===
   ```

### ✅ Test 4: Browser Console Test Function

1. Open browser console (F12)
2. Navigate to Questions tab
3. Type and run:
   ```javascript
   window.testImportButton()
   ```
4. **Expected Result**: Console shows detailed state information about questions, mappings, attachments, etc.

## What to Look For

### ✓ Success Indicators

- Questions render in expandable cards
- Paper metadata summary displays at top
- Action toolbar shows (Auto-Map, Preview & Test buttons)
- No JavaScript errors in console
- Loading spinner appears briefly then content loads

### ✗ Failure Indicators (Should NOT Happen)

- ~~White page with no content~~
- ~~Infinite loading spinner~~
- ~~No error message when data is missing~~
- ~~Page crash with no recovery option~~

## Error Scenarios to Test

### Scenario A: Missing Import Session
**How to trigger**: Clear session storage, refresh page
**Expected**: Error message "Import session is missing" with Go Back button

### Scenario B: Missing Questions Data
**How to trigger**: Upload invalid JSON without questions array
**Expected**: Error message "No questions found in parsed data"

### Scenario C: Missing Paper ID
**How to trigger**: Skip metadata step, navigate directly to questions
**Expected**: Error message "Paper ID is missing" with diagnostic details

### Scenario D: Missing Data Structure ID
**How to trigger**: Save paper metadata without data_structure_id
**Expected**: Error message "Data structure ID is missing from paper details"

## Browser Console Commands

### Check Component State
```javascript
// View all props and state (when Questions tab is open)
window.testImportButton()
```

### Check for Errors
```javascript
// Should not see any uncaught errors
// All errors should be caught and displayed in UI
```

### Verify Data Loading
```javascript
// Look for these log patterns:
// ✓ "=== loadDataStructureInfo START ==="
// ✓ "Loaded data structure: {...}"
// ✓ "=== initializeFromParsedData START ==="
// ✓ "Processing X questions"
```

## Common Issues and Solutions

### Issue: White page still appears
**Check**:
1. Open browser console - any red errors?
2. Is ErrorBoundary showing? (should display error, not blank)
3. Check Network tab - are API calls failing?
4. Verify previous steps completed successfully

### Issue: "Cannot read property of undefined"
**Check**:
1. Look at diagnostic JSON in error screen
2. Which field shows "missing"?
3. Go back to that step and complete it

### Issue: Loading spinner never stops
**Check**:
1. Console shows "=== ERROR ===" logs?
2. Network tab shows failed requests?
3. Click "Try Again" button in error screen

### Issue: Questions don't display
**Check**:
1. Console shows "Processing X questions"?
2. Are there validation errors displayed?
3. Check if questions array is empty in uploaded JSON

## Success Criteria

✅ **All tests pass if**:
1. Questions tab loads without white page
2. Error messages appear when data is missing (not blank page)
3. Console shows detailed logging (no generic errors)
4. Diagnostic information is available in error screens
5. Recovery options (Try Again, Go Back, Reload) work
6. Build completes without errors

## Development Testing Checklist

Before considering the fix complete:

- [ ] Test normal flow from Upload → Structure → Metadata → Questions
- [ ] Test direct navigation to Questions tab (should show helpful error)
- [ ] Test with missing import session (should show error, not crash)
- [ ] Test with invalid JSON (should show validation error)
- [ ] Test error recovery with "Try Again" button
- [ ] Check browser console for detailed logs
- [ ] Verify no uncaught exceptions
- [ ] Verify build succeeds: `npm run build`
- [ ] Test in different browsers (Chrome, Firefox, Safari)
- [ ] Test with browser dev tools open (check for warnings)

## Regression Testing

Ensure existing functionality still works:

- [ ] Upload tab still works
- [ ] Structure tab still works
- [ ] Metadata tab still works
- [ ] Tab navigation works correctly
- [ ] Previous sessions can be restored
- [ ] Extraction rules configuration works
- [ ] Auto-mapping works
- [ ] Question editing works
- [ ] PDF upload and snipping works
- [ ] Import functionality works

## Production Monitoring

After deployment, monitor for:
- Error rates in Questions tab
- Console error logs from users
- Support tickets about "white page" or "questions not loading"
- Diagnostic data from error screens (if users report issues)

## Support Documentation

If users report issues, ask for:
1. Screenshot of error screen
2. Diagnostic JSON (from expandable section)
3. Browser console logs (screenshot or copy/paste)
4. Steps to reproduce
5. Which browser and version

## Quick Fix Commands

If issues persist after deployment:

```bash
# Rebuild the project
npm run build

# Clear browser cache and reload
# (Instruct users to do Ctrl+Shift+R or Cmd+Shift+R)

# Check database for session data
# Verify import session has complete metadata
```

## Related Files

- `src/components/shared/ErrorBoundary.tsx`
- `src/app/system-admin/learning/practice-management/papers-setup/tabs/QuestionsTabWrapper.tsx`
- `src/app/system-admin/learning/practice-management/papers-setup/tabs/QuestionsTab.tsx`
- `src/app/system-admin/learning/practice-management/papers-setup/page.tsx`

## Additional Documentation

See `QUESTIONS_TAB_WHITE_PAGE_FIX.md` for:
- Detailed implementation explanation
- Root cause analysis
- Error handling architecture
- Troubleshooting guide
