/**
 * JSON Transformer Utility
 * Transforms imported JSON from past papers into internal question structure
 * Handles complex marking schemes, alternatives, and nested questions
 */

import { QuestionDisplayData } from '../../components/shared/EnhancedQuestionDisplay';
import { deriveAnswerRequirement } from './answerRequirementDeriver';
import { detectAnswerExpectation } from './answerExpectationDetector';
import { deriveAnswerFormat } from '../constants/answerOptions';

interface ImportedQuestion {
  question_number: string | number;
  type: string;
  mcq_type?: string;
  question_type?: string;
  topic?: string;
  subtopic?: string;
  unit?: string;
  difficulty?: string;
  question_text?: string;
  question_description?: string;
  figure?: boolean;
  attachments?: string[];
  total_marks?: number;
  marks?: number;
  parts?: ImportedQuestionPart[];
  subparts?: ImportedQuestionPart[];
  options?: Array<{
    label: string;
    text: string;
    is_correct?: boolean;
  }>;
  correct_answer?: string | string[];
  correct_answers?: ImportedCorrectAnswer[];
  answer_format?: string;
  answer_requirement?: string;
  hint?: string;
  explanation?: string;
  marking_criteria?: any;
}

interface ImportedQuestionPart {
  part?: string;
  subpart?: string;
  question_text?: string;
  question_description?: string;
  type?: string;
  marks: number;
  answer_format?: string;
  answer_requirement?: string;
  total_alternatives?: number;
  correct_answers?: ImportedCorrectAnswer[];
  options?: Array<{
    label: string;
    text: string;
    is_correct?: boolean;
  }>;
  correct_answer?: string | string[];
  hint?: string;
  explanation?: string;
  figure?: boolean;
  attachments?: string[];
  subparts?: ImportedQuestionPart[];
}

interface ImportedCorrectAnswer {
  answer: string;
  marks?: number;
  alternative_id?: number;
  linked_alternatives?: number[];
  alternative_type?: string;
  context?: any;
  unit?: string;
  acceptable_variations?: string[];
  accepts_equivalent_phrasing?: boolean;
  accepts_reverse_argument?: boolean;
  error_carried_forward?: boolean;
  marking_criteria?: string;
}

interface NormalizeCorrectAnswerParams {
  correct_answers?: ImportedCorrectAnswer[] | null;
  correct_answer?: string | string[] | null;
  questionType?: string | null;
  marks?: number | null;
  total_marks?: number | null;
}

function normalizeImportedCorrectAnswers(params: NormalizeCorrectAnswerParams): ImportedCorrectAnswer[] {
  const {
    correct_answers: correctAnswers,
    correct_answer: singleAnswer,
    questionType,
    marks,
    total_marks
  } = params;

  if (Array.isArray(correctAnswers) && correctAnswers.length > 0) {
    return correctAnswers;
  }

  if (!singleAnswer) {
    return [];
  }

  const normalizedType = (questionType || '').toLowerCase();
  if (normalizedType === 'mcq' || normalizedType === 'tf' || normalizedType === 'true_false') {
    return [];
  }

  const fallbackAnswers = Array.isArray(singleAnswer) ? singleAnswer : [singleAnswer];
  const validAnswers = fallbackAnswers
    .map(answer => {
      if (typeof answer === 'number') {
        return String(answer);
      }
      return (answer || '').trim();
    })
    .filter(answer => answer.length > 0);

  if (validAnswers.length === 0) {
    return [];
  }

  const totalMarks = typeof marks === 'number' && marks > 0
    ? marks
    : typeof total_marks === 'number' && total_marks > 0
    ? total_marks
    : null;

  const marksPerAnswer = (() => {
    if (!totalMarks) {
      return 1;
    }

    const average = totalMarks / validAnswers.length;
    if (!Number.isFinite(average) || average <= 0) {
      return 1;
    }

    const rounded = Math.round(average);
    if (rounded >= 1) {
      return rounded;
    }

    const floored = Math.floor(average);
    if (floored >= 1) {
      return floored;
    }

    return 1;
  })();

  return validAnswers.map((answer, index) => ({
    answer,
    marks: marksPerAnswer,
    alternative_id: index + 1,
    alternative_type: 'standalone'
  }));
}

