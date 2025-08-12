// src/lib/data-operations/markSchemeParser.ts
// Implementation reference for Phase 2

import { 
  ParsedAnswer, 
  AlternativeGroup, 
  Context, 
  Abbreviations,
  AnswerVariation 
} from './markSchemeTypes';

export class MarkSchemeParser {
  private subjectProcessors: Map<string, SubjectProcessor>;
  
  constructor() {
    this.subjectProcessors = new Map([
      ['physics', new PhysicsProcessor()],
      ['chemistry', new ChemistryProcessor()],
      ['biology', new BiologyProcessor()],
      ['mathematics', new MathematicsProcessor()]
    ]);
  }

  /**
   * GOLDEN RULE: Parse forward slashes as complete alternatives
   * Each "/" segment is a COMPLETE answer, not a fragment
   */
  parseForwardSlashes(text: string): string[] {
    // Handle special cases first
    const protectedPatterns = [
      /\d+\/\d+/g,  // Fractions: 1/2, 3/4
      /and\/or/gi,  // Common phrase
      /\w+\/\w+(?=\s+(?:cell|equation|formula))/gi  // Named items
    ];
    
    // Temporarily replace protected patterns
    let processedText = text;
    const replacements: Array<[string, string]> = [];
    
    protectedPatterns.forEach((pattern, index) => {
      processedText = processedText.replace(pattern, (match) => {
        const placeholder = `__PROTECTED_${index}_${replacements.length}__`;
        replacements.push([placeholder, match]);
        return placeholder;
      });
    });
    
    // Split by forward slash
    const segments = processedText.split('/').map(s => s.trim());
    
    // Restore protected patterns
    const restored = segments.map(segment => {
      let result = segment;
      replacements.forEach(([placeholder, original]) => {
        result = result.replace(placeholder, original);
      });
      return result;
    });
    
    return restored.filter(s => s.length > 0);
  }

  /**
   * Parse alternatives from mark scheme lines
   * Handles OR/AND logic, linked requirements
   */
  parseAlternatives(lines: string[]): AlternativeGroup[] {
    const groups: AlternativeGroup[] = [];
    let currentGroupId = 1;
    
    lines.forEach((line, index) => {
      const alternatives = this.parseForwardSlashes(line);
      
      if (alternatives.length > 1) {
        // Multiple alternatives in one line = OR logic
        const group: AlternativeGroup = {
          id: currentGroupId++,
          alternatives: alternatives.map((alt, altIndex) => ({
            id: `${currentGroupId}_${altIndex}`,
            answer: alt,
            alternative_type: 'one_required',
            linked_alternatives: alternatives
              .filter((_, i) => i !== altIndex)
              .map((_, i) => `${currentGroupId}_${i}`)
          }))
        };
        groups.push(group);
      } else if (this.detectAndRequirement(line)) {
        // AND requirement detected
        const parts = this.splitAndRequirement(line);
        const group: AlternativeGroup = {
          id: currentGroupId++,
          alternatives: parts.map((part, partIndex) => ({
            id: `${currentGroupId}_${partIndex}`,
            answer: part,
            alternative_type: 'all_required',
            linked_alternatives: parts
              .filter((_, i) => i !== partIndex)
              .map((_, i) => `${currentGroupId}_${i}`)
          }))
        };
        groups.push(group);
      } else {
        // Single answer
        groups.push({
          id: currentGroupId++,
          alternatives: [{
            id: `${currentGroupId}_0`,
            answer: line,
            alternative_type: 'single'
          }]
        });
      }
    });
    
    return groups;
  }

  /**
   * Detect abbreviations and marking flags
   */
  detectAbbreviations(text: string): Abbreviations {
    const abbr: Abbreviations = {
      ora: false,
      owtte: false,
      ecf: false,
      cao: false,
      ignore: false,
      accept: false,
      reject: false
    };
    
    const patterns = {
      ora: /\b(ora|o\.r\.a|or any reasonable answer)\b/i,
      owtte: /\b(owtte|o\.w\.t\.t\.e|or words to that effect)\b/i,
      ecf: /\b(ecf|e\.c\.f|error carried forward)\b/i,
      cao: /\b(cao|c\.a\.o|correct answer only)\b/i,
      ignore: /\bignore\b/i,
      accept: /\baccept\b/i,
      reject: /\b(reject|do not accept)\b/i
    };
    
    Object.entries(patterns).forEach(([key, pattern]) => {
      if (pattern.test(text)) {
        abbr[key as keyof Abbreviations] = true;
      }
    });
    
    return abbr;
  }

  /**
   * Assign context based on answer content and question
   */
  assignContext(answer: string, question: any): Context {
    // Option context (MCQ, T/F)
    if (question.type === 'mcq' || question.type === 'true_false') {
      return {
        type: 'option',
        value: answer,
        label: `Option ${answer}`
      };
    }
    
    // Position context (labeling, diagram)
    if (question.figure && this.isPositionAnswer(answer)) {
      return {
        type: 'position',
        value: answer,
        label: `Position ${answer}`
      };
    }
    
    // Calculation context
    if (this.isCalculation(answer)) {
      return {
        type: 'calculation',
        value: this.extractNumericValue(answer),
        label: 'Calculated value'
      };
    }
    
    // Value context (measurements, quantities)
    if (this.hasUnit(answer)) {
      const { value, unit } = this.extractValueAndUnit(answer);
      return {
        type: 'value',
        value: value,
        label: unit
      };
    }
    
    // Default context
    return {
      type: 'descriptive',
      value: answer,
      label: 'Answer'
    };
  }

