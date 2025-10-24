/**
 * Answer Expectation Detector
 *
 * Automatically detects whether questions, parts, and subparts should have
 * direct answers based on their structure and content analysis.
 */

interface QuestionStructure {
  question_text?: string;
  question_description?: string;
  correct_answers?: any[];
  parts?: any[];
  subparts?: any[];
  answer_format?: string;
  answer_requirement?: string;
}

interface AnswerExpectation {
  has_direct_answer: boolean;
  is_contextual_only: boolean;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

/**
 * Contextual indicator patterns
 * These phrases typically indicate the question text is only providing context
 */
const CONTEXTUAL_PATTERNS = [
  // Pure statements without question words
  /^[A-Z][^.!?]*\.(?: [A-Z][^.!?]*\.)*$/i, // Statement sentences

  // Common contextual phrases
  /is (an?|the)/i,
  /are (a|the)/i,
  /shows?/i,
  /fig(?:ure)?\s*\d+\.\d+/i,
  /table\s*\d+\.\d+/i,
  /diagram/i,

  // Introduction patterns
  /^(here|this|these|the following)/i,
  /^(consider|observe|look at)/i,
  /produced commercially in/i,
  /as shown in/i,
];

/**
 * Question indicator patterns
 * These phrases strongly indicate a direct question requiring an answer
 */
const QUESTION_PATTERNS = [
  /\?$/,  // Ends with question mark
  /^(what|when|where|why|how|which|who)/i,
  /^(name|state|describe|explain|calculate|define|suggest|give|identify)/i,
  /^(compare|contrast|discuss|evaluate|analyze)/i,
  /complete (table|the|fig)/i,
];

/**
 * Detect if a question element requires a direct answer
 */
export function detectAnswerExpectation(
  element: QuestionStructure,
  context?: {
    hasSubparts?: boolean;
    level?: 'main' | 'part' | 'subpart';
  }
): AnswerExpectation {
  const level = context?.level || 'main';
  const hasSubparts = context?.hasSubparts || false;

  // RULE 1: Subparts ALWAYS require answers
  if (level === 'subpart') {
    return {
      has_direct_answer: true,
      is_contextual_only: false,
      confidence: 'high',
      reason: 'Subparts always require direct answers'
    };
  }

  // RULE 2: If has correct_answers, must expect an answer
  if (element.correct_answers && element.correct_answers.length > 0) {
    return {
      has_direct_answer: true,
      is_contextual_only: false,
      confidence: 'high',
      reason: 'Has correct_answers array'
    };
  }

  // RULE 3: If has answer_format specified, expects an answer
  if (element.answer_format && element.answer_format !== 'none') {
    return {
      has_direct_answer: true,
      is_contextual_only: false,
      confidence: 'high',
      reason: 'Has answer_format specified'
    };
  }

  // Get question text
  const text = element.question_text || element.question_description || '';

  // RULE 4: No text = contextual only
  if (!text.trim()) {
    return {
      has_direct_answer: false,
      is_contextual_only: true,
      confidence: 'high',
      reason: 'No question text provided'
    };
  }

  // RULE 5: Has subparts but no answers - likely contextual
  if (hasSubparts && (!element.correct_answers || element.correct_answers.length === 0)) {
    // Check if text has question indicators
    const hasQuestionIndicators = QUESTION_PATTERNS.some(pattern => pattern.test(text));

    if (!hasQuestionIndicators) {
      return {
        has_direct_answer: false,
        is_contextual_only: true,
        confidence: 'high',
        reason: 'Has subparts, no correct answers, and no question indicators in text'
      };
    }
  }

  // RULE 6: Analyze text content
  const contextualScore = analyzeContextualContent(text);
  const questionScore = analyzeQuestionContent(text);

  // If contextual score is much higher than question score
  if (contextualScore > questionScore * 1.5 && hasSubparts) {
    return {
      has_direct_answer: false,
      is_contextual_only: true,
      confidence: contextualScore > 3 ? 'high' : 'medium',
      reason: `Text appears contextual (score: ${contextualScore} vs ${questionScore})`
    };
  }

  // If question score is higher or equal
  if (questionScore >= contextualScore) {
    return {
      has_direct_answer: true,
      is_contextual_only: false,
      confidence: questionScore > 2 ? 'high' : 'medium',
      reason: `Text contains question indicators (score: ${questionScore})`
    };
  }

  // Default: For main questions and parts without clear indicators
  // Assume they need answers unless they have subparts
  if (hasSubparts) {
    return {
      has_direct_answer: false,
      is_contextual_only: true,
      confidence: 'low',
      reason: 'Has subparts, assuming contextual'
    };
  }

  return {
    has_direct_answer: true,
    is_contextual_only: false,
    confidence: 'low',
    reason: 'Default: assuming answer required'
  };
}

/**
 * Analyze text for contextual indicators
 */
function analyzeContextualContent(text: string): number {
  let score = 0;

  // Check each contextual pattern
  CONTEXTUAL_PATTERNS.forEach(pattern => {
    if (pattern.test(text)) {
      score += 1;
    }
  });

  // Additional heuristics

  // Very short statements (< 50 chars) without question marks
  if (text.length < 50 && !text.includes('?')) {
    score += 0.5;
  }

  // Contains reference to figures/tables
  if (/fig(?:ure)?\s*\d|table\s*\d|diagram/i.test(text)) {
    score += 1;
  }

  // Pure declarative statement
  if (!text.includes('?') && /^[A-Z][^.]*\.$/.test(text.trim())) {
    score += 0.5;
  }

  return score;
}

/**
 * Analyze text for question indicators
 */
function analyzeQuestionContent(text: string): number {
  let score = 0;

  // Check each question pattern
  QUESTION_PATTERNS.forEach(pattern => {
    if (pattern.test(text)) {
      score += 1;
    }
  });

  // Additional heuristics

  // Has question mark
  if (text.includes('?')) {
    score += 2;
  }

  // Has imperative verbs at start
  if (/^(calculate|explain|describe|state|name|define|suggest|identify|give|list)/i.test(text)) {
    score += 1.5;
  }

  // Contains "complete" or "fill in"
  if (/complete|fill in/i.test(text)) {
    score += 1;
  }

  return score;
}

/**
 * Bulk process array of questions/parts
 */
export function detectAnswerExpectationBulk(
  elements: QuestionStructure[],
  level: 'main' | 'part' | 'subpart' = 'main'
): Array<QuestionStructure & AnswerExpectation> {
  return elements.map((element, index) => {
    const hasSubparts = !!(element.parts?.length || element.subparts?.length);
    const expectation = detectAnswerExpectation(element, { hasSubparts, level });

    return {
      ...element,
      ...expectation
    };
  });
}

/**
 * Validate detected expectations against actual data
 */
export function validateDetection(
  element: QuestionStructure & AnswerExpectation
): {
  isConsistent: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  // Check for inconsistencies
  if (element.has_direct_answer && !element.correct_answers?.length && element.answer_format) {
    warnings.push('Marked as requiring answer but no correct_answers provided');
  }

  if (!element.has_direct_answer && element.correct_answers?.length) {
    warnings.push('Marked as contextual-only but has correct_answers');
  }

  if (element.is_contextual_only && !element.has_direct_answer === false) {
    warnings.push('is_contextual_only should imply has_direct_answer = false');
  }

  return {
    isConsistent: warnings.length === 0,
    warnings
  };
}

/**
 * Get human-readable explanation
 */
export function explainDetection(expectation: AnswerExpectation): string {
  const confidenceStr = `[${expectation.confidence.toUpperCase()} CONFIDENCE]`;
  const answerStr = expectation.has_direct_answer ? 'REQUIRES ANSWER' : 'CONTEXTUAL ONLY';

  return `${confidenceStr} ${answerStr}: ${expectation.reason}`;
}
