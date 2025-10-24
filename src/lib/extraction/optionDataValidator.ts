// Path: src/lib/extraction/optionDataValidator.ts

/**
 * Option Data Validator
 *
 * Validates MCQ option data completeness during JSON import to prevent data loss.
 * Ensures all available option fields are captured and warns about missing educational content.
 */

export interface OptionValidationResult {
  isValid: boolean;
  errors: OptionValidationError[];
  warnings: OptionValidationWarning[];
  completeness: {
    hasLabel: boolean;
    hasText: boolean;
    hasExplanation: boolean;
    hasContext: boolean;
    hasImage: boolean;
    completenessScore: number; // 0-100
  };
}

export interface OptionValidationError {
  field: string;
  message: string;
  severity: 'error';
}

export interface OptionValidationWarning {
  field: string;
  message: string;
  severity: 'warning';
  impact: string;
}

export interface MCQValidationSummary {
  totalQuestions: number;
  questionsWithOptions: number;
  totalOptions: number;
  optionsWithExplanation: number;
  optionsWithContext: number;
  averageCompletenessScore: number;
  errors: OptionValidationError[];
  warnings: OptionValidationWarning[];
}

/**
 * Validates a single MCQ option for data completeness
 */
export function validateOption(option: any, index: number, questionNumber: string): OptionValidationResult {
  const errors: OptionValidationError[] = [];
  const warnings: OptionValidationWarning[] = [];

  const completeness = {
    hasLabel: false,
    hasText: false,
    hasExplanation: false,
    hasContext: false,
    hasImage: false,
    completenessScore: 0
  };

  // Critical validations (errors)
  if (!option) {
    errors.push({
      field: 'option',
      message: `Question ${questionNumber}: Option at index ${index} is null or undefined`,
      severity: 'error'
    });
    return { isValid: false, errors, warnings, completeness };
  }

  if (!option.label && typeof option.label !== 'string') {
    errors.push({
      field: 'label',
      message: `Question ${questionNumber}, Option ${index}: Missing required 'label' field (A, B, C, D)`,
      severity: 'error'
    });
  } else {
    completeness.hasLabel = true;
  }

  const optionText = option.text || option.option_text;
  if (!optionText || typeof optionText !== 'string' || optionText.trim().length === 0) {
    errors.push({
      field: 'text',
      message: `Question ${questionNumber}, Option ${option.label || index}: Missing or empty 'text' or 'option_text' field`,
      severity: 'error'
    });
  } else {
    completeness.hasText = true;
  }

  // Data completeness validations (warnings for missing educational content)
  if (!option.explanation) {
    warnings.push({
      field: 'explanation',
      message: `Question ${questionNumber}, Option ${option.label || index}: Missing 'explanation' field`,
      severity: 'warning',
      impact: 'Reduced learning value - students cannot understand why this option is correct/incorrect'
    });
  } else if (typeof option.explanation === 'string' && option.explanation.trim().length > 0) {
    completeness.hasExplanation = true;

    // Check explanation quality
    if (option.explanation.trim().length < 10) {
      warnings.push({
        field: 'explanation',
        message: `Question ${questionNumber}, Option ${option.label || index}: Explanation is too short (${option.explanation.length} chars)`,
        severity: 'warning',
        impact: 'Low-quality explanation may not help students learn effectively'
      });
    }
  }

  // Context metadata validation
  const hasContextType = option.context_type || option.context?.type;
  const hasContextValue = option.context_value || option.context?.value;

  if (!hasContextType || !hasContextValue) {
    warnings.push({
      field: 'context',
      message: `Question ${questionNumber}, Option ${option.label || index}: Missing context metadata (context_type/context_value)`,
      severity: 'warning',
      impact: 'Analytics will be incomplete - cannot track performance by concept/topic'
    });
  } else {
    completeness.hasContext = true;
  }

  // Image reference validation
  if (option.image_id) {
    completeness.hasImage = true;
  }

  // Calculate completeness score
  const weights = {
    label: 25,      // Critical
    text: 25,       // Critical
    explanation: 30, // High value for learning
    context: 15,    // Important for analytics
    image: 5        // Nice to have
  };

  let score = 0;
  if (completeness.hasLabel) score += weights.label;
  if (completeness.hasText) score += weights.text;
  if (completeness.hasExplanation) score += weights.explanation;
  if (completeness.hasContext) score += weights.context;
  if (completeness.hasImage) score += weights.image;

  completeness.completenessScore = score;

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    completeness
  };
}

