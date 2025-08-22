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
  inactiveLabel = 'Inactive'
}: ToggleSwitchProps) {
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
      on: 'bg-blue-600 dark:bg-blue-500',
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
    if (!disabled) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

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
            {description && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {description}
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
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className={cn(
            'relative inline-flex flex-shrink-0 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8CC63F]',
            sizeClasses[size].switch,
            checked ? colorClasses[color].on : colorClasses[color].off,
            disabled && 'opacity-50 cursor-not-allowed'
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