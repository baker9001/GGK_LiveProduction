// /src/components/shared/ImageUpload.tsx

import React, { useRef, useState, useEffect } from 'react';
import { Upload, X, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './Button';
import { supabase } from '../../lib/supabase';
import { useUser } from '../../contexts/UserContext';
import { toast } from './Toast';
import { ConfirmationDialog } from './ConfirmationDialog';
import { getAuthenticatedUser } from '../../lib/auth';

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useUser(); // Get user from context

  // Define public buckets that don't require authentication
  const isPublicBucket = ['company-logos', 'logos', 'school-logos', 'subject-logos', 'branch-logos'].includes(bucket);

  // Check authentication status on mount - Updated to use custom auth
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

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Show loading toast
    const loadingToastId = toast.loading('Uploading image...');

    try {
      setUploading(true);

      // Validate file type
      if (!file.type.match(/^image\/(jpeg|png|jpg|svg\+xml)$/)) {
        toast.dismiss(loadingToastId);
        toast.error("Please upload an image file (PNG, JPG, JPEG, or SVG)");
        return;
      }

      // Validate file size (2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.dismiss(loadingToastId);
        toast.error("File size must be less than 2MB");
        return;
      }

      // Get the user ID from custom auth or context
      const authenticatedUser = getAuthenticatedUser();
      const userId = authenticatedUser?.id || user?.id || 'anonymous';
      
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).slice(2)}_${Date.now()}.${fileExt}`;
      
      // Determine upload path based on bucket type
      // FIXED: Removed subfolder paths for logo buckets to match deletion logic
      let uploadPath = fileName;
      
      // Only use subfolder for avatars (user-specific isolation)
      if (bucket === 'avatars' && userId !== 'anonymous') {
        uploadPath = `${userId}/${fileName}`;
      }
      // All other buckets use flat structure (no subfolders)
      // This includes: company-logos, school-logos, subject-logos, branch-logos, logos
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(uploadPath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Storage upload error:', error);
        toast.dismiss(loadingToastId);
        
        // Provide more specific error messages
        if (error.message?.includes('row level security')) {
          toast.error("Storage permissions error. Please contact administrator.");
        } else if (error.message?.includes('bucket')) {
          toast.error(`Storage bucket '${bucket}' may not be configured properly.`);
        } else if (error.message?.includes('duplicate')) {
          // Try with a different filename
          const altFileName = `${Math.random().toString(36).slice(2)}_${Date.now()}_alt.${fileExt}`;
          
          const { data: retryData, error: retryError } = await supabase.storage
            .from(bucket)
            .upload(altFileName, file, {
              cacheControl: '3600',
              upsert: false
            });

          if (retryError) {
            toast.error("Failed to upload image. Please try again.");
            return;
          } else {
            // Success on retry
            toast.dismiss(loadingToastId);
            toast.success('Image uploaded successfully!');
            onChange(retryData.path);
            return;
          }
        } else {
          toast.error(error.message || "Failed to upload image. Please try again.");
        }
        return;
      }

      // Get public URL for the uploaded file
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      // Success!
      toast.dismiss(loadingToastId);
      toast.success('Image uploaded successfully!');
      
      // Return the file path
      onChange(data.path);
      
      console.log('File uploaded successfully:', data.path);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.dismiss(loadingToastId);
      
      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Error uploading file';
      toast.error(errorMessage);
    } finally {
      setUploading(false);
      // Clear input value to allow uploading the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = async () => {
    if (!value) return;
    
    // Show the confirmation dialog
    setShowRemoveConfirmation(true);
  };

  const confirmRemove = async () => {
    // Close the confirmation dialog
    setShowRemoveConfirmation(false);

    // Immediately update the UI to show removal in progress
    onChange(null);

    try {
      if (value) {
        const { error } = await supabase.storage
          .from(bucket)
          .remove([value]);

        if (error) {
          console.error('Storage remove error:', error);
          // Even if storage deletion fails, we've already cleared the UI
          // Use a non-blocking toast that doesn't interfere with form
          setTimeout(() => {
            toast.info('Image removed from form (storage cleanup may have failed)');
          }, 200);
        } else {
          // Success - show confirmation after delay
          setTimeout(() => {
            toast.success('Image removed successfully');
          }, 200);
        }
      }
    } catch (error) {
      console.error('Error removing file:', error);
      // Use a non-blocking toast that doesn't interfere with form
      setTimeout(() => {
        toast.info('Image removed from form (storage cleanup failed)');
      }, 200);
    }
  };

  // Check if user has authentication
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

      {value && publicUrl ? (
        <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 group">
          {hasError ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
              <div className="text-center">
                <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-1" />
                <p className="text-xs text-gray-500">Failed to load</p>
              </div>
            </div>
          ) : (
            <img
              src={publicUrl}
              alt="Uploaded image"
              className="w-full h-full object-contain bg-white dark:bg-gray-700"
              onError={() => {
                console.error('Image load error for:', publicUrl);
                setHasError(true);
                toast.warning('Failed to load image preview');
              }}
            />
          )}
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-1 right-1 p-1 bg-white dark:bg-gray-800 rounded-full shadow-sm hover:bg-red-50 dark:hover:bg-red-900/20 hover:shadow-md transition-all opacity-0 group-hover:opacity-100"
            title="Remove image"
          >
            <X className="h-4 w-4 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400" />
          </button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-24 h-24 flex flex-col items-center justify-center gap-2 border-dashed transition-all",
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
              <Upload className="h-6 w-6 text-gray-400 dark:text-gray-500" />
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {!hasAuth && !isPublicBucket ? 'Login Required' : 'Upload'}
              </span>
            </>
          )}
        </Button>
      )}
      
      {/* File format helper text */}
      {!value && hasAuth && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          PNG, JPG, JPEG or SVG • Max 2MB
        </p>
      )}
      
      {/* Confirmation Dialog for removing image */}
      <ConfirmationDialog
        isOpen={showRemoveConfirmation}
        title="Remove Image"
        message="Are you sure you want to remove this image? This action cannot be undone."
        confirmText="Remove"
        cancelText="Keep"
        confirmVariant="destructive"
        onConfirm={confirmRemove}
        onCancel={() => setShowRemoveConfirmation(false)}
      />
    </div>
  );
}