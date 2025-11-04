/**
 * Answer Expectation Helper Functions
 *
 * These utilities help determine whether a question, part, or subpart
 * expects a direct answer based on the enhanced complex question logic.
 */

import type {
  QuestionMasterAdmin,
  SubQuestion,
  ComplexQuestionPart,
  ComplexQuestionSubpart
} from '@/types/questions';

/**
 * Decision Rules for Answer Expectations
 *
 * Main Question Level:
 * - If has_direct_answer = true → expects answer
 * - If has_direct_answer = false → contextual only, no answer expected
 *
 * Part Level:
 * - If has_direct_answer = true → expects answer
 * - If has_direct_answer = false AND has subparts → contextual linking text
 * - If has_direct_answer = false AND no subparts → error condition
 *
 * Subpart Level:
 * - ALWAYS expects answer (no exceptions)
 */

// ==========================================
// Type Guards
// ==========================================

export function isMainQuestion(item: any): item is QuestionMasterAdmin {
  return item && typeof item.question_number !== 'undefined' && typeof item.paper_id !== 'undefined';
}

export function isSubQuestion(item: any): item is SubQuestion {
  return item && typeof item.question_id !== 'undefined' && typeof item.level !== 'undefined';
}

export function isPart(item: SubQuestion): boolean {
  return item.level === 2 && item.parent_id === null;
}

export function isSubpart(item: SubQuestion): boolean {
  return item.level >= 3 || (item.level === 2 && item.parent_id !== null);
}

// ==========================================
// Main Functions
// ==========================================

/**
 * Check if a question element should show an answer input field
 */
export function shouldShowAnswerInput(
  element: QuestionMasterAdmin | SubQuestion | ComplexQuestionPart | ComplexQuestionSubpart,
  context?: {
    hasSubparts?: boolean;
    level?: number;
  }
): boolean {
  // For ComplexQuestionSubpart - ALWAYS needs answer
  if ('subpart_label' in element && element.subpart_label) {
    return true;
  }

  // For SubQuestion at subpart level (level >= 3) - ALWAYS needs answer
  if (isSubQuestion(element) && isSubpart(element)) {
    return true;
  }

  // Check has_direct_answer field
  const hasDirectAnswer = 'has_direct_answer' in element ? element.has_direct_answer : true;

  // If explicitly marked as not having direct answer
  if (hasDirectAnswer === false) {
    return false;
  }

  // For parts with subparts, check if it's contextual only
  if (context?.hasSubparts && hasDirectAnswer === false) {
    return false;
  }

  // Default: show answer input
  return true;
}

/**
 * Collect all answerable items from a complex question structure
 */
export function collectAnswerableItems(
  question: QuestionMasterAdmin,
  parts: SubQuestion[] = []
): Array<{
  id: string;
  type: 'main' | 'part' | 'subpart';
  label: string;
  text: string;
  marks: number;
  level: number;
  requiresAnswer: boolean;
}> {
  const answerableItems: Array<{
    id: string;
    type: 'main' | 'part' | 'subpart';
    label: string;
    text: string;
    marks: number;
    level: number;
    requiresAnswer: boolean;
  }> = [];

  // Check main question
  const mainRequiresAnswer = shouldShowAnswerInput(question);
  if (mainRequiresAnswer) {
    answerableItems.push({
      id: question.id,
      type: 'main',
      label: question.question_number,
      text: question.question_description,
      marks: question.marks,
      level: 1,
      requiresAnswer: true
    });
  }

  // Group parts and subparts
  const partsMap = new Map<string, SubQuestion[]>();
  const rootParts: SubQuestion[] = [];

  parts.forEach(part => {
    if (part.parent_id === null) {
      rootParts.push(part);
      partsMap.set(part.id, []);
    }
  });

  parts.forEach(part => {
    if (part.parent_id !== null) {
      const siblings = partsMap.get(part.parent_id) || [];
      siblings.push(part);
      partsMap.set(part.parent_id, siblings);
    }
  });

  // Process parts
  rootParts.forEach(part => {
    const subparts = partsMap.get(part.id) || [];
    const hasSubparts = subparts.length > 0;

    const partRequiresAnswer = shouldShowAnswerInput(part, { hasSubparts, level: part.level });

    if (partRequiresAnswer) {
      answerableItems.push({
        id: part.id,
        type: 'part',
        label: part.part_label || '',
        text: part.question_description,
        marks: part.marks,
        level: part.level,
        requiresAnswer: true
      });
    }

    // Process subparts (always answerable)
    subparts.forEach(subpart => {
      answerableItems.push({
        id: subpart.id,
        type: 'subpart',
        label: subpart.subpart_label || '',
        text: subpart.question_description,
        marks: subpart.marks,
        level: subpart.level,
        requiresAnswer: true
      });
    });
  });

  return answerableItems;
}

