# Answer Expectation Auto-Population Implementation

## Overview

This document describes the implementation of enhanced answer expectation detection and auto-population for complex questions during JSON import and question creation.

## Implementation Date

October 24, 2025

## Problem Statement

Previously, complex questions with textual content but no direct answers (contextual-only questions) were not being properly identified during JSON import. The system had `not_applicable` options for `answer_format` and `answer_requirement` fields, but these were not being automatically applied to contextual questions.

## Solution Implemented

### 1. Enhanced Answer Expectation Detection

**File:** `/src/lib/extraction/answerExpectationDetector.ts`

**Enhancements:**
- Added IGCSE-specific contextual patterns to better identify questions that provide context only
- New patterns include:
  - `/is a(n)? (type of|kind of|example of)/i` - Identifies definitional statements
  - `/can be (produced|found|made|obtained)/i` - Identifies descriptive statements
  - `/was discovered (in|by)/i` - Identifies historical context
  - `/(researchers|scientists|biologists?) (in|at|measured|studied)/i` - Identifies study descriptions
  - `/histograms? of (their )?results? (are|is) shown/i` - Identifies figure references
  - And several other IGCSE exam-specific patterns

**Detection Logic:**
```typescript
export function detectAnswerExpectation(
  element: QuestionStructure,
  context?: {
    hasSubparts?: boolean;
    level?: 'main' | 'part' | 'subpart';
  }
): AnswerExpectation
```

Returns:
- `has_direct_answer`: boolean indicating if a direct answer is expected
- `is_contextual_only`: boolean indicating if question is purely contextual
- `confidence`: 'high' | 'medium' | 'low'
- `reason`: human-readable explanation

### 2. JSON Transformer Integration

**File:** `/src/lib/extraction/jsonTransformer.ts`

**Changes:**
1. **Import Added:**
   ```typescript
   import { detectAnswerExpectation } from './answerExpectationDetector';
   import { deriveAnswerFormat } from '../constants/answerOptions';
   ```

2. **Main Question Processing:**
   - Invokes `detectAnswerExpectation()` before deriving answer format/requirement
   - Sets `has_direct_answer` and `is_contextual_only` flags in returned question data
   - Passes contextual flags to `deriveAnswerFormat()` and `deriveAnswerRequirement()`

3. **Part/Subpart Processing:**
   - Same detection logic applied to each part and subpart
   - Ensures nested questions are properly classified

**Example Flow:**
```typescript
// Detect answer expectation first
const answerExpectation = detectAnswerExpectation(
  {
    question_text: questionText,
    correct_answers: correctAnswers,
    parts: imported.parts
  },
  { hasSubparts, level: 'main' }
);

// Use detected flags for auto-population
const answerFormat = deriveAnswerFormat({
  type: questionType,
  question_description: questionText,
  correct_answers: correctAnswers,
  has_direct_answer: answerExpectation.has_direct_answer,
  is_contextual_only: answerExpectation.is_contextual_only
});
```

### 3. Enhanced Answer Options Derivation

**File:** `/src/lib/constants/answerOptions.ts`

**Changes:**

1. **Updated `deriveAnswerFormat()` signature:**
   ```typescript
   export function deriveAnswerFormat(question: {
     type: string;
     question_description?: string;
     correct_answers?: any[];
     has_direct_answer?: boolean;
     is_contextual_only?: boolean;  // NEW
   }): string | null
   ```

2. **Added contextual check:**
   ```typescript
   // Contextual-only questions don't need answer format
   if (is_contextual_only === true || has_direct_answer === false) {
     return 'not_applicable';
   }
   ```

3. **Updated `deriveAnswerRequirement()` signature:**
   ```typescript
   export function deriveAnswerRequirement(question: {
     type: string;
     correct_answers?: any[];
     total_alternatives?: number;
     has_direct_answer?: boolean;    // NEW
     is_contextual_only?: boolean;   // NEW
   }): string | null
   ```

4. **Added contextual check:**
   ```typescript
   // Contextual-only questions don't need answer requirement
   if (is_contextual_only === true || has_direct_answer === false) {
     return 'not_applicable';
   }
   ```

### 4. Auto-Population Service Integration

**File:** `/src/services/answerFieldAutoPopulationService.ts`

**Changes:**

1. **Import Added:**
   ```typescript
   import { detectAnswerExpectation } from '../lib/extraction/answerExpectationDetector';
   ```

