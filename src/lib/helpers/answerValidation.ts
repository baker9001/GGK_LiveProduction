// src/lib/helpers/answerValidation.ts
import { CorrectAnswer } from '../../app/system-admin/learning/practice-management/questions-setup/page';

export interface AnswerValidationResult {
  isCorrect: boolean;
  score: number;
  maxScore: number;
  feedback?: string;
  matchedComponents?: Array<{
    answer: string;
    context?: {
      type: string;
      value: string;
      label?: string;
    };
    marks: number;
  }>;
  partialCredit?: Array<{
    component: string;
    earned: number;
    possible: number;
    reason: string;
  }>;
}

export interface AnswerComponent {
  answer: string;
  marks: number;
  alternative_id: number;
  linked_alternatives: number[];
  alternative_type: 'one_required' | 'all_required' | 'exactly_n_required' | 'standalone';
  context: {
    type: 'option' | 'position' | 'calculation' | 'value' | 'descriptive' | 
          'structure' | 'process' | 'organism' | 'function' | 'adaptation' | 'phase' |
          'measurement' | 'chemical' | 'biological';
    value: string;
    label?: string;
  };
  variations?: AnswerVariation[];
  abbreviations?: {
    owtte?: boolean;  // or words to that effect
    ora?: boolean;    // or reverse argument
    ecf?: boolean;    // error carried forward
    cao?: boolean;    // correct answer only
  };
}

export interface AnswerVariation {
  text: string;
  type: 'owtte' | 'ora' | 'synonym' | 'notation' | 'spelling' | 'unit';
  acceptanceLevel?: 'exact' | 'flexible' | 'lenient';
}

/**
 * Validates a student's answer against correct answers with context support
 */
export function validateAnswer(
  studentAnswer: string | string[],
  correctAnswers: CorrectAnswer[],
  answerRequirement?: string,
  answerFormat?: string
): AnswerValidationResult {
  if (!correctAnswers || correctAnswers.length === 0) {
    return {
      isCorrect: false,
      score: 0,
      maxScore: 0,
      feedback: 'No correct answer defined'
    };
  }

  const maxScore = correctAnswers.reduce((sum, ca) => sum + (ca.marks || 1), 0);
  const studentAnswers = Array.isArray(studentAnswer) ? studentAnswer : [studentAnswer];
  const matchedComponents: typeof correctAnswers = [];
  
  // Normalize answers for comparison
  const normalizeAnswer = (answer: string) => 
    answer.trim().toLowerCase().replace(/\s+/g, ' ');

  // Check each student answer against correct answers
  let totalScore = 0;

  switch (answerRequirement) {
    case 'any_one_from':
    case 'any_two_from':
    case 'any_three_from': {
      const requiredCount = answerRequirement === 'any_one_from' ? 1 :
                          answerRequirement === 'any_two_from' ? 2 : 3;
      
      for (const sa of studentAnswers) {
        const normalized = normalizeAnswer(sa);
        const match = correctAnswers.find(ca => 
          normalizeAnswer(ca.answer) === normalized
        );
        
        if (match && !matchedComponents.find(mc => mc.answer === match.answer)) {
          matchedComponents.push(match);
          totalScore += match.marks || 1;
        }
      }
      
      const isCorrect = matchedComponents.length >= requiredCount;
      return {
        isCorrect,
        score: Math.min(totalScore, maxScore),
        maxScore,
        matchedComponents,
        feedback: isCorrect 
          ? `Correct! You provided ${matchedComponents.length} valid answer(s).`
          : `You need to provide ${requiredCount} valid answer(s). You provided ${matchedComponents.length}.`
      };
    }

    case 'both_required':
    case 'all_required': {
      for (const ca of correctAnswers) {
        const normalized = normalizeAnswer(ca.answer);
        const found = studentAnswers.some(sa => 
          normalizeAnswer(sa) === normalized
        );
        
        if (found) {
          matchedComponents.push(ca);
          totalScore += ca.marks || 1;
        }
      }
      
      const isCorrect = matchedComponents.length === correctAnswers.length;
      return {
        isCorrect,
        score: totalScore,
        maxScore,
        matchedComponents,
        feedback: isCorrect 
          ? 'Correct! All required answers provided.'
          : `You provided ${matchedComponents.length} out of ${correctAnswers.length} required answers.`
      };
    }

    case 'alternative_methods':
    case 'acceptable_variations':
    default: {
      // For single answer or alternative methods
      for (const sa of studentAnswers) {
        const normalized = normalizeAnswer(sa);
        const match = correctAnswers.find(ca => 
          normalizeAnswer(ca.answer) === normalized
        );
        
        if (match) {
          matchedComponents.push(match);
          totalScore = match.marks || 1;
          break; // Only count one match for these types
        }
      }
      
      const isCorrect = matchedComponents.length > 0;
      return {
        isCorrect,
        score: totalScore,
        maxScore: correctAnswers[0]?.marks || 1, // Max score is from any single answer
        matchedComponents,
        feedback: isCorrect 
          ? 'Correct!'
          : 'Incorrect answer.'
      };
    }
  }
}

