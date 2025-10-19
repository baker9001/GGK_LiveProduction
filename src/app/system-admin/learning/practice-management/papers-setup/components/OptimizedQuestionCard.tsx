/**
 * OptimizedQuestionCard Component
 * Performance-optimized question card with React.memo
 * Prevents unnecessary re-renders when parent state changes
 */

import React, { memo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Edit2,
  AlertTriangle,
  CheckCircle,
  Image as ImageIcon,
  FileText,
  Flag
} from 'lucide-react';
import { Button } from '../../../../../../components/shared/Button';
import { StatusBadge } from '../../../../../../components/shared/StatusBadge';

interface OptimizedQuestionCardProps {
  question: any;
  isExpanded: boolean;
  isEditing: boolean;
  hasAttachments: boolean;
  validationErrors: string[];
  isFlagged?: boolean;
  onToggleExpand: (questionId: string) => void;
  onEdit: (question: any) => void;
  onFlag?: (questionId: string) => void;
  children?: React.ReactNode;
}

/**
 * Question card with memoization to prevent unnecessary re-renders
 * Only re-renders when props actually change
 */
export const OptimizedQuestionCard = memo<OptimizedQuestionCardProps>(
  ({
    question,
    isExpanded,
    isEditing,
    hasAttachments,
    validationErrors,
    isFlagged = false,
    onToggleExpand,
    onEdit,
    onFlag,
    children
  }) => {
    const hasErrors = validationErrors.length > 0;
    const criticalError = validationErrors.some(err =>
      err.toLowerCase().includes('required') || err.toLowerCase().includes('missing')
    );

    return (
      <div
        className={`
          border rounded-lg overflow-hidden transition-all
          ${hasErrors
            ? criticalError
              ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/10'
              : 'border-yellow-300 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/10'
            : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
          }
          ${isFlagged ? 'ring-2 ring-orange-400' : ''}
        `}
      >
        {/* Card Header */}
        <div className="flex items-start justify-between p-4">
          <div className="flex items-start space-x-3 flex-1">
            {/* Expand/Collapse Button */}
            <button
              onClick={() => onToggleExpand(question.id)}
              className="mt-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? (
                <ChevronDown className="w-5 h-5" />
              ) : (
                <ChevronRight className="w-5 h-5" />
              )}
            </button>

            {/* Question Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-2">
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  Q{question.question_number}
                </span>

                {/* Question Type Badge */}
                <StatusBadge
                  status={question.question_type || 'unknown'}
                  size="sm"
                />

                {/* Marks */}
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  [{question.marks || 0} {question.marks === 1 ? 'mark' : 'marks'}]
                </span>

                {/* Difficulty */}
                {question.difficulty && (
                  <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                    {question.difficulty}
                  </span>
                )}
              </div>

              {/* Question Text Preview */}
              <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                {question.question_text}
              </p>

              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
                {question.topic && (
                  <span className="flex items-center">
                    <FileText className="w-3 h-3 mr-1" />
                    {question.topic}
                  </span>
                )}
                {question.subtopic && (
                  <span>• {question.subtopic}</span>
                )}
                {hasAttachments && (
                  <span className="flex items-center text-blue-600 dark:text-blue-400">
                    <ImageIcon className="w-3 h-3 mr-1" />
                    Has attachments
                  </span>
                )}
              </div>

              {/* Validation Errors */}
              {hasErrors && !isExpanded && (
                <div className="mt-2 flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-orange-700 dark:text-orange-300">
                    {validationErrors.length === 1 ? (
                      <p>{validationErrors[0]}</p>
                    ) : (
                      <p>{validationErrors.length} validation issues</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 ml-4">
            {isFlagged && (
              <Flag className="w-4 h-4 text-orange-600" />
            )}

            {hasErrors ? (
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            ) : (
              <CheckCircle className="w-5 h-5 text-green-600" />
            )}

            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEdit(question)}
              disabled={isEditing}
            >
              <Edit2 className="w-4 h-4" />
            </Button>

            {onFlag && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onFlag(question.id)}
                className={isFlagged ? 'text-orange-600' : ''}
              >
                <Flag className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/50">
            {/* Full Question Text */}
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Question Text
              </p>
              <div className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                {question.question_text}
              </div>
            </div>

            {/* Validation Errors (Expanded) */}
            {hasErrors && (
              <div className="mb-4">
                <p className="text-sm font-medium text-orange-700 dark:text-orange-300 mb-2">
                  Validation Issues
                </p>
                <ul className="space-y-1">
                  {validationErrors.map((error, idx) => (
                    <li
                      key={idx}
                      className="text-sm text-orange-700 dark:text-orange-300 flex items-start"
                    >
                      <span className="mr-2">•</span>
                      <span>{error}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Custom Content (Parts, Attachments, etc.) */}
            {children}
          </div>
        )}
      </div>
    );
  },
  // Custom comparison function for memoization
  (prevProps, nextProps) => {
    return (
      prevProps.question.id === nextProps.question.id &&
      prevProps.isExpanded === nextProps.isExpanded &&
      prevProps.isEditing === nextProps.isEditing &&
      prevProps.hasAttachments === nextProps.hasAttachments &&
      prevProps.isFlagged === nextProps.isFlagged &&
      JSON.stringify(prevProps.validationErrors) === JSON.stringify(nextProps.validationErrors)
    );
  }
);

OptimizedQuestionCard.displayName = 'OptimizedQuestionCard';

export default OptimizedQuestionCard;
