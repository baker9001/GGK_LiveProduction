///home/project/src/components/shared/Toast.tsx

import { Toaster, toast as hotToast } from 'react-hot-toast';
import type { ToastOptions, Renderable, ValueOrFunction, Toast as HotToast } from 'react-hot-toast';
import type { CSSProperties } from 'react';

type ExtendedToastOptions = ToastOptions & {
  style?: CSSProperties;
};

const mergeOptions = (
  options: ExtendedToastOptions | undefined,
  styleOverrides: CSSProperties
): ToastOptions => ({
  ...options,
  style: {
    ...styleOverrides,
    ...(options?.style ?? {}),
  },
});

export const toast = {
  success: (message: string, options?: ExtendedToastOptions) => {
    hotToast.success(message, mergeOptions(options, {
      background: '#F0FDF4',
      color: '#166534',
      border: '1px solid #BBF7D0',
    }));
  },
  error: (message: string, options?: ExtendedToastOptions) => {
    hotToast.error(message, mergeOptions(options, {
      background: '#FEF2F2',
      color: '#991B1B',
      border: '1px solid #FECACA',
    }));
  },
  info: (message: string, options?: ExtendedToastOptions) => {
    hotToast(message, mergeOptions({
      ...options,
      icon: options?.icon ?? 'ℹ️',
    }, {
      background: '#EFF6FF',
      color: '#1E40AF',
      border: '1px solid #BFDBFE',
    }));
  },
  warning: (message: string, options?: ExtendedToastOptions) => {
    hotToast(message, mergeOptions({
      ...options,
      icon: options?.icon ?? '⚠️',
    }, {
      background: '#FFFBEB',
      color: '#92400E',
      border: '1px solid #FEF3C7',
    }));
  },
  loading: (message: string, options?: ExtendedToastOptions) => {
    return hotToast.loading(message, mergeOptions(options, {
      background: '#F3F4F6',
      color: '#374151',
      border: '1px solid #D1D5DB',
    }));
  },
  promise: hotToast.promise,
  dismiss: hotToast.dismiss,
  custom: (
    render: ValueOrFunction<Renderable, HotToast>,
    options?: ToastOptions
  ) => hotToast.custom(render, options),
  update: (toastId: string | number, options: any) => {
    return hotToast(options.render, {
      id: toastId,
      ...options,
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