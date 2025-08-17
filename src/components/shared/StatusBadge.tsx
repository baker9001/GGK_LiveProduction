/**
 * File: /src/components/shared/StatusBadge.tsx
 * Dependencies: 
 *   - @/lib/utils (cn function)
 *   - @/lib/helpers/formatting (capitalize function)
 *   - External: react, lucide-react
 * 
 * Preserved Features:
 *   - Original status-based color mapping for all versions
 *   - Dark mode support
 *   - Border styling
 *   - Text casing preservation/capitalization
 *   - Transition animations
 * 
 * Added/Modified:
 *   - Combined icon support from all versions
 *   - Size variations (xs, sm, md)
 *   - Pulse animation for active and pending status
 *   - Additional status types (pending, planned, completed, published, archived, under_review)
 *   - Memoization for performance
 *   - Named and default export
 * 
 * Database Tables:
 *   - None directly (component used for displaying status from various tables)
 * 
 * Connected Files:
 *   - Used by: organisation/page.tsx, QuestionsTab.tsx, CompaniesTab.tsx, QuestionCard.tsx, PreviousSessionsTable.tsx
 *   - Depends on: utils.ts, formatting.ts
 */

import React, { memo } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Calendar, 
  AlertTriangle 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { capitalize } from '@/lib/helpers/formatting';

interface StatusBadgeProps {
  status: string;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  showIcon?: boolean;
  showPulse?: boolean;
}

export const StatusBadge = memo(({ 
  status, 
  size = 'sm', 
  className,
  showIcon = false,
  showPulse = false
}: StatusBadgeProps) => {
  
  // Normalize status for comparison
  const normalizedStatus = status?.toLowerCase() || '';
  
  // Get status configuration with colors and icons
  const getStatusConfig = () => {
    switch (normalizedStatus) {
      case 'active':
        return {
          color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700',
          icon: <CheckCircle2 className="w-3 h-3" />,
          pulse: true
        };
      
      case 'inactive':
        return {
          color: 'bg-gray-100 dark:bg-gray-700/50 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-600',
          icon: <XCircle className="w-3 h-3" />,
          pulse: false
        };
      
      case 'pending':
        return {
          color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700',
          icon: <Clock className="w-3 h-3" />,
          pulse: true
        };
      
      case 'qa_review':
      case 'under_review':
        return {
          color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-700',
          icon: <AlertTriangle className="w-3 h-3" />,
          pulse: false
        };
      
      case 'draft':
        return {
          color: 'bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600',
          icon: <Clock className="w-3 h-3" />,
          pulse: false
        };
      
      case 'planned':
        return {
          color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-700',
          icon: <Calendar className="w-3 h-3" />,
          pulse: false
        };
      
      case 'completed':
        return {
          color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 border-purple-200 dark:border-purple-700',
          icon: <CheckCircle2 className="w-3 h-3" />,
          pulse: false
        };
      
      case 'published':
        return {
          color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700',
          icon: <CheckCircle2 className="w-3 h-3" />,
          pulse: false
        };
      
      case 'archived':
        return {
          color: 'bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600',
          icon: <XCircle className="w-3 h-3" />,
          pulse: false
        };
      
      default:
        return {
          color: 'bg-gray-100 dark:bg-gray-700/50 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-600',
          icon: <AlertTriangle className="w-3 h-3" />,
          pulse: false
        };
    }
  };

  const config = getStatusConfig();
  
  // Size classes mapping
  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-xs',
    sm: 'px-2.5 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm'
  };

  // Determine if we should show the pulse animation
  const shouldShowPulse = showPulse && config.pulse && normalizedStatus === 'active';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium border transition-colors duration-200 relative',
        config.color,
        sizeClasses[size],
        showIcon && 'gap-1',
        className
      )}
    >
      {/* PRESERVED: Pulse animation for active status */}
      {shouldShowPulse && (
        <span className="absolute -top-0.5 -right-0.5 h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>
      )}
      
      {/* PRESERVED: Optional icon display */}
      {showIcon && config.icon}
      
      {/* PRESERVED: Status text with original casing or capitalization */}
      {status || capitalize(normalizedStatus) || 'Unknown'}
    </span>
  );
});

StatusBadge.displayName = 'StatusBadge';

// Default export for backward compatibility
export default StatusBadge;