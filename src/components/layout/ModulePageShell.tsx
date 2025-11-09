import React from 'react';
import { cn } from '../../lib/utils';
import { PageHeader } from '../shared/PageHeader';

interface ModulePageShellProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  accent?: boolean;
  className?: string;
  contentClassName?: string;
}

export function ModulePageShell({
  title,
  subtitle,
  actions,
  children,
  accent = true,
  className,
  contentClassName,
}: ModulePageShellProps) {
  return (
    <div className={cn('min-h-screen bg-theme-page text-theme-primary transition-colors duration-base', className)}>
      <div className="mx-auto max-w-7xl px-20 py-20">
        <PageHeader title={title} subtitle={subtitle} actions={actions} accent={accent} />
        <div className={cn('space-y-24', contentClassName)}>{children}</div>
      </div>
    </div>
  );
}

export default ModulePageShell;
