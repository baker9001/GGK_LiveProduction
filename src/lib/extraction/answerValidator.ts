import { parseForwardSlashAnswers, type ForwardSlashParseResult } from './forwardSlashParser';
import { parseAndOrOperators, type AndOrParseResult } from './andOrOperatorParser';

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  severity: ValidationSeverity;
  message: string;
  field: string;
  code: string;
}

export interface AnswerValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  forwardSlashAnalysis: ForwardSlashParseResult | null;
  andOrAnalysis: AndOrParseResult | null;
  hasContext: boolean;
  hasAnnotations: boolean;
  annotations: string[];
}

export interface SubjectSpecificRules {
  requiresUnits?: boolean;
  allowsApproximations?: boolean;
  requiresSignificantFigures?: boolean;
  allowsEquivalentPhrasing?: boolean;
  customValidations?: Array<(answer: string) => ValidationIssue | null>;
}

const ANNOTATION_PATTERNS = {
  ora: /\(ora\)/gi,
  owtte: /\(owtte\)/gi,
  accept: /\(accept[^\)]*\)/gi,
  allow: /\(allow[^\)]*\)/gi,
  ignore: /\(ignore[^\)]*\)/gi
};

export function validateAnswerStructure(
  answerText: string,
  context?: string,
  subjectRules?: SubjectSpecificRules
): AnswerValidationResult {
  const result: AnswerValidationResult = {
    isValid: true,
    issues: [],
    forwardSlashAnalysis: null,
    andOrAnalysis: null,
    hasContext: false,
    hasAnnotations: false,
    annotations: []
  };

  if (!answerText || typeof answerText !== 'string') {
    result.isValid = false;
    result.issues.push({
      severity: 'error',
      message: 'Answer text is required',
      field: 'answer',
      code: 'ANSWER_REQUIRED'
    });
    return result;
  }

  const trimmedAnswer = answerText.trim();

  if (trimmedAnswer.length === 0) {
    result.isValid = false;
    result.issues.push({
      severity: 'error',
      message: 'Answer text cannot be empty',
      field: 'answer',
      code: 'ANSWER_EMPTY'
    });
    return result;
  }

  if (context && context.trim().length > 0) {
    result.hasContext = true;
  } else {
    // Context is helpful but optional for most answers. Treat this as informational so
    // the pre-import validation doesn't surface it as a blocking warning that confuses users.
    result.issues.push({
      severity: 'info',
      message: 'No context provided - context helps students understand answer requirements',
      field: 'context',
      code: 'CONTEXT_MISSING'
    });
  }

  const annotations: string[] = [];
  Object.entries(ANNOTATION_PATTERNS).forEach(([key, pattern]) => {
    const matches = trimmedAnswer.match(pattern);
    if (matches) {
      annotations.push(...matches);
    }
  });

  if (annotations.length > 0) {
    result.hasAnnotations = true;
    result.annotations = annotations;
  }

  const forwardSlashResult = parseForwardSlashAnswers(trimmedAnswer);
  result.forwardSlashAnalysis = forwardSlashResult;

  if (forwardSlashResult.validationErrors.length > 0) {
    forwardSlashResult.validationErrors.forEach(error => {
      result.issues.push({
        severity: 'error',
        message: error,
        field: 'answer',
        code: 'FORWARD_SLASH_ERROR'
      });
    });
    result.isValid = false;
  }

  if (forwardSlashResult.hasForwardSlash && forwardSlashResult.alternatives.length > 1) {
    result.issues.push({
      severity: 'info',
      message: `Found ${forwardSlashResult.alternatives.filter(a => a.isComplete).length} alternative answers`,
      field: 'answer',
      code: 'ALTERNATIVES_DETECTED'
    });
  }

  const andOrResult = parseAndOrOperators(trimmedAnswer);
  result.andOrAnalysis = andOrResult;

  if (andOrResult.validationErrors.length > 0) {
    andOrResult.validationErrors.forEach(error => {
      result.issues.push({
        severity: andOrResult.groups.some(g => g.groupType === 'MIXED') ? 'warning' : 'error',
        message: error,
        field: 'answer',
        code: 'OPERATOR_ERROR'
      });
    });

    if (andOrResult.groups.some(g => !g.isValid)) {
      result.isValid = false;
    }
  }

  if (andOrResult.hasOperators && andOrResult.allComponents.length > 1) {
    const requiredCount = andOrResult.allComponents.filter(c => c.isRequired).length;
    const optionalCount = andOrResult.allComponents.filter(c => !c.isRequired).length;

    result.issues.push({
      severity: 'info',
      message: `Answer has ${andOrResult.allComponents.length} components (${requiredCount} required, ${optionalCount} optional)`,
      field: 'answer',
      code: 'COMPONENTS_DETECTED'
    });
  }

  if (forwardSlashResult.hasForwardSlash && andOrResult.hasOperators) {
    result.issues.push({
      severity: 'warning',
      message: 'Answer contains both forward slashes and AND/OR operators - verify intended meaning',
      field: 'answer',
      code: 'MIXED_OPERATORS'
    });
  }

  if (subjectRules) {
    applySubjectSpecificValidation(trimmedAnswer, subjectRules, result);
  }

  return result;
}

