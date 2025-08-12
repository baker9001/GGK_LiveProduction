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
  Upload,
  CheckSquare,
  MoreVertical,
  Download,
  Copy,
  Wand2,
  RefreshCw,
  Square
} from 'lucide-react';
import { Button } from '../../../../../../components/shared/Button';
import { StatusBadge } from '../../../../../../components/shared/StatusBadge';
import { QuestionCard } from './QuestionCard';
import { cn } from '../../../../../../lib/utils';
import { GroupedPaper, Question, SubQuestion } from '../page';
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
  const questionsNeedingAttachments = paper.questions.filter(q => {
    const needsAttachment = q.question_description?.toLowerCase().includes('figure') || 
                           q.question_description?.toLowerCase().includes('diagram') ||
                           q.question_description?.toLowerCase().includes('graph') ||
                           q.question_description?.toLowerCase().includes('image');
    const hasAttachment = q.attachments && q.attachments.length > 0;
    
    if (needsAttachment && !hasAttachment) return true;
    
    // Check sub-questions
    return q.parts.some(part => {
      const partNeedsAttachment = part.question_description?.toLowerCase().includes('figure') || 
                                 part.question_description?.toLowerCase().includes('diagram') ||
                                 part.question_description?.toLowerCase().includes('graph') ||
                                 part.question_description?.toLowerCase().includes('image');
      const partHasAttachment = part.attachments && part.attachments.length > 0;
      return partNeedsAttachment && !partHasAttachment;
    });
  });
  
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
  
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'draft':
        return 'secondary';
      case 'active':
        return 'success';
      case 'qa_review':
        return 'warning';
      case 'inactive':
        return 'inactive';
      default:
        return 'default';
    }
  };
  
  return (
    <>
      <div className={cn(
        "bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-200",
        expanded && "ring-2 ring-blue-500 dark:ring-blue-400"
      )}>
        {/* Paper Header */}
        <div 
          className="bg-gray-50 dark:bg-gray-900 p-4 flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors"
          onClick={toggleExpanded}
        >
          <div className="flex items-center space-x-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                {paper.code}
                {showQAActions && (
                  <div className="ml-3 flex items-center space-x-3 text-sm font-normal">
                    <span className="text-green-600 dark:text-green-400">
                      {confirmedCount}/{paper.questions.length} confirmed
                    </span>
                    {qaReviewCount > 0 && (
                      <span className="text-amber-600 dark:text-amber-400">
                        ({qaReviewCount} pending)
                      </span>
                    )}
                    {validationSummary.invalidQuestions > 0 && (
                      <span className="text-red-600 dark:text-red-400">
                        ({validationSummary.invalidQuestions} incomplete)
                      </span>
                    )}
                  </div>
                )}
                {paper.status === 'active' && (
                  <span className="ml-2 flex items-center text-sm font-normal text-green-600 dark:text-green-400">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Paper Confirmed
                  </span>
                )}
                {validationSummary.invalidQuestions > 0 && (
                  <span className="ml-2 text-sm font-normal text-red-600 dark:text-red-400">
                    ({validationSummary.invalidQuestions} incomplete)
                  </span>
                )}
                {hasQuestionsNeedingAttachments && (
                  <span className="ml-2 text-sm font-normal text-amber-600 dark:text-amber-400">
                    ({questionsNeedingAttachments.length} need figures)
                  </span>
                )}
                {questionsNeedingSubtopics > 0 && (
                  <span className="ml-2 text-sm font-normal text-purple-600 dark:text-purple-400">
                    ({questionsNeedingSubtopics} need subtopics)
                  </span>
                )}
              </h3>
              <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400 mt-1">
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
          
          <div className="flex items-center space-x-3">
            <div onClick={(e) => e.stopPropagation()}>
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
              <div className="flex items-center space-x-2 ml-2">
                <StatusBadge 
                  status={paper.status} 
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600"
                />
                
                {showQAActions && (
                  <div className="relative" ref={statusDropdownRef}>
                    <button
                      onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500 dark:text-gray-400"
                      title="Change paper status"
                    >
                      <MoreVertical className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    </button>
                    
                    {showStatusDropdown && (
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg dark:shadow-gray-900/20 py-1 z-20 border border-gray-200 dark:border-gray-700">
                        {paper.status === 'draft' && (
                          <button
                            onClick={() => {
                              updatePaperStatus.mutate({ paperId: paper.id, newStatus: 'qa_review' });
                              setShowStatusDropdown(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
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
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
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
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
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
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            Set to Draft
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
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