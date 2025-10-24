'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Save,
  Download,
  Eye,
  AlertCircle,
  CheckCircle2,
  Layers,
  Plus,
} from 'lucide-react';
import { QuestionSelector, type Question, type SelectedQuestion } from '../../../../components/shared/QuestionSelector';
import { Button } from '../../../../components/shared/Button';
import { QuestionPreviewModal } from './QuestionPreviewModal';

interface ExamPaperBuilderProps {
  examId: string;
  examTitle: string;
  dataStructureId: string;
  paperType: string;
  onSave: (questions: SelectedQuestion[], sections: PaperSection[]) => Promise<void>;
  onCancel: () => void;
  initialQuestions?: SelectedQuestion[];
  initialSections?: PaperSection[];
  isSaving?: boolean;
  className?: string;
}

export interface PaperSection {
  id: string;
  name: string;
  description?: string;
  questionIds: string[];
  totalMarks: number;
}

export function ExamPaperBuilder({
  examId,
  examTitle,
  dataStructureId,
  paperType,
  onSave,
  onCancel,
  initialQuestions = [],
  initialSections = [],
  isSaving = false,
  className = '',
}: ExamPaperBuilderProps) {
  const [selectedQuestions, setSelectedQuestions] = useState<SelectedQuestion[]>(initialQuestions);
  const [sections, setSections] = useState<PaperSection[]>(initialSections);
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  const [previewQuestionId, setPreviewQuestionId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Load available questions from the question bank
  useEffect(() => {
    const loadQuestions = async () => {
      try {
        setIsLoadingQuestions(true);
        // TODO: Replace with actual API call to fetch questions
        // This would filter by dataStructureId and paperType
        // const response = await fetch(`/api/questions?dataStructureId=${dataStructureId}&paperType=${paperType}`);
        // const data = await response.json();

        // Mock data for demonstration
        const mockQuestions: Question[] = [
          {
            id: '1',
            questionNumber: 1,
            questionText: 'Solve the quadratic equation: 2x² + 5x - 3 = 0',
            marks: 4,
            type: 'structured',
            difficulty: 'medium',
            topic: 'Algebra',
            subtopic: 'Quadratic Equations',
            year: '2023',
          },
          {
            id: '2',
            questionNumber: 2,
            questionText: 'Calculate the area of a circle with radius 7cm. Use π = 3.14',
            marks: 3,
            type: 'calculation',
            difficulty: 'easy',
            topic: 'Geometry',
            subtopic: 'Circle Theorems',
            year: '2023',
          },
          {
            id: '3',
            questionNumber: 3,
            questionText: 'Differentiate y = 3x⁴ - 2x³ + 5x - 7 with respect to x',
            marks: 5,
            type: 'calculation',
            difficulty: 'hard',
            topic: 'Calculus',
            subtopic: 'Differentiation',
            year: '2023',
          },
        ];

        setAvailableQuestions(mockQuestions);
      } catch (err) {
        setError('Failed to load questions from question bank');
        console.error('Error loading questions:', err);
      } finally {
        setIsLoadingQuestions(false);
      }
    };

    loadQuestions();
  }, [dataStructureId, paperType]);

  const validatePaper = (): boolean => {
    const errors: string[] = [];

    if (selectedQuestions.length === 0) {
      errors.push('At least one question must be selected');
    }

    const totalMarks = selectedQuestions.reduce((sum, q) => sum + (q.customMarks || q.marks), 0);
    if (totalMarks < 20) {
      errors.push('Total marks must be at least 20');
    }

    // Check for duplicate sequences
    const sequences = selectedQuestions.map(q => q.sequence);
    const uniqueSequences = new Set(sequences);
    if (sequences.length !== uniqueSequences.size) {
      errors.push('Question sequence numbers must be unique');
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSave = async () => {
    if (!validatePaper()) {
      return;
    }

    try {
      await onSave(selectedQuestions, sections);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save paper configuration');
    }
  };

  const handleExportPaper = () => {
    const paperData = {
      examId,
      examTitle,
      paperType,
      questions: selectedQuestions,
      sections,
      totalMarks: selectedQuestions.reduce((sum, q) => sum + (q.customMarks || q.marks), 0),
      totalQuestions: selectedQuestions.length,
    };

    const blob = new Blob([JSON.stringify(paperData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${examTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-paper-config.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const totalMarks = selectedQuestions.reduce((sum, q) => sum + (q.customMarks || q.marks), 0);
  const totalOptionalMarks = selectedQuestions
    .filter(q => q.isOptional)
    .reduce((sum, q) => sum + (q.customMarks || q.marks), 0);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#8CC63F]/20 to-[#7AB635]/20 flex items-center justify-center">
              <FileText className="w-7 h-7 text-[#8CC63F]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                Build Exam Paper
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {examTitle} • {paperType}
              </p>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#8CC63F]" />
                  <span className="text-gray-700 dark:text-gray-300">
                    {selectedQuestions.length} question{selectedQuestions.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#8CC63F]" />
                  <span className="text-gray-700 dark:text-gray-300">
                    {totalMarks} marks total
                  </span>
                </div>
                {totalOptionalMarks > 0 && (
                  <div className="text-amber-600 dark:text-amber-400">
                    ({totalOptionalMarks} optional)
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download className="w-4 h-4" />}
              onClick={handleExportPaper}
              disabled={selectedQuestions.length === 0}
            >
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              leftIcon={<Save className="w-4 h-4" />}
              onClick={handleSave}
              disabled={selectedQuestions.length === 0 || isSaving}
              isLoading={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Paper'}
            </Button>
          </div>
        </div>

        {/* Validation errors */}
        {validationErrors.length > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-1">
                  Please fix the following issues:
                </p>
                <ul className="text-sm text-red-600 dark:text-red-400 space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Success message */}
        {selectedQuestions.length > 0 && validationErrors.length === 0 && (
          <div className="mt-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-700 dark:text-green-300">
                Paper configuration is valid and ready to save
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Question Selector */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <QuestionSelector
          availableQuestions={availableQuestions}
          selectedQuestions={selectedQuestions}
          onQuestionsChange={setSelectedQuestions}
          onPreviewQuestion={setPreviewQuestionId}
          isLoading={isLoadingQuestions}
          showCustomQuestionBuilder={true}
          onCreateCustomQuestion={() => {
            // TODO: Implement custom question builder
            console.log('Create custom question');
          }}
        />
      </div>

      {/* Guidelines */}
      <div className="bg-gradient-to-r from-[#8CC63F]/10 via-white to-[#7AB635]/10 dark:from-[#8CC63F]/10 dark:via-gray-900 dark:to-[#7AB635]/10 border border-[#8CC63F]/20 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[#8CC63F] flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Cambridge Exam Guidelines
            </h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Ensure questions are appropriately balanced across difficulty levels</li>
              <li>• Follow official Cambridge mark allocations for paper types</li>
              <li>• Include a mix of knowledge recall and application questions</li>
              <li>• Verify all questions align with the syllabus learning objectives</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Question Preview Modal */}
      {previewQuestionId && (
        <QuestionPreviewModal
          questionId={previewQuestionId}
          onClose={() => setPreviewQuestionId(null)}
        />
      )}
    </div>
  );
}
