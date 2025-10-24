# JSON Import Structure Guide - Past Paper Import System

## Overview

This document provides the complete JSON file structure required to ensure a smooth import and data insertion process for past papers into the system. Following this structure guarantees 100% compatibility with the import system and enables all advanced features.

---

## Complete JSON Schema

### Minimal Valid Structure

```json
{
  "exam_board": "Cambridge",
  "qualification": "IGCSE",
  "subject": "Biology - 0610",
  "paper_code": "0610/12",
  "paper_name": "Paper 1 Multiple Choice (Core)",
  "exam_year": 2025,
  "exam_session": "February/March",
  "paper_duration": "45 minutes",
  "total_marks": 40,
  "questions": [
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
        {"label": "A", "text": "mitochondrion"},
        {"label": "B", "text": "ribosome"},
        {"label": "C", "text": "nucleus"},
        {"label": "D", "text": "chloroplast"}
      ],
      "correct_answer": "B",
      "answer_format": "selection",
      "hint": "Think about where proteins are made",
      "explanation": "Ribosomes are the organelles where protein synthesis occurs"
    }
  ]
}
```

---

## Top-Level Paper Fields

| Field | Type | Required | Format/Values | Description | Example |
|-------|------|----------|---------------|-------------|---------|
| `exam_board` | string | **REQUIRED** | "Cambridge", "Edexcel", "AQA", "OCR", "WJEC" | Examination board/authority | "Cambridge" |
| `qualification` | string | **REQUIRED** | "IGCSE", "A Level", "AS Level", "GCSE", "IB" | Qualification type | "IGCSE" |
| `subject` | string | **REQUIRED** | "Subject Name - Code" | Subject with code after dash | "Biology - 0610" |
| `paper_code` | string | **REQUIRED** | "code/paper" | Format: subject_code/paper_number | "0610/12" |
| `paper_name` | string | **REQUIRED** | Descriptive name | Full paper name | "Paper 1 Multiple Choice (Core)" |
| `exam_year` | number | **REQUIRED** | Numeric year | Year of examination | 2025 |
| `exam_session` | string | **REQUIRED** | "February/March", "May/June", "October/November" | Exam session (auto-maps to F/M, M/J, O/N) | "February/March" |
| `paper_duration` | string | **REQUIRED** | "XX minutes" or "X hours" | Time allowed | "45 minutes" |
| `total_marks` | number | **REQUIRED** | Numeric value | Total marks for paper | 40 |
| `region` | string | RECOMMENDED | "International", "UK", "US", etc. | Regional variant | "International" |
| `questions` | array | **REQUIRED** | Array of question objects | All questions in paper | [...] |

### System Mappings

The system automatically maps:
- **exam_board** → **provider** (e.g., "Cambridge" → "Cambridge International (CIE)")
- **qualification** → **program** (e.g., "IGCSE" → "IGCSE")
- **exam_session** → **session code** (e.g., "February/March" → "F/M")

---

## Question-Level Fields

### Core Question Fields

| Field | Type | Required | Format/Values | Description | Example |
|-------|------|----------|---------------|-------------|---------|
| `question_number` | string | **REQUIRED** | "1", "2a", "3ii" | Unique question identifier | "1" |
| `type` | string | **REQUIRED** | "mcq", "descriptive", "calculation", "true_false", "complex" | **Critical for question processing** | "mcq" |
| `topic` | string | **REQUIRED** | Topic name | Main topic/chapter | "Cell Structure" |
| `difficulty` | string | **REQUIRED** | "Easy", "Medium", "Hard" | Difficulty level (case-insensitive) | "Medium" |
| `question_text` | string | **REQUIRED** | Full question text | The actual question content | "Which organelle..." |
| `figure` | boolean | **REQUIRED** | true, false | Whether question has diagram/image | false |
| `attachments` | array | **REQUIRED** | String array or empty | Descriptions of figures/diagrams | ["Diagram of cell"] |
| `marks` | number | **REQUIRED** | Numeric value | Total marks for question | 1 |

