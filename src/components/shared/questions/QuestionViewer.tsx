// src/components/shared/questions/QuestionViewer.tsx

import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Calculator,
  CheckCircle,
  Eye,
  File,
  FileText,
  Film,
  Image as ImageIcon,
  Info,
  Layers,
  Lightbulb,
  List,
  Loader2,
  Play,
  Save,
  Upload,
  Volume2,
  X,
  XCircle,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { RichTextRenderer } from '../RichTextRenderer';
import { extractPlainText } from '../../../utils/richText';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../Tabs';
import { Button } from '../Button';
import { toast } from '../Toast';
import { supabase } from '../../../lib/supabase';
import { MarkingSimulationPanel } from './MarkingSimulationPanel';
import {
  BiologyAdapter,
  MathematicsAdapter,
  PhysicsAdapter,
  SubjectAdapter,
  ComplianceMessage,
} from './SubjectAdaptation';

// ============================================================================
// Type Definitions
// ============================================================================

export type QuestionMode = 'review' | 'simulation' | 'student';
export type QuestionSubject = 'physics' | 'chemistry' | 'biology' | 'mathematics';

export interface AnswerAlternative {
  answer: string;
  marks?: number;
  acceptable_variations?: string[];
  linked_alternatives?: number[];
  alternative_id?: number;
  alternative_type?:
    | 'structure_function_pair'
    | 'method'
    | 'band'
    | 'ora'
    | 'owtte'
    | string;
  context?: { type: string; value: string; label?: string };
  tolerance?: { abs?: number; pct?: number };
  units?: string;
  flags?: {
    ecf?: boolean;
    ora?: boolean;
    owtte?: boolean;
    ignore_case?: boolean;
  };
}

export interface QuestionPart {
  part?: string;
  question_text: string;
  answer_format:
    | 'single_line'
    | 'multi_line'
    | 'mcq_single'
    | 'mcq_multi'
    | 'true_false'
    | 'numerical'
    | 'fill_blank'
    | 'diagram_label'
    | 'structured';
  marks: number;
  correct_answers: AnswerAlternative[];
  hint?: string;
  explanation?: string;
  working_steps?: any[];
  meta?: Record<string, any>;
}

export interface QuestionData {
  id?: string;
  question_number?: string;
  type?:
    | 'mcq'
    | 'true_false'
    | 'fill_blank'
    | 'numerical'
    | 'structured'
    | 'diagram_label'
    | 'graph'
    | 'practical';
  subject?: QuestionSubject;
  topic?: string;
  subtopic?: string;
  exam_board?: string;
  paper_code?: string;
  year?: number;
  marks?: number;
  attachments?: { id?: string; name: string; url: string; type: string; size?: number }[];
  parts?: QuestionPart[];
  meta?: Record<string, any>;
  question_text?: string;
  correct_answers?: AnswerAlternative[];
  options?: { label: string; text: string; is_correct?: boolean }[];
  hint?: string;
  explanation?: string;
}

export type PartResponse =
  | { type: 'mcq_single'; value: string }
  | { type: 'mcq_multi'; value: string[] }
  | { type: 'true_false'; value: boolean }
  | { type: 'fill_blank'; value: string[] }
  | { type: 'numerical'; value: { value: number | null; units?: string } }
  | { type: 'diagram_label'; value: Record<string, string> }
  | { type: 'structured'; value: Record<string, string | number> }
  | { type: 'multi_line' | 'single_line'; value: string };

export interface UserResponse {
  questionId?: string;
  parts: { part?: string; response: PartResponse }[];
}

export interface ValidationReport {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface UploadedAttachment {
  id?: string;
  name: string;
  url: string;
  type: string;
  size?: number;
}

export interface QuestionViewerProps {
  question: QuestionData;
  mode: QuestionMode;
  subject?: QuestionSubject;
  examBoard?: 'cambridge' | 'edexcel' | string;
  editable?: boolean;
  onUpdate?: (updated: QuestionData) => void;
  onAnswerChange?: (response: UserResponse) => void;
  onValidate?: (report: ValidationReport) => void;
  onAttachmentsChange?: (files: UploadedAttachment[]) => void;
  onRevealMarkScheme?: () => void;
  className?: string;
}

interface PartEvaluationResult {
  correct: boolean;
  earnedMarks: number;
  feedback?: string;
  alternatives?: string[];
}

interface AnswerAreaProps {
  question: QuestionData;
  parts: QuestionPart[];
  responses: UserResponse;
  onChange: (index: number, response: PartResponse) => void;
  mode: QuestionMode;
  showCorrectAnswers: boolean;
  evaluations: PartEvaluationResult[];
  submitted: boolean;
  subject?: QuestionSubject | string;
  disableInputs?: boolean;
}

interface ComplianceSummaryProps {
  messages: ComplianceMessage[];
}

// ============================================================================
// Helpers
// ============================================================================

const QUESTION_ATTACHMENT_BUCKET = 'question-attachments';

const normalizeText = (value: string) =>
  extractPlainText(value)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');

const ensureParts = (question: QuestionData): QuestionPart[] => {
  if (question.parts && question.parts.length > 0) {
    return question.parts.map((part, index) => ({
      part: part.part || String.fromCharCode(97 + index),
      ...part,
    }));
  }

  return [
    {
      part: 'a',
      question_text: question.question_text || '',
      answer_format:
        question.type === 'mcq'
          ? 'mcq_single'
          : question.type === 'true_false'
          ? 'true_false'
          : question.type === 'numerical'
          ? 'numerical'
          : question.type === 'diagram_label'
          ? 'diagram_label'
          : 'multi_line',
      marks: question.marks || 0,
      correct_answers: question.correct_answers || [],
      hint: question.hint,
      explanation: question.explanation,
      meta: question.meta || {},
    },
  ];
};

const deriveInitialResponses = (question: QuestionData): UserResponse => {
  const parts = ensureParts(question);

  return {
    questionId: question.id,
    parts: parts.map((part) => {
      switch (part.answer_format) {
        case 'mcq_single':
          return { part: part.part, response: { type: 'mcq_single', value: '' } };
        case 'mcq_multi':
          return { part: part.part, response: { type: 'mcq_multi', value: [] } };
        case 'true_false':
          return { part: part.part, response: { type: 'true_false', value: false } };
        case 'fill_blank':
          return {
            part: part.part,
            response: {
              type: 'fill_blank',
              value: part.correct_answers?.map(() => '') || [''],
            },
          };
        case 'numerical':
          return {
            part: part.part,
            response: { type: 'numerical', value: { value: null, units: '' } },
          };
        case 'diagram_label':
          return {
            part: part.part,
            response: { type: 'diagram_label', value: {} },
          };
        case 'structured':
          return {
            part: part.part,
            response: { type: 'structured', value: {} },
          };
        case 'single_line':
        case 'multi_line':
        default:
          return {
            part: part.part,
            response: { type: part.answer_format, value: '' },
          };
      }
    }),
  };
};

const getPartOptions = (question: QuestionData, part: QuestionPart) => {
  const explicitOptions = part.meta?.options || question.meta?.options;
  if (explicitOptions && Array.isArray(explicitOptions)) {
    return explicitOptions;
  }

  if (question.options && question.options.length > 0) {
    return question.options;
  }

  if (part.correct_answers?.length) {
    return part.correct_answers.map((alt, index) => ({
      label: String.fromCharCode(65 + index),
      text: alt.answer,
      is_correct: index === 0,
    }));
  }

  return [];
};

const mapAnswerFormatToResponseType = (
  part: QuestionPart,
): PartResponse['type'] => {
  switch (part.answer_format) {
    case 'mcq_single':
      return 'mcq_single';
    case 'mcq_multi':
      return 'mcq_multi';
    case 'true_false':
      return 'true_false';
    case 'fill_blank':
      return 'fill_blank';
    case 'numerical':
      return 'numerical';
    case 'diagram_label':
      return 'diagram_label';
    case 'structured':
      return 'structured';
    case 'single_line':
      return 'single_line';
    case 'multi_line':
    default:
      return 'multi_line';
  }
};

const computeValidationReport = (
  question: QuestionData,
  subject?: QuestionSubject | string,
  examBoard?: string,
): ValidationReport & { compliance: ComplianceMessage[] } => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const compliance: ComplianceMessage[] = [];

