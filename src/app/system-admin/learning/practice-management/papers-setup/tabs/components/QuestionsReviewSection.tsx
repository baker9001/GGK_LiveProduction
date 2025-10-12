import React, { useMemo } from 'react';
import { Button } from '../../../../../../../components/shared/Button';
import { AlertCircle, CheckCircle, ChevronUp } from 'lucide-react';
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
  importProgress: any;
  paperMetadata: any;
  editingMetadata: any;
  pdfDataUrl: string | null;
  hasIncompleteQuestions: boolean;
  existingPaperId: string | null;
  expandedQuestions: Set<string>;
  editingQuestion: string | null;
  onQuestionEdit: (questionId: string) => void;
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
  onUpdateQuestionField?: (questionId: string, field: string, value: any) => void;
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
  isImporting,
  importProgress,
  paperMetadata,
  editingMetadata,
  pdfDataUrl,
  hasIncompleteQuestions,
  existingPaperId,
  expandedQuestions,
  editingQuestion,
  onQuestionEdit,
  onQuestionSave,
  onQuestionCancel,
  onMappingUpdate,
  onAttachmentUpload,
  onAttachmentDelete,
  onAutoMap,
  onImportConfirm,
  onPrevious,
  onToggleExpanded,
  onToggleFigureRequired,
  onExpandAll,
  onCollapseAll,
  onUpdateQuestionField
}) => {
  // Calculate statistics
  const stats = useMemo(() => {
    const totalQuestions = questions.length;
    const mappedQuestions = questions.filter(q => {
      const mapping = mappings[q.id];
      return mapping?.chapter_id && mapping?.topic_ids?.length > 0;
    }).length;

    const questionsWithErrors = Object.keys(validationErrors).length;

    return {
      totalQuestions,
      mappedQuestions,
      questionsWithErrors,
      mappingProgress: totalQuestions > 0 ? (mappedQuestions / totalQuestions) * 100 : 0
    };
  }, [questions, mappings, validationErrors]);

  // Helper function to generate attachment key
  const generateAttachmentKey = (questionId: string, partPath: string[]): string => {
    if (partPath.length === 0) {
      return questionId;
    } else if (partPath.length === 1) {
      const partIndex = questions.find(q => q.id === questionId)?.parts?.findIndex((p: any) => p.id === partPath[0]);
      return partIndex !== undefined ? `${questionId}_p${partIndex}` : questionId;
    } else if (partPath.length === 2) {
      const question = questions.find(q => q.id === questionId);
      const partIndex = question?.parts?.findIndex((p: any) => p.id === partPath[0]);
      const part = partIndex !== undefined ? question?.parts[partIndex] : null;
      const subpartIndex = part?.subparts?.findIndex((sp: any) => sp.id === partPath[1]);
      return (partIndex !== undefined && subpartIndex !== undefined)
        ? `${questionId}_p${partIndex}_s${subpartIndex}`
        : questionId;
    }
    return questionId;
  };

  // Get attachments for a specific question/part/subpart
  const getAttachmentsForQuestion = (questionId: string, partPath: string[] = []) => {
    const key = generateAttachmentKey(questionId, partPath);
    return attachments[key] || [];
  };

  // Get validation for a specific question
  const getQuestionValidation = (question: any) => {
    const errors = validationErrors[question.id] || [];
    const warnings: string[] = [];

    // Check for warnings
    if (question.figure && getAttachmentsForQuestion(question.id).length === 0) {
      warnings.push('Question mentions a figure but no attachment is added');
    }

    if (!question.hint) {
      warnings.push('Hint is missing (recommended for student learning)');
    }

    if (!question.explanation) {
      warnings.push('Explanation is missing (recommended for student learning)');
    }

    return { errors, warnings };
  };

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
    <div className="space-y-6">
      {/* Summary Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="grid grid-cols-3 gap-8">
            <div>
              <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                {stats.totalQuestions}
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">Total Questions</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-green-900 dark:text-green-100">
                {stats.mappedQuestions}
              </p>
              <p className="text-sm text-green-700 dark:text-green-300">Mapped</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-red-900 dark:text-red-100">
                {stats.questionsWithErrors}
              </p>
              <p className="text-sm text-red-700 dark:text-red-300">With Errors</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onExpandAll}>
              Expand All
            </Button>
            <Button variant="outline" size="sm" onClick={onCollapseAll}>
              Collapse All
            </Button>
          </div>
        </div>

        {/* Mapping Progress Bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Mapping Progress
            </span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {Math.round(stats.mappingProgress)}%
            </span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
              style={{ width: `${stats.mappingProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {questions.map((question, index) => {
          const isExpanded = expandedQuestions.has(question.id);
          const isEditing = editingQuestion === question.id;
          const mapping = mappings[question.id] || { chapter_id: '', topic_ids: [], subtopic_ids: [] };
          const validation = getQuestionValidation(question);
          const questionAttachments = getAttachmentsForQuestion(question.id);

          return (
            <QuestionCard
              key={question.id}
              question={question}
              questionIndex={index}
              isExpanded={isExpanded}
              isEditing={isEditing}
              mapping={mapping}
              validation={validation}
              attachments={questionAttachments}
              units={units}
              topics={topics}
              subtopics={subtopics}
              pdfDataUrl={pdfDataUrl}
              existingQuestionNumbers={existingQuestionNumbers}
              onToggleExpanded={() => onToggleExpanded(question.id)}
              onEdit={() => onQuestionEdit(question.id)}
              onSave={onQuestionSave}
              onCancel={onQuestionCancel}
              onUpdateField={(field, value) => {
                if (onUpdateQuestionField) {
                  onUpdateQuestionField(question.id, field, value);
                }
              }}
              onMappingUpdate={(field, value) => onMappingUpdate(question.id, field, value)}
              onAttachmentUpload={(partPath) => onAttachmentUpload(question.id, partPath)}
              onAttachmentDelete={(attachmentId) => {
                const key = generateAttachmentKey(question.id, []);
                onAttachmentDelete(key, attachmentId);
              }}
            />
          );
        })}
      </div>

      {/* Summary Footer */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {stats.mappedQuestions === stats.totalQuestions ? (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">All questions are mapped and ready for import!</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">
                  {stats.totalQuestions - stats.mappedQuestions} question{stats.totalQuestions - stats.mappedQuestions !== 1 ? 's' : ''} still need{stats.totalQuestions - stats.mappedQuestions === 1 ? 's' : ''} mapping
                </span>
              </div>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            leftIcon={<ChevronUp className="h-4 w-4" />}
          >
            Scroll to Top
          </Button>
        </div>
      </div>
    </div>
  );
};
