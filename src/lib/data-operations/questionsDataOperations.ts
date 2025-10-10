// Path: src/lib/data-operations/questionsDataOperations.ts

import { supabase } from '@/lib/supabase';
import { toast } from '@/components/shared/Toast';

// ===== TYPES =====
export interface QuestionMapping {
  chapter_id: string;
  topic_ids: string[];
  subtopic_ids: string[];
}

export interface ImportResult {
  importedQuestions: any[];
  errors: any[];
  skippedQuestions: any[];
  updatedQuestions: any[];
}

export interface DataStructureInfo {
  id: string;
  region_id: string;
  program_id: string;
  provider_id: string;
  subject_id: string;
  regions?: { id: string; name: string };
  programs?: { id: string; name: string };
  providers?: { id: string; name: string };
  edu_subjects?: { id: string; name: string; code: string };
}

// New types for mark scheme parsing
export interface Context {
  type: 'option' | 'position' | 'calculation' | 'value' | 'descriptive' | 
        'structure' | 'process' | 'organism' | 'function' | 'adaptation' | 'phase' |
        'measurement' | 'chemical' | 'biological';
  value: string;
  label?: string;
}

export interface AnswerVariation {
  text: string;
  type: 'owtte' | 'ora' | 'synonym' | 'notation' | 'spelling' | 'unit';
  acceptanceLevel?: 'exact' | 'flexible' | 'lenient';
}

export interface Abbreviations {
  owtte?: boolean;  // or words to that effect
  ora?: boolean;    // or reverse argument
  ecf?: boolean;    // error carried forward
  cao?: boolean;    // correct answer only
}

export interface AnswerComponent {
  answer: string;
  marks: number;
  alternative_id: number;
  linked_alternatives: number[];
  alternative_type: 'one_required' | 'all_required' | 'exactly_n_required' | 'standalone';
  context: Context;
  variations?: AnswerVariation[];
  abbreviations?: Abbreviations;
}

export interface ValidationResult {
  isValid: boolean;
  matchedComponents: AnswerComponent[];
  score: number;
  maxScore: number;
  feedback: string;
  partialCredit?: {
    component: string;
    earned: number;
    possible: number;
    reason: string;
  }[];
}

// ===== HELPER FUNCTIONS =====
export const ensureString = (value: any): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value.length > 0 ? String(value[0]) : null;
  }
  return String(value);
};

export const ensureArray = (value: any): any[] => {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value];
};

const normalizeId = (value: any): string => {
  if (value === null || value === undefined) return '';
  return String(value);
};

export const getUUIDFromMapping = (value: any): string | null => {
  if (!value) return null;
  if (typeof value === 'string' && value.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    return value;
  }
  return null;
};

export const requiresFigure = (item: any): boolean => {
  if (item.figure) return true;
  
  const text = (item.question_description || item.question_text || '').toLowerCase();
  const tableIndicators = ['table', 'data below', 'following data', 'given data', 'refer to the table'];
  if (tableIndicators.some(indicator => text.includes(indicator))) return true;
  
  const diagramIndicators = ['diagram', 'figure', 'chart', 'graph', 'structure', 'image', 'picture', 'illustration'];
  if (diagramIndicators.some(indicator => text.includes(indicator))) return true;
  
  if (text.includes('results') && (text.includes('experiment') || text.includes('data'))) return true;
  
  return false;
};

export const detectAnswerFormat = (questionText: string): string | null => {
  if (!questionText) return null;
  
  const dotPattern = /\.{3,}/g;
  const matches = questionText.match(dotPattern);
  
  if (!matches) return null;
  
  if (/[A-Z]\s*\.{3,}/g.test(questionText)) {
    return 'multi_line_labeled';
  }
  
  if (/\.{3,}\s+(and|or)\s+\.{3,}/i.test(questionText)) {
    return 'two_items_connected';
  }
  
  if (questionText.includes('equation') || questionText.includes('formula')) {
    return 'equation';
  }
  
  if (matches.length === 2) {
    return 'two_items';
  } else if (matches.length > 2) {
    return 'multi_line';
  }
  
  return 'single_line';
};

export const getQuestionDescription = (question: any): string => {
  if (question.question_description && question.question_description.trim()) {
    return question.question_description.trim();
  }
  
  if (question.question_text && question.question_text.trim()) {
    return question.question_text.trim();
  }
  
  if (question.question_header && question.question_header.trim()) {
    return question.question_header.trim();
  }
  
  if (question.type === 'complex' && question.parts && question.parts.length > 0) {
    if (question.description && question.description.trim()) {
      return question.description.trim();
    }
    
    const partWithDescription = question.parts.find((part: any) => 
      (part.question_description && part.question_description.trim()) ||
      (part.question_text && part.question_text.trim())
    );
    
    if (partWithDescription) {
      const partDesc = partWithDescription.question_description || partWithDescription.question_text;
      return `[Multi-part question] ${partDesc.trim().substring(0, 100)}...`;
    } else {
      return '[See parts below]';
    }
  }
  
  if (question.type === 'mcq' && question.figure) {
    return '[Figure-based question]';
  }
  
  if (question.options && question.options.length > 0) {
    return '[Multiple choice question]';
  }
  
  return '[Question content in parts or attachments]';
};

// ===== MARK SCHEME PARSING FUNCTIONS =====

/**
 * Parse mark scheme text into structured answer components
 */
export function parseAnswerComponents(markSchemeText: string, totalMarks: number = 1, subject?: string): AnswerComponent[] {
  const components: AnswerComponent[] = [];
  
  // Split by common delimiters
  const lines = markSchemeText.split(/\n|;/).filter(line => line.trim());
  
  lines.forEach((line, lineIndex) => {
    // Check for mark allocations (e.g., [1], (1 mark), etc.)
    const markMatch = line.match(/\[(\d+)\]|\((\d+)\s*marks?\)/);
    const marks = markMatch ? parseInt(markMatch[1] || markMatch[2]) : 1;
    
    // Clean the line from mark annotations
    const cleanedLine = line.replace(/\[(\d+)\]|\((\d+)\s*marks?\)/, '').trim();
    
    // Handle forward slash alternatives within a line
    const alternatives = cleanedLine.split('/').map(alt => alt.trim()).filter(alt => alt);
    
    // Handle OR separated alternatives
    const orAlternatives = cleanedLine.split(/\bOR\b/i).map(alt => alt.trim()).filter(alt => alt);
    const hasOrAlternatives = orAlternatives.length > 1;
    
    const baseAlternatives = hasOrAlternatives ? orAlternatives : alternatives;
    
    // Determine if alternatives are linked
    const linkedIds: number[] = [];
    let alternativeType: AnswerComponent['alternative_type'] = 'one_required';
    
    // Check for patterns indicating linked requirements
    if (/both.*required|all.*required/i.test(markSchemeText)) {
      alternativeType = 'all_required';
    } else if (/any\s*two/i.test(markSchemeText)) {
      alternativeType = 'exactly_n_required';
    }
    
    baseAlternatives.forEach((alt, altIndex) => {
      const componentId = components.length + altIndex + 1;
      
      // Extract context
      const context = extractContext(alt, subject);
      
      // Generate variations
      const variations = generateVariations(alt, subject);
      
      // Detect abbreviations
      const abbreviations = detectAbbreviations(markSchemeText);
      
      // Create component
      const component: AnswerComponent = {
        answer: cleanAnswer(alt),
        marks: marks / baseAlternatives.length, // Distribute marks among alternatives
        alternative_id: componentId,
        linked_alternatives: linkedIds,
        alternative_type: baseAlternatives.length > 1 ? alternativeType : 'standalone',
        context,
        variations,
        abbreviations
      };
      
      // If this is part of a linked group, add all other alternatives as linked
      if (baseAlternatives.length > 1 && alternativeType !== 'one_required') {
        component.linked_alternatives = baseAlternatives
          .map((_, idx) => components.length + idx + 1)
          .filter(id => id !== componentId);
      }
      
      components.push(component);
    });
  });
  
  // Post-process to identify related components
  identifyRelatedComponents(components);
  
  return components;
}

