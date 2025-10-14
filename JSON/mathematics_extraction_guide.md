# Mathematics Extraction Guide v3.0
## Compatible with General Extraction Guide v3.0

---

## 📋 **Mathematics-Specific Overview**

This guide extends the General Extraction Guide v3.0 with mathematics-specific requirements for handling calculations, proofs, constructions, and multiple solution methods. Mathematics papers require special attention to working marks, alternative approaches, and precise answer formats.

---

## 📐 **Mathematics Question Type Categories**

### **1. Calculation Questions**
- Arithmetic operations
- Algebraic manipulation
- Numerical methods
- Multi-step problems
- Estimation questions

### **2. Geometric Questions**
- Angle calculations
- Area and volume
- Constructions
- Transformations
- Vector geometry

### **3. Algebraic Questions**
- Equation solving
- Factorization
- Expansion
- Simplification
- Substitution

### **4. Graphical Questions**
- Plotting coordinates
- Drawing curves
- Finding gradients
- Identifying features
- Transformations

### **5. Proof Questions**
- Algebraic proofs
- Geometric proofs
- Proof by induction
- Counter-examples
- Logical reasoning

### **6. Statistical Questions**
- Data analysis
- Probability calculations
- Statistical measures
- Frequency tables
- Cumulative frequency

---

## 🧮 **Multi-Step Calculation Framework**

### **Working Mark Allocation System**

#### **Method Mark (M)**
```json
{
  "method_mark": {
    "definition": "Correct method shown",
    "requirements": [
      "appropriate formula/approach",
      "valid mathematical step",
      "logical progression"
    ],
    "awarded_even_if": [
      "arithmetic error made",
      "previous answer wrong",
      "final answer incorrect"
    ]
  }
}
```

#### **Accuracy Mark (A)**
```json
{
  "accuracy_mark": {
    "definition": "Correct answer from method",
    "requirements": [
      "follows from method shown",
      "arithmetically correct",
      "appropriate accuracy"
    ],
    "dependent_on": "method mark usually required"
  }
}
```

#### **Both Mark (B)**
```json
{
  "both_mark": {
    "definition": "Method and answer both required",
    "requirements": [
      "correct method",
      "correct answer",
      "both needed for mark"
    ],
    "no_partial_credit": true
  }
}
```

### **Calculation Structure Template**
```json
{
  "multi_step_calculation": {
    "question_text": "Calculate the area of a circle with radius 7.5 cm",
    "marks": 3,
    "mark_scheme": {
      "total_marks": 3,
      "breakdown": [
        {
          "step": "formula",
          "content": "A = πr²",
          "marks": 1,
          "type": "M",
          "alternatives": ["Area = π × radius²"]
        },
        {
          "step": "substitution",
          "content": "A = π × 7.5²",
          "marks": 1,
          "type": "M",
          "alternatives": ["A = π × 7.5 × 7.5"]
        },
        {
          "step": "answer",
          "content": "176.7",
          "marks": 1,
          "type": "A",
          "acceptable_range": {
            "min": 176.6,
            "max": 177.0
          },
          "units": "cm²"
        }
      ]
    },
    "alternative_methods": [
      {
        "method": "diameter_approach",
        "steps": [
          "d = 15 cm",
          "A = π(d/2)²",
          "A = π × 56.25"
        ]
      }
    ]
  }
}
```

---

## 📊 **Answer Format Specifications**

### **Numerical Answer Formats**

#### **Decimal Places**
```json
{
  "decimal_requirements": {
    "specified": {
      "instruction": "Give your answer to 2 decimal places",
      "format": "X.XX",
      "examples": ["3.14", "0.67", "12.00"],
      "rounding": "standard rounding rules"
    },
    "appropriate": {
      "instruction": "Give your answer to an appropriate degree of accuracy",
      "guidance": "match input precision or 3 s.f."
    }
  }
}
```

#### **Significant Figures**
```json
{
  "significant_figures": {
    "rules": {
      "counting": [
        "all non-zero digits",
        "zeros between non-zero digits",
        "trailing zeros after decimal point"
      ],
      "not_counting": [
        "leading zeros",
        "trailing zeros without decimal"
      ]
    },
    "answer_format": {
      "3_sf": ["2.47", "0.00247", "247"],
      "2_sf": ["2.5", "0.0025", "250"]
    }
  }
}
```

