/**
 * Subject Extractors
 * Extract subject name and code from various input formats
 * Works universally for all subjects (Biology, Chemistry, Physics, Math, etc.)
 */

import { SubjectMetadata, SubjectFormat } from './types';

/**
 * Extract subject code from a subject string
 * Handles multiple formats and patterns
 */
export function extractSubjectCode(subjectString: string): string | undefined {
  if (!subjectString || typeof subjectString !== 'string') {
    return undefined;
  }

  const trimmed = subjectString.trim();

  // Pattern 1: "Subject - Code" (e.g., "Biology - 0610")
  const dashMatch = trimmed.match(/\s*-\s*(\d{4})\s*$/);
  if (dashMatch) {
    return dashMatch[1];
  }

  // Pattern 2: "Subject (Code)" (e.g., "Biology (0610)")
  const parenMatch = trimmed.match(/\((\d{4})\)\s*$/);
  if (parenMatch) {
    return parenMatch[1];
  }

  // Pattern 3: "Code Subject" (e.g., "0610 Biology")
  const prefixMatch = trimmed.match(/^(\d{4})\s+/);
  if (prefixMatch) {
    return prefixMatch[1];
  }

  // Pattern 4: "[Code] Subject" (e.g., "[0610] Biology")
  const bracketMatch = trimmed.match(/^\[(\d{4})\]\s+/);
  if (bracketMatch) {
    return bracketMatch[1];
  }

  // Pattern 5: "Subject_Code" or "Subject/Code" (alternative separators)
  const altSeparatorMatch = trimmed.match(/[_\/](\d{4})\s*$/);
  if (altSeparatorMatch) {
    return altSeparatorMatch[1];
  }

  // Pattern 6: Just a code (4 digits)
  if (/^\d{4}$/.test(trimmed)) {
    return trimmed;
  }

  return undefined;
}

/**
 * Extract clean subject name without code
 * Removes all code patterns and standardizes the name
 */
export function extractSubjectName(subjectString: string): string {
  if (!subjectString || typeof subjectString !== 'string') {
    return subjectString;
  }

  let cleaned = subjectString.trim();

  // Remove all code patterns
  cleaned = cleaned
    .replace(/\s*-\s*\d{4}\s*$/, '')        // Remove " - 0610"
    .replace(/\s*\(\d{4}\)\s*$/, '')        // Remove " (0610)"
    .replace(/^\d{4}\s+/, '')               // Remove "0610 "
    .replace(/^\[\d{4}\]\s+/, '')           // Remove "[0610] "
    .replace(/[_\/]\d{4}\s*$/, '')          // Remove "_0610" or "/0610"
    .trim();

  return cleaned;
}

/**
 * Detect the format of the subject string
 */
export function detectSubjectFormat(subjectString: string): SubjectFormat {
  if (!subjectString || typeof subjectString !== 'string') {
    return 'unknown';
  }

  const trimmed = subjectString.trim();

  // Check for specific patterns
  if (/\s*-\s*\d{4}\s*$/.test(trimmed)) {
    return 'name_dash_code';
  }
  if (/\(\d{4}\)\s*$/.test(trimmed)) {
    return 'name_paren_code';
  }
  if (/^\d{4}\s+/.test(trimmed) || /^\[\d{4}\]\s+/.test(trimmed)) {
    return 'code_space_name';
  }
  if (/^\d{4}$/.test(trimmed)) {
    return 'code_only';
  }

  // Check if it contains a code somewhere
  const hasCode = extractSubjectCode(trimmed);
  if (hasCode) {
    return 'name_dash_code'; // Default format if code detected
  }

  return 'name_only';
}

/**
 * Extract all possible codes from a subject string
 * Useful when multiple codes might be present
 */
export function extractAllPossibleCodes(subjectString: string): string[] {
  if (!subjectString || typeof subjectString !== 'string') {
    return [];
  }

  const codes: string[] = [];
  const codeMatches = subjectString.match(/\d{4}/g);

  if (codeMatches) {
    codes.push(...codeMatches);
  }

  // Remove duplicates
  return Array.from(new Set(codes));
}

/**
 * Extract complete subject metadata from input string
 * This is the main extraction function that combines all strategies
 */
export function extractSubjectMetadata(subjectString: string): SubjectMetadata {
  const originalString = subjectString || '';
  const cleanName = extractSubjectName(originalString);
  const code = extractSubjectCode(originalString);
  const possibleCodes = extractAllPossibleCodes(originalString);
  const formatDetected = detectSubjectFormat(originalString);

  // Normalize the name for matching (lowercase, remove extra spaces)
  const normalizedName = cleanName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '');

  return {
    originalString,
    cleanName,
    code,
    normalizedName,
    possibleCodes,
    formatDetected
  };
}

/**
 * Generate all possible subject string variations
 * Used to create comprehensive lookup keys
 */
export function generateSubjectVariations(name: string, code?: string): string[] {
  const variations: string[] = [];

  // Always add the base name
  variations.push(name);

  if (code) {
    // Add all format combinations
    variations.push(`${name} - ${code}`);
    variations.push(`${name} (${code})`);
    variations.push(`${code} ${name}`);
    variations.push(`[${code}] ${name}`);
    variations.push(`${name}_${code}`);
    variations.push(`${name}/${code}`);
    variations.push(code); // Just the code

    // Add without spaces
    variations.push(`${name}-${code}`);
    variations.push(`${name}(${code})`);
  }

  return variations;
}

/**
 * Check if a string is likely a subject code
 */
export function isLikelySubjectCode(input: string): boolean {
  if (!input || typeof input !== 'string') {
    return false;
  }

  const trimmed = input.trim();

  // 4-digit code pattern (most common)
  if (/^\d{4}$/.test(trimmed)) {
    return true;
  }

  // Cambridge format: starts with 0, 9, or 5
  if (/^[0-9]\d{3}$/.test(trimmed)) {
    return true;
  }

  return false;
}

/**
 * Validate if extracted metadata is complete and valid
 */
export function validateSubjectMetadata(metadata: SubjectMetadata): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!metadata.originalString) {
    errors.push('Original string is empty');
  }

  if (!metadata.cleanName) {
    errors.push('Could not extract subject name');
  }

  if (metadata.formatDetected === 'unknown') {
    warnings.push('Could not detect subject format');
  }

  if (!metadata.code && metadata.possibleCodes.length === 0) {
    warnings.push('No subject code found - this is acceptable but may reduce match confidence');
  }

  if (metadata.possibleCodes.length > 1) {
    warnings.push(`Multiple codes found: ${metadata.possibleCodes.join(', ')} - using first one`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
