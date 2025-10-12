import React from 'react';
import { Button } from '../../../../../../../components/shared/Button';
import { AlertCircle } from 'lucide-react';

interface QuestionsReviewSectionProps {
  questions: any[];
  mappings: any;
  dataStructureInfo: any;
  units: any[];
  topics: any[];
  subtopics: any[];
  attachments: any;
  validationErrors: any;
  existingQuestionNumbers: Set<number>;
  isImporting: boolean;
  importProgress: any;
  paperMetadata: any;
  editingMetadata: any;
  pdfDataUrl: string | null;
  hasIncompleteQuestions: boolean;
  existingPaperId: string | null;
  expandedQuestions: Set<string>;
  editingQuestion: any;
  onQuestionEdit: (question: any) => void;
  onQuestionSave: () => void;
  onQuestionCancel: () => void;
  onMappingUpdate: (questionId: string, field: string, value: string | string[]) => void;
  onAttachmentUpload: (questionId: string, partPath: string[]) => void;
  onAttachmentDelete: (key: string, attachmentId: string) => void;
  onAutoMap: () => void;
  onImportConfirm: () => void;
  onPrevious: () => void;
  onToggleExpanded: (questionId: string) => void;
  onToggleFigureRequired?: (questionId: string, required: boolean) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

export const QuestionsReviewSection: React.FC<QuestionsReviewSectionProps> = ({
  questions,
  onExpandAll,
  onCollapseAll,
}) => {
  if (!questions || questions.length === 0) {
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

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{questions.length}</p>
            <p className="text-sm text-blue-700 dark:text-blue-300">Total Questions</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onExpandAll}>Expand All</Button>
            <Button variant="outline" size="sm" onClick={onCollapseAll}>Collapse All</Button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {questions.map((question, index) => (
          <div
            key={question.id}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800"
          >
            <h4 className="font-semibold text-gray-900 dark:text-white">
              Question {question.question_number}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {question.marks} mark{question.marks !== 1 ? 's' : ''} • {question.question_type}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
