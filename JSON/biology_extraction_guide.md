# Biology Extraction Guide v3.0
## Compatible with General Extraction Guide v3.0

---

## 📋 **Biology-Specific Overview**

This guide extends the General Extraction Guide v3.0 with biology-specific requirements for handling biological diagrams, microscopy, data interpretation, and process descriptions. Biology papers require special attention to anatomical accuracy, biological terminology, and experimental design in living systems.

---

## 🧬 **Biology Question Type Categories**

### **1. Diagram Questions**
- Anatomical labeling
- Cell structure identification
- Organ system diagrams
- Microscopy images
- Biological drawings

### **2. Process Questions**
- Photosynthesis steps
- Respiration pathways
- Protein synthesis
- Transport mechanisms
- Life cycles

### **3. Data Analysis Questions**
- Growth curves
- Population dynamics
- Enzyme activity graphs
- Environmental data
- Inheritance patterns

### **4. Experimental Questions**
- Variable identification
- Control setup
- Biological investigations
- Field study methods
- Data collection techniques

### **5. Comparative Questions**
- Structure-function relationships
- Adaptations
- Species comparisons
- Environmental responses
- Evolutionary relationships

---

## 🔬 **Biological Diagram Labeling System**

### **Anatomical Structure Database**

#### **Cell Structures**
```json
{
  "cell_structures": {
    "animal_cell": {
      "nucleus": {
        "acceptable_labels": ["nucleus", "cell nucleus"],
        "common_errors": ["nucleolus" // Different structure],
        "visibility": "all cell types except RBC"
      },
      "cell_membrane": {
        "acceptable_labels": ["cell membrane", "plasma membrane", "cell surface membrane"],
        "not_acceptable": ["cell wall" // Plant cells only]
      },
      "cytoplasm": {
        "acceptable_labels": ["cytoplasm"],
        "description": "jelly-like substance"
      },
      "mitochondria": {
        "acceptable_labels": ["mitochondria", "mitochondrion"],
        "visibility": "may need high magnification"
      }
    },
    "plant_cell_additional": {
      "cell_wall": {
        "acceptable_labels": ["cell wall", "cellulose cell wall"],
        "position": "outside cell membrane"
      },
      "chloroplast": {
        "acceptable_labels": ["chloroplast", "chloroplasts"],
        "visibility": "green structures"
      },
      "vacuole": {
        "acceptable_labels": ["vacuole", "large vacuole", "permanent vacuole"],
        "not_acceptable": ["vesicle" // Different structure]
      }
    }
  }
}
```

#### **Organ System Labeling**
```json
{
  "human_systems": {
    "digestive_system": {
      "mouth": {
        "acceptable_labels": ["mouth", "buccal cavity", "oral cavity"],
        "function_keywords": ["mechanical digestion", "saliva"]
      },
      "oesophagus": {
        "acceptable_labels": ["oesophagus", "esophagus", "gullet"],
        "spelling_variants": true
      },
      "stomach": {
        "acceptable_labels": ["stomach"],
        "function_keywords": ["acid", "pepsin", "churning"]
      },
      "small_intestine": {
        "acceptable_labels": ["small intestine", "ileum"],
        "parts": ["duodenum", "jejunum", "ileum"]
      },
      "large_intestine": {
        "acceptable_labels": ["large intestine", "colon"],
        "function_keywords": ["water absorption"]
      }
    },
    "circulatory_system": {
      "heart_chambers": {
        "left_atrium": {
          "acceptable_labels": ["left atrium", "LA"],
          "position": "upper left"
        },
        "right_atrium": {
          "acceptable_labels": ["right atrium", "RA"],
          "position": "upper right"
        },
        "left_ventricle": {
          "acceptable_labels": ["left ventricle", "LV"],
          "wall_thickness": "thickest"
        },
        "right_ventricle": {
          "acceptable_labels": ["right ventricle", "RV"],
          "wall_thickness": "thinner than left"
        }
      },
      "blood_vessels": {
        "aorta": {
          "acceptable_labels": ["aorta"],
          "carries": "oxygenated blood from left ventricle"
        },
        "pulmonary_artery": {
          "acceptable_labels": ["pulmonary artery"],
          "unique": "artery carrying deoxygenated blood"
        }
      }
    }
  }
}
```

