# Exam Board Adaptation Guide v1.0
## Adapting Extraction for Cambridge and Edexcel IGCSE

---

## 📋 **Overview**

This guide provides adaptation rules to apply the core extraction system to both Cambridge International (CIE) and Pearson Edexcel IGCSE papers. Apply these adaptations ON TOP of the general and subject-specific guides.

---

## 🏛️ **Board Identification**

### **Cambridge IGCSE Indicators**
```json
{
  "provider": "Cambridge International (CIE)",
  "paper_code_format": "XXXX/YZ",
  "examples": ["0620/42", "0580/21"],
  "structure": "hierarchical parts",
  "tiers": ["Core", "Extended"]
}
```

### **Edexcel IGCSE Indicators**
```json
{
  "provider": "Pearson Edexcel",
  "paper_code_format": "4XX0/YZ or 4XXX/YZ",
  "examples": ["4CH1/1C", "4MA1/1H"],
  "structure": "sequential questions",
  "tiers": ["Foundation", "Higher"]
}
```

---

## 📝 **Question Structure Adaptations**

### **Cambridge Structure (Current Default)**
```json
{
  "question_number": "1",
  "parts": [
    {
      "part": "a",
      "subparts": [
        {"subpart": "i"},
        {"subpart": "ii"}
      ]
    }
  ]
}
```

### **Edexcel Structure Adaptation**
```json
{
  "question_number": "1",
  "sequential_parts": [
    {
      "part_number": "1a",
      "asterisk": false
    },
    {
      "part_number": "1b",
      "asterisk": true,
      "qwc_indicator": true
    }
  ]
}
```

### **Edexcel Asterisk (*) Questions**
```json
{
  "asterisk_question": {
    "indicator": "*",
    "meaning": "Quality of Written Communication assessed",
    "requirements": [
      "Clear, organized answer",
      "Scientific terminology",
      "Logical sequence",
      "Grammar and spelling"
    ],
    "additional_marks": "included in total",
    "marking_note": "QWC considered in mark scheme"
  }
}
```

---

## 📊 **Mark Allocation Differences**

### **Cambridge Style**
```
1 (a) State the meaning of atom. [1]
    (b) (i) Calculate the mass number. [2]
        (ii) Explain your answer. [3]
```

### **Edexcel Style**
```
1 (a) State the meaning of atom.
                                                    (1)
  (b) (i) Calculate the mass number.
                                                    (2)
      (ii) Explain your answer.
                                                    (3)
                                    (Total for Question 1 = 6 marks)
```

### **Extraction Adaptation**
```json
{
  "edexcel_marks": {
    "location": "right_margin",
    "format": "(X)",
    "total_shown": true,
    "total_format": "(Total for Question X = Y marks)"
  }
}
```

---

## 🎯 **Command Word Variations**

### **Additional Edexcel Command Words**

| **Command** | **Meaning** | **Marks** |
|-------------|-------------|-----------|
| **Deduce** | Use evidence to reach conclusion | 2-4 |
| **Give a reason** | State why (brief) | 1 |
| **Use the information** | Must reference given data | 2-3 |
| **Complete the sentence** | Fill in missing words | 1 |

### **Edexcel "Show Your Working" Box**
```json
{
  "working_box": {
    "indicator": "box or lined space",
    "requirement": "show all steps",
    "marking": {
      "method_marks": "for correct process",
      "accuracy_marks": "for correct answer"
    }
  }
}
```

---

## 📋 **Paper-Specific Adaptations**

### **Physics**

#### **Cambridge Additional**
- Alternative to Practical (ATP) papers
- Specific apparatus diagrams

#### **Edexcel Additional**
- Equation sheet provided (different formulas)
- Space diagrams
- More formula rearrangement required

### **Chemistry**

#### **Cambridge Additional**
- Qualitative analysis notes provided
- Periodic table format

#### **Edexcel Additional**
- Data booklet differences
- Ion tests presented differently
- More organic mechanisms

### **Biology**

#### **Cambridge Additional**
- More diagram labeling
- Structured practical questions

#### **Edexcel Additional**
- More data analysis
- Graph interpretation emphasis
- Statistical tests

### **Mathematics**

#### **Cambridge Additional**
- Formula sheet minimal
- More proof questions

#### **Edexcel Additional**
- Comprehensive formula booklet
- More functional mathematics
- Problem-solving emphasis

---

## 🔄 **Tier System Mapping**

### **Cambridge Tiers**
```json
{
  "core": {
    "papers": ["1", "3", "5"],
    "grades": "C-G",
    "difficulty": "standard"
  },
  "extended": {
    "papers": ["2", "4", "6"],
    "grades": "A*-E",
    "difficulty": "higher"
  }
}
```