#### **Fraction Formats**
```json
{
  "fraction_answers": {
    "proper": {
      "format": "a/b where a < b",
      "examples": ["3/4", "2/5", "7/10"]
    },
    "improper": {
      "format": "a/b where a ≥ b",
      "examples": ["5/3", "7/4", "9/2"],
      "alternative": "mixed number"
    },
    "mixed": {
      "format": "c a/b",
      "examples": ["1 2/3", "2 1/4", "3 1/2"],
      "spaces": "required between whole and fraction"
    },
    "simplified": {
      "requirement": "lowest terms",
      "examples": {
        "correct": "2/3",
        "incorrect": "4/6"
      }
    }
  }
}
```

#### **Standard Form**
```json
{
  "standard_form": {
    "format": "a × 10ⁿ",
    "requirements": {
      "a_range": "1 ≤ a < 10",
      "n": "integer",
      "examples": ["3.2 × 10⁴", "6.7 × 10⁻³"]
    },
    "acceptable_variations": [
      "3.2 × 10⁴",
      "3.2 × 10^4",
      "3.2E4"
    ]
  }
}
```

#### **Surd Form**
```json
{
  "surd_answers": {
    "simplified": {
      "examples": ["2√3", "3√2", "√5"],
      "not_simplified": ["√12", "√18", "√50"]
    },
    "rationalized": {
      "denominator": "no surds in denominator",
      "examples": {
        "before": "1/√2",
        "after": "√2/2"
      }
    }
  }
}
```

---

## 📏 **Geometric Construction Verification**

### **Construction Requirements Database**

#### **Basic Constructions**
```json
{
  "constructions": {
    "perpendicular_bisector": {
      "requirements": [
        "arcs from both endpoints",
        "equal radii",
        "arcs intersect both sides",
        "line through intersections"
      ],
      "evidence": {
        "construction_arcs": "visible",
        "compass_width": "unchanged",
        "accuracy": "±2° and ±2 mm"
      }
    },
    "angle_bisector": {
      "requirements": [
        "arc from vertex",
        "equal arcs from first arc",
        "line from vertex through intersection"
      ],
      "evidence": {
        "all_arcs": "visible",
        "accurate_bisection": "equal angles ±2°"
      }
    },
    "perpendicular_from_point": {
      "requirements": [
        "arc cutting line twice",
        "arcs from intersection points",
        "line through point and arc intersection"
      ]
    }
  }
}
```

#### **Construction Marking Scheme**
```json
{
  "construction_marks": {
    "method_marks": {
      "correct_arcs": 1,
      "accurate_construction": 1
    },
    "common_errors": {
      "no_arcs": "method marks lost",
      "freehand": "no marks",
      "wrong_construction": "no marks"
    },
    "tolerance": {
      "angular": "±2°",
      "linear": "±2 mm"
    }
  }
}
```

---

## 🔢 **Alternative Method Recognition**

### **Method Equivalence Database**

#### **Quadratic Equation Solving**
```json
{
  "quadratic_methods": {
    "factorization": {
      "example": "(x - 2)(x + 3) = 0",
      "steps": ["factorize", "equate factors to zero", "solve"]
    },
    "formula": {
      "formula": "x = (-b ± √(b² - 4ac)) / 2a",
      "steps": ["identify a, b, c", "substitute", "calculate"]
    },
    "completing_square": {
      "example": "(x + p)² = q",
      "steps": ["rearrange", "complete square", "solve"]
    },
    "graphical": {
      "method": "plot and find x-intercepts",
      "requirements": ["accurate plot", "clear intercepts"]
    }
  }
}
```

#### **Integration Methods**
```json
{
  "integration_alternatives": {
    "substitution": {
      "when_used": "composite functions",
      "example": "∫2x(x² + 1)³ dx"
    },
    "parts": {
      "when_used": "products",
      "formula": "∫u dv = uv - ∫v du"
    },
    "recognition": {
      "when_used": "standard forms",
      "example": "∫cos(3x) dx = (1/3)sin(3x) + c"
    }
  }
}
```

