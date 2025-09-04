///home/project/src/components/shared/Select.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  error?: boolean;
  options: SelectOption[];
  searchable?: boolean;
  onChange?: (value: string) => void;
  renderOption?: (option: SelectOption) => React.ReactNode;
  usePortal?: boolean;
}

export function Select({ 
  className, 
  error, 
  options = [], 
  searchable = true, 
  value, 
  onChange, 
  disabled, 
  defaultValue, 
  placeholder = 'Select an option',
  renderOption,
  usePortal = true,
  ...props 
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOption, setSelectedOption] = useState<SelectOption | null>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const unregisterPortalRef = useRef<(() => void) | null>(null);

  // Update selectedOption when value or defaultValue changes
  useEffect(() => {
    const newValue = value !== undefined ? value : defaultValue;
    if (newValue === undefined || newValue === null || newValue === '') {
      setSelectedOption(null);
      return;
    }
    const option = options.find(opt => opt.value === newValue);
    setSelectedOption(option || null);
  }, [value, defaultValue, options]);

  // Update dropdown position
  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  }, []);

  // Handle opening the dropdown
  const handleOpen = useCallback(() => {
    if (disabled) return;
    updatePosition();
    setIsOpen(true);
    // Focus search input after a small delay
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 10);
  }, [disabled, updatePosition]);

  // Close dropdown and reset search
  const handleClose = useCallback(() => {
    setIsOpen(false);
    setSearchTerm('');
  }, []);

  // Filter options based on search term
  const filteredOptions = (options || []).filter(option =>
    (option.label || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

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
  }, [isOpen, handleClose]);

  // Close dropdown on escape key
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [isOpen, handleClose]);

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
  }, [isOpen, updatePosition]);

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

  const handleSelect = (option: SelectOption) => {
    setSelectedOption(option);
    setIsOpen(false);
    setSearchTerm('');
    
    if (onChange) {
      onChange(option.value);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedOption(null);
    setSearchTerm('');
    
    if (onChange) {
      onChange('');
    }
  };

  // Render dropdown menu through portal if usePortal is true
  const renderDropdown = () => {
    if (!isOpen) return null;
    
    const dropdownContent = (
      <div
        ref={dropdownRef}
        className="z-50 rounded-md border border-gray-200 dark:border-gray-600 shadow-lg dark:shadow-gray-900/20 overflow-hidden bg-white dark:bg-gray-800"
        style={usePortal ? {
          position: 'absolute',
          top: `${position.top}px`,
          left: `${position.left}px`,
          width: `${position.width}px`,
          maxHeight: '400px',
          display: 'flex',
          flexDirection: 'column'
        } : {
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          maxHeight: '300px',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 50
        }}
        onKeyDown={handleKeyDown}
        role="listbox"
        aria-labelledby={props.id}
      >
        {searchable && (
          <div className="p-2 border-b border-gray-100 dark:border-gray-600">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400 dark:text-gray-500" />
              <input
                ref={searchInputRef}
                type="text"
                className="w-full pl-8 pr-2 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
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
          {filteredOptions.length > 0 ? (
            <div className="py-1">
              {filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={value === option.value}
                  className={cn(
                    'w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
                    value === option.value && 'bg-blue-50 dark:bg-blue-900/20'
                  )}
                  onClick={() => handleSelect(option)}
                >
                  {renderOption ? (
                    renderOption(option)
                  ) : (
                    <span className={cn(
                      value === option.value 
                        ? "text-blue-600 dark:text-blue-400" 
                        : "text-gray-900 dark:text-white"
                    )}>
                      {option.label}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
              No options found
            </div>
          )}
        </div>
      </div>
    );

    return usePortal 
      ? createPortal(dropdownContent, document.body)
      : dropdownContent;
  };

  if (!searchable && !usePortal) {
    return (
      <select
        className={cn(
          'w-full px-3 py-2 border rounded-md shadow-sm text-sm appearance-none transition-colors duration-200',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
          'bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
          error ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600',
          className
        )}
        value={value}
        defaultValue={defaultValue}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        className={cn(
          'w-full px-3 py-2 border rounded-md shadow-sm text-sm text-left transition-colors duration-200',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
          'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100',
          error ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600',
          disabled && 'bg-gray-50 dark:bg-gray-800 cursor-not-allowed',
          className
        )}
        onClick={handleOpen}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={props.id ? `${props.id}-label` : undefined}
      >
        <span className={selectedOption ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}>
          {selectedOption?.label || placeholder}
        </span>
        <span className="absolute inset-y-0 right-0 flex items-center pr-2">
          {selectedOption ? (
            <div
              type="button"
              role="button"
              tabIndex={0}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400"
              onClick={handleClear}
              aria-label="Clear selection"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleClear(e as any);
                }
              }}
            >
              <X className="h-4 w-4" />
            </div>
          ) : (
            <ChevronDown className={cn(
              "h-4 w-4 text-gray-400 dark:text-gray-500 transition-transform",
              isOpen && "transform rotate-180"
            )} />
          )}
        </span>
      </button>

      {renderDropdown()}

      {/* Hidden select element for form submission */}
      <select
        {...props}
        value={selectedOption?.value || ''}
        defaultValue={defaultValue}
        onChange={(e) => onChange?.(e.target.value)}
        className="hidden"
        tabIndex={-1}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}