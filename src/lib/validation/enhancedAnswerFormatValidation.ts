/**
 * Enhanced Answer Format Validation
 * Implements comprehensive validation rules from Answer Structure Requirements Guide v1.0
 */

import { AnswerFormat, AnswerRequirement, AlternativeType } from '@/types/questions';
import { validateMandatoryAnswerFields, ValidationResult } from './mandatoryFieldsValidator';
import { validateCombination } from '../constants/answerStructureMatrix';

/**
 * Validate that answer_format matches actual answer content
 */
export function validateAnswerFormatMatchesContent(
  format: AnswerFormat | string,
  answers: Array<{ answer: string }>,
  questionText: string
): ValidationResult {
  const errors: any[] = [];
  const warnings: any[] = [];

  if (!answers || answers.length === 0) {
    return { isValid: true, errors, warnings };
  }

  switch (format) {
    case 'single_word':
      answers.forEach((ans, index) => {
        const words = ans.answer.trim().split(/\s+/).filter(Boolean);
        if (words.length !== 1) {
          errors.push({
            field: 'answer_format',
            message: `Answer ${index + 1} has ${words.length} word(s) but format is 'single_word'`,
            code: 'FORMAT_CONTENT_MISMATCH'
          });
        }
      });
      break;

    case 'single_line':
      answers.forEach((ans, index) => {
        if (ans.answer.includes('\n')) {
          errors.push({
            field: 'answer_format',
            message: `Answer ${index + 1} contains line breaks but format is 'single_line'`,
            code: 'FORMAT_CONTENT_MISMATCH'
          });
        }
      });
      break;

    case 'numerical':
      answers.forEach((ans, index) => {
        if (!/^-?\d+\.?\d*$/.test(ans.answer.trim())) {
          warnings.push({
            field: 'answer_format',
            message: `Answer ${index + 1} may not be purely numerical but format is 'numerical'`,
            code: 'FORMAT_CONTENT_WARNING'
          });
        }
      });
      break;

    case 'calculation':
    case 'calculation_with_formula':
      // These should have numerical results or show working
      const hasCalculationKeywords = questionText.toLowerCase().includes('calculate') ||
        questionText.toLowerCase().includes('work out');
      if (!hasCalculationKeywords) {
        warnings.push({
          field: 'answer_format',
          message: 'Format is calculation but question text does not contain calculation keywords',
          code: 'FORMAT_QUESTION_MISMATCH'
        });
      }
      break;

    case 'sequence':
      // Should have multiple items in specific order
      if (answers.length < 2) {
        errors.push({
          field: 'answer_format',
          message: 'Format is sequence but fewer than 2 answers provided',
          code: 'INSUFFICIENT_ANSWERS_FOR_FORMAT'
        });
      }
      break;
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate that answer_requirement aligns with number of answers
 */
export function validateAnswerRequirementMatchesAnswers(
  requirement: AnswerRequirement | string,
  answers: Array<any>
): ValidationResult {
  const errors: any[] = [];
  const warnings: any[] = [];

  if (!answers || answers.length === 0) {
    return { isValid: true, errors, warnings };
  }

  // Map legacy names to modern names
  const normalizedRequirement = normalizeRequirementName(requirement);

  switch (normalizedRequirement) {
    case 'single_answer':
      if (answers.length > 1) {
        warnings.push({
          field: 'answer_requirement',
          message: `Requirement is 'single_answer' but ${answers.length} answers provided`,
          code: 'REQUIREMENT_COUNT_MISMATCH'
        });
      }
      break;

    case 'any_one':
      if (answers.length < 2) {
        errors.push({
          field: 'answer_requirement',
          message: `Requirement is 'any_one' but only ${answers.length} answer(s) provided. Need at least 2 alternatives.`,
          code: 'INSUFFICIENT_ALTERNATIVES'
        });
      }
      break;

    case 'any_two':
      if (answers.length < 2) {
        errors.push({
          field: 'answer_requirement',
          message: `Requirement is 'any_two' but only ${answers.length} answer(s) provided`,
          code: 'INSUFFICIENT_ALTERNATIVES'
        });
      }
      break;

    case 'any_three':
      if (answers.length < 3) {
        errors.push({
          field: 'answer_requirement',
          message: `Requirement is 'any_three' but only ${answers.length} answer(s) provided`,
          code: 'INSUFFICIENT_ALTERNATIVES'
        });
      }
      break;

    case 'both_required':
    case 'both_points':
      if (answers.length !== 2) {
        errors.push({
          field: 'answer_requirement',
          message: `Requirement is '${normalizedRequirement}' but ${answers.length} answers provided (expected 2)`,
          code: 'REQUIREMENT_COUNT_MISMATCH'
        });
      }
      break;

    case 'method_and_result':
      if (answers.length !== 2) {
        errors.push({
          field: 'answer_requirement',
          message: `Requirement is 'method_and_result' but ${answers.length} answers provided (expected 2: method and result)`,
          code: 'REQUIREMENT_COUNT_MISMATCH'
        });
      }
      break;

    case 'all_five_points':
      if (answers.length !== 5) {
        errors.push({
          field: 'answer_requirement',
          message: `Requirement is 'all_five_points' but ${answers.length} answers provided (expected 5)`,
          code: 'REQUIREMENT_COUNT_MISMATCH'
        });
      }
      break;
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate part-level and answer-level alternative_type consistency
 */
export function validateAlternativeTypeConsistency(
  partAlternativeType: AlternativeType | string | undefined,
  answers: Array<{ alternative_type?: string; linked_alternatives?: number[] }>
): ValidationResult {
  const errors: any[] = [];
  const warnings: any[] = [];

  if (!answers || answers.length === 0) {
    return { isValid: true, errors, warnings };
  }

  const answerAlternativeTypes = answers.map(a => a.alternative_type).filter(Boolean);

  // Check if there's a mismatch between part-level and answer-level alternative types
  if (partAlternativeType && answerAlternativeTypes.length > 0) {
    const uniqueAnswerTypes = [...new Set(answerAlternativeTypes)];

    if (uniqueAnswerTypes.length > 1) {
      warnings.push({
        field: 'alternative_type',
        message: `Answers have inconsistent alternative_type values: ${uniqueAnswerTypes.join(', ')}`,
        code: 'INCONSISTENT_ANSWER_ALTERNATIVE_TYPES'
      });
    }

    // Check if answer-level type conflicts with part-level type
    if (uniqueAnswerTypes.length === 1 && uniqueAnswerTypes[0] !== partAlternativeType) {
      warnings.push({
        field: 'alternative_type',
        message: `Part alternative_type is '${partAlternativeType}' but answers have '${uniqueAnswerTypes[0]}'`,
        code: 'ALTERNATIVE_TYPE_CONFLICT'
      });
    }
  }

  // Validate linked_alternatives usage
  answers.forEach((answer, index) => {
    if (answer.alternative_type === 'one_required' && (!answer.linked_alternatives || answer.linked_alternatives.length === 0)) {
      warnings.push({
        field: 'linked_alternatives',
        message: `Answer ${index + 1} has alternative_type='one_required' but no linked_alternatives specified`,
        code: 'MISSING_LINKED_ALTERNATIVES'
      });
    }

    if (answer.alternative_type === 'all_required' && answer.linked_alternatives && answer.linked_alternatives.length > 0) {
      warnings.push({
        field: 'linked_alternatives',
        message: `Answer ${index + 1} has alternative_type='all_required' but has linked_alternatives (may not be needed)`,
        code: 'UNNECESSARY_LINKED_ALTERNATIVES'
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate proper usage of linked_alternatives vs acceptable_variations per guide rules
 */
export function validateAlternativesVsVariations(
  answers: Array<{
    answer: string;
    linked_alternatives?: number[];
    acceptable_variations?: string[];
    alternative_id?: number;
  }>
): ValidationResult {
  const errors: any[] = [];
  const warnings: any[] = [];

  answers.forEach((answer, index) => {
    // Check if acceptable_variations is being misused for distinct alternatives
    if (answer.acceptable_variations && answer.acceptable_variations.length > 0) {
      answer.acceptable_variations.forEach(variation => {
        // Check if variation is significantly different (not just notation)
        const similarity = calculateSimilarity(answer.answer, variation);
        if (similarity < 0.7) {
          warnings.push({
            field: 'acceptable_variations',
            message: `Answer ${index + 1}: '${variation}' seems like a distinct alternative, not a variation. Consider using linked_alternatives instead.`,
            code: 'MISUSED_ACCEPTABLE_VARIATIONS'
          });
        }
      });
    }

    // Check if linked_alternatives are actually similar (should be distinct per guide)
    if (answer.linked_alternatives && answer.linked_alternatives.length > 0) {
      const linkedAnswers = answers.filter(a => answer.linked_alternatives!.includes(a.alternative_id || 0));
      linkedAnswers.forEach(linkedAnswer => {
        const similarity = calculateSimilarity(answer.answer, linkedAnswer.answer);
        if (similarity > 0.8) {
          warnings.push({
            field: 'linked_alternatives',
            message: `Answer ${index + 1}: '${linkedAnswer.answer}' is very similar to '${answer.answer}'. Consider using acceptable_variations instead.`,
            code: 'MISUSED_LINKED_ALTERNATIVES'
          });
        }
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Helper: Normalize legacy requirement names to modern names
 */
function normalizeRequirementName(requirement: string): string {
  const mapping: Record<string, string> = {
    'single_choice': 'single_answer',
    'any_one_from': 'any_one',
    'any_2_from': 'any_two',
    'any_3_from': 'any_three'
  };
  return mapping[requirement] || requirement;
}

/**
 * Helper: Calculate text similarity (simple Jaccard similarity)
 */
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));

  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return union.size > 0 ? intersection.size / union.size : 0;
}

/**
 * Run comprehensive validation on a question/part/subpart
 */
export function runComprehensiveValidation(section: {
  answer_format?: string;
  answer_requirement?: string;
  alternative_type?: string;
  correct_answers?: any[];
  type?: string;
  question_text?: string;
}, location: string = 'section'): {
  isValid: boolean;
  errors: any[];
  warnings: any[];
  recommendations: string[];
} {
  const allErrors: any[] = [];
  const allWarnings: any[] = [];
  const recommendations: string[] = [];

  // 1. Validate mandatory fields
  const mandatoryValidation = validateMandatoryAnswerFields(section, location);
  allErrors.push(...mandatoryValidation.errors);
  allWarnings.push(...mandatoryValidation.warnings);

  if (section.answer_format && section.correct_answers) {
    // 2. Validate format matches content
    const formatValidation = validateAnswerFormatMatchesContent(
      section.answer_format,
      section.correct_answers,
      section.question_text || ''
    );
    allErrors.push(...formatValidation.errors);
    allWarnings.push(...formatValidation.warnings);
  }

  if (section.answer_requirement && section.correct_answers) {
    // 3. Validate requirement matches answers
    const requirementValidation = validateAnswerRequirementMatchesAnswers(
      section.answer_requirement,
      section.correct_answers
    );
    allErrors.push(...requirementValidation.errors);
    allWarnings.push(...requirementValidation.warnings);
  }

  if (section.correct_answers) {
    // 4. Validate alternative_type consistency
    const alternativeTypeValidation = validateAlternativeTypeConsistency(
      section.alternative_type,
      section.correct_answers
    );
    allErrors.push(...alternativeTypeValidation.errors);
    allWarnings.push(...alternativeTypeValidation.warnings);

    // 5. Validate linked_alternatives vs acceptable_variations usage
    const alternativesValidation = validateAlternativesVsVariations(section.correct_answers);
    allErrors.push(...alternativesValidation.errors);
    allWarnings.push(...alternativesValidation.warnings);
  }

  // 6. Check against Quick Reference Matrix
  if (section.answer_format && section.answer_requirement && section.alternative_type) {
    const matrixValidation = validateCombination(
      section.answer_format,
      section.answer_requirement,
      section.alternative_type
    );

    if (!matrixValidation.isRecommended) {
      recommendations.push(...matrixValidation.suggestions);
    }
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
    recommendations
  };
}
