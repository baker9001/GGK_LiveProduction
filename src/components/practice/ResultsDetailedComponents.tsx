import React, { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Target,
  BookOpen,
  Lightbulb,
  TrendingUp,
  Award,
  PlayCircle,
  FileText,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ComprehensiveAnalytics, QuestionDetailedReview, StudyRecommendation } from '@/services/practice/resultsAnalyticsService';

// Questions Tab Component
interface QuestionsTabProps {
  analytics: ComprehensiveAnalytics;
}

export const QuestionsReviewTab: React.FC<QuestionsTabProps> = ({ analytics }) => {
  const [filter, setFilter] = useState<'all' | 'correct' | 'incorrect' | 'partial'>('all');
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);

  const filteredQuestions = analytics.questionReviews.filter((q) => {
    if (filter === 'all') return true;
    if (filter === 'correct') return q.isCorrect;
    if (filter === 'incorrect') return !q.isCorrect && !q.isPartial;
    if (filter === 'partial') return q.isPartial;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter:</span>
          <div className="flex gap-2">
            {[
              { id: 'all', label: 'All Questions', count: analytics.questionReviews.length },
              { id: 'correct', label: 'Correct', count: analytics.summary.questionsCorrect },
              { id: 'incorrect', label: 'Incorrect', count: analytics.summary.questionsIncorrect },
              { id: 'partial', label: 'Partial', count: analytics.summary.questionsPartial }
            ].map((option) => (
              <button
                key={option.id}
                onClick={() => setFilter(option.id as any)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition',
                  filter === option.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                )}
              >
                {option.label} ({option.count})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {filteredQuestions.map((question) => (
          <QuestionReviewCard
            key={question.questionId}
            question={question}
            expanded={expandedQuestion === question.questionId}
            onToggle={() =>
              setExpandedQuestion(
                expandedQuestion === question.questionId ? null : question.questionId
              )
            }
          />
        ))}

        {filteredQuestions.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">No questions match this filter</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Insights and Recommendations Tab
interface InsightsTabProps {
  analytics: ComprehensiveAnalytics;
}

export const InsightsRecommendationsTab: React.FC<InsightsTabProps> = ({ analytics }) => {
  return (
    <div className="space-y-6">
      {/* Performance Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Award className="h-6 w-6 text-purple-500" />
          Your Performance Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PerformanceSummaryCard
            title="Overall Achievement"
            description={getPerformanceMessage(analytics.summary.percentage)}
            percentage={analytics.summary.percentage}
            grade={analytics.summary.gradePrediction}
          />
          <PerformanceSummaryCard
            title="Progress Indicator"
            description={getProgressMessage(analytics)}
            percentage={analytics.summary.accuracy * 100}
          />
        </div>
      </div>

      {/* Study Recommendations */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <Lightbulb className="h-6 w-6 text-amber-500" />
          Personalized Study Recommendations
        </h3>
        <div className="space-y-4">
          {analytics.recommendations.map((recommendation) => (
            <RecommendationCard key={recommendation.id} recommendation={recommendation} />
          ))}

          {analytics.recommendations.length === 0 && (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Excellent Performance!
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                You've mastered all areas. Keep practicing to maintain your skills.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Strengths and Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strengths */}
        {analytics.strongAreas.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Your Strengths
            </h3>
            <div className="space-y-3">
              {analytics.strongAreas.map((area, idx) => (
                <StrengthWeaknessItem
                  key={idx}
                  area={area}
                  type="strength"
                />
              ))}
            </div>
          </div>
        )}

        {/* Weaknesses */}
        {analytics.weakAreas.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Areas for Improvement
            </h3>
            <div className="space-y-3">
              {analytics.weakAreas.map((area, idx) => (
                <StrengthWeaknessItem
                  key={idx}
                  area={area}
                  type="weakness"
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Study Plan */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <Target className="h-6 w-6 text-blue-500" />
          Your Personalized Study Plan
        </h3>
        <StudyPlanTimeline recommendations={analytics.recommendations} weakAreas={analytics.weakAreas} />
      </div>

      {/* Next Steps */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl border border-green-200 dark:border-green-800 p-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-green-500" />
          Next Steps to Excel
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <NextStepCard
            icon={<BookOpen className="h-6 w-6" />}
            title="Review Weak Topics"
            description="Focus on areas where you scored below 70%"
            action="Start Review"
          />
          <NextStepCard
            icon={<PlayCircle className="h-6 w-6" />}
            title="Watch Tutorial Videos"
            description="Visual learning for difficult concepts"
            action="Browse Videos"
          />
          <NextStepCard
            icon={<FileText className="h-6 w-6" />}
            title="Practice More"
            description="Reinforce learning with targeted practice"
            action="Start Practice"
          />
        </div>
      </div>
    </div>
  );
};

// Question Review Card Component
interface QuestionReviewCardProps {
  question: QuestionDetailedReview;
  expanded: boolean;
  onToggle: () => void;
}

const QuestionReviewCard: React.FC<QuestionReviewCardProps> = ({
  question,
  expanded,
  onToggle
}) => {
  const statusIcon = question.isCorrect ? (
    <CheckCircle className="h-6 w-6 text-green-500" />
  ) : question.isPartial ? (
    <AlertCircle className="h-6 w-6 text-amber-500" />
  ) : (
    <XCircle className="h-6 w-6 text-red-500" />
  );

  const statusColor = question.isCorrect
    ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10'
    : question.isPartial
      ? 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10'
      : 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10';

  return (
    <div className={cn('rounded-xl border overflow-hidden transition', statusColor)}>
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-start justify-between hover:bg-white/50 dark:hover:bg-gray-800/50 transition"
      >
        <div className="flex items-start gap-4 flex-1 text-left">
          {statusIcon}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                Question {question.questionNumber}
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                {question.difficulty}
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                {question.topic.name}
              </span>
            </div>
            <p className="text-gray-700 dark:text-gray-300 line-clamp-2">
              {question.questionText}
            </p>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
              <span>Marks: {question.marksEarned} / {question.marks}</span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {question.timeSpent}s
              </span>
            </div>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-5 w-5 text-gray-400 flex-shrink-0 ml-2" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0 ml-2" />
        )}
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="p-6 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 space-y-4">
          {/* Question Details */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Full Question
            </h4>
            <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
              {question.questionText}
            </p>
          </div>

          {/* Your Answer */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Your Answer
            </h4>
            <div className="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-3">
              <pre className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap font-sans">
                {JSON.stringify(question.studentAnswer, null, 2)}
              </pre>
            </div>
          </div>

          {/* Feedback */}
          {!question.isCorrect && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                What you should know
              </h4>
              {question.explanation && (
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                  {question.explanation}
                </p>
              )}
              {question.hint && (
                <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
                  <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
                    Hint:
                  </p>
                  <p className="text-sm text-blue-800 dark:text-blue-200">{question.hint}</p>
                </div>
              )}
            </div>
          )}

          {/* Curriculum Links */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <span className="text-xs px-2 py-1 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
              Unit: {question.unit.name}
            </span>
            <span className="text-xs px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
              Topic: {question.topic.name}
            </span>
            {question.subtopic.name !== 'Unassigned' && (
              <span className="text-xs px-2 py-1 rounded bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                Subtopic: {question.subtopic.name}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Recommendation Card Component
interface RecommendationCardProps {
  recommendation: StudyRecommendation;
}

const RecommendationCard: React.FC<RecommendationCardProps> = ({ recommendation }) => {
  const priorityConfig = {
    high: {
      color: 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10',
      badge: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
      label: 'High Priority'
    },
    medium: {
      color: 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10',
      badge: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
      label: 'Medium Priority'
    },
    low: {
      color: 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10',
      badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
      label: 'Low Priority'
    }
  };

  const config = priorityConfig[recommendation.priority];

  return (
    <div className={cn('rounded-xl border p-5', config.color)}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={cn('px-3 py-1 rounded-full text-xs font-medium', config.badge)}>
              {config.label}
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Est. {recommendation.estimatedStudyTime} mins
            </span>
          </div>
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            {recommendation.area}
          </h4>
          <p className="text-gray-700 dark:text-gray-300 text-sm mb-3">
            {recommendation.actionText}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
            <span>Current: {recommendation.currentAccuracy}%</span>
            <span>Target: {recommendation.targetAccuracy}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-green-500 transition-all duration-500"
              style={{ width: `${recommendation.currentAccuracy}%` }}
            />
          </div>
        </div>
      </div>

      {/* Resources */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
          Recommended Resources:
        </p>
        <div className="flex flex-wrap gap-2">
          {recommendation.resources.map((resource, idx) => (
            <button
              key={idx}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              {resource.type === 'video' && <PlayCircle className="h-4 w-4" />}
              {resource.type === 'practice' && <Target className="h-4 w-4" />}
              {resource.type === 'notes' && <FileText className="h-4 w-4" />}
              {resource.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// Helper Components
const PerformanceSummaryCard: React.FC<any> = ({ title, description, percentage, grade }) => (
  <div className="bg-white/70 dark:bg-gray-800/70 rounded-lg p-4">
    <h4 className="font-medium text-gray-900 dark:text-white mb-2">{title}</h4>
    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{description}</p>
    <div className="flex items-center gap-3">
      <div className="text-3xl font-bold text-gray-900 dark:text-white">{Math.round(percentage)}%</div>
      {grade && (
        <div className="px-3 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-lg">
          Grade {grade}
        </div>
      )}
    </div>
  </div>
);

const StrengthWeaknessItem: React.FC<any> = ({ area, type }) => (
  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/40 rounded-lg">
    <div className="flex-1">
      <p className="font-medium text-gray-900 dark:text-white text-sm">{area.name}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {area.questionsTotal} questions · {type === 'weakness' && `${area.improvementPotential} marks to gain`}
      </p>
    </div>
    <div className={cn(
      'px-3 py-1 rounded-full text-sm font-bold',
      type === 'strength'
        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
        : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
    )}>
      {Math.round(area.accuracy * 100)}%
    </div>
  </div>
);

const StudyPlanTimeline: React.FC<any> = ({ recommendations, weakAreas }) => {
  const totalTime = recommendations.reduce((sum: number, rec: any) => sum + rec.estimatedStudyTime, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Estimated Study Time</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {Math.ceil(totalTime / 60)} hours {totalTime % 60} minutes
          </p>
        </div>
        <Clock className="h-8 w-8 text-blue-500" />
      </div>

      <div className="space-y-3">
        {recommendations.slice(0, 3).map((rec: any, idx: number) => (
          <div key={rec.id} className="flex items-start gap-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold text-sm flex-shrink-0">
              {idx + 1}
            </div>
            <div className="flex-1 p-4 bg-gray-50 dark:bg-gray-900/40 rounded-lg">
              <h5 className="font-medium text-gray-900 dark:text-white mb-1">{rec.area}</h5>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Focus: {rec.actionText}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Time needed: {rec.estimatedStudyTime} minutes
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const NextStepCard: React.FC<any> = ({ icon, title, description, action }) => (
  <div className="bg-white/70 dark:bg-gray-800/70 rounded-lg p-4 hover:shadow-lg transition">
    <div className="text-green-600 dark:text-green-400 mb-3">{icon}</div>
    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{title}</h4>
    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{description}</p>
    <button className="text-sm font-medium text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition">
      {action} →
    </button>
  </div>
);

// Helper Functions
function getPerformanceMessage(percentage: number): string {
  if (percentage >= 90) return 'Outstanding! You have excellent command of the material.';
  if (percentage >= 80) return 'Great work! You demonstrate strong understanding.';
  if (percentage >= 70) return 'Good effort! You have solid understanding with room to improve.';
  if (percentage >= 60) return 'Fair performance. Focus on strengthening weak areas.';
  if (percentage >= 50) return 'You need more practice to build confidence.';
  return 'Significant improvement needed. Consider reviewing fundamentals.';
}

function getProgressMessage(analytics: ComprehensiveAnalytics): string {
  if (analytics.previousAttempt) {
    const improvement = analytics.previousAttempt.improvement;
    if (improvement > 10) return 'Excellent progress! Your hard work is paying off.';
    if (improvement > 0) return 'Steady improvement! Keep up the good work.';
    if (improvement === 0) return 'Consistent performance. Try new study strategies.';
    return 'Performance declined. Review your study approach.';
  }
  return 'First attempt completed. Use this as your baseline.';
}
