import React from 'react';
import {
  Image as ImageIcon, HelpCircle, Lightbulb, CheckCircle,
  Hash, Calculator, FileText, Link, BookOpen
} from 'lucide-react';
import DynamicAnswerField from '../../../../../../../components/shared/DynamicAnswerField';
import { AttachmentDisplay } from './AttachmentDisplay';
import { cn } from '../../../../../../../lib/utils';

interface QuestionPartDisplayProps {
  part: any;
  partIndex: number;
  questionId: string;
  attachments: any;
  paperMetadata: any;
  pdfDataUrl: string | null;
  isEditing: boolean;
  onAddAttachment: (partIndex: number, subpartIndex?: number) => void;
  onDeleteAttachment: (attachmentKey: string, attachmentId: string) => void;
  onUpdatePart: (updates: any) => void;
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

export const QuestionPartDisplay: React.FC<QuestionPartDisplayProps> = ({
  part,
  partIndex,
  questionId,
  attachments,
  paperMetadata,
  pdfDataUrl,
  isEditing,
  onAddAttachment,
  onDeleteAttachment,
  onUpdatePart,
}) => {
  const partKey = `${questionId}_p${partIndex}`;
  const partAttachments = attachments?.[partKey] || [];
  const hasSubparts = part.subparts && part.subparts.length > 0;
  const formatInfo = part.answer_format ? answerFormatConfig[part.answer_format] : null;

  return (
    <div className="border-l-4 border-blue-300 dark:border-blue-700 pl-4">
      <div className="space-y-4">
        {/* Part Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h5 className="text-base font-semibold text-gray-900 dark:text-white">
                Part ({part.part})
              </h5>
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-full">
                {part.marks} marks
              </span>
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
              {part.answer_requirement && (
                <span className="flex items-center gap-1 px-2 py-1 bg-indigo-100 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 text-xs rounded-full">
                  <Link className="h-3 w-3" />
                  {part.answer_requirement.replace(/_/g, ' ')}
                </span>
              )}
              {hasSubparts && (
                <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-xs rounded-full">
                  {part.subparts.length} subparts
                </span>
              )}
            </div>

            {/* Part Question Text */}
            {isEditing ? (
              <textarea
                value={part.question_text || ''}
                onChange={(e) => onUpdatePart({ question_text: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
              />
            ) : (
              <p className="text-sm text-gray-900 dark:text-white">
                {part.question_text || 'No question text'}
              </p>
            )}
          </div>
        </div>

        {/* Part Attachments */}
        {(part.figure || partAttachments.length > 0 || pdfDataUrl) && (
          <AttachmentDisplay
            attachments={partAttachments}
            questionLabel={`Part (${part.part})`}
            attachmentKey={partKey}
            requiresFigure={part.figure}
            pdfAvailable={!!pdfDataUrl}
            onAdd={() => onAddAttachment(partIndex)}
            onDelete={onDeleteAttachment}
            isEditing={isEditing}
          />
        )}

        {/* Part Answer - Only if no subparts */}
        {!hasSubparts && part.correct_answers && part.correct_answers.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Correct Answer(s)
            </label>
            <DynamicAnswerField
              question={{
                id: `${questionId}_p${partIndex}`,
                type: 'descriptive',
                subject: paperMetadata.subject,
                answer_format: part.answer_format,
                answer_requirement: part.answer_requirement,
                marks: part.marks,
                correct_answers: part.correct_answers
              }}
              mode={isEditing ? "admin" : "review"}
              showCorrectAnswer={true}
              onChange={(newAnswers) => {
                if (isEditing) {
                  onUpdatePart({ correct_answers: newAnswers });
                }
              }}
            />
          </div>
        )}

        {/* Part MCQ Options */}
        {part.options && part.options.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Options
            </label>
            <div className="space-y-2">
              {part.options.map((option: any, idx: number) => (
                <div
                  key={idx}
                  className={cn(
                    "p-2 rounded-lg border text-sm",
                    option.is_correct
                      ? "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700"
                      : "bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {option.label}.
                    </span>
                    <span className="flex-1 text-gray-900 dark:text-white">
                      {option.text}
                    </span>
                    {option.is_correct && (
                      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Part Hint */}
        {(part.hint || isEditing) && (
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
              <HelpCircle className="h-3 w-3" />
              Hint
            </label>
            {isEditing ? (
              <textarea
                value={part.hint || ''}
                onChange={(e) => onUpdatePart({ hint: e.target.value })}
                rows={2}
                placeholder="Optional hint..."
                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            ) : part.hint ? (
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                <p className="text-xs text-blue-800 dark:text-blue-200">{part.hint}</p>
              </div>
            ) : null}
          </div>
        )}

        {/* Part Explanation */}
        {(part.explanation || isEditing) && (
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
              <Lightbulb className="h-3 w-3" />
              Explanation
            </label>
            {isEditing ? (
              <textarea
                value={part.explanation || ''}
                onChange={(e) => onUpdatePart({ explanation: e.target.value })}
                rows={2}
                placeholder="Optional explanation..."
                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            ) : part.explanation ? (
              <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded">
                <p className="text-xs text-green-800 dark:text-green-200">{part.explanation}</p>
              </div>
            ) : null}
          </div>
        )}

        {/* Subparts */}
        {hasSubparts && (
          <div className="space-y-3 pl-4 border-l-2 border-purple-200 dark:border-purple-800">
            <h6 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Subparts ({part.subparts.length})
            </h6>
            {part.subparts.map((subpart: any, subpartIndex: number) => (
              <div key={subpartIndex} className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h6 className="text-sm font-medium text-gray-900 dark:text-white">
                        {subpart.subpart}
                      </h6>
                      <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded">
                        {subpart.marks}m
                      </span>
                      {subpart.answer_requirement && (
                        <span className="px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 text-xs rounded">
                          {subpart.answer_requirement.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-900 dark:text-white">
                      {subpart.question_text || 'No question text'}
                    </p>
                  </div>
                </div>

                {/* Subpart Attachments */}
                {subpart.figure && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded text-xs text-yellow-700 dark:text-yellow-300">
                    <ImageIcon className="h-3 w-3 inline mr-1" />
                    Figure required for this subpart
                  </div>
                )}

                {/* Subpart Answer */}
                {subpart.correct_answers && subpart.correct_answers.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Answer
                    </label>
                    <DynamicAnswerField
                      question={{
                        id: `${questionId}_p${partIndex}_s${subpartIndex}`,
                        type: 'descriptive',
                        subject: paperMetadata.subject,
                        answer_format: subpart.answer_format,
                        answer_requirement: subpart.answer_requirement,
                        marks: subpart.marks,
                        correct_answers: subpart.correct_answers
                      }}
                      mode="review"
                      showCorrectAnswer={true}
                    />
                  </div>
                )}

                {/* Subpart Hint & Explanation */}
                {subpart.hint && (
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                    <p className="text-xs text-blue-800 dark:text-blue-200">
                      <HelpCircle className="h-3 w-3 inline mr-1" />
                      {subpart.hint}
                    </p>
                  </div>
                )}
                {subpart.explanation && (
                  <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded">
                    <p className="text-xs text-green-800 dark:text-green-200">
                      <Lightbulb className="h-3 w-3 inline mr-1" />
                      {subpart.explanation}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
