// src/app/system-admin/learning/practice-management/papers-setup/review/page.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { QuestionViewer, QuestionData, UserResponse, ValidationReport, UploadedAttachment } from '../../../../../../components/shared/questions/QuestionViewer';
import { supabase } from '../../../../../../lib/supabase';
import { Button } from '../../../../../../components/shared/Button';
import { supabase } from '../../../../../../lib/supabase';
import { toast } from '../../../../../../components/shared/Toast';
import { ArrowLeft, Save, CheckCircle, AlertTriangle, Eye } from 'lucide-react';
import { cn } from '../../../../../../lib/utils';

interface ReviewPageState {
  questions: QuestionData[];
  loading: boolean;
  saving: boolean;
  validationReports: Record<string, ValidationReport>;
  sessionId?: string;
  // Academic structure data for editing
  units: Array<{ id: string; name: string }>;
  chapters: Array<{ id: string; name: string }>;
  topics: Array<{ id: string; name: string }>;
  subtopics: Array<{ id: string; name: string }>;
}

export default function PaperSetupReviewPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session') || id;

  const [state, setState] = useState<ReviewPageState>({
    questions: [],
    loading: true,
    saving: false,
    validationReports: {},
    sessionId,
    units: [],
    chapters: [],
    topics: [],
    subtopics: []
  });

  // Load questions and academic structure from import session
  useEffect(() => {
    loadQuestionsFromSession();
    loadAcademicStructure();
  }, [sessionId]);

  const loadAcademicStructure = async () => {
    if (!sessionId) return;

    try {
      // Get import session metadata to find data structure ID
      const { data: session, error: sessionError } = await supabase
        .from('past_paper_import_sessions')
        .select('metadata')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;

      const dataStructureId = session?.metadata?.entity_ids?.data_structure_id;
      if (!dataStructureId) {
        console.warn('No data structure ID found in session metadata');
        return;
      }

      // Load units
      const { data: unitsData } = await supabase
        .from('units')
        .select('id, name')
        .eq('data_structure_id', dataStructureId)
        .order('name');

      // Load topics
      const { data: topicsData } = await supabase
        .from('topics')
        .select('id, name')
        .eq('data_structure_id', dataStructureId)
        .order('name');

      // Load subtopics
      const { data: subtopicsData } = await supabase
        .from('subtopics')
        .select('id, name')
        .order('name');

      setState(prev => ({
        ...prev,
        units: unitsData || [],
        topics: topicsData || [],
        subtopics: subtopicsData || []
      }));
    } catch (error) {
      console.error('Error loading academic structure:', error);
    }
  };

  const loadQuestionsFromSession = async () => {
    if (!sessionId) {
      toast.error('No session ID provided', {
        id: 'papers-review-error',
      });
      navigate('/system-admin/learning/practice-management/papers-setup');
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true }));

      // Fetch import session data
      const { data: session, error: sessionError } = await supabase
        .from('past_paper_import_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;

      // Extract questions from raw_json
      const rawQuestions = session.raw_json?.questions || [];

      // Transform to QuestionData format with ALL fields
      const questions: QuestionData[] = rawQuestions.map((q: any, index: number) => ({
        id: q.id || `q-${index + 1}`,
        question_number: q.question_number || `${index + 1}`,
        type: mapQuestionType(q.question_type || q.type),
        category: q.category,
        question_text: q.question_text || q.question_description || '',
        marks: q.marks || q.total_marks || 0,
        difficulty: q.difficulty,
        status: q.status || 'draft',

        // Academic hierarchy - preserve ALL fields
        subject: q.subject,
        subject_id: q.subject_id,
        unit: q.unit,
        unit_id: q.unit_id || q.chapter_id,
        chapter: q.chapter,
        chapter_id: q.chapter_id,
        topic: q.topic,
        topic_id: q.topic_id,
        subtopic: q.subtopic || q.subtopics?.[0],
        subtopic_id: q.subtopic_id,

        // Answer configuration
        answer_format: q.answer_format,
        answer_requirement: q.answer_requirement,
        total_alternatives: q.total_alternatives,

        // Educational content
        hint: q.hint,
        explanation: q.explanation,

        // Nested structures
        correct_answers: (q.correct_answers || []).map((ans: any) => ({
          answer: ans.answer || ans.text || '',
          marks: ans.marks,
          alternative_id: ans.alternative_id,
          context_type: ans.context_type,
          context_value: ans.context_value,
          context_label: ans.context_label
        })),
        options: (q.options || []).map((opt: any) => ({
          label: opt.label || opt.id || '',
          text: opt.text || opt.option_text || '',
          is_correct: opt.is_correct || false,
          explanation: opt.explanation
        })),
        parts: (q.parts || []).map((part: any) => ({
          part: part.part || part.part_label || '',
          question_text: part.question_text || part.description || '',
          marks: part.marks || 0,
          answer_format: part.answer_format,
          answer_requirement: part.answer_requirement,
          hint: part.hint,
          explanation: part.explanation,
          correct_answers: part.correct_answers || [],
          options: part.options || [],
          subparts: part.subparts || [],
          attachments: part.attachments || []
        })),
        attachments: (q.attachments || []).map((att: any) => ({
          id: att.id || `att-${Math.random().toString(36).substr(2, 9)}`,
          name: att.file_name || att.name || 'Attachment',
          url: att.file_url || att.url || '',
          type: att.file_type || att.type || 'image/png',
          size: att.file_size || att.size
        })),

        // Metadata
        exam_board: session.metadata?.exam_board || q.exam_board,
        paper_code: session.metadata?.paper_code || q.paper_code,
        year: session.metadata?.year || q.year,
        meta: q.meta || {}
      }));

      setState(prev => ({
        ...prev,
        questions,
        loading: false
      }));
    } catch (error) {
      console.error('Error loading questions:', error);
      toast.error('Failed to load questions for review', {
        id: 'papers-review-error',
      });
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const mapQuestionType = (type: string): QuestionData['type'] => {
    const typeMap: Record<string, QuestionData['type']> = {
      'mcq': 'mcq',
      'multiple_choice': 'mcq',
      'true_false': 'true_false',
      'tf': 'true_false',
      'fill_blank': 'fill_blank',
      'fill_in_blank': 'fill_blank',
      'numerical': 'numerical',
      'calculation': 'numerical',
      'structured': 'structured',
      'diagram_label': 'diagram_label',
      'graph': 'graph',
      'practical': 'practical'
    };
    return typeMap[type.toLowerCase()] || 'structured';
  };

  const handleQuestionUpdate = (questionId: string, updated: QuestionData) => {
    setState(prev => ({
      ...prev,
      questions: prev.questions.map(q =>
        q.id === questionId ? updated : q
      )
    }));
  };

  const handleValidation = (questionId: string, report: ValidationReport) => {
    setState(prev => ({
      ...prev,
      validationReports: {
        ...prev.validationReports,
        [questionId]: report
      }
    }));
  };

  const handleAttachmentsChange = (questionId: string, attachments: UploadedAttachment[]) => {
    setState(prev => ({
      ...prev,
      questions: prev.questions.map(q =>
        q.id === questionId ? { ...q, attachments } : q
      )
    }));
  };

  const handleSaveAll = async () => {
    try {
      setState(prev => ({ ...prev, saving: true }));

      // Validate all questions before saving
      const hasErrors = Object.values(state.validationReports).some(
        report => report.errors && report.errors.length > 0
      );

      if (hasErrors) {
        toast.error('Some questions have validation errors. Please review before saving.', {
          id: 'papers-review-validation',
          duration: 6000,
        });
        setState(prev => ({ ...prev, saving: false }));
        return;
      }

      // Save updated questions back to session
      const { error: updateError } = await supabase
        .from('past_paper_import_sessions')
        .update({
          raw_json: {
            questions: state.questions
          },
          metadata: {
            ...state.questions[0]?.meta,
            reviewed: true,
            reviewed_at: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (updateError) throw updateError;

      toast.success('All questions saved successfully', {
        id: 'papers-review-success',
        duration: 3500,
      });
      setState(prev => ({ ...prev, saving: false }));
    } catch (error) {
      console.error('Error saving questions:', error);
      toast.error('Failed to save questions', {
        id: 'papers-review-error',
      });
      setState(prev => ({ ...prev, saving: false }));
    }
  };

  const handleValidateAll = () => {
    // Trigger validation for all questions
    const allValid = Object.values(state.validationReports).every(
      report => report.isValid
    );

    if (allValid) {
      toast.success('All questions are valid', {
        id: 'papers-review-success',
        duration: 3500,
      });
    } else {
      const errorCount = Object.values(state.validationReports).filter(
        report => !report.isValid
      ).length;
      toast.error(`${errorCount} question(s) have validation issues`, {
        id: 'papers-review-validation',
        duration: 6000,
      });
    }
  };

  const getValidationSummary = () => {
    const reports = Object.values(state.validationReports);
    const totalErrors = reports.reduce((sum, r) => sum + (r.errors?.length || 0), 0);
    const totalWarnings = reports.reduce((sum, r) => sum + (r.warnings?.length || 0), 0);
    return { totalErrors, totalWarnings };
  };

  if (state.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading questions for review...</p>
        </div>
      </div>
    );
  }

  const { totalErrors, totalWarnings } = getValidationSummary();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/system-admin/learning/practice-management/papers-setup')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Question Review & Validation
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {state.questions.length} question{state.questions.length !== 1 ? 's' : ''} to review
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Validation Summary */}
              {totalErrors > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <span className="text-sm font-medium text-red-700 dark:text-red-300">
                    {totalErrors} error{totalErrors !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
              {totalWarnings > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                    {totalWarnings} warning{totalWarnings !== 1 ? 's' : ''}
                  </span>
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={handleValidateAll}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Validate All
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleSaveAll}
                disabled={state.saving || totalErrors > 0}
              >
                <Save className="h-4 w-4 mr-2" />
                {state.saving ? 'Saving...' : 'Save All'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Questions List */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="space-y-8">
          {state.questions.map((question, index) => (
            <div key={question.id} className="relative">
              <div className="absolute -left-12 top-6 text-2xl font-bold text-gray-300 dark:text-gray-600">
                {index + 1}
              </div>
              <QuestionViewer
                question={question}
                mode="review"
                subject={question.subject}
                examBoard={question.exam_board}
                editable={true}
                showValidation={true}
                onUpdate={(updated) => handleQuestionUpdate(question.id!, updated)}
                onValidate={(report) => handleValidation(question.id!, report)}
                onAttachmentsChange={(attachments) => handleAttachmentsChange(question.id!, attachments)}
                units={state.units}
                chapters={state.chapters}
                topics={state.topics}
                subtopics={state.subtopics}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Sticky Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Progress: {state.questions.length} question{state.questions.length !== 1 ? 's' : ''} loaded
            </div>
            {totalErrors === 0 && totalWarnings === 0 && (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <CheckCircle className="h-4 w-4" />
                All validation checks passed
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" size="sm" onClick={handleValidateAll}>
              Validate All
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleSaveAll}
              disabled={state.saving || totalErrors > 0}
            >
              {state.saving ? 'Saving...' : 'Save & Continue'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
