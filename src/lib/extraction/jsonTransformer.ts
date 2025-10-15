/**
 * JSON Transformer Utility
 * Transforms imported JSON from past papers into internal question structure
 * Handles complex marking schemes, alternatives, and nested questions
 */

import { QuestionDisplayData } from '../../components/shared/EnhancedQuestionDisplay';

interface ImportedQuestion {
  question_number: string | number;
  type: string;
  mcq_type?: string;
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
  correct_answer?: string;
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
  } else if (imported.type === 'calculation' || imported.answer_format === 'calculation') {
    questionType = 'calculation';
  } else if (imported.type === 'diagram' || imported.answer_format === 'diagram') {
    questionType = 'diagram';
  } else if (imported.type === 'essay' || imported.type === 'extended_response') {
    questionType = 'essay';
  }

  // Process correct answers
  const correctAnswers = processCorrectAnswers(imported.correct_answers || []);

  // Process options for MCQ/TF questions
  const options = mapOptionsWithCorrectAnswers(imported.options, correctAnswers);

  // Process attachments
  const attachments = processAttachments(imported.attachments || []);

  // Get question text
  const questionText = imported.question_text || imported.question_description || '';

  return {
    id: `q-${questionNumber}`,
    question_number: questionNumber,
    question_text: questionText,
    question_type: questionType,
    marks: imported.marks || imported.total_marks || 0,
    difficulty: imported.difficulty,
    topic: imported.topic,
    subtopic: imported.subtopic,
    answer_format: imported.answer_format,
    answer_requirement: imported.answer_requirement,
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

  const correctAnswers = processCorrectAnswers(part.correct_answers || []);
  const options = mapOptionsWithCorrectAnswers(part.options, correctAnswers);

  const attachments = processAttachments(part.attachments || []);

  return {
    id: partId,
    part_label: partLabel,
    question_text: part.question_text || part.question_description || '',
    marks: part.marks || 0,
    answer_format: part.answer_format,
    answer_requirement: part.answer_requirement,
    total_alternatives: part.total_alternatives,
    correct_answers: correctAnswers,
    options: options.length > 0 ? options : undefined,
    attachments: attachments.length > 0 ? attachments : undefined,
    hint: part.hint,
    explanation: part.explanation,
    // Nested subparts
    subparts: part.subparts ?
      part.subparts.map((sub, idx) => transformQuestionPart(sub, partId, idx)) :
      undefined
  };
}

/**
 * Process correct answers array with alternative grouping
 */
function processCorrectAnswers(answers: ImportedCorrectAnswer[]): Array<any> {
  if (!answers || answers.length === 0) return [];

  return answers.map((answer, index) => ({
    answer: answer.answer,
    marks: answer.marks ?? 1,
    alternative_id: answer.alternative_id ?? index + 1,
    linked_alternatives: answer.linked_alternatives || [],
    alternative_type: answer.alternative_type || 'standalone',
    context: answer.context,
    unit: answer.unit,
    acceptable_variations: answer.acceptable_variations || [],
    accepts_equivalent_phrasing: answer.accepts_equivalent_phrasing || false,
    accepts_reverse_argument: answer.accepts_reverse_argument || false,
    error_carried_forward: answer.error_carried_forward || false,
    marking_criteria: answer.marking_criteria
  }));
}

function mapOptionsWithCorrectAnswers(
  importedOptions: ImportedQuestion['options'],
  correctAnswers: ReturnType<typeof processCorrectAnswers>
): Array<{ label: string; text: string; is_correct: boolean }> {
  if (!importedOptions || importedOptions.length === 0) {
    return [];
  }

  const normalizedCorrectAnswers = buildNormalizedAnswerSet(correctAnswers);

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
 */
function processAttachments(attachments: string[]): Array<any> {
  if (!attachments || attachments.length === 0) return [];

  return attachments.map((attachment, index) => ({
    id: `attachment-${index + 1}`,
    file_name: attachment,
    description: attachment,
    preview: null // Will be populated when actual files are uploaded
  }));
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
