import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface StructureOption {
  value: string;
  label: string;
  region: string;
  program: string;
  provider: string;
  subject: string;
}

interface StructureDropdownProps {
  id: string;
  label: string;
  options: StructureOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  required?: boolean;
  className?: string;
}

export function StructureDropdown({
  id,
  label,
  options,
  value,
  onChange,
  placeholder = 'Select an academic structure...',
  disabled = false,
  error,
  required = false,
  className
}: StructureDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const unregisterPortalRef = useRef<(() => void) | null>(null);
  
  const selectedOption = options.find(option => option.value === value);

  // Filter options based on search term
  const filteredOptions = options.filter(option => {
    const searchLower = searchTerm.toLowerCase();
    return (
      option.region.toLowerCase().includes(searchLower) ||
      option.program.toLowerCase().includes(searchLower) ||
      option.provider.toLowerCase().includes(searchLower) ||
      option.subject.toLowerCase().includes(searchLower)
    );
  });

  // Update dropdown position when trigger button changes position
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
    // Focus search input after a small delay to ensure it's rendered
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 10);
  }, [disabled, updatePosition]);

  // Close dropdown and reset search
  const handleClose = useCallback(() => {
    setIsOpen(false);
    setSearchTerm('');
  }, []);

  // Register portal with SlideInForm if inside one
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
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
  }, [isOpen]);

  // Close dropdown when clicking outside
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

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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

  // Render dropdown menu through portal
  const renderDropdown = () => {
    if (!isOpen) return null;
    
    return createPortal(
      <div
        ref={dropdownRef}
        className="z-50 rounded-md border border-gray-200 dark:border-gray-600 shadow-lg dark:shadow-gray-900/20 overflow-hidden bg-white dark:bg-gray-800"
        style={{
          position: 'absolute',
          top: `${position.top}px`,
          left: `${position.left}px`,
          width: `${position.width}px`,
          maxHeight: '400px',
          display: 'flex',
          flexDirection: 'column'
        }}
        onKeyDown={handleKeyDown}
        role="listbox"
        aria-labelledby={id}
      >
        <div className="p-2 border-b border-gray-100 dark:border-gray-600">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400 dark:text-gray-500" />
            <input
              ref={searchInputRef}
              type="text"
              className="w-full pl-8 pr-2 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Search by region, program, provider, or subject..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              aria-label="Search academic structures"
            />
          </div>
        </div>
        
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
                    'w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
                    value === option.value && 'bg-blue-50 dark:bg-blue-900/20'
                  )}
                  onClick={() => {
                    onChange(option.value);
                    handleClose();
                  }}
                >
                  <div className="flex flex-col">
                    <span className={cn(
                      "font-medium",
                      value === option.value ? "text-blue-600 dark:text-blue-400" : "text-gray-900 dark:text-white"
                    )}>
                      {option.subject}
                    </span>
                    <div className="flex flex-col mt-1">
                      <div className="grid grid-cols-3 gap-1 text-xs">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Region:</span>
                          <span className="ml-1 text-gray-700 dark:text-gray-300">{option.region}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Program:</span>
                          <span className="ml-1 text-gray-700 dark:text-gray-300">{option.program}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Provider:</span>
                          <span className="ml-1 text-gray-700 dark:text-gray-300">{option.provider}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
              No academic structures found
            </div>
          )}
        </div>
      </div>,
      document.body
    );
  };

  return (
    <div className={cn("space-y-1", className)}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          id={id}
          className={cn(
            'w-full px-3 py-2 text-left border rounded-md shadow-sm text-sm transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
            'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100',
            disabled && 'bg-gray-50 dark:bg-gray-800 cursor-not-allowed',
            error ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600',
            isOpen && 'ring-2 ring-blue-500 border-blue-500'
          )}
          onClick={handleOpen}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          {selectedOption ? (
            <div className="flex flex-col">
              <span className="font-medium text-gray-900 dark:text-white">
                {selectedOption.subject}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {selectedOption.region} / {selectedOption.program} / {selectedOption.provider}
              </span>
            </div>
          ) : (
            <span className="text-gray-400 dark:text-gray-500">{placeholder}</span>
          )}
          
          <div className="absolute inset-y-0 right-0 flex items-center pr-2">
            {selectedOption ? (
              <button
                type="button"
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 p-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange('');
                }}
                aria-label="Clear selection"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <ChevronDown className={cn(
                "h-4 w-4 text-gray-400 dark:text-gray-500 transition-transform",
                isOpen && "transform rotate-180"
              )} />
            )}
          </div>
        </button>

        {renderDropdown()}
      </div>

      {error && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}