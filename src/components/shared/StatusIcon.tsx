/**
 * StatusIcon Component
 *
 * A unified icon component for status indicators with consistent coloring.
 * Automatically applies the correct color and icon based on status type.
 */

import React from 'react';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  type StatusIconKey,
  type IconSizeKey,
  getStatusIconConfig,
  getIconColorClasses,
  getIconSizeClasses,
} from '@/lib/constants/iconConfig';

interface StatusIconProps {
  status: StatusIconKey | string;
  size?: IconSizeKey;
  className?: string;
  showBackground?: boolean;
  label?: string;
}

/**
 * Renders a status icon with consistent coloring
 * Supports both predefined status types and custom status strings
 */
export function StatusIcon({
  status,
  size = 'sm',
  className,
  showBackground = false,
  label,
}: StatusIconProps) {
  // Normalize status for comparison
  const normalizedStatus = status?.toLowerCase() as StatusIconKey;

  // Try to get predefined config, fallback to info for unknown statuses
  let config;
  try {
    config = getStatusIconConfig(normalizedStatus);
  } catch {
    config = getStatusIconConfig('info');
  }

  const Icon = config.icon;
  const colorClasses = getIconColorClasses(config.color, showBackground);
  const sizeClasses = getIconSizeClasses(size);

  return (
    <Icon
      className={cn(colorClasses, sizeClasses, 'transition-colors', className)}
      aria-label={label || config.label}
    />
  );
}

interface CustomStatusIconProps {
  icon: LucideIcon;
  colorKey: 'active' | 'inactive' | 'pending' | 'warning' | 'info' | 'success';
  size?: IconSizeKey;
  className?: string;
  showBackground?: boolean;
  label?: string;
}

/**
 * Renders a custom status icon with specific color scheme
 */
export function CustomStatusIcon({
  icon: Icon,
  colorKey,
  size = 'sm',
  className,
  showBackground = false,
  label,
}: CustomStatusIconProps) {
  const colorClasses = getIconColorClasses(colorKey, showBackground);
  const sizeClasses = getIconSizeClasses(size);

  return (
    <Icon
      className={cn(colorClasses, sizeClasses, 'transition-colors', className)}
      aria-label={label}
    />
  );
}

export default StatusIcon;