/**
 * Enhanced validation with variations, OWTTE, ORA support
 */
export function validateWithVariations(
  studentAnswer: string | string[],
  answerComponents: AnswerComponent[],
  subject?: string
): AnswerValidationResult {
  const studentAnswers = Array.isArray(studentAnswer) ? studentAnswer : [studentAnswer];
  const maxScore = answerComponents.reduce((sum, ac) => sum + ac.marks, 0);
  const matchedComponents: any[] = [];
  const partialCredit: any[] = [];
  let totalScore = 0;

  // Normalize function with subject-specific rules
  const normalizeAnswer = (answer: string, component: AnswerComponent): string => {
    let normalized = answer.trim().toLowerCase();
    
    // Subject-specific normalization
    if (subject?.toLowerCase().includes('chemistry')) {
      // Remove spaces in chemical formulas
      normalized = normalized.replace(/\s+(?=[0-9])/g, '');
      // Normalize charge notation
      normalized = normalized.replace(/\^(\d+)[+-]/g, (match, num) => `${num}${match.slice(-1)}`);
    }
    
    if (subject?.toLowerCase().includes('physics')) {
      // Normalize units
      normalized = normalized.replace(/\s*(m\/s|ms⁻¹|m\.s⁻¹)/gi, 'm/s');
      normalized = normalized.replace(/\s*(kg|kilogram)/gi, 'kg');
    }
    
    // General normalization
    normalized = normalized.replace(/\s+/g, ' ');
    normalized = normalized.replace(/['']/g, "'");
    normalized = normalized.replace(/[""]/g, '"');
    
    return normalized;
  };

  // Check if answers match with variations
  const checkAnswerMatch = (studentAns: string, component: AnswerComponent): boolean => {
    const normalizedStudent = normalizeAnswer(studentAns, component);
    const normalizedCorrect = normalizeAnswer(component.answer, component);
    
    // Exact match
    if (normalizedStudent === normalizedCorrect) {
      return true;
    }
    
    // Check variations
    if (component.variations) {
      for (const variation of component.variations) {
        const normalizedVariation = normalizeAnswer(variation.text, component);
        
        switch (variation.type) {
          case 'owtte':
            // "Or words to that effect" - more flexible matching
            if (component.abbreviations?.owtte) {
              const keywords = normalizedCorrect.split(' ').filter(w => w.length > 3);
              const matchedKeywords = keywords.filter(kw => normalizedStudent.includes(kw));
              if (matchedKeywords.length >= keywords.length * 0.6) {
                return true;
              }
            }
            break;
            
          case 'ora':
            // "Or reverse argument" - check if logic is reversed but valid
            if (component.abbreviations?.ora) {
              const reversePatterns = [
                [/(\w+) is greater than (\w+)/, '$2 is less than $1'],
                [/(\w+) increases/, '$1 decreases'],
                [/(\w+) before (\w+)/, '$2 after $1'],
                [/(\w+) causes (\w+)/, '$2 is caused by $1']
              ];
              
              for (const [pattern, replacement] of reversePatterns) {
                if (normalizedCorrect.match(pattern)) {
                  const reversed = normalizedCorrect.replace(pattern, replacement as string);
                  if (normalizedStudent === reversed) {
                    return true;
                  }
                }
              }
            }
            break;
            
          case 'synonym':
            if (normalizedStudent === normalizedVariation) {
              return true;
            }
            break;
            
          case 'notation':
            // Different notation styles (e.g., scientific notation)
            const scientificPattern = /^([-+]?\d*\.?\d+)\s*[×x]\s*10\^?([-+]?\d+)$/;
            const studentMatch = normalizedStudent.match(scientificPattern);
            const correctMatch = normalizedCorrect.match(scientificPattern);
            
            if (studentMatch && correctMatch) {
              const studentValue = parseFloat(studentMatch[1]) * Math.pow(10, parseInt(studentMatch[2]));
              const correctValue = parseFloat(correctMatch[1]) * Math.pow(10, parseInt(correctMatch[2]));
              if (Math.abs(studentValue - correctValue) < 0.0001) {
                return true;
              }
            }
            break;
            
          case 'spelling':
            // Check for common spelling variations
            const levenshteinDistance = (a: string, b: string): number => {
              const matrix = [];
              for (let i = 0; i <= b.length; i++) {
                matrix[i] = [i];
              }
              for (let j = 0; j <= a.length; j++) {
                matrix[0][j] = j;
              }
              for (let i = 1; i <= b.length; i++) {
                for (let j = 1; j <= a.length; j++) {
                  if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                  } else {
                    matrix[i][j] = Math.min(
                      matrix[i - 1][j - 1] + 1,
                      matrix[i][j - 1] + 1,
                      matrix[i - 1][j] + 1
                    );
                  }
                }
              }
              return matrix[b.length][a.length];
            };
            
            const distance = levenshteinDistance(normalizedStudent, normalizedVariation);
            const maxLength = Math.max(normalizedStudent.length, normalizedVariation.length);
            if (distance / maxLength < 0.2) { // 80% similarity
              return true;
            }
            break;
            
          case 'unit':
            // Check for unit variations
            if (normalizedStudent === normalizedVariation) {
              return true;
            }
            break;
        }
      }
    }
    
    return false;
  };

  // Process linked alternatives
  const processLinkedAlternatives = (components: AnswerComponent[]): void => {
    const linkedGroups = new Map<number, AnswerComponent[]>();
    
    // Group components by their linked alternatives
    components.forEach(comp => {
      if (comp.linked_alternatives.length > 0) {
        const groupId = Math.min(comp.alternative_id, ...comp.linked_alternatives);
        if (!linkedGroups.has(groupId)) {
          linkedGroups.set(groupId, []);
        }
        linkedGroups.get(groupId)!.push(comp);
      }
    });
    
    // Check each linked group
    linkedGroups.forEach((group, groupId) => {
      const alternativeType = group[0].alternative_type;
      const matchedInGroup = group.filter(comp => 
        studentAnswers.some(sa => checkAnswerMatch(sa, comp))
      );
      
      switch (alternativeType) {
        case 'all_required':
          if (matchedInGroup.length === group.length) {
            matchedInGroup.forEach(comp => {
              matchedComponents.push(comp);
              totalScore += comp.marks;
            });
          } else {
            const partialMarks = (matchedInGroup.length / group.length) * 
                               group.reduce((sum, c) => sum + c.marks, 0);
            partialCredit.push({
              component: `Linked group ${groupId}`,
              earned: partialMarks,
              possible: group.reduce((sum, c) => sum + c.marks, 0),
              reason: `${matchedInGroup.length} of ${group.length} required components provided`
            });
            totalScore += partialMarks;
          }
          break;
          
        case 'one_required':
          if (matchedInGroup.length > 0) {
            const bestMatch = matchedInGroup.reduce((best, current) => 
              current.marks > best.marks ? current : best
            );
            matchedComponents.push(bestMatch);
            totalScore += bestMatch.marks;
          }
          break;
          
        case 'exactly_n_required':
          // This would need additional metadata about 'n'
          // For now, treat as 'one_required'
          if (matchedInGroup.length > 0) {
            matchedComponents.push(matchedInGroup[0]);
            totalScore += matchedInGroup[0].marks;
          }
          break;
      }
    });
  };

  // Check standalone components
  answerComponents.forEach(component => {
    if (component.alternative_type === 'standalone' || component.linked_alternatives.length === 0) {
      const matched = studentAnswers.some(sa => checkAnswerMatch(sa, component));
      if (matched) {
        matchedComponents.push(component);
        totalScore += component.marks;
      }
    }
  });

  // Process linked alternatives
  processLinkedAlternatives(answerComponents);

  // Apply ECF (Error Carried Forward) if applicable
  const hasECF = answerComponents.some(comp => comp.abbreviations?.ecf);
  if (hasECF && totalScore < maxScore * 0.5) {
    // If ECF is allowed and student has less than 50% score, 
    // check if their method is correct even with wrong values
    const methodMarks = maxScore * 0.3; // Award 30% for correct method
    partialCredit.push({
      component: 'Method marks (ECF)',
      earned: methodMarks,
      possible: methodMarks,
      reason: 'Correct method with error carried forward'
    });
    totalScore += methodMarks;
  }

  return {
    isCorrect: totalScore >= maxScore * 0.8, // 80% threshold for "correct"
    score: Math.min(totalScore, maxScore),
    maxScore,
    matchedComponents,
    partialCredit: partialCredit.length > 0 ? partialCredit : undefined,
    feedback: generateDetailedFeedback(matchedComponents, answerComponents, totalScore, maxScore)
  };
}

