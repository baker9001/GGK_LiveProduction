// src/app/system-admin/learning/practice-management/questions-setup/components/ExamSimulation.tsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  CheckCircle as CircleCheck, 
  XCircle, 
  AlertCircle,
  Play,
  Pause,
  RotateCcw,
  Flag,
  Eye,
  EyeOff,
  FileText,
  Award,
  Target,
  TrendingUp,
  BarChart3,
  PieChart,
  HelpCircle,
  BookOpen,
  Zap,
  Home,
  ChevronDown,
  ChevronUp,
  Filter,
  Search,
  Settings,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { Button } from '@/components/shared/Button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { Tooltip } from '@/components/shared/Tooltip';
import { cn } from '@/lib/utils';
import { useAnswerValidation } from '@/hooks/useAnswerValidation';
import DynamicAnswerField from '@/components/shared/DynamicAnswerField';
import { ResultsDashboard } from './ResultsDashboard';

interface QuestionOption {
  id: string;
  option_text: string;
  is_correct: boolean;
  order: number;
}

interface SubQuestion {
  id: string;
  part_label?: string;
  question_description: string;
  marks: number;
  difficulty?: string;
  type: 'mcq' | 'tf' | 'descriptive';
  status: string;
  topic_id?: string;
  topic_name?: string;
  unit_name?: string;
  subtopics?: Array<{ id: string; name: string }>;
  options?: QuestionOption[];
  attachments: Array<{
    id: string;
    file_url: string;
    file_name: string;
    file_type: string;
  }>;
  hint?: string;
  explanation?: string;
}

interface Question {
  id: string;
  question_number: string;
  question_description: string;
  marks: number;
  type: 'mcq' | 'tf' | 'descriptive';
  difficulty: string;
  topic_name?: string;
  subtopic_names?: string[];
  options?: QuestionOption[];
  parts: SubQuestion[];
  hint?: string;
  explanation?: string;
  attachments?: Array<{
    id: string;
    file_url: string;
    file_name: string;
    file_type: string;
  }>;
}

interface SimulationPaper {
  id: string;
  code: string;
  subject: string;
  duration?: string;
  total_marks: number;
  questions: Question[];
}

interface ExamSimulationProps {
  paper: SimulationPaper;
  onExit: () => void;
  isQAMode?: boolean;
}

interface UserAnswer {
  questionId: string;
  partId?: string;
  answer: any;
  isCorrect?: boolean;
  marksAwarded?: number;
  timeSpent?: number;
  partialCredit?: Array<{
    earned: number;
    reason: string;
  }>;
}

