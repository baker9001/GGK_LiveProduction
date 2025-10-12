import React, { useState } from 'react';
import {
  Image as ImageIcon, Trash2, Eye, AlertTriangle,
  Paperclip, Plus, X, Loader2
} from 'lucide-react';
import { Button } from '../../../../../../../components/shared/Button';
import { ConfirmationDialog } from '../../../../../../../components/shared/ConfirmationDialog';
import { cn } from '../../../../../../../lib/utils';

interface AttachmentDisplayProps {
  attachments: any[];
  questionLabel: string;
  attachmentKey: string;
  requiresFigure?: boolean;
  figureRequired?: boolean;
  pdfAvailable?: boolean;
  onAdd: () => void;
  onDelete: (attachmentKey: string, attachmentId: string) => void;
  isEditing?: boolean;
  showDeleteButton?: boolean;
  onToggleFigureRequired?: () => void;
}

export const AttachmentDisplay: React.FC<AttachmentDisplayProps> = ({
  attachments,
  questionLabel,
  attachmentKey,
  requiresFigure = false,
  figureRequired = true,
  pdfAvailable = false,
  onAdd,
  onDelete,
  isEditing = false,
  showDeleteButton = true,
  onToggleFigureRequired,
}) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    attachmentId: string;
    fileName: string;
    imageUrl: string;
  } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [fadingOutId, setFadingOutId] = useState<string | null>(null);

  const hasAttachments = attachments && attachments.length > 0;
  // Only show warning if figure is auto-detected AND marked as required
  const showWarning = requiresFigure && figureRequired && !hasAttachments;

  const handlePreviewClick = (e: React.MouseEvent, imageUrl: string) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('👁️ Preview button clicked');
    setPreviewImage(imageUrl);
  };

  const handleDeleteClick = (e: React.MouseEvent, attachment: any) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🗑️ Delete button clicked', { attachmentId: attachment.id });

    setDeleteConfirmation({
      attachmentId: attachment.id,
      fileName: attachment.fileName || attachment.name || attachment.file_name || 'Attachment',
      imageUrl: attachment.dataUrl || attachment.data || attachment.file_url
    });
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation) return;

    console.log('✅ Confirming deletion:', {
      attachmentKey,
      attachmentId: deleteConfirmation.attachmentId
    });

    setDeletingId(deleteConfirmation.attachmentId);
    setFadingOutId(deleteConfirmation.attachmentId);

    try {
      await new Promise(resolve => setTimeout(resolve, 200));

      onDelete(attachmentKey, deleteConfirmation.attachmentId);

      console.log('🎉 Delete successful');
    } catch (error) {
      console.error('❌ Delete failed:', error);
      setFadingOutId(null);
    } finally {
      setDeletingId(null);
      setDeleteConfirmation(null);
    }
  };

  const cancelDelete = () => {
    console.log('❌ Delete cancelled');
    setDeleteConfirmation(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Paperclip className="h-4 w-4" />
            Attachments {requiresFigure && figureRequired && <span className="text-red-600">*</span>}
          </label>
          {requiresFigure && onToggleFigureRequired && (
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={figureRequired}
                    onChange={onToggleFigureRequired}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-gray-300 dark:bg-gray-600 rounded-full peer peer-checked:bg-[#8CC63F] transition-colors"></div>
                  <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
                </div>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 group-hover:text-[#8CC63F] transition-colors">
                  {figureRequired ? 'Mandatory' : 'Optional'}
                </span>
              </label>
            </div>
          )}
        </div>
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
          {attachments.map((attachment, idx) => {
            const imageUrl = attachment.dataUrl || attachment.data || attachment.file_url;
            const fileName = attachment.fileName || attachment.name || attachment.file_name || `Attachment ${idx + 1}`;
            const isFadingOut = fadingOutId === attachment.id;

            return (
              <div
                key={attachment.id || idx}
                className={cn(
                  "relative group bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-600 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300",
                  isFadingOut && "opacity-0 scale-95"
                )}
              >
                {/* Image Container */}
                <div className="relative bg-gray-50 dark:bg-gray-900 p-4 flex items-center justify-center min-h-[200px]">
                  <img
                    src={imageUrl}
                    alt={fileName}
                    className="max-w-full max-h-[400px] object-contain rounded cursor-pointer"
                    onClick={() => setPreviewImage(imageUrl)}
                  />

                  {/* Independent View Button - Top Right Corner */}
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                      type="button"
                      onClick={(e) => handlePreviewClick(e, imageUrl)}
                      className="flex items-center justify-center h-10 w-10 rounded-full bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:text-[#8CC63F] hover:bg-gray-50 dark:hover:bg-gray-600 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110 active:scale-95"
                      title="Preview Full Size"
                      aria-label="Preview attachment"
                    >
                      <Eye className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Independent Delete Button - Top Left Corner */}
                  {showDeleteButton && (
                    <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button
                        type="button"
                        onClick={(e) => handleDeleteClick(e, attachment)}
                        disabled={deletingId === attachment.id}
                        className="flex items-center justify-center h-10 w-10 rounded-full bg-red-500 text-white hover:bg-red-600 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                        title="Delete Attachment"
                        aria-label="Delete attachment"
                      >
                        {deletingId === attachment.id ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Trash2 className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Attachment Info */}
                <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                    {fileName}
                  </p>
                </div>
              </div>
            );
          })}
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
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute -top-12 right-0 flex items-center justify-center h-10 w-10 rounded-full bg-white text-gray-700 hover:text-[#8CC63F] shadow-lg hover:shadow-xl transition-all"
              aria-label="Close preview"
            >
              <X className="h-5 w-5" />
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

      {/* Delete Confirmation Dialog */}
      {deleteConfirmation && (
        <ConfirmationDialog
          isOpen={true}
          title="Delete Attachment?"
          message={
            <div className="space-y-4">
              <p className="text-gray-700 dark:text-gray-300">
                Are you sure you want to delete this attachment from <strong>{questionLabel}</strong>?
              </p>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {deleteConfirmation.fileName}
                </p>
                <img
                  src={deleteConfirmation.imageUrl}
                  alt={deleteConfirmation.fileName}
                  className="max-w-full max-h-[200px] object-contain rounded mx-auto"
                />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                This action cannot be undone.
              </p>
            </div>
          }
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
          variant="danger"
        />
      )}
    </div>
  );
};