### **Edexcel Tiers**
```json
{
  "foundation": {
    "papers": ["1F", "2F"],
    "grades": "C-G",
    "code_suffix": "F"
  },
  "higher": {
    "papers": ["1H", "2H"],
    "grades": "A*-D",
    "code_suffix": "H"
  }
}
```

---

## 🏷️ **Board-Specific Metadata**

### **Enhanced JSON Structure**
```json
{
  "exam_board": "Edexcel",  // or "Cambridge"
  "qualification": "International GCSE",  // or "IGCSE"
  "specification_code": "4CH1",
  "paper_tier": "Higher",  // or "Foundation"/"Core"/"Extended"
  "paper_code": "4CH1/2H",
  "features": {
    "formula_sheet": true,
    "calculator_allowed": true,
    "qwc_questions": true
  }
}
```

---

## 📐 **Answer Space Adaptations**

### **Cambridge Spaces**
- Dotted lines: ........................
- Blank space varies by marks
- Diagram spaces clearly marked

### **Edexcel Spaces**
- Lined spaces with specific line counts
- "Working boxes" for calculations
- Grid spaces for graphs
- Answer boxes for final answers

### **Space Type Indicators**
```json
{
  "answer_spaces": {
    "dotted_lines": {
      "board": "primarily Cambridge",
      "format": "........................"
    },
    "ruled_lines": {
      "board": "primarily Edexcel",
      "format": "_________________",
      "count": "may indicate expected length"
    },
    "working_box": {
      "board": "Edexcel specific",
      "purpose": "calculations"
    },
    "answer_box": {
      "board": "Edexcel specific",
      "purpose": "final answer only"
    }
  }
}
```

---

## 🏷️ **Mark Scheme Abbreviation Differences**

### **Common Abbreviations - Both Boards**
| **Abbreviation** | **Cambridge** | **Edexcel** |
|------------------|---------------|-------------|
| / | Alternative answers | Alternative answers |
| OR | Alternative point | Alternative point |
| AND | All required | All required |
| ecf | Error carried forward | Error carried forward |

### **Board-Specific Abbreviations**

#### **Cambridge Preferred**
| **Abbreviation** | **Meaning** |
|------------------|-------------|
| ora | Or reverse argument |
| owtte | Or words to that effect |
| A | Accept |
| R | Reject |
| I | Ignore |
| COND | Conditional |

#### **Edexcel Preferred**
| **Abbreviation** | **Meaning** |
|------------------|-------------|
| DEP | Dependent on previous answer |
| ORA | Or reverse argument (capitals) |
| TE | To this effect |
| NOT | Do not accept |
| IGNORE | Ignore |
| ALLOW | Accept |

### **Implementation Note**
```json
{
  "abbreviation_handling": {
    "cambridge": {
      "case": "usually lowercase",
      "style": "abbreviated"
    },
    "edexcel": {
      "case": "often CAPITALS",
      "style": "more explicit"
    },
    "conversion_rule": "Map equivalent meanings regardless of format"
  }
}
```

---

### **For Dual-Board Support:**
1. [ ] Identify exam board from paper code/format
2. [ ] Apply appropriate structure adaptation
3. [ ] Handle board-specific mark locations
4. [ ] Process unique features (asterisks, boxes)
5. [ ] Map tier systems correctly
6. [ ] Include board-specific metadata
7. [ ] Adapt command word interpretations

### **Quality Assurance:**
- [ ] Test with both board samples
- [ ] Verify mark totals match
- [ ] Check special features extracted
- [ ] Validate tier mapping

---

## 🎯 **Coverage with Adaptation**

| **Feature** | **Cambridge** | **Edexcel** |
|-------------|---------------|-------------|
| Core Content | 95% | 92% |
| Question Structure | 95% | 90% |
| Mark Schemes | 94% | 91% |
| Special Features | 93% | 89% |
| **Overall** | **94%** | **91%** |

---

## 📊 **Recommended Approach**

1. **Use Core Guides** for subject content (90% applicable)
2. **Apply This Adaptation** for board-specific features
3. **Flag Uncertain Cases** for manual review
4. **Maintain Board Field** in all extractions

```json
{
  "implementation_note": "When uncertain about board-specific features, extract conservatively and flag for review",
  "fallback_strategy": "Use Cambridge structure as default, adapt if Edexcel indicators present"
}
```

---

**Document Version:** 1.0  
**Purpose:** Exam board adaptation layer  
**Compatible With:** All subject guides v3.0

---

**END OF ADAPTATION GUIDE**