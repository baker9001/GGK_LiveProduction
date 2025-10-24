///home/project/src/components/shared/Toast.tsx

import { Toaster } from 'react-hot-toast';
import { toast as hotToast } from 'react-hot-toast';

export const toast = {
  success: (message: string) => {
    hotToast.success(message, {
      style: {
        background: '#F0FDF4',
        color: '#166534',
        border: '1px solid #BBF7D0',
      },
    });
  },
  error: (message: string) => {
    hotToast.error(message, {
      style: {
        background: '#FEF2F2',
        color: '#991B1B',
        border: '1px solid #FECACA',
      },
    });
  },
  info: (message: string) => {
    hotToast(message, {
      icon: 'ℹ️',
      style: {
        background: '#EFF6FF',
        color: '#1E40AF',
        border: '1px solid #BFDBFE',
      },
    });
  },
  warning: (message: string) => {
    hotToast(message, {
      icon: '⚠️',
      style: {
        background: '#FFFBEB',
        color: '#92400E',
        border: '1px solid #FEF3C7',
      },
    });
  },
  loading: (message: string) => {
    return hotToast.loading(message, {
      style: {
        background: '#F3F4F6',
        color: '#374151',
        border: '1px solid #D1D5DB',
      },
    });
  },
  promise: hotToast.promise,
  dismiss: hotToast.dismiss,
  update: (toastId: string | number, options: any) => {
    return hotToast(options.render, { 
      id: toastId,
      ...options 
    });
  },
};

export function Toast() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        className: '',
        duration: 4000,
        style: {
          padding: '16px',
          borderRadius: '8px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        },
        success: {
          iconTheme: {
            primary: '#64BC46',
            secondary: '#fff',
          },
        },
        error: {
          iconTheme: {
            primary: '#EF4444',
            secondary: '#fff',
          },
        },
      }}
    />
  );
}