import { supabase } from '@/lib/supabase';
import type { QuestionStatus, AttachmentStatus, NavigationFilter } from '@/components/shared/EnhancedQuestionNavigator';

export interface NavigationState {
  id: string;
  user_id: string;
  paper_id: string;
  current_position_id: string | null;
  current_position_type: 'question' | 'part' | 'subpart' | null;
  expanded_items: string[];
  filter_settings: NavigationFilter;
  last_accessed_at: string;
  created_at: string;
  updated_at: string;
}

export interface ReviewProgress {
  id: string;
  paper_id: string;
  question_id: string | null;
  sub_question_id: string | null;
  is_complete: boolean;
  needs_attachment: boolean;
  has_error: boolean;
  in_progress: boolean;
  validation_issues: string[];
  reviewed_by: string | null;
  reviewed_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttachmentTracking {
  id: string;
  paper_id: string;
  question_id: string | null;
  sub_question_id: string | null;
  attachments_required: number;
  attachments_uploaded: number;
  figure_required: boolean;
  last_upload_at: string | null;
  created_at: string;
  updated_at: string;
}

export class QuestionNavigationService {
  static async saveNavigationState(
    userId: string,
    paperId: string,
    state: {
      currentPositionId?: string | null;
      currentPositionType?: 'question' | 'part' | 'subpart' | null;
      expandedItems?: string[];
      filterSettings?: NavigationFilter;
    }
  ): Promise<NavigationState | null> {
    try {
      const { data: existing, error: fetchError } = await supabase
        .from('question_navigation_state')
        .select('*')
        .eq('user_id', userId)
        .eq('paper_id', paperId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existing) {
        const { data, error } = await supabase
          .from('question_navigation_state')
          .update({
            current_position_id: state.currentPositionId ?? existing.current_position_id,
            current_position_type: state.currentPositionType ?? existing.current_position_type,
            expanded_items: state.expandedItems ?? existing.expanded_items,
            filter_settings: state.filterSettings ?? existing.filter_settings,
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('question_navigation_state')
          .insert({
            user_id: userId,
            paper_id: paperId,
            current_position_id: state.currentPositionId,
            current_position_type: state.currentPositionType,
            expanded_items: state.expandedItems || [],
            filter_settings: state.filterSettings || {
              showCompleted: true,
              showIncomplete: true,
              showNeedsAttachment: true,
              showErrors: true,
            },
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    } catch (error) {
      console.error('Error saving navigation state:', error);
      return null;
    }
  }

  static async getNavigationState(
    userId: string,
    paperId: string
  ): Promise<NavigationState | null> {
    try {
      const { data, error } = await supabase
        .from('question_navigation_state')
        .select('*')
        .eq('user_id', userId)
        .eq('paper_id', paperId)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching navigation state:', error);
      return null;
    }
  }

  static async updateReviewProgress(
    paperId: string,
    itemId: string,
    itemType: 'question' | 'subquestion',
    status: Partial<QuestionStatus>,
    reviewedBy?: string
  ): Promise<ReviewProgress | null> {
    try {
      const questionId = itemType === 'question' ? itemId : null;
      const subQuestionId = itemType === 'subquestion' ? itemId : null;

      const { data: existing, error: fetchError } = await supabase
        .from('question_review_progress')
        .select('*')
        .eq('paper_id', paperId)
        .eq(itemType === 'question' ? 'question_id' : 'sub_question_id', itemId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      const updateData = {
        is_complete: status.isComplete ?? existing?.is_complete ?? false,
        needs_attachment: status.needsAttachment ?? existing?.needs_attachment ?? false,
        has_error: status.hasError ?? existing?.has_error ?? false,
        in_progress: status.inProgress ?? existing?.in_progress ?? false,
        validation_issues: status.validationIssues ?? existing?.validation_issues ?? [],
        reviewed_by: reviewedBy,
        reviewed_at: reviewedBy ? new Date().toISOString() : existing?.reviewed_at,
      };

      if (existing) {
        const { data, error } = await supabase
          .from('question_review_progress')
          .update(updateData)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('question_review_progress')
          .insert({
            paper_id: paperId,
            question_id: questionId,
            sub_question_id: subQuestionId,
            ...updateData,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    } catch (error) {
      console.error('Error updating review progress:', error);
      return null;
    }
  }

  static async getReviewProgress(paperId: string): Promise<Map<string, QuestionStatus>> {
    try {
      const { data, error } = await supabase
        .from('question_review_progress')
        .select('*')
        .eq('paper_id', paperId);

      if (error) throw error;

      const statusMap = new Map<string, QuestionStatus>();
      data?.forEach((item) => {
        const id = item.question_id || item.sub_question_id;
        if (id) {
          statusMap.set(id, {
            isComplete: item.is_complete,
            needsAttachment: item.needs_attachment,
            hasError: item.has_error,
            inProgress: item.in_progress,
            validationIssues: item.validation_issues || [],
          });
        }
      });

      return statusMap;
    } catch (error) {
      console.error('Error fetching review progress:', error);
      return new Map();
    }
  }

  static async updateAttachmentTracking(
    paperId: string,
    itemId: string,
    itemType: 'question' | 'subquestion',
    required: number,
    figureRequired: boolean
  ): Promise<AttachmentTracking | null> {
    try {
      const questionId = itemType === 'question' ? itemId : null;
      const subQuestionId = itemType === 'subquestion' ? itemId : null;

      const { data: existing, error: fetchError } = await supabase
        .from('question_attachment_tracking')
        .select('*')
        .eq('paper_id', paperId)
        .eq(itemType === 'question' ? 'question_id' : 'sub_question_id', itemId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existing) {
        const { data, error } = await supabase
          .from('question_attachment_tracking')
          .update({
            attachments_required: required,
            figure_required: figureRequired,
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('question_attachment_tracking')
          .insert({
            paper_id: paperId,
            question_id: questionId,
            sub_question_id: subQuestionId,
            attachments_required: required,
            attachments_uploaded: 0,
            figure_required: figureRequired,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    } catch (error) {
      console.error('Error updating attachment tracking:', error);
      return null;
    }
  }

  static async getAttachmentTracking(paperId: string): Promise<Map<string, AttachmentStatus>> {
    try {
      const { data, error } = await supabase
        .from('question_attachment_tracking')
        .select('*')
        .eq('paper_id', paperId);

      if (error) throw error;

      const attachmentMap = new Map<string, AttachmentStatus>();
      data?.forEach((item) => {
        const id = item.question_id || item.sub_question_id;
        if (id) {
          attachmentMap.set(id, {
            required: item.attachments_required,
            uploaded: item.attachments_uploaded,
          });
        }
      });

      return attachmentMap;
    } catch (error) {
      console.error('Error fetching attachment tracking:', error);
      return new Map();
    }
  }

  static async initializeAttachmentTracking(paperId: string, questions: any[]): Promise<void> {
    try {
      const trackingData: any[] = [];

      const processItem = (item: any, type: 'question' | 'subquestion') => {
        const figureRequired = item.figure_required || false;
        const hasAttachments = item.attachments && item.attachments.length > 0;

        if (figureRequired || hasAttachments) {
          trackingData.push({
            paper_id: paperId,
            question_id: type === 'question' ? item.id : null,
            sub_question_id: type === 'subquestion' ? item.id : null,
            attachments_required: figureRequired ? 1 : 0,
            attachments_uploaded: hasAttachments ? item.attachments.length : 0,
            figure_required: figureRequired,
          });
        }
      };

      questions.forEach((question) => {
        processItem(question, 'question');

        if (question.parts) {
          question.parts.forEach((part: any) => {
            processItem(part, 'subquestion');

            if (part.subparts) {
              part.subparts.forEach((subpart: any) => {
                processItem(subpart, 'subquestion');
              });
            }
          });
        }
      });

      if (trackingData.length > 0) {
        const { error } = await supabase
          .from('question_attachment_tracking')
          .upsert(trackingData, {
            onConflict: 'paper_id,question_id,sub_question_id',
            ignoreDuplicates: false,
          });

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error initializing attachment tracking:', error);
    }
  }

  static async calculateQuestionStatus(question: any): Promise<QuestionStatus> {
    const hasRequiredFields = Boolean(
      question.question_description &&
      question.answer_format &&
      question.marks > 0
    );

    const hasCorrectAnswers = question.correctAnswers && question.correctAnswers.length > 0;
    const figureRequired = question.figure_required || false;
    const hasAttachments = question.attachments && question.attachments.length > 0;

    const validationIssues: string[] = [];

    if (!hasRequiredFields) {
      validationIssues.push('Missing required fields');
    }

    if (!hasCorrectAnswers && question.type !== 'complex') {
      validationIssues.push('No correct answers defined');
    }

    if (figureRequired && !hasAttachments) {
      validationIssues.push('Missing required figure/attachment');
    }

    return {
      isComplete: hasRequiredFields && hasCorrectAnswers && (!figureRequired || hasAttachments),
      needsAttachment: figureRequired && !hasAttachments,
      hasError: validationIssues.length > 0,
      inProgress: hasRequiredFields && (!hasCorrectAnswers || (figureRequired && !hasAttachments)),
      validationIssues,
    };
  }

  static async syncProgressFromQuestions(paperId: string, questions: any[]): Promise<void> {
    try {
      const progressData: any[] = [];

      const processItem = async (item: any, type: 'question' | 'subquestion') => {
        const status = await this.calculateQuestionStatus(item);

        progressData.push({
          paper_id: paperId,
          question_id: type === 'question' ? item.id : null,
          sub_question_id: type === 'subquestion' ? item.id : null,
          is_complete: status.isComplete,
          needs_attachment: status.needsAttachment,
          has_error: status.hasError,
          in_progress: status.inProgress,
          validation_issues: status.validationIssues,
        });
      };

      for (const question of questions) {
        await processItem(question, 'question');

        if (question.parts) {
          for (const part of question.parts) {
            await processItem(part, 'subquestion');

            if (part.subparts) {
              for (const subpart of part.subparts) {
                await processItem(subpart, 'subquestion');
              }
            }
          }
        }
      }

      if (progressData.length > 0) {
        const { error } = await supabase
          .from('question_review_progress')
          .upsert(progressData, {
            onConflict: 'paper_id,question_id,sub_question_id',
            ignoreDuplicates: false,
          });

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error syncing progress from questions:', error);
    }
  }
}

export default QuestionNavigationService;