/**
 * Physics-specific measurement validation
 */
export function validateMeasurement(
  studentAnswer: string,
  expectedValue: number,
  instrument: string,
  tolerance?: number
): { isValid: boolean; feedback: string; parsedValue?: number; unit?: string } {
  // Parse student answer for value and unit
  const measurementPattern = /^([-+]?\d*\.?\d+)\s*(?:±\s*([-+]?\d*\.?\d+))?\s*([a-zA-Z]+)?$/;
  const match = studentAnswer.trim().match(measurementPattern);
  
  if (!match) {
    return {
      isValid: false,
      feedback: 'Invalid measurement format. Expected: value (± uncertainty) unit'
    };
  }
  
  const value = parseFloat(match[1]);
  const uncertainty = match[2] ? parseFloat(match[2]) : null;
  const unit = match[3] || '';
  
  // Determine tolerance based on instrument if not provided
  if (tolerance === undefined) {
    const instrumentTolerances: Record<string, number> = {
      'ruler': 0.05,      // ±0.5mm = ±0.05cm
      'vernier': 0.005,   // ±0.05mm = ±0.005cm
      'micrometer': 0.0005, // ±0.005mm
      'balance': 0.01,    // ±0.01g
      'stopwatch': 0.01,  // ±0.01s
      'thermometer': 0.5, // ±0.5°C
      'ammeter': 0.01,    // ±0.01A
      'voltmeter': 0.01   // ±0.01V
    };
    tolerance = instrumentTolerances[instrument.toLowerCase()] || 0.05;
  }
  
  // Check if value is within tolerance
  const isWithinTolerance = Math.abs(value - expectedValue) <= tolerance;
  
  // Generate appropriate feedback
  let feedback = '';
  if (isWithinTolerance) {
    feedback = 'Correct measurement';
    if (uncertainty !== null) {
      // Check if uncertainty is reasonable
      const expectedUncertainty = tolerance;
      if (Math.abs(uncertainty - expectedUncertainty) > expectedUncertainty * 0.5) {
        feedback += `, but uncertainty should be ±${expectedUncertainty}`;
      } else {
        feedback += ' with appropriate uncertainty';
      }
    }
  } else {
    const difference = Math.abs(value - expectedValue);
    if (difference <= tolerance * 2) {
      feedback = `Close, but outside acceptable range. Expected ${expectedValue} ± ${tolerance}`;
    } else {
      feedback = `Incorrect measurement. Expected ${expectedValue} ± ${tolerance}`;
    }
  }
  
  // Check unit if expected
  const expectedUnits: Record<string, string[]> = {
    'length': ['m', 'cm', 'mm', 'km'],
    'mass': ['kg', 'g', 'mg'],
    'time': ['s', 'ms', 'min', 'h'],
    'temperature': ['°C', 'K', '°F'],
    'current': ['A', 'mA'],
    'voltage': ['V', 'mV', 'kV']
  };
  
  return {
    isValid: isWithinTolerance,
    feedback,
    parsedValue: value,
    unit
  };
}

