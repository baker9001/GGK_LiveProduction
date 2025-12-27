# Questions Tab - All 4 Issues Fixed

## Issues Reported & Fixes Applied

### ✅ Issue 1: Snipping Tool Component (Option) Missing

**Problem:** The "Add from PDF" button was not showing in the attachments section even when PDF was available.

**Fix Applied:**
- Updated `AttachmentDisplay.tsx` to ALWAYS show the "Add from PDF" button when PDF is available
- Added fallback button ("Upload PDF First") when figure is required but no PDF is uploaded
- Button now shows consistently for all questions, parts, and subparts

**File:** `src/.../components/AttachmentDisplay.tsx`
**Lines Changed:** 39-49

---

### ✅ Issue 2: Correct Answer Not Shown

**Problem:** For MCQ questions, only "Biology - 0610 selection 1 mark" was showing, but the actual correct answer text (e.g., "nutrition and excretion") was not displayed.

**Fix Applied:**
- Reorganized question display order: **Options FIRST**, then **Correct Answer**
- MCQ options now show BEFORE the DynamicAnswerField component
- Added proper rendering of correct answers for ALL question types (not just when answers exist)
- Added fallback display: "No correct answer provided" when answers are missing
- Ensured DynamicAnswerField always renders with `showCorrectAnswer={true}`

**File:** `src/.../components/QuestionCard.tsx`
**Lines Changed:** 273-332

**Before:**
```
Correct Answer(s)
Biology - 0610  selection  1 mark

Options
A. excretion and sensitivity
B. nutrition and excretion  ✓
...
```

**After:**
```
Options
A. excretion and sensitivity
B. nutrition and excretion  ✓  
C. respiration and growth
D. sensitivity and reproduction

Correct Answer(s)
B. nutrition and excretion
```

---

### ✅ Issue 3: Academic Mapping Not Linked Correctly

**Problem:** SearchableMultiSelect component was receiving wrong prop names, causing dropdowns to appear in incorrect locations (e.g., appearing in the middle of MCQ options).

**Root Cause:**
- `SearchableMultiSelect` expects: `label`, `selectedValues`, `onChange`
- QuestionMappingControls was passing: `value` (instead of `selectedValues`)
- Missing `label` prop
- Using `usePortal={true}` (default) which caused positioning issues inside nested containers

**Fix Applied:**
- Changed `value` prop to `selectedValues` in Topics dropdown
- Changed `value` prop to `selectedValues` in Subtopics dropdown
- Added required `label` prop for both dropdowns
- Set `usePortal={false}` to prevent dropdown escaping its container
- This ensures dropdowns render inline within their parent container

**File:** `src/.../components/QuestionMappingControls.tsx`
**Lines Changed:** 80-117

---

### ✅ Issue 4: Error in Field Placement

**Problem:** The Topics dropdown was rendering in the wrong place - appearing overlaid on the MCQ options section due to portal positioning.

**Fix Applied:**
- Disabled portal rendering (`usePortal={false}`) for both Topics and Subtopics dropdowns
- This forces dropdowns to render within their natural DOM position
- Prevents z-index and positioning conflicts
- Ensures proper stacking order within the question card

**File:** `src/.../components/QuestionMappingControls.tsx`
**Lines Changed:** 95, 115 (added `usePortal={false}`)

---

## Technical Details

### Prop Interface Corrections

**SearchableMultiSelect Component Expects:**
```typescript
interface SearchableMultiSelectProps {
  label: string;                    // Required
  options: Option[];
  selectedValues: string[];         // Not "value"
  onChange: (values: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  usePortal?: boolean;              // Default true, but we set false
}
```

**Before (Incorrect):**
```tsx
<SearchableMultiSelect
  options={...}
  value={mapping?.topic_ids || []}  // ❌ Wrong prop name
  onChange={...}
  className="w-full"
/>
```

**After (Correct):**
```tsx
<SearchableMultiSelect
  label="Topics"                     // ✅ Added
  options={...}
  selectedValues={mapping?.topic_ids || []}  // ✅ Correct prop name
  onChange={...}
  usePortal={false}                  // ✅ Prevent positioning issues
/>
```

---

## Display Order Fixed

### Question Card Content Order (Now Correct):

1. **Question Text**
2. **Attachments** (with "Add from PDF" button)
3. **MCQ Options** (if applicable) - Shows FIRST with correct answer highlighted
4. **Correct Answer(s)** (Always displayed) - Shows actual answer text
5. **Hint** (if present)
6. **Explanation** (if present)
7. **Parts** (if multi-part question)
8. **Academic Mapping** (at the bottom)

---

## Benefits of These Fixes

1. **Snipping Tool Always Accessible**
   - Users can now add figures at any time when PDF is loaded
   - Clear visual feedback when PDF is needed

2. **Clear Answer Display**
   - Correct answers now clearly visible with proper formatting
   - MCQ options show before answers for better UX
   - Students can see what the correct answer IS, not just which option letter

3. **Proper Component Positioning**
   - Dropdowns stay within their containers
   - No more overlapping content
   - Clean, professional appearance

4. **Academic Mapping Works Correctly**
   - Dropdowns respond to user interaction
   - Proper cascading: Unit → Topics → Subtopics
   - No more mysterious dropdowns appearing in wrong places

---

## Testing Checklist

✅ Build successful (no TypeScript errors)
✅ All components render in correct order
✅ MCQ options display before correct answers
✅ Correct answer text is visible
✅ "Add from PDF" button shows consistently
✅ Academic mapping dropdowns work correctly
✅ No dropdown positioning issues
✅ Multi-part questions display properly
✅ Attachments can be added to questions/parts/subparts

---

## Files Modified

1. **QuestionCard.tsx** - Fixed answer display order
2. **AttachmentDisplay.tsx** - Added persistent "Add from PDF" button
3. **QuestionMappingControls.tsx** - Fixed dropdown prop names and positioning

**Total Changes:** 3 files, ~50 lines of code adjusted

---

## Visual Improvements

**Before Issues:**
- ❌ No snipping tool button visible
- ❌ Only "Biology - 0610 selection" showing
- ❌ Dropdown appearing in wrong place
- ❌ Content overlapping

**After Fixes:**
- ✅ "Add from PDF" button always visible
- ✅ Full answer text: "B. nutrition and excretion"
- ✅ Dropdowns in correct location
- ✅ Clean, organized layout

---

## Summary

All 4 reported issues have been completely fixed with targeted, surgical code changes. The question display now follows proper IGCSE exam conventions with clear answer presentation, proper attachment management, and correct academic structure mapping.

The fixes maintain backward compatibility while significantly improving the user experience for teachers setting up exam papers.
