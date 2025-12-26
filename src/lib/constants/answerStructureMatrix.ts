/**
 * Answer Structure Quick Reference Matrix
 * Based on Answer Structure Requirements Guide v1.0
 *
 * Provides quick lookup for recommended answer_format, answer_requirement,
 * and alternative_type based on question type
 */

export interface MatrixRecommendation {
  questionType: string;
  recommendedFormat: string;
  recommendedRequirement: string;
  recommendedAlternativeType: string;
  description: string;
  example?: string;
}

/**
 * Quick Reference Matrix from the Guide
 */
export const ANSWER_STRUCTURE_MATRIX: MatrixRecommendation[] = [
  {
    questionType: 'Name one thing',
    recommendedFormat: 'single_word',
    recommendedRequirement: 'any_one',
    recommendedAlternativeType: 'one_required',
    description: 'Single word selection from alternatives',
    example: '"Name the gas produced..."'
  },
  {
    questionType: 'State two things',
    recommendedFormat: 'multi_line',
    recommendedRequirement: 'any_two',
    recommendedAlternativeType: 'one_required',
    description: 'Two items from alternatives',
    example: '"State two properties..."'
  },
  {
    questionType: 'Define term',
    recommendedFormat: 'definition',
    recommendedRequirement: 'single_answer',
    recommendedAlternativeType: 'standalone',
    description: 'Formal definition',
    example: '"Define the term..."'
  },
  {
    questionType: 'Complete table',
    recommendedFormat: 'table_completion',
    recommendedRequirement: 'all_required',
    recommendedAlternativeType: 'standalone',
    description: 'All table cells must be filled',
    example: '"Complete the table..."'
  },
  {
    questionType: 'Write equation',
    recommendedFormat: 'equation',
    recommendedRequirement: 'complete_equation',
    recommendedAlternativeType: 'standalone',
    description: 'Fully balanced equation',
    example: '"Write the equation..."'
  },
  {
    questionType: 'Calculate',
    recommendedFormat: 'calculation',
    recommendedRequirement: 'working_and_answer',
    recommendedAlternativeType: 'standalone',
    description: 'Working and final answer',
    example: '"Calculate the mass..."'
  },
  {
    questionType: 'Describe test',
    recommendedFormat: 'multi_line',
    recommendedRequirement: 'method_and_result',
    recommendedAlternativeType: 'all_required',
    description: 'Method and expected result',
    example: '"Describe a test to distinguish..."'
  },
  {
    questionType: 'Put in order',
    recommendedFormat: 'sequence',
    recommendedRequirement: 'correct_order',
    recommendedAlternativeType: 'standalone',
    description: 'Specific sequence required',
    example: '"Arrange in order of reactivity..."'
  },
  {
    questionType: 'Draw diagram',
    recommendedFormat: 'diagram',
    recommendedRequirement: 'two_criteria',
    recommendedAlternativeType: 'all_required',
    description: 'Drawing with specific criteria',
    example: '"Draw and label the apparatus..."'
  }
];

/**
 * Get recommendation based on question text analysis
 */
export function getRecommendationByQuestionText(questionText: string): MatrixRecommendation | null {
  const lowerText = questionText.toLowerCase();

  // Check for calculation keywords
  if (lowerText.includes('calculate') || lowerText.includes('compute') || lowerText.includes('work out')) {
    return ANSWER_STRUCTURE_MATRIX.find(r => r.recommendedFormat === 'calculation') || null;
  }

  // Check for equation keywords
  if (lowerText.includes('write') && (lowerText.includes('equation') || lowerText.includes('formula'))) {
    return ANSWER_STRUCTURE_MATRIX.find(r => r.recommendedFormat === 'equation') || null;
  }

  // Check for table completion
  if (lowerText.includes('complete') && lowerText.includes('table')) {
    return ANSWER_STRUCTURE_MATRIX.find(r => r.recommendedFormat === 'table_completion') || null;
  }

  // Check for diagram
  if (lowerText.includes('draw') || lowerText.includes('sketch') || lowerText.includes('diagram')) {
    return ANSWER_STRUCTURE_MATRIX.find(r => r.recommendedFormat === 'diagram') || null;
  }

  // Check for definition
  if (lowerText.includes('define') || lowerText.includes('what is meant by')) {
    return ANSWER_STRUCTURE_MATRIX.find(r => r.recommendedFormat === 'definition') || null;
  }

  // Check for sequence
  if (lowerText.includes('order') || lowerText.includes('arrange') || lowerText.includes('sequence')) {
    return ANSWER_STRUCTURE_MATRIX.find(r => r.recommendedFormat === 'sequence') || null;
  }

  // Check for describe test
  if (lowerText.includes('describe') && lowerText.includes('test')) {
    return ANSWER_STRUCTURE_MATRIX.find(r => r.recommendedRequirement === 'method_and_result') || null;
  }

  // Check for name one
  if (lowerText.includes('name') && (lowerText.includes('one') || lowerText.includes('the'))) {
    return ANSWER_STRUCTURE_MATRIX.find(r => r.questionType === 'Name one thing') || null;
  }

  // Check for state two
  if (lowerText.includes('state') && lowerText.includes('two')) {
    return ANSWER_STRUCTURE_MATRIX.find(r => r.questionType === 'State two things') || null;
  }

  return null;
}

/**
 * Get all recommendations for a specific format
 */
export function getRecommendationsForFormat(format: string): MatrixRecommendation[] {
  return ANSWER_STRUCTURE_MATRIX.filter(r => r.recommendedFormat === format);
}

/**
 * Get all recommendations for a specific requirement
 */
export function getRecommendationsForRequirement(requirement: string): MatrixRecommendation[] {
  return ANSWER_STRUCTURE_MATRIX.filter(r => r.recommendedRequirement === requirement);
}

/**
 * Validate if the combination of format, requirement, and alternative_type is recommended
 */
export function validateCombination(
  format: string,
  requirement: string,
  alternativeType: string
): {
  isRecommended: boolean;
  suggestions: string[];
  matchingRecommendations: MatrixRecommendation[];
} {
  const matchingRecommendations = ANSWER_STRUCTURE_MATRIX.filter(
    r =>
      r.recommendedFormat === format &&
      r.recommendedRequirement === requirement &&
      r.recommendedAlternativeType === alternativeType
  );

  const suggestions: string[] = [];

  if (matchingRecommendations.length === 0) {
    // Find partial matches
    const formatMatches = ANSWER_STRUCTURE_MATRIX.filter(r => r.recommendedFormat === format);
    const requirementMatches = ANSWER_STRUCTURE_MATRIX.filter(r => r.recommendedRequirement === requirement);

    if (formatMatches.length > 0) {
      suggestions.push(
        `For format '${format}', the guide recommends:`,
        ...formatMatches.map(r => `  - ${r.questionType}: requirement='${r.recommendedRequirement}', alternative_type='${r.recommendedAlternativeType}'`)
      );
    }

    if (requirementMatches.length > 0 && requirementMatches.length !== formatMatches.length) {
      suggestions.push(
        `For requirement '${requirement}', the guide recommends:`,
        ...requirementMatches.map(r => `  - ${r.questionType}: format='${r.recommendedFormat}', alternative_type='${r.recommendedAlternativeType}'`)
      );
    }

    if (suggestions.length === 0) {
      suggestions.push('No exact recommendations found in the matrix for this combination');
    }
  }

  return {
    isRecommended: matchingRecommendations.length > 0,
    suggestions,
    matchingRecommendations
  };
}