### Optional but Recommended Fields

| Field | Type | Required | Format/Values | Description | Example |
|-------|------|----------|---------------|-------------|---------|
| `subtopic` | string | RECOMMENDED | Subtopic name | More specific topic classification | "Organelles" |
| `unit` | string | RECOMMENDED | Unit/chapter name | Hierarchical organization | "Cell Biology" |
| `hint` | string | RECOMMENDED | Helpful hint text | Student guidance | "Think about protein..." |
| `explanation` | string | RECOMMENDED | Detailed explanation | Learning content/answer explanation | "Ribosomes are..." |
| `answer_format` | string | RECOMMENDED | See Answer Formats table | UI rendering guidance | "selection" |

### Question Type Specific Fields

#### For MCQ Questions (type: "mcq")

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `mcq_type` | string | RECOMMENDED | "single_answer" or "multiple_answer" | "single_answer" |
| `options` | array | **REQUIRED** | Array of option objects (see below) | [...] |
| `correct_answer` | string | **REQUIRED** | Option label of correct answer | "B" |

#### For Descriptive/Complex Questions

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `correct_answers` | array | RECOMMENDED | Array of answer objects (see below) | [...] |
| `parts` | array | If multi-part | Array of part objects (see below) | [...] |
| `answer_requirement` | string | Optional | Marking guidance | "ANY 3 from 5" |
| `total_alternatives` | number | Optional | Number of alternative answers | 5 |

### Advanced Fields (Optional)

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `marking_notes` | string | Special marking instructions | "Accept equivalent terms" |
| `context_metadata` | object | Analytics metadata | {"complexity": "high"} |
| `year` | number | Specific year for filtering | 2025 |

---

## MCQ Options Structure

For questions with `type: "mcq"`, include an `options` array:

```json
"options": [
  {
    "label": "A",
    "text": "mitochondrion"
  },
  {
    "label": "B",
    "text": "ribosome"
  },
  {
    "label": "C",
    "text": "nucleus"
  },
  {
    "label": "D",
    "text": "chloroplast"
  }
]
```

### Option Object Fields

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `label` | string | **REQUIRED** | Option identifier (A, B, C, D...) | "A" |
| `text` | string | **REQUIRED** | Option content | "mitochondrion" |
| `explanation` | string | Optional | Why this option is correct/incorrect | "Correct because..." |

---

## Multi-Part Questions Structure

For questions with parts (a), (b), (i), (ii), etc.:

```json
{
  "question_number": "2",
  "type": "descriptive",
  "topic": "Photosynthesis",
  "subtopic": "Process",
  "unit": "Plant Biology",
  "difficulty": "Medium",
  "question_text": "This question is about photosynthesis.",
  "figure": false,
  "attachments": [],
  "marks": 6,
  "parts": [
    {
      "part": "a",
      "question_text": "Name the process by which plants make food.",
      "marks": 1,
      "answer_format": "single_word",
      "correct_answers": [
        {
          "answer": "photosynthesis",
          "marks": 1,
          "alternative_id": 1
        }
      ]
    },
    {
      "part": "b",
      "question_text": "Describe the role of chloroplasts in photosynthesis.",
      "marks": 5,
      "answer_format": "multi_line",
      "answer_requirement": "ANY 5 from 7 alternatives",
      "total_alternatives": 7,
      "correct_answers": [
        {
          "answer": "Contains chlorophyll",
          "marks": 1,
          "alternative_id": 1,
          "context_type": "mark_point",
          "context_value": "chlorophyll_presence"
        },
        {
          "answer": "Absorbs light energy",
          "marks": 1,
          "alternative_id": 2,
          "context_type": "mark_point",
          "context_value": "light_absorption"
        }
      ]
    }
  ],
  "hint": "Think about the whole process from start to finish",
  "explanation": "Photosynthesis is the process by which plants convert light energy into chemical energy"
}
```

