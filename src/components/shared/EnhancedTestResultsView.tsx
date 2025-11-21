import React, { useState, useMemo } from 'react';
import {
  X,
  Award,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  BookOpen,
  Lightbulb,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Download,
  Share2,
  Info,
  Zap,
  Brain,
  Trophy,
  ArrowRight
} from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../lib/utils';
import { StatusBadge } from './StatusBadge';

interface CorrectAnswer {
  answer: string;
  marks?: number;
  context?: Record<string, unknown> | null;
  unit?: string;
  answer_requirement?: string;
}

interface SubPartResult {
  id: string;
  label: string;
  question_text: string;
  marks: number;
  user_answer?: unknown;
  is_correct: boolean;
  marks_earned: number;
  correct_answers: CorrectAnswer[];
  answer_format?: string;
}

interface PartResult {
  id: string;
  label: string;
  question_text: string;
  marks: number;
  user_answer?: unknown;
  is_correct: boolean;
  marks_earned: number;
  correct_answers: CorrectAnswer[];
  answer_format?: string;
  subparts?: SubPartResult[];
}

interface QuestionResult {
  questionId: string;
  questionNumber: string;
  questionText: string;
  isCorrect: boolean;
  earnedMarks: number;
  totalMarks: number;
  userAnswer?: unknown;
  correctAnswers: CorrectAnswer[];
  feedback: string;
  difficulty?: string;
  topic_name?: string;
  unit_name?: string;
  subtopic_names?: string[];
  type: 'mcq' | 'tf' | 'descriptive' | 'complex';
  parts?: PartResult[];
  time_spent?: number;
  requires_manual_marking?: boolean;
}

interface TopicPerformance {
  topic: string;
  total: number;
  correct: number;
  accuracy: number;
  marks_earned: number;
  marks_total: number;
}

interface UnitPerformance {
  unit: string;
  topics: TopicPerformance[];
  total_accuracy: number;
  marks_earned: number;
  marks_total: number;
}

interface DifficultyBreakdown {
  easy: { correct: number; total: number; accuracy: number };
  medium: { correct: number; total: number; accuracy: number };
  hard: { correct: number; total: number; accuracy: number };
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
  questionResults: QuestionResult[];
}

interface EnhancedTestResultsViewProps {
  results: SimulationResults;
  paperCode: string;
  paperSubject: string;
  onExit: () => void;
  onRetake: () => void;
  onExportPDF?: () => void;
}

/**
 * Format student answer for display based on answer type and format
 */
function formatStudentAnswer(answer: unknown, answerFormat?: string): string {
  // Handle no answer
  if (answer === undefined || answer === null || answer === '') {
    return 'No answer provided';
  }

  // Handle string answers (most common)
  if (typeof answer === 'string') {
    return answer;
  }

  // Handle array answers (multiple selections)
  if (Array.isArray(answer)) {
    if (answer.length === 0) return 'No answer provided';
    return answer.join(', ');
  }

  // Handle object answers (complex formats)
  if (typeof answer === 'object') {
    const answerObj = answer as any;

    // Calculation with unit
    if (answerObj.value !== undefined && answerObj.unit !== undefined) {
      return `${answerObj.value} ${answerObj.unit}`;
    }

    // Calculation with only value
    if (answerObj.value !== undefined) {
      return String(answerObj.value);
    }

    // Two-item answers
    if (answerObj.item1 !== undefined && answerObj.item2 !== undefined) {
      return `${answerObj.item1} and ${answerObj.item2}`;
    }

    // Main answer field
    if (answerObj.main !== undefined) {
      return String(answerObj.main);
    }

    // Try to find any meaningful value
    const keys = Object.keys(answerObj);
    if (keys.length > 0) {
      const values = keys.map(k => `${k}: ${answerObj[k]}`);
      return values.join(', ');
    }

    // Fallback to JSON
    return JSON.stringify(answerObj);
  }

  // Handle boolean (for true/false questions)
  if (typeof answer === 'boolean') {
    return answer ? 'True' : 'False';
  }

  // Fallback to string conversion
  return String(answer);
}

