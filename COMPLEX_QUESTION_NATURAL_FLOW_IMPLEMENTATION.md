# Complex Question Natural Flow Implementation

## Overview
Enhanced the `EnhancedComplexQuestionDisplay` component to provide a natural, paper-like display for complex questions with parts and subparts, especially for test simulation and practice modes.

## Problem Addressed
The previous implementation used collapsible sections for all display modes, which didn't match the natural reading flow of actual past papers. Students expected to see:
- Question text flowing naturally into part labels
- Part labels (a, b, c) displayed inline with part text
- Subpart labels (i, ii, iii) shown with roman numerals
- Answer fields only appearing for parts that require answers
- Contextual-only parts displayed without answer inputs

## Solution Implemented

### 1. Context-Aware Display Modes
The component now checks the `context` prop and displays differently based on mode:

**Natural Flow Mode** (for `practice`, `test`, `simulation`):
- Non-collapsible, paper-like display
- Parts shown with inline labels: `(a) Part text [marks]`
- Subparts shown with roman numerals: `(i) Subpart text [marks]`
- Natural indentation hierarchy
- Answer fields appear only when `has_direct_answer` is true

**Collapsible Mode** (for `admin`, `review`, `qa`):
- Traditional expandable sections with chevron icons
- Metadata badges and contextual indicators
- Full administrative controls
- Detailed statistics and flags

### 2. Natural Text Flow Structure

```
Question 1 [Complex]

[Question text with contextual information]

(a) First part text [3 marks]
    [Answer field if required]

    (i) First subpart text [1 mark]
        [Answer field]

    (ii) Second subpart text [1 mark]
        [Answer field]

(b) Second part text [2 marks]
    [Answer field if required]
```

### 3. Key Features

#### Part Display (Natural Flow)
- Bold part label in parentheses: `(a)`
- Part text flows naturally after the label
- Marks displayed in square brackets on the right: `[3 marks]`
- Indented answer fields (6 units left margin)
- Indented subparts (6 units left margin)

#### Subpart Display (Natural Flow)
- Roman numeral labels: `(i)`, `(ii)`, `(iii)`, etc.
- Smaller font for hierarchy differentiation
- Proper nesting under parts
- Answer fields indented under subpart text

#### Answer Field Logic
- Uses `configShouldShowInput()` from DisplayConfigFactory
- Checks `has_direct_answer` flag
- Respects `is_contextual_only` flag
- Only displays fields when answers are expected

### 4. Display Configuration Integration

The component properly uses the DisplayConfigFactory system:
- Respects all display flags (`showMarks`, `showHints`, `showExplanations`)
- Handles attachment display
- Shows metadata when appropriate
- Manages answer input permissions

## Files Modified

- `/tmp/cc-agent/54326970/project/src/components/shared/EnhancedComplexQuestionDisplay.tsx`
  - Updated `renderPart()` to support natural flow display
  - Updated `renderSubpart()` to use roman numerals
  - Added context detection for display mode switching
  - Maintained backward compatibility with collapsible mode

## Usage Example

```tsx
import EnhancedComplexQuestionDisplay from '@/components/shared/EnhancedComplexQuestionDisplay';

// For test simulation (natural flow)
<EnhancedComplexQuestionDisplay
  question={complexQuestion}
  value={userAnswer}
  onChange={handleAnswerChange}
  context="practice"  // or "test" or "simulation"
/>

// For admin review (collapsible)
<EnhancedComplexQuestionDisplay
  question={complexQuestion}
  value={userAnswer}
  onChange={handleAnswerChange}
  context="admin"  // or "review" or "qa"
/>
```

## Benefits

1. **Student Experience**: Natural reading flow matches actual past papers
2. **Clarity**: Clear visual hierarchy with proper indentation
3. **Flexibility**: Different display modes for different contexts
4. **Accessibility**: Proper semantic structure and spacing
5. **Maintainability**: Clean code with clear separation of concerns

## Technical Details

### Roman Numeral Conversion
```typescript
const romanNumerals = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'];
const romanLabel = subpart.subpart_label || romanNumerals[subpartIndex] || String(subpartIndex + 1);
```

### Natural Flow Detection
```typescript
const useNaturalFlow = context === 'practice' || context === 'test' || context === 'simulation';
```

### Answer Input Logic
```typescript
const showAnswer = configShouldShowInput(part, displayConfig);
// Only renders DynamicAnswerField when showAnswer is true
```

## Testing Recommendations

1. Test with complex questions that have:
   - Contextual-only parts (no answers expected)
   - Mixed parts (some with answers, some contextual)
   - Multiple levels of subparts
   - Various mark allocations

2. Verify display in different contexts:
   - Practice mode (natural flow)
   - Test simulation (natural flow)
   - Admin review (collapsible)
   - QA mode (collapsible)

3. Check responsive behavior:
   - Mobile devices
   - Tablet sizes
   - Desktop displays

## Future Enhancements

1. Support for more than 10 subparts (extend roman numerals)
2. Configurable part label styles (uppercase, lowercase, etc.)
3. Print-friendly CSS for paper export
4. Enhanced accessibility features (ARIA labels)
5. Animation transitions between display modes

## Related Files

- `src/lib/display/DisplayConfigFactory.ts` - Display configuration system
- `src/types/questions.ts` - Question type definitions
- `src/components/shared/DynamicAnswerField.tsx` - Answer input component
- `src/components/shared/UnifiedTestSimulation.tsx` - Test simulation container

## Build Status

✅ Build completed successfully
✅ No TypeScript errors
✅ All imports resolved correctly
