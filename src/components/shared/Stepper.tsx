/**
 * Stepper Component - GGK Design System
 *
 * A horizontal stepper component for multi-step wizards and processes.
 * Shows current step, completed steps, and upcoming steps with icons.
 */

import React from 'react';
import { cn } from '../../lib/utils';
import { Check, Circle } from 'lucide-react';

export interface Step {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
  className?: string;
  onStepClick?: (stepIndex: number) => void;
  allowClickPrevious?: boolean;
}

export function Stepper({
  steps,
  currentStep,
  className,
  onStepClick,
  allowClickPrevious = true,
}: StepperProps) {
  const handleStepClick = (index: number) => {
    if (!onStepClick) return;
    if (allowClickPrevious && index < currentStep) {
      onStepClick(index);
    }
  };

  return (
    <div className={cn('w-full', className)}>
      <nav aria-label="Progress">
        <ol className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;
            const isUpcoming = index > currentStep;
            const isClickable = allowClickPrevious && isCompleted && onStepClick;

            return (
              <li
                key={step.id}
                className={cn(
                  'relative flex-1',
                  index < steps.length - 1 && 'pr-8'
                )}
              >
                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div
                    className="absolute top-5 left-0 right-0 h-0.5 -ml-4 mr-4"
                    aria-hidden="true"
                  >
                    <div
                      className={cn(
                        'h-full transition-all duration-slow',
                        isCompleted
                          ? 'bg-ggk-primary-500'
                          : 'bg-ggk-neutral-200 dark:bg-ggk-neutral-700'
                      )}
                    />
                  </div>
                )}

                {/* Step Content */}
                <button
                  type="button"
                  onClick={() => handleStepClick(index)}
                  disabled={!isClickable}
                  className={cn(
                    'relative flex flex-col items-center group',
                    isClickable && 'cursor-pointer',
                    !isClickable && 'cursor-default'
                  )}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {/* Step Circle/Icon */}
                  <div
                    className={cn(
                      'flex items-center justify-center w-10 h-10 rounded-full transition-all duration-base',
                      isCompleted && [
                        'bg-ggk-primary-500 text-white ring-4 ring-ggk-primary-100 dark:ring-ggk-primary-900',
                        isClickable && 'group-hover:bg-ggk-primary-600 group-hover:ring-ggk-primary-200'
                      ],
                      isCurrent && [
                        'bg-white dark:bg-ggk-neutral-800 text-ggk-primary-600 dark:text-ggk-primary-400',
                        'ring-4 ring-ggk-primary-500 border-2 border-ggk-primary-500',
                        'shadow-ggk-md'
                      ],
                      isUpcoming && [
                        'bg-white dark:bg-ggk-neutral-800 text-ggk-neutral-400',
                        'ring-2 ring-ggk-neutral-300 dark:ring-ggk-neutral-700'
                      ]
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-5 w-5" aria-hidden="true" />
                    ) : step.icon ? (
                      <span className="h-5 w-5" aria-hidden="true">
                        {step.icon}
                      </span>
                    ) : (
                      <Circle
                        className={cn(
                          'h-2.5 w-2.5',
                          isCurrent && 'fill-current'
                        )}
                        aria-hidden="true"
                      />
                    )}
                  </div>

                  {/* Step Label */}
                  <div className="mt-8 text-center max-w-[120px]">
                    <span
                      className={cn(
                        'block text-sm font-medium transition-colors duration-base',
                        isCompleted && 'text-ggk-primary-700 dark:text-ggk-primary-400',
                        isCurrent && 'text-ggk-neutral-900 dark:text-ggk-neutral-50 font-semibold',
                        isUpcoming && 'text-ggk-neutral-500 dark:text-ggk-neutral-400',
                        isClickable && 'group-hover:text-ggk-primary-600 dark:group-hover:text-ggk-primary-300'
                      )}
                    >
                      {step.label}
                    </span>
                    {step.description && (
                      <span
                        className={cn(
                          'block mt-4 text-xs transition-colors duration-base',
                          isCompleted && 'text-ggk-neutral-600 dark:text-ggk-neutral-400',
                          isCurrent && 'text-ggk-neutral-600 dark:text-ggk-neutral-300',
                          isUpcoming && 'text-ggk-neutral-400 dark:text-ggk-neutral-500'
                        )}
                      >
                        {step.description}
                      </span>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}

// Compact vertical variant for sidebars
interface VerticalStepperProps extends StepperProps {
  variant?: 'default' | 'compact';
}

export function VerticalStepper({
  steps,
  currentStep,
  className,
  onStepClick,
  allowClickPrevious = true,
  variant = 'default',
}: VerticalStepperProps) {
  const handleStepClick = (index: number) => {
    if (!onStepClick) return;
    if (allowClickPrevious && index < currentStep) {
      onStepClick(index);
    }
  };

  return (
    <div className={cn('w-full', className)}>
      <nav aria-label="Progress">
        <ol className="space-y-16">
          {steps.map((step, index) => {
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;
            const isUpcoming = index > currentStep;
            const isClickable = allowClickPrevious && isCompleted && onStepClick;

            return (
              <li key={step.id} className="relative">
                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div
                    className="absolute top-10 left-5 w-0.5 h-full"
                    aria-hidden="true"
                  >
                    <div
                      className={cn(
                        'w-full transition-all duration-slow',
                        isCompleted
                          ? 'bg-ggk-primary-500'
                          : 'bg-ggk-neutral-200 dark:bg-ggk-neutral-700'
                      )}
                      style={{ height: 'calc(100% + 1rem)' }}
                    />
                  </div>
                )}

                {/* Step Content */}
                <button
                  type="button"
                  onClick={() => handleStepClick(index)}
                  disabled={!isClickable}
                  className={cn(
                    'relative flex items-start gap-12 group w-full text-left',
                    isClickable && 'cursor-pointer',
                    !isClickable && 'cursor-default'
                  )}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {/* Step Circle/Icon */}
                  <div
                    className={cn(
                      'flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full transition-all duration-base',
                      isCompleted && [
                        'bg-ggk-primary-500 text-white ring-4 ring-ggk-primary-100 dark:ring-ggk-primary-900',
                        isClickable && 'group-hover:bg-ggk-primary-600'
                      ],
                      isCurrent && [
                        'bg-white dark:bg-ggk-neutral-800 text-ggk-primary-600',
                        'ring-4 ring-ggk-primary-500 border-2 border-ggk-primary-500',
                        'shadow-ggk-md'
                      ],
                      isUpcoming && [
                        'bg-white dark:bg-ggk-neutral-800 text-ggk-neutral-400',
                        'ring-2 ring-ggk-neutral-300 dark:ring-ggk-neutral-700'
                      ]
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-5 w-5" />
                    ) : step.icon ? (
                      <span className="h-5 w-5">{step.icon}</span>
                    ) : (
                      <span className="text-sm font-semibold">{index + 1}</span>
                    )}
                  </div>

                  {/* Step Label & Description */}
                  <div className="flex-1 min-w-0 pt-4">
                    <span
                      className={cn(
                        'block font-medium transition-colors duration-base',
                        variant === 'compact' ? 'text-sm' : 'text-base',
                        isCompleted && 'text-ggk-primary-700 dark:text-ggk-primary-400',
                        isCurrent && 'text-ggk-neutral-900 dark:text-ggk-neutral-50 font-semibold',
                        isUpcoming && 'text-ggk-neutral-500 dark:text-ggk-neutral-400'
                      )}
                    >
                      {step.label}
                    </span>
                    {step.description && variant !== 'compact' && (
                      <span
                        className={cn(
                          'block mt-4 text-sm',
                          isCompleted && 'text-ggk-neutral-600 dark:text-ggk-neutral-400',
                          isCurrent && 'text-ggk-neutral-600 dark:text-ggk-neutral-300',
                          isUpcoming && 'text-ggk-neutral-400 dark:text-ggk-neutral-500'
                        )}
                      >
                        {step.description}
                      </span>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
