import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit2,
  Save,
  X,
  CheckCircle,
  AlertCircle,
  BookOpen,
  GraduationCap,
  Target,
  Award,
  ListChecks,
  FileText,
  Image as ImageIcon,
  Maximize2,
  Download,
  ExternalLink,
  HelpCircle,
  Lightbulb,
  Flag,
  PlayCircle,
  Settings
} from 'lucide-react';
import { Button } from '../../../../../../../components/shared/Button';
import { StatusBadge } from '../../../../../../../components/shared/StatusBadge';
import { cn } from '../../../../../../../lib/utils';
import DynamicAnswerField from '../../../../../../../components/shared/DynamicAnswerField';

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

interface SubPart {
  id: string;
  subpart_label?: string;
  question_description: string;
  marks: number;
  answer_format?: string;
  answer_requirement?: string;
  correct_answers?: CorrectAnswer[];
  correct_answer?: string;
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
  answer_format?: string;
  answer_requirement?: string;
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

interface TeacherReviewModeProps {
  questions: Question[];
  paperMetadata: {
    code?: string;
    subject?: string;
    total_marks?: number;
  };
  onClose: () => void;
  onEditQuestion?: (questionId: string) => void;
  onValidationComplete?: () => void;
}

const formatAnswerRequirement = (requirement?: string): string | null => {
  if (!requirement) return null;
  const requirementMap: Record<string, string> = {
    any_one_from: 'Any one response from the acceptable answers',
    any_two_from: 'Any two responses from the acceptable answers',
    any_three_from: 'Any three responses from the acceptable answers',
    both_required: 'All listed responses are required',
    all_required: 'Every listed response is required',
    alternative_methods: 'Alternative methods accepted when working is clear',
    acceptable_variations: 'Acceptable phrasing variations allowed'
  };
  return requirementMap[requirement] || requirement;
};

const romanNumerals = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii'];
const formatSubpartLabel = (index: number) => {
  return romanNumerals[index] ? `(${romanNumerals[index]})` : `Subpart ${index + 1}`;
};

const AttachmentGallery: React.FC<{ attachments: AttachmentAsset[] }> = ({ attachments }) => {
  const [previewAttachment, setPreviewAttachment] = useState<AttachmentAsset | null>(null);

  if (!attachments || attachments.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {attachments.map((attachment, index) => {
          const isImage = attachment.file_type?.startsWith('image/');
          const id = attachment.id || `${attachment.file_url}-${index}`;

          return (
            <div
              key={id}
              className="group relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow"
            >
              {isImage ? (
                <button
                  type="button"
                  onClick={() => setPreviewAttachment(attachment)}
                  className="w-full bg-gray-50 dark:bg-gray-950"
                >
                  <img
                    src={attachment.file_url}
                    alt={attachment.file_name || 'Attachment'}
                    className="w-full h-48 object-contain"
                  />
                </button>
              ) : (
                <div className="p-4 bg-gray-50 dark:bg-gray-950 flex items-center gap-3">
                  <FileText className="h-6 w-6 text-gray-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {attachment.file_name || 'Attachment'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {attachment.file_type || 'Unknown type'}
                    </p>
                  </div>
                </div>
              )}

              <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {isImage && (
                  <button
                    type="button"
                    onClick={() => setPreviewAttachment(attachment)}
                    className="h-9 w-9 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </button>
                )}
                <a
                  href={attachment.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-9 w-9 flex items-center justify-center rounded-full bg-white text-gray-700 hover:text-blue-600 dark:bg-gray-800"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {previewAttachment && previewAttachment.file_type?.startsWith('image/') && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
          onClick={() => setPreviewAttachment(null)}
        >
          <div className="relative max-h-[90vh] max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setPreviewAttachment(null)}
              className="absolute -top-12 right-0 h-10 w-10 flex items-center justify-center rounded-full bg-white text-gray-700 hover:text-red-500"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={previewAttachment.file_url}
              alt={previewAttachment.file_name || 'Preview'}
              className="max-h-[90vh] w-full rounded-xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
    </>
  );
};

const MarkingGuidancePanel: React.FC<{
  correctAnswers?: CorrectAnswer[];
  answerRequirement?: string;
  markingCriteria?: string | string[] | Record<string, unknown>;
  requiresManualMarking?: boolean;
  label?: string;
  totalMarks?: number;
}> = ({ correctAnswers, answerRequirement, markingCriteria, requiresManualMarking, label, totalMarks }) => {
  const hasAnswers = (correctAnswers?.length || 0) > 0;
  const requirementText = formatAnswerRequirement(answerRequirement);

  const normalisedCriteria = useMemo(() => {
    if (!markingCriteria) return [];
    if (Array.isArray(markingCriteria)) return markingCriteria.filter(Boolean).map(String);
    if (typeof markingCriteria === 'string') return [markingCriteria];
    if (typeof markingCriteria === 'object') {
      return Object.entries(markingCriteria).map(([key, value]) => `${key}: ${value}`);
    }
    return [];
  }, [markingCriteria]);

  const hasCriteria = normalisedCriteria.length > 0;
  const showPanel = hasAnswers || requirementText || hasCriteria || requiresManualMarking;

  if (!showPanel) return null;

  return (
    <div className="mt-4 p-5 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-xl">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
          <GraduationCap className="h-6 w-6 text-amber-600 dark:text-amber-300" />
        </div>
        <div className="flex-1 space-y-4">
          <div>
            <h4 className="text-base font-semibold text-amber-900 dark:text-amber-100">
              {label ? `${label} • ` : ''}IGCSE Teacher Review
            </h4>
            <p className="text-sm text-amber-700 dark:text-amber-200 mt-1">
              Preview the full marking guidance before publishing to students.
            </p>
          </div>

          {requirementText && (
            <div className="flex items-start gap-2 p-3 bg-white/60 dark:bg-amber-900/40 rounded-lg">
              <Target className="h-5 w-5 text-amber-600 dark:text-amber-300 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-amber-900 dark:text-amber-100">
                  Answer expectation
                </div>
                <div className="text-sm text-amber-800 dark:text-amber-100 mt-1">
                  {requirementText}
                </div>
              </div>
            </div>
          )}

          {hasAnswers && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-sm font-medium text-amber-900 dark:text-amber-100">
                  <ListChecks className="h-5 w-5" />
                  <span>Acceptable answers & mark allocation</span>
                </div>
                {totalMarks !== undefined && (
                  <span className="text-sm font-semibold text-amber-600 dark:text-amber-300 px-3 py-1 bg-white/60 dark:bg-amber-900/40 rounded-full">
                    Total: {totalMarks} mark{totalMarks !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {correctAnswers!.map((answer, index) => (
                  <div
                    key={index}
                    className="p-3 bg-white dark:bg-amber-900/40 border border-amber-200 dark:border-amber-700 rounded-lg"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-amber-700 dark:text-amber-200 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/60 rounded">
                            Response {index + 1}
                          </span>
                          {answer.marks !== undefined && (
                            <span className="text-xs font-semibold text-green-700 dark:text-green-300 px-2 py-0.5 bg-green-100 dark:bg-green-900/40 rounded">
                              {answer.marks} mark{answer.marks !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-amber-900 dark:text-amber-50">
                          {answer.answer || '—'}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {answer.unit && (
                            <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-full">
                              Unit: {answer.unit}
                            </span>
                          )}
                          {answer.accepts_equivalent_phrasing && (
                            <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 rounded-full">
                              Equivalent phrasing accepted
                            </span>
                          )}
                          {answer.error_carried_forward && (
                            <span className="text-xs px-2 py-0.5 bg-orange-100 dark:bg-orange-900/60 text-orange-700 dark:text-orange-300 rounded-full">
                              ECF permitted
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {hasCriteria && (
            <div className="p-3 bg-white/60 dark:bg-amber-900/40 rounded-lg">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-900 dark:text-amber-50 mb-2">
                <Award className="h-5 w-5" />
                <span>Marking guidance</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-sm text-amber-800 dark:text-amber-100">
                {normalisedCriteria.map((criterion, index) => (
                  <li key={index}>{criterion}</li>
                ))}
              </ul>
            </div>
          )}

          {requiresManualMarking && (
            <div className="flex items-start gap-2 p-3 bg-orange-100 dark:bg-orange-900/40 border border-orange-200 dark:border-orange-700 rounded-lg">
              <HelpCircle className="h-5 w-5 text-orange-600 dark:text-orange-300 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-orange-800 dark:text-orange-100">
                Manual review needed. Double-check the worked solution and method marks before finalising grades.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export function TeacherReviewMode({
  questions,
  paperMetadata,
  onClose,
  onEditQuestion,
  onValidationComplete
}: TeacherReviewModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reviewedQuestions, setReviewedQuestions] = useState<Set<string>>(new Set());
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());

  const currentQuestion = questions[currentIndex];
  const isReviewed = reviewedQuestions.has(currentQuestion?.id);
  const isFlagged = flaggedQuestions.has(currentQuestion?.id);

  const progress = useMemo(() => {
    return questions.length > 0 ? (reviewedQuestions.size / questions.length) * 100 : 0;
  }, [reviewedQuestions.size, questions.length]);

  const handleMarkAsReviewed = () => {
    if (currentQuestion) {
      setReviewedQuestions(prev => new Set([...prev, currentQuestion.id]));
    }
  };

  const handleToggleFlag = () => {
    if (currentQuestion) {
      setFlaggedQuestions(prev => {
        const newSet = new Set(prev);
        if (newSet.has(currentQuestion.id)) {
          newSet.delete(currentQuestion.id);
        } else {
          newSet.add(currentQuestion.id);
        }
        return newSet;
      });
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleCompleteReview = () => {
    if (onValidationComplete) {
      onValidationComplete();
    }
  };

  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">No questions available to review</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
              >
                <X className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {paperMetadata.code || 'Paper'} - Teacher Review Mode
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Review questions before final import
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Progress: {reviewedQuestions.size}/{questions.length}
                </div>
                <div className="w-48 h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-1">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {reviewedQuestions.size === questions.length && (
                <Button
                  onClick={handleCompleteReview}
                  leftIcon={<CheckCircle className="h-4 w-4" />}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Complete Review
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Question Header */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Question {currentIndex + 1}
                  </h2>
                  <StatusBadge status={currentQuestion.type} />
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
                    {currentQuestion.marks} mark{currentQuestion.marks !== 1 ? 's' : ''}
                  </span>
                  {currentQuestion.difficulty && (
                    <span className={cn(
                      "px-3 py-1 rounded-full text-sm font-medium",
                      currentQuestion.difficulty === 'easy' && "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
                      currentQuestion.difficulty === 'medium' && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
                      currentQuestion.difficulty === 'hard' && "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                    )}>
                      {currentQuestion.difficulty}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleToggleFlag}
                    className={cn(
                      isFlagged ? "text-red-600 dark:text-red-400" : "text-gray-400 dark:text-gray-500"
                    )}
                  >
                    <Flag className="h-5 w-5" />
                  </Button>
                  {onEditQuestion && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEditQuestion(currentQuestion.id)}
                      leftIcon={<Edit2 className="h-4 w-4" />}
                    >
                      Edit
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={handleMarkAsReviewed}
                    disabled={isReviewed}
                    leftIcon={<CheckCircle className="h-4 w-4" />}
                    className={cn(
                      isReviewed
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                    )}
                  >
                    {isReviewed ? 'Reviewed' : 'Mark as Reviewed'}
                  </Button>
                </div>
              </div>

              {currentQuestion.topic_name && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="px-3 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-sm">
                    {currentQuestion.topic_name}
                  </span>
                  {currentQuestion.subtopic_names?.map((subtopic, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full text-xs"
                    >
                      {subtopic}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Question Content */}
            <div className="p-6 space-y-6">
              <div className="prose dark:prose-invert max-w-none">
                <p className="text-lg leading-relaxed text-gray-900 dark:text-white">
                  {currentQuestion.question_description}
                </p>
              </div>

              {currentQuestion.attachments && currentQuestion.attachments.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Reference Materials
                  </h4>
                  <AttachmentGallery attachments={currentQuestion.attachments} />
                </div>
              )}

              {currentQuestion.hint && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">Hint</h4>
                      <p className="text-sm text-blue-800 dark:text-blue-200">{currentQuestion.hint}</p>
                    </div>
                  </div>
                </div>
              )}

              {currentQuestion.parts.length === 0 && (
                <MarkingGuidancePanel
                  correctAnswers={currentQuestion.correct_answers}
                  answerRequirement={currentQuestion.answer_requirement}
                  markingCriteria={currentQuestion.marking_criteria}
                  requiresManualMarking={currentQuestion.requires_manual_marking}
                  label="Main question"
                  totalMarks={currentQuestion.marks}
                />
              )}

              {currentQuestion.parts.length > 0 && (
                <div className="space-y-6">
                  {currentQuestion.parts.map((part, partIndex) => {
                    const partLabel = part.part_label || `Part ${String.fromCharCode(65 + partIndex)}`;
                    return (
                      <div
                        key={part.id}
                        className="border-2 border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"
                      >
                        <div className="bg-gray-50 dark:bg-gray-800 px-5 py-3 border-b border-gray-200 dark:border-gray-700">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-gray-900 dark:text-white">{partLabel}</h4>
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                              {part.marks} mark{part.marks !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>

                        <div className="p-5 space-y-4">
                          <p className="text-gray-900 dark:text-white">{part.question_description}</p>

                          {part.attachments && part.attachments.length > 0 && (
                            <AttachmentGallery attachments={part.attachments} />
                          )}

                          {part.hint && (
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                              <div className="flex items-start gap-2">
                                <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-blue-800 dark:text-blue-200">{part.hint}</p>
                              </div>
                            </div>
                          )}

                          <MarkingGuidancePanel
                            correctAnswers={part.correct_answers}
                            answerRequirement={part.answer_requirement}
                            markingCriteria={part.marking_criteria}
                            requiresManualMarking={part.requires_manual_marking}
                            label={partLabel}
                            totalMarks={part.marks}
                          />

                          {part.subparts && part.subparts.length > 0 && (
                            <div className="mt-4 space-y-3">
                              {part.subparts.map((subpart, subIndex) => {
                                const subpartLabel = subpart.subpart_label || formatSubpartLabel(subIndex);
                                return (
                                  <div
                                    key={subpart.id}
                                    className="border border-dashed border-gray-300 dark:border-gray-700 rounded-lg"
                                  >
                                    <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900/60 border-b border-gray-300 dark:border-gray-700 flex items-center justify-between">
                                      <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {subpartLabel}
                                      </h5>
                                      <span className="text-xs text-gray-600 dark:text-gray-400">
                                        {subpart.marks} mark{subpart.marks !== 1 ? 's' : ''}
                                      </span>
                                    </div>
                                    <div className="p-4 space-y-3">
                                      <p className="text-sm text-gray-900 dark:text-gray-100">
                                        {subpart.question_description}
                                      </p>

                                      {subpart.attachments && subpart.attachments.length > 0 && (
                                        <AttachmentGallery attachments={subpart.attachments} />
                                      )}

                                      <MarkingGuidancePanel
                                        correctAnswers={subpart.correct_answers}
                                        answerRequirement={subpart.answer_requirement}
                                        markingCriteria={subpart.marking_criteria}
                                        requiresManualMarking={subpart.requires_manual_marking}
                                        label={`${partLabel} ${subpartLabel}`}
                                        totalMarks={subpart.marks}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {part.explanation && (
                            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                              <div className="flex items-start gap-3">
                                <BookOpen className="h-5 w-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                                <div>
                                  <h5 className="font-medium text-purple-900 dark:text-purple-100 mb-1">
                                    Explanation
                                  </h5>
                                  <p className="text-sm text-purple-800 dark:text-purple-200">{part.explanation}</p>
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

              {currentQuestion.explanation && (
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <BookOpen className="h-5 w-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-purple-900 dark:text-purple-100 mb-1">Explanation</h4>
                      <p className="text-sm text-purple-800 dark:text-purple-200">
                        {currentQuestion.explanation}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            leftIcon={<ChevronLeft className="h-4 w-4" />}
          >
            Previous
          </Button>

          <div className="text-center">
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              Question {currentIndex + 1} of {questions.length}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {reviewedQuestions.size} reviewed • {flaggedQuestions.size} flagged
            </div>
          </div>

          <Button
            variant="outline"
            onClick={handleNext}
            disabled={currentIndex === questions.length - 1}
            rightIcon={<ChevronRight className="h-4 w-4" />}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
