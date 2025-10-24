/**
 * Subject Matchers
 * Multi-strategy matching algorithms for finding subjects in database
 * Implements priority-based matching with fallback strategies
 */

import { SubjectEntity, SubjectIndex, MatchResult, MatchStrategy, SubjectMatchingConfig, DEFAULT_MATCHING_CONFIG } from './types';
import { extractSubjectMetadata, generateSubjectVariations, isLikelySubjectCode } from './extractors';
import { normalizeForMatching, normalizeSubjectName, normalizeCode, calculateSimilarity, areSimilarSubjects, createFuzzyKey } from './normalizers';

/**
 * Build comprehensive subject index from database subjects
 * Creates multiple lookup maps for fast matching
 */
export function buildSubjectIndex(subjects: SubjectEntity[]): SubjectIndex {
  const byName = new Map<string, SubjectEntity>();
  const byCode = new Map<string, SubjectEntity>();
  const byNormalized = new Map<string, SubjectEntity>();
  const byCombination = new Map<string, SubjectEntity>();
  const byExactString = new Map<string, SubjectEntity>();

  subjects.forEach(subject => {
    // Index by exact name
    if (subject.name) {
      byName.set(subject.name, subject);
      byName.set(subject.name.toLowerCase(), subject);

      // Index by exact string (original)
      byExactString.set(subject.name, subject);
    }

    // Index by code (most reliable)
    if (subject.code) {
      byCode.set(subject.code, subject);
      byCode.set(subject.code.toLowerCase(), subject);
      byCode.set(normalizeCode(subject.code), subject);
    }

    // Index by normalized name
    if (subject.name) {
      const normalized = normalizeForMatching(subject.name);
      byNormalized.set(normalized, subject);

      const normalizedSubject = normalizeSubjectName(subject.name);
      byNormalized.set(normalizedSubject, subject);

      const fuzzyKey = createFuzzyKey(subject.name);
      byNormalized.set(fuzzyKey, subject);
    }

    // Index by all possible combinations
    if (subject.name && subject.code) {
      const variations = generateSubjectVariations(subject.name, subject.code);
      variations.forEach(variation => {
        byCombination.set(variation, subject);
        byCombination.set(variation.toLowerCase(), subject);
        byCombination.set(normalizeForMatching(variation), subject);
      });
    }

    // Index by name without code (for matching "Biology" to "Biology - 0610")
    if (subject.name) {
      // Extract clean name if it has a code pattern
      const cleanName = subject.name
        .replace(/\s*-\s*\d{4}\s*$/, '')
        .replace(/\s*\(\d{4}\)\s*$/, '')
        .trim();

      if (cleanName !== subject.name) {
        byName.set(cleanName, subject);
        byName.set(cleanName.toLowerCase(), subject);
        byNormalized.set(normalizeForMatching(cleanName), subject);
        byNormalized.set(normalizeSubjectName(cleanName), subject);
      }
    }
  });

  return {
    byName,
    byCode,
    byNormalized,
    byCombination,
    byExactString
  };
}

/**
 * Match a subject using multiple strategies with priority ordering
 */
