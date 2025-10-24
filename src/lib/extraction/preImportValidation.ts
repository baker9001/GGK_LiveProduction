import {
  validateAnswerStructure,
  batchValidateAnswers,
  getValidationSummary,
  type AnswerValidationResult,
  type ValidationIssue
} from './answerValidator';
import { getSubjectRules } from './subjectSpecificRules';

export interface QuestionToValidate {
  question_number: string;
  question_text?: string;
  correct_answer?: string;
  correct_answers?: Array<{ answer: string; context?: string }>;
  context?: string;
  subject?: string;
  parts?: Array<{
    part: string;
    correct_answers?: Array<{ answer: string; context?: string }>;
    subparts?: Array<{
      subpart: string;
      correct_answers?: Array<{ answer: string; context?: string }>;
    }>;
  }>;
}

export interface ValidationError {
  questionNumber: string;
  part?: string;
  subpart?: string;
  field: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  code: string;
}

export interface PreImportValidationResult {
  isValid: boolean;
  canProceed: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  summary: {
    totalQuestions: number;
    questionsWithErrors: number;
    questionsWithWarnings: number;
    totalErrors: number;
    totalWarnings: number;
    missingAnswers: number;
    missingContext: number;
    invalidAlternatives: number;
    invalidOperators: number;
  };
}

function validateQuestionAnswers(
  question: QuestionToValidate,
  subject?: string
): ValidationError[] {
  const errors: ValidationError[] = [];
  const subjectRules = subject ? getSubjectRules(subject) : undefined;

  if (!question.correct_answer && (!question.correct_answers || question.correct_answers.length === 0)) {
    errors.push({
      questionNumber: question.question_number,
      field: 'answer',
      severity: 'error',
      message: 'No correct answer provided',
      code: 'ANSWER_MISSING'
    });
    return errors;
  }

  const answersToValidate = question.correct_answers ||
    (question.correct_answer ? [{ answer: question.correct_answer, context: question.context }] : []);

  answersToValidate.forEach((ans, index) => {
    const validation = validateAnswerStructure(ans.answer, ans.context, subjectRules);

    validation.issues.forEach(issue => {
      errors.push({
        questionNumber: question.question_number,
        field: issue.field,
        severity: issue.severity,
        message: issue.message,
        code: issue.code
      });
    });
  });

  return errors;
}

function validatePartAnswers(
  question: QuestionToValidate,
  part: any,
  subject?: string
): ValidationError[] {
  const errors: ValidationError[] = [];
  const subjectRules = subject ? getSubjectRules(subject) : undefined;

  if (!part.correct_answers || part.correct_answers.length === 0) {
    errors.push({
      questionNumber: question.question_number,
      part: part.part,
      field: 'answer',
      severity: 'error',
      message: `Part ${part.part} has no correct answer`,
      code: 'PART_ANSWER_MISSING'
    });
    return errors;
  }

  part.correct_answers.forEach((ans: any) => {
    const validation = validateAnswerStructure(ans.answer, ans.context, subjectRules);

    validation.issues.forEach(issue => {
      errors.push({
        questionNumber: question.question_number,
        part: part.part,
        field: issue.field,
        severity: issue.severity,
        message: issue.message,
        code: issue.code
      });
    });
  });

  return errors;
}

function validateSubpartAnswers(
  question: QuestionToValidate,
  part: any,
  subpart: any,
  subject?: string
): ValidationError[] {
  const errors: ValidationError[] = [];
  const subjectRules = subject ? getSubjectRules(subject) : undefined;

  if (!subpart.correct_answers || subpart.correct_answers.length === 0) {
    errors.push({
      questionNumber: question.question_number,
      part: part.part,
      subpart: subpart.subpart,
      field: 'answer',
      severity: 'error',
      message: `Subpart ${subpart.subpart} has no correct answer`,
      code: 'SUBPART_ANSWER_MISSING'
    });
    return errors;
  }

  subpart.correct_answers.forEach((ans: any) => {
    const validation = validateAnswerStructure(ans.answer, ans.context, subjectRules);

    validation.issues.forEach(issue => {
      errors.push({
        questionNumber: question.question_number,
        part: part.part,
        subpart: subpart.subpart,
        field: issue.field,
        severity: issue.severity,
        message: issue.message,
        code: issue.code
      });
    });
  });

  return errors;
}

