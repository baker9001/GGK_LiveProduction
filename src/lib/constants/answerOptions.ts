// src/lib/constants/answerOptions.ts

import { deriveAnswerRequirement as sophisticatedDeriver } from '../extraction/answerRequirementDeriver';

/**
 * Centralized configuration for Answer Format and Answer Requirement options
 * Used across Papers Setup (import) and Questions Setup (QA) stages
 */

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  component?: string; // Component to render for this format
  requiresStorage?: boolean; // Whether this format needs file storage
  isVisual?: boolean; // Whether this is a visual/interactive format
}

// Format Classifications for Acceptable Variations Support

// Text-based formats that fully support acceptable variations
export const TEXT_FORMATS_WITH_VARIATIONS = [
  'single_word', 'single_line', 'paragraph', 'definition',
  'two_items', 'two_items_connected',
  'multi_line', 'multi_line_labeled',
  'numerical', 'measurement', 'calculation_with_formula',
  'chemical_formula', 'structural_formula', 'name_and_structure',
  'sequence'
];

// Structured text formats - need special handling
// Accept variations but with format-specific validation
export const STRUCTURED_TEXT_FORMATS = [
  'code',           // Programming code - variations for syntax styles
  'equation',       // Math/chemical equations - variations for notation
  'calculation'     // Math calculations - variations for final answer only
];

// Visual/Interactive formats - DO NOT show UI but preserve data
export const VISUAL_FORMATS = [
  'chemical_structure', 'structural_diagram', 'diagram',
  'table', 'table_completion', 'graph',
  'audio', 'file_upload', 'not_applicable'
];

// Answer Format Options
export const ANSWER_FORMAT_OPTIONS: SelectOption[] = [
  {
    value: 'single_word',
    label: 'Single Word',
    description: 'One-word answer (e.g., "Mitosis", "Carbon")'
  },
  {
    value: 'single_line',
    label: 'Single Line',
    description: 'Short phrase or sentence (e.g., "Photosynthesis occurs in chloroplasts")'
  },
  {
    value: 'paragraph',
    label: 'Paragraph',
    description: 'Extended text response'
  },
  {
    value: 'definition',
    label: 'Definition',
    description: 'Formal definition required'
  },
  {
    value: 'two_items',
    label: 'Two Items',
    description: 'Two separate items (e.g., listing two causes)'
  },
  {
    value: 'two_items_connected',
    label: 'Two Connected Items',
    description: 'Two items with a relationship (e.g., "cause and effect")'
  },
  {
    value: 'multi_line',
    label: 'Multiple Lines',
    description: 'Multiple points or paragraphs'
  },
  {
    value: 'multi_line_labeled',
    label: 'Multiple Labeled Lines',
    description: 'Multiple points with labels (e.g., "(a) ..., (b) ..., (c) ...")'
  },
  {
    value: 'numerical',
    label: 'Numerical',
    description: 'Single numerical answer'
  },
  {
    value: 'calculation',
    label: 'Calculation',
    description: 'Mathematical calculation with working steps'
  },
  {
    value: 'calculation_with_formula',
    label: 'Calculation with Formula',
    description: 'Formula, substitution, and answer'
  },
  {
    value: 'measurement',
    label: 'Measurement',
    description: 'Reading from instrument'
  },
  {
    value: 'equation',
    label: 'Equation',
    description: 'Mathematical or chemical equation'
  },
  {
    value: 'chemical_formula',
    label: 'Chemical Formula',
    description: 'Chemical formula'
  },
  {
    value: 'chemical_structure',
    label: 'Chemical Structure',
    description: 'Chemical structure diagram or formula',
    component: 'ChemicalStructureEditor',
    requiresStorage: false,
    isVisual: true
  },
  {
    value: 'structural_formula',
    label: 'Structural Formula',
    description: 'Structural representation'
  },
  {
    value: 'name_and_structure',
    label: 'Name and Structure',
    description: 'Both name and structure'
  },
  {
    value: 'structural_diagram',
    label: 'Structural Diagram',
    description: 'Labeled diagram (e.g., biological structure, apparatus)',
    component: 'StructuralDiagram',
    requiresStorage: false,
    isVisual: true
  },
  {
    value: 'diagram',
    label: 'Diagram',
    description: 'General diagram or drawing',
    component: 'DiagramCanvas',
    requiresStorage: false,
    isVisual: true
  },
  {
    value: 'table',
    label: 'Table',
    description: 'Data presented in table format',
    component: 'TableCreator',
    requiresStorage: false,
    isVisual: true
  },
  {
    value: 'table_completion',
    label: 'Table Completion',
    description: 'Fill in missing cells in a provided table',
    component: 'TableCompletion',
    requiresStorage: false,
    isVisual: true
  },
  {
    value: 'graph',
    label: 'Graph',
    description: 'Graph or chart',
    component: 'GraphPlotter',
    requiresStorage: false,
    isVisual: true
  },
  {
    value: 'sequence',
    label: 'Sequence',
    description: 'Ordering items'
  },
  {
    value: 'code',
    label: 'Code',
    description: 'Programming code snippet',
    component: 'CodeEditor',
    requiresStorage: false,
    isVisual: false
  },
  {
    value: 'audio',
    label: 'Audio',
    description: 'Audio recording response',
    component: 'AudioRecorder',
    requiresStorage: true,
    isVisual: false
  },
  {
    value: 'file_upload',
    label: 'File Upload',
    description: 'File attachment required',
    component: 'FileUploader',
    requiresStorage: true,
    isVisual: false
  },
  {
    value: 'not_applicable',
    label: 'Not Applicable',
    description: 'No specific format required (e.g., MCQ)'
  }
];

