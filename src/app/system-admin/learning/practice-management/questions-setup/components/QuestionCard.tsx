// src/app/system-admin/learning/practice-management/questions-setup/components/QuestionCard.tsx
import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Trash2,
  CheckCircle,
  AlertCircle,
  Plus,
  HelpCircle,
  BookOpen,
  FileText
} from 'lucide-react';
import { Button } from '../../../../../../components/shared/Button';
import { StatusBadge } from '../../../../../../components/shared/StatusBadge';
import { EditableField, EditableOption } from './EditableField';
import { AttachmentManager } from './AttachmentManager';
import { CorrectAnswersDisplay } from './CorrectAnswersDisplay';
import { Question, SubQuestion } from '../page';
import { useQuestionMutations } from '../hooks/useQuestionMutations';
import { useQuestionValidation } from '../hooks/useQuestionValidation';
import { cn } from '../../../../../../lib/utils';
import { supabase } from '../../../../../../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '../../../../../../components/shared/Toast';
import {
  getDifficultyClassName,
  getQuestionStatusLabel,
  questionNeedsAttachment,
  subQuestionNeedsAttachment
} from '../utils/questionHelpers';

interface QuestionCardProps {
  question: Question;
  questionIndex: number;
  topics: { id: string; name: string }[];
  subtopics: { id: string; name: string; topic_id: string }[];
  units?: { id: string; name: string }[];
  onDelete: (question: Question) => void;
  onDeleteSubQuestion: (subQuestion: SubQuestion) => void;
  onConfirm?: (questionId: string) => void;
  showQAActions?: boolean;
  readOnly?: boolean;
}

