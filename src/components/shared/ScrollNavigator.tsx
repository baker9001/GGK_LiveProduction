// src/components/shared/ScrollNavigator.tsx

import React, { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ScrollNavigatorProps {
  scrollContainerRef: React.RefObject<HTMLElement>;
  className?: string;
  offset?: number; // Offset from top/bottom in pixels
  showLabels?: boolean; // Whether to show text labels
  position?: 'left' | 'right'; // Position on the screen
}

export function ScrollNavigator({
  scrollContainerRef,
  className,
  offset = 20,
  showLabels = false,
  position = 'right'
}: ScrollNavigatorProps) {
  const [showTopButton, setShowTopButton] = useState(false);
  const [showBottomButton, setShowBottomButton] = useState(true);
  
  useEffect(() => {
    // Check if ref exists before accessing current
    if (!scrollContainerRef || !scrollContainerRef.current) {
      return;
    }
    
    const container = scrollContainerRef.current;
    
    const handleScroll = () => {
      if (!container) return;
      
      // Show "scroll to top" button when scrolled down a bit
      setShowTopButton(container.scrollTop > 200);
      
      // Show "scroll to bottom" button when not at the bottom
      const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 50;
      setShowBottomButton(!isAtBottom);
    };
    
    // Initial check
    handleScroll();
    
    // Add scroll event listener
    container.addEventListener('scroll', handleScroll);
    
    // Clean up
    return () => {
      // Check if container still exists before removing listener
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, [scrollContainerRef]);
  
  const scrollToTop = () => {
    if (!scrollContainerRef || !scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    
    container.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };
  
  const scrollToBottom = () => {
    if (!scrollContainerRef || !scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    
    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth'
    });
  };
  
  // Don't render if ref is not ready
  if (!scrollContainerRef || !scrollContainerRef.current) {
    return null;
  }
  
  return (
    <div 
      className={cn(
        'fixed z-40 flex flex-col gap-2',
        position === 'right' ? 'right-4' : 'left-4',
        'bottom-20',
        className
      )}
    >
      {showTopButton && (
        <button
          onClick={scrollToTop}
          className="flex items-center justify-center p-2 bg-white dark:bg-gray-800 rounded-full shadow-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 border border-gray-200 dark:border-gray-700"
          title="Scroll to top"
        >
          <ChevronUp className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          {showLabels && (
            <span className="ml-2 text-sm text-gray-600 dark:text-gray-300">Top</span>
          )}
        </button>
      )}
      
      {showBottomButton && (
        <button
          onClick={scrollToBottom}
          className="flex items-center justify-center p-2 bg-white dark:bg-gray-800 rounded-full shadow-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 border border-gray-200 dark:border-gray-700"
          title="Scroll to bottom"
        >
          <ChevronDown className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          {showLabels && (
            <span className="ml-2 text-sm text-gray-600 dark:text-gray-300">Bottom</span>
          )}
        </button>
      )}
    </div>
  );
}