// Path: src/lib/data-operations/questionsDataOperations.ts

import { supabase } from '@/lib/supabase';
// REMOVED: import { toast } from '@/components/shared/Toast';
// Toast import caused "Cannot access 'Rt' before initialization" error
// All toast notifications moved to UI layer (QuestionsTab.tsx)
import { validateMCQPaper, logValidationResults } from '@/lib/extraction/optionDataValidator';
import { detectAnswerExpectation } from '@/lib/extraction/answerExpectationDetector';
import { deriveAnswerFormat, deriveAnswerRequirement } from '@/lib/constants/answerOptions';

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
  warnings?: Array<{
    type: string;
    message: string;
    details?: Record<string, any>;
  }>;
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

// Attachment validation and normalization
export interface AttachmentAsset {
  id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size?: number;
  description?: string;
}

export const normalizeAttachment = (att: any, index: number = 0): AttachmentAsset | null => {
  // Handle string attachments (descriptions from JSON)
  if (typeof att === 'string') {
    const trimmedDesc = att.trim();
    if (!trimmedDesc) return null;

    console.warn(`[Attachment Validation] String attachment detected: "${trimmedDesc.substring(0, 50)}..."`);

    // Create placeholder attachment with description
    return {
      id: `placeholder_${Date.now()}_${index}`,
      file_url: '', // Empty URL indicates manual upload needed
      file_name: `Attachment ${index + 1}: ${trimmedDesc.substring(0, 50)}`,
      file_type: 'text/description',
      file_size: 0,
      description: trimmedDesc
    };
  }

  // Handle object attachments
  if (typeof att === 'object' && att !== null) {
    // Validate required fields
    if (!att.file_url || typeof att.file_url !== 'string' || att.file_url.trim() === '') {
      console.warn('[Attachment Validation] Invalid attachment: missing or empty file_url', att);

      // If there's a description, treat as description-only attachment
      if (att.description && typeof att.description === 'string') {
        return {
          id: att.id || `placeholder_${Date.now()}_${index}`,
          file_url: '',
          file_name: att.file_name || `Description ${index + 1}`,
          file_type: 'text/description',
          file_size: 0,
          description: att.description
        };
      }

      return null;
    }

    // Valid attachment object
    return {
      id: att.id || `attachment_${Date.now()}_${index}`,
      file_url: att.file_url.trim(),
      file_name: att.file_name || att.fileName || `attachment_${index + 1}`,
      file_type: att.file_type || att.fileType || 'application/octet-stream',
      file_size: att.file_size || att.fileSize || 0,
      description: att.description
    };
  }

  // Invalid type
  console.warn('[Attachment Validation] Invalid attachment type:', typeof att, att);
  return null;
};

export const normalizeAttachments = (attachments: any): AttachmentAsset[] => {
  if (!attachments) return [];

  const attachmentArray = ensureArray(attachments);
  const normalized: AttachmentAsset[] = [];

  attachmentArray.forEach((att, index) => {
    const normalizedAtt = normalizeAttachment(att, index);
    if (normalizedAtt) {
      normalized.push(normalizedAtt);
    }
  });

  return normalized;
};

const normalizeId = (value: any): string => {
  if (value === null || value === undefined) return '';
  return String(value);
};

const normalizeText = (value: any): string => {
  if (value === null || value === undefined) return '';
  return String(value).trim().replace(/\s+/g, ' ').toLowerCase();
};

const isExactTextMatch = (a: any, b: any): boolean => {
  const normalizedA = normalizeText(a);
  const normalizedB = normalizeText(b);
  return normalizedA !== '' && normalizedA === normalizedB;
};

const isLooseTextMatch = (a: any, b: any): boolean => {
  const normalizedA = normalizeText(a);
  const normalizedB = normalizeText(b);
  if (!normalizedA || !normalizedB) return false;
  return normalizedA.includes(normalizedB) || normalizedB.includes(normalizedA);
};

const findUniqueMatch = <T>(
  items: T[],
  candidate: any,
  getters: Array<(item: T) => any>
): T | null => {
  const normalizedCandidate = normalizeText(candidate);
  if (!normalizedCandidate) return null;

  for (const getter of getters) {
    const exactMatches = items.filter(item => isExactTextMatch(getter(item), candidate));
    if (exactMatches.length === 1) {
      return exactMatches[0];
    }
  }

  for (const getter of getters) {
    const looseMatches = items.filter(item => isLooseTextMatch(getter(item), candidate));
    if (looseMatches.length === 1) {
      return looseMatches[0];
    }
  }

  return null;
};

const extractNameCandidates = (value: any): string[] => {
  if (value === null || value === undefined) return [];

  if (Array.isArray(value)) {
    return value
      .flatMap(item => extractNameCandidates(item))
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  }

  if (typeof value === 'string') {
    return value
      .split(/[,/]/)
      .map(part => part.trim())
      .filter(part => part.length > 0);
  }

  return [String(value)];
};

