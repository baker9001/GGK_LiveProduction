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

  // IGCSE-specific contextual patterns
  /is a(n)? (type of|kind of|example of)/i,
  /can be (produced|found|made|obtained)/i,
  /was discovered (in|by)/i,
  /(researchers|scientists|biologists?) (in|at|measured|studied)/i,
  /histograms? of (their )?results? (are|is) shown/i,
  /(are|is) caused by/i,
  /(performed|conducted) an experiment/i,
  /^fig\. \d+\.\d+ (is|shows)/i,
  /(found|located) in (the)/i,
  /a dna molecule has/i,
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
  // IGCSE-specific question patterns
  /(describe|explain|state|name|give|suggest|calculate).+\./i,
  /use (the )?data (in|from)/i,
  /support your answer/i,
  /show (your )?working/i,
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
  // THIS IS THE HIGHEST PRIORITY RULE - Data always overrides text analysis
  // ABSOLUTE ENFORCEMENT: This rule returns EARLY - no other rules can override
  if (element.correct_answers && element.correct_answers.length > 0) {
    console.log(`[RULE 2] Checking correct_answers array with ${element.correct_answers.length} items`);

    // Filter out truly empty or null answers - be lenient with validation
    const validAnswers = element.correct_answers.filter(ans => {
      // Accept any object that has an 'answer' field (even if empty string - the data is present)
      if (ans && typeof ans === 'object' && ('answer' in ans || 'text' in ans)) {
        const answerValue = ans.answer || ans.text;
        // Accept non-null/undefined values, including empty strings (the field exists)
        if (answerValue !== null && answerValue !== undefined) {
          return true;
        }
      }
      return false;
    });

    console.log(`[RULE 2] Found ${validAnswers.length} valid answer objects (with answer/text field)`);

    if (validAnswers.length > 0) {
      console.log(`[RULE 2] ✓ ABSOLUTE RETURN: has_direct_answer=true, is_contextual_only=false`);
      console.log(`[RULE 2] Reason: ${validAnswers.length} valid correct_answer(s) present in data`);
      // EARLY RETURN - No other rules can override this
      return {
        has_direct_answer: true,
        is_contextual_only: false,
        confidence: 'high',
        reason: `ABSOLUTE: Has ${validAnswers.length} valid correct_answer(s) - data overrides all text analysis`
      };
    }

    // If array exists but no valid answers found, log warning
    console.warn(`[RULE 2] ⚠️ correct_answers array exists (${element.correct_answers.length} items) but no valid answers found after filtering`);
    console.warn(`[RULE 2] Sample item:`, element.correct_answers[0]);
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
  // Only apply if we're certain there are NO valid answers
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
    } else {
      // Has question indicators but no answers - might be missing data
      return {
        has_direct_answer: true,
        is_contextual_only: false,
        confidence: 'medium',
        reason: 'Has question indicators in text, assuming answer required despite no correct_answers'
      };
    }
  }

  // RULE 6: Analyze text content
  // NOTE: This should only apply when we don't have definitive data (correct_answers)
  const contextualScore = analyzeContextualContent(text);
  const questionScore = analyzeQuestionContent(text);

  // If contextual score is much higher than question score AND has subparts
  // Only mark as contextual if we're very confident (score > 4)
  if (contextualScore > questionScore * 1.5 && hasSubparts && contextualScore > 4) {
    return {
      has_direct_answer: false,
      is_contextual_only: true,
      confidence: contextualScore > 5 ? 'high' : 'medium',
      reason: `Text appears strongly contextual (score: ${contextualScore} vs ${questionScore})`
    };
  }

  // If question score is higher or equal, assume answer required
  if (questionScore >= contextualScore) {
    return {
      has_direct_answer: true,
      is_contextual_only: false,
      confidence: questionScore > 2 ? 'high' : 'medium',
      reason: `Text contains question indicators (score: ${questionScore} vs ${contextualScore})`
    };
  }

  // If scores are close and we don't have subparts, assume answer required
  if (!hasSubparts) {
    return {
      has_direct_answer: true,
      is_contextual_only: false,
      confidence: 'medium',
      reason: 'No subparts and ambiguous text - defaulting to answer required'
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
