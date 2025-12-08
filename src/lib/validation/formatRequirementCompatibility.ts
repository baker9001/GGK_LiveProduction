/**
 * Answer Format and Answer Requirement Compatibility Validation
 *
 * This module provides validation and compatibility checking between
 * answer formats and answer requirements to help administrators set up
 * questions correctly according to IGCSE standards.
 */

import { AnswerFormat, AnswerRequirement } from '@/types/questions';

export type CompatibilityLevel = 'compatible' | 'suboptimal' | 'incompatible';

export interface CompatibilityResult {
  level: CompatibilityLevel;
  message?: string;
  recommendation?: string;
  icon?: string;
}

/**
 * Compatibility matrix defining which format-requirement pairs work well together
 */
const COMPATIBILITY_MATRIX: Record<string, {
  compatible: string[];
  suboptimal: string[];
  incompatible: string[];
}> = {
  single_word: {
    compatible: ['single_choice', 'any_one_from', 'acceptable_variations', 'not_applicable'],
    suboptimal: ['alternative_methods'],
    incompatible: ['both_required', 'any_2_from', 'any_3_from', 'all_required']
  },
  single_line: {
    compatible: ['single_choice', 'any_one_from', 'acceptable_variations', 'alternative_methods', 'not_applicable'],
    suboptimal: ['both_required'],
    incompatible: ['any_2_from', 'any_3_from', 'all_required']
  },
  two_items: {
    compatible: ['both_required', 'any_2_from', 'all_required'],
    suboptimal: ['acceptable_variations'],
    incompatible: ['single_choice', 'any_one_from', 'not_applicable']
  },
  two_items_connected: {
    compatible: ['both_required'],
    suboptimal: ['all_required', 'acceptable_variations'],
    incompatible: ['single_choice', 'any_one_from', 'any_2_from', 'any_3_from', 'alternative_methods', 'not_applicable']
  },
  multi_line: {
    compatible: ['any_one_from', 'any_2_from', 'any_3_from', 'all_required', 'alternative_methods', 'acceptable_variations'],
    suboptimal: ['both_required'],
    incompatible: ['single_choice', 'not_applicable']
  },
  multi_line_labeled: {
    compatible: ['all_required', 'any_2_from', 'any_3_from'],
    suboptimal: ['any_one_from', 'acceptable_variations'],
    incompatible: ['single_choice', 'both_required', 'alternative_methods', 'not_applicable']
  },
  calculation: {
    compatible: ['single_choice', 'alternative_methods', 'acceptable_variations'],
    suboptimal: ['any_one_from'],
    incompatible: ['both_required', 'any_2_from', 'any_3_from', 'all_required', 'not_applicable']
  },
  equation: {
    compatible: ['single_choice', 'alternative_methods', 'acceptable_variations'],
    suboptimal: ['any_one_from'],
    incompatible: ['both_required', 'any_2_from', 'any_3_from', 'all_required', 'not_applicable']
  },
  chemical_structure: {
    compatible: ['single_choice', 'acceptable_variations'],
    suboptimal: ['alternative_methods'],
    incompatible: ['both_required', 'any_one_from', 'any_2_from', 'any_3_from', 'all_required', 'not_applicable']
  },
  structural_diagram: {
    compatible: ['not_applicable'],
    suboptimal: [],
    incompatible: ['single_choice', 'both_required', 'any_one_from', 'any_2_from', 'any_3_from', 'all_required', 'alternative_methods', 'acceptable_variations']
  },
  diagram: {
    compatible: ['not_applicable'],
    suboptimal: [],
    incompatible: ['single_choice', 'both_required', 'any_one_from', 'any_2_from', 'any_3_from', 'all_required', 'alternative_methods', 'acceptable_variations']
  },
  table: {
    compatible: ['all_required', 'not_applicable'],
    suboptimal: ['acceptable_variations'],
    incompatible: ['single_choice', 'both_required', 'any_one_from', 'any_2_from', 'any_3_from', 'alternative_methods']
  },
  table_completion: {
    compatible: ['all_required'],
    suboptimal: ['acceptable_variations'],
    incompatible: ['single_choice', 'both_required', 'any_one_from', 'any_2_from', 'any_3_from', 'alternative_methods', 'not_applicable']
  },
  graph: {
    compatible: ['not_applicable'],
    suboptimal: [],
    incompatible: ['single_choice', 'both_required', 'any_one_from', 'any_2_from', 'any_3_from', 'all_required', 'alternative_methods', 'acceptable_variations']
  },
  code: {
    compatible: ['single_choice', 'alternative_methods'],
    suboptimal: ['acceptable_variations'],
    incompatible: ['both_required', 'any_one_from', 'any_2_from', 'any_3_from', 'all_required', 'not_applicable']
  },
  audio: {
    compatible: ['not_applicable'],
    suboptimal: [],
    incompatible: ['single_choice', 'both_required', 'any_one_from', 'any_2_from', 'any_3_from', 'all_required', 'alternative_methods', 'acceptable_variations']
  },
  file_upload: {
    compatible: ['not_applicable'],
    suboptimal: [],
    incompatible: ['single_choice', 'both_required', 'any_one_from', 'any_2_from', 'any_3_from', 'all_required', 'alternative_methods', 'acceptable_variations']
  },
  not_applicable: {
    compatible: ['not_applicable'],
    suboptimal: [],
    incompatible: ['single_choice', 'both_required', 'any_one_from', 'any_2_from', 'any_3_from', 'all_required', 'alternative_methods', 'acceptable_variations']
  }
};

