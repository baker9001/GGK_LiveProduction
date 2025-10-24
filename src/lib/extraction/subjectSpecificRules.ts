import { type SubjectSpecificRules, type ValidationIssue } from './answerValidator';

export const PhysicsRules: SubjectSpecificRules = {
  requiresUnits: true,
  allowsApproximations: true,
  requiresSignificantFigures: true,
  allowsEquivalentPhrasing: true,
  customValidations: [
    (answer: string): ValidationIssue | null => {
      const hasNumber = /\d+\.?\d*/g.test(answer);
      if (hasNumber && !/(m|km|cm|mm|g|kg|mg|s|min|h|N|J|W|V|A|Ω|°C|K|Pa|Hz|rad|sr)/i.test(answer)) {
        return {
          severity: 'warning',
          message: 'Numerical answer in Physics should include units',
          field: 'answer',
          code: 'PHYSICS_UNITS_MISSING'
        };
      }
      return null;
    },
    (answer: string): ValidationIssue | null => {
      const hasFormula = /[a-z]\s*=\s*[a-z]/i.test(answer);
      if (hasFormula && !answer.includes('where') && !answer.includes('context')) {
        return {
          severity: 'info',
          message: 'Formula detected - consider adding variable definitions',
          field: 'answer',
          code: 'PHYSICS_FORMULA_CONTEXT'
        };
      }
      return null;
    },
    (answer: string): ValidationIssue | null => {
      const vectorTerms = /(velocity|acceleration|force|momentum|displacement)/i;
      if (vectorTerms.test(answer) && !/direction|angle|vector/i.test(answer)) {
        return {
          severity: 'info',
          message: 'Vector quantity mentioned - verify direction is specified if required',
          field: 'answer',
          code: 'PHYSICS_VECTOR_DIRECTION'
        };
      }
      return null;
    }
  ]
};

export const ChemistryRules: SubjectSpecificRules = {
  requiresUnits: true,
  allowsApproximations: true,
  requiresSignificantFigures: true,
  allowsEquivalentPhrasing: true,
  customValidations: [
    (answer: string): ValidationIssue | null => {
      const hasChemicalFormula = /[A-Z][a-z]?\d*/g.test(answer);
      const commonElements = ['H', 'O', 'C', 'N', 'Na', 'Cl', 'Ca', 'Fe', 'Cu', 'Zn'];
      const hasCommonElement = commonElements.some(el => answer.includes(el));

      if (hasChemicalFormula && hasCommonElement) {
        if (!/state|phase|\(s\)|\(l\)|\(g\)|\(aq\)/i.test(answer)) {
          return {
            severity: 'info',
            message: 'Chemical formula detected - verify state symbols if required',
            field: 'answer',
            code: 'CHEMISTRY_STATE_SYMBOLS'
          };
        }
      }
      return null;
    },
    (answer: string): ValidationIssue | null => {
      if (answer.includes('=') && /[A-Z][a-z]?\d*/g.test(answer)) {
        const arrowSymbols = ['->', '→', '⇌', '↔'];
        const hasArrow = arrowSymbols.some(arrow => answer.includes(arrow));

        if (!hasArrow && answer.match(/[A-Z][a-z]?\d*/g)?.length! > 1) {
          return {
            severity: 'warning',
            message: 'Chemical equation should use arrow notation (→ or ⇌) not equals sign',
            field: 'answer',
            code: 'CHEMISTRY_EQUATION_NOTATION'
          };
        }
      }
      return null;
    },
    (answer: string): ValidationIssue | null => {
      const hasConcentration = /mol|M|concentration|molarity/i.test(answer);
      const hasNumber = /\d+\.?\d*/g.test(answer);

      if (hasConcentration && hasNumber && !/mol\/dm³|mol dm⁻³|M|mol\/L/i.test(answer)) {
        return {
          severity: 'warning',
          message: 'Concentration value should include proper units (mol/dm³ or M)',
          field: 'answer',
          code: 'CHEMISTRY_CONCENTRATION_UNITS'
        };
      }
      return null;
    }
  ]
};

