// src/app/system-admin/learning/practice-management/questions-setup/components/CorrectAnswersDisplay.tsx
import React, { useState } from 'react';
import { CheckCircle, AlertCircle, Edit, Save, X, Plus, Trash2, Info, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '../../../../../../components/shared/Button';
import { cn } from '../../../../../../lib/utils';
import { toast } from '../../../../../../components/shared/Toast';
import { validateAcceptableVariations, addVariation, removeVariation } from '../../../../../../lib/validation/acceptableVariationsValidation';
import {
  supportsAcceptableVariations,
  getVariationPlaceholder,
  getVariationTooltip
} from '../../../../../../lib/constants/answerOptions';

interface CorrectAnswer {
  answer: string;
  marks?: number;
  alternative_id?: number;
  acceptable_variations?: string[];
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
  answerFormat?: string | null;
  totalAlternatives?: number;
  questionType?: string;
  readOnly?: boolean;
  onUpdate?: (answers: CorrectAnswer[]) => void;
}

export function CorrectAnswersDisplay({
  correctAnswer,
  correctAnswers,
  answerRequirement,
  answerFormat,
  totalAlternatives,
  questionType,
  readOnly = false,
  onUpdate
}: CorrectAnswersDisplayProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedAnswers, setEditedAnswers] = useState<CorrectAnswer[]>([]);
  const [newVariations, setNewVariations] = useState<Record<number, string>>({});

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

  const saveAnswers = async () => {
    // Validate all answers have content
    if (editedAnswers.some(a => !a.answer.trim())) {
      toast.error('All answers must have content');
      return;
    }

    // Validate at least one answer exists
    if (editedAnswers.length === 0) {
      toast.error('At least one correct answer is required');
      return;
    }

    // Validate acceptable_variations for each answer
    const validationErrors: string[] = [];
    const validationWarnings: string[] = [];

    editedAnswers.forEach((answer, index) => {
      if (answer.acceptable_variations && answer.acceptable_variations.length > 0) {
        const validation = validateAcceptableVariations(answer.acceptable_variations, answer.answer);

        if (!validation.isValid) {
          validationErrors.push(`Answer ${index + 1}: ${validation.errors.join(', ')}`);
        }

        if (validation.warnings.length > 0) {
          validationWarnings.push(`Answer ${index + 1}: ${validation.warnings.join(', ')}`);
        }
      }
    });

    if (validationErrors.length > 0) {
      toast.error(`Validation errors: ${validationErrors.join('; ')}`);
      return;
    }

    if (validationWarnings.length > 0) {
      console.warn('Validation warnings:', validationWarnings);
      // Show warnings but allow save to proceed
      toast.warning(validationWarnings.join('; '), { duration: 5000 });
    }

    try {
      // Call the update function
      if (onUpdate) {
        await onUpdate(editedAnswers);
        setIsEditing(false);
        // Success message is handled by the mutation hook
      }
    } catch (error) {
      console.error('Error saving answers:', error);
      // Error message is handled by the mutation hook
    }
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
      const answerToRemove = editedAnswers[index];

      // Show confirmation dialog
      if (window.confirm(`Are you sure you want to delete this answer: "${answerToRemove.answer}"?`)) {
        const updatedAnswers = editedAnswers.filter((_, i) => i !== index);
        setEditedAnswers(updatedAnswers);
        toast.success('Answer removed from the list');
      }
    } else {
      toast.error('Cannot delete the last answer. At least one correct answer is required.');
    }
  };

  const addAcceptableVariation = (answerIndex: number, variation: string) => {
    const answer = editedAnswers[answerIndex];
    const result = addVariation(answer.acceptable_variations, variation, answer.answer);

    if (result.errors.length > 0) {
      toast.error(result.errors[0]);
      return false;
    }

    updateAnswer(answerIndex, 'acceptable_variations', result.updated);
    return true;
  };

  const removeAcceptableVariation = (answerIndex: number, variationIndex: number) => {
    const answer = editedAnswers[answerIndex];
    const updated = removeVariation(answer.acceptable_variations, variationIndex);
    updateAnswer(answerIndex, 'acceptable_variations', updated);
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

              {/* Acceptable Variations Section - Conditional based on format */}
              {supportsAcceptableVariations(answerFormat) && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      Acceptable Variations
                    </label>
                    <div className="group relative">
                      <Info className="h-3 w-3 text-blue-500" />
                      <div className="absolute hidden group-hover:block z-10 w-64 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg -top-2 left-6">
                        {getVariationTooltip(answerFormat)}
                      </div>
                    </div>
                  </div>

                  {/* Display existing variations */}
                  {answer.acceptable_variations && answer.acceptable_variations.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {answer.acceptable_variations.map((variation, vIndex) => (
                        <div
                          key={vIndex}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded text-sm text-blue-700 dark:text-blue-300"
                        >
                          <span>{variation}</span>
                          <button
                            type="button"
                            onClick={() => removeAcceptableVariation(index, vIndex)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add new variation */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newVariations[index] || ''}
                      onChange={(e) => setNewVariations({ ...newVariations, [index]: e.target.value })}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const variation = newVariations[index]?.trim();
                          if (variation && addAcceptableVariation(index, variation)) {
                            setNewVariations({ ...newVariations, [index]: '' });
                          }
                        }
                      }}
                      placeholder={getVariationPlaceholder(answerFormat)}
                      className="flex-1 px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const variation = newVariations[index]?.trim();
                        if (variation && addAcceptableVariation(index, variation)) {
                          setNewVariations({ ...newVariations, [index]: '' });
                        }
                      }}
                      disabled={!newVariations[index]?.trim()}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
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

                {/* Display acceptable variations */}
                {answer.acceptable_variations && answer.acceptable_variations.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-2">
                      <Info className="h-4 w-4 text-blue-500" />
                      <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                        Acceptable Variations ({answer.acceptable_variations.length})
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {answer.acceptable_variations.map((variation, vIndex) => (
                        <span
                          key={vIndex}
                          className="inline-flex items-center px-2 py-1 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded text-sm text-blue-700 dark:text-blue-300"
                        >
                          {variation}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}