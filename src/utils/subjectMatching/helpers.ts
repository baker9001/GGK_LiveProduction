/**
 * Subject Matching Helpers
 * Convenient helper functions for common matching operations
 */

import { SubjectEntity, SubjectIndex, MatchResult } from './types';
import { buildSubjectIndex, matchSubject } from './matchers';
import { generateMatchReport, validateMatch } from './validators';

/**
 * Quick match helper - all-in-one function
 * Builds index and performs match in one call
 */
export async function quickMatch(
  input: string,
  subjects: SubjectEntity[],
  options?: {
    logReport?: boolean;
    throwOnNoMatch?: boolean;
  }
): Promise<MatchResult> {
  const index = buildSubjectIndex(subjects);
  const result = matchSubject(input, index);

  if (options?.logReport) {
    console.log(generateMatchReport(result));
  }

  if (options?.throwOnNoMatch && !result.matched) {
    throw new Error(`No match found for subject: ${input}`);
  }

  return result;
}

/**
 * Create a logging-enabled matcher
 * Returns a match function that automatically logs results
 */
export function createLoggingMatcher(subjects: SubjectEntity[]) {
  const index = buildSubjectIndex(subjects);

  return (input: string): MatchResult => {
    console.log(`\n[Subject Matcher] Attempting to match: "${input}"`);

    const result = matchSubject(input, index);

    if (result.matched) {
      console.log(`✓ Matched: ${result.subjectEntity?.name} (${result.subjectEntity?.code || 'no code'})`);
      console.log(`  Confidence: ${Math.round(result.confidence * 100)}%`);
      console.log(`  Strategy: ${result.strategy}`);
    } else {
      console.log(`✗ No match found`);
      if (result.alternatives && result.alternatives.length > 0) {
        console.log(`  Alternatives available: ${result.alternatives.length}`);
        result.alternatives.slice(0, 3).forEach((alt, idx) => {
          console.log(`    ${idx + 1}. ${alt.entity.name} (${Math.round(alt.confidence * 100)}%)`);
        });
      }
    }

    if (result.debugInfo) {
      console.log(`  Strategies attempted: ${result.debugInfo.attemptedStrategies.length}`);
    }

    return result;
  };
}

/**
 * Batch match with progress reporting
 */
export async function batchMatchWithProgress(
  inputs: string[],
  subjects: SubjectEntity[],
  onProgress?: (current: number, total: number, result: MatchResult) => void
): Promise<MatchResult[]> {
  const index = buildSubjectIndex(subjects);
  const results: MatchResult[] = [];

  for (let i = 0; i < inputs.length; i++) {
    const result = matchSubject(inputs[i], index);
    results.push(result);

    if (onProgress) {
      onProgress(i + 1, inputs.length, result);
    }
  }

  return results;
}

/**
 * Find all unmatched subjects in a list
 */
export function findUnmatchedSubjects(
  inputs: string[],
  subjects: SubjectEntity[]
): Array<{ input: string; alternatives: any[] }> {
  const index = buildSubjectIndex(subjects);
  const unmatched: Array<{ input: string; alternatives: any[] }> = [];

  inputs.forEach(input => {
    const result = matchSubject(input, index);
    if (!result.matched) {
      unmatched.push({
        input,
        alternatives: result.alternatives || []
      });
    }
  });

  return unmatched;
}

/**
 * Get match statistics for a list of inputs
 */
export function getMatchStatistics(
  inputs: string[],
  subjects: SubjectEntity[]
): {
  total: number;
  matched: number;
  unmatched: number;
  matchRate: number;
  averageConfidence: number;
  highConfidenceMatches: number;
  lowConfidenceMatches: number;
} {
  const index = buildSubjectIndex(subjects);
  let matched = 0;
  let totalConfidence = 0;
  let highConfidence = 0;
  let lowConfidence = 0;

  inputs.forEach(input => {
    const result = matchSubject(input, index);
    if (result.matched) {
      matched++;
      totalConfidence += result.confidence;

      if (result.confidence >= 0.90) {
        highConfidence++;
      } else if (result.confidence < 0.75) {
        lowConfidence++;
      }
    }
  });

  return {
    total: inputs.length,
    matched,
    unmatched: inputs.length - matched,
    matchRate: inputs.length > 0 ? matched / inputs.length : 0,
    averageConfidence: matched > 0 ? totalConfidence / matched : 0,
    highConfidenceMatches: highConfidence,
    lowConfidenceMatches: lowConfidence
  };
}

/**
 * Validate all matches and return issues
 */
export function validateAllMatches(
  inputs: string[],
  subjects: SubjectEntity[]
): Array<{
  input: string;
  result: MatchResult;
  validation: ReturnType<typeof validateMatch>;
}> {
  const index = buildSubjectIndex(subjects);
  const validations: Array<{
    input: string;
    result: MatchResult;
    validation: ReturnType<typeof validateMatch>;
  }> = [];

  inputs.forEach(input => {
    const result = matchSubject(input, index);
    const validation = validateMatch(result);

    validations.push({
      input,
      result,
      validation
    });
  });

  return validations;
}

/**
 * Export match results to JSON for debugging
 */
export function exportMatchResults(
  inputs: string[],
  subjects: SubjectEntity[]
): string {
  const index = buildSubjectIndex(subjects);
  const results = inputs.map(input => {
    const result = matchSubject(input, index);
    return {
      input,
      matched: result.matched,
      subjectId: result.subjectId,
      subjectName: result.subjectEntity?.name,
      subjectCode: result.subjectEntity?.code,
      confidence: result.confidence,
      strategy: result.strategy,
      alternatives: result.alternatives?.map(a => ({
        name: a.entity.name,
        code: a.entity.code,
        confidence: a.confidence,
        reason: a.reason
      }))
    };
  });

  return JSON.stringify(results, null, 2);
}
