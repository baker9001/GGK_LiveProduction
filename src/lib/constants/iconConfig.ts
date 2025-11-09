/**
 * Unified Icon Configuration
 *
 * Centralized configuration for all icons used throughout the application.
 * Provides consistent colors, sizes, and icon mappings for actions, statuses, and common operations.
 */

import {
  Eye,
  Edit2,
  Pencil,
  Trash2,
  Plus,
  Minus,
  X,
  Check,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  Clock,
  Calendar,
  UserPlus,
  UserMinus,
  Users,
  Save,
  Upload,
  Download,
  Search,
  Filter,
  Archive,
  Copy,
  RefreshCw,
  Settings,
  MoreVertical,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  type LucideIcon
} from 'lucide-react';

// ============================================================================
// ICON COLOR SCHEMES
// ============================================================================

export const iconColors = {
  // Action colors
  view: {
    light: 'text-blue-600 hover:text-blue-700',
    dark: 'dark:text-blue-400 dark:hover:text-blue-300',
    bg: 'hover:bg-blue-50 dark:hover:bg-blue-900/20',
    full: 'text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300',
    solid: '#3b82f6',
  },
  edit: {
    light: 'text-amber-600 hover:text-amber-700',
    dark: 'dark:text-amber-400 dark:hover:text-amber-300',
    bg: 'hover:bg-amber-50 dark:hover:bg-amber-900/20',
    full: 'text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300',
    solid: '#f59e0b',
  },
  delete: {
    light: 'text-red-600 hover:text-red-700',
    dark: 'dark:text-red-400 dark:hover:text-red-300',
    bg: 'hover:bg-red-50 dark:hover:bg-red-900/20',
    full: 'text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300',
    solid: '#ef4444',
  },
  create: {
    light: 'text-green-600 hover:text-green-700',
    dark: 'dark:text-green-400 dark:hover:text-green-300',
    bg: 'hover:bg-green-50 dark:hover:bg-green-900/20',
    full: 'text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300',
    solid: '#10b981',
  },

  // Status colors
  active: {
    light: 'text-green-600',
    dark: 'dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-900/20',
    full: 'text-green-600 dark:text-green-400',
    solid: '#10b981',
  },
  inactive: {
    light: 'text-red-600',
    dark: 'dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-900/20',
    full: 'text-red-600 dark:text-red-400',
    solid: '#ef4444',
  },
  pending: {
    light: 'text-yellow-600',
    dark: 'dark:text-yellow-400',
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    full: 'text-yellow-600 dark:text-yellow-400',
    solid: '#eab308',
  },
  warning: {
    light: 'text-orange-600',
    dark: 'dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    full: 'text-orange-600 dark:text-orange-400',
    solid: '#f97316',
  },
  info: {
    light: 'text-blue-600',
    dark: 'dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    full: 'text-blue-600 dark:text-blue-400',
    solid: '#3b82f6',
  },
  success: {
    light: 'text-green-600',
    dark: 'dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-900/20',
    full: 'text-green-600 dark:text-green-400',
    solid: '#10b981',
  },

  // Neutral colors
  neutral: {
    light: 'text-gray-600 hover:text-gray-700',
    dark: 'dark:text-gray-400 dark:hover:text-gray-300',
    bg: 'hover:bg-gray-50 dark:hover:bg-gray-800/50',
    full: 'text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300',
    solid: '#6b7280',
  },

  // Primary brand color
  primary: {
    light: 'text-[#8CC63F] hover:text-[#7AB635]',
    dark: 'dark:text-[#8CC63F] dark:hover:text-[#9ed050]',
    bg: 'hover:bg-green-50 dark:hover:bg-green-900/20',
    full: 'text-[#8CC63F] hover:text-[#7AB635] dark:text-[#8CC63F] dark:hover:text-[#9ed050]',
    solid: '#8CC63F',
  },
} as const;

// ============================================================================
// ICON SIZE MAPPINGS
// ============================================================================

export const iconSizes = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
  xl: 'h-8 w-8',
} as const;

// ============================================================================
// ACTION ICON MAPPINGS
// ============================================================================

export const actionIcons = {
  view: Eye,
  edit: Edit2,
  editAlt: Pencil,
  delete: Trash2,
  add: Plus,
  remove: Minus,
  close: X,
  confirm: Check,
  save: Save,
  upload: Upload,
  download: Download,
  search: Search,
  filter: Filter,
  archive: Archive,
  copy: Copy,
  refresh: RefreshCw,
  settings: Settings,
  more: MoreVertical,
  addUser: UserPlus,
  removeUser: UserMinus,
  users: Users,
} as const;

