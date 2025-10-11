/**
 * File: /src/components/shared/SearchableMultiSelect.tsx
 * 
 * Searchable Multi-Select Component with Portal Support
 * FIXED: Improved text contrast for selected items (darker green)
 */

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, ChevronDown, Plus } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Option {
  label: string;
  value: string;
}

interface SearchableMultiSelectProps {
  label: string;
  options: Option[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  isMulti?: boolean;
  isSearchable?: boolean;
  disabled?: boolean;
  error?: string;
  usePortal?: boolean;
  onCreateNew?: (searchTerm: string) => Promise<string | null>;
  className?: string; // Added to support custom theming
}

// Type declaration for the global window object
declare global {
  interface Window {
    __registerSlideInFormPortal?: (element: HTMLElement) => () => void;
  }
}

export function SearchableMultiSelect({
  label,
  options,
  selectedValues,
  onChange,
  placeholder = 'Select options...',
  isMulti = true,
  isSearchable = true,
  disabled = false,
  error,
  usePortal = true,
  onCreateNew,
  className
}: SearchableMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, openUpward: false });
  const [isCreating, setIsCreating] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const unregisterPortalRef = useRef<(() => void) | null>(null);

  // Always use green theme for consistency
  const isGreenTheme = true;

  // Ensure selectedValues is always an array
  const safeSelectedValues = Array.isArray(selectedValues) ? selectedValues : [];

  const selectedOptions = options.filter(option => 
    safeSelectedValues.includes(option.value)
  );

  const filteredOptions = options.filter(option =>
    option && 
    option.label && 
    option.value &&
    option.label.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (!isMulti ? !safeSelectedValues.includes(option.value) : true)
  );

  // Determine if we should show the "Create New" option
  const shouldShowCreateOption = 
    onCreateNew && 
    isSearchable && 
    searchTerm.trim().length > 0 && 
    !filteredOptions.some(option => 
      option.label.toLowerCase() === searchTerm.toLowerCase()
    );

  // Update dropdown position with intelligent placement
  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const dropdownMaxHeight = 400;
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;

      // Determine if dropdown should open upward or downward
      const shouldOpenUpward = spaceBelow < dropdownMaxHeight && spaceAbove > spaceBelow;

      setPosition({
        top: shouldOpenUpward
          ? rect.top + window.scrollY - Math.min(dropdownMaxHeight, spaceAbove - 10)
          : rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        openUpward: shouldOpenUpward
      });
    }
  };

  // Handle opening the dropdown
  const handleOpen = () => {
    if (disabled) return;
    updatePosition();
    setIsOpen(true);
    // Focus search input after a small delay
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 10);
  };

  // Close dropdown and reset search
  const handleClose = () => {
    setIsOpen(false);
    setSearchTerm('');
  };

  // Register portal with SlideInForm if inside one
  useEffect(() => {
    if (isOpen && usePortal && dropdownRef.current) {
      // Check if we're inside a SlideInForm
      if (window.__registerSlideInFormPortal) {
        // Register the portal element
        unregisterPortalRef.current = window.__registerSlideInFormPortal(dropdownRef.current);
      }
    }
    
    return () => {
      // Unregister the portal when component unmounts or dropdown closes
      if (unregisterPortalRef.current) {
        unregisterPortalRef.current();
        unregisterPortalRef.current = null;
      }
    };
  }, [isOpen, usePortal]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        triggerRef.current && 
        !triggerRef.current.contains(event.target as Node) &&
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node)
      ) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close dropdown on escape key
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [isOpen]);

  // Update position on scroll or resize
  useEffect(() => {
    if (isOpen) {
      const handleScroll = () => updatePosition();
      const handleResize = () => updatePosition();
      
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);
      
      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isOpen]);

  const handleSelect = (value: string) => {
    if (isMulti) {
      const newValues = safeSelectedValues.includes(value)
        ? safeSelectedValues.filter(v => v !== value)
        : [...safeSelectedValues, value];
      onChange(newValues);
    } else {
      onChange([value]);
      setIsOpen(false);
    }
    setSearchTerm('');
  };

  const handleRemove = (value: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(safeSelectedValues.filter(v => v !== value));
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
    setSearchTerm('');
  };

  const handleCreateNew = async () => {
    if (!onCreateNew || !searchTerm.trim()) return;
    
    setIsCreating(true);
    try {
      const newId = await onCreateNew(searchTerm.trim());
      if (newId) {
        // Add the new value to selected values
        if (isMulti) {
          onChange([...safeSelectedValues, newId]);
        } else {
          onChange([newId]);
          setIsOpen(false);
        }
        setSearchTerm('');
      }
    } catch (error) {
      console.error('Error creating new item:', error);
    } finally {
      setIsCreating(false);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;
    
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const focusableElements = dropdownRef.current?.querySelectorAll('button[role="option"]');
      if (!focusableElements || focusableElements.length === 0) return;
      
      const currentIndex = Array.from(focusableElements).findIndex(
        el => (el as HTMLElement) === document.activeElement
      );
      
      let nextIndex;
      if (e.key === 'ArrowDown') {
        nextIndex = currentIndex < focusableElements.length - 1 ? currentIndex + 1 : 0;
      } else {
        nextIndex = currentIndex > 0 ? currentIndex - 1 : focusableElements.length - 1;
      }
      
      (focusableElements[nextIndex] as HTMLElement).focus();
    } else if (e.key === 'Enter' && document.activeElement !== searchInputRef.current) {
      e.preventDefault();
      (document.activeElement as HTMLButtonElement)?.click();
    }
  };

  // Render dropdown menu through portal if usePortal is true
  const renderDropdown = () => {
    if (!isOpen) return null;

    const dropdownContent = (
      <div
        ref={dropdownRef}
        className="z-[150] rounded-md border border-gray-200 dark:border-gray-600 shadow-lg dark:shadow-gray-900/20 overflow-hidden bg-white dark:bg-gray-800"
        style={usePortal ? {
          position: 'absolute',
          top: `${position.top}px`,
          left: `${position.left}px`,
          width: `${position.width}px`,
          maxHeight: '400px',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 150
        } : {
          position: 'absolute',
          top: position.openUpward ? 'auto' : '100%',
          bottom: position.openUpward ? '100%' : 'auto',
          left: 0,
          right: 0,
          maxHeight: '300px',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 150,
          marginTop: position.openUpward ? '0' : '4px',
          marginBottom: position.openUpward ? '4px' : '0'
        }}
        onKeyDown={handleKeyDown}
        role="listbox"
        aria-multiselectable={isMulti}
      >
        {isSearchable && (
          <div className="p-2 border-b border-gray-100 dark:border-gray-600">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400 dark:text-gray-500" />
              <input
                ref={searchInputRef}
                type="text"
                className={cn(
                  "w-full pl-8 pr-2 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white",
                  isGreenTheme 
                    ? "focus:outline-none focus:ring-2 focus:ring-[#8CC63F] focus:border-[#8CC63F]"
                    : "focus:outline-none focus:ring-2 focus:ring-[#99C93B]"
                )}
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                aria-label="Search options"
              />
            </div>
          </div>
        )}
        
        <div className="overflow-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
          {filteredOptions.length > 0 || shouldShowCreateOption ? (
            <div className="py-1">
              {filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={safeSelectedValues.includes(option.value)}
                  className={cn(
                    'w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
                    safeSelectedValues.includes(option.value) && (
                      isGreenTheme 
                        ? 'bg-[#8CC63F]/10 dark:bg-[#8CC63F]/20'
                        : 'bg-[#E8F5DC] dark:bg-[#5D7E23]/30'
                    )
                  )}
                  onClick={() => handleSelect(option.value)}
                >
                  <span className={cn(
                    safeSelectedValues.includes(option.value) 
                      ? isGreenTheme
                        ? "text-[#7AB635] font-medium" // Darker green for better contrast
                        : "text-[#99C93B] dark:text-[#AAD775] font-medium"
                      : "text-gray-900 dark:text-white"
                  )}>
                    {option.label}
                  </span>
                </button>
              ))}

              {/* Create New Option */}
              {shouldShowCreateOption && (
                <button
                  type="button"
                  className="w-full px-4 py-2 text-left text-sm hover:bg-green-50 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400 font-medium flex items-center transition-colors"
                  onClick={handleCreateNew}
                  disabled={isCreating}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {isCreating ? 'Creating...' : `Create "${searchTerm}"`}
                </button>
              )}
            </div>
          ) : (
            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
              No options found
              {onCreateNew && searchTerm.trim() && (
                <button
                  type="button"
                  className="w-full mt-2 px-3 py-1.5 text-center bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 font-medium rounded-md hover:bg-green-100 dark:hover:bg-green-900/50 flex items-center justify-center transition-colors"
                  onClick={handleCreateNew}
                  disabled={isCreating}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {isCreating ? 'Creating...' : `Create "${searchTerm}"`}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );

    return usePortal 
      ? createPortal(dropdownContent, document.body)
      : dropdownContent;
  };

  return (
    <div className={cn("space-y-1", className)} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      
      <div className="relative">
        <div
          ref={triggerRef}
          className={cn(
            'min-h-[38px] w-full rounded-md border px-3 py-2 text-sm transition-colors duration-200',
            isGreenTheme 
              ? 'focus:outline-none focus:ring-2 focus:ring-[#8CC63F] focus:border-[#8CC63F]'
              : 'focus:outline-none focus:ring-2 focus:ring-[#99C93B] focus:border-[#99C93B]',
            'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100',
            disabled && 'bg-gray-50 dark:bg-gray-800 cursor-not-allowed opacity-60',
            error ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600',
            isOpen && (
              isGreenTheme 
                ? 'ring-2 ring-[#8CC63F] border-[#8CC63F]'
                : 'ring-2 ring-[#99C93B] border-[#99C93B]'
            ),
            'cursor-pointer flex items-center justify-between'
          )}
          onClick={handleOpen}
          tabIndex={disabled ? -1 : 0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleOpen();
            }
          }}
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-disabled={disabled}
        >
          <div className="flex flex-wrap gap-1 flex-1">
            {selectedOptions.length > 0 ? (
              selectedOptions.map(option => (
                <span
                  key={option.value}
                  className={cn(
                    "inline-flex items-center rounded px-2 py-0.5 text-sm font-medium",
                    isGreenTheme
                      ? "bg-[#8CC63F]/15 text-[#5A8A2C] dark:bg-[#8CC63F]/25 dark:text-[#8CC63F]" // Improved contrast
                      : "bg-[#E8F5DC] dark:bg-[#5D7E23]/30 text-[#5D7E23] dark:text-[#AAD775]"
                  )}
                >
                  {option.label}
                  {isMulti && (
                    <button
                      type="button"
                      className={cn(
                        "ml-1 hover:opacity-75",
                        isGreenTheme
                          ? "text-[#5A8A2C] dark:text-[#8CC63F]" // Matching text color
                          : "text-[#99C93B] dark:text-[#AAD775]"
                      )}
                      onClick={(e) => handleRemove(option.value, e)}
                      aria-label={`Remove ${option.label}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </span>
              ))
            ) : (
              <span className="text-gray-400 dark:text-gray-500">{placeholder}</span>
            )}
          </div>
          <div className="flex items-center ml-2">
            {safeSelectedValues.length > 0 && isMulti && (
              <button
                type="button" // Keep type
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 mr-1"
                onClick={handleClear}
                aria-label="Clear all selected options"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <ChevronDown className={cn(
              "h-4 w-4 text-gray-400 dark:text-gray-500 transition-transform",
              isOpen && "transform rotate-180"
            )} />
          </div>
        </div>

        {renderDropdown()}
      </div>

      {error && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}