///home/project/src/components/shared/ToggleSwitch.tsx

import React from 'react';
import { cn } from '../../lib/utils';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'default' | 'green' | 'blue' | 'red';
  label?: string;
  description?: string;
  className?: string;
  showStateLabel?: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
  preventSelfDeactivation?: boolean;
  currentUserId?: string;
  targetUserId?: string;
}

export function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  size = 'md',
  color = 'green',
  label,
  description,
  className,
  showStateLabel = false,
  activeLabel = 'Active',
  inactiveLabel = 'Inactive',
  preventSelfDeactivation = false,
  currentUserId,
  targetUserId
}: ToggleSwitchProps) {
  // Check if this would be a self-deactivation attempt
  const isSelfDeactivation = preventSelfDeactivation && 
                            currentUserId && 
                            targetUserId && 
                            currentUserId === targetUserId && 
                            checked && 
                            !disabled; // Currently active and would be deactivated (and not already disabled)

  // Determine if the toggle should be disabled
  const isDisabled = disabled || isSelfDeactivation;

  const sizeClasses = {
    sm: {
      switch: 'h-5 w-9',
      thumb: 'h-4 w-4',
      translate: 'translate-x-4'
    },
    md: {
      switch: 'h-6 w-11',
      thumb: 'h-5 w-5',
      translate: 'translate-x-5'
    },
    lg: {
      switch: 'h-7 w-14',
      thumb: 'h-6 w-6',
      translate: 'translate-x-7'
    }
  };

  const colorClasses = {
    default: {
      on: 'bg-[#8CC63F] dark:bg-[#8CC63F]',
      off: 'bg-gray-200 dark:bg-gray-700'
    },
    green: {
      on: 'bg-[#8CC63F] dark:bg-[#8CC63F]',
      off: 'bg-gray-200 dark:bg-gray-700'
    },
    blue: {
      on: 'bg-blue-600 dark:bg-blue-500',
      off: 'bg-gray-200 dark:bg-gray-700'
    },
    red: {
      on: 'bg-red-600 dark:bg-red-500',
      off: 'bg-gray-200 dark:bg-gray-700'
    }
  };

  const handleClick = () => {
    if (!isDisabled) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  // Show warning for self-deactivation attempt
  const showSelfDeactivationWarning = preventSelfDeactivation && 
                                     currentUserId === targetUserId && 
                                     checked;

  // Update description to include warning
  const effectiveDescription = showSelfDeactivationWarning 
    ? "You cannot deactivate your own account for security reasons"
    : description;

  return (
    <div className={cn('flex items-center justify-between', className)}>
      <div className="flex items-center">
        {(label || description) && (
          <div className="mr-3">
            {label && (
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {label}
              </span>
            )}
            {effectiveDescription && (
              <p className={cn("text-sm", showSelfDeactivationWarning ? "text-amber-600 dark:text-amber-400" : "text-gray-500 dark:text-gray-400")}>
                {effectiveDescription}
              </p>
            )}
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-3">
        {showStateLabel && (
          <span className={cn(
            'text-sm font-medium transition-colors',
            checked 
              ? 'text-[#8CC63F] dark:text-[#8CC63F]' 
              : 'text-gray-500 dark:text-gray-400'
          )}>
            {checked ? activeLabel : inactiveLabel}
          </span>
        )}
        
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={label || `Toggle ${checked ? activeLabel : inactiveLabel}`}
          aria-disabled={isDisabled}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          disabled={isDisabled}
          className={cn(
            'relative inline-flex flex-shrink-0 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8CC63F]',
            sizeClasses[size].switch,
            checked ? colorClasses[color].on : colorClasses[color].off,
            isDisabled && 'opacity-50 cursor-not-allowed',
            showSelfDeactivationWarning && 'ring-2 ring-amber-400 ring-offset-2'
          )}
        >
          <span
            className={cn(
              'pointer-events-none inline-block rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200',
              sizeClasses[size].thumb,
              checked ? sizeClasses[size].translate : 'translate-x-0'
            )}
          />
        </button>
      </div>
    </div>
  );
}

export default ToggleSwitch;