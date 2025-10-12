import React, { useState, useEffect } from 'react';
import {
  Save,
  X,
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Hash,
  Target,
  Award
} from 'lucide-react';
import { Button } from '../../../../../../../components/shared/Button';
import { Select } from '../../../../../../../components/shared/Select';
import { cn } from '../../../../../../../lib/utils';

interface CorrectAnswer {
  answer: string;
  marks?: number;
  alternative_id?: number | string;
  unit?: string;
  accepts_equivalent_phrasing?: boolean;
  error_carried_forward?: boolean;
}

interface InlineQuestionEditorProps {
  questionData: {
    id: string;
    question_number: string;
    question_description: string;
    marks: number;
    type: 'mcq' | 'tf' | 'descriptive';
    difficulty: string;
    correct_answers?: CorrectAnswer[];
    correct_answer?: string;
    answer_format?: string;
    answer_requirement?: string;
    hint?: string;
    explanation?: string;
    marking_criteria?: string | string[];
    requires_manual_marking?: boolean;
  };
  onSave: (updatedData: any) => void;
  onCancel: () => void;
}

const ANSWER_FORMATS = [
  { value: 'single_word', label: 'Single Word' },
  { value: 'single_line', label: 'Short Answer' },
  { value: 'two_items', label: 'Two Items' },
  { value: 'multi_line', label: 'Multi-line' },
  { value: 'calculation', label: 'Calculation' },
  { value: 'equation', label: 'Equation' },
  { value: 'diagram', label: 'Diagram' },
  { value: 'table', label: 'Table' },
  { value: 'graph', label: 'Graph' }
];

const ANSWER_REQUIREMENTS = [
  { value: '', label: 'No special requirement' },
  { value: 'any_one_from', label: 'Any one from list' },
  { value: 'any_two_from', label: 'Any two from list' },
  { value: 'any_three_from', label: 'Any three from list' },
  { value: 'both_required', label: 'Both required' },
  { value: 'all_required', label: 'All required' },
  { value: 'alternative_methods', label: 'Alternative methods' },
  { value: 'acceptable_variations', label: 'Acceptable variations' }
];

const DIFFICULTY_LEVELS = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' }
];

