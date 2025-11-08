/**
 * FilterPanel Component - GGK Design System
 *
 * A collapsible filter panel component with consistent styling.
 * Used above tables and lists for filtering data.
 */

import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import { ChevronDown, ChevronUp, Filter, X } from 'lucide-react';
import { Card, CardContent } from './Card';
import { Button } from './Button';

interface FilterPanelProps {
  children: React.ReactNode;
  title?: string;
  defaultOpen?: boolean;
  onClear?: () => void;
  activeFilterCount?: number;
  className?: string;
}

export function FilterPanel({
  children,
  title = 'Filters',
  defaultOpen = true,
  onClear,
  activeFilterCount = 0,
  className,
}: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Card className={cn('overflow-hidden !bg-white dark:!bg-gray-800', className)} padding="none">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center justify-between p-20 transition-colors duration-base',
          'hover:bg-ggk-neutral-50 dark:hover:bg-ggk-neutral-700/50',
          'focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ggk-primary-500'
        )}
        aria-expanded={isOpen}
        aria-controls="filter-content"
      >
        <div className="flex items-center gap-12">
          <Filter className="h-5 w-5 text-ggk-primary-600 dark:text-ggk-primary-400" />
          <h3 className="text-base font-semibold text-ggk-neutral-900 dark:text-ggk-neutral-50">
            {title}
          </h3>
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[24px] h-24 px-8 rounded-full bg-ggk-primary-500 text-white text-xs font-semibold">
              {activeFilterCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-8">
          {onClear && activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="text-ggk-neutral-600 hover:text-ggk-neutral-900 dark:text-ggk-neutral-400 dark:hover:text-ggk-neutral-100"
              leftIcon={<X className="h-4 w-4" />}
            >
              Clear
            </Button>
          )}
          {isOpen ? (
            <ChevronUp className="h-5 w-5 text-ggk-neutral-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-ggk-neutral-400" />
          )}
        </div>
      </button>

      {/* Content */}
      {isOpen && (
        <div
          id="filter-content"
          className="border-t border-ggk-neutral-200 dark:border-ggk-neutral-700 p-20 animate-in slide-in-from-top-2 duration-200 !bg-white dark:!bg-gray-800"
        >
          <CardContent className="space-y-16">
            {children}
          </CardContent>
        </div>
      )}
    </Card>
  );
}

// Filter Group for organizing related filters
interface FilterGroupProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

export function FilterGroup({ label, children, className }: FilterGroupProps) {
  return (
    <div className={cn('space-y-8', className)}>
      <label className="block text-sm font-medium text-ggk-neutral-700 dark:text-ggk-neutral-300">
        {label}
      </label>
      <div className="space-y-8">
        {children}
      </div>
    </div>
  );
}

// Filter Row for horizontal layout of filters
interface FilterRowProps {
  children: React.ReactNode;
  className?: string;
}

export function FilterRow({ children, className }: FilterRowProps) {
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-16', className)}>
      {children}
    </div>
  );
}