/**
 * Chemistry-specific formula validation
 */
export function validateChemicalFormula(
  studentAnswer: string,
  correctFormula: string,
  allowStateSymbols: boolean = true
): { isValid: boolean; normalizedAnswer: string; feedback?: string } {
  // Normalize chemical formulas
  const normalize = (formula: string): string => {
    let normalized = formula.trim();
    
    // Remove spaces between elements and numbers
    normalized = normalized.replace(/([A-Z][a-z]?)\s+(\d+)/g, '$1$2');
    normalized = normalized.replace(/\s+/g, '');
    
    // Standardize charge notation
    normalized = normalized.replace(/(\d+)\+/g, '$1+');
    normalized = normalized.replace(/(\d+)\-/g, '$1-');
    
    // Extract and normalize state symbols
    const statePattern = /\(([slagq])\)/gi;
    const states: string[] = [];
    normalized = normalized.replace(statePattern, (match, state) => {
      states.push(state.toLowerCase());
      return '';
    });
    
    // Re-add state symbols in standard format if present
    if (states.length > 0 && allowStateSymbols) {
      normalized += `(${states[0]})`;
    }
    
    return normalized;
  };
  
  const normalizedStudent = normalize(studentAnswer);
  const normalizedCorrect = normalize(correctFormula);
  
  // Check for exact match
  if (normalizedStudent === normalizedCorrect) {
    return {
      isValid: true,
      normalizedAnswer: normalizedStudent
    };
  }
  
  // Check for common variations
  const variations: Record<string, string[]> = {
    'H2O': ['HOH'],
    'H2SO4': ['H2SO4'],
    'NH3': ['NH3'],
    'CO2': ['O=C=O'],
    'CH4': ['CH4'],
    'C2H5OH': ['CH3CH2OH', 'EtOH'],
    'CH3COOH': ['CH3CO2H', 'AcOH']
  };
  
  // Check if formulas are equivalent
  for (const [formula, alts] of Object.entries(variations)) {
    if (normalizedCorrect === normalize(formula)) {
      if (alts.some(alt => normalizedStudent === normalize(alt))) {
        return {
          isValid: true,
          normalizedAnswer: normalizedStudent,
          feedback: 'Alternative notation accepted'
        };
      }
    }
  }
  
  // Check for structural isomers (same molecular formula)
  const getMolecularFormula = (formula: string): Map<string, number> => {
    const elements = new Map<string, number>();
    const elementPattern = /([A-Z][a-z]?)(\d*)/g;
    let match;
    
    while ((match = elementPattern.exec(formula)) !== null) {
      const element = match[1];
      const count = parseInt(match[2] || '1');
      elements.set(element, (elements.get(element) || 0) + count);
    }
    
    return elements;
  };
  
  const studentElements = getMolecularFormula(normalizedStudent);
  const correctElements = getMolecularFormula(normalizedCorrect);
  
  let isIsomer = true;
  if (studentElements.size === correctElements.size) {
    for (const [element, count] of studentElements) {
      if (correctElements.get(element) !== count) {
        isIsomer = false;
        break;
      }
    }
  } else {
    isIsomer = false;
  }
  
  if (isIsomer && normalizedStudent !== normalizedCorrect) {
    return {
      isValid: false,
      normalizedAnswer: normalizedStudent,
      feedback: 'Molecular formula is correct but structure is different'
    };
  }
  
  return {
    isValid: false,
    normalizedAnswer: normalizedStudent,
    feedback: 'Incorrect chemical formula'
  };
}

