import React from 'react';
import { AlertCircle } from 'lucide-react';

interface QuestionsReviewSectionProps {
  questions: any[];
  mappings?: any;
  dataStructureInfo?: any;
  units?: any[];
  topics?: any[];
  subtopics?: any[];
  attachments?: any;
  validationErrors?: any;
  existingQuestionNumbers?: Set<number>;
  isImporting?: boolean;
  importProgress?: any;
  paperMetadata?: any;
  editingMetadata?: any;
  pdfDataUrl?: string | null;
  hasIncompleteQuestions?: boolean;
  existingPaperId?: string | null;
  expandedQuestions?: Set<string>;
  editingQuestion?: any;
  onQuestionEdit?: (question: any) => void;
  onQuestionSave?: () => void;
  onQuestionCancel?: () => void;
  onMappingUpdate?: (questionId: string, field: string, value: string | string[]) => void;
  onAttachmentUpload?: (questionId: string, partPath: string[]) => void;
  onAttachmentDelete?: (key: string, attachmentId: string) => void;
  onAutoMap?: () => void;
  onImportConfirm?: () => void;
  onPrevious?: () => void;
  onToggleExpanded?: (questionId: string) => void;
  onToggleFigureRequired?: (questionId: string, required: boolean) => void;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
  onPdfUpload?: (file: File) => void;
  onRemovePdf?: () => void;
  onEditMetadata?: () => void;
  onSaveMetadata?: () => void;
  onUpdateMetadata?: (field: string, value: any) => void;
  onFixIncomplete?: () => void;
  confirmationStatus?: string;
  onSnippingComplete?: (dataUrl: string, fileName: string, questionId: string, partPath: string[]) => void;
  onUpdateAttachments?: (newAttachments: any) => void;
  reviewStatuses?: Record<string, any>;
  onToggleReview?: (questionId: string) => void;
  reviewDisabled?: boolean;
  reviewLoading?: boolean;
}

export const QuestionsReviewSection: React.FC<QuestionsReviewSectionProps> = ({
  questions
}) => {
  // Comprehensive safety checks with detailed error messages
  if (!questions) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
        <AlertCircle className="h-12 w-12 text-red-600 dark:text-red-400 mx-auto mb-3" />
        <p className="text-lg font-medium text-red-900 dark:text-red-100 mb-2">
          Critical Error: Questions data is missing
        </p>
        <p className="text-sm text-red-800 dark:text-red-200">
          The questions array was not provided. Please contact support if this persists.
        </p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 text-center">
        <AlertCircle className="h-12 w-12 text-yellow-600 dark:text-yellow-400 mx-auto mb-3" />
        <p className="text-lg font-medium text-yellow-900 dark:text-yellow-100 mb-2">
          No Questions Found
        </p>
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          Please go back and ensure questions are properly extracted from the uploaded file.
        </p>
      </div>
    );
  }

  // Simple display of questions list
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
          {questions.length} Questions Ready for Review
        </div>
        <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
          Questions review interface is loading...
        </p>
      </div>

      <div className="space-y-3">
        {questions.map((question, index) => (
          <div
            key={question.id || `q-${index}`}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  Question {question.question_number || index + 1}
                </span>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {question.question_text?.substring(0, 100)}
                  {question.question_text?.length > 100 ? '...' : ''}
                </p>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {question.marks || 0} marks
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