  /**
   * Handle variations based on abbreviations
   */
  handleVariations(answer: string, flags: Abbreviations): AnswerVariation[] {
    const variations: AnswerVariation[] = [];
    
    if (flags.owtte) {
      variations.push(...this.generateOwetteVariations(answer));
    }
    
    if (flags.ora) {
      variations.push(...this.generateOraVariations(answer));
    }
    
    return variations;
  }

  // Helper methods
  private detectAndRequirement(line: string): boolean {
    return /\b(and|AND|&)\b/.test(line) && 
           !/(and\/or|and or)/i.test(line);
  }
  
  private splitAndRequirement(line: string): string[] {
    return line.split(/\b(?:and|AND|&)\b/)
               .map(s => s.trim())
               .filter(s => s.length > 0);
  }
  
  private isPositionAnswer(answer: string): boolean {
    return /^[A-Z]$/.test(answer) || 
           /^(top|bottom|left|right|center|middle)/i.test(answer);
  }
  
  private isCalculation(answer: string): boolean {
    return /^[\d\s+\-*/=.]+$/.test(answer.replace(/[()]/g, ''));
  }
  
  private hasUnit(answer: string): boolean {
    const unitPattern = /\b(cm|m|km|g|kg|s|min|h|°C|K|N|J|W|A|V|Ω|mol|M|Pa)\b/;
    return unitPattern.test(answer);
  }
  
  private extractValueAndUnit(answer: string): { value: string, unit: string } {
    const match = answer.match(/^([\d.]+)\s*(\w+)$/);
    if (match) {
      return { value: match[1], unit: match[2] };
    }
    return { value: answer, unit: '' };
  }
  
  private extractNumericValue(answer: string): string {
    const match = answer.match(/[\d.]+/);
    return match ? match[0] : answer;
  }
  
  private generateOwetteVariations(answer: string): AnswerVariation[] {
    // Implement OWTTE variations based on answer type
    const variations: AnswerVariation[] = [];
    
    // Add common synonyms and phrasings
    if (answer.includes('increase')) {
      variations.push(
        { text: answer.replace('increase', 'rise'), type: 'owtte' },
        { text: answer.replace('increase', 'go up'), type: 'owtte' },
        { text: answer.replace('increase', 'become greater'), type: 'owtte' }
      );
    }
    
    // Add more variation logic here...
    
    return variations;
  }
  
  private generateOraVariations(answer: string): AnswerVariation[] {
    // Implement ORA variations - reasonable alternatives
    const variations: AnswerVariation[] = [];
    
    // Subject-specific reasonable answers would be added here
    
    return variations;
  }
}

// src/lib/data-operations/markSchemeTypes.ts
export interface ParsedAnswer {
  id: string;
  answer: string;
  marks: number;
  alternative_id?: string;
  alternative_type?: 'single' | 'one_required' | 'all_required' | 'exactly_n_required';
  linked_alternatives?: string[];
  context?: Context;
  variations?: AnswerVariation[];
  abbreviations?: Abbreviations;
}

export interface AlternativeGroup {
  id: number;
  alternatives: ParsedAnswer[];
}

export interface Context {
  type: 'option' | 'position' | 'calculation' | 'value' | 'descriptive' | 
        'structure' | 'process' | 'organism' | 'function' | 'adaptation' | 'phase';
  value: string;
  label: string;
}

export interface Abbreviations {
  ora: boolean;    // or any reasonable answer
  owtte: boolean;  // or words to that effect  
  ecf: boolean;    // error carried forward
  cao: boolean;    // correct answer only
  ignore: boolean; // ignore certain parts
  accept: boolean; // accept specific variations
  reject: boolean; // reject specific answers
}

export interface AnswerVariation {
  text: string;
  type: 'owtte' | 'ora' | 'synonym' | 'notation';
}

// Abstract base for subject processors
export abstract class SubjectProcessor {
  abstract processAnswer(answer: string, question: any): ParsedAnswer;
  abstract generateVariations(answer: string): AnswerVariation[];
  abstract detectSpecialNotation(answer: string): any;
}

// Example: Physics processor stub
export class PhysicsProcessor extends SubjectProcessor {
  processAnswer(answer: string, question: any): ParsedAnswer {
    // Physics-specific processing
    // Handle units, measurements, vectors, etc.
    throw new Error("Implementation needed");
  }
  
  generateVariations(answer: string): AnswerVariation[] {
    // Physics-specific variations
    // Unit conversions, vector notations, etc.
    return [];
  }
  
  detectSpecialNotation(answer: string): any {
    // Detect physics-specific notation
    return {};
  }
}

// Similar stubs for Chemistry, Biology, Mathematics processors...