/**
 * Validates all options for an MCQ question
 */
export function validateMCQOptions(
  question: any,
  questionNumber: string
): OptionValidationResult & { optionCount: number } {
  const aggregateResult: OptionValidationResult & { optionCount: number } = {
    isValid: true,
    errors: [],
    warnings: [],
    completeness: {
      hasLabel: true,
      hasText: true,
      hasExplanation: false,
      hasContext: false,
      hasImage: false,
      completenessScore: 0
    },
    optionCount: 0
  };

  // Check if question has options
  if (!question.options || !Array.isArray(question.options)) {
    aggregateResult.isValid = false;
    aggregateResult.errors.push({
      field: 'options',
      message: `Question ${questionNumber}: MCQ question missing 'options' array`,
      severity: 'error'
    });
    return aggregateResult;
  }

  // Check minimum options count
  if (question.options.length < 2) {
    aggregateResult.isValid = false;
    aggregateResult.errors.push({
      field: 'options',
      message: `Question ${questionNumber}: MCQ must have at least 2 options, found ${question.options.length}`,
      severity: 'error'
    });
    return aggregateResult;
  }

  aggregateResult.optionCount = question.options.length;

  // Validate each option
  let totalCompletenessScore = 0;
  let optionsWithExplanation = 0;
  let optionsWithContext = 0;

  question.options.forEach((option: any, index: number) => {
    const validation = validateOption(option, index, questionNumber);

    // Collect errors and warnings
    aggregateResult.errors.push(...validation.errors);
    aggregateResult.warnings.push(...validation.warnings);

    // Aggregate validity
    if (!validation.isValid) {
      aggregateResult.isValid = false;
    }

    // Track completeness
    totalCompletenessScore += validation.completeness.completenessScore;
    if (validation.completeness.hasExplanation) optionsWithExplanation++;
    if (validation.completeness.hasContext) optionsWithContext++;
  });

  // Calculate average completeness
  aggregateResult.completeness.completenessScore = Math.round(
    totalCompletenessScore / question.options.length
  );

  // Update aggregate completeness flags
  aggregateResult.completeness.hasExplanation = optionsWithExplanation === question.options.length;
  aggregateResult.completeness.hasContext = optionsWithContext === question.options.length;

  // Add overall warnings if data is incomplete
  if (optionsWithExplanation === 0) {
    aggregateResult.warnings.push({
      field: 'explanations',
      message: `Question ${questionNumber}: NO options have explanations`,
      severity: 'warning',
      impact: 'CRITICAL: Students cannot learn from their mistakes without explanations'
    });
  } else if (optionsWithExplanation < question.options.length) {
    aggregateResult.warnings.push({
      field: 'explanations',
      message: `Question ${questionNumber}: Only ${optionsWithExplanation}/${question.options.length} options have explanations`,
      severity: 'warning',
      impact: 'Inconsistent learning experience - some options lack educational value'
    });
  }

  if (optionsWithContext === 0) {
    aggregateResult.warnings.push({
      field: 'context',
      message: `Question ${questionNumber}: NO options have context metadata`,
      severity: 'warning',
      impact: 'Analytics will be incomplete for this question'
    });
  }

  return aggregateResult;
}

/**
 * Validates all MCQ questions in a paper import
 */
