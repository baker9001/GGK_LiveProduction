import React from 'react';
import { Hash, FileText, BookOpen, Calculator, CheckCircle, AlertCircle } from 'lucide-react';

interface QuestionSupportSummary {
  totalQuestions: number;
  mcqCount: number;
  descriptiveCount: number;
  multiPartCount: number;
  withFigures: number;
  withAttachments: number;
  manualMarkingRequired: number;
  averageMarks: number;
}

interface QuestionSupportMatrixProps {
  summary: QuestionSupportSummary;
}

const QuestionSupportMatrix: React.FC<QuestionSupportMatrixProps> = ({ summary }) => {
  if (!summary || summary.totalQuestions === 0) {
    return null;
  }

  const stats = [
    { label: 'Total Questions', value: summary.totalQuestions, icon: Hash, color: 'blue' },
    { label: 'MCQ', value: summary.mcqCount, icon: CheckCircle, color: 'green' },
    { label: 'Descriptive', value: summary.descriptiveCount, icon: FileText, color: 'purple' },
    { label: 'Multi-part', value: summary.multiPartCount, icon: BookOpen, color: 'indigo' },
    { label: 'With Figures', value: summary.withFigures, icon: AlertCircle, color: 'orange' },
    { label: 'Avg Marks', value: summary.averageMarks.toFixed(1), icon: Calculator, color: 'teal' }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        Question Analysis
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="text-center">
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full bg-${stat.color}-100 dark:bg-${stat.color}-900/30 mb-2`}>
                <Icon className={`h-6 w-6 text-${stat.color}-600 dark:text-${stat.color}-400`} />
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stat.value}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {stat.label}
              </div>
            </div>
          );
        })}
      </div>

      {summary.manualMarkingRequired > 0 && (
        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <AlertCircle className="h-4 w-4 inline mr-1" />
            {summary.manualMarkingRequired} question{summary.manualMarkingRequired !== 1 ? 's' : ''} require manual marking
          </p>
        </div>
      )}
    </div>
  );
};

export default QuestionSupportMatrix;
