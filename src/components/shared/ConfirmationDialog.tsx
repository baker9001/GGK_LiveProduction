import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../lib/utils';

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'warning' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
  className?: string;
  tone?: 'danger' | 'warning' | 'info' | 'success';
}

export function ConfirmationDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'destructive',
  onConfirm,
  onCancel,
  className,
  tone = 'danger'
}: ConfirmationDialogProps) {
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

  const resolvedConfirmVariant = confirmVariant === 'primary' ? 'default' : confirmVariant;

  const toneConfig = {
    danger: {
      Icon: AlertCircle,
      iconClass: 'text-red-500 dark:text-red-400',
    },
    warning: {
      Icon: AlertTriangle,
      iconClass: 'text-amber-500 dark:text-amber-400',
    },
    info: {
      Icon: Info,
      iconClass: 'text-blue-500 dark:text-blue-400',
    },
    success: {
      Icon: CheckCircle2,
      iconClass: 'text-emerald-500 dark:text-emerald-400',
    },
  } as const;

  const { Icon, iconClass } = toneConfig[tone];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        className={cn(
          "bg-card rounded-lg shadow-xl dark:shadow-black/30 max-w-md w-full overflow-hidden",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-theme bg-card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="px-6 py-4 bg-card">
          <div className="flex items-start">
            <Icon className={cn('h-5 w-5 mt-0.5 mr-3 flex-shrink-0', iconClass)} />
            <div className="text-gray-700 dark:text-gray-300 space-y-2">{message}</div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 bg-card-elevated border-t border-theme flex justify-end space-x-3">
          <Button
            variant="outline"
            onClick={onCancel}
          >
            {cancelText}
          </Button>
          <Button
            variant={resolvedConfirmVariant}
            onClick={onConfirm}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}