import React from 'react';
import { CheckCircle2, AlertCircle, XCircle, Clock } from 'lucide-react';

interface ReviewProgressCardProps {
  totalQuestions: number;
  reviewedQuestions: number;
  questionsWithIssues: number;
  simulationCompleted: boolean;
  simulationPassed?: boolean;
  simulationScore?: number;
  validationErrorCount: number;
  className?: string;
}

export const ReviewProgressCard: React.FC<ReviewProgressCardProps> = ({
  totalQuestions,
  reviewedQuestions,
  questionsWithIssues,
  simulationCompleted,
  simulationPassed,
  simulationScore,
  validationErrorCount,
  className = '',
}) => {
  const reviewProgress = totalQuestions > 0 ? (reviewedQuestions / totalQuestions) * 100 : 0;
  const allReviewed = reviewedQuestions === totalQuestions && totalQuestions > 0;
  const hasIssues = questionsWithIssues > 0 || validationErrorCount > 0;

  const getStatusColor = () => {
    if (allReviewed && simulationCompleted && !hasIssues) return 'green';
    if (hasIssues) return 'red';
    if (reviewProgress > 0) return 'yellow';
    return 'gray';
  };

  const statusColor = getStatusColor();

  const colorClasses = {
    green: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      progressBg: 'bg-green-500',
    },
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      progressBg: 'bg-red-500',
    },
    yellow: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      progressBg: 'bg-yellow-500',
    },
    gray: {
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      text: 'text-gray-800',
      progressBg: 'bg-gray-500',
    },
  };

  const colors = colorClasses[statusColor];

  return (
    <div className={`${colors.bg} ${colors.border} border rounded-lg p-4 ${className}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className={`text-sm font-semibold ${colors.text} mb-1`}>
            Review Progress
          </h3>
          <p className="text-xs text-gray-600">
            {reviewedQuestions} of {totalQuestions} questions reviewed
          </p>
        </div>
        <div className="flex items-center gap-2">
          {allReviewed && simulationCompleted && !hasIssues ? (
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          ) : hasIssues ? (
            <AlertCircle className="w-5 h-5 text-red-600" />
          ) : reviewProgress > 0 ? (
            <Clock className="w-5 h-5 text-yellow-600" />
          ) : (
            <XCircle className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
        <div
          className={`${colors.progressBg} h-2 rounded-full transition-all duration-300`}
          style={{ width: `${reviewProgress}%` }}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600">Questions with issues:</span>
          <span className={questionsWithIssues > 0 ? 'text-red-600 font-semibold' : 'text-gray-500'}>
            {questionsWithIssues}
          </span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600">Validation errors:</span>
          <span className={validationErrorCount > 0 ? 'text-red-600 font-semibold' : 'text-gray-500'}>
            {validationErrorCount}
          </span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600">Simulation status:</span>
          <span className={simulationCompleted ? 'text-green-600 font-semibold' : 'text-gray-500'}>
            {simulationCompleted ? (
              simulationPassed ? (
                `Passed (${simulationScore}%)`
              ) : (
                `Failed (${simulationScore}%)`
              )
            ) : (
              'Not completed'
            )}
          </span>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-200">
        <p className="text-xs font-semibold text-gray-700 mb-2">Import Requirements:</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs">
            {allReviewed ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-gray-400" />
            )}
            <span className={allReviewed ? 'text-green-700' : 'text-gray-600'}>
              All questions reviewed
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {simulationCompleted ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-gray-400" />
            )}
            <span className={simulationCompleted ? 'text-green-700' : 'text-gray-600'}>
              Test simulation completed
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {questionsWithIssues === 0 ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-yellow-600" />
            )}
            <span className={questionsWithIssues === 0 ? 'text-green-700' : 'text-yellow-700'}>
              No unresolved issues
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
