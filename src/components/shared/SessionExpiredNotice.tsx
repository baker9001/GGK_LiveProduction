import React, { useEffect, useState } from 'react';
import { Clock, Lock, LogIn, Shield } from 'lucide-react';
import { Button } from './Button';
import { SESSION_EXPIRED_EVENT, consumeSessionExpiredNotice } from '../../lib/auth';
import { isPublicPath } from '../../lib/sessionConfig';

const DEFAULT_MESSAGE = 'Your session has expired. Please sign in again to continue.';

/**
 * Check if current page is a public page that doesn't require authentication
 * Uses centralized isPublicPath from sessionConfig.ts
 */
function isPublicPage(path: string): boolean {
  return isPublicPath(path);
}

/**
 * Parse expiration reason from message
 */
function getExpirationReason(message: string): 'inactivity' | 'absolute' | 'security' | 'unknown' {
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes('inactivity') || lowerMessage.includes('inactive')) {
    return 'inactivity';
  }
  if (lowerMessage.includes('secure') || lowerMessage.includes('security') || lowerMessage.includes('another device')) {
    return 'security';
  }
  if (lowerMessage.includes('maximum') || lowerMessage.includes('absolute')) {
    return 'absolute';
  }
  return 'unknown';
}

export function SessionExpiredNotice() {
  const [isVisible, setIsVisible] = useState(false);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    // CRITICAL FIX: Don't show session expired notice on public pages
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      if (isPublicPage(currentPath)) {
        console.log('[SessionExpiredNotice] On public page, clearing any stale session data');
        // Clear any stale session expiration data
        consumeSessionExpiredNotice();
        return; // Exit early, don't set up listeners
      }
    }

    const handleSessionExpired = (event: Event) => {
      if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        // Double-check we're not on a public page
        if (isPublicPage(path)) {
          console.log('[SessionExpiredNotice] Session expired event on public page, ignoring');
          return;
        }
      }

      const customEvent = event as CustomEvent<{ message?: string }>;
      const detailMessage = customEvent.detail?.message || DEFAULT_MESSAGE;
      setMessage(detailMessage);
      setIsVisible(true);
      // Trigger fade-in animation
      setTimeout(() => setFadeIn(true), 10);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired as EventListener);

      // Check for stored expiration message (from previous session)
      const storedMessage = consumeSessionExpiredNotice();
      if (storedMessage) {
        console.log('[SessionExpiredNotice] Found stored session expiration message');
        setMessage(storedMessage);
        setIsVisible(true);
        // Trigger fade-in animation
        setTimeout(() => setFadeIn(true), 10);
      }
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired as EventListener);
      }
    };
  }, []);

  const handleAcknowledge = () => {
    setFadeIn(false);
    setTimeout(() => {
      setIsVisible(false);
      if (typeof window !== 'undefined') {
        window.location.replace('/signin');
      }
    }, 200);
  };

  if (!isVisible) {
    return null;
  }

  const reason = getExpirationReason(message);

  return (
    <div
      className={`fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/90 backdrop-blur-md px-4 transition-opacity duration-300 ${
        fadeIn ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className={`max-w-lg w-full overflow-hidden rounded-xl bg-white dark:bg-slate-800 shadow-2xl transition-all duration-300 ${
        fadeIn ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
      }`}>
        {/* Icon Section - Modern minimal design */}
        <div className="relative bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-slate-800 dark:via-slate-750 dark:to-slate-800 py-10">
          <div className="flex items-center justify-center gap-5">
            {/* Clock Icon */}
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-400/20 dark:bg-emerald-500/20 rounded-full blur-2xl animate-pulse" />
              <div className="relative bg-white dark:bg-slate-700 p-5 rounded-full shadow-lg ring-4 ring-emerald-100 dark:ring-emerald-900/30">
                <Clock className="h-10 w-10 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
              </div>
            </div>

            {/* Lock Icon */}
            <div className="relative">
              <div className="absolute inset-0 bg-amber-400/20 dark:bg-amber-500/20 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '0.5s' }} />
              <div className="relative bg-white dark:bg-slate-700 p-5 rounded-full shadow-lg ring-4 ring-amber-100 dark:ring-amber-900/30">
                <Lock className="h-10 w-10 text-amber-600 dark:text-amber-400" strokeWidth={2} />
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Session Expired
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Your session has ended. Please sign in again to continue.
            </p>
          </div>

          {/* Explanation Box */}
          <div className="rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 p-5 mb-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <p className="font-semibold text-sm text-slate-900 dark:text-white mb-1">
                    Why did this happen?
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {reason === 'inactivity' &&
                      'For your security, sessions end automatically after 15 minutes of inactivity. This protects your account if you forget to sign out.'}
                    {reason === 'absolute' &&
                      'Sessions have a maximum lifetime of 8 hours for security. This ensures your account stays protected even during active use.'}
                    {reason === 'security' &&
                      'Your session was ended to protect your account. This may happen when signing in from another device or location.'}
                    {reason === 'unknown' &&
                      'For your security, sessions end automatically after inactivity or when you sign in from another device.'}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-600">
                  <p className="font-semibold text-sm text-slate-900 dark:text-white mb-1">
                    Your work is safe
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    All your data has been saved. Simply sign in again to continue where you left off.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-center">
            <Button
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-2.5 rounded-lg font-medium shadow-lg shadow-emerald-500/30 transition-all hover:shadow-xl hover:shadow-emerald-500/40"
              onClick={handleAcknowledge}
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              Return to Sign In
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SessionExpiredNotice;
