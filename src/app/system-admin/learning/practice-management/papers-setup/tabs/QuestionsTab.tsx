import React from 'react';
import { AlertCircle } from 'lucide-react';

interface QuestionsTabProps {
  importSession: any;
  parsedData: any;
  onComplete: () => void;
  onPrevious: () => void;
  extractionRules: any;
  stagedAttachments: any;
  onStagedAttachmentsChange: (attachments: any) => void;
}

export const QuestionsTab: React.FC<QuestionsTabProps> = ({
  importSession,
  parsedData,
  onComplete,
  onPrevious,
  extractionRules,
  stagedAttachments,
  onStagedAttachmentsChange
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Questions Tab - Under Development
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          This tab is currently being implemented. Please check back later.
        </p>
      </div>
    </div>
  );
};
