import React, { useEffect, useState } from 'react';
import { cn } from '../../lib/utils';
import { TrendChip } from './TrendChip';

interface KPIStatProps {
  label: string;
  value: number | string;
  caption?: string;
  trend?: {
    pct: number;
    direction: 'up' | 'down' | 'flat';
  };
  icon?: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  className?: string;
  loading?: boolean;
  animationDelay?: number;
  transparent?: boolean;
}

export function KPIStat({
  label,
  value,
  caption,
  trend,
  icon: Icon,
  iconColor = 'from-[#8CC63F] to-[#7AB635]',
  className,
  loading = false,
  animationDelay = 0,
  transparent = false
}: KPIStatProps) {
  const [displayValue, setDisplayValue] = useState<number>(0);
  const numericValue = typeof value === 'number' ? value : parseFloat(String(value).replace(/,/g, '')) || 0;
  const shouldAnimate = typeof value === 'number' && value > 0;

  useEffect(() => {
    if (!shouldAnimate || loading) {
      setDisplayValue(numericValue);
      return;
    }

    const prefersReducedMotion = typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : true;

    if (prefersReducedMotion) {
      setDisplayValue(numericValue);
      return;
    }

    const duration = 1000;
    const steps = 30;
    const increment = numericValue / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current = Math.min(current + increment, numericValue);
      setDisplayValue(Math.round(current));

      if (step >= steps || current >= numericValue) {
        setDisplayValue(numericValue);
        clearInterval(timer);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [numericValue, shouldAnimate, loading]);

  const formattedValue = shouldAnimate && !loading
    ? displayValue.toLocaleString()
    : typeof value === 'number'
      ? value.toLocaleString()
      : value;

  if (loading) {
    return (
      <div
        className={cn(
          'rounded-ggk-2xl border border-filter px-24 py-20 shadow-theme-elevated',
          !transparent && 'bg-card',
          'animate-pulse space-y-16',
          className
        )}
      >
        <div className="flex items-center justify-between">
          <span className="h-4 w-32 rounded-full bg-theme-subtle" />
          <span className="h-12 w-12 rounded-full bg-theme-subtle" />
        </div>
        <span className="block h-8 w-36 rounded-full bg-theme-subtle" />
        <span className="block h-3 w-24 rounded-full bg-theme-subtle" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-ggk-2xl border border-filter px-24 py-20 shadow-theme-elevated',
        !transparent && 'bg-card',
        'transition-theme hover:-translate-y-1 hover:shadow-theme-popover',
        'after:absolute after:inset-x-0 after:bottom-0 after:h-1 after:bg-gradient-to-r after:from-transparent after:via-ggk-primary-400/60 after:to-transparent after:transition-opacity after:duration-base after:opacity-0 group-hover:after:opacity-100',
        className
      )}
      style={{
        animationDelay: `${animationDelay}ms`,
        animationFillMode: 'both'
      }}
    >
      <div className="flex items-start justify-between gap-12">
        <div className="space-y-6">
          <p className="text-sm font-medium uppercase tracking-wide text-ggk-neutral-500">
            {label}
          </p>
          <p className="text-4xl font-bold text-ggk-neutral-900 dark:text-ggk-neutral-50">
            {formattedValue}
          </p>
          {caption && (
            <p className="text-sm text-theme-muted">
              {caption}
            </p>
          )}
        </div>

        <div className="flex items-center gap-10">
          {trend && <TrendChip {...trend} />}
          {Icon && (
            <span
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-ggk-xl bg-ggk-primary-100 text-ggk-primary-700',
                iconColor.startsWith('from') && `bg-gradient-to-br ${iconColor} text-white`
              )}
            >
              <Icon className="h-6 w-6" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
