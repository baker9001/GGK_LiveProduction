// src/components/shared/questions/SubjectAdaptation.ts

import { QuestionSubject, AnswerAlternative } from './QuestionViewer';

export interface SubjectRules {
  chemistry?: ChemistryRules;
  biology?: BiologyRules;
  mathematics?: MathematicsRules;
  physics?: PhysicsRules;
}

export interface ChemistryRules {
  observations: {
    colors: Record<string, string[]>;
    precipitates: Record<string, string[]>;
    gases: Record<string, { test: string; result: string; alternatives: string[] }>;
  };
  equations: {
    requiresBalancing: boolean;
    stateSymbolsRequired: boolean;
  };
  safety: {
    requiredPrecautions: string[];
  };
}

export interface BiologyRules {
  diagramLabels: {
    acceptAlternatives: boolean;
    labelMapping: Record<string, string[]>;
  };
  processes: {
    templates: Record<string, string[]>;
  };
  dataAnalysis: {
    patterns: string[];
  };
}

export interface MathematicsRules {
  marking: {
    methodMarks: number;
    accuracyMarks: number;
    bandingRules: Array<{ range: [number, number]; marks: number }>;
  };
  precision: {
    significantFigures?: number;
    decimalPlaces?: number;
  };
  alternativeMethods: {
    accepted: boolean;
    equivalenceRules: string[];
  };
}

export interface PhysicsRules {
  formulas: {
    derivationsRequired: boolean;
    unitConversionRequired: boolean;
  };
  graphs: {
    readingTolerance: number;
    interpolationAllowed: boolean;
  };
  experiments: {
    variables: {
      independent: string[];
      dependent: string[];
      controlled: string[];
    };
  };
}

export interface ComplianceMessage {
  type: 'info' | 'warning' | 'error';
  message: string;
  field?: string;
}

// Chemistry Subject Helpers
export class ChemistryAdapter {
  private static gasTests: Record<string, { test: string; positiveResults: string[] }> = {
    'hydrogen': {
      test: 'burning splint',
      positiveResults: ['squeaky pop', 'pop sound', 'pops']
    },
    'oxygen': {
      test: 'glowing splint',
      positiveResults: ['relights', 'rekindles', 'bursts into flame', 'reignites']
    },
    'carbon_dioxide': {
      test: 'limewater',
      positiveResults: ['turns milky', 'turns cloudy', 'white precipitate', 'milky white']
    },
    'chlorine': {
      test: 'damp litmus paper',
      positiveResults: ['bleaches', 'turns white', 'decolorizes']
    },
    'ammonia': {
      test: 'damp red litmus',
      positiveResults: ['turns blue', 'blue color']
    }
  };

  static validateGasTest(userAnswer: string, correctGas: string): { isValid: boolean; feedback: string } {
    const test = this.gasTests[correctGas.toLowerCase()];
    if (!test) {
      return { isValid: false, feedback: 'Unknown gas test' };
    }

    const normalized = userAnswer.toLowerCase().trim();
    const isValid = test.positiveResults.some(result =>
      normalized.includes(result) || result.includes(normalized)
    );

    return {
      isValid,
      feedback: isValid
        ? 'Correct observation'
        : `Expected: ${test.test} → ${test.positiveResults[0]}`
    };
  }

  static validateEquationBalancing(equation: string): { isBalanced: boolean; message: string } {
    // Simplified equation validation
    // In production, this would parse and validate chemical equations
    const hasNumbers = /\d/.test(equation);
    const hasArrow = equation.includes('→') || equation.includes('->');

    if (!hasArrow) {
      return { isBalanced: false, message: 'Equation must include reaction arrow (→)' };
    }

    return {
      isBalanced: hasNumbers,
      message: hasNumbers ? 'Equation appears balanced' : 'Check stoichiometric coefficients'
    };
  }

  static getComplianceMessages(answer: AnswerAlternative, examBoard?: string): ComplianceMessage[] {
    const messages: ComplianceMessage[] = [];

    // Check for OWTTE flag
    if (answer.flags?.owtte) {
      messages.push({
        type: 'info',
        message: 'OWTTE: Other words to that effect accepted',
        field: 'marking'
      });
    }

    // Check for state symbols in Cambridge
    if (examBoard === 'cambridge') {
      if (answer.answer.includes('(') && answer.answer.includes(')')) {
        messages.push({
          type: 'info',
          message: 'State symbols detected and required for Cambridge',
          field: 'answer'
        });
      }
    }

    return messages;
  }
}

