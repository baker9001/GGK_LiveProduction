import React from 'react';
import { cn } from '../../lib/utils';

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
  showLabel?: boolean;
  labelFormat?: (value: number, max: number) => string;
  size?: 'sm' | 'md' | 'lg';
  color?: 'default' | 'blue' | 'green' | 'red' | 'yellow' | 'purple';
}

export function ProgressBar({
  value,
  max = 100,
  className,
  barClassName,
  showLabel = false,
  labelFormat,
  size = 'md',
  color = 'default'
}: ProgressBarProps) {
  // Calculate percentage
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  // Format label
  const label = labelFormat 
    ? labelFormat(value, max) 
    : `${percentage.toFixed(0)}%`;
  
  // Determine height based on size
  const heightClass = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  }[size];
  
  // Determine color based on value and color prop
  const getColorClass = () => {
    if (color === 'default') {
      // Default color changes based on percentage
      if (percentage >= 80) return 'bg-green-500 dark:bg-green-400';
      if (percentage >= 50) return 'bg-yellow-500 dark:bg-yellow-400';
      return 'bg-red-500 dark:bg-red-400';
    }
    
    // Use specified color
    const colorMap = {
      blue: 'bg-blue-500 dark:bg-blue-400',
      green: 'bg-green-500 dark:bg-green-400',
      red: 'bg-red-500 dark:bg-red-400',
      yellow: 'bg-yellow-500 dark:bg-yellow-400',
      purple: 'bg-purple-500 dark:bg-purple-400'
    };
    
    return colorMap[color];
  };
  
  return (
    <div className={cn('w-full', className)}>
      <div className="flex justify-between items-center mb-1">
        {showLabel && (
          <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {label}
          </div>
        )}
      </div>
      <div className={cn(`w-full ${heightClass} bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden`, className)}>
        <div
          className={cn(
            `${heightClass} rounded-full transition-all duration-300`,
            getColorClass(),
            barClassName
          )}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
    </div>
  );
}