/**
 * Biology-specific sequence validation
 */
export function validateBiologicalSequence(
  studentAnswers: string[],
  correctSequence: string[],
  allowPartialOrder: boolean = false
): { isCorrect: boolean; score: number; feedback: string } {
  const normalize = (term: string): string => {
    return term.trim().toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/^(the|a|an)\s+/i, '');
  };
  
  const normalizedStudent = studentAnswers.map(normalize);
  const normalizedCorrect = correctSequence.map(normalize);
  
  // Check for exact sequence match
  let exactMatch = true;
  let matchedCount = 0;
  
  for (let i = 0; i < normalizedCorrect.length; i++) {
    if (i < normalizedStudent.length && normalizedStudent[i] === normalizedCorrect[i]) {
      matchedCount++;
    } else {
      exactMatch = false;
    }
  }
  
  if (exactMatch && normalizedStudent.length === normalizedCorrect.length) {
    return {
      isCorrect: true,
      score: 1,
      feedback: 'Perfect! Sequence is correct.'
    };
  }
  
  // Check for partial order if allowed
  if (allowPartialOrder) {
    const correctPairs: Set<string> = new Set();
    const studentPairs: Set<string> = new Set();
    
    // Generate ordered pairs for correct sequence
    for (let i = 0; i < normalizedCorrect.length - 1; i++) {
      for (let j = i + 1; j < normalizedCorrect.length; j++) {
        correctPairs.add(`${normalizedCorrect[i]}|${normalizedCorrect[j]}`);
      }
    }
    
    // Generate ordered pairs for student sequence
    for (let i = 0; i < normalizedStudent.length - 1; i++) {
      for (let j = i + 1; j < normalizedStudent.length; j++) {
        if (normalizedCorrect.includes(normalizedStudent[i]) && 
            normalizedCorrect.includes(normalizedStudent[j])) {
          studentPairs.add(`${normalizedStudent[i]}|${normalizedStudent[j]}`);
        }
      }
    }
    
    // Calculate how many ordered pairs match
    let matchingPairs = 0;
    studentPairs.forEach(pair => {
      if (correctPairs.has(pair)) {
        matchingPairs++;
      }
    });
    
    const totalPairs = correctPairs.size;
    const score = totalPairs > 0 ? matchingPairs / totalPairs : 0;
    
    if (score >= 0.8) {
      return {
        isCorrect: true,
        score,
        feedback: 'Good! Most of the sequence order is preserved.'
      };
    } else if (score >= 0.5) {
      return {
        isCorrect: false,
        score,
        feedback: 'Partial credit: Some sequence elements are in correct order.'
      };
    }
  }
  
  // Check if all elements are present but in wrong order
  const studentSet = new Set(normalizedStudent);
  const correctSet = new Set(normalizedCorrect);
  let allPresent = true;
  
  correctSet.forEach(item => {
    if (!studentSet.has(item)) {
      allPresent = false;
    }
  });
  
  if (allPresent && studentSet.size === correctSet.size) {
    return {
      isCorrect: false,
      score: 0.3,
      feedback: 'All elements present but in incorrect order.'
    };
  }
  
  // Calculate partial score based on matched elements
  const presentCount = Array.from(correctSet).filter(item => studentSet.has(item)).length;
  const score = correctSet.size > 0 ? presentCount / correctSet.size * 0.5 : 0;
  
  return {
    isCorrect: false,
    score,
    feedback: `${presentCount} out of ${correctSet.size} elements correctly identified.`
  };
}

