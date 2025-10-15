// src/components/shared/questions/MarkingSimulationPanel.tsx

import React from 'react';
import { Award, CheckCircle, XCircle, Info, Layers } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { AnswerAlternative, QuestionSubject } from './QuestionViewer';
import { MathematicsAdapter } from './SubjectAdaptation';

interface MarkingSimulationPanelProps {
  subject?: QuestionSubject | string;
  totalMarks: number;
  earnedMarks: number;
  correctAnswers: AnswerAlternative[];
  userAnswer: any;
  workingSteps?: any[];
  showBreakdown?: boolean;
}

export const MarkingSimulationPanel: React.FC<MarkingSimulationPanelProps> = ({
  subject,
  totalMarks,
  earnedMarks,
  correctAnswers,
  userAnswer,
  workingSteps,
  showBreakdown = true
}) => {
  const percentage = totalMarks > 0 ? Math.round((earnedMarks / totalMarks) * 100) : 0;

  // Get subject-specific marking breakdown
  const getMarkingBreakdown = () => {
    if (!subject) return null;

    const subjectLower = subject.toLowerCase();

    // Mathematics M/A/B breakdown
    if (subjectLower.includes('math')) {
      const structure = MathematicsAdapter.analyzeMarkingStructure(totalMarks, workingSteps);
      return {
        type: 'M/A/B',
        methodMarks: structure.methodMarks,
        accuracyMarks: structure.accuracyMarks,
        breakdown: structure.breakdown,
        description: 'Method and Accuracy marking'
      };
    }

    // Default banding for other subjects
    if (totalMarks > 3) {
      return {
        type: 'Banded',
        bands: [
          { range: [totalMarks, totalMarks], label: 'Excellent', description: 'Complete and accurate' },
          { range: [Math.ceil(totalMarks * 0.6), totalMarks - 1], label: 'Good', description: 'Mostly correct with minor errors' },
          { range: [Math.ceil(totalMarks * 0.3), Math.ceil(totalMarks * 0.6) - 1], label: 'Adequate', description: 'Partial understanding shown' },
          { range: [0, Math.ceil(totalMarks * 0.3) - 1], label: 'Limited', description: 'Significant gaps in understanding' }
        ],
        currentBand: earnedMarks >= Math.ceil(totalMarks * 0.6) ? 'Good' :
                      earnedMarks >= Math.ceil(totalMarks * 0.3) ? 'Adequate' : 'Limited'
      };
    }

    return null;
  };

  const markingBreakdown = getMarkingBreakdown();

  // Check for conditional marks (ECF, ORA, OWTTE)
  const getConditionalMarks = () => {
    const conditions: { type: string; description: string; applied: boolean }[] = [];

    correctAnswers.forEach(answer => {
      if (answer.flags?.ecf) {
        conditions.push({
          type: 'ECF',
          description: 'Error Carried Forward - subsequent errors accepted',
          applied: true
        });
      }
      if (answer.flags?.ora) {
        conditions.push({
          type: 'ORA',
          description: 'Or Reverse Argument - alternative logic accepted',
          applied: false
        });
      }
      if (answer.flags?.owtte) {
        conditions.push({
          type: 'OWTTE',
          description: 'Or Words To That Effect - equivalent phrasing accepted',
          applied: false
        });
      }
    });

    return conditions;
  };

  const conditionalMarks = getConditionalMarks();

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Award className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Marking Simulation
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              How marks would be awarded
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {earnedMarks}/{totalMarks}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {percentage}%
          </div>
        </div>
      </div>

      {/* Mathematics M/A/B Breakdown */}
      {markingBreakdown && markingBreakdown.type === 'M/A/B' && showBreakdown && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Method & Accuracy Breakdown
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Method Marks (M):</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {markingBreakdown.methodMarks} marks
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Accuracy Marks (A):</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {markingBreakdown.accuracyMarks} marks
              </span>
            </div>
            <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-600 dark:text-gray-400">Distribution:</span>
                <code className="px-2 py-1 bg-gray-100 dark:bg-gray-900 rounded text-xs font-mono">
                  {markingBreakdown.breakdown}
                </code>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Banded Marking */}
      {markingBreakdown && markingBreakdown.type === 'Banded' && showBreakdown && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Banded Marking
          </h4>
          <div className="space-y-2">
            {markingBreakdown.bands.map((band, index) => {
              const isCurrentBand = band.label === markingBreakdown.currentBand;
              return (
                <div
                  key={index}
                  className={cn(
                    'p-3 rounded-lg border-2 transition-all',
                    isCurrentBand
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 dark:border-blue-600'
                      : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn(
                      'text-sm font-semibold',
                      isCurrentBand ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
                    )}>
                      {band.label}
                    </span>
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full',
                      isCurrentBand
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    )}>
                      {band.range[0]}–{band.range[1]} marks
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {band.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Conditional Marks (ECF, ORA, OWTTE) */}
      {conditionalMarks.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Info className="h-4 w-4" />
            Conditional Marking Rules
          </h4>
          <div className="space-y-2">
            {conditionalMarks.map((condition, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-900"
              >
                {condition.applied ? (
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-4 w-4 text-gray-400 dark:text-gray-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-900 dark:text-white">
                      {condition.type}
                    </span>
                    {condition.applied && (
                      <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">
                        Applied
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {condition.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progressive Marking Logic */}
      {workingSteps && workingSteps.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Progressive Marking
          </h4>
          <div className="space-y-2">
            {workingSteps.map((step, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-2 rounded bg-gray-50 dark:bg-gray-900"
              >
                <span className="text-xs font-mono px-2 py-1 bg-gray-200 dark:bg-gray-800 rounded">
                  Step {index + 1}
                </span>
                <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                  {step.description || 'Working step'}
                </span>
                <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                  {step.marks} mark{step.marks !== 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
