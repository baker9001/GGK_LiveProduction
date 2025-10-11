import React, { useMemo } from 'react';
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Image,
  Target,
  Award,
  BookOpen,
  ShieldCheck,
  TrendingUp,
  Info
} from 'lucide-react';
import { Button } from '../../../../../../../components/shared/Button';
import { cn } from '../../../../../../../lib/utils';

interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  questionNumber?: string;
  partLabel?: string;
  field?: string;
}

interface ValidationSummary {
  totalQuestions: number;
  validQuestions: number;
  questionsWithErrors: number;
  questionsWithWarnings: number;
  totalErrors: number;
  totalWarnings: number;
  totalInfoMessages: number;
}

interface QuestionValidationDetails {
  hasQuestionText: boolean;
  hasMarks: boolean;
  hasCorrectAnswer: boolean;
  hasTopicMapping: boolean;
  hasAttachments: boolean;
  missingAttachments: number;
  hasHint: boolean;
  hasExplanation: boolean;
  answerFormatValid: boolean;
  markingCriteriaPresent: boolean;
}

interface EnhancedValidationPanelProps {
  questions: any[];
  issues: ValidationIssue[];
  onFixIssue?: (issue: ValidationIssue) => void;
  onAutoFix?: () => void;
  onScrollToQuestion?: (questionId: string) => void;
  showDetailedBreakdown?: boolean;
}

