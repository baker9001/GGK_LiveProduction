# Physics Extraction Guide v3.0
## Compatible with General Extraction Guide v3.0

---

## 📋 **Physics-Specific Overview**

This guide extends the General Extraction Guide v3.0 with physics-specific requirements for handling measurements, calculations, diagrams, and experimental procedures. Physics papers require special attention to numerical precision, unit handling, and visual interpretation.

---

## 🔬 **Physics Question Type Categories**

### **1. Measurement Questions**
- Instrument readings (meters, scales, timing devices)
- Measurement uncertainty and precision
- Parallax error considerations
- Zero error corrections

### **2. Calculation Questions**
- Multi-step problems with formula application
- Unit conversions and dimensional analysis
- Significant figures and rounding rules
- Alternative calculation methods

### **3. Diagram-Based Questions**
- Circuit diagram completion and analysis
- Ray diagrams and optical systems
- Vector diagrams and force analysis
- Experimental setup diagrams

### **4. Graph Questions**
- Plotting data points
- Drawing best-fit lines
- Gradient calculations
- Intercept determination
- Area under curve calculations

### **5. Experimental Design Questions**
- Variable identification
- Control measures
- Safety precautions
- Sources of error
- Improvements to method

---

## 📏 **Measurement Reading Protocols**

### **Instrument-Specific Rules**

#### **1. Ruler/Meter Rule**
```json
{
  "measurement_context": {
    "instrument": "ruler",
    "precision": "±0.5 mm",
    "reading_rules": {
      "alignment": "perpendicular viewing angle",
      "estimation": "to nearest 0.5 mm",
      "zero_error": "check and correct if present"
    }
  },
  "answer_format": "measurement",
  "acceptable_variations": {
    "units": ["mm", "cm", "m"],
    "tolerance": "±0.5 mm from mark scheme value"
  }
}
```

#### **2. Vernier Caliper**
```json
{
  "measurement_context": {
    "instrument": "vernier_caliper",
    "precision": "±0.01 cm or ±0.1 mm",
    "reading_rules": {
      "main_scale": "read to nearest mm",
      "vernier_scale": "find coinciding line",
      "calculation": "main + (vernier × 0.1) mm"
    }
  }
}
```

#### **3. Micrometer Screw Gauge**
```json
{
  "measurement_context": {
    "instrument": "micrometer",
    "precision": "±0.001 cm or ±0.01 mm",
    "reading_rules": {
      "sleeve_scale": "read to 0.5 mm",
      "thimble_scale": "read to 0.01 mm",
      "ratchet": "ensure consistent pressure"
    }
  }
}
```

#### **4. Measuring Cylinder**
```json
{
  "measurement_context": {
    "instrument": "measuring_cylinder",
    "capacity": "specify size (50 cm³, 100 cm³, etc.)",
    "reading_rules": {
      "meniscus": "read at bottom of meniscus",
      "eye_level": "at same height as meniscus",
      "precision": "half smallest division"
    }
  }
}
```

#### **5. Balance/Scale**
```json
{
  "measurement_context": {
    "instrument": "balance",
    "type": "digital/beam",
    "precision": "±0.01 g or ±0.1 g",
    "reading_rules": {
      "zero": "check zero before use",
      "stability": "wait for stable reading",
      "units": "g, kg, or mg as appropriate"
    }
  }
}
```

#### **6. Stopwatch/Timer**
```json
{
  "measurement_context": {
    "instrument": "stopwatch",
    "type": "digital/analog",
    "precision": "±0.01 s or ±0.1 s",
    "reading_rules": {
      "reaction_time": "consider ±0.2 s human error",
      "repeated_measurements": "average multiple readings",
      "oscillations": "time multiple periods"
    }
  }
}
```

#### **7. Thermometer**
```json
{
  "measurement_context": {
    "instrument": "thermometer",
    "type": "mercury/digital",
    "range": "specify range",
    "precision": "±0.5°C or ±1°C",
    "reading_rules": {
      "immersion": "bulb fully immersed",
      "equilibrium": "wait for stable reading",
      "parallax": "read at eye level"
    }
  }
}
```

#### **8. Ammeter/Voltmeter**
```json
{
  "measurement_context": {
    "instrument": "ammeter/voltmeter",
    "type": "analog/digital",
    "range": "specify scale used",
    "reading_rules": {
      "polarity": "correct connection required",
      "scale": "choose appropriate range",
      "precision": "half smallest division"
    }
  }
}
```