### **Labeling Answer Structure**
```json
{
  "labeling_question": {
    "question_text": "Label the parts of the plant cell",
    "figure": true,
    "attachments": ["Diagram of plant cell with 5 blank labels A-E"],
    "correct_answers": [
      {
        "answer": "nucleus",
        "marks": 1,
        "alternative_id": 1,
        "label_position": "A",
        "acceptable_variations": ["cell nucleus"],
        "context": {
          "type": "position",
          "value": "label_A",
          "label": "Structure at position A"
        }
      },
      {
        "answer": "cell wall",
        "marks": 1,
        "alternative_id": 2,
        "label_position": "B",
        "acceptable_variations": ["cellulose cell wall"],
        "context": {
          "type": "position",
          "value": "label_B",
          "label": "Structure at position B"
        }
      }
    ]
  }
}
```

---

## 🔬 **Microscopy Observation Framework**

### **Magnification Calculations**
```json
{
  "magnification": {
    "formula": "magnification = image size ÷ actual size",
    "rearrangements": {
      "actual_size": "actual size = image size ÷ magnification",
      "image_size": "image size = actual size × magnification"
    },
    "unit_conversions": {
      "mm_to_μm": "× 1000",
      "μm_to_nm": "× 1000",
      "consistency": "all measurements in same unit"
    },
    "answer_structure": {
      "example": {
        "calculation": "50 mm ÷ 0.05 mm = ×1000",
        "format": "×1000 or 1000×",
        "no_units": true
      }
    }
  }
}
```

### **Microscopy Observations**
```json
{
  "microscopy_descriptions": {
    "cell_appearance": {
      "plant_cells": {
        "shape": ["rectangular", "regular", "box-like"],
        "arrangement": ["organized", "regular pattern", "tessellated"],
        "features": ["visible cell walls", "large vacuoles", "chloroplasts if green"]
      },
      "animal_cells": {
        "shape": ["round", "irregular", "varied shapes"],
        "arrangement": ["random", "clustered", "no regular pattern"],
        "features": ["no cell wall", "smaller vacuoles"]
      }
    },
    "staining_results": {
      "iodine": {
        "positive": "blue-black",
        "indicates": "starch present",
        "negative": "yellow-brown"
      },
      "methylene_blue": {
        "effect": "stains nucleus dark blue",
        "purpose": "improve visibility"
      }
    }
  }
}
```

### **Biological Drawing Requirements**
```json
{
  "biological_drawing": {
    "requirements": {
      "lines": "clean, continuous lines",
      "shading": "no shading or coloring",
      "labels": "horizontal label lines",
      "proportion": "accurate relative sizes",
      "detail": "show only visible structures"
    },
    "common_errors": {
      "sketchy_lines": "deduct marks",
      "artistic_shading": "not accepted",
      "crossed_label_lines": "avoid",
      "disproportionate": "check actual sizes"
    }
  }
}
```

---

## 📊 **Data Table Interpretation**

### **Biological Data Patterns**

#### **Growth Data Analysis**
```json
{
  "growth_data": {
    "table_reading": {
      "variables": {
        "independent": "time (days/weeks/hours)",
        "dependent": "height/mass/length"
      },
      "patterns": [
        {
          "type": "exponential",
          "description": "rapid increase",
          "phase": "log phase"
        },
        {
          "type": "plateau",
          "description": "levels off",
          "phase": "stationary phase"
        }
      ]
    },
    "calculations": {
      "growth_rate": {
        "formula": "change in measurement ÷ time",
        "units": "cm/day, g/week, etc."
      },
      "percentage_increase": {
        "formula": "(final - initial) ÷ initial × 100",
        "units": "%"
      }
    }
  }
}
```

#### **Environmental Data**
```json
{
  "environmental_factors": {
    "relationships": {
      "temperature_activity": {
        "pattern": "bell curve",
        "optimum": "peak activity temperature",
        "extremes": "denaturation/inactivity"
      },
      "light_photosynthesis": {
        "pattern": "plateau curve",
        "limiting_factor": "light intensity initially",
        "plateau_reason": "another factor limiting"
      },
      "pH_enzyme": {
        "pattern": "bell curve",
        "optimum_pH": "peak activity",
        "extremes": "denaturation"
      }
    }
  }
}
```

---

## 🧪 **Experimental Variable Framework**

