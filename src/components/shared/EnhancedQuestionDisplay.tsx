import React, { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  Image as ImageIcon,
  AlertCircle,
  Info,
  Lightbulb,
  BookOpen,
  Calculator,
  FileText,
  List,
  Eye,
  ChevronDown,
  ChevronUp,
  Award,
  Trash2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './Button';
import { sanitizeRichText } from '../../utils/richText';
import { shouldShowAnswerInput } from '@/lib/helpers/answerExpectationHelpers';

interface CorrectAnswer {
  answer: string;
  marks?: number;
  alternative_id?: number;
  linked_alternatives?: number[];
  alternative_type?: string;
  context?: any;
  unit?: string;
  accepts_equivalent_phrasing?: boolean;
  error_carried_forward?: boolean;
  answer_requirement?: string;
}

interface QuestionOption {
  label: string;
  text: string;
  is_correct: boolean;
}

interface Attachment {
  id: string;
  url?: string;
  preview?: string;
  file_url?: string;
  thumbnail_url?: string;
  dataUrl?: string;
  data?: string;
  file_name?: string;
  file_type?: string;
  attachmentKey?: string;
  canDelete?: boolean;
  source?: 'primary' | 'secondary';
  originalId?: string | number;
}

export interface QuestionPart {
  id: string;
  part_label: string;
  question_text: string;
  marks: number;
  answer_format?: string;
  answer_requirement?: string;
  total_alternatives?: number;
  correct_answers?: CorrectAnswer[];
  options?: QuestionOption[];
  attachments?: Attachment[];
  hint?: string;
  explanation?: string;
  subparts?: QuestionPart[];
  has_direct_answer?: boolean;
  is_contextual_only?: boolean;
}

export interface QuestionDisplayData {
  id: string;
  question_number: string;
  question_text: string;
  question_type: 'mcq' | 'tf' | 'descriptive' | 'calculation' | 'diagram' | 'essay';
  marks: number;
  unit?: string | null;
  unit_id?: string | null;
  difficulty?: string;
  unit?: string;
  topic?: string;
  topic_id?: string | null;
  subtopic?: string;
  subtopic_id?: string | null;
  answer_format?: string;
  answer_requirement?: string;
  correct_answers?: CorrectAnswer[];
  options?: QuestionOption[];
  attachments?: Attachment[];
  hint?: string;
  explanation?: string;
  requires_manual_marking?: boolean;
  marking_criteria?: string;
  parts?: QuestionPart[];
  figure_required?: boolean;
  figure?: boolean;
}

type ExpandedSectionsConfig = {
  hint?: boolean;
  explanation?: boolean;
  markingCriteria?: boolean;
};

interface EnhancedQuestionDisplayProps {
  question: QuestionDisplayData;
  showAnswers?: boolean;
  showHints?: boolean;
  showExplanations?: boolean;
  showAttachments?: boolean;
  compact?: boolean;
  highlightCorrect?: boolean;
  defaultExpandedSections?: ExpandedSectionsConfig;
  onAttachmentRemove?: (attachmentKey: string, attachmentId: string) => void;
}

export const EnhancedQuestionDisplay: React.FC<EnhancedQuestionDisplayProps> = ({
  question,
  showAnswers = true,
  showHints = true,
  showExplanations = true,
  showAttachments = true,
  compact = false,
  highlightCorrect = true,
  defaultExpandedSections,
  onAttachmentRemove
}) => {
  const [expandedSections, setExpandedSections] = useState({
    hint: defaultExpandedSections?.hint ?? false,
    explanation: defaultExpandedSections?.explanation ?? false,
    markingCriteria: defaultExpandedSections?.markingCriteria ?? false
  });

  const [expandedParts, setExpandedParts] = useState<Set<string>>(new Set());

  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleAttachmentPreviewKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
    onPreview: () => void
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onPreview();
    }
  };

  const getAttachmentRemovalId = (attachment: Attachment): string | null => {
    const candidate = attachment.originalId ?? attachment.id;
    if (candidate === undefined || candidate === null) {
      return null;
    }
    return typeof candidate === 'string' ? candidate : String(candidate);
  };

  const renderAttachmentCard = (
    attachment: Attachment,
    index: number,
    variant: 'question' | 'part' = 'question'
  ): React.ReactNode => {
    const imageSrc = resolveAttachmentSource(attachment);
    const isImage = isImageAttachment(attachment, imageSrc);
    const fallbackLabel = attachment.file_name || `Attachment ${index + 1}`;
    const removalKey = attachment.attachmentKey;
    const removalId = getAttachmentRemovalId(attachment);
    const fallbackWidthClass = variant === 'question' ? 'min-w-[200px]' : 'min-w-[160px]';
    const canRemove = Boolean(
      onAttachmentRemove &&
        attachment.canDelete &&
        removalKey &&
        removalId
    );

    const handleRemove = (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      event.preventDefault();
      if (canRemove && removalKey && removalId) {
        onAttachmentRemove?.(removalKey, removalId);
      }
    };

    const commonRemoveButton =
      canRemove && (
        <button
          type="button"
          onClick={handleRemove}
          className="absolute top-2 right-2 rounded-full bg-white/95 dark:bg-gray-900/90 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/40 shadow focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800"
          title="Remove attachment"
          aria-label="Remove attachment"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      );

    if (!imageSrc || !isImage) {
      return (
        <div
          key={attachment.id || index}
          className={cn(
            'relative bg-gray-200 dark:bg-gray-700 rounded-lg text-center flex flex-col items-center justify-center text-xs text-gray-600 dark:text-gray-400',
            fallbackWidthClass,
            variant === 'question' ? 'p-4' : 'p-3'
          )}
        >
          {commonRemoveButton}
          <FileText
            className={cn(
              'text-gray-400',
              variant === 'question' ? 'h-8 w-8 mb-2' : 'h-6 w-6 mb-1'
            )}
          />
          <p className="truncate w-full px-2">{fallbackLabel}</p>
          {attachment.file_type && (
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-wide">
              {attachment.file_type}
            </p>
          )}
        </div>
      );
    }

    return (
      <div
        key={attachment.id || index}
        role="button"
        tabIndex={0}
        onClick={() => imageSrc && setImagePreview(imageSrc)}
        onKeyDown={event =>
          imageSrc &&
          handleAttachmentPreviewKeyDown(event, () => setImagePreview(imageSrc))
        }
        className={cn(
          'group relative bg-white dark:bg-gray-800 rounded-lg overflow-hidden transition-all shadow-sm hover:shadow-md cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800',
          variant === 'question'
            ? 'border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400'
            : 'border border-gray-200 dark:border-gray-700 hover:border-blue-400/70 dark:hover:border-blue-300/60'
        )}
        style={{ maxWidth: '100%' }}
      >
        {commonRemoveButton}
        <div className="relative">
          <img
            src={imageSrc}
            alt={fallbackLabel}
            className={cn(
              'max-w-full h-auto object-contain',
              variant === 'question' ? 'max-h-96' : 'max-h-80'
            )}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement?.parentElement;
              if (parent) {
                parent.innerHTML = `
                  <div class="bg-gray-200 dark:bg-gray-700 rounded-lg p-4 text-center ${fallbackWidthClass}">
                    <svg class="h-8 w-8 mx-auto mb-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p class="text-xs text-gray-600 dark:text-gray-400">Image not available</p>
                  </div>
                `;
              }
            }}
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center">
            <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
        {attachment.file_name && (
          <div
            className={cn(
              'bg-gray-100 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600',
              variant === 'question' ? 'px-3 py-2' : 'px-2 py-1'
            )}
          >
            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
              {attachment.file_name}
            </p>
          </div>
        )}
      </div>
    );
  };

  const resolveAttachmentSource = (attachment: Attachment): string | undefined => {
    const candidates = [
      attachment.preview,
      attachment.url,
      attachment.file_url,
      attachment.dataUrl,
      attachment.data,
      attachment.thumbnail_url
    ];

    return candidates.find((src): src is string => typeof src === 'string' && src.trim().length > 0);
  };

  const isImageAttachment = (attachment: Attachment, src?: string): boolean => {
    if (attachment.file_type) {
      return attachment.file_type.startsWith('image/');
    }

    if (src) {
      const lowerSrc = src.toLowerCase();
      if (lowerSrc.startsWith('data:image')) {
        return true;
      }

      try {
        const url = new URL(lowerSrc, 'http://localhost');
        const pathname = url.pathname.toLowerCase();
        if (/[.](png|jpe?g|gif|bmp|webp|svg)$/.test(pathname)) {
          return true;
        }
      } catch {
        if (/[.](png|jpe?g|gif|bmp|webp|svg)(\?|$)/.test(lowerSrc)) {
          return true;
        }
      }
    }

    if (attachment.file_name) {
      const lowerName = attachment.file_name.toLowerCase();
      if (/[.](png|jpe?g|gif|bmp|webp|svg)$/.test(lowerName)) {
        return true;
      }
    }

    return false;
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const togglePart = (partId: string) => {
    setExpandedParts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(partId)) {
        newSet.delete(partId);
      } else {
        newSet.add(partId);
      }
      return newSet;
    });
  };

  const getQuestionTypeIcon = () => {
    switch (question.question_type) {
      case 'mcq':
        return <List className="h-5 w-5 text-blue-600" />;
      case 'calculation':
        return <Calculator className="h-5 w-5 text-green-600" />;
      case 'diagram':
        return <ImageIcon className="h-5 w-5 text-purple-600" />;
      case 'essay':
        return <BookOpen className="h-5 w-5 text-indigo-600" />;
      default:
        return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  const getQuestionTypeLabel = () => {
    switch (question.question_type) {
      case 'mcq':
        return 'Multiple Choice';
      case 'tf':
        return 'True/False';
      case 'calculation':
        return 'Calculation';
      case 'diagram':
        return 'Diagram';
      case 'essay':
        return 'Essay';
      default:
        return 'Descriptive';
    }
  };

  const renderMCQOptions = () => {
    if (!question.options || question.options.length === 0) return null;

    return (
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <List className="h-4 w-4" />
          Answer Options
        </h4>
        <div className="space-y-2">
          {question.options.map((option, index) => (
            <div
              key={index}
              className={cn(
                'p-3 rounded-lg border-2 transition-all',
                showAnswers && option.is_correct && highlightCorrect
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                  : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold',
                    showAnswers && option.is_correct && highlightCorrect
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                  )}
                >
                  {option.label}
                </div>
                    <div className="flex-1 rich-text-display text-sm text-gray-900 dark:text-white">
                      <div
                        className="space-y-1"
                        dangerouslySetInnerHTML={{ __html: sanitizeRichText(option.text) }}
                      />
                    </div>
                {showAnswers && option.is_correct && highlightCorrect && (
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderCorrectAnswers = (answers?: CorrectAnswer[], answerRequirement?: string) => {
    if (!showAnswers || !answers || answers.length === 0) {
      return null;
    }

    // Group answers by alternative linking
    const groupedAnswers = groupAnswersByAlternatives(answers);

    return (
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-600" />
          Correct Answer{answers.length > 1 ? 's' : ''}
          {answerRequirement && (
            <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
              ({formatAnswerRequirement(answerRequirement)})
            </span>
          )}
        </h4>
        <div className="space-y-3">
          {Array.from(groupedAnswers.entries()).map(([groupKey, groupAnswers], groupIndex) => (
            <div key={groupKey}>
              {/* Group header for linked alternatives */}
              {groupAnswers.length > 1 && groupAnswers[0].alternative_type && groupAnswers[0].alternative_type !== 'standalone' && (
                <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-2">
                  <List className="h-3 w-3" />
                  {getAlternativeTypeLabel(groupAnswers[0].alternative_type)}
                </div>
              )}

              {/* Render answers in group */}
              <div className="space-y-2">
                {groupAnswers.map((answer, index) => (
                  <div
                    key={`${groupIndex}-${index}`}
                    className="bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700 rounded-lg p-3"
                  >
                    <div className="flex items-start gap-3">
                      <Award className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <div
                            className="text-sm font-medium text-green-900 dark:text-green-100 rich-text-display"
                            dangerouslySetInnerHTML={{ __html: sanitizeRichText(answer.answer) }}
                          />
                          {answer.unit && (
                            <span className="text-sm text-green-700 dark:text-green-300">({answer.unit})</span>
                          )}
                        </div>
                        {answer.marks !== undefined && (
                          <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                            {answer.marks} mark{answer.marks !== 1 ? 's' : ''}
                          </p>
                        )}
                        {answer.accepts_equivalent_phrasing && (
                          <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                            <Info className="h-3 w-3" />
                            Equivalent phrasing accepted
                          </p>
                        )}
                        {answer.error_carried_forward && (
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1">
                            <Info className="h-3 w-3" />
                            Error carried forward applies
                          </p>
                        )}
                        {answer.acceptable_variations && answer.acceptable_variations.length > 0 && (
                          <div className="mt-2 pl-3 border-l-2 border-green-300 dark:border-green-700">
                            <p className="text-xs text-green-700 dark:text-green-300 font-medium mb-1">
                              Also accepts:
                            </p>
                            <ul className="text-xs text-green-600 dark:text-green-400 space-y-0.5">
                              {answer.acceptable_variations.map((variation, vIdx) => (
                                <li key={vIdx} className="flex items-start gap-1">
                                  <span>•</span>
                                  <div
                                    className="flex-1 rich-text-display"
                                    dangerouslySetInnerHTML={{ __html: sanitizeRichText(variation) }}
                                  />
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const groupAnswersByAlternatives = (answers: CorrectAnswer[]): Map<string, CorrectAnswer[]> => {
    const groups = new Map<string, CorrectAnswer[]>();

    answers.forEach(answer => {
      if (!answer.linked_alternatives || answer.linked_alternatives.length === 0) {
        const key = `standalone-${answer.alternative_id || Math.random()}`;
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push(answer);
      } else {
        const key = `group-${answer.alternative_type}-${answer.linked_alternatives.sort().join('-')}`;
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push(answer);
      }
    });

    return groups;
  };

  const getAlternativeTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      'one_required': 'Any ONE of these',
      'all_required': 'ALL of these required',
      'structure_function_pair': 'Structure AND function pair',
      'two_required': 'Any TWO of these',
      'three_required': 'Any THREE of these',
      'standalone': 'Required'
    };
    return labels[type] || type;
  };

  const renderAttachments = () => {
    if (!showAttachments || !question.attachments || question.attachments.length === 0) {
      return null;
    }

    return (
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <ImageIcon className="h-4 w-4" />
          Attachments ({question.attachments.length})
        </h4>
        {/* Full width container aligned with question text box */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap justify-center gap-4">
            {question.attachments.map((attachment, index) =>
              renderAttachmentCard(attachment, index, 'question')
            )}
          </div>
        </div>
      </div>
    );
  };

  const formatAnswerRequirement = (requirement: string) => {
    switch (requirement) {
      case 'any_one_from':
        return 'Any one required';
      case 'any_two_from':
        return 'Any two required';
      case 'any_three_from':
        return 'Any three required';
      case 'both_required':
        return 'Both required';
      case 'all_required':
        return 'All required';
      case 'alternative_methods':
        return 'Alternative methods accepted';
      case 'acceptable_variations':
        return 'Variations accepted';
      default:
        return requirement;
    }
  };

  const renderQuestionPart = (part: QuestionPart, index: number, level: number = 0): React.ReactNode => {
    const isExpanded = expandedParts.has(part.id);
    const indent = level * 24; // 24px per level
    const hasSubparts = part.subparts && part.subparts.length > 0;

    // Determine if we should show answer input for this part
    const showAnswer = shouldShowAnswerInput(part, { hasSubparts, level: level + 2 });

    // Calculate total marks: if part has subparts, sum their marks; otherwise use part's direct marks
    const calculatePartMarks = (part: QuestionPart): number => {
      if (part.subparts && part.subparts.length > 0) {
        return part.subparts.reduce((total, subpart) => total + (subpart.marks || 0), 0);
      }
      return part.marks || 0;
    };

    const displayMarks = calculatePartMarks(part);

    return (
      <div key={part.id} className="space-y-2" style={{ marginLeft: `${indent}px` }}>
        {/* Part Header */}
        <button
          onClick={() => togglePart(part.id)}
          className="w-full bg-gradient-to-r from-gray-100 via-white to-gray-50 dark:from-gray-700 dark:via-gray-800 dark:to-gray-700 rounded-xl p-4 flex items-start justify-between hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 border border-gray-200 dark:border-gray-600 shadow-sm"
        >
          <div className="flex items-start gap-3 flex-1">
            <div className="flex-shrink-0 h-9 w-9 rounded-xl border-2 border-[#8CC63F]/40 bg-[#8CC63F]/15 text-[#356B1B] dark:border-[#8CC63F]/30 dark:bg-[#8CC63F]/10 dark:text-[#A6E36A] flex items-center justify-center text-sm font-bold shadow-sm">
              {part.part_label?.match(/\(([a-z0-9]+)\)/i)?.[1] || part.part_label?.replace(/Part\s*/i, '').trim() || part.part_label}
            </div>
            <div className="flex-1 text-left">
              <p className="text-base text-gray-900 dark:text-white font-bold tracking-tight">
                {part.part_label?.toLowerCase().startsWith('part') ? part.part_label : `Part ${part.part_label}`}
              </p>
              {!isExpanded && part.question_text && (
                <div
                  className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-1 rich-text-display"
                  dangerouslySetInnerHTML={{ __html: sanitizeRichText(part.question_text) }}
                />
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold">
                {displayMarks} mark{displayMarks !== 1 ? 's' : ''}
              </span>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              )}
            </div>
          </div>
        </button>

        {/* Part Content */}
        {isExpanded && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 space-y-3">
            {/* Question Text */}
            {part.question_text && (
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div
                  className="text-sm text-gray-900 dark:text-white rich-text-display space-y-2"
                  dangerouslySetInnerHTML={{ __html: sanitizeRichText(part.question_text) }}
                />
                {/* Show contextual indicator if applicable */}
                {part.is_contextual_only && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                    <AlertCircle className="w-3 h-3" />
                    <span>Contextual text - answers expected in subparts below</span>
                  </div>
                )}
              </div>
            )}

            {/* Answer Format Info - only show if answer is expected */}
            {showAnswer && part.answer_format && (
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <FileText className="h-3 w-3" />
                <span>Answer format: {part.answer_format}</span>
              </div>
            )}

            {/* MCQ Options for this part - only show if answer is expected */}
            {showAnswer && part.options && part.options.length > 0 && (
              <div className="space-y-2">
                {part.options.map((option, optIndex) => (
                  <div
                    key={optIndex}
                    className={cn(
                      'p-3 rounded-lg border-2 transition-all',
                      showAnswers && option.is_correct && highlightCorrect
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          'flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold',
                          showAnswers && option.is_correct && highlightCorrect
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                        )}
                      >
                        {option.label}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-900 dark:text-white">{option.text}</p>
                      </div>
                      {showAnswers && option.is_correct && highlightCorrect && (
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Correct Answers for this part - only show if answer is expected */}
            {showAnswer && renderCorrectAnswers(part.correct_answers, part.answer_requirement)}

            {/* Attachments for this part */}
            {part.attachments && part.attachments.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <ImageIcon className="h-3 w-3" />
                  Attachments ({part.attachments.length})
                </h5>
                {/* Full width container aligned with part content */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                  <div className="flex flex-wrap justify-center gap-3">
                    {part.attachments.map((attachment, attIdx) =>
                      renderAttachmentCard(attachment, attIdx, 'part')
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Hint for this part */}
            {showHints && part.hint && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Lightbulb className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-yellow-900 dark:text-yellow-100 mb-1">Hint</p>
                    <div
                      className="text-xs text-yellow-800 dark:text-yellow-200 rich-text-display"
                      dangerouslySetInnerHTML={{ __html: sanitizeRichText(part.hint) }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Explanation for this part */}
            {showExplanations && part.explanation && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1">Explanation</p>
                    <div
                      className="text-xs text-blue-800 dark:text-blue-200 rich-text-display"
                      dangerouslySetInnerHTML={{ __html: sanitizeRichText(part.explanation) }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Nested Subparts */}
            {part.subparts && part.subparts.length > 0 && (
              <div className="space-y-2 pl-4 border-l-2 border-gray-300 dark:border-gray-600">
                {part.subparts.map((subpart, subIndex) => renderQuestionPart(subpart, subIndex, level + 1))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn('space-y-4', compact && 'space-y-3')}>
      {/* Question Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div className="flex-shrink-0">
            {getQuestionTypeIcon()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Question {question.question_number}
              </h3>
              <span className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                {getQuestionTypeLabel()}
              </span>
              {question.difficulty && (
                <span
                  className={cn(
                    'text-xs px-2 py-1 rounded-full',
                    question.difficulty === 'Easy' && 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
                    question.difficulty === 'Medium' && 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
                    question.difficulty === 'Hard' && 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                  )}
                >
                  {question.difficulty}
                </span>
              )}
            </div>
            {(question.topic || question.subtopic) && (
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 mb-2">
                {question.topic && <span>{question.topic}</span>}
                {question.topic && question.subtopic && <span>•</span>}
                {question.subtopic && <span>{question.subtopic}</span>}
              </div>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {question.marks}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            mark{question.marks !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Question Text */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div
          className="text-sm text-gray-900 dark:text-white rich-text-display space-y-2"
          dangerouslySetInnerHTML={{ __html: sanitizeRichText(question.question_text) }}
        />
      </div>

      {/* Attachments */}
      {renderAttachments()}

      {/* MCQ Options */}
      {question.question_type === 'mcq' && renderMCQOptions()}

      {/* Correct Answers */}
      {question.question_type !== 'mcq' && renderCorrectAnswers(question.correct_answers, question.answer_requirement)}

      {/* Parts/Subparts */}
      {question.parts && question.parts.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <List className="h-4 w-4" />
            Question Parts ({question.parts.length})
          </h4>
          {question.parts.map((part, index) => renderQuestionPart(part, index))}
        </div>
      )}

      {/* Hint Section */}
      {showHints && question.hint && (
        <div className="border border-yellow-200 dark:border-yellow-800 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('hint')}
            className="w-full bg-yellow-50 dark:bg-yellow-900/20 px-4 py-3 flex items-center justify-between hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <span className="text-sm font-semibold text-yellow-900 dark:text-yellow-100">
                Hint
              </span>
            </div>
            {expandedSections.hint ? (
              <ChevronUp className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            )}
          </button>
          {expandedSections.hint && (
            <div className="bg-yellow-50 dark:bg-yellow-900/10 px-4 py-3 border-t border-yellow-200 dark:border-yellow-800">
              <div
                className="text-sm text-yellow-900 dark:text-yellow-100 rich-text-display"
                dangerouslySetInnerHTML={{ __html: sanitizeRichText(question.hint) }}
              />
            </div>
          )}
        </div>
      )}

      {/* Explanation Section */}
      {showExplanations && question.explanation && (
        <div className="border border-blue-200 dark:border-blue-800 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('explanation')}
            className="w-full bg-blue-50 dark:bg-blue-900/20 px-4 py-3 flex items-center justify-between hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                Explanation
              </span>
            </div>
            {expandedSections.explanation ? (
              <ChevronUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            )}
          </button>
          {expandedSections.explanation && (
            <div className="bg-blue-50 dark:bg-blue-900/10 px-4 py-3 border-t border-blue-200 dark:border-blue-800">
              <div
                className="text-sm text-blue-900 dark:text-blue-100 rich-text-display"
                dangerouslySetInnerHTML={{ __html: sanitizeRichText(question.explanation) }}
              />
            </div>
          )}
        </div>
      )}

      {/* Marking Criteria */}
      {question.requires_manual_marking && question.marking_criteria && (
        <div className="border border-purple-200 dark:border-purple-800 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('markingCriteria')}
            className="w-full bg-purple-50 dark:bg-purple-900/20 px-4 py-3 flex items-center justify-between hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                Marking Criteria (Manual Marking Required)
              </span>
            </div>
            {expandedSections.markingCriteria ? (
              <ChevronUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            )}
          </button>
          {expandedSections.markingCriteria && (
            <div className="bg-purple-50 dark:bg-purple-900/10 px-4 py-3 border-t border-purple-200 dark:border-purple-800">
              <div
                className="text-sm text-purple-900 dark:text-purple-100 rich-text-display"
                dangerouslySetInnerHTML={{ __html: sanitizeRichText(question.marking_criteria) }}
              />
            </div>
          )}
        </div>
      )}

      {/* Image Preview Modal */}
      {imagePreview && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setImagePreview(null)}
        >
          <div className="relative max-w-6xl max-h-[90vh]">
            <button
              onClick={() => setImagePreview(null)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <XCircle className="h-8 w-8" />
            </button>
            <img
              src={imagePreview}
              alt="Preview"
              className="max-w-full max-h-[90vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};