### Part Object Fields

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `part` | string | **REQUIRED** | Part identifier | "a", "b", "i", "ii" |
| `question_text` | string | **REQUIRED** | Part question text | "Name the process..." |
| `marks` | number | **REQUIRED** | Marks for this part | 1 |
| `answer_format` | string | RECOMMENDED | Answer format type | "single_word" |
| `correct_answers` | array | **REQUIRED** | Array of answer objects | [...] |
| `answer_requirement` | string | Optional | Marking guidance | "ANY 2 from 4" |
| `total_alternatives` | number | Optional | Number of alternatives | 4 |

---

## Correct Answers Structure

For structured/descriptive questions, use the `correct_answers` array:

```json
"correct_answers": [
  {
    "answer": "photosynthesis",
    "marks": 1,
    "alternative_id": 1,
    "context_type": "mark_point",
    "context_value": "process_name",
    "context_label": "Process identification",
    "marking_criteria": "Accept: photosynthesis only. Do not accept: respiration"
  },
  {
    "answer": "cellular respiration",
    "marks": 1,
    "alternative_id": 2,
    "context_type": "mark_point",
    "context_value": "alternative_process",
    "marking_criteria": "Also acceptable if context allows"
  }
]
```

### Answer Object Fields

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `answer` | string | **REQUIRED** | The answer text | "photosynthesis" |
| `marks` | number | **REQUIRED** | Marks awarded for this answer | 1 |
| `alternative_id` | number | RECOMMENDED | Alternative answer identifier (1, 2, 3...) | 1 |
| `context_type` | string | Optional | Type of context (for analytics) | "mark_point", "keyword", "concept" |
| `context_value` | string | Optional | Unique identifier for analytics | "process_name" |
| `context_label` | string | Optional | Human-readable label | "Process identification" |
| `marking_criteria` | string | Optional | Specific marking instructions | "Accept equivalent terminology" |
| `working` | string | For calculations | Example of working | "(32 ÷ 40) × 100 = 80%" |
| `error_carried_forward` | boolean | Optional | Whether ECF applies | true |
| `linked_to_alternative` | number | Optional | Links to another alternative | 2 |

---

## Answer Format Values

Use these standardized values for `answer_format`:

| Format | Use Case | Example Question | Student Input Type |
|--------|----------|-----------------|-------------------|
| `selection` | MCQ answer selection | "Which option is correct?" | Click option A/B/C/D |
| `single_word` | One word answer | "Name this organelle:" | "mitochondria" |
| `single_line` | Short answer (one line) | "Define photosynthesis:" | Brief sentence |
| `two_items` | Two separate items | "Name two products:" | "glucose and oxygen" |
| `two_items_connected` | Two related items | "State X and explain Y:" | Connected answers |
| `multi_line` | Multiple points/lines | "Describe the process:" | Multiple sentences/bullet points |
| `multi_line_labeled` | Labeled sections | "Explain: (a)... (b)..." | Answers with labels |
| `calculation` | Math calculation | "Calculate the percentage:" | Show working + answer |
| `equation` | Chemical/math equation | "Write the equation:" | H₂O + CO₂ → C₆H₁₂O₆ |
| `chemical_structure` | Draw molecular structure | "Draw the structure of methane:" | Drawing/diagram |
| `structural_diagram` | Draw structural representation | "Draw the apparatus:" | Labeled diagram |
| `diagram` | Draw/sketch diagram | "Sketch the cell:" | Free-hand drawing |
| `table` | Data in table format | "Complete the table:" | Table with rows/columns |
| `graph` | Plot graph | "Plot the results:" | Graph with axes and points |
| `code` | Programming code | "Write the function:" | Code snippet |
| `true_false` | True/False question | "Is this statement true?" | true or false |
| `audio` | Audio recording | "Pronounce the term:" | Audio recording |
| `file_upload` | File upload | "Submit your report:" | File attachment |

---

## Complete Examples

### Example 1: Simple MCQ Question

