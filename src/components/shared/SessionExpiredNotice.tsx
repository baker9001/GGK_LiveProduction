import React, { useEffect, useState } from 'react';
import { AlertCircle, LogIn } from 'lucide-react';
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
          <div className="relative hidden overflow-hidden md:col-span-2 md:block bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900">
            <svg
              viewBox="0 0 400 500"
              className="h-full w-full"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="clockGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#6366f1', stopOpacity: 0.8 }} />
                  <stop offset="100%" style={{ stopColor: '#8b5cf6', stopOpacity: 0.9 }} />
                </linearGradient>
                <linearGradient id="lockGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#ef4444', stopOpacity: 0.7 }} />
                  <stop offset="100%" style={{ stopColor: '#f97316', stopOpacity: 0.8 }} />
                </linearGradient>
                <filter id="shadow">
                  <feDropShadow dx="0" dy="4" stdDeviation="8" floodOpacity="0.2" />
                </filter>
              </defs>

              {/* Background decorative circles */}
              <circle cx="100" cy="100" r="60" fill="#6366f1" opacity="0.05" />
              <circle cx="320" cy="400" r="80" fill="#8b5cf6" opacity="0.05" />
              <circle cx="350" cy="150" r="40" fill="#ec4899" opacity="0.05" />

              {/* Main clock circle */}
              <g filter="url(#shadow)">
                <circle
                  cx="200"
                  cy="220"
                  r="100"
                  fill="url(#clockGradient)"
                  stroke="#ffffff"
                  strokeWidth="4"
                />

                {/* Clock face */}
                <circle cx="200" cy="220" r="90" fill="#ffffff" opacity="0.95" />

                {/* Clock hour markers */}
                <circle cx="200" cy="145" r="4" fill="#6366f1" />
                <circle cx="275" cy="220" r="4" fill="#6366f1" />
                <circle cx="200" cy="295" r="4" fill="#6366f1" />
                <circle cx="125" cy="220" r="4" fill="#6366f1" />

                {/* Clock hands - showing expired time */}
                <line
                  x1="200"
                  y1="220"
                  x2="200"
                  y2="170"
                  stroke="#1e293b"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                <line
                  x1="200"
                  y1="220"
                  x2="240"
                  y2="220"
                  stroke="#1e293b"
                  strokeWidth="4"
                  strokeLinecap="round"
                />

                {/* Center dot */}
                <circle cx="200" cy="220" r="8" fill="#6366f1" />
              </g>

              {/* Lock icon overlay */}
              <g filter="url(#shadow)">
                {/* Lock body */}
                <rect
                  x="160"
                  y="360"
                  width="80"
                  height="70"
                  rx="8"
                  fill="url(#lockGradient)"
                />
                <rect
                  x="165"
                  y="365"
                  width="70"
                  height="60"
                  rx="6"
                  fill="#ffffff"
                  opacity="0.2"
                />

                {/* Lock shackle - open/unlocked */}
                <path
                  d="M 175 360 Q 175 330, 200 330 Q 225 330, 225 360"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="8"
                  strokeLinecap="round"
                />

                {/* Keyhole */}
                <circle cx="200" cy="390" r="8" fill="#ffffff" opacity="0.9" />
                <rect x="196" y="390" width="8" height="20" rx="2" fill="#ffffff" opacity="0.9" />
              </g>

              {/* Warning indicator - small red dot with pulse effect */}
              <circle cx="260" cy="180" r="12" fill="#ef4444" opacity="0.9" />
              <circle cx="260" cy="180" r="8" fill="#ffffff" />
              <text
                x="260"
                y="186"
                textAnchor="middle"
                fill="#ef4444"
                fontSize="16"
                fontWeight="bold"
              >
                !
              </text>

              {/* Time expired arc */}
              <path
                d="M 200 120 A 100 100 0 1 1 199.9 120"
                fill="none"
                stroke="#ef4444"
                strokeWidth="3"
                strokeDasharray="5,5"
                opacity="0.4"
              />
            </svg>
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/40 via-transparent to-transparent" />
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
