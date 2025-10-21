/**
 * Subject Matching Types
 * Universal type definitions for subject matching across all academic subjects
 */

export interface SubjectMetadata {
  originalString: string;
  cleanName: string;
  code?: string;
  normalizedName: string;
  possibleCodes: string[];
  formatDetected: SubjectFormat;
}

export type SubjectFormat =
  | 'name_dash_code'      // "Biology - 0610"
  | 'name_paren_code'     // "Biology (0610)"
  | 'code_space_name'     // "0610 Biology"
  | 'name_only'           // "Biology"
  | 'code_only'           // "0610"
  | 'unknown';

export interface SubjectEntity {
  id: string;
  name: string;
  code?: string;
  status?: string;
}

export interface SubjectIndex {
  byName: Map<string, SubjectEntity>;
  byCode: Map<string, SubjectEntity>;
  byNormalized: Map<string, SubjectEntity>;
  byCombination: Map<string, SubjectEntity>;
  byExactString: Map<string, SubjectEntity>;
}

export type MatchStrategy =
  | 'exact_string'
  | 'exact_code'
  | 'exact_name'
  | 'name_without_code'
  | 'name_dash_code'
  | 'name_paren_code'
  | 'code_space_name'
  | 'normalized_name'
  | 'normalized_combination'
  | 'fuzzy_match';

export interface MatchResult {
  matched: boolean;
  subjectId?: string;
  subjectEntity?: SubjectEntity;
  confidence: number;
  strategy?: MatchStrategy;
  metadata: SubjectMetadata;
  alternatives?: Array<{
    entity: SubjectEntity;
    confidence: number;
    reason: string;
  }>;
  debugInfo?: {
    attemptedStrategies: Array<{
      strategy: MatchStrategy;
      searchKey: string;
      found: boolean;
    }>;
    allKeys: string[];
  };
}

export interface SubjectMatchingConfig {
  enableFuzzyMatching: boolean;
  fuzzyThreshold: number;
  enableLogging: boolean;
  maxAlternatives: number;
  strictCodeMatching: boolean;
}

export const DEFAULT_MATCHING_CONFIG: SubjectMatchingConfig = {
  enableFuzzyMatching: true,
  fuzzyThreshold: 0.85,
  enableLogging: true,
  maxAlternatives: 5,
  strictCodeMatching: false
};