/**
 * Validate that answer expectation logic is consistent
 */
export function validateAnswerExpectationLogic(
  question: QuestionMasterAdmin,
  parts: SubQuestion[] = []
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Rule 1: If main question has no direct answer, must have parts
  if (question.has_direct_answer === false && parts.length === 0) {
    errors.push('Main question marked as contextual-only must have parts/subparts');
  }

  // Rule 2: If is_contextual_only is true, has_direct_answer must be false
  if (question.is_contextual_only === true && question.has_direct_answer !== false) {
    errors.push('Main question: if is_contextual_only=true, has_direct_answer must be false');
  }

  // Group parts by parent
  const partsMap = new Map<string | null, SubQuestion[]>();
  parts.forEach(part => {
    const key = part.parent_id;
    if (!partsMap.has(key)) {
      partsMap.set(key, []);
    }
    partsMap.get(key)!.push(part);
  });

  const rootParts = partsMap.get(null) || [];

  // Rule 3: Parts without direct answers must have subparts
  rootParts.forEach(part => {
    if (part.has_direct_answer === false) {
      const subparts = partsMap.get(part.id) || [];
      if (subparts.length === 0) {
        errors.push(`Part ${part.part_label}: marked as contextual-only but has no subparts`);
      }
    }

    // Rule 4: If part is_contextual_only is true, has_direct_answer must be false
    if (part.is_contextual_only === true && part.has_direct_answer !== false) {
      errors.push(`Part ${part.part_label}: if is_contextual_only=true, has_direct_answer must be false`);
    }
  });

  // Rule 5: Subparts (level >= 3) should always have answers
  parts.forEach(part => {
    if (isSubpart(part) && part.has_direct_answer === false) {
      warnings.push(`Subpart ${part.part_label}: subparts should typically have direct answers`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Get display label for question hierarchy
 */
export function getQuestionLabel(
  element: QuestionMasterAdmin | SubQuestion,
  parentLabel?: string
): string {
  if (isMainQuestion(element)) {
    return `Q${element.question_number}`;
  }

  if (isSubQuestion(element)) {
    const label = element.part_label || '';
    if (parentLabel) {
      return `${parentLabel}(${label})`;
    }
    return label;
  }

  return '';
}

/**
 * Determine if correct_answers should be required based on answer expectation
 */
export function shouldRequireCorrectAnswers(
  element: QuestionMasterAdmin | SubQuestion,
  context?: { hasSubparts?: boolean }
): boolean {
  // If has_direct_answer is explicitly false, no correct answers needed
  if ('has_direct_answer' in element && element.has_direct_answer === false) {
    return false;
  }

  // Subparts always need answers
  if (isSubQuestion(element) && isSubpart(element)) {
    return true;
  }

  // If it's a part with subparts and no direct answer, don't require
  if (context?.hasSubparts && element.has_direct_answer === false) {
    return false;
  }

  // Default: require answers
  return true;
}

/**
 * Create default values for new questions
 */
export function getDefaultAnswerExpectation(
  type: 'main' | 'part' | 'subpart',
  hasChildren: boolean = false
): {
  has_direct_answer: boolean;
  is_contextual_only: boolean;
} {
  // Subparts always need answers
  if (type === 'subpart') {
    return {
      has_direct_answer: true,
      is_contextual_only: false
    };
  }

  // Parts/main with children might be contextual
  if (hasChildren) {
    return {
      has_direct_answer: false,
      is_contextual_only: true
    };
  }

  // Default: expects answer
  return {
    has_direct_answer: true,
    is_contextual_only: false
  };
}
