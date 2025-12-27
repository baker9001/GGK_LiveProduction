// src/services/answerFieldMigrationService.ts

/**
 * Answer Field Migration Service
 * Handles intelligent migration of answer data when format or requirement changes
 */

interface CorrectAnswer {
  answer: string;
  marks?: number;
  alternative_id?: number;
  linked_alternatives?: number[];
  alternative_type?: string;
  context?: {
    type: string;
    value: string;
    label?: string;
  };
  unit?: string;
  measurement_details?: Record<string, unknown> | null;
  accepts_equivalent_phrasing?: boolean;
  error_carried_forward?: boolean;
  accepts_reverse_argument?: boolean;
  answer_requirement?: string;
  total_alternatives?: number;
  acceptable_variations?: string[]; // Array of acceptable answer variations
}

export type MigrationStrategy = 'preserve' | 'reset' | 'extract' | 'auto';

export interface MigrationResult {
  success: boolean;
  migratedAnswers: CorrectAnswer[];
  warnings: string[];
  requiresUserInput: boolean;
  lossOfData: boolean;
}

export interface CompatibilityCheck {
  isCompatible: boolean;
  requiresConfirmation: boolean;
  canAutoMigrate: boolean;
  warnings: string[];
  suggestedStrategy: MigrationStrategy;
}

/**
 * Format categories for intelligent migration
 */
const FORMAT_CATEGORIES = {
  simple: ['single_word', 'single_line', 'short_phrase'],
  numeric: ['numeric', 'calculation', 'measurement'],
  structured: ['two_items_connected', 'equation', 'chemical_formula', 'structural_diagram'],
  complex: ['paragraph', 'essay', 'multi_part']
} as const;

/**
 * Requirement categories
 */
const REQUIREMENT_CATEGORIES = {
  single: ['single_choice', 'exact_match'],
  multiple: ['any_one_from', 'any_two_from', 'any_three_from'],
  all: ['both_required', 'all_required'],
  flexible: ['alternative_methods', 'acceptable_variations']
} as const;

class AnswerFieldMigrationService {
  /**
   * Check compatibility between old and new format
   */
  checkFormatCompatibility(
    oldFormat: string | null,
    newFormat: string | null,
    currentAnswers: CorrectAnswer[]
  ): CompatibilityCheck {
    if (!oldFormat || !newFormat) {
      return {
        isCompatible: true,
        requiresConfirmation: false,
        canAutoMigrate: true,
        warnings: [],
        suggestedStrategy: 'auto'
      };
    }

    if (oldFormat === newFormat) {
      return {
        isCompatible: true,
        requiresConfirmation: false,
        canAutoMigrate: true,
        warnings: [],
        suggestedStrategy: 'auto'
      };
    }

    const oldCategory = this.getFormatCategory(oldFormat);
    const newCategory = this.getFormatCategory(newFormat);

    if (oldCategory === newCategory) {
      return {
        isCompatible: true,
        requiresConfirmation: false,
        canAutoMigrate: true,
        warnings: [`Format changed from ${oldFormat} to ${newFormat}, but structure remains similar.`],
        suggestedStrategy: 'auto'
      };
    }

    if (oldCategory === 'simple' && newCategory === 'numeric') {
      return {
        isCompatible: true,
        requiresConfirmation: true,
        canAutoMigrate: false,
        warnings: ['Existing text answers may not be valid numbers. Review required.'],
        suggestedStrategy: 'preserve'
      };
    }

    if (oldCategory === 'complex' && (newCategory === 'simple' || newCategory === 'numeric')) {
      return {
        isCompatible: false,
        requiresConfirmation: true,
        canAutoMigrate: false,
        warnings: ['Simplifying from complex format will lose structured data. Consider extracting main answer.'],
        suggestedStrategy: 'extract'
      };
    }

    if ((oldCategory === 'simple' || oldCategory === 'numeric') && newCategory === 'structured') {
      return {
        isCompatible: true,
        requiresConfirmation: true,
        canAutoMigrate: false,
        warnings: ['Moving to structured format requires additional answer components.'],
        suggestedStrategy: 'preserve'
      };
    }

    return {
      isCompatible: true,
      requiresConfirmation: true,
      canAutoMigrate: false,
      warnings: ['Format change may require answer restructuring.'],
      suggestedStrategy: 'preserve'
    };
  }

