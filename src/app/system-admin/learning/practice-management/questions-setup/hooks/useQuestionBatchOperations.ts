// src/app/system-admin/learning/practice-management/questions-setup/hooks/useQuestionBatchOperations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../../../../lib/supabase';
import { toast } from '../../../../../../components/shared/Toast';

interface BatchConfirmQuestionsParams {
  questionIds: string[];
  paperId?: string;
}

interface BatchUpdateFieldParams {
  updates: Array<{
    id: string;
    isSubQuestion: boolean;
    field: string;
    value: any;
  }>;
}

interface BatchDeleteParams {
  questionIds?: string[];
  subQuestionIds?: string[];
}

export function useQuestionBatchOperations() {
  const queryClient = useQueryClient();
  
  // Batch confirm multiple questions
  const batchConfirmQuestions = useMutation({
    mutationFn: async ({ questionIds, paperId }: BatchConfirmQuestionsParams) => {
      if (questionIds.length === 0) return { success: true };
      
      // Update all questions in batch
      const { error: questionsError } = await supabase
        .from('questions_master_admin')
        .update({ 
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .in('id', questionIds)
        .eq('status', 'qa_review');
      
      if (questionsError) throw questionsError;
      
      // Update all related sub-questions
      const { error: subQuestionsError } = await supabase
        .from('sub_questions')
        .update({ 
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .in('question_id', questionIds)
        .eq('status', 'qa_review');
      
      if (subQuestionsError) throw subQuestionsError;
      
      // Check if paper should be auto-confirmed
      if (paperId) {
        const { data: remainingQuestions } = await supabase
          .from('questions_master_admin')
          .select('id')
          .eq('paper_id', paperId)
          .neq('status', 'active');
        
        if (!remainingQuestions || remainingQuestions.length === 0) {
          const { error: paperError } = await supabase
            .from('papers_setup')
            .update({ 
              status: 'active',
              updated_at: new Date().toISOString()
            })
            .eq('id', paperId)
            .eq('status', 'qa_review');
          
          if (!paperError) {
            return { success: true, paperConfirmed: true };
          }
        }
      }
      
      return { success: true, paperConfirmed: false };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      queryClient.invalidateQueries({ queryKey: ['papers'] });
      
      if (data.paperConfirmed) {
        toast.success('All questions confirmed and paper automatically confirmed!');
      } else {
        toast.success('Selected questions confirmed successfully');
      }
    },
    onError: (error) => {
      console.error('Error confirming questions:', error);
      toast.error('Failed to confirm questions');
    }
  });
  
  // Batch update multiple fields
  const batchUpdateFields = useMutation({
    mutationFn: async ({ updates }: BatchUpdateFieldParams) => {
      // Group updates by table
      const questionUpdates = updates.filter(u => !u.isSubQuestion);
      const subQuestionUpdates = updates.filter(u => u.isSubQuestion);
      
      // Process question updates
      for (const update of questionUpdates) {
        const { error } = await supabase
          .from('questions_master_admin')
          .update({ 
            [update.field]: update.value,
            updated_at: new Date().toISOString()
          })
          .eq('id', update.id);
        
        if (error) throw error;
      }
      
      // Process sub-question updates
      for (const update of subQuestionUpdates) {
        const { error } = await supabase
          .from('sub_questions')
          .update({ 
            [update.field]: update.value,
            updated_at: new Date().toISOString()
          })
          .eq('id', update.id);
        
        if (error) throw error;
      }
      
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      toast.success('Batch update completed successfully');
    },
    onError: (error) => {
      console.error('Error in batch update:', error);
      toast.error('Failed to complete batch update');
    }
  });
  
  // Batch delete
  const batchDelete = useMutation({
    mutationFn: async ({ questionIds = [], subQuestionIds = [] }: BatchDeleteParams) => {
      // Delete sub-questions first (due to foreign key constraints)
      if (subQuestionIds.length > 0) {
        const { error } = await supabase
          .from('sub_questions')
          .delete()
          .in('id', subQuestionIds);
        
        if (error) throw error;
      }
      
      // Delete questions
      if (questionIds.length > 0) {
        const { error } = await supabase
          .from('questions_master_admin')
          .delete()
          .in('id', questionIds);
        
        if (error) throw error;
      }
      
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      toast.success('Selected items deleted successfully');
    },
    onError: (error) => {
      console.error('Error in batch delete:', error);
      toast.error('Failed to delete selected items');
    }
  });
  
  // Auto-assign difficulty based on marks
  const autoAssignDifficulty = useMutation({
    mutationFn: async (paperId: string) => {
      // Get all questions for the paper
      const { data: questions, error: fetchError } = await supabase
        .from('questions_master_admin')
        .select('id, marks')
        .eq('paper_id', paperId);
      
      if (fetchError) throw fetchError;
      
      // Auto-assign difficulty based on marks
      const updates = questions?.map(q => {
        let difficulty = 'medium';
        if (q.marks <= 2) difficulty = 'easy';
        else if (q.marks >= 5) difficulty = 'hard';
        
        return {
          id: q.id,
          isSubQuestion: false,
          field: 'difficulty',
          value: difficulty
        };
      }) || [];
      
      // Apply updates
      for (const update of updates) {
        const { error } = await supabase
          .from('questions_master_admin')
          .update({ 
            difficulty: update.value,
            updated_at: new Date().toISOString()
          })
          .eq('id', update.id);
        
        if (error) throw error;
      }
      
      return { success: true, count: updates.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      toast.success(`Auto-assigned difficulty for ${data.count} questions`);
    },
    onError: (error) => {
      console.error('Error auto-assigning difficulty:', error);
      toast.error('Failed to auto-assign difficulty');
    }
  });
  
  return {
    batchConfirmQuestions,
    batchUpdateFields,
    batchDelete,
    autoAssignDifficulty
  };
}