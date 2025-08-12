// src/app/system-admin/learning/practice-management/questions-setup/components/CorrectAnswersDisplay.tsx
import React, { useState } from 'react';
import { CheckCircle, AlertCircle, Edit, Save, X, Plus, Trash2 } from 'lucide-react';
import { Button } from '../../../../../../components/shared/Button';
import { cn } from '../../../../../../lib/utils';
import { toast } from '../../../../../../components/shared/Toast';

interface CorrectAnswer {
  answer: string;
  marks?: number;
  alternative_id?: number;
  context?: {
    type: string;
    value: string;
    label?: string;
  };
}

interface CorrectAnswersDisplayProps {
  correctAnswer?: string;
  correctAnswers?: CorrectAnswer[];
  answerRequirement?: string;
  totalAlternatives?: number;
  questionType?: string;
  readOnly?: boolean;
  onUpdate?: (answers: CorrectAnswer[]) => void;
}

export function CorrectAnswersDisplay({
  correctAnswer,
  correctAnswers,
  answerRequirement,
  totalAlternatives,
  questionType,
  readOnly = false,
  onUpdate
}: CorrectAnswersDisplayProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedAnswers, setEditedAnswers] = useState<CorrectAnswer[]>([]);

  // Initialize edited answers when starting edit
  const startEditing = () => {
    if (correctAnswers && correctAnswers.length > 0) {
      setEditedAnswers([...correctAnswers]);
    } else if (correctAnswer) {
      setEditedAnswers([{
        answer: correctAnswer,
        marks: 1,
        alternative_id: 1
      }]);
    } else {
      setEditedAnswers([{
        answer: '',
        marks: 1,
        alternative_id: 1
      }]);
    }
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditedAnswers([]);
  };

  const saveAnswers = () => {
    if (editedAnswers.some(a => !a.answer.trim())) {
      toast.error('All answers must have content');
      return;
    }
    onUpdate?.(editedAnswers);
    setIsEditing(false);
  };

  const updateAnswer = (index: number, field: keyof CorrectAnswer, value: any) => {
    const updated = [...editedAnswers];
    if (field === 'context' && typeof value === 'object') {
      updated[index] = { ...updated[index], context: value };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setEditedAnswers(updated);
  };

  const addAnswer = () => {
    const newId = Math.max(...editedAnswers.map(a => a.alternative_id || 0)) + 1;
    setEditedAnswers([...editedAnswers, {
      answer: '',
      marks: 1,
      alternative_id: newId
    }]);
  };

  const removeAnswer = (index: number) => {
    if (editedAnswers.length > 1) {
      setEditedAnswers(editedAnswers.filter((_, i) => i !== index));
    }
  };

  const getRequirementText = () => {
    switch (answerRequirement) {
      case 'any_one_from':
        return `Any ONE from ${totalAlternatives || 'list'}`;
      case 'any_two_from':
        return `Any TWO from ${totalAlternatives || 'list'}`;
      case 'any_three_from':
        return `Any THREE from ${totalAlternatives || 'list'}`;
      case 'both_required':
        return 'Both answers required';
      case 'all_required':
        return 'All answers required';
      case 'alternative_methods':
        return 'Alternative methods accepted';
      case 'acceptable_variations':
        return 'Acceptable variations';
      default:
        return null;
    }
  };

  const getContextTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'option': 'Option',
      'position': 'Position',
      'field': 'Field',
      'electrode': 'Electrode',
      'property': 'Property',
      'step': 'Step',
      'aspect': 'Aspect',
      'change': 'Change',
      'component': 'Component'
    };
    return labels[type] || type;
  };

  if (isEditing && !readOnly) {
    return (
      <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm">
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h5 className="text-base font-medium text-gray-900 dark:text-white">Edit Correct Answers</h5>
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={cancelEditing}
                leftIcon={<X className="h-3 w-3" />}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={saveAnswers}
                leftIcon={<Save className="h-3 w-3" />}
              >
                Save
              </Button>
            </div>
          </div>

          {editedAnswers.map((answer, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600 space-y-3">
              <div className="flex items-start justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Answer {index + 1}
                </span>
                {editedAnswers.length > 1 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeAnswer(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>

              <input
                type="text"
                value={answer.answer}
                onChange={(e) => updateAnswer(index, 'answer', e.target.value)}
                placeholder="Enter answer..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400">Marks</label>
                  <input
                    type="number"
                    value={answer.marks || 1}
                    onChange={(e) => updateAnswer(index, 'marks', parseInt(e.target.value))}
                    min={0}
                    className="w-full px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400">Context Type</label>
                  <select
                    value={answer.context?.type || ''}
                    onChange={(e) => updateAnswer(index, 'context', {
                      ...answer.context,
                      type: e.target.value
                    })}
                    className="w-full px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">None</option>
                    <option value="option">Option</option>
                    <option value="position">Position</option>
                    <option value="field">Field</option>
                    <option value="component">Component</option>
                    <option value="step">Step</option>
                    <option value="property">Property</option>
                  </select>
                </div>
              </div>

              {answer.context?.type && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-600 dark:text-gray-400">Context Value</label>
                    <input
                      type="text"
                      value={answer.context.value || ''}
                      onChange={(e) => updateAnswer(index, 'context', {
                        ...answer.context,
                        value: e.target.value
                      })}
                      placeholder="e.g., step_1"
                      className="w-full px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 dark:text-gray-400">Context Label</label>
                    <input
                      type="text"
                      value={answer.context.label || ''}
                      onChange={(e) => updateAnswer(index, 'context', {
                        ...answer.context,
                        label: e.target.value
                      })}
                      placeholder="e.g., First calculation step"
                      className="w-full px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}

          <Button
            size="sm"
            variant="outline"
            onClick={addAnswer}
            leftIcon={<Plus className="h-3 w-3" />}
            className="w-full"
          >
            Add Another Answer
          </Button>
        </div>
      </div>
    );
  }

  // Display mode
  const requirementText = getRequirementText();
  const answers = correctAnswers && correctAnswers.length > 0 ? correctAnswers : 
                 correctAnswer ? [{ answer: correctAnswer, marks: 1 }] : [];

  if (answers.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-gray-500 dark:text-gray-400 italic">No correct answer specified</p>
          {!readOnly && onUpdate && (
            <Button
              size="sm"
              variant="outline"
              onClick={startEditing}
              leftIcon={<Edit className="h-3 w-3" />}
            >
              Add Answer
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-xl border border-green-200 dark:border-green-800 shadow-sm">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            {requirementText && (
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                {requirementText}
              </p>
            )}
          </div>
          {!readOnly && onUpdate && (
            <Button
              size="sm"
              variant="outline"
              onClick={startEditing}
              leftIcon={<Edit className="h-3 w-3" />}
            >
              Edit
            </Button>
          )}
        </div>

        {answers.map((answer, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-green-300 dark:border-green-700">
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <p className="text-base font-medium text-gray-900 dark:text-white">
                  {answer.answer}
                </p>
                <div className="flex items-center space-x-4 text-sm">
                  {answer.marks !== undefined && (
                    <span className="text-gray-600 dark:text-gray-400">
                      {answer.marks} mark{answer.marks !== 1 ? 's' : ''}
                    </span>
                  )}
                  {answer.alternative_id && answers.length > 1 && (
                    <span className="text-gray-500 dark:text-gray-400">
                      Alternative {answer.alternative_id}
                    </span>
                  )}
                  {answer.context && (
                    <span className="text-blue-600 dark:text-blue-400">
                      {getContextTypeLabel(answer.context.type)}: {answer.context.label || answer.context.value}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}