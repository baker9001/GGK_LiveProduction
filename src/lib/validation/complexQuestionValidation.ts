/**
 * Complex Question Validation Logic
 * Handles validation for multi-part, nested questions with various answer formats
 */

import {
  ComplexQuestionDisplay,
  ComplexQuestionAnswer,
  ComplexQuestionValidationResult,
  ValidationError,
  ValidationWarning,
  QuestionCorrectAnswer,
  AlternativeType
} from '@/types/questions';

/**
 * Validate a complete complex question answer
 */
export function validateComplexQuestion(
  question: ComplexQuestionDisplay,
  answer: ComplexQuestionAnswer
): ComplexQuestionValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const partValidations: ComplexQuestionValidationResult['partValidations'] = [];

  // Validate each part
  question.parts?.forEach((part) => {
    const partAnswer = answer.parts?.find(p => p.part_id === part.id);
    const partValidation = validatePart(part, partAnswer);

    partValidations.push(partValidation);

    // Collect errors and warnings
    errors.push(...partValidation.errors);
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    partValidations
  };
}

/**
 * Validate a question part answer
 */
function validatePart(part: any, partAnswer: any) {
  const errors: ValidationError[] = [];
  const subpartValidations: any[] = [];

  // If part has subparts, validate each subpart
  if (part.subparts && part.subparts.length > 0) {
    part.subparts.forEach((subpart: any) => {
      const subpartAnswer = partAnswer?.subparts?.find((s: any) => s.subpart_id === subpart.id);
      const subpartValidation = validateSubpart(subpart, subpartAnswer);

      subpartValidations.push(subpartValidation);
      errors.push(...subpartValidation.errors);
    });
  } else {
    // Validate part answer directly
    const partErrors = validateAnswer(
      partAnswer?.answer,
      part.answer_format,
      part.answer_requirement,
      part.correct_answers,
      part.marks
    );
    errors.push(...partErrors);
  }

  return {
    part_id: part.id,
    part_label: part.part_label,
    isValid: errors.length === 0,
    errors,
    subpartValidations: subpartValidations.length > 0 ? subpartValidations : undefined
  };
}

/**
 * Validate a question subpart answer
 */
