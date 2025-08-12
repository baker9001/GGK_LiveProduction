import React from 'react';
import { cn } from '../../lib/utils';

interface DashboardCardProps {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  progressValue?: number;
  className?: string;
}

export function DashboardCard({
  title,
  value,
  description,
  icon,
  progressValue,
  className,
}: DashboardCardProps) {
  return (
    <div className={cn(
      'rounded-xl border border-gray-100 dark:border-gray-700 p-6 bg-white dark:bg-gray-800 shadow-sm dark:shadow-gray-900/20 transition-colors duration-200',
      className
    )}>
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center justify-center p-2 bg-white dark:bg-gray-700 rounded-lg shadow-sm dark:shadow-gray-900/20 transition-colors duration-200">
          {icon}
        </span>
      </div>
      <div className="mt-4">
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</h3>
        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{value}</p>
        <div className="mt-2">
          {progressValue !== undefined && (
            <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#64BC46] rounded-full transition-all duration-300"
                style={{ width: `${progressValue}%` }}
              />
            </div>
          )}
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{description}</p>
        </div>
      </div>
    </div>
  );
}