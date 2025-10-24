# Chemistry Extraction Guide v3.0
## Compatible with General Extraction Guide v3.0

---

## 📋 **Chemistry-Specific Overview**

This guide extends the General Extraction Guide v3.0 with chemistry-specific requirements for handling chemical observations, equations, practical procedures, and safety considerations. Chemistry papers require special attention to chemical notation, observation descriptions, and systematic nomenclature.

---

## 🧪 **Chemistry Question Type Categories**

### **1. Chemical Test Questions**
- Flame tests and colors
- Precipitation reactions
- Gas identification tests
- pH and indicator changes
- Qualitative analysis procedures

### **2. Equation Questions**
- Balancing chemical equations
- State symbols
- Ionic equations
- Half equations
- Structural formulas

### **3. Practical Procedure Questions**
- Experimental methods
- Separation techniques
- Titration procedures
- Crystallization methods
- Safety precautions

### **4. Observation Questions**
- Color changes
- Precipitate formation
- Gas evolution
- Temperature changes
- Physical state changes

### **5. Organic Chemistry Questions**
- Naming compounds (IUPAC)
- Structural formulas
- Functional group identification
- Isomer recognition
- Reaction mechanisms

---

## 🎨 **Chemical Observation Database**

### **Color Description Standards**

#### **Precipitate Colors**
```json
{
  "precipitate_colors": {
    "white": {
      "compounds": ["AgCl", "BaSO₄", "CaCO₃", "PbCl₂"],
      "acceptable_variations": ["white", "white precipitate", "white ppt", "white solid"],
      "context_notes": "May appear creamy in some conditions"
    },
    "blue": {
      "compounds": ["Cu(OH)₂"],
      "acceptable_variations": ["blue", "pale blue", "light blue", "blue precipitate"],
      "context_notes": "Copper(II) hydroxide"
    },
    "green": {
      "compounds": ["Fe(OH)₂", "NiCO₃"],
      "acceptable_variations": ["green", "pale green", "green precipitate"],
      "context_notes": "Iron(II) compounds"
    },
    "brown": {
      "compounds": ["Fe(OH)₃"],
      "acceptable_variations": ["brown", "red-brown", "rust-brown", "orange-brown"],
      "context_notes": "Iron(III) hydroxide"
    },
    "yellow": {
      "compounds": ["PbI₂", "AgI"],
      "acceptable_variations": ["yellow", "bright yellow", "yellow precipitate"],
      "context_notes": "Lead(II) iodide is bright yellow"
    },
    "cream": {
      "compounds": ["AgBr"],
      "acceptable_variations": ["cream", "off-white", "pale yellow", "cream precipitate"],
      "context_notes": "Silver bromide"
    }
  }
}
```

#### **Solution Colors**
```json
{
  "solution_colors": {
    "blue": {
      "ions": ["Cu²⁺"],
      "acceptable_variations": ["blue", "blue solution", "light blue", "pale blue"],
      "intensity_modifiers": ["pale", "light", "deep", "dark"]
    },
    "green": {
      "ions": ["Fe²⁺", "Ni²⁺", "Cr³⁺"],
      "acceptable_variations": ["green", "pale green", "green solution"],
      "context_dependent": true
    },
    "yellow": {
      "ions": ["Fe³⁺", "CrO₄²⁻"],
      "acceptable_variations": ["yellow", "yellow-brown", "orange-yellow"],
      "context_notes": "Iron(III) can appear yellow to brown"
    },
    "purple": {
      "ions": ["MnO₄⁻"],
      "acceptable_variations": ["purple", "pink", "magenta", "violet"],
      "context_notes": "Permanganate - concentration affects intensity"
    },
    "colorless": {
      "acceptable_variations": ["colorless", "colourless", "clear", "no color"],
      "not_acceptable": ["white", "transparent"]
    }
  }
}
```

### **Observation Description Structure**
```json
{
  "observation_answer": {
    "answer": "white precipitate",
    "marks": 1,
    "observation_details": {
      "observation_type": "precipitate_formation",
      "color": "white",
      "state": "solid",
      "acceptable_descriptions": [
        "white precipitate",
        "white ppt",
        "white solid forms",
        "white suspension"
      ],
      "rejected_descriptions": [
        "milky" // Too vague
      ]
    },
    "context": {
      "type": "observation",
      "value": "silver_chloride_test",
      "label": "Silver chloride precipitation"
    }
  }
}
```

