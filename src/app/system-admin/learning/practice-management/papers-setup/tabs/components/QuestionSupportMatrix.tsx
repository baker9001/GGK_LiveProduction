import React from 'react';
import { BarChart3, CheckCircle } from 'lucide-react';

interface QuestionSupportSummary {
  totalQuestions: number;
  questionTypeCounts: Record<string, number>;
  answerFormatCounts: Record<string, number>;
  answerRequirementCounts: Record<string, number>;
  optionTypeCounts: Record<string, number>;
  contextTypes: Record<string, number>;
  structureFlags: {
    hasParts: boolean;
    hasSubparts: boolean;
    hasFigures: boolean;
    hasAttachments: boolean;
    hasContext: boolean;
    hasHints: boolean;
    hasExplanations: boolean;
    hasOptions: boolean;
    hasMatching: boolean;
    hasSequencing: boolean;
  };
  logicFlags: {
    alternativeLinking: boolean;
    allRequired: boolean;
    anyOf: boolean;
    alternativeMethods: boolean;
    contextUsage: boolean;
    multiMark: boolean;
    componentMarking: boolean;
    manualMarking: boolean;
    partialCredit: boolean;
    errorCarriedForward: boolean;
    reverseArgument: boolean;
    acceptsEquivalentPhrasing: boolean;
  };
}

interface QuestionSupportMatrixProps {
  summary: QuestionSupportSummary;
}

export default function QuestionSupportMatrix({ summary }: QuestionSupportMatrixProps) {
  const renderCount = (label: string, count: number) => (
    <div className="flex justify-between items-center py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded">
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      <span className="text-sm font-medium text-gray-900 dark:text-white">{count}</span>
    </div>
  );

  const renderFlag = (label: string, value: boolean) => (
    <div className="flex justify-between items-center py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded">
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      {value ? (
        <CheckCircle className="h-4 w-4 text-green-600" />
      ) : (
        <span className="text-xs text-gray-400">-</span>
      )}
    </div>
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Question Support Matrix
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Question Types
          </h4>
          <div className="space-y-2">
            {Object.entries(summary.questionTypeCounts).map(([type, count]) => (
              <div key={type}>{renderCount(type, count)}</div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Structure Features
          </h4>
          <div className="space-y-2">
            {renderFlag('Has Parts', summary.structureFlags.hasParts)}
            {renderFlag('Has Subparts', summary.structureFlags.hasSubparts)}
            {renderFlag('Has Figures', summary.structureFlags.hasFigures)}
            {renderFlag('Has Attachments', summary.structureFlags.hasAttachments)}
            {renderFlag('Has Context', summary.structureFlags.hasContext)}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Logic Features
          </h4>
          <div className="space-y-2">
            {renderFlag('Alternative Linking', summary.logicFlags.alternativeLinking)}
            {renderFlag('Multi-Mark', summary.logicFlags.multiMark)}
            {renderFlag('Partial Credit', summary.logicFlags.partialCredit)}
            {renderFlag('Manual Marking', summary.logicFlags.manualMarking)}
            {renderFlag('Error Carried Forward', summary.logicFlags.errorCarriedForward)}
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Total Questions: <span className="font-medium text-gray-900 dark:text-white">{summary.totalQuestions}</span>
        </p>
      </div>
    </div>
  );
}