### **Universal Measurement Answer Structure**
```json
{
  "answer": "23.5",
  "unit": "cm",
  "marks": 1,
  "measurement_details": {
    "instrument": "ruler",
    "tolerance": "±0.5 mm",
    "acceptable_range": {
      "min": 23.45,
      "max": 23.55,
      "unit": "cm"
    }
  },
  "context": {
    "type": "measurement",
    "value": "length_measurement",
    "label": "Length of pendulum string"
  }
}
```

---

## 📊 **Graph Handling Specifications**

### **Graph Plotting Requirements**
```json
{
  "graph_requirements": {
    "axes": {
      "x_axis": {
        "label": "Time / s",
        "scale": "linear, appropriate range",
        "markings": "regular intervals"
      },
      "y_axis": {
        "label": "Distance / m",
        "scale": "linear, appropriate range",
        "markings": "regular intervals"
      }
    },
    "plotting": {
      "points": "clear crosses or dots with circles",
      "size": "small, precise marks",
      "accuracy": "±½ small square tolerance"
    },
    "line": {
      "type": "best_fit/curve/straight",
      "quality": "smooth, single line",
      "extrapolation": "dashed if required"
    }
  }
}
```

### **Graph Analysis Operations**

#### **1. Gradient Calculation**
```json
{
  "operation": "gradient_calculation",
  "correct_answers": [
    {
      "answer": "2.5",
      "unit": "m/s",
      "marks": 3,
      "calculation_steps": [
        {
          "step": "identify_triangle",
          "description": "Large triangle using gridlines",
          "marks": 1
        },
        {
          "step": "show_values",
          "description": "Δy = 50 m, Δx = 20 s",
          "marks": 1
        },
        {
          "step": "calculate",
          "description": "gradient = 50/20 = 2.5 m/s",
          "marks": 1
        }
      ]
    }
  ]
}
```

#### **2. Intercept Reading**
```json
{
  "operation": "intercept_reading",
  "correct_answers": [
    {
      "answer": "15",
      "unit": "cm",
      "marks": 1,
      "reading_tolerance": "±1 small square",
      "intercept_type": "y_intercept"
    }
  ]
}
```

---

## ⚡ **Circuit Diagram Specifications**

### **Component Symbols Database**
```json
{
  "circuit_components": {
    "cell": {
      "symbol": "single line pair (long +, short -)",
      "variations": ["battery (multiple cells)"]
    },
    "resistor": {
      "symbol": "rectangle or zigzag",
      "variations": ["variable resistor", "LDR", "thermistor"]
    },
    "lamp": {
      "symbol": "circle with X or filament loops",
      "variations": ["LED with arrows"]
    },
    "switch": {
      "symbol": "gap with lever",
      "variations": ["SPDT", "push button"]
    },
    "ammeter": {
      "symbol": "circle with A",
      "connection": "in series"
    },
    "voltmeter": {
      "symbol": "circle with V",
      "connection": "in parallel"
    }
  }
}
```

### **Circuit Completion Rules**
```json
{
  "circuit_completion": {
    "requirements": {
      "closed_loops": "all components connected",
      "polarity": "correct where applicable",
      "junctions": "clear dot at connections",
      "crossing_wires": "bridge symbol if not connected"
    },
    "common_errors": {
      "short_circuits": "reject if present",
      "incorrect_meter_placement": "specify series/parallel",
      "missing_components": "all required components present"
    }
  }
}
```

---

## 🧮 **Calculation Framework**

### **Multi-Step Calculation Structure**
```json
{
  "calculation_question": {
    "final_answer": "450",
    "unit": "N",
    "marks": 4,
    "calculation_steps": [
      {
        "step_number": 1,
        "operation": "identify_formula",
        "content": "F = ma",
        "marks": 1,
        "alternative_formulas": ["Newton's second law"]
      },
      {
        "step_number": 2,
        "operation": "substitute_values",
        "content": "F = 90 × 5",
        "marks": 1,
        "required_elements": ["correct substitution", "units optional"]
      },
      {
        "step_number": 3,
        "operation": "calculate",
        "content": "F = 450",
        "marks": 1
      },
      {
        "step_number": 4,
        "operation": "state_unit",
        "content": "N or Newton",
        "marks": 1,
        "acceptable_units": ["N", "Newton", "kg⋅m/s²"]
      }
    ],
    "alternative_methods": [
      {
        "method": "energy_approach",
        "valid": true,
        "steps": ["Calculate KE change", "Apply work-energy theorem"]
      }
    ]
  }
}
```