---

## 🧬 **Gas Test Result Mapping**

### **Standard Gas Tests Database**
```json
{
  "gas_tests": {
    "hydrogen": {
      "test": "lighted splint",
      "positive_result": "squeaky pop",
      "acceptable_variations": [
        "pop sound",
        "squeaky pop",
        "pop",
        "explosive pop",
        "pops"
      ],
      "marking_notes": "Sound description required"
    },
    "oxygen": {
      "test": "glowing splint",
      "positive_result": "relights",
      "acceptable_variations": [
        "relights",
        "rekindles",
        "glows brighter",
        "bursts into flame",
        "reignites"
      ]
    },
    "carbon_dioxide": {
      "test": "limewater",
      "positive_result": "turns cloudy/milky",
      "acceptable_variations": [
        "turns cloudy",
        "turns milky",
        "white precipitate",
        "goes cloudy",
        "becomes milky"
      ],
      "chemical_basis": "Ca(OH)₂ + CO₂ → CaCO₃ + H₂O"
    },
    "ammonia": {
      "test": "damp red litmus",
      "positive_result": "turns blue",
      "acceptable_variations": [
        "turns blue",
        "blue",
        "changes to blue",
        "becomes blue"
      ],
      "alternative_test": {
        "method": "HCl fumes",
        "result": "white smoke",
        "variations": ["white fumes", "white smoke forms"]
      }
    },
    "chlorine": {
      "test": "damp litmus paper",
      "positive_result": "bleaches",
      "acceptable_variations": [
        "bleaches",
        "turns white",
        "decolorized",
        "decolourised",
        "loses color"
      ],
      "observation_sequence": "may turn red then bleach"
    },
    "sulfur_dioxide": {
      "test": "acidified potassium dichromate(VI)",
      "positive_result": "orange to green",
      "acceptable_variations": [
        "turns green",
        "orange to green",
        "changes from orange to green",
        "green color"
      ]
    }
  }
}
```

### **Gas Test Answer Structure**
```json
{
  "gas_identification": {
    "subparts": [
      {
        "subpart": "i",
        "question_text": "Test for the gas",
        "correct_answers": [
          {
            "answer": "glowing splint",
            "marks": 1,
            "test_details": {
              "gas": "oxygen",
              "test_type": "combustion",
              "equipment": "wooden splint"
            }
          }
        ]
      },
      {
        "subpart": "ii",
        "question_text": "Result of test",
        "correct_answers": [
          {
            "answer": "relights",
            "marks": 1,
            "acceptable_variations": [
              "rekindles",
              "glows brighter",
              "bursts into flame"
            ]
          }
        ]
      }
    ]
  }
}
```

---

## ⚗️ **Precipitation Reaction Patterns**

### **Systematic Ion Test Results**
```json
{
  "cation_tests": {
    "with_NaOH": {
      "Cu²⁺": {
        "observation": "blue precipitate",
        "formula": "Cu(OH)₂",
        "solubility": "insoluble in excess"
      },
      "Fe²⁺": {
        "observation": "green precipitate",
        "formula": "Fe(OH)₂",
        "solubility": "insoluble in excess",
        "additional": "turns brown on standing"
      },
      "Fe³⁺": {
        "observation": "brown precipitate",
        "formula": "Fe(OH)₃",
        "solubility": "insoluble in excess"
      },
      "Zn²⁺": {
        "observation": "white precipitate",
        "formula": "Zn(OH)₂",
        "solubility": "soluble in excess",
        "excess_observation": "colorless solution"
      },
      "Al³⁺": {
        "observation": "white precipitate",
        "formula": "Al(OH)₃",
        "solubility": "soluble in excess",
        "excess_observation": "colorless solution"
      }
    },
    "with_NH₃": {
      "Cu²⁺": {
        "observation": "blue precipitate",
        "excess": "deep blue solution",
        "complex": "[Cu(NH₃)₄]²⁺"
      },
      "Zn²⁺": {
        "observation": "white precipitate",
        "excess": "colorless solution",
        "complex": "[Zn(NH₃)₄]²⁺"
      }
    }
  }
}
```

