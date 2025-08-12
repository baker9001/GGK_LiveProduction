///home/project/src/components/shared/AttachmentList.tsx

import React, { useState } from 'react';
import { Trash2, Eye, Download, File, Image, FileText, Film, Music, AlertCircle, X } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../lib/utils';

export interface Attachment {
  id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  file_url: string;
  question_id: string | null;
  sub_question_id: string | null;
  created_at: string;
}

interface AttachmentListProps {
  attachments: Attachment[];
  onDelete: (attachmentId: string) => void;
  className?: string;
  emptyMessage?: string;
}

export function AttachmentList({
  attachments,
  onDelete,
  className,
  emptyMessage = 'No attachments added yet'
}: AttachmentListProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <Image className="h-5 w-5 text-blue-500" />;
    } else if (fileType === 'application/pdf') {
      return <FileText className="h-5 w-5 text-red-500" />;
    } else if (fileType.startsWith('video/')) {
      return <Film className="h-5 w-5 text-purple-500" />;
    } else if (fileType.startsWith('audio/')) {
      return <Music className="h-5 w-5 text-green-500" />;
    } else {
      return <File className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handlePreview = (attachment: Attachment) => {
    // For data URLs, use directly
    if (attachment.file_url.startsWith('data:')) {
      setPreviewUrl(attachment.file_url);
      return;
    }
    
    // For storage URLs, construct the public URL
    try {
      const { data } = supabase.storage
        .from('questions-attachments')
        .getPublicUrl(attachment.file_url);
      
      setPreviewUrl(data.publicUrl);
    } catch (error) {
      console.error('Error getting public URL:', error);
      toast.error('Failed to generate preview URL');
    }
  };

  const handleDownload = (attachment: Attachment) => {
    let url = attachment.file_url;
    
    // For storage URLs, get the public URL
    if (!url.startsWith('data:')) {
      try {
        const { data } = supabase.storage
          .from('questions-attachments')
          .getPublicUrl(attachment.file_url);
        
        url = data.publicUrl;
      } catch (error) {
        console.error('Error getting public URL for download:', error);
        toast.error('Failed to generate download URL');
        return;
      }
    }
    
    // Create a temporary anchor and trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = attachment.file_name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDeleteConfirm = (attachmentId: string) => {
    setConfirmDelete(attachmentId);
  };

  const handleDeleteCancel = () => {
    setConfirmDelete(null);
  };

  const handleDeleteConfirmed = (attachmentId: string) => {
    onDelete(attachmentId);
    setConfirmDelete(null);
  };

  const closePreview = () => {
    setPreviewUrl(null);
  };

  return (
    <div className={className}>
      {attachments.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                {getFileIcon(attachment.file_type)}
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-xs">
                    {attachment.file_name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatFileSize(attachment.file_size)} • {new Date(attachment.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePreview(attachment)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                  title="Preview"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDownload(attachment)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </button>
                
                {confirmDelete === attachment.id ? (
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleDeleteConfirmed(attachment.id)}
                      className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                      title="Confirm Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleDeleteCancel}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                      title="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleDeleteConfirm(attachment.id)}
                    className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* File Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75">
          <div className="relative bg-white dark:bg-gray-800 rounded-lg max-w-4xl max-h-[90vh] w-full overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">File Preview</h3>
              <button
                onClick={closePreview}
                className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 overflow-auto max-h-[calc(90vh-8rem)]">
              {previewUrl.endsWith('.pdf') || previewUrl.includes('application/pdf') ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-[70vh]"
                  title="PDF Preview"
                />
              ) : previewUrl.match(/\.(jpe?g|png|gif)$/i) || previewUrl.includes('image/') ? (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-w-full max-h-[70vh] mx-auto"
                />
              ) : previewUrl.match(/\.(mp4|webm)$/i) || previewUrl.includes('video/') ? (
                <video
                  src={previewUrl}
                  controls
                  className="max-w-full max-h-[70vh] mx-auto"
                />
              ) : previewUrl.match(/\.(mp3|wav)$/i) || previewUrl.includes('audio/') ? (
                <audio
                  src={previewUrl}
                  controls
                  className="w-full"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <AlertCircle className="h-12 w-12 text-yellow-500 mb-4" />
                  <p className="text-gray-700 dark:text-gray-300">
                    Preview not available for this file type.
                  </p>
                  <Button
                    onClick={() => window.open(previewUrl, '_blank')}
                    className="mt-4"
                  >
                    Download to View
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}