### **Formula Database Structure**
```json
{
  "physics_formulas": {
    "mechanics": {
      "kinematics": [
        {
          "name": "velocity",
          "formula": "v = s/t",
          "variations": ["v = u + at", "s = ut + ½at²"]
        }
      ],
      "dynamics": [
        {
          "name": "Newton's second law",
          "formula": "F = ma",
          "rearrangements": ["a = F/m", "m = F/a"]
        }
      ]
    },
    "electricity": {
      "current": [
        {
          "name": "Ohm's law",
          "formula": "V = IR",
          "rearrangements": ["I = V/R", "R = V/I"]
        }
      ]
    }
  }
}
```

---

## 📐 **Vector Diagram Handling**

### **Vector Representation Rules**
```json
{
  "vector_diagram": {
    "representation": {
      "arrow": "straight line with arrowhead",
      "length": "proportional to magnitude",
      "direction": "accurate angle ±2°",
      "label": "force value and unit"
    },
    "scale": {
      "stated": "1 cm : 10 N",
      "consistent": "all vectors use same scale"
    },
    "resultant": {
      "graphical": "tip-to-tail or parallelogram",
      "measurement": "ruler and protractor",
      "calculation": "Pythagoras or trigonometry"
    }
  }
}
```

---

## 🔬 **Experimental Design Framework**

### **Variable Identification Structure**
```json
{
  "experimental_variables": {
    "independent": {
      "definition": "variable being changed",
      "example": "mass added to spring",
      "control": "systematic variation"
    },
    "dependent": {
      "definition": "variable being measured",
      "example": "extension of spring",
      "measurement": "appropriate instrument"
    },
    "control": {
      "definition": "variables kept constant",
      "examples": ["temperature", "spring constant"],
      "importance": "fair test"
    }
  }
}
```

### **Experimental Improvement Categories**
```json
{
  "improvements": {
    "accuracy": [
      "use more precise instruments",
      "take multiple readings",
      "use larger scale"
    ],
    "reliability": [
      "repeat and average",
      "control more variables",
      "automated measurement"
    ],
    "validity": [
      "eliminate systematic errors",
      "improve method design",
      "check assumptions"
    ]
  }
}
```

---

## 🔢 **Unit Conversion Matrix**

### **Standard Conversions**
```json
{
  "unit_conversions": {
    "length": {
      "base": "m",
      "conversions": {
        "km": "× 1000",
        "cm": "÷ 100",
        "mm": "÷ 1000"
      }
    },
    "mass": {
      "base": "kg",
      "conversions": {
        "g": "÷ 1000",
        "mg": "÷ 1000000",
        "tonne": "× 1000"
      }
    },
    "time": {
      "base": "s",
      "conversions": {
        "min": "× 60",
        "h": "× 3600",
        "ms": "÷ 1000"
      }
    }
  }
}
```

---

## 📏 **Significant Figures Rules**

### **Physics-Specific SF Guidelines**
```json
{
  "significant_figures": {
    "measurement_rules": {
      "analog_instruments": "estimate to half smallest division",
      "digital_instruments": "all displayed digits",
      "calculations": "match least precise input"
    },
    "common_scenarios": {
      "intermediate_calculations": "keep one extra SF",
      "final_answer": "round to appropriate SF",
      "constants": "use more SF than measurements"
    },
    "marking_tolerance": {
      "strict": "exact SF match required",
      "lenient": "±1 SF acceptable",
      "context_dependent": "based on instrument precision"
    }
  }
}
```

---

## 🎯 **Physics-Specific Answer Formats**

### **Extended Answer Formats**
```json
{
  "physics_answer_formats": {
    "vector_quantity": "magnitude and direction required",
    "experimental_design": "method with diagram",
    "circuit_completion": "complete circuit with all components",
    "graph_sketch": "shape and key features",
    "calculation_full": "formula, substitution, answer, unit",
    "measurement_reading": "value ± uncertainty"
  }
}
```

