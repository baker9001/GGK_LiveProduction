/**
 * File: /src/lib/storageHelpers.ts (renamed from logoHelpers.ts)
 * Shared helper functions for file storage handling across all components
 */

import { supabase } from './supabase';

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

// Legacy exports for backward compatibility
export const getLogoUrl = getPublicUrl;
export const deleteLogoFromStorage = deleteFileFromStorage;
export const deleteMultipleLogos = deleteMultipleFiles;