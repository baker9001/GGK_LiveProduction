/**
 * Question Identifier Utility Module
 *
 * Provides stable, deterministic question identifiers for the question import system.
 * These identifiers are based on question numbers and hierarchical labels rather than
 * temporary IDs or array indices, ensuring consistency between edit and simulation modes.
 *
 * CRITICAL: These identifiers are used as foreign keys in the database for:
 * - table_templates_import_review.question_identifier
 * - Other review/preview data associations
 *
 * Identifier Format:
 * - Main question:  "q_{number}"                    e.g., "q_1"
 * - Question part:  "q_{number}-part-{label}"       e.g., "q_1-part-a"
 * - Subpart:        "q_{number}-part-{label}-sub-{label}"  e.g., "q_1-part-a-sub-iii"
 */

/**
 * Normalize a label to lowercase alphanumeric format
 * Removes whitespace, punctuation, and special characters
 *
 * Examples:
 * - "a" → "a"
 * - "(A)" → "a"
 * - "Part B" → "b"
 * - "i" → "i"
 * - "(iii)" → "iii"
 */
function normalizeLabel(label: string | undefined | null): string {
  if (!label) return '';

  // Convert to string and lowercase
  const str = String(label).toLowerCase();

  // Remove all non-alphanumeric characters
  const cleaned = str.replace(/[^a-z0-9]/g, '');

  return cleaned;
}

/**
 * Extract question number from various formats
 *
 * Handles:
 * - Plain numbers: 1, 2, 3
 * - String numbers: "1", "2", "3"
 * - Formatted: "Question 1", "Q1", "#1"
 *
 * Returns the numeric part as a string
 */
function extractQuestionNumber(input: string | number | undefined | null): string {
  if (!input && input !== 0) return '';

  // If it's already a number, convert to string
  if (typeof input === 'number') {
    return String(input);
  }

  // Convert to string
  const str = String(input);

  // Try to extract first number sequence
  const match = str.match(/\d+/);
  if (match) {
    return match[0];
  }

  return '';
}

/**
 * Generate stable identifier for a main question
 *
 * @param questionNumber - Question number (e.g., 1, 2, "3", "Question 4")
 * @returns Identifier in format "q_{number}" (e.g., "q_1")
 *
 * @example
 * generateQuestionIdentifier(1) // "q_1"
 * generateQuestionIdentifier("2") // "q_2"
 * generateQuestionIdentifier("Question 3") // "q_3"
 */
export function generateQuestionIdentifier(
  questionNumber: string | number | undefined | null
): string {
  const num = extractQuestionNumber(questionNumber);

  if (!num) {
    console.warn('[generateQuestionIdentifier] Invalid question number:', questionNumber);
    return 'q_unknown';
  }

  const identifier = `q_${num}`;

  console.log('[generateQuestionIdentifier]', {
    input: questionNumber,
    extracted: num,
    result: identifier
  });

  return identifier;
}

/**
 * Generate stable identifier for a question part
 *
 * @param questionNumber - Question number (e.g., 1, 2, "3")
 * @param partLabel - Part label (e.g., "a", "b", "c", "(A)", "Part B")
 * @returns Identifier in format "q_{number}-part-{label}" (e.g., "q_1-part-a")
 *
 * @example
 * generatePartIdentifier(1, "a") // "q_1-part-a"
 * generatePartIdentifier("2", "(B)") // "q_2-part-b"
 * generatePartIdentifier(3, "Part C") // "q_3-part-c"
 */
export function generatePartIdentifier(
  questionNumber: string | number | undefined | null,
  partLabel: string | undefined | null
): string {
  const num = extractQuestionNumber(questionNumber);
  const label = normalizeLabel(partLabel);

  if (!num) {
    console.warn('[generatePartIdentifier] Invalid question number:', questionNumber);
    return 'q_unknown-part-unknown';
  }

  if (!label) {
    console.warn('[generatePartIdentifier] Invalid part label:', partLabel);
    return `q_${num}-part-unknown`;
  }

  const identifier = `q_${num}-part-${label}`;

  console.log('[generatePartIdentifier]', {
    questionNumber,
    partLabel,
    extractedNum: num,
    normalizedLabel: label,
    result: identifier
  });

  return identifier;
}

/**
 * Generate stable identifier for a question subpart
 *
 * @param questionNumber - Question number (e.g., 1, 2, "3")
 * @param partLabel - Part label (e.g., "a", "b", "c")
 * @param subpartLabel - Subpart label (e.g., "i", "ii", "iii", "(I)")
 * @returns Identifier in format "q_{number}-part-{part}-sub-{subpart}"
 *
 * @example
 * generateSubpartIdentifier(1, "a", "i") // "q_1-part-a-sub-i"
 * generateSubpartIdentifier("2", "b", "iii") // "q_2-part-b-sub-iii"
 * generateSubpartIdentifier(3, "(C)", "(II)") // "q_3-part-c-sub-ii"
 */
