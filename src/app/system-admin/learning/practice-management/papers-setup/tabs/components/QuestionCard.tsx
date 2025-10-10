import React from 'react';
import {
  ChevronDown, ChevronRight, Edit2, Save, X, AlertCircle,
  CheckCircle, Flag, Image as ImageIcon, Paperclip, Hash,
  Calculator, BookOpen, FileText, Target, Link, HelpCircle,
  Lightbulb, AlertTriangle
} from 'lucide-react';
import { Button } from '../../../../../../../components/shared/Button';
import { StatusBadge } from '../../../../../../../components/shared/StatusBadge';
import DynamicAnswerField from '../../../../../../../components/shared/DynamicAnswerField';
import { QuestionPartDisplay } from './QuestionPartDisplay';
import { QuestionMappingControls } from './QuestionMappingControls';
import { AttachmentDisplay } from './AttachmentDisplay';
import { cn } from '../../../../../../../lib/utils';

interface QuestionCardProps {
  question: any;
  index: number;
  isExpanded: boolean;
  isEditing: boolean;
  mapping: any;
  attachments: any;
  validationErrors: string[];
  existingQuestionNumbers: Set<number>;
  dataStructureInfo: any;
  units: any[];
  topics: any[];
  subtopics: any[];
  paperMetadata: any;
  pdfDataUrl: string | null;
  onToggleExpand: () => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onMappingUpdate: (field: string, value: any) => void;
  onAddAttachment: (partIndex?: number, subpartIndex?: number) => void;
  onDeleteAttachment: (attachmentId: string) => void;
  onUpdateQuestion: (updates: any) => void;
}

