import React from 'react';
import { cn } from '../../lib/utils';
import { capitalize } from '../../lib/helpers/formatting';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  // Normalize status for comparison
  const normalizedStatus = status.toLowerCase();
  
  // Determine badge color based on normalized status
  const colorClasses = (() => {
    switch (normalizedStatus) {
      case 'active':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700';
      case 'inactive':
        return 'bg-gray-100 dark:bg-gray-700/50 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-600';
      case 'qa_review':
        return 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-700';
      case 'draft':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-700';
      default:
        return 'bg-gray-100 dark:bg-gray-700/50 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-600';
    }
  })();
  
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors duration-200',
        colorClasses,
        className
      )}
    >
      {/* Preserve original casing if provided, otherwise capitalize */}
      {status || capitalize(normalizedStatus)}
    </span>
  );
}

export default StatusBadge;