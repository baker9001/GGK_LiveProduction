# Mock Exam Wizard UI/UX Improvements

## Issues Fixed

### 1. Body Scroll Lock When Modal Opens
**Problem:** When the wizard modal was open, users could still scroll the main page behind it, causing confusion and poor UX.

**Solution:** Implemented body scroll lock that disables scrolling on the main page while the modal is active, only allowing scroll within the modal itself.

### 2. Question Bank Dropdown Hidden Behind Modal
**Problem:** When clicking on the "Add bank questions" dropdown, the question list appeared but was hidden behind the wizard modal due to incorrect z-index stacking.

**Solution:** Increased the z-index of the SearchableMultiSelect dropdown from `z-50` to `z-[150]` to ensure it appears above the modal (which uses `z-[100]`).

## Changes Made

### File 1: StatusTransitionWizard.tsx

#### Change 1: Body Scroll Lock Effect
**Location:** Lines 457-472

**Before:**
```typescript
useEffect(() => {
  if (isOpen) {
    setActiveStage(currentStatus);
    setStageErrors({});
  }
}, [isOpen, currentStatus]);
```

**After:**
```typescript
useEffect(() => {
  if (isOpen) {
    setActiveStage(currentStatus);
    setStageErrors({});
    // Disable body scroll when modal opens
    document.body.style.overflow = 'hidden';
  } else {
    // Re-enable body scroll when modal closes
    document.body.style.overflow = '';
  }

  // Cleanup function to ensure scroll is re-enabled
  return () => {
    document.body.style.overflow = '';
  };
}, [isOpen, currentStatus]);
```

**What it does:**
- Sets `overflow: hidden` on document.body when modal opens
- Restores normal scroll when modal closes
- Includes cleanup function to ensure scroll is always restored (e.g., if component unmounts)

#### Change 2: Modal Container Scroll
**Location:** Line 964

**Before:**
```tsx
<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4 py-6">
  <div className="w-full max-w-6xl rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
```

**After:**
```tsx
<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4 py-6 overflow-y-auto">
  <div className="w-full max-w-6xl rounded-2xl bg-white shadow-2xl dark:bg-gray-900 my-6">
```

**What it does:**
- Adds `overflow-y-auto` to modal container to allow vertical scrolling within the modal
- Adds `my-6` margin to prevent modal from touching screen edges when scrolling

### File 2: SearchableMultiSelect.tsx

#### Change: Increased Dropdown Z-Index
**Location:** Lines 272, 281, 290

**Before:**
```typescript
className="z-50 rounded-md border border-gray-200..."
style={usePortal ? {
  // ...
  // No zIndex in style
} : {
  // ...
  zIndex: 50,
  // ...
}}
```

**After:**
```typescript
className="z-[150] rounded-md border border-gray-200..."
style={usePortal ? {
  // ...
  zIndex: 150
} : {
  // ...
  zIndex: 150,
  // ...
}}
```

**What it does:**
- Changes z-index from `50` to `150` (higher than modal's `100`)
- Applies to both portal and non-portal rendering modes
- Ensures dropdown always appears above modal content

## Z-Index Hierarchy

For reference, the z-index stacking order is now:

```
150 - SearchableMultiSelect dropdown (top layer - always visible)
100 - Status Transition Wizard modal
 50 - Other modal components
  1 - Regular page elements
```

## Testing Results

✅ **Build Status:** Successful
✅ **Body Scroll:** Locked when modal opens, restored when closed
✅ **Modal Scroll:** Works independently inside the modal
✅ **Dropdown Visibility:** Question bank dropdown now appears above modal content
✅ **Cleanup:** Body scroll properly restored on modal close or unmount

## Expected Behavior After Fix

### Body Scroll Lock
- **When wizard opens:** Main page cannot be scrolled
- **Inside wizard:** Content can be scrolled normally
- **When wizard closes:** Main page scroll is restored
- **On component unmount:** Body scroll is always restored (cleanup)

### Question Dropdown
- **Click "Add bank questions":** Dropdown appears above all modal content
- **Dropdown is fully visible:** No content hidden behind modal
- **Questions can be selected:** All interaction works as expected
- **Search works:** Search box and results are fully accessible

## Benefits

1. **Better Focus:** Users stay focused on the modal without distraction from background page
2. **Improved UX:** Clear visual hierarchy with dropdown properly layered
3. **Prevents Confusion:** No accidental scrolling of background content
4. **Professional Feel:** Modal behavior matches standard web application patterns
5. **Accessibility:** Proper focus management and content layering

## Files Modified

1. `/src/app/entity-module/mock-exams/components/StatusTransitionWizard.tsx`
   - Added body scroll lock effect
   - Added overflow-y-auto to modal container
   - Added vertical margin for better spacing

2. `/src/components/shared/SearchableMultiSelect.tsx`
   - Increased dropdown z-index from 50 to 150
   - Applied z-index to both portal and non-portal modes
   - Ensured consistent stacking across all dropdown instances
