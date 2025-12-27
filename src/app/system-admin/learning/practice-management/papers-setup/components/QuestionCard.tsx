// src/app/system-admin/learning/practice-management/papers-setup/components/QuestionCard.tsx
import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Edit2,
  Save,
  X,
  Trash2,
  AlertCircle,
  CheckCircle,
  FileText,
  HelpCircle
} from 'lucide-react';
import { Button } from '../../../../../../components/shared/Button';
import { StatusBadge } from '../../../../../../components/shared/StatusBadge';
import { CorrectAnswersDisplay } from '../../../../../system-admin/learning/practice-management/questions-setup/components/CorrectAnswersDisplay';
import { cn } from '../../../../../../lib/utils';

interface CorrectAnswer {
  answer: string;
  marks?: number;
  alternative_id?: number;
  acceptable_variations?: string[];
  context?: {
    type: string;
    value: string;
    label?: string;
  };
}

interface QuestionOption {
  label: string;
  text: string;
  is_correct: boolean;
  explanation?: string;
}

interface SubQuestion {
  id: string;
  part_label: string;
  question_description: string;
  marks: number;
  answer_format?: string;
  answer_requirement?: string;
  hint?: string;
  explanation?: string;
  correct_answers?: CorrectAnswer[];
  options?: QuestionOption[];
  subparts?: any[];
  attachments?: any[];
}

interface Question {
  id: string;
  question_number: string;
  question_type: string;
  question_description: string;
  marks: number;
  difficulty?: string;
  status?: string;
  subject?: string;
  unit?: string;
  topic?: string;
  subtopic?: string;
  subtopics?: string[];
  answer_format?: string;
  answer_requirement?: string;
  total_alternatives?: number;
  hint?: string;
  explanation?: string;
  correct_answers?: CorrectAnswer[];
  options?: QuestionOption[];
  sub_questions?: SubQuestion[];
  attachments?: any[];
  exam_board?: string;
  paper_code?: string;
  year?: string | number;
}

interface QuestionCardProps {
  question: Question;
  topics?: Array<{ id: string; name: string }>;
  subtopics?: Array<{ id: string; name: string; topic_id: string }>;
  units?: Array<{ id: string; name: string }>;
  onUpdate?: (question: Question) => void;
  onDelete?: (question: Question) => void;
  onDeleteSubQuestion?: (subQuestion: SubQuestion) => void;
  readOnly?: boolean;
  showQAActions?: boolean;
}