export function generateSubpartIdentifier(
  questionNumber: string | number | undefined | null,
  partLabel: string | undefined | null,
  subpartLabel: string | undefined | null
): string {
  const num = extractQuestionNumber(questionNumber);
  const part = normalizeLabel(partLabel);
  const sub = normalizeLabel(subpartLabel);

  if (!num) {
    console.warn('[generateSubpartIdentifier] Invalid question number:', questionNumber);
    return 'q_unknown-part-unknown-sub-unknown';
  }

  if (!part) {
    console.warn('[generateSubpartIdentifier] Invalid part label:', partLabel);
    return `q_${num}-part-unknown-sub-${sub || 'unknown'}`;
  }

  if (!sub) {
    console.warn('[generateSubpartIdentifier] Invalid subpart label:', subpartLabel);
    return `q_${num}-part-${part}-sub-unknown`;
  }

  const identifier = `q_${num}-part-${part}-sub-${sub}`;

  console.log('[generateSubpartIdentifier]', {
    questionNumber,
    partLabel,
    subpartLabel,
    extractedNum: num,
    normalizedPart: part,
    normalizedSub: sub,
    result: identifier
  });

  return identifier;
}

/**
 * Parse a question identifier into its components
 *
 * @param identifier - Question identifier (e.g., "q_1-part-a-sub-iii")
 * @returns Object with parsed components
 *
 * @example
 * parseQuestionIdentifier("q_1")
 * // { questionNumber: "1" }
 *
 * parseQuestionIdentifier("q_1-part-a")
 * // { questionNumber: "1", partLabel: "a" }
 *
 * parseQuestionIdentifier("q_1-part-a-sub-iii")
 * // { questionNumber: "1", partLabel: "a", subpartLabel: "iii" }
 */
export function parseQuestionIdentifier(identifier: string): {
  questionNumber?: string;
  partLabel?: string;
  subpartLabel?: string;
} {
  if (!identifier) {
    return {};
  }

  // Match pattern: q_{number}(-part-{label})?(-sub-{label})?
  const pattern = /^q_(\d+)(?:-part-([a-z0-9]+))?(?:-sub-([a-z0-9]+))?$/;
  const match = identifier.match(pattern);

  if (!match) {
    console.warn('[parseQuestionIdentifier] Invalid identifier format:', identifier);
    return {};
  }

  const result: {
    questionNumber?: string;
    partLabel?: string;
    subpartLabel?: string;
  } = {
    questionNumber: match[1]
  };

  if (match[2]) {
    result.partLabel = match[2];
  }

  if (match[3]) {
    result.subpartLabel = match[3];
  }

  return result;
}

/**
 * Check if a string is a valid question identifier
 *
 * @param identifier - String to validate
 * @returns True if valid identifier format
 */
export function isValidQuestionIdentifier(identifier: string): boolean {
  if (!identifier) return false;

  // Must match pattern: q_{number}(-part-{label})?(-sub-{label})?
  const pattern = /^q_\d+(-part-[a-z0-9]+)?(-sub-[a-z0-9]+)?$/;
  return pattern.test(identifier);
}

/**
 * Get the hierarchy level of an identifier
 *
 * @param identifier - Question identifier
 * @returns "question" | "part" | "subpart" | "unknown"
 */
export function getIdentifierLevel(identifier: string): 'question' | 'part' | 'subpart' | 'unknown' {
  if (!isValidQuestionIdentifier(identifier)) {
    return 'unknown';
  }

  if (identifier.includes('-sub-')) {
    return 'subpart';
  }

  if (identifier.includes('-part-')) {
    return 'part';
  }

  return 'question';
}

/**
 * Get a human-readable description of an identifier
 *
 * @param identifier - Question identifier
 * @returns Descriptive string
 *
 * @example
 * getIdentifierDescription("q_1") // "Question 1"
 * getIdentifierDescription("q_1-part-a") // "Question 1, Part a"
 * getIdentifierDescription("q_1-part-a-sub-iii") // "Question 1, Part a, Subpart iii"
 */
export function getIdentifierDescription(identifier: string): string {
  const parsed = parseQuestionIdentifier(identifier);

  if (!parsed.questionNumber) {
    return 'Unknown';
  }

  let description = `Question ${parsed.questionNumber}`;

  if (parsed.partLabel) {
    description += `, Part ${parsed.partLabel}`;
  }

  if (parsed.subpartLabel) {
    description += `, Subpart ${parsed.subpartLabel}`;
  }

  return description;
}
