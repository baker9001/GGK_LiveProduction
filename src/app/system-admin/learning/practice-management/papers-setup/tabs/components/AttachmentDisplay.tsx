import React, { useState } from 'react';
import {
  Image as ImageIcon, Trash2, Eye, AlertTriangle,
  Paperclip, Plus, X
} from 'lucide-react';
import { Button } from '../../../../../../../components/shared/Button';
import { cn } from '../../../../../../../lib/utils';

interface AttachmentDisplayProps {
  attachments: any[];
  questionLabel: string;
  requiresFigure?: boolean;
  pdfAvailable?: boolean;
  onAdd: () => void;
  onDelete: (attachmentId: string) => void;
  isEditing?: boolean;
}

export const AttachmentDisplay: React.FC<AttachmentDisplayProps> = ({
  attachments,
  questionLabel,
  requiresFigure = false,
  pdfAvailable = false,
  onAdd,
  onDelete,
  isEditing = false,
}) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const hasAttachments = attachments && attachments.length > 0;
  const showWarning = requiresFigure && !hasAttachments;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <Paperclip className="h-4 w-4" />
          Attachments {requiresFigure && <span className="text-red-600">*</span>}
        </label>
        {pdfAvailable ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onAdd}
            disabled={isEditing}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add from PDF
          </Button>
        ) : requiresFigure && (
          <Button
            variant="outline"
            size="sm"
            onClick={onAdd}
            disabled
          >
            <Plus className="h-4 w-4 mr-1" />
            Upload PDF First
          </Button>
        )}
      </div>

      {showWarning && (
        <div className="mb-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                Figure Required
              </p>
              <p className="text-xs text-yellow-800 dark:text-yellow-200 mt-1">
                {questionLabel} requires a figure attachment. {pdfAvailable ? 'Use the snipping tool to add it from the PDF.' : 'Please upload a PDF first.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {!hasAttachments && !showWarning && (
        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 text-center">
          <ImageIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No attachments
          </p>
          {pdfAvailable && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              Click "Add from PDF" to snip images
            </p>
          )}
        </div>
      )}

      {hasAttachments && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {attachments.map((attachment, idx) => (
            <div
              key={attachment.id || idx}
              className="relative group bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden"
            >
              <div className="aspect-square relative">
                <img
                  src={attachment.dataUrl || attachment.data || attachment.file_url}
                  alt={attachment.fileName || attachment.name || attachment.file_name || `Attachment ${idx + 1}`}
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => setPreviewImage(attachment.dataUrl || attachment.data || attachment.file_url)}
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => setPreviewImage(attachment.dataUrl || attachment.data || attachment.file_url)}
                    className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
                    title="Preview"
                  >
                    <Eye className="h-4 w-4 text-gray-700" />
                  </button>
                  {!isEditing && (
                    <button
                      onClick={() => onDelete(attachment.id)}
                      className="p-2 bg-red-600 rounded-full hover:bg-red-700 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4 text-white" />
                    </button>
                  )}
                </div>
              </div>
              <div className="p-2">
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                  {attachment.fileName || attachment.name || attachment.file_name || `Figure ${idx + 1}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-6xl max-h-full">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-10 right-0 p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="h-5 w-5 text-gray-700" />
            </button>
            <img
              src={previewImage}
              alt="Preview"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};