export function ExamSimulation({ paper, onExit, isQAMode = false }: ExamSimulationProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, UserAnswer>>({});
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());
  const [showHints, setShowHints] = useState(false);
  const [showExplanations, setShowExplanations] = useState(false);
  const [examMode, setExamMode] = useState<'practice' | 'timed' | 'review'>('practice');
  const [showQuestionNavigation, setShowQuestionNavigation] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [questionStartTimes, setQuestionStartTimes] = useState<Record<string, number>>({});
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { validateAnswer, calculateScore } = useAnswerValidation();
  
  const currentQuestion = paper.questions[currentQuestionIndex];
  const examDuration = paper.duration ? parseInt(paper.duration) * 60 : 0; // Convert to seconds
  
  // Timer effect
  useEffect(() => {
    if (isRunning && examMode === 'timed') {
      timerRef.current = setInterval(() => {
        setTimeElapsed(prev => {
          const newTime = prev + 1;
          if (examDuration > 0 && newTime >= examDuration) {
            handleSubmitExam();
            return examDuration;
          }
          return newTime;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning, examMode, examDuration]);
  
  // Track question start time
  useEffect(() => {
    if (currentQuestion && isRunning) {
      const questionKey = currentQuestion.id;
      if (!questionStartTimes[questionKey]) {
        setQuestionStartTimes(prev => ({
          ...prev,
          [questionKey]: Date.now()
        }));
      }
    }
  }, [currentQuestionIndex, currentQuestion, isRunning, questionStartTimes]);
  
  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showResults) return;
      
      if (e.key === 'ArrowLeft' && currentQuestionIndex > 0) {
        e.preventDefault();
        goToPreviousQuestion();
      } else if (e.key === 'ArrowRight' && currentQuestionIndex < paper.questions.length - 1) {
        e.preventDefault();
        goToNextQuestion();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleExit();
      } else if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentQuestionIndex, paper.questions.length, showResults]);
  
  // Prevent page refresh during exam
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isRunning && !showResults) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isRunning, showResults]);
  
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };
  
  const startExam = () => {
    setIsRunning(true);
    setTimeElapsed(0);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setFlaggedQuestions(new Set());
    setQuestionStartTimes({});
  };
  
  const pauseExam = () => {
    setIsRunning(false);
  };
  
  const resumeExam = () => {
    setIsRunning(true);
  };
  
  const handleExit = () => {
    if (isRunning && !showResults) {
      if (window.confirm('Are you sure you want to exit? Your progress will be lost.')) {
        onExit();
      }
    } else {
      onExit();
    }
  };
  
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };
  
  const goToQuestion = (index: number) => {
    if (index >= 0 && index < paper.questions.length) {
      setCurrentQuestionIndex(index);
    }
  };
  
  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };
  
  const goToNextQuestion = () => {
    if (currentQuestionIndex < paper.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };
  
  const toggleQuestionFlag = (questionId: string) => {
    setFlaggedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };
  
  const handleAnswerChange = (questionId: string, partId: string | undefined, answer: any) => {
    const key = partId ? `${questionId}-${partId}` : questionId;
    const startTime = questionStartTimes[questionId] || Date.now();
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    
    // Find the question and part to validate
    const question = paper.questions.find(q => q.id === questionId);
    if (!question) return;
    
    let questionToValidate;
    if (partId) {
      questionToValidate = question.parts.find(p => p.id === partId);
    } else {
      questionToValidate = question;
    }
    
    if (!questionToValidate) return;
    
    // Validate the answer
    const validation = validateAnswer(questionToValidate, answer);
    
    setUserAnswers(prev => ({
      ...prev,
      [key]: {
        questionId,
        partId,
        answer,
        isCorrect: validation.isCorrect,
        marksAwarded: validation.score * (questionToValidate.marks || 0),
        timeSpent,
        partialCredit: validation.partialCredit
      }
    }));
  };
  
  const handleSubmitExam = () => {
    setIsRunning(false);
    setShowResults(true);
  };
  
  const handleRetakeExam = () => {
    setShowResults(false);
    setUserAnswers({});
    setTimeElapsed(0);
    setCurrentQuestionIndex(0);
    setFlaggedQuestions(new Set());
    setQuestionStartTimes({});
  };
  
  const getQuestionStatus = (questionId: string, parts: SubQuestion[]) => {
    if (parts.length > 0) {
      const allPartsAnswered = parts.every(part => {
        const key = `${questionId}-${part.id}`;
        return userAnswers[key]?.answer !== undefined && userAnswers[key]?.answer !== '';
      });
      return allPartsAnswered ? 'answered' : 'partial';
    } else {
      const answer = userAnswers[questionId];
      return answer?.answer !== undefined && answer?.answer !== '' ? 'answered' : 'unanswered';
    }
  };
  
  const getAnsweredCount = () => {
    return paper.questions.filter(q => {
      const status = getQuestionStatus(q.id, q.parts);
      return status === 'answered';
    }).length;
  };
  
  const calculateProgress = () => {
    const totalQuestions = paper.questions.length;
    const answeredQuestions = getAnsweredCount();
    return totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;
  };
  
  // Show results dashboard
  if (showResults) {
    return (
      <ResultsDashboard
        paper={paper}
        userAnswers={userAnswers}
        timeElapsed={timeElapsed}
        onRetry={handleRetakeExam}
        onExit={onExit}
        onViewQuestion={(index) => {
          setShowResults(false);
          setCurrentQuestionIndex(index);
          setExamMode('review');
        }}
      />
    );
  }
  
  return (
    <div className={cn(
      "min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col",
      isFullscreen && "fixed inset-0 z-50"
    )}>
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left Section */}
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={handleExit}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="h-5 w-5" />
              </Button>
              
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {paper.code} - {paper.subject}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {examMode === 'practice' ? 'Practice Mode' : 
                   examMode === 'timed' ? 'Timed Exam' : 'Review Mode'}
                </p>
              </div>
            </div>
            
            {/* Center Section - Timer */}
            <div className="flex items-center space-x-6">
              {examMode === 'timed' && examDuration > 0 && (
                <div className={cn(
                  "flex items-center space-x-2 px-4 py-2 rounded-lg",
                  timeElapsed > examDuration * 0.8 ? "bg-red-100 dark:bg-red-900/20" : "bg-[#E8F5DC] dark:bg-[#5D7E23]/20"
                )}>
                  <Clock className={cn(
                    "h-5 w-5",
                    timeElapsed > examDuration * 0.8 ? "text-red-600 dark:text-red-400" : "text-[#99C93B] dark:text-[#AAD775]"
                  )} />
                  <span className={cn(
                    "font-mono text-lg font-semibold",
                    timeElapsed > examDuration * 0.8 ? "text-red-700 dark:text-red-300" : "text-[#5D7E23] dark:text-[#AAD775]"
                  )}>
                    {formatTime(examDuration - timeElapsed)}
                  </span>
                </div>
              )}
              
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <span>Progress:</span>
                <span className="font-medium">{getAnsweredCount()}/{paper.questions.length}</span>
                <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#99C93B] transition-all duration-300"
                    style={{ width: `${calculateProgress()}%` }}
                  />
                </div>
              </div>
            </div>
            
            {/* Right Section */}
            <div className="flex items-center space-x-3">
              {!isRunning && examMode !== 'review' && (
                <Button
                  onClick={startExam}
                  leftIcon={<Play className="h-4 w-4" />}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Start Exam
                </Button>
              )}
              
              {isRunning && (
                <>
                  <Button
                    variant="outline"
                    onClick={pauseExam}
                    leftIcon={<Pause className="h-4 w-4" />}
                  >
                    Pause
                  </Button>
                  <Button
                    onClick={handleSubmitExam}
                    className="bg-[#99C93B] hover:bg-blue-700 text-white"
                  >
                    Submit Exam
                  </Button>
                </>
              )}
              
              {!isRunning && timeElapsed > 0 && examMode !== 'review' && (
                <Button
                  variant="outline"
                  onClick={resumeExam}
                  leftIcon={<Play className="h-4 w-4" />}
                >
                  Resume
                </Button>
              )}
              
              <Button
                variant="ghost"
                onClick={toggleFullscreen}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Question Navigation Sidebar */}
        {showQuestionNavigation && (
          <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
            {/* Navigation Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Questions</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowQuestionNavigation(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Exam Mode Selector */}
              <div className="flex items-center space-x-2 mb-4">
                <button
                  onClick={() => setExamMode('practice')}
                  className={cn(
                    "px-3 py-1 text-sm rounded-md transition-colors",
                    examMode === 'practice' 
                      ? "bg-[#E8F5DC] dark:bg-[#5D7E23]/30 text-[#5D7E23] dark:text-[#AAD775]" 
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  )}
                >
                  Practice
                </button>
                <button
                  onClick={() => setExamMode('timed')}
                  className={cn(
                    "px-3 py-1 text-sm rounded-md transition-colors",
                    examMode === 'timed' 
                      ? "bg-[#E8F5DC] dark:bg-[#5D7E23]/30 text-[#5D7E23] dark:text-[#AAD775]" 
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  )}
                >
                  Timed
                </button>
                <button
                  onClick={() => setExamMode('review')}
                  className={cn(
                    "px-3 py-1 text-sm rounded-md transition-colors",
                    examMode === 'review' 
                      ? "bg-[#E8F5DC] dark:bg-[#5D7E23]/30 text-[#5D7E23] dark:text-[#AAD775]" 
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  )}
                >
                  Review
                </button>
              </div>
              
              {/* Options */}
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={showHints}
                    onChange={(e) => setShowHints(e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Show hints</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={showExplanations}
                    onChange={(e) => setShowExplanations(e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Show explanations</span>
                </label>
              </div>
            </div>
            
            {/* Question Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-5 gap-2">
                {paper.questions.map((question, index) => {
                  const status = getQuestionStatus(question.id, question.parts);
                  const isCurrent = index === currentQuestionIndex;
                  const isFlagged = flaggedQuestions.has(question.id);
                  
                  return (
                    <Tooltip
                      key={question.id}
                      content={`Question ${index + 1}: ${question.question_description.substring(0, 50)}...`}
                    >
                      <button
                        onClick={() => goToQuestion(index)}
                        className={cn(
                          "relative p-3 rounded-lg text-sm font-medium transition-all hover:shadow-md",
                          isCurrent && "ring-2 ring-[#99C93B]",
                          status === 'answered' && "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
                          status === 'partial' && "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300",
                          status === 'unanswered' && "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                        )}
                      >
                        {index + 1}
                        {status === 'answered' && (
                          <CircleCheck className="absolute -top-1 -right-1 h-4 w-4 text-green-500" />
                        )}
                        {isFlagged && (
                          <Flag className="absolute -top-1 -left-1 h-4 w-4 text-red-500" />
                        )}
                      </button>
                    </Tooltip>
                  );
                })}
              </div>
              
              {/* Legend */}
              <div className="mt-6 space-y-2 text-xs">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-green-100 dark:bg-green-900/30 rounded" />
                  <span className="text-gray-600 dark:text-gray-400">Answered</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-yellow-100 dark:bg-yellow-900/30 rounded" />
                  <span className="text-gray-600 dark:text-gray-400">Partially Answered</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-gray-100 dark:bg-gray-700 rounded" />
                  <span className="text-gray-600 dark:text-gray-400">Not Answered</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Question Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!showQuestionNavigation && (
            <div className="p-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowQuestionNavigation(true)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Show Questions
              </Button>
            </div>
          )}
          
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto p-6">
              {currentQuestion && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                  {/* Question Header */}
                  <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                          Question {currentQuestionIndex + 1}
                        </h2>
                        <StatusBadge status={currentQuestion.type} />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {currentQuestion.marks} mark{currentQuestion.marks !== 1 ? 's' : ''}
                        </span>
                        {currentQuestion.difficulty && (
                          <span className={cn(
                            "px-2 py-1 rounded-full text-xs font-medium",
                            currentQuestion.difficulty === 'easy' && "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
                            currentQuestion.difficulty === 'medium' && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
                            currentQuestion.difficulty === 'hard' && "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                          )}>
                            {currentQuestion.difficulty}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleQuestionFlag(currentQuestion.id)}
                          className={cn(
                            flaggedQuestions.has(currentQuestion.id) 
                              ? "text-red-600 dark:text-red-400" 
                              : "text-gray-400 dark:text-gray-500"
                          )}
                        >
                          <Flag className="h-4 w-4" />
                        </Button>
                        
                        {currentQuestion.topic_name && (
                          <span className="text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                            {currentQuestion.topic_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Question Content */}
                  <div className="p-6">
                    <div className="prose dark:prose-invert max-w-none mb-6">
                      <p className="text-gray-900 dark:text-white text-lg leading-relaxed">
                        {currentQuestion.question_description}
                      </p>
                    </div>
                    
                    {/* Attachments */}
                    {currentQuestion.attachments && currentQuestion.attachments.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                          Reference Materials:
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {currentQuestion.attachments.map(attachment => (
                            <div key={attachment.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                              {attachment.file_type.startsWith('image/') ? (
                                <img 
                                  src={attachment.file_url} 
                                  alt={attachment.file_name}
                                  className="w-full h-auto"
                                />
                              ) : (
                                <div className="p-4 flex items-center space-x-3">
                                  <FileText className="h-8 w-8 text-gray-400" />
                                  <div>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                      {attachment.file_name}
                                    </p>
                                    <a 
                                      href={attachment.file_url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-[#99C93B] dark:text-[#AAD775] hover:underline"
                                    >
                                      Open file
                                    </a>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Hint */}
                    {showHints && currentQuestion.hint && (
                      <div className="mb-6 p-4 bg-[#E8F5DC] dark:bg-[#5D7E23]/20 border border-[#99C93B]/30 dark:border-blue-800 rounded-lg">
                        <div className="flex items-start space-x-2">
                          <HelpCircle className="h-5 w-5 text-[#99C93B] dark:text-[#AAD775] mt-0.5" />
                          <div>
                            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">Hint</h4>
                            <p className="text-[#5D7E23] dark:text-blue-200">{currentQuestion.hint}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Main Question Answer */}
                    {currentQuestion.parts.length === 0 && (
                      <div className="mb-6">
                        <DynamicAnswerField
                          question={{
                            ...currentQuestion,
                            options: currentQuestion.options?.map(opt => ({
                              label: opt.id,
                              text: opt.option_text,
                              is_correct: opt.is_correct
                            }))
                          }}
                          value={userAnswers[currentQuestion.id]?.answer}
                          onChange={(answer) => handleAnswerChange(currentQuestion.id, undefined, answer)}
                          disabled={!isQAMode && (!isRunning && examMode !== 'practice')}
                          showHints={showHints}
                          showCorrectAnswer={examMode === 'review' || showExplanations || isQAMode}
                          mode={examMode}
                        />
                      </div>
                    )}
                    
                    {/* Sub-questions */}
                    {currentQuestion.parts.length > 0 && (
                      <div className="space-y-6">
                        {currentQuestion.parts.map((part, partIndex) => (
                          <div key={part.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                            <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium text-gray-900 dark:text-white">
                                  {part.part_label || `Part ${String.fromCharCode(97 + partIndex)}`}
                                </h4>
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm text-gray-600 dark:text-gray-400">
                                    {part.marks} mark{part.marks !== 1 ? 's' : ''}
                                  </span>
                                  {part.difficulty && (
                                    <span className={cn(
                                      "px-2 py-1 rounded-full text-xs font-medium",
                                      part.difficulty === 'easy' && "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
                                      part.difficulty === 'medium' && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
                                      part.difficulty === 'hard' && "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                                    )}>
                                      {part.difficulty}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="p-4">
                              <div className="prose dark:prose-invert max-w-none mb-4">
                                <p className="text-gray-900 dark:text-white">
                                  {part.question_description}
                                </p>
                              </div>
                              
                              {/* Part Hint */}
                              {showHints && part.hint && (
                                <div className="mb-4 p-3 bg-[#E8F5DC] dark:bg-[#5D7E23]/20 border border-[#99C93B]/30 dark:border-blue-800 rounded">
                                  <div className="flex items-start space-x-2">
                                    <HelpCircle className="h-4 w-4 text-[#99C93B] dark:text-[#AAD775] mt-0.5" />
                                    <p className="text-sm text-[#5D7E23] dark:text-blue-200">{part.hint}</p>
                                  </div>
                                </div>
                              )}
                              
                              <DynamicAnswerField
                                question={{
                                  ...part,
                                  options: part.options?.map(opt => ({
                                    label: opt.id,
                                    text: opt.option_text,
                                    is_correct: opt.is_correct
                                  }))
                                }}
                                value={userAnswers[`${currentQuestion.id}-${part.id}`]?.answer}
                                onChange={(answer) => handleAnswerChange(currentQuestion.id, part.id, answer)}
                                disabled={!isQAMode && (!isRunning && examMode !== 'practice')}
                                showHints={showHints}
                                showCorrectAnswer={examMode === 'review' || showExplanations || isQAMode}
                                mode={examMode}
                              />
                              
                              {/* Part Explanation */}
                              {showExplanations && part.explanation && (
                                <div className="mt-4 p-3 bg-[#E8F5DC] dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded">
                                  <div className="flex items-start space-x-2">
                                    <BookOpen className="h-4 w-4 text-[#5D7E23] dark:text-purple-400 mt-0.5" />
                                    <div>
                                      <h5 className="font-medium text-purple-900 dark:text-purple-100 mb-1">Explanation</h5>
                                      <p className="text-sm text-purple-800 dark:text-purple-200">{part.explanation}</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Main Question Explanation */}
                    {showExplanations && currentQuestion.explanation && (
                      <div className="mt-6 p-4 bg-[#E8F5DC] dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                        <div className="flex items-start space-x-2">
                          <BookOpen className="h-5 w-5 text-[#5D7E23] dark:text-purple-400 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-purple-900 dark:text-purple-100 mb-1">Explanation</h4>
                            <p className="text-purple-800 dark:text-purple-200">{currentQuestion.explanation}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer Navigation */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex-shrink-0">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Button
            variant="outline"
            onClick={goToPreviousQuestion}
            disabled={currentQuestionIndex === 0}
            leftIcon={<ChevronLeft className="h-4 w-4" />}
          >
            Previous
          </Button>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Question {currentQuestionIndex + 1} of {paper.questions.length}
            </span>
            
            {examMode !== 'review' && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Time: {formatTime(timeElapsed)}
              </div>
            )}
          </div>
          
          <Button
            variant="outline"
            onClick={goToNextQuestion}
            disabled={currentQuestionIndex === paper.questions.length - 1}
            rightIcon={<ChevronRight className="h-4 w-4" />}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}