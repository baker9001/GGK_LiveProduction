/**
 * Badge Component - GGK Design System
 *
 * Status badges and pills for displaying status, categories, and tags.
 */

import React from 'react';
import { cn } from '../../lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';

const badgeVariants = cva(
  'inline-flex items-center gap-4 rounded-full font-medium transition-all duration-base',
  {
    variants: {
      variant: {
        default: 'bg-ggk-neutral-100 text-ggk-neutral-700 dark:bg-ggk-neutral-800 dark:text-ggk-neutral-300',
        primary: 'bg-ggk-primary-100 text-ggk-primary-800 dark:bg-ggk-primary-900 dark:text-ggk-primary-200',
        success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
        warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
        danger: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        info: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        outline: 'border-2 border-ggk-neutral-300 text-ggk-neutral-700 bg-transparent dark:border-ggk-neutral-600 dark:text-ggk-neutral-300',
      },
      size: {
        sm: 'px-8 py-2 text-xs',
        md: 'px-10 py-4 text-sm',
        lg: 'px-12 py-6 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  onRemove?: () => void;
  icon?: React.ReactNode;
}

export function Badge({
  className,
  variant,
  size,
  children,
  onRemove,
  icon,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className={cn(
            'flex-shrink-0 rounded-full p-1 transition-colors duration-fast',
            'hover:bg-black/10 dark:hover:bg-white/10',
            'focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-current'
          )}
          aria-label="Remove"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

// Status Badge - specialized badge for status indicators
interface StatusBadgeProps {
  status: 'pending' | 'active' | 'completed' | 'cancelled' | 'error' | 'draft';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
}

export function StatusBadge({ status, className, size = 'md', showDot = true }: StatusBadgeProps) {
  const statusConfig = {
    pending: {
      variant: 'warning' as const,
      label: 'Pending',
      dotColor: 'bg-amber-500',
    },
    active: {
      variant: 'info' as const,
      label: 'Active',
      dotColor: 'bg-blue-500',
    },
    completed: {
      variant: 'success' as const,
      label: 'Completed',
      dotColor: 'bg-emerald-500',
    },
    cancelled: {
      variant: 'default' as const,
      label: 'Cancelled',
      dotColor: 'bg-ggk-neutral-500',
    },
    error: {
      variant: 'danger' as const,
      label: 'Error',
      dotColor: 'bg-red-500',
    },
    draft: {
      variant: 'default' as const,
      label: 'Draft',
      dotColor: 'bg-ggk-neutral-400',
    },
  };

  const config = statusConfig[status];

  return (
    <Badge
      variant={config.variant}
      size={size}
      className={className}
      icon={
        showDot ? (
          <span className={cn('h-2 w-2 rounded-full', config.dotColor)} />
        ) : undefined
      }
    >
      {config.label}
    </Badge>
  );
}

// Count Badge - for displaying counts/numbers
interface CountBadgeProps {
  count: number;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  max?: number;
  className?: string;
}

export function CountBadge({ count, variant = 'primary', max, className }: CountBadgeProps) {
  const displayCount = max && count > max ? `${max}+` : count;

  return (
    <Badge variant={variant} size="sm" className={cn('min-w-[20px] justify-center px-6', className)}>
      {displayCount}
    </Badge>
  );
}

// Dot Badge - minimal dot indicator
interface DotBadgeProps {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
  pulse?: boolean;
}

export function DotBadge({ variant = 'default', className, pulse = false }: DotBadgeProps) {
  const colorMap = {
    default: 'bg-ggk-neutral-400',
    primary: 'bg-ggk-primary-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
    info: 'bg-blue-500',
  };

  return (
    <span className={cn('relative flex h-3 w-3', className)}>
      {pulse && (
        <span className={cn('absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping', colorMap[variant])} />
      )}
      <span className={cn('relative inline-flex rounded-full h-3 w-3', colorMap[variant])} />
    </span>
  );
}
