import React, { useState } from 'react';
import { Image as ImageIcon, Trash2, Eye, AlertTriangle, Plus, X, Paperclip } from 'lucide-react';
import { Button } from '../../../../../../../components/shared/Button';

interface AttachmentDisplayProps {
  attachments: any[];
  attachmentKey: string;
  requiresFigure?: boolean;
  pdfAvailable: boolean;
  onAddAttachment: () => void;
  onDeleteAttachment: (key: string, attachmentId: string) => void;
  onToggleFigureRequired: () => void;
}

export function AttachmentDisplay({
  attachments,
  attachmentKey,
  requiresFigure = false,
  pdfAvailable,
  onAddAttachment,
  onDeleteAttachment,
  onToggleFigureRequired
}: AttachmentDisplayProps) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const handlePreview = (dataUrl: string) => {
    setPreviewImage(dataUrl);
  };

  const handleClosePreview = () => {
    setPreviewImage(null);
  };

  const hasAttachments = attachments.length > 0;
  const needsFigure = requiresFigure && !hasAttachments;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
          <Paperclip className="h-3 w-3 inline mr-1" />
          Attachments {requiresFigure && <span className="text-red-500">*</span>}
        </label>
        <div className="flex items-center gap-2">
          {pdfAvailable && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onAddAttachment();
              }}
              className="text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add from PDF
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFigureRequired();
            }}
            className={`text-xs ${
              requiresFigure
                ? 'text-orange-600 dark:text-orange-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {requiresFigure ? 'Figure Required' : 'Mark as Required'}
          </Button>
        </div>
      </div>

      {needsFigure && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded p-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-orange-800 dark:text-orange-200">
              This question requires a figure attachment. Please add an image using the PDF
              snipping tool or upload an image file.
            </p>
          </div>
        </div>
      )}

      {hasAttachments ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="relative group bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden aspect-square"
            >
              <img
                src={attachment.data_url || attachment.url}
                alt={attachment.filename || 'Attachment'}
                className="w-full h-full object-contain"
              />

              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePreview(attachment.data_url || attachment.url);
                  }}
                  className="text-white hover:bg-white/20"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteAttachment(attachmentKey, attachment.id);
                  }}
                  className="text-white hover:bg-red-500/50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {attachment.filename && (
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-xs p-1 truncate">
                  {attachment.filename}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center">
          <ImageIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {pdfAvailable
              ? 'No attachments yet. Click "Add from PDF" to snip images from the PDF.'
              : 'No attachments. Upload a PDF first to add images.'}
          </p>
        </div>
      )}

      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4"
          onClick={handleClosePreview}
        >
          <div className="relative max-w-7xl max-h-full" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClosePreview}
              className="absolute top-2 right-2 text-white hover:bg-white/20 z-10"
            >
              <X className="h-6 w-6" />
            </Button>
            <img
              src={previewImage}
              alt="Preview"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}
