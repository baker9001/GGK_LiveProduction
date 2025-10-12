import React, { useState, useMemo } from 'react';
import {
  CheckCircle,
  AlertCircle,
  FileText,
  Database,
  Target,
  Upload,
  Download,
  Eye,
  Settings,
  BarChart3,
  TrendingUp,
  Award,
  Users,
  Calendar,
  BookOpen,
  Shield
} from 'lucide-react';
import { Button } from '../../../../../../../components/shared/Button';
import { cn } from '../../../../../../../lib/utils';

interface ValidationChecklistItem {
  id: string;
  category: string;
  label: string;
  status: 'complete' | 'incomplete' | 'warning';
  description: string;
  count?: number;
  total?: number;
}

interface FinalReviewDashboardProps {
  questions: any[];
  paperMetadata: {
    code?: string;
    subject?: string;
    exam_year?: string;
    exam_session?: string;
    exam_board?: string;
    total_marks?: number;
  };
  importSummary: {
    totalQuestions: number;
    totalParts: number;
    totalSubparts: number;
    totalMarks: number;
    questionsWithAnswers: number;
    questionsWithAttachments: number;
    validationErrors: number;
    validationWarnings: number;
  };
  onImportConfirm: () => void;
  onCancel: () => void;
  onExportReport?: () => void;
  isImporting?: boolean;
}