/**
 * Extract context information from an answer
 */
export function extractContext(answer: string, subject?: string): Context {
  // Clean answer for pattern matching
  const cleanedAnswer = answer.toLowerCase().trim();
  
  // Subject-specific patterns
  if (subject?.toLowerCase() === 'physics') {
    if (/measurement|reading|value/.test(cleanedAnswer)) {
      return { type: 'measurement', value: 'measurement', label: 'Measurement' };
    }
    if (/calculation|working|method/.test(cleanedAnswer)) {
      return { type: 'calculation', value: 'calculation', label: 'Calculation' };
    }
  } else if (subject?.toLowerCase() === 'chemistry') {
    if (/formula|equation|structure/.test(cleanedAnswer)) {
      return { type: 'chemical', value: 'chemical', label: 'Chemical' };
    }
    if (/reaction|process/.test(cleanedAnswer)) {
      return { type: 'process', value: 'reaction', label: 'Chemical Process' };
    }
  } else if (subject?.toLowerCase() === 'biology') {
    if (/structure|anatomy|organ/.test(cleanedAnswer)) {
      return { type: 'structure', value: 'biological_structure', label: 'Structure' };
    }
    if (/process|mechanism|cycle/.test(cleanedAnswer)) {
      return { type: 'process', value: 'biological_process', label: 'Process' };
    }
    if (/function|role/.test(cleanedAnswer)) {
      return { type: 'function', value: 'biological_function', label: 'Function' };
    }
  }
  
  // General patterns
  const patterns: Record<string, RegExp> = {
    position: /at position ([A-Z])|position ([A-Z])|([A-Z]) position/i,
    option: /option ([A-Z])|choice ([A-Z])|([A-Z]) is correct/i,
    calculation: /calculation|working|method|solve|compute/i,
    value: /value of ([a-zA-Z]+)|([a-zA-Z]+) value|amount of ([a-zA-Z]+)/i,
    structure: /structure of|anatomy of|diagram of|shape of/i,
    process: /process of|mechanism of|procedure|method of/i,
    organism: /in ([a-zA-Z]+ [a-zA-Z]+)|for ([a-zA-Z]+ [a-zA-Z]+)/i,
    function: /function of|role of|purpose of/i,
    adaptation: /adaptation for|adapted to|modification for/i,
    phase: /phase|stage|step (\d+)|part (\d+)/i
  };
  
  // Check each pattern
  for (const [type, pattern] of Object.entries(patterns)) {
    const match = answer.match(pattern);
    if (match) {
      const value = match[1] || match[2] || match[3] || type;
      return {
        type: type as Context['type'],
        value: value.toLowerCase().replace(/\s+/g, '_'),
        label: match[0]
      };
    }
  }
  
  // Default to descriptive
  return { type: 'descriptive', value: 'general', label: 'General Answer' };
}

/**
 * Generate variations for an answer
 */
export function generateVariations(answer: string, subject?: string): AnswerVariation[] {
  const variations: AnswerVariation[] = [];
  
  // Common variations
  variations.push(...generateSpellingVariations(answer));
  variations.push(...generateSynonymVariations(answer, subject));
  
  // Subject-specific variations
  if (subject?.toLowerCase() === 'physics') {
    variations.push(...generateUnitVariations(answer));
    variations.push(...generateNotationVariations(answer, 'physics'));
  } else if (subject?.toLowerCase() === 'chemistry') {
    variations.push(...generateChemicalNotationVariations(answer));
  } else if (subject?.toLowerCase() === 'biology') {
    variations.push(...generateBiologicalVariations(answer));
  }
  
  // OWTTE variations
  if (answer.length > 20) {
    variations.push({
      text: generateOWTTEVariation(answer),
      type: 'owtte',
      acceptanceLevel: 'flexible'
    });
  }
  
  // ORA variations
  const reverseVariation = generateReverseArgument(answer);
  if (reverseVariation && reverseVariation !== answer) {
    variations.push({
      text: reverseVariation,
      type: 'ora',
      acceptanceLevel: 'flexible'
    });
  }
  
  return variations;
}

/**
 * Detect abbreviations in mark scheme text
 */
export function detectAbbreviations(text: string): Abbreviations {
  const lowerText = text.toLowerCase();
  
  return {
    owtte: /owtte|o\.w\.t\.t\.e\.|or words to that effect|accept any correct wording/i.test(text),
    ora: /ora|o\.r\.a\.|or reverse argument|reverse also accepted/i.test(text),
    ecf: /ecf|e\.c\.f\.|error carried forward|consequential marking/i.test(text),
    cao: /cao|c\.a\.o\.|correct answer only|exact answer required/i.test(text)
  };
}

// Helper functions for variation generation

function generateSpellingVariations(answer: string): AnswerVariation[] {
  const variations: AnswerVariation[] = [];
  
  // Common spelling variations
  const spellingPatterns = [
    { pattern: /ise\b/g, replacement: 'ize' },
    { pattern: /ize\b/g, replacement: 'ise' },
    { pattern: /our\b/g, replacement: 'or' },
    { pattern: /or\b/g, replacement: 'our' },
    { pattern: /re\b/g, replacement: 'er' },
    { pattern: /er\b/g, replacement: 're' },
    { pattern: /ae/g, replacement: 'e' },
    { pattern: /oe/g, replacement: 'e' }
  ];
  
  spellingPatterns.forEach(({ pattern, replacement }) => {
    if (pattern.test(answer)) {
      variations.push({
        text: answer.replace(pattern, replacement),
        type: 'spelling',
        acceptanceLevel: 'exact'
      });
    }
  });
  
  return variations;
}

function generateSynonymVariations(answer: string, subject?: string): AnswerVariation[] {
  const variations: AnswerVariation[] = [];
  
  // Common synonyms
  const synonymMap: Record<string, string[]> = {
    'increase': ['rise', 'go up', 'grow', 'elevate'],
    'decrease': ['fall', 'go down', 'reduce', 'drop', 'lower'],
    'move': ['travel', 'go', 'proceed', 'advance'],
    'create': ['make', 'produce', 'form', 'generate'],
    'remove': ['take away', 'eliminate', 'delete', 'extract'],
    'big': ['large', 'great', 'huge', 'major'],
    'small': ['little', 'tiny', 'minor', 'slight'],
    'fast': ['quick', 'rapid', 'speedy', 'swift'],
    'slow': ['gradual', 'leisurely', 'sluggish']
  };
  
  // Subject-specific synonyms
  if (subject?.toLowerCase() === 'physics') {
    Object.assign(synonymMap, {
      'force': ['push', 'pull'],
      'velocity': ['speed'],
      'mass': ['weight'], // Note: technically different but often confused
      'heat': ['thermal energy'],
      'light': ['electromagnetic radiation', 'EM radiation']
    });
  } else if (subject?.toLowerCase() === 'chemistry') {
    Object.assign(synonymMap, {
      'react': ['combine', 'interact'],
      'dissolve': ['solubilize', 'go into solution'],
      'precipitate': ['solid forms', 'crystalize'],
      'oxidize': ['lose electrons'],
      'reduce': ['gain electrons']
    });
  } else if (subject?.toLowerCase() === 'biology') {
    Object.assign(synonymMap, {
      'respire': ['breathe'],
      'photosynthesize': ['make food', 'produce glucose'],
      'reproduce': ['multiply', 'breed'],
      'adapt': ['adjust', 'modify'],
      'evolve': ['change over time', 'develop']
    });
  }
  
  // Check for synonyms in the answer
  const words = answer.toLowerCase().split(/\s+/);
  words.forEach((word, index) => {
    if (synonymMap[word]) {
      synonymMap[word].forEach(synonym => {
        const newWords = [...words];
        newWords[index] = synonym;
        variations.push({
          text: newWords.join(' '),
          type: 'synonym',
          acceptanceLevel: 'flexible'
        });
      });
    }
  });
  
  return variations;
}

