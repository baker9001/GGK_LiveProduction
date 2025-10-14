# General Extraction Guide v3.0
## Core Rules and Structures for IGCSE Past Paper Extraction

---

## 📋 **Overview**

This guide contains the foundational rules and structures that apply to ALL IGCSE subjects. Subject-specific guides extend these core rules with additional requirements for their unique question types and answer formats.

---

## 🏗️ **Document Architecture**

### **Modular System Structure**
```
general_extraction_guide.md (THIS DOCUMENT)
├── Core JSON Structure
├── Universal Extraction Rules
├── Mark Scheme Processing
└── Common Answer Formats

Subject-Specific Guides:
├── physics_extraction_guide.md
├── chemistry_extraction_guide.md
├── biology_extraction_guide.md
└── mathematics_extraction_guide.md
```

### **Implementation Hierarchy**
1. **Always apply** general rules first
2. **Then apply** subject-specific enhancements
3. **Never override** core rules unless explicitly stated in subject guide

---

## 🚨 **CRITICAL: Universal Extraction Rules**

### **1. Forward Slash (/) Handling - FUNDAMENTAL RULE**

**GOLDEN RULE:** Each text segment between forward slashes is a COMPLETE, STANDALONE answer

#### **Extraction Process:**
```
Mark Scheme: "regular arrangement/lattice of positive ions/magnesium ions/Mg²⁺ ions"

CORRECT Extraction:
1. "regular arrangement"
2. "lattice of positive ions"
3. "magnesium ions" (NOT "lattice of magnesium ions")
4. "Mg²⁺ ions" (NOT "lattice of Mg²⁺ ions")
```

### **2. Mark Scheme Line-by-Line Processing**

**PRINCIPLE:** Each separate line in mark scheme = separate answer object

```json
{
  "question_text": "What is meant by isotopes?",
  "marks": 2,
  "correct_answers": [
    // Line 1 alternatives
    {
      "answer": "(atoms with) same number of protons",
      "marks": 1,
      "alternative_id": 1,
      "linked_alternatives": [2, 3],
      "alternative_type": "one_required"
    },
    // Line 2 alternatives
    {
      "answer": "different number of neutrons",
      "marks": 1,
      "alternative_id": 4,
      "linked_alternatives": [5, 6],
      "alternative_type": "one_required"
    }
  ]
}
```

### **3. Alternative Linking System**

#### **Types of Alternatives:**
- **Forward slashes (/)** → `"alternative_type": "one_required"`
- **Bold OR** → `"alternative_type": "one_required"`
- **Bold AND** → `"alternative_type": "all_required"`
- **Implicit AND** (commas for single mark) → `"alternative_type": "all_required"`

#### **Linking Structure:**
```json
{
  "answer": "value1",
  "marks": 1,
  "alternative_id": 1,
  "linked_alternatives": [2, 3],
  "alternative_type": "one_required"
}
```

---

## 📊 **Core JSON Structure**

### **Paper Level**
```json
{
  "paper_code": "0620/42",
  "exam_year": 2024,
  "exam_session": "May/June",
  "paper_duration": "1 hour 15 minutes",
  "total_marks": 80,
  "questions": []
}
```

### **Question Level**
```json
{
  "program": "IGCSE",
  "provider": "Cambridge International (CIE)",
  "subject": "Subject - Code",
  "unit": "Unit name",
  "topic": "Topic name",
  "subtopic": "Subtopic name",
  "question_number": "1",
  "total_marks": 10,
  "difficulty": "Easy/Medium/Hard",
  "question_text": "Question text",
  "figure": false,
  "attachments": [],
  "parts": []
}
```

### **Answer Structure**
```json
{
  "answer": "specific answer",
  "marks": 1,
  "alternative_id": 1,
  "linked_alternatives": [],
  "alternative_type": "standalone",
  "context": {
    "type": "context_type",
    "value": "identifier",
    "label": "description"
  }
}
```

