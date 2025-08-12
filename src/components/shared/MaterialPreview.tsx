import React, { useState } from 'react';
import { AlertCircle, X, FileText, Eye, Download } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './Button';

interface MaterialPreviewProps {
  fileType: 'video' | 'ebook' | 'audio' | 'assignment' | 'image' | 'pdf';
  fileUrl: string;
  mimeType?: string;
  title?: string;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export function MaterialPreview({ 
  fileType, 
  fileUrl, 
  mimeType,
  title, 
  isOpen,
  onClose,
  className 
}: MaterialPreviewProps) {
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  // Prevent context menu (right-click)
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  // Handle load errors
  const handleError = () => {
    setError(true);
  };

  // Close on escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Prevent body scroll when modal is open
  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  if (!fileUrl) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className={cn(
          'relative w-full max-w-5xl rounded-lg bg-white dark:bg-gray-800 shadow-2xl dark:shadow-black/50',
          className
        )}>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title || 'Material Preview'}
            </h3>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-500 dark:hover:text-gray-400 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="relative">
            {error ? (
              <div className="flex h-48 items-center justify-center bg-red-50 dark:bg-red-900/20">
                <div className="flex items-center text-red-600 dark:text-red-400">
                  <AlertCircle className="mr-2 h-5 w-5" />
                  <p>Failed to load preview</p>
                </div>
              </div>
            ) : (
              <div>                
                {(fileType === 'ebook' || fileType === 'assignment') && (
                  <div className="flex flex-col items-center justify-center bg-gray-900 p-8 h-[70vh]">
                    <FileText className="h-16 w-16 text-gray-400 mb-4" />
                    <h3 className="text-xl font-medium text-white mb-2">
                      {title || "Document Preview"}
                    </h3>
                    <p className="text-gray-400 mb-6 text-center max-w-md">
                      Direct preview is not available due to security restrictions.
                    </p>
                    <div className="flex gap-4">
                      <Button
                        onClick={() => window.open(fileUrl, '_blank')}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Open in New Tab
                      </Button>
                      <a
                        href={fileUrl}
                        download
                        className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-md flex items-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </a>
                    </div>
                  </div>
                )}
                
                {fileType === 'pdf' && (
                  <div className="flex justify-center bg-gray-900 p-4">
                    <iframe
                      src={fileUrl}
                      className="w-full h-[70vh]"
                      title="PDF Preview"
                      onError={handleError}
                    />
                  </div>
                )}

                {fileType === 'video' && (
                  <div className="flex justify-center bg-gray-900 p-4">
                    <video
                      className="max-h-[70vh] max-w-full"
                      controls
                      playsInline
                      controlsList="nodownload"
                      onContextMenu={handleContextMenu}
                      onError={handleError}
                      preload="auto"
                      crossOrigin="anonymous"
                    >
                      <source src={fileUrl} type={mimeType || "video/mp4"} />
                      Your browser does not support video playback.
                    </video>
                  </div>
                )}

                {fileType === 'image' && (
                  <div className="flex justify-center bg-gray-900 p-4">
                    <img
                      src={fileUrl}
                      alt={title || "Image preview"}
                      className="max-h-[70vh] max-w-full object-contain"
                      onContextMenu={handleContextMenu}
                      onError={handleError}
                    />
                  </div>
                )}

                {fileType === 'audio' && (
                  <div className="flex h-32 items-center justify-center bg-gray-900 px-6">
                    <audio
                      className="w-full"
                      controls
                      controlsList="nodownload"
                      onContextMenu={handleContextMenu}
                      onError={handleError}
                      preload="auto"
                      crossOrigin="anonymous"
                    >
                      <source src={fileUrl} type={mimeType || "audio/mpeg"} />
                      Your browser does not support audio playback.
                    </audio>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}