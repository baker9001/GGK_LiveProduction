// src/app/system-admin/learning/practice-management/questions-setup/hooks/useQuestions.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/useToast';

interface SubQuestion {
  id: string;
  question_id: string;
  parent_id: string | null;
  level: number;
  part_label: string;
  type: string;
  topic_id: string | null;
  subtopic_id: string | null;
  question_description: string;
  description?: string;
  marks: number;
  hint: string | null;
  explanation: string | null;
  correct_answer: string | null;
  answer_format?: string;
  answer_requirement?: string;
  total_alternatives?: number;
  sort_order: number;
  difficulty: string | null;
  is_confirmed: boolean;
  confirmed_at: string | null;
  confirmed_by: string | null;
  has_context_structure: boolean;
  context_metadata: any;
  created_at: string;
  updated_at: string | null;
  status: string;
  options?: any[];
  correct_answers?: any[];
  distractors?: any[];
  attachments?: any[];
  hints?: any[];
  topics?: any;
  subtopics?: any;
  subQuestions?: SubQuestion[]; // For nested sub-questions
}

interface Question {
  id: string;
  data_structure_id: string;
  region_id: string;
  program_id: string;
  provider_id: string;
  subject_id: string;
  chapter_id: string | null;
  topic_id: string | null;
  subtopic_id: string | null;
  year: number;
  paper_id: string;
  category: string;
  type: string | null;
  question_header: string | null;
  question_description: string;
  hint: string | null;
  marks: number;
  sort_order: number;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string | null;
  explanation: string | null;
  tags: string[] | null;
  import_session_id: string | null;
  difficulty: string | null;
  question_number: string | null;
  figure_file_id: string | null;
  question_content_type: string | null;
  is_confirmed: boolean;
  confirmed_at: string | null;
  confirmed_by: string | null;
  qa_notes: string | null;
  has_context_structure: boolean;
  context_metadata: any;
  answer_format?: string;
  context_extraction_status?: string;
  answer_requirement?: string;
  total_alternatives?: number;
  correct_answer?: string;
  paper?: any;
  topics?: any;
  subtopics?: any;
  sub_questions?: SubQuestion[];
  options?: any[];
  correct_answers?: any[];
  distractors?: any[];
  attachments?: any[];
  hints?: any[];
}

