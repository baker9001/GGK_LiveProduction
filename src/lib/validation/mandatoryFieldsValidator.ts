/**
 * Mandatory Answer Fields Validator
 * Enforces Answer Structure Requirements Guide v1.0 compliance
 *
 * According to the guide, every part/subpart with answers MUST have:
 * 1. answer_format
 * 2. answer_requirement
 * 3. alternative_type
 */

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  location?: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
  location?: string;
}

/**
 * Validate that all three mandatory fields are present for answer-containing sections
 */
export function validateMandatoryAnswerFields(
  section: {
    answer_format?: string | null;
    answer_requirement?: string | null;
    alternative_type?: string | null;
    correct_answers?: any[];
    type?: string;
  },
  location: string = 'question'
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Check if this section has answers
  const hasAnswers = section.correct_answers && section.correct_answers.length > 0;

  // If no answers, these fields are optional
  if (!hasAnswers) {
    return { isValid: true, errors, warnings };
  }

  // MCQ and TF questions don't require these fields
  if (section.type === 'mcq' || section.type === 'tf') {
    return { isValid: true, errors, warnings };
  }

  // Validate answer_format
  if (!section.answer_format || section.answer_format.trim() === '') {
    errors.push({
      field: 'answer_format',
      message: `Missing required field 'answer_format' in ${location}`,
      code: 'MISSING_ANSWER_FORMAT',
      location
    });
  }

  // Validate answer_requirement
  if (!section.answer_requirement || section.answer_requirement.trim() === '') {
    errors.push({
      field: 'answer_requirement',
      message: `Missing required field 'answer_requirement' in ${location}`,
      code: 'MISSING_ANSWER_REQUIREMENT',
      location
    });
  }

  // Validate alternative_type
  if (!section.alternative_type || section.alternative_type.trim() === '') {
    errors.push({
      field: 'alternative_type',
      message: `Missing required field 'alternative_type' in ${location}`,
      code: 'MISSING_ALTERNATIVE_TYPE',
      location
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate an entire question with parts and subparts
 */
export function validateQuestionCompleteMandatoryFields(question: {
  type: string;
  answer_format?: string | null;
  answer_requirement?: string | null;
  alternative_type?: string | null;
  correct_answers?: any[];
  parts?: Array<{
    part: string;
    answer_format?: string | null;
    answer_requirement?: string | null;
    alternative_type?: string | null;
    correct_answers?: any[];
    subparts?: Array<{
      subpart: string;
      answer_format?: string | null;
      answer_requirement?: string | null;
      alternative_type?: string | null;
      correct_answers?: any[];
    }>;
  }>;
}): ValidationResult {
  const allErrors: ValidationError[] = [];
  const allWarnings: ValidationWarning[] = [];

  // Validate main question level
  const mainValidation = validateMandatoryAnswerFields(question, 'main question');
  allErrors.push(...mainValidation.errors);
  allWarnings.push(...mainValidation.warnings);

  // Validate parts
  if (question.parts) {
    question.parts.forEach((part, index) => {
      const partValidation = validateMandatoryAnswerFields(
        part,
        `part ${part.part || String.fromCharCode(97 + index)}`
      );
      allErrors.push(...partValidation.errors);
      allWarnings.push(...partValidation.warnings);

      // Validate subparts
      if (part.subparts) {
        part.subparts.forEach((subpart, subIndex) => {
          const subpartValidation = validateMandatoryAnswerFields(
            subpart,
            `part ${part.part || String.fromCharCode(97 + index)}, subpart ${subpart.subpart || `(${subIndex + 1})`}`
          );
          allErrors.push(...subpartValidation.errors);
          allWarnings.push(...subpartValidation.warnings);
        });
      }
    });
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings
  };
}

/**
 * Generate a compliance report for a question
 */
export function generateComplianceReport(question: any): {
  isCompliant: boolean;
  score: number;
  totalChecks: number;
  passedChecks: number;
  details: string[];
} {
  const validation = validateQuestionCompleteMandatoryFields(question);
  const totalChecks = validation.errors.length + validation.warnings.length +
    (validation.isValid ? 1 : 0);
  const passedChecks = validation.isValid ? totalChecks : totalChecks - validation.errors.length;
  const score = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 100;

  const details: string[] = [];

  if (validation.isValid) {
    details.push('✓ All mandatory fields present');
  } else {
    details.push(`✗ ${validation.errors.length} mandatory field(s) missing`);
    validation.errors.forEach(error => {
      details.push(`  - ${error.message}`);
    });
  }

  if (validation.warnings.length > 0) {
    details.push(`⚠ ${validation.warnings.length} warning(s)`);
    validation.warnings.forEach(warning => {
      details.push(`  - ${warning.message}`);
    });
  }

  return {
    isCompliant: validation.isValid,
    score,
    totalChecks,
    passedChecks,
    details
  };
}

/**
 * Check naming consistency (guide names vs legacy names)
 */
export function checkNamingConsistency(value: string, type: 'format' | 'requirement'): {
  isLegacy: boolean;
  modernEquivalent?: string;
  suggestion?: string;
} {
  const legacyMapping: Record<string, { modern: string; suggestion: string }> = {
    // Requirement mappings
    'single_choice': {
      modern: 'single_answer',
      suggestion: 'Consider using "single_answer" instead of "single_choice" for consistency with the guide'
    },
    'any_one_from': {
      modern: 'any_one',
      suggestion: 'Consider using "any_one" instead of "any_one_from" for consistency with the guide'
    },
    'any_2_from': {
      modern: 'any_two',
      suggestion: 'Consider using "any_two" instead of "any_2_from" for consistency with the guide'
    },
    'any_3_from': {
      modern: 'any_three',
      suggestion: 'Consider using "any_three" instead of "any_3_from" for consistency with the guide'
    }
  };

  const mapping = legacyMapping[value];
  if (mapping) {
    return {
      isLegacy: true,
      modernEquivalent: mapping.modern,
      suggestion: mapping.suggestion
    };
  }

  return {
    isLegacy: false
  };
}