// ============================================================================
// STATUS ICON MAPPINGS
// ============================================================================

export const statusIcons = {
  active: CheckCircle2,
  inactive: XCircle,
  pending: Clock,
  scheduled: Calendar,
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
  alert: AlertCircle,
} as const;

// ============================================================================
// NAVIGATION ICON MAPPINGS
// ============================================================================

export const navigationIcons = {
  next: ChevronRight,
  previous: ChevronLeft,
  expand: ChevronDown,
  collapse: ChevronUp,
} as const;

// ============================================================================
// ICON CONFIGURATION TYPES
// ============================================================================

export type IconColorKey = keyof typeof iconColors;
export type IconSizeKey = keyof typeof iconSizes;
export type ActionIconKey = keyof typeof actionIcons;
export type StatusIconKey = keyof typeof statusIcons;
export type NavigationIconKey = keyof typeof navigationIcons;

export interface IconConfig {
  icon: LucideIcon;
  color: IconColorKey;
  size?: IconSizeKey;
  label?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get icon color classes for a given color key
 */
export function getIconColorClasses(
  colorKey: IconColorKey,
  includeBackground: boolean = false
): string {
  const colors = iconColors[colorKey];
  const baseClasses = `${colors.light} ${colors.dark}`;
  return includeBackground ? `${baseClasses} ${colors.bg}` : baseClasses;
}

/**
 * Get icon size classes for a given size key
 */
export function getIconSizeClasses(sizeKey: IconSizeKey = 'sm'): string {
  return iconSizes[sizeKey];
}

/**
 * Get a complete icon configuration for an action
 */
export function getActionIconConfig(action: ActionIconKey): IconConfig {
  const iconMap: Record<ActionIconKey, IconConfig> = {
    view: { icon: Eye, color: 'view', label: 'View' },
    edit: { icon: Edit2, color: 'edit', label: 'Edit' },
    editAlt: { icon: Pencil, color: 'edit', label: 'Edit' },
    delete: { icon: Trash2, color: 'delete', label: 'Delete' },
    add: { icon: Plus, color: 'create', label: 'Add' },
    remove: { icon: Minus, color: 'delete', label: 'Remove' },
    close: { icon: X, color: 'neutral', label: 'Close' },
    confirm: { icon: Check, color: 'success', label: 'Confirm' },
    save: { icon: Save, color: 'primary', label: 'Save' },
    upload: { icon: Upload, color: 'primary', label: 'Upload' },
    download: { icon: Download, color: 'primary', label: 'Download' },
    search: { icon: Search, color: 'neutral', label: 'Search' },
    filter: { icon: Filter, color: 'neutral', label: 'Filter' },
    archive: { icon: Archive, color: 'warning', label: 'Archive' },
    copy: { icon: Copy, color: 'neutral', label: 'Copy' },
    refresh: { icon: RefreshCw, color: 'neutral', label: 'Refresh' },
    settings: { icon: Settings, color: 'neutral', label: 'Settings' },
    more: { icon: MoreVertical, color: 'neutral', label: 'More' },
    addUser: { icon: UserPlus, color: 'create', label: 'Add User' },
    removeUser: { icon: UserMinus, color: 'delete', label: 'Remove User' },
    users: { icon: Users, color: 'info', label: 'Users' },
  };

  return iconMap[action];
}

/**
 * Get a complete icon configuration for a status
 */
export function getStatusIconConfig(status: StatusIconKey): IconConfig {
  const iconMap: Record<StatusIconKey, IconConfig> = {
    active: { icon: CheckCircle2, color: 'active', label: 'Active' },
    inactive: { icon: XCircle, color: 'inactive', label: 'Inactive' },
    pending: { icon: Clock, color: 'pending', label: 'Pending' },
    scheduled: { icon: Calendar, color: 'info', label: 'Scheduled' },
    success: { icon: CheckCircle2, color: 'success', label: 'Success' },
    error: { icon: XCircle, color: 'inactive', label: 'Error' },
    warning: { icon: AlertTriangle, color: 'warning', label: 'Warning' },
    info: { icon: Info, color: 'info', label: 'Info' },
    alert: { icon: AlertCircle, color: 'warning', label: 'Alert' },
  };

  return iconMap[status];
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  colors: iconColors,
  sizes: iconSizes,
  actions: actionIcons,
  statuses: statusIcons,
  navigation: navigationIcons,
  getColorClasses: getIconColorClasses,
  getSizeClasses: getIconSizeClasses,
  getActionConfig: getActionIconConfig,
  getStatusConfig: getStatusIconConfig,
};
