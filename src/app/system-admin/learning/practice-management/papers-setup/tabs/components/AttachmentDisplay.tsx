import React, { useState } from 'react';
import { Image, Scissors, Trash2, X, Eye, AlertTriangle, Upload } from 'lucide-react';
import { Button } from '../../../../../../../components/shared/Button';
import { cn } from '../../../../../../../lib/utils';

interface AttachmentDisplayProps {
  attachments: any[];
  questionId: string;
  partPath: string[];
  requiresFigure: boolean;
  pdfDataUrl: string | null;
  onAttachmentUpload: () => void;
  onAttachmentDelete: (attachmentId: string) => void;
  disabled?: boolean;
}

export const AttachmentDisplay: React.FC<AttachmentDisplayProps> = ({
  attachments,
  questionId,
  partPath,
  requiresFigure,
  pdfDataUrl,
  onAttachmentUpload,
  onAttachmentDelete,
  disabled = false
}) => {
  const [previewAttachment, setPreviewAttachment] = useState<any>(null);
  const [hoveredAttachment, setHoveredAttachment] = useState<string | null>(null);

  const hasAttachments = attachments && attachments.length > 0;
  const showFigureWarning = requiresFigure && !hasAttachments;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
          Attachments
          {requiresFigure && (
            <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
              Figure Required
            </span>
          )}
        </label>

        {/* Add from PDF Button - Always visible when PDF is available */}
        {pdfDataUrl ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onAttachmentUpload}
            disabled={disabled}
            leftIcon={<Scissors className="h-3 w-3" />}
            className="text-xs"
          >
            Add from PDF
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {}}
            disabled={true}
            leftIcon={<Upload className="h-3 w-3" />}
            className="text-xs"
            title="Upload PDF first to use snipping tool"
          >
            Upload PDF First
          </Button>
        )}
      </div>

      {/* Figure Warning */}
      {showFigureWarning && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-orange-800 dark:text-orange-200">
                Missing Required Figure
              </p>
              <p className="text-xs text-orange-700 dark:text-orange-300 mt-0.5">
                This question mentions a figure or diagram but no attachment has been added yet.
                {pdfDataUrl && ' Use the "Add from PDF" button to capture it.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Attachments Grid */}
      {hasAttachments ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="relative group"
              onMouseEnter={() => setHoveredAttachment(attachment.id)}
              onMouseLeave={() => setHoveredAttachment(null)}
            >
              <div className="aspect-square rounded-lg border-2 border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-100 dark:bg-gray-800 relative">
                <img
                  src={attachment.dataUrl || attachment.file_url}
                  alt={attachment.fileName || attachment.file_name || 'Attachment'}
                  className="w-full h-full object-cover"
                />

                {/* Hover Overlay */}
                {hoveredAttachment === attachment.id && !disabled && (
                  <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center gap-2 transition-opacity">
                    <button
                      onClick={() => setPreviewAttachment(attachment)}
                      className="p-2 bg-white dark:bg-gray-800 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      title="Preview"
                    >
                      <Eye className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this attachment?')) {
                          onAttachmentDelete(attachment.id);
                        }
                      }}
                      className="p-2 bg-white dark:bg-gray-800 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </button>
                  </div>
                )}
              </div>

              {/* Attachment Name */}
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate">
                {attachment.fileName || attachment.file_name || 'Untitled'}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
          <Image className="h-8 w-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No attachments added
          </p>
          {pdfDataUrl && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              Click "Add from PDF" to capture figures
            </p>
          )}
        </div>
      )}

      {/* Preview Modal */}
      {previewAttachment && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewAttachment(null)}
        >
          <div className="relative max-w-6xl max-h-[90vh] w-full">
            <button
              onClick={() => setPreviewAttachment(null)}
              className="absolute -top-12 right-0 p-2 bg-white dark:bg-gray-800 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="h-5 w-5 text-gray-700 dark:text-gray-300" />
            </button>
            <img
              src={previewAttachment.dataUrl || previewAttachment.file_url}
              alt={previewAttachment.fileName || previewAttachment.file_name || 'Preview'}
              className="w-full h-auto max-h-[90vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white p-3 rounded-b-lg">
              <p className="text-sm font-medium">
                {previewAttachment.fileName || previewAttachment.file_name || 'Untitled'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
