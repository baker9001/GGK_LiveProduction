// src/app/system-admin/learning/practice-management/questions-setup/components/EnhancedQuestionCard.tsx

import React, { useState, useCallback } from 'react';
import {
  Edit2, Eye, PlayCircle, CheckCircle, XCircle, AlertTriangle,
  Trash2, MoreVertical, FileText, Award, ChevronDown, ChevronUp
} from 'lucide-react';
import { QuestionViewer, QuestionData, QuestionMode, UserResponse, ValidationReport, UploadedAttachment } from '../../../../../../components/shared/questions/QuestionViewer';
import { MarkingSimulationPanel } from '../../../../../../components/shared/questions/MarkingSimulationPanel';
import { Button } from '../../../../../../components/shared/Button';
import { cn } from '../../../../../../lib/utils';
import { toast } from '../../../../../../components/shared/Toast';
import type { Question, SubQuestion } from '../page';

interface EnhancedQuestionCardProps {
  question: Question;
  index: number;
  mode?: QuestionMode;
  onUpdate?: (question: Question) => void;
  onDelete?: (question: Question) => void;
  onSimulate?: (question: Question) => void;
  showModeToggle?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export const EnhancedQuestionCard: React.FC<EnhancedQuestionCardProps> = ({
  question,
  index,
  mode: initialMode = 'review',
  onUpdate,
  onDelete,
  onSimulate,
  showModeToggle = true,
  isExpanded = false,
  onToggleExpand
}) => {
  const [currentMode, setCurrentMode] = useState<QuestionMode>(initialMode);
  const [showActions, setShowActions] = useState(false);
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);

  // Convert Question to QuestionData format
  const convertToQuestionData = useCallback((): QuestionData => {
    return {
      id: question.id,
      question_number: question.question_number,
      type: question.type === 'mcq' ? 'mcq' :
            question.type === 'tf' ? 'true_false' : 'structured',
      subject: undefined, // Extract from metadata if available
      marks: question.marks,
      question_text: question.question_description,
      options: question.options?.map(opt => ({
        label: opt.id,
        text: opt.option_text,
        is_correct: opt.is_correct
      })),
      attachments: question.attachments?.map(att => ({
        id: att.id,
        name: att.file_name,
        url: att.file_url,
        type: att.file_type,
        size: att.file_size
      })),
      parts: question.parts?.map(part => ({
        part: part.part_label,
        question_text: part.question_description,
        answer_format: 'single_line', // This should be detected or stored
        marks: part.marks,
        correct_answers: [],
        hint: part.hint,
        explanation: part.explanation
      })),
      hint: question.hint,
      explanation: question.explanation,
      topic: question.topic_name,
      subtopic: question.subtopics?.[0]?.name,
      meta: {
        difficulty: question.difficulty,
        category: question.category,
        status: question.status
      }
    };
  }, [question]);

  const questionData = convertToQuestionData();

  const handleQuestionUpdate = useCallback((updated: QuestionData) => {
    // Convert back to Question format and call onUpdate
    if (onUpdate) {
      const updatedQuestion: Question = {
        ...question,
        question_description: updated.question_text || '',
        marks: updated.marks || 0,
        hint: updated.hint,
        explanation: updated.explanation
      };
      onUpdate(updatedQuestion);
      toast.success('Question updated successfully');
    }
  }, [question, onUpdate]);

  const handleValidation = useCallback((report: ValidationReport) => {
    setValidationReport(report);
  }, []);

  const handleAnswerChange = useCallback((response: UserResponse) => {
    console.log('Student response:', response);
  }, []);

  const handleAttachmentsChange = useCallback((attachments: UploadedAttachment[]) => {
    // Handle attachment changes
    console.log('Attachments changed:', attachments);
  }, []);

  const handleRevealMarkScheme = useCallback(() => {
    toast.info('Mark scheme revealed for QA review');
  }, []);

  const handleModeChange = (newMode: QuestionMode) => {
    setCurrentMode(newMode);
    if (newMode === 'simulation' && onSimulate) {
      onSimulate(question);
    }
  };

  const getStatusColor = () => {
    if (!validationReport) return 'gray';
    if (validationReport.errors.length > 0) return 'red';
    if (validationReport.warnings.length > 0) return 'yellow';
    return 'green';
  };

  const statusColor = getStatusColor();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-all">
      {/* Card Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-gray-400 dark:text-gray-500">
                {index + 1}
              </span>
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">
                  Question {question.question_number}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <span>{question.marks} mark{question.marks !== 1 ? 's' : ''}</span>
                  <span>•</span>
                  <span className="capitalize">{question.type}</span>
                  {question.difficulty && (
                    <>
                      <span>•</span>
                      <span className="capitalize">{question.difficulty}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Validation Status Indicator */}
            {validationReport && (
              <div className={cn(
                'flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium',
                statusColor === 'green' && 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
                statusColor === 'yellow' && 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
                statusColor === 'red' && 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
              )}>
                {statusColor === 'green' && <CheckCircle className="h-3 w-3" />}
                {statusColor === 'yellow' && <AlertTriangle className="h-3 w-3" />}
                {statusColor === 'red' && <XCircle className="h-3 w-3" />}
                {statusColor === 'green' && 'Valid'}
                {statusColor === 'yellow' && `${validationReport.warnings.length} warning(s)`}
                {statusColor === 'red' && `${validationReport.errors.length} error(s)`}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Toggle */}
            {showModeToggle && (
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => handleModeChange('review')}
                  className={cn(
                    'px-3 py-1 rounded text-xs font-medium transition-colors',
                    currentMode === 'review'
                      ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  )}
                  title="Review & Edit Mode"
                >
                  <Edit2 className="h-3 w-3 inline mr-1" />
                  Review
                </button>
                <button
                  onClick={() => handleModeChange('simulation')}
                  className={cn(
                    'px-3 py-1 rounded text-xs font-medium transition-colors',
                    currentMode === 'simulation'
                      ? 'bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  )}
                  title="QA Simulation Mode"
                >
                  <PlayCircle className="h-3 w-3 inline mr-1" />
                  Simulate
                </button>
                <button
                  onClick={() => handleModeChange('student')}
                  className={cn(
                    'px-3 py-1 rounded text-xs font-medium transition-colors',
                    currentMode === 'student'
                      ? 'bg-white dark:bg-gray-800 text-green-600 dark:text-green-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  )}
                  title="Student View Mode"
                >
                  <Eye className="h-3 w-3 inline mr-1" />
                  Student
                </button>
              </div>
            )}

            {/* Actions Menu */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowActions(!showActions)}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
              {showActions && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
                  <button
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                    onClick={() => {
                      onSimulate?.(question);
                      setShowActions(false);
                    }}
                  >
                    <PlayCircle className="h-4 w-4" />
                    Test in Simulation
                  </button>
                  {onDelete && (
                    <button
                      className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                      onClick={() => {
                        onDelete(question);
                        setShowActions(false);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Question
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Expand/Collapse Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleExpand}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Question Content (Collapsible) */}
      {isExpanded && (
        <div className="p-6">
          <QuestionViewer
            question={questionData}
            mode={currentMode}
            subject={questionData.subject}
            examBoard={questionData.exam_board}
            editable={currentMode === 'review'}
            onUpdate={handleQuestionUpdate}
            onAnswerChange={handleAnswerChange}
            onValidate={handleValidation}
            onAttachmentsChange={handleAttachmentsChange}
            onRevealMarkScheme={handleRevealMarkScheme}
          />
        </div>
      )}
    </div>
  );
};

export default EnhancedQuestionCard;
