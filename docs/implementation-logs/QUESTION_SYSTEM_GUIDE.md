# Question System & JSON Extraction Guide

> **For AI Assistants**: This guide explains the question system architecture, JSON structure requirements, and extraction logic to help you customize and update the JSON file extraction process.

## Table of Contents

1. [System Overview](#system-overview)
2. [JSON Input Structure](#json-input-structure)
3. [Extraction Pipeline](#extraction-pipeline)
4. [Key Extraction Files](#key-extraction-files)
5. [Auto-Derivation Logic](#auto-derivation-logic)
6. [Subject-Specific Rules](#subject-specific-rules)
7. [Customization Guide](#customization-guide)
8. [Validation Rules](#validation-rules)
9. [Common Issues & Solutions](#common-issues--solutions)

---

## System Overview

The question extraction system transforms JSON files containing past exam papers into the internal database structure. The pipeline consists of:

```
JSON Input → jsonTransformer.ts → Data Operations → Database
                    ↓
         [Auto-derivation modules]
         - answerExpectationDetector.ts
         - answerRequirementDeriver.ts
         - answerOptions.ts (deriveAnswerFormat)
         - optionDataValidator.ts
         - subjectSpecificRules.ts
```

### Core Files Location

```
src/lib/extraction/
├── jsonTransformer.ts           # Main transformation logic
├── answerExpectationDetector.ts # Detects if question needs answer
├── answerRequirementDeriver.ts  # Derives answer requirements
├── answerValidator.ts           # Validates answer structure
├── optionDataValidator.ts       # Validates MCQ options
├── preImportValidation.ts       # Pre-import validation
├── subjectSpecificRules.ts      # Subject-specific validation
├── andOrOperatorParser.ts       # Parses AND/OR in answers
├── forwardSlashParser.ts        # Parses alternatives (A/B)
├── jsonMigrationUtility.ts      # Migration utilities
└── questionSchemaEnhancer.ts    # Schema enhancement

src/lib/constants/
└── answerOptions.ts             # Format/requirement constants & derivation

src/lib/data-operations/
└── questionsDataOperations.ts   # Database operations
```

---

## JSON Input Structure

### Paper-Level Schema

```json
{
  "exam_board": "Cambridge",              // REQUIRED: Provider mapping
  "qualification": "IGCSE",               // REQUIRED: Program mapping
  "subject": "Biology - 0610",            // REQUIRED: "Name - Code" format
  "paper_code": "0610/12",                // REQUIRED: "code/paper" format
  "paper_name": "Paper 1 Multiple Choice",// REQUIRED
  "exam_year": 2025,                      // REQUIRED: Number, not string
  "exam_session": "February/March",       // REQUIRED: Maps to F/M, M/J, O/N
  "paper_duration": "45 minutes",         // REQUIRED
  "total_marks": 40,                      // REQUIRED: Number
  "region": "International",              // RECOMMENDED
  "questions": [...]                      // REQUIRED: Array of questions
}
```

### Question-Level Schema

```typescript
interface ImportedQuestion {
  // REQUIRED FIELDS
  question_number: string;           // "1", "2a", "3(i)"
  type: string;                      // "mcq" | "tf" | "descriptive" | "complex"
  topic: string;                     // Main topic name
  difficulty: string;                // "Easy" | "Medium" | "Hard"
  question_text: string;             // The question content
  figure: boolean;                   // Has attached figure?
  attachments: string[];             // Description of figures (NOT actual files)
  marks: number;                     // Marks for this question

  // MCQ-SPECIFIC (required for type: "mcq")
  options: Array<{
    label: string;                   // "A", "B", "C", "D"
    text: string;                    // Option content
    is_correct?: boolean;            // Optional, derived from correct_answer
    explanation?: string;            // Why correct/incorrect
  }>;
  correct_answer: string;            // "B" - the correct option label
  mcq_type?: string;                 // "single_answer" | "multiple_answer"

  // DESCRIPTIVE-SPECIFIC
  correct_answers?: Array<{
    answer: string;                  // The answer text
    marks?: number;                  // Marks for this answer point
    alternative_id?: number;         // Groups alternatives (1, 2, 3...)
    linked_alternatives?: number[];  // Links to other alternatives
    alternative_type?: string;       // "one_required" | "all_required" | "standalone"
    context_type?: string;           // "mark_point" | "keyword" | "concept"
    context_value?: string;          // Unique identifier for analytics
    context_label?: string;          // Human-readable label
    unit?: string;                   // Unit for numerical answers
    acceptable_variations?: string[];// Alternative phrasings
    accepts_equivalent_phrasing?: boolean;
    accepts_reverse_argument?: boolean;
    error_carried_forward?: boolean;
    working?: string;                // For calculations
    marking_criteria?: string;       // Specific marking instructions
  }>;

  // COMPLEX QUESTIONS (with parts)
  parts?: Array<{
    part: string;                    // "a", "b", "c"
    question_text: string;
    marks: number;
    type?: string;                   // Can override parent type
    answer_format?: string;
    answer_requirement?: string;
    total_alternatives?: number;
    correct_answers?: Array<...>;    // Same structure as above
    hint?: string;
    explanation?: string;
    figure?: boolean;
    attachments?: string[];
    subparts?: Array<{               // Nested subparts
      subpart: string;               // "i", "ii", "iii"
      question_text: string;
      marks: number;
      // ... same fields as part
    }>;
  }>;

  // AUTO-DERIVED (but can be provided)
  answer_format?: string;            // See Answer Formats
  answer_requirement?: string;       // See Answer Requirements
  total_alternatives?: number;

  // EDUCATIONAL CONTENT (recommended)
  subtopic?: string;
  unit?: string;
  hint?: string;
  explanation?: string;
  marking_criteria?: any;
}
```

### Answer Format Values

| Value | Description | Component |
|-------|-------------|-----------|
| `single_word` | One-word answer | Text input |
| `single_line` | Short phrase/sentence | Text input |
| `two_items` | Two separate items | Two text inputs |
| `two_items_connected` | Two related items | Connected inputs |
| `multi_line` | Multiple points | Multi-line textarea |
| `multi_line_labeled` | Labeled points | Labeled inputs |
| `calculation` | Math with working | Calculation editor |
| `equation` | Math/chemical equation | Equation editor |
| `chemical_structure` | Chemistry diagrams | ChemicalStructureEditor |
| `structural_diagram` | Labeled diagrams | StructuralDiagram |
| `diagram` | General drawings | DiagramCanvas |
| `table` | Data table | TableCreator |
| `table_completion` | Fill-in table | TableCompletion |
| `graph` | Plotting | GraphPlotter |
| `code` | Programming | CodeEditor |
| `audio` | Audio recording | AudioRecorder |
| `file_upload` | File attachment | FileUploader |
| `not_applicable` | No format (MCQ/contextual) | N/A |

### Answer Requirement Values

| Value | Description |
|-------|-------------|
| `single_choice` | One correct answer (MCQ, T/F) |
| `both_required` | Both items must be correct |
| `any_one_from` | Any one from alternatives |
| `any_2_from` | Any two from alternatives |
| `any_3_from` | Any three from alternatives |
| `all_required` | All components required |
| `alternative_methods` | Different valid approaches |
| `acceptable_variations` | Various phrasings accepted |
| `not_applicable` | Contextual only |

---

## Extraction Pipeline

### 1. JSON Transformer (`jsonTransformer.ts`)

The main entry point transforms imported JSON into internal format:

```typescript
// Main transformation function
export function transformImportedQuestion(
  imported: ImportedQuestion,
  index: number
): QuestionDisplayData {
  // 1. Determine question type
  let questionType = determineQuestionType(imported);

  // 2. Normalize correct answers
  const normalizedCorrectAnswers = normalizeImportedCorrectAnswers({
    correct_answers: imported.correct_answers,
    correct_answer: imported.correct_answer,
    questionType,
    marks: imported.marks
  });

  // 3. Process options for MCQ
  const options = mapOptionsWithCorrectAnswers(
    imported.options,
    correctAnswers,
    imported.correct_answer
  );

  // 4. Detect answer expectation
  const answerExpectation = detectAnswerExpectation(
    element, { hasSubparts, level }
  );

  // 5. Auto-fill answer_format if not provided
  let answerFormat = imported.answer_format || deriveAnswerFormat({
    type: questionType,
    question_description: questionText,
    correct_answers: correctAnswers,
    has_direct_answer: hasDirectAnswer,
    is_contextual_only: isContextualOnly
  });

  // 6. Auto-fill answer_requirement if not provided
  let answerRequirement = imported.answer_requirement || deriveAnswerRequirement({
    type: questionType,
    correct_answers: correctAnswers,
    total_alternatives: imported.total_alternatives,
    has_direct_answer: hasDirectAnswer,
    is_contextual_only: isContextualOnly
  });

  // 7. Transform parts/subparts recursively
  const parts = imported.parts?.map(transformQuestionPart);

  return transformedQuestion;
}
```

### 2. Answer Expectation Detection (`answerExpectationDetector.ts`)

Determines if a question requires a direct answer:

```typescript
export function detectAnswerExpectation(
  element: QuestionStructure,
  context?: { hasSubparts?: boolean; level?: 'main' | 'part' | 'subpart' }
): AnswerExpectation {
  // RULE 1: Subparts ALWAYS require answers
  if (level === 'subpart') {
    return { has_direct_answer: true, is_contextual_only: false };
  }

  // RULE 2: If has correct_answers, must expect an answer
  // THIS IS HIGHEST PRIORITY - Data overrides text analysis
  if (element.correct_answers?.length > 0) {
    return { has_direct_answer: true, is_contextual_only: false };
  }

  // RULE 3: If has answer_format specified, expects an answer
  if (element.answer_format && element.answer_format !== 'none') {
    return { has_direct_answer: true };
  }

  // RULE 4: No text = contextual only
  if (!text.trim()) {
    return { has_direct_answer: false, is_contextual_only: true };
  }

  // RULE 5: Has subparts but no answers - likely contextual
  if (hasSubparts && !element.correct_answers?.length) {
    // Check for question indicators in text
    return analyzeTextContent(text);
  }

  // RULE 6: Analyze text patterns
  // Contextual patterns: "Fig. 1.1 shows...", "Consider the following..."
  // Question patterns: "?", "What", "Calculate", "Explain"
}
```

**Contextual Patterns** (indicate no answer expected):
- Pure statements without question words
- "Fig. 1.1 shows..."
- "Consider the following..."
- "The diagram shows..."
- Ends with period, no question mark

**Question Patterns** (indicate answer expected):
- Ends with `?`
- Starts with: what, when, where, why, how, which, who
- Starts with: name, state, describe, explain, calculate, define
- Contains: "complete the table", "use the data"

### 3. Answer Format Derivation (`answerOptions.ts`)

```typescript
export function deriveAnswerFormat(question: {
  type: string;
  question_description?: string;
  correct_answers?: any[];
  has_direct_answer?: boolean;
  is_contextual_only?: boolean;
}): string | null {
  // SAFEGUARD: If correct_answers exist, never return 'not_applicable'
  const hasValidAnswers = correct_answers.some(ans => ans.answer?.trim());

  if (hasValidAnswers && (is_contextual_only || !has_direct_answer)) {
    // Data overrides flags
    is_contextual_only = false;
    has_direct_answer = true;
  }

  // MCQ/TF don't need format
  if (type === 'mcq' || type === 'tf') return null;

  // Contextual questions with no answers
  if (is_contextual_only && !hasValidAnswers) return 'not_applicable';

  // Keyword detection in question text
  if (desc.includes('calculate')) return 'calculation';
  if (desc.includes('equation')) return 'equation';
  if (desc.includes('draw') || desc.includes('diagram')) return 'diagram';
  if (desc.includes('table')) return 'table_completion';
  if (desc.includes('graph') || desc.includes('plot')) return 'graph';

  // Based on correct_answers count
  if (correct_answers.length === 1) {
    const answer = correct_answers[0].answer;
    if (answer.split(' ').length === 1) return 'single_word';
    if (answer.split('\n').length === 1) return 'single_line';
    return 'multi_line';
  } else if (correct_answers.length === 2) {
    return 'two_items';
  } else {
    return 'multi_line_labeled';
  }
}
```

### 4. Answer Requirement Derivation (`answerRequirementDeriver.ts`)

```typescript
export function deriveAnswerRequirement(params): AnswerRequirementResult {
  // SAFEGUARD: Check for valid correct_answers
  const hasValidAnswers = correctAnswers?.some(ans => ans.answer?.trim());

  // Override contextual flags if answers exist
  if (hasValidAnswers && (isContextualOnly || !hasDirectAnswer)) {
    isContextualOnly = false;
    hasDirectAnswer = true;
  }

  // MCQ/TF = single choice
  if (questionType === 'mcq' || questionType === 'tf') {
    return { answerRequirement: 'single_choice' };
  }

  // Two items formats
  if (answerFormat === 'two_items' || answerFormat === 'two_items_connected') {
    const hasAlternatives = answersCount > 2 || totalAlternatives > 1;
    return hasAlternatives ? 'any_2_from' : 'both_required';
  }

  // Analyze alternative structure
  if (hasLinkedAlternatives || hasAlternativeTypes) {
    // Check alternative_type field
    if (alternativeType === 'one_required') return 'any_one_from';
    if (alternativeType === 'all_required') return 'all_required';
    return 'alternative_methods';
  }

  // Based on answer count
  if (answersCount === 1) return 'single_choice';
  if (answersCount === 2) return 'both_required';
  if (answersCount === 3) return 'any_3_from';
  if (answersCount > 3) return 'all_required';
}
```

---

## Key Extraction Files

### `jsonTransformer.ts` - Main Functions

| Function | Purpose |
|----------|---------|
| `transformImportedQuestion()` | Main entry point for question transformation |
| `transformQuestionPart()` | Transforms parts (a, b, c) |
| `transformQuestionSubpart()` | Transforms subparts (i, ii, iii) |
| `normalizeImportedCorrectAnswers()` | Normalizes correct_answer and correct_answers |
| `processCorrectAnswers()` | Processes answer alternatives and metadata |
| `mapOptionsWithCorrectAnswers()` | Maps MCQ options with is_correct flag |
| `processAttachments()` | Processes attachment descriptions |
| `transformImportedPaper()` | Transforms entire paper JSON |
| `groupAnswersByAlternatives()` | Groups answers by alternative type |

### `answerExpectationDetector.ts` - Functions

| Function | Purpose |
|----------|---------|
| `detectAnswerExpectation()` | Main detection function |
| `analyzeContextualContent()` | Scores text for contextual patterns |
| `analyzeQuestionContent()` | Scores text for question patterns |
| `detectAnswerExpectationBulk()` | Batch process multiple questions |
| `validateDetection()` | Validates detection against actual data |

### `answerRequirementDeriver.ts` - Functions

| Function | Purpose |
|----------|---------|
| `deriveAnswerRequirement()` | Main derivation function |
| `deriveFromAnswerFormat()` | Fallback derivation from format |
| `getAnswerRequirementExplanation()` | Human-readable explanation |
| `validateAnswerRequirement()` | Validates requirement vs answers |

### `optionDataValidator.ts` - Functions

| Function | Purpose |
|----------|---------|
| `validateOption()` | Validates single MCQ option |
| `validateMCQOptions()` | Validates all options for a question |
| `validateMCQPaper()` | Validates all MCQ questions in paper |
| `logValidationResults()` | Console logging with color coding |

---

## Subject-Specific Rules

Located in `subjectSpecificRules.ts`, these provide subject-aware validation:

### Physics Rules

```typescript
{
  requiresUnits: true,
  allowsApproximations: true,
  requiresSignificantFigures: true,
  customValidations: [
    // Check for missing units in numerical answers
    // Check for formula variable definitions
    // Check for vector direction specifications
  ]
}
```

### Chemistry Rules

```typescript
{
  requiresUnits: true,
  customValidations: [
    // Check for state symbols (s), (l), (g), (aq)
    // Check for arrow notation in equations (→, ⇌)
    // Check for concentration units (mol/dm³)
  ]
}
```

### Biology Rules

```typescript
{
  requiresUnits: false,
  allowsEquivalentPhrasing: true,
  customValidations: [
    // Check for scientific name italicization
    // Check for process explanation requirements
    // Check for diagram requirements
  ]
}
```

### Mathematics Rules

```typescript
{
  requiresUnits: false,
  requiresSignificantFigures: true,
  allowsEquivalentPhrasing: false,
  customValidations: [
    // Check for mixed fraction/decimal formats
    // Check for proof conclusions (QED)
    // Check for domain/range specifications
    // Check for mathematical symbol usage
  ]
}
```

---

## Customization Guide

### Adding a New Question Type

1. **Update type definitions** in `src/types/questions.ts`:

```typescript
export type QuestionType = 'mcq' | 'tf' | 'descriptive' | 'complex' | 'NEW_TYPE';
```

2. **Update jsonTransformer.ts** in `transformImportedQuestion()`:

```typescript
// In determineQuestionType section
if (imported.type === 'new_type' || imported.some_new_field) {
  questionType = 'new_type';
}
```

3. **Update answerOptions.ts** if new format derivation needed:

```typescript
if (type === 'new_type') {
  return 'new_format';
}
```

### Adding a New Answer Format

1. **Add to `ANSWER_FORMAT_OPTIONS`** in `answerOptions.ts`:

```typescript
{
  value: 'new_format',
  label: 'New Format',
  description: 'Description of format',
  component: 'NewFormatComponent',  // Optional
  requiresStorage: false,            // Optional
  isVisual: true                     // Optional
}
```

2. **Update `deriveAnswerFormat()`** to detect the new format:

```typescript
// Add detection logic
if (desc.includes('new_keyword')) {
  return 'new_format';
}
```

3. **Create component** in `src/components/answer-formats/NewFormat/`:

```typescript
// NewFormat/index.tsx
export const NewFormatInput: React.FC<Props> = ({ ... }) => {
  // Component implementation
};
```

### Adding a New Answer Requirement

1. **Add to types** in `answerRequirementDeriver.ts`:

```typescript
export type AnswerRequirement =
  | 'single_choice'
  | 'any_4_from'  // NEW
  // ...
```

2. **Add to `ANSWER_REQUIREMENT_OPTIONS`** in `answerOptions.ts`:

```typescript
{
  value: 'any_4_from',
  label: 'Any 4 From',
  description: 'Any four correct answers from alternatives'
}
```

3. **Update derivation logic** in `deriveAnswerRequirement()`:

```typescript
if (answersCount === 4) {
  return 'any_4_from';
}
```

### Adding Subject-Specific Rules

1. **Create new rules** in `subjectSpecificRules.ts`:

```typescript
export const NewSubjectRules: SubjectSpecificRules = {
  requiresUnits: false,
  allowsApproximations: true,
  requiresSignificantFigures: false,
  allowsEquivalentPhrasing: true,
  customValidations: [
    (answer: string): ValidationIssue | null => {
      // Custom validation logic
      if (someCondition) {
        return {
          severity: 'warning',
          message: 'Custom warning message',
          field: 'answer',
          code: 'CUSTOM_CODE'
        };
      }
      return null;
    }
  ]
};
```

2. **Register in `getSubjectRules()`**:

```typescript
if (normalizedSubject.includes('new_subject')) {
  return NewSubjectRules;
}
```

### Modifying Detection Patterns

**Contextual patterns** in `answerExpectationDetector.ts`:

```typescript
const CONTEXTUAL_PATTERNS = [
  /new_contextual_pattern/i,  // Add new patterns
  // ...
];
```

**Question patterns**:

```typescript
const QUESTION_PATTERNS = [
  /^(new_verb)/i,  // Add new imperative verbs
  // ...
];
```

---

## Validation Rules

### Pre-Import Validation

Run validation before importing:

```typescript
import { validateQuestionsBeforeImport } from '@/lib/extraction/preImportValidation';

const result = validateQuestionsBeforeImport(questions, 'Biology');

if (!result.canProceed) {
  console.error(result.errors);
}
```

### MCQ Option Validation

```typescript
import { validateMCQPaper, logValidationResults } from '@/lib/extraction/optionDataValidator';

const summary = validateMCQPaper(paperData);
logValidationResults(summary);
```

### Critical Validation Rules

1. **MCQ Questions**:
   - Must have `options` array with at least 2 options
   - Must have `correct_answer` field
   - `correct_answer` must match an option label

2. **Parts/Subparts**:
   - Must have `part` or `subpart` label
   - Must have `question_text`
   - Must have `marks`
   - Sum of part marks should equal question marks

3. **Correct Answers**:
   - Non-empty `answer` field
   - Valid `marks` (positive number)
   - Unique `alternative_id` when using alternatives

4. **Data Types**:
   - `marks`: number (not string)
   - `exam_year`: number (not string)
   - `figure`: boolean (not string)
   - `attachments`: array (not null)

---

## Common Issues & Solutions

### Issue: Answer Format Derived as `not_applicable` Despite Having Answers

**Cause**: Conflicting flags (`is_contextual_only: true`) with existing `correct_answers`.

**Solution**: The system has safeguards, but ensure your JSON doesn't set conflicting flags:

```json
// WRONG
{
  "is_contextual_only": true,
  "correct_answers": [{ "answer": "photosynthesis" }]
}

// CORRECT
{
  "correct_answers": [{ "answer": "photosynthesis" }]
}
```

### Issue: MCQ Options Not Marked as Correct

**Cause**: `correct_answer` doesn't match option labels.

**Solution**: Ensure `correct_answer` exactly matches an option `label`:

```json
{
  "options": [
    { "label": "A", "text": "Option A" },
    { "label": "B", "text": "Option B" }
  ],
  "correct_answer": "B"  // Must be "A" or "B", not "option B"
}
```

### Issue: Parts Marked as Contextual When They Have Answers

**Cause**: Parent question has subparts but part itself has no answers specified.

**Solution**: Always provide `correct_answers` for parts that require answers:

```json
{
  "parts": [
    {
      "part": "a",
      "question_text": "Name the process.",
      "marks": 1,
      "correct_answers": [{ "answer": "photosynthesis", "marks": 1 }]
    }
  ]
}
```

### Issue: Missing Educational Content Warnings

**Cause**: Options lack `explanation` or `context_type` fields.

**Solution**: Add educational content:

```json
{
  "options": [
    {
      "label": "A",
      "text": "mitochondrion",
      "explanation": "Incorrect - mitochondria are for respiration, not protein synthesis",
      "context_type": "organelle",
      "context_value": "mitochondrion"
    },
    {
      "label": "B",
      "text": "ribosome",
      "is_correct": true,
      "explanation": "Correct - ribosomes are the site of protein synthesis"
    }
  ]
}
```

### Issue: Calculation Answers Missing Working

**Cause**: Calculation questions without `working` field in correct_answers.

**Solution**: Add working steps:

```json
{
  "correct_answers": [{
    "answer": "85%",
    "marks": 2,
    "working": "(34 ÷ 40) × 100 = 0.85 × 100 = 85%",
    "marking_criteria": "Award 1 mark for method, 1 mark for correct answer"
  }]
}
```

---

## Quick Reference

### Minimum Valid Question (MCQ)

```json
{
  "question_number": "1",
  "type": "mcq",
  "topic": "Cell Structure",
  "difficulty": "Medium",
  "question_text": "Which organelle is responsible for protein synthesis?",
  "figure": false,
  "attachments": [],
  "marks": 1,
  "options": [
    { "label": "A", "text": "mitochondrion" },
    { "label": "B", "text": "ribosome" },
    { "label": "C", "text": "nucleus" },
    { "label": "D", "text": "chloroplast" }
  ],
  "correct_answer": "B"
}
```

### Minimum Valid Question (Descriptive)

```json
{
  "question_number": "2",
  "type": "descriptive",
  "topic": "Photosynthesis",
  "difficulty": "Medium",
  "question_text": "Name the process by which plants make food.",
  "figure": false,
  "attachments": [],
  "marks": 1,
  "correct_answers": [
    { "answer": "photosynthesis", "marks": 1, "alternative_id": 1 }
  ]
}
```

### Minimum Valid Complex Question

```json
{
  "question_number": "3",
  "type": "complex",
  "topic": "Respiration",
  "difficulty": "Hard",
  "question_text": "The diagram shows cellular respiration.",
  "figure": true,
  "attachments": ["Diagram of cellular respiration"],
  "marks": 5,
  "parts": [
    {
      "part": "a",
      "question_text": "Name the process shown.",
      "marks": 1,
      "correct_answers": [{ "answer": "respiration", "marks": 1 }]
    },
    {
      "part": "b",
      "question_text": "Describe what happens during intense exercise.",
      "marks": 4,
      "answer_format": "multi_line",
      "answer_requirement": "any_4_from",
      "total_alternatives": 6,
      "correct_answers": [
        { "answer": "Anaerobic respiration occurs", "marks": 1, "alternative_id": 1 },
        { "answer": "Lactic acid is produced", "marks": 1, "alternative_id": 2 },
        { "answer": "Less energy released", "marks": 1, "alternative_id": 3 },
        { "answer": "Oxygen debt builds up", "marks": 1, "alternative_id": 4 },
        { "answer": "Muscle fatigue occurs", "marks": 1, "alternative_id": 5 },
        { "answer": "Recovery period needed", "marks": 1, "alternative_id": 6 }
      ]
    }
  ]
}
```

---

## File Modification Checklist

When modifying the extraction system:

- [ ] Update types in `src/types/questions.ts` if adding new types
- [ ] Update `jsonTransformer.ts` for transformation logic
- [ ] Update `answerExpectationDetector.ts` for detection patterns
- [ ] Update `answerRequirementDeriver.ts` for requirement logic
- [ ] Update `answerOptions.ts` for format/requirement options
- [ ] Update `subjectSpecificRules.ts` for subject validation
- [ ] Update `optionDataValidator.ts` for MCQ validation
- [ ] Run existing tests: `npm run test`
- [ ] Test with sample JSON files in `/JSON` directory
- [ ] Verify UI displays correctly in question import workflow

---

**Document Version**: 1.0
**Last Updated**: 2025-01-08
**Related Files**: See `JSON_IMPORT_STRUCTURE_GUIDE.md` for JSON schema details
