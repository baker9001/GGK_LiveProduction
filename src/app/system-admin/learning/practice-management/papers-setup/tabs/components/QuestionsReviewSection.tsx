import React from 'react';
import { ChevronUp, ChevronDown, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '../../../../../../../components/shared/Button';
import { QuestionCard } from './QuestionCard';

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
  importProgress: { current: number; total: number } | null;
  pdfDataUrl: string | null;
  hasIncompleteQuestions: boolean;
  existingPaperId: string | null;
  expandedQuestions: Set<string>;
  editingQuestion: string | null;
  onQuestionEdit: (questionId: string) => void;
  onQuestionSave: (questionId: string) => void;
  onQuestionCancel: () => void;
  onMappingUpdate: (questionId: string, field: string, value: string | string[]) => void;
  onAttachmentUpload: (
    questionId: string,
    partIndex: number | undefined,
    subpartIndex: number | undefined,
    dataUrl: string,
    filename: string
  ) => void;
  onAttachmentDelete: (key: string, attachmentId: string) => void;
  onToggleExpanded: (questionId: string) => void;
  onToggleFigureRequired: (
    questionId: string,
    partIndex?: number,
    subpartIndex?: number
  ) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onPdfUpload: (file: File) => void;
  onRemovePdf: () => void;
  paperMetadata: any;
  editingMetadata: boolean;
}

export function QuestionsReviewSection({
  questions,
  mappings,
  dataStructureInfo,
  units,
  topics,
  subtopics,
  attachments,
  validationErrors,
  existingQuestionNumbers,
  isImporting,
  importProgress,
  pdfDataUrl,
  expandedQuestions,
  editingQuestion,
  onQuestionEdit,
  onQuestionSave,
  onQuestionCancel,
  onMappingUpdate,
  onAttachmentDelete,
  onToggleExpanded,
  onToggleFigureRequired,
  onExpandAll,
  onCollapseAll
}: QuestionsReviewSectionProps) {
  if (!questions || questions.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No Questions Found
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Upload a JSON file or PDF to begin importing questions.
        </p>
      </div>
    );
  }

  const totalQuestions = questions.length;
  const mappedQuestions = Object.keys(mappings).filter(
    (qId) => mappings[qId]?.chapter_id && mappings[qId]?.topic_ids?.length > 0
  ).length;
  const questionsWithErrors = Object.keys(validationErrors).length;
  const mappingProgress = totalQuestions > 0 ? (mappedQuestions / totalQuestions) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-6">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Questions</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {totalQuestions}
              </div>
            </div>
            <div className="h-12 w-px bg-gray-300 dark:bg-gray-600" />
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Mapped</div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {mappedQuestions}
              </div>
            </div>
            {questionsWithErrors > 0 && (
              <>
                <div className="h-12 w-px bg-gray-300 dark:bg-gray-600" />
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Errors</div>
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {questionsWithErrors}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onExpandAll}>
              <ChevronDown className="h-4 w-4 mr-1" />
              Expand All
            </Button>
            <Button variant="outline" size="sm" onClick={onCollapseAll}>
              <ChevronUp className="h-4 w-4 mr-1" />
              Collapse All
            </Button>
          </div>
        </div>

        {totalQuestions > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
              <span>Mapping Progress</span>
              <span>
                {mappedQuestions} / {totalQuestions} ({Math.round(mappingProgress)}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <div
                className="bg-green-500 h-full transition-all duration-300"
                style={{ width: `${mappingProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {isImporting && importProgress && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin" />
            <div className="flex-1">
              <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Importing Questions...
              </div>
              <div className="text-xs text-blue-700 dark:text-blue-300">
                {importProgress.current} of {importProgress.total}
              </div>
            </div>
          </div>
          <div className="mt-2 w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-600 dark:bg-blue-400 h-full transition-all duration-300"
              style={{
                width: `${(importProgress.current / importProgress.total) * 100}%`
              }}
            />
          </div>
        </div>
      )}

      <div className="space-y-3">
        {questions.map((question) => {
          const isAlreadyImported = existingQuestionNumbers.has(question.question_number);
          const isExpanded = expandedQuestions.has(question.id);
          const isEditing = editingQuestion === question.id;
          const mapping = mappings[question.id] || {
            chapter_id: '',
            topic_ids: [],
            subtopic_ids: []
          };
          const errors = validationErrors[question.id] || [];

          return (
            <QuestionCard
              key={question.id}
              question={question}
              isExpanded={isExpanded}
              isEditing={isEditing}
              mapping={mapping}
              attachments={attachments}
              validationErrors={errors}
              existingQuestionNumbers={existingQuestionNumbers}
              dataStructureInfo={dataStructureInfo}
              units={units}
              topics={topics}
              subtopics={subtopics}
              pdfDataUrl={pdfDataUrl}
              isAlreadyImported={isAlreadyImported}
              onToggleExpanded={() => onToggleExpanded(question.id)}
              onEdit={() => onQuestionEdit(question.id)}
              onSave={() => onQuestionSave(question.id)}
              onCancel={onQuestionCancel}
              onQuestionChange={(field, value) => {
                const updatedQuestion = { ...question, [field]: value };
                console.log('Question changed:', field, value);
              }}
              onMappingUpdate={(field, value) => onMappingUpdate(question.id, field, value)}
              onAddAttachment={(partIndex, subpartIndex) => {
                console.log('Add attachment clicked for question:', question.id);
              }}
              onDeleteAttachment={onAttachmentDelete}
              onToggleFigureRequired={(partIndex, subpartIndex) =>
                onToggleFigureRequired(question.id, partIndex, subpartIndex)
              }
            />
          );
        })}
      </div>

      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center">
        <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          <span>
            Showing all {totalQuestions} questions from this paper
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="mt-3"
        >
          <ChevronUp className="h-4 w-4 mr-1" />
          Scroll to Top
        </Button>
      </div>
    </div>
  );
}
