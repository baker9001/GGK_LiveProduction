// /src/components/shared/ImageUpload.tsx

import React, { useRef, useState, useEffect } from 'react';
import { Upload, X, AlertCircle, Camera, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './Button';
import { supabase } from '../../lib/supabase';
import { useUser } from '../../contexts/UserContext';
import { toast } from './Toast';
import { ConfirmationDialog } from './ConfirmationDialog';
import { getAuthenticatedUser } from '../../lib/auth';
import {
  getPublicUrl,
  deleteFileFromStorage,
  uploadFileViaEdgeFunction,
  deleteFileViaEdgeFunction,
} from '../../lib/storageHelpers';

interface ImageUploadProps {
  id: string;
  bucket: string;
  value?: string | null;
  publicUrl?: string | null;
  onChange: (path: string | null) => void;
  className?: string;
}

export function ImageUpload({ id, bucket, value, publicUrl, onChange, className }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showRemoveConfirmation, setShowRemoveConfirmation] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useUser();

  // Define public buckets that don't require authentication
  const isPublicBucket = ['company-logos', 'logos', 'school-logos', 'subject-logos', 'branch-logos', 'avatars'].includes(bucket);

  // Check authentication status on mount
  useEffect(() => {
    checkAuth();
  }, [user]);

  // Reset error state when value or publicUrl changes
  useEffect(() => {
    setHasError(false);
  }, [value, publicUrl]);

  const checkAuth = () => {
    try {
      // Check custom authentication first
      const authenticatedUser = getAuthenticatedUser();
      if (authenticatedUser) {
        setIsAuthenticated(true);
        return;
      }

      // Fallback: Check if user exists in context
      if (user && user.id) {
        setIsAuthenticated(true);
        return;
      }

      // For public buckets, we allow uploads without authentication
      if (isPublicBucket) {
        setIsAuthenticated(true);
        return;
      }

      // If no authentication found and not a public bucket
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Auth check error:', error);
      setIsAuthenticated(false);
    }
  };

  // Delete old file from storage
  const deleteOldFile = async (oldPath: string): Promise<void> => {
    if (!oldPath) return;
    await deleteFileFromStorage(bucket, oldPath);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Store the old path before uploading new file
    const oldPath = value;
    const isReplacement = !!oldPath;

    console.log('[ImageUpload] Starting upload:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      bucket,
      isReplacement,
      oldPath,
    });

    const loadingToastId = toast.loading(isReplacement ? 'Replacing image...' : 'Uploading image...');

    try {
      setUploading(true);

      // Validate file type
      if (!file.type.match(/^image\/(jpeg|png|jpg|svg\+xml)$/)) {
        console.error('[ImageUpload] Invalid file type:', file.type);
        toast.dismiss(loadingToastId);
        toast.error("Please upload an image file (PNG, JPG, JPEG, or SVG)");
        return;
      }

      // Validate file size (2MB)
      if (file.size > 2 * 1024 * 1024) {
        console.error('[ImageUpload] File too large:', file.size);
        toast.dismiss(loadingToastId);
        toast.error("File size must be less than 2MB");
        return;
      }

      // SECURE UPLOAD: Use Edge Function for server-side upload
      // This approach:
      // 1. Validates authentication server-side
      // 2. Checks admin permissions via admin_users table
      // 3. Uses service_role credentials to bypass RLS
      // 4. Handles file validation and storage securely
      const result = await uploadFileViaEdgeFunction(bucket, file, oldPath);

      toast.dismiss(loadingToastId);

      if (!result.success) {
        console.error('[ImageUpload] Upload failed:', result.error);

        // Handle specific error cases
        if (result.error?.includes('Authentication') || result.error?.includes('auth')) {
          toast.error("Authentication error. Please log in again.");
        } else if (result.error?.includes('Access denied') || result.error?.includes('privileges')) {
          toast.error("You don't have permission to upload images.");
        } else if (result.error?.includes('No Edge Function')) {
          // Fallback to direct upload for buckets without Edge Functions
          console.warn(`No Edge Function for ${bucket}, falling back to direct upload`);
          await handleDirectUpload(file, oldPath, isReplacement, loadingToastId);
          return;
        } else if (result.error?.includes('Network error')) {
          toast.error("Network error. Please check your connection.");
        } else if (result.error?.includes('File size')) {
          toast.error("File is too large. Maximum size is 2MB.");
        } else if (result.error?.includes('file type') || result.error?.includes('Invalid file')) {
          toast.error("Invalid file type. Please use PNG, JPG, JPEG, or SVG.");
        } else {
          // Show the actual error message from the server
          toast.error(result.error || "Failed to upload image. Please try again.");
        }
        return;
      }

      // Success!
      toast.success(isReplacement ? 'Image replaced successfully!' : 'Image uploaded successfully!');
      onChange(result.path || null);

      console.log(`File ${isReplacement ? 'replaced' : 'uploaded'} successfully via Edge Function:`, result.path);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.dismiss(loadingToastId);

      const errorMessage = error instanceof Error ? error.message : 'Error uploading file';
      toast.error(errorMessage);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Fallback: Direct upload for buckets without Edge Functions
  const handleDirectUpload = async (
    file: File,
    oldPath: string | null,
    isReplacement: boolean,
    loadingToastId: string
  ) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).slice(2)}_${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Storage upload error:', error);
        toast.error(error.message || "Failed to upload image");
        return;
      }

      // Delete old file if replacement
      if (isReplacement && oldPath) {
        await deleteOldFile(oldPath);
      }

      toast.dismiss(loadingToastId);
      toast.success(isReplacement ? 'Image replaced successfully!' : 'Image uploaded successfully!');
      onChange(data.path);
    } catch (error) {
      console.error('Direct upload error:', error);
      toast.error('Upload failed');
    }
  };

  const handleRemove = async () => {
    if (!value) return;
    setShowRemoveConfirmation(true);
  };

  const confirmRemove = async () => {
    setShowRemoveConfirmation(false);

    const oldPath = value;
    onChange(null);

    try {
      if (oldPath) {
        // SECURE DELETE: Try Edge Function first, fallback to direct delete
        const result = await deleteFileViaEdgeFunction(bucket, oldPath);

        if (result.success) {
          toast.success('Image removed successfully');
        } else {
          // Fallback to direct delete
          await deleteOldFile(oldPath);
          toast.success('Image removed successfully');
        }
      }
    } catch (error) {
      console.error('Error removing file:', error);
      toast.info('Image removed from form');
    }
  };

  // Generate public URL with proper handling
  const generateDisplayUrl = (path: string | null) => {
    if (!path) return null;
    return getPublicUrl(bucket, path);
  };

  const displayUrl = publicUrl || generateDisplayUrl(value);
  const hasAuth = isAuthenticated || isPublicBucket;

  // Show auth warning if not authenticated and not a public bucket
  if (!hasAuth && !value && !isPublicBucket) {
    return (
      <div className={cn('space-y-2', className)}>
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Authentication Required
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                Please log in to upload images
              </p>
              <button
                onClick={() => {
                  toast.info('Redirecting to login page...');
                  setTimeout(() => window.location.href = '/signin', 1000);
                }}
                className="text-xs font-medium text-yellow-800 dark:text-yellow-200 hover:text-yellow-900 dark:hover:text-yellow-100 underline mt-2"
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      <input
        ref={fileInputRef}
        type="file"
        id={id}
        accept="image/png,image/jpeg,image/jpg,image/svg+xml"
        className="hidden"
        onChange={handleFileSelect}
        disabled={uploading}
      />

      {value && displayUrl ? (
        <div 
          className="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700 group cursor-pointer transition-all hover:border-purple-400 dark:hover:border-purple-400"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={() => {
            if (!uploading && hasAuth) {
              fileInputRef.current?.click();
            }
          }}
        >
          {hasError ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
              <div className="text-center">
                <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-1" />
                <p className="text-xs text-gray-500">Failed to load</p>
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">Click to upload</p>
              </div>
            </div>
          ) : (
            <>
              <img
                src={displayUrl}
                alt="Uploaded image"
                className={cn(
                  "w-full h-full object-contain bg-white dark:bg-gray-700 transition-all",
                  isHovered && !uploading && "opacity-70 scale-105"
                )}
                onError={() => {
                  setHasError(true);
                }}
              />
              
              {/* Overlay on hover */}
              <div className={cn(
                "absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center transition-opacity",
                isHovered && !uploading ? "opacity-100" : "opacity-0 pointer-events-none"
              )}>
                <RefreshCw className="h-6 w-6 text-white mb-1" />
                <span className="text-xs text-white font-medium">Replace</span>
              </div>

              {/* Loading overlay */}
              {uploading && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                </div>
              )}
            </>
          )}

          {/* Remove button - only show on hover and not while uploading */}
          {!uploading && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRemove();
              }}
              className="absolute top-1 right-1 p-1 bg-white dark:bg-gray-800 rounded-full shadow-sm hover:bg-red-50 dark:hover:bg-red-900/20 hover:shadow-md transition-all opacity-0 group-hover:opacity-100"
              title="Remove image"
            >
              <X className="h-3 w-3 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400" />
            </button>
          )}
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-24 h-24 flex flex-col items-center justify-center gap-2 border-2 border-dashed transition-all",
            "hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/10",
            uploading && "opacity-50 cursor-not-allowed",
            !hasAuth && "opacity-50"
          )}
          onClick={() => {
            if (!hasAuth && !isPublicBucket) {
              toast.warning('Please log in to upload images');
              return;
            }
            fileInputRef.current?.click();
          }}
          disabled={uploading}
          title={!hasAuth && !isPublicBucket ? "Please log in to upload" : "Click to upload image"}
        >
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Uploading...
              </span>
            </>
          ) : (
            <>
              <Camera className="h-6 w-6 text-gray-400 dark:text-gray-500" />
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {!hasAuth && !isPublicBucket ? 'Login Required' : 'Upload Logo'}
              </span>
            </>
          )}
        </Button>
      )}
      
      {/* Help text */}
      {!value && hasAuth && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Click to upload • PNG, JPG, JPEG or SVG • Max 2MB
        </p>
      )}
      
      {value && !uploading && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Click image to replace • Click × to remove
        </p>
      )}
      
      {/* Confirmation Dialog for removing image */}
      <ConfirmationDialog
        isOpen={showRemoveConfirmation}
        title="Remove Logo"
        message="Are you sure you want to remove this logo? This action cannot be undone."
        confirmText="Remove"
        cancelText="Keep"
        confirmVariant="destructive"
        onConfirm={confirmRemove}
        onCancel={() => setShowRemoveConfirmation(false)}
      />
    </div>
  );
}