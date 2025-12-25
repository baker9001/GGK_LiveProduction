// src/app/system-admin/learning/practice-management/questions-setup/components/PaperCard.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Play,
  CheckCircle as CircleCheck,
  CheckCircle,
  AlertCircle,
  PlayCircle,
  CheckSquare,
  MoreVertical,
  Download,
  Wand2,
  RefreshCw,
  Square,
  Archive,
  Trash2
} from 'lucide-react';
import { Button } from '../../../../../../components/shared/Button';
import { StatusBadge } from '../../../../../../components/shared/StatusBadge';
import { QuestionCard } from './QuestionCard';
import { cn } from '../../../../../../lib/utils';
import { GroupedPaper, Question, SubQuestion } from '../page';
import { getPaperStatusLabel, getQuestionStatusLabel, questionNeedsAttachment, naturalSort } from '../utils/questionHelpers';
import { useQuestionValidation } from '../hooks/useQuestionValidation';
import { useQuestionMutations } from '../hooks/useQuestionMutations';
import { useQuestionBatchOperations } from '../hooks/useQuestionBatchOperations';
import { toast } from '../../../../../../components/shared/Toast';
import { FullPageQuestionReview } from './FullPageQuestionReview';
import { supabase } from '../../../../../../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';

interface PaperCardProps {
  paper: GroupedPaper;
  topics: { id: string; name: string }[];
  subtopics: { id: string; name: string; topic_id: string }[];
  units?: { id: string; name: string }[];
  onDeleteQuestion: (question: Question) => void;
  onDeleteSubQuestion: (subQuestion: SubQuestion) => void;
  onStartTestMode?: () => void;
  onStartSimulation?: () => void;
  showQAActions?: boolean;
  readOnly?: boolean;
}