### **Anion Test Patterns**
```json
{
  "anion_tests": {
    "chloride": {
      "reagent": "AgNO₃ + dilute HNO₃",
      "observation": "white precipitate",
      "formula": "AgCl",
      "confirmatory": "dissolves in NH₃"
    },
    "bromide": {
      "reagent": "AgNO₃ + dilute HNO₃",
      "observation": "cream precipitate",
      "formula": "AgBr",
      "confirmatory": "partially dissolves in NH₃"
    },
    "iodide": {
      "reagent": "AgNO₃ + dilute HNO₃",
      "observation": "yellow precipitate",
      "formula": "AgI",
      "confirmatory": "insoluble in NH₃"
    },
    "sulfate": {
      "reagent": "BaCl₂ + dilute HCl",
      "observation": "white precipitate",
      "formula": "BaSO₄",
      "confirmatory": "insoluble in acids"
    },
    "carbonate": {
      "reagent": "dilute acid",
      "observation": "effervescence",
      "gas": "CO₂",
      "test": "turns limewater cloudy"
    }
  }
}
```

---

## 🧪 **Practical Procedure Descriptions**

### **Standard Practical Techniques**

#### **Titration Procedure Framework**
```json
{
  "titration_procedure": {
    "steps": [
      {
        "step": 1,
        "action": "rinse",
        "details": "rinse burette with solution to be used",
        "reason": "remove water/previous solution"
      },
      {
        "step": 2,
        "action": "fill",
        "details": "fill burette above 0 mark",
        "safety": "use funnel, remove before titration"
      },
      {
        "step": 3,
        "action": "remove bubbles",
        "details": "run solution to remove air bubbles",
        "check": "no bubbles below tap"
      },
      {
        "step": 4,
        "action": "pipette",
        "details": "pipette 25.0 cm³ into conical flask",
        "accuracy": "bottom of meniscus on mark"
      },
      {
        "step": 5,
        "action": "indicator",
        "details": "add 2-3 drops indicator",
        "note": "not more - affects endpoint"
      },
      {
        "step": 6,
        "action": "titrate",
        "details": "add solution while swirling",
        "endpoint": "permanent color change"
      },
      {
        "step": 7,
        "action": "repeat",
        "details": "repeat for concordant results",
        "criterion": "within 0.10 cm³"
      }
    ],
    "common_indicators": {
      "methyl_orange": {
        "pH_range": "3.1-4.4",
        "color_change": "red to yellow",
        "use": "strong acid + weak base"
      },
      "phenolphthalein": {
        "pH_range": "8.3-10.0",
        "color_change": "colorless to pink",
        "use": "weak acid + strong base"
      }
    }
  }
}
```

#### **Crystallization Procedure**
```json
{
  "crystallization_steps": {
    "standard_method": [
      {
        "step": "heat solution",
        "detail": "gentle heating to concentrate",
        "caution": "do not boil dry"
      },
      {
        "step": "test saturation",
        "detail": "drop on glass rod forms crystals",
        "alternative": "crystals form on cooling"
      },
      {
        "step": "cool slowly",
        "detail": "allow to cool to room temperature",
        "result": "larger crystals form"
      },
      {
        "step": "filter",
        "detail": "filter to collect crystals",
        "wash": "wash with cold solvent"
      },
      {
        "step": "dry",
        "detail": "dry between filter papers",
        "alternative": "desiccator or oven"
      }
    ]
  }
}
```

---

## 🦺 **Safety Precaution Mappings**

### **Chemical-Specific Safety Requirements**
```json
{
  "safety_precautions": {
    "concentrated_acids": [
      "wear safety goggles",
      "use in fume cupboard",
      "add acid to water, never reverse",
      "have neutralizing agent ready"
    ],
    "heating": [
      "point test tube away from people",
      "use test tube holder",
      "gentle heating initially",
      "never heat closed system"
    ],
    "toxic_gases": [
      "use fume cupboard",
      "ensure ventilation",
      "avoid inhalation",
      "have windows open"
    ],
    "general": [
      "tie back long hair",
      "wear lab coat",
      "closed shoes",
      "no eating or drinking"
    ]
  }
}
```

