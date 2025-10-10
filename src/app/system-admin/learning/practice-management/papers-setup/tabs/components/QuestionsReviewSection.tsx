import React from 'react';
import { ChevronDown, ChevronRight, AlertCircle } from 'lucide-react';
import { Button } from '../../../../../../../components/shared/Button';
import { Select } from '../../../../../../../components/shared/Select';
import { SearchableMultiSelect } from '../../../../../../../components/shared/SearchableMultiSelect';

interface QuestionsReviewSectionProps {
  questions: any[];
  mappings: any;
  dataStructureInfo: any;
  units: any[];
  topics: any[];
  subtopics: any[];
  attachments: any;
  validationErrors: any;
  existingQuestionNumbers: any[];
  isImporting: boolean;
  importProgress: number;
  paperMetadata: any;
  editingMetadata: boolean;
  pdfDataUrl: string | null;
  hasIncompleteQuestions: boolean;
  existingPaperId: string | null;
  expandedQuestions: Set<string>;
  editingQuestion: string | null;
  onQuestionEdit: (id: string) => void;
  onQuestionSave: (id: string) => void;
  onQuestionCancel: () => void;
  onMappingUpdate: (questionId: string, field: string, value: string | string[]) => void;
  onAttachmentUpload: (key: string, file: File) => void;
  onAttachmentDelete: (key: string, attachmentId: string) => void;
  onAutoMap: () => void;
  onImportConfirm: () => void;
  onPrevious: () => void;
  onToggleExpanded: (id: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onPdfUpload: (file: File) => void;
  onRemovePdf: () => void;
  onEditMetadata: () => void;
  onSaveMetadata: () => void;
  onUpdateMetadata: (field: string, value: any) => void;
  onFixIncomplete: () => void;
  confirmationStatus: 'idle' | 'confirming' | 'confirmed';
  onSnippingComplete: (dataUrl: string, fileName: string, questionId: string, partPath: string[]) => void;
  [key: string]: any;
}

/**
 * QuestionsReviewSection Component
 * Displays all questions with mapping controls and attachments
 */
export const QuestionsReviewSection: React.FC<QuestionsReviewSectionProps> = ({
  questions,
  mappings,
  dataStructureInfo,
  units,
  topics,
  subtopics,
  attachments,
  validationErrors,
  expandedQuestions,
  editingQuestion,
  onMappingUpdate,
  onAttachmentDelete,
  onToggleExpanded,
  onExpandAll,
  onCollapseAll,
  onPrevious,
  onImportConfirm,
  pdfDataUrl,
  ...rest
}) => {
  if (!questions || questions.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">No questions to display</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Expand/Collapse Controls */}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onExpandAll}>
          Expand All
        </Button>
        <Button variant="ghost" size="sm" onClick={onCollapseAll}>
          Collapse All
        </Button>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {questions.map((question: any) => {
          const isExpanded = expandedQuestions.has(question.id);
          const isEditing = editingQuestion === question.id;
          const mapping = mappings[question.id] || { chapter_id: '', topic_ids: [], subtopic_ids: [] };
          const errors = validationErrors[question.id] || [];
          const questionAttachments = attachments[question.id] || [];

          // Filter topics and subtopics based on selections
          const availableTopics = mapping.chapter_id
            ? topics?.filter((t: any) =>
                t.unit_id === mapping.chapter_id ||
                t.edu_unit_id === mapping.chapter_id ||
                t.chapter_id === mapping.chapter_id
              ) || []
            : topics || [];

          const availableSubtopics = mapping.topic_ids && mapping.topic_ids.length > 0
            ? subtopics?.filter((s: any) =>
                mapping.topic_ids.some((tid: string) => tid === s.topic_id || tid === s.edu_topic_id)
              ) || []
            : subtopics || [];

          return (
            <div
              key={question.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4"
            >
              {/* Question Header */}
              <div className="flex items-start gap-3">
                <button
                  onClick={() => onToggleExpanded(question.id)}
                  className="mt-1 flex-shrink-0 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      Question {question.question_number}
                    </h3>
                    <div className="flex items-center gap-2">
                      {errors.length > 0 && (
                        <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                          <AlertCircle className="h-3 w-3" />
                          {errors.length} error{errors.length !== 1 ? 's' : ''}
                        </div>
                      )}
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {question.marks} mark{question.marks !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  <div className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                    {question.question_text ? (
                      <div dangerouslySetInnerHTML={{ __html: question.question_text.substring(0, 200) + (question.question_text.length > 200 ? '...' : '') }} />
                    ) : (
                      <span className="text-red-600 dark:text-red-400">No question text</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="mt-4 pl-8 space-y-4 border-l-2 border-gray-200 dark:border-gray-700">
                  {/* Full Question Display */}
                  {question.question_text && (
                    <div className="prose dark:prose-invert max-w-none">
                      <div dangerouslySetInnerHTML={{ __html: question.question_text }} />
                    </div>
                  )}

                  {/* Parts (if any) */}
                  {question.parts && question.parts.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Parts:</h4>
                      {question.parts.map((part: any, idx: number) => (
                        <div key={idx} className="pl-4 border-l-2 border-gray-300 dark:border-gray-600">
                          <div className="font-medium text-sm">({String.fromCharCode(97 + idx)}) {part.marks} mark{part.marks !== 1 ? 's' : ''}</div>
                          {part.question_text && (
                            <div className="text-sm mt-1" dangerouslySetInnerHTML={{ __html: part.question_text }} />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Academic Mapping */}
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">Academic Mapping</h4>

                    {/* Unit/Chapter Selection */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Unit / Chapter *
                      </label>
                      <Select
                        value={mapping.chapter_id || ''}
                        onChange={(e) => onMappingUpdate(question.id, 'chapter_id', e.target.value)}
                        options={[
                          { value: '', label: 'Select an option' },
                          ...(units?.map((u: any) => ({ value: u.id, label: u.name })) || [])
                        ]}
                      />
                    </div>

                    {/* Topics Selection */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Topics *
                      </label>
                      <SearchableMultiSelect
                        label=""
                        options={availableTopics.map((t: any) => ({
                          value: t.id,
                          label: `${t.number ? `${t.number}. ` : ''}${t.name}`
                        }))}
                        selectedValues={mapping.topic_ids || []}
                        onChange={(value) => onMappingUpdate(question.id, 'topic_ids', value)}
                        placeholder="Select topics..."
                        disabled={!mapping.chapter_id}
                        usePortal={false}
                      />
                    </div>

                    {/* Subtopics Selection */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Subtopics (Optional)
                      </label>
                      <SearchableMultiSelect
                        label=""
                        options={availableSubtopics.map((s: any) => ({
                          value: s.id,
                          label: s.name
                        }))}
                        selectedValues={mapping.subtopic_ids || []}
                        onChange={(value) => onMappingUpdate(question.id, 'subtopic_ids', value)}
                        placeholder="Select subtopics..."
                        disabled={!mapping.topic_ids || mapping.topic_ids.length === 0}
                        usePortal={false}
                      />
                    </div>
                  </div>

                  {/* Validation Errors */}
                  {errors.length > 0 && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <h4 className="text-sm font-medium text-red-900 dark:text-red-100 mb-2">Validation Errors:</h4>
                      <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                        {errors.map((error: string, idx: number) => (
                          <li key={idx}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Actions */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button variant="outline" onClick={onPrevious}>
          Previous
        </Button>
        <Button variant="primary" onClick={onImportConfirm} disabled={rest.isImporting}>
          {rest.isImporting ? 'Importing...' : `Import ${questions.length} Questions`}
        </Button>
      </div>
    </div>
  );
};