function applySubjectSpecificValidation(
  answerText: string,
  rules: SubjectSpecificRules,
  result: AnswerValidationResult
): void {
  if (rules.requiresUnits) {
    const hasUnits = /\b(m|km|cm|mm|g|kg|mg|s|min|h|N|J|W|V|A|Ω|°C|K|mol|Pa|Hz)\b/i.test(answerText);
    if (!hasUnits) {
      result.issues.push({
        severity: 'warning',
        message: 'Answer may require units (Physics/Chemistry)',
        field: 'answer',
        code: 'UNITS_MISSING'
      });
    }
  }

  if (rules.requiresSignificantFigures) {
    const hasNumber = /\d+\.?\d*/g.test(answerText);
    if (hasNumber) {
      result.issues.push({
        severity: 'info',
        message: 'Numerical answer detected - verify significant figures',
        field: 'answer',
        code: 'SIG_FIGS_CHECK'
      });
    }
  }

  if (rules.customValidations) {
    rules.customValidations.forEach(validator => {
      const issue = validator(answerText);
      if (issue) {
        result.issues.push(issue);
        if (issue.severity === 'error') {
          result.isValid = false;
        }
      }
    });
  }
}

export function validateQuestionAnswers(
  question: {
    question_number: string;
    correct_answer?: string;
    context?: string;
    subject?: string;
  },
  subjectRules?: SubjectSpecificRules
): AnswerValidationResult {
  return validateAnswerStructure(
    question.correct_answer || '',
    question.context,
    subjectRules
  );
}

export function batchValidateAnswers(
  questions: Array<{
    question_number: string;
    correct_answer?: string;
    context?: string;
    subject?: string;
  }>,
  subjectRules?: SubjectSpecificRules
): Map<string, AnswerValidationResult> {
  const results = new Map<string, AnswerValidationResult>();

  questions.forEach(question => {
    const validation = validateQuestionAnswers(question, subjectRules);
    results.set(question.question_number, validation);
  });

  return results;
}

export function getValidationSummary(
  validationResults: Map<string, AnswerValidationResult>
): {
  totalQuestions: number;
  validAnswers: number;
  invalidAnswers: number;
  warnings: number;
  errors: number;
  hasContext: number;
  hasAlternatives: number;
  hasOperators: number;
} {
  let validAnswers = 0;
  let invalidAnswers = 0;
  let warnings = 0;
  let errors = 0;
  let hasContext = 0;
  let hasAlternatives = 0;
  let hasOperators = 0;

  validationResults.forEach(result => {
    if (result.isValid) {
      validAnswers++;
    } else {
      invalidAnswers++;
    }

    result.issues.forEach(issue => {
      if (issue.severity === 'error') errors++;
      if (issue.severity === 'warning') warnings++;
    });

    if (result.hasContext) hasContext++;
    if (result.forwardSlashAnalysis?.hasForwardSlash) hasAlternatives++;
    if (result.andOrAnalysis?.hasOperators) hasOperators++;
  });

  return {
    totalQuestions: validationResults.size,
    validAnswers,
    invalidAnswers,
    warnings,
    errors,
    hasContext,
    hasAlternatives,
    hasOperators
  };
}

export function formatValidationReport(
  questionNumber: string,
  validation: AnswerValidationResult
): string {
  const lines: string[] = [];

  lines.push(`Question ${questionNumber}:`);
  lines.push(`  Status: ${validation.isValid ? '✓ Valid' : '✗ Invalid'}`);

  if (validation.issues.length > 0) {
    lines.push(`  Issues (${validation.issues.length}):`);
    validation.issues.forEach(issue => {
      const icon = issue.severity === 'error' ? '✗' : issue.severity === 'warning' ? '⚠' : 'ℹ';
      lines.push(`    ${icon} [${issue.severity.toUpperCase()}] ${issue.message}`);
    });
  }

  if (validation.forwardSlashAnalysis?.hasForwardSlash) {
    const altCount = validation.forwardSlashAnalysis.alternatives.filter(a => a.isComplete).length;
    lines.push(`  Alternatives: ${altCount} found`);
  }

  if (validation.andOrAnalysis?.hasOperators) {
    const componentCount = validation.andOrAnalysis.allComponents.length;
    lines.push(`  Components: ${componentCount} found`);
  }

  if (validation.hasContext) {
    lines.push(`  Context: ✓ Present`);
  }

  if (validation.hasAnnotations) {
    lines.push(`  Annotations: ${validation.annotations.join(', ')}`);
  }

  return lines.join('\n');
}
