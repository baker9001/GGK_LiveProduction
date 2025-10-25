# Contextual Part Answer Logic Fix

## Issue Identified

When displaying complex questions in test simulation, parts that serve only as contextual text (introducing subparts) were incorrectly showing answer input fields, even though no answers were expected for those parts.

### Example from JSON
```json
{
  "part": "a",
  "subparts": [
    {
      "subpart": "i",
      "question_text": "Explain why doctors give antibiotics...",
      "correct_answers": [...]
    },
    {
      "subpart": "ii",
      "question_text": "Explain why it is important to complete...",
      "correct_answers": [...]
    }
  ]
  // NOTE: No correct_answers at part level - only subparts have answers
}
```

In this case, Part (a) is purely contextual - it groups the subparts together but doesn't expect its own answer.

## Root Cause

The `shouldShowAnswerInput()` function in `DisplayConfigFactory.ts` was checking for:
1. `is_container` flag
2. `has_direct_answer` flag

However, when JSON imports don't explicitly set these flags (which is common), the logic defaulted to showing answer inputs.

## Solution Implemented

Added an additional check in `shouldShowAnswerInput()` to detect contextual-only parts:

```typescript
// CRITICAL: If element has no correct_answers array (or it's empty) and has subparts,
// it's a contextual-only part - don't show answer input
if (
  element.subparts &&
  element.subparts.length > 0 &&
  (!element.correct_answers || element.correct_answers.length === 0)
) {
  return false;
}
```

### Logic Flow

The function now checks (in order):

1. **Container Flag**: If `hideInputForContainers` is enabled and element is marked as container → hide input
2. **Direct Answer Flag**: If `has_direct_answer` is explicitly `false` → hide input
3. **NEW: Structural Check**: If element has subparts BUT no correct_answers → hide input (contextual-only)
4. **Default**: Follow configuration settings

## Files Modified

- `/tmp/cc-agent/54326970/project/src/lib/display/DisplayConfigFactory.ts`
  - Updated `shouldShowAnswerInput()` function
  - Added `correct_answers` and `subparts` to element type definition
  - Added structural check for contextual-only detection

## Benefits

1. **Automatic Detection**: No need for explicit `is_container` or `has_direct_answer` flags in JSON
2. **Backward Compatible**: Works with both flagged and unflagged JSON structures
3. **Intuitive Behavior**: Parts with only subparts naturally don't show answer fields
4. **Reduced Data Redundancy**: JSON files don't need to explicitly mark every contextual part

## Test Cases

### Should NOT Show Answer Input

1. Part with subparts, no `correct_answers`:
   ```json
   {
     "part": "a",
     "subparts": [...]
     // No correct_answers
   }
   ```

2. Part with empty `correct_answers` array and subparts:
   ```json
   {
     "part": "a",
     "correct_answers": [],
     "subparts": [...]
   }
   ```

3. Part with `has_direct_answer: false`:
   ```json
   {
     "part": "a",
     "has_direct_answer": false,
     "subparts": [...]
   }
   ```

### Should Show Answer Input

1. Part with `correct_answers` and subparts (compound answer):
   ```json
   {
     "part": "a",
     "correct_answers": [...],
     "subparts": [...]
   }
   ```

2. Part with `correct_answers`, no subparts:
   ```json
   {
     "part": "a",
     "correct_answers": [...]
   }
   ```

3. Subparts always show inputs (if they have `correct_answers`):
   ```json
   {
     "subpart": "i",
     "correct_answers": [...]
   }
   ```

## Display Behavior

### Before Fix
```
Question 1

(a) [INCORRECT: Showed answer input here]

    (i) Subpart question [Correct: Shows answer input]
    (ii) Subpart question [Correct: Shows answer input]
```

### After Fix
```
Question 1

(a) [CORRECT: No answer input]

    (i) Subpart question [Shows answer input]
    (ii) Subpart question [Shows answer input]
```

## Related Components

- `EnhancedComplexQuestionDisplay.tsx` - Uses `shouldShowAnswerInput()`
- `DynamicAnswerField.tsx` - Rendered conditionally based on this logic
- Question import/transformation services - May set explicit flags

## Future Considerations

1. **Import Validation**: Consider auto-setting `has_direct_answer` flag during JSON import for clarity
2. **Admin Preview**: Show visual indicator in QA mode when parts are contextual-only
3. **Marks Distribution**: Ensure part marks correctly sum subpart marks for contextual parts
4. **Answer Submission**: Validate that answers aren't accidentally saved for contextual parts

## Build Status

✅ Build completed successfully
✅ No TypeScript errors
✅ Logic tested with sample JSON structure
✅ Backward compatible with existing data