---

## 📋 **Physics Abbreviations Extension**

### **Additional Physics-Specific Abbreviations**

| **Abbreviation** | **Meaning** | **Implementation** |
|------------------|-------------|-------------------|
| **bald** | Bold line on graph | Thicker/clearer line required |
| **nfp** | No further penalty | Error not penalized again |
| **poc** | Point of contact | Specific location marker |
| **rig** | Rigid connection | Fixed, non-flexible joint |
| **u.p.** | Unit penalty | Deduct marks for missing/wrong unit |
| **e.e.o.o** | Each error or omission | Deduct per occurrence |

---

## 🔄 **Physics Answer Variation Patterns**

### **Common Physics Variations**

#### **1. Unit Variations**
```json
{
  "answer": "2.5",
  "unit": "m/s",
  "acceptable_unit_variations": [
    "m/s", "ms⁻¹", "m s⁻¹", "meters per second"
  ],
  "equivalent_units": {
    "km/h": {
      "conversion_factor": 3.6,
      "acceptable": true
    }
  }
}
```

#### **2. Formula Variations**
```json
{
  "formula_answer": {
    "primary_form": "F = ma",
    "acceptable_variations": [
      "Force = mass × acceleration",
      "F = m × a",
      "F = m.a"
    ],
    "rearranged_forms": [
      "a = F/m",
      "m = F/a"
    ]
  }
}
```

#### **3. Vector Notation Variations**
```json
{
  "vector_answer": {
    "magnitude": "5",
    "direction": "North",
    "acceptable_direction_variations": [
      "North", "N", "000°", "360°", "upward", "↑"
    ],
    "alternative_representations": [
      "5 N",
      "5 towards North",
      "5 in direction 000°"
    ]
  }
}
```

#### **4. Measurement Reading Variations**
```json
{
  "measurement_with_owtte": {
    "answer": "23.5",
    "unit": "cm",
    "accepts_equivalent_phrasing": true,
    "acceptable_range": {
      "min": 23.0,
      "max": 24.0,
      "reason": "instrument precision"
    },
    "marking_note": "Accept values within ±0.5 cm due to parallax"
  }
}
```

### **Physics-Specific ora Implementation**

For physics comparisons with "ora":

```json
{
  "comparison_answer": {
    "primary_answer": "Current A is twice Current B",
    "answer_variations": {
      "standard_forms": [
        "IA = 2IB",
        "A has double the current of B",
        "Current in A is 2× current in B"
      ],
      "reverse_arguments": [
        "Current B is half Current A",
        "IB = 0.5IA",
        "B has half the current of A"
      ],
      "ratio_expressions": [
        "IA:IB = 2:1",
        "IB:IA = 1:2",
        "A:B = 2:1 (current)"
      ]
    },
    "marking_flags": {
      "accepts_reverse_argument": true,
      "accepts_mathematical_notation": true
    }
  }
}
```

---

## ✅ **Physics-Specific Validation**

### **Measurement Validation**
- [ ] Instrument specified for all measurements
- [ ] Precision/uncertainty included
- [ ] Acceptable range defined
- [ ] Unit conversions handled

### **Calculation Validation**
- [ ] All steps identified and marked
- [ ] Alternative methods recognized
- [ ] Significant figures appropriate
- [ ] Units tracked throughout

### **Diagram Validation**
- [ ] Component symbols correct
- [ ] Connections properly shown
- [ ] Labels and values included
- [ ] Scale/proportions reasonable

### **Experimental Validation**
- [ ] Variables correctly identified
- [ ] Method steps complete
- [ ] Safety considerations included
- [ ] Improvements categorized

---

## 🔧 **Integration with General Guide**

### **Extends General Rules:**
- Adds measurement-specific context types
- Provides instrument-specific tolerances
- Includes calculation step tracking
- Defines diagram completion criteria

### **Maintains Core Structure:**
- Uses standard JSON format
- Applies universal context system
- Follows mark scheme processing rules
- Implements alternative linking

---

## 📝 **Physics Example Implementation**