/**
 * Transform imported JSON question to internal display format
 */
export function transformImportedQuestion(
  imported: ImportedQuestion,
  index: number
): QuestionDisplayData {
  const questionNumber = String(imported.question_number || index + 1);

  // Determine question type
  let questionType: QuestionDisplayData['question_type'] = 'descriptive';
  if (imported.type === 'mcq' || imported.mcq_type) {
    questionType = 'mcq';
  } else if (imported.type === 'tf' || imported.type === 'true_false') {
    questionType = 'tf';
  } else if (imported.type === 'complex') {
    questionType = 'complex';
  } else if (imported.type === 'calculation' || imported.answer_format === 'calculation') {
    questionType = 'calculation';
  } else if (imported.type === 'diagram' || imported.answer_format === 'diagram') {
    questionType = 'diagram';
  } else if (imported.type === 'essay' || imported.type === 'extended_response') {
    questionType = 'essay';
  }

  // Auto-detect complex questions if they have parts/subparts
  if ((imported.parts || imported.subparts) && questionType === 'descriptive') {
    questionType = 'complex';
  }

  // Process correct answers (supports both correct_answers array and single correct_answer fallback)
  const normalizedCorrectAnswers = normalizeImportedCorrectAnswers({
    correct_answers: imported.correct_answers,
    correct_answer: imported.correct_answer,
    questionType,
    marks: imported.marks,
    total_marks: imported.total_marks
  });
  const correctAnswers = processCorrectAnswers(normalizedCorrectAnswers);

  // Process options for MCQ/TF questions
  const options = mapOptionsWithCorrectAnswers(
    imported.options,
    correctAnswers,
    imported.correct_answer
  );

  // Process attachments
  const attachments = processAttachments(imported.attachments || []);

  // Get question text
  const questionText = imported.question_text || imported.question_description || '';

  // Detect answer expectation using enhanced detector
  const hasSubparts = Boolean((imported.parts && imported.parts.length > 0) || (imported.subparts && imported.subparts.length > 0));
  const answerExpectation = detectAnswerExpectation(
    {
      question_text: questionText,
      question_description: questionText,
      correct_answers: correctAnswers,
      answer_format: imported.answer_format,
      answer_requirement: imported.answer_requirement,
      parts: imported.parts || imported.subparts
    },
    {
      hasSubparts,
      level: 'main'
    }
  );

  const isContextualOnly = answerExpectation.is_contextual_only;
  const hasDirectAnswer = answerExpectation.has_direct_answer;

  // Auto-fill answer_format if not provided
  let answerFormat = imported.answer_format;
  if (!answerFormat) {
    // Use enhanced deriveAnswerFormat from answerOptions
    answerFormat = deriveAnswerFormat({
      type: questionType,
      question_description: questionText,
      correct_answers: correctAnswers,
      has_direct_answer: hasDirectAnswer,
      is_contextual_only: isContextualOnly
    }) || undefined;
  }

  // Auto-fill answer_requirement if not provided
  let answerRequirement = imported.answer_requirement;
  if (!answerRequirement) {
    answerRequirement = deriveAnswerRequirement({
      type: questionType,
      correct_answers: correctAnswers,
      total_alternatives: imported.total_alternatives,
      has_direct_answer: hasDirectAnswer,
      is_contextual_only: isContextualOnly
    });
  }

  return {
    id: `q-${questionNumber}`,
    question_number: questionNumber,
    question_text: questionText,
    question_type: questionType,
    marks: imported.marks || imported.total_marks || 0,
    difficulty: imported.difficulty,
    topic: imported.topic,
    subtopic: imported.subtopic,
    answer_format: answerFormat,
    answer_requirement: answerRequirement,
    has_direct_answer: hasDirectAnswer,
    is_contextual_only: isContextualOnly,
    correct_answers: correctAnswers,
    options: options.length > 0 ? options : undefined,
    attachments: attachments.length > 0 ? attachments : undefined,
    hint: imported.hint,
    explanation: imported.explanation,
    requires_manual_marking: shouldRequireManualMarking(imported),
    marking_criteria: formatMarkingCriteria(imported.marking_criteria),
    // Add parts if they exist
    parts: imported.parts || imported.subparts ?
      (imported.parts || imported.subparts || []).map((part, idx) =>
        transformQuestionPart(part, questionNumber, idx)
      ) : undefined
  };
}