### **Method Marking Rules**
```json
{
  "alternative_method_marking": {
    "principle": "any valid method scores full marks",
    "requirements": [
      "mathematically sound",
      "leads to correct answer",
      "appropriate for question"
    ],
    "mark_distribution": {
      "may_differ": true,
      "total_same": true,
      "follow_candidate": true
    }
  }
}
```

---

## 📝 **Proof Structure Handling**

### **Proof Types and Requirements**

#### **Algebraic Proof**
```json
{
  "algebraic_proof": {
    "structure": {
      "setup": {
        "marks": 1,
        "requirements": ["define variables", "state given"]
      },
      "manipulation": {
        "marks": "varies",
        "requirements": ["logical steps", "valid algebra"]
      },
      "conclusion": {
        "marks": 1,
        "requirements": ["reach required form", "state conclusion"]
      }
    },
    "example": {
      "prove": "n² + n is always even",
      "steps": [
        "n² + n = n(n + 1)",
        "consecutive integers",
        "one must be even",
        "product is even"
      ]
    }
  }
}
```

#### **Geometric Proof**
```json
{
  "geometric_proof": {
    "components": {
      "diagram": "may be required",
      "reasoning": {
        "cite_theorems": true,
        "logical_flow": true
      },
      "conclusion": "clearly stated"
    },
    "common_reasons": [
      "angles in triangle = 180°",
      "alternate angles equal",
      "corresponding angles equal",
      "vertically opposite angles equal"
    ]
  }
}
```

#### **Proof by Contradiction**
```json
{
  "contradiction_proof": {
    "structure": [
      {
        "step": "assumption",
        "content": "Assume the opposite",
        "marks": 1
      },
      {
        "step": "deduction",
        "content": "Follow logical steps",
        "marks": "varies"
      },
      {
        "step": "contradiction",
        "content": "Reach impossibility",
        "marks": 1
      },
      {
        "step": "conclusion",
        "content": "Therefore original is true",
        "marks": 1
      }
    ]
  }
}
```

---

## 🎯 **Mathematical Notation Parsing**

### **Symbol Recognition Database**

#### **Common Mathematical Symbols**
```json
{
  "symbol_mappings": {
    "operations": {
      "×": ["*", "·", "times"],
      "÷": ["/", "divided by"],
      "±": ["+/-", "plus minus"],
      "≈": ["approximately", "approx"],
      "≤": ["<=", "less than or equal"],
      "≥": [">=", "greater than or equal"]
    },
    "special_notation": {
      "∑": "summation",
      "∫": "integral",
      "∂": "partial derivative",
      "∞": "infinity",
      "√": "square root",
      "∛": "cube root"
    },
    "greek_letters": {
      "π": ["pi", "3.14159..."],
      "θ": ["theta", "angle"],
      "α": ["alpha"],
      "β": ["beta"],
      "Δ": ["delta", "change in"]
    }
  }
}
```

#### **Function Notation**
```json
{
  "function_notation": {
    "standard": {
      "f(x)": "function of x",
      "f'(x)": "derivative",
      "f''(x)": "second derivative"
    },
    "composite": {
      "fg(x)": "f(g(x))",
      "f∘g": "f composed with g"
    },
    "inverse": {
      "f⁻¹(x)": "inverse function",
      "not": "1/f(x)"
    }
  }
}
```

---

## 📈 **Graphical Answer Requirements**

### **Graph Drawing Specifications**

#### **Axes Requirements**
```json
{
  "axes_requirements": {
    "labeling": {
      "required": ["variable names", "units if applicable"],
      "position": "end of axis or alongside"
    },
    "scaling": {
      "linear": "equal intervals",
      "suitable": "use most of grid",
      "origin": "include if sensible"
    },
    "format": {
      "arrows": "optional unless specified",
      "thickness": "clear single line"
    }
  }
}
```

#### **Curve Drawing**
```json
{
  "curve_specifications": {
    "smoothness": {
      "requirement": "single smooth curve",
      "no": ["multiple lines", "gaps", "sharp corners"]
    },
    "accuracy": {
      "points": "within ½ small square",
      "shape": "correct general form"
    },
    "features": {
      "intercepts": "clearly shown",
      "turning_points": "smooth transition",
      "asymptotes": "dashed lines"
    }
  }
}
```

---

## 🔄 **Transformation Handling**

