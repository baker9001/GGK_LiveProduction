/**
 * File: /src/lib/storageHelpers.ts (renamed from logoHelpers.ts)
 * Shared helper functions for file storage handling across all components
 *
 * SECURE UPLOAD ARCHITECTURE:
 * - Direct storage uploads are blocked by RLS for security
 * - All uploads go through Edge Functions with server-side validation
 * - Edge Functions use service_role credentials to bypass RLS
 * - Custom authentication is validated on the server
 */

import { supabase } from './supabase';
import { getAuthToken } from './auth';

/**
 * Generate public URL for a file, handling both old and new path formats
 * @param bucket - The storage bucket name (e.g., 'company-logos', 'school-logos', 'user-avatars')
 * @param path - The stored path from the database
 * @returns The public URL or null
 */
export const getPublicUrl = (bucket: string, path: string | null): string | null => {
  if (!path) return null;
  
  // If path is already a full URL, return it
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  try {
    // Get public URL using the stored path
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);
    
    if (data?.publicUrl) {
      return data.publicUrl;
    }
    
    return null;
  } catch (error) {
    console.error(`Error generating URL for bucket ${bucket}:`, error);
    return null;
  }
};

/**
 * Delete a file from storage, handling both old and new path formats
 * @param bucket - The storage bucket name
 * @param path - The stored path from the database
 * @returns Promise<boolean> - true if deleted successfully
 */
export const deleteFileFromStorage = async (
  bucket: string, 
  path: string | null
): Promise<boolean> => {
  if (!path) return true;
  
  try {
    // First, try to delete using the stored path
    const { error: deleteError } = await supabase.storage
      .from(bucket)
      .remove([path]);
    
    if (!deleteError) {
      console.log(`Successfully deleted file: ${path}`);
      return true;
    }
    
    console.warn(`Failed to delete file at path: ${path}`, deleteError);
    
    // Determine the expected subfolder based on bucket name
    const bucketToSubfolder: Record<string, string> = {
      'company-logos': 'companies',
      'school-logos': 'schools',
      'branch-logos': 'branches',
      'subject-logos': 'subjects',
      'user-avatars': 'users'
    };
    
    const expectedSubfolder = bucketToSubfolder[bucket];
    
    if (expectedSubfolder) {
      // Try alternative paths
      if (path.startsWith(`${expectedSubfolder}/`)) {
        // Path has subfolder, try without it
        const fileNameOnly = path.replace(`${expectedSubfolder}/`, '');
        const { error: fallbackError } = await supabase.storage
          .from(bucket)
          .remove([fileNameOnly]);
        
        if (!fallbackError) {
          console.log(`Successfully deleted file using fallback path: ${fileNameOnly}`);
          return true;
        }
        console.warn(`Failed to delete at fallback path: ${fileNameOnly}`, fallbackError);
      } else {
        // Path doesn't have subfolder, try with it (for old files)
        const withSubfolder = `${expectedSubfolder}/${path}`;
        const { error: fallbackError } = await supabase.storage
          .from(bucket)
          .remove([withSubfolder]);
        
        if (!fallbackError) {
          console.log(`Successfully deleted file using fallback path: ${withSubfolder}`);
          return true;
        }
        console.warn(`Failed to delete at fallback path: ${withSubfolder}`, fallbackError);
      }
    }
    
    // If all attempts fail, log but don't throw
    console.error(`Could not delete file from storage: ${path}`);
    return false;
    
  } catch (error) {
    console.error(`Error during file deletion from ${bucket}:`, error);
    return false;
  }
};

/**
 * Delete multiple files from storage
 * @param bucket - The storage bucket name
 * @param paths - Array of paths to delete
 */
export const deleteMultipleFiles = async (
  bucket: string,
  paths: (string | null)[]
): Promise<void> => {
  const validPaths = paths.filter((path): path is string => path !== null);
  
  if (validPaths.length === 0) return;
  
  // Delete each file individually to handle different path formats
  const deletePromises = validPaths.map(path => 
    deleteFileFromStorage(bucket, path)
  );
  
  const results = await Promise.all(deletePromises);
  
  const successCount = results.filter(result => result).length;
  const failCount = results.length - successCount;
  
  if (failCount > 0) {
    console.warn(`File deletion summary: ${successCount} succeeded, ${failCount} failed`);
  }
};

/**
 * Upload file via Edge Function (secure server-side upload)
 * @param bucket - The storage bucket name
 * @param file - The file to upload
 * @param oldPath - Optional: path of file to replace
 * @returns Promise with upload result
 */