/**
 * Transform a question part/subpart
 */
function transformQuestionPart(
  part: ImportedQuestionPart,
  parentNumber: string,
  index: number
): any {
  const partLabel = part.part || part.subpart || String.fromCharCode(97 + index); // a, b, c, etc.
  const partId = `${parentNumber}-${partLabel}`;

  const normalizedPartType = part.type || 'descriptive';
  const normalizedCorrectAnswers = normalizeImportedCorrectAnswers({
    correct_answers: part.correct_answers,
    correct_answer: part.correct_answer,
    questionType: normalizedPartType,
    marks: part.marks
  });
  const correctAnswers = processCorrectAnswers(normalizedCorrectAnswers);
  const options = mapOptionsWithCorrectAnswers(part.options, correctAnswers, part.correct_answer);

  const attachments = processAttachments(part.attachments || []);

  // Detect answer expectation for this part
  const hasSubparts = Boolean(part.subparts && part.subparts.length > 0);
  const partText = part.question_text || part.question_description || '';
  const answerExpectation = detectAnswerExpectation(
    {
      question_text: partText,
      question_description: partText,
      correct_answers: correctAnswers,
      answer_format: part.answer_format,
      answer_requirement: part.answer_requirement,
      subparts: part.subparts
    },
    {
      hasSubparts,
      level: 'part'
    }
  );

  const isContextualOnly = answerExpectation.is_contextual_only;
  const hasDirectAnswer = answerExpectation.has_direct_answer;

  // Auto-fill answer_format if not provided
  let answerFormat = part.answer_format;
  if (!answerFormat) {
    // Use enhanced deriveAnswerFormat
    answerFormat =
      deriveAnswerFormat({
        type: normalizedPartType || 'descriptive',
        question_description: partText,
        correct_answers: correctAnswers,
        has_direct_answer: hasDirectAnswer,
        is_contextual_only: isContextualOnly
      }) || undefined;
  }

  // Auto-fill answer_requirement if not provided
  let answerRequirement = part.answer_requirement;
  if (!answerRequirement) {
    // Parts are typically descriptive unless they have options
    answerRequirement = deriveAnswerRequirement({
      type: 'descriptive',
      correct_answers: correctAnswers,
      total_alternatives: part.total_alternatives,
      has_direct_answer: hasDirectAnswer,
      is_contextual_only: isContextualOnly
    });
  }

  return {
    id: partId,
    part_label: partLabel,
    question_text: part.question_text || part.question_description || '',
    marks: part.marks || 0,
    answer_format: answerFormat,
    answer_requirement: answerRequirement,
    has_direct_answer: hasDirectAnswer,
    is_contextual_only: isContextualOnly,
    total_alternatives: part.total_alternatives,
    correct_answers: correctAnswers,
    options: options.length > 0 ? options : undefined,
    attachments: attachments.length > 0 ? attachments : undefined,
    hint: part.hint,
    explanation: part.explanation,
    // Nested subparts
    subparts: part.subparts ?
      part.subparts.map((sub, idx) => transformQuestionSubpart(sub, partId, idx)) :
      undefined
  };
}

