import React, { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  Image as ImageIcon,
  AlertCircle,
  Info,
  Lightbulb,
  BookOpen,
  Calculator,
  FileText,
  List,
  Eye,
  ChevronDown,
  ChevronUp,
  Award
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './Button';

interface CorrectAnswer {
  answer: string;
  marks?: number;
  alternative_id?: number;
  linked_alternatives?: number[];
  alternative_type?: string;
  context?: any;
  unit?: string;
  accepts_equivalent_phrasing?: boolean;
  error_carried_forward?: boolean;
  answer_requirement?: string;
}

interface QuestionOption {
  label: string;
  text: string;
  is_correct: boolean;
}

interface Attachment {
  id: string;
  url?: string;
  preview?: string;
  file_name?: string;
  file_type?: string;
}

export interface QuestionDisplayData {
  id: string;
  question_number: string;
  question_text: string;
  question_type: 'mcq' | 'tf' | 'descriptive' | 'calculation' | 'diagram' | 'essay';
  marks: number;
  difficulty?: string;
  topic?: string;
  subtopic?: string;
  answer_format?: string;
  answer_requirement?: string;
  correct_answers?: CorrectAnswer[];
  options?: QuestionOption[];
  attachments?: Attachment[];
  hint?: string;
  explanation?: string;
  requires_manual_marking?: boolean;
  marking_criteria?: string;
}

interface EnhancedQuestionDisplayProps {
  question: QuestionDisplayData;
  showAnswers?: boolean;
  showHints?: boolean;
  showExplanations?: boolean;
  showAttachments?: boolean;
  compact?: boolean;
  highlightCorrect?: boolean;
}

export const EnhancedQuestionDisplay: React.FC<EnhancedQuestionDisplayProps> = ({
  question,
  showAnswers = true,
  showHints = true,
  showExplanations = true,
  showAttachments = true,
  compact = false,
  highlightCorrect = true
}) => {
  const [expandedSections, setExpandedSections] = useState({
    hint: false,
    explanation: false,
    markingCriteria: false
  });

  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const getQuestionTypeIcon = () => {
    switch (question.question_type) {
      case 'mcq':
        return <List className="h-5 w-5 text-blue-600" />;
      case 'calculation':
        return <Calculator className="h-5 w-5 text-green-600" />;
      case 'diagram':
        return <ImageIcon className="h-5 w-5 text-purple-600" />;
      case 'essay':
        return <BookOpen className="h-5 w-5 text-indigo-600" />;
      default:
        return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  const getQuestionTypeLabel = () => {
    switch (question.question_type) {
      case 'mcq':
        return 'Multiple Choice';
      case 'tf':
        return 'True/False';
      case 'calculation':
        return 'Calculation';
      case 'diagram':
        return 'Diagram';
      case 'essay':
        return 'Essay';
      default:
        return 'Descriptive';
    }
  };

  const renderMCQOptions = () => {
    if (!question.options || question.options.length === 0) return null;

    return (
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <List className="h-4 w-4" />
          Answer Options
        </h4>
        <div className="space-y-2">
          {question.options.map((option, index) => (
            <div
              key={index}
              className={cn(
                'p-3 rounded-lg border-2 transition-all',
                showAnswers && option.is_correct && highlightCorrect
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                  : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold',
                    showAnswers && option.is_correct && highlightCorrect
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                  )}
                >
                  {option.label}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900 dark:text-white">{option.text}</p>
                </div>
                {showAnswers && option.is_correct && highlightCorrect && (
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderCorrectAnswers = () => {
    if (!showAnswers || !question.correct_answers || question.correct_answers.length === 0) {
      return null;
    }

    return (
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-600" />
          Correct Answer{question.correct_answers.length > 1 ? 's' : ''}
          {question.answer_requirement && (
            <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
              ({formatAnswerRequirement(question.answer_requirement)})
            </span>
          )}
        </h4>
        <div className="space-y-2">
          {question.correct_answers.map((answer, index) => (
            <div
              key={index}
              className="bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700 rounded-lg p-3"
            >
              <div className="flex items-start gap-3">
                <Award className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">
                    {answer.answer}
                    {answer.unit && (
                      <span className="ml-2 text-green-700 dark:text-green-300">
                        ({answer.unit})
                      </span>
                    )}
                  </p>
                  {answer.marks !== undefined && (
                    <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                      {answer.marks} mark{answer.marks !== 1 ? 's' : ''}
                    </p>
                  )}
                  {answer.accepts_equivalent_phrasing && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Equivalent phrasing accepted
                    </p>
                  )}
                  {answer.error_carried_forward && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Error carried forward applies
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderAttachments = () => {
    if (!showAttachments || !question.attachments || question.attachments.length === 0) {
      return null;
    }

    return (
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <ImageIcon className="h-4 w-4" />
          Attachments ({question.attachments.length})
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {question.attachments.map((attachment, index) => (
            <button
              key={attachment.id || index}
              onClick={() => setImagePreview(attachment.url || attachment.preview || null)}
              className="group relative aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
            >
              <img
                src={attachment.url || attachment.preview}
                alt={attachment.file_name || `Attachment ${index + 1}`}
                className="w-full h-full object-contain"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center">
                <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const formatAnswerRequirement = (requirement: string) => {
    switch (requirement) {
      case 'any_one_from':
        return 'Any one required';
      case 'any_two_from':
        return 'Any two required';
      case 'any_three_from':
        return 'Any three required';
      case 'both_required':
        return 'Both required';
      case 'all_required':
        return 'All required';
      case 'alternative_methods':
        return 'Alternative methods accepted';
      case 'acceptable_variations':
        return 'Variations accepted';
      default:
        return requirement;
    }
  };

  return (
    <div className={cn('space-y-4', compact && 'space-y-3')}>
      {/* Question Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div className="flex-shrink-0">
            {getQuestionTypeIcon()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Question {question.question_number}
              </h3>
              <span className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                {getQuestionTypeLabel()}
              </span>
              {question.difficulty && (
                <span
                  className={cn(
                    'text-xs px-2 py-1 rounded-full',
                    question.difficulty === 'Easy' && 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
                    question.difficulty === 'Medium' && 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
                    question.difficulty === 'Hard' && 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                  )}
                >
                  {question.difficulty}
                </span>
              )}
            </div>
            {(question.topic || question.subtopic) && (
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 mb-2">
                {question.topic && <span>{question.topic}</span>}
                {question.topic && question.subtopic && <span>•</span>}
                {question.subtopic && <span>{question.subtopic}</span>}
              </div>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {question.marks}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            mark{question.marks !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Question Text */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
          {question.question_text}
        </p>
      </div>

      {/* Attachments */}
      {renderAttachments()}

      {/* MCQ Options */}
      {question.question_type === 'mcq' && renderMCQOptions()}

      {/* Correct Answers */}
      {question.question_type !== 'mcq' && renderCorrectAnswers()}

      {/* Hint Section */}
      {showHints && question.hint && (
        <div className="border border-yellow-200 dark:border-yellow-800 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('hint')}
            className="w-full bg-yellow-50 dark:bg-yellow-900/20 px-4 py-3 flex items-center justify-between hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <span className="text-sm font-semibold text-yellow-900 dark:text-yellow-100">
                Hint
              </span>
            </div>
            {expandedSections.hint ? (
              <ChevronUp className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            )}
          </button>
          {expandedSections.hint && (
            <div className="bg-yellow-50 dark:bg-yellow-900/10 px-4 py-3 border-t border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-900 dark:text-yellow-100">
                {question.hint}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Explanation Section */}
      {showExplanations && question.explanation && (
        <div className="border border-blue-200 dark:border-blue-800 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('explanation')}
            className="w-full bg-blue-50 dark:bg-blue-900/20 px-4 py-3 flex items-center justify-between hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                Explanation
              </span>
            </div>
            {expandedSections.explanation ? (
              <ChevronUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            )}
          </button>
          {expandedSections.explanation && (
            <div className="bg-blue-50 dark:bg-blue-900/10 px-4 py-3 border-t border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-900 dark:text-blue-100 whitespace-pre-wrap">
                {question.explanation}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Marking Criteria */}
      {question.requires_manual_marking && question.marking_criteria && (
        <div className="border border-purple-200 dark:border-purple-800 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('markingCriteria')}
            className="w-full bg-purple-50 dark:bg-purple-900/20 px-4 py-3 flex items-center justify-between hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                Marking Criteria (Manual Marking Required)
              </span>
            </div>
            {expandedSections.markingCriteria ? (
              <ChevronUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            )}
          </button>
          {expandedSections.markingCriteria && (
            <div className="bg-purple-50 dark:bg-purple-900/10 px-4 py-3 border-t border-purple-200 dark:border-purple-800">
              <p className="text-sm text-purple-900 dark:text-purple-100 whitespace-pre-wrap">
                {question.marking_criteria}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Image Preview Modal */}
      {imagePreview && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setImagePreview(null)}
        >
          <div className="relative max-w-6xl max-h-[90vh]">
            <button
              onClick={() => setImagePreview(null)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <XCircle className="h-8 w-8" />
            </button>
            <img
              src={imagePreview}
              alt="Preview"
              className="max-w-full max-h-[90vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};