function validateSubpart(subpart: any, subpartAnswer: any) {
  const errors = validateAnswer(
    subpartAnswer?.answer,
    subpart.answer_format,
    subpart.answer_requirement,
    subpart.correct_answers,
    subpart.marks
  );

  return {
    subpart_id: subpart.id,
    subpart_label: subpart.subpart_label,
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate an individual answer based on format and requirements
 */
function validateAnswer(
  answer: any,
  answerFormat?: string,
  answerRequirement?: string,
  correctAnswers?: QuestionCorrectAnswer[],
  marks?: number
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check if answer is provided
  if (!answer || (typeof answer === 'string' && !answer.trim())) {
    errors.push({
      field: 'answer',
      message: 'Answer is required',
      code: 'REQUIRED'
    });
    return errors;
  }

  // Validate based on answer format
  if (answerFormat) {
    const formatErrors = validateAnswerFormat(answer, answerFormat);
    errors.push(...formatErrors);
  }

  // Validate against answer requirements
  if (answerRequirement && correctAnswers) {
    const requirementErrors = validateAnswerRequirement(answer, answerRequirement, correctAnswers);
    errors.push(...requirementErrors);
  }

  return errors;
}

/**
 * Validate answer format constraints
 */
function validateAnswerFormat(answer: any, format: string): ValidationError[] {
  const errors: ValidationError[] = [];

  switch (format) {
    case 'single_word': {
      if (typeof answer === 'string') {
        const words = answer.trim().split(/\s+/).filter(Boolean);
        if (words.length !== 1) {
          errors.push({
            field: 'answer',
            message: `Answer must be a single word (found ${words.length} words)`,
            code: 'INVALID_FORMAT'
          });
        }
      }
      break;
    }

    case 'single_line': {
      if (typeof answer === 'string' && answer.includes('\n')) {
        errors.push({
          field: 'answer',
          message: 'Answer must be a single line',
          code: 'INVALID_FORMAT'
        });
      }
      break;
    }

    case 'two_items':
    case 'two_items_connected': {
      if (typeof answer === 'object' && !Array.isArray(answer)) {
        if (!answer.item1 || !answer.item2) {
          errors.push({
            field: 'answer',
            message: 'Both items are required',
            code: 'INCOMPLETE_ANSWER'
          });
        }
      } else {
        errors.push({
          field: 'answer',
          message: 'Answer must contain two items',
          code: 'INVALID_FORMAT'
        });
      }
      break;
    }

    case 'calculation': {
      if (typeof answer === 'object' && !Array.isArray(answer)) {
        if (!answer.value) {
          errors.push({
            field: 'answer',
            message: 'Calculation result is required',
            code: 'INCOMPLETE_ANSWER'
          });
        }
        if (!answer.unit) {
          errors.push({
            field: 'answer',
            message: 'Unit is required for calculation answers',
            code: 'MISSING_UNIT'
          });
        }
      }
      break;
    }

    default:
      // No specific format validation
      break;
  }

  return errors;
}

/**
 * Validate answer against requirements (any_2_from, all_required, etc.)
 */
function validateAnswerRequirement(
  answer: any,
  requirement: string,
  correctAnswers: QuestionCorrectAnswer[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Parse requirement
  const match = requirement.match(/any_(\d+)_from/);
  if (match) {
    const requiredCount = parseInt(match[1]);

    // Check if answer is an array with correct count
    if (Array.isArray(answer)) {
      if (answer.length < requiredCount) {
        errors.push({
          field: 'answer',
          message: `At least ${requiredCount} answer(s) required (found ${answer.length})`,
          code: 'INSUFFICIENT_ANSWERS'
        });
      }
    } else if (typeof answer === 'string') {
      // Single answer provided when multiple required
      if (requiredCount > 1) {
        errors.push({
          field: 'answer',
          message: `${requiredCount} answers required (only 1 provided)`,
          code: 'INSUFFICIENT_ANSWERS'
        });
      }
    }
  }

  if (requirement === 'both_required') {
    if (typeof answer === 'object' && !Array.isArray(answer)) {
      if (!answer.item1 || !answer.item2) {
        errors.push({
          field: 'answer',
          message: 'Both answers are required',
          code: 'INCOMPLETE_ANSWER'
        });
      }
    } else if (Array.isArray(answer) && answer.length < 2) {
      errors.push({
        field: 'answer',
        message: 'Both answers are required',
        code: 'INSUFFICIENT_ANSWERS'
      });
    }
  }

  if (requirement === 'all_required') {
    const requiredCount = correctAnswers.filter(ca =>
      ca.alternative_type === 'all_required'
    ).length;

    if (Array.isArray(answer) && answer.length < requiredCount) {
      errors.push({
        field: 'answer',
        message: `All ${requiredCount} answers are required`,
        code: 'INSUFFICIENT_ANSWERS'
      });
    }
  }

  return errors;
}

/**
 * Check if student answer matches any correct answer
 */
export function checkAnswerCorrectness(
  studentAnswer: any,
  correctAnswers: QuestionCorrectAnswer[],
  answerFormat?: string
): {
  isCorrect: boolean;
  matchedAnswer?: QuestionCorrectAnswer;
  partialCredit?: number;
} {
  if (!correctAnswers || correctAnswers.length === 0) {
    return { isCorrect: false };
  }

  // Normalize student answer
  const normalizedStudentAnswer = normalizeAnswer(studentAnswer, answerFormat);

  // Check against each correct answer
  for (const correctAnswer of correctAnswers) {
    const normalizedCorrectAnswer = normalizeAnswer(correctAnswer.answer, answerFormat);

    if (compareAnswers(normalizedStudentAnswer, normalizedCorrectAnswer, correctAnswer)) {
      return {
        isCorrect: true,
        matchedAnswer: correctAnswer,
        partialCredit: correctAnswer.marks || 1
      };
    }
  }

  // Check for partial credit
  const partialCredit = checkPartialCredit(studentAnswer, correctAnswers, answerFormat);
  if (partialCredit > 0) {
    return {
      isCorrect: false,
      partialCredit
    };
  }

  return { isCorrect: false };
}

/**
 * Normalize answer for comparison
 */
function normalizeAnswer(answer: any, format?: string): string {
  if (typeof answer === 'string') {
    let normalized = answer.trim().toLowerCase();

    // Remove extra whitespace
    normalized = normalized.replace(/\s+/g, ' ');

    // Remove punctuation at the end
    normalized = normalized.replace(/[.,;:!?]+$/, '');

    return normalized;
  }

  if (typeof answer === 'object' && !Array.isArray(answer)) {
    // For calculation answers, normalize the value
    if (format === 'calculation' && answer.value) {
      return normalizeAnswer(answer.value, format);
    }

    // For two-item answers, concatenate
    if ((format === 'two_items' || format === 'two_items_connected') && answer.item1 && answer.item2) {
      return `${normalizeAnswer(answer.item1)} ${normalizeAnswer(answer.item2)}`;
    }
  }

  return String(answer).toLowerCase().trim();
}

/**
 * Compare two normalized answers
 */
function compareAnswers(
  studentAnswer: string,
  correctAnswer: string,
  correctAnswerObj: QuestionCorrectAnswer
): boolean {
  // Exact match
  if (studentAnswer === correctAnswer) {
    return true;
  }

  // Check acceptable variations
  if (correctAnswerObj.acceptable_variations) {
    for (const variation of correctAnswerObj.acceptable_variations) {
      if (normalizeAnswer(variation) === studentAnswer) {
        return true;
      }
    }
  }

  // Check for equivalent phrasing (OWTTE)
  if (correctAnswerObj.accepts_equivalent_phrasing || correctAnswerObj.marking_flags?.accepts_equivalent_phrasing) {
    if (checkEquivalentPhrasing(studentAnswer, correctAnswer)) {
      return true;
    }
  }

  // Check for reverse argument (ORA)
  if (correctAnswerObj.accepts_reverse_argument || correctAnswerObj.marking_flags?.accepts_reverse_argument) {
    if (checkReverseArgument(studentAnswer, correctAnswer)) {
      return true;
    }
  }

  return false;
}

/**
 * Check for equivalent phrasing
 */
function checkEquivalentPhrasing(studentAnswer: string, correctAnswer: string): boolean {
  // Extract key words from both answers
  const studentWords = new Set(studentAnswer.split(' ').filter(w => w.length > 2));
  const correctWords = new Set(correctAnswer.split(' ').filter(w => w.length > 2));

  // Calculate overlap
  const overlap = Array.from(studentWords).filter(w => correctWords.has(w)).length;
  const totalWords = Math.max(studentWords.size, correctWords.size);

  // If 70% or more words overlap, consider it equivalent
  return overlap / totalWords >= 0.7;
}

/**
 * Check for reverse argument
 */
function checkReverseArgument(studentAnswer: string, correctAnswer: string): boolean {
  // Check if the student answer contains the opposite meaning
  // This is a simplified implementation - in reality, this would need NLP
  const negationWords = ['not', 'no', 'without', 'lack', 'absence'];

  const studentHasNegation = negationWords.some(w => studentAnswer.includes(w));
  const correctHasNegation = negationWords.some(w => correctAnswer.includes(w));

  // If one has negation and the other doesn't, but core words match
  if (studentHasNegation !== correctHasNegation) {
    const studentCore = studentAnswer.replace(/\b(not|no|without|lack|absence)\b/g, '').trim();
    const correctCore = correctAnswer.replace(/\b(not|no|without|lack|absence)\b/g, '').trim();

    return checkEquivalentPhrasing(studentCore, correctCore);
  }

  return false;
}

/**
 * Check for partial credit
 */
function checkPartialCredit(
  studentAnswer: any,
  correctAnswers: QuestionCorrectAnswer[],
  format?: string
): number {
  let partialCredit = 0;

  // For multi-part answers (e.g., calculation with working)
  if (format === 'calculation' && typeof studentAnswer === 'object') {
    // Award partial credit for showing working even if final answer is wrong
    if (studentAnswer.working && studentAnswer.working.length > 10) {
      partialCredit += 0.5; // Half mark for working
    }
  }

  // For multi-line answers, check if any lines are correct
  if (format === 'multi_line' && typeof studentAnswer === 'string') {
    const lines = studentAnswer.split('\n').filter(l => l.trim());
    let correctLines = 0;

    lines.forEach(line => {
      const normalized = normalizeAnswer(line);
      if (correctAnswers.some(ca => normalizeAnswer(ca.answer) === normalized)) {
        correctLines++;
      }
    });

    if (correctLines > 0 && lines.length > 0) {
      const maxMarks = Math.max(...correctAnswers.map(ca => ca.marks || 1));
      partialCredit += (correctLines / lines.length) * maxMarks;
    }
  }

  return Math.round(partialCredit * 10) / 10; // Round to 1 decimal place
}

/**
 * Calculate total marks for a complex question answer
 */
export function calculateComplexQuestionMarks(
  question: ComplexQuestionDisplay,
  answer: ComplexQuestionAnswer
): {
  totalMarks: number;
  maxMarks: number;
  breakdown: Array<{
    part: string;
    marks: number;
    maxMarks: number;
    subparts?: Array<{
      subpart: string;
      marks: number;
      maxMarks: number;
    }>;
  }>;
} {
  let totalMarks = 0;
  const maxMarks = question.marks;
  const breakdown: any[] = [];

  question.parts?.forEach((part) => {
    const partAnswer = answer.parts?.find(p => p.part_id === part.id);

    if (part.subparts && part.subparts.length > 0) {
      // Calculate marks for each subpart
      let partTotal = 0;
      const subpartBreakdown: any[] = [];

      part.subparts.forEach((subpart) => {
        const subpartAnswer = partAnswer?.subparts?.find(s => s.subpart_id === subpart.id);
        const result = checkAnswerCorrectness(
          subpartAnswer?.answer,
          subpart.correct_answers,
          subpart.answer_format
        );

        const marks = result.isCorrect ? (result.matchedAnswer?.marks || subpart.marks) : (result.partialCredit || 0);
        partTotal += marks;

        subpartBreakdown.push({
          subpart: subpart.subpart_label,
          marks,
          maxMarks: subpart.marks
        });
      });

      totalMarks += partTotal;
      breakdown.push({
        part: part.part_label,
        marks: partTotal,
        maxMarks: part.marks,
        subparts: subpartBreakdown
      });
    } else {
      // Calculate marks for part directly
      const result = checkAnswerCorrectness(
        partAnswer?.answer,
        part.correct_answers,
        part.answer_format
      );

      const marks = result.isCorrect ? (result.matchedAnswer?.marks || part.marks) : (result.partialCredit || 0);
      totalMarks += marks;

      breakdown.push({
        part: part.part_label,
        marks,
        maxMarks: part.marks
      });
    }
  });

  return {
    totalMarks: Math.round(totalMarks * 10) / 10,
    maxMarks,
    breakdown
  };
}
