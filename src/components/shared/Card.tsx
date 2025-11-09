/**
 * Card Component - GGK Design System
 *
 * A versatile card component with consistent styling, elevation,
 * and support for headers, content, and footers.
 */

import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'outlined' | 'elevated' | 'glass' | 'dark-glass';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({
  children,
  className,
  variant = 'default',
  padding = 'md',
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-ggk-2xl transition-all duration-base',
        {
          'bg-white shadow-ggk-md': variant === 'default',
          'bg-white shadow-ggk-lg hover:shadow-ggk-xl': variant === 'elevated',
          'bg-white border border-ggk-neutral-200 dark:border-ggk-neutral-700 shadow-ggk-sm': variant === 'outlined',
          'bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 shadow-2xl': variant === 'glass',
          'bg-slate-900/60 backdrop-blur-2xl border border-slate-600/30 shadow-2xl': variant === 'dark-glass',
          'p-0': padding === 'none',
          'p-16': padding === 'sm',
          'p-24': padding === 'md',
          'p-32': padding === 'lg',
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  accent?: boolean;
}

export function CardHeader({
  children,
  className,
  accent = false,
  ...props
}: CardHeaderProps) {
  return (
    <div
      className={cn(
        'pb-16 mb-16',
        {
          'border-b-4 border-ggk-primary-500': accent,
          'border-b border-ggk-neutral-200 dark:border-ggk-neutral-700': !accent,
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

export function CardTitle({
  children,
  className,
  as: Component = 'h3',
  ...props
}: CardTitleProps) {
  return (
    <Component
      className={cn(
        'text-xl font-semibold text-ggk-neutral-900 dark:text-ggk-neutral-50 tracking-tight',
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

export function CardDescription({
  children,
  className,
  ...props
}: CardDescriptionProps) {
  return (
    <p
      className={cn(
        'mt-8 text-sm text-ggk-neutral-600 dark:text-ggk-neutral-400 leading-relaxed',
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
}

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function CardContent({
  children,
  className,
  ...props
}: CardContentProps) {
  return (
    <div
      className={cn('space-y-16', className)}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  align?: 'left' | 'center' | 'right' | 'between';
}

export function CardFooter({
  children,
  className,
  align = 'right',
  ...props
}: CardFooterProps) {
  return (
    <div
      className={cn(
        'pt-16 mt-16 border-t border-ggk-neutral-200 dark:border-ggk-neutral-700 flex gap-12',
        {
          'justify-start': align === 'left',
          'justify-center': align === 'center',
          'justify-end': align === 'right',
          'justify-between': align === 'between',
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
