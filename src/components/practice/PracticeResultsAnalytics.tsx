import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Target,
  Clock,
  TrendingUp,
  TrendingDown,
  Award,
  BookOpen,
  Brain,
  Zap,
  AlertCircle,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Download,
  Share2,
  BarChart3,
  PieChart,
  Activity,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ComprehensiveAnalytics } from '@/services/practice/resultsAnalyticsService';
import { computeComprehensiveAnalytics, getStoredAnalytics } from '@/services/practice/resultsAnalyticsService';
import { QuestionsReviewTab, InsightsRecommendationsTab } from './ResultsDetailedComponents';

interface PracticeResultsAnalyticsProps {
  sessionId: string;
  onClose: () => void;
}

export const PracticeResultsAnalytics: React.FC<PracticeResultsAnalyticsProps> = ({
  sessionId,
  onClose
}) => {
  const [analytics, setAnalytics] = useState<ComprehensiveAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'breakdown' | 'questions' | 'insights'>('overview');

  useEffect(() => {
    loadAnalytics();
  }, [sessionId]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      // Try to load stored analytics first
      let data = await getStoredAnalytics(sessionId);

      // If not found, compute fresh
      if (!data) {
        data = await computeComprehensiveAnalytics(sessionId);
      }

      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Analyzing your performance...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Unable to Load Results
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            We couldn't generate your analytics report. Please try again.
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Return to Practice
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Trophy className="h-8 w-8 text-amber-500" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Test Results
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Comprehensive Performance Analysis
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export PDF</span>
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                Close
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="mt-4 flex gap-1 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'breakdown', label: 'Performance Breakdown', icon: PieChart },
              { id: 'questions', label: 'Question Review', icon: BookOpen },
              { id: 'insights', label: 'Insights & Tips', icon: Sparkles }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition whitespace-nowrap',
                  activeTab === tab.id
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && <OverviewTab analytics={analytics} />}
        {activeTab === 'breakdown' && <BreakdownTab analytics={analytics} />}
        {activeTab === 'questions' && <QuestionsTab analytics={analytics} />}
        {activeTab === 'insights' && <InsightsTab analytics={analytics} />}
      </div>
    </div>
  );
};

// Overview Tab Component
interface TabProps {
  analytics: ComprehensiveAnalytics;
}