```json
{
  "question_number": "1",
  "type": "mcq",
  "mcq_type": "single_answer",
  "topic": "Cell Structure",
  "subtopic": "Organelles",
  "unit": "Cell Biology",
  "difficulty": "Easy",
  "question_text": "Which organelle is responsible for protein synthesis?",
  "figure": false,
  "attachments": [],
  "marks": 1,
  "options": [
    {"label": "A", "text": "mitochondrion"},
    {"label": "B", "text": "ribosome"},
    {"label": "C", "text": "nucleus"},
    {"label": "D", "text": "chloroplast"}
  ],
  "correct_answer": "B",
  "answer_format": "selection",
  "hint": "Think about where proteins are made in the cell",
  "explanation": "Ribosomes are the organelles responsible for protein synthesis. They read mRNA and assemble amino acids into proteins."
}
```

### Example 2: True/False Question

```json
{
  "question_number": "5",
  "type": "true_false",
  "topic": "Cell Structure",
  "subtopic": "Plant vs Animal Cells",
  "unit": "Cell Biology",
  "difficulty": "Easy",
  "question_text": "Plant cells have cell walls made of cellulose.",
  "figure": false,
  "attachments": [],
  "marks": 1,
  "correct_answer": "true",
  "answer_format": "true_false",
  "hint": "Think about what makes plant cells rigid",
  "explanation": "Plant cells have cell walls made of cellulose that provide structural support and rigidity."
}
```

### Example 3: Descriptive Question with Multiple Correct Answers

```json
{
  "question_number": "8",
  "type": "descriptive",
  "topic": "Photosynthesis",
  "subtopic": "Light-dependent Reactions",
  "unit": "Plant Biology",
  "difficulty": "Hard",
  "question_text": "Explain the role of chloroplasts in photosynthesis.",
  "figure": false,
  "attachments": [],
  "marks": 4,
  "answer_format": "multi_line",
  "answer_requirement": "ANY 4 from 6 alternatives",
  "total_alternatives": 6,
  "correct_answers": [
    {
      "answer": "Contains chlorophyll which absorbs light",
      "marks": 1,
      "alternative_id": 1,
      "context_type": "mark_point",
      "context_value": "chlorophyll_function",
      "marking_criteria": "Accept: contains chlorophyll / has chlorophyll / chlorophyll present"
    },
    {
      "answer": "Site of photosynthesis",
      "marks": 1,
      "alternative_id": 2,
      "context_type": "mark_point",
      "context_value": "location",
      "marking_criteria": "Accept: where photosynthesis occurs / location of photosynthesis"
    },
    {
      "answer": "Converts light energy to chemical energy",
      "marks": 1,
      "alternative_id": 3,
      "context_type": "mark_point",
      "context_value": "energy_conversion",
      "marking_criteria": "Accept: changes light to chemical energy / energy transformation"
    },
    {
      "answer": "Produces glucose from CO2 and water",
      "marks": 1,
      "alternative_id": 4,
      "context_type": "mark_point",
      "context_value": "glucose_production",
      "marking_criteria": "Accept: makes glucose / synthesizes sugar"
    },
    {
      "answer": "Contains enzymes for photosynthesis",
      "marks": 1,
      "alternative_id": 5,
      "context_type": "mark_point",
      "context_value": "enzyme_presence",
      "marking_criteria": "Accept: has enzymes / enzyme-containing"
    },
    {
      "answer": "Has thylakoid membranes for light reactions",
      "marks": 1,
      "alternative_id": 6,
      "context_type": "mark_point",
      "context_value": "thylakoid_structure",
      "marking_criteria": "Accept: contains thylakoids / has grana"
    }
  ],
  "hint": "Think about the structure and function of chloroplasts",
  "explanation": "Chloroplasts are specialized organelles that contain chlorophyll and are the site of photosynthesis. They convert light energy into chemical energy, producing glucose from carbon dioxide and water.",
  "marking_notes": "Award 1 mark for each valid point, maximum 4 marks. Accept equivalent terminology and phrasings."
}
```

