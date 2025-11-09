/**
 * ActionIcon Component
 *
 * A unified icon component for action buttons with consistent coloring and styling.
 * Automatically applies the correct color scheme based on the action type.
 */

import React from 'react';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  type ActionIconKey,
  type IconSizeKey,
  getActionIconConfig,
  getIconColorClasses,
  getIconSizeClasses,
} from '@/lib/constants/iconConfig';

interface ActionIconProps {
  action: ActionIconKey;
  size?: IconSizeKey;
  className?: string;
  includeBackground?: boolean;
}

/**
 * Renders an action icon with consistent coloring
 */
export function ActionIcon({
  action,
  size = 'sm',
  className,
  includeBackground = false,
}: ActionIconProps) {
  const config = getActionIconConfig(action);
  const Icon = config.icon;
  const colorClasses = getIconColorClasses(config.color, includeBackground);
  const sizeClasses = getIconSizeClasses(size);

  return (
    <Icon
      className={cn(colorClasses, sizeClasses, 'transition-colors', className)}
      aria-label={config.label}
    />
  );
}

interface CustomActionIconProps {
  icon: LucideIcon;
  colorKey: 'view' | 'edit' | 'delete' | 'create' | 'neutral' | 'primary';
  size?: IconSizeKey;
  className?: string;
  includeBackground?: boolean;
  label?: string;
}

/**
 * Renders a custom icon with specific color scheme
 */
export function CustomActionIcon({
  icon: Icon,
  colorKey,
  size = 'sm',
  className,
  includeBackground = false,
  label,
}: CustomActionIconProps) {
  const colorClasses = getIconColorClasses(colorKey, includeBackground);
  const sizeClasses = getIconSizeClasses(size);

  return (
    <Icon
      className={cn(colorClasses, sizeClasses, 'transition-colors', className)}
      aria-label={label}
    />
  );
}

export default ActionIcon;
