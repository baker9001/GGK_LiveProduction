/**
 * File Uploader Component for Document/Image Submissions
 *
 * Supports drag-and-drop, file type validation, size limits,
 * preview for images/PDFs, and multiple file uploads.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  File as FileIcon,
  Image as ImageIcon,
  FileText,
  X,
  Check,
  AlertCircle,
  Download,
  Eye
} from 'lucide-react';
import Button from '@/components/shared/Button';
import { cn } from '@/lib/utils';
import {
  uploadAnswerAsset,
  formatFileSize,
  validateFileType,
  generateUniqueFileName
} from '../utils/assetUpload';
import { validateFileUpload } from '../utils/dataValidation';

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  path: string;
  uploadedAt: string;
  preview?: string; // For images
}

interface FileUploaderProps {
  questionId: string;
  value: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
  disabled?: boolean;
  maxFiles?: number; // Default: 1
  maxSize?: number; // bytes, default: 10MB
  acceptedFileTypes?: string[]; // MIME types
  showPreviews?: boolean;
  allowedExtensions?: string[]; // e.g., ['.pdf', '.doc', '.jpg']
  studentId?: string; // For upload path
  showCorrectAnswer?: boolean;
  helpText?: string;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  questionId,
  value,
  onChange,
  disabled = false,
  maxFiles = 1,
  maxSize = 10485760, // 10MB
  acceptedFileTypes = ['application/pdf', 'image/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  showPreviews = true,
  allowedExtensions,
  studentId = 'temp-user',
  showCorrectAnswer = false,
  helpText
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null);

  const canUploadMore = value.length < maxFiles;

  const onDrop = useCallback(async (acceptedFiles: File[], rejectedFiles: any[]) => {
    setUploadError(null);

    // Handle rejected files
    if (rejectedFiles.length > 0) {
      const reasons = rejectedFiles.map(f => f.errors.map((e: any) => e.message).join(', '));
      setUploadError(`Some files were rejected: ${reasons.join('; ')}`);
    }

    // Check if we can upload more files
    if (value.length + acceptedFiles.length > maxFiles) {
      setUploadError(`Maximum ${maxFiles} file(s) allowed. Remove existing files first.`);
      return;
    }

    // Validate and upload each file
    setUploading(true);

    try {
      const uploadPromises = acceptedFiles.map(async (file) => {
        // Validate file
        const validation = validateFileUpload(file, acceptedFileTypes, maxSize);
        if (!validation.isValid) {
          throw new Error(validation.errors.join(', '));
        }

        // Generate unique file name
        const uniqueName = generateUniqueFileName(file.name);

        // Upload to Supabase Storage
        const result = await uploadAnswerAsset(
          file,
          uniqueName,
          studentId,
          'file'
        );

        if (!result.success) {
          throw new Error(result.error || 'Upload failed');
        }

        // Create preview for images
        let preview: string | undefined;
        if (file.type.startsWith('image/')) {
          preview = URL.createObjectURL(file);
        }

        return {
          id: crypto.randomUUID(),
          name: file.name,
          size: file.size,
          type: file.type,
          url: result.url!,
          path: result.path!,
          uploadedAt: new Date().toISOString(),
          preview
        };
      });

      const uploadedFiles = await Promise.all(uploadPromises);
      onChange([...value, ...uploadedFiles]);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [value, maxFiles, acceptedFileTypes, maxSize, studentId, onChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: disabled || !canUploadMore || uploading,
    maxFiles: maxFiles - value.length,
    maxSize,
    accept: acceptedFileTypes.reduce((acc, type) => {
      if (type.endsWith('/*')) {
        const category = type.replace('/*', '');
        acc[type] = allowedExtensions || [];
      } else {
        acc[type] = allowedExtensions || [];
      }
      return acc;
    }, {} as Record<string, string[]>)
  });

  const handleRemoveFile = useCallback((fileId: string) => {
    const updatedFiles = value.filter(f => f.id !== fileId);
    onChange(updatedFiles);
    // Clean up preview URL
    const removed = value.find(f => f.id === fileId);
    if (removed?.preview) {
      URL.revokeObjectURL(removed.preview);
    }
  }, [value, onChange]);

  const handlePreview = useCallback((file: UploadedFile) => {
    setPreviewFile(file);
  }, []);

  const handleDownload = useCallback((file: UploadedFile) => {
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.name;
    link.target = '_blank';
    link.click();
  }, []);

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <ImageIcon className="w-5 h-5" />;
    if (fileType === 'application/pdf') return <FileText className="w-5 h-5" />;
    return <FileIcon className="w-5 h-5" />;
  };

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      {canUploadMore && !disabled && (
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200",
            isDragActive
              ? "border-[#8CC63F] bg-[#8CC63F]/10 dark:bg-[#8CC63F]/20"
              : "border-gray-300 dark:border-gray-600 hover:border-[#8CC63F] hover:bg-gray-50 dark:hover:bg-gray-800",
            uploading && "opacity-50 cursor-not-allowed"
          )}
        >
          <input {...getInputProps()} />

          <Upload className={cn(
            "w-12 h-12 mx-auto mb-4",
            isDragActive ? "text-[#8CC63F]" : "text-gray-400"
          )} />

          {uploading ? (
            <div>
              <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                Uploading...
              </p>
              <div className="w-48 h-2 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto overflow-hidden">
                <div className="h-full bg-[#8CC63F] animate-pulse" style={{ width: '60%' }} />
              </div>
            </div>
          ) : isDragActive ? (
            <p className="text-lg font-medium text-[#8CC63F]">
              Drop the file{maxFiles > 1 ? 's' : ''} here...
            </p>
          ) : (
            <div>
              <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                Drag & drop file{maxFiles > 1 ? 's' : ''} here, or click to browse
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {helpText || `Maximum ${maxFiles} file(s), up to ${formatFileSize(maxSize)} each`}
              </p>
              {allowedExtensions && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  Allowed: {allowedExtensions.join(', ')}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Upload Error */}
      {uploadError && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-300">Upload Error</p>
              <p className="text-sm text-red-700 dark:text-red-400 mt-1">{uploadError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Uploaded Files List */}
      {value.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Uploaded File{value.length > 1 ? 's' : ''}: ({value.length}/{maxFiles})
          </h4>

          {value.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
            >
              {/* File Icon or Preview */}
              <div className="flex-shrink-0">
                {showPreviews && file.preview ? (
                  <img
                    src={file.preview}
                    alt={file.name}
                    className="w-12 h-12 object-cover rounded"
                  />
                ) : (
                  <div className="w-12 h-12 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded">
                    {getFileIcon(file.type)}
                  </div>
                )}
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {file.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatFileSize(file.size)} • {new Date(file.uploadedAt).toLocaleDateString()}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                {/* Preview */}
                {(file.type.startsWith('image/') || file.type === 'application/pdf') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePreview(file)}
                    title="Preview"
                    className="h-8 w-8 p-0"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                )}

                {/* Download */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownload(file)}
                  title="Download"
                  className="h-8 w-8 p-0"
                >
                  <Download className="w-4 h-4" />
                </Button>

                {/* Remove */}
                {!disabled && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveFile(file.id)}
                    title="Remove"
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Success Message */}
      {value.length > 0 && !uploadError && (
        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
          <Check className="w-4 h-4" />
          <span>File{value.length > 1 ? 's' : ''} uploaded successfully</span>
        </div>
      )}

      {/* Preview Modal */}
      {previewFile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPreviewFile(null)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[90vh] bg-white dark:bg-gray-900 rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                {previewFile.name}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPreviewFile(null)}
                className="h-8 w-8 p-0"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-4 overflow-auto max-h-[calc(90vh-80px)]">
              {previewFile.type.startsWith('image/') ? (
                <img
                  src={previewFile.preview || previewFile.url}
                  alt={previewFile.name}
                  className="max-w-full h-auto mx-auto"
                />
              ) : previewFile.type === 'application/pdf' ? (
                <iframe
                  src={previewFile.url}
                  className="w-full h-[70vh] border-0"
                  title={previewFile.name}
                />
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUploader;
