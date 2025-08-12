// src/app/system-admin/learning/practice-management/papers-setup/tabs/components/ContextValidator.tsx

import React from 'react';
import { AlertCircle, CheckCircle, Info, Tag } from 'lucide-react';
import { cn } from '../../../../../../../lib/utils';

interface ContextInfo {
  type: string;
  value: string;
  label?: string;
}

interface ContextValidatorProps {
  context: ContextInfo;
  answerText: string;
  questionType: string;
  subjectContext?: string;
}

const CONTEXT_TYPE_DEFINITIONS = {
  option: {
    label: 'Multiple Choice Option',
    validationRules: [
      { test: (ctx: ContextInfo) => /^[A-Z]$/.test(ctx.value), message: 'Value should be a single capital letter (A-Z)' },
      { test: (ctx: ContextInfo) => ctx.label?.length || 0 > 0, message: 'Label should describe the option content', severity: 'warning' as const }
    ],
    examples: ['A', 'B', 'C', 'D']
  },
  position: {
    label: 'Position/Location',
    validationRules: [
      { test: (ctx: ContextInfo) => /^[A-Z]$|^\d+$|^[A-Z]\d+$/.test(ctx.value), message: 'Value should be a letter, number, or combination' },
      { test: (ctx: ContextInfo) => ctx.label !== undefined, message: 'Label should describe the position', severity: 'warning' as const }
    ],
    examples: ['A', '1', 'A1', 'Top', 'Left']
  },
  field: {
    label: 'Form/Table Field',
    validationRules: [
      { test: (ctx: ContextInfo) => ctx.value.length > 0, message: 'Field name is required' },
      { test: (ctx: ContextInfo) => !ctx.value.includes(' '), message: 'Field names should use underscores instead of spaces', severity: 'warning' as const }
    ],
    examples: ['name', 'formula', 'value', 'result']
  },
  property: {
    label: 'Property/Characteristic',
    validationRules: [
      { test: (ctx: ContextInfo) => ctx.value.length > 0, message: 'Property name is required' },
      { test: (ctx: ContextInfo) => ctx.value.toLowerCase() === ctx.value, message: 'Properties should be lowercase', severity: 'warning' as const }
    ],
    examples: ['color', 'state', 'size', 'temperature']
  },
  step: {
    label: 'Sequential Step',
    validationRules: [
      { test: (ctx: ContextInfo) => /^\d+$/.test(ctx.value), message: 'Step value should be a number' },
      { test: (ctx: ContextInfo) => parseInt(ctx.value) > 0, message: 'Step number should be positive' }
    ],
    examples: ['1', '2', '3', '4']
  },
  component: {
    label: 'Component Part',
    validationRules: [
      { test: (ctx: ContextInfo) => ctx.value.length > 0, message: 'Component identifier is required' },
      { test: (ctx: ContextInfo) => ctx.label !== undefined, message: 'Component description recommended', severity: 'warning' as const }
    ],
    examples: ['definition', 'example', 'explanation', 'formula']
  },
  measurement: {
    label: 'Measurement',
    validationRules: [
      { test: (ctx: ContextInfo) => /\d/.test(ctx.value), message: 'Measurements should include numeric values' },
      { test: (ctx: ContextInfo) => /[a-zA-Z]/.test(ctx.value), message: 'Measurements should include units', severity: 'warning' as const }
    ],
    examples: ['25°C', '100ml', '5.5kg', '30m/s']
  },
  calculation: {
    label: 'Calculation',
    validationRules: [
      { test: (ctx: ContextInfo) => ctx.value.length > 0, message: 'Calculation identifier is required' },
      { test: (ctx: ContextInfo) => ctx.label !== undefined, message: 'Calculation description recommended', severity: 'warning' as const }
    ],
    examples: ['result', 'total', 'average', 'percentage']
  },
  descriptive: {
    label: 'Descriptive',
    validationRules: [
      { test: (ctx: ContextInfo) => ctx.value === 'general' || ctx.value.length > 3, message: 'Descriptive context should be "general" or specific' }
    ],
    examples: ['general', 'definition', 'explanation', 'reason']
  }
};

