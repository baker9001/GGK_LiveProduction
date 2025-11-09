import React from 'react';
import { cn } from '../../lib/utils';
import type { LucideIcon } from 'lucide-react';

interface DashboardCardProps {
  title?: string;
  subtitle?: string;
  icon?: LucideIcon;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  animationDelay?: number;
}

export function DashboardCard({
  title,
  subtitle,
  icon: Icon,
  toolbar,
  children,
  className,
  loading = false,
  error,
  onRetry,
  animationDelay = 0
}: DashboardCardProps) {
  return (
    <div
      className={cn(
        'bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50',
        'transition-all duration-300 ease-out',
        'hover:shadow-2xl hover:shadow-[#8CC63F]/10 hover:scale-[1.02] hover:border-[#8CC63F]/30',
        'animate-fade-in',
        className
      )}
      style={{
        animationDelay: `${animationDelay}ms`,
        animationFillMode: 'both'
      }}
    >
      {(title || subtitle || toolbar || Icon) && (
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {Icon && (
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-[#8CC63F] to-[#7AB635] flex items-center justify-center shadow-md">
                <Icon className="h-5 w-5 text-white" />
              </div>
            )}
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