### **Biological Investigation Variables**
```json
{
  "biological_experiments": {
    "photosynthesis_investigation": {
      "independent_options": [
        "light intensity",
        "CO₂ concentration",
        "temperature",
        "wavelength of light"
      ],
      "dependent_options": [
        "oxygen bubbles per minute",
        "volume of oxygen collected",
        "pH change",
        "mass change"
      ],
      "control_variables": [
        "same plant species",
        "same age/size of plant",
        "same time period",
        "same water temperature"
      ]
    },
    "enzyme_investigation": {
      "independent_options": [
        "temperature",
        "pH",
        "substrate concentration",
        "enzyme concentration"
      ],
      "dependent_options": [
        "time for reaction",
        "amount of product",
        "color change",
        "volume of gas"
      ],
      "control_variables": [
        "volume of solutions",
        "concentration (if not IV)",
        "time allowed",
        "mixing method"
      ]
    }
  }
}
```

### **Biological Controls**
```json
{
  "control_types": {
    "negative_control": {
      "purpose": "show no change without factor",
      "examples": [
        "boiled enzyme (denatured)",
        "plant in dark (no photosynthesis)",
        "distilled water (no nutrients)"
      ]
    },
    "positive_control": {
      "purpose": "show expected result",
      "examples": [
        "known working enzyme",
        "glucose solution for Benedict's",
        "starch for iodine test"
      ]
    },
    "procedural_control": {
      "purpose": "same conditions except one factor",
      "implementation": "identical setup minus variable"
    }
  }
}
```

---

## 📈 **Biological Graph Analysis**

### **Growth Curve Interpretation**
```json
{
  "growth_curves": {
    "bacterial_growth": {
      "phases": [
        {
          "name": "lag phase",
          "description": "slow/no growth",
          "reason": "adaptation period"
        },
        {
          "name": "log/exponential phase",
          "description": "rapid growth",
          "reason": "abundant resources"
        },
        {
          "name": "stationary phase",
          "description": "no net growth",
          "reason": "limited resources"
        },
        {
          "name": "death phase",
          "description": "population decline",
          "reason": "resource depletion/toxins"
        }
      ]
    },
    "plant_growth": {
      "patterns": {
        "sigmoid": "S-shaped curve",
        "initial": "slow growth",
        "rapid": "exponential phase",
        "mature": "growth slows"
      }
    }
  }
}
```

### **Population Dynamics**
```json
{
  "population_graphs": {
    "predator_prey": {
      "pattern": "oscillating curves",
      "relationship": "prey peaks before predator",
      "lag_time": "predator response delay"
    },
    "carrying_capacity": {
      "definition": "maximum sustainable population",
      "graph_feature": "horizontal asymptote",
      "factors": ["food", "space", "competition"]
    }
  }
}
```

---

## 🧬 **Biological Process Descriptions**

### **Standard Process Templates**

#### **Photosynthesis**
```json
{
  "photosynthesis_answers": {
    "equation": {
      "word": "carbon dioxide + water → glucose + oxygen",
      "chemical": "6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂",
      "conditions": "light energy, chlorophyll"
    },
    "location": {
      "organ": "leaf",
      "tissue": "mesophyll",
      "organelle": "chloroplast",
      "specific": "chlorophyll/grana/stroma"
    },
    "factors_affecting": {
      "limiting_factors": [
        "light intensity",
        "carbon dioxide concentration",
        "temperature"
      ],
      "explanations": {
        "light": "energy source for reaction",
        "CO₂": "raw material/reactant",
        "temperature": "affects enzyme activity"
      }
    }
  }
}
```

#### **Respiration**
```json
{
  "respiration_answers": {
    "aerobic": {
      "equation": "glucose + oxygen → carbon dioxide + water + energy",
      "chemical": "C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O + energy",
      "location": "mitochondria",
      "ATP_yield": "large amount/38 ATP"
    },
    "anaerobic": {
      "animals": {
        "equation": "glucose → lactic acid + energy",
        "location": "cytoplasm",
        "consequence": "oxygen debt"
      },
      "yeast": {
        "equation": "glucose → ethanol + carbon dioxide + energy",
        "process_name": "fermentation",
        "applications": ["brewing", "baking"]
      }
    }
  }
}
```

---

## 🔄 **Comparative Analysis Structures**

