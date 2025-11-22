/**
 * Utility functions for uploading answer assets to Supabase Storage
 */

import { supabase } from '@/lib/supabase';

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
  path?: string;
}

/**
 * Upload a file to Supabase Storage
 */
export async function uploadAnswerAsset(
  file: Blob | File,
  fileName: string,
  userId: string,
  assetType: string
): Promise<UploadResult> {
  try {
    // Create folder structure: {userId}/{assetType}/{timestamp}_{fileName}
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const path = `${userId}/${assetType}/${timestamp}_${sanitizedFileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('student-answer-assets')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Upload error:', error);
      return {
        success: false,
        error: error.message
      };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('student-answer-assets')
      .getPublicUrl(path);

    return {
      success: true,
      url: urlData.publicUrl,
      path: path
    };
  } catch (error) {
    console.error('Upload exception:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteAnswerAsset(path: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from('student-answer-assets')
      .remove([path]);

    if (error) {
      console.error('Delete error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Delete exception:', error);
    return false;
  }
}

/**
 * Convert a data URL (base64) to Blob
 */
export function dataURLtoBlob(dataURL: string): Blob {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return new Blob([u8arr], { type: mime });
}

/**
 * Compress an image before upload
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1080,
  quality: number = 0.85
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // Calculate new dimensions
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = width * ratio;
          height = height * ratio;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Could not create blob'));
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => reject(new Error('Could not load image'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Validate file type
 */
export function validateFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.some(type => {
    if (type.endsWith('/*')) {
      return file.type.startsWith(type.replace('/*', ''));
    }
    return file.type === type;
  });
}

/**
 * Generate a unique file name
 */
export function generateUniqueFileName(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop();
  const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');

  return `${nameWithoutExt}_${timestamp}_${random}.${extension}`;
}
