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
        <div className="grid grid-cols-2 gap-3">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="group relative bg-white dark:bg-white rounded-lg border-2 border-gray-200 dark:border-gray-300 shadow-sm hover:shadow-lg transition-all overflow-hidden"
            >
              {/* Preview for images */}
              {showPreview && isImage(attachment.file_type) && (
                <div className="flex items-center justify-center p-3 min-h-[140px] cursor-pointer"
                  onClick={() => window.open(attachment.file_url, '_blank')}
                >
                  <img
                    src={attachment.file_url}
                    alt={attachment.file_name}
                    className="max-w-full h-auto object-contain"
                    style={{ maxHeight: '200px' }}
                  />
                </div>
              )}

              {/* Icon for non-images */}
              {showPreview && !isImage(attachment.file_type) && (
                <div className="flex items-center justify-center p-6 min-h-[140px] bg-gray-50 dark:bg-gray-100">
                  <div className="flex flex-col items-center">
                    <Image className="h-12 w-12 text-gray-400 dark:text-gray-500 mb-2" />
                    <span className="text-xs text-gray-500 dark:text-gray-600 font-medium">
                      {attachment.file_type}
                    </span>
                  </div>
                </div>
              )}

              {/* Action buttons overlay */}
              {!readOnly && attachment.canDelete && (
                <button
                  onClick={() => handleRemove(attachment.id)}
                  className="absolute top-2 right-2 z-10 p-2 rounded-full bg-white dark:bg-white text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-100 shadow-md hover:shadow-lg opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  title="Remove attachment"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}

              {/* Enlarge button for images */}
              {showPreview && isImage(attachment.file_type) && (
                <button
                  onClick={() => window.open(attachment.file_url, '_blank')}
                  className="absolute top-2 left-2 z-10 p-2 rounded-full bg-white dark:bg-white text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-100 shadow-md hover:shadow-lg opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  title="View full size"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
              )}

              {/* File name footer */}
              <div className="bg-gray-50 dark:bg-gray-100 border-t border-gray-200 dark:border-gray-300 px-2 py-1.5">
                <p className="text-xs text-gray-700 dark:text-gray-800 truncate font-medium">
                  {attachment.file_name}
                </p>
              </div>
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
