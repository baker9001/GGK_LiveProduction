import React from 'react';
import { CheckCircle, Circle, Flag, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ReviewStatus {
  questionId: string;
  isReviewed: boolean;
  reviewedAt?: string;
  hasIssues?: boolean;
  issueCount?: number;
  needsAttention?: boolean;
}

interface QuestionReviewStatusProps {
  status: ReviewStatus;
  onToggleReview: (questionId: string) => void;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

export const QuestionReviewStatus: React.FC<QuestionReviewStatusProps> = ({
  status,
  onToggleReview,
  showLabel = true,
  size = 'md',
  disabled = false
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  const buttonSizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!disabled) {
      onToggleReview(status.questionId);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-2 rounded-lg border transition-all',
        buttonSizeClasses[size],
        status.isReviewed
          ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30'
          : status.hasIssues
          ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
          : 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      title={status.isReviewed ? 'Mark as not reviewed' : 'Mark as reviewed'}
    >
      {status.isReviewed ? (
        <CheckCircle className={cn(sizeClasses[size], 'text-green-600 dark:text-green-400')} />
      ) : (
        <Circle className={cn(sizeClasses[size])} />
      )}
      {showLabel && (
        <span className="font-medium">
          {status.isReviewed ? 'Reviewed' : 'Not Reviewed'}
        </span>
      )}
      {status.hasIssues && status.issueCount && status.issueCount > 0 && (
        <span className="flex items-center gap-1 text-xs bg-yellow-200 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-100 px-1.5 py-0.5 rounded">
          <AlertTriangle className="h-3 w-3" />
          {status.issueCount}
        </span>
      )}
      {status.needsAttention && !status.isReviewed && (
        <Flag className={cn(sizeClasses[size], 'text-orange-500')} />
      )}
    </button>
  );
};

interface ReviewProgressProps {
  total: number;
  reviewed: number;
  withIssues?: number;
}

export const ReviewProgress: React.FC<ReviewProgressProps> = ({
  total,
  reviewed,
  withIssues = 0
}) => {
  const percentage = total > 0 ? Math.round((reviewed / total) * 100) : 0;
  const isComplete = reviewed === total;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Review Progress
          </span>
          {isComplete && (
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          )}
        </div>
        <div className="text-sm font-semibold text-gray-900 dark:text-white">
          {reviewed} / {total} ({percentage}%)
        </div>
      </div>

      <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className={cn(
            'h-full transition-all duration-500 ease-out',
            isComplete
              ? 'bg-green-500 dark:bg-green-400'
              : 'bg-blue-500 dark:bg-blue-400'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {withIssues > 0 && (
        <div className="flex items-center gap-2 text-xs text-yellow-700 dark:text-yellow-300">
          <AlertTriangle className="h-3 w-3" />
          <span>{withIssues} question{withIssues !== 1 ? 's' : ''} with issues</span>
        </div>
      )}
    </div>
  );
};
