/**
 * ActionButtons Component
 *
 * Unified action buttons with consistent colored icons.
 * Uses the centralized icon configuration for consistent styling across the app.
 */

import React from 'react';
import { Eye, Edit2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { iconColors } from '@/lib/constants/iconConfig';

interface ActionButtonsProps {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  showView?: boolean;
  showEdit?: boolean;
  showDelete?: boolean;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
}

export function ActionButtons({
  onView,
  onEdit,
  onDelete,
  showView = true,
  showEdit = true,
  showDelete = true,
  disabled = false,
  compact = false,
  className
}: ActionButtonsProps) {
  const buttonClasses = compact
    ? "p-1.5 rounded-md"
    : "p-2 rounded-lg";

  const iconSize = compact ? "w-3.5 h-3.5" : "w-4 h-4";

  return (
    <div className={cn("flex items-center justify-end gap-1", className)}>
      {showView && onView && (
        <button
          onClick={onView}
          disabled={disabled}
          className={cn(
            buttonClasses,
            iconColors.view.full,
            iconColors.view.bg,
            "transition-all duration-200",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
          )}
          title="View details"
          aria-label="View details"
          type="button"
        >
          <Eye className={iconSize} />
        </button>
      )}

      {showEdit && onEdit && (
        <button
          onClick={onEdit}
          disabled={disabled}
          className={cn(
            buttonClasses,
            iconColors.edit.full,
            iconColors.edit.bg,
            "transition-all duration-200",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1"
          )}
          title="Edit"
          aria-label="Edit"
          type="button"
        >
          <Edit2 className={iconSize} />
        </button>
      )}

      {showDelete && onDelete && (
        <button
          onClick={onDelete}
          disabled={disabled}
          className={cn(
            buttonClasses,
            iconColors.delete.full,
            iconColors.delete.bg,
            "transition-all duration-200",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
          )}
          title="Delete"
          aria-label="Delete"
          type="button"
        >
          <Trash2 className={iconSize} />
        </button>
      )}
    </div>
  );
}
