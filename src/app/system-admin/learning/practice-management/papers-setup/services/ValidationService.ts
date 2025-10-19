// src/app/system-admin/learning/practice-management/papers-setup/services/ValidationService.ts

/**
 * Validation Service
 * Consolidates validation logic from multiple sources
 * Provides a unified interface for question and answer validation
 */

import { ensureString, ensureArray } from '../utils/sanitization';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  info: ValidationInfo[];
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'critical' | 'high' | 'medium';
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

export interface ValidationInfo {
  field: string;
  message: string;
}

export class ValidationService {
  /**
   * Validate a complete question
   */
  static validateQuestion(question: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const info: ValidationInfo[] = [];

    // Required fields
    if (!question.question_text || ensureString(question.question_text).trim() === '') {
      errors.push({
        field: 'question_text',
        message: 'Question text is required',
        severity: 'critical'
      });
    }

    if (!question.question_number || ensureString(question.question_number).trim() === '') {
      errors.push({
        field: 'question_number',
        message: 'Question number is required',
        severity: 'critical'
      });
    }

    // Marks validation
    const marks = typeof question.marks === 'number' ? question.marks : parseFloat(question.marks);
    if (isNaN(marks) || marks <= 0) {
      errors.push({
        field: 'marks',
        message: 'Marks must be a positive number',
        severity: 'high'
      });
    }

    // Topic validation
    if (!question.topic || ensureString(question.topic).trim() === '') {
      warnings.push({
        field: 'topic',
        message: 'Topic is missing',
        suggestion: 'Assign a topic for better organization'
      });
    }

    // MCQ specific validation
    if (question.question_type === 'mcq' || question.answer_format === 'mcq') {
      const options = ensureArray(question.options);
      if (options.length === 0) {
        errors.push({
          field: 'options',
          message: 'MCQ questions must have options',
          severity: 'critical'
        });
      } else {
        const correctOptions = options.filter((opt: any) => opt.is_correct);
        if (correctOptions.length === 0) {
          errors.push({
            field: 'options',
            message: 'At least one correct answer must be marked',
            severity: 'high'
          });
        }
      }
    }

    // Answer validation
    if (question.correct_answers) {
      const answers = ensureArray(question.correct_answers);
      if (answers.length === 0 && question.question_type !== 'mcq') {
        warnings.push({
          field: 'correct_answers',
          message: 'No correct answers provided',
          suggestion: 'Add at least one correct answer'
        });
      }
    }

    // Parts validation
    if (question.parts) {
      const parts = ensureArray(question.parts);
      parts.forEach((part: any, index: number) => {
        const partResult = this.validatePart(part, index);
        errors.push(...partResult.errors);
        warnings.push(...partResult.warnings);
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      info
    };
  }

  /**
   * Validate a question part
   */
  static validatePart(part: any, index: number): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const info: ValidationInfo[] = [];

    if (!part.question_text || ensureString(part.question_text).trim() === '') {
      errors.push({
        field: `parts[${index}].question_text`,
        message: `Part ${part.part || index + 1} is missing question text`,
        severity: 'high'
      });
    }

    const marks = typeof part.marks === 'number' ? part.marks : parseFloat(part.marks);
    if (isNaN(marks) || marks <= 0) {
      errors.push({
        field: `parts[${index}].marks`,
        message: `Part ${part.part || index + 1} has invalid marks`,
        severity: 'high'
      });
    }

    // Subparts validation
    if (part.subparts) {
      const subparts = ensureArray(part.subparts);
      subparts.forEach((subpart: any, subIndex: number) => {
        const subpartResult = this.validateSubpart(subpart, index, subIndex);
        errors.push(...subpartResult.errors);
        warnings.push(...subpartResult.warnings);
      });
    }

    return { isValid: errors.length === 0, errors, warnings, info };
  }

  /**
   * Validate a question subpart
   */
  static validateSubpart(subpart: any, partIndex: number, subpartIndex: number): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const info: ValidationInfo[] = [];

    if (!subpart.question_text || ensureString(subpart.question_text).trim() === '') {
      errors.push({
        field: `parts[${partIndex}].subparts[${subpartIndex}].question_text`,
        message: `Subpart ${subpart.subpart || subpartIndex + 1} is missing question text`,
        severity: 'medium'
      });
    }

    return { isValid: errors.length === 0, errors, warnings, info };
  }

  /**
   * Validate answer structure
   */
  static validateAnswer(answer: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const info: ValidationInfo[] = [];

    if (!answer.answer || ensureString(answer.answer).trim() === '') {
      errors.push({
        field: 'answer',
        message: 'Answer text is required',
        severity: 'high'
      });
    }

    const marks = typeof answer.marks === 'number' ? answer.marks : parseFloat(answer.marks);
    if (isNaN(marks)) {
      warnings.push({
        field: 'marks',
        message: 'Answer marks are not specified',
        suggestion: 'Specify marks for partial credit'
      });
    }

    return { isValid: errors.length === 0, errors, warnings, info };
  }

  /**
   * Batch validate multiple questions
   */
  static batchValidateQuestions(questions: any[]): {
    totalQuestions: number;
    validQuestions: number;
    invalidQuestions: number;
    totalErrors: number;
    totalWarnings: number;
    results: Map<string, ValidationResult>;
  } {
    const results = new Map<string, ValidationResult>();
    let totalErrors = 0;
    let totalWarnings = 0;
    let validQuestions = 0;

    questions.forEach(question => {
      const result = this.validateQuestion(question);
      const questionId = question.id || question.question_number;
      results.set(questionId, result);

      totalErrors += result.errors.length;
      totalWarnings += result.warnings.length;
      if (result.isValid) validQuestions++;
    });

    return {
      totalQuestions: questions.length,
      validQuestions,
      invalidQuestions: questions.length - validQuestions,
      totalErrors,
      totalWarnings,
      results
    };
  }

  /**
   * Get validation summary message
   */
  static getValidationSummary(result: ValidationResult): string {
    if (result.isValid) {
      return 'All validations passed';
    }

    const parts: string[] = [];
    if (result.errors.length > 0) {
      parts.push(`${result.errors.length} error${result.errors.length > 1 ? 's' : ''}`);
    }
    if (result.warnings.length > 0) {
      parts.push(`${result.warnings.length} warning${result.warnings.length > 1 ? 's' : ''}`);
    }

    return parts.join(', ');
  }
}

export default ValidationService;