2. **Updated Interface:**
   ```typescript
   interface QuestionData {
     // ... existing fields
     has_direct_answer?: boolean | null;    // NEW
     is_contextual_only?: boolean | null;   // NEW
   }
   ```

3. **Main Questions Processing:**
   - Fetches parts/subparts to determine if question has children
   - Invokes `detectAnswerExpectation()` before deriving fields
   - Always sets `has_direct_answer` and `is_contextual_only` in database
   - Passes contextual flags to derivation functions

4. **Sub-Questions Processing:**
   - Same enhancement applied to sub-questions
   - Checks for nested subparts
   - Sets contextual flags appropriately

5. **Single Question Auto-Population:**
   - Enhanced `autoPopulateQuestionAnswerFields()` function
   - Detects contextual status for individual questions
   - Updates both contextual flags and derived fields

**Example Update Flow:**
```typescript
// Detect answer expectation first
const answerExpectation = detectAnswerExpectation(
  {
    question_text: question.question_description,
    correct_answers: correctAnswers || [],
    parts: parts || []
  },
  { hasSubparts, level: 'main' }
);

// Always set contextual flags
updates.has_direct_answer = answerExpectation.has_direct_answer;
updates.is_contextual_only = answerExpectation.is_contextual_only;

// Derive format if missing
if (!question.answer_format) {
  const derivedFormat = deriveAnswerFormat({
    type: question.type,
    question_description: question.question_description,
    correct_answers: correctAnswers || [],
    has_direct_answer: answerExpectation.has_direct_answer,
    is_contextual_only: answerExpectation.is_contextual_only
  });
  if (derivedFormat) {
    updates.answer_format = derivedFormat;
  }
}
```

## Data Flow

### JSON Import Flow

1. **JSON uploaded** → `jsonTransformer.transformImportedQuestion()`
2. **Detect answer expectation** → `detectAnswerExpectation()`
   - Analyzes question text, correct answers, and structure
   - Returns `has_direct_answer`, `is_contextual_only`, confidence, reason
3. **Derive answer format** → `deriveAnswerFormat()` with contextual flags
   - If `is_contextual_only` or `!has_direct_answer` → returns `'not_applicable'`
   - Otherwise applies standard derivation logic
4. **Derive answer requirement** → `deriveAnswerRequirement()` with contextual flags
   - If `is_contextual_only` or `!has_direct_answer` → returns `'not_applicable'`
   - Otherwise applies standard derivation logic
5. **Return transformed question** with all fields populated

### Auto-Population Service Flow

1. **Service invoked** → `autoPopulateAnswerFields(paperId?)`
2. **For each question:**
   - Fetch correct answers
   - Fetch parts/subparts
   - **Detect answer expectation** → `detectAnswerExpectation()`
   - **Update database** with:
     - `has_direct_answer`
     - `is_contextual_only`
     - `answer_format` (if missing)
     - `answer_requirement` (if missing)
3. **Return results:**
   - `questionsUpdated`: count
   - `subQuestionsUpdated`: count
   - `errors`: array of any errors

## Database Schema

The following columns are populated by this implementation:

### `questions_master_admin` table:
- `has_direct_answer` (boolean)
- `is_contextual_only` (boolean)
- `answer_format` (string)
- `answer_requirement` (string)

### `sub_questions` table:
- `has_direct_answer` (boolean)
- `is_contextual_only` (boolean)
- `answer_format` (string)
- `answer_requirement` (string)

## Example Scenarios

### Scenario 1: Contextual Main Question with Parts

**Input:**
```json
{
  "question_number": 1,
  "type": "complex",
  "question_text": "Ammonia is produced commercially in the Haber process.",
  "parts": [
    {
      "part": "a",
      "question_text": "Write the equation for the reaction.",
      "marks": 2,
      "correct_answers": [{"answer": "N2 + 3H2 → 2NH3"}]
    }
  ]
}
```

**Detection Result:**
- Main question: `has_direct_answer: false`, `is_contextual_only: true`
- Part (a): `has_direct_answer: true`, `is_contextual_only: false`

**Auto-Populated Values:**
- Main question:
  - `answer_format: 'not_applicable'`
  - `answer_requirement: 'not_applicable'`
- Part (a):
  - `answer_format: 'equation'` (derived from text analysis)
  - `answer_requirement: 'single_choice'`

