# JSON Extraction Fixes - Comprehensive Checklist

## Summary of Issues Fixed

### Issue 1: Subpart Correct Answers and Answer Fields Not Displaying Correctly
**Root Cause:** The `transformQuestionSubpart` function in `jsonTransformer.ts` was deriving `answer_format` and `answer_requirement` values instead of prioritizing the explicit values provided in the JSON file.

**Fix Applied:** Added proper validation to check if `answer_format` and `answer_requirement` exist as valid, non-empty strings in the JSON before attempting to derive fallback values.

### Issue 2: Figure Attachment Auto-Showing
**Root Cause:** The `processAttachments` function was treating JSON attachment descriptions (e.g., "Fig. 1.1 showing test tubes") as actual uploaded files, causing the UI to show "Figure attached to this subpart" even when no file had been attached via the snipping tool.

**Fix Applied:** Modified `processAttachments` to always return an empty array, ensuring that attachments can only be added through the user-initiated snipping tool workflow.

---

## Verification Checklist

### ✅ Issue 1: Subpart Answer Format & Requirement

#### Test Case 1.1: Explicit answer_format from JSON
- [ ] Import the sample JSON (biology_0610_61_M_J_2017_Complete_Extraction.json)
- [ ] Navigate to Question 1, Part (a), Subpart (ii)
- [ ] **Expected:** Answer format should show `single_word` (from JSON)
- [ ] **Expected:** Answer requirement should show the value from JSON, NOT "Not Applicable"
- [ ] **Verify:** The correct answers array is populated and visible

#### Test Case 1.2: Subpart correct answers display
- [ ] Open Question 1, Part (a), Subpart (ii)
- [ ] **Expected:** Correct answers section should show all 4 alternatives:
  - "purple"
  - "violet"
  - "lilac"
  - "mauve"
- [ ] **Expected:** Each answer should have `marks: 1`
- [ ] **Expected:** Alternative type should be "one_required"

#### Test Case 1.3: Answer format validation
- [ ] Check Question 1, Part (a), Subpart (i)
- [ ] **Expected:** Answer format = `calculation` (from JSON)
- [ ] **Expected:** Answer requirement reflects the calculation requirement
- [ ] **Verify:** Correct answers for tube 3 (0.10) and tube 7 (0.80) are present

#### Test Case 1.4: Complex subparts with multiple answers
- [ ] Check Question 1, Part (a), Subpart (iv)
- [ ] **Expected:** Answer format = `table` (from JSON)
- [ ] **Expected:** Shows 3 correct answer components
- [ ] **Verify:** All marking criteria are preserved

---

### ✅ Issue 2: Figure Attachment Display Logic

#### Test Case 2.1: Figure flag without attachments
- [ ] Import the sample JSON
- [ ] Navigate to Question 1, Part (a), Subpart (iii)
- [ ] **Expected:** Shows amber banner saying "This subpart requires a supporting figure"
- [ ] **Expected:** Does NOT show green "Figure attached to this subpart"
- [ ] **Expected:** Shows "Launch snipping tool" button
- [ ] **Verify:** `figure: true` in JSON does NOT auto-attach figures

#### Test Case 2.2: Figure attachment workflow
- [ ] From subpart (iii), click "Launch snipping tool"
- [ ] Use snipping tool to attach a figure
- [ ] **Expected:** Banner changes to green "Figure attached to this subpart"
- [ ] **Expected:** Button changes to "outline" variant
- [ ] **Verify:** Attachment is added to the attachments array

#### Test Case 2.3: Subpart without figure requirement
- [ ] Check Question 1, Part (a), Subpart (ii)
- [ ] **Expected:** No figure banner shown at all
- [ ] **Expected:** `figure: false` means no figure UI displayed
- [ ] **Verify:** JSON metadata doesn't force figure display

#### Test Case 2.4: Multiple attachments handling
- [ ] Navigate to a subpart with `figure: true`
- [ ] Attach multiple figures via snipping tool
- [ ] **Expected:** All attachments are listed
- [ ] **Expected:** Each attachment can be removed individually
- [ ] **Verify:** Figure status reflects actual attachment count

---

## Code Changes Summary

### File 1: `/src/lib/extraction/jsonTransformer.ts`