function generateUnitVariations(answer: string): AnswerVariation[] {
  const variations: AnswerVariation[] = [];
  
  // Unit conversion patterns
  const unitPatterns = [
    { pattern: /m\/s/g, replacements: ['ms⁻¹', 'm.s⁻¹', 'meters per second'] },
    { pattern: /ms⁻¹/g, replacements: ['m/s', 'm.s⁻¹', 'meters per second'] },
    { pattern: /kg/g, replacements: ['kilograms'] },
    { pattern: /N/g, replacements: ['newtons', 'newton'] },
    { pattern: /J/g, replacements: ['joules', 'joule'] },
    { pattern: /W/g, replacements: ['watts', 'watt'] },
    { pattern: /Pa/g, replacements: ['pascals', 'pascal', 'N/m²'] },
    { pattern: /°C/g, replacements: ['degrees Celsius', 'celsius', 'degrees C'] },
    { pattern: /K/g, replacements: ['kelvin', 'degrees kelvin'] }
  ];
  
  unitPatterns.forEach(({ pattern, replacements }) => {
    if (pattern.test(answer)) {
      replacements.forEach(replacement => {
        variations.push({
          text: answer.replace(pattern, replacement),
          type: 'unit',
          acceptanceLevel: 'exact'
        });
      });
    }
  });
  
  return variations;
}

function generateChemicalNotationVariations(answer: string): AnswerVariation[] {
  const variations: AnswerVariation[] = [];
  
  // Chemical notation variations
  if (/H2O/i.test(answer)) {
    variations.push({
      text: answer.replace(/H2O/gi, 'H₂O'),
      type: 'notation',
      acceptanceLevel: 'exact'
    });
  }
  
  if (/CO2/i.test(answer)) {
    variations.push({
      text: answer.replace(/CO2/gi, 'CO₂'),
      type: 'notation',
      acceptanceLevel: 'exact'
    });
  }
  
  // Handle charge notation
  if (/(\w+)\^([\d+-]+)/g.test(answer)) {
    const superscriptMap: Record<string, string> = {
      '2+': '²⁺', '3+': '³⁺', '2-': '²⁻', '3-': '³⁻',
      '+': '⁺', '-': '⁻'
    };
    
    let modified = answer;
    Object.entries(superscriptMap).forEach(([normal, superscript]) => {
      modified = modified.replace(new RegExp(`\\^${normal}`, 'g'), superscript);
    });
    
    if (modified !== answer) {
      variations.push({
        text: modified,
        type: 'notation',
        acceptanceLevel: 'exact'
      });
    }
  }
  
  return variations;
}

function generateBiologicalVariations(answer: string): AnswerVariation[] {
  const variations: AnswerVariation[] = [];
  
  // Latin/common name variations
  const nameMap: Record<string, string> = {
    'human': 'homo sapiens',
    'homo sapiens': 'human',
    'cat': 'felis catus',
    'dog': 'canis familiaris',
    'e. coli': 'escherichia coli',
    'escherichia coli': 'e. coli'
  };
  
  const lowerAnswer = answer.toLowerCase();
  Object.entries(nameMap).forEach(([name1, name2]) => {
    if (lowerAnswer.includes(name1)) {
      variations.push({
        text: answer.replace(new RegExp(name1, 'gi'), name2),
        type: 'synonym',
        acceptanceLevel: 'flexible'
      });
    }
  });
  
  return variations;
}

function generateNotationVariations(answer: string, subject: string): AnswerVariation[] {
  const variations: AnswerVariation[] = [];
  
  if (subject === 'physics') {
    // Scientific notation variations
    const sciNotationPattern = /(\d+(?:\.\d+)?)\s*[×x]\s*10\^(-?\d+)/g;
    const match = answer.match(sciNotationPattern);
    
    if (match) {
      // Convert to standard form
      const standardForm = answer.replace(sciNotationPattern, (m, coefficient, exponent) => {
        return `${coefficient} × 10^${exponent}`;
      });
      
      if (standardForm !== answer) {
        variations.push({
          text: standardForm,
          type: 'notation',
          acceptanceLevel: 'exact'
        });
      }
    }
  }
  
  return variations;
}

function generateOWTTEVariation(answer: string): string {
  // Extract key concepts from the answer
  const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'of', 'to', 'in', 'on', 'at', 'for', 'with', 'by']);
  const words = answer.toLowerCase().split(/\s+/).filter(word => 
    word.length > 3 && !stopWords.has(word)
  );
  
  // Return key concepts joined
  return words.join(' ');
}

function generateReverseArgument(answer: string): string | null {
  // Pattern-based reversal
  const reversePatterns: Array<[RegExp, string]> = [
    [/(\w+) is greater than (\w+)/i, '$2 is less than $1'],
    [/(\w+) is less than (\w+)/i, '$2 is greater than $1'],
    [/(\w+) increases/i, '$1 decreases'],
    [/(\w+) decreases/i, '$1 increases'],
    [/(\w+) before (\w+)/i, '$2 after $1'],
    [/(\w+) after (\w+)/i, '$2 before $1'],
    [/(\w+) causes (\w+)/i, '$2 is caused by $1'],
    [/(\w+) is caused by (\w+)/i, '$2 causes $1'],
    [/(\w+) leads to (\w+)/i, '$2 results from $1'],
    [/(\w+) results from (\w+)/i, '$2 leads to $1']
  ];
  
  for (const [pattern, replacement] of reversePatterns) {
    if (pattern.test(answer)) {
      return answer.replace(pattern, replacement);
    }
  }
  
  return null;
}

