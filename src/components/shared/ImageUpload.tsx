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
  const { user } = useUser();

  // Define public buckets that don't require authentication
  const isPublicBucket = ['company-logos', 'logos', 'school-logos', 'subject-logos', 'branch-logos'].includes(bucket);

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

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

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
      
      // FIXED: Use flat structure for all buckets except avatars
      let uploadPath = fileName;
      
      // Only use subfolder for avatars (user-specific isolation)
      if (bucket === 'avatars' && userId !== 'anonymous') {
        uploadPath = `${userId}/${fileName}`;
      }
      // All logo buckets use flat structure (no subfolders)
      
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
        
        // Handle specific error cases
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

      // Success!
      toast.dismiss(loadingToastId);
      toast.success('Image uploaded successfully!');
      onChange(data.path);
      
      console.log('File uploaded successfully:', data.path);
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

  const handleRemove = async () => {
    if (!value) return;
    setShowRemoveConfirmation(true);
  };

  const confirmRemove = async () => {
    setShowRemoveConfirmation(false);
    onChange(null);

    try {
      if (value) {
        // Try to remove with the stored path
        const { error } = await supabase.storage
          .from(bucket)
          .remove([value]);

        if (error) {
          console.error('Storage remove error:', error);
          
          // If it fails and path has a subfolder, try without it
          if (value.includes('/')) {
            const fileName = value.split('/').pop();
            if (fileName) {
              const { error: retryError } = await supabase.storage
                .from(bucket)
                .remove([fileName]);
              
              if (!retryError) {
                setTimeout(() => {
                  toast.success('Image removed successfully');
                }, 200);
                return;
              }
            }
          }
          
          setTimeout(() => {
            toast.info('Image removed from form (storage cleanup may have failed)');
          }, 200);
        } else {
          setTimeout(() => {
            toast.success('Image removed successfully');
          }, 200);
        }
      }
    } catch (error) {
      console.error('Error removing file:', error);
      setTimeout(() => {
        toast.info('Image removed from form (storage cleanup failed)');
      }, 200);
    }
  };

  // Generate public URL with proper handling
  const getPublicUrl = (path: string | null) => {
    if (!path) return null;
    
    // If already a full URL, return it
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    
    // Get public URL from Supabase
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);
    
    return data?.publicUrl || null;
  };

  const displayUrl = publicUrl || getPublicUrl(value);
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
              src={displayUrl}
              alt="Uploaded image"
              className="w-full h-full object-contain bg-white dark:bg-gray-700"
              onError={() => {
                console.error('Image load error for:', displayUrl);
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
      
      {!value && hasAuth && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          PNG, JPG, JPEG or SVG • Max 2MB
        </p>
      )}
      
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