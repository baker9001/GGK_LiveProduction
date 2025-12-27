# Acceptable Variations - Testing Guide

## Quick Test Scenarios

### Test 1: Add Acceptable Variations (Admin Mode)

**Location**: Papers Setup → Upload Tab → Questions Review

**Steps**:
1. Upload a JSON file with questions
2. Navigate through Structure and Metadata tabs
3. Go to Questions tab
4. Click Edit on any answer
5. Scroll down to "Acceptable Variations" section
6. Type a variation (e.g., "H2O") in the input field
7. Press Enter or click + button

**Expected Result**:
- ✅ Variation appears as a blue chip above the input
- ✅ Input field clears
- ✅ X button appears on the chip
- ✅ Can add multiple variations

**Validation Tests**:
- Try adding empty variation → Should be prevented
- Try adding duplicate → Should show error
- Try adding same as main answer → Should show error

---

### Test 2: Remove Acceptable Variations

**Steps**:
1. Continue from Test 1 (with added variations)
2. Click X button on any variation chip

**Expected Result**:
- ✅ Variation removed immediately
- ✅ No confirmation dialog
- ✅ Can be re-added if needed

---

### Test 3: Keyboard Shortcuts

**Steps**:
1. Focus on variation input field
2. Type "CO2"
3. Press Enter (don't click button)
4. Type "CO₂"
5. Press Enter again

**Expected Result**:
- ✅ Both variations added via Enter key
- ✅ Input clears after each Enter
- ✅ Same result as clicking + button

---

### Test 4: Info Tooltip

**Steps**:
1. Hover over the Info icon (ℹ) next to "Acceptable Variations"

**Expected Result**:
- ✅ Tooltip appears with example text
- ✅ Shows: "Alternative ways to write this answer (e.g., "H2O" for "H₂O", "CO2" for "CO₂")"
- ✅ Tooltip positioned correctly
- ✅ Disappears when mouse moves away

---

### Test 5: Display in Review Mode

**Location**: Papers Setup → Questions Review → Preview/Test Simulation

**Steps**:
1. Add variations to an answer (Test 1)
2. Save the changes
3. Click "Preview" or "Start Test Simulation"
4. View the question with acceptable variations

**Expected Result**:
- ✅ Variations displayed in green-themed section
- ✅ Shows under correct answer
- ✅ Count badge shows correct number
- ✅ All variations visible as green chips
- ✅ No X buttons (read-only mode)

---

### Test 6: Multiple Answers with Variations

**Steps**:
1. Edit a question with multiple correct answers
2. Add variations to first answer
3. Add different variations to second answer
4. Save changes

**Expected Result**:
- ✅ Each answer has its own variation list
- ✅ Variations don't mix between answers
- ✅ Input fields are separate per answer
- ✅ All variations save correctly

---

### Test 7: Data Persistence

**Steps**:
1. Add variations to answers
2. Save changes
3. Navigate to Structure tab
4. Return to Questions tab
5. Check the same answers

**Expected Result**:
- ✅ Variations still present
- ✅ No data loss
- ✅ Order preserved

---

### Test 8: Import to Database

**Steps**:
1. Complete question review with variations
2. Click "Import Questions" button
3. After import, go to Questions Setup page
4. Find and edit the imported question
5. Check acceptable variations

**Expected Result**:
- ✅ Variations imported to database
- ✅ Appear in Questions Setup page
- ✅ Can be edited in Questions Setup
- ✅ Data integrity maintained

---

## Subject-Specific Test Cases

### Chemistry Example
```
Main Answer: H₂O
Acceptable Variations:
- H2O (plain text)
- water (common name)
- dihydrogen oxide (systematic)
```

### Biology Example
```
Main Answer: mitochondria
Acceptable Variations:
- mitochondrion (singular)
- powerhouse of the cell (descriptive)
```

### Physics Example
```
Main Answer: 9.8 m/s²
Acceptable Variations:
- 9.8 m/s^2 (plain text)
- 9.8 ms⁻² (alternative notation)
- g (symbol)
```

### Mathematics Example
```
Main Answer: π
Acceptable Variations:
- pi (plain text)
- 3.14159 (decimal)
- 22/7 (fraction approximation)
```

---

## Edge Cases to Test

### Edge Case 1: Very Long Variation
**Test**: Add a variation with 100+ characters
**Expected**: Should accept but may need scrolling/wrapping

### Edge Case 2: Special Characters
**Test**: Add variations with subscripts, superscripts, symbols
**Expected**: Should accept all valid Unicode characters

### Edge Case 3: Many Variations
**Test**: Add 10+ variations to single answer
**Expected**: Should display all, may need scrolling

### Edge Case 4: Empty Answer
**Test**: Try to add variations before entering main answer
**Expected**: Should still allow (main answer might be contextual)

---

## Visual Regression Tests

### Light Mode
- [ ] Blue chips in edit mode are visible
- [ ] Green chips in review mode are visible
- [ ] Borders are appropriate contrast
- [ ] Text is readable

### Dark Mode
- [ ] Blue chips have good contrast
- [ ] Green chips have good contrast
- [ ] Info tooltip readable on dark background
- [ ] Input field visible in dark mode

---

## Browser Compatibility Checklist

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

---

## Performance Tests

### Test 1: Large Number of Variations
**Setup**: Add 20 variations to one answer
**Check**:
- [ ] No lag when typing
- [ ] Smooth addition/removal
- [ ] No memory leaks

### Test 2: Many Answers with Variations
**Setup**: 10 questions, each with 5 variations
**Check**:
- [ ] Page loads quickly
- [ ] Scrolling is smooth
- [ ] Save operation completes quickly

---

## Accessibility Tests

### Keyboard Navigation
- [ ] Tab to input field works
- [ ] Enter to add works
- [ ] Tab to + button works
- [ ] Space on + button works
- [ ] Can navigate to X buttons
- [ ] Can activate X buttons with keyboard

### Screen Reader
- [ ] Input field has proper label
- [ ] Variations announced when added
- [ ] Tooltip text accessible
- [ ] Button purposes clear

---

## Integration Tests

### Test 1: With Questions Setup
1. Import question with variations in Papers Setup
2. Open same question in Questions Setup
3. Edit variations in Questions Setup
4. Check consistency

**Expected**: Both interfaces work with same data

### Test 2: With Test Simulation
1. Add variations to answers
2. Start test simulation as student
3. Submit various answers (including variations)
4. Check marking

**Expected**: Variations accepted as correct answers

---

## Validation Message Tests

### Test Each Validation Rule

| Rule | Input | Expected Message |
|------|-------|------------------|
| Empty | "" | (Prevented - button disabled) |
| Duplicate | Same text twice | "Variation validation error: ..." |
| Same as main | Main answer text | "Variation validation error: ..." |
| Whitespace only | "   " | (Prevented - button disabled) |

---

## Automated Test Checklist

If writing automated tests, cover:

- [ ] Add variation programmatically
- [ ] Remove variation programmatically
- [ ] Validate input constraints
- [ ] Check data persistence
- [ ] Verify UI state changes
- [ ] Test keyboard events
- [ ] Test tooltip visibility

---

## Bug Report Template

If you find issues, report with:

```
**Bug Title**: [Clear description]

**Steps to Reproduce**:
1.
2.
3.

**Expected Behavior**:


**Actual Behavior**:


**Screenshots**: [If applicable]

**Environment**:
- Browser:
- OS:
- Screen size:

**Severity**: [Critical/High/Medium/Low]
```

---

## Success Criteria

✅ All tests pass without errors
✅ UI is intuitive and responsive
✅ Data persists correctly
✅ Validation works as expected
✅ Keyboard navigation works
✅ Accessible to all users
✅ Performance is acceptable
✅ Works across browsers
✅ Dark mode looks good
✅ Integrates with existing features

