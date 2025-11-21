/**
 * Enhanced Answer Format and Requirement Selector
 *
 * Provides an improved UI for selecting answer formats and requirements
 * with real-time compatibility validation, visual aids, and helpful guidance.
 */

import React, { useMemo } from 'react';
import { AlertCircle, CheckCircle2, AlertTriangle, Info, HelpCircle } from 'lucide-react';
import {
  checkCompatibility,
  getCompatibleRequirements,
  getFormatIcon,
  getRequirementIcon,
  validateQuestionSetup,
  type CompatibilityResult
} from '../../lib/validation/formatRequirementCompatibility';
import {
  ANSWER_FORMAT_OPTIONS,
  ANSWER_REQUIREMENT_OPTIONS,
  type SelectOption
} from '../../lib/constants/answerOptions';
import { cn } from '../../lib/utils';
import { Tooltip } from './Tooltip';

interface EnhancedAnswerFormatSelectorProps {
  answerFormat: string | null | undefined;
  answerRequirement: string | null | undefined;
  onFormatChange: (format: string) => void;
  onRequirementChange: (requirement: string) => void;
  questionType?: string;
  correctAnswersCount?: number;
  showValidation?: boolean;
  disabled?: boolean;
  className?: string;
}

const EnhancedAnswerFormatSelector: React.FC<EnhancedAnswerFormatSelectorProps> = ({
  answerFormat,
  answerRequirement,
  onFormatChange,
  onRequirementChange,
  questionType = 'descriptive',
  correctAnswersCount = 0,
  showValidation = true,
  disabled = false,
  className
}) => {
  // Check compatibility between current selections
  const compatibility: CompatibilityResult = useMemo(() => {
    return checkCompatibility(answerFormat, answerRequirement);
  }, [answerFormat, answerRequirement]);

  // Get compatible requirements for selected format
  const compatibleRequirements = useMemo(() => {
    return getCompatibleRequirements(answerFormat);
  }, [answerFormat]);

  // Filter requirement options to highlight compatible ones
  const enhancedRequirementOptions = useMemo(() => {
    return ANSWER_REQUIREMENT_OPTIONS.map(option => ({
      ...option,
      isCompatible: compatibleRequirements.includes(option.value),
      isSelected: option.value === answerRequirement
    }));
  }, [compatibleRequirements, answerRequirement]);

  // Validate overall question setup
  const validation = useMemo(() => {
    if (!showValidation) return null;

    return validateQuestionSetup({
      type: questionType,
      answer_format: answerFormat,
      answer_requirement: answerRequirement,
      correct_answers: Array(correctAnswersCount).fill({ answer: 'test' })
    });
  }, [showValidation, questionType, answerFormat, answerRequirement, correctAnswersCount]);

  // Render compatibility indicator
  const renderCompatibilityIndicator = () => {
    if (!answerFormat || !answerRequirement) return null;

    switch (compatibility.level) {
      case 'compatible':
        return (
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-green-800 dark:text-green-300">
                Compatible Combination
              </p>
              <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
                This format and requirement work well together for IGCSE questions
              </p>
            </div>
          </div>
        );

      case 'suboptimal':
        return (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                Suboptimal Combination
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-0.5">
                {compatibility.message}
              </p>
              {compatibility.recommendation && (
                <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-1 italic">
                  💡 {compatibility.recommendation}
                </p>
              )}
            </div>
          </div>
        );

      case 'incompatible':
        return (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-300">
                Incompatible Combination
              </p>
              <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">
                {compatibility.message}
              </p>
              {compatibility.recommendation && (
                <p className="text-xs text-red-600 dark:text-red-500 mt-1 font-medium">
                  ✓ {compatibility.recommendation}
                </p>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Render validation messages
  const renderValidation = () => {
    if (!validation || (!validation.errors.length && !validation.warnings.length)) {
      return null;
    }

    return (
      <div className="space-y-2">
        {validation.errors.map((error, index) => (
          <div
            key={`error-${index}`}
            className="flex items-start gap-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md"
          >
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
          </div>
        ))}
        {validation.warnings.map((warning, index) => (
          <div
            key={`warning-${index}`}
            className="flex items-start gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md"
          >
            <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-700 dark:text-yellow-300">{warning}</p>
          </div>
        ))}
        {validation.recommendations.length > 0 && (
          <div className="flex items-start gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-700 dark:text-blue-300">
              <p className="font-medium mb-1">Recommendations:</p>
              <ul className="list-disc list-inside space-y-0.5">
                {validation.recommendations.map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Answer Format Selector */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Answer Format
          </label>
          <Tooltip content="The format determines how students will input their answer">
            <HelpCircle className="w-4 h-4 text-gray-400" />
          </Tooltip>
        </div>

        <select
          value={answerFormat || ''}
          onChange={(e) => onFormatChange(e.target.value)}
          disabled={disabled}
          className={cn(
            'w-full px-3 py-2 border rounded-lg',
            'focus:outline-none focus:ring-2 focus:ring-[#8CC63F] focus:border-[#8CC63F]',
            'bg-white dark:bg-gray-800',
            'text-gray-900 dark:text-gray-100',
            disabled && 'opacity-60 cursor-not-allowed'
          )}
        >
          <option value="">Select answer format...</option>
          {ANSWER_FORMAT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {getFormatIcon(option.value)} {option.label}
            </option>
          ))}
        </select>

        {answerFormat && (
          <div className="p-2 bg-gray-50 dark:bg-gray-900 rounded-md">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {ANSWER_FORMAT_OPTIONS.find(opt => opt.value === answerFormat)?.description}
            </p>
          </div>
        )}
      </div>

      {/* Answer Requirement Selector */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Answer Requirement
          </label>
          <Tooltip content="The requirement defines what students must provide to earn full marks">
            <HelpCircle className="w-4 h-4 text-gray-400" />
          </Tooltip>
        </div>

        <select
          value={answerRequirement || ''}
          onChange={(e) => onRequirementChange(e.target.value)}
          disabled={disabled}
          className={cn(
            'w-full px-3 py-2 border rounded-lg',
            'focus:outline-none focus:ring-2 focus:ring-[#8CC63F] focus:border-[#8CC63F]',
            'bg-white dark:bg-gray-800',
            'text-gray-900 dark:text-gray-100',
            disabled && 'opacity-60 cursor-not-allowed'
          )}
        >
          <option value="">Select answer requirement...</option>
          {enhancedRequirementOptions.map((option) => {
            const isCompatibleOption = option.isCompatible;
            const icon = getRequirementIcon(option.value);

            return (
              <option
                key={option.value}
                value={option.value}
                className={cn(
                  !isCompatibleOption && answerFormat && 'text-gray-400'
                )}
              >
                {icon} {option.label}
                {!isCompatibleOption && answerFormat && ' (⚠️ Not recommended)'}
              </option>
            );
          })}
        </select>

        {answerRequirement && (
          <div className="p-2 bg-gray-50 dark:bg-gray-900 rounded-md">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {ANSWER_REQUIREMENT_OPTIONS.find(opt => opt.value === answerRequirement)?.description}
            </p>
          </div>
        )}
      </div>

      {/* Compatibility Indicator */}
      {renderCompatibilityIndicator()}

      {/* Validation Messages */}
      {showValidation && renderValidation()}

      {/* Help Text */}
      {!answerFormat && !answerRequirement && (
        <div className="p-3 bg-[#8CC63F]/10 dark:bg-[#8CC63F]/20 border border-[#8CC63F]/30 dark:border-[#8CC63F]/40 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-[#356B1B] dark:text-[#8CC63F] flex-shrink-0 mt-0.5" />
            <div className="text-xs text-[#356B1B] dark:text-[#8CC63F]">
              <p className="font-medium mb-1">Quick Guide:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Select how students should format their answer (e.g., single word, calculation)</li>
                <li>Choose what's required for full marks (e.g., both items, any 2 from list)</li>
                <li>The system will validate compatibility and provide guidance</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedAnswerFormatSelector;