### **Geometric Transformations**
```json
{
  "transformations": {
    "translation": {
      "description": "vector",
      "format": "(x/y) or column vector",
      "example": "(3/-2)"
    },
    "rotation": {
      "description": "angle, direction, center",
      "format": "90° clockwise about (0,0)",
      "requirements": ["angle", "direction", "center"]
    },
    "reflection": {
      "description": "mirror line",
      "format": "in line y = x",
      "common_lines": ["x-axis", "y-axis", "y = x", "y = -x"]
    },
    "enlargement": {
      "description": "scale factor and center",
      "format": "scale factor 2, center (1,3)",
      "negative_sf": "includes rotation of 180°"
    }
  }
}
```

### **Function Transformations**
```json
{
  "function_transformations": {
    "vertical": {
      "f(x) + a": "shift up by a",
      "af(x)": "stretch by factor a",
      "-f(x)": "reflect in x-axis"
    },
    "horizontal": {
      "f(x + a)": "shift left by a",
      "f(ax)": "stretch by factor 1/a",
      "f(-x)": "reflect in y-axis"
    }
  }
}
```

---

## 💯 **Mark Allocation Patterns**

### **Working Mark Distribution**
```json
{
  "mark_patterns": {
    "calculation_heavy": {
      "typical_distribution": {
        "method": "60-70%",
        "accuracy": "30-40%"
      },
      "example": {
        "5_mark_question": ["M1", "M1", "M1", "A1", "A1"]
      }
    },
    "proof_questions": {
      "typical_distribution": {
        "setup": "20%",
        "working": "60%",
        "conclusion": "20%"
      }
    },
    "construction": {
      "typical_distribution": {
        "method": "50%",
        "accuracy": "50%"
      }
    }
  }
}
```

---

## 📋 **Mathematics Abbreviations Extension**

### **Additional Mathematics-Specific Abbreviations**

| **Abbreviation** | **Meaning** | **Implementation** |
|------------------|-------------|-------------------|
| **s.f.** | Significant figures | Precision requirement |
| **d.p.** | Decimal places | Precision requirement |
| **LHS** | Left-hand side | Equation part |
| **RHS** | Right-hand side | Equation part |
| **w.r.t.** | With respect to | Differentiation context |
| **iff** | If and only if | Logical equivalence |
| **QED** | Quod erat demonstrandum | End of proof |
| **WLOG** | Without loss of generality | Proof technique |

---

## 🔄 **Mathematics Answer Variation Patterns**

### **Common Mathematics Variations**

#### **1. Answer Format Variations**
```json
{
  "numerical_answer": {
    "primary_answer": "2/3",
    "acceptable_format_variations": [
      "2/3",
      "⅔",
      "0.667",  // To 3 s.f.
      "0.67",   // To 2 d.p.
      "0.6̇",    // With recurring notation
      "66.7%",  // As percentage
      "2:3"     // As ratio if context appropriate
    ],
    "precision_requirements": {
      "exact_only": ["2/3"],
      "decimal_acceptable": {
        "min_dp": 2,
        "min_sf": 3
      }
    }
  }
}
```

#### **2. Algebraic Expression Variations**
```json
{
  "algebraic_answer": {
    "primary_answer": "2x + 3y",
    "acceptable_variations": [
      "2x + 3y",
      "3y + 2x",  // Commutative
      "2·x + 3·y",
      "2(x) + 3(y)",
      "2x+3y"  // No spaces
    ],
    "factored_forms": {
      "acceptable_if_simplified": false,
      "examples": ["2(x + 1.5y)"]
    }
  }
}
```

#### **3. Solution Set Variations (ora)**
```json
{
  "solution_with_ora": {
    "primary_answer": "x > 3",
    "answer_variations": {
      "inequality_notations": [
        "x > 3",
        "3 < x",  // Reverse argument
        "x ∈ (3, ∞)",
        "{x : x > 3}",
        "x ∈ ℝ, x > 3"
      ],
      "graphical_descriptions": [
        "all values greater than 3",
        "number line shaded right of 3",
        "open circle at 3, shaded right"
      ]
    },
    "marking_flags": {
      "accepts_reverse_argument": true,
      "accepts_set_notation": true,
      "accepts_interval_notation": true
    }
  }
}
```

