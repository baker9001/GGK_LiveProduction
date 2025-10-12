import React from 'react';
import {
  Hash,
  FileText,
  Calculator,
  FlaskConical,
  PenTool,
  Link,
  BookOpen,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import DynamicAnswerField from '../../../../../../../components/shared/DynamicAnswerField';
import { AttachmentDisplay } from './AttachmentDisplay';
import { cn } from '../../../../../../../lib/utils';

interface QuestionPartDisplayProps {
  part: any;
  partIndex: number;
  questionId: string;
  isEditing: boolean;
  attachments: any[];
  pdfDataUrl: string | null;
  onUpdateField: (field: string, value: any) => void;
  onAttachmentUpload: (partPath: string[]) => void;
  onAttachmentDelete: (attachmentId: string) => void;
  disabled?: boolean;
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

const answerRequirementLabels: Record<string, string> = {
  any_one_from: 'Any one of the following',
  any_two_from: 'Any two of the following',
  any_three_from: 'Any three of the following',
  both_required: 'Both answers required',
  all_required: 'All answers required',
  alternative_methods: 'Alternative methods accepted',
  acceptable_variations: 'Acceptable variations'
};

const partLabels = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't'];
const romanNumerals = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'];

export const QuestionPartDisplay: React.FC<QuestionPartDisplayProps> = ({
  part,
  partIndex,
  questionId,
  isEditing,
  attachments,
  pdfDataUrl,
  onUpdateField,
  onAttachmentUpload,
  onAttachmentDelete,
  disabled = false
}) => {
  const partLabel = part.part || partLabels[partIndex] || `part ${partIndex + 1}`;
  const hasSubparts = part.subparts && part.subparts.length > 0;
  const answerFormat = part.answer_format ? answerFormatConfig[part.answer_format] : null;
  const answerRequirement = part.answer_requirement ? answerRequirementLabels[part.answer_requirement] : null;

  return (
    <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
      {/* Part Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h5 className="font-semibold text-gray-900 dark:text-white">
            ({partLabel})
          </h5>

          <span className="px-2 py-1 text-xs font-medium rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
            {part.marks} mark{part.marks !== 1 ? 's' : ''}
          </span>

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

          {answerRequirement && (
            <span className="px-2 py-1 text-xs font-medium rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
              {answerRequirement}
            </span>
          )}

          {hasSubparts && (
            <span className="px-2 py-1 text-xs font-medium rounded bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
              {part.subparts.length} subpart{part.subparts.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Part Text */}
      <div className="mb-3">
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
          Part Text
        </label>
        {isEditing ? (
          <textarea
            value={part.question_text || ''}
            onChange={(e) => onUpdateField('question_text', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md min-h-[60px] text-sm dark:bg-gray-900 dark:text-white"
            placeholder="Enter part text..."
            disabled={disabled}
          />
        ) : (
          <div className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
            {part.question_text || <span className="text-gray-400 italic">No part text</span>}
          </div>
        )}
      </div>

      {/* Part Attachments */}
      <AttachmentDisplay
        attachments={attachments}
        questionId={questionId}
        partPath={[part.id || `part_${partIndex}`]}
        requiresFigure={part.figure || false}
        pdfDataUrl={pdfDataUrl}
        onAttachmentUpload={() => onAttachmentUpload([part.id || `part_${partIndex}`])}
        onAttachmentDelete={onAttachmentDelete}
        disabled={disabled}
      />

      {/* Part MCQ Options */}
      {part.question_type === 'mcq' && part.options && (
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
            Options
          </label>
          <div className="space-y-2">
            {part.options.map((option: any) => {
              const isCorrect = option.is_correct ||
                part.correct_answer === option.label ||
                part.correct_answers?.some((ca: any) =>
                  ca.answer === option.label || ca.answer === option.text
                );

              return (
                <div
                  key={option.label}
                  className={cn(
                    "flex items-center p-2 rounded-lg border text-sm",
                    isCorrect
                      ? "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700"
                      : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                  )}
                >
                  <span className={cn(
                    "font-semibold px-2 py-0.5 rounded mr-2 text-xs",
                    isCorrect
                      ? "bg-green-200 dark:bg-green-800 text-green-700 dark:text-green-300"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  )}>
                    {option.label}
                  </span>
                  <span className="flex-1">{option.text}</span>
                  {isCorrect && <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 ml-2" />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Part Correct Answer (only if no subparts) */}
      {!hasSubparts && (
        <div className="mb-3">
          <DynamicAnswerField
            question={part}
            isEditing={isEditing}
            onUpdate={onUpdateField}
            showCorrectAnswer={true}
          />
        </div>
      )}

      {/* Part Hint */}
      {(part.hint || isEditing) && (
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Hint
          </label>
          {isEditing ? (
            <textarea
              value={part.hint || ''}
              onChange={(e) => onUpdateField('hint', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md min-h-[40px] text-sm dark:bg-gray-900 dark:text-white"
              placeholder="Enter hint..."
              disabled={disabled}
            />
          ) : (
            <div className="text-sm text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
              {part.hint || <span className="text-gray-400 italic">No hint</span>}
            </div>
          )}
        </div>
      )}

      {/* Part Explanation */}
      {(part.explanation || isEditing) && (
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Explanation
          </label>
          {isEditing ? (
            <textarea
              value={part.explanation || ''}
              onChange={(e) => onUpdateField('explanation', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md min-h-[50px] text-sm dark:bg-gray-900 dark:text-white"
              placeholder="Enter explanation..."
              disabled={disabled}
            />
          ) : (
            <div className="text-sm text-gray-700 dark:text-gray-300 bg-green-50 dark:bg-green-900/20 p-2 rounded">
              {part.explanation || <span className="text-gray-400 italic">No explanation</span>}
            </div>
          )}
        </div>
      )}

      {/* Subparts */}
      {hasSubparts && (
        <div className="mt-4 space-y-3">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
            Subparts ({part.subparts.length})
          </label>
          {part.subparts.map((subpart: any, subpartIndex: number) => {
            const subpartLabel = romanNumerals[subpartIndex] || `${subpartIndex + 1}`;
            const subpartAnswerFormat = subpart.answer_format ? answerFormatConfig[subpart.answer_format] : null;
            const subpartAnswerRequirement = subpart.answer_requirement ? answerRequirementLabels[subpart.answer_requirement] : null;

            return (
              <div
                key={subpart.id || subpartIndex}
                className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-900/50"
              >
                {/* Subpart Header */}
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <h6 className="font-medium text-sm text-gray-900 dark:text-white">
                    ({subpartLabel})
                  </h6>

                  <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                    {subpart.marks} mark{subpart.marks !== 1 ? 's' : ''}
                  </span>

                  {subpartAnswerFormat && (
                    <span className={cn(
                      "px-1.5 py-0.5 text-xs font-medium rounded flex items-center gap-1",
                      `bg-${subpartAnswerFormat.color}-100 dark:bg-${subpartAnswerFormat.color}-900/30`,
                      `text-${subpartAnswerFormat.color}-700 dark:text-${subpartAnswerFormat.color}-300`
                    )}>
                      <subpartAnswerFormat.icon className="h-3 w-3" />
                      {subpartAnswerFormat.label}
                    </span>
                  )}

                  {subpartAnswerRequirement && (
                    <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                      {subpartAnswerRequirement}
                    </span>
                  )}

                  {subpart.figure && (
                    <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                      Figure Required
                    </span>
                  )}
                </div>

                {/* Subpart Text */}
                <div className="mb-2">
                  {isEditing ? (
                    <textarea
                      value={subpart.question_text || ''}
                      onChange={(e) => {
                        const updatedSubparts = [...part.subparts];
                        updatedSubparts[subpartIndex] = {
                          ...updatedSubparts[subpartIndex],
                          question_text: e.target.value
                        };
                        onUpdateField('subparts', updatedSubparts);
                      }}
                      className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs min-h-[40px] dark:bg-gray-900 dark:text-white"
                      placeholder="Enter subpart text..."
                      disabled={disabled}
                    />
                  ) : (
                    <div className="text-xs text-gray-900 dark:text-white whitespace-pre-wrap">
                      {subpart.question_text || <span className="text-gray-400 italic">No subpart text</span>}
                    </div>
                  )}
                </div>

                {/* Subpart Attachments */}
                <AttachmentDisplay
                  attachments={attachments}
                  questionId={questionId}
                  partPath={[part.id || `part_${partIndex}`, subpart.id || `subpart_${subpartIndex}`]}
                  requiresFigure={subpart.figure || false}
                  pdfDataUrl={pdfDataUrl}
                  onAttachmentUpload={() => onAttachmentUpload([
                    part.id || `part_${partIndex}`,
                    subpart.id || `subpart_${subpartIndex}`
                  ])}
                  onAttachmentDelete={onAttachmentDelete}
                  disabled={disabled}
                />

                {/* Subpart MCQ Options */}
                {subpart.question_type === 'mcq' && subpart.options && (
                  <div className="mb-2">
                    <div className="space-y-1">
                      {subpart.options.map((option: any) => {
                        const isCorrect = option.is_correct ||
                          subpart.correct_answer === option.label ||
                          subpart.correct_answers?.some((ca: any) =>
                            ca.answer === option.label || ca.answer === option.text
                          );

                        return (
                          <div
                            key={option.label}
                            className={cn(
                              "flex items-center p-1.5 rounded border text-xs",
                              isCorrect
                                ? "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700"
                                : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                            )}
                          >
                            <span className={cn(
                              "font-semibold px-1.5 py-0.5 rounded mr-1.5 text-xs",
                              isCorrect
                                ? "bg-green-200 dark:bg-green-800 text-green-700 dark:text-green-300"
                                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                            )}>
                              {option.label}
                            </span>
                            <span className="flex-1">{option.text}</span>
                            {isCorrect && <CheckCircle className="w-3 h-3 text-green-600 dark:text-green-400 ml-1" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Subpart Correct Answer */}
                <div className="mb-2">
                  <DynamicAnswerField
                    question={subpart}
                    isEditing={isEditing}
                    onUpdate={(field, value) => {
                      const updatedSubparts = [...part.subparts];
                      updatedSubparts[subpartIndex] = {
                        ...updatedSubparts[subpartIndex],
                        [field]: value
                      };
                      onUpdateField('subparts', updatedSubparts);
                    }}
                    showCorrectAnswer={true}
                  />
                </div>

                {/* Subpart Hint */}
                {(subpart.hint || isEditing) && (
                  <div className="mb-2">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Hint
                    </label>
                    {isEditing ? (
                      <textarea
                        value={subpart.hint || ''}
                        onChange={(e) => {
                          const updatedSubparts = [...part.subparts];
                          updatedSubparts[subpartIndex] = {
                            ...updatedSubparts[subpartIndex],
                            hint: e.target.value
                          };
                          onUpdateField('subparts', updatedSubparts);
                        }}
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs min-h-[30px] dark:bg-gray-900 dark:text-white"
                        placeholder="Enter hint..."
                        disabled={disabled}
                      />
                    ) : (
                      <div className="text-xs text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20 p-1.5 rounded">
                        {subpart.hint || <span className="text-gray-400 italic">No hint</span>}
                      </div>
                    )}
                  </div>
                )}

                {/* Subpart Explanation */}
                {(subpart.explanation || isEditing) && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Explanation
                    </label>
                    {isEditing ? (
                      <textarea
                        value={subpart.explanation || ''}
                        onChange={(e) => {
                          const updatedSubparts = [...part.subparts];
                          updatedSubparts[subpartIndex] = {
                            ...updatedSubparts[subpartIndex],
                            explanation: e.target.value
                          };
                          onUpdateField('subparts', updatedSubparts);
                        }}
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs min-h-[40px] dark:bg-gray-900 dark:text-white"
                        placeholder="Enter explanation..."
                        disabled={disabled}
                      />
                    ) : (
                      <div className="text-xs text-gray-700 dark:text-gray-300 bg-green-50 dark:bg-green-900/20 p-1.5 rounded">
                        {subpart.explanation || <span className="text-gray-400 italic">No explanation</span>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
