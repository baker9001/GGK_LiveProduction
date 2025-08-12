import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  className?: string;
  contentClassName?: string;
  maxWidth?: number;
}

export function Tooltip({
  content,
  children,
  position = 'top',
  delay = 300,
  className,
  contentClassName,
  maxWidth = 250
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Calculate tooltip position
  const updatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;
    
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    
    let top = 0;
    let left = 0;
    
    switch (position) {
      case 'top':
        top = triggerRect.top - tooltipRect.height - 8;
        left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
        break;
      case 'bottom':
        top = triggerRect.bottom + 8;
        left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
        break;
      case 'left':
        top = triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2);
        left = triggerRect.left - tooltipRect.width - 8;
        break;
      case 'right':
        top = triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2);
        left = triggerRect.right + 8;
        break;
    }
    
    // Adjust for window boundaries
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    // Prevent tooltip from going off-screen
    if (left < 10) left = 10;
    if (left + tooltipRect.width > windowWidth - 10) {
      left = windowWidth - tooltipRect.width - 10;
    }
    
    if (top < 10) top = 10;
    if (top + tooltipRect.height > windowHeight - 10) {
      top = windowHeight - tooltipRect.height - 10;
    }
    
    // Add scroll position
    top += window.scrollY;
    left += window.scrollX;
    
    setTooltipPosition({ top, left });
  };
  
  // Show tooltip with delay
  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      // Update position after a small delay to ensure tooltip is rendered
      setTimeout(updatePosition, 0);
    }, delay);
  };
  
  // Hide tooltip
  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    setIsVisible(false);
  };
  
  // Update position on scroll or resize
  useEffect(() => {
    if (isVisible) {
      const handleScroll = () => updatePosition();
      const handleResize = () => updatePosition();
      
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);
      
      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isVisible]);
  
  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  // Render tooltip through portal
  const renderTooltip = () => {
    if (!isVisible) return null;
    
    return createPortal(
      <div
        ref={tooltipRef}
        className={cn(
          'fixed z-50 px-2 py-1 text-xs font-medium text-white bg-gray-900 dark:bg-gray-800 rounded shadow-lg dark:shadow-black/20 pointer-events-none',
          contentClassName
        )}
        style={{
          top: `${tooltipPosition.top}px`,
          left: `${tooltipPosition.left}px`,
          maxWidth: `${maxWidth}px`
        }}
      >
        {content}
        <div
          className={cn(
            'absolute w-2 h-2 bg-gray-900 dark:bg-gray-800 transform rotate-45',
            position === 'top' && 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2',
            position === 'bottom' && 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2',
            position === 'left' && 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2',
            position === 'right' && 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2'
          )}
        />
      </div>,
      document.body
    );
  };
  
  return (
    <div
      ref={triggerRef}
      className={cn('inline-block', className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      {children}
      {renderTooltip()}
    </div>
  );
}