### **Structure-Function Relationships**
```json
{
  "adaptations": {
    "root_hair_cell": {
      "structural_features": [
        "long extension/hair",
        "thin cell wall",
        "large surface area",
        "no chloroplasts"
      ],
      "functional_advantages": [
        "increases surface area",
        "easier diffusion",
        "more water absorption",
        "more space for absorption"
      ],
      "linking_words": ["allows", "enables", "helps", "increases"]
    },
    "red_blood_cell": {
      "structural_features": [
        "biconcave shape",
        "no nucleus",
        "flexible membrane",
        "small size"
      ],
      "functional_advantages": [
        "increased surface area",
        "more space for hemoglobin",
        "squeeze through capillaries",
        "fit through small vessels"
      ]
    }
  }
}
```

### **Comparison Answer Templates**
```json
{
  "comparison_structure": {
    "format_options": [
      {
        "type": "point_by_point",
        "example": "Plant cells have cell walls, animal cells do not"
      },
      {
        "type": "block_comparison",
        "example": "Plant cells: rigid, rectangular. Animal cells: flexible, round"
      },
      {
        "type": "table_format",
        "structure": {
          "headers": ["Feature", "Plant Cell", "Animal Cell"],
          "comparison_points": ["clear differences"]
        }
      }
    ],
    "comparison_markers": [
      "whereas", "while", "but", "however",
      "in contrast", "unlike", "compared to"
    ]
  }
}
```

---

## 🧫 **Biological Test Procedures**

### **Food Test Database**
```json
{
  "food_tests": {
    "starch": {
      "reagent": "iodine solution",
      "initial_color": "yellow-brown",
      "positive_result": "blue-black",
      "negative_result": "stays yellow-brown"
    },
    "reducing_sugar": {
      "reagent": "Benedict's solution",
      "procedure": "add and heat",
      "initial_color": "blue",
      "positive_results": {
        "low": "green",
        "medium": "yellow/orange",
        "high": "brick red/red precipitate"
      }
    },
    "protein": {
      "reagent": "biuret solution",
      "alternative": "copper sulfate + sodium hydroxide",
      "initial_color": "blue",
      "positive_result": "purple/violet/lilac"
    },
    "fats": {
      "test_name": "emulsion test",
      "procedure": "mix with ethanol, add water",
      "positive_result": "milky/cloudy emulsion",
      "alternative": "translucent spot on paper"
    }
  }
}
```

---

## 📐 **Biology-Specific Answer Formats**

### **Extended Answer Formats**
```json
{
  "biology_answer_formats": {
    "biological_drawing": "clean lines with labels",
    "data_plot": "points and curve/line",
    "comparison_table": "features in rows/columns",
    "flow_diagram": "process steps with arrows",
    "genetic_cross": "Punnett square or genetic diagram",
    "food_chain": "organisms with arrows showing energy flow"
  }
}
```

---

## 📋 **Biology Abbreviations Extension**

### **Additional Biology-Specific Abbreviations**

| **Abbreviation** | **Meaning** | **Implementation** |
|------------------|-------------|-------------------|
| **SA:V** | Surface area to volume ratio | Common in cell biology |
| **ATP** | Adenosine triphosphate | Energy currency |
| **DNA** | Deoxyribonucleic acid | Genetic material |
| **mRNA** | Messenger RNA | Protein synthesis |
| **RBC** | Red blood cell | Acceptable abbreviation |
| **WBC** | White blood cell | Acceptable abbreviation |
| **BMI** | Body mass index | Health measure |
| **BP** | Blood pressure | Circulatory measure |

---

## 🔄 **Biology Answer Variation Patterns**

### **Common Biology Variations**

#### **1. Anatomical Term Variations**
```json
{
  "anatomical_answer": {
    "primary_answer": "small intestine",
    "acceptable_variations": [
      "small intestine",
      "ileum",  // Part of small intestine
      "small bowel",
      "SI"  // Abbreviation in context
    ],
    "spelling_variations": [
      "oesophagus",
      "esophagus"
    ]
  }
}
```