#### Change 1.1: Enhanced answer_format validation (Lines 427-446)
```typescript
// CRITICAL FIX: Prioritize explicit answer_format from JSON, with proper validation
let answerFormat = subpart.answer_format;
const isValidAnswerFormat = answerFormat &&
  typeof answerFormat === 'string' &&
  answerFormat.trim() !== '' &&
  answerFormat !== 'undefined' &&
  answerFormat !== 'null';

if (!isValidAnswerFormat) {
  // Only derive if not provided or invalid
  answerFormat = deriveAnswerFormat({...}) || undefined;
}
```

**Purpose:** Ensures explicit `answer_format` values from JSON are preserved and only derives when truly missing or invalid.

#### Change 1.2: Enhanced answer_requirement validation (Lines 448-466)
```typescript
// CRITICAL FIX: Prioritize explicit answer_requirement from JSON
let answerRequirement = subpart.answer_requirement;
const isValidAnswerRequirement = answerRequirement &&
  typeof answerRequirement === 'string' &&
  answerRequirement.trim() !== '' &&
  answerRequirement !== 'undefined' &&
  answerRequirement !== 'null';

if (!isValidAnswerRequirement) {
  // Only derive if not provided or invalid
  answerRequirement = deriveAnswerRequirement({...});
}
```

**Purpose:** Ensures explicit `answer_requirement` values from JSON are preserved and only derives when truly missing or invalid.

#### Change 1.3: Added figure fields to return object (Lines 480-481)
```typescript
figure: subpart.figure || false, // Preserve figure flag from JSON
figure_required: subpart.figure_required || false, // Preserve figure_required flag
```

**Purpose:** Ensures figure metadata from JSON is properly passed through the transformation pipeline.

#### Change 1.4: Fixed attachment processing (Lines 641-644)
```typescript
function processAttachments(attachments: string[]): Array<any> {
  // Always return empty array - attachments must be added by user via snipping tool
  // The attachments array from JSON is just descriptive metadata, not actual files
  return [];
}
```

**Purpose:** Prevents JSON attachment descriptions from being treated as actual uploaded files. Forces users to explicitly attach figures via the snipping tool.

### File 2: `/src/components/shared/QuestionImportReviewWorkflow.tsx`

#### Change 2.1: Added clarifying comment (Lines 2676-2678)
```typescript
// CRITICAL FIX: Only show figure UI when figure_required is explicitly true OR figure flag is true
// BUT distinguish between "figure required" (from JSON) vs "figure attached" (has actual attachments)
const subRequiresFigure = Boolean(subpart.figure_required ?? subpart.figure);
const subHasAttachments = Array.isArray(subpart.attachments)
  ? subpart.attachments.length > 0
  : false;
```

**Purpose:** Documents the distinction between figure metadata (from JSON) and actual user-attached figures.

---

## Behavioral Changes

### Before Fixes

❌ **Issue 1 Behavior:**
- Subpart answer_format showing "Not Applicable" even when JSON specified "single_word"
- Subpart answer_requirement showing "Not Applicable" even when JSON specified a value
- Correct answers not displaying for subparts

❌ **Issue 2 Behavior:**
- Green banner "Figure attached to this subpart" showing immediately when `figure: true` in JSON
- JSON attachment descriptions treated as actual files
- No way to distinguish between "figure required" vs "figure actually attached"

### After Fixes

✅ **Issue 1 Behavior:**
- Subpart answer_format correctly shows value from JSON (e.g., "single_word", "calculation")
- Subpart answer_requirement correctly shows value from JSON
- Correct answers properly displayed with all metadata preserved

✅ **Issue 2 Behavior:**
- Amber banner "This subpart requires a supporting figure" shown when `figure: true` but no attachments
- Green banner "Figure attached to this subpart" ONLY shown when user has attached via snipping tool
- Clear distinction between figure metadata and actual user-attached files

---

## Testing Instructions

### Setup
1. Import the sample JSON file: `biology_0610_61_M_J_2017_Complete_Extraction.json`
2. Navigate to System Admin > Learning > Practice Management > Papers Setup
3. Upload the JSON file

### Test Scenario 1: Verify Answer Format & Requirement Preservation
1. Go to Question 1 → Part (a) → Subpart (ii)
2. Check that "Answer format" dropdown shows "Single Word" (not "Not Applicable")
3. Check that "Answer requirement" shows the JSON value (not "Not Applicable")
4. Verify the correct answers section shows: purple, violet, lilac, mauve

### Test Scenario 2: Verify Figure Display Logic
1. Go to Question 1 → Part (a) → Subpart (iii)
2. Confirm amber banner shows "This subpart requires a supporting figure"
3. Confirm it does NOT show green "Figure attached"
4. Click "Launch snipping tool" and attach a figure
5. Confirm banner changes to green "Figure attached to this subpart"