export function matchSubject(
  input: string,
  index: SubjectIndex,
  config: SubjectMatchingConfig = DEFAULT_MATCHING_CONFIG
): MatchResult {
  const metadata = extractSubjectMetadata(input);
  const attemptedStrategies: Array<{ strategy: MatchStrategy; searchKey: string; found: boolean }> = [];

  // Strategy 1: Exact string match (highest priority)
  let entity = index.byExactString.get(input);
  attemptedStrategies.push({ strategy: 'exact_string', searchKey: input, found: !!entity });
  if (entity) {
    return createMatchResult(true, entity, 1.0, 'exact_string', metadata, attemptedStrategies);
  }

  // Strategy 2: Exact code match (very reliable)
  if (metadata.code) {
    entity = index.byCode.get(metadata.code);
    attemptedStrategies.push({ strategy: 'exact_code', searchKey: metadata.code, found: !!entity });
    if (entity) {
      return createMatchResult(true, entity, 0.98, 'exact_code', metadata, attemptedStrategies);
    }

    // Try normalized code
    const normalizedCode = normalizeCode(metadata.code);
    entity = index.byCode.get(normalizedCode);
    attemptedStrategies.push({ strategy: 'exact_code', searchKey: normalizedCode, found: !!entity });
    if (entity) {
      return createMatchResult(true, entity, 0.97, 'exact_code', metadata, attemptedStrategies);
    }
  }

  // Strategy 3: Exact name match
  entity = index.byName.get(metadata.cleanName);
  attemptedStrategies.push({ strategy: 'exact_name', searchKey: metadata.cleanName, found: !!entity });
  if (entity) {
    return createMatchResult(true, entity, 0.95, 'exact_name', metadata, attemptedStrategies);
  }

  // Try lowercase exact name
  entity = index.byName.get(metadata.cleanName.toLowerCase());
  attemptedStrategies.push({ strategy: 'exact_name', searchKey: metadata.cleanName.toLowerCase(), found: !!entity });
  if (entity) {
    return createMatchResult(true, entity, 0.94, 'exact_name', metadata, attemptedStrategies);
  }

  // Strategy 4: Name without code (matches "Biology" to "Biology - 0610")
  const nameWithoutCode = metadata.cleanName;
  entity = index.byName.get(nameWithoutCode);
  attemptedStrategies.push({ strategy: 'name_without_code', searchKey: nameWithoutCode, found: !!entity });
  if (entity) {
    return createMatchResult(true, entity, 0.92, 'name_without_code', metadata, attemptedStrategies);
  }

  // Strategy 5: Name with dash code format
  if (metadata.code) {
    const dashFormat = `${metadata.cleanName} - ${metadata.code}`;
    entity = index.byCombination.get(dashFormat);
    attemptedStrategies.push({ strategy: 'name_dash_code', searchKey: dashFormat, found: !!entity });
    if (entity) {
      return createMatchResult(true, entity, 0.90, 'name_dash_code', metadata, attemptedStrategies);
    }

    // Try lowercase
    entity = index.byCombination.get(dashFormat.toLowerCase());
    attemptedStrategies.push({ strategy: 'name_dash_code', searchKey: dashFormat.toLowerCase(), found: !!entity });
    if (entity) {
      return createMatchResult(true, entity, 0.89, 'name_dash_code', metadata, attemptedStrategies);
    }
  }

  // Strategy 6: Name with parenthesis code format
  if (metadata.code) {
    const parenFormat = `${metadata.cleanName} (${metadata.code})`;
    entity = index.byCombination.get(parenFormat);
    attemptedStrategies.push({ strategy: 'name_paren_code', searchKey: parenFormat, found: !!entity });
    if (entity) {
      return createMatchResult(true, entity, 0.88, 'name_paren_code', metadata, attemptedStrategies);
    }

    // Try lowercase
    entity = index.byCombination.get(parenFormat.toLowerCase());
    attemptedStrategies.push({ strategy: 'name_paren_code', searchKey: parenFormat.toLowerCase(), found: !!entity });
    if (entity) {
      return createMatchResult(true, entity, 0.87, 'name_paren_code', metadata, attemptedStrategies);
    }
  }

  // Strategy 7: Code space name format
  if (metadata.code) {
    const codeSpaceName = `${metadata.code} ${metadata.cleanName}`;
    entity = index.byCombination.get(codeSpaceName);
    attemptedStrategies.push({ strategy: 'code_space_name', searchKey: codeSpaceName, found: !!entity });
    if (entity) {
      return createMatchResult(true, entity, 0.86, 'code_space_name', metadata, attemptedStrategies);
    }
  }

  // Strategy 8: Normalized name match
  entity = index.byNormalized.get(metadata.normalizedName);
  attemptedStrategies.push({ strategy: 'normalized_name', searchKey: metadata.normalizedName, found: !!entity });
  if (entity) {
    return createMatchResult(true, entity, 0.85, 'normalized_name', metadata, attemptedStrategies);
  }

  const normalizedSubject = normalizeSubjectName(metadata.cleanName);
  entity = index.byNormalized.get(normalizedSubject);
  attemptedStrategies.push({ strategy: 'normalized_name', searchKey: normalizedSubject, found: !!entity });
  if (entity) {
    return createMatchResult(true, entity, 0.84, 'normalized_name', metadata, attemptedStrategies);
  }

  // Strategy 9: Normalized combination match
  if (metadata.code) {
    const normalizedCombo = normalizeForMatching(`${metadata.cleanName} ${metadata.code}`);
    entity = index.byCombination.get(normalizedCombo);
    attemptedStrategies.push({ strategy: 'normalized_combination', searchKey: normalizedCombo, found: !!entity });
    if (entity) {
      return createMatchResult(true, entity, 0.83, 'normalized_combination', metadata, attemptedStrategies);
    }
  }

  // Strategy 10: Fuzzy matching (if enabled)
  if (config.enableFuzzyMatching) {
    const fuzzyResult = performFuzzyMatch(metadata, index, config.fuzzyThreshold);
    if (fuzzyResult.entity) {
      attemptedStrategies.push({ strategy: 'fuzzy_match', searchKey: 'fuzzy_search', found: true });
      return createMatchResult(
        true,
        fuzzyResult.entity,
        fuzzyResult.confidence,
        'fuzzy_match',
        metadata,
        attemptedStrategies,
        fuzzyResult.alternatives
      );
    }
  }

  // No match found - return alternatives if available
  const alternatives = findAlternatives(metadata, index, config.maxAlternatives);

  return {
    matched: false,
    confidence: 0,
    metadata,
    alternatives,
    debugInfo: {
      attemptedStrategies,
      allKeys: generateAllSearchKeys(metadata)
    }
  };
}