export function InlineQuestionEditor({
  questionData,
  onSave,
  onCancel
}: InlineQuestionEditorProps) {
  const [formData, setFormData] = useState(questionData);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['basic']));
  const [hasChanges, setHasChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    const hasModifications = JSON.stringify(formData) !== JSON.stringify(questionData);
    setHasChanges(hasModifications);
  }, [formData, questionData]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddAnswer = () => {
    const currentAnswers = formData.correct_answers || [];
    const newAnswer: CorrectAnswer = {
      answer: '',
      marks: 1,
      alternative_id: currentAnswers.length + 1
    };

    setFormData(prev => ({
      ...prev,
      correct_answers: [...currentAnswers, newAnswer]
    }));
  };

  const handleUpdateAnswer = (index: number, field: string, value: any) => {
    const updatedAnswers = [...(formData.correct_answers || [])];
    updatedAnswers[index] = {
      ...updatedAnswers[index],
      [field]: value
    };

    setFormData(prev => ({
      ...prev,
      correct_answers: updatedAnswers
    }));
  };

  const handleRemoveAnswer = (index: number) => {
    const updatedAnswers = (formData.correct_answers || []).filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      correct_answers: updatedAnswers
    }));
  };

  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (!formData.question_description?.trim()) {
      errors.push('Question description is required');
    }

    if (!formData.marks || formData.marks <= 0) {
      errors.push('Marks must be greater than 0');
    }

    if (formData.correct_answers && formData.correct_answers.length > 0) {
      const emptyAnswers = formData.correct_answers.filter(a => !a.answer?.trim());
      if (emptyAnswers.length > 0) {
        errors.push(`${emptyAnswers.length} answer(s) have no text`);
      }
    } else if (!formData.correct_answer?.trim()) {
      errors.push('At least one correct answer is required');
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      onSave(formData);
    }
  };

  const SectionHeader = ({ id, icon: Icon, title, subtitle }: {
    id: string;
    icon: React.ElementType;
    title: string;
    subtitle: string;
  }) => {
    const isExpanded = expandedSections.has(id);

    return (
      <button
        type="button"
        onClick={() => toggleSection(id)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <div className="text-left">
            <div className="font-medium text-gray-900 dark:text-white">{title}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">{subtitle}</div>
          </div>
        </div>
        {isExpanded ? (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronRight className="h-5 w-5 text-gray-400" />
        )}
      </button>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-blue-500 dark:border-blue-600 shadow-lg">
      {/* Header */}
      <div className="bg-blue-50 dark:bg-blue-900/20 px-6 py-4 border-b-2 border-blue-200 dark:border-blue-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Edit2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Edit Question {formData.question_number}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Make changes and save to update the question
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={onCancel}
              leftIcon={<X className="h-4 w-4" />}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || validationErrors.length > 0}
              leftIcon={<Save className="h-4 w-4" />}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Save Changes
            </Button>
          </div>
        </div>

        {hasChanges && validationErrors.length === 0 && (
          <div className="mt-3 flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
            <CheckCircle className="h-4 w-4" />
            <span>You have unsaved changes</span>
          </div>
        )}

        {validationErrors.length > 0 && (
          <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-red-900 dark:text-red-100 mb-1">
                  Please fix the following errors:
                </div>
                <ul className="list-disc list-inside text-sm text-red-800 dark:text-red-200 space-y-1">
                  {validationErrors.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Basic Information Section */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <SectionHeader
          id="basic"
          icon={Hash}
          title="Basic Information"
          subtitle="Question text, marks, type, and difficulty"
        />

        {expandedSections.has('basic') && (
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Question Description *
              </label>
              <textarea
                value={formData.question_description}
                onChange={(e) => handleInputChange('question_description', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Enter the question text..."
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Marks *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.marks}
                  onChange={(e) => handleInputChange('marks', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Question Type
                </label>
                <Select
                  value={formData.type}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                  options={[
                    { value: 'mcq', label: 'Multiple Choice' },
                    { value: 'tf', label: 'True/False' },
                    { value: 'descriptive', label: 'Descriptive' }
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Difficulty
                </label>
                <Select
                  value={formData.difficulty}
                  onChange={(e) => handleInputChange('difficulty', e.target.value)}
                  options={DIFFICULTY_LEVELS}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Correct Answers Section */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <SectionHeader
          id="answers"
          icon={Target}
          title="Correct Answers"
          subtitle="Add and configure acceptable answers"
        />

        {expandedSections.has('answers') && (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Answer Format
                </label>
                <Select
                  value={formData.answer_format || ''}
                  onChange={(e) => handleInputChange('answer_format', e.target.value)}
                  options={[{ value: '', label: 'Not specified' }, ...ANSWER_FORMATS]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Answer Requirement
                </label>
                <Select
                  value={formData.answer_requirement || ''}
                  onChange={(e) => handleInputChange('answer_requirement', e.target.value)}
                  options={ANSWER_REQUIREMENTS}
                />
              </div>
            </div>

            {/* Single Answer */}
            {formData.type !== 'mcq' && (!formData.correct_answers || formData.correct_answers.length === 0) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Single Correct Answer
                </label>
                <input
                  type="text"
                  value={formData.correct_answer || ''}
                  onChange={(e) => handleInputChange('correct_answer', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="Enter the correct answer..."
                />
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      correct_answers: [{ answer: prev.correct_answer || '', marks: prev.marks }],
                      correct_answer: undefined
                    }));
                  }}
                  className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Convert to multiple answers
                </button>
              </div>
            )}

            {/* Multiple Answers */}
            {formData.correct_answers && formData.correct_answers.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Multiple Correct Answers
                  </label>
                  <Button
                    size="sm"
                    onClick={handleAddAnswer}
                    leftIcon={<Plus className="h-4 w-4" />}
                  >
                    Add Answer
                  </Button>
                </div>

                {formData.correct_answers.map((answer, index) => (
                  <div
                    key={index}
                    className="p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg space-y-3"
                  >
                    <div className="flex items-start gap-2">
                      <span className="flex-shrink-0 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-sm font-medium">
                        #{index + 1}
                      </span>
                      <input
                        type="text"
                        value={answer.answer}
                        onChange={(e) => handleUpdateAnswer(index, 'answer', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        placeholder="Enter answer text..."
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveAnswer(index)}
                        className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                          Marks
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={answer.marks || 0}
                          onChange={(e) => handleUpdateAnswer(index, 'marks', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                          Unit (optional)
                        </label>
                        <input
                          type="text"
                          value={answer.unit || ''}
                          onChange={(e) => handleUpdateAnswer(index, 'unit', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                          placeholder="e.g., cm, kg"
                        />
                      </div>

                      <div className="flex items-end">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={answer.accepts_equivalent_phrasing || false}
                            onChange={(e) => handleUpdateAnswer(index, 'accepts_equivalent_phrasing', e.target.checked)}
                            className="rounded border-gray-300 dark:border-gray-600"
                          />
                          <span className="text-xs text-gray-700 dark:text-gray-300">
                            Allow variations
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Educational Content Section */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <SectionHeader
          id="educational"
          icon={Award}
          title="Educational Content"
          subtitle="Hints, explanations, and marking criteria"
        />

        {expandedSections.has('educational') && (
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Hint (Optional)
              </label>
              <textarea
                value={formData.hint || ''}
                onChange={(e) => handleInputChange('hint', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Provide a helpful hint for students..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Explanation (Optional)
              </label>
              <textarea
                value={formData.explanation || ''}
                onChange={(e) => handleInputChange('explanation', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Explain the correct answer and methodology..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Marking Criteria (Optional)
              </label>
              <textarea
                value={typeof formData.marking_criteria === 'string' ? formData.marking_criteria : ''}
                onChange={(e) => handleInputChange('marking_criteria', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Specify marking guidance for teachers..."
              />
            </div>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.requires_manual_marking || false}
                onChange={(e) => handleInputChange('requires_manual_marking', e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Requires manual marking
              </span>
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