  /**
   * Check compatibility between old and new requirement
   */
  checkRequirementCompatibility(
    oldRequirement: string | null,
    newRequirement: string | null,
    currentAnswers: CorrectAnswer[]
  ): CompatibilityCheck {
    if (!oldRequirement || !newRequirement) {
      return {
        isCompatible: true,
        requiresConfirmation: false,
        canAutoMigrate: true,
        warnings: [],
        suggestedStrategy: 'auto'
      };
    }

    if (oldRequirement === newRequirement) {
      return {
        isCompatible: true,
        requiresConfirmation: false,
        canAutoMigrate: true,
        warnings: [],
        suggestedStrategy: 'auto'
      };
    }

    const oldCategory = this.getRequirementCategory(oldRequirement);
    const newCategory = this.getRequirementCategory(newRequirement);
    const currentAnswerCount = currentAnswers.length;
    const requiredCount = this.getRequiredAnswerCount(newRequirement);

    if (currentAnswerCount < requiredCount) {
      return {
        isCompatible: false,
        requiresConfirmation: true,
        canAutoMigrate: false,
        warnings: [
          `Requirement needs ${requiredCount} answers, but only ${currentAnswerCount} exist.`,
          `Add ${requiredCount - currentAnswerCount} more answer(s).`
        ],
        suggestedStrategy: 'preserve'
      };
    }

    if (oldCategory === 'multiple' && newCategory === 'single' && currentAnswerCount > 1) {
      return {
        isCompatible: false,
        requiresConfirmation: true,
        canAutoMigrate: false,
        warnings: [
          'Changing to single choice with multiple answers.',
          'Choose which answer to keep, or mark others as alternatives.'
        ],
        suggestedStrategy: 'extract'
      };
    }

    if (oldCategory === 'single' && newCategory === 'multiple') {
      return {
        isCompatible: true,
        requiresConfirmation: true,
        canAutoMigrate: true,
        warnings: [`Consider adding more acceptable answers to match '${newRequirement}' requirement.`],
        suggestedStrategy: 'auto'
      };
    }

    return {
      isCompatible: true,
      requiresConfirmation: false,
      canAutoMigrate: true,
      warnings: [`Requirement changed from '${oldRequirement}' to '${newRequirement}'.`],
      suggestedStrategy: 'auto'
    };
  }

  /**
   * Migrate answers from one format to another
   */
  migrateAnswerFormat(
    oldFormat: string | null,
    newFormat: string | null,
    currentAnswers: CorrectAnswer[],
    strategy: MigrationStrategy = 'auto'
  ): MigrationResult {
    if (!currentAnswers || currentAnswers.length === 0) {
      return {
        success: true,
        migratedAnswers: [],
        warnings: [],
        requiresUserInput: false,
        lossOfData: false
      };
    }

    if (!oldFormat || !newFormat || oldFormat === newFormat) {
      return {
        success: true,
        migratedAnswers: currentAnswers,
        warnings: [],
        requiresUserInput: false,
        lossOfData: false
      };
    }

    switch (strategy) {
      case 'preserve':
        return this.preserveDataMigration(oldFormat, newFormat, currentAnswers);

      case 'extract':
        return this.extractMainAnswerMigration(currentAnswers);

      case 'reset':
        return {
          success: true,
          migratedAnswers: [],
          warnings: ['All answers cleared for new format.'],
          requiresUserInput: true,
          lossOfData: true
        };

      case 'auto':
      default:
        return this.autoMigrate(oldFormat, newFormat, currentAnswers);
    }
  }