export function validateMCQPaper(paperData: any): MCQValidationSummary {
  const summary: MCQValidationSummary = {
    totalQuestions: 0,
    questionsWithOptions: 0,
    totalOptions: 0,
    optionsWithExplanation: 0,
    optionsWithContext: 0,
    averageCompletenessScore: 0,
    errors: [],
    warnings: []
  };

  if (!paperData.questions || !Array.isArray(paperData.questions)) {
    summary.errors.push({
      field: 'questions',
      message: 'Paper data missing questions array',
      severity: 'error'
    });
    return summary;
  }

  summary.totalQuestions = paperData.questions.length;
  let totalCompletenessScore = 0;
  let mcqQuestionCount = 0;

  paperData.questions.forEach((question: any) => {
    // Only validate MCQ questions
    if (question.type !== 'mcq') return;

    mcqQuestionCount++;
    const questionNumber = question.question_number || `Q${mcqQuestionCount}`;

    const validation = validateMCQOptions(question, questionNumber);

    // Collect errors and warnings
    summary.errors.push(...validation.errors);
    summary.warnings.push(...validation.warnings);

    // Track statistics
    if (validation.optionCount > 0) {
      summary.questionsWithOptions++;
      summary.totalOptions += validation.optionCount;
      totalCompletenessScore += validation.completeness.completenessScore;

      // Count options with explanations
      question.options.forEach((opt: any) => {
        if (opt.explanation) summary.optionsWithExplanation++;
        if (opt.context_type || opt.context?.type) summary.optionsWithContext++;
      });
    }
  });

  // Calculate average completeness
  if (mcqQuestionCount > 0) {
    summary.averageCompletenessScore = Math.round(totalCompletenessScore / mcqQuestionCount);
  }

  return summary;
}

/**
 * Logs validation results to console with color coding
 */
export function logValidationResults(summary: MCQValidationSummary): void {
  console.log('\n========================================');
  console.log('📊 MCQ OPTION DATA VALIDATION REPORT');
  console.log('========================================');

  console.log(`\n📈 Statistics:`);
  console.log(`   Total Questions: ${summary.totalQuestions}`);
  console.log(`   MCQ Questions with Options: ${summary.questionsWithOptions}`);
  console.log(`   Total Options: ${summary.totalOptions}`);
  console.log(`   Options with Explanations: ${summary.optionsWithExplanation}/${summary.totalOptions} (${Math.round(summary.optionsWithExplanation / summary.totalOptions * 100)}%)`);
  console.log(`   Options with Context: ${summary.optionsWithContext}/${summary.totalOptions} (${Math.round(summary.optionsWithContext / summary.totalOptions * 100)}%)`);
  console.log(`   Average Completeness Score: ${summary.averageCompletenessScore}/100`);

  if (summary.errors.length > 0) {
    console.log(`\n❌ ERRORS (${summary.errors.length}):`);
    summary.errors.slice(0, 10).forEach(error => {
      console.error(`   ${error.field}: ${error.message}`);
    });
    if (summary.errors.length > 10) {
      console.error(`   ... and ${summary.errors.length - 10} more errors`);
    }
  } else {
    console.log(`\n✅ No critical errors found`);
  }

  if (summary.warnings.length > 0) {
    console.log(`\n⚠️ WARNINGS (${summary.warnings.length}):`);
    summary.warnings.slice(0, 10).forEach(warning => {
      console.warn(`   ${warning.field}: ${warning.message}`);
      console.warn(`      Impact: ${warning.impact}`);
    });
    if (summary.warnings.length > 10) {
      console.warn(`   ... and ${summary.warnings.length - 10} more warnings`);
    }
  } else {
    console.log(`\n✅ No warnings - all options have complete data`);
  }

  // Overall assessment
  if (summary.errors.length === 0 && summary.warnings.length === 0) {
    console.log('\n🎉 EXCELLENT: All MCQ options have complete data with explanations and context!');
  } else if (summary.errors.length === 0 && summary.averageCompletenessScore >= 80) {
    console.log('\n👍 GOOD: Data is valid but some educational content is missing');
  } else if (summary.errors.length === 0) {
    console.log('\n⚠️ WARNING: Data is valid but significant educational content is missing');
  } else {
    console.log('\n❌ CRITICAL: Fix errors before importing to prevent data loss');
  }

  console.log('\n========================================\n');
}
