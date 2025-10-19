// src/app/system-admin/learning/practice-management/papers-setup/services/ExtractionService.ts

/**
 * Extraction Service
 * Consolidates extraction logic from multiple libraries
 * Provides unified interface for parsing answers, operators, and requirements
 */

import { ensureString, ensureArray } from '../utils/sanitization';

export interface AnswerAlternative {
  id: number;
  text: string;
  marks: number;
  linkedTo?: number[];
  type?: 'independent' | 'linked' | 'conditional';
}

export interface AnswerLogic {
  type: 'simple' | 'all_required' | 'any_accepted' | 'complex';
  requiredComponents: string[];
  optionalComponents: string[];
  alternatives: AnswerAlternative[];
}

export interface AnswerRequirement {
  format: string;
  expectation: string;
  keywords: string[];
  partialCredit: boolean;
  strictMarking: boolean;
}

export class ExtractionService {
  /**
   * Parse forward slash answers (e.g., "A / B / C")
   */
  static parseForwardSlashAnswers(answerText: string): AnswerAlternative[] {
    if (!answerText || typeof answerText !== 'string') {
      return [];
    }

    const alternatives: AnswerAlternative[] = [];
    const parts = answerText.split('/').map(p => p.trim()).filter(p => p.length > 0);

    parts.forEach((part, index) => {
      alternatives.push({
        id: index + 1,
        text: part,
        marks: 1,
        type: 'independent'
      });
    });

    return alternatives;
  }

  /**
   * Parse AND/OR operators in answers
   */
  static parseAndOrOperators(answerText: string): AnswerLogic {
    const text = ensureString(answerText).toLowerCase();

    // Check for AND operator
    if (text.includes(' and ') || text.includes(' & ')) {
      const components = text.split(/\s+and\s+|\s+&\s+/i).map(c => c.trim());
      return {
        type: 'all_required',
        requiredComponents: components,
        optionalComponents: [],
        alternatives: []
      };
    }

    // Check for OR operator
    if (text.includes(' or ')) {
      const components = text.split(/\s+or\s+/i).map(c => c.trim());
      return {
        type: 'any_accepted',
        requiredComponents: [],
        optionalComponents: components,
        alternatives: components.map((comp, index) => ({
          id: index + 1,
          text: comp,
          marks: 1,
          type: 'independent'
        }))
      };
    }

    // Simple answer
    return {
      type: 'simple',
      requiredComponents: [answerText],
      optionalComponents: [],
      alternatives: []
    };
  }

  /**
   * Derive answer requirement from question and answer
   */
  static deriveAnswerRequirement(question: any): AnswerRequirement {
    const questionText = ensureString(question.question_text).toLowerCase();
    const answerFormat = question.answer_format || 'single_line';

    const requirement: AnswerRequirement = {
      format: answerFormat,
      expectation: '',
      keywords: [],
      partialCredit: false,
      strictMarking: false
    };

    // Detect calculation requirements
    if (questionText.includes('calculate') || questionText.includes('work out')) {
      requirement.expectation = 'Show working and final answer';
      requirement.keywords = ['calculate', 'work out'];
      requirement.partialCredit = true;
    }

    // Detect explanation requirements
    else if (questionText.includes('explain') || questionText.includes('describe')) {
      requirement.expectation = 'Detailed explanation required';
      requirement.keywords = ['explain', 'describe'];
      requirement.partialCredit = true;
    }

    // Detect comparison requirements
    else if (questionText.includes('compare') || questionText.includes('contrast')) {
      requirement.expectation = 'Compare and contrast both items';
      requirement.keywords = ['compare', 'contrast'];
      requirement.partialCredit = true;
    }

    // Detect state/name requirements
    else if (questionText.includes('state') || questionText.includes('name')) {
      requirement.expectation = 'Brief, specific answer';
      requirement.keywords = ['state', 'name'];
      requirement.strictMarking = true;
    }

    // Default for other question types
    else {
      requirement.expectation = 'Complete and accurate answer';
    }

    return requirement;
  }

