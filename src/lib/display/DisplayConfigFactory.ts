/**
 * Display Configuration Factory
 *
 * Creates display configurations for different question viewing contexts:
 * - Practice Mode: Interactive with hints, no answers shown
 * - Exam Mode: Timed, strict, no hints or answers
 * - Review Mode: Full feedback with correct answers and explanations
 * - QA Preview Mode: Administrative preview with all metadata
 * - Simulation Mode: Mimics real exam environment
 */

export type DisplayContext = 'practice' | 'exam' | 'review' | 'qa_preview' | 'simulation';

export interface ElementDisplayConfig {
  // Visibility controls
  showQuestionText: boolean;
  showParts: boolean;
  showSubparts: boolean;
  showAnswerInput: boolean;

  // Content visibility
  showAttachments: boolean;
  showHints: boolean;
  showCorrectAnswers: boolean;
  showExplanations: boolean;
  showMarks: boolean;
  showTopic: boolean;
  showDifficulty: boolean;

  // Interaction controls
  allowAnswerInput: boolean;
  allowNavigation: boolean;
  allowPartCollapse: boolean;

  // Administrative controls (QA only)
  showMetadata: boolean;
  showAnswerFormat: boolean;
  showAnswerRequirement: boolean;
  showContainerFlags: boolean;
  showValidationWarnings: boolean;

  // Contextual styling
  highlightUnanswered: boolean;
  highlightIncorrect: boolean;
  highlightCorrect: boolean;
  compactMode: boolean;
}

export interface QuestionHierarchyConfig {
  // Container element behavior
  containerCollapsedByDefault: boolean;
  containerShowsChildCount: boolean;
  containerShowsChildMarks: boolean;

  // Navigation
  showQuestionNavigator: boolean;
  showPartNavigator: boolean;
  showSubpartNavigator: boolean;
  enableKeyboardNavigation: boolean;

  // Answer expectation handling
  hideInputForContainers: boolean;
  showContextualIndicator: boolean;
  autoExpandToFirstAnswer: boolean;
}

export interface DisplayConfig {
  context: DisplayContext;
  element: ElementDisplayConfig;
  hierarchy: QuestionHierarchyConfig;
}

/**
 * Create display configuration for Practice Mode
 */
export function createPracticeConfig(): DisplayConfig {
  return {
    context: 'practice',
    element: {
      showQuestionText: true,
      showParts: true,
      showSubparts: true,
      showAnswerInput: true,
      showAttachments: true,
      showHints: true,
      showCorrectAnswers: false,
      showExplanations: false,
      showMarks: true,
      showTopic: true,
      showDifficulty: true,
      allowAnswerInput: true,
      allowNavigation: true,
      allowPartCollapse: true,
      showMetadata: false,
      showAnswerFormat: false,
      showAnswerRequirement: false,
      showContainerFlags: false,
      showValidationWarnings: false,
      highlightUnanswered: true,
      highlightIncorrect: false,
      highlightCorrect: false,
      compactMode: false,
    },
    hierarchy: {
      containerCollapsedByDefault: false,
      containerShowsChildCount: true,
      containerShowsChildMarks: true,
      showQuestionNavigator: true,
      showPartNavigator: false,
      showSubpartNavigator: false,
      enableKeyboardNavigation: true,
      hideInputForContainers: true,
      showContextualIndicator: true,
      autoExpandToFirstAnswer: true,
    },
  };
}

/**
 * Create display configuration for Exam Mode
 */
export function createExamConfig(): DisplayConfig {
  return {
    context: 'exam',
    element: {
      showQuestionText: true,
      showParts: true,
      showSubparts: true,
      showAnswerInput: true,
      showAttachments: true,
      showHints: false,
      showCorrectAnswers: false,
      showExplanations: false,
      showMarks: true,
      showTopic: false,
      showDifficulty: false,
      allowAnswerInput: true,
      allowNavigation: true,
      allowPartCollapse: true,
      showMetadata: false,
      showAnswerFormat: false,
      showAnswerRequirement: false,
      showContainerFlags: false,
      showValidationWarnings: false,
      highlightUnanswered: true,
      highlightIncorrect: false,
      highlightCorrect: false,
      compactMode: false,
    },
    hierarchy: {
      containerCollapsedByDefault: false,
      containerShowsChildCount: true,
      containerShowsChildMarks: true,
      showQuestionNavigator: true,
      showPartNavigator: false,
      showSubpartNavigator: false,
      enableKeyboardNavigation: true,
      hideInputForContainers: true,
      showContextualIndicator: false,
      autoExpandToFirstAnswer: true,
    },
  };
}