function cleanAnswer(answer: string): string {
  // Remove common mark scheme annotations
  return answer
    .replace(/\(.*?\)/g, '') // Remove parenthetical notes
    .replace(/\[.*?\]/g, '') // Remove bracketed notes
    .replace(/\b(owtte|ora|ecf|cao)\b/gi, '') // Remove abbreviations
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

function identifyRelatedComponents(components: AnswerComponent[]): void {
  // Identify components that are related based on content similarity
  components.forEach((comp1, idx1) => {
    components.forEach((comp2, idx2) => {
      if (idx1 >= idx2) return;
      
      // Check for shared keywords
      const words1 = new Set(comp1.answer.toLowerCase().split(/\s+/));
      const words2 = new Set(comp2.answer.toLowerCase().split(/\s+/));
      const intersection = new Set([...words1].filter(x => words2.has(x)));
      
      // If significant overlap, they might be related
      if (intersection.size > Math.min(words1.size, words2.size) * 0.5) {
        if (!comp1.linked_alternatives.includes(comp2.alternative_id)) {
          comp1.linked_alternatives.push(comp2.alternative_id);
        }
        if (!comp2.linked_alternatives.includes(comp1.alternative_id)) {
          comp2.linked_alternatives.push(comp1.alternative_id);
        }
      }
    });
  });
}

/**
 * Validate student answer against parsed components
 */
export function validateAgainstComponents(
  studentAnswer: string | string[],
  components: AnswerComponent[],
  requireAll: boolean = false,
  subject?: string
): ValidationResult {
  const studentAnswers = Array.isArray(studentAnswer) ? studentAnswer : [studentAnswer];
  const matchedComponents: AnswerComponent[] = [];
  const partialCredit: ValidationResult['partialCredit'] = [];
  
  let totalScore = 0;
  const maxScore = components.reduce((sum, comp) => sum + comp.marks, 0);
  
  // Normalize student answers
  const normalizedStudentAnswers = studentAnswers.map(ans => 
    ans.trim().toLowerCase().replace(/\s+/g, ' ')
  );
  
  // Check each component
  components.forEach(component => {
    let matched = false;
    let matchType = 'none';
    
    // Check exact match first
    const normalizedComponent = component.answer.toLowerCase().trim();
    if (normalizedStudentAnswers.some(sa => sa === normalizedComponent)) {
      matched = true;
      matchType = 'exact';
    }
    
    // Check variations if not exact match
    if (!matched && component.variations) {
      for (const variation of component.variations) {
        const normalizedVariation = variation.text.toLowerCase().trim();
        
        if (variation.type === 'owtte' && component.abbreviations?.owtte) {
          // For OWTTE, check if key concepts are present
          const keywords = normalizedVariation.split(' ');
          const keywordMatches = keywords.filter(kw => 
            normalizedStudentAnswers.some(sa => sa.includes(kw))
          );
          
          if (keywordMatches.length >= keywords.length * 0.6) {
            matched = true;
            matchType = 'owtte';
            break;
          }
        } else if (normalizedStudentAnswers.some(sa => sa === normalizedVariation)) {
          matched = true;
          matchType = variation.type;
          break;
        }
      }
    }
    
    // Apply abbreviation rules
    if (matched) {
      if (component.abbreviations?.cao && matchType !== 'exact') {
        // CAO - only exact answer accepted
        matched = false;
      }
      
      matchedComponents.push(component);
      totalScore += component.marks;
    } else if (component.abbreviations?.ecf) {
      // ECF - give partial credit for method
      partialCredit.push({
        component: component.answer,
        earned: component.marks * 0.5,
        possible: component.marks,
        reason: 'Error carried forward - method credit'
      });
      totalScore += component.marks * 0.5;
    }
  });
  
  // Check linked alternatives requirements
  const linkedGroups = new Map<number, AnswerComponent[]>();
  components.forEach(comp => {
    if (comp.linked_alternatives.length > 0) {
      const groupId = Math.min(comp.alternative_id, ...comp.linked_alternatives);
      if (!linkedGroups.has(groupId)) {
        linkedGroups.set(groupId, []);
      }
      linkedGroups.get(groupId)!.push(comp);
    }
  });
  
  // Validate linked groups
  linkedGroups.forEach((group, groupId) => {
    const groupType = group[0].alternative_type;
    const matchedInGroup = group.filter(comp => 
      matchedComponents.includes(comp)
    );
    
    switch (groupType) {
      case 'all_required':
        if (matchedInGroup.length < group.length) {
          // Deduct points for missing components
          const penalty = (group.length - matchedInGroup.length) * 
                         (group[0].marks / group.length);
          totalScore = Math.max(0, totalScore - penalty);
          
          partialCredit.push({
            component: `Linked group ${groupId}`,
            earned: matchedInGroup.length * group[0].marks,
            possible: group.reduce((sum, c) => sum + c.marks, 0),
            reason: `${matchedInGroup.length} of ${group.length} required components provided`
          });
        }
        break;
        
      case 'exactly_n_required':
        // This would need additional metadata about 'n'
        // For now, treat as requiring at least 2
        if (matchedInGroup.length < 2) {
          const penalty = group[0].marks * 0.5;
          totalScore = Math.max(0, totalScore - penalty);
        }
        break;
    }
  });
  
  // Determine if answer is correct based on requirements
  const isValid = requireAll 
    ? matchedComponents.length === components.length
    : matchedComponents.length > 0 && totalScore >= maxScore * 0.5;
  
  // Generate feedback
  let feedback = '';
  if (isValid) {
    feedback = matchedComponents.length === components.length 
      ? 'Perfect! All components correct.'
      : `Good! ${matchedComponents.length} of ${components.length} components correct.`;
  } else {
    feedback = matchedComponents.length === 0
      ? 'Incorrect. Review the expected answer format.'
      : `Partial credit: ${matchedComponents.length} of ${components.length} components correct.`;
  }
  
  return {
    isValid,
    matchedComponents,
    score: Math.min(totalScore, maxScore),
    maxScore,
    feedback,
    partialCredit: partialCredit.length > 0 ? partialCredit : undefined
  };
}

// ===== FETCHING OPERATIONS =====
export const fetchDataStructureInfo = async (dataStructureId: string) => {
  try {
    const { data: dsData, error: dsError } = await supabase
      .from('data_structures')
      .select(`
        *,
        regions (id, name),
        programs (id, name),
        providers (id, name),
        edu_subjects (id, name, code)
      `)
      .eq('id', dataStructureId)
      .single();

    if (dsError) throw dsError;
    
    const { data: unitsData, error: unitsError } = await supabase
      .from('edu_units')
      .select('*')
      .eq('subject_id', dsData.subject_id)
      .eq('status', 'active')
      .order('name');

    if (unitsError) throw unitsError;

    let topicsData = [];
    let subtopicsData = [];
    
    if (unitsData && unitsData.length > 0) {
      const unitIds = unitsData.map((u: any) => u.id);
      const { data: topics, error: topicsError } = await supabase
        .from('edu_topics')
        .select('*')
        .in('unit_id', unitIds)
        .eq('status', 'active')
        .order('sort', { ascending: true });

      if (topicsError) throw topicsError;
      topicsData = topics || [];

      if (topicsData.length > 0) {
        const topicIds = topicsData.map((t: any) => t.id);
        const { data: subtopics, error: subtopicsError } = await supabase
          .from('edu_subtopics')
          .select('*')
          .in('topic_id', topicIds)
          .eq('status', 'active')
          .order('sort', { ascending: true });

        if (subtopicsError) throw subtopicsError;
        subtopicsData = subtopics || [];
      }
    }

    return {
      dataStructure: dsData,
      units: unitsData || [],
      topics: topicsData,
      subtopics: subtopicsData
    };
  } catch (error) {
    console.error('Error fetching data structure info:', error);
    throw error;
  }
};

export const fetchImportedQuestions = async (importSessionId: string) => {
  try {
    const { data, error } = await supabase
      .from('past_paper_import_sessions')
      .select('*')
      .eq('id', importSessionId)
      .single();
    
    if (error) throw error;
    
    if (data?.raw_json) {
      return data.raw_json;
    } else if (data?.json_file_name) {
      const { data: fileData, error: fileError } = await supabase.storage
        .from('past-paper-imports')
        .download(data.json_file_name);
      
      if (fileError) throw fileError;
      
      const text = await fileData.text();
      return JSON.parse(text);
    }
    
    throw new Error('No data found for this import session');
  } catch (error) {
    console.error('Error fetching imported questions:', error);
    throw error;
  }
};

export const checkExistingQuestions = async (paperId: string) => {
  try {
    const { data: existingQuestions, error } = await supabase
      .from('questions_master_admin')
      .select('question_number')
      .eq('paper_id', paperId);
    
    if (error) throw error;
    
    // Ensure all question numbers are parsed as integers for consistent comparison
    return new Set(existingQuestions.map((q: any) => {
      const num = parseInt(q.question_number);
      return isNaN(num) ? q.question_number : num;
    }));
  } catch (error) {
    console.error('Error checking existing questions:', error);
    throw error;
  }
};

// ===== AUTO-MAPPING LOGIC =====
export const autoMapQuestions = (
  questions: any[],
  units: any[],
  topics: any[],
  subtopics: any[],
  existingMappings: Record<string, QuestionMapping>
): { mappings: Record<string, QuestionMapping>, mappedCount: number, enhancedCount: number } => {
  const updatedMappings = { ...existingMappings };
  let mappedCount = 0;
  let enhancedCount = 0;

  questions.forEach((question: any) => {
    const existingMapping = updatedMappings[question.id] || { chapter_id: '', topic_ids: [], subtopic_ids: [] };
    let hasChanges = false;

    let unitId = normalizeId(existingMapping.chapter_id);
    if (!unitId && question.unit) {
      const matchingUnit = units.find((u: any) =>
        u.name?.toLowerCase() === question.unit.toLowerCase() ||
        normalizeId(u.code) === normalizeId(question.unit)
      );
      if (matchingUnit) {
        unitId = normalizeId(matchingUnit.id);
        hasChanges = true;
      }
    }

    if (unitId) {
      const unitTopics = topics.filter((t: any) => {
        const topicUnitId = t.unit_id || t.edu_unit_id || t.chapter_id;
        return normalizeId(topicUnitId) === unitId;
      });

      let topicIds: string[] = Array.isArray(existingMapping.topic_ids)
        ? existingMapping.topic_ids.map((id: any) => normalizeId(id))
        : [];
      let subtopicIds: string[] = Array.isArray(existingMapping.subtopic_ids)
        ? existingMapping.subtopic_ids.map((id: any) => normalizeId(id))
        : [];

      const questionTopics = ensureArray(question.topics || question.original_topics || question.topic);

      if (questionTopics.length > 0) {
        questionTopics.forEach((topicName: any) => {
          if (!topicName) return;
          const matchingTopic = unitTopics.find((t: any) =>
            t.name?.toLowerCase() === topicName.toLowerCase() ||
            t.code === topicName ||
            t.name?.toLowerCase().includes(topicName.toLowerCase()) ||
            topicName.toLowerCase().includes(t.name?.toLowerCase() || '')
          );
          if (matchingTopic) {
            const matchingTopicId = normalizeId(matchingTopic.id);
            if (!topicIds.includes(matchingTopicId)) {
              topicIds.push(matchingTopicId);
              hasChanges = true;
            }
          }
        });
      }

      if (topicIds.length === 0 && (question.topic || question.original_topics)) {
        const fallbackTopics = ensureArray(question.topic || question.original_topics);
        fallbackTopics.forEach((topicName: any) => {
          if (!topicName) return;
          const matchingTopic = unitTopics.find((t: any) => t.name?.toLowerCase() === topicName.toLowerCase());
          if (matchingTopic) {
            const matchingTopicId = normalizeId(matchingTopic.id);
            if (!topicIds.includes(matchingTopicId)) {
              topicIds.push(matchingTopicId);
              hasChanges = true;
            }
          }
        });
      }

      if (topicIds.length === 0 && (question.question_description || question.question_text)) {
        const questionContent = (question.question_description || question.question_text || '').toLowerCase();

        unitTopics.forEach((topic: any) => {
          const topicKeywords = topic.name.toLowerCase().split(/\s+/);
          const hasMatch = topicKeywords.some((keyword: string) =>
            keyword.length > 3 && questionContent.includes(keyword)
          );

          if (hasMatch) {
            const topicId = normalizeId(topic.id);
            if (!topicIds.includes(topicId)) {
              topicIds.push(topicId);
              hasChanges = true;
            }
          }
        });
      }

      const questionSubtopics = ensureArray(question.subtopics || question.original_subtopics || question.subtopic);

      if (topicIds.length > 0) {
        const topicSubtopics = subtopics.filter((s: any) =>
          topicIds.includes(normalizeId(s.topic_id || s.edu_topic_id))
        );

        questionSubtopics.forEach((subtopicName: any) => {
          if (!subtopicName) return;
          const matchingSubtopic = topicSubtopics.find((s: any) =>
            s.name?.toLowerCase() === subtopicName.toLowerCase() ||
            s.name?.toLowerCase().includes(subtopicName.toLowerCase()) ||
            subtopicName.toLowerCase().includes(s.name?.toLowerCase() || '')
          );
          if (matchingSubtopic) {
            const matchingSubtopicId = normalizeId(matchingSubtopic.id);
            if (!subtopicIds.includes(matchingSubtopicId)) {
              subtopicIds.push(matchingSubtopicId);
              hasChanges = true;
            }

            const parentTopicId = normalizeId(matchingSubtopic.topic_id || matchingSubtopic.edu_topic_id);
            if (parentTopicId && !topicIds.includes(parentTopicId)) {
              topicIds.push(parentTopicId);
            }
          }
        });

        if (subtopicIds.length === 0 && (question.question_description || question.question_text)) {
          const questionContent = (question.question_description || question.question_text || '').toLowerCase();

          topicSubtopics.forEach((subtopic: any) => {
            const subtopicKeywords = subtopic.name.toLowerCase().split(/\s+/);
            const hasMatch = subtopicKeywords.some((keyword: string) =>
              keyword.length > 3 && questionContent.includes(keyword)
            );

            if (hasMatch) {
              const subtopicId = normalizeId(subtopic.id);
              if (!subtopicIds.includes(subtopicId)) {
                subtopicIds.push(subtopicId);
                hasChanges = true;
              }

              const parentTopicId = normalizeId(subtopic.topic_id || subtopic.edu_topic_id);
              if (parentTopicId && !topicIds.includes(parentTopicId)) {
                topicIds.push(parentTopicId);
              }
            }
          });
        }
      }

      if (hasChanges) {
        updatedMappings[question.id] = {
          chapter_id: unitId,
          topic_ids: topicIds || [],
          subtopic_ids: subtopicIds || []
        };

        if (!existingMapping.chapter_id) {
          mappedCount++;
        } else {
          enhancedCount++;
        }
      }
    }
  });

  return { mappings: updatedMappings, mappedCount, enhancedCount };
};

// ===== IMPORT OPERATIONS =====
export const uploadAttachments = async (attachments: any): Promise<any> => {
  const uploadedAttachments: any = {};
  
  for (const [key, attachmentList] of Object.entries(attachments)) {
    uploadedAttachments[key] = [];
    
    for (const attachment of attachmentList as any[]) {
      if (attachment.dataUrl) {
        try {
          const response = await fetch(attachment.dataUrl);
          const blob = await response.blob();
          
          const timestamp = Date.now();
          const randomId = Math.random().toString(36).substring(2);
          const extension = 'png';
          const uploadFileName = `attachment_${timestamp}_${randomId}.${extension}`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('questions-attachments')
            .upload(uploadFileName, blob, {
              contentType: blob.type,
              cacheControl: '3600'
            });
          
          if (uploadError) {
            console.error('Failed to upload attachment:', uploadError);
            continue;
          }
          
          const { data: { publicUrl } } = supabase.storage
            .from('questions-attachments')
            .getPublicUrl(uploadFileName);
          
          uploadedAttachments[key].push({
            ...attachment,
            file_url: publicUrl,
            file_name: attachment.fileName,
            file_type: 'image/png',
            file_size: blob.size
          });
        } catch (error) {
          console.error('Failed to process attachment:', error);
        }
      }
    }
  }
  
  return uploadedAttachments;
};

export const insertSubQuestion = async (
  parentQuestionId: string,
  part: any,
  parentSubId: string | null,
  level: number,
  uploadedAttachments: any,
  mapping: any,
  partType: 'part' | 'subpart' = 'part'
): Promise<void> => {
  try {
    const partMapping = mapping || {};
    
    // Determine the part label based on part type and level
    let partLabel = '';
    if (partType === 'part') {
      partLabel = part.part || part.part_label || String.fromCharCode(97 + (part.order_index || 0)); // a, b, c...
    } else if (partType === 'subpart') {
      partLabel = part.subpart || part.part_label || `${romanNumeral(part.order_index + 1 || 1)}`; // i, ii, iii...
    }
    
    const orderIndex = !isNaN(parseInt(part.order_index)) ? parseInt(part.order_index) : 0;
    
    // Check for duplicate sub-question
    let duplicateQuery = supabase
      .from('sub_questions')
      .select('id')
      .eq('question_id', parentQuestionId)
      .eq('part_label', partLabel)
      .eq('order_index', orderIndex);
    
    // Fix: Handle parent_id properly - use .is() for NULL values
    if (parentSubId === null || parentSubId === undefined || parentSubId === '') {
      duplicateQuery = duplicateQuery.is('parent_id', null);
    } else {
      duplicateQuery = duplicateQuery.eq('parent_id', parentSubId);
    }
    
    const { data: existingSubQuestion, error: checkError } = await duplicateQuery.maybeSingle();
    
    if (checkError) {
      console.error('Error checking for duplicate sub-question:', checkError);
    }
    
    if (existingSubQuestion) {
      console.log(`Sub-question ${partLabel} already exists for question ${parentQuestionId}, skipping...`);
      return;
    }
    
    const primaryTopicId = getUUIDFromMapping(
      Array.isArray(partMapping?.topic_ids) && partMapping.topic_ids.length > 0 
        ? partMapping.topic_ids[0] : null
    );
    const primarySubtopicId = getUUIDFromMapping(
      Array.isArray(partMapping?.subtopic_ids) && partMapping.subtopic_ids.length > 0 
        ? partMapping.subtopic_ids[0] : null
    );
    
    const partAnswerFormat = part.answer_format || detectAnswerFormat(part.question_description || part.question_text || '');
    
    const subQuestionData = {
      question_id: parentQuestionId,
      parent_id: parentSubId || null, // Fix: Ensure it's JS null, not empty string
      level: !isNaN(parseInt(level)) ? parseInt(level) : 1,
      order_index: orderIndex,
      type: ensureString(part.type) || 'descriptive',
      topic_id: primaryTopicId,
      subtopic_id: primarySubtopicId,
      part_label: partLabel,
      description: ensureString(part.description) || null,
      question_description: ensureString(part.question_description || part.question_text) || '',
      explanation: ensureString(part.explanation) || null,
      hint: ensureString(part.hint) || null,
      marks: !isNaN(parseInt(part.marks)) ? parseInt(part.marks) : 0,
      difficulty: ensureString(part.difficulty) || 'Medium',
      status: 'active',
      answer_format: partAnswerFormat,
      answer_requirement: ensureString(part.answer_requirement) || null,
      total_alternatives: part.total_alternatives || null,
      correct_answer: ensureString(part.correct_answer) || null
    };

    const { data: subQuestionRecord, error: subError } = await supabase
      .from('sub_questions')
      .insert([subQuestionData])
      .select()
      .single();

    if (subError) {
      console.error('Error inserting sub-question:', subError);
      return;
    }

    // Insert multiple correct answers if available
    if (part.correct_answers && Array.isArray(part.correct_answers)) {
      const correctAnswersToInsert = part.correct_answers.map((ca: any) => ({
        sub_question_id: subQuestionRecord.id,
        answer: ensureString(ca.answer),
        marks: ca.marks || null,
        alternative_id: ca.alternative_id || null,
        context_type: ca.context?.type || null,
        context_value: ca.context?.value || null,
        context_label: ca.context?.label || null
      }));

      const { error: caError } = await supabase
        .from('question_correct_answers')
        .insert(correctAnswersToInsert);

      if (caError) {
        console.error('Error inserting sub-question correct answers:', caError);
      }
    }

    // Insert distractors if available (for MCQ)
    if (part.distractors && Array.isArray(part.distractors)) {
      const distractorsToInsert = part.distractors.map((d: any) => ({
        sub_question_id: subQuestionRecord.id,
        option_label: d.option || null,
        context_type: d.context?.type || null,
        context_value: d.context?.value || null,
        context_label: d.context?.label || null
      }));

      const { error: distError } = await supabase
        .from('question_distractors')
        .insert(distractorsToInsert);

      if (distError) {
        console.error('Error inserting sub-question distractors:', distError);
      }
    }

    // Insert additional topics for this sub-question (all topics beyond the first one stored in topic_id)
    if (Array.isArray(partMapping?.topic_ids) && partMapping.topic_ids.length > 1) {
      const additionalTopics = partMapping.topic_ids.slice(1)
        .map((id: string) => getUUIDFromMapping(id))
        .filter((id: string | null) => id !== null);

      const topicInserts = additionalTopics.map((topicId: string) => ({
        sub_question_id: subQuestionRecord.id,
        topic_id: topicId
      }));

      if (topicInserts.length > 0) {
        const { error: topicsError } = await supabase
          .from('question_topics')
          .insert(topicInserts);

        if (topicsError) {
          console.error('Error inserting sub-question additional topics:', topicsError);
        }
      }
    }

    // Insert additional subtopics for this sub-question
    if (Array.isArray(partMapping?.subtopic_ids) && partMapping.subtopic_ids.length > 1) {
      const additionalSubtopics = partMapping.subtopic_ids.slice(1)
        .map((id: string) => getUUIDFromMapping(id))
        .filter((id: string | null) => id !== null);

      const subtopicInserts = additionalSubtopics.map((subtopicId: string) => ({
        sub_question_id: subQuestionRecord.id,
        subtopic_id: subtopicId
      }));

      if (subtopicInserts.length > 0) {
        const { error: subtopicsError } = await supabase
          .from('question_subtopics')
          .insert(subtopicInserts);

        if (subtopicsError) {
          console.error('Error inserting sub-question subtopics:', subtopicsError);
        }
      }
    }

    // Insert options for sub-question if MCQ
    if (part.type === 'mcq' && part.options && part.options.length > 0) {
      const optionsToInsert = part.options
        .filter((opt: any) => opt !== null && opt !== undefined)
        .map((option: any, idx: number) => ({
          sub_question_id: subQuestionRecord.id,
          option_text: ensureString(option.text || option.option_text) || '',
          is_correct: option.is_correct || (part.correct_answer === option.label) || false,
          order: !isNaN(parseInt(idx)) ? idx : 0
        }));

      const { error: optionsError } = await supabase
        .from('question_options')
        .insert(optionsToInsert);

      if (optionsError) {
        console.error('Error inserting sub-question options:', optionsError);
      }
    }

    // Handle attachments for sub-question
    const partPath = parentSubId ? `${parentQuestionId}_${parentSubId}_${subQuestionRecord.id}` : `${parentQuestionId}_${subQuestionRecord.id}`;
    const partAttachments = uploadedAttachments[partPath] || [];
    
    if (partAttachments.length > 0) {
      const attachmentsToInsert = partAttachments.map((att: any) => ({
        sub_question_id: subQuestionRecord.id,
        file_url: att.file_url,
        file_name: att.file_name || att.fileName,
        file_type: att.file_type || 'image/png',
        file_size: att.file_size || 0
      }));

      const { error: attachError } = await supabase
        .from('questions_attachments')
        .insert(attachmentsToInsert);

      if (attachError) {
        console.error('Error inserting sub-question attachments:', attachError);
      }
    }

    // Recursively insert nested subparts
    if (part.subparts && part.subparts.length > 0) {
      for (const subpart of part.subparts) {
        await insertSubQuestion(parentQuestionId, subpart, subQuestionRecord.id, level + 1, uploadedAttachments, mapping, 'subpart');
      }
    }
    
    // Also check for 'parts' (for deeper nesting or alternative structure)
    if (part.parts && part.parts.length > 0) {
      for (const nestedPart of part.parts) {
        await insertSubQuestion(parentQuestionId, nestedPart, subQuestionRecord.id, level + 1, uploadedAttachments, mapping, 'part');
      }
    }

  } catch (error) {
    console.error('Error in insertSubQuestion:', error);
  }
};

// Helper function to convert number to roman numeral
function romanNumeral(num: number): string {
  const values = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const symbols = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
  let result = '';
  
  for (let i = 0; i < values.length; i++) {
    while (num >= values[i]) {
      result += symbols[i];
      num -= values[i];
    }
  }
  
  return result.toLowerCase(); // Return lowercase roman numerals
}

export const importQuestions = async (params: {
  questions: any[];
  mappings: Record<string, QuestionMapping>;
  attachments: any;
  paperId: string;
  dataStructureInfo: DataStructureInfo;
  importSessionId?: string;
  yearOverride?: number;
  existingQuestionNumbers: Set<number>;
}): Promise<ImportResult> => {
  const { questions, mappings, attachments, paperId, dataStructureInfo, importSessionId, yearOverride, existingQuestionNumbers } = params;
  
  const importedQuestions = [];
  const errors = [];
  const skippedQuestions = [];
  const updatedQuestions = [];

  try {
    // Upload all attachments first
    console.log('Uploading attachments...');
    const uploadedAttachments = await uploadAttachments(attachments);
    console.log('Attachments uploaded successfully');

    // Process each question
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const mapping = mappings?.[question.id] || {};
      
      try {
        const questionNumber = !isNaN(parseInt(question.question_number)) ? parseInt(question.question_number) : (i + 1);
        
        // Enhanced duplicate check with detailed logging
        console.log(`Processing question ${questionNumber}, checking against existing questions...`);
        
        // Check both as number and string to be safe
        const isExistingAsNumber = existingQuestionNumbers.has(questionNumber);
        const isExistingAsString = existingQuestionNumbers.has(questionNumber.toString() as any);
        
        if (isExistingAsNumber || isExistingAsString) {
          console.log(`Question ${questionNumber} already exists in database, skipping...`);
          skippedQuestions.push({
            question_number: questionNumber,
            reason: 'Already exists in database'
          });
          continue;
        }
        
        // Additional check: Query the database directly to ensure no duplicates
        const { data: duplicateCheck, error: dupError } = await supabase
          .from('questions_master_admin')
          .select('id, question_number')
          .eq('paper_id', paperId)
          .eq('question_number', questionNumber)
          .maybeSingle();
        
        if (dupError && dupError.code !== 'PGRST116') {
          console.error('Error checking for duplicate:', dupError);
          throw dupError;
        }
        
        if (duplicateCheck) {
          console.log(`Question ${questionNumber} found in direct database check, skipping...`);
          skippedQuestions.push({
            question_number: questionNumber,
            reason: 'Already exists in database (direct check)'
          });
          continue;
        }
        
        // Get primary topic and subtopic
        const primaryTopicId = getUUIDFromMapping(
          mapping?.topic_ids && mapping.topic_ids.length > 0 ? mapping.topic_ids[0] : null
        );
        const primarySubtopicId = getUUIDFromMapping(
          mapping?.subtopic_ids && mapping.subtopic_ids.length > 0 ? mapping.subtopic_ids[0] : null
        );
        
        const questionDescription = getQuestionDescription(question);
        const questionAnswerFormat = question.answer_format || detectAnswerFormat(questionDescription);
        
        const questionData = {
          paper_id: paperId,
          data_structure_id: dataStructureInfo.id,
          region_id: dataStructureInfo.region_id,
          program_id: dataStructureInfo.program_id,
          provider_id: dataStructureInfo.provider_id,
          subject_id: dataStructureInfo.subject_id,
          chapter_id: getUUIDFromMapping(mapping.chapter_id) || null,
          topic_id: primaryTopicId,
          subtopic_id: primarySubtopicId,
          category: question.type === 'complex' ? 'complex' : 'direct',
          type: ensureString(question.type) || 'descriptive',
          question_number: questionNumber,
          question_header: ensureString(question.question_header) || null,
          question_description: ensureString(questionDescription),
          question_content_type: question.figure ? 
                                (questionDescription && questionDescription !== '[See parts below]' ? 'text_and_figure' : 'figure') : 
                                (question.parts && question.parts.length > 0 && questionDescription === '[See parts below]' ? 'parts_only' : 'text'),
          explanation: ensureString(question.explanation) || null,
          hint: ensureString(question.hint) || null,
          marks: !isNaN(parseInt(question.marks || question.total_marks)) ? parseInt(question.marks || question.total_marks) : 0,
          difficulty: ensureString(question.difficulty) || 'Medium',
          status: 'active',
          year: yearOverride || new Date().getFullYear(),
          import_session_id: importSessionId || null,
          answer_format: questionAnswerFormat,
          answer_requirement: ensureString(question.answer_requirement) || null,
          total_alternatives: question.total_alternatives || null,
          correct_answer: ensureString(question.correct_answer) || null
        };

        console.log(`Inserting question ${question.question_number}:`, questionData);
        
        const { data: insertedQuestion, error: questionError } = await supabase
          .from('questions_master_admin')
          .insert([questionData])
          .select()
          .single();

        if (questionError) {
          console.error(`Error inserting question ${question.question_number}:`, questionError);
          throw questionError;
        }

        // Insert multiple correct answers if available
        if (question.correct_answers && Array.isArray(question.correct_answers)) {
          const correctAnswersToInsert = question.correct_answers.map((ca: any) => ({
            question_id: insertedQuestion.id,
            answer: ensureString(ca.answer),
            marks: ca.marks || null,
            alternative_id: ca.alternative_id || null,
            context_type: ca.context?.type || null,
            context_value: ca.context?.value || null,
            context_label: ca.context?.label || null
          }));

          const { error: caError } = await supabase
            .from('question_correct_answers')
            .insert(correctAnswersToInsert);

          if (caError) {
            console.error('Error inserting correct answers:', caError);
          }
        }

        // Insert additional topics (all topics beyond the first one stored in topic_id)
        if (mapping?.topic_ids && mapping.topic_ids.length > 1) {
          const additionalTopics = mapping.topic_ids.slice(1)
            .map((id: string) => getUUIDFromMapping(id))
            .filter((id: string | null) => id !== null);

          const topicInserts = additionalTopics.map((topicId: string) => ({
            question_id: insertedQuestion.id,
            topic_id: topicId
          }));

          if (topicInserts.length > 0) {
            const { error: topicsError } = await supabase
              .from('question_topics')
              .insert(topicInserts);

            if (topicsError) {
              console.error('Error inserting additional topics:', topicsError);
            }
          }
        }

        // Insert additional subtopics
        if (mapping?.subtopic_ids && mapping.subtopic_ids.length > 1) {
          const additionalSubtopics = mapping.subtopic_ids.slice(1)
            .map((id: string) => getUUIDFromMapping(id))
            .filter((id: string | null) => id !== null);

          const subtopicInserts = additionalSubtopics.map((subtopicId: string) => ({
            question_id: insertedQuestion.id,
            subtopic_id: subtopicId
          }));

          if (subtopicInserts.length > 0) {
            const { error: subtopicsError } = await supabase
              .from('question_subtopics')
              .insert(subtopicInserts);

            if (subtopicsError) {
              console.error('Error inserting additional subtopics:', subtopicsError);
            }
          }
        }

        // Insert options for MCQ questions
        if (question.type === 'mcq' && question.options) {
          const optionPromises = question.options
            .filter((opt: any) => opt !== null && opt !== undefined)
            .map((option: any, index: number) => 
              supabase.from('question_options').insert({
                question_id: insertedQuestion.id,
                option_text: ensureString(option.text || option.option_text) || '',
                is_correct: option.is_correct || (question.correct_answer === option.label) || false,
                order: !isNaN(parseInt(index)) ? index : 0
              })
            );
          
          await Promise.all(optionPromises);
        }

        // Insert sub-questions/parts if they exist
        if (question.parts && question.parts.length > 0) {
          for (const part of question.parts) {
            await insertSubQuestion(insertedQuestion.id, part, null, 1, uploadedAttachments, mapping, 'part');
          }
        }

        // Handle attachments
        const questionAttachments = uploadedAttachments[question.id] || [];
        if (questionAttachments.length > 0) {
          const attachmentsToInsert = questionAttachments.map((att: any) => ({
            question_id: insertedQuestion.id,
            file_url: att.file_url,
            file_name: att.file_name || att.fileName,
            file_type: att.file_type || 'image/png',
            file_size: att.file_size || 0
          }));

          await supabase
            .from('questions_attachments')
            .insert(attachmentsToInsert);
        }

        importedQuestions.push(insertedQuestion);
        
      } catch (error: any) {
        console.error(`Error importing question ${question.question_number}:`, error);
        errors.push({
          question: question.question_number,
          error: error.message,
          details: error.details || error
        });
      }
    }

    // Update import session status
    if (importSessionId) {
      await supabase
        .from('past_paper_import_sessions')
        .update({ 
          status: errors.length === 0 ? 'completed' : 'completed_with_errors',
          processed_at: new Date().toISOString(),
          metadata: {
            imported_questions: importedQuestions.length,
            updated_questions: updatedQuestions.length,
            failed_questions: errors.length,
            skipped_questions: skippedQuestions.length,
            errors: errors,
            skipped: skippedQuestions,
            updated: updatedQuestions
          }
        })
        .eq('id', importSessionId);
    }

    return {
      importedQuestions,
      errors,
      skippedQuestions,
      updatedQuestions
    };
    
  } catch (error) {
    console.error('Error in importQuestions:', error);
    throw error;
  }
};

