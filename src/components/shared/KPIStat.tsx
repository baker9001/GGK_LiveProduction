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
  className?: string;
  loading?: boolean;
}

export function KPIStat({ label, value, caption, trend, className, loading = false }: KPIStatProps) {
  const [displayValue, setDisplayValue] = useState<number>(0);
  const numericValue = typeof value === 'number' ? value : parseFloat(String(value).replace(/,/g, '')) || 0;
  const shouldAnimate = typeof value === 'number' && value > 0;

  useEffect(() => {
    if (!shouldAnimate || loading) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
      <div className={cn('bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700', className)}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-3"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700',
        'transition-all duration-200 hover:shadow-lg hover:border-[#8CC63F]/30',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {label}
        </p>
        {trend && <TrendChip {...trend} />}
      </div>

      <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
        {formattedValue}
      </p>

      {caption && (
        <p className="text-xs text-gray-500 dark:text-gray-500">
          {caption}
        </p>
      )}
    </div>
  );
}
