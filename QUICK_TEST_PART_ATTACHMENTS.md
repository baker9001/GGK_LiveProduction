# Quick Test Guide: Part and Subpart Attachments

## Status: ✅ Fixed - Ready for Testing

## What Was Fixed

Attachments snipped for parts and subparts now:
1. ✅ Display in the inline attachment preview
2. ✅ Update the figure status banner to green "Figure attached"
3. ✅ Show in the attachment cards below the question text editor

## Quick Test Steps

### Test 1: Part-Level Attachment
1. Navigate to Papers Setup → Questions tab
2. Find a question with parts (e.g., Question with parts a, b, c)
3. Look for the yellow banner: "This part requires a supporting figure"
4. Click "Launch snipping tool" button on that part
5. Select an area from the PDF and click "Capture Selection"
6. **Expected Results**:
   - ✅ Toast: "Attachment added to part {index}"
   - ✅ Image appears below the part's question text editor
   - ✅ Banner changes to green: "Figure attached"
   - ✅ Console log: `🔗 Mapping 1 attachment(s) to part...`

### Test 2: Subpart-Level Attachment
1. Find a question with subparts (e.g., Part (a) with subparts i, ii, iii)
2. Look for the yellow banner: "This subpart requires a supporting figure"
3. Click "Launch snipping tool" button on that subpart
4. Select an area from the PDF and click "Capture Selection"
5. **Expected Results**:
   - ✅ Toast: "Attachment added to part {partIndex}, subpart {subpartIndex}"
   - ✅ Image appears below the subpart's question text editor
   - ✅ Banner changes to green: "Figure attached"
   - ✅ Console log: `🔗 Mapping 1 attachment(s) to subpart...`

### Test 3: Multiple Attachments
1. Add a second attachment to the same part
2. **Expected Results**:
   - ✅ Both attachments display in the preview area
   - ✅ Each has a preview thumbnail
   - ✅ Hover shows zoom option

### Test 4: Question-Level Attachment (Regression Test)
1. Add attachment to main question (not a part)
2. **Expected Results**:
   - ✅ Still works as before
   - ✅ No breaking changes to existing functionality

### Test 5: Attachment Deletion
1. Click the trash icon on any part/subpart attachment
2. **Expected Results**:
   - ✅ Attachment removes from preview
   - ✅ If last attachment, banner returns to yellow "requires figure"
   - ✅ Console log: `🗑️ Deleting attachment...`

## What to Check

### Visual Indicators
- [ ] Yellow banner when figure required but no attachment
- [ ] Green banner when attachment exists
- [ ] Attachment preview cards render correctly
- [ ] Thumbnails show actual image content
- [ ] Zoom/preview buttons work

### Console Logs
Look for these in browser DevTools:
```
📎 Adding attachment to part 0: {...}
✅ Attachment stored with key: Q1_p0 {...}
🔗 Mapping 1 attachment(s) to part 0 of question Q1
```

### Edge Cases
- [ ] Add multiple attachments to one part
- [ ] Add attachments to nested subparts
- [ ] Delete middle attachment from a set of 3
- [ ] Refresh page and verify attachments persist during session
- [ ] Switch between questions and verify correct attachments show

## Common Issues & Fixes

### Issue: Attachment doesn't appear after snipping
**Check**:
- Open browser console
- Look for the log: `✅ Attachment stored with key: ...`
- Look for the log: `🔗 Mapping ... attachment(s) to part ...`
- If storage log appears but mapping doesn't, there's a state sync issue

### Issue: Banner stays yellow even with attachment
**Check**:
- Verify attachment has `file_url` property starting with `data:`
- Check console for attachment mapping logs
- Inspect the part object in React DevTools to see if `attachments` array is populated

### Issue: Attachment appears but with wrong context
**Check**:
- Verify the attachment key in storage log matches the expected format
- For part 0: should be `questionId_p0`
- For part 0, subpart 1: should be `questionId_p0_s1`

## Browser Console Commands

Test attachment state directly:
```javascript
// In browser console after import
// Check what attachment keys exist
console.log(Object.keys(attachmentsState));

// Check specific part attachments
console.log(attachmentsState['Q1_p0']);

// Check if parts have attachments property
console.log(questions[0].parts[0].attachments);
```

## Success Criteria

All tests pass when:
1. ✅ Attachments display at all levels (question, part, subpart)
2. ✅ Status banners change color/text when attachments added
3. ✅ Multiple attachments can be added to each level
4. ✅ Deletion works correctly at all levels
5. ✅ Console logs show proper attachment flow
6. ✅ No regression in existing question-level attachments

## Need Help?

Check these files:
- `PART_SUBPART_ATTACHMENT_FIX_COMPLETE.md` - Detailed technical explanation
- Browser console logs - Shows attachment key generation and mapping
- React DevTools - Inspect component state for attachments

## Demo Workflow

1. Import a biology paper with complex questions (parts and subparts)
2. Navigate to Questions Review section
3. For each part requiring a figure:
   - Click "Launch snipping tool"
   - Snip the relevant diagram from the PDF
   - Verify immediate visual feedback
4. Scroll through all questions to see attachments in context
5. Verify figure status badges are all green where attachments exist

---

**Last Updated**: 2025-11-10
**Feature**: Part and Subpart Attachment Display
**Status**: ✅ Ready for Production Testing