const OverviewTab: React.FC<TabProps> = ({ analytics }) => {
  const { summary, previousAttempt } = analytics;

  const getGradeColor = (grade: string) => {
    if (['A*', 'A'].includes(grade)) return 'text-green-600 dark:text-green-400';
    if (['B', 'C'].includes(grade)) return 'text-blue-600 dark:text-blue-400';
    if (['D', 'E'].includes(grade)) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="space-y-6">
      {/* Hero Stats */}
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mb-4 shadow-lg">
          <Award className="h-12 w-12 text-white" />
        </div>
        <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Test Completed!
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Here's how you performed
        </p>
      </div>

      {/* Main Performance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Target className="h-6 w-6" />}
          label="Overall Score"
          value={`${summary.percentage}%`}
          subtitle={`${summary.marksEarned} / ${summary.marksAvailable} marks`}
          color="blue"
          trend={previousAttempt?.improvement}
        />
        <StatCard
          icon={<Trophy className="h-6 w-6" />}
          label="Grade Prediction"
          value={summary.gradePrediction}
          subtitle="IGCSE Grade Boundary"
          color="amber"
          valueClassName={getGradeColor(summary.gradePrediction)}
        />
        <StatCard
          icon={<CheckCircle className="h-6 w-6" />}
          label="Accuracy"
          value={`${Math.round(summary.accuracy * 100)}%`}
          subtitle={`${summary.questionsCorrect} correct out of ${summary.totalQuestions}`}
          color="green"
        />
        <StatCard
          icon={<Clock className="h-6 w-6" />}
          label="Time Spent"
          value={formatTime(summary.totalTimeSeconds)}
          subtitle={`Avg ${Math.round(summary.averageTimePerQuestion)}s per question`}
          color="purple"
        />
      </div>

      {/* Detailed Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Questions Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-500" />
            Questions Breakdown
          </h3>
          <div className="space-y-3">
            <ProgressBar
              label="Correct"
              value={summary.questionsCorrect}
              total={summary.totalQuestions}
              color="green"
            />
            <ProgressBar
              label="Partial Credit"
              value={summary.questionsPartial}
              total={summary.totalQuestions}
              color="amber"
            />
            <ProgressBar
              label="Incorrect"
              value={summary.questionsIncorrect}
              total={summary.totalQuestions}
              color="red"
            />
            <ProgressBar
              label="Unanswered"
              value={summary.totalQuestions - summary.questionsAnswered}
              total={summary.totalQuestions}
              color="gray"
            />
          </div>
        </div>

        {/* Performance Indicators */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            Performance Metrics
          </h3>
          <div className="space-y-4">
            <MetricItem
              label="Time Efficiency"
              value={`${Math.round(summary.timeEfficiency)}%`}
              description={
                summary.timeEfficiency > 100
                  ? 'Faster than expected'
                  : summary.timeEfficiency > 80
                    ? 'Good pace'
                    : 'Take more time to review'
              }
              good={summary.timeEfficiency > 80}
            />
            <MetricItem
              label="Completion Rate"
              value={`${Math.round((summary.questionsAnswered / summary.totalQuestions) * 100)}%`}
              description={`${summary.questionsAnswered} of ${summary.totalQuestions} answered`}
              good={summary.questionsAnswered === summary.totalQuestions}
            />
          </div>
        </div>

        {/* Progress Comparison */}
        {previousAttempt && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Progress Tracking
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Previous Attempt</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {previousAttempt.percentage}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Current Attempt</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {summary.percentage}%
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Improvement
                    </span>
                    <div className="flex items-center gap-1">
                      {previousAttempt.improvement >= 0 ? (
                        <>
                          <TrendingUp className="h-4 w-4 text-green-500" />
                          <span className="text-sm font-bold text-green-600 dark:text-green-400">
                            +{previousAttempt.improvement}%
                          </span>
                        </>
                      ) : (
                        <>
                          <TrendingDown className="h-4 w-4 text-red-500" />
                          <span className="text-sm font-bold text-red-600 dark:text-red-400">
                            {previousAttempt.improvement}%
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Insights */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-500" />
          Quick Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {analytics.strongAreas.length > 0 && (
            <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <h4 className="font-medium text-gray-900 dark:text-white">Strengths</h4>
              </div>
              <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                {analytics.strongAreas.slice(0, 3).map((area, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    {area.name} ({Math.round(area.accuracy * 100)}%)
                  </li>
                ))}
              </ul>
            </div>
          )}
          {analytics.weakAreas.length > 0 && (
            <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                <h4 className="font-medium text-gray-900 dark:text-white">Areas to Improve</h4>
              </div>
              <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                {analytics.weakAreas.slice(0, 3).map((area, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    {area.name} ({Math.round(area.accuracy * 100)}%)
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Breakdown Tab Component
const BreakdownTab: React.FC<TabProps> = ({ analytics }) => {
  const [expandedUnit, setExpandedUnit] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Difficulty Analysis */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <Target className="h-6 w-6 text-blue-500" />
          Performance by Difficulty
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <DifficultyCard
            level="Easy"
            data={analytics.difficultyAnalysis.easy}
            color="green"
          />
          <DifficultyCard
            level="Medium"
            data={analytics.difficultyAnalysis.medium}
            color="amber"
          />
          <DifficultyCard
            level="Hard"
            data={analytics.difficultyAnalysis.hard}
            color="red"
          />
        </div>
      </div>

      {/* Unit Performance */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-purple-500" />
          Performance by Unit
        </h3>
        <div className="space-y-3">
          {analytics.unitPerformance.map((unit) => (
            <UnitPerformanceCard
              key={unit.unitId ?? 'unassigned'}
              unit={unit}
              expanded={expandedUnit === (unit.unitId ?? 'unassigned')}
              onToggle={() =>
                setExpandedUnit(
                  expandedUnit === (unit.unitId ?? 'unassigned')
                    ? null
                    : (unit.unitId ?? 'unassigned')
                )
              }
            />
          ))}
        </div>
      </div>

      {/* Topic Performance */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <Brain className="h-6 w-6 text-indigo-500" />
          Performance by Topic
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {analytics.topicPerformance.map((topic) => (
            <TopicPerformanceCard key={topic.topicId ?? 'unassigned'} topic={topic} />
          ))}
        </div>
      </div>
    </div>
  );
};

// Questions Tab Component
const QuestionsTab: React.FC<TabProps> = ({ analytics }) => {
  return <QuestionsReviewTab analytics={analytics} />;
};

// Insights Tab Component
const InsightsTab: React.FC<TabProps> = ({ analytics }) => {
  return <InsightsRecommendationsTab analytics={analytics} />;
};

// Utility Components
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle: string;
  color: 'blue' | 'amber' | 'green' | 'purple' | 'red';
  trend?: number;
  valueClassName?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  icon,
  label,
  value,
  subtitle,
  color,
  trend,
  valueClassName
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400',
    amber: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400',
    green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-600 dark:text-green-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400',
    red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition">
      <div className="flex items-start justify-between mb-4">
        <div className={cn('p-2 rounded-lg', colorClasses[color])}>{icon}</div>
        {trend !== undefined && trend !== 0 && (
          <div className={cn('flex items-center gap-1 text-sm font-medium', trend > 0 ? 'text-green-600' : 'text-red-600')}>
            {trend > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{label}</div>
      <div className={cn('text-3xl font-bold mb-1', valueClassName || 'text-gray-900 dark:text-white')}>
        {value}
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</div>
    </div>
  );
};

interface ProgressBarProps {
  label: string;
  value: number;
  total: number;
  color: 'green' | 'amber' | 'red' | 'gray';
}

const ProgressBar: React.FC<ProgressBarProps> = ({ label, value, total, color }) => {
  const percentage = total > 0 ? (value / total) * 100 : 0;

  const colorClasses = {
    green: 'bg-green-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    gray: 'bg-gray-400'
  };

  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-gray-700 dark:text-gray-300">{label}</span>
        <span className="font-medium text-gray-900 dark:text-white">
          {value} ({Math.round(percentage)}%)
        </span>
      </div>
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={cn('h-full transition-all duration-500', colorClasses[color])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

interface MetricItemProps {
  label: string;
  value: string;
  description: string;
  good: boolean;
}

const MetricItem: React.FC<MetricItemProps> = ({ label, value, description, good }) => (
  <div>
    <div className="flex items-center justify-between mb-1">
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      <span className={cn('text-lg font-bold', good ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400')}>
        {value}
      </span>
    </div>
    <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
  </div>
);

const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
};

// Difficulty Card and other components will continue in part 2...
const DifficultyCard: React.FC<any> = ({ level, data, color }) => (
  <div className="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-4">
    <h4 className="font-medium text-gray-900 dark:text-white mb-3">{level}</h4>
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-gray-600 dark:text-gray-400">Total:</span>
        <span className="font-medium text-gray-900 dark:text-white">{data.total}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-600 dark:text-gray-400">Correct:</span>
        <span className="font-medium text-green-600">{data.correct}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-600 dark:text-gray-400">Accuracy:</span>
        <span className="font-bold text-gray-900 dark:text-white">{Math.round(data.accuracy * 100)}%</span>
      </div>
    </div>
  </div>
);

const UnitPerformanceCard: React.FC<any> = ({ unit, expanded, onToggle }) => (
  <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
    >
      <div className="flex items-center gap-3 flex-1">
        <div className={cn(
          'px-3 py-1 rounded-full text-sm font-medium',
          unit.accuracy >= 0.8
            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
            : unit.accuracy >= 0.6
              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
        )}>
          {Math.round(unit.accuracy * 100)}%
        </div>
        <div className="text-left">
          <h4 className="font-medium text-gray-900 dark:text-white">{unit.unitName}</h4>
          <p className="text-sm text-gray-500">
            {unit.questionsCorrect}/{unit.questionsTotal} correct
          </p>
        </div>
      </div>
      {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
    </button>
    {expanded && (
      <div className="p-4 bg-gray-50 dark:bg-gray-900/40 border-t border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-500 mb-1">Easy</p>
            <p className="font-medium">{Math.round(unit.difficultyBreakdown.easy.accuracy * 100)}%</p>
          </div>
          <div>
            <p className="text-gray-500 mb-1">Medium</p>
            <p className="font-medium">{Math.round(unit.difficultyBreakdown.medium.accuracy * 100)}%</p>
          </div>
          <div>
            <p className="text-gray-500 mb-1">Hard</p>
            <p className="font-medium">{Math.round(unit.difficultyBreakdown.hard.accuracy * 100)}%</p>
          </div>
        </div>
      </div>
    )}
  </div>
);

const TopicPerformanceCard: React.FC<any> = ({ topic }) => {
  const statusConfig = {
    mastered: { color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300', label: 'Mastered' },
    progressing: { color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300', label: 'Progressing' },
    needs_work: { color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300', label: 'Needs Work' }
  };

  const config = statusConfig[topic.status];

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900 dark:text-white mb-1">{topic.topicName}</h4>
          <p className="text-xs text-gray-500">{topic.unitName}</p>
        </div>
        <div className={cn('px-2 py-1 rounded-full text-xs font-medium', config.color)}>
          {config.label}
        </div>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Accuracy:</span>
          <span className="font-bold text-gray-900 dark:text-white">{Math.round(topic.accuracy * 100)}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Questions:</span>
          <span className="text-gray-900 dark:text-white">{topic.questionsCorrect}/{topic.questionsTotal}</span>
        </div>
      </div>
    </div>
  );
};
