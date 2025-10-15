// src/app/system-admin/learning/practice-management/papers-setup/tabs/components/QuestionsReviewSection.tsx

import React, { useMemo } from 'react';
import {
  AlertCircle, CheckCircle, XCircle, AlertTriangle, Edit2, Save, X,
  ChevronDown, ChevronRight, FileText, Image, Upload, Scissors,
  Trash2, Eye, Link, BarChart3, Paperclip, Clock, Hash, Database,
  Loader2, Info, RefreshCw, ImageOff, Plus, Copy, FlaskConical,
  Calculator, PenTool, Table, Code, Mic, LineChart, FileUp,
  HelpCircle, BookOpen, Lightbulb, Target, Award, PlayCircle,
  Flag, CheckSquare, FileCheck, ShieldCheck, Maximize2, Minimize2
} from 'lucide-react';
import { Button } from '../../../../../../../components/shared/Button';
import { Select } from '../../../../../../../components/shared/Select';
import { SearchableMultiSelect } from '../../../../../../../components/shared/SearchableMultiSelect';
import { StatusBadge } from '../../../../../../../components/shared/StatusBadge';
import { cn } from '../../../../../../../lib/utils';
import { FixIncompleteQuestionsButton } from './FixIncompleteQuestionsButton';

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
  questions,
  mappings = {},
  dataStructureInfo,
  units = [],
  topics = [],
  subtopics = [],
  attachments = {},
  validationErrors = {},
  existingQuestionNumbers = new Set(),
  isImporting = false,
  importProgress,
  paperMetadata,
  editingMetadata,
  pdfDataUrl,
  hasIncompleteQuestions = false,
  existingPaperId,
  expandedQuestions = new Set(),
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
  onPdfUpload,
  onRemovePdf,
  onEditMetadata,
  onSaveMetadata,
  onUpdateMetadata,
  onFixIncomplete,
  confirmationStatus,
  onSnippingComplete,
  onUpdateAttachments,
  reviewStatuses = {},
  onToggleReview,
  reviewDisabled = false,
  reviewLoading = false
}) => {
  // Comprehensive safety checks
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

  // Calculate statistics
  const stats = useMemo(() => {
    const totalQuestions = questions.length;
    const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 0), 0);
    const questionsWithMappings = questions.filter(q => {
      const mapping = mappings[q.id];
      return mapping && (mapping.chapter_id || (mapping.topic_ids && mapping.topic_ids.length > 0));
    }).length;
    const questionsWithAttachments = questions.filter(q => {
      const key = q.id;
      return attachments[key] && attachments[key].length > 0;
    }).length;
    const questionsWithErrors = questions.filter(q => {
      const errors = validationErrors[q.id];
      return errors && errors.length > 0;
    }).length;
    const reviewedQuestions = questions.filter(q => reviewStatuses[q.id]?.isReviewed).length;

    return {
      totalQuestions,
      totalMarks,
      questionsWithMappings,
      questionsWithAttachments,
      questionsWithErrors,
      reviewedQuestions,
      mappingProgress: totalQuestions > 0 ? Math.round((questionsWithMappings / totalQuestions) * 100) : 0,
      reviewProgress: totalQuestions > 0 ? Math.round((reviewedQuestions / totalQuestions) * 100) : 0
    };
  }, [questions, mappings, attachments, validationErrors, reviewStatuses]);

  // Filter topics and subtopics based on selected chapter
  const getFilteredTopicsForQuestion = (questionId: string) => {
    const mapping = mappings[questionId];
    if (!mapping?.chapter_id) return topics;
    return topics.filter(t => t.unit_id === mapping.chapter_id || t.edu_unit_id === mapping.chapter_id);
  };

  const getFilteredSubtopicsForQuestion = (questionId: string) => {
    const mapping = mappings[questionId];
    if (!mapping?.topic_ids || mapping.topic_ids.length === 0) return [];
    return subtopics.filter(s =>
      mapping.topic_ids.includes(s.topic_id) || mapping.topic_ids.includes(s.edu_topic_id)
    );
  };

  const renderQuestionItem = (question: any, index: number) => {
    const isExpanded = expandedQuestions.has(question.id);
    const isEditing = editingQuestion?.id === question.id;
    const mapping = mappings[question.id] || { chapter_id: '', topic_ids: [], subtopic_ids: [] };
    const errors = validationErrors[question.id] || [];
    const questionAttachments = attachments[question.id] || [];
    const reviewStatus = reviewStatuses[question.id];
    const isReviewed = reviewStatus?.isReviewed || false;
    const isDuplicate = existingQuestionNumbers.has(parseInt(question.question_number));

    return (
      <div
        key={question.id}
        className={cn(
          "bg-white dark:bg-gray-800 border rounded-lg transition-all",
          isExpanded ? "border-blue-300 dark:border-blue-700 shadow-md" : "border-gray-200 dark:border-gray-700",
          errors.length > 0 && "border-l-4 border-l-red-500",
          isDuplicate && "border-l-4 border-l-yellow-500"
        )}
      >
        {/* Question Header */}
        <div
          className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
          onClick={() => onToggleExpanded?.(question.id)}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {isExpanded ? (
                <ChevronDown className="h-5 w-5 text-gray-500 flex-shrink-0 mt-0.5" />
              ) : (
                <ChevronRight className="h-5 w-5 text-gray-500 flex-shrink-0 mt-0.5" />
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    Question {question.question_number || index + 1}
                  </span>

                  {question.marks > 0 && (
                    <span className="text-xs font-medium px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                      {question.marks} {question.marks === 1 ? 'mark' : 'marks'}
                    </span>
                  )}

                  {question.question_type && (
                    <span className="text-xs font-medium px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded">
                      {question.question_type}
                    </span>
                  )}

                  {question.figure_required && (
                    <span className="text-xs font-medium px-2 py-0.5 bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 rounded flex items-center gap-1">
                      <Image className="h-3 w-3" />
                      Figure Required
                    </span>
                  )}

                  {isReviewed && (
                    <span className="text-xs font-medium px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Reviewed
                    </span>
                  )}

                  {isDuplicate && (
                    <span className="text-xs font-medium px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Duplicate
                    </span>
                  )}
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {question.question_text || 'No question text available'}
                </p>

                {errors.length > 0 && !isExpanded && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
                    <AlertCircle className="h-4 w-4" />
                    <span>{errors.length} validation {errors.length === 1 ? 'issue' : 'issues'}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {mapping.chapter_id && (
                <CheckCircle className="h-4 w-4 text-green-600" title="Mapped" />
              )}
              {questionAttachments.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                  <Paperclip className="h-4 w-4" />
                  <span>{questionAttachments.length}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-4">
            {/* Validation Errors */}
            {errors.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-900 dark:text-red-100 mb-2">
                      Validation Issues
                    </p>
                    <ul className="space-y-1">
                      {errors.map((error: string, idx: number) => (
                        <li key={idx} className="text-sm text-red-800 dark:text-red-200">
                          • {error}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Academic Structure Mapping */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <Database className="h-4 w-4" />
                Academic Structure Mapping
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Unit/Chapter Selection */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Unit/Chapter
                  </label>
                  <Select
                    value={mapping.chapter_id || ''}
                    onChange={(e) => onMappingUpdate?.(question.id, 'chapter_id', e.target.value)}
                    className="w-full"
                  >
                    <option value="">Select unit...</option>
                    {units.map(unit => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name || unit.unit_name}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Topics Selection */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Topics
                  </label>
                  <SearchableMultiSelect
                    options={getFilteredTopicsForQuestion(question.id).map(topic => ({
                      value: topic.id,
                      label: topic.name || topic.topic_name
                    }))}
                    selectedValues={mapping.topic_ids || []}
                    onChange={(values) => onMappingUpdate?.(question.id, 'topic_ids', values)}
                    placeholder="Select topics..."
                    disabled={!mapping.chapter_id}
                  />
                </div>

                {/* Subtopics Selection */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Subtopics
                  </label>
                  <SearchableMultiSelect
                    options={getFilteredSubtopicsForQuestion(question.id).map(subtopic => ({
                      value: subtopic.id,
                      label: subtopic.name || subtopic.subtopic_name
                    }))}
                    selectedValues={mapping.subtopic_ids || []}
                    onChange={(values) => onMappingUpdate?.(question.id, 'subtopic_ids', values)}
                    placeholder="Select subtopics..."
                    disabled={!mapping.topic_ids || mapping.topic_ids.length === 0}
                  />
                </div>
              </div>
            </div>

            {/* Attachments */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <Paperclip className="h-4 w-4" />
                  Attachments ({questionAttachments.length})
                </h4>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAttachmentUpload?.(question.id, []);
                  }}
                >
                  <Upload className="h-3 w-3 mr-1" />
                  Add Attachment
                </Button>
              </div>

              {questionAttachments.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {questionAttachments.map((attachment: any) => (
                    <div
                      key={attachment.id}
                      className="relative group border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                    >
                      <img
                        src={attachment.dataUrl || attachment.file_url}
                        alt={attachment.fileName || attachment.file_name}
                        className="w-full h-24 object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(attachment.dataUrl || attachment.file_url, '_blank');
                          }}
                          className="p-1 bg-white rounded-full hover:bg-gray-100"
                        >
                          <Eye className="h-4 w-4 text-gray-700" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onAttachmentDelete?.(question.id, attachment.id);
                          }}
                          className="p-1 bg-white rounded-full hover:bg-red-100"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Review Toggle */}
            {onToggleReview && (
              <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Mark as reviewed
                </span>
                <Button
                  variant={isReviewed ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => onToggleReview(question.id)}
                  disabled={reviewDisabled || reviewLoading}
                >
                  {isReviewed ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Reviewed
                    </>
                  ) : (
                    <>
                      <Flag className="h-4 w-4 mr-1" />
                      Mark Reviewed
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with Statistics */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-2xl font-bold text-blue-900 dark:text-blue-100">
              Questions Review & Import
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              Review and map {stats.totalQuestions} questions before importing
            </p>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.totalQuestions}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Total Questions</div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.totalMarks}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Total Marks</div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.mappingProgress}%
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Mapped ({stats.questionsWithMappings}/{stats.totalQuestions})
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.reviewProgress}%
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Reviewed ({stats.reviewedQuestions}/{stats.totalQuestions})
            </div>
          </div>
        </div>

        {/* Warnings */}
        {stats.questionsWithErrors > 0 && (
          <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm text-red-800 dark:text-red-200">
              <AlertTriangle className="h-4 w-4" />
              <span>
                {stats.questionsWithErrors} {stats.questionsWithErrors === 1 ? 'question has' : 'questions have'} validation issues
              </span>
            </div>
          </div>
        )}

        {hasIncompleteQuestions && onFixIncomplete && (
          <div className="mt-4">
            <FixIncompleteQuestionsButton onFix={onFixIncomplete} />
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onExpandAll}
          >
            <Maximize2 className="h-4 w-4 mr-1" />
            Expand All
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={onCollapseAll}
          >
            <Minimize2 className="h-4 w-4 mr-1" />
            Collapse All
          </Button>
          {onAutoMap && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onAutoMap}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Auto-Map
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onPrevious && (
            <Button
              variant="secondary"
              onClick={onPrevious}
            >
              Previous Step
            </Button>
          )}
          {onImportConfirm && (
            <Button
              variant="primary"
              onClick={onImportConfirm}
              disabled={isImporting || stats.questionsWithErrors > 0}
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing... ({importProgress?.current || 0}/{importProgress?.total || 0})
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Import Questions
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-3">
        {questions.map((question, index) => renderQuestionItem(question, index))}
      </div>

      {/* Bottom Actions */}
      <div className="flex items-center justify-between gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {stats.reviewedQuestions} of {stats.totalQuestions} questions reviewed
        </div>
        <div className="flex items-center gap-2">
          {onPrevious && (
            <Button
              variant="secondary"
              onClick={onPrevious}
            >
              Previous Step
            </Button>
          )}
          {onImportConfirm && (
            <Button
              variant="primary"
              onClick={onImportConfirm}
              disabled={isImporting || stats.questionsWithErrors > 0}
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Import {stats.totalQuestions} Questions
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
