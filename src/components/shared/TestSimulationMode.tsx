import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle,
  Circle,
  Flag,
  Play,
  Pause,
  RotateCcw,
  Award,
  AlertCircle,
  FileCheck,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../lib/utils';
import DynamicAnswerField from './DynamicAnswerField';
import { EnhancedQuestionDisplay, QuestionDisplayData } from './EnhancedQuestionDisplay';

interface UserAnswer {
  questionId: string;
  answer: any;
  timeSpent: number;
  isFlagged: boolean;
  isAnswered: boolean;
}

interface SimulationResults {
  totalQuestions: number;
  answeredQuestions: number;
  correctAnswers: number;
  partiallyCorrect: number;
  incorrectAnswers: number;
  totalMarks: number;
  earnedMarks: number;
  percentage: number;
  timeSpent: number;
  questionResults: Array<{
    questionId: string;
    questionNumber: string;
    isCorrect: boolean;
    earnedMarks: number;
    totalMarks: number;
    userAnswer: any;
    correctAnswers: any[];
    feedback: string;
  }>;
}

interface TestSimulationModeProps {
  questions: QuestionDisplayData[];
  paperTitle: string;
  duration?: string;
  totalMarks: number;
  onComplete: (results: SimulationResults) => void;
  onExit: () => void;
  allowPause?: boolean;
  showAnswersOnCompletion?: boolean;
}