export function useQuestions(filters?: any) {
  const { showToast } = useToast();

  const buildQuery = () => {
    let query = supabase
      .from('questions_master_admin')
      .select(`
        *,
        paper:papers_setup!inner (
          id,
          paper_code,
          exam_year,
          exam_session,
          status,
          paper_type,
          total_marks,
          duration,
          board,
          title
        ),
        topics:edu_topics!topic_id (
          id,
          name,
          code
        ),
        subtopics:edu_subtopics!subtopic_id (
          id,
          name,
          code
        ),
        options:question_options!question_id (
          id,
          label,
          text,
          option_text,
          is_correct,
          order,
          context_type,
          context_value,
          context_label,
          explanation,
          image_id
        ),
        correct_answers:question_correct_answers!question_id (
          id,
          answer,
          marks,
          alternative_id,
          context_type,
          context_value,
          context_label
        ),
        distractors:question_distractors!question_id (
          id,
          option_label,
          context_type,
          context_value,
          context_label
        ),
        attachments:questions_attachments!question_id (
          id,
          file_url,
          file_name,
          file_type,
          file_size,
          uploaded_by,
          uploaded_at
        ),
        hints:questions_hints!question_id (
          id,
          hint_text
        )
      `)
      .order('question_number', { ascending: true })
      .order('sort_order', { ascending: true });

    // Apply filters
    if (filters?.paperId) {
      query = query.eq('paper_id', filters.paperId);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.is_confirmed !== undefined) {
      query = query.eq('is_confirmed', filters.is_confirmed);
    }
    if (filters?.yearFrom && filters?.yearTo) {
      query = query.gte('year', filters.yearFrom).lte('year', filters.yearTo);
    }
    if (filters?.yearFrom && !filters?.yearTo) {
      query = query.gte('year', filters.yearFrom);
    }
    if (!filters?.yearFrom && filters?.yearTo) {
      query = query.lte('year', filters.yearTo);
    }
    if (filters?.subjectId) {
      query = query.eq('subject_id', filters.subjectId);
    }
    if (filters?.topicId) {
      query = query.eq('topic_id', filters.topicId);
    }
    if (filters?.subtopicId) {
      query = query.eq('subtopic_id', filters.subtopicId);
    }
    if (filters?.difficulty) {
      query = query.eq('difficulty', filters.difficulty);
    }
    if (filters?.type) {
      query = query.eq('type', filters.type);
    }
    if (filters?.dataStructureId) {
      query = query.eq('data_structure_id', filters.dataStructureId);
    }
    if (filters?.searchTerm) {
      query = query.or(`question_description.ilike.%${filters.searchTerm}%,question_number.ilike.%${filters.searchTerm}%,question_header.ilike.%${filters.searchTerm}%`);
    }
    if (filters?.tags && filters.tags.length > 0) {
      query = query.contains('tags', filters.tags);
    }
    if (filters?.hasContextStructure !== undefined) {
      query = query.eq('has_context_structure', filters.hasContextStructure);
    }
    if (filters?.contextExtractionStatus) {
      query = query.eq('context_extraction_status', filters.contextExtractionStatus);
    }

    // Limit if specified
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    return query;
  };

  // Recursive function to build sub-question hierarchy
  const buildSubQuestionHierarchy = (subQuestions: SubQuestion[]): SubQuestion[] => {
    const subQuestionMap = new Map<string, SubQuestion>();
    const rootSubQuestions: SubQuestion[] = [];

    // First pass: create map of all sub-questions
    subQuestions.forEach(sq => {
      subQuestionMap.set(sq.id, { ...sq, subQuestions: [] });
    });

    // Second pass: build hierarchy
    subQuestions.forEach(sq => {
      const subQuestion = subQuestionMap.get(sq.id)!;
      if (sq.parent_id && subQuestionMap.has(sq.parent_id)) {
        // This is a child sub-question
        const parent = subQuestionMap.get(sq.parent_id)!;
        if (!parent.subQuestions) parent.subQuestions = [];
        parent.subQuestions.push(subQuestion);
      } else if (!sq.parent_id) {
        // This is a root sub-question (directly under main question)
        rootSubQuestions.push(subQuestion);
      }
    });

    // Sort sub-questions at each level
    const sortSubQuestions = (sqs: SubQuestion[]): SubQuestion[] => {
      return sqs.sort((a, b) => {
        // First sort by sort_order
        if (a.sort_order !== b.sort_order) {
          return a.sort_order - b.sort_order;
        }
        // Then by part_label
        return (a.part_label || '').localeCompare(b.part_label || '');
      }).map(sq => ({
        ...sq,
        subQuestions: sq.subQuestions ? sortSubQuestions(sq.subQuestions) : []
      }));
    };

    return sortSubQuestions(rootSubQuestions);
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['questions', filters],
    queryFn: async () => {
      const { data: questions, error } = await buildQuery();
      
      if (error) {
        console.error('Error fetching questions:', error);
        showToast('Failed to fetch questions', 'error');
        throw error;
      }

      // Fetch all sub-questions for these questions
      if (questions && questions.length > 0) {
        const questionIds = questions.map(q => q.id);
        
        // Fetch ALL sub-questions (including nested ones) for these questions
        const { data: allSubQuestions, error: subError } = await supabase
          .from('sub_questions')
          .select(`
            *,
            topics:edu_topics!topic_id (
              id,
              name,
              code
            ),
            subtopics:edu_subtopics!subtopic_id (
              id,
              name,
              code
            ),
            options:question_options!sub_question_id (
              id,
              label,
              text,
              option_text,
              is_correct,
              order,
              context_type,
              context_value,
              context_label,
              explanation,
              image_id
            ),
            correct_answers:question_correct_answers!sub_question_id (
              id,
              answer,
              marks,
              alternative_id,
              context_type,
              context_value,
              context_label
            ),
            distractors:question_distractors!sub_question_id (
              id,
              option_label,
              context_type,
              context_value,
              context_label
            ),
            attachments:questions_attachments!sub_question_id (
              id,
              file_url,
              file_name,
              file_type,
              file_size,
              uploaded_by,
              uploaded_at
            ),
            hints:questions_hints!sub_question_id (
              id,
              hint_text
            )
          `)
          .in('question_id', questionIds)
          .order('sort_order', { ascending: true })
          .order('part_label', { ascending: true });

        if (subError) {
          console.error('Error fetching sub-questions:', subError);
        } else if (allSubQuestions) {
          // Group sub-questions by question_id
          const subQuestionsByQuestionId = allSubQuestions.reduce((acc, sq) => {
            if (!acc[sq.question_id]) acc[sq.question_id] = [];
            acc[sq.question_id].push(sq);
            return acc;
          }, {} as Record<string, SubQuestion[]>);

          // Attach hierarchical sub-questions to each question
          questions.forEach(question => {
            const questionSubQuestions = subQuestionsByQuestionId[question.id] || [];
            question.sub_questions = buildSubQuestionHierarchy(questionSubQuestions);
          });
        }
      }

      return questions || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });

  return {
    questions: data || [],
    isLoading,
    error,
    refetch,
  };
}