---

## 🏷️ **Mark Scheme Abbreviations**

### **Standard Cambridge Abbreviations**

| **Abbreviation** | **Meaning** | **Implementation** |
|------------------|-------------|-------------------|
| **;** | Separates marking points | New answer object |
| **/** | Alternative answers | Extract each separately |
| **OR** | Alternative marking point | Same as forward slash |
| **AND** | All required | Link with `"all_required"` |
| **R** | Reject | Add to `"rejected_answers"` |
| **I** | Ignore | Add to `"ignored_content"` |
| **A** | Accept | Add `"accept_level": "acceptable"` |
| **COND** | Conditional | Add `"conditional_on"` |
| **owtte** | Or words to that effect | `"accepts_equivalent_phrasing": true` |
| **ecf** | Error carried forward | `"error_carried_forward": true` |
| **ora** | Or reverse argument | `"accepts_reverse_argument": true` |
| **max** | Maximum marks | `"maximum_marks_available": X` |

---

## 🔄 **Student Answer Variation Handling**

### **When to Apply Enhanced Variation Handling**

#### **Mandatory Triggers:**
1. **Mark Scheme Indicators:**
   - `ora` (or reverse argument) appears
   - `owtte` (or words to that effect) appears
   - `A` (Accept) annotations present
   - Multiple valid phrasings expected

2. **Question Type Triggers:**
   - Comparison questions
   - Relationship questions
   - Descriptive observations
   - Open-ended explanations

### **Implementation Levels**

#### **Level 1: Simple Flag Addition**
For straightforward variations with owtte:

```json
{
  "answer": "temperature increases",
  "marks": 1,
  "accepts_equivalent_phrasing": true,
  "context": {
    "type": "change",
    "value": "temperature_change"
  }
}
```

#### **Level 2: Documented Variations**
For answers with known alternatives:

```json
{
  "answer": "temperature increases",
  "marks": 1,
  "accepts_equivalent_phrasing": true,
  "equivalent_variations": [
    "temperature rises",
    "temperature goes up",
    "gets hotter",
    "becomes warmer"
  ]
}
```

#### **Level 3: Comprehensive Variation Structure**
For complex answers with multiple valid forms:

```json
{
  "answer_id": "comparison_answer",
  "primary_answer": "A is larger than B",
  "marks": 1,
  "answer_variations": {
    "alternative_phrasings": [
      "A is bigger than B",
      "A exceeds B",
      "A is greater than B"
    ],
    "reverse_arguments": [
      "B is smaller than A",
      "B is less than A",
      "B < A"
    ],
    "mathematical_expressions": [
      "A > B",
      "B < A",
      "A - B > 0"
    ]
  },
  "marking_flags": {
    "accepts_reverse_argument": true,
    "accepts_mathematical_notation": true,
    "accepts_equivalent_phrasing": true
  }
}
```

### **Subject-Specific Variation Patterns**

Different subjects have characteristic variation patterns:

- **Physics**: Unit variations, formula representations
- **Chemistry**: Chemical notation, observation descriptions
- **Biology**: Anatomical terms, process descriptions
- **Mathematics**: Multiple solution methods, notation styles

---

## 📐 **Implementation Decision Framework**

### **When to Use Each Variation Level**

```
Mark Scheme Analysis
│
├─ Contains ora/owtte/A? ────── YES ──→ Level 2 or 3
│                         │
│                         └──── NO ───┐
│                                     │
├─ Comparison/Relationship? ──────────┤
│                                     │
├─ Multiple Valid Formats? ───────────┤
│                                     │
└─ Subject-Specific Variations? ──────┘
                │
                ├─ YES → Apply appropriate variation level
                │
                └─ NO → Standard extraction only
```

### **Variation Implementation Guidelines**

1. **Always Extract** the exact mark scheme answer first
2. **Add Flags** for ora/owtte/A annotations
3. **Document Variations** based on:
   - Subject-specific patterns
   - Question type
   - Common student responses
4. **Use Appropriate Structure**:
   - Simple variations → Level 1 (flags only)
   - Known alternatives → Level 2 (documented list)
   - Complex relationships → Level 3 (full structure)

### **Quality Assurance for Variations**

- [ ] Original mark scheme text preserved
- [ ] Variation flags correctly applied
- [ ] Subject-specific patterns recognized
- [ ] Alternative forms comprehensive
- [ ] Reverse arguments handled (ora)
- [ ] Equivalent phrasings listed (owtte)

---

## 🎯 **Universal Context System**

### **Required for ALL Answers**
Every answer must include context metadata:

```json
"context": {
  "type": "context_type",
  "value": "specific_identifier",
  "label": "human_readable_description"
}
```

### **Common Context Types**

| **Type** | **Usage** | **Example** |
|----------|-----------|-------------|
| `"option"` | Choice selection | Multiple choice options |
| `"position"` | Location reference | Diagram positions A, B, C |
| `"field"` | Form/table fields | Name, formula, value |
| `"property"` | Characteristics | Color, state, size |
| `"step"` | Sequential processes | Step 1, 2, 3 |
| `"component"` | Part of whole | Definition components |
| `"measurement"` | Measured values | Readings, observations |
| `"calculation"` | Computed results | Calculated values |

---

## 📝 **Comprehensive Question Types Coverage**

### **1. Multiple Choice Questions (MCQ)**

#### **Single Answer MCQ**
```json
{
  "type": "mcq",
  "mcq_type": "single_answer",
  "question_text": "What is the SI unit of force?",
  "options": [
    {"label": "A", "text": "kilogram"},
    {"label": "B", "text": "newton"},
    {"label": "C", "text": "joule"},
    {"label": "D", "text": "watt"}
  ],
  "correct_answer": "B",
  "marks": 1
}
```

#### **Multiple Correct MCQ**
```json
{
  "type": "mcq",
  "mcq_type": "multiple_correct",
  "question_text": "Which of the following are noble gases? (Select TWO)",
  "options": [
    {"label": "A", "text": "Helium"},
    {"label": "B", "text": "Nitrogen"},
    {"label": "C", "text": "Argon"},
    {"label": "D", "text": "Oxygen"}
  ],
  "correct_answer": "A and C",
  "correct_answers": [
    {"answer": "A", "marks": 0.5},
    {"answer": "C", "marks": 0.5}
  ],
  "marks": 1,
  "answer_requirement": "both_required"
}
```

#### **Best Answer MCQ**
```json
{
  "type": "mcq",
  "mcq_type": "best_answer",
  "question_text": "Which best describes the function of mitochondria?",
  "marking_note": "Option B is most complete answer",
  "partial_credit": {
    "A": 0.5,
    "B": 1,
    "C": 0.5,
    "D": 0
  }
}
```

### **2. True/False Questions**

```json
{
  "type": "true_false",
  "question_text": "All metals conduct electricity",
  "correct_answer": "True",
  "marks": 1,
  "explanation_required": false,
  "acceptable_answers": ["True", "T", "✓", "Yes"]
}
```

#### **True/False with Correction**
```json
{
  "type": "true_false_correction",
  "parts": [
    {
      "part": "a",
      "question_text": "True or false?",
      "correct_answer": "False",
      "marks": 1
    },
    {
      "part": "b",
      "question_text": "If false, write the correct statement",
      "correct_answer": "Most metals conduct electricity",
      "marks": 1
    }
  ]
}
```

### **3. Matching/Pairing Questions**

```json
{
  "type": "matching",
  "question_text": "Match each organ to its function",
  "left_column": [
    {"id": "1", "text": "Heart"},
    {"id": "2", "text": "Lungs"},
    {"id": "3", "text": "Kidney"}
  ],
  "right_column": [
    {"id": "A", "text": "Filters blood"},
    {"id": "B", "text": "Pumps blood"},
    {"id": "C", "text": "Gas exchange"}
  ],
  "correct_matches": [
    {"left": "1", "right": "B", "marks": 1},
    {"left": "2", "right": "C", "marks": 1},
    {"left": "3", "right": "A", "marks": 1}
  ],
  "marks": 3
}
```

### **4. Sequencing/Ordering Questions**

```json
{
  "type": "sequencing",
  "question_text": "Put these stages of mitosis in the correct order",
  "items": [
    {"id": "A", "text": "Metaphase"},
    {"id": "B", "text": "Prophase"},
    {"id": "C", "text": "Telophase"},
    {"id": "D", "text": "Anaphase"}
  ],
  "correct_sequence": ["B", "A", "D", "C"],
  "marks": 2,
  "partial_marking": {
    "all_correct": 2,
    "one_error": 1,
    "more_errors": 0
  }
}
```

### **5. Fill-in-the-Blanks**

#### **Single Blank**
```json
{
  "type": "fill_blank",
  "question_text": "The process by which plants make food is called _____",
  "correct_answer": "photosynthesis",
  "marks": 1,
  "case_sensitive": false
}
```

#### **Multiple Blanks**
```json
{
  "type": "fill_blanks_multiple",
  "question_text": "In the equation F = ma, F represents _____, m represents _____, and a represents _____",
  "blanks": [
    {
      "blank_id": 1,
      "correct_answer": "force",
      "marks": 1,
      "acceptable_variations": ["Force", "net force"]
    },
    {
      "blank_id": 2,
      "correct_answer": "mass",
      "marks": 1
    },
    {
      "blank_id": 3,
      "correct_answer": "acceleration",
      "marks": 1
    }
  ]
}
```

### **6. Show That Questions**

```json
{
  "type": "show_that",
  "question_text": "Show that the kinetic energy of the object is 450 J",
  "target_value": "450 J",
  "marks": 3,
  "marking_scheme": {
    "correct_formula": 1,
    "correct_substitution": 1,
    "reaches_given_answer": 1
  },
  "note": "Must reach exact given value for final mark"
}
```

### **7. Estimation Questions**

```json
{
  "type": "estimation",
  "question_text": "Estimate the height of your school building",
  "marks": 3,
  "marking_criteria": {
    "reasonable_assumption": 1,
    "valid_method": 1,
    "sensible_answer": 1
  },
  "acceptable_range": {
    "min": 8,
    "max": 20,
    "unit": "m"
  }
}
```

### **8. Data Response Questions**

```json
{
  "type": "data_response",
  "stimulus_material": {
    "type": "table",
    "description": "Temperature data over 5 days"
  },
  "parts": [
    {
      "part": "a",
      "question_text": "Calculate the mean temperature",
      "type": "calculation",
      "marks": 2
    },
    {
      "part": "b",
      "question_text": "Describe the trend",
      "type": "descriptive",
      "marks": 2
    }
  ]
}
```

### **9. Extended Response/Essay**

```json
{
  "type": "extended_response",
  "question_text": "Discuss the causes and effects of global warming",
  "marks": 8,
  "marking_criteria": {
    "content": {
      "causes_identified": 3,
      "effects_explained": 3
    },
    "quality": {
      "organization": 1,
      "scientific_terminology": 1
    }
  },
  "word_limit": "150-200 words"
}
```

### **10. Practical Assessment Questions**

```json
{
  "type": "practical_assessment",
  "apparatus_list": ["thermometer", "beaker", "stopwatch"],
  "parts": [
    {
      "part": "a",
      "type": "practical_method",
      "question_text": "Describe how to measure the cooling rate",
      "marks": 4
    },
    {
      "part": "b",
      "type": "results_table",
      "question_text": "Record your results",
      "marks": 3
    },
    {
      "part": "c",
      "type": "graph_plotting",
      "question_text": "Plot a graph of temperature against time",
      "marks": 4
    }
  ]
}
```

### **11. Error Spotting Questions**

```json
{
  "type": "error_spotting",
  "question_text": "Identify and correct the error in this equation",
  "given_content": "2H₂ + O₂ → H₂O",
  "error_type": "balancing",
  "correct_answer": "2H₂ + O₂ → 2H₂O",
  "marks": 2,
  "mark_distribution": {
    "identify_error": 1,
    "correct_error": 1
  }
}
```

### **12. Classification Questions**

```json
{
  "type": "classification",
  "question_text": "Classify these animals as vertebrates or invertebrates",
  "items": ["spider", "cat", "worm", "fish"],
  "categories": ["vertebrate", "invertebrate"],
  "correct_classification": {
    "vertebrate": ["cat", "fish"],
    "invertebrate": ["spider", "worm"]
  },
  "marks": 4
}
```

## 📐 **Answer Format Indicators**

### **Comprehensive Answer Format List**
Always include `"answer_format"` to indicate expected response:

#### **Text-Based Formats**
- `"single_word"` - One word expected
- `"single_line"` - One line of text
- `"multi_line"` - Multiple lines expected
- `"multi_line_labeled"` - Multiple lines with labels (A, B, etc.)
- `"paragraph"` - Extended text response
- `"essay"` - Structured extended response
- `"list"` - Bulleted or numbered list
- `"definition"` - Formal definition required

#### **Numerical Formats**
- `"calculation"` - Numerical calculation with working
- `"measurement"` - Reading from instrument
- `"estimation"` - Approximate value with reasoning
- `"percentage"` - Answer as percentage
- `"ratio"` - Answer in ratio form
- `"fraction"` - Answer as fraction
- `"decimal"` - Decimal number
- `"standard_form"` - Scientific notation

#### **Visual Formats**
- `"diagram"` - Drawing/sketch required
- `"graph"` - Plot or sketch graph
- `"table_completion"` - Completing a table
- `"chart"` - Bar chart, pie chart, etc.
- `"construction"` - Geometric construction
- `"annotation"` - Label existing diagram

#### **Selection Formats**
- `"selection"` - Selecting from options
- `"mcq"` - Multiple choice
- `"true_false"` - True or false
- `"matching"` - Pairing items
- `"classification"` - Sorting into categories
- `"ranking"` - Ordering by criteria

#### **Specialized Formats**
- `"equation"` - Chemical/mathematical equation
- `"formula"` - Scientific formula
- `"proof"` - Mathematical proof
- `"method"` - Experimental method
- `"evaluation"` - Critical analysis
- `"comparison"` - Comparative analysis

---

## 🔍 **Figure Detection Rules**

### **MANDATORY: Mark ALL Visual Elements**
```json
{
  "figure": true,
  "attachments": ["Description of visual element"]
}
```

### **Always Detect:**
- Tables (ANY tabular data)
- Diagrams (apparatus, process flows)
- Graphs (all types)
- Images (photos, illustrations)
- Charts (bar, pie, line)
- Maps (geographical, conceptual)
- Technical drawings
- Data presentations

---

## 🎓 **Educational Content Requirements**

### **MANDATORY for Every Question/Part/Subpart:**

1. **Hint** - Indirect guidance
```json
"hint": "Consider the relationship between molecular size and boiling point"
```

2. **Explanation** - Direct comprehensive explanation
```json
"explanation": "Larger molecules have stronger intermolecular forces, requiring more energy to separate them, thus higher boiling points"
```

---

## 🔧 **Answer Extraction Principles**

### **Extract What Students Write, Not Marking Criteria**

**Mark Scheme Says:** "coefficient 2 before HCl"
**Student Writes:** "2"
**Extract:** "2"

### **Auto-Marking Optimization**
Split combined answers for discrete checking:

**Mark Scheme:** "2⁺ AND 2⁻" [1 mark]

**Extraction:**
```json
[
  {
    "answer": "2⁺",
    "marks": 1,
    "alternative_id": 1,
    "linked_alternatives": [2],
    "alternative_type": "all_required"
  },
  {
    "answer": "2⁻",
    "marks": 1,
    "alternative_id": 2,
    "linked_alternatives": [1],
    "alternative_type": "all_required"
  }
]
```

---

## 🚨 **Quality Validation Checklist**

### **JSON Technical Validation**
- [ ] Valid JSON syntax
- [ ] Special characters escaped
- [ ] No trailing commas
- [ ] Proper structure nesting

### **Content Completeness**
- [ ] All questions extracted
- [ ] Academic classification complete
- [ ] Context system applied
- [ ] Hints and explanations included
- [ ] Figures detected with attachments

### **Mark Scheme Processing**
- [ ] Forward slashes correctly parsed
- [ ] Line-by-line separation maintained
- [ ] AND/OR conditions properly linked
- [ ] Abbreviations correctly handled

### **Subject Compatibility**
- [ ] Core rules preserved
- [ ] Ready for subject-specific extensions
- [ ] No conflicts with specialized formats

---

## 📋 **Implementation Order**

1. **Apply General Rules** (this guide)
2. **Check Subject Guide** for specific requirements
3. **Merge Requirements** where subject guide extends
4. **Validate Output** against both guides

## 🎯 **Command Word Interpretations**

### **IGCSE Command Words and Expected Responses**

Command words indicate the type and depth of response required. Always include command word analysis in question extraction:

#### **Knowledge & Understanding (AO1)**

| **Command Word** | **Meaning** | **Response Expected** | **Typical Marks** |
|------------------|-------------|----------------------|-------------------|
| **Define** | Give precise meaning | Clear, concise definition | 1-2 |
| **State** | Give brief answer | Short factual answer, no explanation | 1 |
| **Name/Identify** | Give name or identify from info | Single word/phrase | 1 |
| **List** | Give a number of points | Brief points, no explanation | 1 per point |
| **Outline** | Give main points | Brief description of main features | 2-3 |
| **Describe** | Give characteristics | Detailed account, no explanation needed | 2-4 |
| **What/When/Where** | Direct factual answer | Specific information | 1-2 |

#### **Application & Analysis (AO2)**

| **Command Word** | **Meaning** | **Response Expected** | **Typical Marks** |
|------------------|-------------|----------------------|-------------------|
| **Calculate** | Work out value | Show working + numerical answer | 2-4 |
| **Determine** | Find answer using data/info | Use given information to find answer | 2-4 |
| **Estimate** | Find approximate value | Reasonable approximation with method | 2-3 |
| **Show that** | Prove given statement | Working must lead to exact given answer | 2-4 |
| **Explain** | Give reasons | Clear reasoning with cause/effect | 2-4 |
| **Suggest** | Apply knowledge to new situation | Reasonable idea based on understanding | 1-3 |
| **Predict** | Say what will happen | Logical outcome based on information | 1-3 |
| **Sketch** | Draw approximate diagram/graph | General shape/relationship, not accurate | 2-3 |
| **Plot** | Mark accurate points on graph | Precise positioning required | 2-4 |
| **Draw** | Accurate representation | Careful, accurate diagram | 2-4 |

#### **Evaluation & Synthesis (AO3)**

| **Command Word** | **Meaning** | **Response Expected** | **Typical Marks** |
|------------------|-------------|----------------------|-------------------|
| **Compare** | Give similarities AND differences | Balanced comparison of both | 3-4 |
| **Contrast** | Give differences only | Focus on differences | 2-3 |
| **Discuss** | Consider different aspects | Balanced argument, multiple viewpoints | 4-8 |
| **Evaluate** | Judge importance/quality | Assessment with evidence/reasoning | 4-6 |
| **Justify** | Support answer with evidence | Clear reasoning for position taken | 3-4 |
| **Comment on** | Make judgment about | Informed observation with support | 2-4 |
| **Assess** | Make informed judgment | Weigh up evidence, give conclusion | 4-6 |
| **To what extent** | Judge degree/importance | Balanced argument with conclusion | 4-8 |

### **Command Word Implementation**

```json
{
  "question_analysis": {
    "command_word": "explain",
    "expected_response_type": "reasoning",
    "response_requirements": [
      "cause and effect",
      "scientific reasoning",
      "clear link between points"
    ],
    "typical_structure": {
      "point": "statement of fact",
      "explanation": "because/therefore/this means",
      "consequence": "resulting effect"
    }
  }
}
```

### **Multi-Command Questions**

```json
{
  "complex_command": {
    "question_text": "Describe and explain the trend shown in the graph",
    "command_words": ["describe", "explain"],
    "response_structure": {
      "describe": {
        "marks": 2,
        "requirement": "what the trend shows"
      },
      "explain": {
        "marks": 3,
        "requirement": "why this trend occurs"
      }
    }
  }
}
```

Each subject guide may extend:
- Additional `answer_format` values
- Subject-specific `context` types
- Specialized abbreviations
- Unique marking patterns
- Extended validation rules

Subject guides MUST NOT override:
- Core JSON structure
- Forward slash extraction
- Basic mark scheme processing
- Universal context requirement
- Figure detection rules

---

## 📝 **Version History**

- **v3.0** - Modular architecture with subject-specific extensions
- **v2.9** - Complete unified guide (preserved in core rules)
- Previous versions incorporated

## 📊 **Question Type Coverage Summary**

### **Complete Coverage Matrix**

| **Category** | **Question Types** | **Covered In** |
|--------------|-------------------|----------------|
| **Selection** | MCQ (single, multiple, best), True/False, Matching, Classification | General + All |
| **Text Response** | Single word/line, Multi-line, Paragraph, Essay, List | General + All |
| **Numerical** | Calculation, Measurement, Estimation, Show that | General + Math/Physics |
| **Visual** | Diagram, Graph, Table, Construction, Labeling | All subjects |
| **Sequential** | Ordering, Ranking, Process steps | General + Bio/Chem |
| **Analytical** | Compare, Evaluate, Explain, Justify | General + All |
| **Practical** | Method, Variables, Results, Improvements | All sciences |
| **Specialized** | Proofs (Math), Equations (Chem), Crosses (Bio), Circuits (Phys) | Subject-specific |

### **Quick Reference: Answer Format by Question Type**

| **Question Type** | **Answer Format** | **Key Requirements** |
|-------------------|-------------------|---------------------|
| Define | `single_line` or `definition` | Precise, concise |
| Calculate | `calculation` | Working + answer + unit |
| Explain | `multi_line` | Cause and effect |
| Compare | `comparison` | Similarities AND differences |
| Sketch | `diagram` | General shape, key features |
| Plot | `graph` | Accurate points, scales |
| Show that | `proof` or `calculation` | Must reach exact answer |
| Describe | `multi_line` | Detailed features |
| Suggest | `single_line` or `multi_line` | Reasonable based on context |
| Draw | `diagram` | Accurate, labeled |

### **Implementation Checklist**

#### **For Every Question:**
- [ ] Identify question type(s)
- [ ] Determine answer format
- [ ] Check command words
- [ ] Apply subject-specific rules
- [ ] Include all required fields
- [ ] Add appropriate context
- [ ] Validate marking scheme

#### **For Complex Questions:**
- [ ] Break into parts/subparts
- [ ] Link related answers
- [ ] Track method marks
- [ ] Include alternative methods
- [ ] Handle special cases

---

## 🚀 **Ready for Implementation**

This modular system now provides:
- ✅ 100% coverage of IGCSE question types
- ✅ Subject-specific enhancements
- ✅ Backward compatibility with v2.9
- ✅ Clear implementation pathways
- ✅ Comprehensive validation rules

Target accuracy: **90%+ across all subjects and paper types**

---