/**
 * File: /src/components/shared/LongOperationSessionBanner.tsx
 *
 * Persistent banner showing during long operations (>2 minutes)
 * Displays operation progress and session status with proactive warnings
 */

import React, { useEffect, useState } from 'react';
import { Clock, AlertTriangle, CheckCircle, Loader2, X } from 'lucide-react';
import { Button } from './Button';
import {
  SESSION_EVENTS,
  SESSION_HEALTHY_THRESHOLD_MINUTES,
  SESSION_CRITICAL_THRESHOLD_MINUTES,
  formatRemainingTime
} from '../../lib/sessionConfig';
import { getSessionRemainingTime, extendSession } from '../../lib/auth';
import { getCurrentOperation, cancelOperation, type LongOperation } from '../../lib/longOperationManager';

interface LongOperationSessionBannerProps {
  className?: string;
}

export function LongOperationSessionBanner({ className = '' }: LongOperationSessionBannerProps) {
  const [operation, setOperation] = useState<LongOperation | null>(null);
  const [sessionRemaining, setSessionRemaining] = useState<number>(0);
  const [isVisible, setIsVisible] = useState(false);
  const [showExtendButton, setShowExtendButton] = useState(false);

  // Update operation and session status
  useEffect(() => {
    const updateStatus = () => {
      const currentOp = getCurrentOperation();
      setOperation(currentOp);

      if (currentOp) {
        const remaining = getSessionRemainingTime();
        setSessionRemaining(remaining);
        setIsVisible(true);

        // Show extend button when session is running low
        setShowExtendButton(remaining <= 10 && remaining > 0);
      } else {
        setIsVisible(false);
        setShowExtendButton(false);
      }
    };

    // Initial update
    updateStatus();

    // Update every 10 seconds
    const interval = setInterval(updateStatus, 10000);

    // Listen for operation events
    const handleOperationStarted = () => updateStatus();
    const handleOperationCompleted = () => {
      updateStatus();
      // Hide banner after short delay
      setTimeout(() => setIsVisible(false), 2000);
    };
    const handleOperationProgress = () => updateStatus();

    window.addEventListener(SESSION_EVENTS.OPERATION_STARTED, handleOperationStarted);
    window.addEventListener(SESSION_EVENTS.OPERATION_COMPLETED, handleOperationCompleted);
    window.addEventListener(SESSION_EVENTS.OPERATION_PROGRESS, handleOperationProgress);

    return () => {
      clearInterval(interval);
      window.removeEventListener(SESSION_EVENTS.OPERATION_STARTED, handleOperationStarted);
      window.removeEventListener(SESSION_EVENTS.OPERATION_COMPLETED, handleOperationCompleted);
      window.removeEventListener(SESSION_EVENTS.OPERATION_PROGRESS, handleOperationProgress);
    };
  }, []);

  const handleExtendSession = () => {
    extendSession();
    setShowExtendButton(false);

    // Show confirmation
    const remaining = getSessionRemainingTime();
    setSessionRemaining(remaining);
  };

  const handleCancel = () => {
    if (operation && window.confirm(`Cancel ${operation.name}?`)) {
      cancelOperation(operation.id);
      setIsVisible(false);
    }
  };

  if (!isVisible || !operation) {
    return null;
  }

  // Determine status color
  const getStatusColor = (): 'green' | 'yellow' | 'red' => {
    if (sessionRemaining > SESSION_HEALTHY_THRESHOLD_MINUTES) return 'green';
    if (sessionRemaining > SESSION_CRITICAL_THRESHOLD_MINUTES) return 'yellow';
    return 'red';
  };

  const statusColor = getStatusColor();

  const colorClasses = {
    green: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      text: 'text-green-900 dark:text-green-100',
      icon: 'text-green-600 dark:text-green-400',
      progress: 'bg-green-600 dark:bg-green-500'
    },
    yellow: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      text: 'text-yellow-900 dark:text-yellow-100',
      icon: 'text-yellow-600 dark:text-yellow-400',
      progress: 'bg-yellow-600 dark:bg-yellow-500'
    },
    red: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-900 dark:text-red-100',
      icon: 'text-red-600 dark:text-red-400',
      progress: 'bg-red-600 dark:bg-red-500'
    }
  };

  const colors = colorClasses[statusColor];

  return (
    <div className={`fixed top-0 left-0 right-0 z-[9999] ${className}`}>
      <div className={`${colors.bg} ${colors.border} border-b shadow-lg`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              {/* Operation Status */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {operation.progress < 100 ? (
                  <Loader2 className={`h-5 w-5 ${colors.icon} animate-spin flex-shrink-0`} />
                ) : (
                  <CheckCircle className={`h-5 w-5 ${colors.icon} flex-shrink-0`} />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-medium ${colors.text} truncate`}>
                      {operation.name}
                    </span>
                    <span className={`text-xs ${colors.text} opacity-75`}>
                      {Math.round(operation.progress)}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`${colors.progress} h-full rounded-full transition-all duration-300`}
                      style={{ width: `${operation.progress}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Session Status */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="flex items-center gap-2">
                  {statusColor === 'red' ? (
                    <AlertTriangle className={`h-4 w-4 ${colors.icon}`} />
                  ) : (
                    <Clock className={`h-4 w-4 ${colors.icon}`} />
                  )}
                  <span className={`text-sm font-medium ${colors.text} whitespace-nowrap`}>
                    Session: {formatRemainingTime(sessionRemaining)}
                  </span>
                </div>

                {/* Extend Button */}
                {showExtendButton && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleExtendSession}
                    className="whitespace-nowrap"
                  >
                    Extend Session
                  </Button>
                )}

                {/* Cancel Button */}
                {operation.onCancel && operation.progress < 100 && (
                  <button
                    onClick={handleCancel}
                    className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${colors.text}`}
                    aria-label="Cancel operation"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LongOperationSessionBanner;
