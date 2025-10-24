// src/app/system-admin/learning/practice-management/questions-setup/page.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, FileText, BarChart3, X, CheckCircle, Clock, Archive, AlertTriangle } from 'lucide-react';
import { Button } from '../../../../../components/shared/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../../components/shared/Tabs';
import { PaperCard } from './components/PaperCard';
import { ExamSimulation } from './components/ExamSimulation';
import { QuestionAnalytics } from './components/QuestionAnalytics';
import { QuickActionToolbar } from './components/QuickActionToolbar';
import { FilterSection } from './components/FilterSection';
import { supabase } from '../../../../../lib/supabase';
import { toast } from '../../../../../components/shared/Toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { autoPopulateAnswerFields } from '../../../../../services/answerFieldAutoPopulationService';

// Type definitions (keeping your existing types)
export interface Attachment {
  id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

export interface QuestionOption {
  id: string;
  option_text: string;
  is_correct: boolean;
  order: number;
  text?: string;
  label?: string;
}

export interface Subtopic {
  id: string;
  name: string;
  topic_id?: string;
}

export interface CorrectAnswer {
  id: string;
  answer: string;
  marks?: number;
  alternative_id?: number;
  context_type?: string;
  context_value?: string;
  context_label?: string;
}

export interface SubQuestion {
  id: string;
  part_label?: string;
  question_description: string;
  marks: number;
  difficulty?: string;
  type: 'mcq' | 'tf' | 'descriptive';
  status: string;
  topic_id?: string;
  topic_name?: string;
  unit_name?: string;
  unit_id?: string;
  subtopic_id?: string;
  subtopics?: Subtopic[];
  options?: QuestionOption[];
  attachments: Attachment[];
  hint?: string;
  explanation?: string;
  answer_format?: string;
  answer_requirement?: string;
  total_alternatives?: number;
  correct_answers?: CorrectAnswer[];
  correct_answer?: string;
  parent_id?: string | null;
  level?: number | null;
  order_index?: number | null;
}

export interface Question {
  id: string;
  question_number: string;
  question_description: string;
  marks: number;
  type: 'mcq' | 'tf' | 'descriptive';
  difficulty: string;
  category: string;
  status: string;
  topic_id?: string;
  topic_name?: string;
  subtopic_id?: string;
  subtopics?: Subtopic[];
  options?: QuestionOption[];
  parts: SubQuestion[];
  attachments: Attachment[];
  hint?: string;
  explanation?: string;
  unit_id?: string;
  answer_format?: string;
  answer_requirement?: string;
  total_alternatives?: number;
  correct_answers?: CorrectAnswer[];
  correct_answer?: string;
}

export interface GroupedPaper {
  id: string;
  code: string;
  subject: string;
  provider: string;
  program: string;
  region: string;
  status: string;
  duration?: string;
  total_marks?: number;
  subject_id?: string;
  provider_id?: string;
  program_id?: string;
  region_id?: string;
  data_structure_id?: string;
  exam_year?: number;
  exam_session?: string;
  title?: string;
  questions: Question[];
}

interface SimulationPaper {
  id: string;
  code: string;
  subject: string;
  duration?: string;
  total_marks: number;
  questions: Array<{
    id: string;
    question_number: string;
    question_description: string;
    marks: number;
    type: 'mcq' | 'tf' | 'descriptive';
    difficulty: string;
    topic_name?: string;
    subtopic_names?: string[];
    options?: QuestionOption[];
    parts: SubQuestion[];
    hint?: string;
    explanation?: string;
    attachments?: Attachment[];
  }>;
}

interface FilterOptions {
  status: string;
  provider: string;
  subject: string;
  difficulty: string;
  questionType: string;
  marksRange: [number, number];
  hasAttachments: boolean | null;
  validationStatus: string;
  dateRange: [Date | null, Date | null];
}

export default function QuestionsSetupPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('analytics');
  const [filters, setFilters] = useState({
    provider_ids: [] as string[],
    subject_ids: [] as string[],
    unit_ids: [] as string[],
    difficulty: [] as string[],
    validation_status: [] as string[]
  });
  const [simulationPaper, setSimulationPaper] = useState<SimulationPaper | null>(null);
  const [isQAMode, setIsQAMode] = useState(true);
  const queryClient = useQueryClient();

