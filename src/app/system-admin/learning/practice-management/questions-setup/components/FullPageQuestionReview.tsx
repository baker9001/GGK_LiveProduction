import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, ChevronLeft, ChevronRight, FileText, Clock, Award, CheckCircle, 
  AlertCircle, Search, Filter, ChevronDown, ChevronUp, Hash, 
  CheckSquare, Square, Circle, Type, List, AlertTriangle,
  BarChart, Zap, Minimize2, Maximize2, PanelLeftClose, PanelLeft
} from 'lucide-react';
import { Button } from '../../../../../../components/shared/Button';
import { StatusBadge } from '../../../../../../components/shared/StatusBadge';
import { QuestionCard } from './QuestionCard';
import { cn } from '../../../../../../lib/utils';
import { GroupedPaper, Question, SubQuestion } from '../page';

interface FullPageQuestionReviewProps {
  paper: GroupedPaper;
  topics: { id: string; name: string }[];
  subtopics: { id: string; name: string; topic_id: string }[];
  units?: { id: string; name: string }[];
  onClose: () => void;
  onDeleteQuestion: (question: Question) => void;
  onDeleteSubQuestion: (subQuestion: SubQuestion) => void;
  showQAActions?: boolean;
  readOnly?: boolean;
  pdfDataUrl?: string | null;
  onPdfUpload?: (file: File) => void;
}

type NavigatorView = 'all' | 'active' | 'qa_review' | 'incomplete';
type NavigatorSize = 'compact' | 'normal' | 'expanded';

