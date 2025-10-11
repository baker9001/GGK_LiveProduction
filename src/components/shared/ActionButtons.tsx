import React from 'react';
import { Eye, Edit2, Trash2 } from 'lucide-react';

interface ActionButtonsProps {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  showView?: boolean;
  showEdit?: boolean;
  showDelete?: boolean;
  disabled?: boolean;
  compact?: boolean;
}

export function ActionButtons({
  onView,
  onEdit,
  onDelete,
  showView = true,
  showEdit = true,
  showDelete = true,
  disabled = false,
  compact = false
}: ActionButtonsProps) {
  const buttonClasses = compact
    ? "p-1.5 rounded-md transition-colors"
    : "p-2 rounded-lg transition-colors";

  return (
    <div className="flex items-center justify-end gap-1">
      {showView && onView && (
        <button
          onClick={onView}
          disabled={disabled}
          className={`${buttonClasses} text-[#B2CACE] hover:bg-[#B2CACE]/10 dark:text-[#B2CACE] dark:hover:bg-[#B2CACE]/20 disabled:opacity-50 disabled:cursor-not-allowed`}
          title="View details"
          aria-label="View details"
        >
          <Eye className="w-4 h-4" />
        </button>
      )}

      {showEdit && onEdit && (
        <button
          onClick={onEdit}
          disabled={disabled}
          className={`${buttonClasses} text-[#99C93B] hover:bg-[#E8F5DC] dark:text-[#99C93B] dark:hover:bg-[#5D7E23]/20 disabled:opacity-50 disabled:cursor-not-allowed`}
          title="Edit"
          aria-label="Edit"
        >
          <Edit2 className="w-4 h-4" />
        </button>
      )}

      {showDelete && onDelete && (
        <button
          onClick={onDelete}
          disabled={disabled}
          className={`${buttonClasses} text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed`}
          title="Delete"
          aria-label="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
