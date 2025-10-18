import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle,
  Circle,
  Play,
  Pause,
  Flag,
  FileText,
  Award,
  Target,
  HelpCircle,
  BookOpen,
  Maximize2,
  Minimize2,
  Download,
  ExternalLink,
  GraduationCap,
  ListChecks,
  PanelLeftClose,
  PanelLeft,
  AlertCircle,
  AlertTriangle,
  BarChart3,
  TrendingUp,
  Layers,
  PieChart,
  Activity,
  Lightbulb,
  TimerReset
} from 'lucide-react';
import { Button } from './Button';
import { StatusBadge } from './StatusBadge';
import { Tooltip } from './Tooltip';
import { ConfirmationDialog } from './ConfirmationDialog';
import { cn } from '../../lib/utils';
import { useAnswerValidation } from '../../hooks/useAnswerValidation';
import DynamicAnswerField from './DynamicAnswerField';
import toast from 'react-hot-toast';

interface AttachmentAsset {
  id: string;
  file_url: string;
  file_name: string;
  file_type: string;
}

interface CorrectAnswer {
  answer: string;
  marks?: number;
  alternative_id?: number | string;
  linked_alternatives?: Array<number | string>;
  alternative_type?: string;
  context?: Record<string, unknown> | null;
  unit?: string;
  measurement_details?: Record<string, unknown> | null;
  accepts_equivalent_phrasing?: boolean;
  error_carried_forward?: boolean;
  answer_requirement?: string;
  total_alternatives?: number;
}

interface QuestionOption {
  id: string;
  option_text: string;
  is_correct: boolean;
  order: number;
}

interface SubPart {
  id: string;
  subpart_label?: string;
  question_description: string;
  marks: number;
  answer_format?: string;
  answer_requirement?: string;
  correct_answers?: CorrectAnswer[];
  correct_answer?: string;
  options?: QuestionOption[];
  attachments?: AttachmentAsset[];
  hint?: string;
  explanation?: string;
  requires_manual_marking?: boolean;
  marking_criteria?: string;
  type?: 'mcq' | 'tf' | 'descriptive';
}

interface SubQuestion {
  id: string;
  part_label?: string;
  question_description: string;
  marks: number;
  difficulty?: string;
  type: 'mcq' | 'tf' | 'descriptive';
  status: string;
  topic_id?: string;
  topic_name?: string;
  unit_name?: string;
  subtopics?: Array<{ id: string; name: string }>;
  answer_format?: string;
  answer_requirement?: string;
  options?: QuestionOption[];
  correct_answers?: CorrectAnswer[];
  correct_answer?: string;
  attachments?: AttachmentAsset[];
  hint?: string;
  explanation?: string;
  requires_manual_marking?: boolean;
  marking_criteria?: string;
  subparts?: SubPart[];
}

interface Question {
  id: string;
  question_number: string;
  question_description: string;
  marks: number;
  type: 'mcq' | 'tf' | 'descriptive';
  difficulty: string;
  topic_name?: string;
  subtopic_names?: string[];
  options?: QuestionOption[];
  parts: SubQuestion[];
  answer_format?: string;
  answer_requirement?: string;
  correct_answers?: CorrectAnswer[];
  correct_answer?: string;
  total_alternatives?: number;
  hint?: string;
  explanation?: string;
  requires_manual_marking?: boolean;
  marking_criteria?: string;
  attachments?: AttachmentAsset[];
}

interface SimulationPaper {
  id: string;
  code: string;
  subject: string;
  duration?: string;
  total_marks: number;
  questions: Question[];
  provider?: string;
  program?: string;
  exam_board?: string;
  qualification?: string;
  exam_session?: string;
  exam_year?: string;
}

interface UserAnswer {
  questionId: string;
  partId?: string;
  subpartId?: string;
  answer: unknown;
  isCorrect?: boolean;
  marksAwarded?: number;
  timeSpent?: number;
  partialCredit?: Array<{
    earned: number;
    reason: string;
  }>;
}

interface SimulationResults {
  totalQuestions: number;
  answeredQuestions: number;
  correctAnswers: number;
  partiallyCorrect: number;
  incorrectAnswers: number;
  totalMarks: number;
  earnedMarks: number;
  percentage: number;
  timeSpent: number;
  questionResults: Array<{
    questionId: string;
    questionNumber: string;
    isCorrect: boolean;
    earnedMarks: number;
    totalMarks: number;
    userAnswer?: unknown;
    correctAnswers: CorrectAnswer[];
    feedback: string;
    attempted?: boolean;
    accuracy?: number;
    timeSpent?: number;
    difficulty?: string;
    topics?: string[];
    units?: string[];
    subtopics?: string[];
    questionType?: string;
    partBreakdown?: Array<{
      id: string;
      label: string;
      earnedMarks: number;
      totalMarks: number;
      attempted: boolean;
      accuracy: number;
      timeSpent: number;
      topic?: string;
      unit?: string;
      subtopics?: string[];
      difficulty?: string;
    }>;
  }>;
  unattemptedQuestions?: number;
}

interface PerformanceBreakdownEntry {
  name: string;
  totalQuestions: number;
  attempted: number;
  unattempted: number;
  correct: number;
  partial: number;
  incorrect: number;
  earnedMarks: number;
  totalMarks: number;
  timeSpent: number;
  accuracy: number;
  averageTime: number;
}

// Unified simulation with toggleable features instead of separate modes
interface SimulationFeatures {
  showHints: boolean;
  showExplanations: boolean;
  showCorrectAnswers: boolean;
  enableTimer: boolean;
  allowAnswerInput: boolean;
}
type NavigatorSize = 'compact' | 'normal' | 'expanded';

interface UnifiedTestSimulationProps {
  paper: SimulationPaper;
  onExit: (result?: unknown) => void;
  isQAMode?: boolean;
  onPaperStatusChange?: (status: string) => void;
  allowPause?: boolean;
  showAnswersOnCompletion?: boolean;
}

const romanNumerals = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii'];

const formatSubpartLabel = (index: number) => {
  return romanNumerals[index] ? `(${romanNumerals[index]})` : `Subpart ${index + 1}`;
};

const formatAnswerRequirement = (requirement?: string): string | null => {
  if (!requirement) return null;
  switch (requirement) {
    case 'any_one_from':
      return 'Any one response from the acceptable answers';
    case 'any_two_from':
      return 'Any two responses from the acceptable answers';
    case 'any_three_from':
      return 'Any three responses from the acceptable answers';
    case 'both_required':
      return 'All listed responses are required';
    case 'all_required':
      return 'Every listed response is required';
    case 'alternative_methods':
      return 'Alternative methods accepted when working is clear';
    case 'acceptable_variations':
      return 'Acceptable phrasing variations allowed';
    default:
      return requirement;
  }
};

const deriveOptionLabel = (orderIndex: number): string => {
  const alphabetLength = 26;
  let index = Math.max(orderIndex, 0);
  let label = '';

  do {
    label = String.fromCharCode(65 + (index % alphabetLength)) + label;
    index = Math.floor(index / alphabetLength) - 1;
  } while (index >= 0);

  return label;
};

type AnswerSource = {
  correct_answers?: CorrectAnswer[];
  correct_answer?: string | null;
  options?: QuestionOption[];
} | null | undefined;

const buildNormalisedCorrectAnswers = (source: AnswerSource): CorrectAnswer[] => {
  if (!source) {
    return [];
  }

  if (source.correct_answers && source.correct_answers.length > 0) {
    return source.correct_answers.map(answer => ({ ...answer }));
  }

  const normalisedAnswers: CorrectAnswer[] = [];

  if (source.correct_answer) {
    normalisedAnswers.push({
      answer: String(source.correct_answer).trim()
    });
  }

  if (source.options && source.options.length > 0) {
    source.options.forEach((option, index) => {
      if (!option?.is_correct) {
        return;
      }

      const orderIndex = typeof option.order === 'number' && option.order > 0 ? option.order - 1 : index;
      const label = deriveOptionLabel(orderIndex);
      const optionText = option.option_text?.trim() || option.id || `Option ${label}`;
      const formattedAnswer = `${label}. ${optionText}`.trim();

      if (!normalisedAnswers.some(existing => existing.answer === formattedAnswer)) {
        normalisedAnswers.push({
          answer: formattedAnswer,
          alternative_id: option.id
        });
      }
    });
  }

  return normalisedAnswers;
};

