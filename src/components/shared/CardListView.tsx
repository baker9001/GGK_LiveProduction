import React, { useState, ReactNode } from 'react';
import { Grid3x3, List, Eye, Edit2, Trash2 } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { ActionButtons } from './ActionButtons';
import { DataTable } from './DataTable';

interface CardListViewProps<T> {
  data: T[];
  renderCard: (item: T) => ReactNode;
  columns?: any[];
  keyField: string;
  loading?: boolean;
  emptyMessage?: string;
  onView?: (item: T) => void;
  onEdit?: (item: T) => void;
  onDelete?: (items: T[]) => void;
  defaultView?: 'card' | 'list';
  showViewToggle?: boolean;
  renderActions?: (item: T) => ReactNode;
}

export function CardListView<T extends Record<string, any>>({
  data,
  renderCard,
  columns = [],
  keyField,
  loading = false,
  emptyMessage = 'No items found',
  onView,
  onEdit,
  onDelete,
  defaultView = 'card',
  showViewToggle = true,
  renderActions
}: CardListViewProps<T>) {
  const [viewMode, setViewMode] = useState<'card' | 'list'>(defaultView);

  const handleDelete = (items: T[]) => {
    if (onDelete) {
      onDelete(items);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showViewToggle && (
        <div className="flex justify-end">
          <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-1">
            <button
              onClick={() => setViewMode('card')}
              className={`
                px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                ${viewMode === 'card'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }
              `}
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`
                px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                ${viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }
              `}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {data.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">{emptyMessage}</p>
        </div>
      ) : viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((item) => (
            <div
              key={item[keyField]}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="p-4">
                {renderCard(item)}
              </div>
              {(onView || onEdit || onDelete || renderActions) && (
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                  {renderActions ? (
                    renderActions(item)
                  ) : (
                    <ActionButtons
                      onView={onView ? () => onView(item) : undefined}
                      onEdit={onEdit ? () => onEdit(item) : undefined}
                      onDelete={onDelete ? () => handleDelete([item]) : undefined}
                      showView={!!onView}
                      showEdit={!!onEdit}
                      showDelete={!!onDelete}
                    />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <DataTable
          data={data}
          columns={columns}
          keyField={keyField}
          loading={loading}
          onEdit={onEdit}
          onDelete={handleDelete}
          renderActions={renderActions}
          emptyMessage={emptyMessage}
        />
      )}
    </div>
  );
}