### Scenario 2: MCQ Question

**Input:**
```json
{
  "question_number": 2,
  "type": "mcq",
  "question_text": "What is the chemical symbol for sodium?",
  "options": [
    {"label": "A", "text": "Na", "is_correct": true},
    {"label": "B", "text": "S"},
    {"label": "C", "text": "So"},
    {"label": "D", "text": "N"}
  ]
}
```

**Detection Result:**
- `has_direct_answer: true`, `is_contextual_only: false`

**Auto-Populated Values:**
- `answer_format: 'not_applicable'` (MCQ doesn't need text format)
- `answer_requirement: 'single_choice'`

### Scenario 3: Question with Subparts

**Input:**
```json
{
  "question_number": 3,
  "type": "complex",
  "question_text": "Fig. 1.1 shows a DNA molecule.",
  "parts": [
    {
      "part": "a",
      "question_text": "Describe the structure of DNA.",
      "subparts": [
        {
          "subpart": "i",
          "question_text": "Name the base that pairs with adenine.",
          "marks": 1,
          "correct_answers": [{"answer": "thymine"}]
        },
        {
          "subpart": "ii",
          "question_text": "State the number of strands in a DNA molecule.",
          "marks": 1,
          "correct_answers": [{"answer": "2"}]
        }
      ]
    }
  ]
}
```

**Detection Results:**
- Main question: `has_direct_answer: false`, `is_contextual_only: true`
- Part (a): `has_direct_answer: false`, `is_contextual_only: true` (has subparts)
- Subpart (i): `has_direct_answer: true`, `is_contextual_only: false` (subparts ALWAYS need answers)
- Subpart (ii): `has_direct_answer: true`, `is_contextual_only: false`

**Auto-Populated Values:**
- Main question & Part (a): `'not_applicable'` for both fields
- Subparts: appropriate format/requirement derived from analysis

## Benefits

1. **Accurate Classification**: Questions are now correctly classified as contextual or answerable
2. **Automatic Population**: No manual intervention needed for standard IGCSE exam patterns
3. **Consistency**: All questions follow the same detection and population logic
4. **Data Integrity**: Database fields are consistently populated during import
5. **IGCSE Optimized**: Patterns specifically designed for IGCSE past paper structure
6. **Extensible**: Easy to add new patterns for other exam boards (Edexcel, AQA, etc.)

## Testing Recommendations

1. **Import Sample IGCSE Biology JSON**
   - Test with `0610_21_M_J_2016_Biology_Extended_MCQ.json`
   - Verify contextual questions get `not_applicable` values

2. **Run Auto-Population Service**
   - Test on existing papers with missing fields
   - Verify `has_direct_answer` and `is_contextual_only` are set

3. **Check Complex Questions**
   - Verify parts vs subparts are handled correctly
   - Ensure nested structures preserve contextual flags

4. **Validate Different Question Types**
   - MCQ: should always be single_choice
   - Calculations: should detect from keywords
   - Diagrams: should detect from keywords
   - Essays: should allow multi_line formats

## Future Enhancements

1. **Subject-Specific Patterns**: Add patterns for Physics, Chemistry, Mathematics
2. **Exam Board Variations**: Extend patterns for Edexcel, AQA, OCR
3. **Machine Learning**: Consider ML model for more sophisticated detection
4. **Pattern Analytics**: Track which patterns are most frequently matched
5. **Confidence Thresholds**: Allow admins to set minimum confidence for auto-population

## Files Modified

1. `/src/lib/extraction/answerExpectationDetector.ts` - Enhanced patterns
2. `/src/lib/extraction/jsonTransformer.ts` - Integrated detection
3. `/src/lib/constants/answerOptions.ts` - Added contextual flag handling
4. `/src/services/answerFieldAutoPopulationService.ts` - Integrated detection
5. `/src/lib/extraction/answerRequirementDeriver.ts` - Already had contextual support

## Build Status

✅ **Build Successful** - All TypeScript compilation passed
✅ **No Breaking Changes** - Backward compatible with existing code
✅ **Type Safety** - All new parameters are optional to maintain compatibility

## Conclusion

The implementation successfully addresses the requirement to automatically detect contextual questions and populate `answer_format` and `answer_requirement` fields with `'not_applicable'` values during JSON import and question creation. The enhanced detection logic is specifically optimized for IGCSE exam papers and can be extended to support other exam boards.
