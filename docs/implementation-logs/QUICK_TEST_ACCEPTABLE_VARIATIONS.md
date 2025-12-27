# Quick Test Guide - Acceptable Variations in Review Page

## Test the Fix

### Step 1: Access Review Page
1. Go to System Admin → Learning → Practice Management → Papers Setup
2. Find an existing import session (or create a new one)
3. Click "Review" or navigate to the review page

### Step 2: Check Display Mode
Look for questions with correct answers:

**Expected Results:**
- ✅ Each correct answer displays in a green box
- ✅ If variations exist, you'll see "Acceptable Variations (X)" with blue info icon
- ✅ Variations shown as blue pills below the answer
- ✅ Clean, organized layout

**Example Display:**
```
✓ Correct Answer
  H₂O
  1 mark

  ℹ️ Acceptable Variations (2)
  [H2O] [water]
```

### Step 3: Test Edit Mode
1. Click the "Edit" button on any correct answer
2. Scroll down to find "Acceptable Variations" section

**Expected Results:**
- ✅ Section appears with info icon and tooltip
- ✅ Existing variations shown as removable pills
- ✅ Input field available for adding new variations
- ✅ Plus button next to input field

### Step 4: Add a Variation
1. Type a variation in the input field (e.g., "H2O")
2. Press Enter or click the Plus button

**Expected Results:**
- ✅ Variation added as blue pill
- ✅ Input field clears
- ✅ No duplicate if variation already exists
- ✅ Error message if trying to add empty/duplicate

### Step 5: Remove a Variation
1. Click the X button on any variation pill

**Expected Results:**
- ✅ Variation removed immediately
- ✅ List updates without page reload
- ✅ Can be re-added if needed

### Step 6: Test Validation
Try adding these to see validation:
1. Empty string → Should reject with error
2. Duplicate variation → Should reject with error
3. Very long text (>200 chars) → Should warn but allow

### Step 7: Save Changes
1. Click "Save" button in the edit dialog
2. Close edit mode

**Expected Results:**
- ✅ Changes saved successfully
- ✅ Variations persist when viewing again
- ✅ No data loss on other answer fields

### Step 8: Test Nested Structures
If question has parts (a, b, c) or subparts (i, ii, iii):

**Expected Results:**
- ✅ Each part has its own acceptable_variations
- ✅ Can edit variations independently
- ✅ All variations saved correctly

### Step 9: Save All Questions
1. Click "Save All" button at top of page
2. Refresh the page

**Expected Results:**
- ✅ All variations still present
- ✅ No data corruption
- ✅ Session properly updated

## Quick Visual Check

The acceptable variations section should look like:

**Edit Mode:**
```
┌─────────────────────────────────────┐
│ Acceptable Variations         ℹ️    │
├─────────────────────────────────────┤
│ [H2O ×] [water ×] [dihydrogen... ×] │
│                                     │
│ ┌─────────────────────┐  ┌───┐    │
│ │ Add variation...    │  │ + │    │
│ └─────────────────────┘  └───┐    │
└─────────────────────────────────────┘
```

**View Mode:**
```
┌─────────────────────────────────────┐
│ ℹ️ Acceptable Variations (3)        │
│ [H2O] [water] [dihydrogen monoxide] │
└─────────────────────────────────────┘
```

## Common Issues & Solutions

### Issue: No variations visible
**Solution:** Check if questions have `acceptable_variations` in raw_json

### Issue: Can't add variations
**Solution:** Make sure you're in edit mode, not view mode

### Issue: Variations not saving
**Solution:** Check browser console for errors, ensure "Save" was clicked

### Issue: QuestionCard not rendering
**Solution:** Clear browser cache, rebuild project

## Testing Data

Use these test variations:

**Chemistry:**
- Main: H₂O → Variations: H2O, water
- Main: CO₂ → Variations: CO2, carbon dioxide
- Main: NaCl → Variations: sodium chloride, salt

**Physics:**
- Main: 9.8 m/s² → Variations: 9.8, 10 m/s²
- Main: 3×10⁸ m/s → Variations: 3e8, 300000000

**Biology:**
- Main: photosynthesis → Variations: photo-synthesis
- Main: mitochondria → Variations: mitochondrion (singular)

## Success Criteria

All tests pass when:
- ✅ Can view existing variations
- ✅ Can add new variations
- ✅ Can remove variations
- ✅ Validation works correctly
- ✅ Changes persist after save
- ✅ Works at all nesting levels
- ✅ No console errors
- ✅ UI looks polished

## Report Issues

If you find any issues:
1. Note the exact steps to reproduce
2. Check browser console for errors
3. Verify data structure in session's raw_json
4. Take screenshots if UI issue