export const fixIncompleteQuestions = async (
  paperId: string,
  importSession?: any,
  originalData?: any
): Promise<{ updated: number, errors: any[] }> => {
  try {
    console.log('Starting to fix incomplete questions for paper:', paperId);
    
    const { data: incompleteQuestions, error: fetchError } = await supabase
      .from('questions_master_admin')
      .select(`
        id,
        question_number,
        question_description,
        hint,
        explanation,
        topic_id,
        type,
        marks,
        difficulty,
        import_session_id,
        answer_format,
        answer_requirement,
        total_alternatives,
        correct_answer
      `)
      .eq('paper_id', paperId)
      .or('question_description.is.null,question_description.eq.,hint.is.null,explanation.is.null');
    
    if (fetchError) {
      console.error('Error fetching incomplete questions:', fetchError);
      return { updated: 0, errors: [fetchError] };
    }
    
    if (!incompleteQuestions || incompleteQuestions.length === 0) {
      console.log('No incomplete questions found');
      return { updated: 0, errors: [] };
    }
    
    console.log(`Found ${incompleteQuestions.length} incomplete questions`);
    
    // Get the original import session data if not provided
    if (!originalData) {
      const importSessionId = incompleteQuestions[0]?.import_session_id || importSession?.id;
      
      if (importSessionId) {
        const { data: sessionData } = await supabase
          .from('past_paper_import_sessions')
          .select('raw_json, json_file_name')
          .eq('id', importSessionId)
          .single();
        
        if (sessionData?.raw_json) {
          originalData = sessionData.raw_json;
        }
      }
    }
    
    if (!originalData) {
      console.log('No original import data found, cannot auto-fix');
      return { updated: 0, errors: ['No original import data found'] };
    }
    
    let updatedCount = 0;
    const errors = [];
    
    for (const dbQuestion of incompleteQuestions) {
      try {
        const originalQuestion = originalData.questions?.find((q: any) => 
          parseInt(q.question_number) === parseInt(dbQuestion.question_number)
        );
        
        if (!originalQuestion) {
          console.log(`No original data found for question ${dbQuestion.question_number}`);
          continue;
        }
        
        const updateData: any = {};
        let needsUpdate = false;
        
        if (!dbQuestion.question_description || dbQuestion.question_description.trim() === '') {
          const newDescription = getQuestionDescription(originalQuestion);
          if (newDescription) {
            updateData.question_description = newDescription;
            needsUpdate = true;
          }
        }
        
        if (!dbQuestion.hint && originalQuestion.hint) {
          updateData.hint = ensureString(originalQuestion.hint);
          needsUpdate = true;
        }
        
        if (!dbQuestion.explanation && originalQuestion.explanation) {
          updateData.explanation = ensureString(originalQuestion.explanation);
          needsUpdate = true;
        }
        
        if (!dbQuestion.difficulty && originalQuestion.difficulty) {
          updateData.difficulty = ensureString(originalQuestion.difficulty);
          needsUpdate = true;
        }
        
        if (!dbQuestion.answer_format && originalQuestion.answer_format) {
          updateData.answer_format = ensureString(originalQuestion.answer_format);
          needsUpdate = true;
        }
        
        if (!dbQuestion.correct_answer && originalQuestion.correct_answer) {
          updateData.correct_answer = ensureString(originalQuestion.correct_answer);
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          updateData.updated_at = new Date().toISOString();
          
          const { error: updateError } = await supabase
            .from('questions_master_admin')
            .update(updateData)
            .eq('id', dbQuestion.id);
          
          if (updateError) {
            console.error(`Error updating question ${dbQuestion.question_number}:`, updateError);
            errors.push({ question: dbQuestion.question_number, error: updateError });
          } else {
            console.log(`Updated question ${dbQuestion.question_number}`);
            updatedCount++;
          }
        }
        
        // Check for multiple correct answers
        if (originalQuestion.correct_answers && Array.isArray(originalQuestion.correct_answers)) {
          const { data: existingAnswers } = await supabase
            .from('question_correct_answers')
            .select('id')
            .eq('question_id', dbQuestion.id)
            .limit(1);
          
          if (!existingAnswers || existingAnswers.length === 0) {
            const correctAnswersToInsert = originalQuestion.correct_answers.map((ca: any) => ({
              question_id: dbQuestion.id,
              answer: ensureString(ca.answer),
              marks: ca.marks || null,
              alternative_id: ca.alternative_id || null,
              context_type: ca.context?.type || null,
              context_value: ca.context?.value || null,
              context_label: ca.context?.label || null
            }));
            
            const { error: caError } = await supabase
              .from('question_correct_answers')
              .insert(correctAnswersToInsert);
            
            if (caError) {
              console.error('Error inserting correct answers:', caError);
              errors.push({ question: dbQuestion.question_number, error: caError });
            }
          }
        }
      } catch (error) {
        console.error(`Error processing question ${dbQuestion.question_number}:`, error);
        errors.push({ question: dbQuestion.question_number, error });
      }
    }
    
    return { updated: updatedCount, errors };
    
  } catch (error) {
    console.error('Error fixing incomplete questions:', error);
    return { updated: 0, errors: [error] };
  }
};