  /**
   * Extract all valid alternatives from complex answer
   */
  static extractAllValidAlternatives(answerText: string): string[] {
    if (!answerText || typeof answerText !== 'string') {
      return [];
    }

    const alternatives: string[] = [];

    // First try forward slash
    if (answerText.includes('/')) {
      const slashParts = answerText.split('/').map(p => p.trim()).filter(p => p.length > 0);
      alternatives.push(...slashParts);
    }

    // Then try OR operator
    if (answerText.toLowerCase().includes(' or ')) {
      const orParts = answerText.split(/\s+or\s+/i).map(p => p.trim()).filter(p => p.length > 0);
      alternatives.push(...orParts);
    }

    // If no alternatives found, treat as single answer
    if (alternatives.length === 0) {
      alternatives.push(answerText.trim());
    }

    // Remove duplicates
    return Array.from(new Set(alternatives));
  }

  /**
   * Analyze answer complexity
   */
  static analyzeAnswerComplexity(question: any): {
    hasMultipleAnswers: boolean;
    hasAlternatives: boolean;
    requiresAllComponents: boolean;
    alternativeCount: number;
  } {
    const answers = ensureArray(question.correct_answers);
    const hasMultipleAnswers = answers.length > 1;

    let hasAlternatives = false;
    let requiresAllComponents = false;
    let alternativeCount = 0;

    answers.forEach((answer: any) => {
      const answerText = ensureString(answer.answer);

      if (answerText.includes('/') || answerText.toLowerCase().includes(' or ')) {
        hasAlternatives = true;
        const alternatives = this.extractAllValidAlternatives(answerText);
        alternativeCount += alternatives.length;
      }

      if (answerText.toLowerCase().includes(' and ') || answerText.includes(' & ')) {
        requiresAllComponents = true;
      }
    });

    return {
      hasMultipleAnswers,
      hasAlternatives,
      requiresAllComponents,
      alternativeCount: alternativeCount || answers.length
    };
  }

  /**
   * Extract required and optional components
   */
  static extractComponents(answerText: string): {
    required: string[];
    optional: string[];
  } {
    const logic = this.parseAndOrOperators(answerText);

    return {
      required: logic.requiredComponents,
      optional: logic.optionalComponents
    };
  }

  /**
   * Detect if figure is required
   */
  static detectFigureRequirement(questionText: string): boolean {
    const text = ensureString(questionText).toLowerCase();
    const figureKeywords = [
      'diagram',
      'figure',
      'graph',
      'chart',
      'illustration',
      'shown',
      'image',
      'picture',
      'sketch',
      'draw'
    ];

    return figureKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * Detect answer format from question
   */
  static detectAnswerFormat(question: any): string {
    // Check explicit format
    if (question.answer_format) {
      return question.answer_format;
    }

    // Check for MCQ
    if (question.options && Array.isArray(question.options) && question.options.length > 0) {
      return 'mcq';
    }

    if (question.question_type === 'mcq' || question.type === 'multiple_choice') {
      return 'mcq';
    }

    // Analyze question text
    const questionText = ensureString(question.question_text).toLowerCase();

    if (questionText.includes('calculate') || questionText.includes('work out')) {
      return 'calculation';
    }

    if (questionText.includes('draw') || questionText.includes('sketch')) {
      return 'diagram';
    }

    if (questionText.includes('table')) {
      return 'table';
    }

    if (questionText.includes('graph') || questionText.includes('plot')) {
      return 'graph';
    }

    if (questionText.includes('explain') || questionText.includes('describe')) {
      return 'multi_line';
    }

    // Default
    return 'single_line';
  }

  /**
   * Get alternative count
   */
  static getAlternativeCount(answerText: string): number {
    return this.extractAllValidAlternatives(answerText).length;
  }
}

export default ExtractionService;
