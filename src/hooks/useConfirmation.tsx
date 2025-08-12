// /src/hooks/useConfirmation.tsx

import React, { useState, useCallback } from 'react';
import { ConfirmationDialog } from '../components/shared/ConfirmationDialog';

interface ConfirmationOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
}

export function useConfirmation() {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmationOptions>({
    title: '',
    message: '',
  });
  const [confirmCallback, setConfirmCallback] = useState<(() => void) | null>(null);

  const confirm = useCallback((opts: ConfirmationOptions, onConfirm: () => void) => {
    setOptions(opts);
    setConfirmCallback(() => onConfirm);
    setIsOpen(true);
  }, []);

  const handleConfirm = useCallback(() => {
    if (confirmCallback) {
      confirmCallback();
    }
    setIsOpen(false);
    setConfirmCallback(null);
  }, [confirmCallback]);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    setConfirmCallback(null);
  }, []);

  const ConfirmationDialogComponent = useCallback(() => (
    <ConfirmationDialog
      isOpen={isOpen}
      title={options.title}
      message={options.message}
      confirmText={options.confirmText}
      cancelText={options.cancelText}
      confirmVariant={options.confirmVariant}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  ), [isOpen, options, handleConfirm, handleCancel]);

  return {
    confirm,
    ConfirmationDialogComponent,
  };
}

// Example usage:
/*
function MyComponent() {
  const { confirm, ConfirmationDialogComponent } = useConfirmation();
  
  const handleDelete = () => {
    confirm(
      {
        title: 'Delete Item',
        message: 'Are you sure you want to delete this item?',
        confirmText: 'Delete',
        confirmVariant: 'destructive',
      },
      () => {
        // Perform delete action
        console.log('Item deleted');
      }
    );
  };
  
  return (
    <>
      <button onClick={handleDelete}>Delete</button>
      <ConfirmationDialogComponent />
    </>
  );
}
*/