```json
{
  "question_number": "3",
  "topic": "Mechanics",
  "subtopic": "Forces and Motion",
  "question_text": "A student measures the extension of a spring when different masses are added.",
  "parts": [
    {
      "part": "a",
      "question_text": "Read the extension from the ruler shown in Fig. 3.1",
      "answer_format": "measurement",
      "marks": 1,
      "figure": true,
      "attachments": ["Ruler showing spring extension measurement"],
      "correct_answers": [
        {
          "answer": "12.5",
          "unit": "cm",
          "marks": 1,
          "measurement_details": {
            "instrument": "ruler",
            "precision": "±0.5 mm",
            "acceptable_range": {
              "min": 12.4,
              "max": 12.6,
              "unit": "cm"
            }
          },
          "context": {
            "type": "measurement",
            "value": "spring_extension",
            "label": "Extension reading from ruler"
          }
        }
      ],
      "hint": "Read the ruler at the bottom of the pointer, estimating to the nearest half division",
      "explanation": "The pointer indicates 12.5 cm on the ruler. When reading a ruler, estimate to half the smallest division (0.5 mm or 0.05 cm)"
    }
  ]
}
```

## 📝 **Physics-Specific Question Types**

### **1. Ticker Tape Questions**

```json
{
  "type": "ticker_tape_analysis",
  "question_text": "The ticker tape shows dots at 0.02 s intervals",
  "measurements_required": [
    {
      "measurement": "distance_between_dots",
      "purpose": "calculate velocity",
      "formula": "v = s/t"
    },
    {
      "measurement": "change_in_spacing",
      "purpose": "determine acceleration",
      "interpretation": "increasing gaps = acceleration"
    }
  ]
}
```

### **2. Oscilloscope Trace Questions**

```json
{
  "type": "oscilloscope_reading",
  "settings": {
    "timebase": "5 ms/div",
    "voltage_sensitivity": "2 V/div"
  },
  "measurements": [
    {
      "type": "amplitude",
      "method": "count vertical divisions × sensitivity",
      "unit": "V"
    },
    {
      "type": "period",
      "method": "count horizontal divisions × timebase",
      "unit": "s"
    },
    {
      "type": "frequency",
      "calculation": "f = 1/T",
      "unit": "Hz"
    }
  ]
}
```

### **3. Energy Transfer Questions**

```json
{
  "type": "energy_transfer",
  "question_structure": {
    "input_energy": {
      "type": "electrical",
      "calculation": "E = VIt"
    },
    "output_energy": {
      "type": "kinetic",
      "calculation": "E = ½mv²"
    },
    "efficiency": {
      "formula": "efficiency = (useful output / total input) × 100%",
      "common_errors": ["forgetting ×100", "wrong energy forms"]
    }
  }
}
```

### **4. Motion Graph Interpretation**

```json
{
  "type": "motion_graphs",
  "graph_types": {
    "distance_time": {
      "gradient": "speed",
      "horizontal_line": "stationary",
      "curved_line": "acceleration/deceleration"
    },
    "velocity_time": {
      "gradient": "acceleration",
      "area_under": "distance traveled",
      "horizontal_line": "constant velocity"
    },
    "acceleration_time": {
      "area_under": "change in velocity",
      "zero_line": "constant velocity"
    }
  }
}
```

### **5. Ray Diagram Questions**

```json
{
  "type": "ray_diagram",
  "diagram_types": {
    "converging_lens": {
      "required_rays": [
        "parallel ray → through focus",
        "through center → straight",
        "through focus → parallel"
      ],
      "image_properties": ["position", "size", "orientation", "real/virtual"]
    },
    "plane_mirror": {
      "construction_rules": [
        "image same distance behind",
        "virtual image",
        "laterally inverted"
      ]
    }
  }
}
```

### **6. Electrical Safety Questions**

```json
{
  "type": "electrical_safety",
  "common_topics": {
    "fuse_selection": {
      "rule": "slightly higher than normal current",
      "calculation": "I = P/V, then next fuse size up"
    },
    "earthing": {
      "purpose": "safety - prevent electric shock",
      "connection": "metal case to earth wire"
    },
    "double_insulation": {
      "identification": "plastic case, no earth needed",
      "symbol": "square within square"
    }
  }
}
```

### **7. Radioactivity Questions**