// ===== VALIDATION =====
export const validateQuestionsForImport = (
  questions: any[],
  mappings: Record<string, QuestionMapping> | undefined | null,
  existingQuestionNumbers: Set<number> | Set<string>,
  attachments?: any
): Record<string, string[]> => {
  const errors: Record<string, string[]> = {};
  
  // Ensure mappings exists and is an object
  const safeMappings = mappings || {};
  
  questions.forEach((question: any) => {
    const questionErrors: string[] = [];
    const questionId = question.id || `q_${question.question_number}`;
    
    // Skip validation for already imported questions
    const questionNumber = parseInt(question.question_number) || parseInt(questionId.replace('q_', ''));
    if (existingQuestionNumbers.has(questionNumber) || existingQuestionNumbers.has(String(questionNumber))) {
      return; // Skip validation for already imported questions
    }
    
    // Check required fields
    const hasQuestionContent = 
      question.question_description || 
      question.question_text || 
      question.question_header ||
      question.description ||
      (question.figure && question.type === 'mcq') ||
      (question.parts && question.parts.length > 0);
    
    if (!hasQuestionContent) {
      questionErrors.push('Question content is required (description, text, or parts)');
    }
    
    // For direct questions without parts, ensure marks are present
    if ((!question.parts || question.parts.length === 0) && !question.marks && question.marks !== 0 && !question.total_marks) {
      questionErrors.push('Question marks is required');
    }
    
    // Check mapping (at least chapter/unit should be mapped) - safely access mappings
    const mapping = safeMappings[questionId] || safeMappings[question.id] || {};
    if (!mapping?.chapter_id) {
      questionErrors.push('Chapter/Unit mapping is required');
    }
    
    // For MCQ questions, check if correct answer is set
    if (question.type === 'mcq' && question.options) {
      const hasCorrectAnswer = question.options.some((opt: any) => opt?.is_correct) || 
                              question.correct_answer !== null;
      if (!hasCorrectAnswer) {
        questionErrors.push('MCQ questions must have a correct answer marked');
      }
    }
    
    // Check if figure is required but no attachments (only if attachments object is provided)
    if (attachments) {
      const attachmentKey = questionId;
      const hasAttachments = attachments[attachmentKey]?.length > 0;
      if (requiresFigure(question) && !hasAttachments) {
        questionErrors.push('Figure is required but no attachment added');
      }
    }
    
    if (questionErrors.length > 0) {
      errors[questionId] = questionErrors;
    }
  });
  
  return errors;
};

// ===== NEW COMPANION VALIDATION FUNCTION =====
export const validateQuestionMapping = (
  question: any,
  mapping: QuestionMapping | undefined | null
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Ensure mapping exists
  const safeMapping = mapping || { chapter_id: '', topic_ids: [], subtopic_ids: [] };
  
  // Validate mapping
  if (!safeMapping.chapter_id) {
    errors.push('Unit/Chapter selection is required');
  }
  
  if (!safeMapping.topic_ids || safeMapping.topic_ids.length === 0) {
    errors.push('At least one topic must be selected');
  }
  
  // Validate question fields
  if (!question.question_text && !question.question_description) {
    errors.push('Question text is required');
  }
  
  if (!question.marks && !question.total_marks) {
    errors.push('Question marks are required');
  }
  
  if (!question.type) {
    errors.push('Question type is required');
  }
  
  if (!question.difficulty) {
    errors.push('Question difficulty is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};