### **Hazard Symbol Recognition**
```json
{
  "hazard_symbols": {
    "corrosive": {
      "appearance": "test tubes pouring on hand/surface",
      "precautions": ["gloves", "goggles", "protective clothing"]
    },
    "toxic": {
      "appearance": "skull and crossbones",
      "precautions": ["avoid contact", "fume cupboard", "wash hands"]
    },
    "flammable": {
      "appearance": "flame symbol",
      "precautions": ["no naked flames", "spark-free area", "ventilation"]
    },
    "oxidizing": {
      "appearance": "flame over circle",
      "precautions": ["keep from combustibles", "no heating", "separate storage"]
    }
  }
}
```

---

## 📊 **Chromatography Result Interpretation**

### **Rf Value Calculations**
```json
{
  "rf_calculation": {
    "formula": "Rf = distance moved by spot / distance moved by solvent",
    "measurement_rules": {
      "spot_distance": "center of origin to center of spot",
      "solvent_distance": "origin to solvent front",
      "precision": "measure to nearest mm"
    },
    "answer_format": {
      "decimal": "0.XX",
      "range": "0 < Rf < 1",
      "no_units": true
    }
  }
}
```

### **Chromatography Observations**
```json
{
  "chromatography_results": {
    "observations": [
      {
        "type": "separation",
        "answer": "three spots visible",
        "detail": "component separated into three"
      },
      {
        "type": "identification",
        "answer": "same Rf as reference",
        "conclusion": "substance X present"
      },
      {
        "type": "purity",
        "answer": "single spot",
        "conclusion": "pure substance"
      }
    ]
  }
}
```

---

## 🧪 **Chemical Equation Formatting Rules**

### **Equation Balancing Requirements**
```json
{
  "equation_balancing": {
    "correct_answers": [
      {
        "coefficient_position": "before_HCl",
        "answer": "2",
        "marks": 1,
        "context": {
          "type": "component",
          "value": "HCl_coefficient",
          "label": "Coefficient for HCl"
        }
      },
      {
        "state_symbols": {
          "required": true,
          "format": "(s), (l), (g), (aq)",
          "placement": "after formula"
        }
      }
    ],
    "validation": {
      "mass_balance": "same number of each atom type",
      "charge_balance": "for ionic equations",
      "smallest_integers": "reduce if possible"
    }
  }
}
```

### **State Symbol Requirements**
```json
{
  "state_symbols": {
    "standard_symbols": {
      "(s)": "solid",
      "(l)": "liquid",
      "(g)": "gas",
      "(aq)": "aqueous solution"
    },
    "special_cases": {
      "water": "H₂O(l) unless steam",
      "steam": "H₂O(g)",
      "ionic_compounds": "(aq) when dissolved"
    }
  }
}
```

---

## 🧬 **Organic Chemistry Naming Conventions**

### **IUPAC Naming Structure**
```json
{
  "organic_naming": {
    "alkanes": {
      "pattern": "prefix + 'ane'",
      "examples": {
        "C₂H₆": "ethane",
        "C₃H₈": "propane"
      }
    },
    "alkenes": {
      "pattern": "prefix + position + 'ene'",
      "examples": {
        "C₃H₆": "propene",
        "C₄H₈": "but-1-ene or but-2-ene"
      }
    },
    "functional_groups": {
      "alcohol": {
        "suffix": "-ol",
        "position": "required for 3+ carbons",
        "example": "propan-2-ol"
      },
      "carboxylic_acid": {
        "suffix": "-oic acid",
        "example": "ethanoic acid"
      }
    }
  }
}
```

### **Structural Formula Formats**
```json
{
  "structural_formulas": {
    "acceptable_formats": [
      {
        "type": "displayed",
        "shows": "all bonds and atoms",
        "example": "H-C-C-O-H with all H shown"
      },
      {
        "type": "condensed",
        "shows": "groups of atoms",
        "example": "CH₃CH₂OH"
      },
      {
        "type": "skeletal",
        "shows": "carbon backbone",
        "note": "C and H often omitted"
      }
    ]
  }
}
```

---

## 🔢 **Chemistry-Specific Answer Formats**

