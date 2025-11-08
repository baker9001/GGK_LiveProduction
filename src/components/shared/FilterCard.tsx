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
        className="z-[9999] mt-1 bg-white shadow-xl rounded-lg overflow-hidden"
        style={{
          position: 'absolute',
          top: `${position.top + 4}px`,
          left: `${position.left}px`,
          width: `${position.width}px`
        }}
      >
        <div className="p-3 bg-gray-50">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#8CC63F]"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
        
        <ul className="py-1 max-h-60 overflow-auto">
          {filteredOptions.length > 0 ? (
            filteredOptions.map(option => (
              <li key={option.value}>
                <button
                  type="button"
                  className={cn(
                    'w-full px-4 py-2.5 text-sm text-left transition-colors',
                    option.value === value
                      ? 'bg-[#8CC63F] text-white font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
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
            <li className="px-4 py-3 text-sm text-gray-500 text-center">No options found</li>
          )}
        </ul>
      </div>,
      document.body
    );
  };
  
  return (
    <div className="relative">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>

      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          id={id}
          className={cn(
            'w-full bg-white rounded-lg py-2.5 pl-3 pr-10 text-left shadow-sm',
            'focus:outline-none focus:ring-2 focus:ring-[#8CC63F]',
            'text-sm text-gray-900 transition-all',
            isOpen && 'ring-2 ring-[#8CC63F]',
            disabled && 'bg-gray-50 cursor-not-allowed opacity-60'
          )}
          onClick={handleOpen}
          disabled={disabled}
        >
          <span className={value ? 'text-gray-900' : 'text-gray-400'}>
            {selectedOption?.label || placeholder}
          </span>

          <span className="absolute inset-y-0 right-0 flex items-center pr-3 gap-1">
            {value && (
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange('');
                }}
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <ChevronDown className={cn(
              "h-4 w-4 text-gray-400 transition-transform",
              isOpen && "transform rotate-180"
            )} />
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
  title = 'Filters',
  onApply,
  onClear,
  children,
  className,
}: FilterCardProps) {
  const [collapsed, setCollapsed] = useState(false);

  const handleClear = () => {
    if (typeof onClear === 'function') {
      onClear();
    }
  };

  return (
    <div className={cn('bg-white rounded-lg shadow-sm mb-6', className)}>
      {/* Header */}
      <button
        className="w-full px-6 py-4 flex items-center justify-between text-left focus:outline-none"
        onClick={() => setCollapsed(!collapsed)}
      >
        <h3 className="text-base font-semibold text-gray-900">
          {title}
        </h3>
        <ChevronDown className={cn(
          "h-5 w-5 text-gray-500 transition-transform",
          !collapsed && "transform rotate-180"
        )} />
      </button>

      {/* Content */}
      {!collapsed && (
        <div className="px-6 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {children}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="text-gray-700 hover:text-[#8CC63F] hover:bg-gray-50"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Text Input Component for Filters
interface FilterInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  type?: 'text' | 'email' | 'search';
}

function FilterInput({
  id,
  label,
  value,
  onChange,
  placeholder = '',
  disabled = false,
  type = 'text'
}: FilterInputProps) {
  return (
    <div className="relative">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <input
        type={type}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          'w-full bg-white rounded-lg py-2.5 px-3 text-sm text-gray-900 shadow-sm',
          'focus:outline-none focus:ring-2 focus:ring-[#8CC63F]',
          'placeholder:text-gray-400 transition-all',
          disabled && 'bg-gray-50 cursor-not-allowed opacity-60'
        )}
      />
    </div>
  );
}

// Export the dropdown and input components separately
FilterCard.Dropdown = FilterDropdown;
FilterCard.Input = FilterInput;