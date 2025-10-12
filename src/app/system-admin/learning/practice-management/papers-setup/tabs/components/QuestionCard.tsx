import React from 'react';
import {
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Info,
  Edit2,
  Save,
  X,
  Hash,
  FileText,
  Flag,
  Paperclip
} from 'lucide-react';
import { Button } from '../../../../../../../components/shared/Button';
import { StatusBadge } from '../../../../../../../components/shared/StatusBadge';
import DynamicAnswerField from '../../../../../../../components/shared/DynamicAnswerField';
import { QuestionPartDisplay } from './QuestionPartDisplay';
import { QuestionMappingControls } from './QuestionMappingControls';
import { AttachmentDisplay } from './AttachmentDisplay';

interface QuestionCardProps {
  question: any;
  isExpanded: boolean;
  isEditing: boolean;
  mapping: any;
  attachments: Record<string, any[]>;
  validationErrors: string[];
  existingQuestionNumbers: Set<number>;
  dataStructureInfo: any;
  units: any[];
  topics: any[];
  subtopics: any[];
  pdfDataUrl: string | null;
  isAlreadyImported: boolean;
  onToggleExpanded: () => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onQuestionChange: (field: string, value: any) => void;
  onMappingUpdate: (field: string, value: string | string[]) => void;
  onAddAttachment: (partIndex?: number, subpartIndex?: number) => void;
  onDeleteAttachment: (key: string, attachmentId: string) => void;
  onToggleFigureRequired: (partIndex?: number, subpartIndex?: number) => void;
}

