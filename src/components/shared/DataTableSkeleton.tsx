///home/project/src/components/shared/DataTableSkeleton.tsx

import React from 'react';
import { cn } from '../../lib/utils';

interface DataTableSkeletonProps {
  columns: number;
  rows: number;
  className?: string;
}

export function DataTableSkeleton({ columns, rows, className }: DataTableSkeletonProps) {
  return (
    <div className={cn('w-full overflow-hidden', className)} role="region" aria-label="Loading table data" aria-busy="true">
      {/* Header */}
      <div className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700" role="row">
        <div className="flex">
          {/* Checkbox column */}
          <div className="w-12 px-6 py-3" role="columnheader">
            <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
          
          {/* Data columns */}
          {Array.from({ length: columns }).map((_, i) => (
            <div key={i} className="flex-1 px-6 py-3" role="columnheader">
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          ))}
          
          {/* Actions column */}
          <div className="w-24 px-6 py-3" role="columnheader">
            <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </div>
      </div>
      
      {/* Rows */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700" role="rowgroup">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex bg-white dark:bg-gray-800" role="row">
            {/* Checkbox */}
            <div className="w-12 px-6 py-4" role="cell">
              <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
            
            {/* Data cells */}
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div key={colIndex} className="flex-1 px-6 py-4" role="cell">
                <div 
                  className={cn(
                    "h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse",
                    // Vary the widths to make it look more realistic
                    colIndex % 3 === 0 ? "w-full max-w-[120px]" : 
                    colIndex % 3 === 1 ? "w-full max-w-[80px]" : 
                    "w-full max-w-[160px]"
                  )} 
                />
                {/* Add a second line for some cells */}
                {colIndex % 2 === 0 && (
                  <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-2" />
                )}
              </div>
            ))}
            
            {/* Actions */}
            <div className="w-24 px-6 py-4" role="cell">
              <div className="flex space-x-2 justify-end">
                <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Pagination */}
      <div className="px-4 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 sm:px-6 flex items-center justify-between">
        <div className="flex items-center">
          <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse ml-4 hidden sm:block" />
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export default DataTableSkeleton;
