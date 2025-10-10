// Enhanced Question Review Component with Figure Detection and Validation
import React, { useState, useMemo } from 'react';
import {
  AlertCircle, CheckCircle, XCircle, AlertTriangle, Edit2, Save, X,
  ChevronDown, ChevronRight, Image, Upload, Scissors, Trash2, Eye,
  Paperclip, Clock, Hash, Info, ImageOff, Plus, HelpCircle,
  FileText, Flag, CheckSquare, FileCheck
} from 'lucide-react';
import { Button } from '../../../../../../../components/shared/Button';
import { PDFSnippingTool } from '../../../../../../../components/shared/PDFSnippingTool';
import { StatusBadge } from '../../../../../../../components/shared/StatusBadge';
import { cn } from '../../../../../../../lib/utils';

interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  field?: string;
}

interface QuestionValidation {
  hasErrors: boolean;
  hasWarnings: boolean;
  issues: ValidationIssue[];
  needsFigure: boolean;
  hasFigure: boolean;
  missingFields: string[];
}

interface EnhancedQuestionReviewProps {
  questions: any[];
  mappings: any;
  attachments: any;
  validationErrors: any;
  existingQuestionNumbers: Set<number>;
  expandedQuestions: Set<string>;
  editingQuestion: string | null;
  pdfDataUrl: string | null;
  onQuestionEdit: (questionId: string) => void;
  onQuestionSave: (questionId: string, updates: any) => void;
  onQuestionCancel: () => void;
  onAttachmentUpload: (questionId: string, file: File) => void;
  onAttachmentDelete: (key: string, attachmentId: string) => void;
  onToggleExpanded: (questionId: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

export const EnhancedQuestionReview: React.FC<EnhancedQuestionReviewProps> = ({
  questions,
  mappings,
  attachments,
  validationErrors,
  existingQuestionNumbers,
  expandedQuestions,
  editingQuestion,
  pdfDataUrl,
  onQuestionEdit,
  onQuestionSave,
  onQuestionCancel,
  onAttachmentUpload,
  onAttachmentDelete,
  onToggleExpanded,
  onExpandAll,
  onCollapseAll
}) => {
  const [snipModeQuestionId, setSnipModeQuestionId] = useState<string | null>(null);

  // Detect if question mentions figures or diagrams
  const detectsFigureReference = (question: any): boolean => {
    const text = `${question.question_text || ''} ${question.question_parts?.map((p: any) => p.text).join(' ') || ''}`.toLowerCase();
    const figureKeywords = [
      'figure', 'fig.', 'diagram', 'graph', 'chart', 'image', 'illustration',
      'picture', 'photo', 'drawing', 'sketch', 'table', 'shown', 'above', 'below'
    ];
    return figureKeywords.some(keyword => text.includes(keyword));
  };

  // Validate a single question comprehensively
  const validateQuestion = (question: any, index: number): QuestionValidation => {
    const issues: ValidationIssue[] = [];
    const missingFields: string[] = [];
    const needsFigure = detectsFigureReference(question);
    const attachmentKey = `${question.id || question.question_number}`;
    const hasFigure = attachments[attachmentKey]?.length > 0;

    // Check for required fields
    if (!question.question_text || question.question_text.trim() === '') {
      issues.push({
        type: 'error',
        message: 'Question text is missing',
        field: 'question_text'
      });
      missingFields.push('Question Text');
    }

    if (!question.marks || question.marks <= 0) {
      issues.push({
        type: 'warning',
        message: 'Marks allocation is missing or invalid',
        field: 'marks'
      });
      missingFields.push('Marks');
    }

    // Figure detection warning
    if (needsFigure && !hasFigure) {
      issues.push({
        type: 'warning',
        message: 'This question appears to reference a figure but no attachment is provided',
        field: 'figure'
      });
    }

    // Check for answer
    if (!question.correct_answer || question.correct_answer.length === 0) {
      issues.push({
        type: 'warning',
        message: 'No correct answer provided',
        field: 'correct_answer'
      });
      missingFields.push('Correct Answer');
    }

    // Check for topic mapping
    const mapping = mappings?.[question.id || question.question_number];
    if (!mapping?.topicId) {
      issues.push({
        type: 'warning',
        message: 'Question not mapped to a topic',
        field: 'topic'
      });
    }

    // Check for duplicate question number
    if (existingQuestionNumbers.has(question.question_number)) {
      issues.push({
        type: 'error',
        message: `Duplicate question number ${question.question_number}`,
        field: 'question_number'
      });
    }

    // Check for question parts consistency
    if (question.question_parts && question.question_parts.length > 0) {
      const hasPartAnswers = question.question_parts.some((p: any) => p.answer);
      if (!hasPartAnswers) {
        issues.push({
          type: 'info',
          message: 'Multi-part question detected but part answers may not be specified',
          field: 'question_parts'
        });
      }
    }

    return {
      hasErrors: issues.some(i => i.type === 'error'),
      hasWarnings: issues.some(i => i.type === 'warning'),
      issues,
      needsFigure,
      hasFigure,
      missingFields
    };
  };

  // Calculate overall validation summary
  const validationSummary = useMemo(() => {
    let totalErrors = 0;
    let totalWarnings = 0;
    let needsFigureCount = 0;
    let hasFigureCount = 0;
    let readyForImport = 0;

    questions.forEach((q, idx) => {
      const validation = validateQuestion(q, idx);
      if (validation.hasErrors) totalErrors++;
      if (validation.hasWarnings) totalWarnings++;
      if (validation.needsFigure) needsFigureCount++;
      if (validation.hasFigure) hasFigureCount++;
      if (!validation.hasErrors && validation.missingFields.length === 0) readyForImport++;
    });

    return {
      totalErrors,
      totalWarnings,
      needsFigureCount,
      hasFigureCount,
      readyForImport,
      totalQuestions: questions.length
    };
  }, [questions, attachments, mappings, existingQuestionNumbers]);

  const handleSnipComplete = (questionId: string, imageData: string) => {
    // Convert base64 to blob and create file
    fetch(imageData)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], `question-${questionId}-figure.png`, { type: 'image/png' });
        onAttachmentUpload(questionId, file);
        setSnipModeQuestionId(null);
      });
  };

  return (
    <div className="space-y-6">
      {/* Validation Summary Card */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 border border-blue-200 dark:border-blue-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Validation Summary
          </h3>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={onExpandAll}
              leftIcon={<ChevronDown className="h-4 w-4" />}
            >
              Expand All
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onCollapseAll}
              leftIcon={<ChevronRight className="h-4 w-4" />}
            >
              Collapse All
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{validationSummary.totalQuestions}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Total Questions</div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{validationSummary.readyForImport}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Ready to Import</div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{validationSummary.totalErrors}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Errors</div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{validationSummary.totalWarnings}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Warnings</div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {validationSummary.hasFigureCount}/{validationSummary.needsFigureCount}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Figures Attached</div>
          </div>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {questions.map((question, index) => {
          const questionId = question.id || question.question_number.toString();
          const isExpanded = expandedQuestions.has(questionId);
          const isEditing = editingQuestion === questionId;
          const validation = validateQuestion(question, index);
          const attachmentKey = `${question.id || question.question_number}`;
          const questionAttachments = attachments[attachmentKey] || [];

          return (
            <div
              key={questionId}
              className={cn(
                "bg-white dark:bg-gray-800 border rounded-lg shadow-sm transition-all duration-200",
                validation.hasErrors && "border-red-300 dark:border-red-700 bg-red-50/30 dark:bg-red-900/10",
                validation.hasWarnings && !validation.hasErrors && "border-yellow-300 dark:border-yellow-700 bg-yellow-50/30 dark:bg-yellow-900/10",
                !validation.hasErrors && !validation.hasWarnings && "border-green-300 dark:border-green-700 bg-green-50/20 dark:bg-green-900/10"
              )}
            >
              {/* Question Header */}
              <div
                className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                onClick={() => onToggleExpanded(questionId)}
              >
                <div className="flex items-center gap-3 flex-1">
                  <button
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleExpanded(questionId);
                    }}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-500" />
                    )}
                  </button>

                  <div className="flex items-center gap-2">
                    {/* Status Icon */}
                    {validation.hasErrors ? (
                      <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                    ) : validation.hasWarnings ? (
                      <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0" />
                    ) : (
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    )}

                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          Q{question.question_number}
                        </span>
                        {question.marks && (
                          <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                            {question.marks} marks
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                        {question.question_text?.substring(0, 80) || 'No question text'}
                        {(question.question_text?.length || 0) > 80 && '...'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Figure Warning Indicator */}
                  {validation.needsFigure && !validation.hasFigure && (
                    <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1 rounded">
                      <ImageOff className="h-4 w-4" />
                      <span className="text-xs font-medium">Figure Required</span>
                    </div>
                  )}

                  {/* Attachments Count */}
                  {questionAttachments.length > 0 && (
                    <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                      <Paperclip className="h-4 w-4" />
                      <span className="text-xs">{questionAttachments.length}</span>
                    </div>
                  )}

                  {/* Validation Count */}
                  {validation.issues.length > 0 && (
                    <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                      <Flag className="h-4 w-4" />
                      <span className="text-xs">{validation.issues.length}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-4">
                  {/* Validation Issues */}
                  {validation.issues.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Validation Issues ({validation.issues.length})
                      </h4>
                      <div className="space-y-1">
                        {validation.issues.map((issue, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              "flex items-start gap-2 text-xs p-2 rounded",
                              issue.type === 'error' && "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300",
                              issue.type === 'warning' && "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300",
                              issue.type === 'info' && "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                            )}
                          >
                            {issue.type === 'error' && <XCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />}
                            {issue.type === 'warning' && <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />}
                            {issue.type === 'info' && <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />}
                            <span>{issue.message}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Question Content */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Question Text</h4>
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded p-3 text-sm text-gray-700 dark:text-gray-300">
                      {question.question_text || <span className="text-gray-400 italic">No question text</span>}
                    </div>
                  </div>

                  {/* Figure Attachment Section */}
                  {(validation.needsFigure || questionAttachments.length > 0) && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 flex items-center gap-2">
                          <Image className="h-4 w-4" />
                          Figure Attachments
                          {validation.needsFigure && !validation.hasFigure && (
                            <span className="text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Required
                            </span>
                          )}
                        </h4>

                        <div className="flex gap-2">
                          {pdfDataUrl && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSnipModeQuestionId(questionId)}
                              leftIcon={<Scissors className="h-3 w-3" />}
                            >
                              Snip from PDF
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = 'image/*';
                              input.onchange = (e: any) => {
                                const file = e.target.files?.[0];
                                if (file) onAttachmentUpload(questionId, file);
                              };
                              input.click();
                            }}
                            leftIcon={<Upload className="h-3 w-3" />}
                          >
                            Upload Image
                          </Button>
                        </div>
                      </div>

                      {/* Attachments Display */}
                      {questionAttachments.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {questionAttachments.map((attachment: any, attachIdx: number) => (
                            <div
                              key={attachIdx}
                              className="relative group border border-gray-200 dark:border-gray-700 rounded overflow-hidden"
                            >
                              <img
                                src={attachment.preview || attachment.url}
                                alt={`Attachment ${attachIdx + 1}`}
                                className="w-full h-24 object-cover"
                              />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button
                                  onClick={() => window.open(attachment.preview || attachment.url, '_blank')}
                                  className="p-1 bg-white rounded hover:bg-gray-100 transition-colors"
                                >
                                  <Eye className="h-4 w-4 text-gray-700" />
                                </button>
                                <button
                                  onClick={() => onAttachmentDelete(attachmentKey, attachment.id || attachIdx.toString())}
                                  className="p-1 bg-white rounded hover:bg-red-100 transition-colors"
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                          <ImageOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No attachments</p>
                          {validation.needsFigure && (
                            <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                              This question appears to reference a figure
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Correct Answer */}
                  {question.correct_answer && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Correct Answer</h4>
                      <div className="bg-green-50 dark:bg-green-900/20 rounded p-3 text-sm text-green-900 dark:text-green-100">
                        {Array.isArray(question.correct_answer)
                          ? question.correct_answer.join(', ')
                          : question.correct_answer}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* PDF Snipping Tool Modal */}
      {snipModeQuestionId && pdfDataUrl && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-auto">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Snip Figure for Question {questions.find(q => (q.id || q.question_number.toString()) === snipModeQuestionId)?.question_number}
              </h3>
              <button
                onClick={() => setSnipModeQuestionId(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4">
              <PDFSnippingTool
                pdfDataUrl={pdfDataUrl}
                onSnipComplete={(imageData) => handleSnipComplete(snipModeQuestionId, imageData)}
                onCancel={() => setSnipModeQuestionId(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
