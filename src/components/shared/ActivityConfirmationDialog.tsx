import React, { useEffect, useState } from 'react';
import { Activity, Clock, AlertCircle } from 'lucide-react';
import { Button } from './Button';
import { extendSession, getSessionRemainingTime } from '../../lib/sessionManager';

interface ActivityConfirmationDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
  operationName?: string;
  operationProgress?: number;
  autoCloseTimeout?: number;
}

export function ActivityConfirmationDialog({
  isOpen,
  onConfirm,
  onCancel,
  operationName = 'Operation',
  operationProgress = 0,
  autoCloseTimeout = 60000 // 60 seconds default
}: ActivityConfirmationDialogProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(Math.floor(autoCloseTimeout / 1000));
  const [sessionMinutes, setSessionMinutes] = useState(getSessionRemainingTime());

  useEffect(() => {
    if (!isOpen) {
      setRemainingSeconds(Math.floor(autoCloseTimeout / 1000));
      return;
    }

    const interval = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          if (onCancel) {
            onCancel();
          }
          return 0;
        }
        return prev - 1;
      });

      // Update session time
      setSessionMinutes(getSessionRemainingTime());
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, autoCloseTimeout, onCancel]);

  const handleConfirm = () => {
    extendSession();
    onConfirm();
  };

  if (!isOpen) {
    return null;
  }

  const needsSessionExtension = sessionMinutes <= 5;

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-gray-900/80 backdrop-blur-sm px-4">
      <div className="max-w-md w-full overflow-hidden rounded-2xl border border-white/10 bg-white dark:bg-gray-900 shadow-2xl">
        <div className="p-6">
          <div className="flex items-center gap-3 text-gray-900 dark:text-gray-100">
            <span className="inline-flex items-center justify-center rounded-full bg-blue-500/10 p-3 text-blue-500">
              <Activity className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-xl font-semibold">Are you still there?</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                Confirm your activity to continue
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {needsSessionExtension && (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-400">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Session expiring soon</p>
                    <p className="text-xs mt-1">
                      Your session will expire in {sessionMinutes} {sessionMinutes === 1 ? 'minute' : 'minutes'}.
                      Clicking "I'm here" will extend your session.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {operationName} in progress
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {operationProgress}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${operationProgress}%` }}
                />
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Auto-cancel in
                  </span>
                </div>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {remainingSeconds}s
                </span>
              </div>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-300">
              We noticed you might be away. To continue your operation and keep your session active,
              please confirm you're still here.
            </p>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:justify-end">
            {onCancel && (
              <Button
                onClick={onCancel}
                variant="outline"
                className="sm:order-1"
              >
                Cancel Operation
              </Button>
            )}
            <Button
              onClick={handleConfirm}
              className="bg-blue-600 hover:bg-blue-700 text-white sm:order-2"
            >
              {needsSessionExtension ? "I'm here - Extend Session" : "Yes, I'm here"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
