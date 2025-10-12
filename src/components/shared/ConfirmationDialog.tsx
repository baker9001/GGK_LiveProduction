import React, { useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, X } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../lib/utils';

interface ConfirmationDialogProps {
  // Support both naming conventions for backward compatibility
  isOpen?: boolean;
  open?: boolean;
  title: string;
  message: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'primary' | 'danger';
  onConfirm: () => void;
  onCancel?: () => void;
  onClose?: () => void;
  className?: string;
  icon?: ReactNode;
  iconClassName?: string;
}

export function ConfirmationDialog({
  isOpen: isOpenProp,
  open: openProp,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'destructive',
  onConfirm,
  onCancel: onCancelProp,
  onClose: onCloseProp,
  className,
  icon,
  iconClassName
}: ConfirmationDialogProps) {
  // Support both prop naming conventions
  const isOpen = isOpenProp !== undefined ? isOpenProp : (openProp ?? false);
  const onCancel = onCancelProp || onCloseProp || (() => {});

  // Prevent body scroll when dialog is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle escape key press
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  // Map variant names for backward compatibility
  const mappedVariant = confirmVariant === 'primary' ? 'default' :
                        confirmVariant === 'danger' ? 'destructive' :
                        confirmVariant;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onCancel();
        }
      }}
    >
      <div
        className={cn(
          "bg-white dark:bg-gray-800 rounded-lg shadow-xl dark:shadow-black/30 max-w-md w-full overflow-hidden",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <div className="flex items-start">
            {icon || (
              <AlertCircle className={cn(
                "h-5 w-5 mt-0.5 mr-3 flex-shrink-0",
                iconClassName || "text-red-500 dark:text-red-400"
              )} />
            )}
            <div className="text-gray-700 dark:text-gray-300">
              {typeof message === 'string' ? <p>{message}</p> : message}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
          <Button
            variant="outline"
            onClick={onCancel}
          >
            {cancelText}
          </Button>
          <Button
            variant={mappedVariant as any}
            onClick={() => {
              onConfirm();
            }}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}