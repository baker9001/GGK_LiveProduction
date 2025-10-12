import React from 'react';
import { CheckCircle2, Circle, AlertCircle } from 'lucide-react';

interface QuestionReviewCheckboxProps {
  questionId: string;
  isReviewed: boolean;
  hasIssues: boolean;
  onToggleReview: (questionId: string) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const QuestionReviewCheckbox: React.FC<QuestionReviewCheckboxProps> = ({
  questionId,
  isReviewed,
  hasIssues,
  onToggleReview,
  disabled = false,
  size = 'md',
  showLabel = true,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const iconSize = sizeClasses[size];

  const getStatusIcon = () => {
    if (isReviewed && hasIssues) {
      return <AlertCircle className={`${iconSize} text-yellow-600`} />;
    }
    if (isReviewed) {
      return <CheckCircle2 className={`${iconSize} text-green-600`} />;
    }
    return <Circle className={`${iconSize} text-gray-400`} />;
  };

  const getStatusText = () => {
    if (isReviewed && hasIssues) {
      return 'Needs Attention';
    }
    if (isReviewed) {
      return 'Reviewed';
    }
    return 'Not Reviewed';
  };

  const getStatusColor = () => {
    if (isReviewed && hasIssues) {
      return 'text-yellow-700';
    }
    if (isReviewed) {
      return 'text-green-700';
    }
    return 'text-gray-600';
  };

  return (
    <button
      type="button"
      onClick={() => onToggleReview(questionId)}
      disabled={disabled}
      className={`flex items-center gap-2 transition-all ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80 cursor-pointer'
      } ${className}`}
      aria-label={`Mark question as ${isReviewed ? 'not reviewed' : 'reviewed'}`}
    >
      {getStatusIcon()}
      {showLabel && (
        <span className={`text-sm font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </span>
      )}
    </button>
  );
};
