// src/app/system-admin/learning/practice-management/questions-setup/components/QuestionAnalytics.tsx
import React from 'react';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  HelpCircle
} from 'lucide-react';
import { cn } from '../../../../../../lib/utils';
import { GroupedPaper } from '../page';

interface QuestionAnalyticsProps {
  papers: GroupedPaper[];
}

export function QuestionAnalytics({ papers }: QuestionAnalyticsProps) {
  // Calculate overall statistics
  const calculateStats = () => {
    let totalPapers = papers.length;
    let totalQuestions = 0;
    let confirmedQuestions = 0;
    let pendingQuestions = 0;
    let incompleteQuestions = 0;
    let totalMarks = 0;
    
    const difficultyDistribution = { easy: 0, medium: 0, hard: 0 };
    const typeDistribution = { mcq: 0, tf: 0, descriptive: 0 };
    const statusDistribution = { active: 0, qa_review: 0, draft: 0 };
    const providerDistribution: Record<string, number> = {};
    const subjectDistribution: Record<string, number> = {};
    
    papers.forEach(paper => {
      statusDistribution[paper.status as keyof typeof statusDistribution]++;
      
      if (!providerDistribution[paper.provider]) {
        providerDistribution[paper.provider] = 0;
      }
      providerDistribution[paper.provider]++;
      
      if (!subjectDistribution[paper.subject]) {
        subjectDistribution[paper.subject] = 0;
      }
      subjectDistribution[paper.subject]++;
      
      paper.questions.forEach(question => {
        totalQuestions++;
        totalMarks += question.marks;
        
        if (question.status === 'active') confirmedQuestions++;
        else if (question.status === 'qa_review') pendingQuestions++;
        
        // Check if question is complete
        const hasRequiredFields = question.question_description && 
                                 question.marks > 0 && 
                                 question.difficulty && 
                                 question.topic_id &&
                                 question.hint &&
                                 question.explanation;
        
        if (!hasRequiredFields) incompleteQuestions++;
        
        // Count difficulty
        if (question.difficulty in difficultyDistribution) {
          difficultyDistribution[question.difficulty as keyof typeof difficultyDistribution]++;
        }
        
        // Count type
        if (question.type in typeDistribution) {
          typeDistribution[question.type as keyof typeof typeDistribution]++;
        }
        
        // Count sub-questions
        question.parts.forEach(part => {
          totalQuestions++;
          totalMarks += part.marks;
          if (part.status === 'active') confirmedQuestions++;
          else if (part.status === 'qa_review') pendingQuestions++;
        });
      });
    });
    
    return {
      totalPapers,
      totalQuestions,
      confirmedQuestions,
      pendingQuestions,
      incompleteQuestions,
      totalMarks,
      averageMarksPerQuestion: totalQuestions > 0 ? (totalMarks / totalQuestions).toFixed(1) : '0',
      completionRate: totalQuestions > 0 ? ((confirmedQuestions / totalQuestions) * 100).toFixed(1) : '0',
      difficultyDistribution,
      typeDistribution,
      statusDistribution,
      providerDistribution,
      subjectDistribution
    };
  };
  
  const stats = calculateStats();
  
  // Get top 5 distributions
  const getTopDistributions = (distribution: Record<string, number>, limit: number = 5) => {
    return Object.entries(distribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
        <BarChart3 className="h-5 w-5 mr-2" />
        Question Analytics Overview
      </h2>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Papers
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {stats.totalPapers}
              </p>
            </div>
            <FileText className="h-8 w-8 text-[#99C93B]" />
          </div>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Questions
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {stats.totalQuestions}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {stats.totalMarks} total marks
              </p>
            </div>
            <HelpCircle className="h-8 w-8 text-[#5D7E23]" />
          </div>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Completion Rate
              </p>
              <p className="text-2xl font-semibold text-green-600 dark:text-green-400">
                {stats.completionRate}%
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {stats.confirmedQuestions} confirmed
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Pending Review
              </p>
              <p className="text-2xl font-semibold text-amber-600 dark:text-amber-400">
                {stats.pendingQuestions}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {stats.incompleteQuestions} incomplete
              </p>
            </div>
            <Clock className="h-8 w-8 text-amber-500" />
          </div>
        </div>
      </div>
      
      {/* Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Difficulty Distribution */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Difficulty Distribution
          </h3>
          <div className="space-y-3">
            {Object.entries(stats.difficultyDistribution).map(([difficulty, count]) => {
              const percentage = stats.totalQuestions > 0 ? (count / stats.totalQuestions) * 100 : 0;
              return (
                <div key={difficulty}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="capitalize text-gray-700 dark:text-gray-300">
                      {difficulty}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      {count} ({percentage.toFixed(1)}%)
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
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Type Distribution */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Question Type Distribution
          </h3>
          <div className="space-y-3">
            {Object.entries(stats.typeDistribution).map(([type, count]) => {
              const percentage = stats.totalQuestions > 0 ? (count / stats.totalQuestions) * 100 : 0;
              const typeLabels = {
                mcq: 'Multiple Choice',
                tf: 'True/False',
                descriptive: 'Descriptive'
              };
              return (
                <div key={type}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 dark:text-gray-300">
                      {typeLabels[type as keyof typeof typeLabels]}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      {count} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-[#99C93B] h-2 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Provider and Subject Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Providers */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Top Providers by Papers
          </h3>
          <div className="space-y-2">
            {getTopDistributions(stats.providerDistribution).map(([provider, count], index) => (
              <div key={provider} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400 w-6">
                    #{index + 1}
                  </span>
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                    {provider}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {count} papers
                </span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Top Subjects */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Top Subjects by Papers
          </h3>
          <div className="space-y-2">
            {getTopDistributions(stats.subjectDistribution).map(([subject, count], index) => (
              <div key={subject} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400 w-6">
                    #{index + 1}
                  </span>
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                    {subject}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {count} papers
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Insights and Recommendations */}
      {stats.incompleteQuestions > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-900 dark:text-amber-100">
                Attention Required
              </h4>
              <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                {stats.incompleteQuestions} questions need completion before they can be confirmed.
                Common missing fields include hints, explanations, and topic assignments.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}