const answerFormatConfig: Record<string, any> = {
  single_word: { icon: Hash, color: 'blue', label: 'Single Word' },
  single_line: { icon: FileText, color: 'blue', label: 'Short Answer' },
  two_items: { icon: Link, color: 'purple', label: 'Two Items' },
  two_items_connected: { icon: Link, color: 'purple', label: 'Connected Items' },
  multi_line: { icon: FileText, color: 'indigo', label: 'Multi-line' },
  multi_line_labeled: { icon: BookOpen, color: 'indigo', label: 'Labeled Parts' },
  calculation: { icon: Calculator, color: 'green', label: 'Calculation' },
  equation: { icon: Calculator, color: 'green', label: 'Equation' },
};

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  index,
  isExpanded,
  isEditing,
  mapping,
  attachments,
  validationErrors,
  existingQuestionNumbers,
  dataStructureInfo,
  units,
  topics,
  subtopics,
  paperMetadata,
  pdfDataUrl,
  onToggleExpand,
  onEdit,
  onSave,
  onCancel,
  onMappingUpdate,
  onAddAttachment,
  onDeleteAttachment,
  onUpdateQuestion,
}) => {
  const isAlreadyImported = existingQuestionNumbers.has(parseInt(question.question_number));
  const hasErrors = validationErrors && validationErrors.length > 0;
  const hasParts = question.parts && question.parts.length > 0;
  const hasAttachments = attachments && attachments.length > 0;
  const hasDynamicAnswer = question.answer_requirement;
  const formatInfo = question.answer_format ? answerFormatConfig[question.answer_format] : null;

  const getValidationStatus = () => {
    if (isAlreadyImported) return 'info';
    if (hasErrors) return 'error';
    if (!mapping?.chapter_id || !mapping?.topic_ids?.length) return 'warning';
    if (question.figure && !hasAttachments) return 'warning';
    return 'success';
  };

  const status = getValidationStatus();

  return (
    <div
      id={`question-${question.id}`}
      data-question-id={question.id}
      className={cn(
        "bg-white dark:bg-gray-800 rounded-lg shadow-sm border-2 transition-all",
        status === 'error' && "border-red-300 dark:border-red-700",
        status === 'warning' && "border-yellow-300 dark:border-yellow-700",
        status === 'success' && "border-green-300 dark:border-green-700",
        status === 'info' && "border-blue-300 dark:border-blue-700",
        isExpanded && "ring-2 ring-blue-500 ring-offset-2"
      )}
    >
      {/* Question Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <button
              onClick={onToggleExpand}
              className="mt-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="h-5 w-5" />
              ) : (
                <ChevronRight className="h-5 w-5" />
              )}
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Question {question.question_number}
                </h3>

                {isAlreadyImported && (
                  <StatusBadge status="info" text="Already Imported" />
                )}

                {question.simulation_flags?.includes('flagged') && (
                  <span className="flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 text-xs rounded-full">
                    <Flag className="h-3 w-3" />
                    Flagged
                  </span>
                )}

                <span className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-full">
                  <Target className="h-3 w-3" />
                  {question.marks} marks
                </span>

                {question.question_type === 'mcq' && (
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                    MCQ
                  </span>
                )}

                {hasParts && (
                  <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-xs rounded-full">
                    {question.parts.length} parts
                  </span>
                )}

                {formatInfo && (
                  <span className={cn(
                    "flex items-center gap-1 px-2 py-1 text-xs rounded-full",
                    `bg-${formatInfo.color}-100 dark:bg-${formatInfo.color}-900/20`,
                    `text-${formatInfo.color}-700 dark:text-${formatInfo.color}-300`
                  )}>
                    <formatInfo.icon className="h-3 w-3" />
                    {formatInfo.label}
                  </span>
                )}

                {hasDynamicAnswer && (
                  <span className="flex items-center gap-1 px-2 py-1 bg-indigo-100 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 text-xs rounded-full">
                    <Link className="h-3 w-3" />
                    Dynamic
                  </span>
                )}
              </div>

              {!isExpanded && (
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {question.question_text || 'No question text'}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {status === 'error' && (
              <AlertCircle className="h-5 w-5 text-red-500" />
            )}
            {status === 'warning' && (
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
            )}
            {status === 'success' && (
              <CheckCircle className="h-5 w-5 text-green-500" />
            )}

            {!isEditing ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={onEdit}
                disabled={isAlreadyImported}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            ) : (
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={onSave}>
                  <Save className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={onCancel}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {hasErrors && (
          <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
              {validationErrors.map((error, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {question.simulation_notes && (
          <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              <Flag className="h-4 w-4 inline mr-1" />
              {question.simulation_notes}
            </p>
          </div>
        )}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 space-y-6">
          {/* Question Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Question Text
            </label>
            {isEditing ? (
              <textarea
                value={question.question_text || ''}
                onChange={(e) => onUpdateQuestion({ question_text: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            ) : (
              <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                {question.question_text || 'No question text provided'}
              </p>
            )}
          </div>

          {/* Attachments */}
          {(question.figure || hasAttachments || pdfDataUrl) && (
            <AttachmentDisplay
              attachments={attachments}
              questionLabel={`Question ${question.question_number}`}
              requiresFigure={question.figure}
              pdfAvailable={!!pdfDataUrl}
              onAdd={() => onAddAttachment()}
              onDelete={onDeleteAttachment}
              isEditing={isEditing}
            />
          )}

          {/* MCQ Options - Display BEFORE answers */}
          {question.question_type === 'mcq' && question.options && question.options.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Options
              </label>
              <div className="space-y-2">
                {question.options.map((option: any, idx: number) => {
                  // Check if this option is correct by comparing with correct_answers
                  const correctAnswerLabels = question.correct_answers || [];
                  const isCorrect = option.is_correct ||
                    correctAnswerLabels.some((ans: any) => {
                      const answerText = typeof ans === 'string' ? ans : ans.answer_text || ans.text;
                      return answerText === option.label || answerText === option.text;
                    });

                  return (
                    <div
                      key={idx}
                      className={cn(
                        "p-3 rounded-lg border",
                        isCorrect
                          ? "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700"
                          : "bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {option.label}.
                        </span>
                        <span className="flex-1 text-gray-900 dark:text-white">
                          {option.text}
                        </span>
                        {isCorrect && (
                          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Answer Display - Show for ALL question types */}
          {!hasParts && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Correct Answer(s)
              </label>
              {question.correct_answers && question.correct_answers.length > 0 ? (
                <DynamicAnswerField
                  question={{
                    id: question.id,
                    type: question.question_type,
                    subject: paperMetadata.subject,
                    answer_format: question.answer_format,
                    answer_requirement: question.answer_requirement,
                    marks: question.marks,
                    correct_answers: question.correct_answers
                  }}
                  mode={isEditing ? "admin" : "review"}
                  showCorrectAnswer={true}
                  onChange={(newAnswers) => {
                    if (isEditing) {
                      onUpdateQuestion({ correct_answers: newAnswers });
                    }
                  }}
                />
              ) : (
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                    No correct answer provided
                  </p>
                </div>
              )}
            </div>
          )}


          {/* Hint */}
          {(question.hint || isEditing) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <HelpCircle className="h-4 w-4" />
                Hint
              </label>
              {isEditing ? (
                <textarea
                  value={question.hint || ''}
                  onChange={(e) => onUpdateQuestion({ hint: e.target.value })}
                  rows={2}
                  placeholder="Optional hint for students..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              ) : question.hint ? (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    {question.hint}
                  </p>
                </div>
              ) : null}
            </div>
          )}

          {/* Explanation */}
          {(question.explanation || isEditing) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Explanation
              </label>
              {isEditing ? (
                <textarea
                  value={question.explanation || ''}
                  onChange={(e) => onUpdateQuestion({ explanation: e.target.value })}
                  rows={3}
                  placeholder="Optional explanation of the answer..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              ) : question.explanation ? (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm text-green-800 dark:text-green-200">
                    {question.explanation}
                  </p>
                </div>
              ) : null}
            </div>
          )}

          {/* Parts Display */}
          {hasParts && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Question Parts ({question.parts.length})
              </h4>
              {question.parts.map((part: any, partIndex: number) => (
                <QuestionPartDisplay
                  key={partIndex}
                  part={part}
                  partIndex={partIndex}
                  questionId={question.id}
                  attachments={attachments}
                  paperMetadata={paperMetadata}
                  pdfDataUrl={pdfDataUrl}
                  isEditing={isEditing}
                  onAddAttachment={onAddAttachment}
                  onDeleteAttachment={onDeleteAttachment}
                  onUpdatePart={(updates) => {
                    const newParts = [...question.parts];
                    newParts[partIndex] = { ...newParts[partIndex], ...updates };
                    onUpdateQuestion({ parts: newParts });
                  }}
                />
              ))}
            </div>
          )}

          {/* Mapping Controls */}
          <QuestionMappingControls
            mapping={mapping}
            dataStructureInfo={dataStructureInfo}
            units={units}
            topics={topics}
            subtopics={subtopics}
            onUpdate={onMappingUpdate}
            isDisabled={isAlreadyImported || isEditing}
          />
        </div>
      )}
    </div>
  );
};