  // Fetch providers and subjects for filters
  const { data: providers = [] } = useQuery({
    queryKey: ['providers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('providers')
        .select('id, name')
        .eq('status', 'active')
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('edu_subjects')
        .select('id, name')
        .eq('status', 'active')
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch units for filters
  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('edu_units')
        .select('id, name, subject_id')
        .eq('status', 'active')
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch questions with proper grouping
  const { data: groupedPapers = [], isLoading, refetch } = useQuery({
    queryKey: ['questions', filters, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('questions_master_admin')
        .select(`
          id,
          paper_id,
          question_number,
          question_description,
          marks,
          type,
          difficulty,
          category,
          status,
          topic_id,
          subtopic_id,
          answer_format,
          answer_requirement,
          total_alternatives,
          correct_answer,
          primary_subtopic:edu_subtopics!questions_master_admin_subtopic_id_fkey (
            id,
            name,
            topic_id
          ),
          explanation,
          hint,
          created_at,
          updated_at,
          papers_setup!inner(
            id,
            paper_code,
            subject_id,
            provider_id,
            status,
            duration,
            data_structure_id,
            exam_year,
            exam_session,
            title
          ),
          question_subtopics(
            subtopic_id,
            edu_subtopics(
              id,
              name,
              topic_id
            )
          ),
          question_options(
            id,
            option_text,
            is_correct,
            order,
            label,
            text
          ),
          question_correct_answers(
            id,
            answer,
            marks,
            alternative_id,
            context_type,
            context_value,
            context_label
          ),
          sub_questions(
            id,
            question_id,
            type,
            part_label,
            topic_id,
            subtopic_id,
            question_description,
            marks,
            hint,
            sort_order,
            created_at,
            updated_at,
            order_index,
            order,
            parent_id,
            level,
            explanation,
            status,
            answer_format,
            answer_requirement,
            total_alternatives,
            correct_answer,
            primary_subtopic:edu_subtopics!sub_questions_subtopic_id_fkey (
              id,
              name,
              topic_id
            ),
            question_subtopics(
              subtopic_id,
              edu_subtopics(
                id,
                name,
                topic_id
              )
            ),
            question_options(
              id,
              option_text,
              is_correct,
              order,
              label,
              text
            ),
            question_correct_answers(
              id,
              answer,
              marks,
              alternative_id,
              context_type,
              context_value,
              context_label
            ),
            questions_attachments(
              id,
              file_url,
              file_name,
              file_type,
              file_size,
              created_at
            ),
            questions_hints(
              hint_text
            )
          ),
          questions_attachments(
            id,
            file_url,
            file_name,
            file_type,
            file_size,
            created_at
          ),
          questions_hints(
            hint_text
          )
        `)
        .order('question_number', { ascending: true });

      // Apply filters
      if (filters.difficulty.length > 0) {
        query = query.in('difficulty', filters.difficulty);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching questions:', error);
        toast.error('Failed to load questions');
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Fetch paper details with data structure info
      const paperIds = [...new Set(data.map(q => q.paper_id).filter(Boolean))];

      const [paperDetailsResponse, topicDetailsResponse] = await Promise.all([
        paperIds.length
          ? supabase
              .from('papers_setup')
              .select(`
                id,
                paper_code,
                data_structure_id,
                data_structures(
                  id,
                  edu_subjects(id, name),
                  providers(id, name),
                  programs(id, name),
                  regions(id, name)
                )
              `)
              .in('id', paperIds)
          : Promise.resolve({ data: [], error: null }),
        (() => {
          const topicIds = [
            ...new Set([
              ...data.map(q => q.topic_id).filter(Boolean),
              ...data
                .flatMap(q => q.sub_questions?.map((sq: any) => sq.topic_id).filter(Boolean))
            ])
          ];

          return topicIds.length
            ? supabase
                .from('edu_topics')
                .select('id, name, unit_id')
                .in('id', topicIds)
            : Promise.resolve({ data: [], error: null });
        })()
      ]);

      if (paperDetailsResponse.error) {
        console.error('Error fetching paper details:', paperDetailsResponse.error);
      }

      if (topicDetailsResponse.error) {
        console.error('Error fetching topic details:', topicDetailsResponse.error);
      }

      const paperDetails = paperDetailsResponse.data ?? [];
      const topicDetails = topicDetailsResponse.data ?? [];

      const paperDetailsMap = new Map(paperDetails.map(p => [p.id, p]));
      const topicMap = new Map(
        topicDetails.map(t => [t.id, { name: t.name, unit_id: t.unit_id }])
      );

      const unitIds = [...new Set(topicDetails.map(t => t.unit_id).filter(Boolean))];

      const { data: unitDetails, error: unitError } = unitIds.length
        ? await supabase
            .from('edu_units')
            .select('id, name')
            .in('id', unitIds)
        : { data: [], error: null };

      if (unitError) {
        console.error('Error fetching units:', unitError);
      }

      const unitMap = new Map((unitDetails ?? []).map(u => [u.id, u.name]));

      // Group questions by paper
      const paperGroups: Record<string, GroupedPaper> = {};

      data?.forEach((question) => {
        const paper = question.papers_setup;
        const paperId = paper.id;
        const paperDetail = paperDetailsMap.get(paperId);

        if (!paperGroups[paperId]) {
          const dataStructure = paperDetail?.data_structures;
          paperGroups[paperId] = {
            id: paperId,
            code: paper.paper_code,
            subject: dataStructure?.edu_subjects?.name || 'Unknown',
            provider: dataStructure?.providers?.name || 'Unknown',
            program: dataStructure?.programs?.name || 'Unknown',
            region: dataStructure?.regions?.name || 'Unknown',
            status: paper.status,
            duration: paper.duration,
            total_marks: 0,
            subject_id: dataStructure?.edu_subjects?.id,
            provider_id: dataStructure?.providers?.id,
            program_id: dataStructure?.programs?.id,
            region_id: dataStructure?.regions?.id,
            data_structure_id: dataStructure?.id || paperDetail?.data_structure_id,
            exam_year: paper.exam_year,
            exam_session: paper.exam_session,
            title: paper.title,
            questions: []
          };
        }

        // Calculate total marks
        const questionMarks = question.marks + (question.sub_questions?.reduce((sum: number, sq: any) => sum + sq.marks, 0) || 0);
        paperGroups[paperId].total_marks += questionMarks;

        // Get topic and unit information
        const primarySubtopicRecord = question.primary_subtopic;
        const inferredTopicId = question.topic_id || primarySubtopicRecord?.topic_id || '';
        const topicInfo = topicMap.get(inferredTopicId);
        const unitName = topicInfo?.unit_id ? unitMap.get(topicInfo.unit_id) : undefined;

        const additionalSubtopics = (question.question_subtopics || []).map((qs: any) => ({
          id: qs.edu_subtopics.id,
          name: qs.edu_subtopics.name,
          topic_id: qs.edu_subtopics.topic_id
        }));

        const mergedSubtopicsMap = new Map<string, Subtopic>();

        if (primarySubtopicRecord?.id) {
          mergedSubtopicsMap.set(primarySubtopicRecord.id, {
            id: primarySubtopicRecord.id,
            name: primarySubtopicRecord.name,
            topic_id: primarySubtopicRecord.topic_id
          });
        }

        additionalSubtopics.forEach(subtopic => {
          if (subtopic.id && !mergedSubtopicsMap.has(subtopic.id)) {
            mergedSubtopicsMap.set(subtopic.id, subtopic);
          }
        });

        const mergedSubtopics = Array.from(mergedSubtopicsMap.values());

        const mapOptions = (options: any[] | null | undefined): QuestionOption[] => {
          if (!Array.isArray(options)) return [];

          return options
            .map((option, index) => {
              const resolvedOrder = typeof option.order === 'number' ? option.order : index;
              const optionText = option.option_text || option.text || '';

              return {
                id: option.id,
                option_text: optionText,
                text: optionText,
                is_correct: Boolean(option.is_correct),
                order: resolvedOrder,
                label: option.label || String.fromCharCode(65 + resolvedOrder)
              } as QuestionOption;
            })
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        };

        const mapCorrectAnswers = (answers: any[] | null | undefined): CorrectAnswer[] => {
          if (!Array.isArray(answers)) return [];

          return answers.map(answer => ({
            id: answer.id,
            answer: answer.answer,
            marks: answer.marks ?? undefined,
            alternative_id: answer.alternative_id ?? undefined,
            context_type: answer.context_type ?? undefined,
            context_value: answer.context_value ?? undefined,
            context_label: answer.context_label ?? undefined
          }));
        };

        // Format the question
        const formattedQuestion: Question = {
          id: question.id,
          question_number: question.question_number,
          question_description: question.question_description,
          marks: question.marks,
          type: question.type,
          difficulty: question.difficulty,
          category: question.category,
          status: question.status, // Use actual question status from database
          topic_id: inferredTopicId || undefined,
          topic_name: topicInfo?.name,
          unit_name: unitName,
          unit_id: topicInfo?.unit_id,
          subtopic_id: question.subtopic_id || primarySubtopicRecord?.id || undefined,
          subtopics: mergedSubtopics,
          options: mapOptions(question.question_options),
          attachments: question.questions_attachments || [],
          hint: question.hint || question.questions_hints?.[0]?.hint_text,
          explanation: question.explanation,
          answer_format: question.answer_format || undefined,
          answer_requirement: question.answer_requirement || undefined,
          total_alternatives: question.total_alternatives || undefined,
          correct_answer: question.correct_answer || undefined,
          correct_answers: mapCorrectAnswers(question.question_correct_answers),
          parts: question.sub_questions?.
            sort((a: any, b: any) => (a.sort_order || a.order_index || a.order || 0) - (b.sort_order || b.order_index || b.order || 0))
            .map((sq: any, index: number) => {
              const primarySubQuestionSubtopic = sq.primary_subtopic;
              const subQuestionTopicId = sq.topic_id || primarySubQuestionSubtopic?.topic_id || '';
              const subQuestionTopicInfo = topicMap.get(subQuestionTopicId);
              const subQuestionUnitName = subQuestionTopicInfo?.unit_id
                ? unitMap.get(subQuestionTopicInfo.unit_id)
                : undefined;

              const subQuestionAdditionalSubtopics = (sq.question_subtopics || []).map((qs: any) => ({
                id: qs.edu_subtopics.id,
                name: qs.edu_subtopics.name,
                topic_id: qs.edu_subtopics.topic_id
              }));

              const subQuestionMergedSubtopicsMap = new Map<string, Subtopic>();

              if (primarySubQuestionSubtopic?.id) {
                subQuestionMergedSubtopicsMap.set(primarySubQuestionSubtopic.id, {
                  id: primarySubQuestionSubtopic.id,
                  name: primarySubQuestionSubtopic.name,
                  topic_id: primarySubQuestionSubtopic.topic_id
                });
              }

              subQuestionAdditionalSubtopics.forEach(subtopic => {
                if (subtopic.id && !subQuestionMergedSubtopicsMap.has(subtopic.id)) {
                  subQuestionMergedSubtopicsMap.set(subtopic.id, subtopic);
                }
              });

              const subQuestionMergedSubtopics = Array.from(subQuestionMergedSubtopicsMap.values());

              return {
                id: sq.id,
                part_label: sq.part_label || `Part ${String.fromCharCode(97 + index)}`,
                question_description: sq.question_description,
                marks: sq.marks,
                difficulty: 'medium', // Default since sub_questions doesn't have difficulty column
                type: sq.type,
                status: sq.status, // Use actual sub-question status from database
                topic_id: subQuestionTopicId || undefined,
                topic_name: subQuestionTopicInfo?.name,
                unit_name: subQuestionUnitName,
                unit_id: subQuestionTopicInfo?.unit_id,
                subtopic_id: sq.subtopic_id || primarySubQuestionSubtopic?.id || undefined,
                subtopics: subQuestionMergedSubtopics,
                options: mapOptions(sq.question_options),
                attachments: sq.questions_attachments || [],
                hint: sq.hint || sq.questions_hints?.[0]?.hint_text,
                explanation: sq.explanation,
                answer_format: sq.answer_format || undefined,
                answer_requirement: sq.answer_requirement || undefined,
                total_alternatives: sq.total_alternatives || undefined,
                correct_answers: mapCorrectAnswers(sq.question_correct_answers),
                correct_answer: sq.correct_answer || undefined,
                parent_id: sq.parent_id || null,
                level: sq.level ?? null,
                order_index: sq.sort_order || sq.order_index || sq.order || index
              };
            }) || []
        };

        paperGroups[paperId].questions.push(formattedQuestion);
      });

      return Object.values(paperGroups);
    }
  });

  // Fetch topics and subtopics for the dropdowns
  const { data: topics = [] } = useQuery({
    queryKey: ['topics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('edu_topics')
        .select('id, name, unit_id')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      return data || [];
    }
  });

  const { data: subtopics = [] } = useQuery({
    queryKey: ['subtopics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('edu_subtopics')
        .select('id, name, topic_id')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      return data || [];
    }
  });

  const subjectsForFilters = useMemo(
    () => {
      const nameById = new Map(subjects.map(subject => [subject.id, subject.name]));
      const aggregate = new Map<
        string,
        { id: string; name: string; providerIds: Set<string> }
      >();

      groupedPapers.forEach(paper => {
        if (!paper.subject_id) return;
        const existing = aggregate.get(paper.subject_id);
        const providerIds = existing?.providerIds || new Set<string>();
        if (paper.provider_id) {
          providerIds.add(paper.provider_id);
        }

        aggregate.set(paper.subject_id, {
          id: paper.subject_id,
          name: nameById.get(paper.subject_id) || paper.subject || 'Unknown',
          providerIds
        });
      });

      subjects.forEach(subject => {
        if (!aggregate.has(subject.id)) {
          aggregate.set(subject.id, {
            id: subject.id,
            name: subject.name,
            providerIds: new Set<string>()
          });
        }
      });

      return Array.from(aggregate.values()).map(subject => ({
        id: subject.id,
        name: subject.name,
        provider_ids: Array.from(subject.providerIds)
      }));
    },
    [subjects, groupedPapers]
  );

  const hasActiveFilters = useMemo(
    () =>
      Boolean(searchTerm.trim()) ||
      filters.provider_ids.length > 0 ||
      filters.subject_ids.length > 0 ||
      filters.unit_ids.length > 0 ||
      filters.difficulty.length > 0 ||
      filters.validation_status.length > 0,
    [searchTerm, filters]
  );

  // Enhanced filtering logic
  const filteredPapers = groupedPapers.filter(paper => {
    // Search term filter
    const matchesSearch = !searchTerm ||
      paper.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      paper.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      paper.questions.some(q => 
        q.question_description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    // Provider filter
    const matchesProvider =
      filters.provider_ids.length === 0 ||
      (paper.provider_id
        ? filters.provider_ids.includes(paper.provider_id)
        : filters.provider_ids.some(id => {
            const provider = providers.find(p => p.id === id);
            return (
              provider?.name?.toLowerCase() === paper.provider?.toLowerCase()
            );
          }));

    // Subject filter
    const matchesSubject =
      filters.subject_ids.length === 0 ||
      (paper.subject_id
        ? filters.subject_ids.includes(paper.subject_id)
        : filters.subject_ids.some(id => {
            const subject = subjectsForFilters.find(s => s.id === id);
            return subject?.name?.toLowerCase() === paper.subject?.toLowerCase();
          }));

    // Unit filter
    const matchesUnit =
      filters.unit_ids.length === 0 ||
      paper.questions.some(q => {
        const matchesQuestionUnit = q.unit_id && filters.unit_ids.includes(q.unit_id);
        const matchesPartUnit = q.parts?.some(
          part => part.unit_id && filters.unit_ids.includes(part.unit_id)
        );
        return matchesQuestionUnit || matchesPartUnit;
      });
    
    // Validation status filter
    let matchesValidation = true;
    if (filters.validation_status.length > 0) {
      const hasIncomplete = paper.questions.some(q => {
        const isIncomplete = !q.question_description || !q.marks || 
                           !q.difficulty || !q.topic_id || !q.hint || !q.explanation;
        return isIncomplete;
      });
      
      const needsAttachment = paper.questions.some(q => {
        const mentionsFigure = q.question_description?.toLowerCase().includes('figure') || 
                             q.question_description?.toLowerCase().includes('diagram');
        const hasAttachment = q.attachments && q.attachments.length > 0;
        return mentionsFigure && !hasAttachment;
      });
      
      matchesValidation = filters.validation_status.some(status => {
        if (status === 'complete') return !hasIncomplete && !needsAttachment;
        if (status === 'incomplete') return hasIncomplete;
        if (status === 'needs-attachment') return needsAttachment;
        return false;
      });
    }
    
    return matchesSearch && matchesProvider && matchesSubject && matchesUnit && matchesValidation;
  });

  // Filter papers by status for tabs
  const publishedPapers = groupedPapers.filter(paper => paper.status === 'active');
  const underQAPapers = groupedPapers.filter(paper => 
    paper.status === 'draft' || paper.status === 'qa_review'
  );
  const archivedPapers = groupedPapers.filter(paper => paper.status === 'inactive');

  const handleDeleteQuestion = async (question: Question) => {
    if (!window.confirm('Are you sure you want to delete this question?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('questions_master_admin')
        .delete()
        .eq('id', question.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['questions'] });
      toast.success('Question deleted successfully');
    } catch (error) {
      console.error('Error deleting question:', error);
      toast.error('Failed to delete question');
    }
  };

  const handleDeleteSubQuestion = async (subQuestion: SubQuestion) => {
    if (!window.confirm('Are you sure you want to delete this sub-question?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('sub_questions')
        .delete()
        .eq('id', subQuestion.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['questions'] });
      toast.success('Sub-question deleted successfully');
    } catch (error) {
      console.error('Error deleting sub-question:', error);
      toast.error('Failed to delete sub-question');
    }
  };

  const handleStartTestMode = (paper: GroupedPaper) => {
    const testPaper: SimulationPaper = {
      id: paper.id,
      code: paper.code,
      subject: paper.subject,
      duration: paper.duration,
      total_marks: paper.total_marks || 0,
      questions: paper.questions.map(q => ({
        ...q,
        subtopic_names: q.subtopics?.map(s => s.name) || [],
        attachments: q.attachments || []
      }))
    };
    
    setSimulationPaper(testPaper);
  };

  const handleBulkExport = () => {
    const exportData = {
      exportDate: new Date().toISOString(),
      totalPapers: filteredPapers.length,
      papers: filteredPapers.map(paper => ({
        code: paper.code,
        subject: paper.subject,
        provider: paper.provider,
        program: paper.program,
        region: paper.region,
        status: paper.status,
        duration: paper.duration,
        total_marks: paper.total_marks,
        questions: paper.questions.map(q => ({
          number: q.question_number,
          description: q.question_description,
          marks: q.marks,
          type: q.type,
          difficulty: q.difficulty,
          topic: q.topic_name,
          subtopics: q.subtopics?.map(s => s.name),
          hint: q.hint,
          explanation: q.explanation,
          options: q.options,
          parts: q.parts
        }))
      }))
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `questions_export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success(`Exported ${filteredPapers.length} papers successfully`);
  };

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAutoPopulate = async () => {
    if (!window.confirm('This will auto-populate missing Answer Format and Answer Requirement fields based on question characteristics. Continue?')) {
      return;
    }

    try {
      toast.info('Auto-populating answer fields...');

      const result = await autoPopulateAnswerFields();

      if (result.errors.length > 0) {
        console.error('Auto-population errors:', result.errors);
        toast.error(`Completed with ${result.errors.length} errors. Check console for details.`);
      } else {
        toast.success(
          `Successfully updated ${result.questionsUpdated} questions and ${result.subQuestionsUpdated} sub-questions`
        );
      }

      queryClient.invalidateQueries({ queryKey: ['questions'] });
    } catch (error) {
      console.error('Error auto-populating answer fields:', error);
      toast.error('Failed to auto-populate answer fields');
    }
  };

  if (simulationPaper) {
    return (
      <ExamSimulation
        paper={simulationPaper}
        onExit={() => setSimulationPaper(null)}
        isQAMode={isQAMode}
      />
    );
  }

  const renderPapersList = (papers: GroupedPaper[], emptyMessage: string) => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      );
    }

    if (papers.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <FileText className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {emptyMessage}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-md">
            {hasActiveFilters
              ? 'Try adjusting your search criteria or filters'
              : 'No papers available in this category'}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {papers.map((paper) => (
          <PaperCard
            key={paper.id}
            paper={paper}
            topics={topics}
            subtopics={subtopics}
            units={units}
            onDeleteQuestion={handleDeleteQuestion}
            onDeleteSubQuestion={handleDeleteSubQuestion}
            onStartTestMode={() => handleStartTestMode(paper)}
            onStartSimulation={() => handleStartTestMode(paper)}
            showQAActions={isQAMode}
            readOnly={!isQAMode}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="page-title flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2" data-testid="page-title">
              Questions Setup & QA
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Review and manage exam questions
              {isQAMode && <span className="ml-2 text-blue-600 dark:text-blue-400">(QA Mode)</span>}
            </p>
          </div>
        </div>

      {/* Progress Overview Card */}
      {filteredPapers.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {groupedPapers.flatMap(p => p.questions).length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Total Questions</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {groupedPapers.flatMap(p => p.questions).filter(q => q.status === 'active').length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Active</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                {groupedPapers.flatMap(p => p.questions).filter(q => q.status === 'draft' || q.status === 'qa_review').length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Under Review</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-600 dark:text-gray-400">
                {filteredPapers.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Papers</div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <FilterSection
        providers={providers}
        subjects={subjectsForFilters}
        units={units}
        searchTerm={searchTerm}
        filters={filters}
        resultCount={filteredPapers.length}
        onSearchChange={setSearchTerm}
        onFilterChange={setFilters}
        onClearFilters={() => {
          setSearchTerm('');
          setFilters({
            provider_ids: [],
            subject_ids: [],
            unit_ids: [],
            difficulty: [],
            validation_status: []
          });
        }}
      />

      {/* Main Content with Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full flex-wrap gap-3">
          <TabsTrigger value="analytics" className="flex-1 min-w-[200px]">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger
            value="qa"
            className="flex-1 min-w-[200px] text-orange-600 dark:text-orange-400"
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Under QA ({underQAPapers.length})
          </TabsTrigger>
          <TabsTrigger
            value="published"
            className="flex-1 min-w-[200px] text-green-600 dark:text-green-400"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Published Papers ({publishedPapers.length})
          </TabsTrigger>
          <TabsTrigger
            value="archived"
            className="flex-1 min-w-[200px] text-gray-600 dark:text-gray-400"
          >
            <Archive className="h-4 w-4 mr-2" />
            Archived ({archivedPapers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-6">
          <QuestionAnalytics papers={groupedPapers} />
        </TabsContent>

        <TabsContent value="qa" className="space-y-6">
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 mr-3 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-orange-800 dark:text-orange-300 mb-2">
                  Papers Under QA Review
                </h3>
                <p className="text-sm text-orange-700 dark:text-orange-400 mb-3">
                  Papers in this tab are in <strong>Draft</strong> status after being imported from Paper Setup.
                  They must be reviewed and explicitly published before becoming accessible to teachers and students.
                </p>
                <div className="text-sm text-orange-700 dark:text-orange-400 space-y-1">
                  <p className="font-medium">Workflow:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Review questions for accuracy and completeness</li>
                    <li>Verify all questions have correct answers, difficulty, and topics</li>
                    <li>Ensure questions mentioning figures have attachments</li>
                    <li>Click "Publish Paper" to make the paper active</li>
                  </ol>
                  <p className="mt-2 text-xs italic">
                    Only <strong>Active</strong> (published) papers are accessible to other modules (Teachers, Students, Entity).
                  </p>
                </div>
              </div>
            </div>
          </div>
          {renderPapersList(underQAPapers, "No papers under QA review")}
        </TabsContent>

        <TabsContent value="published" className="space-y-6">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-start">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-green-800 dark:text-green-300 mb-1">
                  Published Papers (Active)
                </h3>
                <p className="text-sm text-green-700 dark:text-green-400">
                  These papers have been reviewed, validated, and published with <strong>Active</strong> status.
                  They are now accessible across the platform to teachers, students, and entity modules.
                </p>
                <p className="text-xs text-green-600 dark:text-green-500 mt-2 italic">
                  Papers can be archived or returned to draft if corrections are needed.
                </p>
              </div>
            </div>
          </div>
          {renderPapersList(publishedPapers, "No published papers found")}
        </TabsContent>

        <TabsContent value="archived" className="space-y-6">
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center">
              <Archive className="h-5 w-5 text-gray-600 dark:text-gray-400 mr-2" />
              <div>
                <h3 className="text-sm font-medium text-gray-800 dark:text-gray-300">
                  Archived Papers
                </h3>
                <p className="text-sm text-gray-700 dark:text-gray-400">
                  These papers have been deactivated and are no longer in use. 
                  They can be reactivated if needed.
                </p>
              </div>
            </div>
          </div>
          {renderPapersList(archivedPapers, "No archived papers found")}
        </TabsContent>
      </Tabs>
      
        {/* Quick Action Toolbar */}
        <QuickActionToolbar
          onScrollToTop={handleScrollToTop}
          onRefresh={() => refetch()}
          onShowAnalytics={() => setActiveTab('analytics')}
          onBulkImport={() => toast.info('Bulk import feature coming soon')}
          onBulkExport={handleBulkExport}
          onAutoFix={handleAutoPopulate}
        />
      </div>
    </div>
  );
}
