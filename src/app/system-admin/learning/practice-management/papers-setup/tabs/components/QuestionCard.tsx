import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Edit2,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Info,
  Hash,
  BookOpen,
  Flag,
  FileText,
  Calculator,
  FlaskConical,
  PenTool,
  Link
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
  questionIndex: number;
  isExpanded: boolean;
  isEditing: boolean;
  mapping: any;
  validation: any;
  attachments: any[];
  units: any[];
  topics: any[];
  subtopics: any[];
  pdfDataUrl: string | null;
  existingQuestionNumbers: Set<number>;
  onToggleExpanded: () => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onUpdateField: (field: string, value: any) => void;
  onMappingUpdate: (field: string, value: string | string[]) => void;
  onAttachmentUpload: (partPath: string[]) => void;
  onAttachmentDelete: (attachmentId: string) => void;
}

const answerFormatConfig: Record<string, { icon: any; color: string; label: string }> = {
  single_word: { icon: Hash, color: 'blue', label: 'Single Word' },
  single_line: { icon: FileText, color: 'blue', label: 'Short Answer' },
  two_items: { icon: Link, color: 'purple', label: 'Two Items' },
  two_items_connected: { icon: Link, color: 'purple', label: 'Connected Items' },
  multi_line: { icon: FileText, color: 'indigo', label: 'Multi-line' },
  multi_line_labeled: { icon: BookOpen, color: 'indigo', label: 'Labeled Parts' },
  calculation: { icon: Calculator, color: 'green', label: 'Calculation' },
  equation: { icon: Calculator, color: 'green', label: 'Equation' },
  chemical_structure: { icon: FlaskConical, color: 'orange', label: 'Chemical Structure' },
  structural_diagram: { icon: FlaskConical, color: 'orange', label: 'Structural Diagram' },
  diagram: { icon: PenTool, color: 'pink', label: 'Diagram' }
};

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  questionIndex,
  isExpanded,
  isEditing,
  mapping,
  validation,
  attachments,
  units,
  topics,
  subtopics,
  pdfDataUrl,
  existingQuestionNumbers,
  onToggleExpanded,
  onEdit,
  onSave,
  onCancel,
  onUpdateField,
  onMappingUpdate,
  onAttachmentUpload,
  onAttachmentDelete
}) => {
  const isAlreadyImported = existingQuestionNumbers.has(parseInt(question.question_number));
  const hasErrors = validation?.errors && validation.errors.length > 0;
  const hasWarnings = validation?.warnings && validation.warnings.length > 0;
  const isMapped = mapping?.chapter_id && mapping.topic_ids?.length > 0;
  const hasParts = question.parts && question.parts.length > 0;
  const hasSimulationFlags = question.simulation_flags && question.simulation_flags.length > 0;

  let statusColor = 'gray';
  let StatusIcon = Info;

  if (isAlreadyImported) {
    statusColor = 'blue';
    StatusIcon = Info;
  } else if (hasErrors) {
    statusColor = 'red';
    StatusIcon = AlertCircle;
  } else if (hasWarnings) {
    statusColor = 'yellow';
    StatusIcon = AlertTriangle;
  } else if (isMapped) {
    statusColor = 'green';
    StatusIcon = CheckCircle;
  }

  const answerFormat = question.answer_format ? answerFormatConfig[question.answer_format] : null;
  const hasDynamicAnswers = question.correct_answers && question.correct_answers.length > 1;

  return (
    <div
      className={cn(
        'border-2 rounded-lg transition-all',
        statusColor === 'red' && 'border-red-300 dark:border-red-700 bg-red-50/30 dark:bg-red-900/10',
        statusColor === 'yellow' && 'border-yellow-300 dark:border-yellow-700 bg-yellow-50/30 dark:bg-yellow-900/10',
        statusColor === 'green' && 'border-green-300 dark:border-green-700 bg-green-50/30 dark:bg-green-900/10',
        statusColor === 'blue' && 'border-blue-300 dark:border-blue-700 bg-blue-50/30 dark:bg-blue-900/10',
        statusColor === 'gray' && 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
      )}
    >
      {/* Question Header */}
      <div
        className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        onClick={onToggleExpanded}
      >
        <div className="flex items-center gap-4 flex-1">
          <button className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          </button>

          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h4 className="font-semibold text-gray-900 dark:text-white">
                Question {question.question_number}
              </h4>

              {/* Status Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                  {question.marks} mark{question.marks !== 1 ? 's' : ''}
                </span>

                {question.question_type === 'mcq' && (
                  <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                    MCQ
                  </span>
                )}

                {hasParts && (
                  <span className="px-2 py-1 text-xs font-medium rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                    {question.parts.length} part{question.parts.length !== 1 ? 's' : ''}
                  </span>
                )}

                {answerFormat && (
                  <span className={cn(
                    "px-2 py-1 text-xs font-medium rounded flex items-center gap-1",
                    `bg-${answerFormat.color}-100 dark:bg-${answerFormat.color}-900/30`,
                    `text-${answerFormat.color}-700 dark:text-${answerFormat.color}-300`
                  )}>
                    <answerFormat.icon className="h-3 w-3" />
                    {answerFormat.label}
                  </span>
                )}

                {hasDynamicAnswers && (
                  <span className="px-2 py-1 text-xs font-medium rounded bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 flex items-center gap-1">
                    <Link className="h-3 w-3" />
                    {question.correct_answers.length} alternatives
                  </span>
                )}

                {hasSimulationFlags && (
                  <span className="px-2 py-1 text-xs font-medium rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 flex items-center gap-1">
                    <Flag className="h-3 w-3" />
                    Flagged
                  </span>
                )}

                {isAlreadyImported && (
                  <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                    Already Imported
                  </span>
                )}
              </div>
            </div>

            {!isExpanded && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-1">
                {question.question_text || 'No question text'}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StatusIcon className={cn(
            "h-5 w-5",
            statusColor === 'red' && "text-red-600 dark:text-red-400",
            statusColor === 'yellow' && "text-yellow-600 dark:text-yellow-400",
            statusColor === 'green' && "text-green-600 dark:text-green-400",
            statusColor === 'blue' && "text-blue-600 dark:text-blue-400",
            statusColor === 'gray' && "text-gray-400 dark:text-gray-500"
          )} />
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-6 pb-6 space-y-6 border-t border-gray-200 dark:border-gray-700 pt-4">
          {/* Simulation Flags */}
          {hasSimulationFlags && question.simulation_notes && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Flag className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Flagged in Simulation
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    {question.simulation_notes}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Already Imported Notice */}
          {isAlreadyImported && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  This question has already been imported. Editing is disabled.
                </p>
              </div>
            </div>
          )}

          {/* Validation Errors */}
          {hasErrors && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                    Validation Errors
                  </p>
                  <ul className="text-sm text-red-700 dark:text-red-300 list-disc list-inside space-y-0.5">
                    {validation.errors.map((error: string, idx: number) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Validation Warnings */}
          {hasWarnings && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                    Warnings
                  </p>
                  <ul className="text-sm text-yellow-700 dark:text-yellow-300 list-disc list-inside space-y-0.5">
                    {validation.warnings.map((warning: string, idx: number) => (
                      <li key={idx}>{warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Edit/Save Buttons */}
          {!isAlreadyImported && (
            <div className="flex justify-end gap-2">
              {!isEditing ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  leftIcon={<Edit2 className="h-4 w-4" />}
                >
                  Edit
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCancel();
                    }}
                    leftIcon={<X className="h-4 w-4" />}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSave();
                    }}
                    leftIcon={<Save className="h-4 w-4" />}
                  >
                    Save
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Question Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Question Text
            </label>
            {isEditing ? (
              <textarea
                value={question.question_text || ''}
                onChange={(e) => onUpdateField('question_text', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md min-h-[100px] dark:bg-gray-900 dark:text-white"
                placeholder="Enter question text..."
              />
            ) : (
              <div className="text-gray-900 dark:text-white whitespace-pre-wrap">
                {question.question_text || <span className="text-gray-400 italic">No question text</span>}
              </div>
            )}
          </div>

          {/* Attachments */}
          <AttachmentDisplay
            attachments={attachments}
            questionId={question.id}
            partPath={[]}
            requiresFigure={question.figure || false}
            pdfDataUrl={pdfDataUrl}
            onAttachmentUpload={() => onAttachmentUpload([])}
            onAttachmentDelete={onAttachmentDelete}
            disabled={isAlreadyImported}
          />

          {/* MCQ Options */}
          {question.question_type === 'mcq' && question.options && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Options
              </label>
              <div className="space-y-2">
                {question.options.map((option: any) => {
                  const isCorrect = option.is_correct ||
                    question.correct_answer === option.label ||
                    question.correct_answers?.some((ca: any) =>
                      ca.answer === option.label || ca.answer === option.text
                    );

                  return (
                    <div
                      key={option.label}
                      className={cn(
                        "flex items-center p-3 rounded-lg border",
                        isCorrect
                          ? "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700"
                          : "bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700"
                      )}
                    >
                      <span className={cn(
                        "font-semibold px-2 py-1 rounded mr-3",
                        isCorrect
                          ? "bg-green-200 dark:bg-green-800 text-green-700 dark:text-green-300"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                      )}>
                        {option.label}
                      </span>
                      <span className="flex-1">{option.text}</span>
                      {isCorrect && <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 ml-2" />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Correct Answer(s) */}
          {!hasParts && (
            <DynamicAnswerField
              question={question}
              isEditing={isEditing}
              onUpdate={onUpdateField}
              showCorrectAnswer={true}
            />
          )}

          {/* Hint */}
          {(question.hint || isEditing) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Hint
              </label>
              {isEditing ? (
                <textarea
                  value={question.hint || ''}
                  onChange={(e) => onUpdateField('hint', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md min-h-[60px] dark:bg-gray-900 dark:text-white"
                  placeholder="Enter hint..."
                />
              ) : (
                <div className="text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                  {question.hint || <span className="text-gray-400 italic">No hint</span>}
                </div>
              )}
            </div>
          )}

          {/* Explanation */}
          {(question.explanation || isEditing) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Explanation
              </label>
              {isEditing ? (
                <textarea
                  value={question.explanation || ''}
                  onChange={(e) => onUpdateField('explanation', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md min-h-[80px] dark:bg-gray-900 dark:text-white"
                  placeholder="Enter explanation..."
                />
              ) : (
                <div className="text-gray-700 dark:text-gray-300 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                  {question.explanation || <span className="text-gray-400 italic">No explanation</span>}
                </div>
              )}
            </div>
          )}

          {/* Parts */}
          {hasParts && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Parts ({question.parts.length})
              </label>
              <div className="space-y-4">
                {question.parts.map((part: any, partIndex: number) => (
                  <QuestionPartDisplay
                    key={part.id || partIndex}
                    part={part}
                    partIndex={partIndex}
                    questionId={question.id}
                    isEditing={isEditing}
                    attachments={attachments}
                    pdfDataUrl={pdfDataUrl}
                    onUpdateField={(field, value) => {
                      const updatedParts = [...question.parts];
                      updatedParts[partIndex] = { ...updatedParts[partIndex], [field]: value };
                      onUpdateField('parts', updatedParts);
                    }}
                    onAttachmentUpload={onAttachmentUpload}
                    onAttachmentDelete={onAttachmentDelete}
                    disabled={isAlreadyImported}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Academic Mapping */}
          <QuestionMappingControls
            mapping={mapping}
            units={units}
            topics={topics}
            subtopics={subtopics}
            onMappingUpdate={onMappingUpdate}
            disabled={isAlreadyImported}
          />
        </div>
      )}
    </div>
  );
};
