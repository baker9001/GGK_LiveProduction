// src/app/system-admin/learning/practice-management/questions-setup/hooks/useQuestionMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../../../../lib/supabase';
import { toast } from '../../../../../../components/shared/Toast';
import type { PaperStatus } from '../../../../../../types/questions';
import { deriveAnswerRequirement } from '../../../../../../lib/extraction/answerRequirementDeriver';
import { TableTemplateService, type TableTemplateDTO } from '../../../../../../services/TableTemplateService';

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

interface SaveTableTemplateParams {
  template: TableTemplateDTO;
}

export function useQuestionMutations() {
  const queryClient = useQueryClient();

  const STATUS_LABELS: Record<PaperStatus | string, string> = {
    draft: 'Draft',
    qa_review: 'Under QA',
    active: 'Published',
    inactive: 'Archived',
    archived: 'Archived',
    completed: 'Completed',
    failed: 'Failed'
  };
  
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
      try {
        // First, delete existing correct answers with better error handling
        const deleteQuery = isSubQuestion
          ? supabase.from('question_correct_answers').delete().eq('sub_question_id', questionId)
          : supabase.from('question_correct_answers').delete().eq('question_id', questionId);

        const { error: deleteError, count } = await deleteQuery;

        if (deleteError) {
          console.error('Delete error details:', {
            message: deleteError.message,
            details: deleteError.details,
            hint: deleteError.hint,
            code: deleteError.code
          });
          throw new Error(`Failed to delete existing answers: ${deleteError.message}`);
        }

        console.log(`Deleted ${count || 0} existing answers for ${isSubQuestion ? 'sub-question' : 'question'} ${questionId}`);

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

          const { error: insertError, data: insertedData } = await supabase
            .from('question_correct_answers')
            .insert(answersToInsert)
            .select();

          if (insertError) {
            console.error('Insert error details:', {
              message: insertError.message,
              details: insertError.details,
              hint: insertError.hint,
              code: insertError.code
            });
            throw new Error(`Failed to insert new answers: ${insertError.message}`);
          }

          console.log(`Inserted ${insertedData?.length || 0} new answers`);
        }

        // Use the comprehensive auto-fill logic to determine answer requirement
        const table = isSubQuestion ? 'sub_questions' : 'questions_master_admin';

        // Get the question's type and answer_format to help derive the requirement
        const { data: questionData } = await supabase
          .from(table)
          .select('type, answer_format')
          .eq('id', questionId)
          .maybeSingle();

        const derivedResult = deriveAnswerRequirement({
          questionType: questionData?.type || 'descriptive',
          answerFormat: questionData?.answer_format,
          correctAnswers: correctAnswers.map(ca => ({
            answer: ca.answer,
            marks: ca.marks,
            alternative_id: ca.alternative_id,
            context: ca.context
          })),
          totalAlternatives: correctAnswers.length,
          options: undefined
        });

        const answerRequirement = derivedResult.answerRequirement || 'single_choice';

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

        if (updateError) {
          console.error('Update error details:', {
            message: updateError.message,
            details: updateError.details,
            hint: updateError.hint,
            code: updateError.code
          });
          throw new Error(`Failed to update question metadata: ${updateError.message}`);
        }

        return { success: true };
      } catch (error) {
        // Re-throw with more context
        if (error instanceof Error) {
          throw error;
        }
        throw new Error('An unknown error occurred while updating correct answers');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      queryClient.invalidateQueries({ queryKey: ['question'] });
      toast.success('Correct answers updated successfully');
    },
    onError: (error) => {
      console.error('Error updating correct answers:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update correct answers';
      toast.error(errorMessage);
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

      // Derive the storage path from the public URL so we can delete the file
      let storagePath: string | null = null;

      try {
        const url = new URL(fileUrl);
        const pathSegments = url.pathname.split('/').filter(Boolean);
        const bucketIndex = pathSegments.findIndex(segment => segment === 'questions-attachments');

        if (bucketIndex !== -1 && bucketIndex < pathSegments.length - 1) {
          storagePath = decodeURIComponent(pathSegments.slice(bucketIndex + 1).join('/'));
        } else if (pathSegments.length > 0) {
          storagePath = decodeURIComponent(pathSegments[pathSegments.length - 1]);
        }
      } catch (error) {
        console.error('Error parsing attachment URL for deletion:', error);
      }

      if (storagePath) {
        const { error: storageError } = await supabase.storage
          .from('questions-attachments')
          .remove([storagePath]);

        if (storageError) {
          console.error('Error deleting from storage:', storageError);
          // Don't throw - file might already be deleted
        }
      } else {
        console.warn('Unable to determine storage path for attachment deletion.');
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

      // Fetch the corresponding users.id from auth.uid() for foreign key compatibility
      let userId: string | null = null;
      if (user?.id) {
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('auth_user_id', user.id)
          .maybeSingle();

        userId = userData?.id || null;
      }

      // Get the question to find its paper_id
      const { data: question, error: fetchError } = await supabase
        .from('questions_master_admin')
        .select('paper_id')
        .eq('id', questionId)
        .single();

      if (fetchError) throw fetchError;

      // Update main question status (allow from draft or qa_review)
      const { error: questionError } = await supabase
        .from('questions_master_admin')
        .update({
          status: 'active',
          is_confirmed: true,
          confirmed_at: new Date().toISOString(),
          confirmed_by: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', questionId)
        .in('status', ['draft', 'qa_review']); // Allow from both draft and qa_review

      if (questionError) throw questionError;

      // Update all sub-questions status (allow from draft or qa_review)
      const { error: subQuestionError } = await supabase
        .from('sub_questions')
        .update({
          status: 'active',
          is_confirmed: true,
          confirmed_at: new Date().toISOString(),
          confirmed_by: userId,
          updated_at: new Date().toISOString()
        })
        .eq('question_id', questionId)
        .in('status', ['draft', 'qa_review']); // Allow from both draft and qa_review

      if (subQuestionError) throw subQuestionError;

      // Record the confirmation action
      if (userId) {
        const { error: confirmError } = await supabase
          .from('question_confirmations')
          .insert({
            question_id: questionId,
            action: 'confirmed',
            performed_by: userId,
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
            // Auto-confirm the paper (allow from draft or qa_review)
            const { error: paperError } = await supabase
              .from('papers_setup')
              .update({
                status: 'active',
                qa_status: 'completed',
                qa_completed_at: new Date().toISOString(),
                qa_completed_by: user?.id || null,
                published_at: new Date().toISOString(),
                published_by: user?.id || null,
                updated_at: new Date().toISOString(),
                last_status_change_at: new Date().toISOString(),
                last_status_change_by: user?.id || null
              })
              .eq('id', question.paper_id)
              .in('status', ['draft', 'qa_review']);
            
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
        toast.success('Question confirmed and paper automatically published!');
      } else {
        toast.success('Question confirmed successfully');
      }
    },
    onError: (error) => {
      console.error('Error confirming question:', error);
      toast.error('Failed to confirm question');
    }
  });
  
  // Confirm paper (change status from draft/qa_review to active - publishing)
  const confirmPaper = useMutation({
    mutationFn: async ({ paperId }: ConfirmPaperParams) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Fetch the corresponding users.id from auth.uid() for foreign key compatibility
      let userId: string | null = null;
      if (user?.id) {
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('auth_user_id', user.id)
          .maybeSingle();

        userId = userData?.id || null;
      }

      // First, get the paper to check current status
      const { data: paper, error: paperFetchError } = await supabase
        .from('papers_setup')
        .select('id, status, qa_status')
        .eq('id', paperId)
        .single();

      if (paperFetchError) throw paperFetchError;

      // Only allow publishing from draft or qa_review status
      if (!['draft', 'qa_review'].includes(paper.status)) {
        throw new Error('Paper must be in draft or qa_review status to be published');
      }

      // Check if all questions are ready (have all required fields)
      const { data: questions, error: fetchError } = await supabase
        .from('questions_master_admin')
        .select('id, status, question_description, marks, difficulty, topic_id')
        .eq('paper_id', paperId);

      if (fetchError) throw fetchError;

      // Validate questions have required data
      const invalidQuestions = questions?.filter(q =>
        !q.question_description || !q.marks || !q.difficulty || !q.topic_id
      );

      if (invalidQuestions && invalidQuestions.length > 0) {
        throw new Error(`${invalidQuestions.length} question(s) are missing required fields (description, marks, difficulty, or topic)`);
      }

      const now = new Date().toISOString();

      // Update paper status to active (published)
      const { error: paperError } = await supabase
        .from('papers_setup')
        .update({
          status: 'active',
          qa_status: 'completed',
          qa_completed_at: now,
          qa_completed_by: userId,
          published_at: now,
          published_by: userId,
          updated_at: now,
          last_status_change_at: now,
          last_status_change_by: userId
        })
        .eq('id', paperId)
        .in('status', ['draft', 'qa_review']); // Allow from both draft and qa_review

      if (paperError) throw paperError;

      // Log the status change in history
      const { error: historyError } = await supabase
        .from('paper_status_history')
        .insert({
          paper_id: paperId,
          previous_status: paper.status,
          new_status: 'active',
          changed_by: userId,
          changed_at: now,
          reason: 'Paper published after QA review',
          metadata: {
            qa_status: paper.qa_status,
            total_questions: questions?.length || 0
          }
        });

      if (historyError) {
        console.error('Error logging status change:', historyError);
        // Don't throw - history is not critical
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      queryClient.invalidateQueries({ queryKey: ['papers'] });
      toast.success('Paper published successfully');
    },
    onError: (error) => {
      console.error('Error confirming paper:', error);
      if (error instanceof Error && error.message.includes('All questions must be confirmed')) {
        toast.error(error.message);
      } else {
        toast.error('Failed to publish paper');
      }
    }
  });
  
  // Update paper status
  const updatePaperStatus = useMutation({
    mutationFn: async ({ paperId, newStatus }: UpdatePaperStatusParams) => {
      const [{ data: auth }, paperResponse, questionsResponse] = await Promise.all([
        supabase.auth.getUser(),
        supabase
          .from('papers_setup')
          .select('id, status, qa_status')
          .eq('id', paperId)
          .single(),
        supabase
          .from('questions_master_admin')
          .select('id')
          .eq('paper_id', paperId)
      ]);

      if (paperResponse.error) throw paperResponse.error;
      if (questionsResponse.error) throw questionsResponse.error;

      const user = auth.user;

      // Fetch the corresponding users.id from auth.uid() for foreign key compatibility
      let userId: string | null = null;
      if (user?.id) {
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('auth_user_id', user.id)
          .maybeSingle();

        userId = userData?.id || null;
      }

      const now = new Date().toISOString();

      const paperUpdates: Record<string, any> = {
        status: newStatus,
        updated_at: now,
        last_status_change_at: now,
        last_status_change_by: userId
      };

      if (newStatus === 'draft') {
        paperUpdates.qa_status = 'pending';
      }

      const { error: updateError } = await supabase
        .from('papers_setup')
        .update(paperUpdates)
        .eq('id', paperId);

      if (updateError) throw updateError;

      if (newStatus === 'inactive' || newStatus === 'draft') {
        const questionStatus = newStatus === 'inactive' ? 'inactive' : 'draft';

        const { error: questionUpdateError } = await supabase
          .from('questions_master_admin')
          .update({
            status: questionStatus,
            is_confirmed: false,
            updated_at: now
          })
          .eq('paper_id', paperId);

        if (questionUpdateError) throw questionUpdateError;

        const questionIds = (questionsResponse.data || []).map(record => record.id);

        if (questionIds.length > 0) {
          const { error: subQuestionUpdateError } = await supabase
            .from('sub_questions')
            .update({
              status: questionStatus,
              is_confirmed: false,
              updated_at: now
            })
            .in('question_id', questionIds);

          if (subQuestionUpdateError) throw subQuestionUpdateError;
        }
      }

      if (paperResponse.data && paperResponse.data.status !== newStatus) {
        const { error: historyError } = await supabase
          .from('paper_status_history')
          .insert({
            paper_id: paperId,
            previous_status: paperResponse.data.status,
            new_status: newStatus,
            changed_by: userId,
            changed_at: now,
            reason:
              newStatus === 'inactive'
                ? 'Paper archived from Questions Setup'
                : newStatus === 'draft'
                  ? 'Paper restored from archive'
                  : 'Paper status updated via Questions Setup',
            metadata: {
              qa_status: paperResponse.data.qa_status
            }
          });

        if (historyError) {
          console.error('Error logging status change:', historyError);
        }
      }

      return { success: true, newStatus };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      queryClient.invalidateQueries({ queryKey: ['papers'] });
      const label = STATUS_LABELS[variables.newStatus] || variables.newStatus;
      toast.success(`Paper status updated to "${label}" successfully`);
    },
    onError: (error: any) => {
      console.error('Error updating paper status:', error);
      console.error('Error details:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        statusCode: error?.statusCode
      });

      // Provide more specific error messages
      let errorMessage = 'Failed to update paper status';

      if (error?.message) {
        if (error.message.includes('row-level security') || error.message.includes('policy')) {
          errorMessage = 'Permission denied: You may not have access to update this paper';
        } else if (error.message.includes('violates check constraint')) {
          errorMessage = 'Invalid status value provided';
        } else if (error.message.includes('not found')) {
          errorMessage = 'Paper not found';
        } else {
          errorMessage = `Failed to update paper status: ${error.message}`;
        }
      }

      toast.error(errorMessage);
    }
  });

  // ✅ NEW: Save table completion template
  const saveTableTemplate = useMutation({
    mutationFn: async ({ template }: SaveTableTemplateParams) => {
      console.log('[useQuestionMutations] Saving table template:', template);

      const result = await TableTemplateService.saveTemplate(template);

      if (!result.success) {
        throw new Error(result.error || 'Failed to save template');
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      queryClient.invalidateQueries({ queryKey: ['table-templates'] });
      // Don't show toast here - TableCompletion component already shows it
      console.log('[useQuestionMutations] Table template saved successfully');
    },
    onError: (error) => {
      console.error('[useQuestionMutations] Error saving table template:', error);
      toast.error('Failed to save table template', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
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
    updatePaperStatus,
    saveTableTemplate  // ✅ NEW: Export the template save mutation
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