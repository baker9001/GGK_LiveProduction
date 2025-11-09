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
}

export function KPIStat({ label, value, caption, trend, icon: Icon, iconColor = 'from-[#8CC63F] to-[#7AB635]', className, loading = false, animationDelay = 0 }: KPIStatProps) {
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
      <div className={cn('bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg', className)}>
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
            <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
          </div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50',
        'transition-all duration-300 ease-out shadow-lg',
        'hover:shadow-2xl hover:shadow-[#8CC63F]/20 hover:scale-[1.02] hover:border-[#8CC63F]/40',
        'animate-fade-in relative overflow-hidden',
        'before:absolute before:inset-0 before:bg-gradient-to-br before:from-[#8CC63F]/5 before:to-transparent before:opacity-0 before:transition-opacity before:duration-300',
        'hover:before:opacity-100',
        className
      )}
      style={{
        animationDelay: `${animationDelay}ms`,
        animationFillMode: 'both'
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-4 relative z-10">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {label}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {trend && <TrendChip {...trend} />}
          {Icon && (
            <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md transition-transform duration-300 hover:scale-110', iconColor)}>
              <Icon className="h-6 w-6 text-white" />
            </div>
          )}
        </div>
      </div>

      <div className="relative z-10">
        <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1 transition-all duration-300">
          {formattedValue}
        </p>

        {caption && (
          <p className="text-xs text-gray-500 dark:text-gray-500">
            {caption}
          </p>
        )}
      </div>
    </div>
  );
}
