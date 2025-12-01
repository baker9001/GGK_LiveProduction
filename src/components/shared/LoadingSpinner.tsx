/**
 * LoadingSpinner Component
 *
 * A modern, reusable loading spinner featuring the Go Green Knowledge logo.
 * Supports multiple sizes, animations, and display modes with full accessibility.
 */

import React from 'react';
import { cn } from '@/lib/utils';

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
export type SpinnerAnimation = 'spin' | 'pulse' | 'bounce' | 'hybrid';
export type SpinnerSpeed = 'slow' | 'normal' | 'fast';

export interface LoadingSpinnerProps {
  size?: SpinnerSize;
  message?: string;
  animation?: SpinnerAnimation;
  speed?: SpinnerSpeed;
  className?: string;
  showLogo?: boolean;
  centered?: boolean;
  inline?: boolean;
}

const sizeClasses: Record<SpinnerSize, { container: string; logo: string; text: string }> = {
  xs: { container: 'gap-1', logo: 'h-4 w-4', text: 'text-xs' },
  sm: { container: 'gap-1.5', logo: 'h-6 w-6', text: 'text-sm' },
  md: { container: 'gap-2', logo: 'h-10 w-10', text: 'text-base' },
  lg: { container: 'gap-3', logo: 'h-16 w-16', text: 'text-lg' },
  xl: { container: 'gap-4', logo: 'h-24 w-24', text: 'text-xl' },
  full: { container: 'gap-6', logo: 'h-32 w-32', text: 'text-2xl' }
};

const animationClasses: Record<SpinnerAnimation, string> = {
  spin: 'animate-spin',
  pulse: 'animate-pulse',
  bounce: 'animate-bounce',
  hybrid: 'animate-spin-pulse'
};

const speedClasses: Record<SpinnerSpeed, string> = {
  slow: 'duration-2000',
  normal: 'duration-1000',
  fast: 'duration-500'
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  message,
  animation = 'spin',
  speed = 'normal',
  className,
  showLogo = true,
  centered = true,
  inline = false
}) => {
  const sizeConfig = sizeClasses[size];
  const animationClass = animationClasses[animation];
  const speedClass = speedClasses[speed];

  const spinnerContent = (
    <div
      className={cn(
        'flex flex-col items-center justify-center',
        sizeConfig.container,
        {
          'min-h-[200px]': centered && !inline,
          'inline-flex': inline
        },
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={message || 'Loading'}
    >
      {showLogo && (
        <div
          className={cn(
            sizeConfig.logo,
            animationClass,
            speedClass,
            'relative flex items-center justify-center'
          )}
          style={{
            animationTimingFunction: animation === 'hybrid' ? 'cubic-bezier(0.4, 0, 0.6, 1)' : 'linear'
          }}
        >
          <img
            src="/Go Green Knowledge Logo-01 - Copy.png"
            alt="Go Green Knowledge"
            className="h-full w-full object-contain drop-shadow-lg"
            draggable={false}
          />
          {/* Glow effect for enhanced visibility */}
          <div className="absolute inset-0 bg-gradient-to-br from-lime-400/20 to-green-500/20 rounded-full blur-xl" />
        </div>
      )}

      {message && (
        <p
          className={cn(
            sizeConfig.text,
            'text-gray-700 dark:text-gray-300 font-medium text-center animate-fade-in'
          )}
        >
          {message}
        </p>
      )}

      <span className="sr-only">{message || 'Loading, please wait...'}</span>
    </div>
  );

  if (!centered) {
    return spinnerContent;
  }

  return (
    <div className="flex items-center justify-center w-full h-full">
      {spinnerContent}
    </div>
  );
};

LoadingSpinner.displayName = 'LoadingSpinner';
