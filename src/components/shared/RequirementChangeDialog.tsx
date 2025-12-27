// src/components/shared/RequirementChangeDialog.tsx

import React, { useState, useEffect } from 'react';
import { AlertTriangle, ArrowRight, Info, CheckCircle2, Plus, AlertCircle } from 'lucide-react';
import Button from './Button';
import { cn } from '@/lib/utils';
import { CompatibilityCheck } from '../../services/answerFieldMigrationService';

interface CorrectAnswer {
  answer: string;
  marks?: number;
  alternative_id?: number;
  acceptable_variations?: string[]; // Array of acceptable answer variations
  [key: string]: unknown;
}

interface RequirementChangeDialogProps {
  isOpen: boolean;
  oldRequirement: string | null;
  newRequirement: string | null;
  compatibility: CompatibilityCheck;
  currentAnswers: CorrectAnswer[];
  onConfirm: (selectedAnswers: CorrectAnswer[]) => void;
  onCancel: () => void;
}

export function RequirementChangeDialog({
  isOpen,
  oldRequirement,
  newRequirement,
  compatibility,
  currentAnswers,
  onConfirm,
  onCancel
}: RequirementChangeDialogProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<Set<number>>(new Set());
  const [needsMoreAnswers, setNeedsMoreAnswers] = useState(false);
  const [requiredCount, setRequiredCount] = useState(1);

  useEffect(() => {
    if (!newRequirement) return;

    const counts: Record<string, number> = {
      'any_two_from': 2,
      'any_three_from': 3,
      'both_required': 2,
      'all_required': currentAnswers.length
    };

    const required = counts[newRequirement] || 1;
    setRequiredCount(required);
    setNeedsMoreAnswers(currentAnswers.length < required);

    if (currentAnswers.length <= required) {
      setSelectedAnswers(new Set(currentAnswers.map((_, idx) => idx)));
    }
  }, [newRequirement, currentAnswers]);

  if (!isOpen) return null;

  const requirementDisplay = (req: string | null) => {
    if (!req) return 'None';
    return req.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const toggleAnswer = (index: number) => {
    const newSelected = new Set(selectedAnswers);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedAnswers(newSelected);
  };

  const handleConfirm = () => {
    if (needsMoreAnswers) {
      onCancel();
      return;
    }

    if (selectedAnswers.size === 0) {
      return;
    }

    const selected = currentAnswers.filter((_, idx) => selectedAnswers.has(idx));
    onConfirm(selected);
  };

  const canConfirm = !needsMoreAnswers && selectedAnswers.size >= requiredCount;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start gap-4 mb-6">
            <div className={cn(
              "p-3 rounded-lg",
              compatibility.isCompatible ? 'bg-blue-100 dark:bg-blue-900' : 'bg-yellow-100 dark:bg-yellow-900'
            )}>
              {compatibility.isCompatible ? (
                <Info className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Answer Requirement Change
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                The answer requirement has changed and may affect how answers are evaluated.
              </p>
            </div>
          </div>

          {/* Requirement Comparison */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Current Requirement
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {requirementDisplay(oldRequirement)}
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 mx-4 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                  New Requirement
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {requirementDisplay(newRequirement)}
                </p>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                <span className="font-medium">{currentAnswers.length}</span> current answer{currentAnswers.length !== 1 ? 's' : ''}
                {requiredCount > 1 && (
                  <span> • <span className="font-medium">{requiredCount}</span> required</span>
                )}
              </p>
            </div>
          </div>

          {/* Warnings */}
          {compatibility.warnings.length > 0 && (
            <div className="mb-6">
              <div className="flex items-start gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-blue-900 dark:text-blue-200 mb-1">
                    Important Information:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-blue-800 dark:text-blue-300">
                    {compatibility.warnings.map((warning, idx) => (
                      <li key={idx}>{warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Need More Answers Warning */}
          {needsMoreAnswers ? (
            <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-start gap-3">
                <Plus className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-900 dark:text-yellow-200 mb-1">
                    More Answers Required
                  </p>
                  <p className="text-sm text-yellow-800 dark:text-yellow-300 mb-2">
                    The requirement '{requirementDisplay(newRequirement)}' needs at least {requiredCount} answers,
                    but you currently have {currentAnswers.length}.
                  </p>
                  <p className="text-sm text-yellow-800 dark:text-yellow-300">
                    Please add {requiredCount - currentAnswers.length} more answer{requiredCount - currentAnswers.length !== 1 ? 's' : ''} before
                    using this requirement.
                  </p>
                </div>
              </div>
            </div>
          ) : currentAnswers.length > requiredCount ? (
            <>
              {/* Answer Selection */}
              <div className="mb-6">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  {requiredCount === 1
                    ? 'Select which answer to keep:'
                    : `Select ${requiredCount} answer${requiredCount !== 1 ? 's' : ''} to keep:`
                  }
                </p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {currentAnswers.map((answer, idx) => (
                    <button
                      key={idx}
                      onClick={() => toggleAnswer(idx)}
                      className={cn(
                        "w-full text-left p-3 rounded-lg border-2 transition-all",
                        selectedAnswers.has(idx)
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5",
                          selectedAnswers.has(idx)
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300 dark:border-gray-600'
                        )}>
                          {selectedAnswers.has(idx) && (
                            <CheckCircle2 className="h-4 w-4 text-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {answer.answer || 'Empty answer'}
                          </p>
                          {answer.marks && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {answer.marks} mark{answer.marks !== 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {selectedAnswers.size < requiredCount && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                    Select {requiredCount - selectedAnswers.size} more answer{requiredCount - selectedAnswers.size !== 1 ? 's' : ''}
                  </p>
                )}
              </div>

              {/* Data Loss Warning */}
              {currentAnswers.length - selectedAnswers.size > 0 && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-900 dark:text-red-200 mb-1">
                        Data Loss Warning
                      </p>
                      <p className="text-sm text-red-800 dark:text-red-300">
                        {currentAnswers.length - selectedAnswers.size} unselected answer{currentAnswers.length - selectedAnswers.size !== 1 ? 's' : ''} will be removed.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : null}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={onCancel}
            >
              {needsMoreAnswers ? 'Close' : 'Cancel Change'}
            </Button>
            {!needsMoreAnswers && (
              <Button
                variant="primary"
                onClick={handleConfirm}
                disabled={!canConfirm}
              >
                Confirm Change
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
