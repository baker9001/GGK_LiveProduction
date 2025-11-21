/**
 * Centralized Theme Configuration
 *
 * This file defines the system's color scheme and styling standards.
 * ALL components should import and use these values to ensure consistency.
 *
 * System Primary Color: Green (#8CC63F)
 */

// Primary Color Values
export const SYSTEM_COLORS = {
  primary: '#8CC63F',
  primaryDark: '#7AB635',
  primaryLight: '#9AD74F',
} as const;

// Tailwind Classes for Active/Selected States
export const ACTIVE_STATE_CLASSES = {
  light: {
    background: 'bg-green-100',
    text: 'text-green-700',
    border: 'border-green-200',
    ring: 'ring-green-500',
    hover: 'hover:bg-green-50',
  },
  dark: {
    background: 'dark:bg-green-900/40',
    text: 'dark:text-green-300',
    border: 'dark:border-green-700/50',
    ring: 'dark:ring-green-600',
    hover: 'dark:hover:bg-green-900/30',
  },
} as const;

// Combined Active State Class String
export const ACTIVE_STATE_CLASS =
  'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700/50';

// Hover State Classes
export const HOVER_STATE_CLASSES = {
  light: {
    background: 'hover:bg-green-50',
    text: 'hover:text-green-600',
    border: 'hover:border-green-300',
  },
  dark: {
    background: 'dark:hover:bg-green-900/20',
    text: 'dark:hover:text-green-400',
    border: 'dark:hover:border-green-700',
  },
} as const;

// Combined Hover State Class String
export const HOVER_STATE_CLASS =
  'hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-900/20 dark:hover:text-green-400';

// Success/Positive State Classes
export const SUCCESS_STATE_CLASSES = {
  light: {
    background: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    icon: 'text-green-600',
  },
  dark: {
    background: 'dark:bg-green-900/20',
    text: 'dark:text-green-300',
    border: 'dark:border-green-700',
    icon: 'dark:text-green-400',
  },
} as const;

// Combined Success State Class String
export const SUCCESS_STATE_CLASS =
  'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-700';

// Primary Button Classes
export const PRIMARY_BUTTON_CLASS =
  'bg-green-600 text-white hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 border-green-600 dark:border-green-600';

// Ring/Focus Classes
export const FOCUS_RING_CLASS =
  'focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-600 dark:focus:ring-offset-gray-800';

// Badge Classes
export const BADGE_CLASSES = {
  green: {
    light: 'bg-green-100 text-green-700',
    dark: 'dark:bg-green-900/30 dark:text-green-300',
  },
} as const;

export const BADGE_GREEN_CLASS =
  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';

// Link Classes
export const LINK_CLASS =
  'text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300';

// Icon Classes
export const ICON_ACTIVE_CLASS =
  'text-green-600 dark:text-green-400';

// Gradient Classes
export const GRADIENT_CLASS =
  'bg-gradient-to-r from-[#8CC63F]/95 to-[#7AB635]/95';

/**
 * Helper function to generate consistent active state classes
 */
export function getActiveStateClass(isActive: boolean, baseClass: string = ''): string {
  if (!isActive) return baseClass;

  return `${baseClass} ${ACTIVE_STATE_CLASS}`.trim();
}

/**
 * Helper function to generate consistent hover state classes
 */
export function getHoverClass(baseClass: string = ''): string {
  return `${baseClass} ${HOVER_STATE_CLASS}`.trim();
}

/**
 * Helper function to generate consistent success state classes
 */
export function getSuccessClass(baseClass: string = ''): string {
  return `${baseClass} ${SUCCESS_STATE_CLASS}`.trim();
}

/**
 * Usage Examples:
 *
 * // Active state button
 * <button className={getActiveStateClass(isActive, 'px-4 py-2 rounded')}>
 *
 * // Active state with custom classes
 * <button className={cn('px-4 py-2', isActive && ACTIVE_STATE_CLASS)}>
 *
 * // Hover effect
 * <div className={getHoverClass('p-4 rounded-lg')}>
 *
 * // Success message
 * <div className={getSuccessClass('p-4 rounded-lg')}>
 *
 * // Primary button
 * <button className={cn(PRIMARY_BUTTON_CLASS, 'px-6 py-2 rounded-lg')}>
 *
 * // Badge
 * <span className={BADGE_GREEN_CLASS}>Active</span>
 *
 * // Link
 * <a href="#" className={LINK_CLASS}>Learn more</a>
 */
