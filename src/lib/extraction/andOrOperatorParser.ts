export type OperatorType = 'AND' | 'OR' | 'NONE';

export interface AnswerComponent {
  text: string;
  operator: OperatorType;
  position: number;
  isRequired: boolean;
}

export interface AnswerGroup {
  components: AnswerComponent[];
  groupType: 'AND_GROUP' | 'OR_GROUP' | 'MIXED' | 'SINGLE';
  isValid: boolean;
  validationErrors: string[];
}

export interface AndOrParseResult {
  hasOperators: boolean;
  groups: AnswerGroup[];
  allComponents: AnswerComponent[];
  validationErrors: string[];
  rawAnswer: string;
}

const AND_REGEX = /\bAND\b/gi;
const OR_REGEX = /\bOR\b/gi;

export function parseAndOrOperators(answerText: string): AndOrParseResult {
  const result: AndOrParseResult = {
    hasOperators: false,
    groups: [],
    allComponents: [],
    validationErrors: [],
    rawAnswer: answerText
  };

  if (!answerText || typeof answerText !== 'string') {
    result.validationErrors.push('Answer text is empty or invalid');
    return result;
  }

  const trimmedAnswer = answerText.trim();

  const hasAnd = AND_REGEX.test(trimmedAnswer);
  const hasOr = OR_REGEX.test(trimmedAnswer);

  if (!hasAnd && !hasOr) {
    result.allComponents.push({
      text: trimmedAnswer,
      operator: 'NONE',
      position: 0,
      isRequired: true
    });

    result.groups.push({
      components: result.allComponents,
      groupType: 'SINGLE',
      isValid: true,
      validationErrors: []
    });

    return result;
  }

  result.hasOperators = true;

  let workingText = trimmedAnswer;
  const components: AnswerComponent[] = [];
  let position = 0;

  const combinedRegex = /\b(AND|OR)\b/gi;
  const parts = workingText.split(combinedRegex);

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]?.trim();

    if (!part) continue;

    const upperPart = part.toUpperCase();

    if (upperPart === 'AND' || upperPart === 'OR') {
      continue;
    }

    const prevOperator = i > 0 ? parts[i - 1]?.trim().toUpperCase() : null;
    const operatorType: OperatorType =
      prevOperator === 'AND' ? 'AND' :
      prevOperator === 'OR' ? 'OR' :
      'NONE';

    components.push({
      text: part,
      operator: operatorType,
      position: position++,
      isRequired: operatorType === 'AND' || operatorType === 'NONE'
    });
  }

  if (components.length === 0) {
    result.validationErrors.push('No valid components extracted despite operators present');
    return result;
  }

  result.allComponents = components;

  if (hasAnd && hasOr) {
    result.validationErrors.push('Mixed AND/OR operators found - complex logic requires careful validation');
    result.groups.push({
      components: components,
      groupType: 'MIXED',
      isValid: false,
      validationErrors: ['Mixed operators require manual review']
    });
  } else if (hasAnd) {
    const allRequired = components.every(c => c.isRequired);
    result.groups.push({
      components: components,
      groupType: 'AND_GROUP',
      isValid: allRequired,
      validationErrors: allRequired ? [] : ['AND group has non-required components']
    });
  } else {
    const allOptional = components.every(c => !c.isRequired || c.operator === 'NONE');
    result.groups.push({
      components: components,
      groupType: 'OR_GROUP',
      isValid: true,
      validationErrors: []
    });
  }

  return result;
}

export function validateAndOrStructure(answerText: string): { isValid: boolean; errors: string[] } {
  const parseResult = parseAndOrOperators(answerText);

  const allErrors = [
    ...parseResult.validationErrors,
    ...parseResult.groups.flatMap(g => g.validationErrors)
  ];

  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  };
}

export function extractRequiredComponents(answerText: string): string[] {
  const parseResult = parseAndOrOperators(answerText);

  return parseResult.allComponents
    .filter(c => c.isRequired)
    .map(c => c.text);
}

export function extractOptionalComponents(answerText: string): string[] {
  const parseResult = parseAndOrOperators(answerText);

  return parseResult.allComponents
    .filter(c => !c.isRequired)
    .map(c => c.text);
}

export function hasAndOperator(answerText: string): boolean {
  const parseResult = parseAndOrOperators(answerText);
  return parseResult.allComponents.some(c => c.operator === 'AND');
}

export function hasOrOperator(answerText: string): boolean {
  const parseResult = parseAndOrOperators(answerText);
  return parseResult.allComponents.some(c => c.operator === 'OR');
}

export function getComponentCount(answerText: string): number {
  const parseResult = parseAndOrOperators(answerText);
  return parseResult.allComponents.length;
}

export function formatComponentsForDisplay(answerText: string): string {
  const parseResult = parseAndOrOperators(answerText);

  if (!parseResult.hasOperators) {
    return answerText;
  }

  const lines: string[] = [];

  parseResult.allComponents.forEach((component, idx) => {
    const requiredLabel = component.isRequired ? '[REQUIRED]' : '[OPTIONAL]';
    const operatorLabel = component.operator !== 'NONE' ? `(${component.operator})` : '';
    lines.push(`${idx + 1}. ${requiredLabel} ${operatorLabel} ${component.text}`);
  });

  return lines.join('\n');
}

export function analyzeAnswerLogic(answerText: string): {
  type: 'simple' | 'all_required' | 'any_accepted' | 'complex';
  description: string;
  componentCount: number;
} {
  const parseResult = parseAndOrOperators(answerText);

  if (!parseResult.hasOperators) {
    return {
      type: 'simple',
      description: 'Single answer with no operators',
      componentCount: 1
    };
  }

  const hasAnd = parseResult.allComponents.some(c => c.operator === 'AND');
  const hasOr = parseResult.allComponents.some(c => c.operator === 'OR');

  if (hasAnd && hasOr) {
    return {
      type: 'complex',
      description: 'Mixed AND/OR logic - requires all AND components plus at least one OR component',
      componentCount: parseResult.allComponents.length
    };
  }

  if (hasAnd) {
    return {
      type: 'all_required',
      description: 'All components must be present (AND logic)',
      componentCount: parseResult.allComponents.length
    };
  }

  return {
    type: 'any_accepted',
    description: 'Any one component is acceptable (OR logic)',
    componentCount: parseResult.allComponents.length
  };
}
