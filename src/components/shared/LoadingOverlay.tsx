/**
 * LoadingOverlay Component
 *
 * Full-screen or container-level loading overlay with backdrop blur.
 * Perfect for async operations that block the entire page or section.
 */

import React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { LoadingSpinner, SpinnerSize, SpinnerAnimation, SpinnerSpeed } from './LoadingSpinner';

export interface LoadingOverlayProps {
  message?: string;
  size?: SpinnerSize;
  animation?: SpinnerAnimation;
  speed?: SpinnerSpeed;
  blur?: boolean;
  className?: string;
  portal?: boolean;
  transparent?: boolean;
  zIndex?: number;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  message,
  size = 'xl',
  animation = 'hybrid',
  speed = 'normal',
  blur = true,
  className,
  portal = false,
  transparent = false,
  zIndex = 50
}) => {
  const overlayContent = (
    <div
      className={cn(
        'fixed inset-0 flex items-center justify-center',
        {
          'bg-white/80 dark:bg-gray-900/80': !transparent,
          'bg-transparent': transparent,
          'backdrop-blur-sm': blur
        },
        className
      )}
      style={{ zIndex }}
      role="dialog"
      aria-modal="true"
      aria-label="Loading"
    >
      <div className="relative">
        {/* Background card for better contrast */}
        <div className="absolute inset-0 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl opacity-95 blur-xl scale-110" />

        {/* Content */}
        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 md:p-12 border border-gray-200 dark:border-gray-700">
          <LoadingSpinner
            size={size}
            message={message}
            animation={animation}
            speed={speed}
            centered={false}
          />
        </div>
      </div>
    </div>
  );

  if (portal && typeof document !== 'undefined') {
    return createPortal(overlayContent, document.body);
  }

  return overlayContent;
};

LoadingOverlay.displayName = 'LoadingOverlay';