/**
 * Create display configuration for Review Mode
 */
export function createReviewConfig(): DisplayConfig {
  return {
    context: 'review',
    element: {
      showQuestionText: true,
      showParts: true,
      showSubparts: true,
      showAnswerInput: true,
      showAttachments: true,
      showHints: true,
      showCorrectAnswers: true,
      showExplanations: true,
      showMarks: true,
      showTopic: true,
      showDifficulty: true,
      allowAnswerInput: false,
      allowNavigation: true,
      allowPartCollapse: true,
      showMetadata: false,
      showAnswerFormat: true,
      showAnswerRequirement: false,
      showContainerFlags: false,
      showValidationWarnings: false,
      highlightUnanswered: false,
      highlightIncorrect: true,
      highlightCorrect: true,
      compactMode: false,
    },
    hierarchy: {
      containerCollapsedByDefault: false,
      containerShowsChildCount: true,
      containerShowsChildMarks: true,
      showQuestionNavigator: true,
      showPartNavigator: true,
      showSubpartNavigator: true,
      enableKeyboardNavigation: true,
      hideInputForContainers: true,
      showContextualIndicator: true,
      autoExpandToFirstAnswer: false,
    },
  };
}

/**
 * Create display configuration for QA Preview Mode
 */
export function createQAPreviewConfig(): DisplayConfig {
  return {
    context: 'qa_preview',
    element: {
      showQuestionText: true,
      showParts: true,
      showSubparts: true,
      showAnswerInput: true,
      showAttachments: true,
      showHints: true,
      showCorrectAnswers: true,
      showExplanations: true,
      showMarks: true,
      showTopic: true,
      showDifficulty: true,
      allowAnswerInput: false,
      allowNavigation: true,
      allowPartCollapse: true,
      showMetadata: true,
      showAnswerFormat: true,
      showAnswerRequirement: true,
      showContainerFlags: true,
      showValidationWarnings: true,
      highlightUnanswered: false,
      highlightIncorrect: false,
      highlightCorrect: false,
      compactMode: false,
    },
    hierarchy: {
      containerCollapsedByDefault: false,
      containerShowsChildCount: true,
      containerShowsChildMarks: true,
      showQuestionNavigator: true,
      showPartNavigator: true,
      showSubpartNavigator: true,
      enableKeyboardNavigation: true,
      hideInputForContainers: false,
      showContextualIndicator: true,
      autoExpandToFirstAnswer: false,
    },
  };
}

/**
 * Create display configuration for Simulation Mode
 */
export function createSimulationConfig(): DisplayConfig {
  return {
    context: 'simulation',
    element: {
      showQuestionText: true,
      showParts: true,
      showSubparts: true,
      showAnswerInput: true,
      showAttachments: true,
      showHints: false,
      showCorrectAnswers: false,
      showExplanations: false,
      showMarks: true,
      showTopic: false,
      showDifficulty: false,
      allowAnswerInput: true,
      allowNavigation: true,
      allowPartCollapse: false,
      showMetadata: false,
      showAnswerFormat: false,
      showAnswerRequirement: false,
      showContainerFlags: false,
      showValidationWarnings: false,
      highlightUnanswered: false,
      highlightIncorrect: false,
      highlightCorrect: false,
      compactMode: true,
    },
    hierarchy: {
      containerCollapsedByDefault: false,
      containerShowsChildCount: true,
      containerShowsChildMarks: true,
      showQuestionNavigator: false,
      showPartNavigator: false,
      showSubpartNavigator: false,
      enableKeyboardNavigation: true,
      hideInputForContainers: true,
      showContextualIndicator: false,
      autoExpandToFirstAnswer: true,
    },
  };
}

/**
 * Factory function to create appropriate config based on context
 */