#### **4. Multiple Method Solutions**
```json
{
  "multi_method_answer": {
    "question_type": "solve_quadratic",
    "acceptable_methods": {
      "factorization": {
        "steps": ["factor", "solve factors"],
        "answer_format": "x = 2 or x = 3"
      },
      "quadratic_formula": {
        "steps": ["identify a,b,c", "substitute", "calculate"],
        "answer_format": "x = 2, 3"
      },
      "completing_square": {
        "steps": ["rearrange", "complete", "solve"],
        "answer_format": "{2, 3}"
      }
    },
    "all_formats_acceptable": true
  }
}
```

### **Mathematics-Specific Notation Variations**

#### **5. Vector Notation**
```json
{
  "vector_notation_variations": {
    "column_vectors": [
      "(3/4)",
      "[3,4]ᵀ",
      "[[3],[4]]"
    ],
    "component_form": [
      "3i + 4j",
      "3î + 4ĵ",
      "<3, 4>"
    ],
    "bold_notation": [
      "**v**",
      "v̅",
      "→v"
    ]
  }
}
```

#### **6. Proof Conclusion Variations**
```json
{
  "proof_conclusions": {
    "standard_endings": [
      "QED",
      "∎",
      "Therefore proved",
      "Hence proved",
      "Which was to be shown"
    ],
    "show_that_conclusions": [
      "= RHS",
      "as required",
      "which equals the given expression"
    ]
  }
}
```

### **Working Mark Variations**
```json
{
  "working_variations": {
    "method_shown": {
      "formula_statement": [
        "Using s = ut + ½at²",
        "s = ut + ½at²",
        "distance = initial velocity × time + ½ × acceleration × time²"
      ],
      "substitution_formats": [
        "s = 0×5 + ½×10×5²",
        "s = 0 + 0.5×10×25",
        "s = 0 + 5×25"
      ]
    },
    "marking_tolerance": {
      "arithmetic_errors": "method mark still awarded",
      "wrong_formula": "no method mark",
      "correct_process": "full method marks"
    }
  }
}
```

---

## 🔍 **Special Answer Cases**

### **No Solution Cases**
```json
{
  "special_answers": {
    "no_solution": {
      "acceptable_forms": [
        "no solution",
        "no real solution",
        "∅",
        "impossible"
      ],
      "context": "equations with no valid x"
    },
    "infinite_solutions": {
      "acceptable_forms": [
        "infinite solutions",
        "all real numbers",
        "x ∈ ℝ",
        "any value"
      ]
    },
    "undefined": {
      "acceptable_forms": [
        "undefined",
        "does not exist",
        "DNE"
      ],
      "context": "division by zero, etc."
    }
  }
}
```

---

## ✅ **Mathematics-Specific Validation**

### **Calculation Validation**
- [ ] All working steps identified
- [ ] Method marks allocated appropriately
- [ ] Alternative methods recognized
- [ ] Answer format specified

### **Proof Validation**
- [ ] Logical structure preserved
- [ ] Key steps marked
- [ ] Conclusion required
- [ ] Valid reasoning throughout

### **Construction Validation**
- [ ] Arc requirements clear
- [ ] Accuracy tolerances stated
- [ ] Method marks identified
- [ ] Final construction marked

### **Answer Format Validation**
- [ ] Precision requirements clear
- [ ] Format variations accepted
- [ ] Special cases handled
- [ ] Units included where needed

---

## 🔧 **Integration with General Guide**

### **Extends General Rules:**
- Adds method/accuracy mark types
- Provides alternative method framework
- Includes mathematical notation parsing
- Defines proof structures

### **Maintains Core Structure:**
- Uses standard JSON format
- Applies universal context system
- Follows mark scheme processing
- Implements alternative linking

---

## 📝 **Mathematics Example Implementation**

