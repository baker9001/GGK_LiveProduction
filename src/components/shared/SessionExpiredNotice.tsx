import React, { useEffect, useState } from 'react';
import { AlertCircle, LogIn } from 'lucide-react';
import { Button } from './Button';
import { SESSION_EXPIRED_EVENT, consumeSessionExpiredNotice } from '../../lib/auth';

const DEFAULT_MESSAGE =
  'Your session ended because we could not keep you signed in. Please sign in again to continue where you left off.';

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

export function SessionExpiredNotice() {
  const [isVisible, setIsVisible] = useState(false);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);

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
    };

    if (typeof window !== 'undefined') {
      window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired as EventListener);

      // Check for stored expiration message (from previous session)
      const storedMessage = consumeSessionExpiredNotice();
      if (storedMessage) {
        console.log('[SessionExpiredNotice] Found stored session expiration message');
        setMessage(storedMessage);
        setIsVisible(true);
      }
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired as EventListener);
      }
    };
  }, []);

  const handleAcknowledge = () => {
    setIsVisible(false);
    if (typeof window !== 'undefined') {
      window.location.replace('/signin');
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-gray-900/80 backdrop-blur-sm px-4">
      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-white/95 p-8 shadow-2xl backdrop-blur dark:bg-gray-900/95">
        <div className="flex items-start gap-4 text-gray-900 dark:text-gray-100">
          <span className="inline-flex shrink-0 items-center justify-center rounded-xl bg-red-500/15 p-3 text-red-500">
            <AlertCircle className="h-7 w-7" aria-hidden="true" />
          </span>
          <div className="space-y-4">
            <header>
              <h2 className="text-2xl font-semibold leading-tight">Session expired</h2>
              <p className="mt-2 text-base text-gray-700 dark:text-gray-300">{message}</p>
            </header>

            <div className="space-y-2 rounded-xl border border-gray-200/70 bg-gray-50/70 p-4 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800/70 dark:text-gray-200">
              <p className="font-medium text-gray-900 dark:text-gray-100">Why did this happen?</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>For security, we end sessions after a long period of inactivity.</li>
                <li>If you signed in on another device or browser, the previous session closes automatically.</li>
              </ul>
              <p className="pt-1 text-sm text-gray-600 dark:text-gray-300">
                Signing in again keeps your information protected and lets you continue working safely.
              </p>
            </div>

            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:justify-end">
              <Button className="inline-flex items-center justify-center gap-2 px-4 py-2" onClick={handleAcknowledge}>
                <LogIn className="h-4 w-4" aria-hidden="true" />
                Return to sign in
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SessionExpiredNotice;