#### **2. Process Description Variations (owtte)**
```json
{
  "process_with_owtte": {
    "primary_answer": "water moves by osmosis from high to low concentration",
    "accepts_equivalent_phrasing": true,
    "key_concepts": {
      "process": ["osmosis", "diffusion of water"],
      "direction": ["high to low", "down concentration gradient"],
      "substance": ["water", "water molecules", "H₂O"]
    },
    "acceptable_complete_variations": [
      "osmosis from high water concentration to low",
      "water diffuses down concentration gradient",
      "movement of water from dilute to concentrated"
    ]
  }
}
```

#### **3. Comparative Descriptions (ora)**
```json
{
  "comparison_with_ora": {
    "primary_answer": "Plant cells have a cell wall but animal cells do not",
    "answer_variations": {
      "standard_comparisons": [
        "plant cells have cell walls, animal cells don't",
        "cell walls present in plants, absent in animals"
      ],
      "reverse_arguments": [
        "Animal cells lack cell walls that plant cells have",
        "Animal cells don't have cell walls like plant cells"
      ],
      "feature_focused": [
        "Cell wall is unique to plant cells",
        "Only plant cells have cell walls"
      ]
    },
    "marking_flags": {
      "accepts_reverse_argument": true,
      "requires_both_organisms": true
    }
  }
}
```

#### **4. Adaptation Explanations**
```json
{
  "adaptation_answer": {
    "structure": "large surface area",
    "function": "increases absorption",
    "acceptable_structure_variations": [
      "large SA",
      "big surface area",
      "increased surface area",
      "many folds/villi"
    ],
    "acceptable_function_variations": [
      "more absorption",
      "better absorption",
      "absorbs more",
      "efficient absorption"
    ],
    "linking_phrases": [
      "which allows",
      "enabling",
      "so that",
      "therefore",
      "for"
    ]
  }
}
```

### **Biology-Specific Observation Variations**

#### **5. Food Test Results**
```json
{
  "food_test_result": {
    "test": "Benedict's test",
    "primary_positive": "brick red precipitate",
    "accepts_equivalent_phrasing": true,
    "color_progression": {
      "low_sugar": ["green", "blue-green"],
      "medium_sugar": ["yellow", "orange"],
      "high_sugar": ["red", "brick red", "orange-red"]
    },
    "state_variations": [
      "precipitate",
      "ppt",
      "solid",
      "colour change to"
    ]
  }
}
```

### **Genetic Notation Variations**
```json
{
  "genetic_notation": {
    "allele_representations": {
      "dominant": ["A", "B", "capital letter"],
      "recessive": ["a", "b", "lowercase letter"],
      "genotype_formats": ["AA", "A/A", "(A)(A)"]
    },
    "cross_notation": [
      "Aa × Aa",
      "Aa x Aa",
      "Aa crossed with Aa"
    ]
  }
}
```

---

## 🏷️ **Biological Context Types Extension**

### **Biology-Specific Context Types**

| **Context Type** | **Usage** | **Examples** |
|------------------|-----------|--------------|
| `"structure"` | Anatomical parts | Cell organelles, organs |
| `"process"` | Biological processes | Photosynthesis steps |
| `"organism"` | Living things | Species names, groups |
| `"function"` | Biological roles | What structures do |
| `"adaptation"` | Evolutionary features | Survival advantages |
| `"phase"` | Stages/cycles | Growth phases, mitosis |

---

## ✅ **Biology-Specific Validation**

### **Diagram Validation**
- [ ] Labels match accepted terminology
- [ ] Spelling variants included
- [ ] Position indicators clear
- [ ] Drawing requirements specified

### **Data Interpretation Validation**
- [ ] Variables correctly identified
- [ ] Patterns accurately described
- [ ] Calculations include units
- [ ] Trends properly explained

### **Process Validation**
- [ ] Steps in correct sequence
- [ ] Scientific terminology accurate
- [ ] Locations specified correctly
- [ ] Conditions/requirements noted

### **Experimental Validation**
- [ ] Variables properly categorized
- [ ] Controls identified
- [ ] Method steps logical
- [ ] Safety considered where relevant

---

## 🔧 **Integration with General Guide**

### **Extends General Rules:**
- Adds biology-specific label databases
- Provides organism-specific contexts
- Includes life process templates
- Defines biological drawing standards

### **Maintains Core Structure:**
- Uses standard JSON format
- Applies universal context system
- Follows mark scheme processing
- Implements alternative linking

---

## 📝 **Biology Example Implementation**