export function QuestionCard({
  question,
  questionIndex: _questionIndex,
  topics,
  subtopics,
  units = [],
  onDelete,
  onDeleteSubQuestion,
  onConfirm,
  showQAActions = false,
  readOnly = false
}: QuestionCardProps) {
  const [isExpanded, setIsExpanded] = useState(true); // Expand/collapse entire card
  const [expandedParts, setExpandedParts] = useState(true); // Default to expanded for better UX
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  
  const queryClient = useQueryClient();
  const { updateField, updateSubtopics, updateCorrectAnswers } = useQuestionMutations();
  const { validateForConfirmation } = useQuestionValidation();
  
  // Get validation status
  const validation = validateForConfirmation(question);
  const hasValidationErrors = !validation.isValid;
  
  // Check if question or any sub-question needs attachments (has figure)
  const needsAttachmentWarning = questionNeedsAttachment(question);
  
  // Filter subtopics based on selected topic
  const availableSubtopics = question.topic_id
    ? subtopics.filter(s => s.topic_id === question.topic_id)
    : [];

  // Get current subtopic IDs from the question data
  const currentSubtopicIds = question.subtopics?.map(s => s.id) || [];

  const qaChecklist = [
    {
      label: 'Description added',
      complete: Boolean(question.question_description?.trim())
    },
    {
      label: 'Marks set',
      complete: question.marks > 0
    },
    {
      label: 'Difficulty selected',
      complete: Boolean(question.difficulty)
    },
    {
      label: 'Topic & subtopics tagged',
      complete: Boolean(question.topic_id) && currentSubtopicIds.length > 0
    },
    {
      label: 'Hint provided',
      complete: Boolean(question.hint?.trim())
    },
    {
      label: 'Explanation provided',
      complete: Boolean(question.explanation?.trim())
    },
    {
      label: 'Attachments ready',
      complete: !needsAttachmentWarning
    }
  ];

  const completedChecklistItems = qaChecklist.filter(item => item.complete).length;
  const qaProgress = Math.round((completedChecklistItems / qaChecklist.length) * 100);
  const confirmBlocked = hasValidationErrors || needsAttachmentWarning;
  
  const getAnswerFormatLabel = (format: string) => {
    const formats: Record<string, string> = {
      'single_word': 'Single Word',
      'single_line': 'Single Line',
      'two_items': 'Two Items',
      'two_items_connected': 'Two Connected Items',
      'multi_line': 'Multiple Lines',
      'multi_line_labeled': 'Multiple Labeled Lines',
      'calculation': 'Calculation',
      'equation': 'Equation',
      'diagram': 'Diagram',
      'structural_diagram': 'Structural Diagram'
    };
    return formats[format] || format;
  };
  
  const handleFieldUpdate = async (field: string, value: any) => {
    // If topic is being changed, auto-populate unit_id
    if (field === 'topic_id' && value) {
      const selectedTopic = topics.find(t => t.id === value);
      if (selectedTopic && 'unit_id' in selectedTopic) {
        // Update both topic_id and unit_id
        await updateField.mutateAsync({
          id: question.id,
          isSubQuestion: false,
          field: 'topic_id',
          value
        });
        await updateField.mutateAsync({
          id: question.id,
          isSubQuestion: false,
          field: 'unit_id',
          value: (selectedTopic as any).unit_id
        });
        return;
      }
    }

    await updateField.mutateAsync({
      id: question.id,
      isSubQuestion: false,
      field,
      value
    });
  };
  
  const handleSubQuestionFieldUpdate = async (subQuestionId: string, field: string, value: any) => {
    await updateField.mutateAsync({
      id: subQuestionId,
      isSubQuestion: true,
      field,
      value
    });
  };
  
  const handleSubtopicsUpdate = async (subtopicIds: string[]) => {
    await updateSubtopics.mutateAsync({
      questionId: question.id,
      subtopicIds
    });
  };
  
  const handleAddOption = async (questionId: string, isSubQuestion: boolean = false) => {
    try {
      // Get current options count to determine the next label
      const currentOptions = isSubQuestion 
        ? question.parts.find(p => p.id === questionId)?.options || []
        : question.options || [];
      
      const nextLabel = String.fromCharCode(65 + currentOptions.length); // A, B, C, etc.
      
      const newOption = {
        [isSubQuestion ? 'sub_question_id' : 'question_id']: questionId,
        option_text: 'New option',
        text: 'New option', // Add both fields
        label: nextLabel,
        is_correct: false,
        order: currentOptions.length
      };
      
      const { data, error } = await supabase
        .from('question_options')
        .insert(newOption)
        .select()
        .single();
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      toast.success('Option added successfully');
    } catch (error) {
      console.error('Error adding option:', error);
      toast.error('Failed to add option');
    }
  };
  
  const handleDeleteOption = async (optionId: string) => {
    try {
      const { error } = await supabase
        .from('question_options')
        .delete()
        .eq('id', optionId);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      toast.success('Option deleted successfully');
    } catch (error) {
      console.error('Error deleting option:', error);
      toast.error('Failed to delete option');
    }
  };
  
  const handleOptionTextUpdate = async (optionId: string, text: string) => {
    try {
      // Update both fields to maintain compatibility
      const { error } = await supabase
        .from('question_options')
        .update({ 
          option_text: text,
          text: text 
        })
        .eq('id', optionId);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['questions'] });
    } catch (error) {
      console.error('Error updating option text:', error);
      toast.error('Failed to update option text');
    }
  };
  
  const handleOptionCorrectToggle = async (optionId: string) => {
    try {
      // First, get the current option and its question/sub_question id
      const { data: currentOption, error: fetchError } = await supabase
        .from('question_options')
        .select('question_id, sub_question_id, is_correct')
        .eq('id', optionId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // If it's already correct, just toggle it off
      if (currentOption.is_correct) {
        const { error } = await supabase
          .from('question_options')
          .update({ is_correct: false })
          .eq('id', optionId);
        
        if (error) throw error;
      } else {
        // If making it correct, first set all other options to false
        if (currentOption.question_id) {
          const { error: resetError } = await supabase
            .from('question_options')
            .update({ is_correct: false })
            .eq('question_id', currentOption.question_id)
            .is('sub_question_id', null);
          
          if (resetError) throw resetError;
        } else if (currentOption.sub_question_id) {
          const { error: resetError } = await supabase
            .from('question_options')
            .update({ is_correct: false })
            .eq('sub_question_id', currentOption.sub_question_id)
            .is('question_id', null);
          
          if (resetError) throw resetError;
        }
        
        // Then set this option to correct
        const { error } = await supabase
          .from('question_options')
          .update({ is_correct: true })
          .eq('id', optionId);
        
        if (error) throw error;
      }
      
      queryClient.invalidateQueries({ queryKey: ['questions'] });
    } catch (error) {
      console.error('Error updating option correct status:', error);
      toast.error('Failed to update correct answer');
    }
  };
  
  const handleSubQuestionSubtopicsUpdate = async (subQuestionId: string, subtopicIds: string[]) => {
    try {
      // First, delete existing subtopic relationships
      const { error: deleteError } = await supabase
        .from('question_subtopics')
        .delete()
        .eq('sub_question_id', subQuestionId);
      
      if (deleteError) throw deleteError;
      
      // Then insert new ones
      if (subtopicIds.length > 0) {
        const subtopicRecords = subtopicIds.map(id => ({
          sub_question_id: subQuestionId,
          subtopic_id: id
        }));
        
        const { error: insertError } = await supabase
          .from('question_subtopics')
          .insert(subtopicRecords);
        
        if (insertError) throw insertError;
      }
      
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      toast.success('Subtopics updated successfully');
    } catch (error) {
      console.error('Error updating subtopics:', error);
      toast.error('Failed to update subtopics');
    }
  };

  const handleConfirmCurrentQuestion = () => {
    if (!onConfirm) return;

    if (hasValidationErrors) {
      setShowValidationErrors(true);
      toast.error('Please resolve validation issues before marking this question complete');
      return;
    }

    if (needsAttachmentWarning) {
      toast.error('Upload the required figure or diagram before marking this question complete');
      return;
    }

    onConfirm(question.id);
  };
  
  return (
    <div
      id={`question-${question.id}`}
      className={cn(
        'rounded-2xl border overflow-hidden bg-white/95 dark:bg-gray-900/80 shadow-sm transition-all duration-300 backdrop-blur-sm',
        needsAttachmentWarning && showQAActions
          ? 'border-amber-300/80 dark:border-amber-500/70 ring-1 ring-amber-200/60 dark:ring-amber-500/30'
          : 'border-gray-200 dark:border-gray-700 hover:shadow-lg dark:shadow-gray-900/20'
      )}
    >
      {/* Question Header - Clickable to expand/collapse */}
      <div
        className="px-6 py-5 bg-gradient-to-r from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 flex flex-col gap-4 border-b border-gray-200 dark:border-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex flex-1 flex-wrap items-center gap-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="flex items-center justify-center w-12 h-12 rounded-xl border border-[#8CC63F]/30 bg-[#8CC63F]/10 text-[#356B1B] dark:text-[#A6E36A] dark:bg-[#8CC63F]/20 hover:bg-[#8CC63F]/20 transition-colors"
            aria-label={isExpanded ? 'Collapse question' : 'Expand question'}
          >
            {isExpanded ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </button>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              Question {question.question_number}
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              {question.parts.length > 0 && (
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {question.parts.length} part{question.parts.length !== 1 ? 's' : ''}
                </span>
              )}
              {(question.unit_name || question.topic_name || (question.subtopics && question.subtopics.length > 0)) && (
                <span className="text-gray-400 dark:text-gray-500">•</span>
              )}
              {question.unit_name && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Unit: {question.unit_name}
                </span>
              )}
              {question.topic_name && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  Topic: {question.topic_name}
                </span>
              )}
              {question.subtopics && question.subtopics.length > 0 && (
                <>
                  {question.subtopics.map((subtopic) => (
                    <span
                      key={subtopic.id}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300 border border-teal-200 dark:border-teal-800"
                    >
                      {subtopic.name}
                    </span>
                  ))}
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge
              status={question.status}
              showIcon
              label={getQuestionStatusLabel(question.status)}
              className="px-3 py-1 text-xs font-semibold"
            />
            {hasValidationErrors && (
              <span className="inline-flex items-center gap-1 rounded-full border border-rose-300/60 bg-rose-100/80 px-3 py-1 text-xs font-medium text-rose-700 dark:border-rose-500/60 dark:bg-rose-500/10 dark:text-rose-200">
                <AlertCircle className="h-3.5 w-3.5" />
                Incomplete
              </span>
            )}
            {needsAttachmentWarning && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/60 bg-amber-100/80 px-3 py-1 text-xs font-medium text-amber-800 dark:border-amber-500/60 dark:bg-amber-500/10 dark:text-amber-200">
                <AlertCircle className="h-3.5 w-3.5" />
                Figure required
              </span>
            )}
            {question.attachments && question.attachments.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-blue-300/60 bg-blue-100/80 px-3 py-1 text-xs font-medium text-blue-800 dark:border-blue-500/60 dark:bg-blue-500/10 dark:text-blue-200">
                <FileText className="h-3.5 w-3.5" />
                {question.attachments.length} attachment{question.attachments.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        
          <div className="flex items-center space-x-3">
            <div className="flex items-center gap-2">
              {showQAActions && question.status === 'active' && (
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/60 bg-emerald-100/80 px-4 py-1.5 text-sm font-semibold text-emerald-700 dark:border-emerald-500/60 dark:bg-emerald-500/10 dark:text-emerald-200">
                  <CheckCircle className="h-4 w-4" /> QA complete
                </span>
              )}

            {!readOnly && (
              <Button
                size="icon-sm"
                variant="ghost"
                rounded="full"
                className="text-rose-500 hover:text-rose-600 hover:bg-rose-100/70 dark:text-rose-300 dark:hover:text-rose-200 dark:hover:bg-rose-500/10"
                onClick={() => onDelete(question)}
                tooltip="Delete question"
                leftIcon={<Trash2 className="h-4 w-4" />}
              />
            )}

            {question.parts.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="text-gray-600 hover:text-[#8CC63F] dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => setExpandedParts(!expandedParts)}
                leftIcon={expandedParts ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              >
                {expandedParts ? 'Hide' : 'Show'} parts
              </Button>
            )}
          </div>
          
        </div>
      </div>

      {showQAActions && (
        <div className="px-6 pb-6 pt-4 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-white via-gray-50 to-gray-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">QA progress</div>
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {completedChecklistItems}/{qaChecklist.length} checks complete
              </div>
            </div>
            <div>
              <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500 dark:bg-emerald-400"
                  style={{ width: `${qaProgress}%` }}
                />
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {qaChecklist.map(item => (
                  <div
                    key={item.label}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors',
                      item.complete
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-600/60 dark:bg-emerald-900/20 dark:text-emerald-200'
                        : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-600/60 dark:bg-amber-900/20 dark:text-amber-200'
                    )}
                  >
                    {item.complete ? (
                      <CheckCircle className="h-3.5 w-3.5" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5" />
                    )}
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
            {confirmBlocked && (
              <p className="text-xs text-amber-600 dark:text-amber-300">
                Resolve the highlighted checklist items above before marking this question complete.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Enhanced Question Metadata */}
      <div className="bg-gray-50 dark:bg-gray-800 p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-6 gap-8">
          <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600 shadow-sm">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2 bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">
              Type
            </label>
            <span className="text-base font-medium text-gray-900 dark:text-white capitalize">
              {question.type}
            </span>
          </div>
          
          <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600 shadow-sm">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2 bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">
              Marks
            </label>
            <EditableField
              value={question.marks}
              onSave={(value) => handleFieldUpdate('marks', value)}
              type="number"
              min={1}
              required
              disabled={readOnly}
              className="text-base font-medium text-gray-900 dark:text-white"
            />
          </div>
          
          <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600 shadow-sm">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2 bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">
              Difficulty
            </label>
            <EditableField
              value={question.difficulty}
              onSave={(value) => handleFieldUpdate('difficulty', value)}
              type="select"
              options={[
                { value: 'easy', label: 'Easy' },
                { value: 'medium', label: 'Medium' },
                { value: 'hard', label: 'Hard' }
              ]}
              displayValue={
                <span className={cn("px-3 py-1 rounded-full text-sm font-medium", getDifficultyClassName(question.difficulty))}>
                  {question.difficulty}
                </span>
              }
              required
              disabled={readOnly}
            />
          </div>
          
          <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600 shadow-sm">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2 bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">
              Unit
            </label>
            <EditableField
              value={question.unit_id}
              onSave={(value) => handleFieldUpdate('unit_id', value)}
              type="select"
              options={units.map(unit => ({ value: unit.id, label: unit.name }))}
              displayValue={
                <span className="text-base font-medium text-gray-900 dark:text-white">
                  {units.find(unit => unit.id === question.unit_id)?.name || question.unit_name || 'Select unit...'}
                </span>
              }
              placeholder="Select unit..."
              disabled={readOnly || units.length === 0}
            />
          </div>
          
          <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600 shadow-sm">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2 bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">
              Topic
            </label>
            <EditableField
              value={question.topic_id}
              onSave={(value) => handleFieldUpdate('topic_id', value)}
              type="select"
              options={topics.map(t => ({ value: t.id, label: t.name }))}
              displayValue={
                <span className="text-base font-medium text-gray-900 dark:text-white">
                  {topics.find(t => t.id === question.topic_id)?.name || 'Select topic...'}
                </span>
              }
              required
              disabled={readOnly}
            />
          </div>
          
          <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600 shadow-sm">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2 bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">
              Status
            </label>
            <StatusBadge
              status={question.status}
              label={getQuestionStatusLabel(question.status)}
              className="text-sm px-3 py-1"
            />
          </div>
        </div>
        
        {/* Answer Format Display */}
        {question.answer_format && (
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="bg-white dark:bg-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600 shadow-sm">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3 bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded inline-block">
                Answer Format
              </label>
              <span className="block text-base font-medium text-gray-900 dark:text-white">
                {getAnswerFormatLabel(question.answer_format)}
              </span>
            </div>
          </div>
        )}
        
        {/* Subtopics Section */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="bg-white dark:bg-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600 shadow-sm">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3 bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded inline-block">
              Subtopics
            </label>
            <EditableField
              value={currentSubtopicIds}
              onSave={handleSubtopicsUpdate}
              type="multiselect"
              options={availableSubtopics.map(s => ({ value: s.id, label: s.name }))}
              placeholder="Select subtopics..."
              required
              disabled={readOnly || !question.topic_id}
              className="text-base text-gray-900 dark:text-white"
            />
          </div>
        </div>
      </div>
      
      {/* Validation Errors */}
      {isExpanded && showValidationErrors && hasValidationErrors && (
        <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 p-4">
          <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
            Please fix the following issues before confirming:
          </h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-red-700 dark:text-red-300">
            {validation.errors.map((error, index) => (
              <li key={index}>{error.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Question Content - Only show when expanded */}
      {isExpanded && (
      <div className="p-6 animate-in fade-in duration-200">
        <div className="mb-8">
          <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center">
            <FileText className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
            Question Description:
          </h4>
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-700 p-6 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm">
              <EditableField
                value={question.question_description}
                onSave={(value) => handleFieldUpdate('question_description', value)}
                type="richtext"
                minLength={10}
                required
                disabled={readOnly}
                className="text-base leading-relaxed text-gray-900 dark:text-white"
              />
            </div>
            
            {/* Attachment warning for QA */}
            {needsAttachmentWarning && showQAActions && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-red-800 dark:text-red-200">Figure/Diagram Required</p>
                    <p className="text-red-700 dark:text-red-300 mt-1">
                      This question mentions a figure, diagram, or image. Please upload the required attachment before confirming.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Attachments Manager - Updated without pdfDataUrl and onPdfUpload */}
        <div className={cn(
          "mb-8 border rounded-xl p-6 bg-gray-50 dark:bg-gray-800/50 shadow-sm",
          needsAttachmentWarning && showQAActions
            ? "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10"
            : "border-gray-200 dark:border-gray-700"
        )}>
          <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Attachments:
          </h4>
          <AttachmentManager
            attachments={question.attachments}
            questionId={question.id}
            onUpdate={() => queryClient.invalidateQueries({ queryKey: ['questions'] })}
            readOnly={readOnly}
            questionDescription={question.question_description}
          />
        </div>
        
        {/* Options for MCQ/TF */}
        {(question.type === 'mcq' || question.type === 'tf') && question.options && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center">
                <CheckCircle className="h-5 w-5 mr-2 text-green-600 dark:text-green-400" />
                Options:
              </h4>
              {!readOnly && question.type === 'mcq' && (
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Plus className="h-3 w-3" />}
                  onClick={() => handleAddOption(question.id)}
                >
                  Add Option
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {question.options.sort((a, b) => a.order - b.order).map((option, index) => (
                <EditableOption
                  key={option.id}
                  option={{
                    ...option,
                    // Ensure both text fields are available
                    text: option.text || option.option_text || '',
                    option_text: option.option_text || option.text || '',
                    label: option.label || String.fromCharCode(65 + index)
                  }}
                  index={index}
                  onUpdateText={(text) => handleOptionTextUpdate(option.id, text)}
                  onToggleCorrect={() => handleOptionCorrectToggle(option.id)}
                  onDelete={() => handleDeleteOption(option.id)}
                  disabled={readOnly}
                  showDelete={!readOnly && question.options.length > 1}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* Correct Answers Display */}
        {(question.correct_answer || question.correct_answers) && (
          <div className="mb-8">
            <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 text-green-600 dark:text-green-400" />
              Correct Answer{question.correct_answers && question.correct_answers.length > 1 ? 's' : ''}:
            </h4>
            <CorrectAnswersDisplay
              correctAnswer={question.correct_answer}
              correctAnswers={question.correct_answers}
              answerRequirement={question.answer_requirement}
              totalAlternatives={question.total_alternatives}
              questionType={question.type}
              readOnly={readOnly}
              onUpdate={updateCorrectAnswers ? (answers) => updateCorrectAnswers.mutateAsync({
                questionId: question.id,
                isSubQuestion: false,
                correctAnswers: answers
              }) : undefined}
            />
          </div>
        )}
        
        {/* Hint and Explanation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center">
              <HelpCircle className="h-5 w-5 mr-2" />
              Hint:
            </h4>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl border border-blue-200 dark:border-blue-800 shadow-sm">
              <EditableField
                value={question.hint || ''}
                onSave={(value) => handleFieldUpdate('hint', value)}
                type="richtext"
                placeholder="Add a hint to help students..."
                minLength={5}
                required
                disabled={readOnly}
                className="text-base leading-relaxed text-gray-900 dark:text-white"
              />
            </div>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center">
              <BookOpen className="h-5 w-5 mr-2" />
              Explanation:
            </h4>
            <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-xl border border-purple-200 dark:border-purple-800 shadow-sm">
              <EditableField
                value={question.explanation || ''}
                onSave={(value) => handleFieldUpdate('explanation', value)}
                type="richtext"
                placeholder="Explain the correct answer..."
                minLength={10}
                required
                disabled={readOnly}
                className="text-base leading-relaxed text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

      </div>
      )}

      {isExpanded && showQAActions && (
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-5 dark:border-gray-700 dark:bg-gray-900/40">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Publish readiness</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {question.status === 'active'
                  ? 'This question is QA complete and ready to be included when the paper is published.'
                  : 'Finish the checklist requirements above, then mark this question as QA complete to include it in publishing.'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {question.status !== 'active' && onConfirm && (
                <Button
                  size="sm"
                  onClick={handleConfirmCurrentQuestion}
                  disabled={confirmBlocked}
                  title={
                    confirmBlocked
                      ? 'Complete the checklist items before marking QA complete'
                      : 'Mark this question as QA complete'
                  }
                  leftIcon={<CheckCircle className="h-4 w-4" />}
                >
                  Mark QA Complete
                </Button>
              )}
              {question.status === 'active' && (
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/60 bg-emerald-100/80 px-4 py-1.5 text-sm font-semibold text-emerald-700 dark:border-emerald-500/60 dark:bg-emerald-500/10 dark:text-emerald-200">
                  <CheckCircle className="h-4 w-4" /> Ready for publish
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sub-questions */}
      {question.parts.length > 0 && (
        <div className={cn(
          "border-t border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300",
          expandedParts ? "max-h-[100000px] p-6 bg-gray-50 dark:bg-gray-800/30" : "max-h-0"
        )}>
          <div className="space-y-4">
            {question.parts.map((subQuestion) => {
              const subNeedsAttachmentWarning = subQuestionNeedsAttachment(subQuestion);

              return (
                <div
                  key={subQuestion.id}
                  className={cn(
                    'rounded-xl border overflow-hidden bg-white/95 dark:bg-gray-900/70 shadow-sm transition-all duration-200',
                    subNeedsAttachmentWarning && showQAActions
                      ? 'border-amber-300/70 dark:border-amber-500/60 ring-1 ring-amber-200/50 dark:ring-amber-500/20'
                      : 'border-gray-200 dark:border-gray-700'
                  )}
                >
                  <div className="flex flex-col gap-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-100 via-white to-gray-50 px-4 py-3 dark:from-gray-800 dark:via-gray-900 dark:to-gray-900">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center justify-center w-9 h-9 rounded-lg border border-blue-200/70 bg-blue-100/70 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-200">
                        <span className="text-sm font-semibold">{subQuestion.part_label?.slice(-1) || 'A'}</span>
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {subQuestion.part_label}
                      </span>
                      <StatusBadge
                        status={subQuestion.status}
                        label={getQuestionStatusLabel(subQuestion.status)}
                        size="xs"
                        showIcon
                        className="px-2.5"
                      />
                      <span className="rounded-md bg-white/70 px-2 py-1 text-sm font-medium text-gray-600 dark:bg-gray-900/60 dark:text-gray-300">
                        {subQuestion.marks} mark{subQuestion.marks !== 1 ? 's' : ''}
                      </span>
                      {subQuestion.answer_format && (
                        <span className="rounded-md bg-blue-100/80 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">
                          {getAnswerFormatLabel(subQuestion.answer_format)}
                        </span>
                      )}
                      {subNeedsAttachmentWarning && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/60 bg-amber-100/70 px-3 py-1 text-xs font-semibold text-amber-800 dark:border-amber-500/50 dark:bg-amber-500/10 dark:text-amber-200">
                          <AlertCircle className="h-3.5 w-3.5" /> Figure required
                        </span>
                      )}
                    </div>

                    {!readOnly && (
                      <div className="flex items-center justify-end">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          rounded="full"
                          className="text-rose-500 hover:text-rose-600 hover:bg-rose-100/70 dark:text-rose-300 dark:hover:text-rose-200 dark:hover:bg-rose-500/10"
                          onClick={() => onDeleteSubQuestion(subQuestion)}
                          leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                          tooltip="Remove part"
                        />
                      </div>
                    )}
                  </div>
                
                <div className="p-6 space-y-4">
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                    <EditableField
                      value={subQuestion.question_description}
                      onSave={(value) => handleSubQuestionFieldUpdate(subQuestion.id, 'question_description', value)}
                      type="richtext"
                      minLength={10}
                      required
                      disabled={readOnly}
                      className="text-base leading-relaxed text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  {/* Sub-question attachment warning */}
                  {subNeedsAttachmentWarning && showQAActions && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3">
                      <p className="text-sm text-red-700 dark:text-red-300 flex items-center">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Figure/diagram required for this part
                      </p>
                    </div>
                  )}
                  
                  {/* Sub-question metadata */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded inline-block">
                        Marks
                      </label>
                      <div className="bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600">
                        <EditableField
                          value={subQuestion.marks}
                          onSave={(value) => handleSubQuestionFieldUpdate(subQuestion.id, 'marks', value)}
                          type="number"
                          min={1}
                          required
                          disabled={readOnly}
                          className="text-sm font-medium text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded inline-block">
                        Difficulty
                      </label>
                      <div className="bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600">
                        <EditableField
                          value={subQuestion.difficulty || 'medium'}
                          onSave={(value) => handleSubQuestionFieldUpdate(subQuestion.id, 'difficulty', value)}
                          type="select"
                          options={[
                            { value: 'easy', label: 'Easy' },
                            { value: 'medium', label: 'Medium' },
                            { value: 'hard', label: 'Hard' }
                          ]}
                          displayValue={
                            <span className={cn(
                              "px-2 py-1 rounded-full text-xs font-medium",
                              getDifficultyClassName(subQuestion.difficulty || 'medium')
                            )}>
                              {subQuestion.difficulty || 'medium'}
                            </span>
                          }
                          disabled={readOnly}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded inline-block">
                        Topic
                      </label>
                      <div className="bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600">
                        <EditableField
                          value={subQuestion.topic_id}
                          onSave={(value) => handleSubQuestionFieldUpdate(subQuestion.id, 'topic_id', value)}
                          type="select"
                          options={topics.map(t => ({ value: t.id, label: t.name }))}
                          displayValue={
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {topics.find(t => t.id === subQuestion.topic_id)?.name || 'Select...'}
                            </span>
                          }
                          disabled={readOnly}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Sub-question subtopics */}
                  {subQuestion.topic_id && (
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded inline-block">
                        Subtopics
                      </label>
                      <div className="bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600">
                        <EditableField
                          value={subQuestion.subtopics?.map(s => s.id) || []}
                          onSave={(subtopicIds) => handleSubQuestionSubtopicsUpdate(subQuestion.id, subtopicIds)}
                          type="multiselect"
                          options={subtopics.filter(s => s.topic_id === subQuestion.topic_id).map(s => ({ value: s.id, label: s.name }))}
                          placeholder="Select subtopics..."
                          disabled={readOnly || !subQuestion.topic_id}
                          className="text-sm text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Sub-question options for MCQ */}
                  {subQuestion.type === 'mcq' && subQuestion.options && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Options:</span>
                        {!readOnly && (
                          <Button
                            size="sm"
                            variant="outline"
                            leftIcon={<Plus className="h-3 w-3" />}
                            onClick={() => handleAddOption(subQuestion.id, true)}
                          >
                            Add
                          </Button>
                        )}
                      </div>
                      <div className="space-y-1">
                        {subQuestion.options.sort((a, b) => a.order - b.order).map((option, index) => (
                          <EditableOption
                            key={option.id}
                            option={{
                              ...option,
                              // Ensure both text fields are available
                              text: option.text || option.option_text || '',
                              option_text: option.option_text || option.text || '',
                              label: option.label || String.fromCharCode(65 + index)
                            }}
                            index={index}
                            onUpdateText={(text) => handleOptionTextUpdate(option.id, text)}
                            onToggleCorrect={() => handleOptionCorrectToggle(option.id)}
                            onDelete={() => handleDeleteOption(option.id)}
                            disabled={readOnly}
                            showDelete={!readOnly && subQuestion.options.length > 1}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Sub-question correct answers */}
                  {(subQuestion.correct_answer || subQuestion.correct_answers) && (
                    <div className="space-y-3">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Correct Answer{subQuestion.correct_answers && subQuestion.correct_answers.length > 1 ? 's' : ''}:</span>
                      <CorrectAnswersDisplay
                        correctAnswer={subQuestion.correct_answer}
                        correctAnswers={subQuestion.correct_answers}
                        answerRequirement={subQuestion.answer_requirement}
                        totalAlternatives={subQuestion.total_alternatives}
                        questionType={subQuestion.type}
                        readOnly={readOnly}
                        onUpdate={updateCorrectAnswers ? (answers) => updateCorrectAnswers.mutateAsync({
                          questionId: subQuestion.id,
                          isSubQuestion: true,
                          correctAnswers: answers
                        }) : undefined}
                      />
                    </div>
                  )}
                  
                  {/* Sub-question hint and explanation */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded inline-block">
                        Hint
                      </label>
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                        <EditableField
                          value={subQuestion.hint || ''}
                          onSave={(value) => handleSubQuestionFieldUpdate(subQuestion.id, 'hint', value)}
                          type="richtext"
                          placeholder="Add a hint..."
                          minLength={5}
                          disabled={readOnly}
                          className="text-sm leading-relaxed text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded inline-block">
                        Explanation
                      </label>
                      <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                        <EditableField
                          value={subQuestion.explanation || ''}
                          onSave={(value) => handleSubQuestionFieldUpdate(subQuestion.id, 'explanation', value)}
                          type="richtext"
                          placeholder="Explain the answer..."
                          minLength={10}
                          disabled={readOnly}
                          className="text-sm leading-relaxed text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Sub-question attachments - Updated without pdfDataUrl and onPdfUpload */}
                  <div className={cn(
                    "border rounded p-3 bg-gray-50 dark:bg-gray-800/50",
                    subNeedsAttachmentWarning && showQAActions
                      ? "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10"
                      : "border-gray-200 dark:border-gray-700"
                  )}>
                    <AttachmentManager
                      attachments={subQuestion.attachments}
                      questionId={question.id}
                      subQuestionId={subQuestion.id}
                      onUpdate={() => queryClient.invalidateQueries({ queryKey: ['questions'] })}
                      readOnly={readOnly}
                      questionDescription={subQuestion.question_description}
                    />
                  </div>
                </div>
              </div>
            )})}
          </div>
        </div>
      )}
    </div>
  );
}