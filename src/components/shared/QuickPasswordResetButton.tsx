/**
 * Quick Password Reset Button Component
 * For use in tables with rate limiting
 */

import React, { useState, useEffect } from 'react';
import { Key, Loader2, Clock, CheckCircle } from 'lucide-react';
import { Button } from './Button';
import { toast } from './Toast';
import { cn } from '../../lib/utils';

interface QuickPasswordResetButtonProps {
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  onReset: (teacherId: string) => Promise<void>;
  disabled?: boolean;
}

const COOLDOWN_KEY = 'teacher_password_reset_cooldowns';
const COOLDOWN_DURATION = 5 * 60 * 1000; // 5 minutes

export function QuickPasswordResetButton({
  teacherId,
  teacherName,
  teacherEmail,
  onReset,
  disabled = false
}: QuickPasswordResetButtonProps) {
  const [isResetting, setIsResetting] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);

  // Check cooldown on mount and update
  useEffect(() => {
    const checkCooldown = () => {
      try {
        const cooldowns = sessionStorage.getItem(COOLDOWN_KEY);
        if (cooldowns) {
          const data = JSON.parse(cooldowns);
          const lastReset = data[teacherId];
          if (lastReset) {
            const elapsed = Date.now() - lastReset;
            if (elapsed < COOLDOWN_DURATION) {
              setCooldownRemaining(Math.ceil((COOLDOWN_DURATION - elapsed) / 1000));
              return;
            }
          }
        }
        setCooldownRemaining(0);
      } catch (e) {
        setCooldownRemaining(0);
      }
    };

    checkCooldown();
    const interval = setInterval(checkCooldown, 1000);
    return () => clearInterval(interval);
  }, [teacherId]);

  // Countdown timer
  useEffect(() => {
    if (cooldownRemaining > 0) {
      const timer = setTimeout(() => {
        setCooldownRemaining(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownRemaining]);

  const handleReset = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row selection
    
    if (isResetting || cooldownRemaining > 0) return;

    // Confirm action
    const confirmed = window.confirm(
      `Send password reset email to ${teacherName}?\n\nEmail: ${teacherEmail}\n\nThis will send instructions to reset their password.`
    );
    
    if (!confirmed) return;

    setIsResetting(true);
    
    try {
      await onReset(teacherId);
      
      // Update cooldown
      const cooldowns = sessionStorage.getItem(COOLDOWN_KEY);
      const data = cooldowns ? JSON.parse(cooldowns) : {};
      data[teacherId] = Date.now();
      sessionStorage.setItem(COOLDOWN_KEY, JSON.stringify(data));
      
      setCooldownRemaining(COOLDOWN_DURATION / 1000);
      setShowSuccess(true);
      
      toast.success(`Password reset email sent to ${teacherEmail}`, {
        duration: 5000
      });
      
      // Hide success indicator after 3 seconds
      setTimeout(() => setShowSuccess(false), 3000);
      
    } catch (error: any) {
      console.error('Password reset failed:', error);
      toast.error(error.message || 'Failed to send password reset email');
    } finally {
      setIsResetting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isDisabled = disabled || isResetting || cooldownRemaining > 0;

  // Success state
  if (showSuccess) {
    return (
      <Button
        size="sm"
        variant="outline"
        disabled
        title="Password reset email sent"
        className="border-green-500 text-green-500"
      >
        <CheckCircle className="w-4 h-4" />
      </Button>
    );
  }

  // Cooldown state
  if (cooldownRemaining > 0) {
    return (
      <Button
        size="sm"
        variant="outline"
        disabled
        title={`Wait ${formatTime(cooldownRemaining)} before next reset`}
        className="opacity-50 cursor-not-allowed"
      >
        <Clock className="w-4 h-4" />
      </Button>
    );
  }

  // Loading state
  if (isResetting) {
    return (
      <Button
        size="sm"
        variant="outline"
        disabled
        title="Sending reset email..."
        className="cursor-wait"
      >
        <Loader2 className="w-4 h-4 animate-spin" />
      </Button>
    );
  }

  // Default state
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleReset}
      disabled={isDisabled}
      title="Send password reset email"
      className={cn(
        "hover:border-[#8CC63F] hover:text-[#8CC63F] hover:bg-[#8CC63F]/10",
        isDisabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <Key className="w-4 h-4" />
    </Button>
  );
}