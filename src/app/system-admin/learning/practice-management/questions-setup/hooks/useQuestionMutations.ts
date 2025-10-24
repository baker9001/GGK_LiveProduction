// src/app/system-admin/learning/practice-management/questions-setup/hooks/useQuestionMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../../../../lib/supabase';
import { toast } from '../../../../../../components/shared/Toast';

interface UpdateFieldParams {
  id: string;
  isSubQuestion: boolean;
  field: string;
  value: any;
}

interface UpdateSubtopicsParams {
  questionId: string;
  subtopicIds: string[];
}

interface UpdateCorrectAnswersParams {
  questionId: string;
  isSubQuestion: boolean;
  correctAnswers: Array<{
    answer: string;
    marks?: number;
    alternative_id?: number;
    context?: {
      type: string;
      value: string;
      label?: string;
    };
  }>;
}

interface UploadAttachmentParams {
  file: File;
  questionId?: string;
  subQuestionId?: string;
}

interface DeleteAttachmentParams {
  attachmentId: string;
  fileUrl: string;
}

interface ConfirmQuestionParams {
  questionId: string;
}

interface ConfirmPaperParams {
  paperId: string;
}

interface UpdatePaperStatusParams {
  paperId: string;
  newStatus: string;
}

export function useQuestionMutations() {
  const queryClient = useQueryClient();
  
  // Update a single field
  const updateField = useMutation({
    mutationFn: async ({ id, isSubQuestion, field, value }: UpdateFieldParams) => {
      const table = isSubQuestion ? 'sub_questions' : 'questions_master_admin';
      
      // For other fields, update the main table
      const { error } = await supabase
        .from(table)
        .update({ 
          [field]: value,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) throw error;
      
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      toast.success('Field updated successfully');
    },
    onError: (error) => {
      console.error('Error updating field:', error);
      toast.error('Failed to update field');
    }
  });
  
  // Update subtopics
  const updateSubtopics = useMutation({
    mutationFn: async ({ questionId, subtopicIds }: UpdateSubtopicsParams) => {
      // First, delete existing subtopic relationships
      const { error: deleteError } = await supabase
        .from('question_subtopics')
        .delete()
        .eq('question_id', questionId)
        .is('sub_question_id', null);
      
      if (deleteError) throw deleteError;
      
      // Then insert new ones
      if (subtopicIds.length > 0) {
        const subtopicRecords = subtopicIds.map(id => ({
          question_id: questionId,
          subtopic_id: id
        }));
        
        const { error: insertError } = await supabase
          .from('question_subtopics')
          .insert(subtopicRecords);
        
        if (insertError) throw insertError;
      }
      
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      toast.success('Subtopics updated successfully');
    },
    onError: (error) => {
      console.error('Error updating subtopics:', error);
      toast.error('Failed to update subtopics');
    }
  });

  // Update correct answers with context support
  const updateCorrectAnswers = useMutation({
    mutationFn: async ({ 
      questionId, 
      isSubQuestion, 
      correctAnswers 
    }: UpdateCorrectAnswersParams) => {
      // First, delete existing correct answers
      const deleteQuery = isSubQuestion
        ? supabase.from('question_correct_answers').delete().eq('sub_question_id', questionId)
        : supabase.from('question_correct_answers').delete().eq('question_id', questionId);
      
      const { error: deleteError } = await deleteQuery;
      if (deleteError) throw deleteError;
      
      // Then insert new correct answers if any
      if (correctAnswers.length > 0) {
        const answersToInsert = correctAnswers.map(ca => ({
          [isSubQuestion ? 'sub_question_id' : 'question_id']: questionId,
          answer: ca.answer,
          marks: ca.marks || 1,
          alternative_id: ca.alternative_id || 1,
          context_type: ca.context?.type || null,
          context_value: ca.context?.value || null,
          context_label: ca.context?.label || null
        }));
        
        const { error: insertError } = await supabase
          .from('question_correct_answers')
          .insert(answersToInsert);
        
        if (insertError) throw insertError;
      }

      // Update the answer_requirement and total_alternatives fields
      const table = isSubQuestion ? 'sub_questions' : 'questions_master_admin';
      let answerRequirement = 'single_choice';
      
      if (correctAnswers.length > 1) {
        // Determine answer requirement based on number of answers
        const uniqueMarks = new Set(correctAnswers.map(ca => ca.marks || 1));
        
        if (uniqueMarks.size === 1 && uniqueMarks.has(1)) {
          // All answers have the same mark value of 1
          if (correctAnswers.length === 2) {
            answerRequirement = 'both_required';
          } else if (correctAnswers.length <= 5) {
            answerRequirement = `any_${Math.min(correctAnswers.length - 1, 3)}_from`;
          } else {
            answerRequirement = 'alternative_methods';
          }
        } else {
          // Different mark values or not all 1
          answerRequirement = 'all_required';
        }
      }

      const { error: updateError } = await supabase
        .from(table)
        .update({
          answer_requirement: answerRequirement,
          total_alternatives: correctAnswers.length,
          // Also update the simple correct_answer field for backward compatibility
          correct_answer: correctAnswers[0]?.answer || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', questionId);

      if (updateError) throw updateError;
      
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      queryClient.invalidateQueries({ queryKey: ['question'] });
      toast.success('Correct answers updated successfully');
    },
    onError: (error) => {
      console.error('Error updating correct answers:', error);
      toast.error('Failed to update correct answers');
    }
  });
  
  // Delete question
  const deleteQuestion = useMutation({
    mutationFn: async (questionId: string) => {
      const { error } = await supabase
        .from('questions_master_admin')
        .delete()
        .eq('id', questionId);
      
      if (error) throw error;
      
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      toast.success('Question deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting question:', error);
      toast.error('Failed to delete question');
    }
  });
  
  // Delete sub-question
  const deleteSubQuestion = useMutation({
    mutationFn: async (subQuestionId: string) => {
      const { error } = await supabase
        .from('sub_questions')
        .delete()
        .eq('id', subQuestionId);
      
      if (error) throw error;
      
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      toast.success('Sub-question deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting sub-question:', error);
      toast.error('Failed to delete sub-question');
    }
  });
  
  // Upload attachment
  const uploadAttachment = useMutation({
    mutationFn: async ({ file, questionId, subQuestionId }: UploadAttachmentParams) => {
      // Try to get current user, but don't fail if not authenticated
      const { data: { user } } = await supabase.auth.getUser();
      
      // Generate unique filename
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2);
      const extension = file.name.split('.').pop() || 'png';
      const fileName = `attachment_${timestamp}_${randomId}.${extension}`;
      
      // Upload to storage
      const { data, error } = await supabase.storage
        .from('questions-attachments')
        .upload(fileName, file, {
          contentType: file.type,
          cacheControl: '3600'
        });
      
      if (error) throw error;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('questions-attachments')
        .getPublicUrl(data.path);
      
      // Save attachment record
      const attachmentRecord: any = {
        question_id: questionId || null,
        sub_question_id: subQuestionId || null,
        file_url: publicUrl,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size
      };
      
      // Only add uploaded_by if we have a user
      if (user?.id) {
        attachmentRecord.uploaded_by = user.id;
      }
      
      const { error: dbError } = await supabase
        .from('questions_attachments')
        .insert(attachmentRecord);
      
      if (dbError) throw dbError;
      
      return { success: true, fileUrl: publicUrl };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      toast.success('Attachment uploaded successfully');
    },
    onError: (error) => {
      console.error('Error uploading attachment:', error);
      toast.error('Failed to upload attachment');
    }
  });
  
  // Delete attachment
  const deleteAttachment = useMutation({
    mutationFn: async ({ attachmentId, fileUrl }: DeleteAttachmentParams) => {
      // Delete from database
      const { error: dbError } = await supabase
        .from('questions_attachments')
        .delete()
        .eq('id', attachmentId);
      
      if (dbError) throw dbError;
      
      // Extract filename from URL and delete from storage
      const urlParts = fileUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      
      const { error: storageError } = await supabase.storage
        .from('questions-attachments')
        .remove([fileName]);
      
      if (storageError) {
        console.error('Error deleting from storage:', storageError);
        // Don't throw - file might already be deleted
      }
      
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      toast.success('Attachment deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting attachment:', error);
      toast.error('Failed to delete attachment');
    }
  });
  
  // Confirm question (change status from qa_review to active)
  const confirmQuestion = useMutation({
    mutationFn: async ({ questionId }: ConfirmQuestionParams) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get the question to find its paper_id
      const { data: question, error: fetchError } = await supabase
        .from('questions_master_admin')
        .select('paper_id')
        .eq('id', questionId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Update main question status
      const { error: questionError } = await supabase
        .from('questions_master_admin')
        .update({ 
          status: 'active',
          is_confirmed: true,
          confirmed_at: new Date().toISOString(),
          confirmed_by: user?.id || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', questionId)
        .eq('status', 'qa_review'); // Only update if currently in qa_review
      
      if (questionError) throw questionError;
      
      // Update all sub-questions status
      const { error: subQuestionError } = await supabase
        .from('sub_questions')
        .update({ 
          status: 'active',
          is_confirmed: true,
          confirmed_at: new Date().toISOString(),
          confirmed_by: user?.id || null,
          updated_at: new Date().toISOString()
        })
        .eq('question_id', questionId)
        .eq('status', 'qa_review'); // Only update if currently in qa_review
      
      if (subQuestionError) throw subQuestionError;

      // Record the confirmation action
      if (user?.id) {
        const { error: confirmError } = await supabase
          .from('question_confirmations')
          .insert({
            question_id: questionId,
            action: 'confirmed',
            performed_by: user.id,
            performed_at: new Date().toISOString()
          });

        if (confirmError) {
          console.error('Error recording confirmation:', confirmError);
          // Don't throw - this is not critical
        }
      }
      
      // Check if all questions in the paper are now confirmed
      if (question.paper_id) {
        const { data: allQuestions, error: checkError } = await supabase
          .from('questions_master_admin')
          .select('id, status')
          .eq('paper_id', question.paper_id);
        
        if (!checkError && allQuestions) {
          const allConfirmed = allQuestions.every(q => q.status === 'active');
          
          if (allConfirmed) {
            // Auto-confirm the paper
            const { error: paperError } = await supabase
              .from('papers_setup')
              .update({ 
                status: 'active',
                qa_completed_at: new Date().toISOString(),
                qa_completed_by: user?.id || null,
                updated_at: new Date().toISOString()
              })
              .eq('id', question.paper_id)
              .eq('status', 'qa_review');
            
            if (!paperError) {
              // Return info that paper was also confirmed
              return { success: true, paperConfirmed: true };
            }
          }
        }
      }
      
      return { success: true, paperConfirmed: false };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      queryClient.invalidateQueries({ queryKey: ['papers'] });
      
      if (data.paperConfirmed) {
        toast.success('Question confirmed and paper automatically confirmed!');
      } else {
        toast.success('Question confirmed successfully');
      }
    },
    onError: (error) => {
      console.error('Error confirming question:', error);
      toast.error('Failed to confirm question');
    }
  });
  
  // Confirm paper (change status from qa_review to active)
  const confirmPaper = useMutation({
    mutationFn: async ({ paperId }: ConfirmPaperParams) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // First, check if all questions in the paper are confirmed (active)
      const { data: questions, error: fetchError } = await supabase
        .from('questions_master_admin')
        .select('id, status')
        .eq('paper_id', paperId);
      
      if (fetchError) throw fetchError;
      
      const hasUnconfirmedQuestions = questions?.some(q => q.status !== 'active');
      
      if (hasUnconfirmedQuestions) {
        throw new Error('All questions must be confirmed before confirming the paper');
      }
      
      // Update paper status
      const { error: paperError } = await supabase
        .from('papers_setup')
        .update({ 
          status: 'active',
          qa_completed_at: new Date().toISOString(),
          qa_completed_by: user?.id || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', paperId)
        .eq('status', 'qa_review'); // Only update if currently in qa_review
      
      if (paperError) throw paperError;
      
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      queryClient.invalidateQueries({ queryKey: ['papers'] });
      toast.success('Paper confirmed successfully');
    },
    onError: (error) => {
      console.error('Error confirming paper:', error);
      if (error instanceof Error && error.message.includes('All questions must be confirmed')) {
        toast.error(error.message);
      } else {
        toast.error('Failed to confirm paper');
      }
    }
  });
  
  // Update paper status
  const updatePaperStatus = useMutation({
    mutationFn: async ({ paperId, newStatus }: UpdatePaperStatusParams) => {
      const { error } = await supabase
        .from('papers_setup')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
          last_status_change_at: new Date().toISOString()
        })
        .eq('id', paperId);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      queryClient.invalidateQueries({ queryKey: ['papers'] });
      toast.success(`Paper status updated to "${variables.newStatus}" successfully`);
    },
    onError: (error) => {
      console.error('Error updating paper status:', error);
      toast.error('Failed to update paper status');
    }
  });

  return {
    updateField,
    updateSubtopics,
    updateCorrectAnswers,
    deleteQuestion,
    deleteSubQuestion,
    uploadAttachment,
    deleteAttachment,
    confirmQuestion,
    confirmPaper,
    updatePaperStatus
  };
}

// Export individual hooks for backward compatibility
export function useDeleteQuestion() {
  const { deleteQuestion } = useQuestionMutations();
  return deleteQuestion;
}

export function useDeleteSubQuestion() {
  const { deleteSubQuestion } = useQuestionMutations();
  return deleteSubQuestion;
}

export function useConfirmQuestion() {
  const { confirmQuestion } = useQuestionMutations();
  return confirmQuestion;
}