/**
 * Transform a question subpart (similar to transformQuestionPart but uses subpart_label)
 */
function transformQuestionSubpart(
  subpart: ImportedQuestionPart,
  parentId: string,
  index: number
): any {
  // Use proper roman numerals for subpart labels
  const romanNumerals = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii'];
  const subpartLabel = subpart.subpart || subpart.part || romanNumerals[index] || String(index + 1);
  const subpartId = `${parentId}-${subpartLabel}`;

  const normalizedSubpartType = subpart.type || 'descriptive';
  const normalizedCorrectAnswers = normalizeImportedCorrectAnswers({
    correct_answers: subpart.correct_answers,
    correct_answer: subpart.correct_answer,
    questionType: normalizedSubpartType,
    marks: subpart.marks
  });
  const correctAnswers = processCorrectAnswers(normalizedCorrectAnswers);
  const options = mapOptionsWithCorrectAnswers(subpart.options, correctAnswers, subpart.correct_answer);

  const attachments = processAttachments(subpart.attachments || []);

  // Detect answer expectation for this subpart
  const subpartText = subpart.question_text || subpart.question_description || '';
  const answerExpectation = detectAnswerExpectation(
    {
      question_text: subpartText,
      question_description: subpartText,
      correct_answers: correctAnswers,
      answer_format: subpart.answer_format,
      answer_requirement: subpart.answer_requirement,
      subparts: undefined // Subparts don't have nested subparts
    },
    {
      hasSubparts: false,
      level: 'subpart'
    }
  );

  const hasDirectAnswer = answerExpectation.has_direct_answer ?? true; // Subparts typically have direct answers
  const isContextualOnly = answerExpectation.is_contextual_only ?? false;

  // CRITICAL FIX: Prioritize explicit answer_format from JSON, with proper validation
  // Check if answer_format exists and is a non-empty, valid string
  let answerFormat = subpart.answer_format;
  const isValidAnswerFormat = answerFormat &&
    typeof answerFormat === 'string' &&
    answerFormat.trim() !== '' &&
    answerFormat !== 'undefined' &&
    answerFormat !== 'null';

  if (!isValidAnswerFormat) {
    // Only derive if not provided or invalid
    answerFormat =
      deriveAnswerFormat({
        type: normalizedSubpartType || 'descriptive',
        question_description: subpartText,
        correct_answers: correctAnswers,
        has_direct_answer: hasDirectAnswer,
        is_contextual_only: isContextualOnly
      }) || undefined;
  }

  // CRITICAL FIX: Prioritize explicit answer_requirement from JSON, with proper validation
  // Check if answer_requirement exists and is a non-empty, valid string
  let answerRequirement = subpart.answer_requirement;
  const isValidAnswerRequirement = answerRequirement &&
    typeof answerRequirement === 'string' &&
    answerRequirement.trim() !== '' &&
    answerRequirement !== 'undefined' &&
    answerRequirement !== 'null';

  if (!isValidAnswerRequirement) {
    // Only derive if not provided or invalid
    answerRequirement = deriveAnswerRequirement({
      type: 'descriptive',
      correct_answers: correctAnswers,
      total_alternatives: subpart.total_alternatives,
      has_direct_answer: hasDirectAnswer,
      is_contextual_only: isContextualOnly
    });
  }

  return {
    id: subpartId,
    subpart_label: subpartLabel,
    question_text: subpart.question_text || subpart.question_description || '',
    marks: subpart.marks || 0,
    answer_format: answerFormat,
    answer_requirement: answerRequirement,
    has_direct_answer: hasDirectAnswer,
    is_contextual_only: isContextualOnly,
    total_alternatives: subpart.total_alternatives,
    correct_answers: correctAnswers,
    options: options.length > 0 ? options : undefined,
    figure: subpart.figure || false, // Preserve figure flag from JSON
    figure_required: subpart.figure_required || false, // Preserve figure_required flag
    attachments: attachments.length > 0 ? attachments : undefined,
    hint: subpart.hint,
    explanation: subpart.explanation
  };
}