```json
{
  "type": "radioactivity",
  "concepts": {
    "half_life": {
      "definition": "time for half the nuclei to decay",
      "calculations": {
        "remaining": "N = N₀ × (½)^(t/t½)",
        "activity": "A = A₀ × (½)^(t/t½)"
      },
      "graph_features": {
        "exponential_decay": true,
        "never_reaches_zero": true
      }
    },
    "radiation_types": {
      "alpha": {
        "symbol": "α or ⁴₂He",
        "penetration": "paper",
        "ionizing": "high"
      },
      "beta": {
        "symbol": "β or ⁰₋₁e",
        "penetration": "aluminum",
        "ionizing": "medium"
      },
      "gamma": {
        "symbol": "γ",
        "penetration": "lead",
        "ionizing": "low"
      }
    },
    "decay_equations": {
      "balance": "mass and atomic numbers",
      "alpha_decay": "mass -4, atomic -2",
      "beta_decay": "mass same, atomic +1"
    }
  }
}
```

### **8. Wave Properties Questions**

```json
{
  "type": "wave_calculations",
  "relationships": {
    "wave_equation": {
      "formula": "v = fλ",
      "variables": {
        "v": "wave speed (m/s)",
        "f": "frequency (Hz)",
        "λ": "wavelength (m)"
      }
    },
    "period_frequency": {
      "formula": "T = 1/f",
      "units": "T in seconds, f in Hz"
    }
  },
  "wave_properties": {
    "amplitude": "maximum displacement",
    "wavelength": "distance between peaks",
    "frequency": "waves per second",
    "period": "time for one wave"
  },
  "wave_diagrams": {
    "displacement_distance": "shows wavelength",
    "displacement_time": "shows period",
    "labeling": "crest, trough, amplitude"
  }
}
```

### **9. Pressure Questions**

```json
{
  "type": "pressure_calculations",
  "formulas": {
    "pressure_definition": {
      "formula": "P = F/A",
      "units": "Pa or N/m²"
    },
    "liquid_pressure": {
      "formula": "P = ρgh",
      "variables": {
        "ρ": "density (kg/m³)",
        "g": "9.8 or 10 m/s²",
        "h": "depth (m)"
      }
    },
    "hydraulics": {
      "principle": "F₁/A₁ = F₂/A₂",
      "application": "force multiplier"
    }
  },
  "common_contexts": {
    "atmospheric": "101,000 Pa or 101 kPa",
    "gauge_pressure": "excludes atmospheric",
    "absolute_pressure": "includes atmospheric"
  }
}
```

### **10. Moments and Equilibrium**

```json
{
  "type": "moments_equilibrium",
  "principles": {
    "moment_calculation": {
      "formula": "moment = force × perpendicular distance",
      "units": "Nm",
      "direction": "clockwise or anticlockwise"
    },
    "equilibrium_conditions": {
      "translational": "sum of forces = 0",
      "rotational": "sum of moments = 0",
      "both_required": true
    }
  },
  "problem_types": {
    "see_saw": "find unknown mass/distance",
    "beam_balance": "multiple forces",
    "crane": "include weight of beam"
  }
}
```

### **11. Thermal Physics Calculations**

```json
{
  "type": "thermal_physics",
  "specific_heat_capacity": {
    "formula": "Q = mcΔT",
    "variables": {
      "Q": "energy (J)",
      "m": "mass (kg)",
      "c": "specific heat capacity (J/kg°C)",
      "ΔT": "temperature change (°C)"
    }
  },
  "latent_heat": {
    "formula": "Q = mL",
    "types": {
      "fusion": "solid ↔ liquid",
      "vaporization": "liquid ↔ gas"
    },
    "key_point": "no temperature change during phase change"
  },
  "heating_curves": {
    "horizontal_sections": "phase changes",
    "sloped_sections": "temperature changes",
    "calculations": "use appropriate formula for each section"
  }
}
```

```json
{
  "type": "electrical_safety",
  "common_topics": {
    "fuse_selection": {
      "rule": "slightly higher than normal current",
      "calculation": "I = P/V, then next fuse size up"
    },
    "earthing": {
      "purpose": "safety - prevent electric shock",
      "connection": "metal case to earth wire"
    },
    "double_insulation": {
      "identification": "plastic case, no earth needed",
      "symbol": "square within square"
    }
  }
}
```

---

**Document Version:** 3.0 (Physics-Specific)  
**Compatible With:** General Extraction Guide v3.0  
**Purpose:** Physics-specific extraction requirements  

---

**END OF PHYSICS GUIDE**