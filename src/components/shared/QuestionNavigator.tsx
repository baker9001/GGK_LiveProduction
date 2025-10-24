import React, { useMemo } from 'react';
import { ChevronRight, Check, Circle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavigationItem {
  id: string;
  label: string;
  level: 'question' | 'part' | 'subpart';
  marks?: number;
  isAnswered?: boolean;
  isCorrect?: boolean | null;
  isContainer?: boolean;
  hasDirectAnswer?: boolean;
  children?: NavigationItem[];
}

interface QuestionNavigatorProps {
  items: NavigationItem[];
  currentId?: string;
  onNavigate: (id: string) => void;
  showParts?: boolean;
  showSubparts?: boolean;
  showMarks?: boolean;
  showStatus?: boolean;
  mode?: 'practice' | 'exam' | 'review' | 'qa_preview' | 'simulation';
  className?: string;
}

const QuestionNavigator: React.FC<QuestionNavigatorProps> = ({
  items,
  currentId,
  onNavigate,
  showParts = false,
  showSubparts = false,
  showMarks = true,
  showStatus = true,
  mode = 'practice',
  className,
}) => {
  const [expandedItems, setExpandedItems] = React.useState<Set<string>>(new Set());

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

  const getStatusIcon = (item: NavigationItem) => {
    if (!showStatus) return null;

    if (mode === 'review' && item.isCorrect !== null && item.isCorrect !== undefined) {
      return item.isCorrect ? (
        <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
      ) : (
        <AlertCircle className="w-3 h-3 text-red-600 dark:text-red-400" />
      );
    }

    if (item.isAnswered) {
      return <Check className="w-3 h-3 text-blue-600 dark:text-blue-400" />;
    }

    // Show indicator for unanswered items that require answers
    if (item.hasDirectAnswer && !item.isContainer) {
      return <Circle className="w-3 h-3 text-gray-400 dark:text-gray-500" />;
    }

    return null;
  };

  const renderNavigationItem = (item: NavigationItem, depth: number = 0) => {
    const isExpanded = expandedItems.has(item.id);
    const isCurrent = currentId === item.id;
    const hasChildren = item.children && item.children.length > 0;
    const shouldShowChildren =
      hasChildren &&
      ((depth === 0 && showParts) || (depth === 1 && showSubparts));

    // Determine if item is clickable
    const isClickable = !item.isContainer || item.hasDirectAnswer;

    return (
      <div key={item.id} className={cn('select-none', depth > 0 && 'ml-4')}>
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
            isClickable && 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800',
            !isClickable && 'cursor-default opacity-60',
            isCurrent && 'bg-blue-100 dark:bg-blue-900/30 font-medium',
            depth === 0 && 'border-l-2',
            depth === 0 && isCurrent && 'border-blue-600 dark:border-blue-400',
            depth === 0 && !isCurrent && 'border-transparent'
          )}
          onClick={() => {
            if (isClickable) {
              onNavigate(item.id);
            }
            if (hasChildren) {
              toggleExpanded(item.id);
            }
          }}
        >
          {/* Expand/Collapse icon for containers */}
          {hasChildren && shouldShowChildren && (
            <button
              onClick={e => {
                e.stopPropagation();
                toggleExpanded(item.id);
              }}
              className="flex-shrink-0 p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            >
              <ChevronRight
                className={cn(
                  'w-4 h-4 text-gray-600 dark:text-gray-400 transition-transform',
                  isExpanded && 'rotate-90'
                )}
              />
            </button>
          )}

          {/* Status icon */}
          <div className="flex-shrink-0">{getStatusIcon(item)}</div>

          {/* Label */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'font-mono text-xs px-1.5 py-0.5 rounded',
                  item.level === 'question' &&
                    'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
                  item.level === 'part' &&
                    'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
                  item.level === 'subpart' &&
                    'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                )}
              >
                {item.label}
              </span>

              {/* Container indicator */}
              {item.isContainer && (
                <span className="text-xs text-gray-500 dark:text-gray-400 italic">
                  (context)
                </span>
              )}
            </div>
          </div>

          {/* Marks */}
          {showMarks && item.marks !== undefined && (
            <span className="flex-shrink-0 text-xs text-gray-600 dark:text-gray-400">
              {item.marks}m
            </span>
          )}
        </div>

        {/* Render children */}
        {shouldShowChildren && isExpanded && hasChildren && (
          <div className="mt-1">{item.children!.map(child => renderNavigationItem(child, depth + 1))}</div>
        )}
      </div>
    );
  };

  // Calculate summary statistics
  const summary = useMemo(() => {
    let totalItems = 0;
    let answeredItems = 0;
    let correctItems = 0;
    let totalMarks = 0;

    const countItems = (items: NavigationItem[]) => {
      items.forEach(item => {
        // Only count items that require answers
        if (item.hasDirectAnswer && !item.isContainer) {
          totalItems++;
          if (item.isAnswered) answeredItems++;
          if (item.isCorrect === true) correctItems++;
        }
        if (item.marks) totalMarks += item.marks;

        if (item.children) {
          countItems(item.children);
        }
      });
    };

    countItems(items);

    return { totalItems, answeredItems, correctItems, totalMarks };
  }, [items]);

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* Summary */}
      {showStatus && (
        <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            Progress
          </div>
          <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
            <div className="flex justify-between">
              <span>Answered:</span>
              <span className="font-medium">
                {summary.answeredItems} / {summary.totalItems}
              </span>
            </div>
            {mode === 'review' && summary.totalItems > 0 && (
              <div className="flex justify-between">
                <span>Correct:</span>
                <span className="font-medium text-green-600 dark:text-green-400">
                  {summary.correctItems} / {summary.totalItems}
                </span>
              </div>
            )}
            {showMarks && (
              <div className="flex justify-between">
                <span>Total Marks:</span>
                <span className="font-medium">{summary.totalMarks}</span>
              </div>
            )}
          </div>

          {/* Progress bar */}
          {summary.totalItems > 0 && (
            <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full transition-all duration-300',
                  mode === 'review' ? 'bg-green-500' : 'bg-blue-500'
                )}
                style={{
                  width: `${
                    mode === 'review'
                      ? (summary.correctItems / summary.totalItems) * 100
                      : (summary.answeredItems / summary.totalItems) * 100
                  }%`,
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Navigation items */}
      <div className="space-y-1">{items.map(item => renderNavigationItem(item, 0))}</div>
    </div>
  );
};

export default QuestionNavigator;

/**
 * Helper function to build navigation items from question data
 */
export function buildNavigationItems(questions: any[]): NavigationItem[] {
  return questions.map(question => {
    const item: NavigationItem = {
      id: question.id,
      label: `Q${question.question_number}`,
      level: 'question',
      marks: question.marks,
      isAnswered: question.isAnswered,
      isCorrect: question.isCorrect,
      isContainer: question.is_container,
      hasDirectAnswer: question.has_direct_answer,
    };

    // Add parts if they exist
    if (question.parts && question.parts.length > 0) {
      item.children = question.parts.map((part: any) => {
        const partItem: NavigationItem = {
          id: part.id,
          label: part.part_label,
          level: 'part',
          marks: part.marks,
          isAnswered: part.isAnswered,
          isCorrect: part.isCorrect,
          isContainer: part.is_container,
          hasDirectAnswer: part.has_direct_answer,
        };

        // Add subparts if they exist
        if (part.subparts && part.subparts.length > 0) {
          partItem.children = part.subparts.map((subpart: any) => ({
            id: subpart.id,
            label: subpart.subpart_label,
            level: 'subpart' as const,
            marks: subpart.marks,
            isAnswered: subpart.isAnswered,
            isCorrect: subpart.isCorrect,
            isContainer: false,
            hasDirectAnswer: true,
          }));
        }

        return partItem;
      });
    }

    return item;
  });
}
