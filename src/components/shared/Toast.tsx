import clsx from 'clsx';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  X,
  XCircle,
} from 'lucide-react';
import { Toaster, toast as hotToast } from 'react-hot-toast';
import type { Toast as HotToastInstance } from 'react-hot-toast';
import type { ComponentType } from 'react';

type ToastVariant = 'success' | 'error' | 'info' | 'warning' | 'loading';

interface ToastShowOptions {
  description?: string;
  duration?: number;
  id?: string | number;
}

const defaultDurations: Record<ToastVariant, number> = {
  success: 4500,
  error: 5500,
  info: 5000,
  warning: 5000,
  loading: Infinity,
};

const toastIcons: Record<ToastVariant, ComponentType<{ className?: string }>> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
  loading: Loader2,
};

const variantClasses: Record<ToastVariant, {
  container: string;
  accent: string;
  iconWrapper: string;
  icon: string;
  title: string;
  description: string;
}> = {
  success: {
    container: 'border-emerald-200',
    accent: 'bg-emerald-500',
    iconWrapper: 'bg-emerald-50 text-emerald-600',
    icon: 'text-emerald-600',
    title: 'text-emerald-900',
    description: 'text-emerald-700',
  },
  error: {
    container: 'border-rose-200',
    accent: 'bg-rose-500',
    iconWrapper: 'bg-rose-50 text-rose-600',
    icon: 'text-rose-600',
    title: 'text-rose-900',
    description: 'text-rose-700',
  },
  info: {
    container: 'border-sky-200',
    accent: 'bg-sky-500',
    iconWrapper: 'bg-sky-50 text-sky-600',
    icon: 'text-sky-600',
    title: 'text-sky-900',
    description: 'text-sky-700',
  },
  warning: {
    container: 'border-amber-200',
    accent: 'bg-amber-500',
    iconWrapper: 'bg-amber-50 text-amber-600',
    icon: 'text-amber-600',
    title: 'text-amber-900',
    description: 'text-amber-700',
  },
  loading: {
    container: 'border-slate-200',
    accent: 'bg-slate-500',
    iconWrapper: 'bg-slate-50 text-slate-600',
    icon: 'text-slate-600',
    title: 'text-slate-900',
    description: 'text-slate-600',
  },
};

function renderToast(
  t: HotToastInstance,
  message: string,
  variant: ToastVariant,
  options?: ToastShowOptions,
) {
  const Icon = toastIcons[variant];
  const styles = variantClasses[variant];
  const isError = variant === 'error';
  const iconClassName = clsx('h-5 w-5', styles.icon, variant === 'loading' && 'animate-spin');

  return (
    <div
      role="alert"
      aria-live={isError ? 'assertive' : 'polite'}
      aria-atomic="true"
      className={clsx(
        'pointer-events-auto w-full max-w-sm overflow-hidden rounded-2xl border bg-white shadow-lg ring-1 ring-black/5 transition-all duration-300',
        styles.container,
        t.visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
      )}
    >
      <div className={clsx('h-1 w-full', styles.accent)} />
      <div className="flex items-start gap-3 p-4">
        <span className={clsx('flex h-9 w-9 items-center justify-center rounded-full', styles.iconWrapper)}>
          <Icon className={iconClassName} aria-hidden="true" />
        </span>
        <div className="flex-1">
          <p className={clsx('text-sm font-semibold leading-5', styles.title)}>{message}</p>
          {options?.description ? (
            <p className={clsx('mt-1 text-sm leading-5', styles.description)}>{options.description}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => hotToast.dismiss(t.id)}
          className="inline-flex rounded-md p-1 text-slate-400 transition hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
        >
          <span className="sr-only">Dismiss</span>
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

const activeTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

function registerAutoDismiss(toastId: string, duration: number) {
  const existingTimeout = activeTimeouts.get(toastId);
  if (existingTimeout) {
    window.clearTimeout(existingTimeout);
  }

  const timeoutId = window.setTimeout(() => {
    hotToast.dismiss(toastId);
    activeTimeouts.delete(toastId);
  }, duration + 150);

  activeTimeouts.set(toastId, timeoutId);
}

function normalizeToastId(id: string | number | undefined, fallback: string) {
  if (id === undefined || id === null) {
    return fallback;
  }
  return String(id);
}

function showToast(variant: ToastVariant, message: string, options?: ToastShowOptions) {
  const duration = options?.duration ?? defaultDurations[variant];
  const toastId = hotToast.custom(
    (t) => renderToast(t, message, variant, options),
    {
      id: options?.id,
      duration,
    },
  );

  if (typeof window !== 'undefined' && Number.isFinite(duration)) {
    const key = normalizeToastId(options?.id, toastId);
    registerAutoDismiss(key, duration);
  }

  return toastId;
}

function clearToastTimeout(id?: string | number) {
  if (id === undefined || id === null) {
    activeTimeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
    activeTimeouts.clear();
    return;
  }

  const key = String(id);
  const timeoutId = activeTimeouts.get(key);
  if (timeoutId) {
    window.clearTimeout(timeoutId);
    activeTimeouts.delete(key);
  }
}

export const toast = {
  success: (message: string, options?: ToastShowOptions) => showToast('success', message, options),
  error: (message: string, options?: ToastShowOptions) => showToast('error', message, options),
  info: (message: string, options?: ToastShowOptions) => showToast('info', message, options),
  warning: (message: string, options?: ToastShowOptions) => showToast('warning', message, options),
  loading: (message: string, options?: ToastShowOptions) => showToast('loading', message, options),
  promise: hotToast.promise,
  dismiss: (id?: string | number) => {
    if (typeof window !== 'undefined') {
      clearToastTimeout(id);
    }
    return hotToast.dismiss(id);
  },
  custom: hotToast.custom,
};

export function Toast() {
  return (
    <Toaster
      position="top-right"
      gutter={12}
      toastOptions={{
        duration: 5000,
        style: {
          padding: 0,
          background: 'transparent',
          boxShadow: 'none',
        },
      }}
      containerClassName="!top-4 !right-4"
    />
  );
}