export function EnhancedValidationPanel({
  questions,
  issues,
  onFixIssue,
  onAutoFix,
  onScrollToQuestion,
  showDetailedBreakdown = true
}: EnhancedValidationPanelProps) {

  const summary: ValidationSummary = useMemo(() => {
    const errors = issues.filter(i => i.type === 'error');
    const warnings = issues.filter(i => i.type === 'warning');
    const infos = issues.filter(i => i.type === 'info');

    const questionsWithErrors = new Set(errors.map(e => e.questionNumber).filter(Boolean)).size;
    const questionsWithWarnings = new Set(warnings.map(w => w.questionNumber).filter(Boolean)).size;

    return {
      totalQuestions: questions.length,
      validQuestions: questions.length - questionsWithErrors,
      questionsWithErrors,
      questionsWithWarnings,
      totalErrors: errors.length,
      totalWarnings: warnings.length,
      totalInfoMessages: infos.length
    };
  }, [issues, questions]);

  const healthScore = useMemo(() => {
    if (questions.length === 0) return 0;
    const maxPossibleIssues = questions.length * 5;
    const actualIssues = summary.totalErrors * 2 + summary.totalWarnings;
    const score = Math.max(0, ((maxPossibleIssues - actualIssues) / maxPossibleIssues) * 100);
    return Math.round(score);
  }, [summary, questions.length]);

  const categoryBreakdown = useMemo(() => {
    const categories: Record<string, { errors: number; warnings: number; infos: number }> = {};

    issues.forEach(issue => {
      if (!categories[issue.category]) {
        categories[issue.category] = { errors: 0, warnings: 0, infos: 0 };
      }

      if (issue.type === 'error') categories[issue.category].errors++;
      else if (issue.type === 'warning') categories[issue.category].warnings++;
      else categories[issue.category].infos++;
    });

    return Object.entries(categories).map(([name, counts]) => ({
      name,
      ...counts,
      total: counts.errors + counts.warnings + counts.infos
    })).sort((a, b) => b.total - a.total);
  }, [issues]);

  const getHealthScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400';
    if (score >= 70) return 'text-yellow-600 dark:text-yellow-400';
    if (score >= 50) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getHealthScoreBackground = (score: number) => {
    if (score >= 90) return 'bg-green-100 dark:bg-green-900/20';
    if (score >= 70) return 'bg-yellow-100 dark:bg-yellow-900/20';
    if (score >= 50) return 'bg-orange-100 dark:bg-orange-900/20';
    return 'bg-red-100 dark:bg-red-900/20';
  };

  return (
    <div className="space-y-6">
      {/* Health Score Card */}
      <div className={cn(
        "p-6 rounded-lg border-2",
        getHealthScoreBackground(healthScore),
        healthScore >= 90 ? 'border-green-300 dark:border-green-700' :
        healthScore >= 70 ? 'border-yellow-300 dark:border-yellow-700' :
        healthScore >= 50 ? 'border-orange-300 dark:border-orange-700' :
        'border-red-300 dark:border-red-700'
      )}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className={cn("h-6 w-6", getHealthScoreColor(healthScore))} />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Data Quality Score
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Overall assessment of your imported question data quality
            </p>

            {/* Progress Bar */}
            <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all duration-500",
                  healthScore >= 90 ? 'bg-green-500' :
                  healthScore >= 70 ? 'bg-yellow-500' :
                  healthScore >= 50 ? 'bg-orange-500' :
                  'bg-red-500'
                )}
                style={{ width: `${healthScore}%` }}
              />
            </div>
          </div>

          <div className="ml-6 text-center">
            <div className={cn("text-5xl font-bold", getHealthScoreColor(healthScore))}>
              {healthScore}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              out of 100
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="bg-white/50 dark:bg-gray-800/50 p-3 rounded-lg">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {summary.totalQuestions}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Total Questions
            </div>
          </div>

          <div className="bg-white/50 dark:bg-gray-800/50 p-3 rounded-lg">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {summary.validQuestions}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Valid Questions
            </div>
          </div>

          <div className="bg-white/50 dark:bg-gray-800/50 p-3 rounded-lg">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {summary.totalErrors}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Errors Found
            </div>
          </div>

          <div className="bg-white/50 dark:bg-gray-800/50 p-3 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {summary.totalWarnings}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Warnings
            </div>
          </div>
        </div>

        {/* Auto-fix Button */}
        {(summary.totalErrors > 0 || summary.totalWarnings > 0) && onAutoFix && (
          <div className="mt-6 flex justify-end">
            <Button
              onClick={onAutoFix}
              leftIcon={<ShieldCheck className="h-4 w-4" />}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Auto-Fix Common Issues ({summary.totalErrors + summary.totalWarnings})
            </Button>
          </div>
        )}
      </div>

      {/* Category Breakdown */}
      {showDetailedBreakdown && categoryBreakdown.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Issues by Category
          </h4>

          <div className="space-y-3">
            {categoryBreakdown.map((category) => (
              <div
                key={category.name}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {category.name}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {category.total} issue{category.total !== 1 ? 's' : ''} found
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {category.errors > 0 && (
                    <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                      <XCircle className="h-4 w-4" />
                      <span className="font-medium">{category.errors}</span>
                    </div>
                  )}
                  {category.warnings > 0 && (
                    <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-medium">{category.warnings}</span>
                    </div>
                  )}
                  {category.infos > 0 && (
                    <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                      <Info className="h-4 w-4" />
                      <span className="font-medium">{category.infos}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Issues List */}
      {issues.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            Detailed Issue Report
          </h4>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {issues.map((issue, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border",
                  issue.type === 'error' && 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
                  issue.type === 'warning' && 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
                  issue.type === 'info' && 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                )}
              >
                {issue.type === 'error' && (
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                )}
                {issue.type === 'warning' && (
                  <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                )}
                {issue.type === 'info' && (
                  <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      {issue.questionNumber && (
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                          Question {issue.questionNumber}
                          {issue.partLabel && ` - ${issue.partLabel}`}
                        </span>
                      )}
                      <p className={cn(
                        "text-sm font-medium mt-1",
                        issue.type === 'error' && 'text-red-700 dark:text-red-300',
                        issue.type === 'warning' && 'text-yellow-700 dark:text-yellow-300',
                        issue.type === 'info' && 'text-blue-700 dark:text-blue-300'
                      )}>
                        {issue.message}
                      </p>
                      {issue.category && (
                        <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-white/50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400">
                          {issue.category}
                        </span>
                      )}
                    </div>

                    {onScrollToQuestion && issue.questionNumber && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onScrollToQuestion(issue.questionNumber!)}
                        className="flex-shrink-0"
                      >
                        View
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Success State */}
      {issues.length === 0 && questions.length > 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            <div>
              <h4 className="text-lg font-semibold text-green-900 dark:text-green-100">
                All Questions Valid!
              </h4>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                Your {questions.length} imported question{questions.length !== 1 ? 's' : ''} passed all validation checks.
                You can proceed with confidence to the test and preview stage.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
