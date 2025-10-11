import React from 'react';
import { Button } from '../../../../../../../components/shared/Button';
import { ChevronLeft, Upload, AlertCircle } from 'lucide-react';

interface QuestionsReviewSectionProps {
  questions: any[];
  mappings: Record<string, any>;
  dataStructureInfo: any;
  units: any[];
  topics: any[];
  subtopics: any[];
  attachments: Record<string, any[]>;
  validationErrors: Record<string, string[]>;
  existingQuestionNumbers: Set<number>;
  isImporting: boolean;
  importProgress: any;
  paperMetadata: any;
  editingMetadata: boolean;
  pdfDataUrl: string | null;
  hasIncompleteQuestions: boolean;
  existingPaperId: string | null;
  expandedQuestions: Set<string>;
  editingQuestion: string | null;
  onQuestionEdit: (questionId: string) => void;
  onQuestionSave: (questionId: string, updates: any) => void;
  onQuestionCancel: () => void;
  onMappingUpdate: (questionId: string, field: string, value: any) => void;
  onAttachmentUpload: (questionId: string, partIndex?: number, subpartIndex?: number) => void;
  onAttachmentDelete: (key: string, attachmentId: string) => void;
  onAutoMap: () => void;
  onImportConfirm: () => void;
  onPrevious: () => void;
  onToggleExpanded: (questionId: string) => void;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
  onPdfUpload?: (file: File) => void;
  onRemovePdf?: () => void;
  onEditMetadata?: () => void;
  onSaveMetadata?: () => void;
  onUpdateMetadata?: (field: string, value: any) => void;
  onFixIncomplete?: () => void;
  [key: string]: any;
}

export const QuestionsReviewSection: React.FC<QuestionsReviewSectionProps> = ({
  questions,
  validationErrors,
  isImporting,
  onImportConfirm,
  onPrevious,
}) => {
  const validationErrorCount = Object.keys(validationErrors || {}).length;
  const canImport = questions && questions.length > 0 && validationErrorCount === 0 && !isImporting;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Review & Confirm Questions
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {questions?.length || 0} question{questions?.length !== 1 ? 's' : ''} extracted
            {validationErrorCount > 0 && (
              <span className="text-red-600 dark:text-red-400 ml-2">
                • {validationErrorCount} validation error{validationErrorCount !== 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={onPrevious}
            leftIcon={<ChevronLeft className="h-4 w-4" />}
            disabled={isImporting}
          >
            Previous
          </Button>

          <Button
            variant="primary"
            onClick={onImportConfirm}
            disabled={!canImport}
            leftIcon={<Upload className="h-4 w-4" />}
          >
            {isImporting ? 'Importing...' : 'Import Questions'}
          </Button>
        </div>
      </div>

      {/* Validation Summary */}
      {validationErrorCount > 0 && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-red-900 dark:text-red-100">
                Please resolve validation errors before importing
              </h4>
              <p className="text-sm text-red-800 dark:text-red-200 mt-1">
                {validationErrorCount} question{validationErrorCount !== 1 ? 's have' : ' has'} validation errors
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Questions List Placeholder */}
      <div className="space-y-4">
        {!questions || questions.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-gray-600 dark:text-gray-400">
              No questions to display
            </p>
          </div>
        ) : (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Questions review interface will be displayed here.
            {/* The full QuestionCard rendering logic should be implemented here */}
          </div>
        )}
      </div>
    </div>
  );
};
