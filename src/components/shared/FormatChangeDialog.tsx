// src/components/shared/FormatChangeDialog.tsx

import React, { useState } from 'react';
import { AlertTriangle, ArrowRight, Info, Shield, RefreshCw, Trash2, CheckCircle2 } from 'lucide-react';
import Button from './Button';
import { cn } from '@/lib/utils';
import { MigrationStrategy, CompatibilityCheck } from '../../services/answerFieldMigrationService';

interface FormatChangeDialogProps {
  isOpen: boolean;
  oldFormat: string | null;
  newFormat: string | null;
  compatibility: CompatibilityCheck;
  currentAnswerCount: number;
  onConfirm: (strategy: MigrationStrategy) => void;
  onCancel: () => void;
}

export function FormatChangeDialog({
  isOpen,
  oldFormat,
  newFormat,
  compatibility,
  currentAnswerCount,
  onConfirm,
  onCancel
}: FormatChangeDialogProps) {
  const [selectedStrategy, setSelectedStrategy] = useState<MigrationStrategy>(
    compatibility.suggestedStrategy
  );

  if (!isOpen) return null;

  const formatDisplay = (format: string | null) => {
    if (!format) return 'None';
    return format.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const strategies = [
    {
      value: 'preserve' as MigrationStrategy,
      label: 'Preserve Existing Data',
      description: 'Keep current answers and adapt them to the new format',
      icon: Shield,
      color: 'blue',
      recommended: compatibility.suggestedStrategy === 'preserve'
    },
    {
      value: 'extract' as MigrationStrategy,
      label: 'Extract Main Answer',
      description: 'Extract the primary answer from current data',
      icon: RefreshCw,
      color: 'yellow',
      recommended: compatibility.suggestedStrategy === 'extract'
    },
    {
      value: 'reset' as MigrationStrategy,
      label: 'Start Fresh',
      description: 'Clear all answers and create new ones for the format',
      icon: Trash2,
      color: 'red',
      recommended: compatibility.suggestedStrategy === 'reset'
    }
  ];

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
                Format Change Detected
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Changing the answer format may affect how existing answers are structured.
              </p>
            </div>
          </div>

          {/* Format Comparison */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Current Format
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatDisplay(oldFormat)}
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 mx-4 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                  New Format
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatDisplay(newFormat)}
                </p>
              </div>
            </div>

            {currentAnswerCount > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  <span className="font-medium">{currentAnswerCount}</span> existing answer{currentAnswerCount !== 1 ? 's' : ''} will be affected
                </p>
              </div>
            )}
          </div>

          {/* Warnings */}
          {compatibility.warnings.length > 0 && (
            <div className="mb-6">
              <div className="flex items-start gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-yellow-900 dark:text-yellow-200 mb-1">
                    Important Considerations:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-yellow-800 dark:text-yellow-300">
                    {compatibility.warnings.map((warning, idx) => (
                      <li key={idx}>{warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Strategy Selection */}
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              How would you like to handle the existing answers?
            </p>
            <div className="space-y-3">
              {strategies.map(strategy => (
                <button
                  key={strategy.value}
                  onClick={() => setSelectedStrategy(strategy.value)}
                  className={cn(
                    "w-full text-left p-4 rounded-lg border-2 transition-all",
                    selectedStrategy === strategy.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "p-2 rounded-lg flex-shrink-0",
                      selectedStrategy === strategy.value
                        ? 'bg-blue-100 dark:bg-blue-800'
                        : 'bg-gray-100 dark:bg-gray-700'
                    )}>
                      <strategy.icon className={cn(
                        "h-5 w-5",
                        selectedStrategy === strategy.value
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-gray-600 dark:text-gray-400'
                      )} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn(
                          "font-medium",
                          selectedStrategy === strategy.value
                            ? 'text-blue-900 dark:text-blue-200'
                            : 'text-gray-900 dark:text-white'
                        )}>
                          {strategy.label}
                        </span>
                        {strategy.recommended && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded">
                            Recommended
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {strategy.description}
                      </p>
                    </div>
                    {selectedStrategy === strategy.value && (
                      <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Data Loss Warning for Reset */}
          {selectedStrategy === 'reset' && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-900 dark:text-red-200 mb-1">
                    Data Loss Warning
                  </p>
                  <p className="text-sm text-red-800 dark:text-red-300">
                    All {currentAnswerCount} existing answer{currentAnswerCount !== 1 ? 's' : ''} will be permanently deleted. This action cannot be undone after confirmation.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={onCancel}
            >
              Cancel Change
            </Button>
            <Button
              variant="primary"
              onClick={() => onConfirm(selectedStrategy)}
            >
              Confirm Migration
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
