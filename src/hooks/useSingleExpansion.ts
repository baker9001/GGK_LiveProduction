import { useState } from 'react';

/**
 * Custom hook to manage single expansion state
 * Ensures only one item can be expanded at a time
 * 
 * @returns {Object} Object containing expandedId and toggleExpansion function
 */
export function useSingleExpansion() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  /**
   * Toggles expansion state for an item
   * If the item is already expanded, it collapses it
   * If a different item is expanded, it collapses that one and expands the new item
   * 
   * @param id - The ID of the item to toggle
   */
  const toggleExpansion = (id: string) => {
    setExpandedId(prevId => prevId === id ? null : id);
  };

  /**
   * Checks if an item is expanded
   * 
   * @param id - The ID of the item to check
   * @returns {boolean} True if the item is expanded, false otherwise
   */
  const isExpanded = (id: string) => expandedId === id;

  return { expandedId, toggleExpansion, isExpanded };
}