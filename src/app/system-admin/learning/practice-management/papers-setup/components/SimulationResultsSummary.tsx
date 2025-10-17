import React, { useMemo } from 'react';
import {
  BarChart3,
  Clock,
  Flag,
  AlertCircle,
  AlertTriangle,
  Target,
  Award,
  Activity,
  TrendingUp,
  PieChart,
  BookOpen
} from 'lucide-react';
import { cn } from '../../../../../../lib/utils';
import type { SimulationResult } from '../types';

interface SimulationResultsSummaryProps {
  result: SimulationResult;
  questions: Array<{ id: string; question_number?: string; question_text?: string }>;
  onFocusQuestion?: (questionId: string) => void;
}

const formatDuration = (seconds?: number | null) => {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds)) {
    return '—';
  }

  const totalSeconds = Math.max(0, Math.round(seconds));
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }

  return `${remainingMinutes}m${remainingSeconds > 0 ? ` ${remainingSeconds}s` : ''}`;
};

const formatPercentage = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }
  const rounded = Math.round(value * 10) / 10;
  return `${Number.isInteger(rounded) ? Math.round(rounded) : rounded.toFixed(1)}%`;
};

const getGradeInfo = (percentage?: number | null) => {
  if (percentage === null || percentage === undefined || Number.isNaN(percentage)) {
    return {
      grade: '–',
      textClass: 'text-gray-600 dark:text-gray-300',
      bgClass: 'bg-gray-100 dark:bg-gray-700'
    };
  }

  if (percentage >= 90) {
    return { grade: 'A+', textClass: 'text-green-700 dark:text-green-300', bgClass: 'bg-green-100 dark:bg-green-900/30' };
  }
  if (percentage >= 80) {
    return { grade: 'A', textClass: 'text-green-700 dark:text-green-300', bgClass: 'bg-green-100 dark:bg-green-900/30' };
  }
  if (percentage >= 70) {
    return { grade: 'B', textClass: 'text-blue-700 dark:text-blue-300', bgClass: 'bg-blue-100 dark:bg-blue-900/30' };
  }
  if (percentage >= 60) {
    return { grade: 'C', textClass: 'text-yellow-700 dark:text-yellow-300', bgClass: 'bg-yellow-100 dark:bg-yellow-900/30' };
  }
  if (percentage >= 50) {
    return { grade: 'D', textClass: 'text-orange-700 dark:text-orange-300', bgClass: 'bg-orange-100 dark:bg-orange-900/30' };
  }

  return { grade: 'E', textClass: 'text-red-700 dark:text-red-300', bgClass: 'bg-red-100 dark:bg-red-900/30' };
};

