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
  FileText,
  Upload,
  Edit,
  Save,
  X
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
  questionIndex,
  topics,
  subtopics,
  units = [],
  onDelete,
  onDeleteSubQuestion,
  onConfirm,
  showQAActions = false,
  readOnly = false
}: QuestionCardProps) {
  const [expandedParts, setExpandedParts] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  
  const queryClient = useQueryClient();
  const { updateField, updateSubtopics, updateCorrectAnswers } = useQuestionMutations();
  const { validateForConfirmation } = useQuestionValidation();
  
  // Get validation status
  const validation = validateForConfirmation(question);
  const hasValidationErrors = !validation.isValid;
  
  // Check if question or any sub-question needs attachments (has figure)
  const needsAttachment = question.question_description?.toLowerCase().includes('figure') || 
                         question.question_description?.toLowerCase().includes('diagram') ||
                         question.question_description?.toLowerCase().includes('graph') ||
                         question.question_description?.toLowerCase().includes('image');
  
  const hasAttachment = question.attachments && question.attachments.length > 0;
  const needsAttachmentWarning = needsAttachment && !hasAttachment;
  
  // Filter subtopics based on selected topic
  const availableSubtopics = question.topic_id 
    ? subtopics.filter(s => s.topic_id === question.topic_id)
    : [];
  
  // Get current subtopic IDs from the question data
  const currentSubtopicIds = question.subtopics?.map(s => s.id) || [];
  
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'hard':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };
  
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'qa_review':
        return 'warning';
      default:
        return 'secondary';
    }
  };
  
  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Confirmed';
      case 'qa_review':
        return 'QA Review';
      default:
        return 'Inactive';
    }
  };

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
  
  return (
    <div 
      id={`question-${question.id}`}
      className={cn(
        "bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/20 border overflow-hidden transition-all duration-200",
        needsAttachmentWarning && showQAActions 
          ? "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10" 
          : "border-gray-200 dark:border-gray-700"
      )}
    >
      {/* Question Header */}
      <div className="bg-gray-800 dark:bg-gray-900 p-6 flex items-center justify-between border-b border-gray-700 dark:border-gray-800">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 bg-white/10 rounded-lg border border-white/20">
            <span className="text-white font-bold text-lg">
              {question.question_number}
            </span>
          </div>
          <div>
            <h3 className="text-white font-semibold text-lg">
              Question {question.question_number}
            </h3>
            {question.parts.length > 0 && (
              <p className="text-gray-300 text-sm">
                {question.parts.length} part{question.parts.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-2 ml-4">
            <StatusBadge 
              status={question.status} 
              className="bg-white/10 border border-white/20 text-white"
            >
              {getStatusText(question.status)}
            </StatusBadge>
            {hasValidationErrors && (
              <div className="flex items-center bg-red-500/20 border border-red-300/30 rounded-full px-3 py-1">
                <AlertCircle className="h-4 w-4 mr-1 text-red-300" />
                <span className="text-xs text-red-200 font-medium">Incomplete</span>
              </div>
            )}
            {needsAttachmentWarning && (
              <div className="flex items-center bg-orange-500/20 border border-orange-300/30 rounded-full px-3 py-1">
                <AlertCircle className="h-4 w-4 mr-1 text-orange-300" />
                <span className="text-xs text-orange-200 font-medium">Figure Required</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {showQAActions && question.status !== 'active' && onConfirm && (
            <Button
              size="sm"
              variant="default"
              onClick={() => {
                if (hasValidationErrors) {
                  setShowValidationErrors(true);
                  toast.error('Please fix all validation errors before confirming');
                } else if (needsAttachmentWarning) {
                  toast.error('Please upload the required figure/diagram before confirming');
                } else {
                  onConfirm(question.id);
                }
              }}
              leftIcon={<CheckCircle className="h-4 w-4" />}
              disabled={needsAttachmentWarning}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Confirm Question
            </Button>
          )}
          
          {showQAActions && question.status === 'active' && (
            <div className="flex items-center bg-green-500/20 border border-green-300/30 rounded-full px-4 py-2">
              <CheckCircle className="h-4 w-4 mr-2 text-green-300" />
              <span className="text-green-200 font-medium">Confirmed</span>
            </div>
          )}
          
          {question.parts.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setExpandedParts(!expandedParts)}
              className="text-white hover:bg-white/10 border border-white/20"
            >
              {expandedParts ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          )}
          
        </div>
      </div>
      
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
                <span className={cn("px-3 py-1 rounded-full text-sm font-medium", getDifficultyColor(question.difficulty))}>
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
            <span className="text-base font-medium text-gray-900 dark:text-white">
              {question.unit_name || 'Not assigned'}
            </span>
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
            <StatusBadge status={question.status} className="text-sm px-3 py-1" />
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
      {showValidationErrors && hasValidationErrors && (
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
      
      {/* Question Content */}
      <div className="p-6">
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
                type="textarea"
                rows={5}
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
                type="textarea"
                rows={4}
                placeholder="Add a hint to help students..."
                minLength={5}
                required
                disabled={readOnly}
                className="text-base text-gray-900 dark:text-white"
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
                type="textarea"
                rows={4}
                placeholder="Explain the correct answer..."
                minLength={10}
                required
                disabled={readOnly}
                className="text-base text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>
        
      </div>
      
      {/* Sub-questions */}
      {expandedParts && question.parts.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-800/30">
          <div className="space-y-4">
            {question.parts.map((subQuestion) => {
              const subNeedsAttachment = subQuestion.question_description?.toLowerCase().includes('figure') || 
                                       subQuestion.question_description?.toLowerCase().includes('diagram') ||
                                       subQuestion.question_description?.toLowerCase().includes('graph') ||
                                       subQuestion.question_description?.toLowerCase().includes('image');
              const subHasAttachment = subQuestion.attachments && subQuestion.attachments.length > 0;
              const subNeedsAttachmentWarning = subNeedsAttachment && !subHasAttachment;
              
              return (
              <div key={subQuestion.id} className={cn(
                "bg-white dark:bg-gray-800 rounded-xl border overflow-hidden shadow-sm",
                subNeedsAttachmentWarning && showQAActions
                  ? "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10"
                  : "border-gray-200 dark:border-gray-700"
              )}>
                <div className="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-700/50 p-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-600">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <span className="text-blue-600 dark:text-blue-400 font-bold text-sm">
                        {subQuestion.part_label?.slice(-1) || 'A'}
                      </span>
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {subQuestion.part_label}
                    </span>
                    <StatusBadge 
                      status={subQuestion.status} 
                      className="bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-600 text-xs"
                    >
                      {getStatusText(subQuestion.status)}
                    </StatusBadge>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400 bg-white/50 dark:bg-gray-800/50 px-2 py-1 rounded-md">
                      {subQuestion.marks} mark{subQuestion.marks !== 1 ? 's' : ''}
                    </span>
                    {subQuestion.answer_format && (
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-md">
                        {getAnswerFormatLabel(subQuestion.answer_format)}
                      </span>
                    )}
                  </div>
                  
                  {!readOnly && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDeleteSubQuestion(subQuestion)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-100 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20 rounded-lg"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                
                <div className="p-6 space-y-4">
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                    <EditableField
                      value={subQuestion.question_description}
                      onSave={(value) => handleSubQuestionFieldUpdate(subQuestion.id, 'question_description', value)}
                      type="textarea"
                      rows={3}
                      minLength={10}
                      required
                      disabled={readOnly}
                      className="text-base text-gray-900 dark:text-white"
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
                            <span className={cn("px-2 py-1 rounded-full text-xs font-medium", getDifficultyColor(subQuestion.difficulty || 'medium'))}>
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
                          type="textarea"
                          rows={3}
                          placeholder="Add a hint..."
                          minLength={5}
                          disabled={readOnly}
                          className="text-sm text-gray-900 dark:text-white"
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
                          type="textarea"
                          rows={3}
                          placeholder="Explain the answer..."
                          minLength={10}
                          disabled={readOnly}
                          className="text-sm text-gray-900 dark:text-white"
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