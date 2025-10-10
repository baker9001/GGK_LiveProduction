export interface ParsedAlternative {
  text: string;
  isComplete: boolean;
  originalIndex: number;
}

export interface ForwardSlashParseResult {
  hasForwardSlash: boolean;
  alternatives: ParsedAlternative[];
  validationErrors: string[];
  rawAnswer: string;
}

export function parseForwardSlashAnswers(answerText: string): ForwardSlashParseResult {
  const result: ForwardSlashParseResult = {
    hasForwardSlash: false,
    alternatives: [],
    validationErrors: [],
    rawAnswer: answerText
  };

  if (!answerText || typeof answerText !== 'string') {
    result.validationErrors.push('Answer text is empty or invalid');
    return result;
  }

  const trimmedAnswer = answerText.trim();

  if (!trimmedAnswer.includes('/')) {
    result.alternatives.push({
      text: trimmedAnswer,
      isComplete: true,
      originalIndex: 0
    });
    return result;
  }

  result.hasForwardSlash = true;

  const segments = trimmedAnswer.split('/').map(s => s.trim()).filter(s => s.length > 0);

  if (segments.length === 0) {
    result.validationErrors.push('Forward slash found but no valid segments extracted');
    return result;
  }

  if (segments.length === 1) {
    result.validationErrors.push('Forward slash found but only one segment exists (possible formatting error)');
  }

  segments.forEach((segment, index) => {
    if (segment.length === 0) {
      result.validationErrors.push(`Empty segment found at position ${index + 1}`);
      return;
    }

    const isIncomplete = segment.toLowerCase().startsWith('or ') ||
                        segment.toLowerCase().startsWith('and ') ||
                        /^[a-z]/.test(segment) && index > 0;

    if (isIncomplete && index === 0) {
      result.validationErrors.push(`First segment cannot be incomplete: "${segment}"`);
    }

    result.alternatives.push({
      text: segment,
      isComplete: !isIncomplete,
      originalIndex: index
    });
  });

  const completeAlternatives = result.alternatives.filter(a => a.isComplete);
  if (completeAlternatives.length === 0) {
    result.validationErrors.push('No complete standalone answers found');
  }

  return result;
}

export function validateForwardSlashStructure(answerText: string): { isValid: boolean; errors: string[] } {
  const parseResult = parseForwardSlashAnswers(answerText);

  return {
    isValid: parseResult.validationErrors.length === 0,
    errors: parseResult.validationErrors
  };
}

export function extractAllValidAlternatives(answerText: string): string[] {
  const parseResult = parseForwardSlashAnswers(answerText);

  if (!parseResult.hasForwardSlash) {
    return [answerText.trim()];
  }

  return parseResult.alternatives
    .filter(alt => alt.isComplete)
    .map(alt => alt.text);
}

export function getAlternativeCount(answerText: string): number {
  const parseResult = parseForwardSlashAnswers(answerText);
  return parseResult.alternatives.filter(a => a.isComplete).length;
}

export function formatAlternativesForDisplay(answerText: string): string {
  const alternatives = extractAllValidAlternatives(answerText);

  if (alternatives.length <= 1) {
    return answerText;
  }

  return alternatives.map((alt, idx) => `Alternative ${idx + 1}: ${alt}`).join('\n');
}