### **Extended Answer Formats**
```json
{
  "chemistry_answer_formats": {
    "chemical_formula": "correct subscripts and charges",
    "observation_description": "color, state, and change",
    "equation_balanced": "coefficients and state symbols",
    "structural_drawing": "bonds and atoms shown",
    "practical_method": "numbered steps with details",
    "test_and_result": "test method + observation"
  }
}
```

---

## 📋 **Chemistry Abbreviations Extension**

### **Additional Chemistry-Specific Abbreviations**

| **Abbreviation** | **Meaning** | **Implementation** |
|------------------|-------------|-------------------|
| **ppt** | Precipitate | Acceptable for "precipitate" |
| **soln** | Solution | Acceptable for "solution" |
| **conc** | Concentrated | Acceptable abbreviation |
| **dil** | Dilute | Acceptable abbreviation |
| **xs** | Excess | Acceptable for "excess" |
| **aq** | Aqueous | For state symbols only |
| **M.A.R** | Molar ratio | Acceptable abbreviation |
| **r.t.p** | Room temperature and pressure | Standard conditions |

---

## 🔄 **Chemistry Answer Variation Patterns**

### **Common Chemistry Variations**

#### **1. Chemical Formula Variations**
```json
{
  "formula_answer": {
    "primary_answer": "H₂SO₄",
    "acceptable_variations": [
      "H2SO4",  // Without subscripts
      "sulfuric acid",
      "sulphuric acid"  // UK spelling
    ],
    "structural_variations": [
      "H-O-SO₂-O-H",
      "(HO)₂SO₂"
    ]
  }
}
```

#### **2. Observation Variations (owtte)**
```json
{
  "observation_with_owtte": {
    "primary_answer": "white precipitate forms",
    "accepts_equivalent_phrasing": true,
    "observation_variations": {
      "color_variations": [
        "white",
        "off-white",
        "cream"  // Sometimes acceptable
      ],
      "formation_variations": [
        "forms",
        "appears",
        "is produced",
        "is formed",
        "precipitates"
      ],
      "state_variations": [
        "precipitate",
        "ppt",
        "solid",
        "suspension"
      ]
    },
    "complete_variations": [
      "white solid forms",
      "white ppt appears",
      "cream precipitate is produced"
    ]
  }
}
```

#### **3. Gas Test Result Variations**
```json
{
  "gas_test_answer": {
    "test": "glowing splint",
    "primary_result": "relights",
    "accepts_equivalent_phrasing": true,
    "result_variations": [
      "relights",
      "rekindles",
      "reignites",
      "bursts into flame",
      "glows brighter",
      "catches fire"
    ],
    "complete_answer_variations": [
      "the glowing splint relights",
      "splint rekindles",
      "it bursts into flame"
    ]
  }
}
```

#### **4. Reaction Type Variations**
```json
{
  "reaction_type_answer": {
    "primary_answer": "oxidation",
    "acceptable_variations": [
      "oxidation",
      "oxidised",
      "oxidized",  // US spelling
      "loses electrons",
      "electron loss"
    ],
    "context_dependent_variations": {
      "organic": "gains oxygen",
      "redox": "increases oxidation state"
    }
  }
}
```

### **Chemistry-Specific ora Implementation**

For chemistry comparisons with "ora":

```json
{
  "concentration_comparison": {
    "primary_answer": "Solution A is more concentrated than Solution B",
    "answer_variations": {
      "standard_forms": [
        "[A] > [B]",
        "concentration of A exceeds B",
        "A has higher concentration"
      ],
      "reverse_arguments": [
        "Solution B is less concentrated than Solution A",
        "[B] < [A]",
        "B is more dilute than A"
      ],
      "ratio_expressions": [
        "A is 2× more concentrated",
        "B is half as concentrated"
      ]
    },
    "marking_flags": {
      "accepts_reverse_argument": true,
      "accepts_chemical_notation": true
    }
  }
}
```

### **State Symbol Variations**
```json
{
  "state_symbol_variations": {
    "solid": ["(s)", "[s]", "solid"],
    "liquid": ["(l)", "[l]", "liquid"],
    "gas": ["(g)", "[g]", "gas", "gaseous"],
    "aqueous": ["(aq)", "[aq]", "aqueous", "dissolved"]
  }
}
```

---

