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

    // getBoundingClientRect() returns position relative to viewport
    // We need to add scroll position to get absolute position
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    switch (position) {
      case 'top':
        top = triggerRect.top + scrollTop - tooltipRect.height - 8;
        left = triggerRect.left + scrollLeft + (triggerRect.width / 2) - (tooltipRect.width / 2);
        break;
      case 'bottom':
        top = triggerRect.bottom + scrollTop + 8;
        left = triggerRect.left + scrollLeft + (triggerRect.width / 2) - (tooltipRect.width / 2);
        break;
      case 'left':
        top = triggerRect.top + scrollTop + (triggerRect.height / 2) - (tooltipRect.height / 2);
        left = triggerRect.left + scrollLeft - tooltipRect.width - 8;
        break;
      case 'right':
        top = triggerRect.top + scrollTop + (triggerRect.height / 2) - (tooltipRect.height / 2);
        left = triggerRect.right + scrollLeft + 8;
        break;
    }

    // Adjust for window boundaries (viewport coordinates)
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const viewportTop = triggerRect.top;
    const viewportLeft = triggerRect.left;

    // Check if tooltip would go off-screen and adjust
    const tooltipViewportLeft = left - scrollLeft;
    const tooltipViewportTop = top - scrollTop;

    if (tooltipViewportLeft < 10) {
      left = scrollLeft + 10;
    }
    if (tooltipViewportLeft + tooltipRect.width > windowWidth - 10) {
      left = scrollLeft + windowWidth - tooltipRect.width - 10;
    }

    if (tooltipViewportTop < 10) {
      top = scrollTop + 10;
    }
    if (tooltipViewportTop + tooltipRect.height > windowHeight - 10) {
      top = scrollTop + windowHeight - tooltipRect.height - 10;
    }

    setTooltipPosition({ top, left });
  };
  
  // Show tooltip with delay
  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
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
  
  // Update position when tooltip becomes visible and on scroll/resize
  useEffect(() => {
    if (isVisible) {
      // Update position multiple times to ensure accurate positioning
      // First update
      const update1 = requestAnimationFrame(() => {
        updatePosition();
        // Second update after tooltip is rendered with content
        const update2 = requestAnimationFrame(() => {
          updatePosition();
          // Third update to catch any remaining layout shifts
          const update3 = setTimeout(() => {
            updatePosition();
          }, 10);
          return () => clearTimeout(update3);
        });
        return () => cancelAnimationFrame(update2);
      });

      const handleScroll = () => updatePosition();
      const handleResize = () => updatePosition();

      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);

      return () => {
        cancelAnimationFrame(update1);
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isVisible, position]);
  
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