export const SimulationResultsSummary: React.FC<SimulationResultsSummaryProps> = ({
  result,
  questions,
  onFocusQuestion
}) => {
  const summary = result.summaryStats;

  const questionMap = useMemo(() => {
    const map = new Map<string, { id: string; question_number?: string; question_text?: string }>();
    questions.forEach(question => {
      map.set(question.id, question);
    });
    return map;
  }, [questions]);

  const totalQuestions = summary?.totalQuestions ?? result.totalQuestions ?? questions.length;
  const answeredQuestions = summary?.attemptedQuestions ?? result.answeredCount ?? 0;
  const correctAnswers = summary?.correctAnswers ?? result.correctAnswers ?? 0;
  const partiallyCorrect = summary?.partiallyCorrectAnswers ?? result.partiallyCorrect ?? 0;
  const incorrectAnswers = summary?.incorrectAnswers ?? result.incorrectAnswers ?? Math.max(0, answeredQuestions - correctAnswers - partiallyCorrect);
  const unattempted = Math.max(0, totalQuestions - answeredQuestions);

  const scoreValue = summary?.percentage ?? result.percentage ?? result.overallScore ?? null;
  const accuracyValue = summary?.accuracy ?? result.accuracy ?? null;
  const completionValue = summary?.completionRate ?? (totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : null);
  const totalMarks = summary?.totalPossibleMarks ?? result.totalMarks ?? 0;
  const earnedMarks = summary?.earnedMarks ?? result.earnedMarks ?? 0;
  const timeSpentSeconds = result.timeSpentSeconds ?? result.timeSpent ?? null;
  const averageTimeSeconds = result.averageTimePerQuestion ?? result.timeInsights?.averagePerQuestion ?? (answeredQuestions > 0 && typeof timeSpentSeconds === 'number' ? timeSpentSeconds / answeredQuestions : null);

  const gradeInfo = getGradeInfo(scoreValue);

  const questionPerformance = result.questionPerformance ?? [];
  const flaggedSet = new Set(result.flaggedQuestions ?? []);

  const attentionQuestions = useMemo(() => {
    if (!questionPerformance.length && !flaggedSet.size) {
      return [] as Array<{ id: string; number?: string; status: string; timeSpent?: number; marks?: number; flagged: boolean }>;
    }

    const combined = new Map<string, { id: string; number?: string; status: string; timeSpent?: number; marks?: number; flagged: boolean }>();

    questionPerformance.forEach(perf => {
      const flagged = flaggedSet.has(perf.questionId);
      if (flagged || perf.status !== 'correct') {
        combined.set(perf.questionId, {
          id: perf.questionId,
          number: questionMap.get(perf.questionId)?.question_number,
          status: perf.status,
          timeSpent: perf.timeSpent,
          marks: perf.totalMarks,
          flagged
        });
      }
    });

    flaggedSet.forEach(questionId => {
      if (!combined.has(questionId)) {
        combined.set(questionId, {
          id: questionId,
          number: questionMap.get(questionId)?.question_number,
          status: 'flagged',
          timeSpent: result.timePerQuestion?.[questionId],
          marks: questionPerformance.find(perf => perf.questionId === questionId)?.totalMarks,
          flagged: true
        });
      }
    });

    const severityOrder: Record<string, number> = {
      flagged: 3,
      incorrect: 2,
      partial: 1,
      unattempted: 2,
      correct: 0
    };

    return Array.from(combined.values())
      .sort((a, b) => {
        const severityDiff = (severityOrder[b.status] ?? 0) - (severityOrder[a.status] ?? 0);
        if (severityDiff !== 0) {
          return severityDiff;
        }
        const timeDiff = (b.timeSpent ?? 0) - (a.timeSpent ?? 0);
        if (timeDiff !== 0) {
          return timeDiff;
        }
        return (b.marks ?? 0) - (a.marks ?? 0);
      })
      .slice(0, 6);
  }, [flaggedSet, questionMap, questionPerformance, result.timePerQuestion]);

  const difficultyOrder = ['easy', 'medium', 'hard'];
  const difficultyEntries = summary ? Object.entries(summary.difficultyStats) : [];
  const additionalDifficulty = difficultyEntries
    .map(([key]) => key)
    .filter(key => !difficultyOrder.includes(key));
  const orderedDifficultyKeys = [...difficultyOrder, ...additionalDifficulty.filter((value, index, arr) => arr.indexOf(value) === index)];

  const topicEntries = summary ? Object.entries(summary.topicStats) : [];
  const weakTopics = topicEntries
    .filter(([, data]) => (data.marks || 0) > 0)
    .map(([topic, data]) => ({ topic, score: data.marks > 0 ? (data.earnedMarks / data.marks) * 100 : 0, marks: data.marks }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 4);

  const strongTopics = topicEntries
    .filter(([, data]) => (data.marks || 0) > 0)
    .map(([topic, data]) => ({ topic, score: data.marks > 0 ? (data.earnedMarks / data.marks) * 100 : 0, marks: data.marks }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  const typeEntries = summary ? Object.entries(summary.typeStats) : [];

  const completedDate = result.completedAt ? new Date(result.completedAt) : null;
  const completedDisplay = completedDate ? completedDate.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Not recorded';

  const issues = result.issues ?? [];
  const recommendations = result.recommendations ?? [];

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300">
            <BarChart3 className="h-5 w-5" />
            Simulation Insights
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Overall paper quality assessment
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Completed {completedDisplay}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn('px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-2', gradeInfo.bgClass, gradeInfo.textClass)}>
            <Award className="h-4 w-4" />
            Grade {gradeInfo.grade}
          </span>
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {correctAnswers}/{totalQuestions} correct
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          { label: 'Score', value: formatPercentage(scoreValue), icon: Target, bg: 'bg-green-100 dark:bg-green-900/20', iconColor: 'text-green-600 dark:text-green-400' },
          { label: 'Accuracy', value: formatPercentage(accuracyValue), icon: Activity, bg: 'bg-blue-100 dark:bg-blue-900/20', iconColor: 'text-blue-600 dark:text-blue-400' },
          { label: 'Completion', value: formatPercentage(completionValue), icon: PieChart, bg: 'bg-teal-100 dark:bg-teal-900/20', iconColor: 'text-teal-600 dark:text-teal-400' },
          { label: 'Marks Earned', value: `${Math.round(earnedMarks)}/${Math.round(totalMarks)}`, icon: BookOpen, bg: 'bg-purple-100 dark:bg-purple-900/20', iconColor: 'text-purple-600 dark:text-purple-400' },
          { label: 'Avg Time', value: formatDuration(averageTimeSeconds), icon: Clock, bg: 'bg-indigo-100 dark:bg-indigo-900/20', iconColor: 'text-indigo-600 dark:text-indigo-400' },
          { label: 'Flagged', value: String(result.flaggedQuestions?.length ?? 0), icon: Flag, bg: 'bg-yellow-100 dark:bg-yellow-900/20', iconColor: 'text-yellow-600 dark:text-yellow-400' }
        ].map(metric => (
          <div key={metric.label} className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
            <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', metric.bg)}>
              <metric.icon className={cn('h-4 w-4', metric.iconColor)} />
            </div>
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-400">{metric.label}</div>
              <div className="font-medium text-gray-900 dark:text-white">{metric.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <section className="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              Question performance distribution
            </h4>
            <div className="space-y-2">
              <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
                {[{ label: 'Correct', count: correctAnswers, color: 'bg-green-500' }, { label: 'Partial', count: partiallyCorrect, color: 'bg-yellow-500' }, { label: 'Incorrect', count: incorrectAnswers, color: 'bg-red-500' }, { label: 'Unattempted', count: unattempted, color: 'bg-gray-400' }]
                  .filter(item => item.count > 0)
                  .map(item => (
                    <div
                      key={item.label}
                      className={cn('h-full', item.color)}
                      style={{ width: totalQuestions > 0 ? `${(item.count / totalQuestions) * 100}%` : '0%' }}
                    />
                  ))}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />Correct ({correctAnswers})</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" />Partial ({partiallyCorrect})</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />Incorrect ({incorrectAnswers})</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400" />Unattempted ({unattempted})</span>
              </div>
            </div>
          </section>

          <section className="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              Difficulty performance
            </h4>
            <div className="space-y-3">
              {orderedDifficultyKeys.map(key => {
                const data = summary?.difficultyStats?.[key];
                if (!data) {
                  return null;
                }
                const score = data.marks > 0 ? (data.earnedMarks / data.marks) * 100 : 0;
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                      <span className="capitalize">{key}</span>
                      <span>{formatPercentage(score)}</span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500"
                        style={{ width: `${Math.max(4, Math.min(100, Math.round(score))) }%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {(!summary || Object.keys(summary.difficultyStats ?? {}).length === 0) && (
                <p className="text-xs text-gray-500 dark:text-gray-400">Difficulty insights will appear after the next simulation run.</p>
              )}
            </div>
          </section>

          <section className="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
              <PieChart className="h-4 w-4 text-indigo-500" />
              Question type accuracy
            </h4>
            <div className="space-y-3">
              {typeEntries.map(([type, data]) => {
                const successRate = data.total > 0 ? (data.correct / data.total) * 100 : 0;
                const partialRate = data.total > 0 ? (data.partial / data.total) * 100 : 0;
                const label = type === 'mcq' ? 'Multiple choice' : type === 'tf' ? 'True/False' : type.charAt(0).toUpperCase() + type.slice(1);

                return (
                  <div key={type}>
                    <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                      <span>{label}</span>
                      <span>{formatPercentage(successRate)}</span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
                      <div className="h-full bg-green-500" style={{ width: `${Math.min(100, Math.round(successRate))}%` }} />
                      {partialRate > 0 && (
                        <div className="h-full bg-yellow-500" style={{ width: `${Math.min(100, Math.round(partialRate))}%` }} />
                      )}
                    </div>
                  </div>
                );
              })}
              {(!summary || typeEntries.length === 0) && (
                <p className="text-xs text-gray-500 dark:text-gray-400">Run a simulation to analyse performance by question type.</p>
              )}
            </div>
          </section>

          <section className="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              Time insights
            </h4>
            <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <div className="flex items-center justify-between">
                <span>Average per question</span>
                <span className="font-medium">{formatDuration(averageTimeSeconds)}</span>
              </div>
              {timeSpentSeconds !== null && (
                <div className="flex items-center justify-between">
                  <span>Total simulation time</span>
                  <span className="font-medium">{formatDuration(timeSpentSeconds)}</span>
                </div>
              )}
              {result.timeInsights?.fastestQuestionId && (
                <div className="flex items-center justify-between">
                  <span>Fastest question</span>
                  <span className="font-medium">
                    Q{questionMap.get(result.timeInsights.fastestQuestionId)?.question_number || '?'} • {formatDuration(result.timeInsights.fastestTime)}
                  </span>
                </div>
              )}
              {result.timeInsights?.slowestQuestionId && (
                <div className="flex items-center justify-between">
                  <span>Slowest question</span>
                  <span className="font-medium">
                    Q{questionMap.get(result.timeInsights.slowestQuestionId)?.question_number || '?'} • {formatDuration(result.timeInsights.slowestTime)}
                  </span>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Topic focus areas
            </h4>
            {topicEntries.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400">Topic-level analytics will be available after the next simulation run.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-2">Needs attention</h5>
                  <div className="space-y-2">
                    {weakTopics.length === 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">No underperforming topics detected.</p>
                    )}
                    {weakTopics.map(topic => (
                      <div key={`weak-${topic.topic}`} className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
                        <span className="truncate" title={topic.topic}>{topic.topic}</span>
                        <span>{formatPercentage(topic.score)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-2">Strong performers</h5>
                  <div className="space-y-2">
                    {strongTopics.length === 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">Run more simulations to build topic trends.</p>
                    )}
                    {strongTopics.map(topic => (
                      <div key={`strong-${topic.topic}`} className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
                        <span className="truncate" title={topic.topic}>{topic.topic}</span>
                        <span>{formatPercentage(topic.score)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
              <Flag className="h-4 w-4 text-yellow-500" />
              Questions needing review
            </h4>
            {attentionQuestions.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400">No outstanding simulation flags.</p>
            ) : (
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                {attentionQuestions.map(question => (
                  <li
                    key={question.id}
                    className="flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2"
                  >
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        Question {question.number ?? '?'}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {question.status === 'flagged' ? 'Flagged in simulation' : question.status === 'partial' ? 'Partial credit' : question.status === 'incorrect' ? 'Incorrect' : 'Unattempted'}
                        {question.timeSpent !== undefined && ` • ${formatDuration(question.timeSpent)}`}
                      </div>
                    </div>
                    {onFocusQuestion && (
                      <button
                        onClick={() => onFocusQuestion(question.id)}
                        className="text-xs font-medium text-blue-600 hover:text-blue-500 dark:text-blue-300 dark:hover:text-blue-200"
                      >
                        Review
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <section className="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-500" />
          Issues & recommendations
        </h4>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h5 className="text-xs font-semibold uppercase text-gray-700 dark:text-gray-300 mb-2">Issues observed</h5>
            {issues.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400">No blocking issues detected during the last simulation.</p>
            ) : (
              <ul className="text-xs text-gray-700 dark:text-gray-300 space-y-1">
                {issues.slice(0, 5).map((issue, idx) => (
                  <li key={`${issue.questionId}-${idx}`}>• {issue.message}</li>
                ))}
                {issues.length > 5 && (
                  <li className="text-gray-500 dark:text-gray-400">• ...and {issues.length - 5} more</li>
                )}
              </ul>
            )}
          </div>
          <div>
            <h5 className="text-xs font-semibold uppercase text-gray-700 dark:text-gray-300 mb-2">Suggested actions</h5>
            {recommendations.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400">Great work—no additional follow-up recommended.</p>
            ) : (
              <ul className="text-xs text-gray-700 dark:text-gray-300 space-y-1">
                {recommendations.slice(0, 6).map((rec, idx) => (
                  <li key={`rec-${idx}`}>• {rec}</li>
                ))}
                {recommendations.length > 6 && (
                  <li className="text-gray-500 dark:text-gray-400">• ...and {recommendations.length - 6} more</li>
                )}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
