import React from 'react';
import { QuestionSupportSummary } from '../../types';
import { CheckCircle, XCircle } from 'lucide-react';

interface QuestionSupportMatrixProps {
  summary: QuestionSupportSummary;
}

const QuestionSupportMatrix: React.FC<QuestionSupportMatrixProps> = ({ summary }) => {
  if (!summary || typeof summary !== 'object') {
    return null;
  }

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
      <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-3">
        Question Type Support Summary
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        {Object.entries(summary).map(([key, value]) => (
          <div key={key} className="flex items-center gap-2">
            {value ? (
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            ) : (
              <XCircle className="h-4 w-4 text-gray-400" />
            )}
            <span className="text-gray-700 dark:text-gray-300 capitalize">
              {key.replace(/_/g, ' ')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuestionSupportMatrix;