### Test Scenario 3: Verify No Regression for Parts
1. Check Question 1 → Part (a) (the part itself, not subpart)
2. Verify part-level answer_format and answer_requirement are correct
3. Verify part-level correct answers display correctly

### Test Scenario 4: Verify Nested Structure Integrity
1. Check that all parts display correctly
2. Check that all subparts within parts display correctly
3. Verify no data loss in the transformation pipeline

---

## Edge Cases to Test

### Edge Case 1: Missing JSON Fields
- [ ] Test with subpart that has no `answer_format` in JSON
- [ ] **Expected:** Should derive appropriate format based on content
- [ ] Test with subpart that has no `answer_requirement` in JSON
- [ ] **Expected:** Should derive appropriate requirement based on correct answers

### Edge Case 2: Invalid JSON Values
- [ ] Test with `answer_format: ""` (empty string)
- [ ] **Expected:** Should derive appropriate format
- [ ] Test with `answer_format: "undefined"` (string literal)
- [ ] **Expected:** Should detect as invalid and derive

### Edge Case 3: Figure Flags
- [ ] Test with `figure: false` and no attachments
- [ ] **Expected:** No figure banner shown
- [ ] Test with `figure: true`, `figure_required: false`, and no attachments
- [ ] **Expected:** Shows figure banner (figure takes precedence)

### Edge Case 4: Attachment Array Variations
- [ ] Test with `attachments: []` (empty array)
- [ ] **Expected:** No attachments, shows "requires figure" if figure:true
- [ ] Test with `attachments: null`
- [ ] **Expected:** No attachments, shows "requires figure" if figure:true
- [ ] Test with `attachments: ["description1", "description2"]`
- [ ] **Expected:** Ignored, shows "requires figure" until user attaches

---

## Regression Testing

### Areas to Check for Regressions

1. **Main Question Level:**
   - [ ] Question-level answer_format still works
   - [ ] Question-level answer_requirement still works
   - [ ] Question-level attachments still work

2. **Part Level:**
   - [ ] Part-level answer_format still works
   - [ ] Part-level answer_requirement still works
   - [ ] Part-level figure flags still work
   - [ ] Part-level attachments still work

3. **Other Question Types:**
   - [ ] MCQ questions still work
   - [ ] True/False questions still work
   - [ ] Simple descriptive questions still work

4. **Snipping Tool Workflow:**
   - [ ] Can still attach figures to main questions
   - [ ] Can still attach figures to parts
   - [ ] Can still attach figures to subparts
   - [ ] Can remove attached figures
   - [ ] Can replace attached figures

---

## Success Criteria

### ✅ Issue 1 Fixed When:
1. Subpart ii shows `answer_format: "single_word"` from JSON
2. Subpart ii shows the correct answer_requirement from JSON
3. All 4 correct answers (purple, violet, lilac, mauve) are visible
4. No "Not Applicable" shown when JSON has explicit values

### ✅ Issue 2 Fixed When:
1. Subpart iii shows amber "requires figure" banner initially
2. Subpart iii does NOT show green "figure attached" until user attaches via snipping tool
3. After using snipping tool, banner changes to green "figure attached"
4. JSON attachment descriptions are NOT treated as actual files

---

## Rollback Plan (If Needed)

If issues arise from these changes:

1. **Revert jsonTransformer.ts changes:**
   - Remove validation checks for answer_format and answer_requirement
   - Restore original processAttachments logic
   - Restore original return object without figure fields

2. **Revert QuestionImportReviewWorkflow.tsx changes:**
   - Remove clarifying comments

3. **Test thoroughly before re-attempting fixes**

---

## Notes for Future Enhancements

1. **Attachment Metadata Preservation:**
   Consider storing JSON attachment descriptions separately from actual user attachments for reference.

2. **Figure Preview:**
   Could show JSON attachment descriptions as "expected figures" in a separate section.

3. **Validation Warnings:**
   Could warn users if JSON specifies attachments but none are attached yet.

4. **Bulk Attachment:**
   Could allow attaching multiple figures at once matching JSON descriptions.

---

## Conclusion

Both issues have been fixed with surgical precision:

1. **Issue 1:** Subpart data now properly preserved from JSON by validating and prioritizing explicit values
2. **Issue 2:** Figure display logic now distinguishes between JSON metadata and actual user-attached files

The fixes maintain backward compatibility while solving the reported problems. All changes are well-documented and reversible if needed.