/**
 * Generate detailed feedback based on validation results
 */
function generateDetailedFeedback(
  matchedComponents: any[],
  allComponents: AnswerComponent[],
  score: number,
  maxScore: number
): string {
  const percentage = Math.round((score / maxScore) * 100);
  
  if (percentage === 100) {
    return 'Perfect! All components answered correctly.';
  } else if (percentage >= 80) {
    return `Excellent work! You scored ${score}/${maxScore} marks (${percentage}%).`;
  } else if (percentage >= 60) {
    const missed = allComponents.filter(ac => 
      !matchedComponents.find(mc => mc.alternative_id === ac.alternative_id)
    );
    return `Good attempt. You scored ${score}/${maxScore} marks (${percentage}%). ` +
           `Consider reviewing: ${missed.map(m => m.context.label || m.context.type).join(', ')}`;
  } else if (percentage >= 40) {
    return `Partial understanding shown. You scored ${score}/${maxScore} marks (${percentage}%). ` +
           `Focus on understanding the key concepts better.`;
  } else {
    return `You scored ${score}/${maxScore} marks (${percentage}%). ` +
           `Review the material and try again. Focus on understanding the fundamental concepts.`;
  }
}

/**
 * Formats correct answers for display with context information
 */
export function formatCorrectAnswers(
  correctAnswers: CorrectAnswer[],
  answerRequirement?: string
): string {
  if (!correctAnswers || correctAnswers.length === 0) {
    return 'No answer specified';
  }

  if (correctAnswers.length === 1) {
    return correctAnswers[0].answer;
  }

  const requirementPrefix = getRequirementPrefix(answerRequirement);
  const answerList = correctAnswers
    .map((ca, index) => {
      let answer = ca.answer;
      if (ca.context?.label) {
        answer += ` (${ca.context.label})`;
      }
      if (ca.marks && ca.marks !== 1) {
        answer += ` [${ca.marks} marks]`;
      }
      return `${index + 1}. ${answer}`;
    })
    .join('\n');

  return requirementPrefix ? `${requirementPrefix}:\n${answerList}` : answerList;
}

