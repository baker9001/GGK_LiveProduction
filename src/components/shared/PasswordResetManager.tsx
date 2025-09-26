/**
 * Password Reset Manager Component
 * Handles password reset logic with rate limiting and improved UX
 */

import React, { useState, useEffect } from 'react';
import { Key, Mail, AlertTriangle, CheckCircle, Clock, Info } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../lib/utils';

interface PasswordResetManagerProps {
  teacherName: string;
  teacherEmail: string;
  onResetPassword: (sendEmail: boolean) => Promise<void>;
  isLoading?: boolean;
  className?: string;
}

// Track recent password resets in sessionStorage
const RESET_COOLDOWN_KEY = 'teacher_password_resets';
const COOLDOWN_DURATION = 5 * 60 * 1000; // 5 minutes

export function PasswordResetManager({
  teacherName,
  teacherEmail,
  onResetPassword,
  isLoading = false,
  className
}: PasswordResetManagerProps) {
  const [isResetting, setIsResetting] = useState(false);
  const [lastResetTime, setLastResetTime] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Check for recent password resets
  useEffect(() => {
    const checkResetHistory = () => {
      const resetHistory = sessionStorage.getItem(RESET_COOLDOWN_KEY);
      if (resetHistory) {
        try {
          const history = JSON.parse(resetHistory);
          const teacherReset = history[teacherEmail];
          if (teacherReset) {
            const timeSinceReset = Date.now() - teacherReset;
            if (timeSinceReset < COOLDOWN_DURATION) {
              setLastResetTime(teacherReset);
              setTimeRemaining(Math.ceil((COOLDOWN_DURATION - timeSinceReset) / 1000));
            }
          }
        } catch (e) {
          console.error('Error parsing reset history:', e);
        }
      }
    };

    checkResetHistory();
    const interval = setInterval(checkResetHistory, 1000);
    return () => clearInterval(interval);
  }, [teacherEmail]);

  // Update countdown timer
  useEffect(() => {
    if (timeRemaining > 0) {
      const timer = setTimeout(() => {
        setTimeRemaining(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearTimeout(timer);
    } else if (lastResetTime && Date.now() - lastResetTime >= COOLDOWN_DURATION) {
      setLastResetTime(null);
    }
  }, [timeRemaining, lastResetTime]);

  const handleResetClick = () => {
    // Check cooldown
    if (timeRemaining > 0) return;
    
    // Show confirmation dialog
    setShowConfirmation(true);
    setResetSuccess(false);
  };

  const confirmReset = async () => {
    if (isResetting || isLoading) return;

    setIsResetting(true);
    setShowConfirmation(false);

    try {
      await onResetPassword(true);
      
      // Update reset history
      const resetHistory = sessionStorage.getItem(RESET_COOLDOWN_KEY);
      const history = resetHistory ? JSON.parse(resetHistory) : {};
      history[teacherEmail] = Date.now();
      sessionStorage.setItem(RESET_COOLDOWN_KEY, JSON.stringify(history));
      
      setLastResetTime(Date.now());
      setTimeRemaining(COOLDOWN_DURATION / 1000);
      setResetSuccess(true);
      
      // Hide success message after 5 seconds
      setTimeout(() => setResetSuccess(false), 5000);
    } catch (error) {
      console.error('Password reset error:', error);
    } finally {
      setIsResetting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isDisabled = isResetting || isLoading || timeRemaining > 0;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Password Reset Section */}
      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
        <div className="flex items-start gap-3">
          <Key className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">
              Password Reset
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
              Send a password reset email to {teacherName} at {teacherEmail}
            </p>
            
            {/* Status Messages */}
            {resetSuccess && (
              <div className="mb-3 p-3 bg-green-100 dark:bg-green-900/30 rounded-md border border-green-300 dark:border-green-700">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Password reset email sent successfully!
                  </p>
                </div>
              </div>
            )}

            {timeRemaining > 0 && (
              <div className="mb-3 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-md border border-blue-300 dark:border-blue-700">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-pulse" />
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Please wait {formatTime(timeRemaining)} before requesting another reset
                  </p>
                </div>
              </div>
            )}

            {/* Reset Button */}
            <Button
              type="button"
              onClick={handleResetClick}
              disabled={isDisabled}
              className={cn(
                "w-full",
                isDisabled && "opacity-50 cursor-not-allowed"
              )}
              variant="outline"
            >
              {isResetting ? (
                <>
                  <div className="h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Sending Reset Email...
                </>
              ) : timeRemaining > 0 ? (
                <>
                  <Clock className="h-4 w-4 mr-2" />
                  Wait {formatTime(timeRemaining)}
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Password Reset Email
                </>
              )}
            </Button>

            {/* Info Text */}
            <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-md">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  <p>• The teacher will receive an email with instructions to reset their password</p>
                  <p>• They must click the link in the email within 2 hours</p>
                  <p>• For security, you can only send one reset email every 5 minutes</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Confirm Password Reset
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Are you sure you want to send a password reset email to {teacherName}?
                </p>
              </div>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg mb-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                This will:
              </p>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
                <li>Send an email to: <strong>{teacherEmail}</strong></li>
                <li>Allow them to set a new password</li>
                <li>Expire their current session (if any)</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowConfirmation(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmReset}
                disabled={isResetting}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
              >
                {isResetting ? (
                  <>
                    <div className="h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Send Reset Email
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}