export const TestSimulationMode: React.FC<TestSimulationModeProps> = ({
  questions,
  paperTitle,
  duration,
  totalMarks,
  onComplete,
  onExit,
  allowPause = true,
  showAnswersOnCompletion = true
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, UserAnswer>>({});
  const [timeSpent, setTimeSpent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [results, setResults] = useState<SimulationResults | null>(null);
  const [showConfirmExit, setShowConfirmExit] = useState(false);
  const [showReviewMode, setShowReviewMode] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState<Record<string, number>>({});

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const currentQuestion = questions[currentQuestionIndex];

  const normalizedQuestion = useMemo(() => {
    if (!currentQuestion) {
      return null;
    }

    const normalizedType: 'mcq' | 'tf' | 'descriptive' =
      currentQuestion.question_type === 'mcq'
        ? 'mcq'
        : currentQuestion.question_type === 'tf'
          ? 'tf'
          : 'descriptive';

    const attachments = (currentQuestion.attachments || [])
      .map(att => att.file_name || att.url || att.preview)
      .filter((value): value is string => Boolean(value));

    const options = currentQuestion.options?.map((option, index) => {
      const optionText = option.text ?? (option as { option_text?: string }).option_text ?? '';
      const optionLabel = option.label ?? String.fromCharCode(65 + index);

      return {
        label: optionLabel,
        text: optionText,
        is_correct: option.is_correct,
      };
    });

    const correctAnswers = Array.isArray(currentQuestion.correct_answers)
      ? currentQuestion.correct_answers
      : [];

    const rawCorrectAnswer = (currentQuestion as { correct_answer?: unknown }).correct_answer;

    const singularCorrectAnswer =
      typeof rawCorrectAnswer === 'string'
        ? rawCorrectAnswer
        : correctAnswers.find(answer => typeof answer.answer === 'string')?.answer;

    return {
      id: currentQuestion.id,
      type: normalizedType,
      subject: currentQuestion.topic,
      answer_format: currentQuestion.answer_format || 'single_line',
      answer_requirement: currentQuestion.answer_requirement,
      marks: currentQuestion.marks,
      correct_answers: correctAnswers,
      correct_answer: singularCorrectAnswer,
      total_alternatives:
        currentQuestion.total_alternatives || correctAnswers.length || undefined,
      figure: currentQuestion.figure_required || currentQuestion.figure,
      attachments,
      options,
    };
  }, [currentQuestion]);

  if (!currentQuestion || !normalizedQuestion) {
    return null;
  }

  // Start timer for current question
  useEffect(() => {
    if (!currentQuestion || isPaused || isCompleted) return;

    const questionId = currentQuestion.id;
    if (!questionStartTime[questionId]) {
      setQuestionStartTime(prev => ({ ...prev, [questionId]: Date.now() }));
    }

    timerRef.current = setInterval(() => {
      setTimeSpent(prev => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [currentQuestionIndex, isPaused, isCompleted, currentQuestion, questionStartTime]);

  // Initialize user answers
  useEffect(() => {
    const initialAnswers: Record<string, UserAnswer> = {};
    questions.forEach(q => {
      initialAnswers[q.id] = {
        questionId: q.id,
        answer: null,
        timeSpent: 0,
        isFlagged: false,
        isAnswered: false
      };
    });
    setUserAnswers(initialAnswers);
  }, [questions]);

  const handleAnswerChange = (value: any) => {
    const questionId = currentQuestion.id;
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        answer: value,
        isAnswered: value !== null && value !== undefined && value !== ''
      }
    }));
  };

  const handleFlagQuestion = () => {
    const questionId = currentQuestion.id;
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        isFlagged: !prev[questionId].isFlagged
      }
    }));
  };

  const recordQuestionTime = () => {
    const questionId = currentQuestion.id;
    if (questionStartTime[questionId]) {
      const timeOnQuestion = Math.floor((Date.now() - questionStartTime[questionId]) / 1000);
      setUserAnswers(prev => ({
        ...prev,
        [questionId]: {
          ...prev[questionId],
          timeSpent: (prev[questionId].timeSpent || 0) + timeOnQuestion
        }
      }));
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      recordQuestionTime();
      setCurrentQuestionIndex(prev => prev - 1);
      setQuestionStartTime(prev => ({ ...prev, [questions[currentQuestionIndex - 1].id]: Date.now() }));
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      recordQuestionTime();
      setCurrentQuestionIndex(prev => prev + 1);
      setQuestionStartTime(prev => ({ ...prev, [questions[currentQuestionIndex + 1].id]: Date.now() }));
    }
  };

  const handleJumpToQuestion = (index: number) => {
    recordQuestionTime();
    setCurrentQuestionIndex(index);
    setQuestionStartTime(prev => ({ ...prev, [questions[index].id]: Date.now() }));
  };

  const handleTogglePause = () => {
    setIsPaused(!isPaused);
  };

  const validateAnswer = (question: QuestionDisplayData, userAnswer: any): {
    isCorrect: boolean;
    earnedMarks: number;
    feedback: string;
  } => {
    // Ensure correct_answers is an array
    const correctAnswers = Array.isArray(question.correct_answers) ? question.correct_answers : [];

    if (!userAnswer) {
      return {
        isCorrect: false,
        earnedMarks: 0,
        feedback: 'No answer provided'
      };
    }

    if (correctAnswers.length === 0) {
      console.warn(`Question ${question.question_number} has no correct answers defined`);
      return {
        isCorrect: false,
        earnedMarks: 0,
        feedback: 'No correct answer available for validation'
      };
    }

    const normalizeAnswer = (ans: any): string => {
      if (typeof ans === 'string') {
        return ans.trim().toLowerCase().replace(/\s+/g, ' ');
      }
      return String(ans).trim().toLowerCase();
    };

    const userAnswerNormalized = normalizeAnswer(userAnswer);

    // For MCQ questions - match by option label
    if (question.question_type === 'mcq' && question.options) {
      // Find the selected option by matching the label
      const selectedOption = question.options.find(opt =>
        normalizeAnswer(opt.label) === userAnswerNormalized
      );

      if (selectedOption) {
        // Check if the selected option is marked as correct
        if (selectedOption.is_correct) {
          return {
            isCorrect: true,
            earnedMarks: question.marks,
            feedback: 'Correct answer!'
          };
        }
      }

      return {
        isCorrect: false,
        earnedMarks: 0,
        feedback: 'Incorrect answer'
      };
    }

    // For descriptive/calculation questions
    for (const correctAns of correctAnswers) {
      const correctAnswerNormalized = normalizeAnswer(correctAns.answer);

      // Exact match
      if (userAnswerNormalized === correctAnswerNormalized) {
        return {
          isCorrect: true,
          earnedMarks: correctAns.marks || question.marks,
          feedback: 'Correct answer!'
        };
      }

      // Partial match for equivalent phrasing
      if (correctAns.accepts_equivalent_phrasing) {
        if (userAnswerNormalized.includes(correctAnswerNormalized) ||
            correctAnswerNormalized.includes(userAnswerNormalized)) {
          return {
            isCorrect: true,
            earnedMarks: correctAns.marks || question.marks,
            feedback: 'Correct answer (equivalent phrasing accepted)'
          };
        }
      }
    }

    // Check for partial credit
    const matchedWords = correctAnswers.reduce((count, correctAns) => {
      const correctWords = normalizeAnswer(correctAns.answer).split(' ');
      const userWords = userAnswerNormalized.split(' ');
      const matches = correctWords.filter(word =>
        userWords.includes(word) && word.length > 2
      ).length;
      return Math.max(count, matches);
    }, 0);

    if (matchedWords > 0) {
      const partialMarks = Math.ceil((matchedWords / 5) * question.marks);
      return {
        isCorrect: false,
        earnedMarks: Math.min(partialMarks, question.marks - 1),
        feedback: `Partial credit: Some correct elements identified`
      };
    }

    return {
      isCorrect: false,
      earnedMarks: 0,
      feedback: 'Incorrect answer'
    };
  };

  const handleCompleteTest = () => {
    recordQuestionTime();

    const questionResults = questions.map(question => {
      const userAnswer = userAnswers[question.id];
      const validation = validateAnswer(question, userAnswer?.answer);

      return {
        questionId: question.id,
        questionNumber: question.question_number,
        isCorrect: validation.isCorrect,
        earnedMarks: validation.earnedMarks,
        totalMarks: question.marks,
        userAnswer: userAnswer?.answer,
        correctAnswers: question.correct_answers || [],
        feedback: validation.feedback
      };
    });

    const totalCorrect = questionResults.filter(r => r.isCorrect).length;
    const totalPartial = questionResults.filter(r => !r.isCorrect && r.earnedMarks > 0).length;
    const totalIncorrect = questionResults.filter(r => r.earnedMarks === 0).length;
    const earnedMarks = questionResults.reduce((sum, r) => sum + r.earnedMarks, 0);
    const answeredCount = Object.values(userAnswers).filter(a => a.isAnswered).length;

    const simulationResults: SimulationResults = {
      totalQuestions: questions.length,
      answeredQuestions: answeredCount,
      correctAnswers: totalCorrect,
      partiallyCorrect: totalPartial,
      incorrectAnswers: totalIncorrect,
      totalMarks: totalMarks,
      earnedMarks: earnedMarks,
      percentage: Math.round((earnedMarks / totalMarks) * 100),
      timeSpent: timeSpent,
      questionResults
    };

    setResults(simulationResults);
    setIsCompleted(true);
    onComplete(simulationResults);
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getQuestionStatus = (questionId: string): 'answered' | 'flagged' | 'unanswered' => {
    const answer = userAnswers[questionId];
    if (answer?.isFlagged) return 'flagged';
    if (answer?.isAnswered) return 'answered';
    return 'unanswered';
  };

  const getAnsweredCount = () => {
    return Object.values(userAnswers).filter(a => a.isAnswered).length;
  };

  const getFlaggedCount = () => {
    return Object.values(userAnswers).filter(a => a.isFlagged).length;
  };

  // Results view after completion
  if (isCompleted && results) {
    return (
      <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 overflow-auto">
        <div className="max-w-6xl mx-auto p-6">
          {/* Results Header */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
              <Award className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Test Completed!
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {paperTitle}
            </p>
          </div>

          {/* Score Card */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-8 mb-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                  {results.percentage}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Score</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                  {results.earnedMarks}/{results.totalMarks}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Marks</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-green-600 dark:text-green-400 mb-2">
                  {results.correctAnswers}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Correct</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-gray-600 dark:text-gray-400 mb-2">
                  {formatTime(results.timeSpent)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Time Spent</div>
              </div>
            </div>
          </div>

          {/* Detailed Results */}
          <div className="space-y-4 mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              Question-by-Question Results
            </h2>
            {results.questionResults.map((result, index) => {
              const question = questions.find(q => q.id === result.questionId);
              if (!question) return null;

              return (
                <div
                  key={result.questionId}
                  className={cn(
                    'border-2 rounded-lg p-4',
                    result.isCorrect
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                      : result.earnedMarks > 0
                      ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700'
                      : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                  )}
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3">
                      {result.isCorrect ? (
                        <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                      ) : (
                        <X className="h-6 w-6 text-red-600 dark:text-red-400" />
                      )}
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          Question {result.questionNumber}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {result.feedback}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {result.earnedMarks}/{result.totalMarks}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">marks</div>
                    </div>
                  </div>

                  {showAnswersOnCompletion && (
                    <div className="mt-4 pt-4 border-t border-gray-300 dark:border-gray-600">
                      <EnhancedQuestionDisplay
                        question={question}
                        showAnswers={true}
                        showHints={true}
                        showExplanations={true}
                        showAttachments={true}
                        compact={true}
                        highlightCorrect={true}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-4">
            <Button onClick={onExit} variant="outline" size="lg">
              Close Review
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Main test interface
  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {paperTitle}
            </h1>
            {duration && (
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Duration: {duration}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Timer */}
            <div className="flex items-center gap-2 bg-white dark:bg-gray-900 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span className="text-lg font-mono font-bold text-gray-900 dark:text-white">
                {formatTime(timeSpent)}
              </span>
            </div>

            {/* Pause/Resume */}
            {allowPause && (
              <Button
                onClick={handleTogglePause}
                variant="outline"
                size="sm"
              >
                {isPaused ? (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </>
                )}
              </Button>
            )}

            {/* Exit */}
            <Button
              onClick={() => setShowConfirmExit(true)}
              variant="ghost"
              size="icon"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Question Display */}
            <div className="lg:col-span-3">
              {isPaused ? (
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-12 text-center">
                  <Pause className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Test Paused
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Click Resume to continue
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Question Display */}
                  <EnhancedQuestionDisplay
                    question={currentQuestion}
                    showAnswers={false}
                    showHints={false}
                    showExplanations={false}
                    showAttachments={true}
                    compact={false}
                    highlightCorrect={false}
                  />

                  {/* Answer Input */}
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 border-2 border-gray-300 dark:border-gray-600">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Your Answer
                    </h3>
                    <DynamicAnswerField
                      question={normalizedQuestion}
                      value={userAnswers[currentQuestion.id]?.answer}
                      onChange={handleAnswerChange}
                    />
                  </div>

                  {/* Navigation */}
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <Button
                        onClick={handlePrevious}
                        disabled={currentQuestionIndex === 0}
                        variant="outline"
                      >
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        Previous
                      </Button>
                      <Button
                        onClick={handleFlagQuestion}
                        variant={userAnswers[currentQuestion.id]?.isFlagged ? 'default' : 'outline'}
                      >
                        <Flag className="h-4 w-4 mr-2" />
                        {userAnswers[currentQuestion.id]?.isFlagged ? 'Flagged' : 'Flag'}
                      </Button>
                    </div>
                    {currentQuestionIndex === questions.length - 1 ? (
                      <Button onClick={handleCompleteTest} variant="default">
                        Complete Test
                        <CheckCircle className="h-4 w-4 ml-2" />
                      </Button>
                    ) : (
                      <Button onClick={handleNext} variant="default">
                        Next
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Question Navigator Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-300 dark:border-gray-600 sticky top-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                  Question Navigator
                </h3>

                {/* Stats */}
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Answered:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {getAnsweredCount()}/{questions.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Flagged:</span>
                    <span className="font-semibold text-yellow-600 dark:text-yellow-400">
                      {getFlaggedCount()}
                    </span>
                  </div>
                </div>

                {/* Question Grid */}
                <div className="grid grid-cols-5 gap-2">
                  {questions.map((q, index) => {
                    const status = getQuestionStatus(q.id);
                    return (
                      <button
                        key={q.id}
                        onClick={() => handleJumpToQuestion(index)}
                        className={cn(
                          'aspect-square rounded-lg flex items-center justify-center text-sm font-semibold transition-all',
                          index === currentQuestionIndex &&
                            'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-800',
                          status === 'answered' &&
                            'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
                          status === 'flagged' &&
                            'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
                          status === 'unanswered' &&
                            'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        )}
                      >
                        {index + 1}
                      </button>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="mt-4 pt-4 border-t border-gray-300 dark:border-gray-600 space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-green-100 dark:bg-green-900/30" />
                    <span className="text-gray-600 dark:text-gray-400">Answered</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-yellow-100 dark:bg-yellow-900/30" />
                    <span className="text-gray-600 dark:text-gray-400">Flagged</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-gray-200 dark:bg-gray-700" />
                    <span className="text-gray-600 dark:text-gray-400">Unanswered</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Exit Dialog */}
      {showConfirmExit && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Exit Test?
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Are you sure you want to exit? Your progress will be lost and you'll need to restart the test.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button
                onClick={() => setShowConfirmExit(false)}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                onClick={onExit}
                variant="destructive"
              >
                Exit Test
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