```json
{
  "question_number": "2",
  "topic": "Plant Biology",
  "subtopic": "Photosynthesis",
  "question_text": "Fig. 2.1 shows a cross-section of a leaf.",
  "figure": true,
  "attachments": ["Cross-section diagram of leaf with labels A-D"],
  "parts": [
    {
      "part": "a",
      "question_text": "Name the tissue shown at label B",
      "answer_format": "single_word",
      "marks": 1,
      "correct_answers": [
        {
          "answer": "palisade",
          "marks": 1,
          "alternative_id": 1,
          "acceptable_variations": [
            "palisade mesophyll",
            "palisade layer",
            "palisade tissue"
          ],
          "context": {
            "type": "structure",
            "value": "leaf_tissue_B",
            "label": "Tissue at position B"
          }
        }
      ],
      "hint": "Look at the cells' shape and arrangement - they're tall and tightly packed",
      "explanation": "The palisade mesophyll is located just below the upper epidermis. It consists of tall, column-shaped cells packed with chloroplasts for maximum photosynthesis"
    },
    {
      "part": "b",
      "question_text": "Explain how the cells in tissue B are adapted for their function",
      "answer_format": "multi_line",
      "marks": 3,
      "correct_answers": [
        {
          "answer": "contain many chloroplasts",
          "marks": 1,
          "alternative_id": 1,
          "linked_alternatives": [2],
          "alternative_type": "structure_function_pair",
          "context": {
            "type": "adaptation",
            "value": "chloroplast_abundance",
            "label": "Structural adaptation"
          }
        },
        {
          "answer": "to absorb more light for photosynthesis",
          "marks": 1,
          "alternative_id": 2,
          "linked_alternatives": [1],
          "alternative_type": "structure_function_pair",
          "context": {
            "type": "function",
            "value": "light_absorption",
            "label": "Functional advantage"
          }
        },
        {
          "answer": "tall/columnar shape",
          "marks": 1,
          "alternative_id": 3,
          "linked_alternatives": [4],
          "alternative_type": "structure_function_pair",
          "context": {
            "type": "adaptation",
            "value": "cell_shape",
            "label": "Structural adaptation"
          }
        },
        {
          "answer": "allows more cells to fit in small space",
          "marks": 1,
          "alternative_id": 4,
          "linked_alternatives": [3],
          "alternative_type": "structure_function_pair",
          "context": {
            "type": "function",
            "value": "space_efficiency",
            "label": "Functional advantage"
          }
        }
      ],
      "answer_requirement": "structure_with_function",
      "hint": "Think about what these cells need to do and how their structure helps",
      "explanation": "Palisade cells are adapted for photosynthesis through multiple features: many chloroplasts for light absorption, columnar shape for efficient packing, and position near the leaf surface for maximum light exposure"
    }
  ]
}
```

## 📝 **Biology-Specific Question Types**

### **1. Genetic Cross Questions**

```json
{
  "type": "genetic_cross",
  "components": {
    "parental_genotypes": {
      "format": "letters representing alleles",
      "convention": "capital = dominant, lowercase = recessive"
    },
    "gametes": {
      "show": "all possible gamete types",
      "circle": "optional but common"
    },
    "punnett_square": {
      "layout": "gametes on edges, offspring in cells",
      "size": "2×2 for monohybrid, 4×4 for dihybrid"
    },
    "offspring": {
      "genotypes": "all possible combinations",
      "phenotypes": "physical characteristics",
      "ratio": "simplified form (3:1, 9:3:3:1)"
    }
  }
}
```

### **2. Food Web/Chain Questions**

```json
{
  "type": "food_web_analysis",
  "common_questions": {
    "energy_flow": {
      "direction": "arrows show energy transfer",
      "loss": "90% lost at each level"
    },
    "trophic_levels": {
      "producer": "makes own food",
      "primary_consumer": "eats producers",
      "secondary_consumer": "eats primary consumers"
    },
    "population_effects": {
      "increase_predator": "prey decreases",
      "remove_species": "trace effects through web"
    }
  }
}
```

### **3. Biological Calculation Questions**