// Export other hooks and utilities
export function useQuestionMutations() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const updateQuestion = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Question> }) => {
      const { data, error } = await supabase
        .from('questions_master_admin')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      showToast('Question updated successfully', 'success');
    },
    onError: (error: any) => {
      showToast(error.message || 'Failed to update question', 'error');
    },
  });

  const updateSubQuestion = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<SubQuestion> }) => {
      const { data, error } = await supabase
        .from('sub_questions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      showToast('Sub-question updated successfully', 'success');
    },
    onError: (error: any) => {
      showToast(error.message || 'Failed to update sub-question', 'error');
    },
  });

  const deleteQuestion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('questions_master_admin')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      showToast('Question deleted successfully', 'success');
    },
    onError: (error: any) => {
      showToast(error.message || 'Failed to delete question', 'error');
    },
  });

  const deleteSubQuestion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sub_questions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      showToast('Sub-question deleted successfully', 'success');
    },
    onError: (error: any) => {
      showToast(error.message || 'Failed to delete sub-question', 'error');
    },
  });

  const createQuestion = useMutation({
    mutationFn: async (newQuestion: Partial<Question>) => {
      const { data, error } = await supabase
        .from('questions_master_admin')
        .insert(newQuestion)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      showToast('Question created successfully', 'success');
    },
    onError: (error: any) => {
      showToast(error.message || 'Failed to create question', 'error');
    },
  });

  const createSubQuestion = useMutation({
    mutationFn: async (newSubQuestion: Partial<SubQuestion>) => {
      const { data, error } = await supabase
        .from('sub_questions')
        .insert(newSubQuestion)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      showToast('Sub-question created successfully', 'success');
    },
    onError: (error: any) => {
      showToast(error.message || 'Failed to create sub-question', 'error');
    },
  });

  const confirmQuestion = useMutation({
    mutationFn: async ({ id, isConfirmed }: { id: string; isConfirmed: boolean }) => {
      const updates = {
        is_confirmed: isConfirmed,
        confirmed_at: isConfirmed ? new Date().toISOString() : null,
        confirmed_by: isConfirmed ? (await supabase.auth.getUser()).data.user?.id : null,
      };

      const { data, error } = await supabase
        .from('questions_master_admin')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      showToast(
        variables.isConfirmed ? 'Question confirmed' : 'Question unconfirmed',
        'success'
      );
    },
    onError: (error: any) => {
      showToast(error.message || 'Failed to update confirmation', 'error');
    },
  });

  const confirmSubQuestion = useMutation({
    mutationFn: async ({ id, isConfirmed }: { id: string; isConfirmed: boolean }) => {
      const updates = {
        is_confirmed: isConfirmed,
        confirmed_at: isConfirmed ? new Date().toISOString() : null,
        confirmed_by: isConfirmed ? (await supabase.auth.getUser()).data.user?.id : null,
      };

      const { data, error } = await supabase
        .from('sub_questions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      showToast(
        variables.isConfirmed ? 'Sub-question confirmed' : 'Sub-question unconfirmed',
        'success'
      );
    },
    onError: (error: any) => {
      showToast(error.message || 'Failed to update confirmation', 'error');
    },
  });

  return {
    updateQuestion,
    updateSubQuestion,
    deleteQuestion,
    deleteSubQuestion,
    createQuestion,
    createSubQuestion,
    confirmQuestion,
    confirmSubQuestion,
  };
}

// Hook for fetching question stats
export function useQuestionStats(paperId?: string) {
  return useQuery({
    queryKey: ['question-stats', paperId],
    queryFn: async () => {
      let query = supabase
        .from('questions_master_admin')
        .select('id, is_confirmed, marks, status, difficulty');

      if (paperId) {
        query = query.eq('paper_id', paperId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const stats = {
        total: data?.length || 0,
        confirmed: data?.filter(q => q.is_confirmed).length || 0,
        pending: data?.filter(q => !q.is_confirmed).length || 0,
        byStatus: {
          draft: data?.filter(q => q.status === 'draft').length || 0,
          pending: data?.filter(q => q.status === 'pending').length || 0,
          approved: data?.filter(q => q.status === 'approved').length || 0,
          rejected: data?.filter(q => q.status === 'rejected').length || 0,
        },
        byDifficulty: {
          easy: data?.filter(q => q.difficulty === 'Easy').length || 0,
          medium: data?.filter(q => q.difficulty === 'Medium').length || 0,
          hard: data?.filter(q => q.difficulty === 'Hard').length || 0,
        },
        totalMarks: data?.reduce((sum, q) => sum + (q.marks || 0), 0) || 0,
      };

      return stats;
    },
  });
}