export function FullPageQuestionReview({
  paper,
  topics,
  subtopics,
  units = [],
  onClose,
  onDeleteQuestion,
  onDeleteSubQuestion,
  showQAActions = false,
  readOnly = false,
  pdfDataUrl,
  onPdfUpload
}: FullPageQuestionReviewProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showQuestionNavigation, setShowQuestionNavigation] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [navigatorView, setNavigatorView] = useState<NavigatorView>('all');
  const [navigatorSize, setNavigatorSize] = useState<NavigatorSize>('normal');
  const [topOffset, setTopOffset] = useState(120); // Default offset for header + page title

  // Calculate the actual top offset based on existing page elements
  useEffect(() => {
    const calculateTopOffset = () => {
      // Find main header
      const mainHeader = document.querySelector('.admin-header, header, [data-testid="main-header"]');
      const pageTitle = document.querySelector('.page-title, [data-testid="page-title"], .breadcrumb-section');
      
      let offset = 0;
      
      if (mainHeader) {
        const headerRect = mainHeader.getBoundingClientRect();
        offset += headerRect.height;
      }
      
      if (pageTitle) {
        const titleRect = pageTitle.getBoundingClientRect();
        // Use bottom position to account for any margins
        offset = titleRect.bottom;
      }
      
      // If we found elements, use calculated offset, otherwise use default
      if (offset > 0) {
        setTopOffset(offset);
      } else {
        // Fallback to a reasonable default
        setTopOffset(112); // Reduced from 120 to minimize gap
      }
    };

    calculateTopOffset();
    
    // Small delay to ensure DOM is fully rendered
    setTimeout(calculateTopOffset, 100);
    
    // Recalculate on window resize
    window.addEventListener('resize', calculateTopOffset);
    return () => window.removeEventListener('resize', calculateTopOffset);
  }, []);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !searchQuery) {
        onClose();
      } else if (e.key === 'ArrowLeft' && currentQuestionIndex > 0 && !e.ctrlKey) {
        setCurrentQuestionIndex(currentQuestionIndex - 1);
      } else if (e.key === 'ArrowRight' && currentQuestionIndex < paper.questions.length - 1 && !e.ctrlKey) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      } else if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        const searchInput = document.getElementById('question-search');
        searchInput?.focus();
      } else if (e.key === 'Home') {
        e.preventDefault();
        setCurrentQuestionIndex(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setCurrentQuestionIndex(paper.questions.length - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentQuestionIndex, paper.questions.length, onClose, searchQuery]);

  const currentQuestion = paper.questions[currentQuestionIndex];

  // Calculate statistics
  const statistics = useMemo(() => {
    const qaReviewCount = paper.questions.filter(q => q.status === 'qa_review').length;
    const confirmedCount = paper.questions.filter(q => q.status === 'active').length;
    const incompleteCount = paper.questions.filter(q => {
      const hasRequiredFields = q.question_description && 
                               q.marks > 0 && 
                               q.difficulty && 
                               q.topic_id &&
                               q.hint &&
                               q.explanation;
      return !hasRequiredFields;
    }).length;

    return { qaReviewCount, confirmedCount, incompleteCount };
  }, [paper.questions]);

  // Filter questions based on view and search
  const filteredQuestions = useMemo(() => {
    let filtered = paper.questions;

    // Apply view filter
    switch (navigatorView) {
      case 'active':
        filtered = filtered.filter(q => q.status === 'active');
        break;
      case 'qa_review':
        filtered = filtered.filter(q => q.status === 'qa_review');
        break;
      case 'incomplete':
        filtered = filtered.filter(q => {
          const hasRequiredFields = q.question_description && 
                                   q.marks > 0 && 
                                   q.difficulty && 
                                   q.topic_id &&
                                   q.hint &&
                                   q.explanation;
          return !hasRequiredFields;
        });
        break;
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(q => {
        const searchLower = searchQuery.toLowerCase();
        return (
          q.question_description?.toLowerCase().includes(searchLower) ||
          q.question_number?.toString().includes(searchQuery) ||
          topics.find(t => t.id === q.topic_id)?.name.toLowerCase().includes(searchLower)
        );
      });
    }

    return filtered.map(q => ({
      question: q,
      originalIndex: paper.questions.indexOf(q)
    }));
  }, [paper.questions, navigatorView, searchQuery, topics]);

  // Helper functions
  const goToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
  };

  const goToPrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const goToNext = () => {
    if (currentQuestionIndex < paper.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const getQuestionIcon = (type: string | undefined) => {
    switch (type) {
      case 'mcq':
        return <Circle className="h-3 w-3" />;
      case 'tf':
        return <CheckSquare className="h-3 w-3" />;
      case 'descriptive':
        return <Type className="h-3 w-3" />;
      default:
        return <List className="h-3 w-3" />;
    }
  };

  const getQuestionValidationStatus = (question: Question) => {
    const errors = [];
    if (!question.question_description) errors.push('description');
    if (!question.marks || question.marks <= 0) errors.push('marks');
    if (!question.difficulty) errors.push('difficulty');
    if (!question.topic_id) errors.push('topic');
    if (!question.hint) errors.push('hint');
    if (!question.explanation) errors.push('explanation');
    
    return {
      isValid: errors.length === 0,
      errors,
      completeness: ((6 - errors.length) / 6) * 100
    };
  };

  const navigatorWidth = {
    compact: 'w-16',
    normal: 'w-80',
    expanded: 'w-96'
  };

  return (
    <div 
      className="fixed inset-x-0 bottom-0 z-40 bg-gray-50 dark:bg-gray-900 flex flex-col"
      style={{ top: `${topOffset}px` }}
    >
      {/* Consolidated Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          {/* Left Section */}
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              title="Close (Esc)"
            >
              <X className="h-5 w-5" />
            </Button>
            
            {/* Paper Info */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-base font-semibold text-gray-900 dark:text-white">
                    {paper.code}
                  </h1>
                  <StatusBadge status={paper.status} className="text-xs" />
                </div>
                <div className="flex items-center space-x-3 text-xs text-gray-600 dark:text-gray-400">
                  <span>{paper.subject}</span>
                  <span>•</span>
                  <span>{paper.provider}</span>
                  <span>•</span>
                  <span>{paper.program}</span>
                  {paper.duration && (
                    <>
                      <span>•</span>
                      <Clock className="h-3 w-3 inline mr-1" />
                      <span>{paper.duration}</span>
                    </>
                  )}
                  {paper.total_marks && (
                    <>
                      <span>•</span>
                      <Award className="h-3 w-3 inline mr-1" />
                      <span>{paper.total_marks} marks</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-4">
            {/* Question Progress & Navigation */}
            <div className="flex items-center space-x-3 px-3 py-1.5 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
              <Button
                variant="ghost"
                size="sm"
                onClick={goToPrevious}
                disabled={currentQuestionIndex === 0}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Question {currentQuestionIndex + 1} of {paper.questions.length}
                </span>
                {currentQuestion && (
                  <>
                    <span className="text-gray-400 dark:text-gray-500">•</span>
                    <StatusBadge status={currentQuestion.status} className="text-xs" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {currentQuestion.marks} marks
                    </span>
                  </>
                )}
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={goToNext}
                disabled={currentQuestionIndex === paper.questions.length - 1}
                className="h-7 w-7 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Compact Statistics */}
            <div className="flex items-center space-x-3 text-sm">
              <div className="flex items-center space-x-1.5 px-2 py-1 rounded-md bg-green-50 dark:bg-green-900/20">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="font-medium text-green-700 dark:text-green-300">{statistics.confirmedCount}</span>
              </div>
              <div className="flex items-center space-x-1.5 px-2 py-1 rounded-md bg-amber-50 dark:bg-amber-900/20">
                <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span className="font-medium text-amber-700 dark:text-amber-300">{statistics.qaReviewCount}</span>
              </div>
              <div className="flex items-center space-x-1.5 px-2 py-1 rounded-md bg-red-50 dark:bg-red-900/20">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <span className="font-medium text-red-700 dark:text-red-300">{statistics.incompleteCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Enhanced Question Navigator */}
        <div className={cn(
          "bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300",
          showQuestionNavigation ? navigatorWidth[navigatorSize] : "w-0"
        )}>
          {showQuestionNavigation && (
            <>
              {/* Navigator Header */}
              <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className={cn(
                    "font-semibold text-gray-900 dark:text-white transition-all",
                    navigatorSize === 'compact' && "text-xs text-center w-full"
                  )}>
                    {navigatorSize === 'compact' ? 'Q' : 'Questions'}
                  </h3>
                  <div className="flex items-center space-x-1">
                    {navigatorSize !== 'compact' && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setNavigatorSize(navigatorSize === 'normal' ? 'expanded' : 'normal')}
                          className="h-7 w-7 p-0"
                          title={navigatorSize === 'normal' ? 'Expand' : 'Normal'}
                        >
                          {navigatorSize === 'normal' ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setNavigatorSize(navigatorSize === 'compact' ? 'normal' : 'compact')}
                      className="h-7 w-7 p-0"
                      title={navigatorSize === 'compact' ? 'Expand' : 'Compact'}
                    >
                      {navigatorSize === 'compact' ? <PanelLeft className="h-3 w-3" /> : <PanelLeftClose className="h-3 w-3" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowQuestionNavigation(false)}
                      className="h-7 w-7 p-0"
                      title="Hide sidebar"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Search and Filter */}
                {navigatorSize !== 'compact' && (
                  <>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                      <input
                        id="question-search"
                        type="text"
                        placeholder="Search questions... (Ctrl+F)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    {/* View Tabs */}
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => setNavigatorView('all')}
                        className={cn(
                          "flex-1 px-2 py-1 text-xs font-medium rounded transition-colors",
                          navigatorView === 'all'
                            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                        )}
                      >
                        All ({paper.questions.length})
                      </button>
                      <button
                        onClick={() => setNavigatorView('active')}
                        className={cn(
                          "flex-1 px-2 py-1 text-xs font-medium rounded transition-colors",
                          navigatorView === 'active'
                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                        )}
                      >
                        <CheckCircle className="h-3 w-3 inline mr-1" />
                        {statistics.confirmedCount}
                      </button>
                      <button
                        onClick={() => setNavigatorView('qa_review')}
                        className={cn(
                          "flex-1 px-2 py-1 text-xs font-medium rounded transition-colors",
                          navigatorView === 'qa_review'
                            ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                        )}
                      >
                        <Clock className="h-3 w-3 inline mr-1" />
                        {statistics.qaReviewCount}
                      </button>
                      <button
                        onClick={() => setNavigatorView('incomplete')}
                        className={cn(
                          "flex-1 px-2 py-1 text-xs font-medium rounded transition-colors",
                          navigatorView === 'incomplete'
                            ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                        )}
                      >
                        <AlertCircle className="h-3 w-3 inline mr-1" />
                        {statistics.incompleteCount}
                      </button>
                    </div>
                  </>
                )}
              </div>
              
              {/* Question List */}
              <div className="flex-1 overflow-y-auto">
                {navigatorSize === 'compact' ? (
                  // Compact View
                  <div className="p-2 space-y-1">
                    {paper.questions.map((question, index) => {
                      const isActive = index === currentQuestionIndex;
                      const validation = getQuestionValidationStatus(question);
                      
                      return (
                        <button
                          key={question.id}
                          onClick={() => goToQuestion(index)}
                          className={cn(
                            "w-full h-10 flex items-center justify-center rounded transition-all duration-200",
                            isActive
                              ? "bg-blue-500 text-white shadow-sm"
                              : validation.isValid
                                ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/30"
                                : "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/30"
                          )}
                          title={`Question ${index + 1} - ${question.status}`}
                        >
                          <span className="font-bold text-xs">{index + 1}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  // Normal/Expanded View
                  <div className="p-3 space-y-2">
                    {filteredQuestions.length > 0 ? (
                      filteredQuestions.map(({ question, originalIndex }) => {
                        const isActive = originalIndex === currentQuestionIndex;
                        const validation = getQuestionValidationStatus(question);
                        const topic = topics.find(t => t.id === question.topic_id);
                        
                        return (
                          <button
                            key={question.id}
                            onClick={() => goToQuestion(originalIndex)}
                            className={cn(
                              "w-full p-3 rounded-lg border transition-all duration-200 text-left",
                              isActive
                                ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 shadow-sm ring-2 ring-blue-500"
                                : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-sm"
                            )}
                          >
                            {/* Question Header */}
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <span className={cn(
                                  "font-semibold text-sm flex items-center",
                                  isActive ? "text-blue-700 dark:text-blue-300" : "text-gray-700 dark:text-gray-300"
                                )}>
                                  {getQuestionIcon(question.type)}
                                  <span className="ml-1">Q{originalIndex + 1}</span>
                                </span>
                                {question.question_number && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    #{question.question_number}
                                  </span>
                                )}
                              </div>
                              <StatusBadge status={question.status} className="text-xs" />
                            </div>

                            {/* Question Preview */}
                            {navigatorSize === 'expanded' && question.question_description && (
                              <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                                {question.question_description}
                              </p>
                            )}

                            {/* Question Meta */}
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center space-x-3">
                                <span className="text-gray-500 dark:text-gray-400">
                                  {question.marks} marks
                                </span>
                                {question.difficulty && (
                                  <span className={cn(
                                    "capitalize",
                                    question.difficulty === 'easy' && "text-green-600 dark:text-green-400",
                                    question.difficulty === 'medium' && "text-amber-600 dark:text-amber-400",
                                    question.difficulty === 'hard' && "text-red-600 dark:text-red-400"
                                  )}>
                                    {question.difficulty}
                                  </span>
                                )}
                                {topic && (
                                  <span className="text-gray-500 dark:text-gray-400 truncate max-w-[100px]">
                                    {topic.name}
                                  </span>
                                )}
                              </div>
                              {!validation.isValid && (
                                <div className="flex items-center space-x-1">
                                  <AlertTriangle className="h-3 w-3 text-red-500 dark:text-red-400" />
                                  <span className="text-red-600 dark:text-red-400">
                                    {validation.errors.length}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Progress Bar */}
                            {!validation.isValid && (
                              <div className="mt-2">
                                <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                  <div 
                                    className={cn(
                                      "h-full transition-all duration-300",
                                      validation.completeness >= 80 ? "bg-green-500" :
                                      validation.completeness >= 50 ? "bg-amber-500" :
                                      "bg-red-500"
                                    )}
                                    style={{ width: `${validation.completeness}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </button>
                        );
                      })
                    ) : (
                      <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
                        No questions found
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Navigator Footer */}
              {navigatorSize !== 'compact' && (
                <div className="p-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400">
                  <div className="flex items-center justify-between">
                    <span>
                      {filteredQuestions.length} of {paper.questions.length} questions
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Question Content */}
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
          {/* Show Navigator Button (when hidden) */}
          {!showQuestionNavigation && (
            <div className="p-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowQuestionNavigation(true)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                title="Show sidebar"
              >
                <PanelLeft className="h-4 w-4 mr-2" />
                Show Questions
              </Button>
            </div>
          )}

          {/* Question Content Area */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto p-6">
              {currentQuestion && (
                <QuestionCard
                  question={currentQuestion}
                  questionIndex={currentQuestionIndex}
                  topics={topics}
                  subtopics={subtopics}
                  units={units}
                  onDelete={onDeleteQuestion}
                  onDeleteSubQuestion={onDeleteSubQuestion}
                  showQAActions={showQAActions}
                  readOnly={readOnly}
                  pdfDataUrl={pdfDataUrl}
                  onPdfUpload={onPdfUpload}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer with Quick Navigation */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-xs text-gray-600 dark:text-gray-400">
            <span className="flex items-center space-x-2">
              <kbd className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded">←</kbd>
              <kbd className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded">→</kbd>
              <span>Navigate</span>
            </span>
            <span className="flex items-center space-x-2">
              <kbd className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded">Ctrl</kbd>
              <span>+</span>
              <kbd className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded">F</kbd>
              <span>Search</span>
            </span>
            <span className="flex items-center space-x-2">
              <kbd className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded">Esc</kbd>
              <span>Close</span>
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => goToQuestion(0)}
              disabled={currentQuestionIndex === 0}
              className="text-xs"
            >
              <Zap className="h-3 w-3 mr-1" />
              First
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => goToQuestion(paper.questions.length - 1)}
              disabled={currentQuestionIndex === paper.questions.length - 1}
              className="text-xs"
            >
              Last
              <Zap className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}