```json
{
  "type": "biological_calculations",
  "calculation_types": {
    "magnification": {
      "formula": "magnification = image size ÷ actual size",
      "unit_consistency": "critical - same units"
    },
    "percentage_change": {
      "formula": "((final - initial) ÷ initial) × 100",
      "contexts": ["mass change", "population growth"]
    },
    "rate_calculations": {
      "formula": "rate = change ÷ time",
      "examples": ["transpiration rate", "reaction rate"]
    },
    "surface_area_volume": {
      "importance": "diffusion efficiency",
      "trend": "SA:V decreases with size"
    }
  }
}
```

### **4. Adaptation Questions**

```json
{
  "type": "adaptation_explanation",
  "structure_required": {
    "feature": "specific structural adaptation",
    "function": "how it helps survival",
    "environment": "link to habitat/lifestyle"
  },
  "marking_pattern": {
    "structure_mark": 1,
    "function_mark": 1,
    "link_mark": 1
  },
  "example": {
    "feature": "thick fur",
    "function": "insulation/reduces heat loss",
    "environment": "survives in cold climate"
  }
}
```

### **5. Experimental Design Questions (Biology)**

```json
{
  "type": "biological_experiment_design",
  "specific_considerations": {
    "living_organisms": {
      "ethics": "minimize harm",
      "variability": "use multiple specimens",
      "conditions": "maintain suitable environment"
    },
    "control_specifics": {
      "age_of_organisms": "same age/size",
      "genetic_variation": "same variety/species",
      "environmental": "same light/temperature"
    },
    "measurements": {
      "growth": "height/mass/leaf area",
      "activity": "movement/heart rate",
      "gas_exchange": "O₂/CO₂ levels"
    }
  }
}
```

### **6. Homeostasis Questions**

```json
{
  "type": "homeostasis_control",
  "feedback_components": {
    "stimulus": "change from normal",
    "receptor": "detects change",
    "control_center": "processes information",
    "effector": "brings about response",
    "response": "returns to normal"
  },
  "common_examples": {
    "temperature": {
      "too_hot": "sweating, vasodilation",
      "too_cold": "shivering, vasoconstriction"
    },
    "blood_glucose": {
      "too_high": "insulin released",
      "too_low": "glucagon released"
    }
  }
}
```

### **7. Dichotomous Key Questions**

```json
{
  "type": "dichotomous_key",
  "usage_types": {
    "identification": {
      "follow_path": "answer yes/no at each step",
      "reach_species": "end point gives identification"
    },
    "construction": {
      "rules": [
        "observable features only",
        "two choices at each point",
        "mutually exclusive options",
        "leads to single species"
      ]
    }
  }
}
```

### **8. Transport System Questions**

```json
{
  "type": "transport_comparison",
  "systems": {
    "blood_vessels": {
      "artery": {
        "wall": "thick, muscular",
        "pressure": "high",
        "valves": "absent"
      },
      "vein": {
        "wall": "thin",
        "pressure": "low",
        "valves": "present"
      },
      "capillary": {
        "wall": "one cell thick",
        "function": "exchange"
      }
    },
    "plant_transport": {
      "xylem": {
        "contents": "water and minerals",
        "direction": "up only",
        "cells": "dead"
      },
      "phloem": {
        "contents": "sucrose/amino acids",
        "direction": "up and down",
        "cells": "living"
      }
    }
  }
}
```

### **9. Enzyme Activity Questions**

```json
{
  "type": "enzyme_kinetics",
  "graph_patterns": {
    "temperature": {
      "shape": "bell curve",
      "optimum": "peak activity (~37°C for human)",
      "below_optimum": "less kinetic energy",
      "above_optimum": "denaturation"
    },
    "pH": {
      "shape": "bell curve",
      "optimum": "varies by enzyme",
      "extremes": "denaturation"
    },
    "substrate_concentration": {
      "shape": "plateau curve",
      "initial": "rate increases",
      "plateau": "all active sites occupied"
    },
    "inhibition": {
      "competitive": "can be overcome by more substrate",
      "non_competitive": "cannot be overcome"
    }
  },
  "lock_and_key": {
    "substrate": "key",
    "active_site": "lock",
    "specificity": "shape complementary"
  }
}
```

### **10. Ecological Pyramids**

