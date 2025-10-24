import { Question, SubQuestion, CorrectAnswer, QuestionOption } from '../page';
import {
  QuestionDisplayData,
  QuestionPart
} from '../../../../../../components/shared/EnhancedQuestionDisplay';

const toOptionLabel = (order: number, index: number) => {
  const normalized = Number.isFinite(order) ? order : index;
  const baseCode = 'A'.charCodeAt(0);
  const labelIndex = Math.max(0, normalized);
  return String.fromCharCode(baseCode + (labelIndex % 26));
};

const mapOptionsForDisplay = (options?: QuestionOption[]): QuestionPart['options'] => {
  if (!Array.isArray(options)) {
    return [];
  }

  return options
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((option, index) => ({
      label: toOptionLabel(option.order ?? index, index),
      text: option.option_text || '',
      is_correct: Boolean(option.is_correct)
    }));
};

const mapCorrectAnswersForDisplay = (answers?: CorrectAnswer[], fallback?: string) => {
  const normalized = Array.isArray(answers) ? answers : [];

  if (normalized.length === 0 && fallback) {
    return [
      {
        answer: fallback,
        marks: undefined,
        alternative_id: undefined,
        context: undefined
      }
    ];
  }

  return normalized.map(answer => ({
    answer: answer.answer,
    marks: answer.marks,
    alternative_id: answer.alternative_id,
    context:
      answer.context_type || answer.context_value || answer.context_label
        ? {
            type: answer.context_type,
            value: answer.context_value,
            label: answer.context_label
          }
        : undefined
  }));
};

const buildPartsTree = (parts: SubQuestion[]): QuestionPart[] => {
  if (!Array.isArray(parts) || parts.length === 0) {
    return [];
  }

  const orderMap = new Map<string, number>();
  const partMap = new Map<string, QuestionPart>();

  parts.forEach((part, index) => {
    const orderValue = Number.isFinite(part.order_index) ? Number(part.order_index) : index;
    orderMap.set(part.id, orderValue);

    partMap.set(part.id, {
      id: part.id,
      part_label: part.part_label || `Part ${String.fromCharCode(97 + index)}`,
      question_text: part.question_description || '',
      marks: part.marks,
      answer_format: part.answer_format,
      answer_requirement: part.answer_requirement,
      total_alternatives: part.total_alternatives,
      correct_answers: mapCorrectAnswersForDisplay(part.correct_answers, part.correct_answer),
      options: mapOptionsForDisplay(part.options),
      attachments: part.attachments,
      hint: part.hint,
      explanation: part.explanation,
      subparts: []
    });
  });

  const roots: QuestionPart[] = [];

  parts.forEach((part, index) => {
    const displayPart = partMap.get(part.id);
    if (!displayPart) return;

    if (part.parent_id && partMap.has(part.parent_id)) {
      const parentPart = partMap.get(part.parent_id);
      if (parentPart) {
        parentPart.subparts = parentPart.subparts || [];
        parentPart.subparts.push(displayPart);
      }
    } else {
      roots.push(displayPart);
    }
  });

  const sortTree = (nodes: QuestionPart[]) => {
    nodes.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));
    nodes.forEach(node => {
      if (node.subparts && node.subparts.length > 0) {
        sortTree(node.subparts);
      }
    });
  };

  sortTree(roots);
  return roots;
};

const normalizeQuestionType = (
  type: Question['type']
): QuestionDisplayData['question_type'] => {
  if (type === 'mcq' || type === 'tf' || type === 'descriptive') {
    return type;
  }

  if (type === 'calculation' || type === 'diagram' || type === 'essay') {
    return type;
  }

  return 'descriptive';
};

export const mapQuestionToDisplayData = (question: Question): QuestionDisplayData => {
  const primarySubtopic = question.subtopics?.[0];

  return {
    id: question.id,
    question_number: question.question_number,
    question_text: question.question_description || '',
    question_type: normalizeQuestionType(question.type),
    marks: question.marks,
    unit: question.unit_name ?? null,
    unit_id: question.unit_id ?? null,
    difficulty: question.difficulty,
    topic: question.topic_name,
    topic_id: question.topic_id ?? null,
    subtopic: primarySubtopic?.name,
    subtopic_id: primarySubtopic?.id ?? null,
    answer_format: question.answer_format,
    answer_requirement: question.answer_requirement,
    correct_answers: mapCorrectAnswersForDisplay(
      question.correct_answers,
      question.correct_answer || undefined
    ),
    options: mapOptionsForDisplay(question.options),
    attachments: question.attachments,
    hint: question.hint,
    explanation: question.explanation,
    requires_manual_marking: undefined,
    marking_criteria: undefined,
    parts: buildPartsTree(question.parts),
    figure_required: undefined,
    figure: undefined
  };
};