## ✅ **Chemistry-Specific Validation**

### **Observation Validation**
- [ ] Color descriptions standardized
- [ ] State changes included
- [ ] Precipitate/solution distinguished
- [ ] Gas evolution noted

### **Equation Validation**
- [ ] Balancing coefficients correct
- [ ] State symbols present if required
- [ ] Chemical formulas properly formatted
- [ ] Ionic charges shown correctly

### **Practical Validation**
- [ ] Steps in logical order
- [ ] Safety precautions relevant
- [ ] Equipment specified
- [ ] Measurements include units

### **Test Result Validation**
- [ ] Test method matches substance
- [ ] Result description accurate
- [ ] Alternative descriptions included
- [ ] Chemical basis provided

---

## 🔧 **Integration with General Guide**

### **Extends General Rules:**
- Adds observation-specific formats
- Provides chemical test databases
- Includes safety requirement mappings
- Defines structural formula options

### **Maintains Core Structure:**
- Uses standard JSON format
- Applies universal context system
- Follows mark scheme processing
- Implements alternative linking

---

## 📝 **Chemistry Example Implementation**

```json
{
  "question_number": "4",
  "topic": "Chemical Tests",
  "subtopic": "Anion Identification",
  "question_text": "A student tests an unknown solution for the presence of chloride ions.",
  "parts": [
    {
      "part": "a",
      "question_text": "Describe the test for chloride ions",
      "answer_format": "multi_line",
      "marks": 2,
      "correct_answers": [
        {
          "answer": "add silver nitrate solution",
          "marks": 1,
          "alternative_id": 1,
          "acceptable_variations": [
            "add AgNO₃",
            "add aqueous silver nitrate",
            "add AgNO₃(aq)"
          ],
          "context": {
            "type": "step",
            "value": "chloride_test_reagent",
            "label": "Test reagent addition"
          }
        },
        {
          "answer": "add dilute nitric acid",
          "marks": 1,
          "alternative_id": 2,
          "acceptable_variations": [
            "add dilute HNO₃",
            "acidify with nitric acid"
          ],
          "context": {
            "type": "step",
            "value": "chloride_test_acid",
            "label": "Acidification step"
          }
        }
      ],
      "hint": "Think about which metal ion forms an insoluble chloride and why acid is added",
      "explanation": "Silver nitrate reacts with chloride ions to form a white precipitate of silver chloride. Dilute nitric acid is added to prevent other anions like carbonate from giving false positive results"
    },
    {
      "part": "b",
      "question_text": "State the observation if chloride ions are present",
      "answer_format": "single_line",
      "marks": 1,
      "correct_answers": [
        {
          "answer": "white precipitate",
          "marks": 1,
          "observation_details": {
            "observation_type": "precipitate_formation",
            "color": "white",
            "chemical": "AgCl",
            "acceptable_descriptions": [
              "white precipitate",
              "white ppt",
              "white solid forms"
            ]
          },
          "context": {
            "type": "observation",
            "value": "chloride_positive_test",
            "label": "Positive test for chloride"
          }
        }
      ],
      "hint": "What is the appearance of silver chloride?",
      "explanation": "Silver chloride (AgCl) is a white insoluble solid that forms as a precipitate"
    }
  ]
}
```

## 📝 **Chemistry-Specific Question Types**

### **1. Ionic Equation Questions**

```json
{
  "type": "ionic_equation",
  "requirements": {
    "full_equation": "molecular equation first",
    "ionic_form": "split aqueous ionic compounds",
    "net_ionic": "cancel spectator ions",
    "state_symbols": "required for all species"
  },
  "example": {
    "full": "AgNO₃(aq) + NaCl(aq) → AgCl(s) + NaNO₃(aq)",
    "ionic": "Ag⁺(aq) + NO₃⁻(aq) + Na⁺(aq) + Cl⁻(aq) → AgCl(s) + Na⁺(aq) + NO₃⁻(aq)",
    "net": "Ag⁺(aq) + Cl⁻(aq) → AgCl(s)"
  }
}
```

### **2. Mole Calculation Questions**

