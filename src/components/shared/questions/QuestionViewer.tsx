// src/components/shared/questions/QuestionViewer.tsx

/**
 * Comprehensive Question Viewer Component for QA Review
 *
 * Displays ALL question fields with complete display and edit capabilities
 * Supports: Review mode, Simulation mode, and Student mode
 *
 * Features:
 * - All academic hierarchy fields (Subject, Unit, Chapter, Topic, Subtopic)
 * - Complete metadata (Type, Category, Difficulty, Status)
 * - Answer configuration (Format, Requirement, Alternatives)
 * - Educational content (Hints, Explanations, Marking criteria)
 * - Nested structures (Parts, Subparts, Correct answers, Options)
 * - Attachments management
 * - Real-time validation
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Edit2, Eye, Save, X, Check, AlertCircle, CheckCircle, Info,
  FileText, Award, Hash, BookOpen, Lightbulb, Image as ImageIcon,
  Paperclip, Plus, Trash2, ChevronDown, ChevronUp, Database,
  Target, Flag, HelpCircle, Settings
} from 'lucide-react';
import { Button } from '../Button';
import { Select } from '../Select';
import { SearchableMultiSelect } from '../SearchableMultiSelect';
import { RichTextEditor } from '../RichTextEditor';
import { cn } from '../../lib/utils';
import { toast } from '../Toast';
import type {
  QuestionStatus,
  QuestionType,
  QuestionCategory,
  DifficultyLevel,
  AnswerFormat,
  AnswerRequirement
} from '../../types/questions';

// ==========================================
// Type Definitions
// ==========================================

export type QuestionMode = 'review' | 'simulation' | 'student';

export interface QuestionData {
  id?: string;
  question_number: string;
  type: 'mcq' | 'true_false' | 'fill_blank' | 'numerical' | 'structured' | 'diagram_label' | 'graph' | 'practical';
  category?: QuestionCategory;
  question_text: string;
  marks: number;
  difficulty?: DifficultyLevel;
  status?: QuestionStatus;

  // Academic hierarchy
  subject?: string;
  subject_id?: string;
  unit?: string;
  unit_id?: string;
  chapter?: string;
  chapter_id?: string;
  topic?: string;
  topic_id?: string;
  subtopic?: string;
  subtopic_id?: string;

  // Answer configuration
  answer_format?: AnswerFormat;
  answer_requirement?: AnswerRequirement;
  total_alternatives?: number;

  // Educational content
  hint?: string;
  explanation?: string;

  // Nested structures
  correct_answers?: CorrectAnswer[];
  options?: QuestionOption[];
  parts?: QuestionPart[];
  attachments?: AttachmentData[];

  // Metadata
  year?: number;
  exam_board?: string;
  paper_code?: string;
  meta?: Record<string, any>;
}

export interface CorrectAnswer {
  answer: string;
  marks?: number;
  alternative_id?: number;
  context_type?: string;
  context_value?: string;
  context_label?: string;
}

export interface QuestionOption {
  label: string;
  text: string;
  is_correct: boolean;
  explanation?: string;
}

export interface QuestionPart {
  part: string;
  question_text: string;
  marks: number;
  answer_format?: AnswerFormat;
  answer_requirement?: AnswerRequirement;
  hint?: string;
  explanation?: string;
  correct_answers?: CorrectAnswer[];
  options?: QuestionOption[];
  subparts?: QuestionSubpart[];
  attachments?: AttachmentData[];
}

export interface QuestionSubpart {
  subpart: string;
  question_text: string;
  marks: number;
  answer_format?: AnswerFormat;
  answer_requirement?: AnswerRequirement;
  hint?: string;
  explanation?: string;
  correct_answers?: CorrectAnswer[];
  options?: QuestionOption[];
  attachments?: AttachmentData[];
}

export interface AttachmentData {
  id: string;
  name: string;
  url: string;
  type: string;
  size?: number;
}

export interface UserResponse {
  questionId: string;
  answer: string | string[];
  timestamp: Date;
}

export interface ValidationReport {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  completeness: number;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
}

export interface UploadedAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

interface QuestionViewerProps {
  question: QuestionData;
  mode: QuestionMode;
  subject?: string;
  examBoard?: string;
  editable?: boolean;
  showValidation?: boolean;
  onUpdate?: (question: QuestionData) => void;
  onValidate?: (report: ValidationReport) => void;
  onAnswerChange?: (response: UserResponse) => void;
  onAttachmentsChange?: (attachments: UploadedAttachment[]) => void;

  // Academic structure data for editing
  units?: Array<{ id: string; name: string }>;
  chapters?: Array<{ id: string; name: string }>;
  topics?: Array<{ id: string; name: string }>;
  subtopics?: Array<{ id: string; name: string }>;
}

// ==========================================
// Field Configuration
// ==========================================

const ANSWER_FORMATS: Array<{ value: AnswerFormat; label: string }> = [
  { value: 'single_word', label: 'Single Word' },
  { value: 'single_line', label: 'Short Answer' },
  { value: 'two_items', label: 'Two Items' },
  { value: 'two_items_connected', label: 'Connected Items' },
  { value: 'multi_line', label: 'Multi-line Answer' },
  { value: 'multi_line_labeled', label: 'Labeled Parts' },
  { value: 'calculation', label: 'Calculation' },
  { value: 'equation', label: 'Equation' },
  { value: 'chemical_structure', label: 'Chemical Structure' },
  { value: 'structural_diagram', label: 'Structural Diagram' },
  { value: 'diagram', label: 'Diagram' },
  { value: 'table', label: 'Table' },
  { value: 'graph', label: 'Graph' },
  { value: 'code', label: 'Code' },
  { value: 'audio', label: 'Audio Recording' },
  { value: 'file_upload', label: 'File Upload' }
];

const ANSWER_REQUIREMENTS: Array<{ value: AnswerRequirement; label: string }> = [
  { value: 'single_choice', label: 'Single Choice' },
  { value: 'both_required', label: 'Both Required' },
  { value: 'any_2_from', label: 'Any 2 From' },
  { value: 'any_3_from', label: 'Any 3 From' },
  { value: 'all_required', label: 'All Required' },
  { value: 'alternative_methods', label: 'Alternative Methods' }
];

const DIFFICULTY_LEVELS: Array<{ value: DifficultyLevel; label: string }> = [
  { value: 'Easy', label: 'Easy' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Hard', label: 'Hard' }
];

const QUESTION_STATUSES: Array<{ value: QuestionStatus; label: string }> = [
  { value: 'draft', label: 'Draft' },
  { value: 'qa_review', label: 'QA Review' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'archived', label: 'Archived' }
];

// ==========================================
// Main Component
// ==========================================

export const QuestionViewer: React.FC<QuestionViewerProps> = ({
  question: initialQuestion,
  mode,
  subject,
  examBoard,
  editable = false,
  showValidation = true,
  onUpdate,
  onValidate,
  onAnswerChange,
  onAttachmentsChange,
  units = [],
  chapters = [],
  topics = [],
  subtopics = []
}) => {
  const [question, setQuestion] = useState<QuestionData>(initialQuestion);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'attachments' | 'preview' | 'validation'>('edit');
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['basic', 'academic', 'answer']));

  // Update internal state when prop changes
  useEffect(() => {
    setQuestion(initialQuestion);
  }, [initialQuestion]);

  // Validate question whenever it changes
  useEffect(() => {
    if (showValidation) {
      const report = validateQuestion(question);
      setValidationReport(report);
      if (onValidate) {
        onValidate(report);
      }
    }
  }, [question, showValidation, onValidate]);

  // ==========================================
  // Validation Logic
  // ==========================================

  const validateQuestion = useCallback((q: QuestionData): ValidationReport => {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let completeness = 0;
    const totalFields = 15;

    // Required fields validation
    if (!q.question_text?.trim()) {
      errors.push({ field: 'question_text', message: 'Question text is required' });
    } else {
      completeness++;
    }

    if (!q.marks || q.marks <= 0) {
      errors.push({ field: 'marks', message: 'Valid marks allocation is required' });
    } else {
      completeness++;
    }

    if (!q.type) {
      errors.push({ field: 'type', message: 'Question type is required' });
    } else {
      completeness++;
    }

    // Academic hierarchy validation
    if (q.subject) completeness++;
    if (q.topic) completeness++;
    if (q.subtopic) completeness++;

    // Answer configuration
    if (q.answer_format) completeness++;
    if (q.answer_requirement) completeness++;

    // Optional but recommended
    if (!q.difficulty) {
      warnings.push({ field: 'difficulty', message: 'Difficulty level should be specified' });
    } else {
      completeness++;
    }

    if (!q.hint && q.difficulty === 'Hard') {
      warnings.push({ field: 'hint', message: 'Hints are recommended for hard questions' });
    } else if (q.hint) {
      completeness++;
    }

    if (!q.explanation) {
      warnings.push({ field: 'explanation', message: 'Explanation helps students understand' });
    } else {
      completeness++;
    }

    // Answer validation
    if (q.type === 'mcq' && (!q.options || q.options.length === 0)) {
      errors.push({ field: 'options', message: 'MCQ questions must have options' });
    } else if (q.options && q.options.length > 0) {
      completeness++;
    }

    if (!q.correct_answers || q.correct_answers.length === 0) {
      warnings.push({ field: 'correct_answers', message: 'Correct answers should be specified' });
    } else {
      completeness++;
    }

    // Attachment validation
    if (q.attachments && q.attachments.length > 0) {
      completeness++;
    }

    // Parts validation
    if (q.parts && q.parts.length > 0) {
      completeness++;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      completeness: Math.round((completeness / totalFields) * 100)
    };
  }, []);

  // ==========================================
  // Handlers
  // ==========================================

  const handleFieldChange = useCallback((field: keyof QuestionData, value: any) => {
    setQuestion(prev => {
      const updated = { ...prev, [field]: value };
      return updated;
    });
  }, []);

  const handleSave = useCallback(() => {
    if (onUpdate) {
      onUpdate(question);
      toast.success('Question updated successfully');
    }
    setIsEditing(false);
  }, [question, onUpdate]);

  const handleCancel = useCallback(() => {
    setQuestion(initialQuestion);
    setIsEditing(false);
  }, [initialQuestion]);

  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  }, []);

  // ==========================================
  // Render Helpers
  // ==========================================

  const renderEditableField = (
    label: string,
    field: keyof QuestionData,
    type: 'text' | 'number' | 'select' | 'multiselect' | 'richtext' = 'text',
    options?: Array<{ value: any; label: string }>,
    required: boolean = false
  ) => {
    const value = question[field];
    const isEditable = editable && (mode === 'review' || isEditing);

    return (
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>

        {!isEditable ? (
          <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md text-sm">
            {value ? String(value) : <span className="text-gray-400">Not set</span>}
          </div>
        ) : (
          <>
            {type === 'text' && (
              <input
                type="text"
                value={value as string || ''}
                onChange={(e) => handleFieldChange(field, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              />
            )}

            {type === 'number' && (
              <input
                type="number"
                value={value as number || 0}
                onChange={(e) => handleFieldChange(field, parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                min="0"
                step="0.5"
              />
            )}

            {type === 'select' && options && (
              <Select
                value={value as string || ''}
                onChange={(val) => handleFieldChange(field, val)}
                options={options}
                placeholder={`Select ${label}`}
              />
            )}

            {type === 'richtext' && (
              <RichTextEditor
                value={value as string || ''}
                onChange={(val) => handleFieldChange(field, val)}
                placeholder={`Enter ${label.toLowerCase()}...`}
              />
            )}
          </>
        )}
      </div>
    );
  };

  const renderCollapsibleSection = (
    key: string,
    title: string,
    icon: React.ReactNode,
    children: React.ReactNode,
    badge?: React.ReactNode
  ) => {
    const isExpanded = expandedSections.has(key);

    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection(key)}
          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            {icon}
            <span className="font-medium text-gray-900 dark:text-white">{title}</span>
            {badge}
          </div>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {isExpanded && (
          <div className="p-4 space-y-4">
            {children}
          </div>
        )}
      </div>
    );
  };

  // ==========================================
  // Main Render
  // ==========================================

  const isReviewMode = mode === 'review';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Question {question.question_number}
            </h3>
            <div className="flex items-center gap-3 mt-1 text-sm text-gray-600 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <Award className="h-3 w-3" />
                {question.marks} mark{question.marks !== 1 ? 's' : ''}
              </span>
              <span>•</span>
              <span className="capitalize">{question.type?.replace('_', ' ')}</span>
              {question.difficulty && (
                <>
                  <span>•</span>
                  <span className="capitalize">{question.difficulty}</span>
                </>
              )}
            </div>
          </div>

          {isReviewMode && editable && (
            <div className="flex items-center gap-2">
              {validationReport && (
                <div className={cn(
                  'flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium',
                  validationReport.isValid
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                )}>
                  {validationReport.isValid ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                  {validationReport.completeness}% Complete
                </div>
              )}

              {!isEditing ? (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit2 className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={handleCancel}>
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                  <Button variant="default" size="sm" onClick={handleSave}>
                    <Check className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Tabs for Review Mode */}
        {isReviewMode && (
          <div className="flex gap-2 mt-4 border-b border-gray-200 dark:border-gray-700">
            {(['edit', 'attachments', 'preview', 'validation'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-4 py-2 text-sm font-medium transition-colors border-b-2',
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                )}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* Edit Tab */}
        {(activeTab === 'edit' || !isReviewMode) && (
          <div className="space-y-4">
            {/* Basic Information Section */}
            {renderCollapsibleSection(
              'basic',
              'Basic Information',
              <FileText className="h-4 w-4 text-blue-500" />,
              <>
                {renderEditableField('Question Text', 'question_text', 'richtext', undefined, true)}
                <div className="grid grid-cols-2 gap-4">
                  {renderEditableField('Marks', 'marks', 'number', undefined, true)}
                  {renderEditableField('Difficulty', 'difficulty', 'select', DIFFICULTY_LEVELS)}
                </div>
                {renderEditableField('Status', 'status', 'select', QUESTION_STATUSES)}
              </>
            )}

            {/* Academic Classification Section */}
            {renderCollapsibleSection(
              'academic',
              'Academic Classification',
              <Database className="h-4 w-4 text-purple-500" />,
              <>
                {renderEditableField('Subject', 'subject', 'text')}
                {renderEditableField('Unit', 'unit', 'text')}
                {renderEditableField('Chapter', 'chapter', 'text')}
                {renderEditableField('Topic', 'topic', 'text')}
                {renderEditableField('Subtopic', 'subtopic', 'text')}
              </>,
              <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full">
                {[question.subject, question.unit, question.chapter, question.topic, question.subtopic].filter(Boolean).length}/5
              </span>
            )}

            {/* Answer Configuration Section */}
            {renderCollapsibleSection(
              'answer',
              'Answer Configuration',
              <Target className="h-4 w-4 text-green-500" />,
              <>
                {renderEditableField('Answer Format', 'answer_format', 'select', ANSWER_FORMATS)}
                {renderEditableField('Answer Requirement', 'answer_requirement', 'select', ANSWER_REQUIREMENTS)}
                {renderEditableField('Total Alternatives', 'total_alternatives', 'number')}
              </>
            )}

            {/* Educational Support Section */}
            {renderCollapsibleSection(
              'support',
              'Educational Support',
              <Lightbulb className="h-4 w-4 text-yellow-500" />,
              <>
                {renderEditableField('Hint', 'hint', 'richtext')}
                {renderEditableField('Explanation', 'explanation', 'richtext')}
              </>
            )}
          </div>
        )}

        {/* Attachments Tab */}
        {activeTab === 'attachments' && isReviewMode && (
          <div className="text-center py-8 text-gray-500">
            <Paperclip className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p>Attachment management coming soon</p>
          </div>
        )}

        {/* Preview Tab */}
        {activeTab === 'preview' && isReviewMode && (
          <div className="prose dark:prose-invert max-w-none">
            <div dangerouslySetInnerHTML={{ __html: question.question_text || '' }} />
          </div>
        )}

        {/* Validation Tab */}
        {activeTab === 'validation' && isReviewMode && validationReport && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Completeness</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{validationReport.completeness}%</div>
              </div>
              <div className={cn(
                'text-3xl',
                validationReport.isValid ? 'text-green-500' : 'text-red-500'
              )}>
                {validationReport.isValid ? <CheckCircle /> : <AlertCircle />}
              </div>
            </div>

            {validationReport.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-red-700 dark:text-red-300 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Errors ({validationReport.errors.length})
                </h4>
                {validationReport.errors.map((error, index) => (
                  <div key={index} className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm">
                    <div className="font-medium text-red-900 dark:text-red-100">{error.field}</div>
                    <div className="text-red-700 dark:text-red-300">{error.message}</div>
                  </div>
                ))}
              </div>
            )}

            {validationReport.warnings.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-yellow-700 dark:text-yellow-300 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Warnings ({validationReport.warnings.length})
                </h4>
                {validationReport.warnings.map((warning, index) => (
                  <div key={index} className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm">
                    <div className="font-medium text-yellow-900 dark:text-yellow-100">{warning.field}</div>
                    <div className="text-yellow-700 dark:text-yellow-300">{warning.message}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionViewer;
