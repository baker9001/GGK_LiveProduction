import { supabase } from '../lib/supabase';
import { toast } from '../components/shared/Toast';

/**
 * Service for managing question attachments
 */

export interface AttachmentDeletionResult {
  success: boolean;
  error?: string;
  deletedAttachmentId?: string;
}

/**
 * Deletes an attachment from both the database and storage
 * @param attachmentId - The UUID of the attachment to delete
 * @returns Promise with deletion result
 */
export async function deleteQuestionAttachment(
  attachmentId: string
): Promise<AttachmentDeletionResult> {
  try {
    // First, fetch the attachment details to get the file path
    const { data: attachment, error: fetchError } = await supabase
      .from('questions_attachments')
      .select('id, file_url, file_name')
      .eq('id', attachmentId)
      .single();

    if (fetchError) {
      console.error('Error fetching attachment:', fetchError);
      return {
        success: false,
        error: `Failed to fetch attachment: ${fetchError.message}`
      };
    }

    if (!attachment) {
      return {
        success: false,
        error: 'Attachment not found'
      };
    }

    // Extract the file path from the URL
    // The file_url format is typically: https://<project>.supabase.co/storage/v1/object/public/questions-attachments/<path>
    const filePath = extractFilePathFromUrl(attachment.file_url);

    if (!filePath) {
      console.error('Could not extract file path from URL:', attachment.file_url);
      // Continue with database deletion even if we can't determine the storage path
    }

    // Delete from storage if we have a valid path
    if (filePath) {
      const { error: storageError } = await supabase.storage
        .from('questions-attachments')
        .remove([filePath]);

      if (storageError) {
        console.error('Error deleting file from storage:', storageError);
        // Log but don't fail - proceed with database deletion
      }
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('questions_attachments')
      .delete()
      .eq('id', attachmentId);

    if (deleteError) {
      console.error('Error deleting attachment from database:', deleteError);
      return {
        success: false,
        error: `Failed to delete attachment: ${deleteError.message}`
      };
    }

    return {
      success: true,
      deletedAttachmentId: attachmentId
    };

  } catch (error) {
    console.error('Unexpected error deleting attachment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Extracts the file path from a Supabase storage URL
 * @param url - The full storage URL
 * @returns The file path or null if extraction fails
 */
function extractFilePathFromUrl(url: string): string | null {
  try {
    // Handle both public and authenticated storage URLs
    // Public: https://<project>.supabase.co/storage/v1/object/public/questions-attachments/<path>
    // Auth: https://<project>.supabase.co/storage/v1/object/authenticated/questions-attachments/<path>

    const publicMatch = url.match(/\/storage\/v1\/object\/public\/questions-attachments\/(.+)$/);
    if (publicMatch && publicMatch[1]) {
      return publicMatch[1];
    }

    const authMatch = url.match(/\/storage\/v1\/object\/authenticated\/questions-attachments\/(.+)$/);
    if (authMatch && authMatch[1]) {
      return authMatch[1];
    }

    // Try to extract from a simple bucket URL format
    const simpleMatch = url.match(/questions-attachments\/(.+)$/);
    if (simpleMatch && simpleMatch[1]) {
      return simpleMatch[1];
    }

    return null;
  } catch (error) {
    console.error('Error extracting file path from URL:', error);
    return null;
  }
}

/**
 * Batch delete multiple attachments
 * @param attachmentIds - Array of attachment IDs to delete
 * @returns Promise with batch deletion results
 */
export async function batchDeleteQuestionAttachments(
  attachmentIds: string[]
): Promise<{
  successCount: number;
  failureCount: number;
  errors: string[];
}> {
  const results = await Promise.allSettled(
    attachmentIds.map(id => deleteQuestionAttachment(id))
  );

  let successCount = 0;
  let failureCount = 0;
  const errors: string[] = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value.success) {
      successCount++;
    } else {
      failureCount++;
      const error = result.status === 'fulfilled'
        ? result.value.error
        : result.reason;
      errors.push(`Attachment ${attachmentIds[index]}: ${error}`);
    }
  });

  return { successCount, failureCount, errors };
}

/**
 * Validates if user has permission to delete an attachment
 * @param attachmentId - The attachment ID to check
 * @returns Promise<boolean> indicating if deletion is allowed
 */
export async function canDeleteAttachment(attachmentId: string): Promise<boolean> {
  try {
    // Check if the attachment is linked to a question the user can modify
    const { data: attachment, error } = await supabase
      .from('questions_attachments')
      .select(`
        id,
        question_id,
        sub_question_id,
        questions_master_admin!inner(
          id,
          status,
          scope,
          school_id,
          created_by_school_id
        )
      `)
      .eq('id', attachmentId)
      .single();

    if (error || !attachment) {
      return false;
    }

    // For now, allow deletion if the attachment exists
    // Additional permission checks can be added based on user role, question status, etc.
    return true;
  } catch (error) {
    console.error('Error checking deletion permission:', error);
    return false;
  }
}