export function EnhancedTestResultsView({
  results,
  paperCode,
  paperSubject,
  onExit,
  onRetake,
  onExportPDF
}: EnhancedTestResultsViewProps) {
  const [showAnswers, setShowAnswers] = useState(true);  // CHANGED: Default to true to show answers
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [expandedParts, setExpandedParts] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'questions' | 'analytics' | 'recommendations'>('questions');

  // Calculate analytics
  const analytics = useMemo(() => {
    const unitMap = new Map<string, { correct: number; total: number; marks_earned: number; marks_total: number; topics: Map<string, TopicPerformance> }>();
    const difficultyMap = new Map<string, { correct: number; total: number }>();

    results.questionResults.forEach(q => {
      // Unit and topic breakdown
      const unit = q.unit_name || 'Unassigned';
      const topic = q.topic_name || 'General';

      if (!unitMap.has(unit)) {
        unitMap.set(unit, { correct: 0, total: 0, marks_earned: 0, marks_total: 0, topics: new Map() });
      }

      const unitData = unitMap.get(unit)!;
      unitData.total += 1;
      unitData.marks_total += q.totalMarks;
      unitData.marks_earned += q.earnedMarks;

      if (q.isCorrect) {
        unitData.correct += 1;
      }

      if (!unitData.topics.has(topic)) {
        unitData.topics.set(topic, {
          topic,
          total: 0,
          correct: 0,
          accuracy: 0,
          marks_earned: 0,
          marks_total: 0
        });
      }

      const topicData = unitData.topics.get(topic)!;
      topicData.total += 1;
      topicData.marks_total += q.totalMarks;
      topicData.marks_earned += q.earnedMarks;

      if (q.isCorrect) {
        topicData.correct += 1;
      }

      topicData.accuracy = Math.round((topicData.marks_earned / topicData.marks_total) * 100);

      // Difficulty breakdown
      const difficulty = q.difficulty?.toLowerCase() || 'medium';
      if (!difficultyMap.has(difficulty)) {
        difficultyMap.set(difficulty, { correct: 0, total: 0 });
      }

      const diffData = difficultyMap.get(difficulty)!;
      diffData.total += 1;
      if (q.isCorrect) {
        diffData.correct += 1;
      }
    });

    // Convert to arrays
    const unitPerformance: UnitPerformance[] = Array.from(unitMap.entries()).map(([unit, data]) => ({
      unit,
      topics: Array.from(data.topics.values()),
      total_accuracy: Math.round((data.marks_earned / data.marks_total) * 100),
      marks_earned: data.marks_earned,
      marks_total: data.marks_total
    }));

    const difficultyBreakdown: DifficultyBreakdown = {
      easy: {
        correct: difficultyMap.get('easy')?.correct || 0,
        total: difficultyMap.get('easy')?.total || 0,
        accuracy: difficultyMap.get('easy')?.total
          ? Math.round((difficultyMap.get('easy')!.correct / difficultyMap.get('easy')!.total) * 100)
          : 0
      },
      medium: {
        correct: difficultyMap.get('medium')?.correct || 0,
        total: difficultyMap.get('medium')?.total || 0,
        accuracy: difficultyMap.get('medium')?.total
          ? Math.round((difficultyMap.get('medium')!.correct / difficultyMap.get('medium')!.total) * 100)
          : 0
      },
      hard: {
        correct: difficultyMap.get('hard')?.correct || 0,
        total: difficultyMap.get('hard')?.total || 0,
        accuracy: difficultyMap.get('hard')?.total
          ? Math.round((difficultyMap.get('hard')!.correct / difficultyMap.get('hard')!.total) * 100)
          : 0
      }
    };

    return { unitPerformance, difficultyBreakdown };
  }, [results]);

  // Generate recommendations
  const recommendations = useMemo(() => {
    const recs: Array<{ type: 'strength' | 'improvement' | 'focus'; title: string; description: string; priority: number }> = [];

    // Identify weak areas
    analytics.unitPerformance.forEach(unit => {
      if (unit.total_accuracy < 70) {
        recs.push({
          type: 'improvement',
          title: `Strengthen ${unit.unit}`,
          description: `Your accuracy in ${unit.unit} is ${unit.total_accuracy}%. Focus on reviewing core concepts and practice more questions.`,
          priority: unit.total_accuracy < 50 ? 1 : 2
        });
      } else if (unit.total_accuracy >= 85) {
        recs.push({
          type: 'strength',
          title: `Excellent performance in ${unit.unit}`,
          description: `You scored ${unit.total_accuracy}% in ${unit.unit}. Keep up the great work!`,
          priority: 3
        });
      }

      // Topic-level recommendations
      unit.topics.forEach(topic => {
        if (topic.accuracy < 60 && topic.total >= 2) {
          recs.push({
            type: 'focus',
            title: `Review ${topic.topic}`,
            description: `This topic needs attention. Current accuracy: ${topic.accuracy}%. Review related materials and practice similar questions.`,
            priority: 1
          });
        }
      });
    });

    // Difficulty-based recommendations
    if (analytics.difficultyBreakdown.hard.total > 0 && analytics.difficultyBreakdown.hard.accuracy < 50) {
      recs.push({
        type: 'focus',
        title: 'Build confidence with harder questions',
        description: 'Focus on understanding complex problem-solving techniques. Break down difficult questions into smaller steps.',
        priority: 2
      });
    }

    // Sort by priority
    return recs.sort((a, b) => a.priority - b.priority);
  }, [analytics]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getGradePrediction = (percentage: number): { grade: string; color: string } => {
    if (percentage >= 90) return { grade: 'A*', color: 'text-purple-600 dark:text-purple-400' };
    if (percentage >= 80) return { grade: 'A', color: 'text-blue-600 dark:text-blue-400' };
    if (percentage >= 70) return { grade: 'B', color: 'text-green-600 dark:text-green-400' };
    if (percentage >= 60) return { grade: 'C', color: 'text-yellow-600 dark:text-yellow-400' };
    if (percentage >= 50) return { grade: 'D', color: 'text-orange-600 dark:text-orange-400' };
    if (percentage >= 40) return { grade: 'E', color: 'text-red-600 dark:text-red-400' };
    return { grade: 'U', color: 'text-gray-600 dark:text-gray-400' };
  };

  const toggleQuestion = (questionId: string) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(questionId)) {
      newExpanded.delete(questionId);
    } else {
      newExpanded.add(questionId);
    }
    setExpandedQuestions(newExpanded);
  };

  const togglePart = (partId: string) => {
    const newExpanded = new Set(expandedParts);
    if (newExpanded.has(partId)) {
      newExpanded.delete(partId);
    } else {
      newExpanded.add(partId);
    }
    setExpandedParts(newExpanded);
  };

  const gradePrediction = getGradePrediction(results.percentage);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={onExit}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                Test Results & Analytics
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {paperCode} - {paperSubject}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {onExportPDF && (
              <Button
                variant="outline"
                onClick={onExportPDF}
                leftIcon={<Download className="h-4 w-4" />}
              >
                Export PDF
              </Button>
            )}
            <Button
              variant="outline"
              leftIcon={<Share2 className="h-4 w-4" />}
            >
              Share
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6">
          {/* Hero Section */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mb-4 shadow-lg">
              <Trophy className="h-12 w-12 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Test Completed!
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              {paperCode}
            </p>
          </div>

          {/* Score Overview */}
          <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-900/20 dark:via-purple-900/20 dark:to-pink-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-2xl p-8 mb-8 shadow-lg">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
              <div className="text-center">
                <div className={cn("text-5xl font-bold mb-2", gradePrediction.color)}>
                  {gradePrediction.grade}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Predicted Grade</div>
              </div>
              <div className="text-center">
                <div className="text-5xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                  {results.percentage}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Overall Score</div>
              </div>
              <div className="text-center">
                <div className="text-5xl font-bold text-gray-900 dark:text-white mb-2">
                  {results.earnedMarks}<span className="text-2xl text-gray-500">/{results.totalMarks}</span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Marks</div>
              </div>
              <div className="text-center">
                <div className="text-5xl font-bold text-green-600 dark:text-green-400 mb-2">
                  {results.correctAnswers}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Correct</div>
              </div>
              <div className="text-center">
                <div className="text-5xl font-bold text-gray-600 dark:text-gray-400 mb-2">
                  {formatTime(results.timeSpent)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Time Spent</div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setActiveTab('questions')}
                  className={cn(
                    'px-6 py-4 text-sm font-medium border-b-2 transition-colors',
                    activeTab === 'questions'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Question Results
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('analytics')}
                  className={cn(
                    'px-6 py-4 text-sm font-medium border-b-2 transition-colors',
                    activeTab === 'analytics'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Performance Analytics
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('recommendations')}
                  className={cn(
                    'px-6 py-4 text-sm font-medium border-b-2 transition-colors',
                    activeTab === 'recommendations'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" />
                    Recommendations
                  </div>
                </button>
              </nav>
            </div>

            <div className="p-6">
              {/* Questions Tab */}
              {activeTab === 'questions' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      Detailed Question Results
                    </h2>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAnswers(!showAnswers)}
                      leftIcon={showAnswers ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    >
                      {showAnswers ? 'Hide' : 'Show'} Answers
                    </Button>
                  </div>

                  {results.questionResults.map((result) => {
                    const isExpanded = expandedQuestions.has(result.questionId);
                    const isComplex = result.parts && result.parts.length > 0;

                    return (
                      <div
                        key={result.questionId}
                        className={cn(
                          'border-2 rounded-lg overflow-hidden transition-all',
                          result.isCorrect
                            ? 'bg-green-50 dark:bg-green-900/10 border-green-300 dark:border-green-700'
                            : result.earnedMarks > 0
                            ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-300 dark:border-yellow-700'
                            : 'bg-red-50 dark:bg-red-900/10 border-red-300 dark:border-red-700'
                        )}
                      >
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="flex items-start gap-3 flex-1">
                              {result.isCorrect ? (
                                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-1" />
                              ) : result.earnedMarks > 0 ? (
                                <AlertCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-1" />
                              ) : (
                                <XCircle className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-1" />
                              )}
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <h3 className="font-semibold text-gray-900 dark:text-white">
                                    Question {result.questionNumber}
                                  </h3>
                                  {result.difficulty && (
                                    <StatusBadge
                                      status={
                                        result.difficulty === 'easy' ? 'success' :
                                        result.difficulty === 'hard' ? 'error' : 'warning'
                                      }
                                      text={result.difficulty}
                                    />
                                  )}
                                  {isComplex && (
                                    <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded">
                                      Complex ({result.parts!.length} parts)
                                    </span>
                                  )}
                                </div>
                                {result.unit_name && (
                                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                                    {result.unit_name} {result.topic_name && `• ${result.topic_name}`}
                                  </p>
                                )}
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                  {result.feedback}
                                </p>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-xl font-bold text-gray-900 dark:text-white">
                                {result.earnedMarks}/{result.totalMarks}
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">marks</div>
                              {result.time_spent && (
                                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatTime(result.time_spent)}
                                </div>
                              )}
                            </div>
                          </div>

                          {isComplex && (
                            <button
                              onClick={() => toggleQuestion(result.questionId)}
                              className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors mb-3"
                            >
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              {isExpanded ? 'Hide' : 'Show'} part details
                            </button>
                          )}

                          {isExpanded && result.parts && result.parts.length > 0 && (
                            <div className="mt-4 space-y-3 pl-9">
                              {result.parts.map((part) => {
                                const isPartExpanded = expandedParts.has(part.id);
                                const hasSubparts = part.subparts && part.subparts.length > 0;

                                return (
                                  <div
                                    key={part.id}
                                    className={cn(
                                      'border rounded-lg p-3',
                                      part.is_correct
                                        ? 'bg-white dark:bg-gray-800 border-green-200 dark:border-green-800'
                                        : part.marks_earned > 0
                                        ? 'bg-white dark:bg-gray-800 border-yellow-200 dark:border-yellow-800'
                                        : 'bg-white dark:bg-gray-800 border-red-200 dark:border-red-800'
                                    )}
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex items-start gap-2 flex-1">
                                        {part.is_correct ? (
                                          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                                        ) : part.marks_earned > 0 ? (
                                          <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                                        ) : (
                                          <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                                        )}
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="font-semibold text-sm text-gray-900 dark:text-white">
                                              Part ({part.label})
                                            </span>
                                            {hasSubparts && (
                                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                                {part.subparts!.length} subparts
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                                            {part.question_text}
                                          </p>

                                          {showAnswers && !hasSubparts && (
                                            <div className="mt-2 space-y-2">
                                              {/* Student's Answer for Part */}
                                              {part.user_answer !== undefined && (
                                                <div className="p-2 bg-gray-50 dark:bg-gray-800/50 rounded border border-gray-200 dark:border-gray-700">
                                                  <p className="text-xs font-medium text-gray-900 dark:text-gray-300 mb-1">
                                                    Your Answer:
                                                  </p>
                                                  <div className={cn(
                                                    "text-sm text-gray-800 dark:text-gray-200",
                                                    part.is_correct ? "font-medium" : ""
                                                  )}>
                                                    {formatStudentAnswer(part.user_answer, part.answer_format)}
                                                  </div>
                                                </div>
                                              )}

                                              {/* Expected Answer for Part */}
                                              {part.correct_answers.length > 0 && (
                                                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                                                  <p className="text-xs font-medium text-blue-900 dark:text-blue-300 mb-1">
                                                    Expected Answer:
                                                  </p>
                                                  <div className="space-y-1">
                                                    {part.correct_answers.map((ans, idx) => (
                                                      <div key={idx} className="text-sm text-blue-800 dark:text-blue-200">
                                                        • {ans.answer}
                                                        {ans.unit && <span className="text-xs ml-1 text-gray-600 dark:text-gray-400">({ans.unit})</span>}
                                                        {ans.marks && <span className="text-xs ml-1">({ans.marks} mark{ans.marks !== 1 ? 's' : ''})</span>}
                                                      </div>
                                                    ))}
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      <div className="text-right flex-shrink-0">
                                        <div className="text-sm font-bold text-gray-900 dark:text-white">
                                          {part.marks_earned}/{part.marks}
                                        </div>
                                      </div>
                                    </div>

                                    {hasSubparts && (
                                      <>
                                        <button
                                          onClick={() => togglePart(part.id)}
                                          className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors mt-2 ml-6"
                                        >
                                          {isPartExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                          {isPartExpanded ? 'Hide' : 'Show'} subparts
                                        </button>

                                        {isPartExpanded && (
                                          <div className="mt-3 space-y-2 pl-6">
                                            {part.subparts!.map((subpart) => (
                                              <div
                                                key={subpart.id}
                                                className={cn(
                                                  'border rounded p-2 text-sm',
                                                  subpart.is_correct
                                                    ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                                                    : subpart.marks_earned > 0
                                                    ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800'
                                                    : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                                                )}
                                              >
                                                <div className="flex items-start justify-between gap-2">
                                                  <div className="flex items-start gap-2 flex-1">
                                                    {subpart.is_correct ? (
                                                      <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                                                    ) : (
                                                      <XCircle className="h-3 w-3 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                                                    )}
                                                    <div className="flex-1">
                                                      <div className="font-medium text-gray-900 dark:text-white mb-1">
                                                        ({subpart.label})
                                                      </div>
                                                      <p className="text-gray-700 dark:text-gray-300 mb-2">
                                                        {subpart.question_text}
                                                      </p>

                                                      {showAnswers && (
                                                        <div className="space-y-2">
                                                          {/* Student's Answer */}
                                                          {subpart.user_answer !== undefined && (
                                                            <div className="p-1.5 bg-gray-50 dark:bg-gray-800/50 rounded text-xs border border-gray-200 dark:border-gray-700">
                                                              <p className="font-medium text-gray-900 dark:text-gray-300 mb-0.5">
                                                                Your Answer:
                                                              </p>
                                                              <div className={cn(
                                                                "text-gray-800 dark:text-gray-200",
                                                                subpart.is_correct ? "font-medium" : ""
                                                              )}>
                                                                {formatStudentAnswer(subpart.user_answer, subpart.answer_format)}
                                                              </div>
                                                            </div>
                                                          )}

                                                          {/* Expected Answer */}
                                                          {subpart.correct_answers.length > 0 && (
                                                            <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded text-xs border border-blue-200 dark:border-blue-800">
                                                              <p className="font-medium text-blue-900 dark:text-blue-300 mb-0.5">
                                                                Expected:
                                                              </p>
                                                              {subpart.correct_answers.map((ans, idx) => (
                                                                <div key={idx} className="text-blue-800 dark:text-blue-200">
                                                                  • {ans.answer}
                                                                  {ans.unit && <span className="text-xs ml-1 text-gray-600 dark:text-gray-400">({ans.unit})</span>}
                                                                </div>
                                                              ))}
                                                            </div>
                                                          )}
                                                        </div>
                                                      )}
                                                    </div>
                                                  </div>
                                                  <div className="text-xs font-bold text-gray-900 dark:text-white">
                                                    {subpart.marks_earned}/{subpart.marks}
                                                  </div>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {!isComplex && showAnswers && (
                            <div className="mt-4 pt-4 border-t border-gray-300 dark:border-gray-600 space-y-3">
                              {/* Student's Answer for Simple Questions */}
                              {result.userAnswer !== undefined && (
                                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded border border-gray-200 dark:border-gray-700">
                                  <p className="text-sm font-medium text-gray-900 dark:text-gray-300 mb-2">
                                    Your Answer:
                                  </p>
                                  <div className={cn(
                                    "text-sm text-gray-800 dark:text-gray-200",
                                    result.isCorrect ? "font-medium" : ""
                                  )}>
                                    {formatStudentAnswer(result.userAnswer)}
                                  </div>
                                </div>
                              )}

                              {/* Expected Answer for Simple Questions */}
                              {result.correctAnswers.length > 0 && (
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                                  <p className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
                                    Expected Answer(s):
                                  </p>
                                  <ul className="space-y-1">
                                    {result.correctAnswers.map((ans, idx) => (
                                      <li key={idx} className="text-sm text-blue-800 dark:text-blue-200">
                                        • {ans.answer}
                                        {ans.unit && <span className="text-xs ml-1 text-gray-600 dark:text-gray-400">({ans.unit})</span>}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Analytics Tab */}
              {activeTab === 'analytics' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                      <BarChart3 className="h-5 w-5" />
                      Performance by Difficulty
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {Object.entries(analytics.difficultyBreakdown).map(([level, data]) => (
                        <div
                          key={level}
                          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                              {level}
                            </h3>
                            <StatusBadge
                              status={data.accuracy >= 80 ? 'success' : data.accuracy >= 60 ? 'warning' : 'error'}
                              text={`${data.accuracy}%`}
                            />
                          </div>
                          <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                            {data.correct}/{data.total}
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className={cn(
                                'h-2 rounded-full transition-all',
                                data.accuracy >= 80 ? 'bg-green-500' :
                                data.accuracy >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                              )}
                              style={{ width: `${data.accuracy}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                      <Target className="h-5 w-5" />
                      Performance by Unit & Topic
                    </h2>
                    <div className="space-y-4">
                      {analytics.unitPerformance.map((unit) => (
                        <div
                          key={unit.unit}
                          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {unit.unit}
                            </h3>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                {unit.total_accuracy}%
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">
                                {unit.marks_earned}/{unit.marks_total} marks
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {unit.topics.map((topic) => (
                              <div key={topic.topic} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900/50 rounded">
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                  {topic.topic}
                                </span>
                                <div className="flex items-center gap-3">
                                  <span className="text-xs text-gray-600 dark:text-gray-400">
                                    {topic.marks_earned}/{topic.marks_total}
                                  </span>
                                  <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                    <div
                                      className={cn(
                                        'h-2 rounded-full',
                                        topic.accuracy >= 80 ? 'bg-green-500' :
                                        topic.accuracy >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                      )}
                                      style={{ width: `${topic.accuracy}%` }}
                                    />
                                  </div>
                                  <span className="text-sm font-medium text-gray-900 dark:text-white w-12 text-right">
                                    {topic.accuracy}%
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Recommendations Tab */}
              {activeTab === 'recommendations' && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                      <Brain className="h-5 w-5" />
                      Personalized Study Recommendations
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                      Based on your performance, here are specific areas to focus on:
                    </p>
                  </div>

                  <div className="space-y-3">
                    {recommendations.map((rec, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          'border-l-4 rounded-lg p-4',
                          rec.type === 'strength' ? 'bg-green-50 dark:bg-green-900/10 border-green-500' :
                          rec.type === 'focus' ? 'bg-red-50 dark:bg-red-900/10 border-red-500' :
                          'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-500'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          {rec.type === 'strength' ? (
                            <Trophy className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                          ) : rec.type === 'focus' ? (
                            <Target className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                          ) : (
                            <TrendingUp className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                              {rec.title}
                            </h3>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              {rec.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                        <Zap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          Next Steps
                        </h3>
                        <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                          <li className="flex items-center gap-2">
                            <ArrowRight className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                            Review questions you got wrong and understand the marking scheme
                          </li>
                          <li className="flex items-center gap-2">
                            <ArrowRight className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                            Practice similar questions on weak topics
                          </li>
                          <li className="flex items-center gap-2">
                            <ArrowRight className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                            Take another practice test to track improvement
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-4 mt-8">
            <Button onClick={onRetake} variant="outline" size="lg" leftIcon={<BookOpen className="h-5 w-5" />}>
              Retake Test
            </Button>
            <Button onClick={onExit} variant="default" size="lg">
              Close Review
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