  /**
   * Validate answer structure matches format and requirement
   */
  validateAnswerStructure(
    format: string | null,
    requirement: string | null,
    answers: CorrectAnswer[]
  ): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!answers || answers.length === 0) {
      errors.push('At least one correct answer is required.');
      return { valid: false, errors, warnings };
    }

    const requiredCount = this.getRequiredAnswerCount(requirement);
    if (answers.length < requiredCount) {
      errors.push(
        `Requirement '${requirement}' needs ${requiredCount} answers, but only ${answers.length} provided.`
      );
    }

    if (format === 'numeric' || format === 'calculation' || format === 'measurement') {
      answers.forEach((answer, idx) => {
        if (answer.answer && isNaN(Number(answer.answer.replace(/[^\d.-]/g, '')))) {
          warnings.push(`Answer ${idx + 1} may not be a valid number: "${answer.answer}"`);
        }
      });
    }

    if (requirement === 'both_required' && answers.length !== 2) {
      errors.push("'both_required' needs exactly 2 answers.");
    }

    if (requirement === 'any_two_from' && answers.length < 2) {
      errors.push("'any_two_from' needs at least 2 answers.");
    }

    if (requirement === 'any_three_from' && answers.length < 3) {
      errors.push("'any_three_from' needs at least 3 answers.");
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Suggest answer count based on requirement
   */
  suggestAnswerCount(requirement: string | null): number {
    if (!requirement) return 1;

    const counts: Record<string, number> = {
      'single_choice': 1,
      'exact_match': 1,
      'any_one_from': 2,
      'any_two_from': 3,
      'any_three_from': 4,
      'both_required': 2,
      'all_required': 3,
      'alternative_methods': 2,
      'acceptable_variations': 2
    };

    return counts[requirement] || 1;
  }

  /**
   * Extract main answer from complex structure
   */
  extractMainAnswer(complexAnswer: CorrectAnswer): string {
    if (typeof complexAnswer === 'string') {
      return complexAnswer;
    }

    if (complexAnswer.answer) {
      return complexAnswer.answer;
    }

    if (complexAnswer.context?.value) {
      return complexAnswer.context.value;
    }

    return '';
  }

  // Private helper methods

  private getFormatCategory(format: string): keyof typeof FORMAT_CATEGORIES {
    for (const [category, formats] of Object.entries(FORMAT_CATEGORIES)) {
      if (formats.includes(format as any)) {
        return category as keyof typeof FORMAT_CATEGORIES;
      }
    }
    return 'simple';
  }

  private getRequirementCategory(requirement: string): keyof typeof REQUIREMENT_CATEGORIES {
    for (const [category, requirements] of Object.entries(REQUIREMENT_CATEGORIES)) {
      if (requirements.includes(requirement as any)) {
        return category as keyof typeof REQUIREMENT_CATEGORIES;
      }
    }
    return 'single';
  }

  private getRequiredAnswerCount(requirement: string | null): number {
    if (!requirement) return 1;

    const counts: Record<string, number> = {
      'single_choice': 1,
      'exact_match': 1,
      'any_one_from': 1,
      'any_two_from': 2,
      'any_three_from': 3,
      'both_required': 2,
      'all_required': 1
    };

    return counts[requirement] || 1;
  }

  private preserveDataMigration(
    oldFormat: string,
    newFormat: string,
    currentAnswers: CorrectAnswer[]
  ): MigrationResult {
    return {
      success: true,
      migratedAnswers: currentAnswers.map(answer => ({
        ...answer,
        answer: answer.answer || ''
      })),
      warnings: [
        `Format changed from '${oldFormat}' to '${newFormat}'.`,
        'Existing answers preserved. Please review for compatibility.'
      ],
      requiresUserInput: true,
      lossOfData: false
    };
  }

  private extractMainAnswerMigration(currentAnswers: CorrectAnswer[]): MigrationResult {
    if (currentAnswers.length === 0) {
      return {
        success: true,
        migratedAnswers: [],
        warnings: ['No answers to extract.'],
        requiresUserInput: false,
        lossOfData: false
      };
    }

    const mainAnswer = currentAnswers[0];
    return {
      success: true,
      migratedAnswers: [{
        answer: this.extractMainAnswer(mainAnswer),
        marks: mainAnswer.marks || 1,
        alternative_id: 1
      }],
      warnings: [
        'Extracted main answer from complex structure.',
        `${currentAnswers.length - 1} alternative answer(s) removed.`
      ],
      requiresUserInput: false,
      lossOfData: currentAnswers.length > 1
    };
  }

  private autoMigrate(
    oldFormat: string,
    newFormat: string,
    currentAnswers: CorrectAnswer[]
  ): MigrationResult {
    const oldCategory = this.getFormatCategory(oldFormat);
    const newCategory = this.getFormatCategory(newFormat);

    if (oldCategory === newCategory) {
      return {
        success: true,
        migratedAnswers: currentAnswers,
        warnings: [`Format updated from '${oldFormat}' to '${newFormat}'. Answers preserved.`],
        requiresUserInput: false,
        lossOfData: false
      };
    }

    return this.preserveDataMigration(oldFormat, newFormat, currentAnswers);
  }
}

export const answerFieldMigrationService = new AnswerFieldMigrationService();