// Answer Requirement Options
export const ANSWER_REQUIREMENT_OPTIONS: SelectOption[] = [
  {
    value: 'single_answer',
    label: 'Single Answer',
    description: 'Only one specific answer needed'
  },
  {
    value: 'single_choice',
    label: 'Single Choice (Legacy)',
    description: 'Only one correct answer (typical for MCQ) - alias for single_answer'
  },
  {
    value: 'any_one',
    label: 'Any One',
    description: 'Any one from a list of alternatives'
  },
  {
    value: 'any_one_from',
    label: 'Any One From (Legacy)',
    description: 'Any one correct answer from alternatives - alias for any_one'
  },
  {
    value: 'any_two',
    label: 'Any Two',
    description: 'Any two from a list of alternatives'
  },
  {
    value: 'any_2_from',
    label: 'Any 2 From (Legacy)',
    description: 'Any two correct answers from alternatives - alias for any_two'
  },
  {
    value: 'any_three',
    label: 'Any Three',
    description: 'Any three from a list'
  },
  {
    value: 'any_3_from',
    label: 'Any 3 From (Legacy)',
    description: 'Any three correct answers from alternatives - alias for any_three'
  },
  {
    value: 'both_required',
    label: 'Both Required',
    description: 'Both parts needed'
  },
  {
    value: 'both_points',
    label: 'Both Points',
    description: 'Both points needed for full marks'
  },
  {
    value: 'two_points',
    label: 'Two Points',
    description: 'Two distinct points required'
  },
  {
    value: 'all_required',
    label: 'All Required',
    description: 'All listed answers needed'
  },
  {
    value: 'method_and_result',
    label: 'Method and Result',
    description: 'Both test method AND result needed'
  },
  {
    value: 'working_and_answer',
    label: 'Working and Answer',
    description: 'Both working AND final answer needed'
  },
  {
    value: 'complete_equation',
    label: 'Complete Equation',
    description: 'Fully balanced equation'
  },
  {
    value: 'correct_order',
    label: 'Correct Order',
    description: 'Specific sequence required'
  },
  {
    value: 'two_criteria',
    label: 'Two Criteria',
    description: 'Two distinct criteria for marking'
  },
  {
    value: 'all_columns_correct',
    label: 'All Columns Correct',
    description: 'All table columns correct'
  },
  {
    value: 'two_complete_answers',
    label: 'Two Complete Answers',
    description: 'Two full answers (name + structure)'
  },
  {
    value: 'all_five_points',
    label: 'All Five Points',
    description: 'All five marking points needed'
  },
  {
    value: 'both_structures',
    label: 'Both Structures',
    description: 'Both structural diagrams needed'
  },
  {
    value: 'alternative_methods',
    label: 'Alternative Methods',
    description: 'Different valid approaches/methods accepted'
  },
  {
    value: 'not_applicable',
    label: 'Not Applicable',
    description: 'No specific requirement'
  }
];

// Helper function to get label from value
export function getAnswerFormatLabel(value: string | null | undefined): string {
  if (!value) return 'Not set';
  const option = ANSWER_FORMAT_OPTIONS.find(opt => opt.value === value);
  return option?.label || value;
}

