import React, { useEffect, useState } from 'react';
import { AlertCircle, LogIn } from 'lucide-react';
import { Button } from './Button';
import { SESSION_EXPIRED_EVENT, consumeSessionExpiredNotice } from '../../lib/auth';

const DEFAULT_MESSAGE = 'Your session has expired. Please sign in again to continue.';
const ILLUSTRATION_SRC = '/image.png';

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
      <div className="max-w-3xl w-full overflow-hidden rounded-2xl border border-white/10 bg-white/95 shadow-2xl backdrop-blur dark:bg-gray-900/95">
        <div className="grid grid-cols-1 gap-0 md:grid-cols-5">
          <div className="relative hidden overflow-hidden md:col-span-2 md:block">
            <img
              src={ILLUSTRATION_SRC}
              alt="Session expired illustration"
              className="h-full w-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 via-transparent to-gray-900/30" />
          </div>

          <div className="md:col-span-3 p-8">
            <div className="flex items-center gap-3 text-gray-900 dark:text-gray-100">
              <span className="inline-flex items-center justify-center rounded-full bg-red-500/10 p-2 text-red-500">
                <AlertCircle className="h-6 w-6" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-2xl font-semibold">Session expired</h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  {message}
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-lg border border-gray-200/60 bg-gray-50/60 p-4 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800/70 dark:text-gray-200">
              <p className="font-medium">Why am I seeing this?</p>
              <p className="mt-2">
                For your security, sessions end automatically after a period of inactivity or when you sign in from another device.
              </p>
              <p className="mt-2">
                To keep your work safe, please sign in again. You&apos;ll return to the login page once you acknowledge this message.
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <Button
                className="inline-flex items-center gap-2"
                onClick={handleAcknowledge}
              >
                <LogIn className="h-4 w-4" aria-hidden="true" />
                Go to sign in
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SessionExpiredNotice;
