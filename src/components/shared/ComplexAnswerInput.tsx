import React, { useState, useEffect } from 'react';
import { Calculator, FileText, Table as TableIcon, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import ScientificEditor from './ScientificEditor';
import { AnswerFormat } from '@/types/questions';

interface ComplexAnswerInputProps {
  answerFormat?: AnswerFormat;
  value?: string | string[] | Record<string, any>;
  onChange: (value: string | string[] | Record<string, any>) => void;
  placeholder?: string;
  disabled?: boolean;
  marks?: number;
  subject?: string;
  showValidation?: boolean;
}

const ComplexAnswerInput: React.FC<ComplexAnswerInputProps> = ({
  answerFormat = 'single_line',
  value,
  onChange,
  placeholder,
  disabled = false,
  marks = 1,
  subject,
  showValidation = false
}) => {
  const [localValue, setLocalValue] = useState<string | string[] | Record<string, any>>(value || '');
  const [wordCount, setWordCount] = useState(0);
  const [characterCount, setCharacterCount] = useState(0);

  useEffect(() => {
    setLocalValue(value || '');

    if (typeof value === 'string') {
      setCharacterCount(value.length);
      setWordCount(value.trim().split(/\s+/).filter(Boolean).length);
    }
  }, [value]);

  const handleChange = (newValue: string | string[] | Record<string, any>) => {
    setLocalValue(newValue);
    onChange(newValue);

    if (typeof newValue === 'string') {
      setCharacterCount(newValue.length);
      setWordCount(newValue.trim().split(/\s+/).filter(Boolean).length);
    }
  };

  const renderSingleWordInput = () => {
    const valueStr = typeof localValue === 'string' ? localValue : '';
    const words = valueStr.trim().split(/\s+/).filter(Boolean);
    const isValid = words.length <= 1;

    return (
      <div className="space-y-2">
        <input
          type="text"
          value={valueStr}
          onChange={(e) => handleChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder || "Enter a single word"}
          className={cn(
            "w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500",
            disabled ? 'bg-gray-100 dark:bg-gray-900' : 'bg-white dark:bg-gray-800',
            !isValid && showValidation && 'border-red-500',
            "dark:text-white"
          )}
        />
        {showValidation && !isValid && words.length > 1 && (
          <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
            <X className="w-3 h-3" />
            <span>Please enter only one word ({words.length} words detected)</span>
          </div>
        )}
        {showValidation && isValid && valueStr.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
            <Check className="w-3 h-3" />
            <span>Valid single word</span>
          </div>
        )}
      </div>
    );
  };

  const renderSingleLineInput = () => {
    const valueStr = typeof localValue === 'string' ? localValue : '';

    return (
      <div className="space-y-2">
        <input
          type="text"
          value={valueStr}
          onChange={(e) => handleChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder || "Enter your answer"}
          className={cn(
            "w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500",
            disabled ? 'bg-gray-100 dark:bg-gray-900' : 'bg-white dark:bg-gray-800',
            "dark:text-white"
          )}
        />
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{characterCount} characters</span>
          {wordCount > 0 && <span>{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>}
        </div>
      </div>
    );
  };

  const renderMultiLineInput = () => {
    const valueStr = typeof localValue === 'string' ? localValue : '';
    const rows = Math.min(Math.max(3, Math.ceil(valueStr.length / 80)), 10);

    return (
      <div className="space-y-2">
        <textarea
          value={valueStr}
          onChange={(e) => handleChange(e.target.value)}
          disabled={disabled}
          rows={rows}
          placeholder={placeholder || "Enter your answer (you can write multiple lines)"}
          className={cn(
            "w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y",
            disabled ? 'bg-gray-100 dark:bg-gray-900' : 'bg-white dark:bg-gray-800',
            "dark:text-white"
          )}
        />
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{characterCount} characters</span>
          <span>{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
        </div>
      </div>
    );
  };

  const renderTwoItemsInput = () => {
    const valueObj = typeof localValue === 'object' && !Array.isArray(localValue) ? localValue : { item1: '', item2: '' };

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={valueObj.item1 || ''}
            onChange={(e) => handleChange({ ...valueObj, item1: e.target.value })}
            disabled={disabled}
            placeholder="First item"
            className={cn(
              "flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500",
              disabled ? 'bg-gray-100 dark:bg-gray-900' : 'bg-white dark:bg-gray-800',
              "dark:text-white"
            )}
          />
          <span className="text-gray-600 dark:text-gray-400 font-medium">
            {answerFormat === 'two_items_connected' ? 'AND' : '&'}
          </span>
          <input
            type="text"
            value={valueObj.item2 || ''}
            onChange={(e) => handleChange({ ...valueObj, item2: e.target.value })}
            disabled={disabled}
            placeholder="Second item"
            className={cn(
              "flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500",
              disabled ? 'bg-gray-100 dark:bg-gray-900' : 'bg-white dark:bg-gray-800',
              "dark:text-white"
            )}
          />
        </div>
        {showValidation && valueObj.item1 && valueObj.item2 && (
          <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
            <Check className="w-3 h-3" />
            <span>Both items provided</span>
          </div>
        )}
        {showValidation && (!valueObj.item1 || !valueObj.item2) && (
          <div className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
            <FileText className="w-3 h-3" />
            <span>Please provide both items</span>
          </div>
        )}
      </div>
    );
  };

  const renderCalculationInput = () => {
    const valueObj = typeof localValue === 'object' && !Array.isArray(localValue)
      ? localValue
      : { value: '', unit: '', working: '' };

    return (
      <div className="space-y-3">
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Calculator className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Calculation</span>
          </div>

          {/* Working/steps */}
          <div className="mb-3">
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
              Working (show your steps):
            </label>
            <textarea
              value={valueObj.working || ''}
              onChange={(e) => handleChange({ ...valueObj, working: e.target.value })}
              disabled={disabled}
              rows={3}
              placeholder="Show your calculation steps..."
              className={cn(
                "w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm",
                disabled ? 'bg-gray-100 dark:bg-gray-900' : 'bg-white dark:bg-gray-800',
                "dark:text-white font-mono"
              )}
            />
          </div>

          {/* Final answer with unit */}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                Final answer:
              </label>
              <input
                type="text"
                value={valueObj.value || ''}
                onChange={(e) => handleChange({ ...valueObj, value: e.target.value })}
                disabled={disabled}
                placeholder="e.g., 9.8"
                className={cn(
                  "w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500",
                  disabled ? 'bg-gray-100 dark:bg-gray-900' : 'bg-white dark:bg-gray-800',
                  "dark:text-white font-mono"
                )}
              />
            </div>
            <div className="w-32">
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                Unit:
              </label>
              <input
                type="text"
                value={valueObj.unit || ''}
                onChange={(e) => handleChange({ ...valueObj, unit: e.target.value })}
                disabled={disabled}
                placeholder="e.g., m/s²"
                className={cn(
                  "w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500",
                  disabled ? 'bg-gray-100 dark:bg-gray-900' : 'bg-white dark:bg-gray-800',
                  "dark:text-white font-mono"
                )}
              />
            </div>
          </div>
        </div>

        {showValidation && valueObj.value && (
          <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
            <Check className="w-3 h-3" />
            <span>Answer provided{valueObj.unit ? ' with unit' : ''}</span>
          </div>
        )}
      </div>
    );
  };

  const renderTableCompletionInput = () => {
    const valueObj = typeof localValue === 'object' && !Array.isArray(localValue) ? localValue : {};

    return (
      <div className="space-y-2">
        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <TableIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
              Complete the table by filling in the missing values
            </span>
          </div>

          <div className="space-y-2">
            {/* Dynamic table cells - this is a simplified version */}
            {/* In a real implementation, you'd parse the table structure from the question */}
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
              Enter table data as key-value pairs (e.g., "Cell A1: value")
            </div>
            <textarea
              value={JSON.stringify(valueObj, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  handleChange(parsed);
                } catch {
                  // Invalid JSON, keep as string for now
                }
              }}
              disabled={disabled}
              rows={4}
              placeholder='{"A1": "value1", "B2": "value2"}'
              className={cn(
                "w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm",
                disabled ? 'bg-gray-100 dark:bg-gray-900' : 'bg-white dark:bg-gray-800',
                "dark:text-white"
              )}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderScientificInput = () => {
    const valueStr = typeof localValue === 'string' ? localValue : '';

    return (
      <div className="space-y-2">
        <ScientificEditor
          value={valueStr}
          onChange={(content) => handleChange(content)}
          disabled={disabled}
          subject={subject}
          format={answerFormat}
          placeholder={placeholder || "Enter your answer using scientific notation"}
        />
      </div>
    );
  };

  // Render appropriate input based on answer format
  const renderInput = () => {
    switch (answerFormat) {
      case 'single_word':
        return renderSingleWordInput();

      case 'single_line':
        return renderSingleLineInput();

      case 'multi_line':
      case 'multi_line_labeled':
        return renderMultiLineInput();

      case 'two_items':
      case 'two_items_connected':
        return renderTwoItemsInput();

      case 'calculation':
        return renderCalculationInput();

      case 'table_completion':
      case 'table':
        return renderTableCompletionInput();

      case 'equation':
      case 'chemical_structure':
      case 'structural_diagram':
        return renderScientificInput();

      default:
        return renderSingleLineInput();
    }
  };

  return (
    <div className="w-full">
      {renderInput()}
    </div>
  );
};

export default ComplexAnswerInput;
