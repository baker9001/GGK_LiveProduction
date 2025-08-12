/**
 * Capitalizes the first letter of a string
 */
export function capitalize(str: string): string {
  if (!str || typeof str !== 'string') return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Converts snake_case or camelCase to Title Case
 */
export function prettify(str: string): string {
  if (!str || typeof str !== 'string') return '';
  
  // Handle camelCase
  const spacedStr = str.replace(/([A-Z])/g, ' $1');
  
  // Handle snake_case
  const normalized = spacedStr.replace(/_/g, ' ');
  
  // Capitalize each word
  return normalized
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Truncates text to a specified length with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}