export function getAnswerRequirementLabel(value: string | null | undefined): string {
  if (!value) return 'Not set';
  const option = ANSWER_REQUIREMENT_OPTIONS.find(opt => opt.value === value);
  return option?.label || value;
}

// Helper function to get component name from format value
export function getAnswerFormatComponent(value: string | null | undefined): string | null {
  if (!value) return null;
  const option = ANSWER_FORMAT_OPTIONS.find(opt => opt.value === value);
  return option?.component || null;
}

// Helper function to check if format requires storage
export function doesFormatRequireStorage(value: string | null | undefined): boolean {
  if (!value) return false;
  const option = ANSWER_FORMAT_OPTIONS.find(opt => opt.value === value);
  return option?.requiresStorage || false;
}

// Helper function to check if format is visual/interactive
export function isVisualFormat(value: string | null | undefined): boolean {
  if (!value) return false;
  const option = ANSWER_FORMAT_OPTIONS.find(opt => opt.value === value);
  return option?.isVisual || false;
}

// Auto-populate logic based on question characteristics
export function deriveAnswerFormat(question: {
  type: string;
  question_description?: string;
  correct_answers?: any[];
  has_direct_answer?: boolean;
  is_contextual_only?: boolean;
}): string | null {
  const { type, question_description = '', correct_answers = [] } = question;
  const desc = question_description.toLowerCase();

  // CRITICAL SAFEGUARD: If there are valid correct_answers, NEVER return 'not_applicable'
  const validAnswers = correct_answers.filter(ans =>
    ans && (ans.answer || ans.text) && String(ans.answer || ans.text).trim().length > 0
  );
  const hasValidAnswers = validAnswers.length > 0;

  // SAFEGUARD: If we have valid answers, override conflicting flags
  // The presence of actual answer data takes precedence over metadata flags
  // Use local variables to avoid reassignment of const parameters
  let isContextualOnly = question.is_contextual_only;
  let hasDirectAnswer = question.has_direct_answer;

  if (hasValidAnswers) {
    if (isContextualOnly === true || hasDirectAnswer === false) {
      console.warn('[deriveAnswerFormat] Flags indicate no answer but correct_answers exist - correcting flags');
      isContextualOnly = false;
      hasDirectAnswer = true;
    }
  }

  // Contextual-only questions should be marked as 'not_applicable'
  // BUT ONLY if they truly have NO answers
  if ((isContextualOnly === true || hasDirectAnswer === false) && !hasValidAnswers) {
    return 'not_applicable';
  }

  // MCQ/TF questions don't need a specific format - return null to prevent auto-fill
  if (type === 'mcq' || type === 'tf') {
    return null;
  }

  // Complex questions: Check if they have direct answers
  // If not, they're contextual containers for parts - mark as not_applicable
  if (type === 'complex') {
    // Complex questions with no correct answers are contextual only
    if (!hasValidAnswers) {
      return 'not_applicable';
    }
    // If complex question has correct answers, derive format based on content
    // (fall through to content-based detection below)
  }

  // Check for calculation keywords
  if (desc.includes('calculate') || desc.includes('compute') || desc.includes('work out')) {
    return 'calculation';
  }

  // Check for equation keywords
  if (desc.includes('equation') || desc.includes('formula')) {
    return 'equation';
  }

  // Check for diagram keywords
  if (desc.includes('draw') || desc.includes('sketch') || desc.includes('diagram')) {
    if (desc.includes('label')) {
      return 'structural_diagram';
    }
    return 'diagram';
  }

  // Check for table keywords
  if (desc.includes('table') || desc.includes('complete the table')) {
    return 'table_completion';
  }

  // Check for graph keywords
  if (desc.includes('graph') || desc.includes('plot')) {
    return 'graph';
  }

  // Check for chemical structure
  if (desc.includes('structure of') && (desc.includes('compound') || desc.includes('molecule'))) {
    return 'chemical_structure';
  }

  // Based on number of correct answers
  if (correct_answers.length === 0) {
    return null; // Cannot determine
  } else if (correct_answers.length === 1) {
    const answerText = correct_answers[0]?.answer || '';
    if (answerText.split(' ').length === 1) {
      return 'single_word';
    } else if (answerText.split('\n').length === 1) {
      return 'single_line';
    }
    return 'multi_line';
  } else if (correct_answers.length === 2) {
    return 'two_items';
  } else {
    return 'multi_line_labeled';
  }
}

/**
 * Derive answer requirement using sophisticated logic from answerRequirementDeriver
 * This is a wrapper that maintains backward compatibility while using the more advanced deriver
 */
