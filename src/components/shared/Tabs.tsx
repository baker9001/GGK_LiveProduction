/**
 * File: /src/components/shared/Tabs.tsx
 * Dependencies: 
 *   - @/lib/utils
 *   - External: react, lucide-react
 * 
 * Preserved Features:
 *   - All original functionality (controlled/uncontrolled modes)
 *   - Status icons support
 *   - Grid layout support
 *   - Animation effects
 *   - Disabled state handling
 * 
 * Improvements:
 *   - Reduced height from 48px to 36px (25% reduction)
 *   - Compact padding and spacing
 *   - Cleaner, flatter design
 *   - Subtle hover effects without scale transform
 *   - More efficient space usage
 *   - Optional compact variant for even smaller tabs
 */

import * as React from 'react';
import { cn } from '../../lib/utils';
import { CheckCircle as CircleCheck, AlertCircle, Loader2 } from 'lucide-react';

interface TabsProps {
  defaultValue: string;
  children: React.ReactNode;
  className?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  variant?: 'default' | 'compact' | 'pills'; // New variant prop for different styles
}

export function Tabs({ 
  defaultValue, 
  value, 
  onValueChange, 
  children, 
  className,
  variant = 'default' 
}: TabsProps) {
  const [activeTab, setActiveTab] = React.useState(defaultValue);

  React.useEffect(() => {
    if (!value) {
      setActiveTab(defaultValue);
    }
  }, [defaultValue, value]);

  const currentTab = value !== undefined ? value : activeTab;

  const handleTabChange = (newValue: string) => {
    if (value === undefined) {
      setActiveTab(newValue);
    }
    if (onValueChange) {
      onValueChange(newValue);
    }
  };

  return (
    <div className={cn('w-full', className)} data-active-tab={currentTab}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            activeTab: currentTab,
            onTabChange: handleTabChange,
            variant,
          });
        }
        return child;
      })}
    </div>
  );
}

interface TabsListProps {
  children: React.ReactNode;
  className?: string;
  activeTab?: string;
  onTabChange?: (value: string) => void;
  variant?: 'default' | 'compact' | 'pills';
}

export function TabsList({ 
  children, 
  className, 
  activeTab, 
  onTabChange,
  variant = 'default' 
}: TabsListProps) {
  const validChildren = React.Children.toArray(children).filter(child => 
    React.isValidElement(child)
  );
  
  const getGridCols = (count: number) => {
    if (count <= 1) return 'grid-cols-1';
    if (count <= 2) return 'grid-cols-2';
    if (count <= 3) return 'grid-cols-3';
    if (count <= 4) return 'grid-cols-4';
    if (count <= 5) return 'grid-cols-5';
    if (count <= 6) return 'grid-cols-6';
    return 'grid-cols-7';
  };

  // Different styles based on variant
  const listStyles = {
    default: cn(
      'inline-flex h-9 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800/50 p-1 text-gray-500 dark:text-gray-400',
      `grid ${getGridCols(validChildren.length)}`
    ),
    compact: cn(
      'inline-flex h-8 items-center justify-start gap-1 border-b border-gray-200 dark:border-gray-700',
      'w-full'
    ),
    pills: cn(
      'inline-flex items-center gap-2 flex-wrap',
      'w-full'
    )
  };

  return (
    <div className={cn(listStyles[variant] || listStyles.default, className)}>
      {React.Children.map(validChildren, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            activeTab,
            onTabChange,
            variant,
          });
        }
        return child;
      })}
    </div>
  );
}

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  activeTab?: string;
  onTabChange?: (value: string) => void;
  onClick?: () => void;
  disabled?: boolean;
  tabStatus?: 'pending' | 'completed' | 'error' | 'active';
  variant?: 'default' | 'compact' | 'pills';
}

export function TabsTrigger({
  value,
  children,
  className,
  activeTab,
  onTabChange,
  onClick,
  disabled = false,
  tabStatus,
  variant = 'default',
}: TabsTriggerProps) {
  const isActive = activeTab === value;

  const handleClick = () => {
    if (disabled) return;
    
    if (onTabChange) {
      onTabChange(value);
    }
    if (onClick) {
      onClick();
    }
  };

  const renderStatusIcon = () => {
    if (!tabStatus) return null;

    const iconClass = variant === 'compact' ? 'h-3 w-3 mr-1' : 'h-3.5 w-3.5 mr-1.5';

    switch (tabStatus) {
      case 'completed':
        return <CircleCheck className={cn(iconClass, 'text-green-500 dark:text-green-400')} />;
      case 'error':
        return <AlertCircle className={cn(iconClass, 'text-red-500 dark:text-red-400')} />;
      case 'active':
        return <Loader2 className={cn(iconClass, 'text-blue-500 dark:text-blue-400 animate-spin')} />;
      default:
        return null;
    }
  };

  // Different button styles based on variant
  const getButtonStyles = () => {
    const baseStyles = 'inline-flex items-center justify-center whitespace-nowrap font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8CC63F] focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50';
    
    switch (variant) {
      case 'compact':
        return cn(
          baseStyles,
          'px-3 py-1.5 text-sm relative',
          isActive
            ? 'text-[#8CC63F] font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#8CC63F]'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200',
          disabled && 'opacity-50 cursor-not-allowed'
        );
      
      case 'pills':
        return cn(
          baseStyles,
          'px-3 py-1.5 text-sm rounded-full',
          isActive
            ? 'bg-[#8CC63F] text-white shadow-sm'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700',
          disabled && 'opacity-50 cursor-not-allowed'
        );
      
      default:
        return cn(
          baseStyles,
          'rounded-md px-3 py-1.5 text-sm',
          isActive
            ? 'bg-[#8CC63F] text-white shadow-sm'
            : 'text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800/50',
          disabled && 'opacity-50 cursor-not-allowed'
        );
    }
  };

  return (
    <button
      className={cn(getButtonStyles(), className)}
      onClick={handleClick}
      disabled={disabled}
      aria-selected={isActive}
      role="tab"
    >
      {renderStatusIcon()}
      <span className={variant === 'compact' ? 'text-xs' : 'text-sm'}>
        {children}
      </span>
    </button>
  );
}

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  activeTab?: string;
  variant?: 'default' | 'compact' | 'pills';
}

export function TabsContent({
  value,
  children,
  className,
  activeTab,
  variant = 'default',
}: TabsContentProps) {
  if (activeTab !== value) return null;

  const contentStyles = variant === 'compact' ? 'mt-3' : 'mt-4';

  return (
    <div
      className={cn(
        contentStyles,
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8CC63F] focus-visible:ring-offset-2',
        'animate-in fade-in-50 duration-200',
        className
      )}
      role="tabpanel"
      aria-hidden={activeTab !== value}
    >
      {children}
    </div>
  );
}

// Export a helper hook for tab management
export function useTabsState(defaultValue: string) {
  const [value, setValue] = React.useState(defaultValue);
  
  return {
    value,
    onValueChange: setValue,
    setTab: setValue,
    reset: () => setValue(defaultValue),
  };
}