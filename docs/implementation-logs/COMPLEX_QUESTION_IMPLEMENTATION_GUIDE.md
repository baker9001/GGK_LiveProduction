# Complex Question Implementation Guide

## Overview

This guide documents the complete implementation of Complex question type support in the question-answer system. Complex questions are multi-part, hierarchical questions with parts (a, b, c) and subparts (i, ii, iii) that require different answer formats.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Type Definitions](#type-definitions)
3. [Components](#components)
4. [Data Flow](#data-flow)
5. [Validation Logic](#validation-logic)
6. [Usage Examples](#usage-examples)
7. [Testing Guide](#testing-guide)

---

## Architecture Overview

### Key Features

- **Hierarchical Structure**: Support for main question → parts → subparts (up to 3 levels)
- **Multiple Answer Formats**: Single word, multi-line, calculation, table completion, etc.
- **Alternative Answers**: Support for linked alternatives with different types (one_required, all_required)
- **Intelligent Validation**: Format validation, requirement checking, and partial credit calculation
- **Collapsible UI**: Expandable/collapsible parts and subparts for better UX
- **Backward Compatible**: All existing MCQ functionality preserved

### Technology Stack

- **TypeScript**: Type-safe interfaces for Complex questions
- **React**: Component-based UI architecture
- **Supabase**: Database storage for questions and answers
- **Tailwind CSS**: Modern, responsive styling

---

## Type Definitions

### Core Types (src/types/questions.ts)

#### ComplexQuestionPart
```typescript
export interface ComplexQuestionPart {
  id: string;
  part_label: string;           // e.g., "a", "b", "c"
  question_text: string;
  marks: number;
  answer_format?: AnswerFormat;
  answer_requirement?: AnswerRequirement;
  correct_answers: QuestionCorrectAnswer[];
  options?: QuestionOption[];
  attachments?: QuestionAttachment[];
  hint?: string;
  explanation?: string;
  subparts?: ComplexQuestionSubpart[];
  figure?: boolean;
  context_metadata?: Record<string, any>;
}
```

#### ComplexQuestionSubpart
```typescript
export interface ComplexQuestionSubpart {
  id: string;
  subpart_label: string;        // e.g., "i", "ii", "iii"
  question_text: string;
  marks: number;
  answer_format?: AnswerFormat;
  answer_requirement?: AnswerRequirement;
  correct_answers: QuestionCorrectAnswer[];
  options?: QuestionOption[];
  attachments?: QuestionAttachment[];
  hint?: string;
  explanation?: string;
  figure?: boolean;
  context_metadata?: Record<string, any>;
}
```

#### Answer Formats
```typescript
export type AnswerFormat =
  | 'single_word'           // Single word answer
  | 'single_line'           // Single line text
  | 'multi_line'            // Multi-line text area
  | 'multi_line_labeled'    // Multi-line with labels (A:, B:, etc.)
  | 'calculation'           // Numeric with working and unit
  | 'equation'              // Mathematical equation
  | 'table_completion'      // Fill in table cells
  | 'two_items'             // Two separate items
  | 'two_items_connected'   // Two items with AND/OR logic
  | ... (more formats)
```

#### Answer Requirements
```typescript
export type AnswerRequirement =
  | 'any_one_from'          // Any one correct answer
  | 'any_2_from'            // Any two correct answers
  | 'any_3_from'            // Any three correct answers
  | 'both_required'         // Both answers required
  | 'all_required'          // All answers required
  | 'alternative_methods'   // Alternative solution methods
  | 'acceptable_variations' // Acceptable answer variations
```

#### Alternative Types
```typescript
export type AlternativeType =
  | 'standalone'                // Independent answer
  | 'one_required'              // One of several alternatives
  | 'all_required'              // All must be present
  | 'structure_function_pair'   // Paired answers
  | 'two_required'              // Two of several alternatives
  | 'three_required'            // Three of several alternatives
```

### Enhanced QuestionCorrectAnswer

The `QuestionCorrectAnswer` interface now includes:

```typescript
export interface QuestionCorrectAnswer {
  id: string;
  question_id: string | null;
  sub_question_id: string | null;
  answer: string;
  marks: number | null;

  // Alternative linking
  alternative_id: number | null;
  linked_alternatives?: number[];
  alternative_type?: AlternativeType;

  // Context metadata
  context_type: string | null;
  context_value: string | null;
  context_label: string | null;

  // Answer flexibility
  unit?: string | null;
  accepts_equivalent_phrasing?: boolean;
  accepts_reverse_argument?: boolean;
  error_carried_forward?: boolean;
  acceptable_variations?: string[];

  // Marking flags
  marking_flags?: {
    accepts_reverse_argument?: boolean;
    accepts_equivalent_phrasing?: boolean;
    accepts_mathematical_notation?: boolean;
    case_insensitive?: boolean;
    accepts_abbreviated_forms?: boolean;
    ignore_articles?: boolean;
    accepts_symbolic_notation?: boolean;
  };

  created_at: string;
}
```

---

## Components

### 1. ComplexQuestionDisplay Component

**Location**: `src/components/shared/ComplexQuestionDisplay.tsx`

**Purpose**: Main component for displaying and interacting with Complex questions

**Features**:
- Hierarchical rendering of parts and subparts
- Expandable/collapsible sections
- Mark allocation display at each level
- Attachment handling for figures/diagrams
- Hint and explanation display
- Integration with DynamicAnswerField for answer input

**Usage**:
```typescript
import ComplexQuestionDisplay from '@/components/shared/ComplexQuestionDisplay';

<ComplexQuestionDisplay
  question={complexQuestion}
  value={currentAnswer}
  onChange={handleAnswerChange}
  mode="practice"
  showHints={true}
  showCorrectAnswers={false}
  disabled={false}
/>
```

**Props**:
- `question`: ComplexQuestionDisplay - The question data
- `value`: ComplexQuestionAnswer - Current answer state
- `onChange`: (value: ComplexQuestionAnswer) => void - Answer change handler
- `mode`: 'practice' | 'exam' | 'review' | 'admin' | 'qa_preview' - Display mode
- `showHints`: boolean - Show hint sections
- `showCorrectAnswers`: boolean - Show correct answers
- `disabled`: boolean - Disable input fields

### 2. ComplexAnswerInput Component

**Location**: `src/components/shared/ComplexAnswerInput.tsx`

**Purpose**: Specialized input component for different Complex question answer formats

**Features**:
- Format-specific input rendering
- Real-time validation feedback
- Character/word counting
- Scientific notation support
- Calculation input with working and units

**Supported Formats**:

1. **Single Word**
   - Single text input
   - Word count validation
   - Visual feedback for multi-word entries

2. **Single Line**
   - Full-width text input
   - Character counter
   - No line breaks allowed

3. **Multi-line**
   - Expandable text area
   - Character and word counters
   - Auto-resizing

4. **Two Items / Two Items Connected**
   - Dual input fields
   - AND/OR connector display
   - Validation for both items

5. **Calculation**
   - Working/steps text area
   - Final answer numeric input
   - Unit selector/input
   - Visual grouping

6. **Table Completion**
   - Structured table input
   - Cell-by-cell entry
   - JSON representation

7. **Scientific Notation**
   - Integration with ScientificEditor
   - Support for equations, chemical structures
   - Subject-specific formatting

**Usage**:
```typescript
import ComplexAnswerInput from '@/components/shared/ComplexAnswerInput';

<ComplexAnswerInput
  answerFormat="calculation"
  value={currentValue}
  onChange={handleChange}
  placeholder="Enter your calculation"
  marks={3}
  subject="Physics"
  showValidation={true}
/>
```

---

## Data Flow

### 1. JSON Import Flow

```
Raw JSON → jsonTransformer.ts → Database Tables → Frontend Display
```

**Steps**:

1. **JSON Parsing** (`src/lib/extraction/jsonTransformer.ts`)
   - Detect question type (auto-detect if parts/subparts present)
   - Parse hierarchical structure
   - Extract correct answers with metadata
   - Process attachments and figures

2. **Database Storage**
   - Main question → `questions_master_admin` table
   - Parts → `sub_questions` table (level 1)
   - Subparts → `sub_questions` table (level 2)
   - Correct answers → `question_correct_answers` table
   - Attachments → `question_attachments` table

3. **Data Retrieval**
   - Recursive query to fetch question with all parts
   - Join with correct_answers and attachments
   - Assemble hierarchical structure

### 2. Answer Submission Flow

```
User Input → Component State → Validation → Database Storage
```

**Answer Structure**:
```typescript
{
  question_id: "q-1",
  parts: [
    {
      part_id: "q-1-a",
      part_label: "a",
      answer: "mitochondria",
      subparts: [
        {
          subpart_id: "q-1-a-i",
          subpart_label: "i",
          answer: "ATP production"
        },
        {
          subpart_id: "q-1-a-ii",
          subpart_label: "ii",
          answer: "cellular respiration"
        }
      ]
    },
    {
      part_id: "q-1-b",
      part_label: "b",
      answer: "chloroplast"
    }
  ]
}
```

---

## Validation Logic

### ComplexQuestionValidation Module

**Location**: `src/lib/validation/complexQuestionValidation.ts`

### Key Functions

#### 1. validateComplexQuestion
```typescript
function validateComplexQuestion(
  question: ComplexQuestionDisplay,
  answer: ComplexQuestionAnswer
): ComplexQuestionValidationResult
```

**Purpose**: Validate entire Complex question answer

**Returns**:
```typescript
{
  isValid: boolean,
  errors: ValidationError[],
  warnings: ValidationWarning[],
  partValidations: PartValidation[]
}
```

#### 2. checkAnswerCorrectness
```typescript
function checkAnswerCorrectness(
  studentAnswer: any,
  correctAnswers: QuestionCorrectAnswer[],
  answerFormat?: string
): {
  isCorrect: boolean;
  matchedAnswer?: QuestionCorrectAnswer;
  partialCredit?: number;
}
```

**Features**:
- Answer normalization
- Multiple correct answer checking
- Equivalent phrasing detection (OWTTE)
- Reverse argument detection (ORA)
- Partial credit calculation

#### 3. calculateComplexQuestionMarks
```typescript
function calculateComplexQuestionMarks(
  question: ComplexQuestionDisplay,
  answer: ComplexQuestionAnswer
): {
  totalMarks: number;
  maxMarks: number;
  breakdown: MarkBreakdown[];
}
```

**Purpose**: Calculate marks for Complex question with detailed breakdown

### Validation Features

1. **Format Validation**
   - Single word: Exactly one word
   - Calculation: Numeric value + unit required
   - Two items: Both items must be provided

2. **Requirement Validation**
   - any_2_from: At least 2 answers required
   - both_required: Both items must be present
   - all_required: All specified answers required

3. **Answer Matching**
   - Exact match
   - Case-insensitive matching
   - Acceptable variations
   - Equivalent phrasing (70% word overlap)
   - Reverse argument detection

4. **Partial Credit**
   - Calculation: Credit for showing working
   - Multi-line: Credit for partially correct answers
   - Configurable per question

---

## Usage Examples

### Example 1: Basic Complex Question

```json
{
  "question_number": "1",
  "type": "complex",
  "topic": "Cell Biology",
  "question_text": "The diagram shows a plant cell.",
  "figure": true,
  "marks": 5,
  "parts": [
    {
      "part": "a",
      "question_text": "Name the organelle labeled X.",
      "marks": 1,
      "answer_format": "single_word",
      "correct_answers": [
        {
          "answer": "chloroplast",
          "marks": 1,
          "alternative_id": 1
        }
      ]
    },
    {
      "part": "b",
      "subparts": [
        {
          "subpart": "i",
          "question_text": "State the function of this organelle.",
          "marks": 2,
          "answer_format": "single_line",
          "correct_answers": [
            {
              "answer": "photosynthesis",
              "marks": 2,
              "alternative_id": 1,
              "accepts_equivalent_phrasing": true
            },
            {
              "answer": "converts light energy to chemical energy",
              "marks": 2,
              "alternative_id": 2,
              "accepts_equivalent_phrasing": true
            }
          ]
        },
        {
          "subpart": "ii",
          "question_text": "Explain why this organelle is essential for plant survival.",
          "marks": 2,
          "answer_format": "multi_line",
          "answer_requirement": "any_2_from",
          "correct_answers": [
            {
              "answer": "produces glucose",
              "marks": 1,
              "alternative_id": 1
            },
            {
              "answer": "provides energy for plant",
              "marks": 1,
              "alternative_id": 2
            },
            {
              "answer": "releases oxygen",
              "marks": 1,
              "alternative_id": 3
            }
          ]
        }
      ]
    }
  ]
}
```

### Example 2: Calculation Question

```json
{
  "question_number": "3",
  "type": "complex",
  "topic": "Physics - Mechanics",
  "question_text": "A car accelerates uniformly.",
  "marks": 4,
  "parts": [
    {
      "part": "a",
      "question_text": "Calculate the final velocity. Show your working.",
      "marks": 3,
      "answer_format": "calculation",
      "correct_answers": [
        {
          "answer": "25",
          "unit": "m/s",
          "marks": 3,
          "alternative_id": 1,
          "working": "v = u + at = 5 + (4 × 5) = 25 m/s"
        }
      ]
    },
    {
      "part": "b",
      "question_text": "State the equation used.",
      "marks": 1,
      "answer_format": "equation",
      "correct_answers": [
        {
          "answer": "v = u + at",
          "marks": 1,
          "alternative_id": 1
        }
      ]
    }
  ]
}
```

### Example 3: Using the Components

```typescript
import React, { useState } from 'react';
import ComplexQuestionDisplay from '@/components/shared/ComplexQuestionDisplay';
import { ComplexQuestionAnswer } from '@/types/questions';

function ExamPage() {
  const [answer, setAnswer] = useState<ComplexQuestionAnswer>();

  const handleAnswerChange = (newAnswer: ComplexQuestionAnswer) => {
    setAnswer(newAnswer);
    // Auto-save or validate
  };

  return (
    <div className="p-6">
      <ComplexQuestionDisplay
        question={complexQuestion}
        value={answer}
        onChange={handleAnswerChange}
        mode="exam"
        showHints={false}
        showCorrectAnswers={false}
      />
    </div>
  );
}
```

---

## Testing Guide

### Manual Testing Checklist

1. **Display Testing**
   - [ ] Question header shows correctly
   - [ ] Parts expand/collapse smoothly
   - [ ] Subparts expand/collapse smoothly
   - [ ] Mark allocation displayed at each level
   - [ ] Attachments render correctly
   - [ ] Hints show when enabled
   - [ ] Explanations show in review mode

2. **Answer Input Testing**
   - [ ] Single word: Validates one word only
   - [ ] Single line: No line breaks allowed
   - [ ] Multi-line: Text area expands
   - [ ] Calculation: Working + value + unit fields
   - [ ] Two items: Both inputs functional
   - [ ] Table completion: JSON input works

3. **Validation Testing**
   - [ ] Required answers flagged when missing
   - [ ] Format validation works correctly
   - [ ] Equivalent answers accepted (OWTTE)
   - [ ] Partial credit calculated correctly

4. **Marking Testing**
   - [ ] Correct answers marked correctly
   - [ ] Incorrect answers not given marks
   - [ ] Partial credit awarded appropriately
   - [ ] Mark breakdown calculated correctly

### Test Data

Use the provided JSON file:
`/tmp/cc-agent/54326970/project/JSON/0610_21_M_J_2016_Biology_Extended_MCQ.json`

This contains Complex questions with:
- Multiple parts and subparts
- Various answer formats
- Alternative answers with metadata
- Linked alternatives
- Context information

---

## Database Schema

### Existing Tables (No Changes Required)

The implementation uses existing tables:

1. **questions_master_admin**
   - Stores main Complex question
   - `type` = 'complex'

2. **sub_questions**
   - Stores parts (level 1) and subparts (level 2)
   - `parent_id` links to parent
   - `level` indicates hierarchy level

3. **question_correct_answers**
   - Stores correct answers for questions and sub_questions
   - Links via `question_id` or `sub_question_id`

4. **question_attachments**
   - Stores figures/diagrams
   - Links to questions or sub_questions

5. **question_options**
   - Stores MCQ options (if part/subpart is MCQ)

### Enhanced Columns

The following columns in `question_correct_answers` support Complex questions:

- `alternative_id`: Unique ID within question
- `linked_alternatives`: JSON array of linked IDs
- `alternative_type`: Type of alternative
- `context_type`, `context_value`, `context_label`: Context metadata
- `unit`: Unit for numerical answers
- `acceptable_variations`: JSON array of variations

---

## Best Practices

### 1. JSON Structure

- Always specify `type: "complex"` for Complex questions
- Use clear part labels: "a", "b", "c"
- Use clear subpart labels: "i", "ii", "iii"
- Include `marks` at every level
- Specify `answer_format` for each answerable part/subpart
- Provide multiple correct answers with proper `alternative_type`

### 2. Answer Formats

- Use `single_word` for one-word answers only
- Use `calculation` for numerical answers requiring working
- Use `multi_line` for descriptive answers
- Specify `answer_requirement` when multiple answers needed

### 3. Validation

- Set `accepts_equivalent_phrasing: true` for flexible wording
- Use `acceptable_variations` for common alternatives
- Set `marking_flags` appropriately for subject-specific rules

### 4. UI/UX

- Keep parts collapsed by default for long questions
- Show mark allocation clearly
- Provide clear visual hierarchy (indentation, borders)
- Use color coding for difficulty levels
- Show character/word counts for text inputs

---

## Future Enhancements

1. **Enhanced Answer Matching**
   - NLP-based answer comparison
   - Subject-specific validators
   - More sophisticated partial credit rules

2. **Advanced Input Types**
   - Interactive diagram labeling
   - Graphing tool integration
   - Chemical structure editor
   - Mathematical equation builder

3. **Analytics**
   - Part-level difficulty analysis
   - Common error patterns
   - Time spent per part/subpart

4. **Accessibility**
   - Screen reader optimization
   - Keyboard navigation shortcuts
   - High contrast modes

---

## Troubleshooting

### Common Issues

**Issue**: Parts not expanding
- **Solution**: Check that part data includes valid `id` field

**Issue**: Answers not saving
- **Solution**: Verify `onChange` callback is properly connected

**Issue**: Validation errors incorrect
- **Solution**: Check `answer_format` matches actual answer structure

**Issue**: Marks calculation wrong
- **Solution**: Verify `marks` field set on all parts/subparts

---

## Support

For questions or issues:
1. Check this documentation first
2. Review the test JSON file for examples
3. Examine the component source code
4. Check validation logic for answer matching rules

---

## Conclusion

The Complex question implementation provides a robust, scalable solution for handling multi-part, hierarchical questions. The architecture is:

- **Type-safe**: Full TypeScript coverage
- **Flexible**: Supports various answer formats
- **Extensible**: Easy to add new formats/validators
- **User-friendly**: Intuitive collapsible UI
- **Backward compatible**: No impact on existing MCQ functionality

All components follow React best practices and integrate seamlessly with the existing codebase.