### Example 4: Multi-Part Question

```json
{
  "question_number": "12",
  "type": "descriptive",
  "topic": "Respiration",
  "subtopic": "Aerobic vs Anaerobic",
  "unit": "Energy in Living Systems",
  "difficulty": "Hard",
  "question_text": "The diagram shows the process of cellular respiration in muscle cells.",
  "figure": true,
  "attachments": ["Diagram of cellular respiration pathway"],
  "marks": 8,
  "parts": [
    {
      "part": "a",
      "question_text": "Name the process shown in the diagram.",
      "marks": 1,
      "answer_format": "single_word",
      "correct_answers": [
        {
          "answer": "respiration",
          "marks": 1,
          "alternative_id": 1,
          "marking_criteria": "Accept: cellular respiration / aerobic respiration"
        }
      ]
    },
    {
      "part": "b",
      "question_text": "State the word equation for this process.",
      "marks": 2,
      "answer_format": "equation",
      "correct_answers": [
        {
          "answer": "glucose + oxygen → carbon dioxide + water + energy",
          "marks": 2,
          "alternative_id": 1,
          "marking_criteria": "Award 2 marks for correct equation. Award 1 mark if minor errors (e.g., missing energy or water)"
        }
      ]
    },
    {
      "part": "c",
      "question_text": "Explain what happens in muscle cells during intense exercise when oxygen supply is limited.",
      "marks": 5,
      "answer_format": "multi_line",
      "answer_requirement": "ANY 5 from 7 alternatives",
      "total_alternatives": 7,
      "correct_answers": [
        {
          "answer": "Anaerobic respiration occurs",
          "marks": 1,
          "alternative_id": 1,
          "context_type": "mark_point",
          "context_value": "process_type"
        },
        {
          "answer": "Glucose is broken down without oxygen",
          "marks": 1,
          "alternative_id": 2,
          "context_type": "mark_point",
          "context_value": "no_oxygen"
        },
        {
          "answer": "Lactic acid is produced",
          "marks": 1,
          "alternative_id": 3,
          "context_type": "mark_point",
          "context_value": "lactic_acid_product"
        },
        {
          "answer": "Less energy is released compared to aerobic respiration",
          "marks": 1,
          "alternative_id": 4,
          "context_type": "mark_point",
          "context_value": "energy_comparison"
        },
        {
          "answer": "Lactic acid causes muscle fatigue",
          "marks": 1,
          "alternative_id": 5,
          "context_type": "mark_point",
          "context_value": "fatigue_cause"
        },
        {
          "answer": "Oxygen debt builds up",
          "marks": 1,
          "alternative_id": 6,
          "context_type": "mark_point",
          "context_value": "oxygen_debt"
        },
        {
          "answer": "Recovery period needed to remove lactic acid",
          "marks": 1,
          "alternative_id": 7,
          "context_type": "mark_point",
          "context_value": "recovery"
        }
      ],
      "marking_notes": "Award 1 mark per valid point, maximum 5 marks"
    }
  ],
  "hint": "Consider what happens when muscles don't get enough oxygen",
  "explanation": "During intense exercise, muscles may not receive enough oxygen for aerobic respiration. They switch to anaerobic respiration, which produces lactic acid and releases less energy. This causes muscle fatigue and requires a recovery period."
}
```

### Example 5: Calculation Question

```json
{
  "question_number": "15",
  "type": "calculation",
  "topic": "Quantitative Skills",
  "subtopic": "Percentages",
  "unit": "Mathematics for Science",
  "difficulty": "Medium",
  "question_text": "A student scored 34 marks out of a possible 40 marks on a test. Calculate the percentage score.",
  "figure": false,
  "attachments": [],
  "marks": 2,
  "answer_format": "calculation",
  "answer_requirement": "Show working",
  "correct_answers": [
    {
      "answer": "85%",
      "marks": 2,
      "alternative_id": 1,
      "working": "(34 ÷ 40) × 100 = 0.85 × 100 = 85%",
      "marking_criteria": "Award 2 marks for correct answer with working. Award 1 mark for correct method even if final answer incorrect (e.g., arithmetic error)."
    }
  ],
  "hint": "Use the formula: (score ÷ total) × 100",
  "explanation": "To calculate percentage: divide the score obtained by the total possible score, then multiply by 100. (34 ÷ 40) × 100 = 85%"
}
```