/**
 * Perform fuzzy matching across all subjects
 */
function performFuzzyMatch(
  metadata: any,
  index: SubjectIndex,
  threshold: number
): { entity?: SubjectEntity; confidence: number; alternatives: any[] } {
  const candidates: Array<{ entity: SubjectEntity; similarity: number }> = [];

  // Check against all subjects in the index
  const allSubjects = new Set<SubjectEntity>();
  index.byName.forEach(s => allSubjects.add(s));
  index.byCode.forEach(s => allSubjects.add(s));

  allSubjects.forEach(subject => {
    // Calculate similarity with name
    const nameSimilarity = calculateSimilarity(metadata.cleanName, subject.name);

    // Calculate similarity with code if available
    let codeSimilarity = 0;
    if (metadata.code && subject.code) {
      codeSimilarity = metadata.code === subject.code ? 1.0 : 0;
    }

    // Use the best similarity score
    const bestSimilarity = Math.max(nameSimilarity, codeSimilarity);

    if (bestSimilarity >= threshold) {
      candidates.push({ entity: subject, similarity: bestSimilarity });
    }
  });

  // Sort by similarity
  candidates.sort((a, b) => b.similarity - a.similarity);

  const alternatives = candidates.slice(1, 6).map(c => ({
    entity: c.entity,
    confidence: c.similarity,
    reason: `${Math.round(c.similarity * 100)}% similar to "${metadata.cleanName}"`
  }));

  if (candidates.length > 0) {
    return {
      entity: candidates[0].entity,
      confidence: candidates[0].similarity,
      alternatives
    };
  }

  return { confidence: 0, alternatives };
}

/**
 * Find alternative subjects that might match
 */
function findAlternatives(
  metadata: any,
  index: SubjectIndex,
  maxAlternatives: number
): Array<{ entity: SubjectEntity; confidence: number; reason: string }> {
  const alternatives: Array<{ entity: SubjectEntity; confidence: number; reason: string }> = [];
  const seen = new Set<string>();

  // Find subjects with similar names
  const allSubjects = Array.from(new Set([...index.byName.values()]));

  allSubjects.forEach(subject => {
    if (seen.has(subject.id)) return;

    const similarity = calculateSimilarity(metadata.cleanName, subject.name);

    if (similarity >= 0.6) {
      alternatives.push({
        entity: subject,
        confidence: similarity,
        reason: `${Math.round(similarity * 100)}% name similarity`
      });
      seen.add(subject.id);
    }

    // Check code match
    if (metadata.code && subject.code && metadata.code === subject.code) {
      if (!seen.has(subject.id)) {
        alternatives.push({
          entity: subject,
          confidence: 0.95,
          reason: 'Matching code'
        });
        seen.add(subject.id);
      }
    }
  });

  // Sort by confidence
  alternatives.sort((a, b) => b.confidence - a.confidence);

  return alternatives.slice(0, maxAlternatives);
}

/**
 * Create a match result object
 */
function createMatchResult(
  matched: boolean,
  entity: SubjectEntity | undefined,
  confidence: number,
  strategy: MatchStrategy,
  metadata: any,
  attemptedStrategies: any[],
  alternatives?: any[]
): MatchResult {
  return {
    matched,
    subjectId: entity?.id,
    subjectEntity: entity,
    confidence,
    strategy,
    metadata,
    alternatives,
    debugInfo: {
      attemptedStrategies,
      allKeys: generateAllSearchKeys(metadata)
    }
  };
}

/**
 * Generate all possible search keys for debugging
 */
function generateAllSearchKeys(metadata: any): string[] {
  const keys: string[] = [];

  keys.push(metadata.originalString);
  keys.push(metadata.cleanName);
  keys.push(metadata.normalizedName);

  if (metadata.code) {
    keys.push(metadata.code);
    keys.push(`${metadata.cleanName} - ${metadata.code}`);
    keys.push(`${metadata.cleanName} (${metadata.code})`);
    keys.push(`${metadata.code} ${metadata.cleanName}`);
  }

  return keys;
}

/**
 * Batch match multiple subjects at once
 * More efficient for bulk operations
 */
export function batchMatchSubjects(
  inputs: string[],
  index: SubjectIndex,
  config: SubjectMatchingConfig = DEFAULT_MATCHING_CONFIG
): MatchResult[] {
  return inputs.map(input => matchSubject(input, index, config));
}

/**
 * Validate a match result
 * Returns whether the match is reliable enough to use
 */
export function isReliableMatch(result: MatchResult, minConfidence = 0.80): boolean {
  return result.matched && result.confidence >= minConfidence;
}
