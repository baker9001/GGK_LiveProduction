import React, { useMemo, useState, useEffect } from 'react';
import {
  ChevronRight,
  Check,
  Circle,
  AlertCircle,
  Paperclip,
  Clock,
  XCircle,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  FileText,
  BarChart3,
  Info,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Image as ImageIcon,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

interface AttachmentStatus {
  required: number;
  uploaded: number;
}

interface QuestionStatus {
  isComplete: boolean;
  needsAttachment: boolean;
  hasError: boolean;
  inProgress: boolean;
  validationIssues: string[];
}

interface NavigationItem {
  id: string;
  label: string;
  level: 'question' | 'part' | 'subpart';
  marks?: number;
  isAnswered?: boolean;
  isCorrect?: boolean | null;
  isContainer?: boolean;
  hasDirectAnswer?: boolean;
  figureRequired?: boolean;
  attachmentStatus?: AttachmentStatus;
  questionStatus?: QuestionStatus;
  answerFormat?: string;
  children?: NavigationItem[];
}

interface EnhancedQuestionNavigatorProps {
  items: NavigationItem[];
  currentId?: string;
  onNavigate: (id: string) => void;
  showParts?: boolean;
  showSubparts?: boolean;
  showMarks?: boolean;
  showStatus?: boolean;
  mode?: 'practice' | 'exam' | 'review' | 'qa_preview' | 'simulation' | 'setup';
  className?: string;
  compact?: boolean;
  onFilterChange?: (filter: NavigationFilter) => void;
}

interface NavigationFilter {
  showCompleted: boolean;
  showIncomplete: boolean;
  showNeedsAttachment: boolean;
  showErrors: boolean;
}

const DEFAULT_FILTER: NavigationFilter = {
  showCompleted: true,
  showIncomplete: true,
  showNeedsAttachment: true,
  showErrors: true,
};

const EnhancedQuestionNavigator: React.FC<EnhancedQuestionNavigatorProps> = ({
  items,
  currentId,
  onNavigate,
  showParts = true,
  showSubparts = true,
  showMarks = true,
  showStatus = true,
  mode = 'setup',
  className,
  compact = false,
  onFilterChange,
}) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<NavigationFilter>(DEFAULT_FILTER);
  const [showFilters, setShowFilters] = useState(false);
  const [showLegend, setShowLegend] = useState(false);

  useEffect(() => {
    const allIds = new Set<string>();
    const collectIds = (itemList: NavigationItem[]) => {
      itemList.forEach(item => {
        allIds.add(item.id);
        if (item.children) {
          collectIds(item.children);
        }
      });
    };
    collectIds(items);
    setExpandedItems(allIds);
  }, [items]);

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const getStatusColor = (item: NavigationItem): string => {
    if (!item.questionStatus) {
      if (item.isAnswered) return 'green';
      if (item.hasDirectAnswer) return 'gray';
      return 'transparent';
    }

    const status = item.questionStatus;
    if (status.hasError) return 'red';
    if (status.needsAttachment) return 'amber';
    if (status.isComplete) return 'green';
    if (status.inProgress) return 'blue';
    return 'gray';
  };

  const getStatusIcon = (item: NavigationItem) => {
    if (!showStatus) return null;

    const color = getStatusColor(item);
    const iconClassName = 'w-3.5 h-3.5';

    if (mode === 'review' && item.isCorrect !== null && item.isCorrect !== undefined) {
      return item.isCorrect ? (
        <CheckCircle className={cn(iconClassName, 'text-green-600 dark:text-green-400')} />
      ) : (
        <XCircle className={cn(iconClassName, 'text-red-600 dark:text-red-400')} />
      );
    }

    if (item.questionStatus?.hasError) {
      return <AlertCircle className={cn(iconClassName, 'text-red-600 dark:text-red-400')} />;
    }

    if (item.questionStatus?.needsAttachment || item.figureRequired) {
      return <Paperclip className={cn(iconClassName, 'text-amber-600 dark:text-amber-400')} />;
    }

    if (item.questionStatus?.isComplete || item.isAnswered) {
      return <CheckCircle className={cn(iconClassName, 'text-green-600 dark:text-green-400')} />;
    }

    if (item.questionStatus?.inProgress) {
      return <Clock className={cn(iconClassName, 'text-blue-600 dark:text-blue-400')} />;
    }

    if (item.hasDirectAnswer && !item.isContainer) {
      return <Circle className={cn(iconClassName, 'text-gray-400 dark:text-gray-500')} />;
    }

    return null;
  };

  const getAttachmentBadge = (item: NavigationItem) => {
    if (!item.attachmentStatus) return null;
    const { required, uploaded } = item.attachmentStatus;
    if (required === 0) return null;

    const isComplete = uploaded >= required;
    const bgColor = isComplete
      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
      : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300';

    return (
      <span className={cn('text-xs px-1.5 py-0.5 rounded flex items-center gap-1', bgColor)}>
        <ImageIcon className="w-3 h-3" />
        <span className="font-medium">
          {uploaded}/{required}
        </span>
      </span>
    );
  };

  const shouldShowItem = (item: NavigationItem): boolean => {
    if (!item.questionStatus) return true;

    const status = item.questionStatus;
    if (!filter.showCompleted && status.isComplete) return false;
    if (!filter.showIncomplete && !status.isComplete && !status.inProgress) return false;
    if (!filter.showNeedsAttachment && status.needsAttachment) return false;
    if (!filter.showErrors && status.hasError) return false;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return item.label.toLowerCase().includes(query);
    }

    return true;
  };

  const handleFilterChange = (newFilter: Partial<NavigationFilter>) => {
    const updatedFilter = { ...filter, ...newFilter };
    setFilter(updatedFilter);
    onFilterChange?.(updatedFilter);
  };

  const renderNavigationItem = (item: NavigationItem, depth: number = 0) => {
    if (!shouldShowItem(item)) return null;

    const isExpanded = expandedItems.has(item.id);
    const isCurrent = currentId === item.id;
    const hasChildren = item.children && item.children.length > 0;
    const shouldShowChildren =
      hasChildren &&
      ((depth === 0 && showParts) || (depth === 1 && showSubparts));

    const isClickable = !item.isContainer || item.hasDirectAnswer;
    const statusColor = getStatusColor(item);

    const borderColorMap = {
      red: 'border-red-500 dark:border-red-400',
      amber: 'border-amber-500 dark:border-amber-400',
      green: 'border-green-500 dark:border-green-400',
      blue: 'border-blue-500 dark:border-blue-400',
      gray: 'border-gray-300 dark:border-gray-600',
      transparent: 'border-transparent',
    };

    const bgColorMap = {
      red: 'bg-red-50 dark:bg-red-900/10',
      amber: 'bg-amber-50 dark:bg-amber-900/10',
      green: 'bg-green-50 dark:bg-green-900/10',
      blue: 'bg-blue-50 dark:bg-blue-900/10',
      gray: 'bg-gray-50 dark:bg-gray-900/10',
      transparent: '',
    };

    return (
      <div key={item.id} className={cn('select-none', depth > 0 && 'ml-4')}>
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-all duration-200',
            isClickable && 'cursor-pointer hover:shadow-sm',
            !isClickable && 'cursor-default opacity-60',
            isCurrent && 'ring-2 ring-blue-500 dark:ring-blue-400 shadow-md',
            depth === 0 && 'border-l-4',
            depth === 0 && borderColorMap[statusColor as keyof typeof borderColorMap],
            !isCurrent && bgColorMap[statusColor as keyof typeof bgColorMap],
            isCurrent && 'bg-blue-100 dark:bg-blue-900/30 font-medium'
          )}
          onClick={() => {
            if (isClickable) {
              onNavigate(item.id);
            }
            if (hasChildren && depth === 0) {
              toggleExpanded(item.id);
            }
          }}
        >
          {hasChildren && shouldShowChildren && (
            <button
              onClick={e => {
                e.stopPropagation();
                toggleExpanded(item.id);
              }}
              className="flex-shrink-0 p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              <ChevronRight
                className={cn(
                  'w-4 h-4 text-gray-600 dark:text-gray-400 transition-transform duration-200',
                  isExpanded && 'rotate-90'
                )}
              />
            </button>
          )}

          <div className="flex-shrink-0">{getStatusIcon(item)}</div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={cn(
                  'font-mono text-xs px-1.5 py-0.5 rounded font-medium',
                  item.level === 'question' &&
                    'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
                  item.level === 'part' &&
                    'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
                  item.level === 'subpart' &&
                    'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300'
                )}
              >
                {item.label}
              </span>

              {item.isContainer && (
                <span className="text-xs text-gray-500 dark:text-gray-400 italic">
                  context
                </span>
              )}

              {item.answerFormat && !compact && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {item.answerFormat}
                </span>
              )}

              {getAttachmentBadge(item)}
            </div>

            {item.questionStatus?.validationIssues && item.questionStatus.validationIssues.length > 0 && !compact && (
              <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                {item.questionStatus.validationIssues[0]}
              </div>
            )}
          </div>

          {showMarks && item.marks !== undefined && (
            <span className="flex-shrink-0 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
              {item.marks}m
            </span>
          )}
        </div>

        {shouldShowChildren && isExpanded && hasChildren && (
          <div className="mt-1 space-y-1">
            {item.children!.map(child => renderNavigationItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const summary = useMemo(() => {
    let totalItems = 0;
    let answeredItems = 0;
    let correctItems = 0;
    let totalMarks = 0;
    let completedItems = 0;
    let needsAttachment = 0;
    let hasErrors = 0;
    let inProgress = 0;
    let totalAttachmentsRequired = 0;
    let totalAttachmentsUploaded = 0;

    const countItems = (itemList: NavigationItem[]) => {
      itemList.forEach(item => {
        if (item.hasDirectAnswer && !item.isContainer) {
          totalItems++;
          if (item.isAnswered) answeredItems++;
          if (item.isCorrect === true) correctItems++;

          if (item.questionStatus) {
            if (item.questionStatus.isComplete) completedItems++;
            if (item.questionStatus.needsAttachment) needsAttachment++;
            if (item.questionStatus.hasError) hasErrors++;
            if (item.questionStatus.inProgress) inProgress++;
          }
        }

        if (item.attachmentStatus) {
          totalAttachmentsRequired += item.attachmentStatus.required;
          totalAttachmentsUploaded += item.attachmentStatus.uploaded;
        }

        if (item.marks) totalMarks += item.marks;

        if (item.children) {
          countItems(item.children);
        }
      });
    };

    countItems(items);

    return {
      totalItems,
      answeredItems,
      correctItems,
      totalMarks,
      completedItems,
      needsAttachment,
      hasErrors,
      inProgress,
      totalAttachmentsRequired,
      totalAttachmentsUploaded,
    };
  }, [items]);

  const flattenItems = (itemList: NavigationItem[]): NavigationItem[] => {
    const result: NavigationItem[] = [];
    itemList.forEach(item => {
      result.push(item);
      if (item.children) {
        result.push(...flattenItems(item.children));
      }
    });
    return result;
  };

  const allItems = useMemo(() => flattenItems(items), [items]);

  const navigateNext = () => {
    const currentIndex = allItems.findIndex(item => item.id === currentId);
    if (currentIndex < allItems.length - 1) {
      const nextItem = allItems[currentIndex + 1];
      if (!nextItem.isContainer || nextItem.hasDirectAnswer) {
        onNavigate(nextItem.id);
      }
    }
  };

  const navigatePrevious = () => {
    const currentIndex = allItems.findIndex(item => item.id === currentId);
    if (currentIndex > 0) {
      const prevItem = allItems[currentIndex - 1];
      if (!prevItem.isContainer || prevItem.hasDirectAnswer) {
        onNavigate(prevItem.id);
      }
    }
  };

  const jumpToNextIncomplete = () => {
    const currentIndex = allItems.findIndex(item => item.id === currentId);
    const nextIncomplete = allItems
      .slice(currentIndex + 1)
      .find(item => !item.questionStatus?.isComplete && item.hasDirectAnswer && !item.isContainer);

    if (nextIncomplete) {
      onNavigate(nextIncomplete.id);
    }
  };

  const jumpToNextError = () => {
    const currentIndex = allItems.findIndex(item => item.id === currentId);
    const nextError = allItems
      .slice(currentIndex + 1)
      .find(item => item.questionStatus?.hasError);

    if (nextError) {
      onNavigate(nextError.id);
    }
  };

  const completionPercentage = summary.totalItems > 0
    ? Math.round((summary.completedItems / summary.totalItems) * 100)
    : 0;

  const attachmentPercentage = summary.totalAttachmentsRequired > 0
    ? Math.round((summary.totalAttachmentsUploaded / summary.totalAttachmentsRequired) * 100)
    : 100;

  return (
    <div className={cn('flex flex-col gap-3 h-full', className)}>
      {!compact && (
        <div className="flex items-center justify-between gap-2 px-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Navigation
          </h3>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="h-7 px-2"
            >
              <Filter className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLegend(!showLegend)}
              className="h-7 px-2"
            >
              <Info className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {showLegend && !compact && (
        <div className="px-3 py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-xs space-y-2">
          <div className="font-medium text-gray-900 dark:text-gray-100">Status Colors:</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-green-600" />
              <span className="text-gray-700 dark:text-gray-300">Complete</span>
            </div>
            <div className="flex items-center gap-2">
              <Paperclip className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-gray-700 dark:text-gray-300">Needs Attachment</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-gray-700 dark:text-gray-300">In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-red-600" />
              <span className="text-gray-700 dark:text-gray-300">Has Errors</span>
            </div>
            <div className="flex items-center gap-2">
              <Circle className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-gray-700 dark:text-gray-300">Not Started</span>
            </div>
          </div>
        </div>
      )}

      {showFilters && !compact && (
        <div className="px-3 py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2">
          <div className="text-xs font-medium text-gray-700 dark:text-gray-300">Filters:</div>
          <div className="space-y-1.5">
            {[
              { key: 'showCompleted', label: 'Completed', color: 'green' },
              { key: 'showIncomplete', label: 'Incomplete', color: 'gray' },
              { key: 'showNeedsAttachment', label: 'Needs Attachment', color: 'amber' },
              { key: 'showErrors', label: 'Has Errors', color: 'red' },
            ].map(({ key, label, color }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={filter[key as keyof NavigationFilter]}
                  onChange={e =>
                    handleFilterChange({ [key]: e.target.checked } as Partial<NavigationFilter>)
                  }
                  className="rounded"
                />
                <span className="text-gray-700 dark:text-gray-300">{label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {showStatus && (
        <div className="px-3 py-3 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border border-blue-200 dark:border-gray-700 shadow-sm">
          <div className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Progress Overview
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs text-gray-700 dark:text-gray-300 mb-1">
                <span>Questions Complete</span>
                <span className="font-medium">
                  {summary.completedItems} / {summary.totalItems}
                </span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 text-right">
                {completionPercentage}%
              </div>
            </div>

            {summary.totalAttachmentsRequired > 0 && (
              <div>
                <div className="flex justify-between text-xs text-gray-700 dark:text-gray-300 mb-1">
                  <span>Attachments</span>
                  <span className="font-medium">
                    {summary.totalAttachmentsUploaded} / {summary.totalAttachmentsRequired}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
                    style={{ width: `${attachmentPercentage}%` }}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-blue-200 dark:border-gray-700">
              {summary.needsAttachment > 0 && (
                <div className="flex items-center gap-1.5 text-xs">
                  <Paperclip className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-gray-700 dark:text-gray-300">{summary.needsAttachment}</span>
                </div>
              )}
              {summary.hasErrors > 0 && (
                <div className="flex items-center gap-1.5 text-xs">
                  <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                  <span className="text-gray-700 dark:text-gray-300">{summary.hasErrors}</span>
                </div>
              )}
              {summary.inProgress > 0 && (
                <div className="flex items-center gap-1.5 text-xs">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-gray-700 dark:text-gray-300">{summary.inProgress}</span>
                </div>
              )}
              {showMarks && (
                <div className="flex items-center gap-1.5 text-xs">
                  <BarChart3 className="w-3.5 h-3.5 text-gray-600" />
                  <span className="text-gray-700 dark:text-gray-300">{summary.totalMarks}m</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!compact && (
        <div className="flex gap-2 px-3">
          <Button
            variant="outline"
            size="sm"
            onClick={navigatePrevious}
            disabled={!currentId || allItems.findIndex(item => item.id === currentId) === 0}
            className="flex-1 h-8"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={navigateNext}
            disabled={!currentId || allItems.findIndex(item => item.id === currentId) === allItems.length - 1}
            className="flex-1 h-8"
          >
            Next
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      )}

      {!compact && (summary.completedItems < summary.totalItems || summary.hasErrors > 0) && (
        <div className="flex gap-2 px-3">
          {summary.completedItems < summary.totalItems && (
            <Button
              variant="outline"
              size="sm"
              onClick={jumpToNextIncomplete}
              className="flex-1 h-8 text-xs"
            >
              <AlertTriangle className="w-3.5 h-3.5 mr-1" />
              Next Incomplete
            </Button>
          )}
          {summary.hasErrors > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={jumpToNextError}
              className="flex-1 h-8 text-xs"
            >
              <XCircle className="w-3.5 h-3.5 mr-1" />
              Next Error
            </Button>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-3 space-y-1">
        {items.map(item => renderNavigationItem(item, 0))}
      </div>
    </div>
  );
};

export default EnhancedQuestionNavigator;

export function buildEnhancedNavigationItems(
  questions: any[],
  attachmentData?: Map<string, AttachmentStatus>,
  statusData?: Map<string, QuestionStatus>
): NavigationItem[] {
  return questions.map(question => {
    const item: NavigationItem = {
      id: question.id,
      label: `Q${question.question_number}`,
      level: 'question',
      marks: question.marks,
      isAnswered: question.isAnswered,
      isCorrect: question.isCorrect,
      isContainer: question.is_contextual_only || false,
      hasDirectAnswer: question.has_direct_answer !== false,
      figureRequired: question.figure_required || false,
      answerFormat: question.answer_format,
      attachmentStatus: attachmentData?.get(question.id),
      questionStatus: statusData?.get(question.id),
    };

    if (question.parts && question.parts.length > 0) {
      item.children = question.parts.map((part: any) => {
        const partItem: NavigationItem = {
          id: part.id,
          label: part.part_label,
          level: 'part',
          marks: part.marks,
          isAnswered: part.isAnswered,
          isCorrect: part.isCorrect,
          isContainer: part.is_contextual_only || false,
          hasDirectAnswer: part.has_direct_answer !== false,
          figureRequired: part.figure_required || false,
          answerFormat: part.answer_format,
          attachmentStatus: attachmentData?.get(part.id),
          questionStatus: statusData?.get(part.id),
        };

        if (part.subparts && part.subparts.length > 0) {
          partItem.children = part.subparts.map((subpart: any) => ({
            id: subpart.id,
            label: subpart.part_label || subpart.subpart_label,
            level: 'subpart' as const,
            marks: subpart.marks,
            isAnswered: subpart.isAnswered,
            isCorrect: subpart.isCorrect,
            isContainer: false,
            hasDirectAnswer: true,
            figureRequired: subpart.figure_required || false,
            answerFormat: subpart.answer_format,
            attachmentStatus: attachmentData?.get(subpart.id),
            questionStatus: statusData?.get(subpart.id),
          }));
        }

        return partItem;
      });
    }

    return item;
  });
}

export type { NavigationItem, QuestionStatus, AttachmentStatus, NavigationFilter };
