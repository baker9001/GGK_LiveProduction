import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

interface CollapsibleSectionProps {
  id: string;
  title: string;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}

export function CollapsibleSection({
  id,
  title,
  children,
  isOpen,
  onToggle,
  className
}: CollapsibleSectionProps) {
  return (
    <div id={id} className={cn("border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800 shadow-sm dark:shadow-gray-900/20 transition-all duration-300", className)}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-4 text-left focus:outline-none transition-colors duration-200 hover:bg-gray-50 dark:hover:bg-gray-700/50"
      >
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">{title}</h3>
        {isOpen ? (
          <ChevronDown className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        ) : (
          <ChevronRight className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        )}
      </button>
      
      <div className={cn(
        "transition-all duration-300 overflow-hidden",
        isOpen ? "max-h-[5000px] opacity-100" : "max-h-0 opacity-0"
      )}>
        {isOpen && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}