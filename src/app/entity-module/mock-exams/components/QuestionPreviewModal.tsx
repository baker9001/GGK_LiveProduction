'use client';

import React, { useState, useEffect } from 'react';
import { X, FileText, Tag, Calendar, BookOpen, Eye, AlertCircle, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button, IconButton } from '../../../../components/shared/Button';
import type { QuestionBankItem } from '../../../../services/mockExamService';
import { supabase } from '../../../../lib/supabase';
import { toast } from '../../../../components/shared/Toast';

interface QuestionPreviewModalProps {
  question: QuestionBankItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function QuestionPreviewModal({ question, isOpen, onClose }: QuestionPreviewModalProps) {
  const [fullQuestion, setFullQuestion] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [expandedParts, setExpandedParts] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen && question) {
      fetchFullQuestionData();
    }
  }, [isOpen, question]);

  const fetchFullQuestionData = async () => {
    if (!question?.id) return;

    setIsLoading(true);
    try {
      // Fetch main question with attachments
      const { data, error } = await supabase
        .from('questions_master_admin')
        .select(`
          *,
          questions_attachments (
            id,
            file_url,
            file_name,
            file_type,
            file_size,
            created_at
          ),
          question_options (
            id,
            option_text,
            is_correct,
            order
          ),
          questions_hints (
            id,
            hint_text
          ),
          edu_topics:topic_id (
            id,
            name
          ),
          edu_subtopics:subtopic_id (
            id,
            name
          ),
          data_structures:data_structure_id (
            providers:provider_id (name),
            programs:program_id (name),
            edu_subjects:subject_id (name)
          ),
          question_correct_answers (
            id,
            answer,
            marks
          )
        `)
        .eq('id', question.id)
        .maybeSingle();

      if (error) {
        console.error('Supabase error fetching question:', error);
        throw error;
      }

      if (!data) {
        throw new Error('Question not found');
      }

      // Fetch sub-questions with their attachments
      const { data: subQuestions, error: subError } = await supabase
        .from('sub_questions')
        .select(`
          id,
          question_id,
          parent_id,
          sub_question_number,
          description,
          marks,
          type,
          level
        `)
        .eq('question_id', question.id)
        .order('sub_question_number', { ascending: true });

      if (subError) {
        console.error('Error fetching sub-questions:', subError);
      }

      // Fetch attachments for all sub-questions if any exist
      let subQuestionAttachments: any[] = [];
      if (subQuestions && subQuestions.length > 0) {
        const subQuestionIds = subQuestions.map(sq => sq.id);
        const { data: sqAttachments, error: sqAttError } = await supabase
          .from('questions_attachments')
          .select('*')
          .in('sub_question_id', subQuestionIds);

        if (!sqAttError && sqAttachments) {
          subQuestionAttachments = sqAttachments;
        }
      }

      // Build hierarchical sub-questions structure with attachments
      const subQuestionsWithAttachments = (subQuestions || []).map((sq: any) => ({
        ...sq,
        attachments: subQuestionAttachments.filter(att => att.sub_question_id === sq.id)
      }));

      setFullQuestion({
        ...data,
        board_name: data.data_structures?.providers?.name,
        programme_name: data.data_structures?.programs?.name,
        subject_name: data.data_structures?.edu_subjects?.name,
        topic_name: data.edu_topics?.name,
        subtopic_name: data.edu_subtopics?.name,
        exam_year: data.year,
        sub_questions: subQuestionsWithAttachments
      });
      setAttachments(data?.questions_attachments || []);
    } catch (error: any) {
      console.error('Error fetching full question data:', error);
      const message = error?.message || 'Failed to load complete question details';
      toast.error(message);
      setFullQuestion(question);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !question) return null;

  // Always use fullQuestion to ensure complete data - show loading until available
  const displayQuestion = fullQuestion;

  const renderOptions = () => {
    const options = displayQuestion.question_options || displayQuestion.options || [];
    if (options.length === 0) return null;

    return (
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Answer Options</h4>
        <div className="space-y-2">
          {options.map((option: any, index: number) => (
            <div
              key={index}
              className={`rounded-lg border p-3 ${
                option.is_correct
                  ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                  : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                  {String.fromCharCode(65 + index)}
                </span>
                <div className="flex-1">
                  <p className="text-sm text-gray-900 dark:text-gray-100">{option.option_text || option.text}</p>
                  {option.is_correct && (
                    <p className="mt-1 text-xs font-medium text-green-600 dark:text-green-400">Correct Answer</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderAttachments = (attachmentsList: any[] = []) => {
    if (attachmentsList.length === 0) return null;

    return (
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Attachments</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {attachmentsList.map((attachment: any, index: number) => (
            <div
              key={index}
              className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 overflow-hidden"
            >
              {attachment.file_type?.startsWith('image/') ? (
                <div className="relative group">
                  <img
                    src={attachment.file_url || attachment.url}
                    alt="Question attachment"
                    className="w-full h-auto object-contain bg-gray-50 dark:bg-gray-900"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      const parent = (e.target as HTMLImageElement).parentElement;
                      if (parent) {
                        parent.innerHTML = '<div class="flex items-center justify-center h-32 bg-gray-100 dark:bg-gray-800"><span class="text-gray-400">Image failed to load</span></div>';
                      }
                    }}
                  />
                  <button
                    onClick={() => window.open(attachment.file_url || attachment.url, '_blank')}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-gray-800 p-2 rounded-lg shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="View full size"
                  >
                    <Eye className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center h-32 bg-gray-50 dark:bg-gray-900">
                  <FileText className="h-8 w-8 text-gray-400" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 px-4 py-6 overflow-y-auto">
      <div className="w-full max-w-7xl rounded-2xl bg-white shadow-2xl dark:bg-gray-900 my-6 max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between border-b border-gray-200 p-6 dark:border-gray-800">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Question Preview</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Review full question details before adding to exam
            </p>
          </div>
          <IconButton
            variant="ghost"
            size="icon"
            aria-label="Close preview"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </IconButton>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
          {!displayQuestion || isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-[#8CC63F]" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading complete question data...</p>
            </div>
          ) : (
          <>
          <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-5 dark:border-gray-800 dark:bg-gray-900/50">
            <div className="mb-4 flex flex-wrap items-center gap-3 text-xs">
              {displayQuestion.question_number && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                  <Tag className="h-3 w-3" />
                  Q{displayQuestion.question_number}
                </span>
              )}
              {displayQuestion.exam_year && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                  <Calendar className="h-3 w-3" />
                  {displayQuestion.exam_year}
                </span>
              )}
              {displayQuestion.marks !== null && displayQuestion.marks !== undefined && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
                  {displayQuestion.marks} mark{displayQuestion.marks === 1 ? '' : 's'}
                </span>
              )}
              {(displayQuestion.difficulty_level || displayQuestion.difficulty) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-1 font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                  {displayQuestion.difficulty_level || displayQuestion.difficulty}
                </span>
              )}
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              {displayQuestion.board_name && <span>{displayQuestion.board_name}</span>}
              {displayQuestion.programme_name && (
                <>
                  <span>•</span>
                  <span>{displayQuestion.programme_name}</span>
                </>
              )}
              {displayQuestion.subject_name && (
                <>
                  <span>•</span>
                  <span>{displayQuestion.subject_name}</span>
                </>
              )}
            </div>

            {(displayQuestion.edu_topics?.name || displayQuestion.topic_name || displayQuestion.question_subtopics?.length > 0 || displayQuestion.subtopic_name || displayQuestion.concept_name) && (
              <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
                {(displayQuestion.edu_topics?.name || displayQuestion.topic_name) && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-gray-700 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700">
                    <BookOpen className="h-3 w-3" />
                    {displayQuestion.edu_topics?.name || displayQuestion.topic_name}
                  </span>
                )}
                {displayQuestion.question_subtopics && displayQuestion.question_subtopics.length > 0 && displayQuestion.question_subtopics.map((qs: any, idx: number) => (
                  <React.Fragment key={idx}>
                    <span className="text-gray-400">›</span>
                    <span className="rounded-md bg-white px-2 py-1 text-gray-700 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700">
                      {qs.edu_subtopics?.name}
                    </span>
                  </React.Fragment>
                ))}
                {!displayQuestion.question_subtopics && displayQuestion.subtopic_name && (
                  <>
                    <span className="text-gray-400">›</span>
                    <span className="rounded-md bg-white px-2 py-1 text-gray-700 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700">
                      {displayQuestion.subtopic_name}
                    </span>
                  </>
                )}
                {displayQuestion.concept_name && (
                  <>
                    <span className="text-gray-400">›</span>
                    <span className="rounded-md bg-white px-2 py-1 text-gray-700 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700">
                      {displayQuestion.concept_name}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Question Description</h4>
            <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
              <div className="text-base leading-relaxed text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words w-full">
                {displayQuestion.question_description || displayQuestion.question_text || displayQuestion.description || displayQuestion.text || 'No description available'}
              </div>
            </div>
          </div>

          {/* Sub-questions/Parts - Hierarchical Display */}
          {displayQuestion.sub_questions && displayQuestion.sub_questions.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Question Parts ({displayQuestion.sub_questions.length})
                </h4>
                {displayQuestion.sub_questions.length > 3 && (
                  <button
                    onClick={() => {
                      if (expandedParts.size === 0) {
                        setExpandedParts(new Set(displayQuestion.sub_questions.map((sq: any) => sq.id)));
                      } else {
                        setExpandedParts(new Set());
                      }
                    }}
                    className="text-xs text-[#8CC63F] hover:text-[#7AB635] font-medium"
                  >
                    {expandedParts.size === 0 ? 'Expand All' : 'Collapse All'}
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {displayQuestion.sub_questions.map((subQ: any, index: number) => {
                  const isExpanded = expandedParts.has(subQ.id);
                  const hasAttachments = subQ.attachments && subQ.attachments.length > 0;
                  const indent = (subQ.level - 1) * 20;

                  return (
                    <div
                      key={subQ.id || index}
                      className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 overflow-hidden"
                      style={{ marginLeft: `${indent}px` }}
                    >
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-[#8CC63F] text-white text-xs font-semibold flex-shrink-0">
                            {subQ.sub_question_number || String.fromCharCode(97 + index)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <p className={`text-sm text-gray-900 dark:text-gray-100 ${!isExpanded && (subQ.description?.length > 100 || hasAttachments) ? 'line-clamp-2' : ''}`}>
                                {subQ.description || 'No description'}
                              </p>
                              {(subQ.description?.length > 100 || hasAttachments) && (
                                <button
                                  onClick={() => {
                                    const newExpanded = new Set(expandedParts);
                                    if (isExpanded) {
                                      newExpanded.delete(subQ.id);
                                    } else {
                                      newExpanded.add(subQ.id);
                                    }
                                    setExpandedParts(newExpanded);
                                  }}
                                  className="text-xs text-[#8CC63F] hover:text-[#7AB635] font-medium whitespace-nowrap flex-shrink-0"
                                >
                                  {isExpanded ? 'Show Less' : 'View'}
                                </button>
                              )}
                            </div>
                            <div className="flex items-center gap-3 flex-wrap">
                              {subQ.marks !== null && (
                                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                                  <span className="font-semibold">{subQ.marks}</span>
                                  <span>mark{subQ.marks !== 1 ? 's' : ''}</span>
                                </span>
                              )}
                              {subQ.type && (
                                <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                  {subQ.type}
                                </span>
                              )}
                              {hasAttachments && (
                                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                                  <ImageIcon className="h-3 w-3" />
                                  {subQ.attachments.length} attachment{subQ.attachments.length !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>

                            {isExpanded && hasAttachments && (
                              <div className="mt-4">
                                {renderAttachments(subQ.attachments)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {renderOptions()}

          {(displayQuestion.hint_text || displayQuestion.hint || displayQuestion.questions_hints?.[0]?.hint_text) && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Hint</h4>
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                  {displayQuestion.hint_text || displayQuestion.hint || displayQuestion.questions_hints?.[0]?.hint_text}
                </p>
              </div>
            </div>
          )}

          {(displayQuestion.explanation_text || displayQuestion.explanation) && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Explanation</h4>
              <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                  {displayQuestion.explanation_text || displayQuestion.explanation}
                </p>
              </div>
            </div>
          )}

          {renderAttachments(attachments)}

          {question.tags && question.tags.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {question.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  >
                    <Tag className="h-3 w-3" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {(!displayQuestion.question_description && !displayQuestion.options?.length && !displayQuestion.explanation_text) && (
            <div className="flex items-center gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                This question has limited information. Consider adding more details before using it in an exam.
              </p>
            </div>
          )}
          </>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-200 p-6 dark:border-gray-800">
          <Button variant="default" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
