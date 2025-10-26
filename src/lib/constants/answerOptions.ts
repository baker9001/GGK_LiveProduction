// src/lib/constants/answerOptions.ts

import { deriveAnswerRequirement as sophisticatedDeriver } from '../extraction/answerRequirementDeriver';

/**
 * Centralized configuration for Answer Format and Answer Requirement options
 * Used across Papers Setup (import) and Questions Setup (QA) stages
 */

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

// Answer Format Options
export const ANSWER_FORMAT_OPTIONS: SelectOption[] = [
  {
    value: 'single_word',
    label: 'Single Word',
    description: 'One-word answer (e.g., "Mitosis", "Carbon")'
  },
  {
    value: 'single_line',
    label: 'Single Line',
    description: 'Short phrase or sentence (e.g., "Photosynthesis occurs in chloroplasts")'
  },
  {
    value: 'two_items',
    label: 'Two Items',
    description: 'Two separate items (e.g., listing two causes)'
  },
  {
    value: 'two_items_connected',
    label: 'Two Connected Items',
    description: 'Two items with a relationship (e.g., "cause and effect")'
  },
  {
    value: 'multi_line',
    label: 'Multiple Lines',
    description: 'Multiple points or paragraphs'
  },
  {
    value: 'multi_line_labeled',
    label: 'Multiple Labeled Lines',
    description: 'Multiple points with labels (e.g., "(a) ..., (b) ..., (c) ...")'
  },
  {
    value: 'calculation',
    label: 'Calculation',
    description: 'Mathematical calculation with working steps'
  },
  {
    value: 'equation',
    label: 'Equation',
    description: 'Mathematical or chemical equation'
  },
  {
    value: 'chemical_structure',
    label: 'Chemical Structure',
    description: 'Chemical structure diagram or formula'
  },
  {
    value: 'structural_diagram',
    label: 'Structural Diagram',
    description: 'Labeled diagram (e.g., biological structure, apparatus)'
  },
  {
    value: 'diagram',
    label: 'Diagram',
    description: 'General diagram or drawing'
  },
  {
    value: 'table',
    label: 'Table',
    description: 'Data presented in table format'
  },
  {
    value: 'table_completion',
    label: 'Table Completion',
    description: 'Fill in missing cells in a provided table'
  },
  {
    value: 'graph',
    label: 'Graph',
    description: 'Graph or chart'
  },
  {
    value: 'code',
    label: 'Code',
    description: 'Programming code snippet'
  },
  {
    value: 'audio',
    label: 'Audio',
    description: 'Audio recording response'
  },
  {
    value: 'file_upload',
    label: 'File Upload',
    description: 'File attachment required'
  },
  {
    value: 'not_applicable',
    label: 'Not Applicable',
    description: 'No specific format required (e.g., MCQ)'
  }
];

// Answer Requirement Options
export const ANSWER_REQUIREMENT_OPTIONS: SelectOption[] = [
  {
    value: 'single_choice',
    label: 'Single Choice',
    description: 'Only one correct answer (typical for MCQ)'
  },
  {
    value: 'both_required',
    label: 'Both Required',
    description: 'Both items/parts must be correct'
  },
  {
    value: 'any_one_from',
    label: 'Any One From',
    description: 'Any one correct answer from alternatives'
  },
  {
    value: 'any_2_from',
    label: 'Any 2 From',
    description: 'Any two correct answers from alternatives'
  },
  {
    value: 'any_3_from',
    label: 'Any 3 From',
    description: 'Any three correct answers from alternatives'
  },
  {
    value: 'all_required',
    label: 'All Required',
    description: 'All specified items must be correct'
  },
  {
    value: 'alternative_methods',
    label: 'Alternative Methods',
    description: 'Different valid approaches/methods accepted'
  },
  {
    value: 'acceptable_variations',
    label: 'Acceptable Variations',
    description: 'Different phrasings/variations accepted'
  },
  {
    value: 'not_applicable',
    label: 'Not Applicable',
    description: 'No specific requirement'
  }
];

// Helper function to get label from value
export function getAnswerFormatLabel(value: string | null | undefined): string {
  if (!value) return 'Not set';
  const option = ANSWER_FORMAT_OPTIONS.find(opt => opt.value === value);
  return option?.label || value;
}

export function getAnswerRequirementLabel(value: string | null | undefined): string {
  if (!value) return 'Not set';
  const option = ANSWER_REQUIREMENT_OPTIONS.find(opt => opt.value === value);
  return option?.label || value;
}

