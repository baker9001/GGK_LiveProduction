import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Check, AlertCircle, FileText, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import DynamicAnswerField from './DynamicAnswerField';
import { shouldShowAnswerInput } from '@/lib/helpers/answerExpectationHelpers';
import {
  ComplexQuestionDisplay as ComplexQuestionType,
  ComplexQuestionPartDisplay,
  ComplexQuestionSubpartDisplay,
  ComplexQuestionAnswer,
  ComplexPartAnswer,
  ComplexSubpartAnswer
} from '@/types/questions';

interface ComplexQuestionDisplayProps {
  question: ComplexQuestionType;
  value?: ComplexQuestionAnswer;
  onChange?: (value: ComplexQuestionAnswer) => void;
  mode?: 'practice' | 'exam' | 'review' | 'admin' | 'qa_preview';
  showHints?: boolean;
  showCorrectAnswers?: boolean;
  disabled?: boolean;
}

const ComplexQuestionDisplay: React.FC<ComplexQuestionDisplayProps> = ({
  question,
  value,
  onChange,
  mode = 'practice',
  showHints = false,
  showCorrectAnswers = false,
  disabled = false
}) => {
  const [expandedParts, setExpandedParts] = useState<Set<string>>(new Set());
  const [expandedSubparts, setExpandedSubparts] = useState<Set<string>>(new Set());

  const togglePart = (partId: string) => {
    setExpandedParts(prev => {
      const next = new Set(prev);
      if (next.has(partId)) {
        next.delete(partId);
      } else {
        next.add(partId);
      }
      return next;
    });
  };

  const toggleSubpart = (subpartId: string) => {
    setExpandedSubparts(prev => {
      const next = new Set(prev);
      if (next.has(subpartId)) {
        next.delete(subpartId);
      } else {
        next.add(subpartId);
      }
      return next;
    });
  };

  const handlePartAnswerChange = (partId: string, partLabel: string, answer: any, subparts?: ComplexSubpartAnswer[]) => {
    if (!onChange) return;

    const currentParts = value?.parts || [];
    const existingPartIndex = currentParts.findIndex(p => p.part_id === partId);

    let updatedParts: ComplexPartAnswer[];
    if (existingPartIndex >= 0) {
      updatedParts = [...currentParts];
      updatedParts[existingPartIndex] = {
        ...updatedParts[existingPartIndex],
        answer,
        subparts: subparts || updatedParts[existingPartIndex].subparts
      };
    } else {
      updatedParts = [...currentParts, {
        part_id: partId,
        part_label: partLabel,
        answer,
        subparts
      }];
    }

    onChange({
      question_id: question.id,
      parts: updatedParts
    });
  };

  const handleSubpartAnswerChange = (partId: string, partLabel: string, subpartId: string, subpartLabel: string, answer: any) => {
    if (!onChange) return;

    const currentParts = value?.parts || [];
    const existingPartIndex = currentParts.findIndex(p => p.part_id === partId);

    let updatedParts: ComplexPartAnswer[];
    if (existingPartIndex >= 0) {
      const currentPart = currentParts[existingPartIndex];
      const currentSubparts = currentPart.subparts || [];
      const existingSubpartIndex = currentSubparts.findIndex(s => s.subpart_id === subpartId);

      let updatedSubparts: ComplexSubpartAnswer[];
      if (existingSubpartIndex >= 0) {
        updatedSubparts = [...currentSubparts];
        updatedSubparts[existingSubpartIndex] = {
          ...updatedSubparts[existingSubpartIndex],
          answer
        };
      } else {
        updatedSubparts = [...currentSubparts, {
          subpart_id: subpartId,
          subpart_label: subpartLabel,
          answer
        }];
      }

      updatedParts = [...currentParts];
      updatedParts[existingPartIndex] = {
        ...updatedParts[existingPartIndex],
        subparts: updatedSubparts
      };
    } else {
      updatedParts = [...currentParts, {
        part_id: partId,
        part_label: partLabel,
        subparts: [{
          subpart_id: subpartId,
          subpart_label: subpartLabel,
          answer
        }]
      }];
    }

    onChange({
      question_id: question.id,
      parts: updatedParts
    });
  };

  const getPartAnswer = (partId: string) => {
    return value?.parts?.find(p => p.part_id === partId);
  };

  const getSubpartAnswer = (partId: string, subpartId: string) => {
    const partAnswer = getPartAnswer(partId);
    return partAnswer?.subparts?.find(s => s.subpart_id === subpartId);
  };

  const renderAttachments = (attachments?: any[]) => {
    if (!attachments || attachments.length === 0) return null;

    return (
      <div className="mt-2 flex flex-wrap gap-2">
        {attachments.map((attachment, idx) => (
          <div
            key={idx}
            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded text-xs"
          >
            <ImageIcon className="w-3 h-3" />
            <span>{attachment.description || attachment.file_name || `Attachment ${idx + 1}`}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderSubpart = (part: ComplexQuestionPartDisplay, subpart: ComplexQuestionSubpartDisplay, subpartIndex: number) => {
    const isExpanded = expandedSubparts.has(subpart.id);
    const subpartAnswer = getSubpartAnswer(part.id, subpart.id);

    // Subparts always require answers
    const showAnswer = shouldShowAnswerInput(subpart, { level: 3 });

    return (
      <div key={subpart.id} className="ml-8 mb-4 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
        <div className="mb-2">
          <button
            onClick={() => toggleSubpart(subpart.id)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            <span className="font-mono text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
              {subpart.subpart_label}
            </span>
            <span className="flex-1">{subpart.question_text}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              ({subpart.marks} {subpart.marks === 1 ? 'mark' : 'marks'})
            </span>
          </button>

          {subpart.figure && renderAttachments(subpart.attachments)}
        </div>

        {isExpanded && (
          <div className="mt-3 space-y-3">
            {/* Answer format indicator - only show if answer is expected */}
            {showAnswer && subpart.answer_format && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Answer format: <span className="font-medium">{subpart.answer_format.replace(/_/g, ' ')}</span>
              </div>
            )}

            {/* Answer input field - only show if answer is expected */}
            {showAnswer && (
              <DynamicAnswerField
              question={{
                id: subpart.id,
                type: subpart.type || 'descriptive', // Use actual type from data
                answer_format: subpart.answer_format,
                answer_requirement: subpart.answer_requirement,
                correct_answers: subpart.correct_answers,
                marks: subpart.marks,
                figure: subpart.figure,
                attachments: subpart.attachments?.map(a => a.description || a.file_name)
              }}
              value={subpartAnswer?.answer}
              onChange={(answer) => handleSubpartAnswerChange(part.id, part.part_label, subpart.id, subpart.subpart_label, answer)}
              mode={mode}
              showHints={showHints}
              showCorrectAnswer={showCorrectAnswers}
              disabled={disabled}
            />
            )}

            {/* Hint */}
            {showHints && subpart.hint && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-1">Hint:</p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-400">{subpart.hint}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Explanation (only in review mode) */}
            {mode === 'review' && subpart.explanation && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-1">Explanation:</p>
                    <p className="text-sm text-green-700 dark:text-green-400">{subpart.explanation}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderPart = (part: ComplexQuestionPartDisplay, partIndex: number) => {
    const isExpanded = expandedParts.has(part.id);
    const partAnswer = getPartAnswer(part.id);
    const hasSubparts = part.subparts && part.subparts.length > 0;

    // Check if this part expects a direct answer
    const showAnswer = shouldShowAnswerInput(part, { hasSubparts, level: 2 });

    return (
      <div key={part.id} className="mb-6 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="bg-gray-50 dark:bg-gray-900/50 p-4">
          <button
            onClick={() => togglePart(part.id)}
            className="w-full flex items-center gap-3 text-left"
          >
            {isExpanded ? (
              <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            )}
            <span className="font-mono text-sm px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded font-medium">
              Part {part.part_label.toUpperCase()}
            </span>
            <span className="flex-1 font-medium text-gray-900 dark:text-gray-100">
              {part.question_text}
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              ({part.marks} {part.marks === 1 ? 'mark' : 'marks'})
            </span>
          </button>

          {part.figure && renderAttachments(part.attachments)}
        </div>

        {isExpanded && (
          <div className="p-4 space-y-4">
            {/* If part expects an answer, show answer input */}
            {showAnswer && (
              <>
                {/* Answer format indicator */}
                {part.answer_format && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Answer format: <span className="font-medium">{part.answer_format.replace(/_/g, ' ')}</span>
                  </div>
                )}

                {/* Answer input field */}
                <DynamicAnswerField
                  question={{
                    id: part.id,
                    type: part.type || 'descriptive', // Use actual type from data
                    answer_format: part.answer_format,
                    answer_requirement: part.answer_requirement,
                    correct_answers: part.correct_answers,
                    marks: part.marks,
                    figure: part.figure,
                    attachments: part.attachments?.map(a => a.description || a.file_name)
                  }}
                  value={partAnswer?.answer}
                  onChange={(answer) => handlePartAnswerChange(part.id, part.part_label, answer)}
                  mode={mode}
                  showHints={showHints}
                  showCorrectAnswer={showCorrectAnswers}
                  disabled={disabled}
                />

                {/* Hint */}
                {showHints && part.hint && (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-1">Hint:</p>
                        <p className="text-sm text-yellow-700 dark:text-yellow-400">{part.hint}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Explanation (only in review mode) */}
                {mode === 'review' && part.explanation && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                    <div className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-1">Explanation:</p>
                        <p className="text-sm text-green-700 dark:text-green-400">{part.explanation}</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Render subparts if they exist */}
            {hasSubparts && (
              <div className="space-y-3">
                {part.subparts!.map((subpart, subpartIndex) =>
                  renderSubpart(part, subpart, subpartIndex)
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Question header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <span className="font-mono text-lg font-bold text-gray-900 dark:text-gray-100">
            Question {question.question_number}
          </span>
          <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs font-medium">
            Complex
          </span>
          {question.difficulty && (
            <span className={cn(
              "px-2 py-1 rounded text-xs font-medium",
              question.difficulty === 'Easy' && "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
              question.difficulty === 'Medium' && "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300",
              question.difficulty === 'Hard' && "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
            )}>
              {question.difficulty}
            </span>
          )}
        </div>
        <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
          Total: {question.marks} marks
        </div>
      </div>

      {/* Main question text */}
      {question.question_text && (
        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          <p className="text-gray-900 dark:text-gray-100">{question.question_text}</p>
          {question.figure && renderAttachments(question.attachments)}

          {/* Show contextual indicator if applicable */}
          {question.is_contextual_only && (
            <div className="mt-2 flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
              <AlertCircle className="w-3 h-3" />
              <span>This is contextual text - answers are expected in the parts below</span>
            </div>
          )}
        </div>
      )}

      {/* Topic information */}
      {(question.topic_name || question.subtopic_names) && (
        <div className="flex flex-wrap gap-2 text-xs">
          {question.topic_name && (
            <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded">
              {question.topic_name}
            </span>
          )}
          {question.subtopic_names?.map((subtopic, idx) => (
            <span key={idx} className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded">
              {subtopic}
            </span>
          ))}
        </div>
      )}

      {/* Parts */}
      <div className="space-y-4">
        {question.parts?.map((part, partIndex) => renderPart(part, partIndex))}
      </div>

      {/* Question-level hint (if any) */}
      {showHints && question.hint && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-1">Hint:</p>
              <p className="text-sm text-yellow-700 dark:text-yellow-400">{question.hint}</p>
            </div>
          </div>
        </div>
      )}

      {/* Question-level explanation (only in review mode) */}
      {mode === 'review' && question.explanation && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
          <div className="flex items-start gap-2">
            <FileText className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-1">Explanation:</p>
              <p className="text-sm text-green-700 dark:text-green-400">{question.explanation}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplexQuestionDisplay;
