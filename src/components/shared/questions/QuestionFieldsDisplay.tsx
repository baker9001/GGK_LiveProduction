// src/components/shared/questions/QuestionFieldsDisplay.tsx

/**
 * Comprehensive Question Fields Display Component
 *
 * Displays all question fields organized by category with visual indicators
 * for completeness, validation status, and data quality
 */

import React from 'react';
import {
  Database, BookOpen, Target, Lightbulb, FileText, Award,
  CheckCircle, XCircle, AlertTriangle, MinusCircle, Info
} from 'lucide-react';
import { cn } from '../../lib/utils';
import type { QuestionData } from './QuestionViewer';

interface QuestionFieldsDisplayProps {
  question: QuestionData;
  showEmptyFields?: boolean;
  compact?: boolean;
}

interface FieldInfo {
  label: string;
  value: any;
  category: 'required' | 'recommended' | 'optional';
  isEmpty: boolean;
}

export const QuestionFieldsDisplay: React.FC<QuestionFieldsDisplayProps> = ({
  question,
  showEmptyFields = true,
  compact = false
}) => {
  // Helper to check if field is empty
  const isEmpty = (value: any): boolean => {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (typeof value === 'number') return false;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  };

  // Helper to get field status icon
  const getStatusIcon = (field: FieldInfo) => {
    if (!field.isEmpty) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    if (field.category === 'required') {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
    if (field.category === 'recommended') {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
    return <MinusCircle className="h-4 w-4 text-gray-400" />;
  };

  // Helper to format value display
  const formatValue = (value: any): string => {
    if (isEmpty(value)) return 'Not set';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') return String(value);
    if (Array.isArray(value)) return `${value.length} item(s)`;
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    // Truncate long strings
    const str = String(value);
    return str.length > 100 ? `${str.substring(0, 100)}...` : str;
  };

  // Define all fields by category
  const basicFields: FieldInfo[] = [
    { label: 'Question Number', value: question.question_number, category: 'required', isEmpty: isEmpty(question.question_number) },
    { label: 'Question Text', value: question.question_text, category: 'required', isEmpty: isEmpty(question.question_text) },
    { label: 'Type', value: question.type, category: 'required', isEmpty: isEmpty(question.type) },
    { label: 'Category', value: question.category, category: 'recommended', isEmpty: isEmpty(question.category) },
    { label: 'Marks', value: question.marks, category: 'required', isEmpty: isEmpty(question.marks) },
    { label: 'Difficulty', value: question.difficulty, category: 'recommended', isEmpty: isEmpty(question.difficulty) },
    { label: 'Status', value: question.status, category: 'required', isEmpty: isEmpty(question.status) }
  ];

  const academicFields: FieldInfo[] = [
    { label: 'Subject', value: question.subject, category: 'required', isEmpty: isEmpty(question.subject) },
    { label: 'Subject ID', value: question.subject_id, category: 'optional', isEmpty: isEmpty(question.subject_id) },
    { label: 'Unit', value: question.unit, category: 'recommended', isEmpty: isEmpty(question.unit) },
    { label: 'Unit ID', value: question.unit_id, category: 'optional', isEmpty: isEmpty(question.unit_id) },
    { label: 'Chapter', value: question.chapter, category: 'recommended', isEmpty: isEmpty(question.chapter) },
    { label: 'Chapter ID', value: question.chapter_id, category: 'optional', isEmpty: isEmpty(question.chapter_id) },
    { label: 'Topic', value: question.topic, category: 'required', isEmpty: isEmpty(question.topic) },
    { label: 'Topic ID', value: question.topic_id, category: 'optional', isEmpty: isEmpty(question.topic_id) },
    { label: 'Subtopic', value: question.subtopic, category: 'recommended', isEmpty: isEmpty(question.subtopic) },
    { label: 'Subtopic ID', value: question.subtopic_id, category: 'optional', isEmpty: isEmpty(question.subtopic_id) }
  ];

  const answerFields: FieldInfo[] = [
    { label: 'Answer Format', value: question.answer_format, category: 'required', isEmpty: isEmpty(question.answer_format) },
    { label: 'Answer Requirement', value: question.answer_requirement, category: 'required', isEmpty: isEmpty(question.answer_requirement) },
    { label: 'Total Alternatives', value: question.total_alternatives, category: 'optional', isEmpty: isEmpty(question.total_alternatives) },
    { label: 'Correct Answers', value: question.correct_answers, category: 'required', isEmpty: isEmpty(question.correct_answers) },
    { label: 'Options', value: question.options, category: 'optional', isEmpty: isEmpty(question.options) }
  ];

  const educationalFields: FieldInfo[] = [
    { label: 'Hint', value: question.hint, category: 'recommended', isEmpty: isEmpty(question.hint) },
    { label: 'Explanation', value: question.explanation, category: 'recommended', isEmpty: isEmpty(question.explanation) }
  ];

  const structuralFields: FieldInfo[] = [
    { label: 'Parts', value: question.parts, category: 'optional', isEmpty: isEmpty(question.parts) },
    { label: 'Attachments', value: question.attachments, category: 'optional', isEmpty: isEmpty(question.attachments) }
  ];

  const metadataFields: FieldInfo[] = [
    { label: 'Year', value: question.year, category: 'optional', isEmpty: isEmpty(question.year) },
    { label: 'Exam Board', value: question.exam_board, category: 'optional', isEmpty: isEmpty(question.exam_board) },
    { label: 'Paper Code', value: question.paper_code, category: 'optional', isEmpty: isEmpty(question.paper_code) }
  ];

  // Calculate statistics
  const allFields = [...basicFields, ...academicFields, ...answerFields, ...educationalFields, ...structuralFields, ...metadataFields];
  const filledFields = allFields.filter(f => !f.isEmpty).length;
  const totalFields = allFields.length;
  const completeness = Math.round((filledFields / totalFields) * 100);
  const requiredEmpty = basicFields.filter(f => f.category === 'required' && f.isEmpty).length +
                        academicFields.filter(f => f.category === 'required' && f.isEmpty).length +
                        answerFields.filter(f => f.category === 'required' && f.isEmpty).length;

  // Filter fields based on showEmptyFields prop
  const filterFields = (fields: FieldInfo[]) => {
    return showEmptyFields ? fields : fields.filter(f => !f.isEmpty);
  };

  // Render field group
  const renderFieldGroup = (
    title: string,
    icon: React.ReactNode,
    fields: FieldInfo[],
    colorClass: string
  ) => {
    const filteredFields = filterFields(fields);
    if (filteredFields.length === 0 && !showEmptyFields) return null;

    const groupFilled = fields.filter(f => !f.isEmpty).length;
    const groupTotal = fields.length;

    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className={cn('px-4 py-3 flex items-center justify-between', colorClass)}>
          <div className="flex items-center gap-2">
            {icon}
            <span className="font-medium text-gray-900 dark:text-white">{title}</span>
          </div>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {groupFilled}/{groupTotal}
          </span>
        </div>

        <div className={cn(
          'divide-y divide-gray-200 dark:divide-gray-700',
          compact ? 'text-sm' : ''
        )}>
          {filteredFields.map((field, index) => (
            <div key={index} className={cn(
              'px-4 flex items-start gap-3',
              compact ? 'py-2' : 'py-3'
            )}>
              <div className="flex-shrink-0 mt-0.5">
                {getStatusIcon(field)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {field.label}
                  </span>
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded-full',
                    field.category === 'required' && 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
                    field.category === 'recommended' && 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
                    field.category === 'optional' && 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  )}>
                    {field.category}
                  </span>
                </div>
                <div className={cn(
                  'mt-1 break-words',
                  field.isEmpty ? 'text-gray-400 italic' : 'text-gray-900 dark:text-gray-100'
                )}>
                  {formatValue(field.value)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Overall Statistics */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Field Completeness
          </h3>
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {completeness}%
          </div>
        </div>

        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full transition-all duration-300',
              completeness >= 80 ? 'bg-green-500' : completeness >= 60 ? 'bg-yellow-500' : 'bg-red-500'
            )}
            style={{ width: `${completeness}%` }}
          />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{filledFields}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Filled</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalFields - filledFields}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Empty</div>
          </div>
          <div>
            <div className={cn(
              'text-2xl font-bold',
              requiredEmpty === 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            )}>
              {requiredEmpty}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Required Missing</div>
          </div>
        </div>

        {requiredEmpty > 0 && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-800 dark:text-red-200">
              <strong>Action Required:</strong> {requiredEmpty} required field{requiredEmpty !== 1 ? 's are' : ' is'} missing.
              Please fill in all required fields before proceeding.
            </div>
          </div>
        )}
      </div>

      {/* Field Groups */}
      {renderFieldGroup(
        'Basic Information',
        <FileText className="h-5 w-5 text-blue-500" />,
        basicFields,
        'bg-blue-50 dark:bg-blue-900/20'
      )}

      {renderFieldGroup(
        'Academic Classification',
        <Database className="h-5 w-5 text-purple-500" />,
        academicFields,
        'bg-purple-50 dark:bg-purple-900/20'
      )}

      {renderFieldGroup(
        'Answer Configuration',
        <Target className="h-5 w-5 text-green-500" />,
        answerFields,
        'bg-green-50 dark:bg-green-900/20'
      )}

      {renderFieldGroup(
        'Educational Support',
        <Lightbulb className="h-5 w-5 text-yellow-500" />,
        educationalFields,
        'bg-yellow-50 dark:bg-yellow-900/20'
      )}

      {renderFieldGroup(
        'Structure & Content',
        <BookOpen className="h-5 w-5 text-indigo-500" />,
        structuralFields,
        'bg-indigo-50 dark:bg-indigo-900/20'
      )}

      {renderFieldGroup(
        'Metadata',
        <Info className="h-5 w-5 text-gray-500" />,
        metadataFields,
        'bg-gray-50 dark:bg-gray-800'
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-sm text-gray-600 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span>Filled</span>
        </div>
        <div className="flex items-center gap-2">
          <XCircle className="h-4 w-4 text-red-500" />
          <span>Required Empty</span>
        </div>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <span>Recommended Empty</span>
        </div>
        <div className="flex items-center gap-2">
          <MinusCircle className="h-4 w-4 text-gray-400" />
          <span>Optional Empty</span>
        </div>
      </div>
    </div>
  );
};

export default QuestionFieldsDisplay;