// Auto-populate logic based on question characteristics
export function deriveAnswerFormat(question: {
  type: string;
  question_description?: string;
  correct_answers?: any[];
  has_direct_answer?: boolean;
  is_contextual_only?: boolean;
}): string | null {
  const { type, question_description = '', correct_answers = [], has_direct_answer, is_contextual_only } = question;
  const desc = question_description.toLowerCase();

  // CRITICAL SAFEGUARD: If there are valid correct_answers, NEVER return 'not_applicable'
  const validAnswers = correct_answers.filter(ans =>
    ans && (ans.answer || ans.text) && String(ans.answer || ans.text).trim().length > 0
  );
  const hasValidAnswers = validAnswers.length > 0;

  // Contextual-only questions should be marked as 'not_applicable'
  // BUT only if they truly have no answers
  if ((is_contextual_only === true || has_direct_answer === false) && !hasValidAnswers) {
    return 'not_applicable';
  }

  // If we have valid answers but flags say no answer, the flags are wrong - ignore them
  if (hasValidAnswers && (is_contextual_only === true || has_direct_answer === false)) {
    console.warn('Answer format derivation: has_direct_answer/is_contextual_only flags conflict with correct_answers data - prioritizing data');
  }

  // MCQ/TF questions don't need a specific format - return null to prevent auto-fill
  if (type === 'mcq' || type === 'tf') {
    return null;
  }

  // Complex questions: Check if they have direct answers
  // If not, they're contextual containers for parts - mark as not_applicable
  if (type === 'complex') {
    // Complex questions with no correct answers are contextual only
    if (!hasValidAnswers) {
      return 'not_applicable';
    }
    // If complex question has correct answers, derive format based on content
    // (fall through to content-based detection below)
  }

  // Check for calculation keywords
  if (desc.includes('calculate') || desc.includes('compute') || desc.includes('work out')) {
    return 'calculation';
  }

  // Check for equation keywords
  if (desc.includes('equation') || desc.includes('formula')) {
    return 'equation';
  }

  // Check for diagram keywords
  if (desc.includes('draw') || desc.includes('sketch') || desc.includes('diagram')) {
    if (desc.includes('label')) {
      return 'structural_diagram';
    }
    return 'diagram';
  }

  // Check for table keywords
  if (desc.includes('table') || desc.includes('complete the table')) {
    return 'table_completion';
  }

  // Check for graph keywords
  if (desc.includes('graph') || desc.includes('plot')) {
    return 'graph';
  }

  // Check for chemical structure
  if (desc.includes('structure of') && (desc.includes('compound') || desc.includes('molecule'))) {
    return 'chemical_structure';
  }

  // Based on number of correct answers
  if (correct_answers.length === 0) {
    return null; // Cannot determine
  } else if (correct_answers.length === 1) {
    const answerText = correct_answers[0]?.answer || '';
    if (answerText.split(' ').length === 1) {
      return 'single_word';
    } else if (answerText.split('\n').length === 1) {
      return 'single_line';
    }
    return 'multi_line';
  } else if (correct_answers.length === 2) {
    return 'two_items';
  } else {
    return 'multi_line_labeled';
  }
}

/**
 * Derive answer requirement using sophisticated logic from answerRequirementDeriver
 * This is a wrapper that maintains backward compatibility while using the more advanced deriver
 */
export function deriveAnswerRequirement(question: {
  type: string;
  correct_answers?: any[];
  total_alternatives?: number;
  has_direct_answer?: boolean;
  is_contextual_only?: boolean;
  answer_format?: string;
  question_description?: string;
}): string | null {
  // CRITICAL SAFEGUARD: Check if we have valid correct_answers
  const validAnswers = (question.correct_answers || []).filter(ans =>
    ans && (ans.answer || ans.text) && String(ans.answer || ans.text).trim().length > 0
  );
  const hasValidAnswers = validAnswers.length > 0;

  // If we have valid answers but flags say no answer, override the flags
  let hasDirectAnswer = question.has_direct_answer;
  let isContextualOnly = question.is_contextual_only;

  if (hasValidAnswers) {
    if (isContextualOnly === true || hasDirectAnswer === false) {
      console.warn('Answer requirement derivation: has_direct_answer/is_contextual_only flags conflict with correct_answers data - prioritizing data');
      hasDirectAnswer = true;
      isContextualOnly = false;
    }
  }

  // CRITICAL FIX: Derive answer_format if not provided, so we can pass it to the sophisticated deriver
  let answerFormat = question.answer_format;
  if (!answerFormat) {
    answerFormat = deriveAnswerFormat({
      type: question.type,
      question_description: question.question_description,
      correct_answers: question.correct_answers,
      has_direct_answer: hasDirectAnswer,
      is_contextual_only: isContextualOnly
    }) || undefined;
  }

  const result = sophisticatedDeriver({
    questionType: question.type,
    answerFormat: answerFormat,
    correctAnswers: validAnswers,
    totalAlternatives: question.total_alternatives,
    options: undefined,
    isContextualOnly: isContextualOnly,
    hasDirectAnswer: hasDirectAnswer
  });

  // FINAL SAFEGUARD: Never return 'not_applicable' if we have valid answers
  if (result.answerRequirement === 'not_applicable' && hasValidAnswers) {
    console.warn('Answer requirement derivation returned not_applicable despite having valid answers - defaulting to all_required');
    return 'all_required';
  }

  return result.answerRequirement;
}
