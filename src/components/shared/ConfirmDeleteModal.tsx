import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { Button } from './Button';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  examDetails?: {
    subject?: string;
    paper?: string;
    scheduledDate?: string;
    teacherCount?: number;
  };
  isDeleting?: boolean;
}

export function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  examDetails,
  isDeleting = false
}: ConfirmDeleteModalProps) {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isDeleting) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isDeleting) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      <div className="relative w-full max-w-lg mx-4 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <h3 id="delete-modal-title" className="text-lg font-semibold text-gray-900 dark:text-white">
                  Delete Mock Exam
                </h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  This is a permanent action and cannot be undone
                </p>
              </div>
            </div>
            {!isDeleting && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 space-y-3">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                You are about to delete:
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                {title}
              </p>
            </div>

            {examDetails && (
              <div className="space-y-1 text-xs text-gray-700 dark:text-gray-300 pt-2 border-t border-amber-200 dark:border-amber-800">
                {examDetails.subject && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Subject:</span>
                    <span className="font-medium">{examDetails.subject}</span>
                  </div>
                )}
                {examDetails.paper && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Paper:</span>
                    <span className="font-medium">{examDetails.paper}</span>
                  </div>
                )}
                {examDetails.scheduledDate && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Scheduled:</span>
                    <span className="font-medium">{examDetails.scheduledDate}</span>
                  </div>
                )}
                {examDetails.teacherCount !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Assigned Teachers:</span>
                    <span className="font-medium">{examDetails.teacherCount}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-sm text-red-800 dark:text-red-200 font-medium">
              Warning: All associated data will be permanently deleted, including:
            </p>
            <ul className="mt-2 space-y-1 text-xs text-red-700 dark:text-red-300 list-disc list-inside">
              <li>School and branch assignments</li>
              <li>Grade level and section associations</li>
              <li>Teacher assignments</li>
              <li>Question selections and instructions</li>
              <li>Status history and progress tracking</li>
            </ul>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900/40 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            disabled={isDeleting}
            leftIcon={<Trash2 className="w-4 h-4" />}
            className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700"
          >
            {isDeleting ? 'Deleting...' : 'Delete Permanently'}
          </Button>
        </div>
      </div>
    </div>
  );
}