```json
{
  "type": "ecological_pyramids",
  "pyramid_types": {
    "numbers": {
      "shows": "number of organisms",
      "can_be_inverted": true,
      "example": "tree → insects"
    },
    "biomass": {
      "shows": "mass of living material",
      "usually_upright": true,
      "units": "g/m² or kg/m²"
    },
    "energy": {
      "shows": "energy flow",
      "always_upright": true,
      "units": "kJ/m²/year",
      "efficiency": "~10% between levels"
    }
  },
  "energy_loss_reasons": [
    "respiration",
    "excretion",
    "egestion",
    "not all eaten",
    "movement"
  ]
}
```

### **11. Nutrient Cycles**

```json
{
  "type": "nutrient_cycles",
  "carbon_cycle": {
    "processes_adding_CO₂": [
      "respiration",
      "combustion",
      "decomposition"
    ],
    "processes_removing_CO₂": [
      "photosynthesis"
    ],
    "carbon_stores": [
      "atmosphere (CO₂)",
      "organisms (organic compounds)",
      "fossil fuels",
      "oceans (dissolved)"
    ]
  },
  "nitrogen_cycle": {
    "key_bacteria": {
      "nitrogen_fixing": "N₂ → NH₃",
      "nitrifying": "NH₃ → NO₂⁻ → NO₃⁻",
      "denitrifying": "NO₃⁻ → N₂"
    },
    "importance": "proteins and DNA",
    "lightning": "also fixes nitrogen"
  }
}
```

### **12. Disease and Immunity**

```json
{
  "type": "immunity_responses",
  "antibody_graphs": {
    "primary_response": {
      "delay": "few days",
      "peak": "lower",
      "duration": "shorter"
    },
    "secondary_response": {
      "delay": "immediate",
      "peak": "higher",
      "duration": "longer",
      "reason": "memory cells"
    }
  },
  "vaccination": {
    "contains": "dead/weakened pathogen",
    "stimulates": "antibody production",
    "provides": "active immunity"
  },
  "disease_transmission": {
    "direct": ["touching", "body fluids"],
    "indirect": ["air", "water", "vectors", "contaminated surfaces"]
  }
}
```

### **13. Plant Responses**

```json
{
  "type": "plant_responses",
  "transpiration": {
    "definition": "water loss from leaves",
    "factors_increasing": [
      "high temperature",
      "low humidity",
      "wind",
      "light intensity"
    ],
    "stomata_control": {
      "day": "open for CO₂",
      "night": "usually closed",
      "water_stress": "close to conserve"
    }
  },
  "tropisms": {
    "phototropism": {
      "stimulus": "light",
      "shoot_response": "towards (positive)",
      "root_response": "away (negative)"
    },
    "gravitropism": {
      "stimulus": "gravity",
      "shoot_response": "away (negative)",
      "root_response": "towards (positive)"
    },
    "mechanism": "auxin distribution"
  }
}
```

### **14. Excretion and Osmoregulation**

```json
{
  "type": "excretion_questions",
  "kidney_function": {
    "filtration": {
      "location": "glomerulus/Bowman's capsule",
      "filtered": "small molecules",
      "not_filtered": "proteins, blood cells"
    },
    "reabsorption": {
      "selective": "glucose, amino acids",
      "variable": "water (ADH control)",
      "location": "tubules"
    }
  },
  "osmoregulation": {
    "too_much_water": {
      "detected": "hypothalamus",
      "response": "less ADH",
      "result": "dilute urine"
    },
    "too_little_water": {
      "detected": "hypothalamus",
      "response": "more ADH",
      "result": "concentrated urine"
    }
  }
}
```

```json
{
  "type": "transport_comparison",
  "systems": {
    "blood_vessels": {
      "artery": {
        "wall": "thick, muscular",
        "pressure": "high",
        "valves": "absent"
      },
      "vein": {
        "wall": "thin",
        "pressure": "low",
        "valves": "present"
      },
      "capillary": {
        "wall": "one cell thick",
        "function": "exchange"
      }
    },
    "plant_transport": {
      "xylem": {
        "contents": "water and minerals",
        "direction": "up only",
        "cells": "dead"
      },
      "phloem": {
        "contents": "sucrose/amino acids",
        "direction": "up and down",
        "cells": "living"
      }
    }
  }
}
```

---

**Document Version:** 3.0 (Biology-Specific)  
**Compatible With:** General Extraction Guide v3.0  
**Purpose:** Biology-specific extraction requirements

---

**END OF BIOLOGY GUIDE**