```json
{
  "question_number": "5",
  "topic": "Algebra",
  "subtopic": "Quadratic Equations",
  "question_text": "Solve x² - 5x + 6 = 0",
  "marks": 3,
  "parts": [
    {
      "part": "method_1_factorization",
      "working_steps": [
        {
          "step": 1,
          "operation": "factorize",
          "content": "(x - 2)(x - 3) = 0",
          "marks": 1,
          "mark_type": "M",
          "acceptable_forms": [
            "(x - 2)(x - 3) = 0",
            "(x - 3)(x - 2) = 0"
          ]
        },
        {
          "step": 2,
          "operation": "solve_factors",
          "content": "x - 2 = 0 or x - 3 = 0",
          "marks": 1,
          "mark_type": "M"
        },
        {
          "step": 3,
          "operation": "final_answer",
          "content": "x = 2 or x = 3",
          "marks": 1,
          "mark_type": "A",
          "answer_format": {
            "acceptable": [
              "x = 2 or x = 3",
              "x = 2, 3",
              "x = 2 and x = 3",
              "{2, 3}"
            ]
          }
        }
      ],
      "alternative_methods": [
        {
          "method": "quadratic_formula",
          "valid": true,
          "mark_distribution": ["M1", "M1", "A1"]
        },
        {
          "method": "completing_square",
          "valid": true,
          "mark_distribution": ["M1", "M1", "A1"]
        }
      ],
      "hint": "Look for two numbers that multiply to give 6 and add to give -5",
      "explanation": "This quadratic factorizes as (x - 2)(x - 3) = 0, giving solutions x = 2 and x = 3"
    }
  ]
}
```

## 📝 **Mathematics-Specific Question Types**

### **1. Show That Questions (Mathematics)**

```json
{
  "type": "show_that_proof",
  "specific_requirements": {
    "algebraic_show_that": {
      "must_reach": "exact given expression",
      "common_approach": "start from one side",
      "alternative": "work from both sides to middle"
    },
    "geometric_show_that": {
      "given_value": "must obtain exactly",
      "method": "clear geometric reasoning",
      "constructions": "if needed for proof"
    }
  },
  "marking": {
    "intermediate_steps": "method marks",
    "final_form": "accuracy mark only if exact"
  }
}
```

### **2. Loci Questions**

```json
{
  "type": "locus_construction",
  "locus_types": {
    "fixed_distance_point": {
      "shape": "circle",
      "construction": "compass from center"
    },
    "fixed_distance_line": {
      "shape": "parallel lines + semicircles",
      "construction": "ruler and compass"
    },
    "equidistant_two_points": {
      "shape": "perpendicular bisector",
      "construction": "standard bisector method"
    },
    "equidistant_two_lines": {
      "shape": "angle bisector",
      "construction": "standard bisector method"
    }
  },
  "region_shading": {
    "instruction": "shade required region",
    "boundary": "solid or dashed as specified"
  }
}
```

### **3. Sequence Questions**

```json
{
  "type": "sequences",
  "sequence_types": {
    "arithmetic": {
      "nth_term": "an = a + (n-1)d",
      "identify": "constant difference"
    },
    "geometric": {
      "nth_term": "an = ar^(n-1)",
      "identify": "constant ratio"
    },
    "quadratic": {
      "nth_term": "an² + bn + c",
      "identify": "second differences constant"
    }
  },
  "common_tasks": {
    "find_nth_term": "derive formula",
    "find_specific_term": "substitute n",
    "find_n": "solve equation"
  }
}
```

### **4. Inequality Questions**

```json
{
  "type": "inequalities",
  "solution_types": {
    "linear": {
      "method": "solve like equation",
      "flip_sign": "when multiply/divide by negative"
    },
    "quadratic": {
      "method": "find critical values, test regions",
      "representation": "number line or curve sketch"
    },
    "graphical": {
      "region": "shade required area",
      "boundary": "solid (≤,≥) or dashed (<,>)"
    }
  },
  "answer_formats": {
    "inequality_notation": "x > 3",
    "interval_notation": "(3, ∞)",
    "set_notation": "{x : x > 3}"
  }
}
```

### **5. Probability Tree Questions**

```json
{
  "type": "probability_tree",
  "components": {
    "branches": {
      "probabilities": "on branches",
      "outcomes": "at end of branches",
      "sum_from_node": "always equals 1"
    },
    "calculations": {
      "along_branch": "multiply probabilities",
      "multiple_paths": "add probabilities"
    },
    "without_replacement": {
      "second_pick": "denominator reduces by 1",
      "dependent": "probabilities change"
    }
  }
}
```

### **6. Bearings Questions**

