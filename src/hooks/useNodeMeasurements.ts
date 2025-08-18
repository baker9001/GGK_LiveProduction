// src/hooks/useNodeMeasurements.ts
// Hook for measuring DOM node dimensions with ResizeObserver

import { useEffect, useState, useCallback, useRef } from 'react';

export interface NodeDimensions {
  width: number;
  height: number;
}

export function useNodeMeasurements(
  cardRefs: React.MutableRefObject<Map<string, React.RefObject<HTMLDivElement>>>,
  zoomLevel: number,
  dependencies: any[] = []
): Map<string, NodeDimensions> {
  const [dimensions, setDimensions] = useState<Map<string, NodeDimensions>>(new Map());
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const measurementTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const measureNodes = useCallback(() => {
    const newDimensions = new Map<string, NodeDimensions>();
    
    cardRefs.current.forEach((ref, nodeId) => {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect();
        
        // Adjust dimensions for zoom level to get actual logical dimensions
        const actualWidth = rect.width / zoomLevel;
        const actualHeight = rect.height / zoomLevel;
        
        newDimensions.set(nodeId, {
          width: actualWidth,
          height: actualHeight
        });
      }
    });

    setDimensions(newDimensions);
  }, [cardRefs, zoomLevel]);

  const debouncedMeasure = useCallback(() => {
    if (measurementTimeoutRef.current) {
      clearTimeout(measurementTimeoutRef.current);
    }
    
    measurementTimeoutRef.current = setTimeout(() => {
      requestAnimationFrame(measureNodes);
    }, 50); // 50ms debounce
  }, [measureNodes]);

  // Set up ResizeObserver
  useEffect(() => {
    // Clean up previous observer
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
    }

    // Create new observer
    resizeObserverRef.current = new ResizeObserver((entries) => {
      // Only trigger if we have actual size changes
      let hasChanges = false;
      entries.forEach(entry => {
        const nodeId = entry.target.getAttribute('data-card-id');
        if (nodeId) {
          const currentDim = dimensions.get(nodeId);
          const newWidth = entry.contentRect.width / zoomLevel;
          const newHeight = entry.contentRect.height / zoomLevel;
          
          if (!currentDim || 
              Math.abs(currentDim.width - newWidth) > 1 || 
              Math.abs(currentDim.height - newHeight) > 1) {
            hasChanges = true;
          }
        }
      });

      if (hasChanges) {
        debouncedMeasure();
      }
    });

    // Observe all current card elements
    cardRefs.current.forEach((ref) => {
      if (ref.current && resizeObserverRef.current) {
        resizeObserverRef.current.observe(ref.current);
      }
    });

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
      if (measurementTimeoutRef.current) {
        clearTimeout(measurementTimeoutRef.current);
      }
    };
  }, [debouncedMeasure, zoomLevel]);

  // Re-measure when dependencies change
  useEffect(() => {
    // Small delay to allow DOM updates
    const timer = setTimeout(measureNodes, 100);
    return () => clearTimeout(timer);
  }, [...dependencies, zoomLevel]);

  // Initial measurement
  useEffect(() => {
    measureNodes();
  }, [measureNodes]);

  return dimensions;
}