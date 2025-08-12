///home/project/src/components/shared/AttachmentUploader.tsx

import React, { useState, useEffect, useRef } from 'react';
import { Upload, X, File, Image, FileText, Film, Music, Trash2, Download } from 'lucide-react';
import { Button } from './Button';
import { toast } from './Toast';
import { cn } from '../../lib/utils';
import { v4 as uuidv4 } from 'uuid';

interface Attachment {
  id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  file_url: string;
  question_id: string | null;
  sub_question_id: string | null;
  created_at: string;
}

interface AttachmentUploaderProps {
  onUploadComplete?: (attachments: Attachment[]) => void;
  allowMultiple?: boolean;
  maxFileSize?: number; // in MB
  acceptedFileTypes?: string[];
  className?: string;
}

export function AttachmentUploader({
  onUploadComplete,
  allowMultiple = false,
  maxFileSize = 10, // Default 10MB
  acceptedFileTypes = ['image/*', 'application/pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', 'video/*', 'audio/*'],
  className
}: AttachmentUploaderProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newUploadProgress: Record<string, number> = {};
    const uploadedAttachments: Attachment[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file size
        if (file.size > maxFileSize * 1024 * 1024) {
          toast.error(`File ${file.name} exceeds the maximum size of ${maxFileSize}MB`);
          continue;
        }

        // Create a file reader to get the file as a data URL
        const reader = new FileReader();
        
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          
          // Create a temporary attachment object
          const tempAttachment: Attachment = {
            id: `temp-${uuidv4()}`,
            file_name: file.name,
            file_size: file.size,
            file_type: file.type,
            file_url: dataUrl,
            question_id: null,
            sub_question_id: null,
            created_at: new Date().toISOString()
          };
          
          uploadedAttachments.push(tempAttachment);
          
          // Update progress
          newUploadProgress[file.name] = 100;
          setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
          
          // If this is the last file, call onUploadComplete
          if (i === files.length - 1) {
            if (onUploadComplete) {
              onUploadComplete(uploadedAttachments);
            }
            setUploading(false);
            // Clear the file input
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          }
        };
        
        reader.onerror = () => {
          toast.error(`Failed to read file ${file.name}`);
          
          // If this is the last file, finish the upload process
          if (i === files.length - 1) {
            setUploading(false);
            // Clear the file input
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          }
        };
        
        // Start reading the file as a data URL
        reader.readAsDataURL(file);
        
        // Initialize progress
        newUploadProgress[file.name] = 0;
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('An error occurred during upload');
      setUploading(false);
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="h-6 w-6 text-blue-500" />;
    if (fileType.startsWith('video/')) return <Film className="h-6 w-6 text-purple-500" />;
    if (fileType.startsWith('audio/')) return <Music className="h-6 w-6 text-green-500" />;
    if (fileType.includes('pdf')) return <FileText className="h-6 w-6 text-red-500" />;
    return <File className="h-6 w-6 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={cn("space-y-4", className)}>
      <input
        ref={fileInputRef}
        type="file"
        multiple={allowMultiple}
        accept={acceptedFileTypes.join(',')}
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 transition-colors hover:border-gray-400 dark:hover:border-gray-500">
        <Upload className="h-10 w-10 text-gray-400 dark:text-gray-500 mb-2" />
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
          Drag and drop files here, or click to select files
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500">
          Max file size: {maxFileSize}MB
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? 'Uploading...' : 'Select Files'}
        </Button>
      </div>

    {/* Progress bars for uploads in progress */}
    {Object.keys(uploadProgress).length > 0 && (
      <div className="space-y-2">
        {Object.entries(uploadProgress).map(([fileName, progress]) => (
          <div key={fileName} className="bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="bg-blue-500 h-2 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        ))}
      </div>
    )}
  </div>
  );
}