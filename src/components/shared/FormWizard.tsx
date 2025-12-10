import React, { useState, useCallback, ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Check, X, Loader2 } from 'lucide-react';
import { Button } from './Button';

export interface WizardStep {
  id: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  content: ReactNode;
  validate?: () => boolean | Promise<boolean>;
  optional?: boolean;
}

interface FormWizardProps {
  steps: WizardStep[];
  onComplete: () => void | Promise<void>;
  onCancel: () => void;
  title?: string;
  subtitle?: string;
  isOpen: boolean;
  loading?: boolean;
  completeButtonText?: string;
  showStepNumbers?: boolean;
}

export const FormWizard: React.FC<FormWizardProps> = ({
  steps,
  onComplete,
  onCancel,
  title = 'Create Material',
  subtitle,
  isOpen,
  loading = false,
  completeButtonText = 'Complete',
  showStepNumbers = true
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [validatingStep, setValidatingStep] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const handleNext = useCallback(async () => {
    const step = steps[currentStep];

    if (step.validate) {
      setValidatingStep(true);
      try {
        const isValid = await step.validate();
        if (!isValid) {
          setValidatingStep(false);
          return;
        }
      } catch {
        setValidatingStep(false);
        return;
      }
      setValidatingStep(false);
    }

    setCompletedSteps(prev => new Set([...prev, currentStep]));

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, steps]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleStepClick = useCallback((index: number) => {
    if (index < currentStep || completedSteps.has(index) || steps[index].optional) {
      setCurrentStep(index);
    }
  }, [currentStep, completedSteps, steps]);

  const handleComplete = useCallback(async () => {
    const step = steps[currentStep];

    if (step.validate) {
      setValidatingStep(true);
      try {
        const isValid = await step.validate();
        if (!isValid) {
          setValidatingStep(false);
          return;
        }
      } catch {
        setValidatingStep(false);
        return;
      }
      setValidatingStep(false);
    }

    await onComplete();
  }, [currentStep, steps, onComplete]);

  const handleClose = useCallback(() => {
    setCurrentStep(0);
    setCompletedSteps(new Set());
    onCancel();
  }, [onCancel]);

  if (!isOpen) return null;

  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />

      <div className="absolute inset-4 md:inset-8 lg:inset-12 xl:inset-16 bg-white dark:bg-gray-800 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
            {subtitle && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Close"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Step Indicators */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const isActive = index === currentStep;
              const isCompleted = completedSteps.has(index);
              const isClickable = index < currentStep || isCompleted || step.optional;

              return (
                <React.Fragment key={step.id}>
                  <button
                    onClick={() => handleStepClick(index)}
                    disabled={!isClickable}
                    className={`
                      flex items-center gap-3 px-3 py-2 rounded-lg transition-all
                      ${isClickable ? 'cursor-pointer' : 'cursor-default'}
                      ${isActive
                        ? 'bg-blue-50 dark:bg-blue-900/20'
                        : isClickable
                          ? 'hover:bg-gray-100 dark:hover:bg-gray-700'
                          : ''
                      }
                    `}
                  >
                    <div
                      className={`
                        flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all
                        ${isCompleted
                          ? 'bg-emerald-500 text-white'
                          : isActive
                            ? 'bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-900/50'
                            : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                        }
                      `}
                    >
                      {isCompleted ? (
                        <Check className="h-4 w-4" />
                      ) : showStepNumbers ? (
                        index + 1
                      ) : step.icon ? (
                        step.icon
                      ) : (
                        index + 1
                      )}
                    </div>
                    <div className="hidden sm:block text-left">
                      <p
                        className={`
                          text-sm font-medium
                          ${isActive
                            ? 'text-blue-700 dark:text-blue-300'
                            : isCompleted
                              ? 'text-emerald-700 dark:text-emerald-300'
                              : 'text-gray-600 dark:text-gray-400'
                          }
                        `}
                      >
                        {step.title}
                      </p>
                      {step.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 hidden md:block">
                          {step.description}
                        </p>
                      )}
                    </div>
                  </button>

                  {index < steps.length - 1 && (
                    <div
                      className={`
                        flex-1 h-0.5 mx-2
                        ${completedSteps.has(index)
                          ? 'bg-emerald-500'
                          : 'bg-gray-200 dark:bg-gray-600'
                        }
                      `}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto">
            {steps[currentStep].content}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Step {currentStep + 1} of {steps.length}
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>

            {!isFirstStep && (
              <Button
                variant="secondary"
                onClick={handlePrevious}
                leftIcon={<ChevronLeft className="h-4 w-4" />}
                disabled={loading || validatingStep}
              >
                Previous
              </Button>
            )}

            {isLastStep ? (
              <Button
                onClick={handleComplete}
                disabled={loading || validatingStep}
                leftIcon={loading || validatingStep ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              >
                {loading ? 'Saving...' : completeButtonText}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={validatingStep}
                rightIcon={validatingStep ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
              >
                {validatingStep ? 'Validating...' : 'Next'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormWizard;
