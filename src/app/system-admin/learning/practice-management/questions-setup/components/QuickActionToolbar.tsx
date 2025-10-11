// src/app/system-admin/learning/practice-management/questions-setup/components/QuickActionToolbar.tsx
import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  ChevronUp, 
  CheckCircle, 
  RefreshCw,
  Download,
  Upload,
  Wand2,
  BarChart3,
  X
} from 'lucide-react';
import { Button } from '../../../../../../components/shared/Button';
import { cn } from '../../../../../../lib/utils';

interface QuickActionToolbarProps {
  onScrollToTop: () => void;
  onRefresh: () => void;
  onShowAnalytics: () => void;
  onBulkImport: () => void;
  onBulkExport: () => void;
  selectedCount?: number;
  onConfirmSelected?: () => void;
  onAutoFix?: () => void;
}

export function QuickActionToolbar({
  onScrollToTop,
  onRefresh,
  onShowAnalytics,
  onBulkImport,
  onBulkExport,
  selectedCount = 0,
  onConfirmSelected,
  onAutoFix
}: QuickActionToolbarProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 200);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Show toolbar after a delay
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 500);
    return () => clearTimeout(timer);
  }, []);
  
  const actions = [
    {
      icon: RefreshCw,
      label: 'Refresh',
      onClick: onRefresh,
      color: 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
    },
    {
      icon: BarChart3,
      label: 'Analytics',
      onClick: onShowAnalytics,
      color: 'text-[#99C93B] hover:text-[#5D7E23] dark:text-[#AAD775] dark:hover:text-[#AAD775]'
    },
    {
      icon: Upload,
      label: 'Import',
      onClick: onBulkImport,
      color: 'text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300'
    },
    {
      icon: Download,
      label: 'Export',
      onClick: onBulkExport,
      color: 'text-[#5D7E23] hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300'
    },
    {
      icon: Wand2,
      label: 'Auto Fix',
      onClick: onAutoFix,
      color: 'text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300',
      show: !!onAutoFix
    }
  ];
  
  if (!isVisible) return null;
  
  return (
    <div className="fixed bottom-6 right-6 z-40">
      {/* Selected Actions */}
      {selectedCount > 0 && onConfirmSelected && (
        <div className="mb-3 bg-[#99C93B] text-white rounded-lg shadow-lg p-3 flex items-center space-x-3">
          <span className="text-sm font-medium">{selectedCount} selected</span>
          <Button
            size="sm"
            variant="white"
            onClick={onConfirmSelected}
            leftIcon={<CheckCircle className="h-3 w-3" />}
          >
            Confirm
          </Button>
        </div>
      )}
      
      {/* Main Toolbar */}
      <div className={cn(
        "bg-white dark:bg-gray-800 rounded-full shadow-lg transition-all duration-300",
        isExpanded ? "w-auto" : "w-14"
      )}>
        <div className="flex items-center">
          {/* Toggle Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-4 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            title={isExpanded ? "Collapse" : "Quick Actions"}
          >
            {isExpanded ? (
              <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            ) : (
              <Zap className="h-5 w-5 text-[#99C93B] dark:text-[#AAD775]" />
            )}
          </button>
          
          {/* Actions */}
          {isExpanded && (
            <div className="flex items-center space-x-1 pr-2">
              {actions.filter(a => a.show !== false).map((action, index) => (
                <button
                  key={index}
                  onClick={action.onClick}
                  className={cn(
                    "p-3 rounded-full transition-colors relative group",
                    action.color
                  )}
                  title={action.label}
                >
                  <action.icon className="h-5 w-5" />
                  <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-gray-900 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {action.label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={onScrollToTop}
          className="mt-3 p-3 bg-gray-900 dark:bg-gray-700 text-white rounded-full shadow-lg hover:bg-gray-800 dark:hover:bg-gray-600 transition-all duration-300 transform hover:scale-110"
          title="Scroll to top"
        >
          <ChevronUp className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}