  if (!question.question_text && !(question.parts && question.parts.length > 0)) {
    errors.push('Question stem is required.');
  }

  const parts = ensureParts(question);
  const totalMarks = parts.reduce((sum, part) => sum + (part.marks || 0), 0);
  if ((question.marks || 0) !== totalMarks) {
    warnings.push(
      `Total marks (${question.marks || 0}) do not match sum of parts (${totalMarks}).`,
    );
  }

  parts.forEach((part, index) => {
    if (!part.question_text) {
      errors.push(`Part ${part.part || index + 1} is missing a question stem.`);
    }
    if (!part.marks && part.marks !== 0) {
      warnings.push(`Part ${part.part || index + 1} does not have marks assigned.`);
    }
    if (!part.correct_answers || part.correct_answers.length === 0) {
      warnings.push(`Part ${part.part || index + 1} has no correct answers configured.`);
    }

    if (subject) {
      part.correct_answers?.forEach((answer) => {
        compliance.push(
          ...SubjectAdapter.getComplianceMessages(
            subject,
            answer,
            examBoard,
            part.marks,
          ),
        );
      });
    }

    if (subject?.includes('physics') && part.answer_format === 'numerical') {
      const expectsUnits = part.correct_answers?.some((ans) => ans.units);
      if (!expectsUnits) {
        warnings.push(
          `Physics numerical part ${part.part || index + 1} is missing required units in the answer configuration.`,
        );
      }
    }

    if (subject?.includes('mathematics') && part.answer_format === 'numerical') {
      const hasTolerance = part.correct_answers?.some(
        (ans) => ans.tolerance?.abs !== undefined || ans.tolerance?.pct !== undefined,
      );
      if (!hasTolerance) {
        warnings.push(
          `Mathematics numerical part ${part.part || index + 1} should define tolerance or significant figure expectations.`,
        );
      }
    }

    if (
      subject?.includes('biology') &&
      part.answer_format === 'diagram_label' &&
      (!question.attachments || question.attachments.length === 0)
    ) {
      warnings.push(
        `Biology diagram label part ${part.part || index + 1} should include a labelled diagram attachment.`,
      );
    }

    if (subject?.includes('chemistry')) {
      const hasObservation = part.correct_answers?.some((answer) =>
        answer.context?.type === 'observation',
      );
      if (hasObservation && !part.meta?.safety) {
        warnings.push(
          `Chemistry part ${part.part || index + 1} includes observations but no safety notes in metadata.`,
        );
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    compliance,
  };
};

const evaluatePart = (
  part: QuestionPart,
  response: PartResponse,
  subject?: QuestionSubject | string,
): PartEvaluationResult => {
  if (!response) {
    return { correct: false, earnedMarks: 0 };
  }

  const alternatives = part.correct_answers || [];
  const marksForPart = part.marks || 0;

  const baseFeedback = (isCorrect: boolean) =>
    isCorrect ? 'Correct response' : 'Review the mark scheme';

  switch (response.type) {
    case 'mcq_single': {
      const userValue = normalizeText(response.value || '');
      const match = alternatives.find((alt) => {
        const canonical = normalizeText(alt.answer);
        if (userValue === canonical) return true;
        if (alt.acceptable_variations) {
          return alt.acceptable_variations.some(
            (variation) => normalizeText(variation) === userValue,
          );
        }
        return false;
      });
      return {
        correct: Boolean(match),
        earnedMarks: match ? marksForPart : 0,
        feedback: baseFeedback(Boolean(match)),
        alternatives: match?.acceptable_variations,
      };
    }
    case 'mcq_multi': {
      const userValues = (response.value || []).map(normalizeText);
      const correctSet = new Set(
        alternatives.map((alt) => normalizeText(alt.answer)),
      );
      const correctCount = userValues.filter((value) => correctSet.has(value)).length;
      const allCorrect =
        correctCount === correctSet.size && userValues.length === correctSet.size;
      const partialMarks = correctSet.size
        ? Math.floor((marksForPart * correctCount) / correctSet.size)
        : 0;
      return {
        correct: allCorrect,
        earnedMarks: allCorrect ? marksForPart : partialMarks,
        feedback: allCorrect ? 'All correct options selected' : 'Partial credit awarded',
      };
    }
    case 'true_false': {
      const truthyAnswers = alternatives.map((alt) => normalizeText(alt.answer));
      const expected = truthyAnswers.includes('true');
      const isCorrect = Boolean(response.value) === expected;
      return {
        correct: isCorrect,
        earnedMarks: isCorrect ? marksForPart : 0,
        feedback: baseFeedback(isCorrect),
      };
    }
    case 'fill_blank': {
      const userValues = response.value || [];
      const correctValues = alternatives.map((alt) => normalizeText(alt.answer));
      const matches = userValues.filter((value, index) => {
        const normalized = normalizeText(value || '');
        const acceptable = alternatives[index]?.acceptable_variations?.map(normalizeText) || [];
        return normalized === correctValues[index] || acceptable.includes(normalized);
      });
      const allCorrect = matches.length === correctValues.length;
      const partialMarks = correctValues.length
        ? Math.floor((marksForPart * matches.length) / correctValues.length)
        : 0;
      return {
        correct: allCorrect,
        earnedMarks: allCorrect ? marksForPart : partialMarks,
        feedback: allCorrect ? 'All blanks correct' : 'Check blanks highlighted',
      };
    }
    case 'numerical': {
      const userValue = response.value?.value;
      if (userValue === null || userValue === undefined) {
        return { correct: false, earnedMarks: 0, feedback: 'Enter a value' };
      }
      const bestAlternative = alternatives[0];
      if (!bestAlternative) {
        return { correct: false, earnedMarks: 0 };
      }

      if (subject?.includes('physics')) {
        const result = PhysicsAdapter.validateNumericalAnswer(
          userValue,
          response.value?.units || '',
          bestAlternative,
        );
        return {
          correct: result.isValid,
          earnedMarks: result.isValid ? marksForPart : 0,
          feedback: result.feedback,
        };
      }

      if (subject?.includes('math')) {
        const result = MathematicsAdapter.validateNumericalPrecision(
          userValue,
          parseFloat(extractPlainText(bestAlternative.answer)),
          bestAlternative.tolerance,
          part.meta?.significantFigures,
        );
        return {
          correct: result.isValid,
          earnedMarks: result.isValid ? marksForPart : 0,
          feedback: result.feedback,
        };
      }

      const numericAnswer = parseFloat(extractPlainText(bestAlternative.answer));
      const tolerance = bestAlternative.tolerance;
      let isValid = userValue === numericAnswer;
      if (tolerance?.abs !== undefined) {
        isValid = Math.abs(userValue - numericAnswer) <= tolerance.abs;
      }
      if (tolerance?.pct !== undefined) {
        const pctDiff = Math.abs((userValue - numericAnswer) / numericAnswer) * 100;
        isValid = pctDiff <= tolerance.pct;
      }

      return {
        correct: isValid,
        earnedMarks: isValid ? marksForPart : 0,
        feedback: isValid ? 'Answer within tolerance' : 'Outside tolerance',
      };
    }
    case 'diagram_label': {
      const valueMap = response.value || {};
      const totalLabels = Object.keys(valueMap).length;
      let correctCount = 0;
      Object.entries(valueMap).forEach(([label, value]) => {
        const alt = alternatives.find((answer) =>
          normalizeText(answer.context?.value || answer.answer) === normalizeText(label),
        );
        if (!alt) return;
        const expected = normalizeText(alt.answer);
        const acceptable = alt.acceptable_variations?.map(normalizeText) || [];
        const normalizedValue = normalizeText(value);
        if (normalizedValue === expected || acceptable.includes(normalizedValue)) {
          correctCount += 1;
        } else if (subject?.includes('biology')) {
          const check = BiologyAdapter.validateDiagramLabel(value, alt.answer);
          if (check.isValid) {
            correctCount += 1;
          }
        }
      });
      const allCorrect = totalLabels > 0 && correctCount === totalLabels;
      const partialMarks = totalLabels
        ? Math.floor((marksForPart * correctCount) / totalLabels)
        : 0;
      return {
        correct: allCorrect,
        earnedMarks: allCorrect ? marksForPart : partialMarks,
        feedback: allCorrect ? 'All labels correct' : 'Partial labels correct',
      };
    }
    case 'structured': {
      const structuredResponses = response.value || {};
      const keys = Object.keys(structuredResponses);
      const totalKeys = keys.length;
      let correctCount = 0;
      keys.forEach((key) => {
        const alt = alternatives.find((answer) => answer.context?.value === key);
        const userValue = structuredResponses[key];
        if (!alt || userValue === undefined || userValue === null) return;
        const normalized = normalizeText(String(userValue));
        const canonical = normalizeText(alt.answer);
        const acceptable = alt.acceptable_variations?.map(normalizeText) || [];
        if (normalized === canonical || acceptable.includes(normalized)) {
          correctCount += 1;
        }
      });
      const allCorrect = totalKeys > 0 && correctCount === totalKeys;
      const partialMarks = totalKeys
        ? Math.floor((marksForPart * correctCount) / totalKeys)
        : 0;
      return {
        correct: allCorrect,
        earnedMarks: allCorrect ? marksForPart : partialMarks,
        feedback: allCorrect ? 'All parts correct' : 'Partial credit awarded',
      };
    }
    case 'single_line':
    case 'multi_line':
    default: {
      const userValue = normalizeText(response.value || '');
      const alt = alternatives[0];
      if (!alt) {
        return { correct: false, earnedMarks: 0 };
      }
      const canonical = normalizeText(alt.answer);
      const acceptable = alt.acceptable_variations?.map(normalizeText) || [];
      const subjectResult = subject
        ? SubjectAdapter.validateAnswer(subject, userValue, alt, alt.context)
        : null;
      const isCorrect = subjectResult
        ? subjectResult.isValid
        : userValue === canonical || acceptable.includes(userValue);
      return {
        correct: isCorrect,
        earnedMarks: isCorrect ? marksForPart : 0,
        feedback: subjectResult?.feedback || baseFeedback(isCorrect),
        alternatives: subjectResult?.alternatives,
      };
    }
  }
};

// ============================================================================
// Internal Components
// ============================================================================

const QuestionHeader: React.FC<{
  question: QuestionData;
  mode: QuestionMode;
}> = ({ question, mode }) => {
  const getQuestionTypeIcon = () => {
    switch (question.type) {
      case 'mcq':
        return <List className="h-5 w-5 text-blue-600 dark:text-blue-300" />;
      case 'numerical':
        return <Calculator className="h-5 w-5 text-green-600 dark:text-green-300" />;
      case 'diagram_label':
        return <ImageIcon className="h-5 w-5 text-purple-600 dark:text-purple-300" />;
      case 'graph':
        return <LineGraphIcon />;
      default:
        return <FileText className="h-5 w-5 text-gray-600 dark:text-gray-300" />;
    }
  };

  const getSubjectBadgeColor = (subject?: string) => {
    const subj = subject?.toLowerCase() || '';
    if (subj.includes('physics')) return 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200';
    if (subj.includes('chemistry')) return 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-200';
    if (subj.includes('biology')) return 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-200';
    if (subj.includes('math')) return 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-200';
    return 'bg-gray-100 dark:bg-gray-900/40 text-gray-700 dark:text-gray-300';
  };

  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-200 dark:border-gray-700 pb-4">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-gray-100 dark:bg-gray-900 p-2">{getQuestionTypeIcon()}</div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Question {question.question_number || question.id || '—'}
            </h3>
            {question.subject && (
              <span
                className={cn(
                  'text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full',
                  getSubjectBadgeColor(question.subject),
                )}
              >
                {question.subject}
              </span>
            )}
            {question.exam_board && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-200">
                {question.exam_board}
              </span>
            )}
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200">
              {mode === 'review' ? 'Review' : mode === 'simulation' ? 'Simulation' : 'Student'} Mode
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
            {question.topic && <span>Topic: {question.topic}</span>}
            {question.subtopic && (
              <span className="flex items-center gap-1">
                <ArrowRight className="h-3 w-3" /> {question.subtopic}
              </span>
            )}
            {question.paper_code && <span>Paper: {question.paper_code}</span>}
            {question.year && <span>Year: {question.year}</span>}
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-2xl font-bold text-blue-600 dark:text-blue-300">
          {question.marks ?? ensureParts(question).reduce((sum, part) => sum + (part.marks || 0), 0)}
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-400">mark{(question.marks || 0) === 1 ? '' : 's'}</div>
      </div>
    </div>
  );
};

const LineGraphIcon = () => (
  <svg
    className="h-5 w-5 text-indigo-600 dark:text-indigo-300"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 3v18h18" />
    <polyline points="4 16 9 11 13 15 21 7" />
  </svg>
);

const QuestionBody: React.FC<{
  question: QuestionData;
  parts: QuestionPart[];
}> = ({ question, parts }) => {
  return (
    <div className="space-y-6">
      {question.question_text && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-2">
            <BookOpen className="h-4 w-4" /> Question Stem
          </h4>
          <RichTextRenderer
            value={question.question_text}
            className="text-sm leading-relaxed text-gray-900 dark:text-gray-100"
          />
        </div>
      )}

      {parts.length > 1 && (
        <div className="space-y-4">
          {parts.map((part, index) => (
            <div
              key={`${part.part}-${index}`}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-blue-600 dark:text-blue-300">
                      Part {part.part || String.fromCharCode(97 + index)}
                    </span>
                    <span className="rounded bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 text-xs text-blue-700 dark:text-blue-200">
                      {part.answer_format.replace('_', ' ')}
                    </span>
                  </div>
                  <RichTextRenderer
                    value={part.question_text}
                    className="mt-2 text-sm text-gray-700 dark:text-gray-200"
                  />
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-600 dark:text-blue-300">{part.marks}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">mark{part.marks === 1 ? '' : 's'}</div>
                </div>
              </div>
              {part.hint && (
                <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3 text-xs text-amber-800 dark:text-amber-200">
                  <Lightbulb className="mt-0.5 h-4 w-4" />
                  <span>{part.hint}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const AttachmentsPanel: React.FC<{
  attachments: UploadedAttachment[];
  mode: QuestionMode;
  editable: boolean;
  onUpload?: (files: File[]) => Promise<void>;
  onRemove?: (attachmentId: string) => void;
}> = ({ attachments, mode, editable, onUpload, onRemove }) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.type === 'dragenter' || event.type === 'dragover') {
      setDragActive(true);
    } else if (event.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    async (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setDragActive(false);

      if (!onUpload || !editable) return;

      const files = Array.from(event.dataTransfer.files || []);
      if (!files.length) return;

      try {
        setUploading(true);
        await onUpload(files);
      } finally {
        setUploading(false);
      }
    },
    [editable, onUpload],
  );

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!onUpload || !editable) return;
      const files = Array.from(event.target.files || []);
      if (!files.length) return;

      try {
        setUploading(true);
        await onUpload(files);
      } finally {
        setUploading(false);
      }
    },
    [editable, onUpload],
  );

  const renderFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="h-5 w-5" />;
    if (type.startsWith('audio/')) return <Volume2 className="h-5 w-5" />;
    if (type.startsWith('video/')) return <Film className="h-5 w-5" />;
    if (type === 'application/pdf') return <File className="h-5 w-5" />;
    return <FileText className="h-5 w-5" />;
  };

  const formatFileSize = (size?: number) => {
    if (!size) return '';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {mode === 'review' && editable && (
        <div
          className={cn(
            'rounded-lg border-2 border-dashed p-6 text-center transition-colors',
            dragActive
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500',
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="mx-auto mb-3 h-8 w-8 text-gray-400" />
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Drag and drop files here, or
            <button
              type="button"
              className="mx-1 font-semibold text-blue-600 underline"
              onClick={() => fileInputRef.current?.click()}
            >
              browse
            </button>
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Supported: Images, PDF, Audio, Video. Max 25MB per file.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            accept="image/*,application/pdf,audio/*,video/*"
            onChange={handleFileSelect}
          />
          {uploading && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-100">
              <Loader2 className="h-3 w-3 animate-spin" /> Uploading...
            </div>
          )}
        </div>
      )}

      {attachments.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {attachments.map((attachment, index) => {
            const isImage = attachment.type.startsWith('image/');
            return (
              <div
                key={attachment.id || `${attachment.name}-${index}`}
                className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-900"
              >
                <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded bg-gray-100 dark:bg-gray-800">
                  {isImage ? (
                    <img
                      src={attachment.url}
                      alt={attachment.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-500 dark:text-gray-300">
                      {renderFileIcon(attachment.type)}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {attachment.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {attachment.type} {formatFileSize(attachment.size)}
                  </p>
                  <div className="mt-2 flex gap-2 text-xs">
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-300"
                    >
                      <Eye className="h-3 w-3" /> View
                    </a>
                    <a
                      href={attachment.url}
                      download={attachment.name}
                      className="inline-flex items-center gap-1 text-gray-600 hover:underline dark:text-gray-300"
                    >
                      <DownloadIcon /> Download
                    </a>
                  </div>
                </div>
                {mode === 'review' && editable && onRemove && (
                  <button
                    type="button"
                    onClick={() => onRemove(attachment.id || `${index}`)}
                    className="rounded-full p-1 text-gray-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30"
                    aria-label="Remove attachment"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-600 dark:text-gray-400">
          No attachments linked.
        </div>
      )}
    </div>
  );
};

const DownloadIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className="h-3 w-3"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" x2="12" y1="3" y2="15" />
  </svg>
);

const MCQViewer: React.FC<{
  part: QuestionPart;
  response: Extract<PartResponse, { type: 'mcq_single' | 'mcq_multi' }>;
  options: { label: string; text: string; is_correct?: boolean }[];
  onChange: (value: string | string[]) => void;
  readOnly?: boolean;
  allowMultiple: boolean;
}> = ({ part, response, options, onChange, readOnly, allowMultiple }) => {
  const shuffle = part.meta?.shuffle === true;
  const preparedOptions = useMemo(() => {
    const withPlain = options.map((option, index) => ({
      ...option,
      plainText:
        extractPlainText(option.text) || option.label || String.fromCharCode(65 + index),
    }));
    if (!shuffle) return withPlain;
    return [...withPlain].sort(() => Math.random() - 0.5);
  }, [options, shuffle]);

  const isSelected = (value: string) => {
    if (response.type === 'mcq_single') {
      return normalizeText(response.value) === normalizeText(value);
    }
    return response.value.map(normalizeText).includes(normalizeText(value));
  };

  const toggleValue = (value: string) => {
    if (readOnly) return;
    if (response.type === 'mcq_single') {
      onChange(value);
    } else {
      const exists = response.value.map(normalizeText).includes(normalizeText(value));
      const next = exists
        ? response.value.filter((option) => normalizeText(option) !== normalizeText(value))
        : [...response.value, value];
      onChange(next);
    }
  };

  return (
    <div className="grid gap-2">
      {preparedOptions.map((option, index) => (
        <button
          key={`${option.label}-${index}`}
          type="button"
          className={cn(
            'flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left text-sm transition',
            isSelected(option.plainText)
              ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-100'
              : 'border-gray-200 bg-white hover:border-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-blue-600',
            readOnly && 'pointer-events-none opacity-80',
          )}
          onClick={() => toggleValue(option.plainText)}
          aria-pressed={isSelected(option.plainText)}
        >
          <span className="flex items-center gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-current text-xs font-semibold">
              {option.label}
            </span>
            <RichTextRenderer value={option.text} className="text-sm" />
          </span>
          {allowMultiple && (
            <span className="text-[10px] uppercase tracking-wide text-gray-400">Multi</span>
          )}
        </button>
      ))}
    </div>
  );
};

const TrueFalseViewer: React.FC<{
  response: Extract<PartResponse, { type: 'true_false' }>;
  onChange: (value: boolean) => void;
  readOnly?: boolean;
}> = ({ response, onChange, readOnly }) => (
  <div className="flex gap-3">
    {[{ label: 'True', value: true }, { label: 'False', value: false }].map((option) => (
      <button
        key={option.label}
        type="button"
        className={cn(
          'flex-1 rounded-lg border px-4 py-3 text-sm font-semibold transition',
          response.value === option.value
            ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-100'
            : 'border-gray-200 bg-white hover:border-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-blue-600',
          readOnly && 'pointer-events-none opacity-80',
        )}
        onClick={() => !readOnly && onChange(option.value)}
      >
        {option.label}
      </button>
    ))}
  </div>
);

const FillBlankViewer: React.FC<{
  part: QuestionPart;
  response: Extract<PartResponse, { type: 'fill_blank' }>;
  onChange: (value: string[]) => void;
  readOnly?: boolean;
}> = ({ part, response, onChange, readOnly }) => {
  const placeholders = part.correct_answers?.map((answer, index) =>
    answer.context?.label || `Blank ${index + 1}`,
  );

  return (
    <div className="space-y-3">
      {(response.value || []).map((value, index) => (
        <input
          key={index}
          type="text"
          value={value}
          placeholder={placeholders?.[index] || `Blank ${index + 1}`}
          onChange={(event) => {
            const next = [...response.value];
            next[index] = event.target.value;
            onChange(next);
          }}
          readOnly={readOnly}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        />
      ))}
    </div>
  );
};

const NumericalViewer: React.FC<{
  part: QuestionPart;
  response: Extract<PartResponse, { type: 'numerical' }>;
  onChange: (value: { value: number | null; units?: string }) => void;
  readOnly?: boolean;
}> = ({ part, response, onChange, readOnly }) => {
  const handleValueChange = (value: string) => {
    const parsed = value === '' ? null : Number(value);
    onChange({ ...response.value, value: parsed });
  };

  const handleUnitsChange = (value: string) => {
    onChange({ ...response.value, units: value });
  };

  const units = part.correct_answers?.[0]?.units || part.meta?.units;

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center">
      <input
        type="number"
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 md:flex-1"
        value={response.value.value ?? ''}
        onChange={(event) => handleValueChange(event.target.value)}
        placeholder="Enter value"
        readOnly={readOnly}
      />
      <div className="flex items-center gap-2 md:w-48">
        <span className="text-xs uppercase text-gray-500 dark:text-gray-400">Units</span>
        <input
          type="text"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          value={response.value.units ?? ''}
          onChange={(event) => handleUnitsChange(event.target.value)}
          placeholder={units || '—'}
          readOnly={readOnly}
        />
      </div>
    </div>
  );
};

const StructuredViewer: React.FC<{
  part: QuestionPart;
  response: Extract<PartResponse, { type: 'structured' }>;
  onChange: (value: Record<string, string | number>) => void;
  readOnly?: boolean;
}> = ({ part, response, onChange, readOnly }) => {
  const fields = part.correct_answers?.map((answer, index) => ({
    key: answer.context?.value || `field_${index + 1}`,
    label: answer.context?.label || answer.context?.value || `Field ${index + 1}`,
    type: answer.context?.type || 'text',
  }));

  return (
    <div className="space-y-3">
      {(fields || []).map((field) => (
        <div key={field.key} className="space-y-1">
          <label className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
            {field.label}
          </label>
          <input
            type={field.type === 'number' ? 'number' : 'text'}
            value={response.value[field.key] ?? ''}
            onChange={(event) => {
              onChange({ ...response.value, [field.key]: event.target.value });
            }}
            readOnly={readOnly}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
        </div>
      ))}
    </div>
  );
};

const DiagramLabelViewer: React.FC<{
  part: QuestionPart;
  response: Extract<PartResponse, { type: 'diagram_label' }>;
  onChange: (value: Record<string, string>) => void;
  readOnly?: boolean;
}> = ({ part, response, onChange, readOnly }) => {
  const labels = part.meta?.labels || part.correct_answers?.map((answer) => answer.context?.value);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300">
        Diagram interactive labelling coming soon. Use table below to assign labels.
      </div>
      <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900/60">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
                Label
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
                Your answer
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
            {(labels || []).map((label, index) => (
              <tr key={`${label}-${index}`}>
                <td className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                  {label || String.fromCharCode(65 + index)}
                </td>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    value={response.value[label || String.fromCharCode(65 + index)] || ''}
                    onChange={(event) =>
                      onChange({
                        ...response.value,
                        [label || String.fromCharCode(65 + index)]: event.target.value,
                      })
                    }
                    readOnly={readOnly}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const TextResponseViewer: React.FC<{
  response: Extract<PartResponse, { type: 'single_line' | 'multi_line' }>;
  onChange: (value: string) => void;
  readOnly?: boolean;
  multiline?: boolean;
}> = ({ response, onChange, readOnly, multiline }) => (
  multiline ? (
    <textarea
      value={response.value}
      onChange={(event) => onChange(event.target.value)}
      readOnly={readOnly}
      rows={5}
      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
    />
  ) : (
    <input
      type="text"
      value={response.value}
      onChange={(event) => onChange(event.target.value)}
      readOnly={readOnly}
      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
    />
  )
);

const AnswerArea: React.FC<AnswerAreaProps> = ({
  question,
  parts,
  responses,
  onChange,
  mode,
  showCorrectAnswers,
  evaluations,
  submitted,
  subject,
  disableInputs,
}) => {
  return (
    <div className="space-y-6">
      {parts.map((part, index) => {
        const responseWrapper = responses.parts[index];
        const response = responseWrapper?.response;
        const evaluation = evaluations[index];
        const readOnly = disableInputs || mode === 'review';

        return (
          <div
            key={`${part.part || index}-${part.answer_format}-${index}`}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition dark:border-gray-700 dark:bg-gray-900"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">
                  Part {part.part || String.fromCharCode(97 + index)}
                  <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] text-blue-700 dark:bg-blue-900/40 dark:text-blue-100">
                    {part.answer_format.replace('_', ' ')}
                  </span>
                </div>
                <RichTextRenderer
                  value={part.question_text}
                  className="mt-2 text-sm text-gray-800 dark:text-gray-200"
                />
                {part.hint && (
                  <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
                    <Lightbulb className="h-3 w-3" /> Hint available
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-blue-600 dark:text-blue-300">{part.marks}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">mark{part.marks === 1 ? '' : 's'}</div>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              {response?.type === 'mcq_single' || response?.type === 'mcq_multi' ? (
                <MCQViewer
                  part={part}
                  response={response as Extract<PartResponse, { type: 'mcq_single' | 'mcq_multi' }>}
                  options={getPartOptions(question, part)}
                  onChange={(value) =>
                    onChange(
                      index,
                      response.type === 'mcq_single'
                        ? ({ type: 'mcq_single', value: value as string } as PartResponse)
                        : ({ type: 'mcq_multi', value: value as string[] } as PartResponse),
                    )
                  }
                  readOnly={readOnly}
                  allowMultiple={response.type === 'mcq_multi'}
                />
              ) : response?.type === 'true_false' ? (
                <TrueFalseViewer
                  response={response as Extract<PartResponse, { type: 'true_false' }>}
                  onChange={(value) =>
                    onChange(index, { type: 'true_false', value } as PartResponse)
                  }
                  readOnly={readOnly}
                />
              ) : response?.type === 'fill_blank' ? (
                <FillBlankViewer
                  part={part}
                  response={response as Extract<PartResponse, { type: 'fill_blank' }>}
                  onChange={(value) =>
                    onChange(index, { type: 'fill_blank', value } as PartResponse)
                  }
                  readOnly={readOnly}
                />
              ) : response?.type === 'numerical' ? (
                <NumericalViewer
                  part={part}
                  response={response as Extract<PartResponse, { type: 'numerical' }>}
                  onChange={(value) =>
                    onChange(index, { type: 'numerical', value } as PartResponse)
                  }
                  readOnly={readOnly}
                />
              ) : response?.type === 'diagram_label' ? (
                <DiagramLabelViewer
                  part={part}
                  response={response as Extract<PartResponse, { type: 'diagram_label' }>}
                  onChange={(value) =>
                    onChange(index, { type: 'diagram_label', value } as PartResponse)
                  }
                  readOnly={readOnly}
                />
              ) : response?.type === 'structured' ? (
                <StructuredViewer
                  part={part}
                  response={response as Extract<PartResponse, { type: 'structured' }>}
                  onChange={(value) =>
                    onChange(index, { type: 'structured', value } as PartResponse)
                  }
                  readOnly={readOnly}
                />
              ) : response ? (
                <TextResponseViewer
                  response={response as Extract<PartResponse, { type: 'single_line' | 'multi_line' }>}
                  multiline={response.type === 'multi_line'}
                  onChange={(value) =>
                    onChange(index, { type: response.type, value } as PartResponse)
                  }
                  readOnly={readOnly}
                />
              ) : null}

              {mode !== 'review' && submitted && (
                <div
                  className={cn(
                    'rounded-lg border px-4 py-3 text-sm',
                    evaluation?.correct
                      ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-200'
                      : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200',
                  )}
                >
                  <div className="flex items-center gap-2">
                    {evaluation?.correct ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    <span>{evaluation?.feedback || (evaluation?.correct ? 'Correct' : 'Incorrect')}</span>
                  </div>
                  {showCorrectAnswers && part.explanation && (
                    <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                      {part.explanation}
                    </p>
                  )}
                  {showCorrectAnswers && !part.explanation && part.correct_answers?.length > 0 && (
                    <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                      Mark scheme: {part.correct_answers[0].answer}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const ComplianceSummary: React.FC<ComplianceSummaryProps> = ({ messages }) => {
  if (!messages.length) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
        Subject-specific compliance looks good.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {messages.map((message, index) => (
        <div
          key={`${message.type}-${index}`}
          className={cn(
            'rounded-lg border p-3 text-sm',
            message.type === 'error'
              ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200'
              : message.type === 'warning'
              ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200'
              : 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-200',
          )}
        >
          <div className="flex items-center gap-2">
            {message.type === 'error' ? (
              <XCircle className="h-4 w-4" />
            ) : message.type === 'warning' ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <Info className="h-4 w-4" />
            )}
            <span className="font-semibold capitalize">{message.type}</span>
            {message.field && (
              <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] uppercase tracking-wide text-current">
                {message.field}
              </span>
            )}
          </div>
          <p className="mt-2 text-xs text-inherit/90">{message.message}</p>
        </div>
      ))}
    </div>
  );
};

const AnswerStructureEditorBridge: React.FC<{
  question: QuestionData;
  onUpdate?: (updated: QuestionData) => void;
}> = ({ question, onUpdate }) => {
  const [jsonValue, setJsonValue] = useState(() => JSON.stringify(question.parts || [], null, 2));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setJsonValue(JSON.stringify(question.parts || [], null, 2));
  }, [question.parts]);

  const handleBlur = () => {
    try {
      const parsed = JSON.parse(jsonValue);
      setError(null);
      onUpdate?.({ ...question, parts: parsed });
    } catch (parseError: any) {
      setError('Invalid JSON structure. Please check formatting.');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
        <Layers className="h-4 w-4" /> Answer Structure Editor
      </div>
      <textarea
        value={jsonValue}
        onChange={(event) => setJsonValue(event.target.value)}
        onBlur={handleBlur}
        rows={12}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-xs leading-relaxed shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
      />
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Paste or edit JSON structure for parts. Visual editor integration can replace this bridge when the production component is available.
      </p>
    </div>
  );
};

const ContextValidatorBridge: React.FC<{
  question: QuestionData;
  subject?: QuestionSubject | string;
  examBoard?: string;
  onValidate?: (report: ValidationReport) => void;
  onMessages?: (messages: ComplianceMessage[]) => void;
}> = ({ question, subject, examBoard, onValidate, onMessages }) => {
  const report = useMemo(
    () => computeValidationReport(question, subject, examBoard),
    [question, subject, examBoard],
  );

  useEffect(() => {
    onValidate?.({ isValid: report.isValid, errors: report.errors, warnings: report.warnings });
  }, [report.isValid, report.errors, report.warnings, onValidate]);

  useEffect(() => {
    onMessages?.(report.compliance);
  }, [report.compliance, onMessages]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-100">
        <div className="flex items-center gap-2 font-semibold">
          <Info className="h-4 w-4" /> Automated validation results
        </div>
        <p className="mt-2 text-xs">
          Validation checks run on every change. Errors do not block saving but should be resolved before publishing.
        </p>
      </div>

      <div className="space-y-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
            <AlertCircle className="h-4 w-4" /> Errors ({report.errors.length})
          </div>
          {report.errors.length ? (
            <ul className="mt-2 space-y-1 text-xs text-red-600 dark:text-red-300">
              {report.errors.map((error, index) => (
                <li key={`error-${index}`}>• {error}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">No blocking errors detected.</p>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
            <Info className="h-4 w-4" /> Warnings ({report.warnings.length})
          </div>
          {report.warnings.length ? (
            <ul className="mt-2 space-y-1 text-xs text-amber-600 dark:text-amber-200">
              {report.warnings.map((warning, index) => (
                <li key={`warning-${index}`}>• {warning}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">No warnings raised.</p>
          )}
        </div>
      </div>
    </div>
  );
};

const ExtractionCompliancePanelBridge: React.FC<{
  messages: ComplianceMessage[];
}> = ({ messages }) => {
  const grouped = useMemo(() => {
    return messages.reduce<Record<string, ComplianceMessage[]>>((acc, message) => {
      const key = message.field || 'general';
      acc[key] = acc[key] || [];
      acc[key].push(message);
      return acc;
    }, {});
  }, [messages]);

  return (
    <div className="space-y-3">
      {Object.entries(grouped).map(([field, fieldMessages]) => (
        <div
          key={field}
          className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
              <Info className="h-4 w-4" /> {field === 'general' ? 'General' : field} guidance
            </div>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-blue-700 dark:bg-blue-900/40 dark:text-blue-100">
              {fieldMessages.length} note{fieldMessages.length === 1 ? '' : 's'}
            </span>
          </div>
          <ul className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-400">
            {fieldMessages.map((message, index) => (
              <li key={`${field}-${index}`}>• {message.message}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// Main QuestionViewer Component
// ============================================================================

export const QuestionViewer: React.FC<QuestionViewerProps> = ({
  question,
  mode,
  subject,
  examBoard,
  editable = true,
  onUpdate,
  onAnswerChange,
  onValidate,
  onAttachmentsChange,
  onRevealMarkScheme,
  className,
}) => {
  const [localQuestion, setLocalQuestion] = useState<QuestionData>(question);
  const [attachments, setAttachments] = useState<UploadedAttachment[]>(question.attachments || []);
  const [activeTab, setActiveTab] = useState<string>('edit');
  const [responses, setResponses] = useState<UserResponse>(() => deriveInitialResponses(question));
  const [evaluations, setEvaluations] = useState<PartEvaluationResult[]>(() => ensureParts(question).map(() => ({ correct: false, earnedMarks: 0 })));
  const [submitted, setSubmitted] = useState(false);
  const [showMarkScheme, setShowMarkScheme] = useState(mode === 'simulation' ? false : false);
  const [earnedMarks, setEarnedMarks] = useState(0);
  const [complianceMessages, setComplianceMessages] = useState<ComplianceMessage[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);

  const effectiveSubject = subject || question.subject;
  const effectiveExamBoard = examBoard || question.exam_board;
  const parts = useMemo(() => ensureParts(localQuestion), [localQuestion]);

  useEffect(() => {
    setLocalQuestion(question);
    setResponses(deriveInitialResponses(question));
    setAttachments(question.attachments || []);
    setSubmitted(false);
    setShowMarkScheme(mode === 'simulation' ? false : false);
    setEvaluations(ensureParts(question).map(() => ({ correct: false, earnedMarks: 0 })));
  }, [question, mode]);

  useEffect(() => {
    onAttachmentsChange?.(attachments);
  }, [attachments, onAttachmentsChange]);

  const totalMarks = useMemo(() => parts.reduce((sum, part) => sum + (part.marks || 0), 0), [parts]);

  const handleQuestionFieldChange = <K extends keyof QuestionData>(key: K, value: QuestionData[K]) => {
    setLocalQuestion((prev) => {
      const next = { ...prev, [key]: value };
      onUpdate?.(next);
      return next;
    });
  };

  const handlePartFieldChange = (index: number, updates: Partial<QuestionPart>) => {
    setLocalQuestion((prev) => {
      const updatedParts = ensureParts(prev).map((part, partIndex) =>
        partIndex === index ? { ...part, ...updates } : part,
      );
      const next = { ...prev, parts: updatedParts };
      onUpdate?.(next);
      return next;
    });
  };

  const handleResponseChange = (index: number, response: PartResponse) => {
    setResponses((prev) => {
      const nextParts = [...prev.parts];
      nextParts[index] = { part: nextParts[index]?.part, response };
      const nextResponse = { ...prev, parts: nextParts };
      onAnswerChange?.(nextResponse);
      return nextResponse;
    });
  };

  const runEvaluation = useCallback(
    (currentResponses: UserResponse) => {
      const results = parts.map((part, index) =>
        evaluatePart(part, currentResponses.parts[index]?.response!, effectiveSubject),
      );
      setEvaluations(results);
      const earned = results.reduce((sum, result) => sum + (result.earnedMarks || 0), 0);
      setEarnedMarks(earned);
      return results;
    },
    [parts, effectiveSubject],
  );

  const handleCheck = () => {
    const results = runEvaluation(responses);
    setSubmitted(true);
    setShowMarkScheme(true);
    toast.info(`Answer checked: ${results.reduce((sum, result) => sum + result.earnedMarks, 0)}/${totalMarks} marks`);
    onRevealMarkScheme?.();
  };

  const handleStudentSubmit = () => {
    runEvaluation(responses);
    setSubmitted(true);
    toast.success('Responses submitted');
  };

  const handleReveal = () => {
    setShowMarkScheme(true);
    onRevealMarkScheme?.();
  };

  const uploadAttachments = async (files: File[]) => {
    setIsUploadingAttachment(true);
    const uploads: UploadedAttachment[] = [];

    for (const file of files) {
      const path = `${localQuestion.id || 'temp'}/${Date.now()}-${file.name}`;
      try {
        const { error } = await supabase.storage
          .from(QUESTION_ATTACHMENT_BUCKET)
          .upload(path, file, {
            upsert: true,
            cacheControl: '3600',
          });

        if (error) {
          console.error('Attachment upload failed', error);
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from(QUESTION_ATTACHMENT_BUCKET)
          .getPublicUrl(path);

        uploads.push({
          id: path,
          name: file.name,
          type: file.type,
          size: file.size,
          url: urlData?.publicUrl || URL.createObjectURL(file),
        });
      } catch (uploadError) {
        console.error('Attachment upload error', uploadError);
        toast.error(`Upload error for ${file.name}`);
      }
    }

    if (uploads.length) {
      setAttachments((prev) => {
        const next = [...prev, ...uploads];
        onAttachmentsChange?.(next);
        onUpdate?.({ ...localQuestion, attachments: next });
        return next;
      });
      toast.success(`${uploads.length} attachment${uploads.length === 1 ? '' : 's'} added`);
    }

    setIsUploadingAttachment(false);
  };

  const removeAttachment = (attachmentId: string) => {
    setAttachments((prev) => {
      const updated = prev.filter((attachment) => (attachment.id || '') !== attachmentId);
      onAttachmentsChange?.(updated);
      onUpdate?.({ ...localQuestion, attachments: updated });
      return updated;
    });
  };

  const validationSummary = computeValidationReport(localQuestion, effectiveSubject, effectiveExamBoard);
  useEffect(() => {
    onValidate?.({
      isValid: validationSummary.isValid,
      errors: validationSummary.errors,
      warnings: validationSummary.warnings,
    });
  }, [validationSummary.isValid, validationSummary.errors, validationSummary.warnings, onValidate]);

  const renderReviewTabs = () => (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="edit">Edit</TabsTrigger>
        <TabsTrigger value="attachments">Attachments</TabsTrigger>
        <TabsTrigger value="preview">Preview</TabsTrigger>
        <TabsTrigger value="validation">Validation</TabsTrigger>
      </TabsList>

      <TabsContent value="edit" className="mt-6 space-y-6">
        <section className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Question number</label>
              <input
                type="text"
                value={localQuestion.question_number || ''}
                onChange={(event) => handleQuestionFieldChange('question_number', event.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Total marks</label>
              <input
                type="number"
                value={localQuestion.marks ?? totalMarks}
                onChange={(event) => handleQuestionFieldChange('marks', Number(event.target.value))}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Question text</label>
            <textarea
              value={localQuestion.question_text || ''}
              onChange={(event) => handleQuestionFieldChange('question_text', event.target.value)}
              rows={5}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>
        </section>

        <section className="space-y-4">
          <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <FileText className="h-4 w-4" /> Answer configuration
          </h4>
          <AnswerStructureEditorBridge question={localQuestion} onUpdate={onUpdate} />
        </section>

        <section className="space-y-4">
          <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <Play className="h-4 w-4" /> Parts overview
          </h4>
          <div className="space-y-4">
            {parts.map((part, index) => (
              <div
                key={`${part.part}-${index}`}
                className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Part label</label>
                    <input
                      type="text"
                      value={part.part || ''}
                      onChange={(event) => handlePartFieldChange(index, { part: event.target.value })}
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Marks</label>
                    <input
                      type="number"
                      value={part.marks}
                      onChange={(event) => handlePartFieldChange(index, { marks: Number(event.target.value) })}
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Part question</label>
                  <textarea
                    value={part.question_text}
                    onChange={(event) => handlePartFieldChange(index, { question_text: event.target.value })}
                    rows={3}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </TabsContent>

      <TabsContent value="attachments" className="mt-6">
        <AttachmentsPanel
          attachments={attachments}
          mode={mode}
          editable={editable}
          onUpload={uploadAttachments}
          onRemove={removeAttachment}
        />
        {isUploadingAttachment && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Uploads are processed via Supabase storage with optimistic UI.</p>
        )}
      </TabsContent>

      <TabsContent value="preview" className="mt-6 space-y-4">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-100">
          Preview (read-only question fields)
        </div>
        <QuestionBody question={localQuestion} parts={parts} />
        <AnswerArea
          question={localQuestion}
          parts={parts}
          responses={responses}
          onChange={() => undefined}
          mode="simulation"
          showCorrectAnswers={false}
          evaluations={evaluations}
          submitted={submitted}
          subject={effectiveSubject}
          disableInputs
        />
      </TabsContent>

      <TabsContent value="validation" className="mt-6 space-y-6">
        <ContextValidatorBridge
          question={localQuestion}
          subject={effectiveSubject}
          examBoard={effectiveExamBoard}
          onValidate={onValidate}
          onMessages={setComplianceMessages}
        />
        <ExtractionCompliancePanelBridge messages={complianceMessages} />
      </TabsContent>
    </Tabs>
  );

  const renderInteractiveMode = () => (
    <div className="space-y-6">
      <QuestionBody question={localQuestion} parts={parts} />
      {attachments.length > 0 && (
        <AttachmentsPanel attachments={attachments} mode={mode} editable={false} />
      )}
      <section className="space-y-4">
        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
          <BookOpen className="h-4 w-4" /> Your response
        </h4>
        <AnswerArea
          question={localQuestion}
          parts={parts}
          responses={responses}
          onChange={handleResponseChange}
          mode={mode}
          showCorrectAnswers={showMarkScheme && mode === 'simulation'}
          evaluations={evaluations}
          submitted={submitted}
          subject={effectiveSubject}
        />
      </section>

      {mode === 'simulation' && (
        <section className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleCheck} disabled={submitted && showMarkScheme}>
              <CheckCircle className="mr-2 h-4 w-4" /> {submitted ? 'Checked' : 'Check answer'}
            </Button>
            {!showMarkScheme && (
              <Button variant="outline" onClick={handleReveal}>
                <Eye className="mr-2 h-4 w-4" /> Reveal mark scheme
              </Button>
            )}
          </div>
          {showMarkScheme && (
            <MarkingSimulationPanel
              subject={effectiveSubject}
              totalMarks={totalMarks}
              earnedMarks={earnedMarks}
              correctAnswers={parts.flatMap((part) => part.correct_answers || [])}
              userAnswer={responses}
              workingSteps={parts.flatMap((part) => part.working_steps || [])}
              showBreakdown
            />
          )}
        </section>
      )}

      {mode === 'student' && (
        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Submit to lock answers. Feedback is provided separately by the student flow.
          </div>
          <Button onClick={handleStudentSubmit} disabled={submitted}>
            <Save className="mr-2 h-4 w-4" /> {submitted ? 'Submitted' : 'Submit'}
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className={cn('rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800', className)}>
      <QuestionHeader question={localQuestion} mode={mode} />
      <div className="mt-6">
        {mode === 'review' ? renderReviewTabs() : renderInteractiveMode()}
      </div>
    </div>
  );
};

export default QuestionViewer;

