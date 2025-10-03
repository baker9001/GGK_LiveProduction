'use client';

import React, { useState } from 'react';
import { X, Plus, Trash2, Save, AlertCircle } from 'lucide-react';
import { Button, IconButton } from '../../../../components/shared/Button';
import { FormField, Input, Select, Textarea } from '../../../../components/shared/FormField';
import { ToggleSwitch } from '../../../../components/shared/ToggleSwitch';

export interface CustomQuestionData {
  prompt: string;
  questionType: 'mcq' | 'true_false' | 'short_answer' | 'long_answer' | 'calculation';
  options?: Array<{ text: string; isCorrect: boolean }>;
  correctAnswer?: string;
  marks?: number;
  hint?: string;
  explanation?: string;
  difficultyLevel?: 'easy' | 'medium' | 'hard';
}

interface CustomQuestionBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (questionData: CustomQuestionData) => void;
  initialData?: CustomQuestionData;
}

export function CustomQuestionBuilderModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}: CustomQuestionBuilderModalProps) {
  const [formData, setFormData] = useState<CustomQuestionData>(
    initialData || {
      prompt: '',
      questionType: 'mcq',
      options: [
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
      ],
      correctAnswer: '',
      marks: undefined,
      hint: '',
      explanation: '',
      difficultyLevel: 'medium',
    }
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const handleFieldChange = (field: keyof CustomQuestionData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleOptionChange = (index: number, text: string) => {
    const newOptions = [...(formData.options || [])];
    newOptions[index] = { ...newOptions[index], text };
    handleFieldChange('options', newOptions);
  };

  const handleCorrectOptionToggle = (index: number) => {
    const newOptions = [...(formData.options || [])];
    newOptions[index] = { ...newOptions[index], isCorrect: !newOptions[index].isCorrect };
    handleFieldChange('options', newOptions);
  };

  const handleAddOption = () => {
    const newOptions = [...(formData.options || []), { text: '', isCorrect: false }];
    handleFieldChange('options', newOptions);
  };

  const handleRemoveOption = (index: number) => {
    const newOptions = [...(formData.options || [])];
    newOptions.splice(index, 1);
    handleFieldChange('options', newOptions);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.prompt?.trim()) {
      newErrors.prompt = 'Question prompt is required';
    }

    if (formData.questionType === 'mcq' || formData.questionType === 'true_false') {
      const validOptions = formData.options?.filter((opt) => opt.text.trim()) || [];
      if (validOptions.length < 2) {
        newErrors.options = 'At least 2 options with text are required';
      }

      const correctOptions = validOptions.filter((opt) => opt.isCorrect);
      if (correctOptions.length === 0) {
        newErrors.correctAnswer = 'At least one correct answer must be marked';
      }
    } else if (
      (formData.questionType === 'short_answer' ||
        formData.questionType === 'long_answer' ||
        formData.questionType === 'calculation') &&
      !formData.correctAnswer?.trim()
    ) {
      newErrors.correctAnswer = 'Expected answer is required for review purposes';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    onSave(formData);
    onClose();
  };

  const renderQuestionTypeSpecificFields = () => {
    if (formData.questionType === 'mcq' || formData.questionType === 'true_false') {
      const optionsToShow =
        formData.questionType === 'true_false'
          ? [
              { text: 'True', isCorrect: formData.options?.[0]?.isCorrect || false },
              { text: 'False', isCorrect: formData.options?.[1]?.isCorrect || false },
            ]
          : formData.options || [];

      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">Answer Options</label>
            {formData.questionType === 'mcq' && (
              <Button variant="ghost" size="sm" onClick={handleAddOption} leftIcon={<Plus className="h-4 w-4" />}>
                Add option
              </Button>
            )}
          </div>

          <div className="space-y-2">
            {optionsToShow.map((option, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <Input
                      type="text"
                      value={option.text}
                      onChange={(e) =>
                        formData.questionType === 'true_false'
                          ? null
                          : handleOptionChange(index, e.target.value)
                      }
                      placeholder={`Option ${String.fromCharCode(65 + index)}`}
                      disabled={formData.questionType === 'true_false'}
                      className="flex-1"
                    />
                    {formData.questionType === 'mcq' && formData.options && formData.options.length > 2 && (
                      <IconButton
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleRemoveOption(index)}
                        aria-label="Remove option"
                      >
                        <Trash2 className="h-4 w-4" />
                      </IconButton>
                    )}
                  </div>
                  <ToggleSwitch
                    checked={option.isCorrect}
                    onChange={() =>
                      formData.questionType === 'true_false'
                        ? handleFieldChange('options', [
                            { text: 'True', isCorrect: index === 0 },
                            { text: 'False', isCorrect: index === 1 },
                          ])
                        : handleCorrectOptionToggle(index)
                    }
                    label="Correct answer"
                  />
                </div>
              </div>
            ))}
          </div>
          {errors.options && <p className="text-sm text-red-500">{errors.options}</p>}
          {errors.correctAnswer && <p className="text-sm text-red-500">{errors.correctAnswer}</p>}
        </div>
      );
    }

    return (
      <FormField
        id="correctAnswer"
        label="Expected Answer / Mark Scheme"
        description="Provide the expected answer or marking guidance for reviewers"
        error={errors.correctAnswer}
      >
        <Textarea
          value={formData.correctAnswer || ''}
          onChange={(e) => handleFieldChange('correctAnswer', e.target.value)}
          placeholder="Enter the expected answer or marking criteria"
          rows={4}
        />
      </FormField>
    );
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 px-4 py-6 overflow-y-auto">
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl dark:bg-gray-900 my-6">
        <div className="flex items-start justify-between border-b border-gray-200 p-6 dark:border-gray-800">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Custom Question Builder</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Create a bespoke question for this mock exam
            </p>
          </div>
          <IconButton variant="ghost" size="icon" aria-label="Close builder" onClick={onClose}>
            <X className="h-5 w-5" />
          </IconButton>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
          <FormField id="prompt" label="Question Prompt" required error={errors.prompt}>
            <Textarea
              value={formData.prompt}
              onChange={(e) => handleFieldChange('prompt', e.target.value)}
              placeholder="Enter the question stem, context, or scenario"
              rows={4}
            />
          </FormField>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField id="questionType" label="Question Type" required>
              <Select
                value={formData.questionType}
                options={[
                  { value: 'mcq', label: 'Multiple Choice' },
                  { value: 'true_false', label: 'True/False' },
                  { value: 'short_answer', label: 'Short Answer' },
                  { value: 'long_answer', label: 'Long Answer' },
                  { value: 'calculation', label: 'Calculation' },
                ]}
                onChange={(value) => handleFieldChange('questionType', value)}
              />
            </FormField>

            <FormField id="marks" label="Marks">
              <Input
                type="number"
                min={0}
                max={100}
                value={formData.marks ?? ''}
                onChange={(e) =>
                  handleFieldChange('marks', e.target.value === '' ? undefined : Number(e.target.value))
                }
                placeholder="e.g. 5"
              />
            </FormField>
          </div>

          {renderQuestionTypeSpecificFields()}

          <FormField id="hint" label="Hint (Optional)" description="Provide guidance to help students approach the question">
            <Textarea
              value={formData.hint || ''}
              onChange={(e) => handleFieldChange('hint', e.target.value)}
              placeholder="E.g., 'Consider the formula for area of a circle' or 'Remember to show all working'"
              rows={2}
            />
          </FormField>

          <FormField
            id="explanation"
            label="Explanation (Optional)"
            description="Provide detailed working or reasoning for the answer"
          >
            <Textarea
              value={formData.explanation || ''}
              onChange={(e) => handleFieldChange('explanation', e.target.value)}
              placeholder="Step-by-step solution or detailed explanation"
              rows={4}
            />
          </FormField>

          <FormField id="difficultyLevel" label="Difficulty Level">
            <Select
              value={formData.difficultyLevel || 'medium'}
              options={[
                { value: 'easy', label: 'Easy' },
                { value: 'medium', label: 'Medium' },
                { value: 'hard', label: 'Hard' },
              ]}
              onChange={(value) => handleFieldChange('difficultyLevel', value as CustomQuestionData['difficultyLevel'])}
            />
          </FormField>

          {Object.keys(errors).length > 0 && (
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-800 dark:text-red-200">Please fix the following errors:</p>
                <ul className="mt-2 space-y-1 text-sm text-red-700 dark:text-red-300">
                  {Object.values(errors).map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-200 p-6 dark:border-gray-800">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="default" onClick={handleSave} leftIcon={<Save className="h-4 w-4" />}>
            Save Question
          </Button>
        </div>
      </div>
    </div>
  );
}
