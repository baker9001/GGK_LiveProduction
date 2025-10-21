/**
 * Subject Normalizers
 * Text normalization utilities for consistent subject matching
 * Handles case sensitivity, special characters, and variations
 */

/**
 * Normalize a string for matching
 * Consistent normalization is key to successful matching
 */
export function normalizeForMatching(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')                    // Multiple spaces to single space
    .replace(/[^\w\s]/g, '')                 // Remove special characters
    .replace(/\b(and|&)\b/g, 'and');         // Standardize "and"
}

/**
 * Normalize a subject name specifically
 * Preserves important subject-specific terminology
 */
export function normalizeSubjectName(name: string): string {
  if (!name || typeof name !== 'string') {
    return '';
  }

  let normalized = name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');

  // Standardize common variations
  normalized = normalized
    .replace(/\bbio\b/g, 'biology')
    .replace(/\bchem\b/g, 'chemistry')
    .replace(/\bphys\b/g, 'physics')
    .replace(/\bmath\b/g, 'mathematics')
    .replace(/\bmaths\b/g, 'mathematics')
    .replace(/\beng\b/g, 'english')
    .replace(/\bcomp\b/g, 'computing')
    .replace(/\bcs\b/g, 'computer science')
    .replace(/\bict\b/g, 'information technology')
    .replace(/\bgeog\b/g, 'geography')
    .replace(/\bhist\b/g, 'history')
    .replace(/\becon\b/g, 'economics')
    .replace(/\bbiz\b/g, 'business');

  // Remove common prefixes/suffixes
  normalized = normalized
    .replace(/^(igcse|gcse|a level|as level|ib)\s+/i, '')
    .replace(/\s+(igcse|gcse|a level|as level|ib)$/i, '')
    .replace(/\s+(extended|core|higher|foundation)$/i, '');

  // Remove special characters but keep spaces
  normalized = normalized.replace(/[^\w\s]/g, '');

  return normalized.trim();
}

/**
 * Normalize a code for matching
 */
export function normalizeCode(code: string): string {
  if (!code || typeof code !== 'string') {
    return '';
  }

  // Codes should be uppercase alphanumeric
  return code
    .toUpperCase()
    .trim()
    .replace(/\s+/g, '')
    .replace(/[^\w]/g, '');
}

/**
 * Create a fuzzy matching key
 * Removes all non-alphanumeric characters for loose matching
 */
export function createFuzzyKey(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Calculate similarity between two strings
 * Returns a value between 0 (no match) and 1 (perfect match)
 */
export function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) {
    return 0;
  }

  // Normalize both strings
  const s1 = normalizeForMatching(str1);
  const s2 = normalizeForMatching(str2);

  // Exact match
  if (s1 === s2) {
    return 1.0;
  }

  // One contains the other
  if (s1.includes(s2) || s2.includes(s1)) {
    return 0.9;
  }

  // Calculate Levenshtein distance
  const distance = levenshteinDistance(s1, s2);
  const maxLength = Math.max(s1.length, s2.length);

  if (maxLength === 0) {
    return 1.0;
  }

  // Convert distance to similarity score
  return 1 - (distance / maxLength);
}

/**
 * Levenshtein distance algorithm
 * Measures the minimum number of edits needed to transform one string to another
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;

  // Create a 2D array for dynamic programming
  const matrix: number[][] = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0));

  // Initialize first row and column
  for (let i = 0; i <= len1; i++) {
    matrix[i][0] = i;
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill the matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Check if two subject names are similar enough to be considered duplicates
 */
export function areSimilarSubjects(name1: string, name2: string, threshold = 0.85): boolean {
  const similarity = calculateSimilarity(name1, name2);
  return similarity >= threshold;
}

/**
 * Remove common academic qualifiers from subject names
 * Helps match subjects across different qualification levels
 */
export function removeQualifiers(subjectName: string): string {
  if (!subjectName || typeof subjectName !== 'string') {
    return '';
  }

  const qualifiers = [
    'extended',
    'core',
    'higher',
    'foundation',
    'advanced',
    'intermediate',
    'basic',
    'honors',
    'standard',
    'paper 1',
    'paper 2',
    'paper 3',
    'paper 4',
    'component 1',
    'component 2',
    'theory',
    'practical',
    'alternative to practical'
  ];

  let cleaned = subjectName.toLowerCase();

  qualifiers.forEach(qualifier => {
    const regex = new RegExp(`\\b${qualifier}\\b`, 'gi');
    cleaned = cleaned.replace(regex, '');
  });

  return cleaned
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Standardize subject name for database storage
 * Ensures consistent naming across all subjects
 */
export function standardizeSubjectName(name: string): string {
  if (!name || typeof name !== 'string') {
    return '';
  }

  // Capitalize first letter of each word
  return name
    .trim()
    .split(' ')
    .map(word => {
      if (word.length === 0) return '';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Create all normalized variations of a subject string
 * Used for building comprehensive search indexes
 */
export function createNormalizedVariations(text: string): string[] {
  const variations = new Set<string>();

  // Add original
  variations.add(text);

  // Add normalized versions
  variations.add(normalizeForMatching(text));
  variations.add(normalizeSubjectName(text));
  variations.add(createFuzzyKey(text));
  variations.add(removeQualifiers(text));

  // Add case variations
  variations.add(text.toLowerCase());
  variations.add(text.toUpperCase());
  variations.add(standardizeSubjectName(text));

  // Remove empty strings
  return Array.from(variations).filter(v => v.length > 0);
}