export function FinalReviewDashboard({
  questions,
  paperMetadata,
  importSummary,
  onImportConfirm,
  onCancel,
  onExportReport,
  isImporting = false
}: FinalReviewDashboardProps) {

  const [showChecklist, setShowChecklist] = useState(true);

  const checklistItems: ValidationChecklistItem[] = useMemo(() => {
    const items: ValidationChecklistItem[] = [];

    items.push({
      id: 'metadata',
      category: 'Paper Information',
      label: 'Paper metadata complete',
      status: (paperMetadata.code && paperMetadata.subject && paperMetadata.exam_year) ? 'complete' : 'incomplete',
      description: 'Paper code, subject, year, and session are required'
    });

    items.push({
      id: 'questions',
      category: 'Questions',
      label: 'All questions imported',
      status: importSummary.totalQuestions > 0 ? 'complete' : 'incomplete',
      description: `${importSummary.totalQuestions} questions ready for import`,
      count: importSummary.totalQuestions,
      total: importSummary.totalQuestions
    });

    items.push({
      id: 'answers',
      category: 'Answers',
      label: 'Correct answers provided',
      status: importSummary.questionsWithAnswers === importSummary.totalQuestions ? 'complete' :
              importSummary.questionsWithAnswers > 0 ? 'warning' : 'incomplete',
      description: 'All questions should have at least one correct answer',
      count: importSummary.questionsWithAnswers,
      total: importSummary.totalQuestions
    });

    items.push({
      id: 'marks',
      category: 'Marks',
      label: 'Mark allocation verified',
      status: importSummary.totalMarks > 0 ? 'complete' : 'incomplete',
      description: `Total ${importSummary.totalMarks} marks across all questions`,
      count: importSummary.totalMarks
    });

    items.push({
      id: 'attachments',
      category: 'Attachments',
      label: 'Attachments uploaded',
      status: importSummary.questionsWithAttachments > 0 ? 'complete' : 'warning',
      description: 'Questions with diagrams, images, or reference materials',
      count: importSummary.questionsWithAttachments,
      total: importSummary.totalQuestions
    });

    items.push({
      id: 'validation',
      category: 'Validation',
      label: 'No critical errors',
      status: importSummary.validationErrors === 0 ? 'complete' : 'incomplete',
      description: importSummary.validationErrors > 0
        ? `${importSummary.validationErrors} errors must be fixed`
        : 'All validation checks passed',
      count: importSummary.validationErrors
    });

    return items;
  }, [paperMetadata, importSummary]);

  const overallStatus = useMemo(() => {
    const incompleteItems = checklistItems.filter(item => item.status === 'incomplete');
    const warningItems = checklistItems.filter(item => item.status === 'warning');

    if (incompleteItems.length > 0) return 'incomplete';
    if (warningItems.length > 0) return 'warning';
    return 'complete';
  }, [checklistItems]);

  const canImport = overallStatus !== 'incomplete';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={cn(
        "p-6 rounded-xl border-2",
        overallStatus === 'complete' && "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700",
        overallStatus === 'warning' && "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700",
        overallStatus === 'incomplete' && "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700"
      )}>
        <div className="flex items-start gap-4">
          <div className={cn(
            "flex h-16 w-16 items-center justify-center rounded-xl",
            overallStatus === 'complete' && "bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400",
            overallStatus === 'warning' && "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-600 dark:text-yellow-400",
            overallStatus === 'incomplete' && "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400"
          )}>
            {overallStatus === 'complete' ? (
              <CheckCircle className="h-8 w-8" />
            ) : (
              <AlertCircle className="h-8 w-8" />
            )}
          </div>

          <div className="flex-1">
            <h2 className={cn(
              "text-2xl font-bold mb-2",
              overallStatus === 'complete' && "text-green-900 dark:text-green-100",
              overallStatus === 'warning' && "text-yellow-900 dark:text-yellow-100",
              overallStatus === 'incomplete' && "text-red-900 dark:text-red-100"
            )}>
              {overallStatus === 'complete' && 'Ready to Import!'}
              {overallStatus === 'warning' && 'Almost Ready - Review Warnings'}
              {overallStatus === 'incomplete' && 'Action Required'}
            </h2>

            <p className={cn(
              "text-sm mb-4",
              overallStatus === 'complete' && "text-green-700 dark:text-green-300",
              overallStatus === 'warning' && "text-yellow-700 dark:text-yellow-300",
              overallStatus === 'incomplete' && "text-red-700 dark:text-red-300"
            )}>
              {overallStatus === 'complete' &&
                'All validation checks passed. Your questions are ready to be imported into the database.'}
              {overallStatus === 'warning' &&
                'Some optional items need attention, but you can proceed with import if desired.'}
              {overallStatus === 'incomplete' &&
                'Please address the required items below before importing.'}
            </p>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <Button
                onClick={onImportConfirm}
                disabled={!canImport || isImporting}
                leftIcon={isImporting ? <Upload className="h-4 w-4 animate-pulse" /> : <Upload className="h-4 w-4" />}
                className={cn(
                  "transition-all",
                  canImport && !isImporting && "bg-green-600 hover:bg-green-700 text-white",
                  (!canImport || isImporting) && "opacity-50 cursor-not-allowed"
                )}
              >
                {isImporting ? 'Importing...' : 'Confirm & Import Questions'}
              </Button>

              {onExportReport && (
                <Button
                  variant="outline"
                  onClick={onExportReport}
                  leftIcon={<Download className="h-4 w-4" />}
                >
                  Export Report
                </Button>
              )}

              <Button
                variant="outline"
                onClick={onCancel}
                disabled={isImporting}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Paper Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          Paper Overview
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Paper Code</div>
            <div className="font-semibold text-gray-900 dark:text-white">
              {paperMetadata.code || 'Not specified'}
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Subject</div>
            <div className="font-semibold text-gray-900 dark:text-white">
              {paperMetadata.subject || 'Not specified'}
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Exam Session</div>
            <div className="font-semibold text-gray-900 dark:text-white">
              {paperMetadata.exam_session || 'Not specified'} {paperMetadata.exam_year || ''}
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Exam Board</div>
            <div className="font-semibold text-gray-900 dark:text-white">
              {paperMetadata.exam_board || 'Not specified'}
            </div>
          </div>
        </div>
      </div>

      {/* Import Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-2">
            <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {importSummary.totalQuestions}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Questions
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-2">
            <Target className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {importSummary.totalParts + importSummary.totalSubparts}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Parts & Subparts
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-2">
            <Award className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {importSummary.totalMarks}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Total Marks
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {Math.round((importSummary.questionsWithAnswers / importSummary.totalQuestions) * 100)}%
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Completion
          </div>
        </div>
      </div>

      {/* Pre-Import Checklist */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setShowChecklist(!showChecklist)}
          className="w-full flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Pre-Import Checklist
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {checklistItems.filter(i => i.status === 'complete').length}/{checklistItems.length} Complete
            </span>
            <Button variant="ghost" size="sm">
              {showChecklist ? 'Hide' : 'Show'}
            </Button>
          </div>
        </button>

        {showChecklist && (
          <div className="px-6 pb-6 space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4">
            {checklistItems.map(item => (
              <div
                key={item.id}
                className={cn(
                  "flex items-start gap-4 p-4 rounded-lg border",
                  item.status === 'complete' && "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
                  item.status === 'warning' && "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800",
                  item.status === 'incomplete' && "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                )}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {item.status === 'complete' ? (
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <AlertCircle className={cn(
                      "h-5 w-5",
                      item.status === 'warning' && "text-yellow-600 dark:text-yellow-400",
                      item.status === 'incomplete' && "text-red-600 dark:text-red-400"
                    )} />
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div>
                      <div className={cn(
                        "font-medium",
                        item.status === 'complete' && "text-green-900 dark:text-green-100",
                        item.status === 'warning' && "text-yellow-900 dark:text-yellow-100",
                        item.status === 'incomplete' && "text-red-900 dark:text-red-100"
                      )}>
                        {item.label}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                        {item.category}
                      </div>
                    </div>

                    {(item.count !== undefined || item.total !== undefined) && (
                      <div className={cn(
                        "px-2 py-1 rounded text-xs font-medium whitespace-nowrap",
                        item.status === 'complete' && "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
                        item.status === 'warning' && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
                        item.status === 'incomplete' && "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                      )}>
                        {item.total !== undefined ? `${item.count}/${item.total}` : item.count}
                      </div>
                    )}
                  </div>

                  <p className={cn(
                    "text-sm",
                    item.status === 'complete' && "text-green-700 dark:text-green-300",
                    item.status === 'warning' && "text-yellow-700 dark:text-yellow-300",
                    item.status === 'incomplete' && "text-red-700 dark:text-red-300"
                  )}>
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Important Notes */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              What happens when you import?
            </h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-blue-800 dark:text-blue-200">
              <li>All questions will be saved to the database with their associated metadata</li>
              <li>Correct answers and marking criteria will be stored securely</li>
              <li>Attachments will be linked to their respective questions</li>
              <li>Questions will be immediately available for use in assessments</li>
              <li>You can edit or update questions after import if needed</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
