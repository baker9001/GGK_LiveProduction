/**
 * File: /src/components/shared/Tabs.tsx
 * Dependencies: 
 *   - @/lib/utils
 *   - External: react, lucide-react
 * 
 * Preserved Features:
 *   - Original tab shapes and sizes (h-12, px-4 py-2.5)
 *   - All original functionality (controlled/uncontrolled modes)
 *   - Status icons support
 *   - Rounded corners (rounded-xl, rounded-lg)
 *   - Shadow effects
 *   - Transform hover effects
 * 
 * Enhancements:
 *   - Updated to green color scheme (#8CC63F)
 *   - Refined gradients for better visual appeal
 *   - Improved dark mode contrast
 *   - Better hover states
 *   - Subtle animation improvements
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
  // Filter out null/undefined children for accurate count
  const validChildren = React.Children.toArray(children).filter(child => 
    React.isValidElement(child)
  );
  
  // Calculate grid columns based on number of valid children
  const getGridCols = (count: number) => {
    if (count <= 1) return '';
    if (count === 2) return 'grid grid-cols-2 gap-1';
    if (count === 3) return 'grid grid-cols-3 gap-1';
    if (count === 4) return 'grid grid-cols-4 gap-1';
    if (count === 5) return 'grid grid-cols-5 gap-1';
    return 'inline-flex gap-1';
  };

  const gridClass = getGridCols(validChildren.length);

  return (
    <div className={cn(
      'h-12 items-center justify-center rounded-xl bg-gradient-to-r from-gray-50/50 to-gray-100/50 dark:from-gray-800/30 dark:to-gray-700/30 p-1.5 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50 shadow-sm transition-all duration-300',
      gridClass,
      className
    )}>
      {React.Children.map(validChildren, child => {
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
        return <CircleCheck className="h-4 w-4 mr-1.5 text-green-500 dark:text-green-400" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 mr-1.5 text-red-500 dark:text-red-400" />;
      case 'active':
        return <Loader2 className="h-4 w-4 mr-1.5 text-[#8CC63F] animate-spin" />;
      default:
        return null;
    }
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium ring-offset-white transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8CC63F]/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 transform hover:scale-105 w-full',
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
      {/* Optional: Add a subtle indicator for active tab */}
      {isActive && (
        <span className="absolute inset-x-2 -bottom-1 h-0.5 bg-white/30 rounded-full" />
      )}
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
        'mt-4 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8CC63F]/50 focus-visible:ring-offset-2',
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