/**
 * Detailed messages explaining compatibility issues
 */
const COMPATIBILITY_MESSAGES: Record<string, Record<string, string>> = {
  single_word: {
    both_required: 'Single word format cannot have "both required" - it\'s just one word!',
    any_2_from: 'Single word format should use "Any One From" instead of "Any 2 From"',
    any_3_from: 'Single word format should use "Any One From" instead of "Any 3 From"',
    all_required: 'Single word format cannot require all answers - use Multi Line format instead'
  },
  two_items_connected: {
    single_choice: 'Two connected items require "Both Required" - they work together!',
    any_one_from: 'Two connected items should use "Both Required" since they form a relationship',
    any_2_from: 'Use "Both Required" instead - these items are connected, not alternatives',
    any_3_from: 'Use "Both Required" instead - these items are connected, not alternatives',
    alternative_methods: 'Connected items are not alternative methods - use "Both Required"'
  },
  multi_line_labeled: {
    single_choice: 'Multiple labeled lines cannot have single choice - use "All Required" or "Any X From"',
    both_required: 'Use "All Required" instead for multiple labeled lines (more than 2 items)'
  },
  calculation: {
    any_2_from: 'Calculations typically have one answer - consider "Alternative Methods" instead',
    all_required: 'Calculations should use "Single Choice" or "Alternative Methods"'
  },
  structural_diagram: {
    default: 'Diagram questions require manual marking - set requirement to "Not Applicable"'
  },
  diagram: {
    default: 'Diagram questions require manual marking - set requirement to "Not Applicable"'
  },
  graph: {
    default: 'Graph questions require manual marking - set requirement to "Not Applicable"'
  },
  audio: {
    default: 'Audio questions require manual marking - set requirement to "Not Applicable"'
  },
  file_upload: {
    default: 'File upload questions require manual marking - set requirement to "Not Applicable"'
  },
  not_applicable: {
    default: 'When format is "Not Applicable", requirement must also be "Not Applicable"'
  }
};

/**
 * Check compatibility between an answer format and answer requirement
 */
export function checkCompatibility(
  answerFormat: string | null | undefined,
  answerRequirement: string | null | undefined
): CompatibilityResult {
  // If either is not set, no compatibility check needed yet
  if (!answerFormat || !answerRequirement) {
    return { level: 'compatible' };
  }

  const formatKey = answerFormat.toLowerCase();
  const requirementKey = answerRequirement.toLowerCase();

  // Get compatibility rules for this format
  const rules = COMPATIBILITY_MATRIX[formatKey];

  if (!rules) {
    // Unknown format - no validation
    return { level: 'compatible' };
  }

  // Check compatibility level
  if (rules.compatible.includes(requirementKey)) {
    return {
      level: 'compatible',
      icon: '✓'
    };
  }

  if (rules.suboptimal.includes(requirementKey)) {
    const message = COMPATIBILITY_MESSAGES[formatKey]?.[requirementKey]
      || 'This combination may work but is not ideal for IGCSE standards.';

    return {
      level: 'suboptimal',
      message,
      recommendation: 'Consider using a more suitable requirement option.',
      icon: '⚠️'
    };
  }

  if (rules.incompatible.includes(requirementKey)) {
    const message = COMPATIBILITY_MESSAGES[formatKey]?.[requirementKey]
      || COMPATIBILITY_MESSAGES[formatKey]?.default
      || 'This format and requirement combination is not compatible.';

    // Suggest compatible alternatives
    const compatibleOptions = rules.compatible
      .map(opt => opt.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))
      .join(', ');

    return {
      level: 'incompatible',
      message,
      recommendation: `Compatible options: ${compatibleOptions}`,
      icon: '❌'
    };
  }

  // Default to compatible if not explicitly listed
  return { level: 'compatible', icon: '✓' };
}