```json
{
  "type": "mole_calculations",
  "calculation_types": {
    "mass_to_moles": {
      "formula": "n = m/M",
      "units": "mol = g ÷ g/mol"
    },
    "concentration": {
      "formula": "c = n/V",
      "units": "mol/dm³ = mol ÷ dm³",
      "conversions": "cm³ to dm³: ÷1000"
    },
    "gas_volumes": {
      "formula": "1 mol = 24 dm³ at r.t.p.",
      "conditions": "room temperature and pressure"
    },
    "percentage_yield": {
      "formula": "(actual/theoretical) × 100%",
      "common_errors": "using mass instead of moles"
    }
  }
}
```

### **3. Redox Questions**

```json
{
  "type": "redox_identification",
  "identification_rules": {
    "oxidation": [
      "loss of electrons",
      "increase in oxidation number",
      "gain of oxygen",
      "loss of hydrogen"
    ],
    "reduction": [
      "gain of electrons",
      "decrease in oxidation number",
      "loss of oxygen",
      "gain of hydrogen"
    ]
  },
  "answer_structure": {
    "identify_changes": "state what happens to each species",
    "electron_transfer": "show electron movement",
    "oxidizing_agent": "species that is reduced",
    "reducing_agent": "species that is oxidized"
  }
}
```

### **4. Electrolysis Prediction Questions**

```json
{
  "type": "electrolysis_products",
  "electrode_rules": {
    "cathode_negative": {
      "molten": "metal forms",
      "aqueous": {
        "reactive_metal": "hydrogen forms",
        "unreactive_metal": "metal forms"
      }
    },
    "anode_positive": {
      "molten": "non-metal forms",
      "aqueous": {
        "halide": "halogen forms",
        "others": "oxygen forms",
        "concentrated": "may override oxygen"
      }
    }
  }
}
```

### **5. Periodic Table Trend Questions**

```json
{
  "type": "periodic_trends",
  "trend_types": {
    "down_group": {
      "atomic_radius": "increases",
      "reactivity_metals": "increases",
      "reactivity_nonmetals": "decreases"
    },
    "across_period": {
      "atomic_radius": "decreases",
      "metallic_character": "decreases",
      "electronegativity": "increases"
    }
  },
  "explanation_required": {
    "electronic_structure": true,
    "nuclear_charge": true,
    "shielding": true
  }
}
```

### **6. Organic Reaction Questions**

```json
{
  "type": "organic_reactions",
  "reaction_types": {
    "combustion": {
      "complete": "CO₂ + H₂O",
      "incomplete": "CO and/or C + H₂O"
    },
    "addition": {
      "alkene_bromination": "decolorizes bromine water",
      "hydrogenation": "alkene → alkane"
    },
    "substitution": {
      "conditions": "UV light for alkanes",
      "products": "hydrogen halide also formed"
    },
    "polymerization": {
      "monomer_identification": true,
      "repeating_unit": true,
      "n_notation": true
    }
  }
}
```

### **7. Separation Technique Selection**

```json
{
  "type": "separation_method",
  "decision_criteria": {
    "filtration": "insoluble solid from liquid",
    "crystallization": "soluble solid from solution",
    "distillation": {
      "simple": "liquid from dissolved solid",
      "fractional": "liquids with different b.p."
    },
    "chromatography": "identify components in mixture",
    "separating_funnel": "immiscible liquids"
  },
  "justification_required": true
}
```

### **8. Empirical and Molecular Formula**

```json
{
  "type": "formula_calculations",
  "empirical_formula": {
    "method": [
      "find mass of each element",
      "convert to moles",
      "find simplest ratio",
      "write formula"
    ],
    "from_percentages": {
      "assume": "100g sample",
      "convert": "% to grams"
    }
  },
  "molecular_formula": {
    "requirement": "empirical formula + Mr",
    "method": "n × empirical formula mass = Mr",
    "result": "molecular = n × empirical"
  },
  "percentage_composition": {
    "formula": "(mass of element/Mr) × 100%",
    "per_element": true
  }
}
```

### **9. Energy Changes and Diagrams**

```json
{
  "type": "energy_changes",
  "reaction_profiles": {
    "exothermic": {
      "products_level": "lower than reactants",
      "ΔH": "negative",
      "temperature_change": "increases"
    },
    "endothermic": {
      "products_level": "higher than reactants",
      "ΔH": "positive",
      "temperature_change": "decreases"
    },
    "activation_energy": {
      "definition": "minimum energy to start reaction",
      "on_diagram": "peak height from reactants"
    }
  },
  "catalyst_effect": {
    "on_profile": "lower activation energy",
    "on_ΔH": "no change",
    "on_products": "no change"
  }
}
```

