'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Save, FileText } from 'lucide-react';
import { EnhancedQuestionSelector } from '../../../../../components/shared/EnhancedQuestionSelector';
import { EnhancedQuestionPreview } from '../../../../../components/shared/EnhancedQuestionPreview';
import { Button } from '../../../../../components/shared/Button';
import { supabase } from '../../../../../lib/supabase';
import { toast } from '../../../../../components/shared/Toast';
import type { Question, SelectedQuestion } from '../../../../../components/shared/EnhancedQuestionSelector';
import { LoadingSpinner } from '../../../../../components/shared/LoadingSpinner';

export default function EnhancedQuestionSelectionPage() {
  const [selectedQuestions, setSelectedQuestions] = useState<SelectedQuestion[]>([]);
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedPaperId, setSelectedPaperId] = useState<string>('');

  // Fetch available papers
  const { data: papers, isLoading: papersLoading } = useQuery({
    queryKey: ['papers-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('papers')
        .select(`
          id,
          code,
          edu_subjects(name),
          edu_providers(name),
          edu_programs(name)
        `)
        .limit(50);

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch questions for selected paper
  const { data: availableQuestions, isLoading: questionsLoading } = useQuery({
    queryKey: ['questions', selectedPaperId],
    queryFn: async () => {
      if (!selectedPaperId) return [];

      const { data: questionsData, error } = await supabase
        .from('questions')
        .select(`
          id,
          question_number,
          question_description,
          marks,
          type,
          difficulty,
          status,
          topic_id,
          topics(name),
          subtopic_id,
          year,
          parts:sub_questions(
            id,
            part_label,
            question_description,
            marks,
            difficulty,
            type
          ),
          attachments:questions_attachments(
            id,
            file_url,
            file_name,
            file_type
          )
        `)
        .eq('paper_id', selectedPaperId)
        .eq('status', 'active')
        .order('question_number', { ascending: true });

      if (error) throw error;

      // Transform data to match Question interface
      const transformedQuestions: Question[] = (questionsData || []).map((q: any) => ({
        id: q.id,
        question_number: q.question_number,
        question_description: q.question_description,
        marks: q.marks,
        type: q.type,
        difficulty: q.difficulty,
        topic: q.topics?.name,
        topic_id: q.topic_id,
        subtopic: q.subtopic_id,
        year: q.year,
        parts: q.parts || [],
        attachments: q.attachments || [],
      }));

      return transformedQuestions;
    },
    enabled: !!selectedPaperId,
  });

  const handlePreviewQuestion = (question: Question) => {
    setPreviewQuestion(question);
    setIsPreviewOpen(true);
  };

  const handleSaveSelection = async () => {
    if (selectedQuestions.length === 0) {
      toast.error('Please select at least one question');
      return;
    }

    try {
      // Here you would save the selection to the database
      // This is just an example showing the data structure
      const selectionData = {
        paper_id: selectedPaperId,
        questions: selectedQuestions.map((q) => ({
          question_id: q.id,
          sequence: q.sequence,
          custom_marks: q.customMarks,
          is_optional: q.isOptional,
        })),
        total_marks: selectedQuestions.reduce((sum, q) => sum + (q.customMarks || q.marks), 0),
      };

      console.log('Saving selection:', selectionData);
      toast.success(`Successfully saved ${selectedQuestions.length} questions`);
    } catch (error) {
      console.error('Failed to save selection:', error);
      toast.error('Failed to save selection');
    }
  };

  const handleExportSelection = () => {
    const exportData = {
      paper_id: selectedPaperId,
      selected_questions: selectedQuestions,
      total_marks: selectedQuestions.reduce((sum, q) => sum + (q.customMarks || q.marks), 0),
      created_at: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `question-selection-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success('Selection exported successfully');
  };

  const isQuestionAdded = (questionId: string) => {
    return selectedQuestions.some((q) => q.id === questionId);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      {/* Page Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Enhanced Question Selection
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Build exam papers with hierarchical question structure and advanced filtering
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<FileText className="w-4 h-4" />}
              onClick={handleExportSelection}
              disabled={selectedQuestions.length === 0}
            >
              Export
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Save className="w-4 h-4" />}
              onClick={handleSaveSelection}
              disabled={selectedQuestions.length === 0}
            >
              Save Selection
            </Button>
          </div>
        </div>

        {/* Paper Selector */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Paper
          </label>
          <select
            value={selectedPaperId}
            onChange={(e) => {
              setSelectedPaperId(e.target.value);
              setSelectedQuestions([]);
            }}
            className="w-full max-w-md px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#8CC63F] focus:border-transparent"
          >
            <option value="">Choose a paper...</option>
            {papers?.map((paper: any) => (
              <option key={paper.id} value={paper.id}>
                {paper.code} - {paper.edu_subjects?.name} ({paper.edu_providers?.name})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {papersLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <LoadingSpinner
                size="md"
                showLogo={false}
                animation="hybrid"
                message="Loading papers..."
              />
            </div>
          </div>
        ) : !selectedPaperId ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Select a Paper to Begin
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Choose a paper from the dropdown above to start selecting questions for your exam.
              </p>
            </div>
          </div>
        ) : (
          <EnhancedQuestionSelector
            availableQuestions={availableQuestions || []}
            selectedQuestions={selectedQuestions}
            onQuestionsChange={setSelectedQuestions}
            onPreviewQuestion={handlePreviewQuestion}
            isLoading={questionsLoading}
            showCustomQuestionBuilder={true}
            onCreateCustomQuestion={() => {
              toast.info('Custom question builder coming soon');
            }}
          />
        )}
      </div>

      {/* Question Preview Modal */}
      {previewQuestion && (
        <EnhancedQuestionPreview
          question={previewQuestion}
          isOpen={isPreviewOpen}
          onClose={() => {
            setIsPreviewOpen(false);
            setPreviewQuestion(null);
          }}
          onAddQuestion={(question) => {
            const newQuestion: SelectedQuestion = {
              ...question,
              sequence: selectedQuestions.length + 1,
            };
            setSelectedQuestions([...selectedQuestions, newQuestion]);
            toast.success('Question added to selection');
          }}
          isAdded={isQuestionAdded(previewQuestion.id)}
        />
      )}
    </div>
  );
}
