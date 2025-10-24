// src/app/system-admin/learning/practice-management/papers-setup/utils/sanitization.ts

/**
 * Utility functions for data sanitization and normalization
 * Consolidated from multiple locations to reduce duplication
 */

/**
 * Normalize text for comparison
 */
export const normalizeText = (value: any): string => {
  if (value === null || value === undefined) return '';
  return String(value).trim().replace(/\s+/g, ' ').toLowerCase();
};

/**
 * Check if two text values match exactly (case-insensitive, whitespace-normalized)
 */
export const isExactTextMatch = (a: any, b: any): boolean => {
  const normalizedA = normalizeText(a);
  const normalizedB = normalizeText(b);
  return normalizedA !== '' && normalizedA === normalizedB;
};

/**
 * Check if two text values have a loose match (contains relationship)
 */
export const isLooseTextMatch = (a: any, b: any): boolean => {
  const normalizedA = normalizeText(a);
  const normalizedB = normalizeText(b);
  if (!normalizedA || !normalizedB) return false;
  return normalizedA.includes(normalizedB) || normalizedB.includes(normalizedA);
};

/**
 * Extract multiple name candidates from various formats
 */
export const extractNameCandidates = (value: any): string[] => {
  if (value === null || value === undefined) return [];

  if (Array.isArray(value)) {
    return value
      .flatMap(item => extractNameCandidates(item))
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  }

  if (typeof value === 'string') {
    return value
      .split(/[,/]/)
      .map(part => part.trim())
      .filter(part => part.length > 0);
  }

  return [String(value)];
};

/**
 * Find unique match from items using multiple getter functions
 */
export const findUniqueMatch = <T,>(
  items: T[],
  candidate: any,
  getters: Array<(item: T) => any>
): T | null => {
  const normalizedCandidate = normalizeText(candidate);
  if (!normalizedCandidate) return null;

  // Try exact matches first
  for (const getter of getters) {
    const exactMatches = items.filter(item => isExactTextMatch(getter(item), candidate));
    if (exactMatches.length === 1) {
      return exactMatches[0];
    }
  }

  // Fall back to loose matches
  for (const getter of getters) {
    const looseMatches = items.filter(item => isLooseTextMatch(getter(item), candidate));
    if (looseMatches.length === 1) {
      return looseMatches[0];
    }
  }

  return null;
};

/**
 * Sanitize data for JSON serialization and database storage
 */
export const sanitizeForStorage = (data: unknown): any => {
  const transform = (value: any): any => {
    if (typeof value === 'bigint') {
      return value.toString();
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (Array.isArray(value)) {
      return value.map(transform);
    }

    if (value && typeof value === 'object') {
      const result: Record<string, any> = {};
      Object.entries(value as Record<string, any>).forEach(([key, nestedValue]) => {
        const transformed = transform(nestedValue);
        if (transformed !== undefined) {
          result[key] = transformed;
        }
      });
      return result;
    }

    return value;
  };

  try {
    if (typeof structuredClone === 'function') {
      return transform(structuredClone(data));
    }
  } catch (error) {
    console.warn('structuredClone failed when sanitizing data:', error);
  }

  try {
    return JSON.parse(
      JSON.stringify(data, (_, value) => (typeof value === 'bigint' ? value.toString() : value))
    );
  } catch (error) {
    console.warn('JSON serialization failed when sanitizing data:', error);
    return transform(data);
  }
};

/**
 * Filter out invalid items from array structures
 */
export const filterValidStructureItems = (
  items: any,
  context: string,
  issues?: string[]
): any[] => {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.filter((item, index) => {
    const isValid = item !== null && typeof item === 'object';
    if (!isValid) {
      console.warn(`Skipping invalid ${context} at index ${index}:`, item);
      if (issues) {
        issues.push(`${context} ${index + 1} is missing or invalid.`);
      }
    }
    return isValid;
  });
};

/**
 * Ensure value is an array
 */
export const ensureArray = (value: any): any[] => {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value];
};

/**
 * Ensure value is a string
 */
export const ensureString = (value: any): string => {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  return String(value);
};

/**
 * Ensure value is a number
 */
export const ensureNumber = (value: any, defaultValue: number = 0): number => {
  if (typeof value === 'number' && !isNaN(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) return parsed;
  }
  return defaultValue;
};

/**
 * Clean HTML tags from text
 */
export const stripHtmlTags = (html: string): string => {
  return html.replace(/<[^>]*>/g, '').trim();
};

/**
 * Truncate text to specified length
 */
export const truncateText = (text: string, maxLength: number = 100): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

/**
 * Generate unique ID
 */
export const generateUniqueId = (prefix: string = 'id'): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};
