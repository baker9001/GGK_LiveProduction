/**
 * Validation utilities for acceptable_variations field
 * Ensures data quality and prevents common errors
 */

import { isStructuredFormat } from '../constants/answerOptions';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  cleaned?: string[];
}

/**
 * Validates an array of acceptable variations
 * Checks for:
 * - Empty strings
 * - Duplicate values
 * - Excessive whitespace
 * - Match with main answer
 * - Format-specific validation
 */
export function validateAcceptableVariations(
  variations: string[] | undefined | null,
  mainAnswer?: string,
  format?: string | null
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Handle null/undefined cases
  if (!variations || variations.length === 0) {
    return {
      isValid: true,
      errors: [],
      warnings: [],
      cleaned: []
    };
  }

  // Check for empty strings
  const hasEmptyStrings = variations.some(v => !v || v.trim() === '');
  if (hasEmptyStrings) {
    errors.push('Acceptable variations cannot contain empty strings');
  }

  // Clean and normalize variations
  const cleaned = variations
    .filter(v => v && v.trim() !== '')
    .map(v => v.trim());

  // Check for duplicates (case-sensitive)
  const uniqueVariations = new Set(cleaned);
  if (uniqueVariations.size !== cleaned.length) {
    errors.push('Acceptable variations contain duplicate values');
  }

  // Check if any variation matches the main answer
  if (mainAnswer) {
    const normalizedAnswer = mainAnswer.trim();
    const matchesMainAnswer = cleaned.some(v => v === normalizedAnswer);
    if (matchesMainAnswer) {
      warnings.push('One or more variations match the main answer exactly');
    }
  }

  // Check for variations that differ only in whitespace
  const whitespaceNormalized = cleaned.map(v => v.replace(/\s+/g, ' '));
  const uniqueWhitespace = new Set(whitespaceNormalized);
  if (uniqueWhitespace.size !== cleaned.length) {
    warnings.push('Some variations differ only in whitespace');
  }

  // Check for very long variations (potential data entry errors)
  const tooLong = cleaned.filter(v => v.length > 200);
  if (tooLong.length > 0) {
    warnings.push(`${tooLong.length} variation(s) are unusually long (>200 characters)`);
  }

  // Format-specific validation
  if (format && isStructuredFormat(format)) {
    switch (format) {
      case 'code':
        warnings.push('Ensure code variations are syntactically valid');
        break;
      case 'equation':
        warnings.push('Verify equation variations are mathematically equivalent');
        break;
      case 'calculation':
        warnings.push('Variations for calculations should apply to final answer only');
        break;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    cleaned
  };
}

/**
 * Cleans and deduplicates acceptable variations
 * Removes empty strings, trims whitespace, and removes duplicates
 */
export function cleanAcceptableVariations(
  variations: string[] | undefined | null
): string[] {
  if (!variations || variations.length === 0) {
    return [];
  }

  const cleaned = variations
    .filter(v => v && v.trim() !== '')
    .map(v => v.trim());

  // Remove duplicates while preserving order
  return Array.from(new Set(cleaned));
}

/**
 * Checks if a given answer matches any acceptable variation
 * Used during answer validation and auto-marking
 */
export function matchesVariation(
  userAnswer: string,
  acceptableVariations: string[] | undefined | null,
  options: {
    caseSensitive?: boolean;
    ignoreWhitespace?: boolean;
    trimWhitespace?: boolean;
  } = {}
): boolean {
  if (!acceptableVariations || acceptableVariations.length === 0) {
    return false;
  }

  const {
    caseSensitive = true,
    ignoreWhitespace = false,
    trimWhitespace = true
  } = options;

  let processedUserAnswer = userAnswer;

  if (trimWhitespace) {
    processedUserAnswer = processedUserAnswer.trim();
  }

  if (ignoreWhitespace) {
    processedUserAnswer = processedUserAnswer.replace(/\s+/g, '');
  }

  if (!caseSensitive) {
    processedUserAnswer = processedUserAnswer.toLowerCase();
  }

  return acceptableVariations.some(variation => {
    let processedVariation = variation;

    if (trimWhitespace) {
      processedVariation = processedVariation.trim();
    }

    if (ignoreWhitespace) {
      processedVariation = processedVariation.replace(/\s+/g, '');
    }

    if (!caseSensitive) {
      processedVariation = processedVariation.toLowerCase();
    }

    return processedUserAnswer === processedVariation;
  });
}

/**
 * Adds a new variation with validation
 * Returns the updated array and any errors
 */
export function addVariation(
  currentVariations: string[] | undefined | null,
  newVariation: string,
  mainAnswer?: string
): { updated: string[]; errors: string[] } {
  const errors: string[] = [];
  const current = currentVariations || [];

  // Validate new variation
  const trimmed = newVariation.trim();

  if (!trimmed) {
    errors.push('Cannot add empty variation');
    return { updated: current, errors };
  }

  // Check for duplicates
  if (current.some(v => v === trimmed)) {
    errors.push('This variation already exists');
    return { updated: current, errors };
  }

  // Check against main answer
  if (mainAnswer && trimmed === mainAnswer.trim()) {
    errors.push('Variation matches the main answer');
  }

  return {
    updated: [...current, trimmed],
    errors
  };
}

/**
 * Removes a variation by index
 */
export function removeVariation(
  variations: string[] | undefined | null,
  index: number
): string[] {
  if (!variations || index < 0 || index >= variations.length) {
    return variations || [];
  }

  return variations.filter((_, i) => i !== index);
}

/**
 * Updates a variation at a specific index with validation
 */
export function updateVariation(
  variations: string[] | undefined | null,
  index: number,
  newValue: string,
  mainAnswer?: string
): { updated: string[]; errors: string[] } {
  const errors: string[] = [];
  const current = variations || [];

  if (index < 0 || index >= current.length) {
    errors.push('Invalid variation index');
    return { updated: current, errors };
  }

  const trimmed = newValue.trim();

  if (!trimmed) {
    errors.push('Variation cannot be empty');
    return { updated: current, errors };
  }

  // Check for duplicates (excluding current index)
  if (current.some((v, i) => i !== index && v === trimmed)) {
    errors.push('This variation already exists');
    return { updated: current, errors };
  }

  // Check against main answer
  if (mainAnswer && trimmed === mainAnswer.trim()) {
    errors.push('Variation matches the main answer');
  }

  const updated = [...current];
  updated[index] = trimmed;

  return { updated, errors };
}

/**
 * Bulk import variations with validation
 * Useful for importing from text or CSV
 */
export function bulkImportVariations(
  text: string,
  delimiter: string = '\n',
  mainAnswer?: string
): { variations: string[]; errors: string[]; warnings: string[] } {
  const lines = text
    .split(delimiter)
    .map(line => line.trim())
    .filter(line => line !== '');

  const validation = validateAcceptableVariations(lines, mainAnswer);

  return {
    variations: validation.cleaned || [],
    errors: validation.errors,
    warnings: validation.warnings
  };
}
