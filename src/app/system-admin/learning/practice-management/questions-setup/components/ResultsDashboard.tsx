// src/app/system-admin/learning/practice-management/questions-setup/components/ResultsDashboard.tsx

import React, { useState } from 'react';
import { Award, Clock, Target, TrendingUp, CheckCircle, XCircle, AlertCircle, BarChart3, PieChart, FileText, RotateCcw, Eye, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { Button } from '../../../../../../components/shared/Button';
import { cn } from '../../../../../../lib/utils';

interface UserAnswer {
  questionId: string;
  partId?: string;
  answer: any;
  isCorrect?: boolean;
  marksAwarded?: number;
  partialCredit?: {
    earned: number;
    reason: string;
  }[];
}

interface QuestionOption {
  id: string;
  option_text: string;
  is_correct: boolean;
  order: number;
}

interface Question {
  id: string;
  question_number: string;
  question_description: string;
  marks: number;
  difficulty: string;
  topic_name?: string;
  type: 'mcq' | 'tf' | 'descriptive';
  options?: QuestionOption[];
  parts: any[];
  answer_format?: string;
  correct_answer?: string;
  correct_answers?: any[];
  answer_requirement?: string;
  hint?: string;
  explanation?: string;
}

interface ExamPaper {
  id: string;
  code: string;
  subject: string;
  duration?: string;
  total_marks: number;
  questions: Question[];
}

interface ResultsDashboardProps {
  paper: ExamPaper;
  userAnswers: Record<string, UserAnswer>;
  timeElapsed: number;
  onRetry: () => void;
  onExit: () => void;
  onViewQuestion?: (questionIndex: number) => void;
}

export function ResultsDashboard({
  paper,
  userAnswers,
  timeElapsed,
  onRetry,
  onExit,
  onViewQuestion
}: ResultsDashboardProps) {
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [showDetailedView, setShowDetailedView] = useState(false);

  // Toggle question expansion
  const toggleQuestionExpansion = (questionId: string) => {
    setExpandedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  // Calculate statistics with partial credit support
  const calculateStats = () => {
    let totalQuestions = 0;
    let attemptedQuestions = 0;
    let correctAnswers = 0;
    let partiallyCorrectAnswers = 0;
    let totalPossibleMarks = 0;
    let earnedMarks = 0;
    
    const difficultyStats = {
      easy: { total: 0, correct: 0, partial: 0, marks: 0, earnedMarks: 0 },
      medium: { total: 0, correct: 0, partial: 0, marks: 0, earnedMarks: 0 },
      hard: { total: 0, correct: 0, partial: 0, marks: 0, earnedMarks: 0 }
    };
    
    const topicStats: Record<string, { total: number; correct: number; partial: number; marks: number; earnedMarks: number }> = {};
    const typeStats = {
      mcq: { total: 0, correct: 0, partial: 0 },
      tf: { total: 0, correct: 0, partial: 0 },
      descriptive: { total: 0, correct: 0, partial: 0 }
    };
    
    paper.questions.forEach(question => {
      if (question.parts.length > 0) {
        // Multi-part question
        question.parts.forEach(part => {
          totalQuestions++;
          totalPossibleMarks += part.marks;
          
          const key = `${question.id}-${part.id}`;
          const answer = userAnswers[key];
          
          if (answer?.answer !== undefined && answer?.answer !== '') {
            attemptedQuestions++;
            const marksEarned = answer.marksAwarded || 0;
            earnedMarks += marksEarned;
            
            if (answer.isCorrect) {
              correctAnswers++;
            } else if (marksEarned > 0) {
              partiallyCorrectAnswers++;
            }
            
            // Update type stats
            const partType = part.type || 'descriptive';
            if (partType in typeStats) {
              typeStats[partType as keyof typeof typeStats].total++;
              if (answer.isCorrect) {
                typeStats[partType as keyof typeof typeStats].correct++;
              } else if (marksEarned > 0) {
                typeStats[partType as keyof typeof typeStats].partial++;
              }
            }
          }
          
          // Update difficulty stats
          const difficulty = part.difficulty || question.difficulty || 'medium';
          if (difficulty in difficultyStats) {
            difficultyStats[difficulty as keyof typeof difficultyStats].total++;
            difficultyStats[difficulty as keyof typeof difficultyStats].marks += part.marks;
            if (answer?.isCorrect) {
              difficultyStats[difficulty as keyof typeof difficultyStats].correct++;
            } else if ((answer?.marksAwarded || 0) > 0) {
              difficultyStats[difficulty as keyof typeof difficultyStats].partial++;
            }
            difficultyStats[difficulty as keyof typeof difficultyStats].earnedMarks += answer?.marksAwarded || 0;
          }
        });
      } else {
        // Single question
        totalQuestions++;
        totalPossibleMarks += question.marks;
        
        const answer = userAnswers[question.id];
        
        if (answer?.answer !== undefined && answer?.answer !== '') {
          attemptedQuestions++;
          const marksEarned = answer.marksAwarded || 0;
          earnedMarks += marksEarned;
          
          if (answer.isCorrect) {
            correctAnswers++;
          } else if (marksEarned > 0) {
            partiallyCorrectAnswers++;
          }
          
          // Update type stats
          if (question.type in typeStats) {
            typeStats[question.type as keyof typeof typeStats].total++;
            if (answer.isCorrect) {
              typeStats[question.type as keyof typeof typeStats].correct++;
            } else if (marksEarned > 0) {
              typeStats[question.type as keyof typeof typeStats].partial++;
            }
          }
        }
        
        // Update difficulty stats
        const difficulty = question.difficulty || 'medium';
        if (difficulty in difficultyStats) {
          difficultyStats[difficulty as keyof typeof difficultyStats].total++;
          difficultyStats[difficulty as keyof typeof difficultyStats].marks += question.marks;
          if (answer?.isCorrect) {
            difficultyStats[difficulty as keyof typeof difficultyStats].correct++;
          } else if ((answer?.marksAwarded || 0) > 0) {
            difficultyStats[difficulty as keyof typeof difficultyStats].partial++;
          }
          difficultyStats[difficulty as keyof typeof difficultyStats].earnedMarks += answer?.marksAwarded || 0;
        }
        
        // Update topic stats
        if (question.topic_name) {
          if (!topicStats[question.topic_name]) {
            topicStats[question.topic_name] = { total: 0, correct: 0, partial: 0, marks: 0, earnedMarks: 0 };
          }
          topicStats[question.topic_name].total++;
          topicStats[question.topic_name].marks += question.marks;
          if (answer?.isCorrect) {
            topicStats[question.topic_name].correct++;
          } else if ((answer?.marksAwarded || 0) > 0) {
            topicStats[question.topic_name].partial++;
          }
          topicStats[question.topic_name].earnedMarks += answer?.marksAwarded || 0;
        }
      }
    });
    
    const percentage = totalPossibleMarks > 0 ? (earnedMarks / totalPossibleMarks) * 100 : 0;
    const accuracy = attemptedQuestions > 0 ? (correctAnswers / attemptedQuestions) * 100 : 0;
    const completionRate = totalQuestions > 0 ? (attemptedQuestions / totalQuestions) * 100 : 0;
    
    return {
      totalQuestions,
      attemptedQuestions,
      unattemptedQuestions: totalQuestions - attemptedQuestions,
      correctAnswers,
      partiallyCorrectAnswers,
      incorrectAnswers: attemptedQuestions - correctAnswers - partiallyCorrectAnswers,
      totalPossibleMarks,
      earnedMarks,
      percentage,
      accuracy,
      completionRate,
      difficultyStats,
      topicStats,
      typeStats
    };
  };
  
  const stats = calculateStats();
  
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };
  
  const getGrade = (percentage: number) => {
    if (percentage >= 90) return { grade: 'A+', color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30' };
    if (percentage >= 80) return { grade: 'A', color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30' };
    if (percentage >= 70) return { grade: 'B', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' };
    if (percentage >= 60) return { grade: 'C', color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' };
    if (percentage >= 50) return { grade: 'D', color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/30' };
    return { grade: 'F', color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30' };
  };
  
  const { grade, color: gradeColor, bgColor: gradeBgColor } = getGrade(stats.percentage);

  // Get correct answer display
  const getCorrectAnswerDisplay = (question: Question, partId?: string) => {
    if (partId) {
      const part = question.parts.find(p => p.id === partId);
      if (!part) return null;
      
      if (part.type === 'mcq' && part.options) {
        const correct = part.options.find(o => o.is_correct);
        return correct ? `Option ${correct.option_text}` : null;
      }
      return part.correct_answer || 'See explanation';
    }
    
    if (question.type === 'mcq' && question.options) {
      const correct = question.options.find(o => o.is_correct);
      return correct ? `Option ${correct.option_text}` : null;
    }
    
    if (question.type === 'tf') {
      const correct = question.options?.find(o => o.is_correct);
      return correct?.option_text || question.correct_answer || null;
    }
    
    return question.correct_answer || 'See explanation';
  };

  // Render detailed question review
  const renderDetailedQuestionReview = () => {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Detailed Question Review
          </h3>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowDetailedView(false)}
          >
            Hide Details
          </Button>
        </div>
        
        {paper.questions.map((question, index) => {
          const isExpanded = expandedQuestions.has(question.id);
          let questionStatus: 'correct' | 'partial' | 'incorrect' | 'unattempted' = 'unattempted';
          let questionMarks = 0;
          let totalMarks = question.marks;
          
          if (question.parts.length > 0) {
            totalMarks = question.parts.reduce((sum, part) => sum + part.marks, 0);
            question.parts.forEach(part => {
              const key = `${question.id}-${part.id}`;
              const answer = userAnswers[key];
              if (answer?.answer !== undefined) {
                questionMarks += answer.marksAwarded || 0;
              }
            });
          } else {
            const answer = userAnswers[question.id];
            if (answer?.answer !== undefined) {
              questionMarks = answer.marksAwarded || 0;
            }
          }
          
          if (questionMarks === totalMarks) {
            questionStatus = 'correct';
          } else if (questionMarks > 0) {
            questionStatus = 'partial';
          } else if (question.parts.length > 0) {
            const hasAnswer = question.parts.some(part => {
              const key = `${question.id}-${part.id}`;
              return userAnswers[key]?.answer !== undefined;
            });
            if (hasAnswer) questionStatus = 'incorrect';
          } else if (userAnswers[question.id]?.answer !== undefined) {
            questionStatus = 'incorrect';
          }
          
          return (
            <div 
              key={question.id}
              className={cn(
                "border rounded-lg overflow-hidden transition-all",
                questionStatus === 'correct' && "border-green-300 dark:border-green-700",
                questionStatus === 'partial' && "border-yellow-300 dark:border-yellow-700",
                questionStatus === 'incorrect' && "border-red-300 dark:border-red-700",
                questionStatus === 'unattempted' && "border-gray-300 dark:border-gray-700"
              )}
            >
              <button
                onClick={() => toggleQuestionExpansion(question.id)}
                className={cn(
                  "w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors",
                  questionStatus === 'correct' && "bg-green-50 dark:bg-green-900/20",
                  questionStatus === 'partial' && "bg-yellow-50 dark:bg-yellow-900/20",
                  questionStatus === 'incorrect' && "bg-red-50 dark:bg-red-900/20"
                )}
              >
                <div className="flex items-center space-x-4">
                  <span className="font-semibold text-gray-900 dark:text-white">
                    Question {index + 1}
                  </span>
                  {questionStatus === 'correct' && <CheckCircle className="h-5 w-5 text-green-600" />}
                  {questionStatus === 'partial' && <AlertCircle className="h-5 w-5 text-yellow-600" />}
                  {questionStatus === 'incorrect' && <XCircle className="h-5 w-5 text-red-600" />}
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {questionMarks}/{totalMarks} marks
                  </span>
                </div>
                {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </button>
              
              {isExpanded && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
                  <div>
                    <p className="text-gray-800 dark:text-gray-200 mb-2">{question.question_description}</p>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <span className={cn(
                        "px-2 py-1 rounded",
                        question.difficulty === 'easy' && "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
                        question.difficulty === 'medium' && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
                        question.difficulty === 'hard' && "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                      )}>
                        {question.difficulty}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                        {question.type.toUpperCase()}
                      </span>
                      {question.topic_name && (
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded">
                          {question.topic_name}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {question.parts.length === 0 ? (
                    <div className="bg-gray-50 dark:bg-gray-900 rounded p-3">
                      <div className="space-y-2">
                        <div>
                          <span className="font-medium text-gray-700 dark:text-gray-300">Your Answer: </span>
                          <span className="text-gray-900 dark:text-white">
                            {userAnswers[question.id]?.answer || 'Not attempted'}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700 dark:text-gray-300">Correct Answer: </span>
                          <span className="text-green-600 dark:text-green-400">
                            {getCorrectAnswerDisplay(question)}
                          </span>
                        </div>
                        {userAnswers[question.id]?.partialCredit && (
                          <div className="mt-2 text-sm text-yellow-600 dark:text-yellow-400">
                            Partial Credit: {userAnswers[question.id].partialCredit?.map(pc => pc.reason).join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {question.parts.map((part, partIndex) => {
                        const key = `${question.id}-${part.id}`;
                        const answer = userAnswers[key];
                        
                        return (
                          <div key={part.id} className="bg-gray-50 dark:bg-gray-900 rounded p-3">
                            <div className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Part {String.fromCharCode(97 + partIndex)}
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                              {part.question_description}
                            </p>
                            <div className="space-y-1 text-sm">
                              <div>
                                <span className="font-medium">Your Answer: </span>
                                <span className={cn(
                                  answer?.isCorrect && "text-green-600 dark:text-green-400",
                                  !answer?.isCorrect && answer?.answer && "text-red-600 dark:text-red-400"
                                )}>
                                  {answer?.answer || 'Not attempted'}
                                </span>
                              </div>
                              <div>
                                <span className="font-medium">Correct Answer: </span>
                                <span className="text-green-600 dark:text-green-400">
                                  {getCorrectAnswerDisplay(question, part.id)}
                                </span>
                              </div>
                              <div>
                                <span className="font-medium">Marks: </span>
                                <span>{answer?.marksAwarded || 0}/{part.marks}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {(question.hint || question.explanation) && (
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-3 space-y-2">
                      {question.hint && (
                        <div className="flex items-start space-x-2">
                          <HelpCircle className="h-4 w-4 text-blue-500 mt-0.5" />
                          <div>
                            <span className="font-medium text-blue-700 dark:text-blue-300">Hint: </span>
                            <span className="text-gray-700 dark:text-gray-300">{question.hint}</span>
                          </div>
                        </div>
                      )}
                      {question.explanation && (
                        <div className="flex items-start space-x-2">
                          <AlertCircle className="h-4 w-4 text-purple-500 mt-0.5" />
                          <div>
                            <span className="font-medium text-purple-700 dark:text-purple-300">Explanation: </span>
                            <span className="text-gray-700 dark:text-gray-300">{question.explanation}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 text-center">
          <Award className="h-20 w-20 mx-auto text-blue-500 mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Exam Completed!
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            {paper.code} - {paper.subject}
          </p>
        </div>
        
        {/* Main Score Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <div className={cn("text-6xl font-bold mb-2 p-4 rounded-lg", gradeColor, gradeBgColor)}>
                {grade}
              </div>
              <p className="text-gray-600 dark:text-gray-400">Grade</p>
            </div>
            
            <div>
              <div className="text-6xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                {stats.percentage.toFixed(1)}%
              </div>
              <p className="text-gray-600 dark:text-gray-400">Overall Score</p>
            </div>
            
            <div>
              <div className="text-6xl font-bold text-gray-900 dark:text-white mb-2">
                {stats.earnedMarks.toFixed(1)}/{stats.totalPossibleMarks}
              </div>
              <p className="text-gray-600 dark:text-gray-400">Marks Obtained</p>
            </div>
          </div>
        </div>
        
        {/* Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Time Taken
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {formatTime(timeElapsed)}
                </p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Completion Rate
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {stats.completionRate.toFixed(0)}%
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {stats.attemptedQuestions}/{stats.totalQuestions} questions
                </p>
              </div>
              <Target className="h-8 w-8 text-purple-500" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Answer Breakdown
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-green-600 dark:text-green-400 font-semibold">
                    {stats.correctAnswers}
                  </span>
                  {stats.partiallyCorrectAnswers > 0 && (
                    <>
                      <span className="text-gray-400">/</span>
                      <span className="text-yellow-600 dark:text-yellow-400 font-semibold">
                        {stats.partiallyCorrectAnswers}
                      </span>
                    </>
                  )}
                  <span className="text-gray-400">/</span>
                  <span className="text-red-600 dark:text-red-400 font-semibold">
                    {stats.incorrectAnswers}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Correct / Partial / Wrong
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Accuracy Rate
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {stats.accuracy.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Of attempted questions
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-500" />
            </div>
          </div>
        </div>
        
        {/* Detailed Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Difficulty Analysis */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Performance by Difficulty
            </h3>
            <div className="space-y-4">
              {Object.entries(stats.difficultyStats).map(([difficulty, data]) => {
                const percentage = data.marks > 0 ? (data.earnedMarks / data.marks) * 100 : 0;
                return (
                  <div key={difficulty}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="capitalize text-gray-700 dark:text-gray-300">
                        {difficulty}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {data.earnedMarks.toFixed(1)}/{data.marks} ({percentage.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={cn(
                          "h-2 rounded-full transition-all duration-300",
                          difficulty === 'easy' && "bg-green-500",
                          difficulty === 'medium' && "bg-yellow-500",
                          difficulty === 'hard' && "bg-red-500"
                        )}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {data.correct} correct, {data.partial} partial, {data.total} total
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Question Type Performance */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <PieChart className="h-5 w-5 mr-2" />
              Performance by Type
            </h3>
            <div className="space-y-3">
              {Object.entries(stats.typeStats).map(([type, data]) => {
                if (data.total === 0) return null;
                const percentage = data.total > 0 ? (data.correct / data.total) * 100 : 0;
                const partialPercentage = data.total > 0 ? (data.partial / data.total) * 100 : 0;
                
                return (
                  <div key={type} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase">
                        {type}
                      </span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {data.correct + data.partial}/{data.total}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 flex overflow-hidden">
                      <div
                        className="bg-green-500 h-2 transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                      <div
                        className="bg-yellow-500 h-2 transition-all duration-300"
                        style={{ width: `${partialPercentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex items-center justify-center space-x-4 text-xs">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span className="text-gray-600 dark:text-gray-400">Correct</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                <span className="text-gray-600 dark:text-gray-400">Partial</span>
              </div>
            </div>
          </div>
          
          {/* Topic Performance */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Performance by Topic
            </h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {Object.entries(stats.topicStats).map(([topic, data]) => {
                const percentage = data.marks > 0 ? (data.earnedMarks / data.marks) * 100 : 0;
                return (
                  <div key={topic} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1 mr-2">
                      {topic}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {data.earnedMarks.toFixed(1)}/{data.marks}
                      </span>
                      <div className={cn(
                        "px-2 py-1 rounded text-xs font-medium",
                        percentage >= 80 && "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
                        percentage >= 60 && percentage < 80 && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
                        percentage < 60 && "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                      )}>
                        {percentage.toFixed(0)}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        
        {/* Question-wise Performance */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Question-wise Performance
            </h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowDetailedView(!showDetailedView)}
              leftIcon={<Eye className="h-4 w-4" />}
            >
              {showDetailedView ? 'Hide' : 'Show'} Details
            </Button>
          </div>
          
          <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
            {paper.questions.map((question, index) => {
              let status: 'correct' | 'partial' | 'incorrect' | 'unattempted' = 'unattempted';
              let earnedMarks = 0;
              let totalMarks = question.marks;
              
              if (question.parts.length > 0) {
                totalMarks = question.parts.reduce((sum, part) => sum + part.marks, 0);
                question.parts.forEach(part => {
                  const key = `${question.id}-${part.id}`;
                  earnedMarks += userAnswers[key]?.marksAwarded || 0;
                });
                
                const allPartsAnswered = question.parts.every(part => {
                  const key = `${question.id}-${part.id}`;
                  return userAnswers[key]?.answer !== undefined;
                });
                
                if (allPartsAnswered) {
                  if (earnedMarks === totalMarks) {
                    status = 'correct';
                  } else if (earnedMarks > 0) {
                    status = 'partial';
                  } else {
                    status = 'incorrect';
                  }
                } else if (earnedMarks > 0) {
                  status = 'partial';
                }
              } else {
                const answer = userAnswers[question.id];
                if (answer?.answer !== undefined) {
                  earnedMarks = answer.marksAwarded || 0;
                  if (answer.isCorrect) {
                    status = 'correct';
                  } else if (earnedMarks > 0) {
                    status = 'partial';
                  } else {
                    status = 'incorrect';
                  }
                }
              }
              
              return (
                <button
                  key={question.id}
                  onClick={() => onViewQuestion?.(index)}
                  className={cn(
                    "relative p-3 rounded-lg font-medium text-sm transition-all hover:shadow-md group",
                    status === 'correct' && "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
                    status === 'partial' && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
                    status === 'incorrect' && "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
                    status === 'unattempted' && "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                  )}
                >
                  <span>Q{index + 1}</span>
                  {status === 'partial' && (
                    <div className="absolute -top-1 -right-1 bg-yellow-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {Math.round((earnedMarks / totalMarks) * 100)}%
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-lg">
                    <span className="text-white text-xs font-medium">
                      {earnedMarks}/{totalMarks}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
          
          <div className="flex items-center justify-center space-x-6 mt-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-100 dark:bg-green-900/30 rounded"></div>
              <span className="text-gray-600 dark:text-gray-400">Correct</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-yellow-100 dark:bg-yellow-900/30 rounded"></div>
              <span className="text-gray-600 dark:text-gray-400">Partial Credit</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-100 dark:bg-red-900/30 rounded"></div>
              <span className="text-gray-600 dark:text-gray-400">Incorrect</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-gray-100 dark:bg-gray-700 rounded"></div>
              <span className="text-gray-600 dark:text-gray-400">Not Attempted</span>
            </div>
          </div>
        </div>
        
        {/* Detailed Question Review */}
        {showDetailedView && renderDetailedQuestionReview()}
        
        {/* Action Buttons */}
        <div className="flex justify-center space-x-4">
          <Button
            size="lg"
            onClick={onRetry}
            leftIcon={<RotateCcw className="h-5 w-5" />}
          >
            Retake Exam
          </Button>
          
          <Button
            size="lg"
            variant="secondary"
            onClick={onExit}
          >
            Exit to Questions
          </Button>
        </div>
      </div>
    </div>
  );
}