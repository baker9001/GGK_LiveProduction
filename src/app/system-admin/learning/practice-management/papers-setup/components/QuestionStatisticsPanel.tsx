/**
 * QuestionStatisticsPanel Component
 * Displays statistics and metrics for imported questions
 * Extracted from QuestionsTab to improve modularity
 */

import React, { useMemo } from 'react';
import { BarChart3, CheckCircle, AlertTriangle, FileText, Image } from 'lucide-react';

interface QuestionStatisticsPanelProps {
  questions: any[];
  validationErrors: Record<string, string[]>;
  hasAttachments: (questionId: string) => boolean;
  reviewSummary?: {
    total: number;
    reviewed: number;
    withIssues: number;
    allReviewed: boolean;
  };
}

export const QuestionStatisticsPanel: React.FC<QuestionStatisticsPanelProps> = ({
  questions,
  validationErrors,
  hasAttachments,
  reviewSummary
}) => {
  const statistics = useMemo(() => {
    const total = questions.length;
    const withErrors = Object.keys(validationErrors).filter(id =>
      validationErrors[id]?.length > 0
    ).length;
    const withAttachments = questions.filter(q => hasAttachments(q.id)).length;
    const avgMarks = questions.length > 0
      ? questions.reduce((sum, q) => sum + (q.marks || 0), 0) / questions.length
      : 0;

    const byType = questions.reduce((acc, q) => {
      const type = q.question_type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byDifficulty = questions.reduce((acc, q) => {
      const diff = q.difficulty || 'unknown';
      acc[diff] = (acc[diff] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      withErrors,
      withAttachments,
      avgMarks: avgMarks.toFixed(1),
      byType,
      byDifficulty,
      readyToImport: total - withErrors
    };
  }, [questions, validationErrors, hasAttachments]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <BarChart3 className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Questions Overview
        </h3>
      </div>

      {/* Main Statistics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-1">
            <FileText className="w-4 h-4 text-blue-600" />
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Questions</p>
          </div>
          <p className="text-3xl font-bold text-blue-600">{statistics.total}</p>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-1">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Ready to Import</p>
          </div>
          <p className="text-3xl font-bold text-green-600">{statistics.readyToImport}</p>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">With Errors</p>
          </div>
          <p className="text-3xl font-bold text-red-600">{statistics.withErrors}</p>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-1">
            <Image className="w-4 h-4 text-purple-600" />
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">With Attachments</p>
          </div>
          <p className="text-3xl font-bold text-purple-600">{statistics.withAttachments}</p>
        </div>
      </div>

      {/* Review Progress */}
      {reviewSummary && (
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Review Progress
          </p>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{
                    width: `${reviewSummary.total > 0
                      ? (reviewSummary.reviewed / reviewSummary.total) * 100
                      : 0}%`
                  }}
                />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {reviewSummary.reviewed} / {reviewSummary.total}
            </p>
          </div>
          {reviewSummary.withIssues > 0 && (
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
              {reviewSummary.withIssues} question(s) need attention
            </p>
          )}
        </div>
      )}

      {/* Average Marks */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-400">Average Marks:</span>
        <span className="font-semibold text-gray-900 dark:text-gray-100">
          {statistics.avgMarks} marks
        </span>
      </div>

      {/* Question Types Breakdown */}
      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Question Types
        </p>
        <div className="space-y-1">
          {Object.entries(statistics.byType).map(([type, count]) => (
            <div key={type} className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400 capitalize">
                {type.replace(/_/g, ' ')}
              </span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Difficulty Distribution */}
      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Difficulty Distribution
        </p>
        <div className="space-y-1">
          {Object.entries(statistics.byDifficulty).map(([difficulty, count]) => (
            <div key={difficulty} className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400 capitalize">
                {difficulty}
              </span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QuestionStatisticsPanel;