export function PaperCard({ 
  paper, 
  topics,
  subtopics,
  units = [],
  onDeleteQuestion,
  onDeleteSubQuestion,
  onStartTestMode,
  onStartSimulation,
  showQAActions = false,
  readOnly = false
}: PaperCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [showBatchActions, setShowBatchActions] = useState(false);
  const [isAutoFillingAll, setIsAutoFillingAll] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const [showFullPageReview, setShowFullPageReview] = useState(false);
  const [isArchiveConfirmationActive, setIsArchiveConfirmationActive] = useState(false);
  const archiveConfirmationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const queryClient = useQueryClient();
  const { getValidationSummary, canConfirmPaper, validateForConfirmation } = useQuestionValidation();
  const {
    confirmQuestion,
    confirmPaper,
    updateSubtopics,
    updatePaperStatus
  } = useQuestionMutations();
  const { batchConfirmQuestions, autoAssignDifficulty } = useQuestionBatchOperations();
  
  // Close status dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setShowStatusDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Add keyboard shortcuts for selection (only when expanded and QA mode)
  useEffect(() => {
    if (!expanded || !showQAActions) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + A to select all questions
      if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
        event.preventDefault();
        handleSelectAll();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [expanded, showQAActions, selectedQuestions.size, paper.questions.length]);

  useEffect(() => {
    return () => {
      if (archiveConfirmationTimeoutRef.current) {
        clearTimeout(archiveConfirmationTimeoutRef.current);
      }
    };
  }, []);

  // Count questions by status
  const qaReviewCount = paper.questions.filter(q => q.status === 'qa_review').length;
  const confirmedCount = paper.questions.filter(q => q.status === 'active').length;
  const allConfirmed = qaReviewCount === 0 && paper.questions.length > 0;
  const isFullyConfirmed = paper.status === 'active' && allConfirmed;
  
  // Count questions needing subtopics
  const questionsNeedingSubtopics = paper.questions.filter(q => 
    q.topic_id && (!q.subtopics || q.subtopics.length === 0)
  ).length;
  
  // Get validation summary
  const validationSummary = getValidationSummary(paper.questions);
  const canConfirm = canConfirmPaper(paper.questions);

  // Check if any questions need attachments
  const questionsNeedingAttachments = paper.questions.filter(questionNeedsAttachment);

  const hasQuestionsNeedingAttachments = questionsNeedingAttachments.length > 0;

  const totalQuestions = paper.questions.length;
  const completionPercentage = totalQuestions > 0
    ? Math.round((confirmedCount / totalQuestions) * 100)
    : 0;

  const paperChecklist = [
    {
      label: 'All questions confirmed',
      complete: confirmedCount === totalQuestions && totalQuestions > 0
    },
    {
      label: 'No validation issues',
      complete: validationSummary.invalidQuestions === 0
    },
    {
      label: 'Attachments in place',
      complete: !hasQuestionsNeedingAttachments
    }
  ];

  const readyToPublish =
    paper.status === 'qa_review' && paperChecklist.every(item => item.complete) && canConfirm;
  
  // Selection handlers
  const handleSelectAll = () => {
    if (selectedQuestions.size === paper.questions.length) {
      setSelectedQuestions(new Set());
    } else {
      setSelectedQuestions(new Set(paper.questions.map(q => q.id)));
    }
  };
  
  const handleSelectQuestion = (questionId: string) => {
    const newSelection = new Set(selectedQuestions);
    if (newSelection.has(questionId)) {
      newSelection.delete(questionId);
    } else {
      newSelection.add(questionId);
    }
    setSelectedQuestions(newSelection);
  };
  
  const handleBatchConfirm = async () => {
    // Get all selected questions that are not already confirmed
    const selectedQuestionsList = paper.questions.filter(q => selectedQuestions.has(q.id));
    const alreadyConfirmed = selectedQuestionsList.filter(q => q.status === 'active');
    const eligibleForConfirm = selectedQuestionsList.filter(q => ['draft', 'qa_review'].includes(q.status));

    // Validate eligible questions
    const validQuestions: typeof eligibleForConfirm = [];
    const invalidQuestions: typeof eligibleForConfirm = [];

    eligibleForConfirm.forEach(q => {
      const validation = validateForConfirmation(q);
      if (validation.isValid) {
        validQuestions.push(q);
      } else {
        invalidQuestions.push(q);
      }
    });

    // Show appropriate error messages
    if (validQuestions.length === 0) {
      if (alreadyConfirmed.length === selectedQuestionsList.length) {
        toast.error(`All ${selectedQuestionsList.length} selected question${selectedQuestionsList.length > 1 ? 's are' : ' is'} already confirmed`);
      } else if (invalidQuestions.length > 0) {
        toast.error(
          `No valid questions to confirm. ${invalidQuestions.length} question${invalidQuestions.length > 1 ? 's need' : ' needs'} attention (missing required fields or attachments)`
        );
      } else {
        toast.error('No valid questions selected for confirmation');
      }
      return;
    }

    // Confirm valid questions
    await batchConfirmQuestions.mutateAsync({
      questionIds: validQuestions.map(q => q.id),
      paperId: paper.id
    });

    // Show detailed success message
    let message = `${validQuestions.length} question${validQuestions.length > 1 ? 's' : ''} confirmed successfully`;
    if (alreadyConfirmed.length > 0) {
      message += ` (${alreadyConfirmed.length} already confirmed)`;
    }
    if (invalidQuestions.length > 0) {
      message += ` (${invalidQuestions.length} need attention)`;
      toast.success(message);
      toast.error(
        `${invalidQuestions.length} question${invalidQuestions.length > 1 ? 's' : ''} could not be confirmed. Check for missing fields or attachments.`,
        { duration: 5000 }
      );
    } else {
      toast.success(message);
    }

    setSelectedQuestions(new Set());
  };
  
  const handleAutoAssignDifficulty = async () => {
    await autoAssignDifficulty.mutateAsync(paper.id);
  };
  
  const handleBatchDelete = async () => {
    const selectedQuestionsList = paper.questions.filter(q => selectedQuestions.has(q.id));

    if (selectedQuestionsList.length === 0) {
      toast.error('No questions selected for deletion');
      return;
    }

    const confirmMessage = `Are you sure you want to delete ${selectedQuestionsList.length} question${selectedQuestionsList.length > 1 ? 's' : ''}? This action cannot be undone.`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const deletePromises = selectedQuestionsList.map(question =>
        supabase
          .from('questions_master_admin')
          .delete()
          .eq('id', question.id)
      );

      const results = await Promise.all(deletePromises);
      const errors = results.filter(r => r.error);

      if (errors.length > 0) {
        console.error('Errors deleting questions:', errors);
        toast.error(`Failed to delete ${errors.length} question${errors.length > 1 ? 's' : ''}`);
      } else {
        toast.success(`Successfully deleted ${selectedQuestionsList.length} question${selectedQuestionsList.length > 1 ? 's' : ''}`);
        setSelectedQuestions(new Set());
        queryClient.invalidateQueries({ queryKey: ['questions'] });
      }
    } catch (error) {
      console.error('Error during batch delete:', error);
      toast.error('Failed to delete questions');
    }
  };

  const handleAutoFillAllSubtopics = async () => {
    if (isAutoFillingAll) return;
    
    setIsAutoFillingAll(true);
    let filledCount = 0;
    
    try {
      // Process each question that has a topic but no subtopics
      for (const question of paper.questions) {
        if (question.topic_id && (!question.subtopics || question.subtopics.length === 0)) {
          const availableSubtopics = subtopics.filter(s => s.topic_id === question.topic_id);
          
          if (availableSubtopics.length > 0) {
            // Try to match subtopics based on question content
            const questionContent = (question.question_description || '').toLowerCase();
            let matchedSubtopics = availableSubtopics.filter(subtopic => {
              const subtopicName = subtopic.name.toLowerCase();
              const subtopicWords = subtopicName.split(/\s+/).filter(w => w.length > 2);
              return subtopicWords.some(word => {
                const regex = new RegExp(`\\b${word}\\b`, 'i');
                return regex.test(questionContent);
              });
            });
            
            // If no matches with strict matching, try lenient matching
            if (matchedSubtopics.length === 0) {
              matchedSubtopics = availableSubtopics.filter(subtopic => {
                const subtopicName = subtopic.name.toLowerCase();
                return subtopicName.split(/\s+/).some(word => 
                  word.length > 3 && questionContent.includes(word)
                );
              });
            }
            
            // If still no matches and only one subtopic available, select it
            if (matchedSubtopics.length === 0 && availableSubtopics.length === 1) {
              matchedSubtopics = availableSubtopics;
            }
            
            if (matchedSubtopics.length > 0) {
              const subtopicIds = matchedSubtopics.map(s => s.id);
              await updateSubtopics.mutateAsync({
                questionId: question.id,
                subtopicIds
              });
              filledCount++;
            }
          }
        }
      }
      
      if (filledCount > 0) {
        toast.success(`Auto-filled subtopics for ${filledCount} question${filledCount > 1 ? 's' : ''}`);
      } else {
        toast.info('No questions found that need subtopic auto-filling');
      }
    } catch (error) {
      console.error('Error auto-filling subtopics:', error);
      toast.error('Failed to auto-fill some subtopics');
    } finally {
      setIsAutoFillingAll(false);
    }
  };
  
  const handleExportQuestions = () => {
    const exportData = {
      paper: {
        code: paper.code,
        subject: paper.subject,
        provider: paper.provider,
        program: paper.program,
        region: paper.region,
        duration: paper.duration,
        total_marks: paper.total_marks
      },
      questions: paper.questions.map(q => ({
        number: q.question_number,
        description: q.question_description,
        marks: q.marks,
        type: q.type,
        difficulty: q.difficulty,
        topic: q.topic_name,
        subtopics: q.subtopics?.map(s => s.name),
        hint: q.hint,
        explanation: q.explanation,
        options: q.options?.map(o => ({
          text: o.option_text,
          is_correct: o.is_correct
        })),
        parts: q.parts.map(p => ({
          label: p.part_label,
          description: p.question_description,
          marks: p.marks,
          type: p.type,
          options: p.options?.map(o => ({
            text: o.option_text,
            is_correct: o.is_correct
          }))
        }))
      }))
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${paper.code}_questions.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Questions exported successfully');
  };
  
  const handleConfirmPaper = async (paperId: string) => {
    await confirmPaper.mutateAsync({ paperId });
  };
  
  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  const handleOpenFullPageReview = () => {
    setShowFullPageReview(true);
  };

  const handleCloseFullPageReview = () => {
    setShowFullPageReview(false);
  };

  const isUpdatingPaperStatus = updatePaperStatus.isPending;
  const canArchivePaper = ['draft', 'qa_review', 'active'].includes(paper.status);
  const canRestorePaper = paper.status === 'inactive';

  const resetArchiveConfirmation = () => {
    if (archiveConfirmationTimeoutRef.current) {
      clearTimeout(archiveConfirmationTimeoutRef.current);
      archiveConfirmationTimeoutRef.current = null;
    }
    setIsArchiveConfirmationActive(false);
  };

  const handleArchivePaper = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();

    if (isUpdatingPaperStatus) {
      return;
    }

    if (!canArchivePaper) {
      return;
    }

    if (!isArchiveConfirmationActive) {
      setIsArchiveConfirmationActive(true);

      if (archiveConfirmationTimeoutRef.current) {
        clearTimeout(archiveConfirmationTimeoutRef.current);
      }

      archiveConfirmationTimeoutRef.current = setTimeout(() => {
        setIsArchiveConfirmationActive(false);
        archiveConfirmationTimeoutRef.current = null;
      }, 5000);

      return;
    }

    resetArchiveConfirmation();

    updatePaperStatus.mutate({ paperId: paper.id, newStatus: 'inactive' });
  };

  const handleRestorePaper = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();

    if (isUpdatingPaperStatus) {
      return;
    }

    updatePaperStatus.mutate({ paperId: paper.id, newStatus: 'draft' });
  };
  
  return (
    <>
      <div
        className={cn(
          'relative rounded-2xl border bg-white/95 dark:bg-gray-900/80 shadow-sm transition-all duration-300 backdrop-blur-sm',
          expanded
            ? 'border-[#8CC63F]/60 ring-2 ring-[#8CC63F]/40'
            : 'border-gray-200 dark:border-gray-700 hover:shadow-lg'
        )}
      >
        {/* Paper Header */}
        <div
          className="flex flex-col gap-4 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-white via-gray-50 to-gray-100 px-6 py-5 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 md:flex-row md:items-center md:justify-between"
          onClick={toggleExpanded}
        >
          <div className="flex flex-1 flex-wrap items-center gap-4">
            <div className="flex items-center justify-center w-11 h-11 rounded-xl border border-blue-200/60 bg-blue-100/80 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-200">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{paper.code}</h3>
                    {paper.title && (
                      <p className="text-sm font-medium text-blue-600 dark:text-blue-400">{paper.title}</p>
                    )}
                    {(paper.exam_year || paper.exam_session) && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        {paper.exam_year && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-indigo-100 dark:bg-indigo-900/30 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300">
                            {paper.exam_year}
                          </span>
                        )}
                        {paper.exam_session && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-purple-100 dark:bg-purple-900/30 px-2 py-0.5 text-xs font-medium text-purple-700 dark:text-purple-300">
                            {paper.exam_session === 'M/J' ? 'May/June' : paper.exam_session === 'O/N' ? 'Oct/Nov' : paper.exam_session}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <StatusBadge
                    status={paper.status}
                    label={getPaperStatusLabel(paper.status)}
                    showIcon
                    className="px-3 py-1 text-xs font-semibold"
                  />
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/60 bg-emerald-100/70 px-3 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-500/50 dark:bg-emerald-500/10 dark:text-emerald-200">
                  <CircleCheck className="h-3.5 w-3.5" />
                  {confirmedCount}/{paper.questions.length} confirmed
                </span>
                {qaReviewCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/60 bg-amber-100/70 px-3 py-1 text-xs font-semibold text-amber-800 dark:border-amber-500/50 dark:bg-amber-500/10 dark:text-amber-200">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {qaReviewCount} pending
                  </span>
                )}
                {validationSummary.invalidQuestions > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-300/60 bg-rose-100/70 px-3 py-1 text-xs font-semibold text-rose-700 dark:border-rose-500/50 dark:bg-rose-500/10 dark:text-rose-200">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {validationSummary.invalidQuestions} incomplete
                  </span>
                )}
                {hasQuestionsNeedingAttachments && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/60 bg-amber-100/70 px-3 py-1 text-xs font-semibold text-amber-800 dark:border-amber-500/50 dark:bg-amber-500/10 dark:text-amber-200">
                    <FileText className="h-3.5 w-3.5" />
                    {questionsNeedingAttachments.length} need figures
                  </span>
                )}
                {questionsNeedingSubtopics > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-300/60 bg-purple-100/70 px-3 py-1 text-xs font-semibold text-purple-800 dark:border-purple-500/50 dark:bg-purple-500/10 dark:text-purple-200">
                    <Square className="h-3.5 w-3.5" />
                    {questionsNeedingSubtopics} need subtopics
                  </span>
                )}
                {paper.status === 'active' && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/60 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200">
                    <CheckCircle className="h-3.5 w-3.5" /> Published
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
                <span>{paper.subject}</span>
                <span>•</span>
                <span>{paper.provider}</span>
                <span>•</span>
                <span>{paper.program}</span>
                <span>•</span>
                <span>{paper.region}</span>
                {paper.duration && (
                  <>
                    <span>•</span>
                    <span>{paper.duration}</span>
                  </>
                )}
              {paper.total_marks && (
                <>
                  <span>•</span>
                  <span>{paper.total_marks} marks</span>
                </>
              )}
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>
                    {confirmedCount} of {totalQuestions} question{totalQuestions === 1 ? '' : 's'} confirmed
                  </span>
                  <span>{qaReviewCount} awaiting QA</span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-500 dark:bg-emerald-400"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
              </div>
              {showQAActions && (
                <div className="flex flex-wrap gap-2">
                  {paperChecklist.map(item => (
                    <span
                      key={item.label}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                        item.complete
                          ? 'border-emerald-300/70 bg-emerald-100/70 text-emerald-800 dark:border-emerald-500/50 dark:bg-emerald-500/10 dark:text-emerald-200'
                          : 'border-amber-300/70 bg-amber-100/70 text-amber-800 dark:border-amber-500/50 dark:bg-amber-500/10 dark:text-amber-200'
                      )}
                    >
                      {item.complete ? (
                        <CircleCheck className="h-3.5 w-3.5" />
                      ) : (
                        <AlertCircle className="h-3.5 w-3.5" />
                      )}
                      {item.label}
                    </span>
                  ))}
                </div>
              )}
              {showQAActions && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {readyToPublish
                    ? 'All QA checks are complete. Publish to move this paper to the Published tab and unlock it for other modules.'
                    : 'Complete the remaining QA checklist items to publish this paper for teachers and learners.'}
                </p>
              )}
            </div>
          </div>
        </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-2 sm:gap-3"
            >
              {/* Full Page Review Button */}
              <Button
                size="sm"
                variant="outline"
                onClick={handleOpenFullPageReview}
                leftIcon={<FileText className="h-3 w-3" />}
                className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30"
              >
                Full Review
              </Button>

              {/* Status Badge and Dropdown */}
              {showQAActions && (
                <div className="relative" ref={statusDropdownRef}>
                    <button
                      onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                      className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus-visible:ring-offset-gray-900"
                      title="Change paper status"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>

                    {showStatusDropdown && (
                      <div className="absolute right-0 mt-2 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:shadow-gray-900/30 z-20">
                        {paper.status === 'draft' && (
                          <button
                            onClick={() => {
                              updatePaperStatus.mutate({ paperId: paper.id, newStatus: 'qa_review' });
                              setShowStatusDropdown(false);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                          >
                            Set to QA Review
                          </button>
                        )}
                        
                        {paper.status === 'qa_review' && (
                          <button
                            onClick={() => {
                              updatePaperStatus.mutate({ paperId: paper.id, newStatus: 'inactive' });
                              setShowStatusDropdown(false);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                          >
                            Set to Inactive
                          </button>
                        )}
                        
                        {paper.status === 'active' && (
                          <button
                            onClick={() => {
                              updatePaperStatus.mutate({ paperId: paper.id, newStatus: 'inactive' });
                              setShowStatusDropdown(false);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                          >
                            Set to Inactive
                          </button>
                        )}
                        
                        {paper.status === 'inactive' && (
                          <button
                            onClick={() => {
                              updatePaperStatus.mutate({ paperId: paper.id, newStatus: 'draft' });
                              setShowStatusDropdown(false);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                          >
                            Set to Draft
                          </button>
                        )}
                      </div>
                    )}
                </div>
              )}
            </div>

            {showQAActions && (
              <div className="flex flex-col gap-2">
                {canArchivePaper && (
                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleArchivePaper}
                      leftIcon={<Archive className="h-3 w-3" />}
                      className={cn(
                        "border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-500/50 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20",
                        isArchiveConfirmationActive && "ring-2 ring-red-500 ring-offset-2 dark:ring-offset-gray-900"
                      )}
                      disabled={isUpdatingPaperStatus}
                    >
                      {isArchiveConfirmationActive ? 'Click Again to Confirm' : 'Archive'}
                    </Button>
                    {isArchiveConfirmationActive && (
                      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                          <div>
                            <div className="font-semibold mb-1">Confirm Archive</div>
                            <p>Archiving will remove this paper and its questions from all teacher and student experiences. Click "Archive" again within 5 seconds to confirm.</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {canRestorePaper && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRestorePaper}
                    leftIcon={<RefreshCw className="h-3 w-3" />}
                    className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/50 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
                    disabled={isUpdatingPaperStatus}
                  >
                    Restore to Draft
                  </Button>
                )}
              </div>
            )}

            {showQAActions && (
              <>
                {onStartTestMode && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartTestMode();
                    }}
                    leftIcon={<Play className="h-3 w-3" />}
                    className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                    disabled={!allConfirmed}
                    title={!allConfirmed ? "Confirm all questions first" : "Start test mode"}
                  >
                    Test Mode
                  </Button>
                )}
                
                {allConfirmed && paper.status === 'qa_review' && (
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConfirmPaper(paper.id);
                    }}
                    leftIcon={<CircleCheck className="h-3 w-3" />}
                    className="bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 text-white"
                    disabled={confirmPaper.isPending || !canConfirm}
                    title={!canConfirm ? "Resolve validation issues before publishing" : "Publish this paper"}
                  >
                    {confirmPaper.isPending ? 'Publishing...' : 'Publish Paper'}
                  </Button>
                )}
              </>
            )}
            
            {/* Show simulation button only for fully confirmed papers (not in QA mode) */}
            {!showQAActions && paper.status === 'active' && onStartSimulation && (
              <Button
                size="sm"
                variant="default"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartSimulation();
                }}
                leftIcon={<PlayCircle className="h-4 w-4" />}
              >
                Start Simulation
              </Button>
            )}
            
            <div className="text-sm text-gray-500 dark:text-gray-400" onClick={(e) => e.stopPropagation()}>
              {paper.questions.length} question{paper.questions.length !== 1 ? 's' : ''}
            </div>
            
            <div className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded cursor-pointer text-gray-400 dark:text-gray-500">
              {expanded ? (
                <ChevronUp className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              )}
            </div>
          </div>
        </div>

        {/* Expanded Content */}
        {expanded && (
          <div className="relative">
            {/* Statistics and Actions Bar */}
            <div className="sticky top-0 z-20 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-md dark:shadow-gray-900/20">
              <div className="p-4 space-y-3">
                {showQAActions && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50/80 p-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
                    <div className="font-semibold">QA publishing checklist</div>
                    <p className="mt-1 leading-relaxed">
                      Confirm each question below. When all items are resolved, publish the paper to move it into the Published tab and make it available to teachers and learners.
                    </p>
                  </div>
                )}
                {/* Note about figure attachments - informational only, no PDF upload */}
                {showQAActions && hasQuestionsNeedingAttachments && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                    <div className="flex items-start">
                      <AlertCircle className="text-yellow-600 dark:text-yellow-400 mt-0.5 mr-3" size={20} />
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-1">
                          Figure Attachments Required
                        </h4>
                        <p className="text-sm text-yellow-700 dark:text-yellow-400">
                          {questionsNeedingAttachments.length} question{questionsNeedingAttachments.length > 1 ? 's' : ''} require figure attachments. 
                          Use the "Snip from PDF" button in each question's attachment section to add figures.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Batch Actions */}
                {showQAActions && selectedQuestions.size > 0 && (() => {
                  const selectedQuestionsList = paper.questions.filter(q => selectedQuestions.has(q.id));
                  const alreadyConfirmed = selectedQuestionsList.filter(q => q.status === 'active');
                  const eligibleForConfirm = selectedQuestionsList.filter(q => ['draft', 'qa_review'].includes(q.status));
                  const validForConfirm = eligibleForConfirm.filter(q => validateForConfirmation(q).isValid);
                  const needAttention = eligibleForConfirm.filter(q => !validateForConfirmation(q).isValid);
                  const canConfirmAny = validForConfirm.length > 0;

                  return (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                              {selectedQuestions.size} question{selectedQuestions.size > 1 ? 's' : ''} selected
                            </span>
                            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                              {validForConfirm.length > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-green-700 dark:text-green-300">
                                  <CircleCheck className="h-3 w-3" />
                                  {validForConfirm.length} can confirm
                                </span>
                              )}
                              {alreadyConfirmed.length > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-gray-600 dark:text-gray-300">
                                  <CheckCircle className="h-3 w-3" />
                                  {alreadyConfirmed.length} confirmed
                                </span>
                              )}
                              {needAttention.length > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-amber-700 dark:text-amber-300">
                                  <AlertCircle className="h-3 w-3" />
                                  {needAttention.length} need attention
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={handleBatchConfirm}
                              leftIcon={<CircleCheck className="h-3 w-3" />}
                              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white"
                              disabled={!canConfirmAny}
                              title={
                                !canConfirmAny
                                  ? alreadyConfirmed.length === selectedQuestionsList.length
                                    ? 'All selected questions are already confirmed'
                                    : 'Selected questions need attention (missing fields or attachments)'
                                  : `Confirm ${validForConfirm.length} question${validForConfirm.length > 1 ? 's' : ''}`
                              }
                            >
                              Confirm Selected
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleBatchDelete}
                              leftIcon={<Trash2 className="h-3 w-3" />}
                              className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30"
                            >
                              Delete Selected
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedQuestions(new Set())}
                            >
                              Clear Selection
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                
                {/* Confirmation Progress Bar */}
                {showQAActions && paper.status === 'qa_review' && (
                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-gray-400">Confirmation Progress</span>
                      <span className="text-gray-700 dark:text-gray-300 font-medium">
                        {confirmedCount}/{paper.questions.length} questions confirmed
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${(confirmedCount / paper.questions.length) * 100}%` }}
                      />
                    </div>
                    {allConfirmed && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        ✓ All questions confirmed! You can now confirm the paper.
                      </p>
                    )}
                  </div>
                )}
                
                {/* Statistics Summary */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                        {paper.questions.length}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Total Questions</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
                        {qaReviewCount}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Pending Review</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-green-600 dark:text-green-400">
                        {confirmedCount}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Confirmed</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-red-600 dark:text-red-400">
                        {validationSummary.invalidQuestions}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Incomplete</div>
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons */}
                {showQAActions && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleExportQuestions}
                        leftIcon={<Download className="h-3 w-3" />}
                        title="Export questions as JSON"
                      >
                        Export
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleAutoAssignDifficulty}
                        leftIcon={<Wand2 className="h-3 w-3" />}
                        title="Auto-assign difficulty based on marks"
                      >
                        Auto Difficulty
                      </Button>
                      
                      {questionsNeedingSubtopics > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleAutoFillAllSubtopics}
                          leftIcon={<RefreshCw className={cn("h-3 w-3", isAutoFillingAll && "animate-spin")} />}
                          title="Auto-fill missing subtopics for all questions"
                          disabled={isAutoFillingAll}
                        >
                          {isAutoFillingAll ? 'Auto-filling...' : 'Auto-fill Subtopics'}
                        </Button>
                      )}
                    </div>
                    
                    {/* Select All Checkbox */}
                    <button
                      onClick={handleSelectAll}
                      className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                    >
                      {selectedQuestions.size === paper.questions.length ? (
                        <CheckSquare className="h-4 w-4" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                      <span>Select All Questions</span>
                    </button>
                  </div>
                )}
                
                {/* Validation Errors Summary */}
                {showQAActions && validationSummary.errors.length > 0 && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-red-800 dark:text-red-200 mb-1">
                          {validationSummary.invalidQuestions} question{validationSummary.invalidQuestions !== 1 ? 's' : ''} need attention before confirmation:
                        </p>
                        <ul className="list-disc list-inside text-red-700 dark:text-red-300 space-y-1">
                          {validationSummary.errors.slice(0, 3).map((error, index) => (
                            <li key={index}>
                              Question {error.questionNumber}: {error.errors[0].message}
                              {error.errors.length > 1 && ` (and ${error.errors.length - 1} more)`}
                            </li>
                          ))}
                          {validationSummary.errors.length > 3 && (
                            <li>...and {validationSummary.errors.length - 3} more questions</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Questions Container */}
            <div className="p-4 space-y-6 max-h-[calc(100vh-280px)] overflow-y-auto bg-gray-50 dark:bg-gray-900/50">
              {paper.questions
                .sort((a, b) => naturalSort(a.question_number, b.question_number))
                .map((question, questionIndex) => (
                  <QuestionCard
                    key={question.id}
                    question={question}
                    questionIndex={questionIndex}
                    topics={topics}
                    subtopics={subtopics}
                    units={units}
                    onDelete={onDeleteQuestion}
                    onDeleteSubQuestion={onDeleteSubQuestion}
                    onConfirm={() => confirmQuestion.mutateAsync({ questionId: question.id })}
                    showQAActions={showQAActions}
                    readOnly={readOnly}
                    isSelected={selectedQuestions.has(question.id)}
                    onToggleSelect={() => handleSelectQuestion(question.id)}
                    showSelectCheckbox={showQAActions}
                  />
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Full Page Question Review Modal */}
      {showFullPageReview && (
        <FullPageQuestionReview
          paper={paper}
          topics={topics}
          subtopics={subtopics}
          units={units}
          onClose={handleCloseFullPageReview}
          onDeleteQuestion={onDeleteQuestion}
          onDeleteSubQuestion={onDeleteSubQuestion}
          showQAActions={showQAActions}
          readOnly={readOnly}
          // NO LONGER PASSING pdfDataUrl or onPdfUpload
        />
      )}
    </>
  );
}