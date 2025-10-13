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
  Square
} from 'lucide-react';
import { Button } from '../../../../../../components/shared/Button';
import { StatusBadge } from '../../../../../../components/shared/StatusBadge';
import { QuestionCard } from './QuestionCard';
import { cn } from '../../../../../../lib/utils';
import { GroupedPaper, Question, SubQuestion } from '../page';
import { getQuestionStatusLabel, questionNeedsAttachment } from '../utils/questionHelpers';
import { useQuestionValidation } from '../hooks/useQuestionValidation';
import { useQuestionMutations } from '../hooks/useQuestionMutations';
import { useQuestionBatchOperations } from '../hooks/useQuestionBatchOperations';
import { toast } from '../../../../../../components/shared/Toast';
import { FullPageQuestionReview } from './FullPageQuestionReview';

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
  
  const { getValidationSummary, canConfirmPaper, validateForConfirmation } = useQuestionValidation();
  const { confirmQuestion, confirmPaper, updateSubtopics } = useQuestionMutations();
  const { batchConfirmQuestions, autoAssignDifficulty } = useQuestionBatchOperations();
  const { updatePaperStatus } = useQuestionMutations();
  
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
    const selectedQuestionsToConfirm = paper.questions
      .filter(q => selectedQuestions.has(q.id) && q.status === 'qa_review')
      .filter(q => validateForConfirmation(q).isValid);
    
    if (selectedQuestionsToConfirm.length === 0) {
      toast.error('No valid questions selected for confirmation');
      return;
    }
    
    await batchConfirmQuestions.mutateAsync({
      questionIds: selectedQuestionsToConfirm.map(q => q.id),
      paperId: paper.id
    });
    
    setSelectedQuestions(new Set());
  };
  
  const handleAutoAssignDifficulty = async () => {
    await autoAssignDifficulty.mutateAsync(paper.id);
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
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{paper.code}</h3>
                <StatusBadge
                  status={paper.status}
                  label={getQuestionStatusLabel(paper.status)}
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
                    <CheckCircle className="h-3.5 w-3.5" /> Paper confirmed
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
                    title={!canConfirm ? "Some questions have validation errors" : "Confirm this paper"}
                  >
                    {confirmPaper.isPending ? 'Confirming...' : 'Confirm Paper'}
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
                {showQAActions && selectedQuestions.size > 0 && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        {selectedQuestions.size} question{selectedQuestions.size > 1 ? 's' : ''} selected
                      </span>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={handleBatchConfirm}
                          leftIcon={<CircleCheck className="h-3 w-3" />}
                          className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white"
                        >
                          Confirm Selected
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
                )}
                
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
                .sort((a, b) => parseInt(a.question_number) - parseInt(b.question_number))
                .map((question, questionIndex) => (
                  <div key={question.id} className="relative">
                    {/* Selection Checkbox */}
                    {showQAActions && (
                      <div className="absolute -left-8 top-4 z-10">
                        <button
                          onClick={() => handleSelectQuestion(question.id)}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                        >
                          {selectedQuestions.has(question.id) ? (
                            <CheckSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <Square className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                          )}
                        </button>
                      </div>
                    )}
                    
                    <QuestionCard
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
                      // NO LONGER PASSING pdfDataUrl or onPdfUpload
                    />
                  </div>
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