const AttachmentGallery: React.FC<{ attachments: AttachmentAsset[] }> = ({ attachments }) => {
  const [previewAttachment, setPreviewAttachment] = React.useState<AttachmentAsset | null>(null);

  if (!attachments || attachments.length === 0) {
    return null;
  }

  const closePreview = () => setPreviewAttachment(null);

  return (
    <>
      <div className="space-y-6">
        {attachments.map((attachment, index) => {
          // Check if attachment has valid file_url
          const hasValidUrl = attachment.file_url && attachment.file_url.trim() !== '';
          const isDescriptionOnly = !hasValidUrl && attachment.file_type === 'text/description';
          const isImage = attachment.file_type?.startsWith('image/');
          const id = attachment.id || `attachment-${index}`;

          // Handle description-only attachments (placeholders)
          if (isDescriptionOnly || !hasValidUrl) {
            return (
              <div
                key={id}
                className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                      {attachment.file_name || 'Attachment Description'}
                    </h4>
                    {(attachment as any).description && (
                      <p className="mt-2 text-sm text-amber-800 dark:text-amber-200">
                        {(attachment as any).description}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                      ⚠️ This attachment requires a file to be uploaded. Currently showing description only.
                    </p>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div
              key={id}
              className={cn(
                'group relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm transition-all hover:shadow-md dark:border-gray-700 dark:bg-gray-900/60',
                isImage && 'bg-transparent shadow-none hover:shadow-none'
              )}
            >
              <div
                className={cn(
                  'relative flex flex-col',
                  isImage ? 'gap-3 rounded-2xl bg-white p-4 dark:bg-gray-900/70' : 'bg-white dark:bg-gray-900/60'
                )}
              >
                {isImage ? (
                  <figure className="flex flex-col">
                    <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-950/60">
                      <img
                        src={attachment.file_url}
                        alt={attachment.file_name || 'Attachment preview'}
                        className="w-full max-h-[520px] object-contain"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          const parent = target.parentElement;
                          if (parent) {
                            target.style.display = 'none';
                            parent.innerHTML = `
                              <div class="flex items-center justify-center h-48 bg-red-50 dark:bg-red-900/20">
                                <div class="text-center p-4">
                                  <p class="text-sm font-medium text-red-800 dark:text-red-200">Failed to load image</p>
                                  <p class="text-xs text-red-600 dark:text-red-400 mt-1">${attachment.file_name}</p>
                                </div>
                              </div>
                            `;
                          }
                        }}
                      />

                      <div className="absolute top-3 right-3 flex items-center gap-2 rounded-full bg-black/60 p-2 opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => setPreviewAttachment(attachment)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white hover:bg-black/70"
                          aria-label="Preview attachment"
                        >
                          <Maximize2 className="h-4 w-4" />
                        </button>
                        <a
                          href={attachment.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white hover:bg-black/70"
                          aria-label="Open attachment in new tab"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        <a
                          href={attachment.file_url}
                          download={attachment.file_name || undefined}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white hover:bg-black/70"
                          aria-label="Download attachment"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                    {(attachment.file_name || attachment.file_type) && (
                      <figcaption className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span className="truncate font-medium text-gray-700 dark:text-gray-200">
                          {attachment.file_name || 'Attachment'}
                        </span>
                        {attachment.file_type && (
                          <span className="ml-4 shrink-0 uppercase tracking-wide text-[10px] text-gray-400 dark:text-gray-500">
                            {attachment.file_type.split('/').pop()}
                          </span>
                        )}
                      </figcaption>
                    )}
                  </figure>
                ) : (
                  <div className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800/80">
                        <FileText className="h-6 w-6 text-gray-500 dark:text-gray-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {attachment.file_name || 'Attachment'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {attachment.file_type || 'Unknown file type'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {!isImage && (
                  <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-4 py-3 dark:border-gray-800">
                    <a
                      href={attachment.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-700 hover:text-blue-600 dark:bg-gray-800/80 dark:text-gray-200"
                      aria-label="Open attachment in new tab"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <a
                      href={attachment.file_url}
                      download={attachment.file_name || undefined}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-700 hover:text-blue-600 dark:bg-gray-800/80 dark:text-gray-200"
                      aria-label="Download attachment"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {previewAttachment && previewAttachment.file_type?.startsWith('image/') && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
          onClick={closePreview}
        >
          <div
            className="relative max-h-[90vh] max-w-5xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={closePreview}
              className="absolute -top-12 right-0 flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-700 hover:text-red-500"
              aria-label="Close preview"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={previewAttachment.file_url}
              alt={previewAttachment.file_name || 'Attachment preview'}
              className="max-h-[90vh] w-full rounded-xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
    </>
  );
};

interface TeacherInsightsProps {
  correctAnswers?: CorrectAnswer[];
  answerRequirement?: string;
  markingCriteria?: string | string[] | Record<string, unknown>;
  requiresManualMarking?: boolean;
  label?: string;
}

const TeacherInsights: React.FC<TeacherInsightsProps> = ({
  correctAnswers,
  answerRequirement,
  markingCriteria,
  requiresManualMarking,
  label
}) => {
  const hasAnswers = (correctAnswers?.length || 0) > 0;
  const requirementText = formatAnswerRequirement(answerRequirement);
  const hasRequirement = Boolean(requirementText);

  const normalisedCriteria = (() => {
    if (!markingCriteria) return [] as string[];
    if (Array.isArray(markingCriteria)) return markingCriteria.filter(Boolean).map(String);
    if (typeof markingCriteria === 'string') return [markingCriteria];
    if (typeof markingCriteria === 'object') {
      return Object.entries(markingCriteria).map(([key, value]) => `${key}: ${value}`);
    }
    return [] as string[];
  })();

  const hasCriteria = normalisedCriteria.length > 0;
  const showPanel = hasAnswers || hasRequirement || hasCriteria || requiresManualMarking;

  if (!showPanel) {
    return null;
  }

  return (
    <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
      <div className="flex items-start space-x-3">
        <GraduationCap className="h-5 w-5 text-amber-600 dark:text-amber-300 mt-0.5" />
        <div className="space-y-3">
          <div>
            <h4 className="font-semibold text-amber-900 dark:text-amber-100">
              {label ? `${label} • ` : ''}IGCSE Teacher Review
            </h4>
            <p className="text-xs text-amber-700 dark:text-amber-200">
              Preview the full marking guidance before publishing to students.
            </p>
          </div>

          {hasRequirement && (
            <div className="flex items-start space-x-2 text-sm text-amber-800 dark:text-amber-100">
              <Target className="h-4 w-4 mt-0.5" />
              <span>
                <span className="font-medium">Answer expectation:</span> {requirementText}
              </span>
            </div>
          )}

          {hasAnswers && (
            <div>
              <div className="flex items-center space-x-2 text-sm font-medium text-amber-900 dark:text-amber-100 mb-2">
                <ListChecks className="h-4 w-4" />
                <span>Acceptable answers & mark allocation</span>
              </div>
              <ul className="space-y-2 text-sm text-amber-800 dark:text-amber-100">
                {correctAnswers!.map((answer, index) => (
                  <li key={index} className="bg-white/60 dark:bg-amber-900/40 rounded-md p-2">
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-semibold text-amber-900 dark:text-amber-50">
                        Response {index + 1}:
                      </span>
                      {answer.marks !== undefined && (
                        <span className="text-xs font-medium text-amber-700 dark:text-amber-200">
                          {answer.marks} mark{answer.marks !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-amber-900 dark:text-amber-50">
                      {answer.answer || '—'}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-amber-700 dark:text-amber-200">
                      {answer.unit && (
                        <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/60 rounded-full">
                          Unit: {answer.unit}
                        </span>
                      )}
                      {answer.accepts_equivalent_phrasing && (
                        <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/60 rounded-full">
                          Accepts equivalent phrasing
                        </span>
                      )}
                      {answer.error_carried_forward && (
                        <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/60 rounded-full">
                          ECF permitted
                        </span>
                      )}
                      {answer.context?.label && (
                        <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/60 rounded-full">
                          Context: {answer.context.label}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {hasCriteria && (
            <div className="space-y-1 text-sm text-amber-800 dark:text-amber-100">
              <div className="flex items-center space-x-2 font-medium text-amber-900 dark:text-amber-50">
                <Award className="h-4 w-4" />
                <span>Marking guidance</span>
              </div>
              <ul className="list-disc list-inside space-y-1">
                {normalisedCriteria.map((criterion, index) => (
                  <li key={index}>{criterion}</li>
                ))}
              </ul>
            </div>
          )}

          {requiresManualMarking && (
            <div className="flex items-start space-x-2 text-sm text-amber-800 dark:text-amber-100">
              <HelpCircle className="h-4 w-4 mt-0.5" />
              <span>
                Manual review needed. Double-check the worked solution and method marks before finalising grades.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export function UnifiedTestSimulation({
  paper,
  onExit,
  isQAMode = false,
  onPaperStatusChange,
  allowPause = true,
  showAnswersOnCompletion = true
}: UnifiedTestSimulationProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, UserAnswer>>({});
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<SimulationResults | null>(null);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());
  // Unified simulation features - all toggleable independently
  const [features, setFeatures] = useState<SimulationFeatures>({
    showHints: isQAMode,
    showExplanations: isQAMode,
    showCorrectAnswers: isQAMode,
    enableTimer: true,
    allowAnswerInput: true
  });
  const [showQuestionNavigation, setShowQuestionNavigation] = useState(true);
  const [navigatorSize, setNavigatorSize] = useState<NavigatorSize>('normal');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [exitDialogConfig, setExitDialogConfig] = useState<{ title: string; message: React.ReactNode; confirmText?: string; confirmVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'warning' | 'primary' } | null>(null);
  const [questionStartTimes, setQuestionStartTimes] = useState<Record<string, number>>({});
  const [visitedQuestions, setVisitedQuestions] = useState<Set<string>>(() => {
    const initialSet = new Set<string>();
    if (paper.questions[0]?.id) {
      initialSet.add(paper.questions[0].id);
    }
    return initialSet;
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const exitActionRef = useRef<(() => void) | null>(null);
  const { validateAnswer } = useAnswerValidation();

  const currentQuestion = paper.questions[currentQuestionIndex];
  const totalQuestions = paper.questions.length;
  const examDuration = parseDurationToSeconds(paper.duration) ?? 0;
  const visitedCount = visitedQuestions.size;
  const allQuestionsVisited = totalQuestions > 0 && visitedCount === totalQuestions;

  const analytics = useMemo(() => {
    if (!results) {
      return null;
    }

    const unattempted = results.unattemptedQuestions ?? Math.max(0, results.totalQuestions - results.answeredQuestions);
    const accuracy = results.answeredQuestions > 0
      ? Number(((results.correctAnswers / results.answeredQuestions) * 100).toFixed(1))
      : 0;
    const averageTimePerQuestion = results.totalQuestions > 0 ? results.timeSpent / results.totalQuestions : 0;
    const averageTimePerAttempted = results.answeredQuestions > 0 ? results.timeSpent / results.answeredQuestions : 0;

    const buildBreakdown = (
      extractor: (item: SimulationResults['questionResults'][number]) => Array<string | undefined> | undefined
    ) => {
      const map = new Map<string, {
        name: string;
        totalQuestions: number;
        attempted: number;
        unattempted: number;
        correct: number;
        partial: number;
        incorrect: number;
        earnedMarks: number;
        totalMarks: number;
        timeSpent: number;
      }>();

      results.questionResults.forEach(result => {
        const keys = extractor(result)?.filter(Boolean) as string[] | undefined;
        if (!keys || keys.length === 0) {
          return;
        }

        keys.forEach(key => {
          if (!key) return;

          const existing = map.get(key) || {
            name: key,
            totalQuestions: 0,
            attempted: 0,
            unattempted: 0,
            correct: 0,
            partial: 0,
            incorrect: 0,
            earnedMarks: 0,
            totalMarks: 0,
            timeSpent: 0
          };

          existing.totalQuestions += 1;
          existing.totalMarks += result.totalMarks;

          if (result.attempted) {
            existing.attempted += 1;
            existing.earnedMarks += result.earnedMarks;
            existing.timeSpent += result.timeSpent || 0;

            if (result.isCorrect) {
              existing.correct += 1;
            } else if ((result.earnedMarks || 0) > 0) {
              existing.partial += 1;
            } else {
              existing.incorrect += 1;
            }
          } else {
            existing.unattempted += 1;
          }

          map.set(key, existing);
        });
      });

      return Array.from(map.values()).map(entry => ({
        ...entry,
        accuracy: entry.attempted > 0 && entry.totalMarks > 0
          ? Number(((entry.earnedMarks / entry.totalMarks) * 100).toFixed(1))
          : 0,
        averageTime: entry.attempted > 0 ? entry.timeSpent / entry.attempted : 0
      })).sort((a, b) => b.accuracy - a.accuracy);
    };

    const unitBreakdown = buildBreakdown(result => result.units);
    const topicBreakdown = buildBreakdown(result => result.topics);
    const subtopicBreakdown = buildBreakdown(result => result.subtopics);
    const difficultyBreakdown = buildBreakdown(result => (result.difficulty ? [result.difficulty] : []));
    const typeBreakdown = buildBreakdown(result => (result.questionType ? [result.questionType] : []));

    const attemptedQuestions = results.questionResults.filter(result => result.attempted);
    const slowestQuestions = [...attemptedQuestions]
      .sort((a, b) => (b.timeSpent || 0) - (a.timeSpent || 0))
      .slice(0, 5);
    const fastestWins = [...attemptedQuestions.filter(result => result.isCorrect)]
      .sort((a, b) => (a.timeSpent || 0) - (b.timeSpent || 0))
      .slice(0, 5);

    const gradeBoundaries = [
      { grade: 'A*', threshold: 90, description: 'Outstanding mastery of the syllabus content.' },
      { grade: 'A', threshold: 80, description: 'Excellent understanding with only minor gaps.' },
      { grade: 'B', threshold: 70, description: 'Very good grasp with room to deepen mastery.' },
      { grade: 'C', threshold: 60, description: 'Secure understanding of core concepts.' },
      { grade: 'D', threshold: 50, description: 'Developing understanding – target consolidation.' },
      { grade: 'E', threshold: 40, description: 'Basic grasp – prioritise targeted revision.' },
      { grade: 'F', threshold: 30, description: 'Emerging understanding – strengthen foundations.' },
      { grade: 'G', threshold: 20, description: 'High support needed – revisit fundamentals.' },
      { grade: 'U', threshold: 0, description: 'Unclassified – significant re-teaching recommended.' }
    ];

    let gradeIndex = gradeBoundaries.findIndex(boundary => results.percentage >= boundary.threshold);
    if (gradeIndex === -1) {
      gradeIndex = gradeBoundaries.length - 1;
    }

    const gradeInfo = gradeBoundaries[gradeIndex];
    const nextGrade = gradeIndex > 0 ? gradeBoundaries[gradeIndex - 1] : null;
    const marksToNextGrade = nextGrade
      ? Math.max(0, Math.ceil(((nextGrade.threshold / 100) * paper.total_marks) - results.earnedMarks))
      : 0;

    const distribution = [
      { label: 'Correct', value: results.correctAnswers, color: 'from-green-500 to-emerald-500' },
      { label: 'Partial', value: results.partiallyCorrect, color: 'from-amber-400 to-orange-500' },
      { label: 'Incorrect', value: results.incorrectAnswers, color: 'from-red-500 to-rose-500' },
      { label: 'Unattempted', value: unattempted, color: 'from-slate-400 to-slate-500' }
    ];
    const distributionTotal = distribution.reduce((sum, item) => sum + item.value, 0);

    const paceAllocation = examDuration > 0
      ? {
          allocated: examDuration,
          actual: results.timeSpent,
          delta: results.timeSpent - examDuration
        }
      : null;

    const insights: Array<{ title: string; detail: string }> = [];

    if (gradeInfo) {
      insights.push({
        title: `Current IGCSE grade: ${gradeInfo.grade}`,
        detail: gradeInfo.description
      });
    }

    if (nextGrade && marksToNextGrade > 0) {
      insights.push({
        title: `Reach grade ${nextGrade.grade}`,
        detail: `Secure approximately ${marksToNextGrade} more mark${marksToNextGrade === 1 ? '' : 's'} to reach the ${nextGrade.grade} boundary.`
      });
    }

    if (unattempted > 0) {
      insights.push({
        title: 'Complete full coverage',
        detail: `${unattempted} question${unattempted === 1 ? '' : 's'} were left unanswered. Plan targeted review sessions to close the gaps.`
      });
    }

    const attemptedTopics = topicBreakdown.filter(topic => topic.attempted > 0);
    if (attemptedTopics.length > 0) {
      const weakestTopic = [...attemptedTopics].sort((a, b) => a.accuracy - b.accuracy)[0];
      const strongestTopic = [...attemptedTopics].sort((a, b) => b.accuracy - a.accuracy)[0];

      if (weakestTopic && weakestTopic.accuracy < 75) {
        insights.push({
          title: `Focus topic: ${weakestTopic.name}`,
          detail: `Accuracy is ${weakestTopic.accuracy}% with ${weakestTopic.incorrect + weakestTopic.partial} improvement opportunities. Schedule scaffolded practice to strengthen this area.`
        });
      }

      if (strongestTopic && strongestTopic.accuracy >= 85) {
        insights.push({
          title: `Leverage strength: ${strongestTopic.name}`,
          detail: `Maintain momentum – ${strongestTopic.accuracy}% accuracy demonstrates exam-ready mastery. Use this confidence to model exemplar solutions.`
        });
      }
    }

    const difficultBand = difficultyBreakdown.find(diff => diff.name?.toLowerCase() === 'hard' || diff.name?.toLowerCase() === 'higher');
    if (difficultBand && difficultBand.attempted > 0 && difficultBand.accuracy < 60) {
      insights.push({
        title: 'Challenge-level practice',
        detail: `Higher difficulty questions averaged ${difficultBand.accuracy}% accuracy. Build resilience with timed drills and worked solutions.`
      });
    }

    if (paceAllocation) {
      insights.push({
        title: 'Time management',
        detail:
          paceAllocation.delta > 0
            ? `Exceeded the scheduled duration by ${formatTime(Math.abs(paceAllocation.delta))}. Introduce pacing checkpoints every 10 minutes.`
            : `Finished ${formatTime(Math.abs(paceAllocation.delta))} ahead of the allocated time. Reinvest spare time in structured review.`
      });
    }

    const slowest = slowestQuestions[0];
    if (slowest && (slowest.timeSpent || 0) > averageTimePerAttempted * 1.4) {
      insights.push({
        title: `Deep dive: Question ${slowest.questionNumber}`,
        detail: `Consumed ${formatTime(Math.round(slowest.timeSpent || 0))}. Revisit the marking scheme and streamline method marks for efficiency.`
      });
    }

    return {
      unattempted,
      accuracy,
      averageTimePerQuestion,
      averageTimePerAttempted,
      unitBreakdown,
      topicBreakdown,
      subtopicBreakdown,
      difficultyBreakdown,
      typeBreakdown,
      slowestQuestions,
      fastestWins,
      gradeInfo,
      nextGrade,
      marksToNextGrade,
      distribution,
      distributionTotal,
      paceAllocation,
      insights
    };
  }, [results, examDuration, paper.total_marks]);

  const questionMap = useMemo(() => {
    const map = new Map<string, Question>();
    paper.questions.forEach(question => {
      map.set(question.id, question);
    });
    return map;
  }, [paper.questions]);

  const resetVisitedQuestions = useCallback(() => {
    setVisitedQuestions(() => {
      const initialSet = new Set<string>();
      if (paper.questions[0]?.id) {
        initialSet.add(paper.questions[0].id);
      }
      return initialSet;
    });
  }, [paper]);

  useEffect(() => {
    if (isQAMode) {
      setFeatures(prev => ({
        ...prev,
        showHints: true,
        showExplanations: true,
        showCorrectAnswers: true,
        allowAnswerInput: true
      }));
    }
  }, [isQAMode]);

  useEffect(() => {
    if (isQAMode && onPaperStatusChange) {
      onPaperStatusChange('qa_preview');
    }
  }, [isQAMode, onPaperStatusChange]);

  useEffect(() => {
    resetVisitedQuestions();
  }, [resetVisitedQuestions]);

  useEffect(() => {
    if (!currentQuestion) {
      return;
    }

    setVisitedQuestions(prev => {
      if (prev.has(currentQuestion.id)) {
        return prev;
      }

      const updated = new Set(prev);
      updated.add(currentQuestion.id);
      return updated;
    });
  }, [currentQuestion]);

  useEffect(() => {
    if (isRunning && features.enableTimer) {
      timerRef.current = setInterval(() => {
        setTimeElapsed(prev => {
          const newTime = prev + 1;
          if (examDuration > 0 && newTime >= examDuration) {
            handleSubmitExam();
            return examDuration;
          }
          return newTime;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning, features.enableTimer, examDuration]);

  useEffect(() => {
    if (currentQuestion && isRunning) {
      const questionKey = currentQuestion.id;
      if (!questionStartTimes[questionKey]) {
        setQuestionStartTimes(prev => ({
          ...prev,
          [questionKey]: Date.now()
        }));
      }
    }
  }, [currentQuestionIndex, currentQuestion, isRunning, questionStartTimes]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (showResults) {
        return;
      }

      if (event.key === 'ArrowLeft' && currentQuestionIndex > 0) {
        event.preventDefault();
        goToPreviousQuestion();
      } else if (event.key === 'ArrowRight' && currentQuestionIndex < totalQuestions - 1) {
        event.preventDefault();
        goToNextQuestion();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        handleExit();
      } else if (event.key === 'F11') {
        event.preventDefault();
        toggleFullscreen();
      } else if (event.key === 'Home') {
        event.preventDefault();
        setCurrentQuestionIndex(0);
      } else if (event.key === 'End') {
        event.preventDefault();
        setCurrentQuestionIndex(totalQuestions - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentQuestionIndex, showResults, totalQuestions]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isRunning && !showResults) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isRunning, showResults]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const hasProvidedAnswer = (answer: unknown) => {
    if (answer === null || answer === undefined) return false;
    if (typeof answer === 'string') return answer.trim().length > 0;
    if (typeof answer === 'number' || typeof answer === 'boolean') return true;
    if (Array.isArray(answer)) return answer.length > 0;
    if (typeof answer === 'object') return Object.keys(answer as Record<string, unknown>).length > 0;
    return false;
  };

  const parseDurationToSeconds = (duration?: string | number | null) => {
    if (duration === null || duration === undefined) return null;
    if (typeof duration === 'number') {
      return duration > 3600 ? duration : duration * 60;
    }

    const trimmed = duration.trim();
    if (!trimmed) return null;

    if (/^\d+$/.test(trimmed)) {
      const numericValue = Number(trimmed);
      return numericValue > 3600 ? numericValue : numericValue * 60;
    }

    if (trimmed.includes(':')) {
      const parts = trimmed.split(':').map(part => Number(part));
      if (parts.every(part => !Number.isNaN(part))) {
        if (parts.length === 3) {
          const [hours, minutes, seconds] = parts;
          return hours * 3600 + minutes * 60 + seconds;
        }
        if (parts.length === 2) {
          const [minutes, seconds] = parts;
          return minutes * 60 + seconds;
        }
      }
    }

    const hoursMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*h/);
    const minutesMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*m/);
    const secondsMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*s/);

    if (hoursMatch || minutesMatch || secondsMatch) {
      const hours = hoursMatch ? parseFloat(hoursMatch[1]) : 0;
      const minutes = minutesMatch ? parseFloat(minutesMatch[1]) : 0;
      const seconds = secondsMatch ? parseFloat(secondsMatch[1]) : 0;
      return Math.round(hours * 3600 + minutes * 60 + seconds);
    }

    return null;
  };

  const formatLabel = (value?: string | null) => {
    if (!value) return '';
    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  const startExam = () => {
    setIsRunning(true);
    setTimeElapsed(0);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setFlaggedQuestions(new Set());
    setQuestionStartTimes({});
    resetVisitedQuestions();
  };

  const pauseExam = () => {
    setIsRunning(false);
  };

  const resumeExam = () => {
    setIsRunning(true);
  };

  const toggleQuestionFlag = (questionId: string) => {
    setFlaggedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const handleAnswerChange = (
    questionId: string,
    partId: string | undefined,
    subpartId: string | undefined,
    answer: unknown
  ) => {
    const key = subpartId
      ? `${questionId}-${partId}-${subpartId}`
      : partId
        ? `${questionId}-${partId}`
        : questionId;
    const startKey = subpartId
      ? key
      : partId
        ? `${questionId}-${partId}`
        : questionId;
    const startTime = questionStartTimes[startKey] || Date.now();
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);

    if (!questionStartTimes[startKey]) {
      setQuestionStartTimes(prev => ({
        ...prev,
        [startKey]: Date.now()
      }));
    }

    const question = paper.questions.find(q => q.id === questionId);
    if (!question) return;

    let questionToValidate;
    if (subpartId && partId) {
      questionToValidate = question.parts
        .find(p => p.id === partId)?.subparts
        ?.find(sp => sp.id === subpartId);
    } else if (partId) {
      questionToValidate = question.parts.find(p => p.id === partId);
    } else {
      questionToValidate = question;
    }

    if (!questionToValidate) return;

    const validation = validateAnswer(questionToValidate, answer);

    setUserAnswers(prev => ({
      ...prev,
      [key]: {
        questionId,
        partId,
        subpartId,
        answer,
        isCorrect: validation.isCorrect,
        marksAwarded: (validation.score || 0) * (questionToValidate.marks || 0),
        timeSpent,
        partialCredit: validation.partialCredit
      }
    }));
  };

  const handleSubmitExam = () => {
    setIsRunning(false);

    const questionResults = paper.questions.map(q => {
      const partBreakdown: Array<{
        id: string;
        label: string;
        earnedMarks: number;
        totalMarks: number;
        attempted: boolean;
        accuracy: number;
        timeSpent: number;
        topic?: string;
        unit?: string;
        subtopics?: string[];
        difficulty?: string;
      }> = [];

      const topicSet = new Set<string>();
      const unitSet = new Set<string>();
      const subtopicSet = new Set<string>();

      if (q.topic_name) {
        topicSet.add(q.topic_name);
      }
      q.subtopic_names?.forEach(name => {
        if (name) {
          subtopicSet.add(name);
        }
      });

      const questionUnit = (q as unknown as { unit_name?: string }).unit_name;
      if (questionUnit) {
        unitSet.add(questionUnit);
      }

      let totalEarned = 0;
      let totalPossible = 0;
      let totalTimeSpent = 0;
      let attempted = false;

      if (q.parts.length === 0) {
        const answer = userAnswers[q.id];
        const earned = answer?.marksAwarded || 0;
        const timeSpent = answer?.timeSpent || 0;
        const answered = hasProvidedAnswer(answer?.answer);

        totalEarned = earned;
        totalPossible = q.marks;
        totalTimeSpent = timeSpent;
        attempted = answered;

        partBreakdown.push({
          id: q.id,
          label: 'Whole Question',
          earnedMarks: earned,
          totalMarks: q.marks,
          attempted: answered,
          accuracy: q.marks ? (earned / q.marks) * 100 : 0,
          timeSpent,
          topic: q.topic_name,
          unit: questionUnit,
          subtopics: q.subtopic_names,
          difficulty: q.difficulty
        });
      } else {
        q.parts.forEach((part, partIndex) => {
          const partLabel = part.part_label || `Part ${String.fromCharCode(65 + partIndex)}`;

          if (part.topic_name) {
            topicSet.add(part.topic_name);
          }
          if (part.unit_name) {
            unitSet.add(part.unit_name);
          }
          part.subtopics?.forEach(subtopic => {
            if (subtopic?.name) {
              subtopicSet.add(subtopic.name);
            }
          });

          if (part.subparts && part.subparts.length > 0) {
            part.subparts.forEach((subpart, subIndex) => {
              const key = `${q.id}-${part.id}-${subpart.id}`;
              const answer = userAnswers[key];
              const earned = answer?.marksAwarded || 0;
              const timeSpent = answer?.timeSpent || 0;
              const answered = hasProvidedAnswer(answer?.answer);
              const label = subpart.subpart_label
                ? `${partLabel} - ${subpart.subpart_label}`
                : `${partLabel}.${subIndex + 1}`;

              totalEarned += earned;
              totalPossible += subpart.marks;
              totalTimeSpent += timeSpent;

              if (answered) {
                attempted = true;
              }

              partBreakdown.push({
                id: key,
                label,
                earnedMarks: earned,
                totalMarks: subpart.marks,
                attempted: answered,
                accuracy: subpart.marks ? (earned / subpart.marks) * 100 : 0,
                timeSpent,
                topic: part.topic_name || q.topic_name,
                unit: part.unit_name,
                subtopics: part.subtopics?.map(s => s.name) || q.subtopic_names,
                difficulty: part.difficulty || q.difficulty
              });
            });
          } else {
            const key = `${q.id}-${part.id}`;
            const answer = userAnswers[key];
            const earned = answer?.marksAwarded || 0;
            const timeSpent = answer?.timeSpent || 0;
            const answered = hasProvidedAnswer(answer?.answer);

            totalEarned += earned;
            totalPossible += part.marks;
            totalTimeSpent += timeSpent;

            if (answered) {
              attempted = true;
            }

            partBreakdown.push({
              id: key,
              label: partLabel,
              earnedMarks: earned,
              totalMarks: part.marks,
              attempted: answered,
              accuracy: part.marks ? (earned / part.marks) * 100 : 0,
              timeSpent,
              topic: part.topic_name || q.topic_name,
              unit: part.unit_name,
              subtopics: part.subtopics?.map(s => s.name),
              difficulty: part.difficulty || q.difficulty
            });
          }
        });
      }

      if (partBreakdown.length === 0) {
        totalPossible = q.marks;
      }

      const accuracy = totalPossible > 0 ? (totalEarned / totalPossible) * 100 : 0;
      const isCorrect = totalPossible > 0 && totalEarned === totalPossible;

      const feedback = !attempted
        ? 'Not attempted - revisit during QA review.'
        : isCorrect
        ? 'Excellent - full marks secured.'
        : totalEarned > 0
        ? 'Partial credit earned - review marking guidance to capture remaining marks.'
        : 'Attempted but incorrect - revisit the concept and marking scheme.';

      return {
        questionId: q.id,
        questionNumber: q.question_number,
        isCorrect,
        earnedMarks: totalEarned,
        totalMarks: totalPossible,
        userAnswer: userAnswers[q.id]?.answer,
        correctAnswers: buildNormalisedCorrectAnswers(q),
        feedback,
        attempted,
        accuracy,
        timeSpent: totalTimeSpent,
        difficulty: q.difficulty,
        topics: Array.from(topicSet),
        units: Array.from(unitSet),
        subtopics: Array.from(subtopicSet),
        questionType: q.type,
        partBreakdown
      };
    });

    const totalCorrect = questionResults.filter(r => r.isCorrect).length;
    const totalPartial = questionResults.filter(r => r.attempted && !r.isCorrect && r.earnedMarks > 0).length;
    const totalIncorrect = questionResults.filter(r => r.attempted && r.earnedMarks === 0).length;
    const totalAttempted = questionResults.filter(r => r.attempted).length;
    const unattempted = questionResults.filter(r => !r.attempted).length;
    const earnedMarks = questionResults.reduce((sum, r) => sum + r.earnedMarks, 0);
    const totalMarks = questionResults.reduce((sum, r) => sum + r.totalMarks, 0) || paper.total_marks;
    const percentage = totalMarks > 0 ? Number(((earnedMarks / totalMarks) * 100).toFixed(1)) : 0;

    const simulationResults: SimulationResults = {
      totalQuestions: paper.questions.length,
      answeredQuestions: totalAttempted,
      correctAnswers: totalCorrect,
      partiallyCorrect: totalPartial,
      incorrectAnswers: totalIncorrect,
      totalMarks: paper.total_marks,
      earnedMarks,
      percentage,
      timeSpent: timeElapsed,
      questionResults,
      unattemptedQuestions: unattempted
    };

    setResults(simulationResults);
    setShowResults(true);
  };

  const handleRetakeExam = () => {
    setShowResults(false);
    setResults(null);
    setUserAnswers({});
    setTimeElapsed(0);
    setCurrentQuestionIndex(0);
    setFlaggedQuestions(new Set());
    setQuestionStartTimes({});
    resetVisitedQuestions();
  };

  const handleCompleteQAReview = useCallback(() => {
    if (!allQuestionsVisited) {
      toast.error('Review each question before completing the QA review.');
      return;
    }

    const qaResult = {
      completed: true,
      completedAt: new Date().toISOString(),
      mode: 'qa_review',
      flaggedQuestions: Array.from(flaggedQuestions),
      visitedQuestions: Array.from(visitedQuestions),
      timeElapsed
    };

    toast.success('QA review marked as complete.');
    onExit(qaResult);
  }, [allQuestionsVisited, flaggedQuestions, visitedQuestions, timeElapsed, onExit]);

  const openExitDialog = useCallback((config: typeof exitDialogConfig, action: () => void) => {
    exitActionRef.current = action;
    setExitDialogConfig(config);
  }, []);

  const handleConfirmExitDialog = useCallback(() => {
    const action = exitActionRef.current;
    exitActionRef.current = null;
    setExitDialogConfig(null);
    if (action) {
      action();
    }
  }, []);

  const handleCancelExitDialog = useCallback(() => {
    exitActionRef.current = null;
    setExitDialogConfig(null);
  }, []);

  const handleExit = useCallback(() => {
    if (isQAMode && !showResults) {
      if (!allQuestionsVisited) {
        openExitDialog({
          title: 'Exit QA Review?',
          message: (
            <div className="space-y-2">
              <p className="font-medium text-gray-900 dark:text-white">You have not reviewed every question.</p>
              <p className="text-sm">If you exit now, the QA review will remain incomplete.</p>
            </div>
          ),
          confirmText: 'Exit without completing',
          confirmVariant: 'warning'
        }, () => onExit());
        return;
      }

      openExitDialog({
        title: 'Exit QA Review?',
        message: (
          <div className="space-y-2">
            <p className="font-medium text-gray-900 dark:text-white">Use "Complete QA Review" to mark this simulation as finished.</p>
            <p className="text-sm">Exit now to leave without completing the QA review.</p>
          </div>
        ),
        confirmText: 'Exit without completing',
        confirmVariant: 'warning'
      }, () => onExit());
      return;
    }

    if (isRunning && !showResults) {
      openExitDialog({
        title: 'Exit Test?',
        message: (
          <div className="space-y-2">
            <p className="font-medium text-gray-900 dark:text-white">Are you sure you want to exit?</p>
            <p className="text-sm">Your progress will be lost and cannot be recovered.</p>
          </div>
        ),
        confirmText: 'Exit test',
        confirmVariant: 'destructive'
      }, () => onExit());
    } else {
      onExit(results || undefined);
    }
  }, [allQuestionsVisited, isQAMode, isRunning, onExit, openExitDialog, showResults, results]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else if (document.exitFullscreen) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
  }, []);

  const goToQuestion = useCallback((index: number) => {
    setCurrentQuestionIndex(prevIndex => {
      if (index >= 0 && index < totalQuestions) {
        return index;
      }
      return prevIndex;
    });
  }, [totalQuestions]);

  const goToPreviousQuestion = useCallback(() => {
    setCurrentQuestionIndex(prevIndex => Math.max(prevIndex - 1, 0));
  }, []);

  const goToNextQuestion = useCallback(() => {
    setCurrentQuestionIndex(prevIndex => Math.min(prevIndex + 1, totalQuestions - 1));
  }, [totalQuestions]);

  const getQuestionStatus = (questionId: string, parts: SubQuestion[]) => {
    if (parts.length > 0) {
      let anyAnswered = false;

      const allPartsAnswered = parts.every(part => {
        if (part.subparts && part.subparts.length > 0) {
          const subpartCompletion = part.subparts.map(subpart => {
            const key = `${questionId}-${part.id}-${subpart.id}`;
            const answered = userAnswers[key]?.answer !== undefined && userAnswers[key]?.answer !== '';
            if (answered) {
              anyAnswered = true;
            }
            return answered;
          });
          return subpartCompletion.every(Boolean);
        }

        const key = `${questionId}-${part.id}`;
        const answered = userAnswers[key]?.answer !== undefined && userAnswers[key]?.answer !== '';
        if (answered) {
          anyAnswered = true;
        }
        return answered;
      });

      if (allPartsAnswered) {
        return 'answered';
      }

      return anyAnswered ? 'partial' : 'unanswered';
    }

    const answer = userAnswers[questionId];
    return answer?.answer !== undefined && answer?.answer !== '' ? 'answered' : 'unanswered';
  };

  const getAnsweredCount = () => {
    return paper.questions.filter(q => {
      const status = getQuestionStatus(q.id, q.parts);
      return status === 'answered';
    }).length;
  };

  const calculateProgress = () => {
    const answeredQuestions = getAnsweredCount();
    return totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;
  };

  if (showResults && results) {
    const unattempted = analytics?.unattempted ?? Math.max(0, results.totalQuestions - results.answeredQuestions);
    const accuracy = analytics?.accuracy ?? (
      results.answeredQuestions > 0
        ? Number(((results.correctAnswers / results.answeredQuestions) * 100).toFixed(1))
        : 0
    );
    const averageTimePerQuestion = analytics?.averageTimePerQuestion ?? (
      results.totalQuestions > 0 ? results.timeSpent / results.totalQuestions : 0
    );
    const averageTimePerAttempted = analytics?.averageTimePerAttempted ?? (
      results.answeredQuestions > 0 ? results.timeSpent / results.answeredQuestions : 0
    );
    const gradeInfo = analytics?.gradeInfo;
    const nextGrade = analytics?.nextGrade;
    const marksToNextGrade = analytics?.marksToNextGrade ?? 0;
    const distribution = analytics?.distribution ?? [];
    const distributionTotal = analytics?.distributionTotal ?? results.totalQuestions;
    const paceAllocation = analytics?.paceAllocation;
    const insights = analytics?.insights ?? [];
    const unitBreakdown: PerformanceBreakdownEntry[] = analytics?.unitBreakdown ?? [];
    const topicBreakdown: PerformanceBreakdownEntry[] = analytics?.topicBreakdown ?? [];
    const subtopicBreakdown: PerformanceBreakdownEntry[] = analytics?.subtopicBreakdown ?? [];
    const difficultyBreakdown: PerformanceBreakdownEntry[] = analytics?.difficultyBreakdown ?? [];
    const typeBreakdown: PerformanceBreakdownEntry[] = analytics?.typeBreakdown ?? [];
    const slowestQuestions = analytics?.slowestQuestions ?? [];
    const fastestWins = analytics?.fastestWins ?? [];
    const attempted = results.answeredQuestions;

    const formatPercent = (value: number) => `${value.toFixed(1)}%`;
    const summarise = (values?: string[]) => (values && values.length > 0 ? values.slice(0, 2).join(', ') : 'General');

    const renderDomainCard = (
      title: string,
      icon: React.ReactNode,
      data: PerformanceBreakdownEntry[],
      emptyMessage: string,
      limit = 4
    ) => {
      const items = data.slice(0, limit);
      return (
        <div className="bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300">
              {icon}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Ranked by accuracy</p>
            </div>
          </div>
          <div className="space-y-3">
            {items.length > 0 ? (
              items.map(item => (
                <div
                  key={item.name}
                  className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-gray-900/40 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {item.attempted} attempted • {item.unattempted} pending
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatPercent(item.accuracy)}</p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        Avg {formatTime(Math.round(item.averageTime || 0))}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"
                      style={{ width: `${Math.min(100, item.accuracy)}%` }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-[11px] text-gray-500 dark:text-gray-400">
                    <span>
                      {item.earnedMarks.toFixed(1)}/{item.totalMarks.toFixed(1)} marks
                    </span>
                    <span>
                      {item.correct} ✔ • {item.partial} △ • {item.incorrect} ✖
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">{emptyMessage}</p>
            )}
          </div>
        </div>
      );
    };

    const renderQuestionTimeList = (
      title: string,
      data: typeof slowestQuestions,
      emptyMessage: string
    ) => (
      <div className="space-y-3">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">{title}</p>
        {data.length > 0 ? (
          data.map(item => {
            const question = questionMap.get(item.questionId);
            const label = summarise(item.topics ?? question?.subtopic_names);
            const itemAccuracy = item.accuracy ?? (
              item.totalMarks ? (item.earnedMarks / item.totalMarks) * 100 : 0
            );

            return (
              <div
                key={`${item.questionId}-${title}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-gray-900/40 p-3"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Question {item.questionNumber}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {formatTime(Math.round(item.timeSpent || 0))}
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">{formatPercent(itemAccuracy)}</p>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">{emptyMessage}</p>
        )}
      </div>
    );

    return (
      <div className={cn(
        "min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col",
        isFullscreen && "fixed inset-0 z-50"
      )}>
        <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={handleExit}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Test Results</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {paper.code} • {paper.subject}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto p-6 space-y-10">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30">
                <Award className="h-10 w-10 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Test Completed!</h1>
              <p className="text-gray-600 dark:text-gray-400">{paper.code}</p>
              {gradeInfo && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Current grade {gradeInfo.grade} • {gradeInfo.description}
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Overall Score</p>
                    <p className="mt-2 text-4xl font-bold text-gray-900 dark:text-white">{results.percentage}%</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {results.earnedMarks}/{results.totalMarks} marks
                    </p>
                  </div>
                  <div className="rounded-full bg-blue-100 dark:bg-blue-900/40 p-3 text-blue-600 dark:text-blue-300">
                    <Award className="h-6 w-6" />
                  </div>
                </div>
                {gradeInfo && (
                  <div className="mt-4 flex items-start gap-3 rounded-xl bg-blue-50/80 dark:bg-blue-900/20 p-3">
                    <GraduationCap className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                    <div>
                      <p className="text-sm font-semibold text-blue-700 dark:text-blue-200">{gradeInfo.grade} band</p>
                      <p className="text-xs text-blue-600/80 dark:text-blue-200/80">{gradeInfo.description}</p>
                      {nextGrade && marksToNextGrade > 0 && (
                        <p className="mt-1 text-xs text-blue-700 dark:text-blue-200">
                          {marksToNextGrade} additional mark{marksToNextGrade === 1 ? '' : 's'} needed for grade {nextGrade.grade}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Question Coverage</p>
                    <p className="mt-2 text-4xl font-bold text-gray-900 dark:text-white">{attempted}/{results.totalQuestions}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Attempted questions</p>
                  </div>
                  <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 p-3 text-emerald-600 dark:text-emerald-300">
                    <ListChecks className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  <div className="flex items-center justify-between">
                    <span>Full marks</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{results.correctAnswers}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Partial credit</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{results.partiallyCorrect}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Zero marks</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{results.incorrectAnswers}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Unattempted</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{unattempted}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Answer Accuracy</p>
                    <p className="mt-2 text-4xl font-bold text-gray-900 dark:text-white">{formatPercent(accuracy)}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Across attempted questions</p>
                  </div>
                  <div className="rounded-full bg-purple-100 dark:bg-purple-900/30 p-3 text-purple-600 dark:text-purple-300">
                    <Target className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    {distribution.map(item => {
                      const width = distributionTotal > 0 ? (item.value / distributionTotal) * 100 : 0;
                      return (
                        <div
                          key={item.label}
                          className={cn('bg-gradient-to-r', item.color)}
                          style={{ width: `${width}%` }}
                        />
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-300">
                    {distribution.map(item => (
                      <div key={`${item.label}-legend`} className="flex items-center justify-between">
                        <span>{item.label}</span>
                        <span className="font-medium text-gray-900 dark:text-white">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Time Management</p>
                    <p className="mt-2 text-4xl font-bold text-gray-900 dark:text-white">{formatTime(results.timeSpent)}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total time invested</p>
                  </div>
                  <div className="rounded-full bg-amber-100 dark:bg-amber-900/30 p-3 text-amber-600 dark:text-amber-300">
                    <Clock className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  <div className="flex items-center justify-between">
                    <span>Average / question</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatTime(Math.round(averageTimePerQuestion || 0))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Average / attempted</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatTime(Math.round(averageTimePerAttempted || 0))}
                    </span>
                  </div>
                  {paceAllocation && (
                    <div
                      className={cn(
                        'mt-3 flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold',
                        paceAllocation.delta > 0
                          ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-200'
                          : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200'
                      )}
                    >
                      <span>Pacing delta</span>
                      <span>
                        {paceAllocation.delta > 0 ? '+' : '-'}{formatTime(Math.abs(paceAllocation.delta))}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {renderDomainCard(
                'Unit mastery snapshot',
                <Layers className="h-5 w-5" />,
                unitBreakdown,
                'Units are not tagged for this paper.'
              )}
              {renderDomainCard(
                'Topic strengths & priorities',
                <BookOpen className="h-5 w-5" />,
                topicBreakdown,
                'Topics are not available for this dataset.'
              )}
              {renderDomainCard(
                'Subtopic drill-down',
                <ListChecks className="h-5 w-5" />,
                subtopicBreakdown,
                'Subtopic metadata is not linked to these questions.',
                6
              )}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-300">
                    <Activity className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Performance by difficulty</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Understand where challenge levels impact scores</p>
                  </div>
                </div>
                {difficultyBreakdown.length > 0 ? (
                  <div className="mt-3 overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800">
                    <div className="grid grid-cols-5 gap-2 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      <span className="text-left">Band</span>
                      <span className="text-center">Attempted</span>
                      <span className="text-center">Accuracy</span>
                      <span className="text-center">Avg time</span>
                      <span className="text-right">Marks</span>
                    </div>
                    {difficultyBreakdown.slice(0, 6).map(item => (
                      <div key={item.name} className="grid grid-cols-5 gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 border-t border-gray-100 dark:border-gray-800/60">
                        <span className="font-medium text-gray-900 dark:text-white">{formatLabel(item.name)}</span>
                        <span className="text-center">{item.attempted}</span>
                        <span className="text-center">{formatPercent(item.accuracy)}</span>
                        <span className="text-center">{formatTime(Math.round(item.averageTime || 0))}</span>
                        <span className="text-right">
                          {item.earnedMarks.toFixed(1)}/{item.totalMarks.toFixed(1)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No difficulty metadata is available for these questions.</p>
                )}
              </div>

              <div className="bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300">
                    <PieChart className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Question type effectiveness</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Balance objective and descriptive proficiency</p>
                  </div>
                </div>
                {typeBreakdown.length > 0 ? (
                  <div className="space-y-3">
                    {typeBreakdown.slice(0, 6).map(item => (
                      <div key={item.name} className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-gray-900/40 p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{formatLabel(item.name)}</span>
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">{formatPercent(item.accuracy)}</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                          <span>{item.attempted} attempted</span>
                          <span>{formatTime(Math.round(item.averageTime || 0))} avg</span>
                        </div>
                        <div className="mt-2 h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-500"
                            style={{ width: `${Math.min(100, item.accuracy)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Question type tags are unavailable for this simulation.</p>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300">
                  <TimerReset className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Time management highlights</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Spot questions that need pacing strategies</p>
                </div>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                {renderQuestionTimeList('Most time-intensive questions', slowestQuestions, 'No questions significantly exceeded the average pace.')}
                {renderQuestionTimeList('Fastest accurate responses', fastestWins, 'No fully correct responses recorded yet.')}
              </div>
            </div>

            {insights.length > 0 && (
              <div className="bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-yellow-100 dark:bg-yellow-900/30 p-3 text-yellow-600 dark:text-yellow-300">
                    <Lightbulb className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Strategic insights</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Tailored recommendations to inform your import decision and teaching plan
                    </p>
                    <ul className="mt-4 space-y-3">
                      {insights.map((insight, index) => (
                        <li
                          key={index}
                          className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white/90 dark:bg-gray-900/50 p-3"
                        >
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{insight.title}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-300">{insight.detail}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {showAnswersOnCompletion && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Detailed question review
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Analyse each response with topic, difficulty and time insights to validate data quality before importing.
                  </p>
                </div>
                {results.questionResults.map(result => {
                  const question = questionMap.get(result.questionId);
                  if (!question) return null;
                  const questionAccuracy = result.accuracy ?? (
                    result.totalMarks ? (result.earnedMarks / result.totalMarks) * 100 : 0
                  );
                  const timeSpent = Math.round(result.timeSpent || 0);
                  const partBreakdown = result.partBreakdown ?? [];
                  const statusClass = result.attempted
                    ? result.isCorrect
                      ? 'border-green-200 bg-green-50/60 dark:border-green-700/50 dark:bg-green-900/10'
                      : result.earnedMarks > 0
                      ? 'border-amber-200 bg-amber-50/70 dark:border-amber-700/40 dark:bg-amber-900/10'
                      : 'border-red-200 bg-red-50/70 dark:border-red-700/40 dark:bg-red-900/10'
                    : 'border-gray-200 bg-gray-50/70 dark:border-gray-800/60 dark:bg-gray-900/20';

                  return (
                    <div
                      key={result.questionId}
                      className={cn('rounded-2xl border p-5 shadow-sm transition-colors', statusClass)}
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="flex items-start gap-3">
                          {result.isCorrect ? (
                            <CheckCircle className="mt-1 h-6 w-6 text-green-600 dark:text-green-400" />
                          ) : result.earnedMarks > 0 ? (
                            <Target className="mt-1 h-6 w-6 text-amber-600 dark:text-amber-300" />
                          ) : (
                            <X className="mt-1 h-6 w-6 text-red-600 dark:text-red-300" />
                          )}
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              Question {result.questionNumber}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-300">{result.feedback}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {result.difficulty && (
                                <span className="inline-flex items-center rounded-full bg-white/80 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-900/60 dark:text-gray-300">
                                  Difficulty: {formatLabel(result.difficulty)}
                                </span>
                              )}
                              {result.questionType && (
                                <span className="inline-flex items-center rounded-full bg-white/80 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-900/60 dark:text-gray-300">
                                  Type: {formatLabel(result.questionType)}
                                </span>
                              )}
                              {(result.topics ?? []).map(topic => (
                                <span
                                  key={`topic-${topic}`}
                                  className="inline-flex items-center rounded-full bg-blue-100/80 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-200"
                                >
                                  Topic: {topic}
                                </span>
                              ))}
                              {(result.units ?? []).map(unit => (
                                <span
                                  key={`unit-${unit}`}
                                  className="inline-flex items-center rounded-full bg-green-100/80 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/40 dark:text-green-200"
                                >
                                  Unit: {unit}
                                </span>
                              ))}
                              {(result.subtopics ?? []).map(subtopic => (
                                <span
                                  key={`subtopic-${subtopic}`}
                                  className="inline-flex items-center rounded-full bg-purple-100/70 px-2.5 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-200"
                                >
                                  Subtopic: {subtopic}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="rounded-xl bg-white/70 px-4 py-3 text-right text-sm shadow-sm dark:bg-gray-900/40">
                          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Marks awarded</p>
                          <p className="text-lg font-semibold text-gray-900 dark:text-white">
                            {result.earnedMarks}/{result.totalMarks}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Accuracy {formatPercent(questionAccuracy)}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Time {formatTime(timeSpent)}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {result.attempted ? (result.isCorrect ? 'Fully correct' : result.earnedMarks > 0 ? 'Partially correct' : 'Attempted') : 'Not attempted'}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 space-y-4">
                        <div className="rounded-xl bg-white/80 p-4 dark:bg-gray-900/50">
                          <p className="text-sm text-gray-700 dark:text-gray-200">{question.question_description}</p>
                        </div>

                        {partBreakdown.length > 0 && (
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">Part-by-part performance</p>
                            <div className="mt-2 grid gap-2 md:grid-cols-2">
                              {partBreakdown.map(part => (
                                <div
                                  key={part.id}
                                  className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white/80 p-3 text-sm dark:bg-gray-900/40"
                                >
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <p className="font-medium text-gray-900 dark:text-white">{part.label}</p>
                                      <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {part.topic ? part.topic : summarise(part.subtopics)}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className="font-semibold text-gray-900 dark:text-white">
                                        {part.earnedMarks}/{part.totalMarks}
                                      </p>
                                      <p className="text-[11px] text-gray-500 dark:text-gray-400">{formatPercent(part.accuracy)}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {result.correctAnswers.length > 0 && (
                          <div className="rounded-xl bg-white/80 p-4 dark:bg-gray-900/50">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">Mark scheme guidance</p>
                            <ul className="mt-2 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                              {result.correctAnswers.map((ans, idx) => (
                                <li key={idx}>• {ans.answer}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {!result.isCorrect && result.attempted && (
                          <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-200">
                            <p className="font-semibold">Recommendation</p>
                            <p>
                              Revisit the examiner commentary and marking scheme for {summarise(result.topics)} to close the remaining gap.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-center gap-4 pt-4">
              <Button onClick={handleRetakeExam} variant="outline" size="lg">
                Retake test
              </Button>
              <Button onClick={handleExit} variant="default" size="lg">
                Close review
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={cn(
        "min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col",
        isFullscreen && "fixed inset-0 z-50"
      )}>
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  onClick={handleExit}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  title="Exit (Esc)"
                >
                  <X className="h-5 w-5" />
                </Button>

                <div>
                  <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {paper.code} - {paper.subject}
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {isQAMode ? 'QA Review Mode' : 'Simulation Preview'}
                    {features.enableTimer && ' • Timer Active'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-6">
                {features.enableTimer && examDuration > 0 && (
                  <div className={cn(
                    "flex items-center space-x-2 px-4 py-2 rounded-lg",
                    timeElapsed > examDuration * 0.8 ? "bg-red-100 dark:bg-red-900/20" : "bg-blue-100 dark:bg-blue-900/20"
                  )}>
                    <Clock className={cn(
                      "h-5 w-5",
                      timeElapsed > examDuration * 0.8 ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"
                    )} />
                    <span className={cn(
                      "font-mono text-lg font-semibold",
                      timeElapsed > examDuration * 0.8 ? "text-red-700 dark:text-red-300" : "text-blue-700 dark:text-blue-300"
                    )}>
                      {formatTime(examDuration - timeElapsed)}
                    </span>
                  </div>
                )}

                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <span>Progress:</span>
                  <span className="font-medium">{getAnsweredCount()}/{paper.questions.length}</span>
                  <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${calculateProgress()}%` }}
                    />
                  </div>
                </div>

                {isQAMode && (
                  <StatusBadge
                    status={allQuestionsVisited ? 'success' : 'warning'}
                    text={`QA Reviewed ${visitedCount}/${totalQuestions}`}
                  />
                )}
              </div>

              <div className="flex items-center space-x-3">
                {isQAMode && (
                  <Tooltip
                    content={allQuestionsVisited
                      ? 'Mark the QA review as complete and return to the question setup.'
                      : 'Visit every question to enable completion.'}
                  >
                    <Button
                      onClick={handleCompleteQAReview}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={!allQuestionsVisited}
                    >
                      Complete QA Review
                    </Button>
                  </Tooltip>
                )}

                {!isRunning && features.allowAnswerInput && (
                  <Button
                    onClick={startExam}
                    leftIcon={<Play className="h-4 w-4" />}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Start Exam
                  </Button>
                )}

                {isRunning && allowPause && (
                  <>
                    <Button
                      variant="outline"
                      onClick={pauseExam}
                      leftIcon={<Pause className="h-4 w-4" />}
                    >
                      Pause
                    </Button>
                    <Button
                      onClick={handleSubmitExam}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Submit Exam
                    </Button>
                  </>
                )}

                {!isRunning && timeElapsed > 0 && features.allowAnswerInput && (
                  <Button
                    variant="outline"
                    onClick={resumeExam}
                    leftIcon={<Play className="h-4 w-4" />}
                  >
                    Resume
                  </Button>
                )}

                <Button
                  variant="ghost"
                  onClick={toggleFullscreen}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Question Navigation Sidebar */}
          {showQuestionNavigation && (
            <div className={cn(
              "bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300",
              navigatorSize === 'compact' && "w-16",
              navigatorSize === 'normal' && "w-80",
              navigatorSize === 'expanded' && "w-96"
            )}>
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className={cn(
                    "font-semibold text-gray-900 dark:text-white",
                    navigatorSize === 'compact' && "text-xs text-center w-full"
                  )}>
                    {navigatorSize === 'compact' ? 'Q' : 'Questions'}
                  </h3>
                  {navigatorSize !== 'compact' && (
                    <div className="flex items-center space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setNavigatorSize(navigatorSize === 'normal' ? 'expanded' : 'normal')}
                        className="h-7 w-7 p-0"
                      >
                        {navigatorSize === 'normal' ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setNavigatorSize('compact')}
                        className="h-7 w-7 p-0"
                      >
                        <PanelLeftClose className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowQuestionNavigation(false)}
                        className="h-7 w-7 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  {navigatorSize === 'compact' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setNavigatorSize('normal')}
                      className="h-7 w-7 p-0"
                      title="Expand"
                    >
                      <PanelLeft className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                {navigatorSize !== 'compact' && (
                  <>
                    {/* Unified Feature Toggles */}
                    <div className="space-y-3 mb-4">
                      <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                        Simulation Features
                      </div>
                      <label className="flex items-center justify-between space-x-2 group cursor-pointer">
                        <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Enable Timer</span>
                        <input
                          type="checkbox"
                          checked={features.enableTimer}
                          onChange={(e) => setFeatures(prev => ({ ...prev, enableTimer: e.target.checked }))}
                          className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                        />
                      </label>
                      <label className="flex items-center justify-between space-x-2 group cursor-pointer">
                        <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Show Hints</span>
                        <input
                          type="checkbox"
                          checked={features.showHints}
                          onChange={(e) => setFeatures(prev => ({ ...prev, showHints: e.target.checked }))}
                          className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                        />
                      </label>
                      <label className="flex items-center justify-between space-x-2 group cursor-pointer">
                        <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Show Explanations</span>
                        <input
                          type="checkbox"
                          checked={features.showExplanations}
                          onChange={(e) => setFeatures(prev => ({ ...prev, showExplanations: e.target.checked }))}
                          className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                        />
                      </label>
                      <label className="flex items-center justify-between space-x-2 group cursor-pointer">
                        <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Show Correct Answers</span>
                        <input
                          type="checkbox"
                          checked={features.showCorrectAnswers}
                          onChange={(e) => setFeatures(prev => ({ ...prev, showCorrectAnswers: e.target.checked }))}
                          className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                        />
                      </label>
                      <label className="flex items-center justify-between space-x-2 group cursor-pointer">
                        <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Allow Answer Input</span>
                        <input
                          type="checkbox"
                          checked={features.allowAnswerInput}
                          onChange={(e) => setFeatures(prev => ({ ...prev, allowAnswerInput: e.target.checked }))}
                          className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                        />
                      </label>
                    </div>

                    {isQAMode && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 bg-blue-50/70 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40 rounded-md px-3 py-2 mb-4">
                        <p className="font-medium text-blue-700 dark:text-blue-200">
                          QA review progress: {visitedCount}/{totalQuestions} questions opened
                        </p>
                        {!allQuestionsVisited && (
                          <p>
                            Open every question to enable the <span className="font-semibold">Complete QA Review</span> button.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Feature status summary */}
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                        <p className="font-medium text-gray-700 dark:text-gray-300 mb-2">Active Features:</p>
                        {features.enableTimer && <p className="flex items-center"><span className="mr-2">•</span> Timer enabled</p>}
                        {features.showHints && <p className="flex items-center"><span className="mr-2">•</span> Hints visible</p>}
                        {features.showExplanations && <p className="flex items-center"><span className="mr-2">•</span> Explanations visible</p>}
                        {features.showCorrectAnswers && <p className="flex items-center"><span className="mr-2">•</span> Correct answers visible</p>}
                        {features.allowAnswerInput && <p className="flex items-center"><span className="mr-2">•</span> Answer input enabled</p>}
                        {!features.enableTimer && !features.showHints && !features.showExplanations && !features.showCorrectAnswers && !features.allowAnswerInput && (
                          <p className="text-gray-400 dark:text-gray-500 italic">All features disabled</p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex-1 overflow-y-auto">
                {navigatorSize === 'compact' ? (
                  <div className="p-2 space-y-1">
                    {paper.questions.map((question, index) => {
                      const status = getQuestionStatus(question.id, question.parts);
                      const isCurrent = index === currentQuestionIndex;
                      const isFlagged = flaggedQuestions.has(question.id);

                      return (
                        <button
                          key={question.id}
                          onClick={() => goToQuestion(index)}
                          className={cn(
                            "w-full h-10 flex items-center justify-center rounded transition-all duration-200",
                            isCurrent && "ring-2 ring-blue-500",
                            status === 'answered' && "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
                            status === 'partial' && "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300",
                            status === 'unanswered' && "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                          )}
                          title={`Question ${index + 1}`}
                        >
                          <span className="font-bold text-xs">{index + 1}</span>
                          {isFlagged && (
                            <Flag className="absolute -top-1 -left-1 h-3 w-3 text-red-500" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4">
                    <div className="grid grid-cols-5 gap-2">
                      {paper.questions.map((question, index) => {
                        const status = getQuestionStatus(question.id, question.parts);
                        const isCurrent = index === currentQuestionIndex;
                        const isFlagged = flaggedQuestions.has(question.id);

                        return (
                          <Tooltip
                            key={question.id}
                            content={`Question ${index + 1}: ${question.question_description.substring(0, 50)}...`}
                          >
                            <button
                              onClick={() => goToQuestion(index)}
                              className={cn(
                                "relative p-3 rounded-lg text-sm font-medium transition-all hover:shadow-md",
                                isCurrent && "ring-2 ring-blue-500",
                                status === 'answered' && "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
                                status === 'partial' && "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300",
                                status === 'unanswered' && "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                              )}
                            >
                              {index + 1}
                              {status === 'answered' && (
                                <CheckCircle className="absolute -top-1 -right-1 h-4 w-4 text-green-500" />
                              )}
                              {isFlagged && (
                                <Flag className="absolute -top-1 -left-1 h-4 w-4 text-red-500" />
                              )}
                            </button>
                          </Tooltip>
                        );
                      })}
                    </div>

                    <div className="mt-6 space-y-2 text-xs">
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-green-100 dark:bg-green-900/30 rounded" />
                        <span className="text-gray-600 dark:text-gray-400">Answered</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-yellow-100 dark:bg-yellow-900/30 rounded" />
                        <span className="text-gray-600 dark:text-gray-400">Partially Answered</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-gray-100 dark:bg-gray-700 rounded" />
                        <span className="text-gray-600 dark:text-gray-400">Not Answered</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Question Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {!showQuestionNavigation && (
              <div className="p-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowQuestionNavigation(true)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <PanelLeft className="h-4 w-4 mr-2" />
                  Show Questions
                </Button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              <div className="max-w-4xl mx-auto p-6">
                {currentQuestion && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                            Question {currentQuestionIndex + 1}
                          </h2>
                          <StatusBadge status={currentQuestion.type} />
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {currentQuestion.marks} mark{currentQuestion.marks !== 1 ? 's' : ''}
                          </span>
                          {currentQuestion.difficulty && (
                            <span className={cn(
                              "px-2 py-1 rounded-full text-xs font-medium",
                              currentQuestion.difficulty === 'easy' && "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
                              currentQuestion.difficulty === 'medium' && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
                              currentQuestion.difficulty === 'hard' && "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                            )}>
                              {currentQuestion.difficulty}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleQuestionFlag(currentQuestion.id)}
                            className={cn(
                              flaggedQuestions.has(currentQuestion.id)
                                ? "text-red-600 dark:text-red-400"
                                : "text-gray-400 dark:text-gray-500"
                            )}
                          >
                            <Flag className="h-4 w-4" />
                          </Button>

                          {currentQuestion.topic_name && (
                            <span className="text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                              {currentQuestion.topic_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="p-6">
                      <div className="prose dark:prose-invert max-w-none mb-6">
                        <p className="text-gray-900 dark:text-white text-lg leading-relaxed">
                          {currentQuestion.question_description}
                        </p>
                      </div>

                      {currentQuestion.attachments && currentQuestion.attachments.length > 0 && (
                        <div className="mb-6">
                          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Reference Materials:
                          </h4>
                          <AttachmentGallery attachments={currentQuestion.attachments} />
                        </div>
                      )}

                      {currentQuestion.parts.length === 0 && (
                        <div className="mb-6">
                          <DynamicAnswerField
                            question={{
                              ...currentQuestion,
                              subject: paper.subject,
                              options: currentQuestion.options?.map((opt, optionIndex) => ({
                                label: String.fromCharCode(65 + optionIndex),
                                text: opt.option_text,
                                is_correct: opt.is_correct
                              }))
                            }}
                            value={userAnswers[currentQuestion.id]?.answer}
                            onChange={(answer) => handleAnswerChange(currentQuestion.id, undefined, undefined, answer)}
                            disabled={!isQAMode && (!isRunning && !features.allowAnswerInput)}
                            showHints={features.showHints}
                            showCorrectAnswer={features.showCorrectAnswers || isQAMode}
                            mode={isQAMode ? 'qa_preview' : (features.showCorrectAnswers ? 'review' : 'practice')}
                          />
                        </div>
                      )}

                      {features.showCorrectAnswers && currentQuestion.parts.length === 0 && (
                        <TeacherInsights
                          correctAnswers={buildNormalisedCorrectAnswers(currentQuestion)}
                          answerRequirement={currentQuestion.answer_requirement}
                          markingCriteria={currentQuestion.marking_criteria}
                          requiresManualMarking={currentQuestion.requires_manual_marking}
                          label="Main question"
                        />
                      )}

                      {features.showHints && currentQuestion.hint && (
                        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <div className="flex items-start space-x-2">
                            <HelpCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                            <div>
                              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">Hint</h4>
                              <p className="text-blue-800 dark:text-blue-200">{currentQuestion.hint}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {currentQuestion.parts.length > 0 && (
                        <div className="space-y-6">
                          {currentQuestion.parts.map((part, partIndex) => {
                            const partLabel = part.part_label || `Part ${String.fromCharCode(65 + partIndex)}`;
                            return (
                              <div key={part.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                                <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-medium text-gray-900 dark:text-white">{partLabel}</h4>
                                    <div className="flex items-center space-x-2">
                                      <span className="text-sm text-gray-600 dark:text-gray-400">
                                        {part.marks} mark{part.marks !== 1 ? 's' : ''}
                                      </span>
                                      {part.difficulty && (
                                        <span className={cn(
                                          "px-2 py-1 rounded-full text-xs font-medium",
                                          part.difficulty === 'easy' && "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
                                          part.difficulty === 'medium' && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
                                          part.difficulty === 'hard' && "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                                        )}>
                                          {part.difficulty}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="p-4">
                                  <div className="prose dark:prose-invert max-w-none mb-4">
                                    <p className="text-gray-900 dark:text-white">
                                      {part.question_description}
                                    </p>
                                  </div>

                                  {part.attachments && part.attachments.length > 0 && (
                                    <div className="mb-4">
                                      <h5 className="text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-2">
                                        Supporting resources
                                      </h5>
                                      <AttachmentGallery attachments={part.attachments} />
                                    </div>
                                  )}

                                  <DynamicAnswerField
                                    question={{
                                      ...part,
                                      subject: paper.subject,
                                      options: part.options?.map(opt => ({
                                        label: opt.option_text || opt.id,
                                        text: opt.option_text,
                                        is_correct: opt.is_correct
                                      }))
                                    }}
                                    value={userAnswers[`${currentQuestion.id}-${part.id}`]?.answer}
                                    onChange={(answer) => handleAnswerChange(currentQuestion.id, part.id, undefined, answer)}
                                    disabled={!isQAMode && (!isRunning && !features.allowAnswerInput)}
                                    showHints={features.showHints}
                                    showCorrectAnswer={features.showCorrectAnswers || isQAMode}
                                    mode={isQAMode ? 'qa_preview' : (features.showCorrectAnswers ? 'review' : 'practice')}
                                  />

                                  {features.showCorrectAnswers && (
                                    <TeacherInsights
                                      correctAnswers={buildNormalisedCorrectAnswers(part)}
                                      answerRequirement={part.answer_requirement}
                                      markingCriteria={part.marking_criteria}
                                      requiresManualMarking={part.requires_manual_marking}
                                      label={partLabel}
                                    />
                                  )}

                                  {features.showHints && part.hint && (
                                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
                                      <div className="flex items-start space-x-2">
                                        <HelpCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                                        <p className="text-sm text-blue-800 dark:text-blue-200">{part.hint}</p>
                                      </div>
                                    </div>
                                  )}

                                  {part.subparts && part.subparts.length > 0 && (
                                    <div className="mt-6 space-y-4">
                                      {part.subparts.map((subpart, subIndex) => {
                                        const subpartLabel = subpart.subpart_label || formatSubpartLabel(subIndex);
                                        const answerKey = `${currentQuestion.id}-${part.id}-${subpart.id}`;

                                        return (
                                          <div
                                            key={subpart.id}
                                            className="border border-dashed border-gray-200 dark:border-gray-700 rounded-lg"
                                          >
                                            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                                              <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100">{subpartLabel}</h5>
                                              <span className="text-xs text-gray-600 dark:text-gray-300">
                                                {subpart.marks} mark{subpart.marks !== 1 ? 's' : ''}
                                              </span>
                                            </div>
                                            <div className="p-4 space-y-4">
                                              <p className="text-sm text-gray-900 dark:text-gray-100">
                                                {subpart.question_description}
                                              </p>

                                              {subpart.attachments && subpart.attachments.length > 0 && (
                                                <AttachmentGallery attachments={subpart.attachments} />
                                              )}

                                              <DynamicAnswerField
                                                question={{
                                                  ...subpart,
                                                  id: subpart.id,
                                                  type: subpart.type || 'descriptive',
                                                  subject: paper.subject,
                                                  options: subpart.options?.map((opt, optIndex) => ({
                                                    label: opt?.option_text || opt?.id || String.fromCharCode(65 + optIndex),
                                                    text: opt?.option_text || '',
                                                    is_correct: opt?.is_correct
                                                  }))
                                                }}
                                                value={userAnswers[answerKey]?.answer}
                                                onChange={(answer) => handleAnswerChange(currentQuestion.id, part.id, subpart.id, answer)}
                                                disabled={!isQAMode && (!isRunning && !features.allowAnswerInput)}
                                                showHints={features.showHints}
                                                showCorrectAnswer={features.showCorrectAnswers || isQAMode}
                                                mode={isQAMode ? 'qa_preview' : (features.showCorrectAnswers ? 'review' : 'practice')}
                                              />

                                              {features.showCorrectAnswers && (
                                                <TeacherInsights
                                                  correctAnswers={buildNormalisedCorrectAnswers(subpart)}
                                                  answerRequirement={subpart.answer_requirement}
                                                  markingCriteria={subpart.marking_criteria}
                                                  requiresManualMarking={subpart.requires_manual_marking}
                                                  label={`${partLabel} ${subpartLabel}`}
                                                />
                                              )}

                                              {features.showHints && subpart.hint && (
                                                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
                                                  <div className="flex items-start space-x-2">
                                                    <HelpCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                                                    <p className="text-sm text-blue-800 dark:text-blue-200">{subpart.hint}</p>
                                                  </div>
                                                </div>
                                              )}

                                              {features.showExplanations && subpart.explanation && (
                                                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
                                                  <div className="flex items-start space-x-2">
                                                    <BookOpen className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5" />
                                                    <div>
                                                      <h6 className="text-sm font-medium text-green-900 dark:text-green-100">
                                                        Explanation
                                                      </h6>
                                                      <p className="text-xs text-green-800 dark:text-green-200">{subpart.explanation}</p>
                                                    </div>
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {features.showExplanations && part.explanation && (
                                    <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
                                      <div className="flex items-start space-x-2">
                                        <BookOpen className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5" />
                                        <div>
                                          <h5 className="font-medium text-green-900 dark:text-green-100 mb-1">Explanation</h5>
                                          <p className="text-sm text-green-800 dark:text-green-200">{part.explanation}</p>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {features.showExplanations && currentQuestion.explanation && (
                        <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                          <div className="flex items-start space-x-2">
                            <BookOpen className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                            <div>
                              <h4 className="font-medium text-green-900 dark:text-green-100 mb-1">Explanation</h4>
                              <p className="text-green-800 dark:text-green-200">{currentQuestion.explanation}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex-shrink-0">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <Button
              variant="outline"
              onClick={goToPreviousQuestion}
              disabled={currentQuestionIndex === 0}
              leftIcon={<ChevronLeft className="h-4 w-4" />}
            >
              Previous
            </Button>

            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Question {currentQuestionIndex + 1} of {paper.questions.length}
              </span>

              <div className="text-sm text-gray-600 dark:text-gray-400">
                Time: {formatTime(timeElapsed)}
              </div>
            </div>

            <Button
              variant="outline"
              onClick={goToNextQuestion}
              disabled={currentQuestionIndex === paper.questions.length - 1}
              rightIcon={<ChevronRight className="h-4 w-4" />}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      <ConfirmationDialog
        isOpen={Boolean(exitDialogConfig)}
        title={exitDialogConfig?.title ?? ''}
        message={exitDialogConfig?.message ?? null}
        confirmText={exitDialogConfig?.confirmText}
        confirmVariant={exitDialogConfig?.confirmVariant}
        onConfirm={handleConfirmExitDialog}
        onCancel={handleCancelExitDialog}
      />
    </>
  );
}
