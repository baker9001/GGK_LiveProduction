/**
 * ValidationSummaryPanel Component
 * Displays validation errors and warnings for questions
 * Extracted from QuestionsTab to improve modularity
 */

import React, { useMemo } from 'react';
import { AlertTriangle, AlertCircle, CheckCircle, XCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '../../../../../../components/shared/Button';

interface ValidationSummaryPanelProps {
  validationErrors: Record<string, string[]>;
  questions: any[];
  onFixIssue?: (questionId: string, issueType: string) => void;
  onScrollToQuestion?: (questionId: string) => void;
}

export const ValidationSummaryPanel: React.FC<ValidationSummaryPanelProps> = ({
  validationErrors,
  questions,
  onFixIssue,
  onScrollToQuestion
}) => {
  const [expanded, setExpanded] = React.useState(false);

  const validationSummary = useMemo(() => {
    const errorsByType: Record<string, { count: number; questions: string[] }> = {};
    const criticalQuestions: string[] = [];
    const warningQuestions: string[] = [];

    Object.entries(validationErrors).forEach(([questionId, errors]) => {
      if (errors.length === 0) return;

      const hasCritical = errors.some(err =>
        err.toLowerCase().includes('required') ||
        err.toLowerCase().includes('missing') ||
        err.toLowerCase().includes('invalid')
      );

      if (hasCritical) {
        criticalQuestions.push(questionId);
      } else {
        warningQuestions.push(questionId);
      }

      errors.forEach(error => {
        const errorType = error.split(':')[0] || error;
        if (!errorsByType[errorType]) {
          errorsByType[errorType] = { count: 0, questions: [] };
        }
        errorsByType[errorType].count++;
        if (!errorsByType[errorType].questions.includes(questionId)) {
          errorsByType[errorType].questions.push(questionId);
        }
      });
    });

    const totalIssues = Object.keys(validationErrors).filter(
      id => validationErrors[id]?.length > 0
    ).length;

    return {
      totalIssues,
      criticalCount: criticalQuestions.length,
      warningCount: warningQuestions.length,
      errorsByType,
      criticalQuestions,
      warningQuestions
    };
  }, [validationErrors]);

  if (validationSummary.totalIssues === 0) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <div>
            <p className="font-semibold text-green-900 dark:text-green-100">
              All Questions Valid
            </p>
            <p className="text-sm text-green-700 dark:text-green-300">
              {questions.length} questions ready for import
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <AlertTriangle className="w-5 h-5 text-orange-600" />
          <div className="text-left">
            <p className="font-semibold text-gray-900 dark:text-gray-100">
              Validation Issues Found
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {validationSummary.totalIssues} question(s) need attention
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {validationSummary.criticalCount > 0 && (
            <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-medium rounded">
              {validationSummary.criticalCount} Critical
            </span>
          )}
          {validationSummary.warningCount > 0 && (
            <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-xs font-medium rounded">
              {validationSummary.warningCount} Warnings
            </span>
          )}
          {expanded ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-4">
          {/* Issues by Type */}
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Issues by Type
            </p>
            <div className="space-y-2">
              {Object.entries(validationSummary.errorsByType)
                .sort((a, b) => b[1].count - a[1].count)
                .map(([errorType, data]) => (
                  <div
                    key={errorType}
                    className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900/50 rounded"
                  >
                    <div className="flex items-center space-x-2">
                      <XCircle className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {errorType}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {data.count} {data.count === 1 ? 'occurrence' : 'occurrences'}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        in {data.questions.length} {data.questions.length === 1 ? 'question' : 'questions'}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Critical Questions */}
          {validationSummary.criticalQuestions.length > 0 && (
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-2">
                Critical Issues ({validationSummary.criticalQuestions.length})
              </p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {validationSummary.criticalQuestions.map(questionId => {
                  const question = questions.find(q => q.id === questionId);
                  const errors = validationErrors[questionId] || [];

                  return (
                    <div
                      key={questionId}
                      className="flex items-start justify-between p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          Question {question?.question_number || questionId}
                        </p>
                        <ul className="mt-1 space-y-0.5 text-xs text-red-700 dark:text-red-300">
                          {errors.slice(0, 2).map((error, idx) => (
                            <li key={idx}>• {error}</li>
                          ))}
                          {errors.length > 2 && (
                            <li className="text-red-600 dark:text-red-400">
                              +{errors.length - 2} more
                            </li>
                          )}
                        </ul>
                      </div>
                      {onScrollToQuestion && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onScrollToQuestion(questionId)}
                          className="ml-2 text-xs"
                        >
                          View
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Warning Questions */}
          {validationSummary.warningQuestions.length > 0 && (
            <div>
              <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300 mb-2">
                Warnings ({validationSummary.warningQuestions.length})
              </p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {validationSummary.warningQuestions.map(questionId => {
                  const question = questions.find(q => q.id === questionId);
                  const errors = validationErrors[questionId] || [];

                  return (
                    <div
                      key={questionId}
                      className="flex items-center justify-between p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-sm"
                    >
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          Question {question?.question_number || questionId}
                        </p>
                        <p className="text-xs text-yellow-700 dark:text-yellow-300">
                          {errors[0]}
                        </p>
                      </div>
                      {onScrollToQuestion && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onScrollToQuestion(questionId)}
                          className="text-xs"
                        >
                          View
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ValidationSummaryPanel;