export function QuestionCard({
  question,
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
  pdfDataUrl,
  isAlreadyImported,
  onToggleExpanded,
  onEdit,
  onSave,
  onCancel,
  onQuestionChange,
  onMappingUpdate,
  onAddAttachment,
  onDeleteAttachment,
  onToggleFigureRequired
}: QuestionCardProps) {
  const getStatusInfo = () => {
    if (isAlreadyImported) {
      return { icon: Info, color: 'blue', label: 'Already Imported' };
    }
    if (validationErrors.length > 0) {
      const hasError = validationErrors.some(e =>
        e.toLowerCase().includes('required') ||
        e.toLowerCase().includes('missing') ||
        e.toLowerCase().includes('invalid')
      );
      if (hasError) {
        return { icon: AlertCircle, color: 'red', label: 'Errors' };
      }
      return { icon: AlertTriangle, color: 'yellow', label: 'Warnings' };
    }
    if (mapping?.chapter_id && mapping?.topic_ids?.length > 0) {
      return { icon: CheckCircle, color: 'green', label: 'Ready' };
    }
    return { icon: AlertTriangle, color: 'yellow', label: 'Not Mapped' };
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  const hasParts = question.parts && question.parts.length > 0;
  const totalParts = hasParts ? question.parts.length : 0;
  const totalSubparts = hasParts
    ? question.parts.reduce((sum: number, part: any) => sum + (part.subparts?.length || 0), 0)
    : 0;

  const questionAttachmentKey = question.id;
  const questionAttachments = attachments[questionAttachmentKey] || [];

  const correctAnswerLabels = question.correct_answers || [];

  return (
    <div
      id={`question-${question.id}`}
      className={`border rounded-lg overflow-hidden transition-all ${
        isAlreadyImported
          ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/10'
          : statusInfo.color === 'red'
          ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10'
          : statusInfo.color === 'yellow'
          ? 'border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/10'
          : statusInfo.color === 'green'
          ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/10'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
      }`}
    >
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        onClick={onToggleExpanded}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {isExpanded ? (
              <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
            ) : (
              <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Question {question.question_number}
                </h3>

                <StatusBadge
                  status={statusInfo.color as any}
                  text={statusInfo.label}
                  icon={StatusIcon}
                />

                {question.marks > 0 && (
                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                    {question.marks} {question.marks === 1 ? 'mark' : 'marks'}
                  </span>
                )}

                {question.question_type === 'mcq' && (
                  <span className="px-2 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                    <Hash className="h-3 w-3 inline mr-1" />
                    MCQ
                  </span>
                )}

                {hasParts && (
                  <span className="px-2 py-1 text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:indigo-blue-300 rounded">
                    {totalParts} {totalParts === 1 ? 'part' : 'parts'}
                    {totalSubparts > 0 && ` (${totalSubparts} subparts)`}
                  </span>
                )}

                {question.answer_format && (
                  <span className="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                    <FileText className="h-3 w-3 inline mr-1" />
                    {question.answer_format.replace(/_/g, ' ')}
                  </span>
                )}

                {question.answer_requirement && (
                  <span className="px-2 py-1 text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded">
                    {question.answer_requirement.replace(/_/g, ' ')}
                  </span>
                )}

                {question.simulation_flags?.includes('flagged') && (
                  <span className="px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded">
                    <Flag className="h-3 w-3 inline mr-1" />
                    Flagged
                  </span>
                )}

                {questionAttachments.length > 0 && (
                  <span className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                    <Paperclip className="h-3 w-3 inline mr-1" />
                    {questionAttachments.length}
                  </span>
                )}
              </div>

              {!isExpanded && question.question_text && (
                <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                  {question.question_text.substring(0, 100)}
                  {question.question_text.length > 100 ? '...' : ''}
                </p>
              )}
            </div>
          </div>

          {!isAlreadyImported && (
            <div onClick={(e) => e.stopPropagation()}>
              {isEditing ? (
                <div className="flex gap-2">
                  <Button variant="primary" size="sm" onClick={onSave}>
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                  <Button variant="outline" size="sm" onClick={onCancel}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button variant="ghost" size="sm" onClick={onEdit}>
                  <Edit2 className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-4 bg-white dark:bg-gray-800">
          {validationErrors.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                    Validation Issues
                  </h4>
                  <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                    {validationErrors.map((error, idx) => (
                      <li key={idx}>• {error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {question.simulation_notes && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Flag className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                    Simulation Notes
                  </h4>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    {question.simulation_notes}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Question Text
              </label>
              {isEditing ? (
                <textarea
                  value={question.question_text || ''}
                  onChange={(e) => onQuestionChange('question_text', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  rows={3}
                />
              ) : (
                <div className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                  {question.question_text || (
                    <span className="text-gray-400 italic">No question text</span>
                  )}
                </div>
              )}
            </div>

            {questionAttachments.length > 0 && (
              <AttachmentDisplay
                attachments={questionAttachments}
                attachmentKey={questionAttachmentKey}
                requiresFigure={question.requires_figure}
                pdfAvailable={!!pdfDataUrl}
                onAddAttachment={() => onAddAttachment()}
                onDeleteAttachment={onDeleteAttachment}
                onToggleFigureRequired={() => onToggleFigureRequired()}
              />
            )}

            {!hasParts && question.question_type === 'mcq' && question.options && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Options
                </label>
                <div className="space-y-2">
                  {question.options.map((option: any, idx: number) => {
                    const isCorrect =
                      option.is_correct ||
                      correctAnswerLabels.some((ans: any) => {
                        const answerText =
                          typeof ans === 'string' ? ans : ans.answer_text || ans.text;
                        return answerText === option.label || answerText === option.text;
                      });

                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border ${
                          isCorrect
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                            : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">
                            {option.label}:
                          </span>
                          <span
                            className={`flex-1 ${
                              isCorrect
                                ? 'text-green-800 dark:text-green-200'
                                : 'text-gray-800 dark:text-gray-200'
                            }`}
                          >
                            {option.text}
                          </span>
                          {isCorrect && (
                            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!hasParts && question.correct_answers && question.correct_answers.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Correct Answer(s)
                </label>
                <DynamicAnswerField
                  value={question.correct_answers}
                  onChange={(value) => onQuestionChange('correct_answers', value)}
                  disabled={!isEditing}
                  answerFormat={question.answer_format}
                  answerRequirement={question.answer_requirement}
                />
              </div>
            )}

            {!hasParts && question.hint && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Hint
                </label>
                {isEditing ? (
                  <textarea
                    value={question.hint || ''}
                    onChange={(e) => onQuestionChange('hint', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    rows={2}
                  />
                ) : (
                  <div className="text-sm text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                    {question.hint}
                  </div>
                )}
              </div>
            )}

            {!hasParts && question.explanation && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Explanation
                </label>
                {isEditing ? (
                  <textarea
                    value={question.explanation || ''}
                    onChange={(e) => onQuestionChange('explanation', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    rows={3}
                  />
                ) : (
                  <div className="text-sm text-gray-700 dark:text-gray-300 bg-green-50 dark:bg-green-900/20 p-2 rounded">
                    {question.explanation}
                  </div>
                )}
              </div>
            )}

            {hasParts && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Parts</h4>
                {question.parts.map((part: any, partIndex: number) => (
                  <QuestionPartDisplay
                    key={partIndex}
                    part={part}
                    partIndex={partIndex}
                    questionId={question.id}
                    attachments={attachments}
                    isEditing={isEditing}
                    pdfDataUrl={pdfDataUrl}
                    onPartChange={(field, value) => {
                      const updatedParts = [...question.parts];
                      updatedParts[partIndex] = { ...updatedParts[partIndex], [field]: value };
                      onQuestionChange('parts', updatedParts);
                    }}
                    onAddAttachment={(subpartIndex) => onAddAttachment(partIndex, subpartIndex)}
                    onDeleteAttachment={onDeleteAttachment}
                    onToggleFigureRequired={(subpartIndex) =>
                      onToggleFigureRequired(partIndex, subpartIndex)
                    }
                  />
                ))}
              </div>
            )}
          </div>

          {!isAlreadyImported && (
            <QuestionMappingControls
              mapping={mapping}
              units={units}
              topics={topics}
              subtopics={subtopics}
              onMappingUpdate={onMappingUpdate}
              disabled={isAlreadyImported}
            />
          )}
        </div>
      )}
    </div>
  );
}