export function validateQuestionsBeforeImport(
  questions: QuestionToValidate[],
  subject?: string
): PreImportValidationResult {
  const allErrors: ValidationError[] = [];

  questions.forEach(question => {
    if (question.parts && question.parts.length > 0) {
      question.parts.forEach(part => {
        const partErrors = validatePartAnswers(question, part, subject);
        allErrors.push(...partErrors);

        if (part.subparts && part.subparts.length > 0) {
          part.subparts.forEach(subpart => {
            const subpartErrors = validateSubpartAnswers(question, part, subpart, subject);
            allErrors.push(...subpartErrors);
          });
        }
      });
    } else {
      const questionErrors = validateQuestionAnswers(question, subject);
      allErrors.push(...questionErrors);
    }
  });

  const errors = allErrors.filter(e => e.severity === 'error');
  const warnings = allErrors.filter(e => e.severity === 'warning');

  const questionsWithErrors = new Set(errors.map(e => e.questionNumber)).size;
  const questionsWithWarnings = new Set(warnings.map(e => e.questionNumber)).size;

  const missingAnswers = errors.filter(e =>
    e.code === 'ANSWER_MISSING' ||
    e.code === 'PART_ANSWER_MISSING' ||
    e.code === 'SUBPART_ANSWER_MISSING'
  ).length;

  const missingContext = allErrors.filter(e => e.code === 'CONTEXT_MISSING').length;
  const invalidAlternatives = allErrors.filter(e => e.code === 'FORWARD_SLASH_ERROR').length;
  const invalidOperators = allErrors.filter(e => e.code === 'OPERATOR_ERROR').length;

  const result: PreImportValidationResult = {
    isValid: errors.length === 0,
    canProceed: errors.length === 0,
    errors,
    warnings,
    summary: {
      totalQuestions: questions.length,
      questionsWithErrors,
      questionsWithWarnings,
      totalErrors: errors.length,
      totalWarnings: warnings.length,
      missingAnswers,
      missingContext,
      invalidAlternatives,
      invalidOperators
    }
  };

  return result;
}

export function formatValidationErrors(errors: ValidationError[]): string {
  const lines: string[] = [];

  const byQuestion = new Map<string, ValidationError[]>();
  errors.forEach(error => {
    if (!byQuestion.has(error.questionNumber)) {
      byQuestion.set(error.questionNumber, []);
    }
    byQuestion.get(error.questionNumber)!.push(error);
  });

  byQuestion.forEach((errors, questionNumber) => {
    lines.push(`\nQuestion ${questionNumber}:`);
    errors.forEach(error => {
      const location = error.part
        ? error.subpart
          ? ` [Part ${error.part}, Subpart ${error.subpart}]`
          : ` [Part ${error.part}]`
        : '';
      const icon = error.severity === 'error' ? '✗' : error.severity === 'warning' ? '⚠' : 'ℹ';
      lines.push(`  ${icon} ${location} ${error.message}`);
    });
  });

  return lines.join('\n');
}

export function getValidationReportSummary(result: PreImportValidationResult): string {
  const lines: string[] = [];

  lines.push('Pre-Import Validation Report');
  lines.push('='.repeat(50));
  lines.push(`Total Questions: ${result.summary.totalQuestions}`);
  lines.push(`Questions with Errors: ${result.summary.questionsWithErrors}`);
  lines.push(`Questions with Warnings: ${result.summary.questionsWithWarnings}`);
  lines.push(`Total Errors: ${result.summary.totalErrors}`);
  lines.push(`Total Warnings: ${result.summary.totalWarnings}`);
  lines.push('');
  lines.push('Detailed Breakdown:');
  lines.push(`- Missing Answers: ${result.summary.missingAnswers}`);
  lines.push(`- Missing Context: ${result.summary.missingContext}`);
  lines.push(`- Invalid Alternatives: ${result.summary.invalidAlternatives}`);
  lines.push(`- Invalid Operators: ${result.summary.invalidOperators}`);
  lines.push('');
  lines.push(`Can Proceed: ${result.canProceed ? 'YES ✓' : 'NO ✗'}`);

  return lines.join('\n');
}
