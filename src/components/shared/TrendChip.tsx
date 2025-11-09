import React from 'react';
import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { cn } from '../../lib/utils';

interface TrendChipProps {
  pct: number;
  direction: 'up' | 'down' | 'flat';
  className?: string;
}

export function TrendChip({ pct, direction, className }: TrendChipProps) {
  const isRTL = document.dir === 'rtl';

  const Icon = direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : ArrowRight;

  const colorClasses = {
    up: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    down: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    flat: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
  };

  const formattedPct = Math.abs(pct).toFixed(1);
  const displayPct = direction === 'flat' ? '0.0' : formattedPct;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold',
        colorClasses[direction],
        className
      )}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <Icon
        className={cn('h-3 w-3', isRTL && direction !== 'flat' && 'scale-x-[-1]')}
        aria-hidden="true"
      />
      <span>{displayPct}%</span>
    </div>
  );
}
