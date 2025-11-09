/**
 * File: /src/components/shared/DataTable.tsx
 * 
 * Generic DataTable Component
 * A reusable table component with sorting, pagination, and selection
 * 
 * This is a SHARED component - it should NOT have any business-specific imports
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Edit2, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './Button';
import { DataTableSkeleton } from './DataTableSkeleton';
import { PaginationControls } from './PaginationControls';
import { iconColors } from '../../lib/constants/iconConfig';

export interface Column<T> {
  id: string;
  header: string;
  accessorKey?: keyof T;
  accessorFn?: (row: T) => React.ReactNode;
  enableSorting?: boolean;
  cell?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyField: keyof T;
  onEdit?: (row: T) => void;
  onDelete?: (rows: T[]) => void;
  emptyMessage?: string;
  className?: string;
  loading?: boolean;
  renderActions?: (row: T) => React.ReactNode;
  getRowClassName?: (row: T) => string;
  onSelectionChange?: (selectedIds: Array<string | number>) => void;
  isFetching?: boolean;
  pagination?: {
    ariaLabel?: string;
    page: number;
    rowsPerPage: number;
    totalCount: number;
    totalPages: number;
    goToPage: (page: number) => void;
    nextPage: () => void;
    previousPage: () => void;
    changeRowsPerPage: (rowsPerPage: number) => void;
  };
  sorting?: {
    sort: { column: string; ascending: boolean };
    handleSort: (column: string) => void;
  };
  caption?: string;
  ariaLabel?: string;
}

export function DataTable<T>({
  data,
  columns,
  keyField,
  onEdit,
  onDelete,
  emptyMessage = 'No data available',
  className,
  loading = false,
  renderActions,
  getRowClassName,
  onSelectionChange,
  isFetching = false,
  pagination,
  sorting,
  caption,
  ariaLabel = "Data table",
}: DataTableProps<T>) {
  const [selectedRows, setSelectedRows] = useState<Set<string | number>>(new Set());
  
  // If pagination is not provided, use internal state
  const [internalPage, setInternalPage] = useState(1);
  const [internalRowsPerPage, setInternalRowsPerPage] = useState(10);
  
  // Use provided pagination or internal state
  const page = pagination?.page || internalPage;
  const rowsPerPage = pagination?.rowsPerPage || internalRowsPerPage;
  const totalPages = pagination?.totalPages || Math.ceil((pagination?.totalCount || data.length) / rowsPerPage);
  
  // Calculate data slice for internal pagination
  const startIndex = pagination ? 0 : (page - 1) * rowsPerPage;
  const endIndex = pagination ? data.length : startIndex + rowsPerPage;
  const paginatedData = pagination ? data : data.slice(startIndex, endIndex);

  const displayTotal = pagination?.totalCount ?? data.length;
  const displayStart = data.length > 0 ? (pagination ? (page - 1) * rowsPerPage + 1 : startIndex + 1) : 0;
  const displayEnd = data.length > 0
    ? (pagination
      ? Math.min((page - 1) * rowsPerPage + data.length, displayTotal)
      : Math.min(endIndex, displayTotal))
    : 0;
  
  // Row selection
  const allRowsSelected = 
    data.length > 0 && selectedRows.size === data.length;
  
  const someRowsSelected = 
    selectedRows.size > 0 && selectedRows.size < data.length;
  
  const toggleSelectAll = () => {
    if (allRowsSelected) {
      setSelectedRows(new Set());
      if (onSelectionChange) {
        onSelectionChange([]);
      }
    } else {
      const newSelected = new Set<string | number>();
      data.forEach(row => {
        const key = String(row[keyField]);
        newSelected.add(key);
      });
      setSelectedRows(newSelected);
      if (onSelectionChange) {
        onSelectionChange(Array.from(newSelected));
      }
    }
  };
  
  const toggleRowSelection = (key: string | number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedRows(newSelected);
    if (onSelectionChange) {
      onSelectionChange(Array.from(newSelected));
    }
  };
  
  // Row actions
  const handleBulkDelete = () => {
    if (onDelete && selectedRows.size > 0) {
      const rowsToDelete = data.filter(row => 
        selectedRows.has(String(row[keyField]))
      );
      onDelete(rowsToDelete);
      setSelectedRows(new Set());
      if (onSelectionChange) {
        onSelectionChange([]);
      }
    }
  };

  // If loading and no data, show skeleton
  if (loading && data.length === 0) {
    return <DataTableSkeleton columns={columns.length} rows={rowsPerPage} />;
  }
  
  return (
    <div className={cn('bg-card rounded-lg shadow-md border border-filter transition-colors duration-200', className)} role="region" aria-label={ariaLabel}>
      {/* Bulk actions */}
      {selectedRows.size > 0 && onDelete && (
        <div className="bg-[#8CC63F]/10 dark:bg-[#8CC63F]/20 px-4 py-3 border-b border-[#8CC63F]/30 dark:border-[#8CC63F]/40 flex items-center justify-between">
          <span className="text-sm font-medium text-[#5d7e23] dark:text-[#9ed050]">
            {selectedRows.size} {selectedRows.size === 1 ? 'item' : 'items'} selected
          </span>
          <Button
            variant="destructive"
            size="sm"
            leftIcon={<Trash2 className="h-4 w-4" />}
            onClick={handleBulkDelete}
          >
            Delete Selected
          </Button>
        </div>
      )}

      {/* Loading indicator */}
      {isFetching && (
        <div className="absolute inset-0 bg-card/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
          <div className="h-8 w-8 border-4 border-t-[#8CC63F] border-[#8CC63F]/20 rounded-full animate-spin"></div>
        </div>
      )}
      
      {/* Table */}
      <div className="overflow-x-auto relative">
        <table
          className="min-w-full"
          role="table"
          aria-label={ariaLabel}
        >
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className="bg-table-header">
            <tr>
              {/* Checkbox column */}
              <th scope="col" className="px-6 py-3 w-12" aria-label="Select all rows">
                <div className="flex items-center justify-center">
                  <input
                    id="select-all-checkbox"
                    type="checkbox"
                    className="h-4 w-4 text-[#8CC63F] rounded border-filter focus:ring-[#8CC63F] focus:ring-offset-0 dark:bg-gray-700"
                    checked={allRowsSelected}
                    ref={input => input && (input.indeterminate = someRowsSelected)}
                    onChange={toggleSelectAll}
                  />
                </div>
                <label htmlFor="select-all-checkbox" className="sr-only">Select all rows</label>
              </th>

              {/* Data columns */}
              {columns.map(column => (
                <th
                  key={column.id}
                  scope="col"
                  className={cn(
                    'px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider',
                    column.enableSorting !== false && 'cursor-pointer select-none hover:text-[#5d7e23] dark:hover:text-[#9ed050] focus:outline-none focus:ring-2 focus:ring-[#8CC63F] focus:ring-offset-2'
                  )}
                  tabIndex={column.enableSorting !== false ? 0 : -1}
                  role={column.enableSorting !== false ? "button" : undefined}
                  aria-sort={
                    sorting && sorting.sort.column === column.id
                      ? sorting.sort.ascending
                        ? "ascending"
                        : "descending"
                      : column.enableSorting !== false
                        ? "none"
                        : undefined
                  }
                  onClick={() => {
                    if (column.enableSorting !== false) {
                      if (sorting) {
                        sorting.handleSort(column.id);
                      }
                    }
                  }}
                  onKeyDown={(e) => {
                    if (column.enableSorting !== false && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      if (sorting) {
                        sorting.handleSort(column.id);
                      }
                    }
                  }}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.header}</span>
                    {column.enableSorting !== false && (
                      <span className="inline-flex flex-col">
                        <ChevronUp
                          className={cn(
                            "h-3 w-3",
                            sorting && sorting.sort.column === column.id && sorting.sort.ascending
                              ? 'text-gray-900 dark:text-gray-100'
                              : 'text-gray-400 dark:text-gray-600'
                          )}
                          aria-hidden="true"
                        />
                        <ChevronDown
                          className={cn(
                            "h-3 w-3 -mt-1",
                            sorting && sorting.sort.column === column.id && !sorting.sort.ascending
                              ? 'text-gray-900 dark:text-gray-100'
                              : 'text-gray-400 dark:text-gray-600'
                          )}
                          aria-hidden="true"
                        />
                      </span>
                    )}
                  </div>
                </th>
              ))}
              
              {/* Actions column */}
              {(onEdit || onDelete || renderActions) && (
                <th scope="col" className="px-6 py-3 w-24" aria-label="Actions">
                  <span className="sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>
          
          <tbody className="bg-table-row divide-y divide-gray-200 dark:divide-gray-700">
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + ((onEdit || onDelete || renderActions) ? 2 : 1)}
                  className="px-6 py-8 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, index) => {
                const rowKey = String(row[keyField]);
                const isSelected = selectedRows.has(rowKey);

                return (
                  <tr
                    key={rowKey}
                    className={cn(
                      'transition-colors duration-200',
                      isSelected && 'bg-table-row-selected',
                      !isSelected && index % 2 === 1 && 'bg-table-row-alt',
                      getRowClassName?.(row),
                      !getRowClassName?.(row) && !isSelected && 'hover:bg-table-row-hover'
                    )}
                    role="row"
                  >
                    {/* Checkbox */}
                    <td className="px-6 py-4 whitespace-nowrap w-12">
                      <div className="flex items-center justify-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-[#8CC63F] rounded border-filter focus:ring-[#8CC63F] focus:ring-offset-0 dark:bg-gray-700"
                          aria-label={`Select row ${rowKey}`}
                          checked={isSelected}
                          onChange={() => toggleRowSelection(rowKey)}
                        />
                      </div>
                    </td>
                    
                    {/* Data cells */}
                    {columns.map(column => (
                      <td key={column.id} className="px-6 py-4 whitespace-nowrap" role="cell">
                        {column.cell ? (
                          column.cell(row)
                        ) : column.accessorFn ? (
                          column.accessorFn(row)
                        ) : column.accessorKey ? (
                          <span className="text-sm text-gray-900 dark:text-gray-100">
                            {String(row[column.accessorKey] ?? '')}
                          </span>
                        ) : null}
                      </td>
                    ))}
                    
                    {/* Actions */}
                    {(onEdit || onDelete || renderActions) && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium w-24" role="cell">
                        {renderActions ? (
                          renderActions(row)
                        ) : (
                          <div className="flex items-center justify-end space-x-2">
                            {onEdit && (
                              <button
                                onClick={() => onEdit(row)}
                                className={`${iconColors.edit.full} ${iconColors.edit.bg} p-1 rounded-full transition-colors`}
                                aria-label={`Edit row ${rowKey}`}
                                title="Edit"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                            )}
                            {onDelete && (
                              <button
                                onClick={() => onDelete([row])}
                                className={`${iconColors.delete.full} ${iconColors.delete.bg} p-1 rounded-full transition-colors`}
                                aria-label={`Delete row ${rowKey}`}
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <PaginationControls
        page={page}
        rowsPerPage={rowsPerPage}
        totalCount={displayTotal}
        totalPages={totalPages}
        onPageChange={(newPage) => {
          if (pagination) {
            pagination.goToPage(newPage);
          } else {
            setInternalPage(newPage);
          }
        }}
        onNextPage={() => {
          if (pagination) {
            pagination.nextPage();
          } else {
            setInternalPage(prev => Math.min(prev + 1, totalPages));
          }
        }}
        onPreviousPage={() => {
          if (pagination) {
            pagination.previousPage();
          } else {
            setInternalPage(prev => Math.max(prev - 1, 1));
          }
        }}
        onRowsPerPageChange={(newRowsPerPage) => {
          if (pagination) {
            pagination.changeRowsPerPage(newRowsPerPage);
          } else {
            setInternalRowsPerPage(newRowsPerPage);
            setInternalPage(1);
          }
        }}
        showingRange={{
          start: displayStart,
          end: displayEnd,
        }}
        ariaLabel={pagination?.ariaLabel || "Table pagination"}
      />
    </div>
  );
}