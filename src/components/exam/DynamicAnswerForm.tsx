// src/components/exam/DynamicAnswerForm.tsx
import React, { useState, useEffect } from 'react';
import { AlertCircle, HelpCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DynamicAnswerFormProps {
  answerFormat: string;
  answerRequirement?: string;
  totalAlternatives?: number;
  correctAnswers?: any[];
  value?: string | string[];
  onChange: (value: string | string[]) => void;
  onSubmit?: () => void;
  disabled?: boolean;
  showHint?: boolean;
  hint?: string;
  className?: string;
}

export function DynamicAnswerForm({
  answerFormat,
  answerRequirement,
  totalAlternatives,
  correctAnswers,
  value = '',
  onChange,
  onSubmit,
  disabled = false,
  showHint = false,
  hint,
  className
}: DynamicAnswerFormProps) {
  const [answers, setAnswers] = useState<string[]>([]);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    // Initialize answers based on format
    if (answerFormat === 'two_items' || answerFormat === 'two_items_connected') {
      setAnswers(Array.isArray(value) ? value : ['', '']);
    } else if (answerFormat === 'multi_line' || answerFormat === 'multi_line_labeled') {
      const count = totalAlternatives || 2;
      setAnswers(Array.isArray(value) ? value : Array(count).fill(''));
    } else {
      setAnswers(Array.isArray(value) ? value : [value as string]);
    }
  }, [answerFormat, value, totalAlternatives]);

  const handleSingleChange = (newValue: string) => {
    setTouched(true);
    onChange(newValue);
  };

  const handleMultiChange = (index: number, newValue: string) => {
    setTouched(true);
    const newAnswers = [...answers];
    newAnswers[index] = newValue;
    setAnswers(newAnswers);
    onChange(newAnswers);
  };

  const getPlaceholder = (index: number = 0) => {
    switch (answerFormat) {
      case 'single_word':
        return 'Enter one word...';
      case 'single_line':
        return 'Enter your answer...';
      case 'two_items':
      case 'two_items_connected':
        return index === 0 ? 'First item...' : 'Second item...';
      case 'multi_line':
        return `Answer ${index + 1}...`;
      case 'multi_line_labeled':
        return `Enter answer for ${String.fromCharCode(65 + index)}...`;
      case 'calculation':
        return 'Show your calculation...';
      case 'equation':
        return 'Enter the equation...';
      case 'structural_diagram':
        return 'Describe the structure...';
      default:
        return 'Enter your answer...';
    }
  };

  const getInputType = () => {
    switch (answerFormat) {
      case 'calculation':
      case 'equation':
        return 'textarea';
      default:
        return 'text';
    }
  };

  const renderAnswerInput = () => {
    switch (answerFormat) {
      case 'single_word':
      case 'single_line':
        return (
          <input
            type="text"
            value={value as string}
            onChange={(e) => handleSingleChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSubmit?.()}
            placeholder={getPlaceholder()}
            disabled={disabled}
            className={cn(
              "w-full px-4 py-2 rounded-lg border transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-blue-500",
              disabled 
                ? "bg-gray-100 dark:bg-gray-700 cursor-not-allowed" 
                : "bg-white dark:bg-gray-800 hover:border-gray-400",
              "border-gray-300 dark:border-gray-600",
              "text-gray-900 dark:text-white"
            )}
          />
        );

      case 'two_items':
        return (
          <div className="space-y-3">
            {[0, 1].map((index) => (
              <input
                key={index}
                type="text"
                value={answers[index] || ''}
                onChange={(e) => handleMultiChange(index, e.target.value)}
                placeholder={getPlaceholder(index)}
                disabled={disabled}
                className={cn(
                  "w-full px-4 py-2 rounded-lg border transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500",
                  disabled 
                    ? "bg-gray-100 dark:bg-gray-700 cursor-not-allowed" 
                    : "bg-white dark:bg-gray-800 hover:border-gray-400",
                  "border-gray-300 dark:border-gray-600",
                  "text-gray-900 dark:text-white"
                )}
              />
            ))}
          </div>
        );

      case 'two_items_connected':
        return (
          <div className="flex items-center space-x-3">
            <input
              type="text"
              value={answers[0] || ''}
              onChange={(e) => handleMultiChange(0, e.target.value)}
              placeholder={getPlaceholder(0)}
              disabled={disabled}
              className={cn(
                "flex-1 px-4 py-2 rounded-lg border transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-blue-500",
                disabled 
                  ? "bg-gray-100 dark:bg-gray-700 cursor-not-allowed" 
                  : "bg-white dark:bg-gray-800 hover:border-gray-400",
                "border-gray-300 dark:border-gray-600",
                "text-gray-900 dark:text-white"
              )}
            />
            <span className="text-gray-500 dark:text-gray-400">and</span>
            <input
              type="text"
              value={answers[1] || ''}
              onChange={(e) => handleMultiChange(1, e.target.value)}
              placeholder={getPlaceholder(1)}
              disabled={disabled}
              className={cn(
                "flex-1 px-4 py-2 rounded-lg border transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-blue-500",
                disabled 
                  ? "bg-gray-100 dark:bg-gray-700 cursor-not-allowed" 
                  : "bg-white dark:bg-gray-800 hover:border-gray-400",
                "border-gray-300 dark:border-gray-600",
                "text-gray-900 dark:text-white"
              )}
            />
          </div>
        );

      case 'multi_line':
      case 'multi_line_labeled':
        return (
          <div className="space-y-3">
            {answers.map((answer, index) => (
              <div key={index} className="flex items-start space-x-3">
                {answerFormat === 'multi_line_labeled' && (
                  <span className="mt-2 text-gray-600 dark:text-gray-400 font-medium">
                    {String.fromCharCode(65 + index)}:
                  </span>
                )}
                <input
                  type="text"
                  value={answer || ''}
                  onChange={(e) => handleMultiChange(index, e.target.value)}
                  placeholder={getPlaceholder(index)}
                  disabled={disabled}
                  className={cn(
                    "flex-1 px-4 py-2 rounded-lg border transition-colors",
                    "focus:outline-none focus:ring-2 focus:ring-blue-500",
                    disabled 
                      ? "bg-gray-100 dark:bg-gray-700 cursor-not-allowed" 
                      : "bg-white dark:bg-gray-800 hover:border-gray-400",
                    "border-gray-300 dark:border-gray-600",
                    "text-gray-900 dark:text-white"
                  )}
                />
              </div>
            ))}
          </div>
        );

      case 'calculation':
      case 'equation':
        return (
          <textarea
            value={value as string}
            onChange={(e) => handleSingleChange(e.target.value)}
            placeholder={getPlaceholder()}
            disabled={disabled}
            rows={4}
            className={cn(
              "w-full px-4 py-2 rounded-lg border transition-colors resize-none",
              "focus:outline-none focus:ring-2 focus:ring-blue-500",
              disabled 
                ? "bg-gray-100 dark:bg-gray-700 cursor-not-allowed" 
                : "bg-white dark:bg-gray-800 hover:border-gray-400",
              "border-gray-300 dark:border-gray-600",
              "text-gray-900 dark:text-white font-mono"
            )}
          />
        );

      case 'structural_diagram':
      case 'diagram':
        return (
          <div className="space-y-3">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg p-3">
              <p className="text-sm text-yellow-800 dark:text-yellow-200 flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                Drawing functionality not available. Please describe your answer in words.
              </p>
            </div>
            <textarea
              value={value as string}
              onChange={(e) => handleSingleChange(e.target.value)}
              placeholder="Describe your diagram or structure..."
              disabled={disabled}
              rows={4}
              className={cn(
                "w-full px-4 py-2 rounded-lg border transition-colors resize-none",
                "focus:outline-none focus:ring-2 focus:ring-blue-500",
                disabled 
                  ? "bg-gray-100 dark:bg-gray-700 cursor-not-allowed" 
                  : "bg-white dark:bg-gray-800 hover:border-gray-400",
                "border-gray-300 dark:border-gray-600",
                "text-gray-900 dark:text-white"
              )}
            />
          </div>
        );

      default:
        return (
          <input
            type="text"
            value={value as string}
            onChange={(e) => handleSingleChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSubmit?.()}
            placeholder={getPlaceholder()}
            disabled={disabled}
            className={cn(
              "w-full px-4 py-2 rounded-lg border transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-blue-500",
              disabled 
                ? "bg-gray-100 dark:bg-gray-700 cursor-not-allowed" 
                : "bg-white dark:bg-gray-800 hover:border-gray-400",
              "border-gray-300 dark:border-gray-600",
              "text-gray-900 dark:text-white"
            )}
          />
        );
    }
  };

  const getAnswerRequirementText = () => {
    switch (answerRequirement) {
      case 'any_one_from':
        return `Choose any ONE answer from ${totalAlternatives} options`;
      case 'any_two_from':
        return `Choose any TWO answers from ${totalAlternatives} options`;
      case 'any_three_from':
        return `Choose any THREE answers from ${totalAlternatives} options`;
      case 'both_required':
        return 'Both answers are required';
      case 'all_required':
        return 'All answers must be provided';
      case 'alternative_methods':
        return 'You may use any valid method';
      case 'acceptable_variations':
        return 'Different wordings for the same concept are acceptable';
      default:
        return null;
    }
  };

  const requirementText = getAnswerRequirementText();

  return (
    <div className={cn("space-y-3", className)}>
      {requirementText && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-lg p-3">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            {requirementText}
          </p>
        </div>
      )}

      {showHint && hint && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg p-3">
          <p className="text-sm text-yellow-800 dark:text-yellow-200 flex items-start">
            <HelpCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
            {hint}
          </p>
        </div>
      )}

      {renderAnswerInput()}
    </div>
  );
}