/**
 * Process correct answers array with alternative grouping and enhanced metadata
 */
function processCorrectAnswers(answers: ImportedCorrectAnswer[]): Array<any> {
  if (!answers || answers.length === 0) return [];

  return answers.map((answer, index) => {
    const processedAnswer: any = {
      answer: answer.answer,
      marks: answer.marks ?? 1,
      alternative_id: answer.alternative_id ?? index + 1,
      linked_alternatives: answer.linked_alternatives || [],
      alternative_type: answer.alternative_type || 'standalone',
      unit: answer.unit,
      acceptable_variations: answer.acceptable_variations || [],
      accepts_equivalent_phrasing: answer.accepts_equivalent_phrasing || false,
      accepts_reverse_argument: answer.accepts_reverse_argument || false,
      error_carried_forward: answer.error_carried_forward || false,
      marking_criteria: answer.marking_criteria
    };

    // Process context object
    if (answer.context) {
      processedAnswer.context = answer.context;
      processedAnswer.context_type = answer.context.type;
      processedAnswer.context_value = answer.context.value;
      processedAnswer.context_label = answer.context.label;
    }

    // Add working/explanation if present
    if ('working' in answer) {
      processedAnswer.working = (answer as any).working;
    }

    // Add marking flags
    processedAnswer.marking_flags = {
      accepts_reverse_argument: answer.accepts_reverse_argument || false,
      accepts_equivalent_phrasing: answer.accepts_equivalent_phrasing || false,
      accepts_mathematical_notation: false,
      case_insensitive: true,
      accepts_abbreviated_forms: false,
      ignore_articles: false,
      accepts_symbolic_notation: false
    };

    return processedAnswer;
  });
}

function mapOptionsWithCorrectAnswers(
  importedOptions: ImportedQuestion['options'],
  correctAnswers: ReturnType<typeof processCorrectAnswers>,
  fallbackCorrectAnswer?: ImportedQuestion['correct_answer']
): Array<{ label: string; text: string; is_correct: boolean }> {
  if (!importedOptions || importedOptions.length === 0) {
    return [];
  }

  const normalizedCorrectAnswers = buildNormalizedAnswerSet(correctAnswers);

  // Include fallback correct_answer values (commonly used for MCQ imports)
  const fallbackValues: string[] = Array.isArray(fallbackCorrectAnswer)
    ? fallbackCorrectAnswer
    : fallbackCorrectAnswer
    ? [fallbackCorrectAnswer]
    : [];

  fallbackValues.forEach(value => {
    if (typeof value !== 'string') return;
    generateNormalizationVariants(value).forEach(variant => {
      if (variant) {
        normalizedCorrectAnswers.add(variant);
      }
    });
  });

  return importedOptions.map(option => {
    const isCorrectFromAnswers = [option.label, option.text]
      .some(value => matchesCorrectAnswerValue(value, normalizedCorrectAnswers));

    return {
      label: option.label,
      text: option.text,
      is_correct: Boolean(option.is_correct ?? isCorrectFromAnswers)
    };
  });
}

function buildNormalizedAnswerSet(
  correctAnswers: ReturnType<typeof processCorrectAnswers>
): Set<string> {
  const normalized = new Set<string>();

  correctAnswers.forEach(answer => {
    if (!answer || typeof answer.answer === 'undefined' || answer.answer === null) {
      return;
    }

    generateNormalizationVariants(answer.answer).forEach(variant => {
      if (variant) {
        normalized.add(variant);
      }
    });
  });

  return normalized;
}

function matchesCorrectAnswerValue(
  value: string | null | undefined,
  normalizedCorrectAnswers: Set<string>
): boolean {
  if (!value) {
    return false;
  }

  return generateNormalizationVariants(value).some(variant => normalizedCorrectAnswers.has(variant));
}

