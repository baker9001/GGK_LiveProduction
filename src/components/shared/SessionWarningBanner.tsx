import React, { useEffect, useState } from 'react';
import { AlertTriangle, Clock, X } from 'lucide-react';
import { Button } from './Button';
import {
  SESSION_WARNING_EVENT,
  SESSION_EXTENDED_EVENT,
  extendSession,
  getSessionRemainingTime,
  getSupabaseSessionRemainingMinutes,
  isSupabaseSessionRequired
} from '../../lib/sessionManager';

/**
 * Check if current page is a public page
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

export function SessionWarningBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [remainingMinutes, setRemainingMinutes] = useState(0);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // CRITICAL FIX: Don't show warning on public pages
    if (typeof window !== 'undefined' && isPublicPage(window.location.pathname)) {
      console.log('[SessionWarningBanner] On public page, skipping');
      return;
    }
    const resolveRemainingMinutes = () => {
      const localRemaining = getSessionRemainingTime();

      if (!isSupabaseSessionRequired()) {
        return localRemaining;
      }

      const supabaseRemaining = getSupabaseSessionRemainingMinutes();

      if (supabaseRemaining === null) {
        return localRemaining;
      }

      if (supabaseRemaining === 0) {
        return 0;
      }

      return Math.min(localRemaining, supabaseRemaining);
    };

    const handleWarning = (event: Event) => {
      // Double-check we're not on a public page
      if (typeof window !== 'undefined' && isPublicPage(window.location.pathname)) {
        console.log('[SessionWarningBanner] Warning event on public page, ignoring');
        return;
      }

      const customEvent = event as CustomEvent<{ remainingMinutes: number }>;
      const minutes = customEvent.detail?.remainingMinutes || 0;

      setRemainingMinutes(minutes || resolveRemainingMinutes());
      setIsVisible(true);
      setIsDismissed(false);
    };

    const handleExtended = () => {
      setIsVisible(false);
      setIsDismissed(false);
    };

    window.addEventListener(SESSION_WARNING_EVENT, handleWarning as EventListener);
    window.addEventListener(SESSION_EXTENDED_EVENT, handleExtended as EventListener);

    // Update countdown every 10 seconds
    const countdownInterval = setInterval(() => {
      if (isVisible && !isDismissed) {
        const current = resolveRemainingMinutes();
        setRemainingMinutes(current);

        // Hide if session was extended or expired
        if (current === 0 || current > 5) {
          setIsVisible(false);
        }
      }
    }, 10000);

    return () => {
      window.removeEventListener(SESSION_WARNING_EVENT, handleWarning as EventListener);
      window.removeEventListener(SESSION_EXTENDED_EVENT, handleExtended as EventListener);
      clearInterval(countdownInterval);
    };
  }, [isVisible, isDismissed]);

  const handleExtendSession = () => {
    extendSession();
    setIsVisible(false);
    setIsDismissed(false);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    setTimeout(() => setIsVisible(false), 300);
  };

  if (!isVisible || isDismissed) {
    return null;
  }

  const getWarningColor = () => {
    if (remainingMinutes <= 1) return 'bg-red-500/90';
    if (remainingMinutes <= 2) return 'bg-orange-500/90';
    return 'bg-amber-500/90';
  };

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[9999] ${getWarningColor()} backdrop-blur-sm text-white shadow-lg transition-all duration-300 ease-in-out`}
      role="alert"
      aria-live="assertive"
    >
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 animate-pulse" />
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold">Session Expiring Soon</span>
              <span className="hidden sm:inline">•</span>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="text-sm">
                  {remainingMinutes === 1 ? 'Less than 1 minute' : `${remainingMinutes} minutes`} remaining
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleExtendSession}
              className="bg-white text-gray-900 hover:bg-gray-100 font-medium shadow-md px-4 py-1.5 text-sm"
            >
              Extend Session
            </Button>
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-white/20 rounded transition-colors"
              aria-label="Dismiss warning"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
