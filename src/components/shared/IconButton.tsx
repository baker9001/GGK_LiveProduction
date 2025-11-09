/**
 * IconButton Component
 *
 * A unified button component with icon and consistent styling.
 * Provides automatic color schemes based on action type.
 */

import React from 'react';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  type ActionIconKey,
  type IconSizeKey,
  getActionIconConfig,
  iconColors,
  getIconSizeClasses,
} from '@/lib/constants/iconConfig';

interface IconButtonProps {
  action: ActionIconKey;
  onClick?: () => void;
  disabled?: boolean;
  size?: IconSizeKey;
  compact?: boolean;
  className?: string;
  title?: string;
  ariaLabel?: string;
  variant?: 'ghost' | 'subtle' | 'solid';
}

/**
 * Renders an action button with icon and consistent coloring
 */
export function IconButton({
  action,
  onClick,
  disabled = false,
  size = 'sm',
  compact = false,
  className,
  title,
  ariaLabel,
  variant = 'ghost',
}: IconButtonProps) {
  const config = getActionIconConfig(action);
  const Icon = config.icon;
  const colorScheme = iconColors[config.color];
  const sizeClasses = getIconSizeClasses(size);

  const baseClasses = compact ? 'p-1.5 rounded-md' : 'p-2 rounded-lg';

  const variantClasses = {
    ghost: `${colorScheme.full} ${colorScheme.bg}`,
    subtle: `${colorScheme.full} border border-transparent ${colorScheme.bg}`,
    solid: `bg-current text-white hover:opacity-90`,
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        baseClasses,
        variantClasses[variant],
        'transition-all duration-200',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        variant === 'solid' && `focus:ring-${config.color}`,
        className
      )}
      title={title || config.label}
      aria-label={ariaLabel || config.label}
      type="button"
    >
      <Icon className={cn(sizeClasses, variant === 'solid' && 'text-white')} />
    </button>
  );
}

interface CustomIconButtonProps {
  icon: LucideIcon;
  colorKey: 'view' | 'edit' | 'delete' | 'create' | 'neutral' | 'primary';
  onClick?: () => void;
  disabled?: boolean;
  size?: IconSizeKey;
  compact?: boolean;
  className?: string;
  title?: string;
  ariaLabel?: string;
  variant?: 'ghost' | 'subtle' | 'solid';
}

/**
 * Renders a custom icon button with specific color scheme
 */
export function CustomIconButton({
  icon: Icon,
  colorKey,
  onClick,
  disabled = false,
  size = 'sm',
  compact = false,
  className,
  title,
  ariaLabel,
  variant = 'ghost',
}: CustomIconButtonProps) {
  const colorScheme = iconColors[colorKey];
  const sizeClasses = getIconSizeClasses(size);

  const baseClasses = compact ? 'p-1.5 rounded-md' : 'p-2 rounded-lg';

  const variantClasses = {
    ghost: `${colorScheme.full} ${colorScheme.bg}`,
    subtle: `${colorScheme.full} border border-transparent ${colorScheme.bg}`,
    solid: `bg-current text-white hover:opacity-90`,
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        baseClasses,
        variantClasses[variant],
        'transition-all duration-200',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        className
      )}
      title={title}
      aria-label={ariaLabel}
      type="button"
    >
      <Icon className={cn(sizeClasses, variant === 'solid' && 'text-white')} />
    </button>
  );
}

export default IconButton;