export const uploadFileViaEdgeFunction = async (
  bucket: string,
  file: File,
  oldPath?: string | null
): Promise<{ success: boolean; path?: string; error?: string }> => {
  try {
    // Get auth token for Edge Function authentication
    const authToken = getAuthToken();
    if (!authToken) {
      return {
        success: false,
        error: 'Authentication required. Please log in.',
      };
    }

    // Determine Edge Function endpoint based on bucket
    const functionMap: Record<string, string> = {
      'subject-logos': 'upload-subject-logo',
      'company-logos': 'upload-company-logo',
      'school-logos': 'upload-school-logo',
      'branch-logos': 'upload-branch-logo',
    };

    const functionName = functionMap[bucket];
    if (!functionName) {
      return {
        success: false,
        error: `No Edge Function configured for bucket: ${bucket}`,
      };
    }

    // Build Edge Function URL
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/${functionName}`;

    // Create form data
    const formData = new FormData();
    formData.append('file', file);
    if (oldPath) {
      formData.append('oldPath', oldPath);
    }

    // Call Edge Function
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'X-Auth-Token': authToken,
      },
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'Upload failed',
      };
    }

    return {
      success: true,
      path: result.path,
    };
  } catch (error) {
    console.error('Edge Function upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
};

/**
 * Delete file via Edge Function (secure server-side deletion)
 * @param bucket - The storage bucket name
 * @param path - The file path to delete
 * @returns Promise with deletion result
 */
export const deleteFileViaEdgeFunction = async (
  bucket: string,
  path: string | null
): Promise<{ success: boolean; error?: string }> => {
  if (!path) return { success: true };

  try {
    // Get auth token for Edge Function authentication
    const authToken = getAuthToken();
    if (!authToken) {
      return {
        success: false,
        error: 'Authentication required. Please log in.',
      };
    }

    // Determine Edge Function endpoint based on bucket
    const functionMap: Record<string, string> = {
      'subject-logos': 'delete-subject-logo',
      'company-logos': 'delete-company-logo',
      'school-logos': 'delete-school-logo',
      'branch-logos': 'delete-branch-logo',
    };

    const functionName = functionMap[bucket];
    if (!functionName) {
      return {
        success: false,
        error: `No Edge Function configured for bucket: ${bucket}`,
      };
    }

    // Build Edge Function URL
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/${functionName}`;

    // Call Edge Function
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'X-Auth-Token': authToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path }),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'Deletion failed',
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Edge Function delete error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Deletion failed',
    };
  }
};

/**
 * Delete multiple files via Edge Function
 * @param bucket - The storage bucket name
 * @param paths - Array of file paths to delete
 * @returns Promise with deletion result
 */
export const deleteMultipleFilesViaEdgeFunction = async (
  bucket: string,
  paths: (string | null)[]
): Promise<{ success: boolean; deleted: number; error?: string }> => {
  const validPaths = paths.filter((path): path is string => path !== null);

  if (validPaths.length === 0) {
    return { success: true, deleted: 0 };
  }

  try {
    // Get auth token for Edge Function authentication
    const authToken = getAuthToken();
    if (!authToken) {
      return {
        success: false,
        deleted: 0,
        error: 'Authentication required. Please log in.',
      };
    }

    // Determine Edge Function endpoint based on bucket
    const functionMap: Record<string, string> = {
      'subject-logos': 'delete-subject-logo',
      'company-logos': 'delete-company-logo',
      'school-logos': 'delete-school-logo',
      'branch-logos': 'delete-branch-logo',
    };

    const functionName = functionMap[bucket];
    if (!functionName) {
      return {
        success: false,
        deleted: 0,
        error: `No Edge Function configured for bucket: ${bucket}`,
      };
    }

    // Build Edge Function URL
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/${functionName}`;

    // Call Edge Function
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'X-Auth-Token': authToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paths: validPaths }),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        deleted: 0,
        error: result.error || 'Deletion failed',
      };
    }

    return {
      success: true,
      deleted: result.deleted || validPaths.length,
    };
  } catch (error) {
    console.error('Edge Function bulk delete error:', error);
    return {
      success: false,
      deleted: 0,
      error: error instanceof Error ? error.message : 'Deletion failed',
    };
  }
};

// Legacy exports for backward compatibility
export const getLogoUrl = getPublicUrl;
export const deleteLogoFromStorage = deleteFileFromStorage;
export const deleteMultipleLogos = deleteMultipleFiles;