export function QuestionCard({
  question,
  topics = [],
  subtopics = [],
  units = [],
  onUpdate,
  onDelete,
  onDeleteSubQuestion,
  readOnly = false,
  showQAActions = false
}: QuestionCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [expandedParts, setExpandedParts] = useState<Record<string, boolean>>({});

  const togglePartExpansion = (partId: string) => {
    setExpandedParts(prev => ({
      ...prev,
      [partId]: !prev[partId]
    }));
  };

  const handleUpdateCorrectAnswers = async (answers: CorrectAnswer[]) => {
    if (onUpdate) {
      onUpdate({
        ...question,
        correct_answers: answers
      });
    }
  };

  const handleUpdateSubQuestionAnswers = async (subQuestionId: string, answers: CorrectAnswer[]) => {
    if (onUpdate && question.sub_questions) {
      const updatedSubQuestions = question.sub_questions.map(sq =>
        sq.id === subQuestionId ? { ...sq, correct_answers: answers } : sq
      );
      onUpdate({
        ...question,
        sub_questions: updatedSubQuestions
      });
    }
  };

  const handleUpdateSubpartAnswers = async (
    subQuestionId: string,
    subpartId: string,
    answers: CorrectAnswer[]
  ) => {
    if (onUpdate && question.sub_questions) {
      const updatedSubQuestions = question.sub_questions.map(sq => {
        if (sq.id === subQuestionId && sq.subparts) {
          const updatedSubparts = sq.subparts.map(sp =>
            sp.id === subpartId ? { ...sp, correct_answers: answers } : sp
          );
          return { ...sq, subparts: updatedSubparts };
        }
        return sq;
      });
      onUpdate({
        ...question,
        sub_questions: updatedSubQuestions
      });
    }
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 overflow-hidden">
      {/* Question Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-5 h-5" />
              ) : (
                <ChevronRight className="w-5 h-5" />
              )}
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-2">
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  Q{question.question_number}
                </span>
                <StatusBadge status={question.question_type || 'unknown'} size="sm" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  [{question.marks || 0} {question.marks === 1 ? 'mark' : 'marks'}]
                </span>
                {question.difficulty && (
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full",
                    question.difficulty === 'easy' && "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
                    question.difficulty === 'medium' && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
                    question.difficulty === 'hard' && "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                  )}>
                    {question.difficulty}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                {question.question_description}
              </p>
            </div>
          </div>

          {!readOnly && onDelete && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(question)}
              className="text-red-500 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Question Details (Expanded) */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Question Description */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Question</h4>
            <div className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
              {question.question_description}
            </div>
          </div>

          {/* Metadata */}
          {(question.topic || question.unit) && (
            <div className="flex flex-wrap gap-2 text-sm">
              {question.unit && (
                <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                  Unit: {question.unit}
                </span>
              )}
              {question.topic && (
                <span className="px-2 py-1 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                  Topic: {question.topic}
                </span>
              )}
              {question.subtopic && (
                <span className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded">
                  Subtopic: {question.subtopic}
                </span>
              )}
            </div>
          )}

          {/* Answer Format & Requirement */}
          {(question.answer_format || question.answer_requirement) && (
            <div className="grid grid-cols-2 gap-3">
              {question.answer_format && (
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    Answer Format
                  </label>
                  <div className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                    {question.answer_format}
                  </div>
                </div>
              )}
              {question.answer_requirement && (
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    Answer Requirement
                  </label>
                  <div className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                    {question.answer_requirement}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Correct Answers with Acceptable Variations Support */}
          {question.correct_answers && question.correct_answers.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Correct Answers
              </h4>
              <CorrectAnswersDisplay
                correctAnswers={question.correct_answers}
                answerFormat={question.answer_format}
                answerRequirement={question.answer_requirement}
                totalAlternatives={question.total_alternatives}
                questionType={question.question_type}
                readOnly={readOnly}
                onUpdate={handleUpdateCorrectAnswers}
              />
            </div>
          )}

          {/* MCQ Options */}
          {question.options && question.options.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Options</h4>
              <div className="space-y-2">
                {question.options.map((option, index) => (
                  <div
                    key={index}
                    className={cn(
                      "p-3 rounded-lg border",
                      option.is_correct
                        ? "border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20"
                        : "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50"
                    )}
                  >
                    <div className="flex items-start space-x-2">
                      {option.is_correct && (
                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {option.label}:
                        </span>{' '}
                        <span className="text-gray-900 dark:text-gray-100">{option.text}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hint */}
          {question.hint && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <HelpCircle className="h-4 w-4" />
                Hint
              </h4>
              <div className="text-sm text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                {question.hint}
              </div>
            </div>
          )}

          {/* Explanation */}
          {question.explanation && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Explanation
              </h4>
              <div className="text-sm text-gray-700 dark:text-gray-300 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                {question.explanation}
              </div>
            </div>
          )}

          {/* Sub-Questions (Parts) */}
          {question.sub_questions && question.sub_questions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Question Parts ({question.sub_questions.length})
              </h4>
              <div className="space-y-3">
                {question.sub_questions.map((part, partIndex) => {
                  const isPartExpanded = expandedParts[part.id] !== false;

                  return (
                    <div
                      key={part.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50 overflow-hidden"
                    >
                      {/* Part Header */}
                      <div className="p-3 flex items-center justify-between bg-gray-100 dark:bg-gray-800">
                        <button
                          onClick={() => togglePartExpansion(part.id)}
                          className="flex items-center space-x-2 flex-1 text-left"
                        >
                          {isPartExpanded ? (
                            <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          )}
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            Part {part.part_label}
                          </span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            [{part.marks} {part.marks === 1 ? 'mark' : 'marks'}]
                          </span>
                        </button>
                        {!readOnly && onDeleteSubQuestion && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onDeleteSubQuestion(part)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>

                      {/* Part Details */}
                      {isPartExpanded && (
                        <div className="p-3 space-y-3">
                          <div className="text-sm text-gray-900 dark:text-gray-100">
                            {part.question_description}
                          </div>

                          {/* Part Answer Format & Requirement */}
                          {(part.answer_format || part.answer_requirement) && (
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              {part.answer_format && (
                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">Format:</span>{' '}
                                  <span className="text-gray-900 dark:text-gray-100">
                                    {part.answer_format}
                                  </span>
                                </div>
                              )}
                              {part.answer_requirement && (
                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">
                                    Requirement:
                                  </span>{' '}
                                  <span className="text-gray-900 dark:text-gray-100">
                                    {part.answer_requirement}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Part Correct Answers with Acceptable Variations */}
                          {part.correct_answers && part.correct_answers.length > 0 && (
                            <CorrectAnswersDisplay
                              correctAnswers={part.correct_answers}
                              answerFormat={part.answer_format}
                              answerRequirement={part.answer_requirement}
                              questionType="descriptive"
                              readOnly={readOnly}
                              onUpdate={(answers) => handleUpdateSubQuestionAnswers(part.id, answers)}
                            />
                          )}

                          {/* Part Options (if MCQ) */}
                          {part.options && part.options.length > 0 && (
                            <div className="space-y-2">
                              {part.options.map((option, optIndex) => (
                                <div
                                  key={optIndex}
                                  className={cn(
                                    "p-2 rounded text-sm",
                                    option.is_correct
                                      ? "bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-100"
                                      : "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                                  )}
                                >
                                  <span className="font-medium">{option.label}:</span> {option.text}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Part Hint */}
                          {part.hint && (
                            <div className="text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                              <strong>Hint:</strong> {part.hint}
                            </div>
                          )}

                          {/* Part Explanation */}
                          {part.explanation && (
                            <div className="text-xs text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 p-2 rounded">
                              <strong>Explanation:</strong> {part.explanation}
                            </div>
                          )}

                          {/* Subparts */}
                          {part.subparts && part.subparts.length > 0 && (
                            <div className="ml-4 space-y-2">
                              <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                Subparts ({part.subparts.length})
                              </h5>
                              {part.subparts.map((subpart: any, subIndex: number) => (
                                <div
                                  key={subpart.id}
                                  className="border border-gray-200 dark:border-gray-700 rounded p-2 bg-white dark:bg-gray-900"
                                >
                                  <div className="text-xs font-medium text-gray-900 dark:text-gray-100 mb-1">
                                    Subpart {subpart.part_label} [{subpart.marks} marks]
                                  </div>
                                  <div className="text-xs text-gray-700 dark:text-gray-300">
                                    {subpart.question_description}
                                  </div>
                                  {subpart.correct_answers && subpart.correct_answers.length > 0 && (
                                    <div className="mt-2">
                                      <CorrectAnswersDisplay
                                        correctAnswers={subpart.correct_answers}
                                        answerFormat={subpart.answer_format}
                                        answerRequirement={subpart.answer_requirement}
                                        questionType="descriptive"
                                        readOnly={readOnly}
                                        onUpdate={(answers) =>
                                          handleUpdateSubpartAnswers(part.id, subpart.id, answers)
                                        }
                                      />
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Attachments */}
          {question.attachments && question.attachments.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Attachments ({question.attachments.length})
              </h4>
              <div className="space-y-2">
                {question.attachments.map((attachment, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded"
                  >
                    <FileText className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {attachment.file_name || `Attachment ${index + 1}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