### **10. Rate of Reaction**

```json
{
  "type": "rate_of_reaction",
  "measurement_methods": {
    "gas_volume": "syringe or inverted cylinder",
    "mass_loss": "balance readings",
    "precipitate": "disappearing cross",
    "color_change": "colorimeter"
  },
  "graph_interpretation": {
    "steep_gradient": "fast reaction",
    "gentle_gradient": "slow reaction",
    "horizontal_line": "reaction complete",
    "initial_rate": "gradient at t=0"
  },
  "factors_affecting": {
    "concentration": {
      "effect": "more particles, more collisions",
      "graph": "steeper but same final amount"
    },
    "temperature": {
      "effect": "more energy, more successful collisions",
      "graph": "steeper gradient"
    },
    "surface_area": {
      "effect": "more exposed particles",
      "example": "powder vs lumps"
    },
    "catalyst": {
      "effect": "alternative pathway, lower Ea",
      "graph": "steeper but same final"
    }
  }
}
```

### **11. Acids, Bases and pH**

```json
{
  "type": "pH_calculations",
  "pH_scale": {
    "range": "0-14",
    "neutral": "7",
    "acidic": "<7",
    "alkaline": ">7"
  },
  "indicators": {
    "universal": {
      "colors": "red(1-3), orange(4-6), green(7), blue(8-11), purple(12-14)"
    },
    "litmus": {
      "acid": "red",
      "alkali": "blue"
    },
    "methyl_orange": {
      "acid": "red",
      "alkali": "yellow",
      "range": "3.1-4.4"
    },
    "phenolphthalein": {
      "acid": "colorless",
      "alkali": "pink",
      "range": "8.3-10"
    }
  },
  "neutralization": {
    "general": "acid + base → salt + water",
    "titration_curve": {
      "sharp_rise": "at equivalence point",
      "indicator_choice": "must change in sharp rise region"
    }
  }
}
```

### **12. Equilibrium Principles**

```json
{
  "type": "chemical_equilibrium",
  "le_chatelier": {
    "principle": "system opposes change",
    "temperature_change": {
      "increase": "favors endothermic",
      "decrease": "favors exothermic"
    },
    "pressure_change": {
      "increase": "favors fewer gas molecules",
      "decrease": "favors more gas molecules"
    },
    "concentration_change": {
      "add_reactant": "shifts right",
      "remove_product": "shifts right"
    }
  },
  "equilibrium_position": {
    "factors": ["temperature", "pressure", "concentration"],
    "catalyst_effect": "no change in position, faster to reach"
  }
}
```

### **13. Industrial Chemistry**

```json
{
  "type": "industrial_processes",
  "haber_process": {
    "equation": "N₂ + 3H₂ ⇌ 2NH₃",
    "conditions": {
      "temperature": "450°C (compromise)",
      "pressure": "200 atm",
      "catalyst": "iron"
    },
    "compromises": {
      "temperature": "rate vs yield balance",
      "pressure": "yield vs cost balance"
    }
  },
  "contact_process": {
    "equation": "2SO₂ + O₂ ⇌ 2SO₃",
    "conditions": {
      "temperature": "450°C",
      "pressure": "2 atm",
      "catalyst": "V₂O₅"
    },
    "product": "sulfuric acid manufacture"
  }
}
```

```json
{
  "type": "separation_method",
  "decision_criteria": {
    "filtration": "insoluble solid from liquid",
    "crystallization": "soluble solid from solution",
    "distillation": {
      "simple": "liquid from dissolved solid",
      "fractional": "liquids with different b.p."
    },
    "chromatography": "identify components in mixture",
    "separating_funnel": "immiscible liquids"
  },
  "justification_required": true
}
```

---

**Document Version:** 3.0 (Chemistry-Specific)  
**Compatible With:** General Extraction Guide v3.0  
**Purpose:** Chemistry-specific extraction requirements

---

**END OF CHEMISTRY GUIDE**