```json
{
  "type": "bearings",
  "requirements": {
    "format": "three figures",
    "direction": "clockwise from North",
    "range": "000° to 360°"
  },
  "common_calculations": {
    "reverse_bearing": {
      "rule": "add/subtract 180°",
      "adjust": "keep in range 000-360"
    },
    "angle_problems": {
      "parallel_lines": "alternate angles",
      "triangle": "angle sum = 180°"
    }
  }
}
```

### **7. Vectors Questions**

```json
{
  "type": "vector_problems",
  "representations": {
    "column": "(x/y) or (x choose y)",
    "component": "xi + yj",
    "bold": "**a** or underline",
    "arrow": "→ above letter"
  },
  "operations": {
    "addition": "add components",
    "scalar_multiplication": "multiply each component",
    "magnitude": "|a| = √(x² + y²)"
  },
  "geometric_vectors": {
    "journey": "vectors add tip-to-tail",
    "position": "from origin",
    "displacement": "from point to point"
  }
}
```

### **8. Trigonometry Questions**

```json
{
  "type": "trigonometry",
  "right_angle_trig": {
    "ratios": {
      "sin": "opposite/hypotenuse",
      "cos": "adjacent/hypotenuse",
      "tan": "opposite/adjacent"
    },
    "inverse": "find angle from ratio"
  },
  "non_right_angle": {
    "sine_rule": "a/sinA = b/sinB = c/sinC",
    "cosine_rule": "a² = b² + c² - 2bc cosA",
    "area": "½ab sinC"
  },
  "3D_problems": {
    "identify_right_angles": true,
    "draw_2D_triangles": true,
    "pythagorean_theorem": "often needed"
  }
}
```

### **9. Function Questions**

```json
{
  "type": "functions",
  "notation_types": {
    "function_notation": "f(x) = ...",
    "mapping": "f: x ↦ ...",
    "evaluation": "f(3) means substitute x = 3"
  },
  "composite_functions": {
    "notation": "fg(x) or f∘g",
    "meaning": "f(g(x))",
    "order": "apply g first, then f"
  },
  "inverse_functions": {
    "notation": "f⁻¹(x)",
    "finding": "swap x and y, solve for y",
    "property": "f⁻¹(f(x)) = x"
  }
}
```

### **10. Statistics Questions (Mathematics)**

```json
{
  "type": "statistical_analysis",
  "measures": {
    "central_tendency": {
      "mean": "sum/count",
      "median": "middle value when ordered",
      "mode": "most frequent"
    },
    "spread": {
      "range": "highest - lowest",
      "interquartile_range": "Q3 - Q1",
      "standard_deviation": "√(Σ(x-mean)²/n)"
    }
  },
  "grouped_data": {
    "midpoint": "use for calculations",
    "modal_class": "highest frequency",
    "median_class": "contains n/2th value"
  },
  "cumulative_frequency": {
    "median": "at n/2",
    "quartiles": "at n/4 and 3n/4",
    "percentiles": "at kn/100"
  }
}
```

### **11. Set Theory and Venn Diagrams**

```json
{
  "type": "set_theory",
  "notation": {
    "element": "∈ means 'is in'",
    "not_element": "∉ means 'is not in'",
    "subset": "⊂ or ⊆",
    "union": "∪ (or)",
    "intersection": "∩ (and)",
    "complement": "' or ᶜ"
  },
  "venn_diagrams": {
    "regions": {
      "overlap": "intersection A ∩ B",
      "outside": "complement (A ∪ B)'",
      "only_A": "A \\ B or A - B"
    },
    "shading": {
      "required_region": "shade clearly",
      "label_sets": "A, B, ξ (universal)"
    }
  },
  "calculations": {
    "n(A∪B)": "n(A) + n(B) - n(A∩B)",
    "probability": "P(A) = n(A)/n(ξ)"
  }
}
```

### **12. Financial Mathematics**

```json
{
  "type": "financial_mathematics",
  "simple_interest": {
    "formula": "I = PRT/100",
    "variables": {
      "I": "interest",
      "P": "principal",
      "R": "rate % per annum",
      "T": "time in years"
    }
  },
  "compound_interest": {
    "formula": "A = P(1 + r/100)ⁿ",
    "variables": {
      "A": "final amount",
      "P": "principal",
      "r": "rate % per period",
      "n": "number of periods"
    }
  },
  "depreciation": {
    "formula": "V = P(1 - r/100)ⁿ",
    "context": "value decreases"
  },
  "percentage_change": {
    "increase": "×(1 + r/100)",
    "decrease": "×(1 - r/100)",
    "reverse": "original = new ÷ multiplier"
  }
}
```

