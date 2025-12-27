# Acceptable Variations - Quick Test Guide

## Quick Test Steps

### Test 1: Text Format (Should Show UI)

1. Navigate to **Questions Setup** page
2. Find or create a question with `answer_format` = `single_word`
3. ✅ **VERIFY**: You see "Acceptable Variations" section
4. Add a variation: Type "H2O" and press Enter
5. ✅ **VERIFY**: Variation appears as a blue badge
6. Save the question
7. Reload the page
8. ✅ **VERIFY**: Variation is still there

**Expected**: Full variations UI visible and functional

---

### Test 2: Structured Format (Should Show UI with Special Hints)

1. Find or create a question with `answer_format` = `code`
2. ✅ **VERIFY**: You see "Acceptable Variations" section
3. ✅ **VERIFY**: Placeholder says "Add syntax variation..."
4. Hover over the Info icon (ℹ️)
5. ✅ **VERIFY**: Tooltip says "For code format: Add variations..."
6. Add a variation
7. ✅ **VERIFY**: Variation is saved

**Expected**: UI visible with format-specific guidance

---

### Test 3: Visual Format (Should Hide UI)

1. Find or create a question with `answer_format` = `diagram`
2. ✅ **VERIFY**: "Acceptable Variations" section is **NOT visible**
3. Open browser DevTools → Network tab
4. Refresh the page
5. Check the response payload
6. ✅ **VERIFY**: `acceptable_variations` field exists in the response
7. ✅ **VERIFY**: Any existing variations are in the data (but not displayed)

**Expected**: UI hidden, data preserved in database

---

### Test 4: Format Change (Text → Visual)

1. Find a question with `answer_format` = `single_word` that has variations
2. Note the variations (e.g., "H2O", "water")
3. Change `answer_format` to `diagram`
4. Save the question
5. ✅ **VERIFY**: Variations UI disappears
6. Reload the page
7. ✅ **VERIFY**: UI still hidden
8. Check database or network payload
9. ✅ **VERIFY**: Variations still exist in data

**Expected**: UI hides, data preserved

---

### Test 5: Format Change (Visual → Text)

1. Use the question from Test 4 (diagram with hidden variations)
2. Change `answer_format` back to `single_word`
3. Save the question
4. ✅ **VERIFY**: Variations UI reappears
5. ✅ **VERIFY**: Old variations are displayed (e.g., "H2O", "water")

**Expected**: UI shows, old data restored

---

### Test 6: Equation Format Special Handling

1. Find or create a question with `answer_format` = `equation`
2. ✅ **VERIFY**: Variations section is visible
3. Check placeholder text
4. ✅ **VERIFY**: Says "Add notation variation (e.g., H₂O vs H2O)"
5. Hover over Info icon
6. ✅ **VERIFY**: Tooltip mentions "equation format"

**Expected**: Format-specific UI guidance

---

### Test 7: Papers Setup (Dynamic Answer Field)

1. Navigate to **Papers Setup** → Import a JSON
2. Review questions in the "Questions" tab
3. Find a question with text format
4. ✅ **VERIFY**: Variations section visible in expanded view
5. Find a question with visual format (e.g., table_completion)
6. ✅ **VERIFY**: Variations section NOT visible
7. Check the preview mode
8. ✅ **VERIFY**: Same behavior in preview

**Expected**: Conditional rendering in import workflow

---

### Test 8: Sub-questions

1. Find a complex question with sub-questions
2. Expand a sub-question with `answer_format` = `single_line`
3. ✅ **VERIFY**: Variations section visible
4. Expand a sub-question with `answer_format` = `graph`
5. ✅ **VERIFY**: Variations section hidden

**Expected**: Works for both main and sub-questions

---

## Format Quick Reference

### ✅ Shows Variations UI
- `single_word`
- `single_line`
- `paragraph`
- `numerical`
- `equation` (with special hint)
- `code` (with special hint)
- `calculation` (with special hint)
- `chemical_formula`
- All other text-based formats

### ❌ Hides Variations UI
- `diagram`
- `table`
- `table_completion`
- `graph`
- `chemical_structure`
- `structural_diagram`
- `audio`
- `file_upload`
- `not_applicable`

---

## Troubleshooting

### Issue: Variations section not showing for text format
**Solution**:
- Check answer_format value is correctly set
- Verify format is in TEXT_FORMATS_WITH_VARIATIONS or STRUCTURED_TEXT_FORMATS
- Check console for errors

### Issue: Variations section showing for visual format
**Solution**:
- Verify format value matches exactly (case-sensitive)
- Check the format is in VISUAL_FORMATS array
- Clear browser cache

### Issue: Data loss when changing formats
**Solution**:
- This should NOT happen - data is preserved
- Check database directly using SQL
- Verify acceptable_variations field is in SELECT query

### Issue: Special placeholders not showing
**Solution**:
- Check getVariationPlaceholder() function
- Verify format value is correct
- Test with different formats

---

## Database Verification

To manually verify data preservation:

```sql
-- Check if variations exist for a question
SELECT
  q.id,
  q.answer_format,
  ca.acceptable_variations
FROM questions_master_admin q
LEFT JOIN question_correct_answers ca ON ca.question_id = q.id
WHERE q.id = 'YOUR_QUESTION_ID';
```

Expected results:
- Visual formats: `acceptable_variations` may have data (array)
- Text formats: `acceptable_variations` visible in UI
- Format changes: Data persists regardless of format

---

## Performance Check

1. Open DevTools → Network tab
2. Load Questions Setup page
3. Check the main query response
4. ✅ **VERIFY**: `acceptable_variations` field is present
5. ✅ **VERIFY**: No duplicate queries
6. ✅ **VERIFY**: Response time is normal (<2s)

---

## Browser Compatibility

Test in:
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari

Expected: Identical behavior across browsers

---

## Success Criteria

All tests should show:
- ✅ Text formats: Full variations UI
- ✅ Structured formats: UI with special hints
- ✅ Visual formats: No UI, data preserved
- ✅ Format changes: No data loss
- ✅ Database: acceptable_variations always fetched
- ✅ Build: No TypeScript errors
- ✅ Performance: No degradation

---

## Next Steps After Testing

If all tests pass:
1. ✅ Mark implementation as complete
2. ✅ Update team documentation
3. ✅ Consider user training materials
4. ✅ Monitor for edge cases in production

If issues found:
1. Document the specific scenario
2. Check console for errors
3. Verify format classification
4. Review conditional logic in components