### Example 6: Question with Figure

```json
{
  "question_number": "20",
  "type": "mcq",
  "mcq_type": "single_answer",
  "topic": "Transport in Plants",
  "subtopic": "Xylem and Phloem",
  "unit": "Plant Transport Systems",
  "difficulty": "Hard",
  "question_text": "The diagram shows a cross-section of a plant stem. Which structure labeled in the diagram transports water from roots to leaves?",
  "figure": true,
  "attachments": [
    "Cross-section diagram of plant stem with structures labeled A, B, C, and D"
  ],
  "marks": 1,
  "options": [
    {"label": "A", "text": "A (cortex)"},
    {"label": "B", "text": "B (xylem)"},
    {"label": "C", "text": "C (phloem)"},
    {"label": "D", "text": "D (epidermis)"}
  ],
  "correct_answer": "B",
  "answer_format": "selection",
  "hint": "Think about which tissue is responsible for water transport",
  "explanation": "Xylem vessels transport water and dissolved minerals from the roots upward through the stem to the leaves. Phloem transports sugars."
}
```

---

## Validation Rules

### Data Type Validation

| Field | Expected Type | Invalid Example | Valid Example |
|-------|--------------|-----------------|---------------|
| `exam_year` | number | "2025" | 2025 |
| `total_marks` | number | "40" | 40 |
| `marks` | number | "1" | 1 |
| `figure` | boolean | "true" | true |
| `attachments` | array | null | [] or ["description"] |
| `options` | array | null | [{...}] |

### Required Field Validation

Before importing, ensure every question has:
- ✅ `question_number`
- ✅ `type`
- ✅ `question_text`
- ✅ `topic`
- ✅ `difficulty`
- ✅ `figure`
- ✅ `attachments` (can be empty array)
- ✅ `marks`

### MCQ Specific Validation

For `type: "mcq"` questions:
- ✅ Must have `options` array with at least 2 options
- ✅ Must have `correct_answer` field
- ✅ `correct_answer` must match one of the option `label` values
- ✅ Each option must have both `label` and `text`

### Multi-Part Validation

For questions with `parts`:
- ✅ Each part must have `part`, `question_text`, `marks`
- ✅ Sum of part marks should equal question marks
- ✅ Each part should have `correct_answers` array

---

## Common Mistakes to Avoid

### 1. String vs Number Types
❌ **WRONG:**
```json
"marks": "1",
"exam_year": "2025"
```

✅ **CORRECT:**
```json
"marks": 1,
"exam_year": 2025
```

### 2. Boolean as String
❌ **WRONG:**
```json
"figure": "true"
```

✅ **CORRECT:**
```json
"figure": true
```

### 3. Missing Type Field
❌ **WRONG:**
```json
{
  "question_number": "1",
  "mcq_type": "single_answer",
  "question_text": "..."
}
```

✅ **CORRECT:**
```json
{
  "question_number": "1",
  "type": "mcq",
  "mcq_type": "single_answer",
  "question_text": "..."
}
```

### 4. Null Instead of Empty Array
❌ **WRONG:**
```json
"attachments": null
```

✅ **CORRECT:**
```json
"attachments": []
```

### 5. Missing Options for MCQ
❌ **WRONG:**
```json
{
  "type": "mcq",
  "correct_answer": "B"
}
```

✅ **CORRECT:**
```json
{
  "type": "mcq",
  "options": [
    {"label": "A", "text": "..."},
    {"label": "B", "text": "..."}
  ],
  "correct_answer": "B"
}
```

