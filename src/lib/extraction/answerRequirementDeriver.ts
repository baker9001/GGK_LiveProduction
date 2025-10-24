/**
 * Answer Requirement Deriver Utility
 *
 * Automatically determines the appropriate answer requirement based on:
 * - Question type (mcq, tf, descriptive, calculation, diagram, essay)
 * - Answer format (single_word, two_items, multi_line, calculation, etc.)
 * - Number and structure of correct answers
 * - JSON extraction rules and patterns
 */

export type QuestionType = 'mcq' | 'tf' | 'descriptive' | 'calculation' | 'diagram' | 'essay' | 'complex';

export type AnswerFormat =
  | 'single_word'
  | 'single_line'
  | 'two_items'
  | 'two_items_connected'
  | 'multi_line'
  | 'multi_line_labeled'
  | 'calculation'
  | 'equation'
  | 'chemical_structure'
  | 'structural_diagram'
  | 'diagram'
  | 'table'
  | 'graph'
  | 'code'
  | 'audio'
  | 'file_upload';

export type AnswerRequirement =
  | 'single_choice'
  | 'both_required'
  | 'any_2_from'
  | 'any_3_from'
  | 'all_required'
  | 'alternative_methods';

interface CorrectAnswer {
  answer?: string;
  alternative_id?: number;
  linked_alternatives?: number[];
  alternative_type?: string;
  marks?: number;
  acceptable_variations?: string[];
}

interface DeriveAnswerRequirementParams {
  questionType?: QuestionType | string | null;
  answerFormat?: AnswerFormat | string | null;
  correctAnswers?: CorrectAnswer[] | null;
  totalAlternatives?: number | null;
  options?: Array<{ is_correct?: boolean }> | null;
}

