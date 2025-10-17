# Answer Requirement Auto-Fill - Quick Test Guide

## Quick Overview

The answer requirement field should now auto-fill automatically for all question types, especially MCQ questions.

---

## Test Scenario 1: MCQ Question (Your Screenshot)

### What You Have
- Question Type: mcq (Multiple Choice)
- Answer Format: selection
- Marks: 1 mark
- Current State: Answer requirement field empty

### Expected Result After Fix
✅ **Answer Requirement**: `single_choice`
✅ **Automatically filled when**:
  - You click "Auto-Map Questions" button
  - You click "Auto-Fill Requirements" button
  - When question is first imported

### How to Test
1. Navigate to Papers Setup → Questions Tab
2. Find the MCQ question (Question 4 from your screenshot)
3. Click **"Auto-Map Questions"** button at the top
4. Check the answer requirement field → Should now show "Single Choice"

**Alternative:**
1. Click **"Auto-Fill Requirements"** button
2. Toast message should appear: "Auto-filled X questions..."
3. Answer requirement field should now be populated

---

## Test Scenario 2: Validation

### Expected Behavior
- MCQ questions WITHOUT answer requirements → **ERROR** (red flag)
- Other questions WITHOUT answer requirements → **WARNING** (yellow flag)

### How to Test
1. Import or create a question with empty answer requirement
2. Click "Start Test Simulation" or check validation
3. Look for validation messages:
   - "MCQ question missing answer requirement field" (ERROR)
   - Shows in red in validation panel

---

## Test Scenario 3: Bulk Auto-Fill

### New Feature
A new button "Auto-Fill Requirements" appears next to "Auto-Map Questions"

### How to Test
1. Import questions with some missing answer requirements
2. Click **"Auto-Fill Requirements"** button
3. See toast: "Auto-filled X questions, Y parts, Z subparts"
4. All empty answer requirement fields should now be filled

---

## Quick Reference: Expected Auto-Fill Results

| Question Type | Answer Format | Expected Requirement |
|--------------|---------------|---------------------|
| mcq | selection | single_choice |
| tf | selection | single_choice |
| descriptive | two_items | both_required |
| descriptive | calculation | alternative_methods |
| descriptive | single_line | single_choice |
| descriptive | multi_line | all_required |

---

## What to Look For

### ✅ Success Indicators
- Answer requirement field populated automatically
- Toast messages confirming auto-fill
- Validation passes for MCQ questions
- No red error flags for missing requirements

### ❌ Problem Indicators
- Answer requirement still shows "Select requirement"
- Validation shows "MCQ question missing answer requirement field"
- No toast message after clicking buttons
- Auto-Map or Auto-Fill buttons disabled

---

## Console Debugging

Open browser console (F12) and look for:

```
Auto-filled answer requirement for Q1: single_choice (high confidence)
Auto-filled answer requirement for Q2: both_required (high confidence)
```

These logs confirm the auto-fill is working.

---

## Common Issues & Solutions

### Issue: Button Doesn't Work
**Check**: Are questions loaded? Button disabled if no questions.
**Solution**: Import questions first, then try button.

### Issue: Still Empty After Auto-Map
**Check**: Does question have a valid type and format?
**Solution**: Set question_type to "mcq" and answer_format to "selection".

### Issue: Wrong Requirement Filled
**Check**: What are the question details (type, format, correct answers)?
**Solution**: May need to manually adjust if auto-detection is incorrect.

---

## Three Ways to Auto-Fill

1. **Import** - Happens automatically during JSON import
2. **Auto-Map** - Click "Auto-Map Questions" button (also maps topics)
3. **Bulk Fill** - Click "Auto-Fill Requirements" button (only requirements)

Use **Auto-Map** first (it does everything), then **Bulk Fill** if needed.

---

## For Your Specific Question

**Question 4 from screenshot:**
- Type: mcq
- Format: selection
- Marks: 1

**Steps to Fix:**
1. Click "Auto-Map Questions" button
2. Answer requirement should change to "Single Choice"
3. Validation error should clear
4. Question ready for import

**Time to fix**: < 5 seconds per paper

---

## Need Help?

If auto-fill doesn't work:
1. Check browser console for errors
2. Verify question has `question_type: 'mcq'`
3. Verify question has `answer_format: 'selection'`
4. Try refreshing the page
5. Check that buttons are not disabled

---

**Status**: Ready for testing
**Affected Questions**: All questions, especially MCQ and True/False
**Breaking Changes**: None - only additions
**Rollback**: Not needed - safe enhancement
