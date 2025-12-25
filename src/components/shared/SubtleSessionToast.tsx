/**
 * File: /src/components/shared/SubtleSessionToast.tsx
 *
 * Subtle toast notification for session-related events
 * Used when user prefers minimal notifications (toast mode)
 *
 * Features:
 *   - Minimal UI footprint
 *   - Auto-dismiss after duration
 *   - Slide-in animation
 *   - Respects user's notification preferences
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Check, RefreshCw } from 'lucide-react';

interface ToastEvent {
  message: string;
  duration?: number;
  type?: 'success' | 'info';
}

export const SHOW_SESSION_TOAST_EVENT = 'show-session-toast';

/**
 * Helper to show a session toast from anywhere in the app
 */
export function showSessionToast(message: string, options?: { duration?: number; type?: 'success' | 'info' }): void {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(new CustomEvent<ToastEvent>(SHOW_SESSION_TOAST_EVENT, {
    detail: {
      message,
      duration: options?.duration ?? 2000,
      type: options?.type ?? 'success'
    }
  }));
}

export function SubtleSessionToast() {
  const [isVisible, setIsVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'success' | 'info'>('success');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleToast = useCallback((event: Event) => {
    const customEvent = event as CustomEvent<ToastEvent>;
    const { message: msg, duration = 2000, type: toastType = 'success' } = customEvent.detail;

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setMessage(msg);
    setType(toastType);
    setIsVisible(true);

    // Auto-dismiss after duration
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, duration);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.addEventListener(SHOW_SESSION_TOAST_EVENT, handleToast as EventListener);

    return () => {
      window.removeEventListener(SHOW_SESSION_TOAST_EVENT, handleToast as EventListener);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [handleToast]);

  if (!isVisible) return null;

  const IconComponent = type === 'success' ? Check : RefreshCw;
  const iconColorClass = type === 'success'
    ? 'text-emerald-400'
    : 'text-sky-400';

  return (
    <div
      className="fixed bottom-4 right-4 z-50"
      role="status"
      aria-live="polite"
    >
      <div
        className={`
          flex items-center gap-2
          bg-slate-800 dark:bg-slate-900
          text-white text-sm
          px-4 py-2.5
          rounded-lg shadow-lg
          border border-slate-700
          transform transition-all duration-200 ease-out
          ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}
        `}
      >
        <IconComponent className={`h-4 w-4 ${iconColorClass} flex-shrink-0`} />
        <span className="font-medium">{message}</span>
      </div>
    </div>
  );
}

export default SubtleSessionToast;