interface AnswerRequirementResult {
  answerRequirement: AnswerRequirement | null;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

/**
 * Derives the appropriate answer requirement based on question data
 */
export function deriveAnswerRequirement(params: DeriveAnswerRequirementParams): AnswerRequirementResult {
  const {
    questionType,
    answerFormat,
    correctAnswers = [],
    totalAlternatives,
    options = []
  } = params;

  // Handle MCQ and True/False - always single choice
  if (questionType === 'mcq' || questionType === 'tf') {
    return {
      answerRequirement: 'single_choice',
      confidence: 'high',
      reason: `${questionType.toUpperCase()} questions require selecting one correct option`
    };
  }

  // Handle two_items formats - both required unless alternatives detected
  if (answerFormat === 'two_items' || answerFormat === 'two_items_connected') {
    const hasAlternatives = (correctAnswers?.length ?? 0) > 2 || (totalAlternatives ?? 0) > 1;

    if (hasAlternatives) {
      return {
        answerRequirement: 'any_2_from',
        confidence: 'high',
        reason: 'Two items format with multiple alternatives detected - any 2 correct answers acceptable'
      };
    }

    return {
      answerRequirement: 'both_required',
      confidence: 'high',
      reason: 'Two items format requires both components to be provided'
    };
  }

  // Analyze correct answers to determine requirement
  const answersCount = correctAnswers?.length ?? 0;

  if (answersCount === 0) {
    // No correct answers - use format-based defaults
    return deriveFromAnswerFormat(answerFormat);
  }

  // Check for alternative types and linked alternatives
  const hasLinkedAlternatives = correctAnswers?.some(ans =>
    ans.linked_alternatives && ans.linked_alternatives.length > 0
  ) ?? false;

  const hasAlternativeTypes = correctAnswers?.some(ans =>
    ans.alternative_type && ans.alternative_type !== 'standalone'
  ) ?? false;

  const uniqueAlternativeIds = new Set(
    correctAnswers?.map(ans => ans.alternative_id).filter(id => id != null) ?? []
  );

  const hasMultipleAlternatives = uniqueAlternativeIds.size > 1 || (totalAlternatives ?? 0) > 1;

  // Alternative methods detected (different solution approaches)
  if (hasAlternativeTypes || hasMultipleAlternatives) {
    const alternativeType = correctAnswers?.find(ans => ans.alternative_type)?.alternative_type;

    if (alternativeType === 'one_required' || alternativeType === 'any_from') {
      // Check how many alternatives
      const altCount = uniqueAlternativeIds.size || totalAlternatives || answersCount;

      if (altCount === 2) {
        return {
          answerRequirement: 'any_2_from',
          confidence: 'high',
          reason: 'Multiple alternative answers detected - any 2 acceptable'
        };
      } else if (altCount === 3) {
        return {
          answerRequirement: 'any_3_from',
          confidence: 'high',
          reason: 'Multiple alternative answers detected - any 3 acceptable'
        };
      }

      return {
        answerRequirement: 'alternative_methods',
        confidence: 'high',
        reason: 'Multiple alternative solution methods detected'
      };
    }

    if (alternativeType === 'all_required' || alternativeType === 'structure_function_pair') {
      return {
        answerRequirement: 'all_required',
        confidence: 'high',
        reason: 'All answer components must be provided together'
      };
    }

    return {
      answerRequirement: 'alternative_methods',
      confidence: 'medium',
      reason: 'Multiple alternative answers or solution methods detected'
    };
  }

  // Linked alternatives (e.g., both parts of a structure-function pair)
  if (hasLinkedAlternatives) {
    return {
      answerRequirement: 'all_required',
      confidence: 'high',
      reason: 'Linked answer components detected - all parts required'
    };
  }

  // Multiple answers without explicit alternative structure
  if (answersCount === 2) {
    // Check if it's a calculation/equation format that might have alternative methods
    if (answerFormat === 'calculation' || answerFormat === 'equation') {
      return {
        answerRequirement: 'alternative_methods',
        confidence: 'medium',
        reason: 'Calculation with multiple acceptable solution methods'
      };
    }

    return {
      answerRequirement: 'both_required',
      confidence: 'medium',
      reason: 'Two answer components detected - both likely required'
    };
  }

  if (answersCount === 3) {
    return {
      answerRequirement: 'any_3_from',
      confidence: 'medium',
      reason: 'Three answer components detected - typically any 3 acceptable'
    };
  }

  if (answersCount > 3) {
    return {
      answerRequirement: 'all_required',
      confidence: 'medium',
      reason: 'Multiple answer components detected - all typically required for full marks'
    };
  }

  // Single answer - use format-based inference
  if (answersCount === 1) {
    const singleAnswer = correctAnswers[0];

    // Check if single answer has variations (acceptable alternatives)
    if (singleAnswer?.acceptable_variations && singleAnswer.acceptable_variations.length > 0) {
      return {
        answerRequirement: 'alternative_methods',
        confidence: 'medium',
        reason: 'Single answer with acceptable variations detected'
      };
    }

    return {
      answerRequirement: 'single_choice',
      confidence: 'high',
      reason: 'Single correct answer expected'
    };
  }

  // Fallback to format-based derivation
  return deriveFromAnswerFormat(answerFormat);
}

/**
 * Derives answer requirement from answer format alone
 */
function deriveFromAnswerFormat(answerFormat?: string | null): AnswerRequirementResult {
  switch (answerFormat) {
    case 'single_word':
    case 'single_line':
      return {
        answerRequirement: 'single_choice',
        confidence: 'high',
        reason: 'Single-line answer format typically expects one answer'
      };

    case 'two_items':
    case 'two_items_connected':
      return {
        answerRequirement: 'both_required',
        confidence: 'medium',
        reason: 'Two items format typically requires both components'
      };

    case 'multi_line':
    case 'multi_line_labeled':
      return {
        answerRequirement: 'all_required',
        confidence: 'medium',
        reason: 'Multi-line format typically requires all components'
      };

    case 'calculation':
    case 'equation':
      return {
        answerRequirement: 'alternative_methods',
        confidence: 'low',
        reason: 'Calculations may accept different solution methods'
      };

    case 'diagram':
    case 'structural_diagram':
    case 'chemical_structure':
    case 'graph':
    case 'table':
      return {
        answerRequirement: 'all_required',
        confidence: 'low',
        reason: 'Visual answers typically require all components to be marked'
      };

    case 'file_upload':
    case 'audio':
      return {
        answerRequirement: null,
        confidence: 'low',
        reason: 'Upload-based answers require manual marking - no automated requirement'
      };

    default:
      return {
        answerRequirement: null,
        confidence: 'low',
        reason: 'Unable to determine answer requirement automatically - manual review needed'
      };
  }
}

/**
 * Gets a human-readable explanation for the answer requirement
 */
export function getAnswerRequirementExplanation(requirement: AnswerRequirement | string | null): string {
  switch (requirement) {
    case 'single_choice':
      return 'Student must provide exactly one correct answer';

    case 'both_required':
      return 'Student must provide both required components';

    case 'any_2_from':
      return 'Student must provide any 2 correct answers from the available options';

    case 'any_3_from':
      return 'Student must provide any 3 correct answers from the available options';

    case 'all_required':
      return 'Student must provide all required answer components for full marks';

    case 'alternative_methods':
      return 'Multiple valid solution methods are acceptable - student must complete one valid approach';

    default:
      return 'Answer requirement not specified - requires manual review';
  }
}

/**
 * Validates if the answer requirement matches the correct answers structure
 */
export function validateAnswerRequirement(
  requirement: AnswerRequirement | string | null,
  correctAnswers?: CorrectAnswer[] | null
): { isValid: boolean; warning?: string } {
  if (!requirement || !correctAnswers || correctAnswers.length === 0) {
    return { isValid: true };
  }

  const answersCount = correctAnswers.length;

  switch (requirement) {
    case 'single_choice':
      if (answersCount > 1) {
        return {
          isValid: false,
          warning: `"Single choice" selected but ${answersCount} correct answers provided. Consider "alternative_methods" or "any_2_from".`
        };
      }
      break;

    case 'both_required':
      if (answersCount !== 2) {
        return {
          isValid: false,
          warning: `"Both required" selected but ${answersCount} answers provided. Expected exactly 2 answers.`
        };
      }
      break;

    case 'any_2_from':
      if (answersCount < 2) {
        return {
          isValid: false,
          warning: `"Any 2 from" selected but only ${answersCount} answer(s) provided. Need at least 2 alternatives.`
        };
      }
      break;

    case 'any_3_from':
      if (answersCount < 3) {
        return {
          isValid: false,
          warning: `"Any 3 from" selected but only ${answersCount} answer(s) provided. Need at least 3 alternatives.`
        };
      }
      break;

    case 'all_required':
      if (answersCount === 1) {
        return {
          isValid: false,
          warning: `"All required" selected but only 1 answer provided. Consider "single_choice" instead.`
        };
      }
      break;
  }

  return { isValid: true };
}
