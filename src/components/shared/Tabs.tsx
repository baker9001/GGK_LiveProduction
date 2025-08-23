/**
 * File: /src/components/shared/Tabs.tsx
 * Dependencies: 
 *   - @/lib/utils
 *   - External: react, lucide-react
 * 
 * Preserved Features:
 *   - All original functionality (controlled/uncontrolled modes)
 *   - Status icons support
 *   - Rounded corners
 *   - Shadow effects
 *   - Transform hover effects
 *   - Green color scheme (#8CC63F)
 * 
 * Enhancements:
 *   - Dynamic height based on content
 *   - Compact padding for better space efficiency
 *   - Auto-sizing to text content
 *   - Flexible layout (inline-flex instead of grid for better sizing)
 */

import * as React from 'react';
import { cn } from '../../lib/utils';
import { CheckCircle as CircleCheck, AlertCircle, Loader2 } from 'lucide-react';

interface TabsProps {
  defaultValue: string;
  children: React.ReactNode;
  className?: string;
  value?: string; // Optional controlled value
  onValueChange?: (value: string) => void; // Optional callback for controlled usage
}

export function Tabs({ defaultValue, value, onValueChange, children, className }: TabsProps) {
  const [activeTab, setActiveTab] = React.useState(defaultValue);

  // Sync with defaultValue when it changes
  React.useEffect(() => {
    if (!value) { // Only update if not in controlled mode
      setActiveTab(defaultValue);
    }
  }, [defaultValue, value]);

  // If value is provided (controlled mode), use it instead of internal state
  const currentTab = value !== undefined ? value : activeTab;

  // Handle tab change
  const handleTabChange = (newValue: string) => {
    if (value === undefined) {
      // Uncontrolled mode
      setActiveTab(newValue);
    }
    // Call the callback for controlled mode
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
}

export function TabsList({ children, className, activeTab, onTabChange }: TabsListProps) {
  return (
    <div className={cn(
      'inline-flex items-center gap-1 p-1 rounded-xl bg-gradient-to-r from-gray-50/50 to-gray-100/50 dark:from-gray-800/30 dark:to-gray-700/30 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50 shadow-sm transition-all duration-300',
      className
    )}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            activeTab,
            onTabChange,
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

  // Render status icon based on tabStatus
  const renderStatusIcon = () => {
    if (!tabStatus) return null;

    switch (tabStatus) {
      case 'completed':
        return <CircleCheck className="h-3.5 w-3.5 mr-1.5 text-green-500 dark:text-green-400" />;
      case 'error':
        return <AlertCircle className="h-3.5 w-3.5 mr-1.5 text-red-500 dark:text-red-400" />;
      case 'active':
        return <Loader2 className="h-3.5 w-3.5 mr-1.5 text-[#8CC63F] animate-spin" />;
      default:
        return null;
    }
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium ring-offset-white transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8CC63F]/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 transform hover:scale-105',
        isActive
          ? 'bg-gradient-to-r from-[#8CC63F] to-[#7AB635] text-white shadow-lg shadow-[#8CC63F]/20 border border-[#8CC63F]/30 dark:shadow-[#8CC63F]/10'
          : 'text-gray-600 dark:text-gray-400 hover:text-[#8CC63F] dark:hover:text-[#8CC63F] hover:bg-white/60 dark:hover:bg-gray-700/50 hover:shadow-md hover:border-[#8CC63F]/20 border border-transparent',
        disabled && 'opacity-50 cursor-not-allowed hover:scale-100',
        className
      )}
      onClick={handleClick}
      disabled={disabled}
      aria-selected={isActive}
      role="tab"
    >
      {renderStatusIcon()}
      <span className={cn(
        'transition-all duration-200',
        isActive && 'font-semibold'
      )}>
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
}

export function TabsContent({
  value,
  children,
  className,
  activeTab,
}: TabsContentProps) {
  if (activeTab !== value) return null;

  return (
    <div
      className={cn(
        'mt-3 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8CC63F]/50 focus-visible:ring-offset-2',
        'animate-in fade-in-50 slide-in-from-bottom-1 duration-300',
        className
      )}
      role="tabpanel"
      aria-hidden={activeTab !== value}
    >
      {children}
    </div>
  );
}

// Optional: Export color presets for consistent theming
export const TabColors = {
  primary: '#8CC63F', // Your main green
  primaryDark: '#7AB635', // Darker shade for gradient
  primaryLight: '#9ED050', // Lighter shade for hover
} as const;