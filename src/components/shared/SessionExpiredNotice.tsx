import React, { useEffect, useState } from 'react';
import { Clock, Lock, AlertCircle, LogIn, Shield } from 'lucide-react';
import { Button } from './Button';
import { SESSION_EXPIRED_EVENT, consumeSessionExpiredNotice } from '../../lib/auth';

const DEFAULT_MESSAGE = 'Your session has expired. Please sign in again to continue.';

/**
 * Check if current page is a public page that doesn't require authentication
 */
function isPublicPage(path: string): boolean {
  const publicPaths = [
    '/',
    '/landing',
    '/signin',
    '/login',
    '/forgot-password',
    '/reset-password',
    '/about',
    '/contact',
    '/subjects',
    '/resources',
    '/pricing',
    '/privacy',
    '/terms',
    '/cookies',
    '/cambridge-igcse',
    '/cambridge-o-level',
    '/cambridge-a-level',
    '/edexcel-igcse',
    '/edexcel-a-level',
    '/mock-exams',
    '/video-lessons'
  ];

  return publicPaths.some(publicPath =>
    path === publicPath || (publicPath !== '/' && path.startsWith(publicPath + '/'))
  );
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
      className={`fixed inset-0 z-[10000] flex items-center justify-center bg-gray-900/80 backdrop-blur-sm px-4 transition-opacity duration-300 ${
        fadeIn ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className={`max-w-2xl w-full overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl transition-all duration-300 ${
        fadeIn ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
      }`}>
        {/* Icon Section - Now fully responsive */}
        <div className="relative bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 dark:from-gray-800 dark:via-gray-850 dark:to-gray-800 py-8 md:py-12">
          <div className="flex items-center justify-center gap-4">
            {/* Clock Icon */}
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl animate-pulse" />
              <div className="relative bg-white dark:bg-gray-800 p-4 rounded-full shadow-lg">
                <Clock className="h-12 w-12 md:h-16 md:w-16 text-blue-600 dark:text-blue-400" strokeWidth={1.5} />
              </div>
            </div>

            {/* Lock Icon */}
            <div className="relative">
              <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl animate-pulse" style={{ animationDelay: '0.5s' }} />
              <div className="relative bg-white dark:bg-gray-800 p-4 rounded-full shadow-lg">
                <Lock className="h-12 w-12 md:h-16 md:w-16 text-red-600 dark:text-red-400" strokeWidth={1.5} />
              </div>
            </div>
          </div>

          {/* Decorative elements */}
          <div className="absolute top-4 left-4 w-20 h-20 bg-blue-500/10 rounded-full blur-2xl" />
          <div className="absolute bottom-4 right-4 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl" />
        </div>

        {/* Content Section */}
        <div className="p-6 md:p-8">
          {/* Header */}
          <div className="flex items-start gap-3 text-gray-900 dark:text-gray-100">
            <span className="inline-flex items-center justify-center rounded-full bg-red-500/10 dark:bg-red-500/20 p-2 flex-shrink-0">
              <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" aria-hidden="true" />
            </span>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl md:text-2xl font-semibold">Session Expired</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {message}
              </p>
            </div>
          </div>

          {/* Explanation Box */}
          <div className="mt-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4">
            <div className="flex items-start gap-2">
              <Shield className="h-5 w-5 text-gray-600 dark:text-gray-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-900 dark:text-gray-100">
                  {reason === 'inactivity' && 'Session ended due to inactivity'}
                  {reason === 'absolute' && 'Maximum session time reached'}
                  {reason === 'security' && 'Session ended for security'}
                  {reason === 'unknown' && 'Why did this happen?'}
                </p>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {reason === 'inactivity' &&
                    'For your security, sessions automatically end after 15 minutes of inactivity. This protects your account if you forget to sign out.'}
                  {reason === 'absolute' &&
                    'Sessions have a maximum lifetime of 8 hours for security. This ensures your account stays protected even during active use.'}
                  {reason === 'security' &&
                    'Your session was ended to protect your account. This may happen when signing in from another device or location.'}
                  {reason === 'unknown' &&
                    'For your security, sessions end automatically after inactivity or when you sign in from another device.'}
                </p>
                <p className="mt-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                  Your work is safe
                </p>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  All your data has been saved. Simply sign in again to continue where you left off.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:justify-end">
            <Button
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2"
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
