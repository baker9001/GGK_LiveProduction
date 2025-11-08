/**
 * PageHeader Component - GGK Design System
 *
 * Consistent page header with title, subtitle/description,
 * optional accent underline, and action buttons slot.
 */

import React from 'react';
import { cn } from '../../lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  accent?: boolean;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  actions,
  accent = true,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'pb-24 mb-32',
        {
          'border-b-4 border-ggk-primary-500': accent,
          'border-b border-ggk-neutral-200 dark:border-ggk-neutral-700': !accent,
        },
        className
      )}
    >
      <div className="flex items-start justify-between gap-16">
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold text-ggk-neutral-900 dark:text-ggk-neutral-50 tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-8 text-base text-ggk-neutral-600 dark:text-ggk-neutral-400 leading-relaxed max-w-3xl">
              {subtitle}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-12 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