export function ContextValidator({
  context,
  answerText,
  questionType,
  subjectContext
}: ContextValidatorProps) {
  const contextDef = CONTEXT_TYPE_DEFINITIONS[context.type as keyof typeof CONTEXT_TYPE_DEFINITIONS];
  
  if (!contextDef) {
    return (
      <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
          <div>
            <p className="font-medium text-sm text-red-900 dark:text-red-100">Invalid Context Type</p>
            <p className="text-xs text-red-700 dark:text-red-300 mt-1">
              Context type "{context.type}" is not recognized. Please select a valid type.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // Run validation rules
  const validationResults = contextDef.validationRules.map(rule => ({
    ...rule,
    passed: rule.test(context)
  }));
  
  const errors = validationResults.filter(r => !r.passed && r.severity !== 'warning');
  const warnings = validationResults.filter(r => !r.passed && r.severity === 'warning');
  const allPassed = errors.length === 0;
  
  // Auto-suggest improvements
  const suggestions: string[] = [];
  
  // Check if context matches answer content
  if (questionType === 'mcq' && context.type !== 'option') {
    suggestions.push('Consider using "option" context type for MCQ answers');
  }
  
  if (answerText.match(/^step\s+\d+/i) && context.type !== 'step') {
    suggestions.push('This appears to be a step - consider using "step" context type');
  }
  
  if (answerText.match(/\d+\s*[a-zA-Z]+/) && context.type !== 'measurement') {
    suggestions.push('This appears to be a measurement - consider using "measurement" context type');
  }
  
  return (
    <div className={cn(
      "p-4 rounded-lg border space-y-3",
      allPassed 
        ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
        : "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-gray-500" />
          <h4 className="font-medium text-sm">Context Validation</h4>
          {allPassed ? (
            <CheckCircle className="w-4 h-4 text-green-500" />
          ) : (
            <AlertCircle className="w-4 h-4 text-yellow-500" />
          )}
        </div>
        <span className="text-xs px-2 py-1 bg-white dark:bg-gray-800 rounded">
          {contextDef.label}
        </span>
      </div>
      
      {/* Current Context */}
      <div className="bg-white dark:bg-gray-800 p-3 rounded">
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <span className="text-gray-600 dark:text-gray-400">Type:</span>
            <p className="font-mono">{context.type}</p>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Value:</span>
            <p className="font-mono">{context.value}</p>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Label:</span>
            <p className="font-mono">{context.label || '(none)'}</p>
          </div>
        </div>
      </div>
      
      {/* Validation Results */}
      {errors.length > 0 && (
        <div>
          <h5 className="text-sm font-medium text-red-700 dark:text-red-300 mb-1">Errors</h5>
          <ul className="space-y-1">
            {errors.map((error, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm">
                <AlertCircle className="w-3 h-3 text-red-500 mt-0.5" />
                <span className="text-red-700 dark:text-red-300">{error.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {warnings.length > 0 && (
        <div>
          <h5 className="text-sm font-medium text-yellow-700 dark:text-yellow-300 mb-1">Warnings</h5>
          <ul className="space-y-1">
            {warnings.map((warning, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm">
                <Info className="w-3 h-3 text-yellow-500 mt-0.5" />
                <span className="text-yellow-700 dark:text-yellow-300">{warning.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {suggestions.length > 0 && (
        <div>
          <h5 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">Suggestions</h5>
          <ul className="space-y-1">
            {suggestions.map((suggestion, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm">
                <Info className="w-3 h-3 text-blue-500 mt-0.5" />
                <span className="text-blue-700 dark:text-blue-300">{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Examples */}
      <div className="pt-2 border-t">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          Example values for {contextDef.label}: {contextDef.examples.join(', ')}
        </p>
      </div>
      
      {/* Subject-specific notes */}
      {subjectContext && (
        <div className="text-xs text-gray-600 dark:text-gray-400 italic">
          {subjectContext.toLowerCase().includes('physics') && context.type === 'measurement' && (
            <p>Physics: Remember to include uncertainties where applicable (e.g., 12.5 ± 0.5 cm)</p>
          )}
          {subjectContext.toLowerCase().includes('chemistry') && context.type === 'option' && (
            <p>Chemistry: For chemical equations, consider using descriptive context instead</p>
          )}
          {subjectContext.toLowerCase().includes('biology') && context.type === 'position' && (
            <p>Biology: Use clear anatomical position references (e.g., "ventral", "dorsal")</p>
          )}
        </div>
      )}
    </div>
  );
}