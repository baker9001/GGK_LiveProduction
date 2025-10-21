/**
 * Subject Validators
 * Validation and confidence scoring for subject matches
 */

import { MatchResult, SubjectEntity, MatchStrategy } from './types';
import { calculateSimilarity } from './normalizers';

/**
 * Validate a match result and provide detailed feedback
 */
export function validateMatch(result: MatchResult): {
  isValid: boolean;
  confidence: number;
  issues: string[];
  warnings: string[];
  recommendations: string[];
} {
  const issues: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // Check if match was found
  if (!result.matched) {
    issues.push('No matching subject found in database');

    if (result.alternatives && result.alternatives.length > 0) {
      recommendations.push(
        `Consider using one of these alternatives: ${result.alternatives
          .slice(0, 3)
          .map(a => `${a.entity.name} (${Math.round(a.confidence * 100)}% match)`)
          .join(', ')}`
      );
    } else {
      recommendations.push('Create a new subject entry in the database');
    }

    return {
      isValid: false,
      confidence: 0,
      issues,
      warnings,
      recommendations
    };
  }

  // Validate confidence levels
  if (result.confidence < 0.70) {
    warnings.push('Match confidence is low - manual verification recommended');
  } else if (result.confidence < 0.85) {
    warnings.push('Match confidence is moderate - review recommended');
  }

  // Check strategy used
  const highConfidenceStrategies: MatchStrategy[] = [
    'exact_string',
    'exact_code',
    'exact_name'
  ];

  if (result.strategy && !highConfidenceStrategies.includes(result.strategy)) {
    warnings.push(`Match found using ${result.strategy} strategy - consider verifying`);
  }

  // Validate metadata completeness
  if (!result.metadata.code && result.subjectEntity?.code) {
    warnings.push('Input did not include subject code but matched subject has code');
    recommendations.push('Include subject code in input for more reliable matching');
  }

  if (result.metadata.code && !result.subjectEntity?.code) {
    warnings.push('Input includes subject code but matched subject does not have code');
  }

  // Check name similarity
  if (result.subjectEntity) {
    const nameSimilarity = calculateSimilarity(
      result.metadata.cleanName,
      result.subjectEntity.name
    );

    if (nameSimilarity < 0.8) {
      warnings.push(
        `Name similarity is low (${Math.round(nameSimilarity * 100)}%): ` +
        `"${result.metadata.cleanName}" vs "${result.subjectEntity.name}"`
      );
    }
  }

  // Provide recommendations based on confidence
  if (result.confidence >= 0.95) {
    recommendations.push('High confidence match - safe to proceed');
  } else if (result.confidence >= 0.85) {
    recommendations.push('Good match - review recommended');
  } else {
    recommendations.push('Moderate match - manual verification strongly recommended');
  }

  return {
    isValid: true,
    confidence: result.confidence,
    issues,
    warnings,
    recommendations
  };
}

/**
 * Calculate overall confidence score for a match
 * Considers multiple factors beyond just the initial match confidence
 */
export function calculateConfidenceScore(result: MatchResult): number {
  if (!result.matched || !result.subjectEntity) {
    return 0;
  }

  let score = result.confidence;

  // Boost score if codes match
  if (result.metadata.code && result.subjectEntity.code) {
    if (result.metadata.code === result.subjectEntity.code) {
      score = Math.min(1.0, score + 0.05);
    } else {
      score = Math.max(0, score - 0.10);
    }
  }

  // Boost score for high-confidence strategies
  const highConfidenceStrategies: MatchStrategy[] = [
    'exact_string',
    'exact_code',
    'exact_name'
  ];

  if (result.strategy && highConfidenceStrategies.includes(result.strategy)) {
    score = Math.min(1.0, score + 0.02);
  }

  // Penalize if name similarity is low
  const nameSimilarity = calculateSimilarity(
    result.metadata.cleanName,
    result.subjectEntity.name
  );

  if (nameSimilarity < 0.7) {
    score = Math.max(0, score - 0.10);
  }

  return Math.max(0, Math.min(1.0, score));
}

/**
 * Check if a match requires manual verification
 */
export function requiresManualVerification(result: MatchResult): boolean {
  if (!result.matched) {
    return true;
  }

  // Low confidence matches always need verification
  if (result.confidence < 0.85) {
    return true;
  }

  // Fuzzy matches need verification
  if (result.strategy === 'fuzzy_match') {
    return true;
  }

  // Code mismatch needs verification
  if (result.metadata.code && result.subjectEntity?.code) {
    if (result.metadata.code !== result.subjectEntity.code) {
      return true;
    }
  }

  // Significant name differences need verification
  if (result.subjectEntity) {
    const nameSimilarity = calculateSimilarity(
      result.metadata.cleanName,
      result.subjectEntity.name
    );
    if (nameSimilarity < 0.90) {
      return true;
    }
  }

  return false;
}

