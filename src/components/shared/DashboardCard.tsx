import React from 'react';
import { cn } from '../../lib/utils';

interface DashboardCardProps {
  title?: string;
  subtitle?: string;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
}

export function DashboardCard({
  title,
  subtitle,
  toolbar,
  children,
  className,
  loading = false,
  error,
  onRetry
}: DashboardCardProps) {
  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700',
        'transition-all duration-200 hover:shadow-lg',
        className
      )}
    >
      {(title || subtitle || toolbar) && (
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex-1 min-w-0">
            {title && (
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          {toolbar && (
            <div className="flex-shrink-0">
              {toolbar}
            </div>
          )}
        </div>
      )}

      <div className="p-6">
        {error ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="text-red-600 dark:text-red-400 mb-4">
              <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-[#8CC63F] to-[#7AB635] rounded-lg hover:shadow-md transition-all duration-200"
              >
                Retry
              </button>
            )}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