export function deriveAnswerRequirement(question: {
  type: string;
  correct_answers?: any[];
  total_alternatives?: number;
  has_direct_answer?: boolean;
  is_contextual_only?: boolean;
  answer_format?: string;
  question_description?: string;
}): string | null {
  // CRITICAL SAFEGUARD: Check if we have valid correct_answers
  const validAnswers = (question.correct_answers || []).filter(ans =>
    ans && (ans.answer || ans.text) && String(ans.answer || ans.text).trim().length > 0
  );
  const hasValidAnswers = validAnswers.length > 0;

  // If we have valid answers but flags say no answer, override the flags
  // The presence of actual answer data takes precedence over metadata flags
  let hasDirectAnswer = question.has_direct_answer;
  let isContextualOnly = question.is_contextual_only;

  if (hasValidAnswers) {
    if (isContextualOnly === true || hasDirectAnswer === false) {
      console.warn('[deriveAnswerRequirement] Flags indicate no answer but correct_answers exist - correcting flags');
      hasDirectAnswer = true;
      isContextualOnly = false;
    }
  }

  // CRITICAL FIX: Derive answer_format if not provided, so we can pass it to the sophisticated deriver
  let answerFormat = question.answer_format;
  if (!answerFormat) {
    answerFormat = deriveAnswerFormat({
      type: question.type,
      question_description: question.question_description,
      correct_answers: question.correct_answers,
      has_direct_answer: hasDirectAnswer,
      is_contextual_only: isContextualOnly
    }) || undefined;
  }

  const result = sophisticatedDeriver({
    questionType: question.type,
    answerFormat: answerFormat,
    correctAnswers: validAnswers,
    totalAlternatives: question.total_alternatives,
    options: undefined,
    isContextualOnly: isContextualOnly,
    hasDirectAnswer: hasDirectAnswer
  });

  // FINAL SAFEGUARD: Never return 'not_applicable' if we have valid answers
  if (result.answerRequirement === 'not_applicable' && hasValidAnswers) {
    console.warn('Answer requirement derivation returned not_applicable despite having valid answers - defaulting to all_required');
    return 'all_required';
  }

  return result.answerRequirement;
}

/**
 * Helper Functions for Format Classification
 */

// Check if a format supports acceptable variations UI
// UPDATED: Now data-driven - if variations exist, show them regardless of format
export function supportsAcceptableVariations(format?: string | null, hasExistingData?: boolean): boolean {
  // If data exists, always show the UI (data-driven approach)
  if (hasExistingData === true) {
    return true;
  }

  // For new data entry, check if format supports variations
  if (!format) return false; // Don't show UI if format is not specified
  return TEXT_FORMATS_WITH_VARIATIONS.includes(format) ||
         STRUCTURED_TEXT_FORMATS.includes(format);
}

// Check if a format is recommended for acceptable variations (for warnings)
export function isFormatRecommendedForVariations(format?: string | null): boolean {
  if (!format) return false;
  return TEXT_FORMATS_WITH_VARIATIONS.includes(format) ||
         STRUCTURED_TEXT_FORMATS.includes(format);
}

// Check if format is structured (code, equation, etc.)
export function isStructuredFormat(format?: string | null): boolean {
  if (!format) return false;
  return STRUCTURED_TEXT_FORMATS.includes(format);
}

// Get format-specific placeholder text for variations input
export function getVariationPlaceholder(format?: string | null): string {
  if (!format) return 'Add variation (e.g., H2O for H₂O)';

  switch (format) {
    case 'code':
      return 'Add syntax variation (e.g., for loop vs while loop)';
    case 'equation':
      return 'Add notation variation (e.g., H₂O vs H2O)';
    case 'calculation':
      return 'Add final answer variation (e.g., 0.5 vs 1/2)';
    case 'chemical_formula':
      return 'Add formula variation (e.g., C₆H₁₂O₆ vs C6H12O6)';
    default:
      return 'Add variation (e.g., H2O for H₂O)';
  }
}

// Get format-specific tooltip text
export function getVariationTooltip(format?: string | null): string {
  if (!format) {
    return 'Alternative ways to write this answer (e.g., "H2O" for "H₂O", "CO2" for "CO₂")';
  }

  if (isStructuredFormat(format)) {
    return `For ${format} format: Add variations for different valid representations`;
  }

  return 'Alternative ways to write this answer (e.g., "H2O" for "H₂O", "CO2" for "CO₂")';
}