/**
 * Get all compatible requirements for a given format
 */
export function getCompatibleRequirements(answerFormat: string | null | undefined): string[] {
  if (!answerFormat) return [];

  const formatKey = answerFormat.toLowerCase();
  const rules = COMPATIBILITY_MATRIX[formatKey];

  return rules ? [...rules.compatible, ...rules.suboptimal] : [];
}

/**
 * Get recommended requirement for a format
 */
export function getRecommendedRequirement(answerFormat: string | null | undefined): string | null {
  if (!answerFormat) return null;

  const formatKey = answerFormat.toLowerCase();
  const rules = COMPATIBILITY_MATRIX[formatKey];

  if (!rules || rules.compatible.length === 0) return null;

  // Return the first compatible option as the recommended one
  return rules.compatible[0];
}

/**
 * Validate a complete question setup
 */
export interface QuestionValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

export function validateQuestionSetup(question: {
  type: string;
  answer_format?: string | null;
  answer_requirement?: string | null;
  correct_answers?: any[];
}): QuestionValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // Skip validation for MCQ and True/False
  if (question.type === 'mcq' || question.type === 'tf') {
    return { isValid: true, errors, warnings, recommendations };
  }

  // Check if format and requirement are set
  if (!question.answer_format) {
    warnings.push('Answer format is not set - students may not know how to format their answer');
  }

  if (!question.answer_requirement) {
    warnings.push('Answer requirement is not set - marking may be ambiguous');
  }

  // Check compatibility if both are set
  if (question.answer_format && question.answer_requirement) {
    const compatibility = checkCompatibility(question.answer_format, question.answer_requirement);

    if (compatibility.level === 'incompatible') {
      errors.push(compatibility.message || 'Incompatible format and requirement combination');
      if (compatibility.recommendation) {
        recommendations.push(compatibility.recommendation);
      }
    } else if (compatibility.level === 'suboptimal') {
      warnings.push(compatibility.message || 'Suboptimal format and requirement combination');
      if (compatibility.recommendation) {
        recommendations.push(compatibility.recommendation);
      }
    }
  }

  // Check if correct answers are provided for non-N/A formats
  if (question.answer_format && question.answer_format !== 'not_applicable') {
    if (!question.correct_answers || question.correct_answers.length === 0) {
      errors.push('No correct answers provided - students cannot be marked automatically');
    }
  }

  // Validate answer count matches requirement
  if (question.answer_requirement && question.correct_answers) {
    const answerCount = question.correct_answers.length;

    switch (question.answer_requirement) {
      case 'both_required':
        if (answerCount !== 2) {
          warnings.push(`"Both Required" expects 2 answers, but ${answerCount} provided`);
        }
        break;
      case 'any_2_from':
        if (answerCount < 2) {
          errors.push(`"Any 2 From" requires at least 2 alternative answers`);
        }
        break;
      case 'any_3_from':
        if (answerCount < 3) {
          errors.push(`"Any 3 From" requires at least 3 alternative answers`);
        }
        break;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    recommendations
  };
}

/**
 * Get icon for answer format
 */
export function getFormatIcon(format: string | null | undefined): string {
  const iconMap: Record<string, string> = {
    single_word: '📝',
    single_line: '✍️',
    two_items: '🔢',
    two_items_connected: '🔗',
    multi_line: '📄',
    multi_line_labeled: '📋',
    calculation: '🧮',
    equation: '𝑥',
    chemical_structure: '⚗️',
    structural_diagram: '🔬',
    diagram: '🎨',
    table: '📊',
    table_completion: '📈',
    graph: '📉',
    code: '💻',
    audio: '🎤',
    file_upload: '📎',
    not_applicable: '∅'
  };

  return format ? iconMap[format.toLowerCase()] || '❓' : '❓';
}

/**
 * Get icon for answer requirement
 */
export function getRequirementIcon(requirement: string | null | undefined): string {
  const iconMap: Record<string, string> = {
    single_choice: '1️⃣',
    both_required: '2️⃣',
    any_one_from: '🎯',
    any_2_from: '🎲',
    any_3_from: '🎰',
    all_required: '✅',
    alternative_methods: '🔀',
    acceptable_variations: '🔄',
    not_applicable: '∅'
  };

  return requirement ? iconMap[requirement.toLowerCase()] || '❓' : '❓';
}
