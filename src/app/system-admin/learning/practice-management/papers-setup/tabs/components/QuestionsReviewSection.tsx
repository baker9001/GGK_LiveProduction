import React from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';

interface QuestionsReviewSectionProps {
  questions: any[];
  mappings: Record<string, any>;
  attachments: Record<string, any[]>;
  validationErrors: Record<string, string[]>;
  onQuestionUpdate?: (questionId: string, updates: any) => void;
}

export function QuestionsReviewSection({
  questions,
  mappings,
  attachments,
  validationErrors
}: QuestionsReviewSectionProps) {
  const validCount = questions.filter(q => !validationErrors[q.id]?.length).length;
  const errorCount = questions.filter(q => validationErrors[q.id]?.length).length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Questions Review
        </h3>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span>{validCount} Valid</span>
          </div>
          {errorCount > 0 && (
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span>{errorCount} Issues</span>
            </div>
          )}
        </div>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Review and validate all questions before importing.
      </p>
    </div>
  );
}