// Biology Subject Helpers
export class BiologyAdapter {
  private static diagramLabelAlternatives: Record<string, string[]> = {
    'nucleus': ['cell nucleus', 'nuclear membrane'],
    'mitochondria': ['mitochondrion', 'powerhouse'],
    'chloroplast': ['chloroplasts'],
    'cell_membrane': ['plasma membrane', 'cell surface membrane'],
    'cell_wall': ['cellulose wall'],
    'vacuole': ['large vacuole', 'central vacuole']
  };

  static validateDiagramLabel(userLabel: string, correctLabel: string): { isValid: boolean; alternatives: string[] } {
    const normalized = userLabel.toLowerCase().trim();
    const correct = correctLabel.toLowerCase().trim();

    if (normalized === correct) {
      return { isValid: true, alternatives: [] };
    }

    const alternatives = this.diagramLabelAlternatives[correct] || [];
    const isValid = alternatives.some(alt => normalized === alt.toLowerCase());

    return { isValid, alternatives };
  }

  static getProcessTemplate(processName: string): string[] {
    const templates: Record<string, string[]> = {
      'photosynthesis': [
        'light absorbed by chlorophyll',
        'water split into hydrogen and oxygen',
        'carbon dioxide combines with hydrogen',
        'glucose produced'
      ],
      'respiration': [
        'glucose broken down',
        'oxygen used',
        'energy released',
        'carbon dioxide and water produced'
      ]
    };

    return templates[processName.toLowerCase()] || [];
  }

  static getComplianceMessages(answer: AnswerAlternative): ComplianceMessage[] {
    const messages: ComplianceMessage[] = [];

    if (answer.context?.type === 'diagram_label') {
      messages.push({
        type: 'info',
        message: 'Alternative label names accepted',
        field: 'answer'
      });
    }

    return messages;
  }
}

// Mathematics Subject Helpers
export class MathematicsAdapter {
  static analyzeMarkingStructure(
    marks: number,
    workingSteps?: any[]
  ): { methodMarks: number; accuracyMarks: number; breakdown: string } {
    // M/A/B marking logic
    if (marks <= 2) {
      return {
        methodMarks: marks > 1 ? 1 : 0,
        accuracyMarks: 1,
        breakdown: marks === 1 ? 'A1' : 'M1 A1'
      };
    }

    const methodMarks = Math.floor(marks * 0.6);
    const accuracyMarks = marks - methodMarks;

    const breakdown = Array(methodMarks).fill('M').concat(Array(accuracyMarks).fill('A')).join(' ');

    return { methodMarks, accuracyMarks, breakdown };
  }

  static validateNumericalPrecision(
    userAnswer: number,
    correctAnswer: number,
    tolerance?: { abs?: number; pct?: number },
    significantFigures?: number
  ): { isValid: boolean; feedback: string } {
    // Check absolute tolerance
    if (tolerance?.abs !== undefined) {
      const diff = Math.abs(userAnswer - correctAnswer);
      if (diff <= tolerance.abs) {
        return { isValid: true, feedback: 'Answer within tolerance' };
      }
      return {
        isValid: false,
        feedback: `Outside tolerance (±${tolerance.abs})`
      };
    }

    // Check percentage tolerance
    if (tolerance?.pct !== undefined) {
      const pctDiff = Math.abs((userAnswer - correctAnswer) / correctAnswer) * 100;
      if (pctDiff <= tolerance.pct) {
        return { isValid: true, feedback: 'Answer within tolerance' };
      }
      return {
        isValid: false,
        feedback: `Outside tolerance (±${tolerance.pct}%)`
      };
    }

    // Check significant figures
    if (significantFigures) {
      const userSF = this.countSignificantFigures(userAnswer);
      if (userSF === significantFigures) {
        return { isValid: true, feedback: `Correct to ${significantFigures} s.f.` };
      }
      return {
        isValid: false,
        feedback: `Should be ${significantFigures} s.f., got ${userSF} s.f.`
      };
    }

    // Exact match required
    return {
      isValid: userAnswer === correctAnswer,
      feedback: userAnswer === correctAnswer ? 'Correct' : 'Incorrect value'
    };
  }

  private static countSignificantFigures(num: number): number {
    const str = num.toString().replace('.', '').replace(/^0+/, '');
    return str.length;
  }

  static getComplianceMessages(answer: AnswerAlternative, marks: number): ComplianceMessage[] {
    const messages: ComplianceMessage[] = [];

    if (answer.flags?.ecf) {
      messages.push({
        type: 'info',
        message: 'ECF: Error carried forward applies',
        field: 'marking'
      });
    }

    if (marks > 2) {
      const structure = this.analyzeMarkingStructure(marks);
      messages.push({
        type: 'info',
        message: `Marking: ${structure.breakdown} (${structure.methodMarks}M + ${structure.accuracyMarks}A)`,
        field: 'marks'
      });
    }

    return messages;
  }
}