### 6. Incorrect Subject Format
❌ **WRONG:**
```json
"subject": "Biology 0610"
```

✅ **CORRECT:**
```json
"subject": "Biology - 0610"
```
(Use dash with spaces to separate name from code)

---

## Pre-Import Checklist

Before uploading your JSON file, verify:

- [ ] File is valid JSON (no syntax errors)
- [ ] All top-level required fields present
- [ ] All questions have required fields
- [ ] MCQ questions have `type: "mcq"` and `options` array
- [ ] All numeric fields are numbers, not strings
- [ ] All boolean fields are true/false, not "true"/"false"
- [ ] Arrays are properly formatted (no trailing commas)
- [ ] Subject field uses "Name - Code" format
- [ ] Paper code uses "code/number" format
- [ ] Question numbers are unique
- [ ] All `correct_answer` values match option labels (for MCQ)
- [ ] Marks are positive numbers
- [ ] Difficulty is one of: Easy, Medium, Hard
- [ ] No special characters causing JSON parsing issues

---

## JSON Validation Tools

Use these tools to validate your JSON before importing:

1. **Online Validators:**
   - JSONLint: https://jsonlint.com/
   - JSON Formatter: https://jsonformatter.org/

2. **Command Line:**
   ```bash
   python -m json.tool your_file.json
   ```

3. **Code Editors:**
   - VS Code: Built-in JSON validation
   - Sublime Text: With JSON package
   - Notepad++: With JSON Viewer plugin

---

## Import Process Overview

1. **Upload** - Upload JSON file through the system interface
2. **Parse** - System parses and validates JSON structure
3. **Structure** - Configure academic structure (program, provider, subject)
4. **Metadata** - Review and confirm paper metadata
5. **Questions** - Review questions and map to topics
6. **Import** - System imports questions into database

---

## Support and Troubleshooting

### Common Import Errors

| Error Message | Cause | Solution |
|--------------|-------|----------|
| "Invalid JSON format" | Syntax error in JSON | Use JSON validator to find syntax issues |
| "Missing required field: type" | Question missing `type` field | Add `type` field to all questions |
| "MCQ question missing options" | MCQ without `options` array | Add `options` array to MCQ questions |
| "Invalid marks value" | Marks is string not number | Convert marks to numeric value |
| "Subject code not found" | Subject format incorrect | Use "Name - Code" format with dash |

### Getting Help

If you encounter issues:
1. Validate JSON syntax using online tool
2. Check all required fields are present
3. Verify data types match requirements
4. Review examples in this guide
5. Contact system administrator with error message

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-01-08 | Initial comprehensive guide |

---

## Appendix: Quick Reference

### Minimal MCQ Question Template
```json
{
  "question_number": "1",
  "type": "mcq",
  "topic": "Topic Name",
  "difficulty": "Medium",
  "question_text": "Question text here?",
  "figure": false,
  "attachments": [],
  "marks": 1,
  "options": [
    {"label": "A", "text": "Option A"},
    {"label": "B", "text": "Option B"},
    {"label": "C", "text": "Option C"},
    {"label": "D", "text": "Option D"}
  ],
  "correct_answer": "B",
  "answer_format": "selection",
  "hint": "Helpful hint",
  "explanation": "Explanation of answer"
}
```

### Minimal Descriptive Question Template
```json
{
  "question_number": "2",
  "type": "descriptive",
  "topic": "Topic Name",
  "difficulty": "Medium",
  "question_text": "Question text here?",
  "figure": false,
  "attachments": [],
  "marks": 3,
  "answer_format": "multi_line",
  "correct_answers": [
    {
      "answer": "Answer point 1",
      "marks": 1,
      "alternative_id": 1
    },
    {
      "answer": "Answer point 2",
      "marks": 1,
      "alternative_id": 2
    }
  ],
  "hint": "Helpful hint",
  "explanation": "Explanation of answer"
}
```

---

**Document End**

For the latest version of this guide, check the project repository.
