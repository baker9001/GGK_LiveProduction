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
  // Filter out null/undefined children and count valid tabs
  const validChildren = React.Children.toArray(children).filter(child => 
    React.isValidElement(child)
  );
  
  // Calculate grid columns based on number of valid children
  const getGridCols = (count: number) => {
    if (count <= 1) return 'grid-cols-1';
    if (count <= 2) return 'grid-cols-2';
    if (count <= 3) return 'grid-cols-3';
    if (count <= 4) return 'grid-cols-4';
    if (count <= 5) return 'grid-cols-5';
    return 'grid-cols-6';
  };

  return (
    <div className={cn(
      `grid h-12 items-center justify-center rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 p-1.5 border border-gray-200 dark:border-gray-600 shadow-sm transition-all duration-300 ${getGridCols(validChildren.length)}`,
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
        return <Loader2 className="h-4 w-4 mr-1.5 text-blue-500 dark:text-blue-400 animate-spin" />;
      default:
        return null;
    }
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium ring-offset-white transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 transform hover:scale-105',
        isActive
          ? 'bg-[#8CC63F] text-white shadow-lg shadow-[#8CC63F]/25 border border-[#8CC63F] dark:border-[#8CC63F]'
          : 'text-gray-600 dark:text-gray-400 hover:text-[#8CC63F] dark:hover:text-[#8CC63F] hover:bg-white/80 dark:hover:bg-gray-600/50 hover:shadow-md',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      onClick={handleClick}
      disabled={disabled}
    >
      {renderStatusIcon()}
      {children}
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
        'mt-4 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 animate-in fade-in-50 duration-300',
        className
      )}
    >
      {children}
    </div>
  );
}