// Physics Subject Helpers
export class PhysicsAdapter {
  static validateNumericalAnswer(
    userValue: number,
    userUnits: string,
    correctAnswer: AnswerAlternative
  ): { isValid: boolean; feedback: string } {
    const correctValue = parseFloat(correctAnswer.answer);
    const correctUnits = correctAnswer.units;

    // Check units first
    if (correctUnits && userUnits.toLowerCase() !== correctUnits.toLowerCase()) {
      return {
        isValid: false,
        feedback: `Incorrect units. Expected: ${correctUnits}`
      };
    }

    // Check value with tolerance
    const tolerance = correctAnswer.tolerance;
    if (tolerance?.abs !== undefined) {
      const diff = Math.abs(userValue - correctValue);
      return {
        isValid: diff <= tolerance.abs,
        feedback: diff <= tolerance.abs
          ? 'Correct'
          : `Outside tolerance (±${tolerance.abs})`
      };
    }

    if (tolerance?.pct !== undefined) {
      const pctDiff = Math.abs((userValue - correctValue) / correctValue) * 100;
      return {
        isValid: pctDiff <= tolerance.pct,
        feedback: pctDiff <= tolerance.pct
          ? 'Correct'
          : `Outside tolerance (±${tolerance.pct}%)`
      };
    }

    return {
      isValid: userValue === correctValue,
      feedback: userValue === correctValue ? 'Correct' : 'Incorrect'
    };
  }

  static getComplianceMessages(answer: AnswerAlternative): ComplianceMessage[] {
    const messages: ComplianceMessage[] = [];

    if (answer.units) {
      messages.push({
        type: 'info',
        message: `Units required: ${answer.units}`,
        field: 'answer'
      });
    }

    if (answer.tolerance) {
      const toleranceStr = answer.tolerance.abs
        ? `±${answer.tolerance.abs}`
        : `±${answer.tolerance.pct}%`;
      messages.push({
        type: 'info',
        message: `Tolerance: ${toleranceStr}`,
        field: 'validation'
      });
    }

    return messages;
  }
}

// Main Subject Adapter
export class SubjectAdapter {
  static getComplianceMessages(
    subject: QuestionSubject | string | undefined,
    answer: AnswerAlternative,
    examBoard?: string,
    marks?: number
  ): ComplianceMessage[] {
    if (!subject) return [];

    const subjectLower = subject.toLowerCase();

    if (subjectLower.includes('chemistry')) {
      return ChemistryAdapter.getComplianceMessages(answer, examBoard);
    }

    if (subjectLower.includes('biology')) {
      return BiologyAdapter.getComplianceMessages(answer);
    }

    if (subjectLower.includes('math')) {
      return MathematicsAdapter.getComplianceMessages(answer, marks || 0);
    }

    if (subjectLower.includes('physics')) {
      return PhysicsAdapter.getComplianceMessages(answer);
    }

    return [];
  }

  static validateAnswer(
    subject: QuestionSubject | string | undefined,
    userAnswer: string | number,
    correctAnswer: AnswerAlternative,
    context?: any
  ): { isValid: boolean; feedback: string; alternatives?: string[] } {
    if (!subject) {
      return { isValid: false, feedback: 'No subject specified' };
    }

    const subjectLower = subject.toLowerCase();

    // Chemistry validation
    if (subjectLower.includes('chemistry') && typeof userAnswer === 'string') {
      if (context?.testType === 'gas') {
        return ChemistryAdapter.validateGasTest(userAnswer, correctAnswer.answer);
      }
    }

    // Biology validation
    if (subjectLower.includes('biology') && typeof userAnswer === 'string') {
      if (context?.type === 'diagram_label') {
        const result = BiologyAdapter.validateDiagramLabel(userAnswer, correctAnswer.answer);
        return {
          isValid: result.isValid,
          feedback: result.isValid ? 'Correct' : 'Incorrect label',
          alternatives: result.alternatives
        };
      }
    }

    // Mathematics validation
    if (subjectLower.includes('math') && typeof userAnswer === 'number') {
      return MathematicsAdapter.validateNumericalPrecision(
        userAnswer,
        parseFloat(correctAnswer.answer),
        correctAnswer.tolerance,
        context?.significantFigures
      );
    }

    // Physics validation
    if (subjectLower.includes('physics') && typeof userAnswer === 'number') {
      return PhysicsAdapter.validateNumericalAnswer(
        userAnswer,
        context?.units || '',
        correctAnswer
      );
    }

    // Default validation
    const userStr = String(userAnswer).toLowerCase().trim();
    const correctStr = String(correctAnswer.answer).toLowerCase().trim();

    return {
      isValid: userStr === correctStr,
      feedback: userStr === correctStr ? 'Correct' : 'Incorrect'
    };
  }
}