function getRequirementPrefix(answerRequirement?: string): string {
  switch (answerRequirement) {
    case 'any_one_from':
      return 'Any ONE of the following';
    case 'any_two_from':
      return 'Any TWO of the following';
    case 'any_three_from':
      return 'Any THREE of the following';
    case 'both_required':
      return 'Both of the following required';
    case 'all_required':
      return 'All of the following required';
    case 'alternative_methods':
      return 'Any of the following methods';
    case 'acceptable_variations':
      return 'Any of the following variations';
    default:
      return '';
  }
}

/**
 * Calculates partial credit based on matched components and their context
 */
export function calculatePartialCredit(
  matchedComponents: CorrectAnswer[],
  allCorrectAnswers: CorrectAnswer[],
  answerRequirement?: string
): number {
  if (!matchedComponents || matchedComponents.length === 0) {
    return 0;
  }

  const totalPossibleMarks = allCorrectAnswers.reduce((sum, ca) => sum + (ca.marks || 1), 0);
  const achievedMarks = matchedComponents.reduce((sum, mc) => sum + (mc.marks || 1), 0);

  // Apply requirement-specific rules
  switch (answerRequirement) {
    case 'both_required':
    case 'all_required':
      // For "all required", partial credit is proportional
      return achievedMarks / totalPossibleMarks;
    
    case 'any_one_from':
    case 'any_two_from':
    case 'any_three_from':
      // For "any X from", full credit if requirement is met
      const required = answerRequirement === 'any_one_from' ? 1 :
                      answerRequirement === 'any_two_from' ? 2 : 3;
      if (matchedComponents.length >= required) {
        return 1; // Full credit
      }
      // Partial credit proportional to requirement
      return matchedComponents.length / required;
    
    default:
      // For single answer or alternatives, it's binary
      return matchedComponents.length > 0 ? 1 : 0;
  }
}

/**
 * Groups correct answers by their context type for analytics
 */
export function groupAnswersByContext(
  correctAnswers: CorrectAnswer[]
): Record<string, CorrectAnswer[]> {
  const grouped: Record<string, CorrectAnswer[]> = {
    'no_context': []
  };

  for (const answer of correctAnswers) {
    const contextType = answer.context?.type || 'no_context';
    if (!grouped[contextType]) {
      grouped[contextType] = [];
    }
    grouped[contextType].push(answer);
  }

  return grouped;
}

/**
 * Validates answer format against expected format
 */
export function validateAnswerFormat(
  answer: string | string[],
  expectedFormat: string
): { isValid: boolean; message?: string } {
  const answerText = Array.isArray(answer) ? answer.join(' ') : answer;

  switch (expectedFormat) {
    case 'single_word':
      const wordCount = answerText.trim().split(/\s+/).length;
      return {
        isValid: wordCount === 1,
        message: wordCount > 1 ? 'Please provide only one word' : undefined
      };

    case 'calculation':
      // Check if answer contains mathematical operations or equals sign
      const hasCalculation = /[+\-*\/=]/.test(answerText) || /^\d+(\.\d+)?$/.test(answerText.trim());
      return {
        isValid: hasCalculation,
        message: hasCalculation ? undefined : 'Please show your calculation'
      };

    case 'equation':
      // Check if answer contains equation elements
      const hasEquation = /[=→]/.test(answerText) || /\+|-/.test(answerText);
      return {
        isValid: hasEquation,
        message: hasEquation ? undefined : 'Please provide a complete equation'
      };

    case 'two_items':
    case 'two_items_connected':
      const items = Array.isArray(answer) ? answer : [answer];
      return {
        isValid: items.length === 2 && items.every(item => item.trim().length > 0),
        message: items.length !== 2 ? 'Please provide exactly two items' : undefined
      };

    default:
      return { isValid: true };
  }
}