### **13. Circle Theorems**

```json
{
  "type": "circle_theorems",
  "angle_theorems": {
    "angle_in_semicircle": {
      "value": "90°",
      "condition": "angle on diameter"
    },
    "angle_at_center": {
      "rule": "twice angle at circumference",
      "same_arc": true
    },
    "angles_same_segment": {
      "rule": "equal",
      "condition": "same arc"
    },
    "opposite_angles_cyclic": {
      "sum": "180°",
      "quadrilateral": "all vertices on circle"
    }
  },
  "tangent_properties": {
    "from_point": "two tangents equal",
    "angle": "90° to radius",
    "alternate_segment": "angle = angle in alternate segment"
  }
}
```

### **14. Similarity and Scale**

```json
{
  "type": "similarity",
  "similar_shapes": {
    "conditions": [
      "angles equal",
      "sides in same ratio"
    ],
    "scale_factor": {
      "linear": "k",
      "area": "k²",
      "volume": "k³"
    }
  },
  "calculations": {
    "missing_length": "use ratio of corresponding sides",
    "area_ratio": "= (length ratio)²",
    "volume_ratio": "= (length ratio)³"
  },
  "maps_and_models": {
    "scale": "1:n means real = n × map",
    "conversions": "consistent units essential"
  }
}
```

### **15. Histograms with Unequal Intervals**

```json
{
  "type": "histogram_unequal",
  "key_principle": "area represents frequency",
  "frequency_density": {
    "formula": "frequency ÷ class width",
    "y_axis": "frequency density",
    "units": "per unit of x-axis"
  },
  "drawing_steps": [
    "calculate class widths",
    "calculate frequency densities",
    "draw bars with no gaps",
    "height = frequency density"
  ],
  "interpretation": {
    "frequency": "area of bar",
    "not": "height of bar"
  }
}
```

### **16. Speed, Distance, Time Problems**

```json
{
  "type": "speed_distance_time",
  "basic_relationships": {
    "speed": "distance ÷ time",
    "distance": "speed × time",
    "time": "distance ÷ speed"
  },
  "average_speed": {
    "formula": "total distance ÷ total time",
    "not": "average of speeds"
  },
  "complex_journeys": {
    "multiple_stages": "sum distances and times separately",
    "different_units": "convert consistently",
    "relative_speed": {
      "same_direction": "subtract speeds",
      "opposite_direction": "add speeds"
    }
  },
  "graphical": {
    "distance_time": "gradient = speed",
    "speed_time": "area = distance"
  }
}
```

### **17. Matrix Operations** *(if applicable to syllabus)*

```json
{
  "type": "matrices",
  "operations": {
    "addition": "add corresponding elements",
    "scalar_multiplication": "multiply each element",
    "matrix_multiplication": {
      "condition": "columns of first = rows of second",
      "method": "row × column"
    }
  },
  "transformations": {
    "reflection": "specific 2×2 matrices",
    "rotation": "specific 2×2 matrices",
    "enlargement": "scalar × identity"
  },
  "determinant_2x2": "ad - bc",
  "inverse_exists": "if determinant ≠ 0"
}
```

```json
{
  "type": "statistical_analysis",
  "measures": {
    "central_tendency": {
      "mean": "sum/count",
      "median": "middle value when ordered",
      "mode": "most frequent"
    },
    "spread": {
      "range": "highest - lowest",
      "interquartile_range": "Q3 - Q1",
      "standard_deviation": "√(Σ(x-mean)²/n)"
    }
  },
  "grouped_data": {
    "midpoint": "use for calculations",
    "modal_class": "highest frequency",
    "median_class": "contains n/2th value"
  },
  "cumulative_frequency": {
    "median": "at n/2",
    "quartiles": "at n/4 and 3n/4",
    "percentiles": "at kn/100"
  }
}
```

---

**Document Version:** 3.0 (Mathematics-Specific)  
**Compatible With:** General Extraction Guide v3.0  
**Purpose:** Mathematics-specific extraction requirements

---

**END OF MATHEMATICS GUIDE**