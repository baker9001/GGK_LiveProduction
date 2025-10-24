/**
 * Subject Matching Utilities
 * Universal subject matching system for all academic subjects
 *
 * Usage:
 * ```typescript
 * import { buildSubjectIndex, matchSubject } from '@/utils/subjectMatching';
 *
 * // Build index from database subjects
 * const subjects = await fetchSubjects();
 * const index = buildSubjectIndex(subjects);
 *
 * // Match a subject from JSON
 * const result = matchSubject("Biology - 0610", index);
 *
 * if (result.matched) {
 *   console.log(`Matched: ${result.subjectEntity.name}`);
 *   console.log(`Confidence: ${result.confidence * 100}%`);
 * }
 * ```
 */

// Types
export type {
  SubjectMetadata,
  SubjectFormat,
  SubjectEntity,
  SubjectIndex,
  MatchStrategy,
  MatchResult,
  SubjectMatchingConfig
} from './types';

export { DEFAULT_MATCHING_CONFIG } from './types';

// Extractors
export {
  extractSubjectCode,
  extractSubjectName,
  detectSubjectFormat,
  extractAllPossibleCodes,
  extractSubjectMetadata,
  generateSubjectVariations,
  isLikelySubjectCode,
  validateSubjectMetadata
} from './extractors';

// Normalizers
export {
  normalizeForMatching,
  normalizeSubjectName,
  normalizeCode,
  createFuzzyKey,
  calculateSimilarity,
  areSimilarSubjects,
  removeQualifiers,
  standardizeSubjectName,
  createNormalizedVariations
} from './normalizers';

// Matchers
export {
  buildSubjectIndex,
  matchSubject,
  batchMatchSubjects,
  isReliableMatch
} from './matchers';

// Validators
export {
  validateMatch,
  calculateConfidenceScore,
  requiresManualVerification,
  generateMatchReport,
  compareMatches,
  summarizeMatches
} from './validators';

/**
 * Quick match helper - simplified interface for common use case
 */
export { quickMatch } from './helpers';
