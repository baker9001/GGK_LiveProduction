import React from 'react';
import { ChevronRight, Maximize2, Minimize2, AlertCircle } from 'lucide-react';
import { Button } from '../../../../../../../components/shared/Button';
import { QuestionCard } from './QuestionCard';

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
  onPdfUpload: (file: File) => void;
  onRemovePdf?: () => void;
  onEditMetadata?: () => void;
  onSaveMetadata?: () => void;
  onUpdateMetadata?: (field: string, value: any) => void;
  onFixIncomplete?: () => void;
  confirmationStatus?: string;
  onSnippingComplete?: (dataUrl: string, fileName: string, questionId: string, partPath: string[]) => void;
  onUpdateAttachments?: (newAttachments: any) => void;
}

export const QuestionsReviewSection: React.FC<QuestionsReviewSectionProps> = ({
  questions,
  mappings,
  dataStructureInfo,
  units,
  topics,
  subtopics,
  attachments,
  validationErrors,
  existingQuestionNumbers,
  paperMetadata,
  pdfDataUrl,
  expandedQuestions,
  editingQuestion,
  onQuestionEdit,
  onQuestionSave,
  onQuestionCancel,
  onMappingUpdate,
  onAttachmentUpload,
  onAttachmentDelete,
  onToggleExpanded,
  onToggleFigureRequired,
  onExpandAll,
  onCollapseAll,
}) => {
  // Safety checks
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

  // Ensure required data exists
  const safeUnits = units || [];
  const safeTopics = topics || [];
  const safeSubtopics = subtopics || [];
  const safeMappings = mappings || {};
  const safeValidationErrors = validationErrors || {};
  const safeExpandedQuestions = expandedQuestions || new Set();
  const safeAttachments = attachments || {};

  const allExpanded = safeExpandedQuestions.size === questions.length;
  const errorCount = Object.keys(safeValidationErrors).length;
  const mappedCount = Object.values(safeMappings).filter((m: any) =>
    m?.chapter_id && m?.topic_ids && m.topic_ids.length > 0
  ).length;

  return (
    <div className="space-y-4">
      {/* Questions Summary Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {questions.length}
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Total Questions
              </p>
            </div>
            <div className="h-12 w-px bg-blue-200 dark:bg-blue-800" />
            <div>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                {mappedCount}
              </p>
              <p className="text-sm text-green-700 dark:text-green-300">
                Mapped
              </p>
            </div>
            <div className="h-12 w-px bg-blue-200 dark:bg-blue-800" />
            <div>
              <p className={`text-2xl font-bold ${errorCount > 0 ? 'text-red-900 dark:text-red-100' : 'text-green-900 dark:text-green-100'}`}>
                {errorCount}
              </p>
              <p className={`text-sm ${errorCount > 0 ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'}`}>
                Errors
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={allExpanded ? onCollapseAll : onExpandAll}
            >
              {allExpanded ? (
                <>
                  <Minimize2 className="h-4 w-4 mr-1" />
                  Collapse All
                </>
              ) : (
                <>
                  <Maximize2 className="h-4 w-4 mr-1" />
                  Expand All
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-blue-700 dark:text-blue-300 mb-1">
            <span>Mapping Progress</span>
            <span>{mappedCount} / {questions.length}</span>
          </div>
          <div className="w-full bg-blue-200 dark:bg-blue-900 rounded-full h-2">
            <div
              className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all"
              style={{ width: `${(mappedCount / questions.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {questions.map((question, index) => {
          const isExpanded = safeExpandedQuestions.has(question.id);
          const isEditing = editingQuestion?.id === question.id;
          const mapping = safeMappings[question.id] || { chapter_id: '', topic_ids: [], subtopic_ids: [] };
          const questionAttachments = safeAttachments[question.id] || [];
          const questionValidationErrors = safeValidationErrors[question.id] || [];

          const handleAddAttachment = (partIndex?: number, subpartIndex?: number) => {
            const partPath = [];
            if (partIndex !== undefined) {
              const part = question.parts?.[partIndex];
              if (part) {
                partPath.push(part.id || `p${partIndex}`);
                if (subpartIndex !== undefined && part.subparts?.[subpartIndex]) {
                  const subpart = part.subparts[subpartIndex];
                  partPath.push(subpart.id || `s${subpartIndex}`);
                }
              }
            }
            onAttachmentUpload(question.id, partPath);
          };

          const handleUpdateQuestion = (updates: any) => {
            if (editingQuestion && isEditing) {
              const updated = { ...editingQuestion, ...updates };
              onQuestionEdit(updated);
            }
          };

          return (
            <QuestionCard
              key={question.id}
              question={isEditing ? editingQuestion : question}
              index={index}
              isExpanded={isExpanded}
              isEditing={isEditing}
              mapping={mapping}
              attachments={questionAttachments}
              validationErrors={questionValidationErrors}
              existingQuestionNumbers={existingQuestionNumbers}
              dataStructureInfo={dataStructureInfo}
              units={safeUnits}
              topics={safeTopics}
              subtopics={safeSubtopics}
              paperMetadata={paperMetadata}
              pdfDataUrl={pdfDataUrl}
              onToggleExpand={() => onToggleExpanded(question.id)}
              onEdit={() => onQuestionEdit(question)}
              onSave={onQuestionSave}
              onCancel={onQuestionCancel}
              onMappingUpdate={(field, value) => onMappingUpdate(question.id, field, value)}
              onAddAttachment={handleAddAttachment}
              onDeleteAttachment={(attachmentKey, attachmentId) => {
                console.log('🎯 QuestionsReviewSection onDeleteAttachment wrapper called:', { attachmentKey, attachmentId });
                onAttachmentDelete(attachmentKey, attachmentId);
              }}
              onUpdateQuestion={handleUpdateQuestion}
              onToggleFigureRequired={onToggleFigureRequired ? (required) => onToggleFigureRequired(question.id, required) : undefined}
            />
          );
        })}
      </div>

      {/* Summary Footer */}
      {questions.length > 5 && (
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing all {questions.length} questions
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              Back to top
              <ChevronRight className="h-4 w-4 ml-1 transform -rotate-90" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
