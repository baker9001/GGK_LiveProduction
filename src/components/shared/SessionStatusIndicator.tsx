/**
 * File: /src/components/shared/SessionStatusIndicator.tsx
 *
 * Persistent session status widget in header/navigation
 * Shows session health with traffic light colors and detailed popover
 */

import React, { useState, useEffect, useRef } from 'react';
import { Clock, LogOut, RefreshCw, Shield, AlertCircle } from 'lucide-react';
import { Button } from './Button';
import {
  SESSION_EVENTS,
  formatRemainingTime,
  getSessionStatusColor,
  SESSION_HEALTHY_THRESHOLD_MINUTES,
  SESSION_CRITICAL_THRESHOLD_MINUTES
} from '../../lib/sessionConfig';
import { getSessionRemainingTime, extendSession, clearAuthenticatedUser, markUserLogout } from '../../lib/auth';

interface SessionStatusIndicatorProps {
  className?: string;
  hideOnPublicPages?: boolean;
}

export function SessionStatusIndicator({
  className = '',
  hideOnPublicPages = true
}: SessionStatusIndicatorProps) {
  const [remainingMinutes, setRemainingMinutes] = useState<number>(0);
  const [showPopover, setShowPopover] = useState(false);
  const [lastActivity, setLastActivity] = useState<string>('Just now');
  const [isVisible, setIsVisible] = useState(true);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Check if we should show the indicator
  useEffect(() => {
    if (hideOnPublicPages && typeof window !== 'undefined') {
      const isPublic = isPublicPage(window.location.pathname);
      setIsVisible(!isPublic);
    }
  }, [hideOnPublicPages]);

  // Update session remaining time
  useEffect(() => {
    const updateRemainingTime = () => {
      const remaining = getSessionRemainingTime();
      setRemainingMinutes(remaining);

      // Update last activity timestamp
      try {
        const lastActivityStr = localStorage.getItem('ggk_last_activity');
        if (lastActivityStr) {
          const lastActivityTime = parseInt(lastActivityStr, 10);
          const elapsed = Date.now() - lastActivityTime;

          if (elapsed < 60000) {
            setLastActivity('Just now');
          } else if (elapsed < 3600000) {
            const minutes = Math.floor(elapsed / 60000);
            setLastActivity(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`);
          } else {
            const hours = Math.floor(elapsed / 3600000);
            setLastActivity(`${hours} ${hours === 1 ? 'hour' : 'hours'} ago`);
          }
        }
      } catch (error) {
        // Ignore
      }
    };

    updateRemainingTime();

    // Update every 30 seconds
    const interval = setInterval(updateRemainingTime, 30000);

    // Listen for session events
    const handleSessionExtended = () => {
      updateRemainingTime();
      setLastActivity('Just now');
    };

    const handleSessionActivity = () => {
      setLastActivity('Just now');
    };

    window.addEventListener(SESSION_EVENTS.EXTENDED, handleSessionExtended);
    window.addEventListener(SESSION_EVENTS.ACTIVITY, handleSessionActivity);

    return () => {
      clearInterval(interval);
      window.removeEventListener(SESSION_EVENTS.EXTENDED, handleSessionExtended);
      window.removeEventListener(SESSION_EVENTS.ACTIVITY, handleSessionActivity);
    };
  }, []);

  // Handle click outside to close popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showPopover &&
        popoverRef.current &&
        buttonRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowPopover(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPopover]);

  if (!isVisible || remainingMinutes === 0) {
    return null;
  }

  const statusColor = getSessionStatusColor(remainingMinutes);
  const isUrgent = remainingMinutes <= 1;

  const colorClasses = {
    green: {
      bg: 'bg-green-500 dark:bg-green-600',
      text: 'text-green-700 dark:text-green-300',
      border: 'border-green-200 dark:border-green-700',
      dot: 'bg-green-500'
    },
    yellow: {
      bg: 'bg-yellow-500 dark:bg-yellow-600',
      text: 'text-yellow-700 dark:text-yellow-300',
      border: 'border-yellow-200 dark:border-yellow-700',
      dot: 'bg-yellow-500'
    },
    red: {
      bg: 'bg-red-500 dark:bg-red-600',
      text: 'text-red-700 dark:text-red-300',
      border: 'border-red-200 dark:border-red-700',
      dot: 'bg-red-500'
    }
  };

  const colors = colorClasses[statusColor];

  const handleExtend = () => {
    extendSession();
    setShowPopover(false);
  };

  const handleSignOut = () => {
    markUserLogout();
    clearAuthenticatedUser();
    if (typeof window !== 'undefined') {
      window.location.replace('/signin');
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Status Badge Button */}
      <button
        ref={buttonRef}
        onClick={() => setShowPopover(!showPopover)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${colors.border} bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors`}
        aria-label="Session status"
        aria-expanded={showPopover}
      >
        {/* Status Dot */}
        <span className="relative flex h-3 w-3">
          {isUrgent && (
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${colors.dot} opacity-75`} />
          )}
          <span className={`relative inline-flex rounded-full h-3 w-3 ${colors.bg}`} />
        </span>

        {/* Time Display */}
        <span className={`text-sm font-medium ${colors.text} whitespace-nowrap hidden sm:inline`}>
          {remainingMinutes < 60 ? `${remainingMinutes}m` : `${Math.floor(remainingMinutes / 60)}h`}
        </span>

        {/* Icon */}
        <Clock className={`h-4 w-4 ${colors.text}`} />
      </button>

      {/* Popover */}
      {showPopover && (
        <div
          ref={popoverRef}
          className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-[10001]"
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Session Status
              </h3>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Time Remaining */}
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Time remaining</span>
                <span className={`text-sm font-semibold ${colors.text}`}>
                  {formatRemainingTime(remainingMinutes)}
                </span>
              </div>

              {/* Visual Progress Bar */}
              <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div
                  className={`${colors.bg} h-full rounded-full transition-all duration-300`}
                  style={{
                    width: `${Math.min(100, (remainingMinutes / SESSION_HEALTHY_THRESHOLD_MINUTES) * 100)}%`
                  }}
                />
              </div>
            </div>

            {/* Last Activity */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Last activity</span>
              <span className="text-sm text-gray-900 dark:text-gray-100">{lastActivity}</span>
            </div>

            {/* Status Message */}
            {remainingMinutes <= SESSION_CRITICAL_THRESHOLD_MINUTES && (
              <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-800 dark:text-yellow-200">
                  {remainingMinutes <= 1
                    ? 'Your session will expire very soon. Extend it now to avoid losing your work.'
                    : `Your session will expire in ${remainingMinutes} minutes. Consider extending it if you're still working.`}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-2">
              <Button
                onClick={handleExtend}
                variant="outline"
                size="sm"
                className="w-full justify-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Extend Session
              </Button>

              <Button
                onClick={handleSignOut}
                variant="outline"
                size="sm"
                className="w-full justify-center gap-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-750 rounded-b-lg border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Sessions expire after 15 minutes of inactivity for security
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Check if current page is public
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
    '/contact'
  ];

  return publicPaths.some(publicPath =>
    path === publicPath || (publicPath !== '/' && path.startsWith(publicPath + '/'))
  );
}

export default SessionStatusIndicator;
