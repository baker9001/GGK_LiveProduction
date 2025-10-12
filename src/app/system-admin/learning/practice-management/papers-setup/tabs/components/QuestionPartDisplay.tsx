import React from 'react';
import { FileText, Hash, CheckCircle } from 'lucide-react';
import DynamicAnswerField from '../../../../../../../components/shared/DynamicAnswerField';
import { AttachmentDisplay } from './AttachmentDisplay';

interface QuestionPartDisplayProps {
  part: any;
  partIndex: number;
  questionId: string;
  attachments: Record<string, any[]>;
  isEditing: boolean;
  pdfDataUrl: string | null;
  onPartChange: (field: string, value: any) => void;
  onAddAttachment: (subpartIndex?: number) => void;
  onDeleteAttachment: (key: string, attachmentId: string) => void;
  onToggleFigureRequired: (subpartIndex?: number) => void;
}

export function QuestionPartDisplay({
  part,
  partIndex,
  questionId,
  attachments,
  isEditing,
  pdfDataUrl,
  onPartChange,
  onAddAttachment,
  onDeleteAttachment,
  onToggleFigureRequired
}: QuestionPartDisplayProps) {
  const partAttachmentKey = `${questionId}_p${partIndex}`;
  const partAttachments = attachments[partAttachmentKey] || [];
  const hasSubparts = part.subparts && part.subparts.length > 0;

  const correctAnswerLabels = part.correct_answers || [];

  const renderSubpart = (subpart: any, subpartIndex: number) => {
    const subpartAttachmentKey = `${questionId}_p${partIndex}_s${subpartIndex}`;
    const subpartAttachments = attachments[subpartAttachmentKey] || [];
    const romanNumerals = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'];

    return (
      <div
        key={subpartIndex}
        className="ml-6 pl-4 border-l-2 border-gray-200 dark:border-gray-700 py-3"
      >
        <div className="flex items-start gap-3 mb-2">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 min-w-[2rem]">
            ({romanNumerals[subpartIndex] || `${subpartIndex + 1}`})
          </span>
          <div className="flex-1 space-y-2">
            {subpart.question_text && (
              <div className="text-sm text-gray-900 dark:text-gray-100">
                {subpart.question_text}
              </div>
            )}

            {subpart.marks > 0 && (
              <span className="inline-block px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                {subpart.marks} {subpart.marks === 1 ? 'mark' : 'marks'}
              </span>
            )}

            {subpart.answer_requirement && (
              <span className="inline-block ml-2 px-2 py-0.5 text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded">
                {subpart.answer_requirement.replace(/_/g, ' ')}
              </span>
            )}

            {subpartAttachments.length > 0 && (
              <AttachmentDisplay
                attachments={subpartAttachments}
                attachmentKey={subpartAttachmentKey}
                requiresFigure={subpart.requires_figure}
                pdfAvailable={!!pdfDataUrl}
                onAddAttachment={() => onAddAttachment(subpartIndex)}
                onDeleteAttachment={onDeleteAttachment}
                onToggleFigureRequired={() => onToggleFigureRequired(subpartIndex)}
              />
            )}

            {subpart.correct_answers && subpart.correct_answers.length > 0 && (
              <div className="mt-2">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Correct Answer
                </label>
                <DynamicAnswerField
                  value={subpart.correct_answers}
                  onChange={(value) => {
                    const updatedSubparts = [...part.subparts];
                    updatedSubparts[subpartIndex] = {
                      ...updatedSubparts[subpartIndex],
                      correct_answers: value
                    };
                    onPartChange('subparts', updatedSubparts);
                  }}
                  disabled={!isEditing}
                  answerFormat={subpart.answer_format}
                  answerRequirement={subpart.answer_requirement}
                />
              </div>
            )}

            {subpart.hint && (
              <div className="mt-2">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Hint
                </label>
                <div className="text-xs text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                  {subpart.hint}
                </div>
              </div>
            )}

            {subpart.explanation && (
              <div className="mt-2">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Explanation
                </label>
                <div className="text-xs text-gray-700 dark:text-gray-300 bg-green-50 dark:bg-green-900/20 p-2 rounded">
                  {subpart.explanation}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 space-y-3">
      <div className="flex items-start gap-3">
        <span className="text-base font-semibold text-gray-900 dark:text-white min-w-[2rem]">
          ({part.part})
        </span>
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            {part.marks > 0 && (
              <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                {part.marks} {part.marks === 1 ? 'mark' : 'marks'}
              </span>
            )}

            {part.answer_format && (
              <span className="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                <FileText className="h-3 w-3 inline mr-1" />
                {part.answer_format.replace(/_/g, ' ')}
              </span>
            )}

            {part.answer_requirement && (
              <span className="px-2 py-1 text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded">
                {part.answer_requirement.replace(/_/g, ' ')}
              </span>
            )}

            {hasSubparts && (
              <span className="px-2 py-1 text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded">
                {part.subparts.length} {part.subparts.length === 1 ? 'subpart' : 'subparts'}
              </span>
            )}
          </div>

          {part.question_text && (
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Question Text
              </label>
              {isEditing ? (
                <textarea
                  value={part.question_text || ''}
                  onChange={(e) => onPartChange('question_text', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  rows={2}
                />
              ) : (
                <div className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                  {part.question_text}
                </div>
              )}
            </div>
          )}

          {partAttachments.length > 0 && (
            <AttachmentDisplay
              attachments={partAttachments}
              attachmentKey={partAttachmentKey}
              requiresFigure={part.requires_figure}
              pdfAvailable={!!pdfDataUrl}
              onAddAttachment={() => onAddAttachment()}
              onDeleteAttachment={onDeleteAttachment}
              onToggleFigureRequired={() => onToggleFigureRequired()}
            />
          )}

          {!hasSubparts && part.question_type === 'mcq' && part.options && (
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                Options
              </label>
              <div className="space-y-2">
                {part.options.map((option: any, idx: number) => {
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
                      className={`p-2 rounded border text-sm ${
                        isCorrect
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600'
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
                          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!hasSubparts && part.correct_answers && part.correct_answers.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Correct Answer(s)
              </label>
              <DynamicAnswerField
                value={part.correct_answers}
                onChange={(value) => onPartChange('correct_answers', value)}
                disabled={!isEditing}
                answerFormat={part.answer_format}
                answerRequirement={part.answer_requirement}
              />
            </div>
          )}

          {!hasSubparts && part.hint && (
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Hint
              </label>
              {isEditing ? (
                <textarea
                  value={part.hint || ''}
                  onChange={(e) => onPartChange('hint', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  rows={2}
                />
              ) : (
                <div className="text-sm text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                  {part.hint}
                </div>
              )}
            </div>
          )}

          {!hasSubparts && part.explanation && (
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Explanation
              </label>
              {isEditing ? (
                <textarea
                  value={part.explanation || ''}
                  onChange={(e) => onPartChange('explanation', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  rows={2}
                />
              ) : (
                <div className="text-sm text-gray-700 dark:text-gray-300 bg-green-50 dark:bg-green-900/20 p-2 rounded">
                  {part.explanation}
                </div>
              )}
            </div>
          )}

          {hasSubparts && (
            <div className="space-y-2">
              <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Subparts
              </h5>
              {part.subparts.map((subpart: any, subpartIndex: number) =>
                renderSubpart(subpart, subpartIndex)
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
