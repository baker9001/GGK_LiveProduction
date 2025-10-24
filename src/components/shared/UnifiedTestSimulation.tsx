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
  TrendingUp
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
    userAnswer: unknown;
    correctAnswers: CorrectAnswer[];
    feedback: string;
  }>;
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

  // Filter out attachments with no valid file_url or empty URLs
  // Only keep attachments that have actual content to display
  const validAttachments = attachments.filter(attachment => {
    const hasValidUrl = attachment.file_url && attachment.file_url.trim() !== '';
    const isDescriptionOnly = !hasValidUrl && attachment.file_type === 'text/description';

    // Keep description-only attachments (placeholders) in QA mode
    // But filter out completely invalid/empty attachments
    return hasValidUrl || isDescriptionOnly;
  });

  // If no valid attachments remain after filtering, don't render anything
  if (validAttachments.length === 0) {
    return null;
  }

  const closePreview = () => setPreviewAttachment(null);

  return (
    <>
      <div className="space-y-6">
        {validAttachments.map((attachment, index) => {
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
                          console.error('Failed to load attachment image:', {
                            file_name: attachment.file_name,
                            file_url_length: attachment.file_url?.length,
                            file_url_starts_with: attachment.file_url?.substring(0, 100),
                            is_data_url: attachment.file_url?.startsWith('data:'),
                            error: e
                          });
                          if (parent) {
                            target.style.display = 'none';
                            const isDataUrl = attachment.file_url?.startsWith('data:');
                            const urlLength = attachment.file_url?.length || 0;
                            parent.innerHTML = `
                              <div class="flex items-center justify-center h-48 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg">
                                <div class="text-center p-4">
                                  <p class="text-sm font-medium text-red-800 dark:text-red-200 mb-2">Failed to load image</p>
                                  <p class="text-xs text-red-600 dark:text-red-400 mt-1">${attachment.file_name}</p>
                                  <p class="text-[10px] text-red-500 dark:text-red-500 mt-2">Type: ${isDataUrl ? 'Data URL' : 'Remote URL'} • Size: ${urlLength} chars</p>
                                  <p class="text-[10px] text-red-500 dark:text-red-500 mt-1">Check browser console for details</p>
                                </div>
                              </div>
                            `;
                          }
                        }}
                        onLoad={() => {
                          console.log('Successfully loaded attachment:', {
                            file_name: attachment.file_name,
                            file_url_length: attachment.file_url?.length,
                            is_data_url: attachment.file_url?.startsWith('data:')
                          });
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
  const examDuration = paper.duration ? parseInt(paper.duration) * 60 : 0;
  const visitedCount = visitedQuestions.size;
  const allQuestionsVisited = totalQuestions > 0 && visitedCount === totalQuestions;

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
      const getQuestionMarks = (question: Question): { earned: number; total: number } => {
        if (question.parts.length === 0) {
          const answer = userAnswers[question.id];
          return {
            earned: answer?.marksAwarded || 0,
            total: question.marks
          };
        }

        let totalEarned = 0;
        let totalPossible = 0;

        question.parts.forEach(part => {
          if (part.subparts && part.subparts.length > 0) {
            part.subparts.forEach(subpart => {
              const key = `${question.id}-${part.id}-${subpart.id}`;
              const answer = userAnswers[key];
              totalEarned += answer?.marksAwarded || 0;
              totalPossible += subpart.marks;
            });
          } else {
            const key = `${question.id}-${part.id}`;
            const answer = userAnswers[key];
            totalEarned += answer?.marksAwarded || 0;
            totalPossible += part.marks;
          }
        });

        return { earned: totalEarned, total: totalPossible };
      };

      const marks = getQuestionMarks(q);
      const isCorrect = marks.earned === marks.total && marks.total > 0;

      return {
        questionId: q.id,
        questionNumber: q.question_number,
        isCorrect,
        earnedMarks: marks.earned,
        totalMarks: marks.total,
        userAnswer: userAnswers[q.id]?.answer,
        correctAnswers: buildNormalisedCorrectAnswers(q),
        feedback: isCorrect ? 'Correct answer!' : marks.earned > 0 ? 'Partially correct' : 'Incorrect answer'
      };
    });

    const totalCorrect = questionResults.filter(r => r.isCorrect).length;
    const totalPartial = questionResults.filter(r => !r.isCorrect && r.earnedMarks > 0).length;
    const totalIncorrect = questionResults.filter(r => r.earnedMarks === 0).length;
    const earnedMarks = questionResults.reduce((sum, r) => sum + r.earnedMarks, 0);
    const answeredCount = Object.values(userAnswers).filter(a => a.answer !== undefined && a.answer !== '').length;

    const simulationResults: SimulationResults = {
      totalQuestions: paper.questions.length,
      answeredQuestions: answeredCount,
      correctAnswers: totalCorrect,
      partiallyCorrect: totalPartial,
      incorrectAnswers: totalIncorrect,
      totalMarks: paper.total_marks,
      earnedMarks: earnedMarks,
      percentage: Math.round((earnedMarks / paper.total_marks) * 100),
      timeSpent: timeElapsed,
      questionResults
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
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Test Results
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {paper.code} - {paper.subject}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto p-6">
            <div className="mb-8 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                <Award className="h-10 w-10 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Test Completed!
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {paper.code}
              </p>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-8 mb-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                    {results.percentage}%
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Score</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                    {results.earnedMarks}/{results.totalMarks}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Marks</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-600 dark:text-green-400 mb-2">
                    {results.correctAnswers}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Correct</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-gray-600 dark:text-gray-400 mb-2">
                    {formatTime(results.timeSpent)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Time Spent</div>
                </div>
              </div>
            </div>

            {showAnswersOnCompletion && (
              <div className="space-y-4 mb-8">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Question-by-Question Results
                </h2>
                {results.questionResults.map((result, index) => {
                  const question = paper.questions.find(q => q.id === result.questionId);
                  if (!question) return null;

                  return (
                    <div
                      key={result.questionId}
                      className={cn(
                        'border-2 rounded-lg p-4',
                        result.isCorrect
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                          : result.earnedMarks > 0
                          ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700'
                          : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                      )}
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex items-center gap-3">
                          {result.isCorrect ? (
                            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                          ) : (
                            <X className="h-6 w-6 text-red-600 dark:text-red-400" />
                          )}
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              Question {result.questionNumber}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {result.feedback}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900 dark:text-white">
                            {result.earnedMarks}/{result.totalMarks}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">marks</div>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-300 dark:border-gray-600">
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                          {question.question_description}
                        </p>
                        {result.correctAnswers.length > 0 && (
                          <div className="mt-2 p-2 bg-white/60 dark:bg-gray-800/60 rounded">
                            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Correct Answer(s):
                            </p>
                            <ul className="text-sm text-gray-900 dark:text-white space-y-1">
                              {result.correctAnswers.map((ans, idx) => (
                                <li key={idx}>• {ans.answer}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-center gap-4">
              <Button onClick={handleRetakeExam} variant="outline" size="lg">
                Retake Test
              </Button>
              <Button onClick={handleExit} variant="default" size="lg">
                Close Review
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