/**
 * Generate a human-readable match report
 */
export function generateMatchReport(result: MatchResult): string {
  const lines: string[] = [];

  lines.push('=== Subject Match Report ===\n');

  lines.push(`Input: "${result.metadata.originalString}"`);
  lines.push(`Clean Name: "${result.metadata.cleanName}"`);
  if (result.metadata.code) {
    lines.push(`Code: ${result.metadata.code}`);
  }
  lines.push(`Format Detected: ${result.metadata.formatDetected}`);
  lines.push('');

  if (result.matched && result.subjectEntity) {
    lines.push('✓ Match Found');
    lines.push(`Subject: ${result.subjectEntity.name}`);
    if (result.subjectEntity.code) {
      lines.push(`Code: ${result.subjectEntity.code}`);
    }
    lines.push(`ID: ${result.subjectEntity.id}`);
    lines.push(`Confidence: ${Math.round(result.confidence * 100)}%`);
    if (result.strategy) {
      lines.push(`Strategy: ${result.strategy}`);
    }
  } else {
    lines.push('✗ No Match Found');
  }

  lines.push('');

  // Add validation results
  const validation = validateMatch(result);

  if (validation.warnings.length > 0) {
    lines.push('Warnings:');
    validation.warnings.forEach(w => lines.push(`  ⚠ ${w}`));
    lines.push('');
  }

  if (validation.recommendations.length > 0) {
    lines.push('Recommendations:');
    validation.recommendations.forEach(r => lines.push(`  💡 ${r}`));
    lines.push('');
  }

  if (result.alternatives && result.alternatives.length > 0) {
    lines.push('Alternative Matches:');
    result.alternatives.slice(0, 5).forEach((alt, idx) => {
      lines.push(
        `  ${idx + 1}. ${alt.entity.name} ` +
        `${alt.entity.code ? `(${alt.entity.code})` : ''} - ` +
        `${Math.round(alt.confidence * 100)}% - ${alt.reason}`
      );
    });
    lines.push('');
  }

  // Add debug info if available
  if (result.debugInfo && result.debugInfo.attemptedStrategies.length > 0) {
    lines.push('Debug: Attempted Strategies');
    result.debugInfo.attemptedStrategies.forEach(attempt => {
      const status = attempt.found ? '✓' : '✗';
      lines.push(`  ${status} ${attempt.strategy}: "${attempt.searchKey}"`);
    });
  }

  return lines.join('\n');
}

/**
 * Compare two match results and determine which is better
 */
export function compareMatches(result1: MatchResult, result2: MatchResult): number {
  // Both didn't match
  if (!result1.matched && !result2.matched) {
    return 0;
  }

  // One matched, one didn't
  if (result1.matched && !result2.matched) {
    return 1;
  }
  if (!result1.matched && result2.matched) {
    return -1;
  }

  // Both matched - compare confidence
  const score1 = calculateConfidenceScore(result1);
  const score2 = calculateConfidenceScore(result2);

  if (score1 > score2) return 1;
  if (score1 < score2) return -1;

  return 0;
}

/**
 * Create a summary of multiple match results
 */
export function summarizeMatches(results: MatchResult[]): {
  totalInputs: number;
  matched: number;
  unmatched: number;
  highConfidence: number;
  mediumConfidence: number;
  lowConfidence: number;
  requiresVerification: number;
  averageConfidence: number;
} {
  const summary = {
    totalInputs: results.length,
    matched: 0,
    unmatched: 0,
    highConfidence: 0,
    mediumConfidence: 0,
    lowConfidence: 0,
    requiresVerification: 0,
    averageConfidence: 0
  };

  let totalConfidence = 0;

  results.forEach(result => {
    if (result.matched) {
      summary.matched++;
      totalConfidence += result.confidence;

      if (result.confidence >= 0.90) {
        summary.highConfidence++;
      } else if (result.confidence >= 0.75) {
        summary.mediumConfidence++;
      } else {
        summary.lowConfidence++;
      }

      if (requiresManualVerification(result)) {
        summary.requiresVerification++;
      }
    } else {
      summary.unmatched++;
    }
  });

  summary.averageConfidence = summary.matched > 0
    ? totalConfidence / summary.matched
    : 0;

  return summary;
}