function generateNormalizationVariants(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  const lower = trimmed.toLowerCase();
  const variants = new Set<string>();

  variants.add(lower);
  variants.add(lower.replace(/^option\s+/i, '').trim());

  const withoutPunctuation = lower.replace(/[\.,;:()\[\]{}]/g, '').trim();
  variants.add(withoutPunctuation);

  const condensed = withoutPunctuation.replace(/\s+/g, '');
  variants.add(condensed);

  return Array.from(variants).filter(Boolean);
}

/**
 * Process attachments array
 *
 * CRITICAL FIX: Do NOT create attachment objects from JSON descriptions.
 * The "attachments" field in JSON contains placeholder descriptions like
 * "Fig. 1.1 showing test tubes" which are NOT actual uploaded files.
 *
 * Actual attachments should only be added when users upload files via the snipping tool.
 * The JSON descriptions are just metadata indicating what figures are EXPECTED,
 * not what has been ATTACHED.
 *
 * Return empty array to ensure figure status shows "requires figure" not "figure attached"
 */
function processAttachments(attachments: string[]): Array<any> {
  // Always return empty array - attachments must be added by user via snipping tool
  // The attachments array from JSON is just descriptive metadata, not actual files
  return [];
}

/**
 * Determine if question requires manual marking
 */
function shouldRequireManualMarking(question: ImportedQuestion): boolean {
  // Questions with complex answer requirements need manual marking
  if (question.answer_format === 'essay' ||
      question.answer_format === 'extended_response' ||
      question.type === 'essay') {
    return true;
  }

  // Questions with multiple acceptable variations
  if (question.correct_answers?.some(ans =>
    ans.acceptable_variations && ans.acceptable_variations.length > 5
  )) {
    return true;
  }

  return false;
}

/**
 * Format marking criteria for display
 */
function formatMarkingCriteria(criteria: any): string | undefined {
  if (!criteria) return undefined;

  if (typeof criteria === 'string') return criteria;

  if (typeof criteria === 'object') {
    return JSON.stringify(criteria, null, 2);
  }

  return undefined;
}

/**
 * Group answers by alternative type for display
 */
export function groupAnswersByAlternatives(
  answers: ImportedCorrectAnswer[]
): Map<string, ImportedCorrectAnswer[]> {
  const groups = new Map<string, ImportedCorrectAnswer[]>();

  // Group by alternative_type and linked_alternatives
  answers.forEach(answer => {
    if (!answer.linked_alternatives || answer.linked_alternatives.length === 0) {
      // Standalone answer
      const key = `standalone-${answer.alternative_id}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(answer);
    } else {
      // Part of a linked group
      const key = `group-${answer.alternative_type}-${answer.linked_alternatives.sort().join('-')}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(answer);
    }
  });

  return groups;
}

/**
 * Get human-readable alternative type label
 */
export function getAlternativeTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'one_required': 'Any ONE of these',
    'all_required': 'ALL of these required',
    'structure_function_pair': 'Structure AND function pair',
    'two_required': 'Any TWO of these',
    'three_required': 'Any THREE of these',
    'standalone': 'Required'
  };

  return labels[type] || type;
}

/**
 * Transform entire paper JSON
 */
export function transformImportedPaper(paperData: any): {
  metadata: any;
  questions: QuestionDisplayData[];
} {
  const questions = (paperData.questions || []).map((q: any, index: number) =>
    transformImportedQuestion(q, index)
  );

  const metadata = {
    paper_code: paperData.paper_code,
    paper_name: paperData.paper_name,
    exam_board: paperData.exam_board,
    qualification: paperData.qualification,
    subject: paperData.subject,
    exam_year: paperData.exam_year,
    exam_session: paperData.exam_session,
    paper_duration: paperData.paper_duration,
    total_marks: paperData.total_marks,
    region: paperData.region,
    provider: paperData.provider,
    program: paperData.program
  };

  return { metadata, questions };
}
