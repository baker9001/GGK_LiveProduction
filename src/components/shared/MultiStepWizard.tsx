'use client';

import React, { useState, ReactNode } from 'react';
import { Check, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';
import { Button } from './Button';

export interface WizardStep {
  id: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  isOptional?: boolean;
  estimatedMinutes?: number;
}

export interface MultiStepWizardProps {
  steps: WizardStep[];
  currentStep: number;
  onStepChange: (stepIndex: number) => void;
  onComplete: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  canGoNext?: boolean;
  canGoPrevious?: boolean;
  completedSteps?: Set<number>;
  className?: string;
  children: ReactNode;
  showStepContent?: boolean;
  autoSave?: boolean;
  lastSavedAt?: Date | null;
}

export function MultiStepWizard({
  steps,
  currentStep,
  onStepChange,
  onComplete,
  onCancel,
  isSubmitting = false,
  canGoNext = true,
  canGoPrevious = true,
  completedSteps = new Set(),
  className = '',
  children,
  showStepContent = true,
  autoSave = false,
  lastSavedAt = null,
}: MultiStepWizardProps) {
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;
  const currentStepData = steps[currentStep];
  const totalEstimatedTime = steps.reduce((sum, step) => sum + (step.estimatedMinutes || 0), 0);
  const completionPercentage = Math.round(((completedSteps.size + 1) / steps.length) * 100);

  const handleNext = () => {
    if (!canGoNext || isLastStep) return;
    onStepChange(currentStep + 1);
  };

  const handlePrevious = () => {
    if (!canGoPrevious || isFirstStep) return;
    onStepChange(currentStep - 1);
  };

  const handleStepClick = (stepIndex: number) => {
    if (stepIndex < currentStep || completedSteps.has(stepIndex)) {
      onStepChange(stepIndex);
    }
  };

  const getStepStatus = (stepIndex: number): 'completed' | 'current' | 'upcoming' | 'locked' => {
    if (completedSteps.has(stepIndex)) return 'completed';
    if (stepIndex === currentStep) return 'current';
    if (stepIndex < currentStep) return 'upcoming';
    return 'locked';
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header with progress */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {currentStepData?.title}
            </h2>
            {currentStepData?.isOptional && (
              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                Optional
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onCancel}
            aria-label="Close wizard"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {currentStepData?.description && (
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            {currentStepData.description}
          </p>
        )}

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>
              Step {currentStep + 1} of {steps.length}
            </span>
            <div className="flex items-center gap-3">
              {totalEstimatedTime > 0 && (
                <span>Est. time: {totalEstimatedTime} min</span>
              )}
              {autoSave && lastSavedAt && (
                <span className="text-[#8CC63F]">
                  Saved {new Date(lastSavedAt).toLocaleTimeString()}
                </span>
              )}
              <span className="font-medium text-gray-700 dark:text-gray-200">
                {completionPercentage}% complete
              </span>
            </div>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#8CC63F] to-[#7AB635] transition-all duration-300 ease-out"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Step indicators */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 px-6 py-3 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          {steps.map((step, index) => {
            const status = getStepStatus(index);
            const isClickable = index < currentStep || completedSteps.has(index);

            return (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => isClickable && handleStepClick(index)}
                  disabled={!isClickable}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded-lg transition-all
                    ${status === 'current' ? 'bg-[#8CC63F]/10 border-2 border-[#8CC63F]' : ''}
                    ${status === 'completed' ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : ''}
                    ${status === 'upcoming' || status === 'locked' ? 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700' : ''}
                    ${isClickable ? 'cursor-pointer hover:shadow-md' : 'cursor-not-allowed opacity-60'}
                  `}
                  title={step.description}
                >
                  <div className={`
                    flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium
                    ${status === 'current' ? 'bg-[#8CC63F] text-white' : ''}
                    ${status === 'completed' ? 'bg-green-500 text-white' : ''}
                    ${status === 'upcoming' || status === 'locked' ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400' : ''}
                  `}>
                    {status === 'completed' ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </div>
                  <span className={`
                    text-sm font-medium whitespace-nowrap
                    ${status === 'current' ? 'text-[#8CC63F]' : ''}
                    ${status === 'completed' ? 'text-green-700 dark:text-green-400' : ''}
                    ${status === 'upcoming' || status === 'locked' ? 'text-gray-600 dark:text-gray-400' : ''}
                  `}>
                    {step.title}
                  </span>
                  {step.estimatedMinutes && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {step.estimatedMinutes}m
                    </span>
                  )}
                </button>
                {index < steps.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-600 flex-shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {showStepContent && (
          <div className="max-w-4xl mx-auto">
            {children}
          </div>
        )}
      </div>

      {/* Footer with navigation */}
      <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={isFirstStep || !canGoPrevious || isSubmitting}
            leftIcon={<ChevronLeft className="w-4 h-4" />}
          >
            Previous
          </Button>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            {!isLastStep ? (
              <Button
                onClick={handleNext}
                disabled={!canGoNext || isSubmitting}
                rightIcon={<ChevronRight className="w-4 h-4" />}
              >
                Next Step
              </Button>
            ) : (
              <Button
                onClick={onComplete}
                disabled={!canGoNext || isSubmitting}
                leftIcon={isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              >
                {isSubmitting ? 'Creating...' : 'Create Mock Exam'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
