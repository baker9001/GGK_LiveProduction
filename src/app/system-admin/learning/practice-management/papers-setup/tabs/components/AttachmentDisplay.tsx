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
  attachmentKey: string;
  requiresFigure?: boolean;
  pdfAvailable?: boolean;
  onAdd: () => void;
  onDelete: (attachmentKey: string, attachmentId: string) => void;
  isEditing?: boolean;
}

export const AttachmentDisplay: React.FC<AttachmentDisplayProps> = ({
  attachments,
  questionLabel,
  attachmentKey,
  requiresFigure = false,
  pdfAvailable = false,
  onAdd,
  onDelete,
  isEditing = false,
}) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const hasAttachments = attachments && attachments.length > 0;
  const showWarning = requiresFigure && !hasAttachments;

  // Debug logging
  React.useEffect(() => {
    if (hasAttachments) {
      console.log(`📎 AttachmentDisplay for "${questionLabel}" received attachments:`, attachments.map(a => ({
        id: a.id,
        fileName: a.fileName || a.name || a.file_name,
        hasDataUrl: !!a.dataUrl,
        hasData: !!a.data,
        hasFileUrl: !!a.file_url
      })));
    }
  }, [attachments, questionLabel, hasAttachments]);

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
        <div className="space-y-4">
          {attachments.map((attachment, idx) => (
            <div
              key={attachment.id || idx}
              className="relative group bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-600 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Image Container - Full width, proper aspect ratio */}
              <div className="relative bg-gray-50 dark:bg-gray-900 p-4 flex items-center justify-center min-h-[200px]">
                <img
                  src={attachment.dataUrl || attachment.data || attachment.file_url}
                  alt={attachment.fileName || attachment.name || attachment.file_name || `Attachment ${idx + 1}`}
                  className="max-w-full max-h-[400px] object-contain cursor-pointer rounded"
                  onClick={() => setPreviewImage(attachment.dataUrl || attachment.data || attachment.file_url)}
                />

                {/* Hover Overlay with Actions */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 pointer-events-none">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="bg-white text-gray-700 hover:text-[#8CC63F] hover:bg-white shadow-lg pointer-events-auto"
                    title="Preview Full Size"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('👁️ Preview button clicked');
                      setPreviewImage(attachment.dataUrl || attachment.data || attachment.file_url);
                    }}
                  >
                    <Eye className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="shadow-lg pointer-events-auto"
                    title="Delete Attachment"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('🗑️ Delete button clicked in AttachmentDisplay');
                      console.log('📋 Attachment Key:', attachmentKey);
                      console.log('📋 Attachment ID:', attachment.id);
                      console.log('📋 Calling onDelete with both parameters');
                      onDelete(attachmentKey, attachment.id);
                      console.log('✅ onDelete called successfully with key and id');
                    }}
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Attachment Info */}
              <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
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
            <Button
              variant="secondary"
              size="icon"
              className="absolute -top-10 right-0 bg-white text-gray-700 hover:text-[#8CC63F]"
              onClick={() => setPreviewImage(null)}
            >
              <X className="h-5 w-5" />
            </Button>
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
