import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

interface PaginationControlsProps {
  page: number;
  rowsPerPage: number;
  totalCount: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onNextPage?: () => void;
  onPreviousPage?: () => void;
  onRowsPerPageChange?: (rowsPerPage: number) => void;
  rowsPerPageOptions?: number[];
  ariaLabel?: string;
  showingRange?: {
    start: number;
    end: number;
  };
  className?: string;
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({
  page,
  rowsPerPage,
  totalCount,
  totalPages,
  onPageChange,
  onNextPage,
  onPreviousPage,
  onRowsPerPageChange,
  rowsPerPageOptions = [10, 25, 50, 100],
  ariaLabel = 'Table pagination',
  showingRange,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const resolvedTotalPages = totalPages ?? Math.max(1, Math.ceil(totalCount / Math.max(rowsPerPage, 1)));
  const safePage = Math.min(Math.max(page, 1), resolvedTotalPages);
  const isFirstPage = safePage <= 1;
  const isLastPage = safePage >= resolvedTotalPages;

  const calculatedStart = totalCount === 0 ? 0 : (safePage - 1) * rowsPerPage + 1;
  const calculatedEnd = totalCount === 0
    ? 0
    : Math.min(showingRange?.end ?? safePage * rowsPerPage, totalCount);

  const displayStart = showingRange?.start ?? calculatedStart;
  const displayEnd = showingRange?.end ?? calculatedEnd;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [isOpen]);

  const handleSelectOption = (option: number) => {
    onRowsPerPageChange?.(option);
    setIsOpen(false);
  };

  return (
    <nav
      className={cn(
        'brand-pagination px-4 py-3 border-t flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
      aria-label={ariaLabel}
    >
      <div className="flex items-center gap-3">
        <label htmlFor="rows-per-page" className="brand-pagination__text text-sm font-semibold">
          Rows per page
        </label>
        <div className="relative">
          <button
            ref={buttonRef}
            type="button"
            id="rows-per-page"
            className={cn(
              'brand-select brand-pagination__select appearance-none w-20 rounded-md border px-3 py-1.5 pr-8 text-sm font-semibold shadow-sm transition focus-visible:outline-none bg-theme-surface text-theme-primary border-theme hover:border-[#8CC63F] focus:ring-2 focus:ring-[#8CC63F] focus:border-[#8CC63F]',
              isOpen && 'ring-2 ring-[#8CC63F] border-[#8CC63F]'
            )}
            aria-label="Rows per page"
            onClick={() => setIsOpen(!isOpen)}
            aria-expanded={isOpen}
            aria-haspopup="listbox"
          >
            <span>{rowsPerPage}</span>
          </button>
          <div className="brand-pagination__icon pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <ChevronDownIcon />
          </div>

          {/* Custom Dropdown */}
          {isOpen && (
            <div
              ref={dropdownRef}
              className="absolute z-50 mt-1 w-20 rounded-md border border-theme shadow-lg bg-card"
              role="listbox"
              aria-labelledby="rows-per-page"
            >
              <div className="py-1 bg-card">
                {rowsPerPageOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    role="option"
                    aria-selected={rowsPerPage === option}
                    className={cn(
                      'w-full px-4 py-2 text-left text-sm transition-colors',
                      'hover:bg-[#e8f5dc] dark:hover:bg-[#8CC63F]/20',
                      rowsPerPage === option
                        ? 'bg-[#d4edc4] dark:bg-[#8CC63F]/30 text-[#5d7e23] dark:text-[#9ed050] font-semibold'
                        : 'text-gray-900 dark:text-gray-100'
                    )}
                    onClick={() => handleSelectOption(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <span className="brand-pagination__text hidden text-sm font-medium sm:inline">
          Showing <span>{displayStart}</span> - <span>{displayEnd}</span> of <span>{totalCount}</span>
        </span>
      </div>

      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <span className="brand-pagination__text text-sm font-medium sm:hidden">
          Page {safePage} of {Math.max(resolvedTotalPages, 1)}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (isFirstPage) return;
              if (onPreviousPage) {
                onPreviousPage();
              } else if (onPageChange) {
                onPageChange(safePage - 1);
              }
            }}
            disabled={isFirstPage}
            className="brand-pagination-icon-button inline-flex h-9 w-9 items-center justify-center rounded-full focus:outline-none disabled:cursor-not-allowed"
            aria-label="Go to previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="brand-pagination__text hidden text-sm font-semibold sm:inline">
            Page {safePage} of {Math.max(resolvedTotalPages, 1)}
          </span>
          <button
            type="button"
            onClick={() => {
              if (isLastPage) return;
              if (onNextPage) {
                onNextPage();
              } else if (onPageChange) {
                onPageChange(safePage + 1);
              }
            }}
            disabled={isLastPage}
            className="brand-pagination-icon-button inline-flex h-9 w-9 items-center justify-center rounded-full focus:outline-none disabled:cursor-not-allowed"
            aria-label="Go to next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </nav>
  );
};

const ChevronDownIcon = () => (
  <svg
    className="h-4 w-4"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
      clipRule="evenodd"
    />
  </svg>
);

