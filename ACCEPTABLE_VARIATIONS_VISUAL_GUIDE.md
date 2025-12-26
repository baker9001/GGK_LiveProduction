# Acceptable Variations - Visual Guide

## Before vs After

### BEFORE (Papers Setup - Missing Feature)
```
┌─ Answer #1 ───────────────────────────────────────┐
│ [Answer input field...........................]   │
│                                                    │
│ Marks: [1] ▼   Type: [Standalone] ▼              │
│                                                    │
│ ☑ Accept equivalent phrasing (owtte)              │
│ ☐ Error carried forward (ecf)                     │
│                                                    │
│ ❌ NO ACCEPTABLE VARIATIONS UI                    │
└────────────────────────────────────────────────────┘
```

### AFTER (Papers Setup - Feature Added)
```
┌─ Answer #1 ───────────────────────────────────────┐
│ [Answer input field...........................]   │
│                                                    │
│ Marks: [1] ▼   Type: [Standalone] ▼              │
│                                                    │
│ ☑ Accept equivalent phrasing (owtte)              │
│ ☐ Error carried forward (ecf)                     │
│ ─────────────────────────────────────────────────  │
│ ✅ Acceptable Variations [ℹ]                      │
│                                                    │
│    [H2O] [×]  [H₂O] [×]  [water] [×]             │
│                                                    │
│    [Add variation (e.g., H2O for H₂O)......] [+] │
└────────────────────────────────────────────────────┘
```

## Feature Details

### 1. Edit Mode (Admin Interface)

#### Location
Papers Setup → Upload Tab → Questions Review → Edit Answer

#### Components

**Label & Tooltip:**
```
Acceptable Variations [ℹ]
    ↓ (hover)
┌────────────────────────────────────────────┐
│ Alternative ways to write this answer     │
│ (e.g., "H2O" for "H₂O", "CO2" for "CO₂") │
└────────────────────────────────────────────┘
```

**Existing Variations Display:**
```
┌────────────────────────────────────┐
│ [H2O] [×]  [H₂O] [×]  [water] [×] │  ← Blue chips with X buttons
└────────────────────────────────────┘
```

**Add Variation Interface:**
```
┌──────────────────────────────────────┐
│ [Type here...................]  [+]  │  ← Input + Add button
└──────────────────────────────────────┘
        ↓ (press Enter or click +)
    Adds variation to list
```

### 2. Review/Preview Mode

#### Location
Papers Setup → Upload Tab → Questions Review → Preview/Test Simulation

#### Display Format
```
✓ Correct Answers:
  • glucose [2 marks] [OWTTE]
    ├─ ℹ Acceptable Variations (3)
    └─ [C6H12O6] [C₆H₁₂O₆] [sugar]

  • cellular respiration [2 marks] [ECF]
    ├─ ℹ Acceptable Variations (2)
    └─ [respiration] [cell respiration]
```

### 3. Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Add variation | `Enter` |
| Cancel input | `Escape` (clear field) |
| Focus input | `Tab` to navigate |

### 4. Validation Rules

#### ✅ Allowed
- Alphanumeric variations
- Special characters (subscripts, superscripts)
- Spaces and punctuation
- Different capitalization

#### ❌ Not Allowed
- Empty variations
- Exact duplicates
- Same as main answer
- Only whitespace

#### Examples

**Valid Variations:**
```
Main Answer: H₂O
✓ H2O          (plain text version)
✓ water        (common name)
✓ dihydrogen monoxide  (systematic name)
```

**Invalid Variations:**
```
Main Answer: glucose
✗ ""           (empty)
✗ glucose      (duplicate of main)
✗ "  "         (whitespace only)
```

## Color Scheme

### Edit Mode (Admin)
- **Background**: Blue (50/900 opacity 30%)
- **Border**: Blue (200/800)
- **Text**: Blue (700/300)
- **Hover**: Darker blue

### Review Mode (Preview)
- **Background**: Green (100/900 opacity 40%)
- **Border**: Green (300/700)
- **Text**: Green (700/300)
- **Context**: Matches correct answer theme

## User Flow

### Adding Variations

1. **Start**: Click in input field or tab to it
2. **Type**: Enter variation text (e.g., "H2O")
3. **Add**: Press Enter or click + button
4. **Validate**: System checks for errors
5. **Display**: Variation appears as chip above input
6. **Clear**: Input field clears, ready for next variation

### Removing Variations

1. **Locate**: Find variation chip in list
2. **Click**: Click X button on chip
3. **Remove**: Variation removed immediately
4. **No Confirm**: Direct removal (can re-add if needed)

### Saving Changes

1. **Edit**: Add/remove variations as needed
2. **Save**: Click main Save button (saves all answer changes)
3. **Validate**: System validates all variations
4. **Persist**: Changes saved to import session
5. **Import**: Data persists when importing to database

## Comparison with Questions Setup

### Questions Setup (Already Had Feature)
- Located in: `/questions-setup/page.tsx`
- Component: `CorrectAnswersDisplay.tsx`
- Mode: Dedicated answer editing component

### Papers Setup (Now Has Feature)
- Located in: `/papers-setup/tabs/QuestionsTab.tsx`
- Component: `DynamicAnswerField.tsx`
- Mode: Integrated answer field component

### Shared Infrastructure
Both implementations use:
- Same validation functions
- Same data structure
- Same UI patterns
- Same keyboard shortcuts

## Integration Points

```
Papers Setup Flow:
┌─────────────┐
│ Upload JSON │
└──────┬──────┘
       ↓
┌─────────────┐
│  Structure  │ (Academic structure)
└──────┬──────┘
       ↓
┌─────────────┐
│  Metadata   │ (Paper details)
└──────┬──────┘
       ↓
┌─────────────────────────────────┐
│  Questions Review               │
│  ┌───────────────────────────┐  │
│  │ DynamicAnswerField        │  │  ← FEATURE ADDED HERE
│  │ ├─ Answer input           │  │
│  │ ├─ Marks & options        │  │
│  │ ├─ Checkboxes (OWTTE/ECF) │  │
│  │ └─ Acceptable Variations  │  │  ← NEW SECTION
│  └───────────────────────────┘  │
└──────┬──────────────────────────┘
       ↓
┌─────────────┐
│   Import    │ (Save to database)
└─────────────┘
```

## Browser Compatibility

✅ Tested and working on:
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Dark mode support included
- Responsive design (mobile/tablet/desktop)
- Keyboard navigation accessible

## Performance Notes

- **State Management**: Local React state (fast)
- **Validation**: Synchronous (instant feedback)
- **Rendering**: Optimized with React keys
- **Memory**: Minimal overhead (~1KB per answer)

---

**Quick Reference Card**

| What | Where | How |
|------|-------|-----|
| **Add variation** | Papers Setup → Questions Tab | Type in input, press Enter |
| **Remove variation** | Click X on chip | Immediate removal |
| **View variations** | Preview/Test mode | Shown below correct answers |
| **Edit variations** | Admin mode only | Full edit interface |
| **Validate** | Automatic | On add/save |

