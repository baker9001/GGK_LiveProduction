import type { QuestionDisplayData, QuestionPart } from '@/components/shared/EnhancedQuestionDisplay';

export type SimulationAttachment = {
  id: string;
  file_url: string;
  file_name: string;
  file_type: string;
};

const ensureArray = <T>(value: T | T[] | null | undefined): T[] => {
  if (Array.isArray(value)) {
    return value;
  }
  if (value === null || value === undefined) {
    return [];
  }
  return [value];
};

export const generateAttachmentKey = (questionId: string, partIndex?: number, subpartIndex?: number): string => {
  let key = questionId;
  if (partIndex !== undefined) {
    key += `_p${partIndex}`;
  }
  if (subpartIndex !== undefined) {
    key += `_s${subpartIndex}`;
  }
  return key;
};

const guessMimeTypeFromSource = (source: string): string | undefined => {
  if (!source) {
    return undefined;
  }

  if (source.startsWith('data:')) {
    const mime = source.slice(5, source.indexOf(';'));
    return mime || undefined;
  }

  const extensionMatch = source.match(/\.([a-zA-Z0-9]+)(?:\?|#|$)/);
  if (!extensionMatch) {
    return undefined;
  }

  const extension = extensionMatch[1].toLowerCase();
  const mimeMap: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    bmp: 'image/bmp',
    svg: 'image/svg+xml',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  };

  return mimeMap[extension];
};

const deriveFileNameFromUrl = (source: string): string | undefined => {
  if (!source || source.startsWith('data:')) {
    return undefined;
  }

  const cleaned = source.split('?')[0].split('#')[0];
  const segments = cleaned.split('/').filter(Boolean);
  const lastSegment = segments[segments.length - 1];
  return lastSegment ? decodeURIComponent(lastSegment) : undefined;
};

const normalizeAttachmentForSimulation = (
  attachment: any,
  fallbackPrefix: string,
  index: number
): SimulationAttachment | null => {
  if (!attachment) {
    return null;
  }

  if (typeof attachment === 'string') {
    const trimmed = attachment.trim();
    if (!trimmed) {
      return null;
    }

    const fileName = deriveFileNameFromUrl(trimmed) || `Attachment_${index + 1}`;
    const fileType = guessMimeTypeFromSource(trimmed) || 'image/png';

    return {
      id: `${fallbackPrefix}_att_${index}`,
      file_url: trimmed,
      file_name: fileName,
      file_type: fileType
    };
  }

  const urlCandidates = [
    attachment.file_url,
    attachment.url,
    attachment.dataUrl,
    attachment.data,
    attachment.preview,
    attachment.publicUrl,
    attachment.public_url,
    attachment.signedUrl,
    attachment.signed_url,
    attachment.path
  ];

  const fileUrl = urlCandidates.find((candidate) => typeof candidate === 'string' && candidate.trim().length > 0)?.trim();

  if (!fileUrl) {
    return null;
  }

  const nameCandidates = [
    attachment.file_name,
    attachment.name,
    attachment.fileName,
    attachment.originalName,
    attachment.filename,
    attachment.title
  ];

  const resolvedName = nameCandidates.find((candidate) => typeof candidate === 'string' && candidate.trim().length > 0)?.trim();
  const fileName = resolvedName || deriveFileNameFromUrl(fileUrl) || `Attachment_${index + 1}`;

  const typeCandidates = [attachment.file_type, attachment.type, attachment.mime_type];
  const resolvedType = typeCandidates.find((candidate) => typeof candidate === 'string' && candidate.trim().length > 0)?.trim();
  const fileType = resolvedType || guessMimeTypeFromSource(fileUrl) || 'image/png';

  return {
    id: String(attachment.id ?? `${fallbackPrefix}_att_${index}`),
    file_url: fileUrl,
    file_name: fileName,
    file_type: fileType
  };
};

export const mergeAttachmentSources = (
  primary: any,
  secondary: any,
  fallbackPrefix: string
): SimulationAttachment[] => {
  const primaryArray = ensureArray(primary);
  const secondaryArray = ensureArray(secondary);
  const combined = [
    ...primaryArray.map((item, index) => ({ item, index })),
    ...secondaryArray.map((item, index) => ({ item, index: index + primaryArray.length }))
  ];

  const seen = new Set<string>();

  return combined.reduce<SimulationAttachment[]>((acc, { item, index }) => {
    const normalized = normalizeAttachmentForSimulation(item, fallbackPrefix, index);

    if (normalized) {
      const dedupeKey = `${normalized.file_url}::${normalized.file_name}`;
      if (!seen.has(dedupeKey)) {
        seen.add(dedupeKey);
        acc.push(normalized);
      }
    }

    return acc;
  }, []);
};

const derivePartType = (part: QuestionPart | undefined): 'mcq' | 'tf' | 'descriptive' => {
  if (!part) {
    return 'descriptive';
  }

  if (part.options && part.options.length > 0) {
    return 'mcq';
  }

  const text = (part.question_text || part.question_description || '').toLowerCase();
  if (part.answer_format === 'true_false' || text.includes('true or false')) {
    return 'tf';
  }

  return 'descriptive';
};

const mapCorrectAnswers = (answers: QuestionDisplayData['correct_answers']) => {
  return ensureArray(answers).map(ans => ({
    answer: ans.answer,
    marks: ans.marks,
    alternative_id: ans.alternative_id,
    linked_alternatives: ans.linked_alternatives,
    alternative_type: ans.alternative_type,
    context: ans.context,
    unit: ans.unit,
    measurement_details: (ans as any).measurement_details,
    accepts_equivalent_phrasing: ans.accepts_equivalent_phrasing,
    error_carried_forward: ans.error_carried_forward,
    answer_requirement: ans.answer_requirement,
    total_alternatives: ans.total_alternatives
  }));
};

const mapOptions = (options: QuestionDisplayData['options']) => {
  return ensureArray(options).map((opt, index) => ({
    id: `opt_${index}`,
    label: opt.label || (opt as any).option_label || String.fromCharCode(65 + index),
    option_text: opt.text || (opt as any).option_text,
    is_correct: opt.is_correct,
    order: index
  }));
};

interface BuildSimulationPaperOptions {
  questions: QuestionDisplayData[];
  paperTitle: string;
  totalMarks: number;
  paperCode?: string;
  subject?: string;
  duration?: string | null;
  attachmentsMap?: Record<string, any>;
  metadata?: Record<string, unknown>;
  validationConfig?: Record<string, unknown>;
}

export interface SimulationPaperQuestion {
  id: string;
  question_number: string;
  question_description: string;
  marks: number;
  type: 'mcq' | 'tf' | 'descriptive';
  difficulty?: string;
  topic_name?: string;
  subtopic_names?: string[];
  options?: ReturnType<typeof mapOptions>;
  parts: Array<{
    id: string;
    part_label?: string;
    question_description: string;
    marks: number;
    difficulty?: string;
    type: 'mcq' | 'tf' | 'descriptive';
    status: string;
    topic_id?: string;
    unit_name?: string | null;
    subtopics?: Array<{ id: string; name: string }>;
    answer_format?: string;
    answer_requirement?: string;
    correct_answers?: ReturnType<typeof mapCorrectAnswers>;
    correct_answer?: string;
    options?: ReturnType<typeof mapOptions>;
    subparts?: Array<{
      id: string;
      subpart_label?: string;
      question_description: string;
      marks: number;
      answer_format?: string;
      answer_requirement?: string;
      correct_answers?: ReturnType<typeof mapCorrectAnswers>;
      correct_answer?: string;
      options?: ReturnType<typeof mapOptions>;
      attachments?: SimulationAttachment[];
      hint?: string;
      explanation?: string;
      requires_manual_marking?: boolean;
      marking_criteria?: string;
    }>;
    attachments?: SimulationAttachment[];
    hint?: string;
    explanation?: string;
    requires_manual_marking?: boolean;
    marking_criteria?: string;
  }>;
  answer_format?: string;
  answer_requirement?: string;
  correct_answers?: ReturnType<typeof mapCorrectAnswers>;
  correct_answer?: string;
  total_alternatives?: number;
  subject?: string;
  figure?: boolean;
  unit_name?: string | null;
  status: string;
  attachments?: SimulationAttachment[];
  hint?: string;
  explanation?: string;
  requires_manual_marking?: boolean;
  marking_criteria?: string;
  _navigation: {
    index: number;
    total: number;
    next: string | null;
    previous: string | null;
  };
}

export interface SimulationPaper {
  id: string;
  code: string;
  subject: string;
  duration?: string | null;
  total_marks: number;
  questions: SimulationPaperQuestion[];
  status?: string;
  title?: string;
  validation_config?: Record<string, unknown>;
  [key: string]: unknown;
}

export const buildSimulationPaper = ({
  questions,
  paperTitle,
  totalMarks,
  paperCode,
  subject,
  duration,
  attachmentsMap = {},
  metadata,
  validationConfig
}: BuildSimulationPaperOptions): SimulationPaper => {
  const resolvedSubject = subject || paperTitle || 'IGCSE Practice Paper';
  const normalizedAttachments = attachmentsMap || {};

  const transformedQuestions: SimulationPaperQuestion[] = questions.map((question, questionIndex) => {
    const questionAttachments = mergeAttachmentSources(
      question.attachments,
      normalizedAttachments[question.id],
      question.id
    );

    const mappedParts = ensureArray(question.parts).map((part, partIndex) => {
      const partKey = generateAttachmentKey(question.id, partIndex);
      const partAttachments = mergeAttachmentSources(part?.attachments, normalizedAttachments[partKey], partKey);

      const mappedSubparts = ensureArray(part?.subparts).map((subpart, subpartIndex) => {
        const subpartKey = generateAttachmentKey(question.id, partIndex, subpartIndex);
        const subpartAttachments = mergeAttachmentSources(subpart?.attachments, normalizedAttachments[subpartKey], subpartKey);

        return {
          id: `${question.id}_p${partIndex}_s${subpartIndex}`,
          subpart_label: (subpart as any)?.subpart || subpart?.part_label,
          question_description: subpart?.question_text || subpart?.question_description || '',
          marks: subpart?.marks ?? 0,
          answer_format: subpart?.answer_format,
          answer_requirement: subpart?.answer_requirement,
          correct_answers: mapCorrectAnswers(subpart?.correct_answers),
          correct_answer: subpart?.correct_answers?.[0]?.answer,
          options: mapOptions(subpart?.options as any),
          attachments: subpartAttachments,
          hint: subpart?.hint,
          explanation: subpart?.explanation,
          requires_manual_marking: subpart?.requires_manual_marking,
          marking_criteria: subpart?.marking_criteria
        };
      });

      return {
        id: `${question.id}_p${partIndex}`,
        part_label: (part as any)?.part || part?.part_label,
        question_description: part?.question_text || (part as any)?.question_description || '',
        marks: part?.marks ?? 0,
        difficulty: question.difficulty,
        type: derivePartType(part),
        status: 'pending',
        topic_id: (question as any).original_topics?.[0],
        unit_name: (question as any).original_unit ?? question.unit,
        subtopics: (question as any).original_subtopics?.map((st: string) => ({ id: st, name: st })),
        answer_format: part?.answer_format,
        answer_requirement: part?.answer_requirement,
        correct_answers: mapCorrectAnswers(part?.correct_answers),
        correct_answer: part?.correct_answers?.[0]?.answer,
        options: mapOptions(part?.options as any),
        subparts: mappedSubparts,
        attachments: partAttachments,
        hint: part?.hint,
        explanation: part?.explanation,
        requires_manual_marking: part?.requires_manual_marking,
        marking_criteria: part?.marking_criteria
      };
    });

    const subtopicNames = ensureArray((question as any).original_subtopics ?? question.subtopic).map(String).filter(Boolean);

    return {
      id: question.id,
      question_number: question.question_number || `${questionIndex + 1}`,
      question_description: question.question_text || '',
      marks: question.marks ?? mappedParts.reduce((sum, part) => sum + part.marks, 0),
      type: (question.question_type as 'mcq' | 'tf' | 'descriptive') || 'descriptive',
      difficulty: question.difficulty,
      topic_name: question.topic,
      subtopic_names: subtopicNames,
      options: mapOptions(question.options),
      parts: mappedParts,
      answer_format: question.answer_format,
      answer_requirement: question.answer_requirement,
      correct_answers: mapCorrectAnswers(question.correct_answers),
      correct_answer: question.correct_answers?.[0]?.answer,
      total_alternatives: question.correct_answers?.length,
      subject: resolvedSubject,
      figure: question.figure ?? question.figure_required ?? false,
      unit_name: (question as any).original_unit ?? question.unit,
      status: 'pending',
      attachments: questionAttachments,
      hint: question.hint,
      explanation: question.explanation,
      requires_manual_marking: question.requires_manual_marking,
      marking_criteria: question.marking_criteria,
      _navigation: {
        index: questionIndex,
        total: questions.length,
        next: questionIndex < questions.length - 1 ? questions[questionIndex + 1].id : null,
        previous: questionIndex > 0 ? questions[questionIndex - 1].id : null
      }
    };
  });

  const defaultValidationConfig = validationConfig || {
    strict_marking: false,
    allow_equivalent_phrasing: true,
    case_sensitive: false,
    trim_whitespace: true,
    subject_specific_rules: {
      chemistry: resolvedSubject.toLowerCase().includes('chemistry'),
      physics: resolvedSubject.toLowerCase().includes('physics'),
      biology: resolvedSubject.toLowerCase().includes('biology'),
      mathematics: resolvedSubject.toLowerCase().includes('math')
    }
  };

  return {
    id: 'preview',
    code: paperCode || 'qa-preview',
    title: paperTitle,
    subject: resolvedSubject,
    duration: duration ?? null,
    total_marks: totalMarks,
    status: 'qa_review',
    validation_config: defaultValidationConfig,
    ...(metadata ?? {}),
    questions: transformedQuestions
  };
};

