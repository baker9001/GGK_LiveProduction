export interface ExtractionRules {
  forwardSlashHandling: boolean;
  lineByLineProcessing: boolean;
  alternativeLinking: boolean;
  contextRequired: boolean;
  figureDetection: boolean;
  educationalContent: {
    hintsRequired: boolean;
    explanationsRequired: boolean;
  };
  subjectSpecific: {
    physics: boolean;
    chemistry: boolean;
    biology: boolean;
    mathematics: boolean;
  };
  abbreviations: {
    ora: boolean;
    owtte: boolean;
    ecf: boolean;
    cao: boolean;
  };
  answerStructure: {
    validateMarks: boolean;
    requireContext: boolean;
    validateLinking: boolean;
    acceptAlternatives: boolean;
  };
  markScheme: {
    requiresManualMarking: boolean;
    markingCriteria: boolean;
    componentMarking: boolean;
    levelDescriptors: boolean;
  };
  examBoard: 'Cambridge' | 'Edexcel' | 'Both';
}

export interface JsonGuidelineSummary {
  questionTypes: string[];
  answerFormats: string[];
  answerRequirements: string[];
  subjectsDetected: string[];
  examBoard?: string;
  usesForwardSlash: boolean;
  usesLineByLineMarking: boolean;
  usesAlternativeLinking: boolean;
  includesContextualAnswers: boolean;
  includesFigures: boolean;
  includesAttachments: boolean;
  includesHints: boolean;
  includesExplanations: boolean;
  requiresManualMarking: boolean;
  hasComponentMarking: boolean;
  hasMultiMarkAllocations: boolean;
  variationSignals: string[];
  abbreviationsDetected: string[];
  contextTypesDetected: string[];
  partialCreditDetected: boolean;
}

export interface QuestionSupportSummary {
  totalQuestions: number;
  questionTypeCounts: Record<string, number>;
  answerFormatCounts: Record<string, number>;
  answerRequirementCounts: Record<string, number>;
  optionTypeCounts: Record<string, number>;
  contextTypes: Record<string, number>;
  structureFlags: {
    hasParts: boolean;
    hasSubparts: boolean;
    hasFigures: boolean;
    hasAttachments: boolean;
    hasContext: boolean;
    hasHints: boolean;
    hasExplanations: boolean;
    hasOptions: boolean;
    hasMatching: boolean;
    hasSequencing: boolean;
  };
  logicFlags: {
    alternativeLinking: boolean;
    allRequired: boolean;
    anyOf: boolean;
    alternativeMethods: boolean;
    contextUsage: boolean;
    multiMark: boolean;
    componentMarking: boolean;
    manualMarking: boolean;
    partialCredit: boolean;
    errorCarriedForward: boolean;
    reverseArgument: boolean;
    acceptsEquivalentPhrasing: boolean;
  };
}

export interface SimulationIssue {
  questionId: string;
  type: 'error' | 'warning' | 'info';
  message: string;
}

export interface SimulationSummaryDifficultyStats {
  total: number;
  correct: number;
  partial: number;
  marks: number;
  earnedMarks: number;
}

export interface SimulationSummaryTopicStats {
  total: number;
  correct: number;
  partial: number;
  marks: number;
  earnedMarks: number;
}

export interface SimulationSummaryTypeStats {
  total: number;
  correct: number;
  partial: number;
}

export interface SimulationSummaryStats {
  totalQuestions: number;
  attemptedQuestions: number;
  unattemptedQuestions: number;
  correctAnswers: number;
  partiallyCorrectAnswers: number;
  incorrectAnswers: number;
  totalPossibleMarks: number;
  earnedMarks: number;
  percentage: number;
  accuracy: number;
  completionRate: number;
  difficultyStats: Record<string, SimulationSummaryDifficultyStats>;
  topicStats: Record<string, SimulationSummaryTopicStats>;
  typeStats: Record<string, SimulationSummaryTypeStats>;
}

export interface SimulationQuestionPerformance {
  questionId: string;
  questionNumber?: string;
  status: 'correct' | 'partial' | 'incorrect' | 'unattempted';
  earnedMarks: number;
  totalMarks: number;
  timeSpent?: number;
}

export interface SimulationTimeInsights {
  averagePerQuestion?: number;
  fastestQuestionId?: string;
  fastestTime?: number;
  slowestQuestionId?: string;
  slowestTime?: number;
}

export interface SimulationResult {
  completed: boolean;
  completedAt?: string;
  flaggedQuestions: string[];
  issues: SimulationIssue[];
  recommendations: string[];
  overallScore?: number;
  timeSpent?: number;
  timeSpentSeconds?: number;
  summaryStats?: SimulationSummaryStats;
  questionPerformance?: SimulationQuestionPerformance[];
  timePerQuestion?: Record<string, number>;
  timeInsights?: SimulationTimeInsights;
  averageTimePerQuestion?: number;
  accuracy?: number;
  completionRate?: number;
  totalQuestions?: number;
  answeredCount?: number;
  correctAnswers?: number;
  partiallyCorrect?: number;
  incorrectAnswers?: number;
  totalMarks?: number;
  earnedMarks?: number;
  percentage?: number;
}
