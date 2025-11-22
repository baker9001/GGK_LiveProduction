/**
 * Code Editor Component for Programming Questions
 *
 * Uses Monaco Editor (VS Code engine) for syntax highlighting,
 * auto-indentation, and multi-language support.
 */

import React, { useState, useCallback, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Code, Copy, Download, RotateCcw, Check, AlertCircle } from 'lucide-react';
import Button from '@/components/shared/Button';
import { cn } from '@/lib/utils';
import { validateCode, type ValidationResult } from '../utils/dataValidation';

interface CodeEditorProps {
  questionId: string;
  language?: 'python' | 'javascript' | 'html' | 'css' | 'typescript' | 'java' | 'cpp' | 'plaintext';
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  height?: string | number;
  minLines?: number;
  maxLines?: number;
  initialTemplate?: string;
  showCorrectAnswer?: boolean;
  correctAnswer?: string;
  readOnly?: boolean;
  theme?: 'vs-light' | 'vs-dark';
  showLineNumbers?: boolean;
  showMinimap?: boolean;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  questionId,
  language = 'python',
  value,
  onChange,
  disabled = false,
  height = '400px',
  minLines,
  maxLines,
  initialTemplate,
  showCorrectAnswer = false,
  correctAnswer,
  readOnly = false,
  theme = 'vs-dark',
  showLineNumbers = true,
  showMinimap = false
}) => {
  const [currentValue, setCurrentValue] = useState(value || initialTemplate || '');
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(theme === 'vs-dark');

  useEffect(() => {
    if (value !== currentValue) {
      setCurrentValue(value);
    }
  }, [value]);

  // Validate code on change
  useEffect(() => {
    if (currentValue && !readOnly) {
      const result = validateCode(currentValue, minLines, maxLines);
      setValidation(result);
    }
  }, [currentValue, minLines, maxLines, readOnly]);

  const handleEditorChange = useCallback((newValue: string | undefined) => {
    const updatedValue = newValue || '';
    setCurrentValue(updatedValue);
    onChange(updatedValue);
  }, [onChange]);

  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(currentValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  }, [currentValue]);

  const handleDownloadCode = useCallback(() => {
    const extension = getFileExtension(language);
    const blob = new Blob([currentValue], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `code_${questionId}.${extension}`;
    link.click();
    URL.revokeObjectURL(url);
  }, [currentValue, language, questionId]);

  const handleReset = useCallback(() => {
    const resetValue = initialTemplate || '';
    setCurrentValue(resetValue);
    onChange(resetValue);
  }, [initialTemplate, onChange]);

  const handleToggleTheme = useCallback(() => {
    setIsDarkMode(!isDarkMode);
  }, [isDarkMode]);

  const lineCount = currentValue.split('\n').length;

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {getLanguageLabel(language)}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {lineCount} line{lineCount !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleTheme}
            disabled={disabled}
            title={isDarkMode ? 'Switch to light theme' : 'Switch to dark theme'}
            className="h-8"
          >
            {isDarkMode ? '☀️' : '🌙'}
          </Button>

          {/* Copy Code */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyCode}
            disabled={disabled || !currentValue}
            title="Copy code"
            className="h-8"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </Button>

          {/* Download Code */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownloadCode}
            disabled={disabled || !currentValue}
            title="Download code"
            className="h-8"
          >
            <Download className="w-4 h-4" />
          </Button>

          {/* Reset */}
          {initialTemplate && !readOnly && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              disabled={disabled}
              title="Reset to template"
              className="h-8"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Monaco Editor */}
      <div className={cn(
        "border rounded-lg overflow-hidden",
        disabled ? "opacity-60 pointer-events-none" : "",
        "border-gray-300 dark:border-gray-700"
      )}>
        <Editor
          height={height}
          language={language}
          value={currentValue}
          onChange={handleEditorChange}
          theme={isDarkMode ? 'vs-dark' : 'vs-light'}
          options={{
            readOnly: readOnly || disabled,
            minimap: { enabled: showMinimap },
            lineNumbers: showLineNumbers ? 'on' : 'off',
            fontSize: 14,
            tabSize: 4,
            insertSpaces: true,
            automaticLayout: true,
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            formatOnPaste: true,
            formatOnType: true,
            quickSuggestions: !readOnly,
            suggestOnTriggerCharacters: !readOnly,
            acceptSuggestionOnCommitCharacter: !readOnly,
            folding: true,
            bracketPairColorization: { enabled: true },
            guides: {
              bracketPairs: true,
              indentation: true
            }
          }}
        />
      </div>

      {/* Validation Messages */}
      {validation && !validation.isValid && !readOnly && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-red-800 dark:text-red-300 mb-1">
                Validation Errors:
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-red-700 dark:text-red-400">
                {validation.errors.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Validation Warnings */}
      {validation && validation.warnings.length > 0 && !readOnly && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-yellow-800 dark:text-yellow-300 mb-1">
                Warnings:
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-yellow-700 dark:text-yellow-400">
                {validation.warnings.map((warning, idx) => (
                  <li key={idx}>{warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Correct Answer Display */}
      {showCorrectAnswer && correctAnswer && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
          <h4 className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">
            Correct Answer:
          </h4>
          <div className="border rounded-lg overflow-hidden border-green-300 dark:border-green-700">
            <Editor
              height="200px"
              language={language}
              value={correctAnswer}
              theme={isDarkMode ? 'vs-dark' : 'vs-light'}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                lineNumbers: 'on',
                fontSize: 14,
                scrollBeyondLastLine: false,
                wordWrap: 'on'
              }}
            />
          </div>
        </div>
      )}

      {/* Help Text */}
      {!readOnly && !currentValue && (
        <div className="text-sm text-gray-500 dark:text-gray-400 italic">
          Start typing your code above. Use Ctrl+Space for autocomplete suggestions.
        </div>
      )}
    </div>
  );
};

/**
 * Helper function to get language label
 */
function getLanguageLabel(language: string): string {
  const labels: Record<string, string> = {
    python: 'Python',
    javascript: 'JavaScript',
    typescript: 'TypeScript',
    html: 'HTML',
    css: 'CSS',
    java: 'Java',
    cpp: 'C++',
    plaintext: 'Plain Text'
  };
  return labels[language] || language.toUpperCase();
}

/**
 * Helper function to get file extension
 */
function getFileExtension(language: string): string {
  const extensions: Record<string, string> = {
    python: 'py',
    javascript: 'js',
    typescript: 'ts',
    html: 'html',
    css: 'css',
    java: 'java',
    cpp: 'cpp',
    plaintext: 'txt'
  };
  return extensions[language] || 'txt';
}

export default CodeEditor;
