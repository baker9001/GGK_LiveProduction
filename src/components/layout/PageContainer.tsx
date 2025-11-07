import React from 'react';
import { cn } from '../../lib/utils';

type PageShellTone = 'transparent' | 'raised' | 'muted';

type PageShellPadding = 'none' | 'sm' | 'md' | 'lg';

export interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  fullWidth?: boolean;
  tone?: PageShellTone;
  padding?: PageShellPadding;
}

const toneClassMap: Record<PageShellTone, string> = {
  transparent: '',
  raised: 'surface-card',
  muted: 'surface-card surface-card--muted'
};

const paddingClassMap: Record<PageShellPadding, string> = {
  none: 'p-0',
  sm: 'p-4 sm:p-6',
  md: 'p-6 sm:p-8',
  lg: 'p-8 sm:p-10'
};

export function PageContainer({
  children,
  className,
  fullWidth = false,
  tone = 'transparent',
  padding = 'md'
}: PageContainerProps) {
  return (
    <section className={cn('page-shell', className)}>
      <div className="page-shell__background" aria-hidden />
      <div
        className={cn(
          'page-shell__content mx-auto w-full',
          fullWidth ? 'max-w-[1600px]' : 'max-w-[1400px]'
        )}
      >
        <div
          className={cn(
            'page-shell__inner',
            toneClassMap[tone],
            tone !== 'transparent' && paddingClassMap[padding]
          )}
        >
          {children}
        </div>
      </div>
    </section>
  );
}
