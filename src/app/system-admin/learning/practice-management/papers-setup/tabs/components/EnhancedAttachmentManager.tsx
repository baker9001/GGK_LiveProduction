import React, { useState, useRef, useCallback } from 'react';
import {
  Upload,
  Image as ImageIcon,
  FileText,
  X,
  CheckCircle,
  AlertCircle,
  Download,
  ExternalLink,
  Maximize2,
  Eye,
  Trash2,
  Loader2,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { Button } from '../../../../../../../components/shared/Button';
import { toast } from '../../../../../../../components/shared/Toast';
import { cn } from '../../../../../../../lib/utils';

interface Attachment {
  id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size?: number;
  uploaded_at?: string;
}

interface EnhancedAttachmentManagerProps {
  attachments: Attachment[];
  questionId: string;
  partId?: string;
  subpartId?: string;
  onUpload: (files: File[], key: string) => Promise<void>;
  onDelete: (attachmentId: string, key: string) => void;
  onReorder?: (attachments: Attachment[]) => void;
  maxFiles?: number;
  maxSizePerFile?: number;
  acceptedTypes?: string[];
  showPreview?: boolean;
}

export function EnhancedAttachmentManager({
  attachments,
  questionId,
  partId,
  subpartId,
  onUpload,
  onDelete,
  onReorder,
  maxFiles = 10,
  maxSizePerFile = 10,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'],
  showPreview = true
}: EnhancedAttachmentManagerProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const key = subpartId
    ? `${questionId}-${partId}-${subpartId}`
    : partId
    ? `${questionId}-${partId}`
    : questionId;

  const validateFiles = (files: File[]): string | null => {
    if (attachments.length + files.length > maxFiles) {
      return `Maximum ${maxFiles} files allowed. Current: ${attachments.length}, Adding: ${files.length}`;
    }

    const oversizedFiles = files.filter(f => f.size > maxSizePerFile * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      return `Files must be under ${maxSizePerFile}MB. Oversized: ${oversizedFiles.map(f => f.name).join(', ')}`;
    }

    const invalidTypeFiles = files.filter(f => !acceptedTypes.includes(f.type));
    if (invalidTypeFiles.length > 0) {
      return `Invalid file type. Accepted: ${acceptedTypes.map(t => t.split('/')[1]).join(', ')}`;
    }

    return null;
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const validationErr = validateFiles(fileArray);

    if (validationErr) {
      setValidationError(validationErr);
      toast.error(validationErr);
      return;
    }

    setValidationError(null);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      await onUpload(fileArray, key);

      setUploadProgress(100);
      toast.success(`${fileArray.length} file(s) uploaded successfully`);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload files');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const { files } = e.dataTransfer;
    handleFileSelect(files);
  }, []);

  const handleDeleteClick = (attachment: Attachment) => {
    if (window.confirm(`Delete ${attachment.file_name}?`)) {
      onDelete(attachment.id, key);
      toast.success('Attachment deleted');
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return ImageIcon;
    return FileText;
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-8 transition-all",
          dragActive
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
            : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500",
          isUploading && "pointer-events-none opacity-60"
        )}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />

        <div className="text-center">
          {isUploading ? (
            <div className="space-y-4">
              <Loader2 className="h-12 w-12 text-blue-600 dark:text-blue-400 mx-auto animate-spin" />
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Uploading files...
                </div>
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <>
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Upload Attachments
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Drag and drop files here, or click to browse
              </p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                leftIcon={<Upload className="h-4 w-4" />}
              >
                Choose Files
              </Button>
              <div className="mt-4 text-xs text-gray-500 dark:text-gray-500 space-y-1">
                <div>
                  Max {maxFiles} files • Up to {maxSizePerFile}MB each
                </div>
                <div>
                  Accepted: {acceptedTypes.map(t => t.split('/')[1].toUpperCase()).join(', ')}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Validation Error */}
      {validationError && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-red-900 dark:text-red-100 text-sm">
                Upload Error
              </div>
              <div className="text-sm text-red-800 dark:text-red-200 mt-1">
                {validationError}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attachments List */}
      {attachments.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Uploaded Files ({attachments.length}/{maxFiles})
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {attachments.map((attachment) => {
              const isImage = attachment.file_type?.startsWith('image/');
              const FileIcon = getFileIcon(attachment.file_type);

              return (
                <div
                  key={attachment.id}
                  className="group relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Preview/Icon */}
                  {isImage ? (
                    <div className="aspect-video bg-gray-100 dark:bg-gray-900 relative">
                      <img
                        src={attachment.file_url}
                        alt={attachment.file_name}
                        className="w-full h-full object-contain"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPreviewAttachment(attachment)}
                          className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
                          title="Preview"
                        >
                          <Maximize2 className="h-4 w-4 text-gray-700" />
                        </button>
                        <a
                          href={attachment.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
                          title="Open in new tab"
                        >
                          <ExternalLink className="h-4 w-4 text-gray-700" />
                        </a>
                        <a
                          href={attachment.file_url}
                          download={attachment.file_name}
                          className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
                          title="Download"
                        >
                          <Download className="h-4 w-4 text-gray-700" />
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-video bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
                      <FileIcon className="h-16 w-16 text-gray-400" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {attachment.file_name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {attachment.file_type?.split('/')[1].toUpperCase()}
                          </span>
                          {attachment.file_size && (
                            <>
                              <span className="text-xs text-gray-400">•</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {formatFileSize(attachment.file_size)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteClick(attachment)}
                        className="flex-shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Status Indicator */}
                    <div className="mt-2 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400" />
                      <span className="text-xs text-green-600 dark:text-green-400">
                        Uploaded
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {attachments.length === 0 && !isUploading && (
        <div className="text-center p-8 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <ImageIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No attachments yet. Upload files to get started.
          </p>
        </div>
      )}

      {/* Preview Modal */}
      {previewAttachment && previewAttachment.file_type?.startsWith('image/') && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
          onClick={() => setPreviewAttachment(null)}
        >
          <div className="relative max-h-[90vh] max-w-6xl" onClick={(e) => e.stopPropagation()}>
            <div className="absolute -top-14 right-0 flex items-center gap-2">
              <a
                href={previewAttachment.file_url}
                download={previewAttachment.file_name}
                className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors"
                title="Download"
              >
                <Download className="h-5 w-5 text-gray-700" />
              </a>
              <a
                href={previewAttachment.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors"
                title="Open in new tab"
              >
                <ExternalLink className="h-5 w-5 text-gray-700" />
              </a>
              <button
                type="button"
                onClick={() => setPreviewAttachment(null)}
                className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors"
                title="Close"
              >
                <X className="h-5 w-5 text-gray-700" />
              </button>
            </div>

            <img
              src={previewAttachment.file_url}
              alt={previewAttachment.file_name}
              className="max-h-[90vh] w-auto rounded-xl shadow-2xl"
            />

            <div className="absolute -bottom-14 left-0 right-0 bg-white dark:bg-gray-800 rounded-lg p-3">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {previewAttachment.file_name}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {previewAttachment.file_type} • {formatFileSize(previewAttachment.file_size)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