export const BiologyRules: SubjectSpecificRules = {
  requiresUnits: false,
  allowsApproximations: true,
  requiresSignificantFigures: false,
  allowsEquivalentPhrasing: true,
  customValidations: [
    (answer: string): ValidationIssue | null => {
      const scientificNames = /[A-Z][a-z]+\s+[a-z]+/g;
      const matches = answer.match(scientificNames);

      if (matches && matches.length > 0) {
        const hasItalics = /<i>|<em>|\*|_/i.test(answer);
        if (!hasItalics) {
          return {
            severity: 'info',
            message: 'Scientific names detected - should be italicized (Genus species)',
            field: 'answer',
            code: 'BIOLOGY_SCIENTIFIC_NAME_FORMAT'
          };
        }
      }
      return null;
    },
    (answer: string): ValidationIssue | null => {
      const processTerms = /(photosynthesis|respiration|osmosis|diffusion|active transport)/i;
      if (processTerms.test(answer)) {
        const hasExplanation = answer.length > 30 && /because|due to|as a result|therefore/i.test(answer);
        if (!hasExplanation && answer.length < 20) {
          return {
            severity: 'info',
            message: 'Biological process mentioned - may require explanation',
            field: 'answer',
            code: 'BIOLOGY_PROCESS_EXPLANATION'
          };
        }
      }
      return null;
    },
    (answer: string): ValidationIssue | null => {
      const diagramTerms = /(label|draw|sketch|diagram|structure)/i;
      if (diagramTerms.test(answer) && answer.length < 50) {
        return {
          severity: 'info',
          message: 'Diagram-related answer - verify if figure/drawing is required',
          field: 'answer',
          code: 'BIOLOGY_DIAGRAM_REQUIRED'
        };
      }
      return null;
    }
  ]
};

export const MathematicsRules: SubjectSpecificRules = {
  requiresUnits: false,
  allowsApproximations: true,
  requiresSignificantFigures: true,
  allowsEquivalentPhrasing: false,
  customValidations: [
    (answer: string): ValidationIssue | null => {
      const hasFraction = /\d+\/\d+/g.test(answer);
      const hasDecimal = /\d+\.\d+/g.test(answer);

      if (hasFraction && hasDecimal) {
        return {
          severity: 'info',
          message: 'Answer contains both fraction and decimal - verify required format',
          field: 'answer',
          code: 'MATH_MIXED_FORMATS'
        };
      }
      return null;
    },
    (answer: string): ValidationIssue | null => {
      const hasProof = /prove|show that|demonstrate|verify/i.test(answer);
      const hasQED = /QED|thus proved|hence proved|therefore|∴/i.test(answer);

      if (hasProof && !hasQED && answer.length > 50) {
        return {
          severity: 'info',
          message: 'Proof answer - should conclude with "hence proved" or QED',
          field: 'answer',
          code: 'MATH_PROOF_CONCLUSION'
        };
      }
      return null;
    },
    (answer: string): ValidationIssue | null => {
      const hasEquation = /[xy]\s*=|f\(x\)\s*=/i.test(answer);
      const hasDomainRange = /domain|range|x\s*[∈><=]/i.test(answer);

      if (hasEquation && !hasDomainRange && /function|solve/i.test(answer)) {
        return {
          severity: 'info',
          message: 'Function equation - may need domain/range specification',
          field: 'answer',
          code: 'MATH_DOMAIN_RANGE'
        };
      }
      return null;
    },
    (answer: string): ValidationIssue | null => {
      const mathSymbols = /[∫∑∏√∞±≤≥≠≈∝]/g;
      const hasSymbols = mathSymbols.test(answer);

      if (!hasSymbols && /(integral|sum|product|square root|infinity)/i.test(answer)) {
        return {
          severity: 'info',
          message: 'Mathematical operation described in words - consider using symbols',
          field: 'answer',
          code: 'MATH_SYMBOL_USAGE'
        };
      }
      return null;
    }
  ]
};

export function getSubjectRules(subject: string): SubjectSpecificRules | undefined {
  const normalizedSubject = subject.toLowerCase();

  if (normalizedSubject.includes('physics')) {
    return PhysicsRules;
  }

  if (normalizedSubject.includes('chemistry')) {
    return ChemistryRules;
  }

  if (normalizedSubject.includes('biology')) {
    return BiologyRules;
  }

  if (normalizedSubject.includes('math')) {
    return MathematicsRules;
  }

  return undefined;
}

export function validateAnswerForSubject(
  answer: string,
  subject: string,
  context?: string
): {
  isValid: boolean;
  issues: ValidationIssue[];
  subjectRules: SubjectSpecificRules | undefined;
} {
  const subjectRules = getSubjectRules(subject);

  if (!subjectRules) {
    return {
      isValid: true,
      issues: [],
      subjectRules: undefined
    };
  }

  const issues: ValidationIssue[] = [];

  if (subjectRules.customValidations) {
    subjectRules.customValidations.forEach(validator => {
      const issue = validator(answer);
      if (issue) {
        issues.push(issue);
      }
    });
  }

  const hasErrors = issues.some(issue => issue.severity === 'error');

  return {
    isValid: !hasErrors,
    issues,
    subjectRules
  };
}

export const AllSubjectRules = {
  physics: PhysicsRules,
  chemistry: ChemistryRules,
  biology: BiologyRules,
  mathematics: MathematicsRules
};