const arraysEqualNormalized = (a: any[] = [], b: any[] = []): boolean => {
  if (a.length !== b.length) return false;
  const normalizedA = a.map(item => normalizeId(item)).sort();
  const normalizedB = b.map(item => normalizeId(item)).sort();
  return normalizedA.every((value, index) => value === normalizedB[index]);
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
  const typeValue = ensureString(
    question?.question_type ??
    question?.type ??
    question?.questionType ??
    question?.question_category ??
    null
  )?.toLowerCase();

  if (question.question_description && question.question_description.trim()) {
    return question.question_description.trim();
  }
  
  if (question.question_text && question.question_text.trim()) {
    return question.question_text.trim();
  }
  
  if (question.question_header && question.question_header.trim()) {
    return question.question_header.trim();
  }
  
  if (typeValue === 'complex' && question.parts && question.parts.length > 0) {
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
  
  if (typeValue === 'mcq' && question.figure) {
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

      // Log topic data structure for debugging
      if (topicsData.length > 0) {
        console.log('✅ Topics loaded successfully:', {
          count: topicsData.length,
          sampleTopic: {
            id: topicsData[0].id,
            name: topicsData[0].name,
            unit_id: topicsData[0].unit_id,
            hasUnitId: !!topicsData[0].unit_id
          },
          allTopicsHaveUnitId: topicsData.every((t: any) => !!t.unit_id)
        });
      } else {
        console.warn('⚠️ No topics found for units:', unitIds);
      }

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
    console.log('[fetchImportedQuestions] Fetching session data for:', importSessionId);

    const { data, error } = await supabase
      .from('past_paper_import_sessions')
      .select('*')
      .eq('id', importSessionId)
      .single();

    if (error) throw error;

    // Prioritize working_json (edited data) over raw_json (original data)
    if (data?.working_json) {
      console.log('✅ [fetchImportedQuestions] Loading from working_json (edited data)');
      console.log('[fetchImportedQuestions] Data structure:', {
        hasQuestions: !!data.working_json.questions,
        questionCount: data.working_json.questions?.length,
        hasMetadata: !!data.working_json.metadata,
        lastSynced: data.last_synced_at
      });
      return data.working_json;
    } else if (data?.raw_json) {
      console.log('⚠️ [fetchImportedQuestions] Loading from raw_json (original data) - no edits yet');
      console.log('[fetchImportedQuestions] Data structure:', {
        hasQuestions: !!data.raw_json.questions,
        questionCount: data.raw_json.questions?.length,
        hasMetadata: !!data.raw_json.metadata
      });
      return data.raw_json;
    } else if (data?.json_file_name) {
      console.log('📁 [fetchImportedQuestions] Loading from storage file:', data.json_file_name);
      const { data: fileData, error: fileError } = await supabase.storage
        .from('past-paper-imports')
        .download(data.json_file_name);

      if (fileError) throw fileError;

      const text = await fileData.text();
      return JSON.parse(text);
    }

    throw new Error('No data found for this import session');
  } catch (error) {
    console.error('❌ [fetchImportedQuestions] Error fetching imported questions:', error);
    throw error;
  }
};

export const checkExistingQuestions = async (paperId: string) => {
  try {
    const { data: existingQuestions, error } = await supabase
      .from('questions_master_admin')
      .select('question_number')
      .eq('paper_id', paperId)
      .is('deleted_at', null);
    
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
    const originalUnitId = normalizeId(existingMapping.chapter_id);

    const resolveUnit = (candidate: any) => {
      if (!candidate) return null;

      const directMatch = units.find((u: any) => normalizeId(u.id) === normalizeId(candidate));
      if (directMatch) return directMatch;

      return findUniqueMatch(units, candidate, [
        (u: any) => u.name,
        (u: any) => u.code,
        (u: any) => u.short_name,
        (u: any) => u.display_name
      ]);
    };

    const matchTopicInList = (availableTopics: any[], name: string) =>
      findUniqueMatch(availableTopics, name, [
        (topic: any) => topic.name,
        (topic: any) => topic.code,
        (topic: any) => topic.alias
      ]);

    const matchSubtopicInList = (availableSubtopics: any[], name: string) =>
      findUniqueMatch(availableSubtopics, name, [
        (subtopic: any) => subtopic.name,
        (subtopic: any) => subtopic.code,
        (subtopic: any) => subtopic.alias
      ]);

    let unitId = originalUnitId;

    if (!unitId) {
      const unitCandidates = [
        question.unit,
        question.original_unit,
        question.chapter,
        question.original_chapter
      ];

      for (const candidate of unitCandidates) {
        const match = resolveUnit(candidate);
        if (match) {
          unitId = normalizeId(match.id);
          break;
        }
      }
    }

    let topicIds = Array.isArray(existingMapping.topic_ids)
      ? existingMapping.topic_ids.map((id: any) => normalizeId(id)).filter(Boolean)
      : [];
    let subtopicIds = Array.isArray(existingMapping.subtopic_ids)
      ? existingMapping.subtopic_ids.map((id: any) => normalizeId(id)).filter(Boolean)
      : [];

    const topicIdSet = new Set(topicIds);
    const subtopicIdSet = new Set(subtopicIds);

    const questionTopicNames = [
      ...extractNameCandidates(question.topics),
      ...extractNameCandidates(question.original_topics),
      ...extractNameCandidates(question.topic)
    ];

    const questionSubtopicNames = [
      ...extractNameCandidates(question.subtopics),
      ...extractNameCandidates(question.original_subtopics),
      ...extractNameCandidates(question.subtopic)
    ];

    if (unitId) {
      const validTopicIds = Array.from(topicIdSet).filter(topicId => {
        const topic = topics.find((t: any) => normalizeId(t.id) === topicId);
        return topic && normalizeId(topic.unit_id) === unitId;
      });

      if (validTopicIds.length !== topicIdSet.size) {
        topicIdSet.clear();
        validTopicIds.forEach(id => topicIdSet.add(id));
      }
    }

    const ensureUnitFromTopic = (topic: any) => {
      if (!topic) return;
      const topicUnitId = normalizeId(topic.unit_id);
      if (!topicUnitId) return;

      if (!unitId) {
        unitId = topicUnitId;
      }
    };

    if (!unitId && topicIdSet.size > 0) {
      const existingTopic = topics.find((t: any) => normalizeId(t.id) === Array.from(topicIdSet)[0]);
      ensureUnitFromTopic(existingTopic);
    }

    const considerTopicMatch = (topicName: string) => {
      if (!topicName) return;

      const topicsForUnit = unitId
        ? topics.filter((t: any) => normalizeId(t.unit_id) === unitId)
        : topics;

      let match = matchTopicInList(topicsForUnit, topicName);

      if (!match && !unitId) {
        match = matchTopicInList(topics, topicName);
        if (match) {
          ensureUnitFromTopic(match);
        }
      }

      if (match) {
        const matchUnitId = normalizeId(match.unit_id);
        if (unitId && matchUnitId && matchUnitId !== unitId) {
          return;
        }

        ensureUnitFromTopic(match);

        const topicId = normalizeId(match.id);
        topicIdSet.add(topicId);
      }
    };

    const considerSubtopicMatch = (subtopicName: string) => {
      if (!subtopicName) return;

      const relatedSubtopics = topicIdSet.size > 0
        ? subtopics.filter((s: any) => topicIdSet.has(normalizeId(s.topic_id)))
        : [];

      let match = matchSubtopicInList(relatedSubtopics, subtopicName);

      if (!match) {
        match = matchSubtopicInList(subtopics, subtopicName);
      }

      if (!match) return;

      const parentTopicId = normalizeId(match.topic_id);
      const parentTopic = topics.find((t: any) => normalizeId(t.id) === parentTopicId);
      if (!parentTopic) return;

      const parentUnitId = normalizeId(parentTopic.unit_id);
      if (unitId && parentUnitId && parentUnitId !== unitId) {
        return;
      }

      if (parentTopicId) {
        topicIdSet.add(parentTopicId);
      }

      const subtopicId = normalizeId(match.id);
      subtopicIdSet.add(subtopicId);
    };

    // Use subtopics first - they can uniquely identify the unit/topic hierarchy
    questionSubtopicNames.forEach(name => considerSubtopicMatch(name));
    questionTopicNames.forEach(name => considerTopicMatch(name));
    // Re-run subtopic matching in case new topics unlocked more precise matches
    questionSubtopicNames.forEach(name => considerSubtopicMatch(name));

    if (!unitId && topicIdSet.size > 0) {
      const inferredTopic = topics.find((t: any) => normalizeId(t.id) === Array.from(topicIdSet)[0]);
      ensureUnitFromTopic(inferredTopic);
    }

    if (unitId) {
      const validTopicIds = Array.from(topicIdSet).filter(topicId => {
        const topic = topics.find((t: any) => normalizeId(t.id) === topicId);
        return topic && normalizeId(topic.unit_id) === unitId;
      });
      if (validTopicIds.length !== topicIdSet.size) {
        topicIdSet.clear();
        validTopicIds.forEach(id => topicIdSet.add(id));
      }

      const validSubtopicIds = Array.from(subtopicIdSet).filter(subtopicId => {
        const subtopic = subtopics.find((s: any) => normalizeId(s.id) === subtopicId);
        if (!subtopic) return false;
        const parentTopicId = normalizeId(subtopic.topic_id);
        const parentTopic = topics.find((t: any) => normalizeId(t.id) === parentTopicId);
        if (!parentTopic || normalizeId(parentTopic.unit_id) !== unitId) {
          return false;
        }
        topicIdSet.add(parentTopicId);
        return true;
      });

      if (validSubtopicIds.length !== subtopicIdSet.size) {
        subtopicIdSet.clear();
        validSubtopicIds.forEach(id => subtopicIdSet.add(id));
      }
    }

    const finalMapping = {
      chapter_id: unitId,
      topic_ids: Array.from(topicIdSet),
      subtopic_ids: Array.from(subtopicIdSet)
    };

    const mappingChanged =
      normalizeId(existingMapping.chapter_id) !== unitId ||
      !arraysEqualNormalized(existingMapping.topic_ids || [], finalMapping.topic_ids) ||
      !arraysEqualNormalized(existingMapping.subtopic_ids || [], finalMapping.subtopic_ids);

    if (mappingChanged) {
      updatedMappings[question.id] = finalMapping;

      if (!existingMapping.chapter_id && finalMapping.chapter_id) {
        mappedCount++;
      } else {
        enhancedCount++;
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

export const generateAttachmentKeyForImport = (
  questionId: string,
  partIndex?: number,
  subpartIndex?: number
): string => {
  let key = questionId;
  if (partIndex !== undefined) {
    key += `_p${partIndex}`;
  }
  if (subpartIndex !== undefined) {
    key += `_s${subpartIndex}`;
  }
  return key;
};

export const insertSubQuestion = async (
  parentQuestionId: string,
  part: any,
  parentSubId: string | null,
  level: number,
  uploadedAttachments: any,
  mapping: any,
  partType: 'part' | 'subpart' = 'part',
  importQuestionId?: string,
  partIndex?: number,
  subpartIndex?: number
): Promise<void> => {
  try {
    // Log recursion entry
    console.log(`\n[SUB-QUESTION] Processing ${partType} at level ${level}`);
    console.log(`[SUB-QUESTION] Parent question ID: ${parentQuestionId}`);
    console.log(`[SUB-QUESTION] Parent sub-question ID: ${parentSubId || 'NONE (top-level part)'}`);

    const partMapping = mapping || {};

    // Determine the part label based on part type and level
    let partLabel = '';
    if (partType === 'part') {
      partLabel = part.part || part.part_label || String.fromCharCode(97 + (part.order_index || 0)); // a, b, c...
    } else if (partType === 'subpart') {
      partLabel = part.subpart || part.part_label || `${romanNumeral(part.order_index + 1 || 1)}`; // i, ii, iii...
    }

    console.log(`[SUB-QUESTION] Part label: ${partLabel}`);
    
    const parsedOrderIndex = parseInt(part.order_index);
    const hasValidOrderIndex = !isNaN(parsedOrderIndex);
    const orderIndex = hasValidOrderIndex ? parsedOrderIndex : 0;
    
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
    
    // Determine sub-question type - preserve 'mcq' and 'tf' types, default to 'descriptive'
    const partTypeSource =
      part?.question_type ??
      part?.type ??
      part?.questionType ??
      part?.question_category ??
      null;
    const rawPartType = ensureString(partTypeSource)?.toLowerCase() || null;
    const normalizedPartType = rawPartType === 'mcq' || rawPartType === 'tf' ? rawPartType : 'descriptive';

    // Detect answer expectation for this part/subpart
    const hasSubparts = part.subparts && Array.isArray(part.subparts) && part.subparts.length > 0;
    const answerExpectation = detectAnswerExpectation(
      {
        question_text: part.question_text || part.question_description,
        correct_answers: part.correct_answers,
        answer_format: part.answer_format,
        answer_requirement: part.answer_requirement,
        subparts: part.subparts
      },
      {
        hasSubparts,
        level: parseInt(level) >= 3 ? 'subpart' : 'part'
      }
    );

    // Auto-derive answer_format if not provided
    const partQuestionDescription = part.question_description || part.question_text || '';
    const derivedPartAnswerFormat = part.answer_format ||
      deriveAnswerFormat({
        type: normalizedPartType,
        question_description: partQuestionDescription,
        correct_answers: part.correct_answers || [],
        has_direct_answer: answerExpectation.has_direct_answer,
        is_contextual_only: answerExpectation.is_contextual_only
      }) ||
      detectAnswerFormat(partQuestionDescription);

    // Auto-derive answer_requirement if not provided
    // CRITICAL FIX: Pass all required parameters including answer_format and question_description
    const derivedPartAnswerRequirement = part.answer_requirement ||
      deriveAnswerRequirement({
        type: normalizedPartType,
        correct_answers: part.correct_answers || [],
        total_alternatives: part.total_alternatives,
        has_direct_answer: answerExpectation.has_direct_answer,
        is_contextual_only: answerExpectation.is_contextual_only,
        answer_format: derivedPartAnswerFormat, // FIXED: Pass the derived answer format
        question_description: partQuestionDescription // FIXED: Pass question description
      });

    console.log(`🎯 Answer field derivation for ${partType} ${partLabel}:`);
    console.log('   Original answer_format:', part.answer_format);
    console.log('   Derived answer_format:', derivedPartAnswerFormat);
    console.log('   Original answer_requirement:', part.answer_requirement);
    console.log('   Derived answer_requirement:', derivedPartAnswerRequirement);
    console.log('   Has direct answer:', answerExpectation.has_direct_answer);
    console.log('   Is contextual only:', answerExpectation.is_contextual_only);

    const subQuestionData = {
      question_id: parentQuestionId,
      parent_id: parentSubId || null, // Fix: Ensure it's JS null, not empty string
      level: !isNaN(parseInt(level)) ? parseInt(level) : 1,
      order_index: orderIndex,
      type: normalizedPartType,
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
      answer_format: derivedPartAnswerFormat,
      answer_requirement: derivedPartAnswerRequirement,
      total_alternatives: part.total_alternatives || null,
      correct_answer: ensureString(part.correct_answer) || null,
      // P1 FIX: Populate figure_required field for sub-questions
      figure_required: requiresFigure(part),
      // Answer expectation fields (for complex questions)
      has_direct_answer: answerExpectation.has_direct_answer,
      is_contextual_only: answerExpectation.is_contextual_only
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
        alternative_type: ca.alternative_type || 'standalone',
        linked_alternatives: Array.isArray(ca.linked_alternatives) ? ca.linked_alternatives : [],
        marking_criteria: ca.marking_criteria || null,
        working: ca.working || null,
        accepts_equivalent_phrasing: ca.accepts_equivalent_phrasing || false,
        accepts_reverse_argument: ca.accepts_reverse_argument || false,
        error_carried_forward: ca.error_carried_forward || false,
        acceptable_variations: Array.isArray(ca.acceptable_variations) ? ca.acceptable_variations : [],
        unit: ca.unit || null,
        context_type: ca.context?.type || null,
        context_value: ca.context?.value || null,
        context_label: ca.context?.label || null,
        answer_text: ca.answer_text || null,
        answer_type: ca.answer_type || null
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
    if (normalizedPartType === 'mcq' && part.options && Array.isArray(part.options) && part.options.length > 0) {
      console.log(`📋 Inserting ${part.options.length} options for MCQ sub-question ${partLabel}`);

      const optionsToInsert = part.options
        .filter((opt: any) => opt !== null && opt !== undefined)
        .map((option: any, idx: number) => {
          const optionText = ensureString(option.text || option.option_text) || '';
          const optionLabel = option.label || String.fromCharCode(65 + idx); // A, B, C, D...
          const isCorrect = option.is_correct || (part.correct_answer === optionLabel) || false;

          // Enhanced option data capture - populate ALL available fields
          return {
            sub_question_id: subQuestionRecord.id,
            option_text: optionText,
            label: optionLabel,
            is_correct: isCorrect,
            order: idx,
            // NEW: Capture explanation field for learning value
            explanation: ensureString(option.explanation) || null,
            // NEW: Capture image reference if option has associated image
            image_id: option.image_id ? getUUIDFromMapping(option.image_id) : null,
            // NEW: Capture context metadata for analytics
            context_type: ensureString(option.context_type || option.context?.type) || null,
            context_value: ensureString(option.context_value || option.context?.value) || null,
            context_label: ensureString(option.context_label || option.context?.label) || null
          };
        });

      const { data: insertedOptions, error: optionsError } = await supabase
        .from('question_options')
        .insert(optionsToInsert)
        .select();

      if (optionsError) {
        console.error(`❌ Error inserting sub-question ${partLabel} options:`, optionsError);
      } else {
        console.log(`✅ Successfully inserted ${insertedOptions?.length || 0} options for sub-question ${partLabel}`);
        // Log data completeness for quality monitoring
        const withExplanation = insertedOptions?.filter((opt: any) => opt.explanation).length || 0;
        const withContext = insertedOptions?.filter((opt: any) => opt.context_type).length || 0;
        if (withExplanation < insertedOptions?.length!) {
          console.warn(`⚠️ Sub-question ${partLabel}: ${insertedOptions?.length! - withExplanation} options missing explanations`);
        }
        if (withContext < insertedOptions?.length!) {
          console.warn(`⚠️ Sub-question ${partLabel}: ${insertedOptions?.length! - withContext} options missing context metadata`);
        }
      }
    }

    const effectivePartIndex = partType === 'part'
      ? (partIndex ?? (hasValidOrderIndex ? parsedOrderIndex : undefined))
      : partIndex;

    const effectiveSubpartIndex = partType === 'subpart'
      ? (subpartIndex ?? (hasValidOrderIndex ? parsedOrderIndex : undefined))
      : subpartIndex;

    let partAttachments: any[] = [];

    if (importQuestionId) {
      const primaryAttachmentKey = generateAttachmentKeyForImport(
        importQuestionId,
        effectivePartIndex,
        effectiveSubpartIndex
      );

      partAttachments = uploadedAttachments[primaryAttachmentKey] || [];

      if (partAttachments.length === 0 && effectivePartIndex !== undefined) {
        const fallbackKeys = Object.keys(uploadedAttachments).filter(key => {
          if (!key.startsWith(importQuestionId)) return false;
          if (!key.includes(`p${effectivePartIndex}`)) return false;
          if (effectiveSubpartIndex !== undefined) {
            return key.includes(`s${effectiveSubpartIndex}`);
          }
          return !key.includes('_s');
        });

        if (fallbackKeys.length > 0) {
          partAttachments = fallbackKeys
            .flatMap(key => uploadedAttachments[key] || [])
            .filter(Boolean);
        }
      }
    }

    if (partAttachments.length === 0) {
      const legacyKey = parentSubId
        ? `${parentQuestionId}_${parentSubId}_${subQuestionRecord.id}`
        : `${parentQuestionId}_${subQuestionRecord.id}`;
      partAttachments = uploadedAttachments[legacyKey] || [];
    }

    // Enhanced attachment insertion with validation and logging
    if (partAttachments.length > 0) {
      console.log(`[Attachment] Inserting ${partAttachments.length} attachment(s) for sub-question ${subQuestionRecord.id} (${partLabel})`);

      // Get authenticated user ID for audit fields (once, outside map)
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const attachmentUserId = currentSession?.user?.id || null;

      const attachmentsToInsert = partAttachments
        .filter((att: any) => {
          if (!att.file_url || att.file_url.trim() === '') {
            console.warn(`[ATTACHMENT] Skipping attachment with empty file_url for sub-question ${subQuestionRecord.id}:`, att);
            return false;
          }

          // Validate URL format
          try {
            new URL(att.file_url);
          } catch (e) {
            console.error(`[ATTACHMENT] Invalid URL format for sub-question ${subQuestionRecord.id}:`, att.file_url);
            console.error(`[ATTACHMENT] URL validation error:`, e);
            return false;
          }

          // Check if URL is from Supabase storage (warning only, not blocking)
          if (!att.file_url.includes('supabase.co/storage') && !att.file_url.includes('localhost')) {
            console.warn(`[ATTACHMENT] URL not from Supabase storage (external URL):`, att.file_url);
          }

          return true;
        })
        .map((att: any) => ({
          sub_question_id: subQuestionRecord.id,
          file_url: att.file_url.trim(),
          file_name: att.file_name || att.fileName || 'attachment',
          file_type: att.file_type || att.fileType || 'image/png',
          file_size: att.file_size || att.fileSize || 0,
          // P1 FIX: Populate attachment audit fields
          uploaded_by: attachmentUserId,
          uploaded_at: new Date().toISOString()
        }));

      if (attachmentsToInsert.length > 0) {
        const { data: insertedAttachments, error: attachError } = await supabase
          .from('questions_attachments')
          .insert(attachmentsToInsert)
          .select();

        if (attachError) {
          console.error(`[Attachment] Error inserting sub-question attachments for ${subQuestionRecord.id}:`, attachError);
        } else {
          console.log(`[Attachment] Successfully inserted ${insertedAttachments?.length || 0} attachment(s) for sub-question ${subQuestionRecord.id}`);
        }
      } else {
        console.warn(`[Attachment] No valid attachments to insert for sub-question ${subQuestionRecord.id} after filtering`);
      }
    } else {
      console.log(`[Attachment] No attachments found for sub-question ${subQuestionRecord.id} (${partLabel}). Checked keys:`, {
        primaryKey: importQuestionId ? generateAttachmentKeyForImport(importQuestionId, effectivePartIndex, effectiveSubpartIndex) : 'N/A',
        partAttachmentsLength: partAttachments.length
      });
    }

    // Recursively insert nested subparts
    const childPartIndex = effectivePartIndex ?? partIndex ?? (hasValidOrderIndex ? parsedOrderIndex : undefined);

    if (part.subparts && part.subparts.length > 0) {
      console.log(`[SUB-QUESTION] ${partLabel} has ${part.subparts.length} nested subparts, recursing...`);

      for (let subpartIdx = 0; subpartIdx < part.subparts.length; subpartIdx++) {
        const subpart = part.subparts[subpartIdx];
        if (!subpart) continue;
        const subpartOrderIndex = !isNaN(parseInt(subpart?.order_index))
          ? parseInt(subpart.order_index)
          : subpartIdx;

        console.log(`[SUB-QUESTION] Recursing into subpart ${subpartIdx + 1}/${part.subparts.length}`);

        await insertSubQuestion(
          parentQuestionId,
          subpart,
          subQuestionRecord.id,
          level + 1,
          uploadedAttachments,
          mapping,
          'subpart',
          importQuestionId,
          childPartIndex,
          subpartOrderIndex
        );
      }

      console.log(`[SUB-QUESTION] Completed all ${part.subparts.length} subparts for ${partLabel}`);
    }

    // Also check for 'parts' (for deeper nesting or alternative structure)
    if (part.parts && part.parts.length > 0) {
      console.log(`[SUB-QUESTION] ${partLabel} has ${part.parts.length} nested parts, recursing...`);

      for (let nestedIdx = 0; nestedIdx < part.parts.length; nestedIdx++) {
        const nestedPart = part.parts[nestedIdx];
        if (!nestedPart) continue;
        const nestedOrderIndex = !isNaN(parseInt(nestedPart?.order_index))
          ? parseInt(nestedPart.order_index)
          : nestedIdx;

        console.log(`[SUB-QUESTION] Recursing into nested part ${nestedIdx + 1}/${part.parts.length}`);

        await insertSubQuestion(
          parentQuestionId,
          nestedPart,
          subQuestionRecord.id,
          level + 1,
          uploadedAttachments,
          mapping,
          'part',
          importQuestionId,
          nestedOrderIndex
        );
      }

      console.log(`[SUB-QUESTION] Completed all ${part.parts.length} nested parts for ${partLabel}`);
    }

    console.log(`[SUB-QUESTION] ✅ Successfully completed ${partLabel} at level ${level}`);

  } catch (error: any) {
    console.error(`[SUB-QUESTION ERROR] Failed to insert ${partLabel}:`, error);
    console.error(`[SUB-QUESTION ERROR] Parent question: ${parentQuestionId}`);
    console.error(`[SUB-QUESTION ERROR] Level: ${level}`);
    console.error(`[SUB-QUESTION ERROR] Error message:`, error?.message);
    console.error(`[SUB-QUESTION ERROR] Error details:`, error?.details);

    // Propagate error to parent handler so it can be tracked
    throw new Error(
      `Failed to insert sub-question ${partLabel} (level ${level}): ${error.message || 'Unknown error'}`
    );
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
  onProgress?: (current: number, total: number) => void;
}): Promise<ImportResult> => {
  const {
    questions,
    mappings,
    attachments,
    paperId,
    dataStructureInfo,
    importSessionId,
    yearOverride,
    existingQuestionNumbers,
    onProgress
  } = params;

  const importedQuestions = [];
  const errors = [];
  const skippedQuestions = [];
  const updatedQuestions = [];
  const warnings: NonNullable<ImportResult['warnings']> = [];
  const totalQuestions = questions.length;

  if (totalQuestions === 0) {
    onProgress?.(0, 0);
  }

  try {
    // ============================================================================
    // DIAGNOSTIC LOGGING - Phase 1: Pre-Import Verification
    // ============================================================================
    console.log('\n========================================');
    console.log('🔍 IMPORT DIAGNOSTICS - STARTING');
    console.log('========================================');
    console.log('Total questions to import:', totalQuestions);
    console.log('Paper ID:', paperId);
    console.log('Data Structure ID:', dataStructureInfo?.id);
    console.log('Import Session ID:', importSessionId);
    console.log('Year Override:', yearOverride);
    console.log('Existing question numbers:', Array.from(existingQuestionNumbers));
    console.log('Attachments keys:', Object.keys(attachments || {}));
    console.log('Mappings count:', Object.keys(mappings || {}).length);

    // ============================================================================
    // PRE-FLIGHT VALIDATION - Check authentication and permissions
    // ============================================================================
    console.log('\n========================================');
    console.log('🔐 PRE-FLIGHT VALIDATION');
    console.log('========================================');

    // Check 1: Verify authentication session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (!session || sessionError) {
      const errorMsg = 'Authentication session is invalid or expired. Please sign in again.';
      console.error('❌ Authentication check failed:', sessionError?.message || 'No session');
      throw new Error(errorMsg);
    }
    console.log('✅ Authentication session valid:', session.user.email);

    // Check 2: Test if user can insert questions
    console.log('🔍 Checking insert permissions...');
    const { data: permissionCheck, error: permCheckError } = await supabase
      .rpc('can_insert_questions');

    if (permCheckError) {
      console.error('❌ Permission check function failed:', permCheckError);
      console.log('ℹ️ Continuing with import (function may not exist in older schemas)');
    } else if (permissionCheck && !permissionCheck.can_insert) {
      const errorMsg = `Cannot insert questions: ${permissionCheck.reason || 'Insufficient permissions'}`;
      console.error('❌ Permission check failed:', permissionCheck);
      throw new Error(errorMsg);
    } else {
      console.log('✅ User has permission to insert questions:', permissionCheck);
    }

    // Check 3: Validate paper and data structure prerequisites
    console.log('🔍 Validating prerequisites...');
    const { data: validationResult, error: validationError } = await supabase
      .rpc('validate_question_import_prerequisites', {
        p_paper_id: paperId,
        p_data_structure_id: dataStructureInfo.id
      });

    if (validationError) {
      console.error('❌ Prerequisite validation function failed:', validationError);
      console.log('ℹ️ Continuing with import (function may not exist in older schemas)');
    } else if (validationResult && !validationResult.valid) {
      const errorMsg = `Prerequisite validation failed: ${JSON.stringify(validationResult.errors)}`;
      console.error('❌ Validation failed:', validationResult);
      throw new Error(errorMsg);
    } else {
      console.log('✅ Prerequisites validated successfully');
    }

    // ============================================================================
    // MCQ OPTION DATA VALIDATION - Prevent Data Loss
    // ============================================================================
    console.log('\n========================================');
    console.log('🔍 VALIDATING MCQ OPTION DATA COMPLETENESS');
    console.log('========================================');

    const validationSummary = validateMCQPaper({ questions });
    logValidationResults(validationSummary);

    // Warn if critical data is missing but allow import to continue
    if (validationSummary.averageCompletenessScore < 70) {
      console.warn('⚠️ WARNING: MCQ options have low data completeness. Consider enriching JSON with explanations and context metadata.');
    }

    if (validationSummary.errors.length > 0) {
      console.error('❌ CRITICAL: Found structural errors in MCQ options. Review errors above before proceeding.');
    }

    // Authentication status already logged in pre-flight validation section above
    console.log('\n📋 Authentication Status (from pre-flight validation):');
    console.log('  Session exists:', !!session);
    console.log('  User ID:', session?.user?.id || 'NONE');
    console.log('  User email:', session?.user?.email || 'NONE');

    // Verify database connection and RLS
    console.log('\n🔐 Testing Database Access:');
    const { data: testQuery, error: testError } = await supabase
      .from('questions_master_admin')
      .select('id')
      .limit(1);
    console.log('  Can query questions_master_admin:', !testError);
    console.log('  Test error:', testError?.message || 'None');
    console.log('  Test error code:', testError?.code || 'None');
    console.log('  Test error details:', testError?.details || 'None');

    // Verify paper exists
    console.log('\n📄 Verifying Paper:');
    const { data: paperCheck, error: paperError } = await supabase
      .from('papers_setup')
      .select('id, paper_code, status')
      .eq('id', paperId)
      .maybeSingle();
    console.log('  Paper exists:', !!paperCheck);
    console.log('  Paper status:', paperCheck?.status || 'NOT FOUND');
    console.log('  Paper error:', paperError?.message || 'None');

    // Verify data structure
    console.log('\n🏗️ Verifying Data Structure:');
    const { data: dsCheck, error: dsError } = await supabase
      .from('data_structures')
      .select('id, region_id, program_id, provider_id, subject_id')
      .eq('id', dataStructureInfo.id)
      .maybeSingle();
    console.log('  Data structure exists:', !!dsCheck);
    console.log('  Data structure:', dsCheck);
    console.log('  DS error:', dsError?.message || 'None');

    // ============================================================================
    // ENHANCED PRE-IMPORT VALIDATION - Catch Issues Before Processing
    // ============================================================================
    console.log('\n========================================');
    console.log('🔍 ENHANCED PRE-IMPORT VALIDATION');
    console.log('========================================');

    // Check 1: Validate questions array
    if (!questions || questions.length === 0) {
      throw new Error('No questions provided for import');
    }
    console.log('✅ Questions array valid:', questions.length, 'questions');

    // Check 2: Validate required parameters
    if (!paperId) {
      throw new Error('Paper ID is required');
    }
    if (!dataStructureInfo || !dataStructureInfo.id) {
      throw new Error('Data structure information is required');
    }
    console.log('✅ Required parameters validated');

    // Check 3: Validate at least one question has proper structure
    const sampleQuestion = questions[0];
    if (!sampleQuestion) {
      throw new Error('First question is undefined');
    }

    const hasQuestionNumber = sampleQuestion.question_number !== undefined && sampleQuestion.question_number !== null;
    const hasContent = sampleQuestion.question_description || sampleQuestion.description || sampleQuestion.parts;

    if (!hasQuestionNumber) {
      console.warn('⚠️ WARNING: First question missing question_number. Will use index-based numbering.');
    }
    if (!hasContent) {
      console.warn('⚠️ WARNING: First question appears to have no content. This may indicate data structure issues.');
    }
    console.log('✅ Question structure validation passed');

    // Check 4: Validate mappings structure if provided
    if (mappings) {
      const mappingKeys = Object.keys(mappings);
      console.log('  Mappings provided for', mappingKeys.length, 'questions');

      // Check if at least some questions have mappings
      const questionsWithMappings = questions.filter(q => mappings[q.id]);
      const mappingCoverage = (questionsWithMappings.length / questions.length) * 100;
      console.log(`  Mapping coverage: ${mappingCoverage.toFixed(1)}%`);

      if (mappingCoverage < 50) {
        console.warn(`⚠️ WARNING: Only ${mappingCoverage.toFixed(1)}% of questions have mappings. This may affect categorization.`);
      } else {
        console.log('✅ Mapping coverage acceptable');
      }
    } else {
      console.warn('⚠️ WARNING: No mappings provided. Questions will be imported without topic/subtopic links.');
    }

    // Check 5: Test database write permissions with a dry-run query
    console.log('\n🧪 Testing database write capability...');
    const testQuestionData = {
      paper_id: paperId,
      data_structure_id: dataStructureInfo.id,
      question_number: -1, // Use negative number to identify test records
      question_description: '__TEST_RECORD_DO_NOT_USE__',
      marks: 0,
      type: 'descriptive',
      status: 'inactive',
      year: new Date().getFullYear()
    };

    const { error: dryRunError } = await supabase
      .from('questions_master_admin')
      .insert([testQuestionData])
      .select();

    if (dryRunError) {
      // If we can't insert, check if it's a permissions issue
      if (dryRunError.code === 'PGRST301' || dryRunError.code === '42501') {
        throw new Error(`Database permission error: ${dryRunError.message}. You may not have permission to insert questions.`);
      } else if (dryRunError.code === '23505') {
        // Duplicate key error means we CAN write but record exists
        console.log('✅ Write test passed (duplicate key indicates write capability)');
      } else {
        console.warn('⚠️ Dry-run insert failed:', dryRunError.message);
        console.warn('   This may indicate a permissions or schema issue.');
        console.warn('   Code:', dryRunError.code);
        console.warn('   Proceeding with import attempt...');
      }
    } else {
      // Clean up test record immediately
      await supabase
        .from('questions_master_admin')
        .delete()
        .eq('question_description', '__TEST_RECORD_DO_NOT_USE__')
        .eq('question_number', -1);
      console.log('✅ Database write capability confirmed (test record cleaned up)');
    }

    console.log('\n✅ All pre-import validations passed');
    console.log('========================================');

    console.log('\n========================================');
    console.log('📦 Starting Attachment Upload');
    console.log('========================================');
    const uploadedAttachments = await uploadAttachments(attachments);
    console.log('✅ Attachments uploaded successfully');
    console.log('   Uploaded attachment keys:', Object.keys(uploadedAttachments));

    console.log('\n========================================');
    console.log('🔄 Processing Questions');
    console.log('========================================');

    // Process each question
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const mapping = mappings?.[question.id] || {};

      try {
        const questionNumber = !isNaN(parseInt(question.question_number)) ? parseInt(question.question_number) : (i + 1);

        console.log(`\n--- Question ${i + 1}/${totalQuestions} (Number: ${questionNumber}) ---`);
        
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
          .is('deleted_at', null)
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
        
        // Get primary chapter, topic and subtopic
        const primaryChapterId = getUUIDFromMapping(mapping?.chapter_id) || null;
        const primaryTopicId = getUUIDFromMapping(
          mapping?.topic_ids && mapping.topic_ids.length > 0 ? mapping.topic_ids[0] : null
        );
        const primarySubtopicId = getUUIDFromMapping(
          mapping?.subtopic_ids && mapping.subtopic_ids.length > 0 ? mapping.subtopic_ids[0] : null
        );

        // Log mapping results
        console.log('🔗 Mapping resolution for question', questionNumber);
        console.log('   Chapter ID:', primaryChapterId || 'NOT MAPPED');
        console.log('   Topic ID:', primaryTopicId || 'NOT MAPPED');
        console.log('   Subtopic ID:', primarySubtopicId || 'NOT MAPPED');

        if (!primaryTopicId) {
          console.warn(`⚠️ [MAPPING] No topic mapped for question ${questionNumber}`);
          console.warn(`   Available mapping data:`, {
            has_mapping: !!mapping,
            topic_ids: mapping?.topic_ids,
            original_topics: mapping?.original_topics
          });
        }

        if (!primarySubtopicId) {
          console.warn(`⚠️ [MAPPING] No subtopic mapped for question ${questionNumber}`);
          console.warn(`   Available mapping data:`, {
            has_mapping: !!mapping,
            subtopic_ids: mapping?.subtopic_ids,
            original_subtopics: mapping?.original_subtopics
          });
        }
        
        const questionDescription = getQuestionDescription(question);
        const questionAnswerFormat = question.answer_format || detectAnswerFormat(questionDescription);
        
        // Determine question type - preserve 'mcq' and 'tf' types, default to 'descriptive'
        const questionTypeSource =
          question?.question_type ??
          question?.type ??
          question?.questionType ??
          question?.questionCategory ??
          null;
        const questionType = ensureString(questionTypeSource)?.toLowerCase() || null;
        const normalizedType = questionType === 'mcq' || questionType === 'tf' ? questionType : 'descriptive';

        console.log('🔍 Question type detection:');
        console.log('   Raw question.type:', question.type);
        console.log('   question.question_type:', question?.question_type);
        console.log('   Normalized source value:', questionType);
        console.log('   Normalized type:', normalizedType);
        console.log('   Has options:', question.options ? question.options.length : 0);

        // Get authenticated user ID for audit fields (reuse session from pre-flight validation)
        const currentUserId = session?.user?.id || null;

        // Detect answer expectation for main question
        const hasParts = question.parts && Array.isArray(question.parts) && question.parts.length > 0;
        const mainAnswerExpectation = detectAnswerExpectation(
          {
            question_text: questionDescription,
            question_description: questionDescription,
            correct_answers: question.correct_answers,
            answer_format: question.answer_format,
            answer_requirement: question.answer_requirement,
            parts: question.parts
          },
          {
            hasSubparts: hasParts,
            level: 'main'
          }
        );

        // Auto-derive answer_format if not provided
        const derivedAnswerFormat = question.answer_format ||
          deriveAnswerFormat({
            type: normalizedType,
            question_description: questionDescription,
            correct_answers: question.correct_answers || [],
            has_direct_answer: mainAnswerExpectation.has_direct_answer,
            is_contextual_only: mainAnswerExpectation.is_contextual_only
          }) ||
          questionAnswerFormat;

        // Auto-derive answer_requirement if not provided
        // CRITICAL FIX: Pass all required parameters including answer_format and question_description
        const derivedAnswerRequirement = question.answer_requirement ||
          deriveAnswerRequirement({
            type: normalizedType,
            correct_answers: question.correct_answers || [],
            total_alternatives: question.total_alternatives,
            has_direct_answer: mainAnswerExpectation.has_direct_answer,
            is_contextual_only: mainAnswerExpectation.is_contextual_only,
            answer_format: derivedAnswerFormat, // FIXED: Pass the derived answer format
            question_description: questionDescription // FIXED: Pass question description
          });

        console.log('🎯 Answer field derivation for main question:');
        console.log('   Original answer_format:', question.answer_format);
        console.log('   Derived answer_format:', derivedAnswerFormat);
        console.log('   Original answer_requirement:', question.answer_requirement);
        console.log('   Derived answer_requirement:', derivedAnswerRequirement);
        console.log('   Has direct answer:', mainAnswerExpectation.has_direct_answer);
        console.log('   Is contextual only:', mainAnswerExpectation.is_contextual_only);

        const questionData = {
          paper_id: paperId,
          data_structure_id: dataStructureInfo.id,
          region_id: dataStructureInfo.region_id,
          program_id: dataStructureInfo.program_id,
          provider_id: dataStructureInfo.provider_id,
          subject_id: dataStructureInfo.subject_id,
          chapter_id: primaryChapterId,
          topic_id: primaryTopicId,
          subtopic_id: primarySubtopicId,
          category:
            (ensureString(
              question?.category ?? question?.question_category ?? question?.type ?? questionTypeSource
            )?.toLowerCase() === 'complex')
              ? 'complex'
              : 'direct',
          type: normalizedType,
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
          answer_format: derivedAnswerFormat,
          answer_requirement: derivedAnswerRequirement,
          total_alternatives: question.total_alternatives || null,
          correct_answer: ensureString(question.correct_answer) || null,
          // P1 FIX: Populate figure_required field
          figure_required: requiresFigure(question),
          // Answer expectation fields (for complex questions)
          has_direct_answer: mainAnswerExpectation.has_direct_answer,
          is_contextual_only: mainAnswerExpectation.is_contextual_only,
          // P1 FIX: Populate audit trail fields
          created_by: currentUserId,
          updated_by: currentUserId,
          updated_at: new Date().toISOString()
        };

        console.log('📝 Question data prepared for insertion:');
        console.log('   Paper ID:', questionData.paper_id);
        console.log('   Question Number:', questionData.question_number);
        console.log('   Type:', questionData.type);
        console.log('   Category:', questionData.category);
        console.log('   Marks:', questionData.marks);
        console.log('   Description length:', questionData.question_description?.length || 0);
        console.log('   Has mapping:', !!mapping);
        console.log('   Chapter ID:', questionData.chapter_id);
        console.log('   Topic ID:', questionData.topic_id);
        console.log('   Subtopic ID:', questionData.subtopic_id);
        console.log('   Complete question data:', JSON.stringify(questionData, null, 2));

        console.log('💾 Attempting database insert...');
        const { data: insertedQuestion, error: questionError } = await supabase
          .from('questions_master_admin')
          .insert([questionData])
          .select()
          .single();

        if (questionError) {
          console.error('❌ ERROR inserting question:', questionError);
          console.error('   Error message:', questionError.message);
          console.error('   Error code:', questionError.code);
          console.error('   Error details:', questionError.details);
          console.error('   Error hint:', questionError.hint);
          console.error('   Full error object:', JSON.stringify(questionError, null, 2));
          throw questionError;
        }

        if (!insertedQuestion) {
          console.error('❌ Insert operation returned no question record. This usually indicates RLS prevented the insert.');
          throw new Error('Question insert returned no data. Please verify that your account has permission to add questions.');
        }

        console.log('✅ Question inserted successfully!');
        console.log('   Inserted question ID:', insertedQuestion?.id);
        console.log('   Inserted data:', insertedQuestion);

        // Insert multiple correct answers if available
        if (question.correct_answers && Array.isArray(question.correct_answers)) {
          console.log('📋 Inserting correct answers:', question.correct_answers.length);
          const correctAnswersToInsert = question.correct_answers.map((ca: any) => ({
            question_id: insertedQuestion.id,
            answer: ensureString(ca.answer),
            marks: ca.marks || null,
            alternative_id: ca.alternative_id || null,
            alternative_type: ca.alternative_type || 'standalone',
            linked_alternatives: Array.isArray(ca.linked_alternatives) ? ca.linked_alternatives : [],
            marking_criteria: ca.marking_criteria || null,
            working: ca.working || null,
            accepts_equivalent_phrasing: ca.accepts_equivalent_phrasing || false,
            accepts_reverse_argument: ca.accepts_reverse_argument || false,
            error_carried_forward: ca.error_carried_forward || false,
            acceptable_variations: Array.isArray(ca.acceptable_variations) ? ca.acceptable_variations : [],
            unit: ca.unit || null,
            context_type: ca.context?.type || null,
            context_value: ca.context?.value || null,
            context_label: ca.context?.label || null,
            answer_text: ca.answer_text || null,
            answer_type: ca.answer_type || null
          }));

          const { data: insertedAnswers, error: caError } = await supabase
            .from('question_correct_answers')
            .insert(correctAnswersToInsert)
            .select();

          if (caError) {
            console.error('❌ Error inserting correct answers:', caError);
            console.error('   Error details:', JSON.stringify(caError, null, 2));
          } else {
            console.log('✅ Correct answers inserted:', insertedAnswers?.length || 0);
          }
        } else if (ensureString(question.correct_answer)) {
          const normalizedCorrectAnswer = ensureString(question.correct_answer);
          const matchingOption = Array.isArray(question.options)
            ? question.options.find((option: any, index: number) => {
                const optionLabel = option?.label || String.fromCharCode(65 + index);
                return optionLabel === normalizedCorrectAnswer;
              })
            : null;

          const correctAnswerPayload = {
            question_id: insertedQuestion.id,
            answer: ensureString(
              matchingOption?.text || matchingOption?.option_text || normalizedCorrectAnswer
            ),
            marks: questionData.marks || null,
            alternative_id: null,
            context_type: null,
            context_value: null,
            context_label: null
          };

          const { error: fallbackAnswerError } = await supabase
            .from('question_correct_answers')
            .insert([correctAnswerPayload]);

          if (fallbackAnswerError) {
            console.error('❌ Error inserting fallback correct answer:', fallbackAnswerError);
            console.error('   Error details:', JSON.stringify(fallbackAnswerError, null, 2));
          } else {
            console.log('✅ Fallback correct answer inserted for question', questionNumber);
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
        if (normalizedType === 'mcq' && question.options && Array.isArray(question.options)) {
          console.log(`📋 Inserting ${question.options.length} options for MCQ question ${questionNumber}`);
          console.log('   Question type:', normalizedType);
          console.log('   Has options array:', !!question.options);
          console.log('   Options array length:', question.options.length);
          console.log('   Question correct_answer:', question.correct_answer);

          const optionsToInsert = question.options
            .filter((opt: any) => {
              const isValid = opt !== null && opt !== undefined;
              if (!isValid) {
                console.warn('   ⚠️ Filtered out null/undefined option');
              }
              return isValid;
            })
            .map((option: any, index: number) => {
              const optionText = ensureString(option.text || option.option_text) || '';
              const optionLabel = option.label || String.fromCharCode(65 + index); // A, B, C, D...
              const isCorrect = option.is_correct || (question.correct_answer === optionLabel) || false;

              console.log(`   Option ${optionLabel}: "${optionText.substring(0, 50)}..." (correct: ${isCorrect})`);

              // Enhanced option data capture - populate ALL available fields
              return {
                question_id: insertedQuestion.id,
                option_text: optionText,
                label: optionLabel,
                is_correct: isCorrect,
                order: index,
                // NEW: Capture explanation field for learning value
                explanation: ensureString(option.explanation) || null,
                // NEW: Capture image reference if option has associated image
                image_id: option.image_id ? getUUIDFromMapping(option.image_id) : null,
                // NEW: Capture context metadata for analytics
                context_type: ensureString(option.context_type || option.context?.type) || null,
                context_value: ensureString(option.context_value || option.context?.value) || null,
                context_label: ensureString(option.context_label || option.context?.label) || null
              };
            });

          console.log(`   Prepared ${optionsToInsert.length} options for insertion`);

          if (optionsToInsert.length > 0) {
            console.log('   💾 Attempting to insert options into database...');
            const { data: insertedOptions, error: optionsError } = await supabase
              .from('question_options')
              .insert(optionsToInsert)
              .select();

            if (optionsError) {
              console.error('❌ Error inserting options:', optionsError);
              console.error('   Error message:', optionsError.message);
              console.error('   Error code:', optionsError.code);
              console.error('   Error details:', optionsError.details);
              console.error('   Error hint:', optionsError.hint);
              console.error('   Full error:', JSON.stringify(optionsError, null, 2));
              warnings.push({
                type: 'mcq_options_insert_failed',
                message: `Could not save options for question ${questionNumber}. Check console for Supabase error details.`,
                details: {
                  questionNumber,
                  supabaseError: {
                    message: optionsError.message,
                    code: optionsError.code,
                    details: optionsError.details,
                    hint: optionsError.hint,
                  },
                },
              });
            } else {
              const insertedCount = insertedOptions?.length || 0;
              console.log(`✅ Successfully inserted ${insertedCount} options into question_options table`);
              console.log('   Inserted option IDs:', insertedOptions?.map((opt: any) => opt.id).join(', '));
              // Log data completeness for quality monitoring
              const withExplanation = insertedOptions?.filter((opt: any) => opt.explanation).length || 0;
              const withContext = insertedOptions?.filter((opt: any) => opt.context_type).length || 0;
              if (withExplanation < insertedCount) {
                console.warn(`⚠️ ${insertedCount - withExplanation} options missing explanations (reduced learning value)`);
              }
              if (withContext < insertedCount) {
                console.warn(`⚠️ ${insertedCount - withContext} options missing context metadata (analytics incomplete)`);
              }
              if (insertedCount === 0) {
                warnings.push({
                  type: 'mcq_options_empty',
                  message: `No options were stored for MCQ question ${questionNumber}.`,
                  details: {
                    questionNumber,
                    normalizedType,
                    preparedOptions: optionsToInsert.length,
                  },
                });
              }
            }
          } else {
            console.warn(`⚠️ No options to insert after filtering (optionsToInsert.length = 0)`);
            warnings.push({
              type: 'mcq_options_missing',
              message: `MCQ question ${questionNumber} did not include any valid options in the JSON payload.`,
              details: {
                questionNumber,
                normalizedType,
                originalOptionCount: question.options?.length ?? 0,
              },
            });
          }
        } else {
          if (normalizedType === 'mcq') {
            console.error(`❌ CRITICAL: MCQ question ${questionNumber} has no options array!`);
            console.error('   question.options:', question.options);
            console.error('   Array.isArray(question.options):', Array.isArray(question.options));
            warnings.push({
              type: 'mcq_options_absent',
              message: `MCQ question ${questionNumber} is missing an options array and will require manual fixing after import.`,
              details: {
                questionNumber,
                questionId: insertedQuestion.id,
              },
            });
          } else {
            console.log(`ℹ️ Question ${questionNumber} is not MCQ (type: ${normalizedType}), skipping options`);
          }
        }

        // Insert sub-questions/parts if they exist
        if (question.parts && question.parts.length > 0) {
          for (let partIdx = 0; partIdx < question.parts.length; partIdx++) {
            const part = question.parts[partIdx];
            if (!part) continue;

            const partOrderIndex = !isNaN(parseInt(part?.order_index))
              ? parseInt(part.order_index)
              : partIdx;

            await insertSubQuestion(
              insertedQuestion.id,
              part,
              null,
              1,
              uploadedAttachments,
              mapping,
              'part',
              question.id,
              partOrderIndex
            );
          }
        }

        // Handle attachments
        const questionAttachments = uploadedAttachments[question.id] || [];
        if (questionAttachments.length > 0) {
          const attachmentsToInsert = questionAttachments
            .filter((att: any) => {
              if (!att.file_url || att.file_url.trim() === '') {
                console.warn(`[ATTACHMENT] Skipping attachment with empty file_url for question ${questionNumber}:`, att);
                return false;
              }

              // Validate URL format
              try {
                new URL(att.file_url);
              } catch (e) {
                console.error(`[ATTACHMENT] Invalid URL format for question ${questionNumber}:`, att.file_url);
                console.error(`[ATTACHMENT] URL validation error:`, e);
                return false;
              }

              // Check if URL is from Supabase storage (warning only)
              if (!att.file_url.includes('supabase.co/storage') && !att.file_url.includes('localhost')) {
                console.warn(`[ATTACHMENT] URL not from Supabase storage (external URL):`, att.file_url);
              }

              return true;
            })
            .map((att: any) => ({
              question_id: insertedQuestion.id,
              file_url: att.file_url,
              file_name: att.file_name || att.fileName,
              file_type: att.file_type || 'image/png',
              file_size: att.file_size || 0,
              // P1 FIX: Populate attachment audit fields
              uploaded_by: currentUserId,
              uploaded_at: new Date().toISOString()
            }));

          const { data: insertedAttachments, error: attachError } = await supabase
            .from('questions_attachments')
            .insert(attachmentsToInsert)
            .select();

          if (attachError) {
            console.error('Error inserting question attachments:', attachError);
          }

          // P1 FIX: Set figure_file_id to first attachment if question has figure
          if (insertedAttachments && insertedAttachments.length > 0 && question.figure) {
            const { error: figureUpdateError } = await supabase
              .from('questions_master_admin')
              .update({ figure_file_id: insertedAttachments[0].id })
              .eq('id', insertedQuestion.id);

            if (figureUpdateError) {
              console.error('Error setting figure_file_id:', figureUpdateError);
            } else {
              console.log(`✅ Set figure_file_id to ${insertedAttachments[0].id} for question ${questionNumber}`);
            }
          }
        }

        importedQuestions.push(insertedQuestion);
        console.log(`✅ Question ${questionNumber} import completed successfully\n`);

      } catch (error: any) {
        console.error(`\n❌ CRITICAL ERROR importing question ${question.question_number}:`);
        console.error('   Error type:', error?.constructor?.name);
        console.error('   Error message:', error?.message);
        console.error('   Error code:', error?.code);
        console.error('   Error details:', error?.details);
        console.error('   Error hint:', error?.hint);
        console.error('   Full error:', JSON.stringify(error, null, 2));
        console.error('   Stack trace:', error?.stack);

        errors.push({
          question: question.question_number,
          error: error.message,
          details: error.details || error,
          code: error.code,
          hint: error.hint
        });
      } finally {
        onProgress?.(Math.min(i + 1, totalQuestions), totalQuestions);
      }
    }

    // ============================================================================
    // DIAGNOSTIC LOGGING - Phase 2: Import Summary
    // ============================================================================
    console.log('\n========================================');
    console.log('📊 IMPORT SUMMARY');
    console.log('========================================');
    console.log('Total processed:', totalQuestions);
    console.log('Successfully imported:', importedQuestions.length);
    console.log('Skipped (duplicates):', skippedQuestions.length);
    console.log('Errors encountered:', errors.length);
    console.log('Updated questions:', updatedQuestions.length);

    if (importedQuestions.length > 0) {
      console.log('\n✅ Imported question IDs:', importedQuestions.map(q => q.id));
      console.log('✅ Imported question numbers:', importedQuestions.map(q => q.question_number));
    }

    if (skippedQuestions.length > 0) {
      console.log('\n⏭️ Skipped questions:', skippedQuestions);
    }

    if (errors.length > 0) {
      console.log('\n❌ Errors:', errors);
    }

    // Update import session status
    if (importSessionId) {
      console.log('\n📝 Updating import session status...');
      const { error: sessionUpdateError } = await supabase
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

      if (sessionUpdateError) {
        console.error('❌ Error updating import session:', sessionUpdateError);
      } else {
        console.log('✅ Import session updated successfully');
      }
    }

    // ============================================================================
    // POST-IMPORT VERIFICATION - Critical check to ensure data actually persisted
    // ============================================================================
    console.log('\n========================================');
    console.log('🔍 POST-IMPORT VERIFICATION');
    console.log('========================================');

    if (importedQuestions.length > 0) {
      console.log('Verifying', importedQuestions.length, 'questions were actually saved to database...');

      const { data: verifyQuestions, error: verifyError } = await supabase
        .from('questions_master_admin')
        .select('id, question_number, question_description, created_at, type')
        .eq('paper_id', paperId)
        .in('id', importedQuestions.map(q => q.id));

      if (verifyError) {
        console.error('❌ CRITICAL: Error verifying questions in database:', verifyError);
        console.error('   Error code:', verifyError.code);
        console.error('   Error message:', verifyError.message);
        console.error('   Error details:', verifyError.details);

        // This is a critical failure - data may not have been saved
        throw new Error(`Verification failed: ${verifyError.message}. Data may not have been saved to database.`);
      }

      const verifiedCount = verifyQuestions?.length || 0;
      const expectedCount = importedQuestions.length;

      console.log('✅ Verification query successful');
      console.log('   Questions expected:', expectedCount);
      console.log('   Questions found in DB:', verifiedCount);

      if (verifiedCount !== expectedCount) {
        console.error('⚠️ VERIFICATION MISMATCH (non-fatal warning)');
        console.error('   Expected:', expectedCount);
        console.error('   Found:', verifiedCount);
        console.error('   Missing:', expectedCount - verifiedCount);

        // Find which questions are missing
        const verifiedIds = new Set(verifyQuestions?.map(q => q.id) || []);
        const missingQuestions = importedQuestions.filter(q => !verifiedIds.has(q.id));
        console.error('   Missing question IDs:', missingQuestions.map(q => q.id));
        console.error('   Missing question numbers:', missingQuestions.map(q => q.question_number));

        // Add to errors array instead of throwing (data already committed)
        errors.push({
          question: 'VERIFICATION',
          error: `Only ${verifiedCount} out of ${expectedCount} questions verified in database`,
          details: {
            type: 'verification_mismatch',
            expected: expectedCount,
            found: verifiedCount,
            missingQuestions: missingQuestions.map(q => ({
              id: q.id,
              question_number: q.question_number
            }))
          },
          code: 'VERIFICATION_MISMATCH',
          hint: 'Questions may have been inserted but verification query failed. Check RLS policies or database state.'
        });

        console.warn('⚠️ Continuing with import despite verification mismatch (data already committed)');
      }

      console.log('✅ All questions verified successfully in database');

      // Additional verification for MCQ questions with options
      const mcqQuestions = verifyQuestions?.filter(q => q.type === 'mcq') || [];
      if (mcqQuestions.length > 0) {
        console.log('\n🔍 Verifying MCQ options for', mcqQuestions.length, 'MCQ questions...');

        const mcqQuestionIds = mcqQuestions.map(q => q.id);
        const { data: optionRows, error: optionsError } = await supabase
          .from('question_options')
          .select('question_id')
          .in('question_id', mcqQuestionIds);

        if (optionsError) {
          console.warn('⚠️ Could not verify MCQ options:', optionsError.message);
          warnings.push({
            type: 'mcq_options_verification_failed',
            message: 'Supabase verification query for MCQ options failed.',
            details: {
              supabaseError: {
                message: optionsError.message,
                code: optionsError.code,
                details: optionsError.details,
                hint: optionsError.hint,
              },
              questionIds: mcqQuestionIds,
            },
          });
        } else {
          const optionsByQuestion = new Map<string, number>();
          optionRows?.forEach((row: any) => {
            const current = optionsByQuestion.get(row.question_id) ?? 0;
            optionsByQuestion.set(row.question_id, current + 1);
          });

          const mcqQuestionsWithoutOptions = mcqQuestions.filter(q => !optionsByQuestion.has(q.id));

          if (mcqQuestionsWithoutOptions.length > 0) {
            console.warn('⚠️ WARNING:', mcqQuestionsWithoutOptions.length, 'MCQ questions have no options saved');
            console.warn('   Question IDs without options:', mcqQuestionsWithoutOptions.map(q => q.id));
            warnings.push({
              type: 'mcq_options_not_found',
              message: `${mcqQuestionsWithoutOptions.length} MCQ question(s) were imported without any options saved.`,
              details: {
                missingQuestionIds: mcqQuestionsWithoutOptions.map(q => q.id),
                missingQuestionNumbers: mcqQuestionsWithoutOptions.map(q => q.question_number),
              },
            });
          } else {
            console.log('✅ All MCQ questions have options saved');

            const sparseOptions = mcqQuestions.filter(q => (optionsByQuestion.get(q.id) ?? 0) < 4);
            if (sparseOptions.length > 0) {
              warnings.push({
                type: 'mcq_options_sparse',
                message: `${sparseOptions.length} MCQ question(s) have fewer than four answer choices saved.`,
                details: {
                  questionIds: sparseOptions.map(q => q.id),
                  questionNumbers: sparseOptions.map(q => q.question_number),
                  optionCounts: sparseOptions.map(q => optionsByQuestion.get(q.id) ?? 0),
                },
              });
            }
          }
        }
      }

      console.log('✅ Post-import verification passed');
    } else {
      console.log('ℹ️ No questions to verify (none were imported)');
    }

    console.log('\n========================================');
    console.log('🏁 IMPORT DIAGNOSTICS - COMPLETED');
    console.log('========================================\n');

    return {
      importedQuestions,
      errors,
      skippedQuestions,
      updatedQuestions,
      warnings
    };

  } catch (error: any) {
    console.error('\n========================================');
    console.error('💥 FATAL ERROR IN IMPORT PROCESS');
    console.error('========================================');
    console.error('Error type:', error?.constructor?.name);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    console.error('Full error:', JSON.stringify(error, null, 2));
    console.error('========================================\n');
    throw error;
  }
};

// ===== OPTIMIZED FETCHING WITH JOINS (No N+1 Queries) =====

/**
 * Fetch questions with all related data in a single optimized query
 * Eliminates N+1 query problem by using JOIN queries
 */
export const fetchQuestionsWithRelations = async (paperId: string) => {
  try {
    // Single query with all joins to fetch all related data at once
    const { data: questions, error } = await supabase
      .from('questions_master_admin')
      .select(`
        *,
        correct_answers:question_correct_answers!question_id(*),
        options:question_options!question_id(
          id,
          option_text,
          is_correct,
          order,
          created_at
        ),
        topics:question_topics!question_id(
          topic_id,
          edu_topics(id, name, code)
        ),
        subtopics:question_subtopics!question_id(
          subtopic_id,
          edu_subtopics(id, name, code)
        ),
        attachments:questions_attachments!question_id(
          id,
          file_url,
          file_name,
          file_type,
          file_size,
          created_at
        ),
        sub_questions!question_id(
          id,
          parent_id,
          level,
          order_index,
          type,
          part_label,
          description,
          question_description,
          explanation,
          hint,
          marks,
          difficulty,
          status,
          answer_format,
          topic_id,
          subtopic_id,
          correct_answers:question_correct_answers!sub_question_id(*),
          options:question_options!sub_question_id(
            id,
            option_text,
            is_correct,
            order,
            created_at
          ),
          attachments:questions_attachments!sub_question_id(
            id,
            file_url,
            file_name,
            file_type,
            file_size,
            created_at
          )
        )
      `)
      .eq('paper_id', paperId)
      .is('deleted_at', null)
      .order('question_number', { ascending: true });

    if (error) throw error;

    return questions || [];
  } catch (error) {
    console.error('Error fetching questions with relations:', error);
    throw error;
  }
};

/**
 * Fetch a single question with all related data
 * Optimized single-question query with all joins
 */
export const fetchQuestionByIdWithRelations = async (questionId: string) => {
  try {
    const { data: question, error } = await supabase
      .from('questions_master_admin')
      .select(`
        *,
        correct_answers:question_correct_answers!question_id(*),
        options:question_options!question_id(
          id,
          option_text,
          is_correct,
          order,
          created_at
        ),
        topics:question_topics!question_id(
          topic_id,
          edu_topics(id, name, code)
        ),
        subtopics:question_subtopics!question_id(
          subtopic_id,
          edu_subtopics(id, name, code)
        ),
        attachments:questions_attachments!question_id(
          id,
          file_url,
          file_name,
          file_type,
          file_size,
          created_at
        ),
        sub_questions!question_id(
          id,
          parent_id,
          level,
          order_index,
          type,
          part_label,
          description,
          question_description,
          explanation,
          hint,
          marks,
          difficulty,
          status,
          answer_format,
          topic_id,
          subtopic_id,
          correct_answers:question_correct_answers!sub_question_id(*),
          options:question_options!sub_question_id(
            id,
            option_text,
            is_correct,
            order,
            created_at
          ),
          attachments:questions_attachments!sub_question_id(
            id,
            file_url,
            file_name,
            file_type,
            file_size,
            created_at
          )
        )
      `)
      .eq('id', questionId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) throw error;

    return question;
  } catch (error) {
    console.error('Error fetching question with relations:', error);
    throw error;
  }
};

/**
 * Fetch questions with lightweight data for listing views
 * Optimized for performance when full relations aren't needed
 */
export const fetchQuestionsLightweight = async (paperId: string, options?: {
  limit?: number;
  offset?: number;
  searchTerm?: string;
}) => {
  try {
    let query = supabase
      .from('questions_master_admin')
      .select(`
        id,
        question_number,
        question_description,
        type,
        marks,
        difficulty,
        status,
        question_content_type,
        year,
        created_at,
        updated_at
      `, { count: 'exact' })
      .eq('paper_id', paperId)
      .is('deleted_at', null)
      .order('question_number', { ascending: true });

    if (options?.searchTerm) {
      query = query.ilike('question_description', `%${options.searchTerm}%`);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options?.limit || 10) - 1);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      questions: data || [],
      total: count || 0
    };
  } catch (error) {
    console.error('Error fetching questions lightweight:', error);
    throw error;
  }
};

/**
 * Batch fetch questions by IDs with all relations
 * Optimized for fetching specific questions without N+1 queries
 */
export const fetchQuestionsByIdsWithRelations = async (questionIds: string[]) => {
  try {
    if (!questionIds || questionIds.length === 0) {
      return [];
    }

    const { data: questions, error } = await supabase
      .from('questions_master_admin')
      .select(`
        *,
        correct_answers:question_correct_answers!question_id(*),
        options:question_options!question_id(
          id,
          option_text,
          is_correct,
          order,
          created_at
        ),
        topics:question_topics!question_id(
          topic_id,
          edu_topics(id, name, code)
        ),
        subtopics:question_subtopics!question_id(
          subtopic_id,
          edu_subtopics(id, name, code)
        ),
        attachments:questions_attachments!question_id(
          id,
          file_url,
          file_name,
          file_type,
          file_size,
          created_at
        ),
        sub_questions!question_id(
          id,
          parent_id,
          level,
          order_index,
          type,
          part_label,
          description,
          question_description,
          explanation,
          hint,
          marks,
          difficulty,
          status,
          answer_format,
          topic_id,
          subtopic_id,
          correct_answers:question_correct_answers!sub_question_id(*),
          options:question_options!sub_question_id(
            id,
            option_text,
            is_correct,
            order,
            created_at
          ),
          attachments:questions_attachments!sub_question_id(
            id,
            file_url,
            file_name,
            file_type,
            file_size,
            created_at
          )
        )
      `)
      .in('id', questionIds)
      .is('deleted_at', null)
      .order('question_number', { ascending: true });

    if (error) throw error;

    return questions || [];
  } catch (error) {
    console.error('Error fetching questions by IDs with relations:', error);
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
              alternative_type: ca.alternative_type || 'standalone',
              linked_alternatives: Array.isArray(ca.linked_alternatives) ? ca.linked_alternatives : [],
              marking_criteria: ca.marking_criteria || null,
              working: ca.working || null,
              accepts_equivalent_phrasing: ca.accepts_equivalent_phrasing || false,
              accepts_reverse_argument: ca.accepts_reverse_argument || false,
              error_carried_forward: ca.error_carried_forward || false,
              acceptable_variations: Array.isArray(ca.acceptable_variations) ? ca.acceptable_variations : [],
              unit: ca.unit || null,
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
    const questionTypeValue = ensureString(
      question?.question_type ??
      question?.type ??
      question?.questionType ??
      question?.question_category ??
      null
    )?.toLowerCase();
    
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
      (question.figure && questionTypeValue === 'mcq') ||
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
    if (questionTypeValue === 'mcq' && question.options) {
      const hasCorrectAnswer = question.options.some((opt: any) => opt?.is_correct) || 
                              question.correct_answer !== null;
      if (!hasCorrectAnswer) {
        questionErrors.push('MCQ questions must have a correct answer marked');
      }
    }
    
    // Check if figure is required but no attachments (only if attachments object is provided)
    // RESPECT THE TOGGLE: Only validate if figure_required is not explicitly set to false
    if (attachments) {
      const attachmentKey = questionId;
      const hasAttachments = attachments[attachmentKey]?.length > 0;
      const shouldValidateFigure = (question as any).figure_required !== false && requiresFigure(question);

      if (shouldValidateFigure && !hasAttachments) {
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
  const questionTypeValue = ensureString(
    question?.question_type ??
    question?.type ??
    question?.questionType ??
    question?.question_category ??
    null
  )?.toLowerCase();
  
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
  
  if (!questionTypeValue) {
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