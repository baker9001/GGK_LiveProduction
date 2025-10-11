/**
 * File: /src/components/shared/FilterCard.tsx
 * Updated to support green theme (#8CC63F) instead of blue
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../lib/utils';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterDropdownProps {
  id: string;
  label: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

function FilterDropdown({
  id,
  label,
  options,
  value,
  onChange,
  placeholder = 'Select...',
  disabled = false
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const unregisterPortalRef = React.useRef<(() => void) | null>(null);
  
  // Always use green theme for consistency
  const isGreenTheme = true;
  
  const filteredOptions = options.filter(option => 
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const selectedOption = options.find(option => option.value === value);

  // Update dropdown position
  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  };

  // Handle opening the dropdown
  const handleOpen = () => {
    if (disabled) return;
    updatePosition();
    setIsOpen(true);
  };

  // Close dropdown and reset search
  const handleClose = () => {
    setIsOpen(false);
    setSearchTerm('');
  };

  // Register portal with SlideInForm if inside one
  React.useEffect(() => {
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

  // Handle click outside to close dropdown
  React.useEffect(() => {
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
  React.useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [isOpen]);

  // Update position on scroll or resize
  React.useEffect(() => {
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

  // Render dropdown menu through portal
  const renderDropdown = () => {
    if (!isOpen) return null;
    
    return createPortal(
      <div
        ref={dropdownRef}
        className="z-50 mt-1 bg-white dark:bg-gray-800 shadow-lg dark:shadow-gray-900/20 rounded-md border border-gray-200 dark:border-gray-600 max-h-60 overflow-auto"
        style={{
          position: 'absolute',
          top: `${position.top}px`,
          left: `${position.left}px`,
          width: `${position.width}px`
        }}
      >
        <div className="p-2 border-b border-gray-100 dark:border-gray-600">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              className={cn(
                "w-full pl-8 pr-2 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white",
                "focus:outline-none focus:ring-2",
                isGreenTheme 
                  ? "focus:ring-[#8CC63F] focus:border-[#8CC63F]"
                  : "focus:ring-[#99C93B] focus:border-[#99C93B]"
              )}
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
        
        <ul className="py-1">
          {filteredOptions.length > 0 ? (
            filteredOptions.map(option => (
              <li key={option.value}>
                <button
                  type="button"
                  className={cn(
                    'w-full px-4 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors',
                    option.value === value 
                      ? isGreenTheme 
                        ? 'bg-[#8CC63F]/10 dark:bg-[#8CC63F]/20 text-[#8CC63F]' 
                        : 'bg-[#E8F5DC] dark:bg-[#5D7E23]/30 text-[#99C93B] dark:text-[#AAD775]'
                      : 'text-gray-900 dark:text-white'
                  )}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                >
                  {option.label}
                </button>
              </li>
            ))
          ) : (
            <li className="px-4 py-2 text-sm text-gray-500 dark:text-gray-300">No options found</li>
          )}
        </ul>
      </div>,
      document.body
    );
  };
  
  return (
    <div className="relative">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      
      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          id={id}
          className={cn(
            'w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md py-2 pl-3 pr-10 text-left',
            'focus:outline-none focus:ring-1',
            isGreenTheme 
              ? 'focus:ring-[#8CC63F] focus:border-[#8CC63F]'
              : 'focus:ring-[#99C93B] focus:border-[#99C93B]',
            'text-sm text-gray-900 dark:text-gray-100 transition-colors duration-200',
            disabled && 'bg-gray-50 dark:bg-gray-800 cursor-not-allowed'
          )}
          onClick={handleOpen}
          disabled={disabled}
        >
          <span className={value ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-400'}>
            {selectedOption?.label || placeholder}
          </span>
          
          <span className="absolute inset-y-0 right-0 flex items-center pr-2">
            {value ? (
              <button
                type="button"
                className="text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange('');
                }}
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <ChevronDown className={cn(
                "h-4 w-4 text-gray-400 dark:text-gray-500 transition-transform",
                isOpen && "transform rotate-180"
              )} />
            )}
          </span>
        </button>
        
        {renderDropdown()}
      </div>
    </div>
  );
}

interface FilterCardProps {
  title?: string;
  onApply: () => void;
  onClear: () => void;
  children: React.ReactNode;
  className?: string;
}

export function FilterCard({
  title = 'Filter',
  onApply,
  onClear,
  children,
  className,
}: FilterCardProps) {
  const [collapsed, setCollapsed] = useState(true);
  
  const handleClear = () => {
    if (typeof onClear === 'function') {
      onClear();
    }
  };
  
  return (
    <div className={cn('bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm dark:shadow-gray-900/20 transition-colors duration-200', className)}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 cursor-pointer"
        onClick={() => setCollapsed(!collapsed)}
      >
        <h3 className="text-base font-medium text-gray-900 dark:text-white flex items-center">
          {title}
        </h3>
        <div>
          {collapsed ? (
            <ChevronDown className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          ) : (
            <ChevronUp className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          )}
        </div>
      </div>
      
      {/* Content */}
      {!collapsed && (
        <div className="p-4">
          <div className="space-y-4">
            {children}
          </div>
          
          {/* Actions */}
          <div className="mt-6 flex items-center justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="border-gray-300 hover:border-[#8CC63F] hover:text-[#8CC63F] focus:ring-[#8CC63F]"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Export the dropdown component separately
FilterCard.Dropdown = FilterDropdown;