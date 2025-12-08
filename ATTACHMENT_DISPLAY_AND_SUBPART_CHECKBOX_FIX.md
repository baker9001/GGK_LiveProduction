# Attachment Display Logic and Subpart Checkbox Implementation

## Issues Fixed

### Issue 1: Incorrect "Figure attached" Message
**Problem:** The system displayed "Figure attached to this part/subpart" even when no actual file was attached via the snipping tool. This happened because the system treated JSON metadata descriptions (e.g., "Fig. 1.1 showing test tubes") as actual uploaded files.

**Root Cause:** The attachment detection logic checked only `attachments.length > 0`, which included text descriptions from JSON imports.

**Solution:** Updated the detection logic to specifically check for actual uploaded files by verifying that `file_url` starts with `data:` (indicating a data URL from the snipping tool).

### Issue 2: Missing "Figure attachment required" Checkbox on Subparts
**Problem:** Main questions and parts had a "Figure attachment required" checkbox, but subparts were missing this functionality entirely.

**Root Cause:** The UI component simply didn't include the checkbox for subparts.

**Solution:** Added the checkbox UI for subparts following the same pattern used for questions and parts.

## Changes Made

### File: `src/components/shared/QuestionImportReviewWorkflow.tsx`

#### 1. Fixed Part Attachment Detection (Line ~2433)
**Before:**
```typescript
const partHasAttachments = Array.isArray(part.attachments) ? part.attachments.length > 0 : false;
```

**After:**
```typescript
const partHasAttachments = Array.isArray(part.attachments)
  ? part.attachments.some(att => att.file_url?.startsWith('data:'))
  : false;
```

#### 2. Fixed Subpart Attachment Detection (Line ~2679)
**Before:**
```typescript
const subHasAttachments = Array.isArray(subpart.attachments)
  ? subpart.attachments.length > 0
  : false;
```

**After:**
```typescript
const subHasAttachments = Array.isArray(subpart.attachments)
  ? subpart.attachments.some(att => att.file_url?.startsWith('data:'))
  : false;
```

#### 3. Added Subpart "Figure Required" Checkbox (Line ~2872)
**New Addition:**
```typescript
<div className="flex flex-wrap items-center gap-3">
  <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
    <input
      type="checkbox"
      checked={subRequiresFigure}
      onChange={(event) => handleSubpartFieldChange(question, partIndex, subIndex, { 
        figure_required: event.target.checked 
      })}
      className="h-4 w-4 rounded border-gray-300 text-[#8CC63F] focus:ring-[#8CC63F]"
    />
    Figure required for this subpart
  </label>
</div>
```

## How It Works Now

### Attachment Status Logic

1. **JSON Import with `figure: true`**
   - Shows amber banner: "This part/subpart requires a supporting figure"
   - Checkbox is checked
   - "Figure attached" message does NOT appear

2. **After Snipping Tool Upload**
   - Attachment with `file_url: "data:image/..."` is added
   - Banner changes to green: "Figure attached to this part/subpart"
   - "Launch snipping tool" button changes to outline variant

3. **Unchecking the Checkbox**
   - Removes the figure requirement
   - No banner appears
   - Validation warnings removed

### Database Support

The `figure_required` field is supported at all three levels:
- `questions_master_admin.figure_required` (main question)
- `sub_questions.figure_required` (parts)
- `sub_questions.figure_required` (subparts)

Migration: `20251012180000_add_figure_required_toggle.sql`

## Testing Checklist

✅ **JSON Import Behavior**
- [ ] Import JSON with `figure: true` shows amber "requires figure" banner
- [ ] Does NOT show green "Figure attached" banner initially
- [ ] Checkbox is checked by default for questions/parts/subparts with `figure: true`

✅ **Snipping Tool Upload**
- [ ] Using snipping tool changes banner from amber to green
- [ ] Message changes to "Figure attached to this question/part/subpart"
- [ ] Button changes from default to outline variant

✅ **Checkbox Functionality**
- [ ] Main question checkbox works (existing functionality)
- [ ] Part checkbox works (existing functionality)
- [ ] Subpart checkbox appears and works (NEW)
- [ ] Unchecking removes figure requirement warnings
- [ ] Checking adds figure requirement back

✅ **Data Persistence**
- [ ] Checkbox state persists in the question data structure
- [ ] Changes are saved to database correctly
- [ ] State maintained when navigating between questions

## Benefits

1. **Clear Distinction**: Users can now clearly see the difference between:
   - A figure that is REQUIRED (from JSON analysis or manual checkbox)
   - A figure that has been ATTACHED (actual file uploaded)

2. **Complete Control**: All three levels (question, part, subpart) now have consistent checkbox controls

3. **Better UX**: No more confusion about whether a figure has actually been attached when it's just a JSON reference

4. **Accurate Validation**: System only validates actual uploaded files, not metadata descriptions

## Technical Notes

- Data URLs from snipping tool always start with `data:image/png;base64,` or similar
- JSON metadata descriptions are plain text without `data:` prefix
- The `file_url` field is the discriminator between actual files and metadata
- The `handleSubpartFieldChange` function properly updates the `figure_required` field in state
- Build completed successfully with no errors
