// src/app/system-admin/learning/practice-management/papers-setup/tabs/QuestionsTab/components/AttachmentManager.tsx

/**
 * AttachmentManager Component
 * Manages attachments for questions, parts, and subparts
 * Extracted from QuestionsTab to improve modularity
 */

import React, { useState, useCallback } from 'react';
import { Paperclip, Trash2, Upload, Image, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '../../../../../../../components/shared/Button';
import { toast } from '../../../../../../../components/shared/Toast';
import { cn } from '../../../../../../../lib/utils';
import { SimulationAttachment } from '../hooks/useAttachments';

interface AttachmentManagerProps {
  attachmentKey: string;
  attachments: SimulationAttachment[];
  onAdd: (key: string, attachment: SimulationAttachment) => void;
  onRemove: (key: string, attachmentId: string) => void;
  onUpdate?: (key: string, attachmentId: string, updates: Partial<SimulationAttachment>) => void;
  readOnly?: boolean;
  maxAttachments?: number;
  allowedTypes?: string[];
  label?: string;
  showPreview?: boolean;
  className?: string;
}

export const AttachmentManager: React.FC<AttachmentManagerProps> = ({
  attachmentKey,
  attachments = [],
  onAdd,
  onRemove,
  onUpdate,
  readOnly = false,
  maxAttachments = 10,
  allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'application/pdf'],
  label = 'Attachments',
  showPreview = true,
  className
}) => {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    if (attachments.length >= maxAttachments) {
      toast.error(`Maximum ${maxAttachments} attachments allowed`);
      return;
    }

    setUploading(true);

    try {
      const file = files[0];

      // Validate file type
      if (!allowedTypes.includes(file.type)) {
        toast.error(`File type ${file.type} not allowed`);
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }

      // Read file as data URL
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;

        const newAttachment: SimulationAttachment = {
          id: `att_${Date.now()}_${Math.random()}`,
          file_url: dataUrl,
          file_name: file.name,
          file_type: file.type,
          source: 'primary',
          attachmentKey,
          canDelete: true
        };

        onAdd(attachmentKey, newAttachment);
        toast.success('Attachment added successfully');
      };

      reader.onerror = () => {
        toast.error('Failed to read file');
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error handling file:', error);
      toast.error('Failed to add attachment');
    } finally {
      setUploading(false);
    }
  }, [attachmentKey, attachments.length, maxAttachments, allowedTypes, onAdd]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, [handleFileSelect]);

  const handleRemove = useCallback((attachmentId: string) => {
    onRemove(attachmentKey, attachmentId);
    toast.success('Attachment removed');
  }, [attachmentKey, onRemove]);

  const isImage = (fileType: string) => {
    return fileType.startsWith('image/');
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            ({attachments.length}/{maxAttachments})
          </span>
        </div>
      </div>

      {/* Attachment List */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
            >
              {/* Preview */}
              {showPreview && isImage(attachment.file_type) && (
                <div className="flex-shrink-0">
                  <img
                    src={attachment.file_url}
                    alt={attachment.file_name}
                    className="h-12 w-12 object-cover rounded border border-gray-300 dark:border-gray-600"
                  />
                </div>
              )}

              {/* Icon for non-images */}
              {showPreview && !isImage(attachment.file_type) && (
                <div className="flex-shrink-0 h-12 w-12 flex items-center justify-center bg-gray-200 dark:bg-gray-600 rounded border border-gray-300 dark:border-gray-600">
                  <Image className="h-6 w-6 text-gray-400" />
                </div>
              )}

              {/* Details */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {attachment.file_name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {attachment.file_type}
                </p>
              </div>

              {/* Actions */}
              {!readOnly && attachment.canDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(attachment.id)}
                  className="flex-shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Area */}
      {!readOnly && attachments.length < maxAttachments && (
        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
            dragActive
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500',
            uploading && 'opacity-50 pointer-events-none'
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Drag and drop a file here, or click to select
          </p>
          <input
            type="file"
            accept={allowedTypes.join(',')}
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
            id={`file-upload-${attachmentKey}`}
            disabled={uploading}
          />
          <label htmlFor={`file-upload-${attachmentKey}`}>
            <Button
              as="span"
              variant="outline"
              size="sm"
              disabled={uploading}
              className="cursor-pointer"
            >
              {uploading ? 'Uploading...' : 'Select File'}
            </Button>
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Max {maxAttachments} files, up to 10MB each
          </p>
        </div>
      )}

      {/* Empty State */}
      {attachments.length === 0 && readOnly && (
        <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
          No attachments
        </div>
      )}
    </div>
  );
};

export default AttachmentManager;