export function createDisplayConfig(context: DisplayContext): DisplayConfig {
  switch (context) {
    case 'practice':
      return createPracticeConfig();
    case 'exam':
      return createExamConfig();
    case 'review':
      return createReviewConfig();
    case 'qa_preview':
      return createQAPreviewConfig();
    case 'simulation':
      return createSimulationConfig();
    default:
      return createPracticeConfig();
  }
}

/**
 * Override specific config properties
 */
export function customizeDisplayConfig(
  baseConfig: DisplayConfig,
  overrides: Partial<{
    element: Partial<ElementDisplayConfig>;
    hierarchy: Partial<QuestionHierarchyConfig>;
  }>
): DisplayConfig {
  return {
    ...baseConfig,
    element: {
      ...baseConfig.element,
      ...overrides.element,
    },
    hierarchy: {
      ...baseConfig.hierarchy,
      ...overrides.hierarchy,
    },
  };
}

/**
 * Get display config with responsive adjustments
 */
export function getResponsiveDisplayConfig(
  context: DisplayContext,
  screenSize: 'mobile' | 'tablet' | 'desktop'
): DisplayConfig {
  const baseConfig = createDisplayConfig(context);

  // Mobile optimizations
  if (screenSize === 'mobile') {
    return customizeDisplayConfig(baseConfig, {
      element: {
        compactMode: true,
        allowPartCollapse: true,
      },
      hierarchy: {
        containerCollapsedByDefault: true,
        showPartNavigator: false,
        showSubpartNavigator: false,
      },
    });
  }

  // Tablet optimizations
  if (screenSize === 'tablet') {
    return customizeDisplayConfig(baseConfig, {
      hierarchy: {
        showPartNavigator: true,
        showSubpartNavigator: false,
      },
    });
  }

  // Desktop (no changes needed)
  return baseConfig;
}

/**
 * Helper to check if answer input should be shown for an element
 */
export function shouldShowAnswerInput(
  element: {
    is_container?: boolean;
    has_direct_answer?: boolean;
    correct_answers?: any[];
    subparts?: any[];
    marks?: number;
  },
  config: DisplayConfig
): boolean {
  // If config says hide inputs for containers, check the flag
  if (config.hierarchy.hideInputForContainers && element.is_container) {
    return false;
  }

  // If element explicitly has no direct answer, don't show input
  if (element.has_direct_answer === false) {
    return false;
  }

  // CRITICAL: If element has 0 marks, it's contextual-only (no answer expected)
  if (element.marks === 0) {
    return false;
  }

  // CRITICAL: If element has no correct_answers array (or it's empty) and has subparts,
  // it's a contextual-only part - don't show answer input
  if (
    element.subparts &&
    element.subparts.length > 0 &&
    (!element.correct_answers || element.correct_answers.length === 0)
  ) {
    return false;
  }

  // Otherwise follow the config
  return config.element.showAnswerInput;
}

/**
 * Helper to determine if an element is contextual-only (no answer expected)
 */
export function isContextualOnly(element: {
  is_container?: boolean;
  has_direct_answer?: boolean;
  correct_answers?: any[];
  subparts?: any[];
  marks?: number;
}): boolean {
  // Explicit flags
  if (element.is_container === true) return true;
  if (element.has_direct_answer === false) return true;

  // Zero marks indicates no answer expected
  if (element.marks === 0) return true;

  // Has subparts but no answers of its own
  if (
    element.subparts &&
    element.subparts.length > 0 &&
    (!element.correct_answers || element.correct_answers.length === 0)
  ) {
    return true;
  }

  return false;
}

/**
 * Helper to determine initial collapsed state
 */
export function getInitialCollapsedState(
  element: {
    is_container?: boolean;
    has_direct_answer?: boolean;
  },
  config: DisplayConfig
): boolean {
  // Auto-expand if configured and element has direct answer
  if (config.hierarchy.autoExpandToFirstAnswer && element.has_direct_answer) {
    return false;
  }

  // Use container collapsed default
  if (element.is_container) {
    return config.hierarchy.containerCollapsedByDefault;
  }

  // Default to expanded for answerable elements
  return false;
}
