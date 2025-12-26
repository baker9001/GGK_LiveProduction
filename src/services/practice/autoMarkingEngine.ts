import dayjs from 'dayjs';
import { QuestionMasterAdmin } from '@/types/questions';
import {
  AnswerSubmissionPayload,
  AutoMarkPointAward,
  AutoMarkPointDenied,
  AutoMarkResult
} from '@/types/practice';

export interface RawCorrectAnswerRow {
  id: string;
  question_id: string;
  sub_question_id: string | null;
  answer: string;
  marks: number | null;
  alternative_id: number | null;
  alternative_type?: string | null;
  linked_alternatives?: number[] | null;
  context_type: string | null;
  context_value: string | null;
  context_label: string | null;
}

export interface RawAnswerComponentRow {
  id: string;
  question_id: string | null;
  sub_question_id: string | null;
  alternative_id: number;
  alternative_type?: string | null;
  linked_alternatives?: number[] | null;
  answer_text: string;
  marks: number;
  context_type: string;
  context_value: string;
  context_label: string | null;
  is_correct: boolean;
}

export interface RawQuestionOptionRow {
  id: string;
  question_id: string | null;
  sub_question_id: string | null;
  label: string | null;
  text: string | null;
  explanation: string | null;
}

interface MarkingPoint {
  id: string;
  marks: number;
  requirement: 'one_required' | 'all_required' | 'any_from';
  quantityRequired?: number;
  alternatives: string[];
  annotations: MarkingAnnotations;
  dependencies: string[];
  context: {
    type: string | null;
    value: string | null;
  };
}

interface MarkingAnnotations {
  owtte?: boolean;
  ora?: boolean;
  ecf?: boolean;
  method?: boolean;
  accuracy?: boolean;
  band?: string | null;
  unitsRequired?: boolean;
  diagram?: boolean;
  workingBox?: boolean;
  qwc?: boolean;
}

interface AutoMarkContext {
  question: QuestionMasterAdmin;
  correctAnswers: RawCorrectAnswerRow[];
  answerComponents: RawAnswerComponentRow[];
  options?: RawQuestionOptionRow[];
  rawAnswer: AnswerSubmissionPayload;
  board?: 'cambridge' | 'edexcel' | 'unknown';
  subjectArea?: 'mathematics' | 'physics' | 'chemistry' | 'biology' | 'general';
}

interface EvaluationResult {
  awarded: AutoMarkPointAward[];
  denied: AutoMarkPointDenied[];
  ecf: boolean;
  totalAwarded: number;
  totalAvailable: number;
  notes: string[];
}

const FRACTION_PATTERN = /(\d+)\s*\/\s*(\d+)/g;
const UNICODE_FRACTIONS: Record<string, string> = {
  '½': '1/2',
  '⅓': '1/3',
  '⅔': '2/3',
  '¼': '1/4',
  '¾': '3/4',
  '⅕': '1/5',
  '⅖': '2/5',
  '⅗': '3/5',
  '⅘': '4/5',
  '⅙': '1/6',
  '⅚': '5/6',
  '⅛': '1/8',
  '⅜': '3/8',
  '⅝': '5/8',
  '⅞': '7/8'
};

const COMMAND_WORDS = [
  'state',
  'describe',
  'explain',
  'calculate',
  'determine',
  'deduce',
  'estimate',
  'prove',
  'show that',
  'sketch',
  'plot',
  'label'
];

export function autoMarkQuestion(context: AutoMarkContext): AutoMarkResult {
  const normalized = buildMarkingPoints(context);
  const responseTokens = normalizeStudentResponse(context.rawAnswer, context.subjectArea);
  const evalResult = evaluateMarkingPoints(normalized, responseTokens, context);

  // Enhanced debug logging for complex question marking
  if (process.env.NODE_ENV === 'development') {
    console.group(`[Auto-Marking] Question ${context.question.id}`);
    console.log('Marking Points:', normalized);
    console.log('Student Response Tokens:', responseTokens);
    console.log('Evaluation Result:', evalResult);
    console.log('Total Awarded:', evalResult.totalAwarded, '/', evalResult.totalAvailable);
    if (evalResult.denied.length > 0) {
      console.warn('Denied Points:', evalResult.denied);
    }
    console.groupEnd();
  }

  return {
    awarded: evalResult.awarded,
    denied: evalResult.denied,
    ecf: evalResult.ecf,
    notes: evalResult.notes,
    explanationId: deriveExplanationId(context.question),
    totalAwarded: evalResult.totalAwarded,
    totalAvailable: evalResult.totalAvailable
  };
}

function buildMarkingPoints(context: AutoMarkContext): MarkingPoint[] {
  const points: MarkingPoint[] = [];
  const seen = new Set<string>();

  if (!context.correctAnswers || !Array.isArray(context.correctAnswers)) {
    return points;
  }

  if (!context.answerComponents || !Array.isArray(context.answerComponents)) {
    context.answerComponents = [];
  }

  const records = context.answerComponents.length > 0 ? context.answerComponents : context.correctAnswers;

  if (!records || records.length === 0) {
    return points;
  }

  records.forEach((row, index) => {
    // CRITICAL FIX: Prioritize alternative_id over context_label for proper grouping
    // This ensures alternatives with same alternative_id are grouped as "any one acceptable"
    const id = row.alternative_id ? `alt_${row.alternative_id}` : (row.context_label || `P${index + 1}`);
    if (seen.has(id)) {
      return;
    }
    seen.add(id);

    const related = records.filter((candidate) => {
      // First priority: group by alternative_id if both have it
      if ('alternative_id' in candidate && 'alternative_id' in row &&
          candidate.alternative_id && row.alternative_id) {
        return candidate.alternative_id === row.alternative_id;
      }
      // Second priority: group by context_label if alternative_id doesn't match
      if (candidate.context_label && row.context_label) {
        return candidate.context_label === row.context_label;
      }
      // Fallback: only include the exact same row
      return candidate === row;
    });

    // Determine requirement type from database field or fallback to text parsing
    const requirement = determineRequirement(related.map((entry) => entry.answer), related);

    // CRITICAL FIX: For one_required alternatives, don't sum marks - take first alternative's marks
    // For all_required, sum all marks as before
    const baseMarks = requirement === 'one_required' && related.length > 1
      ? (related[0]?.marks ?? 0)
      : related.reduce((sum, entry) => sum + (entry.marks ?? 0), 0);

    const annotations = deriveAnnotations(related.map((entry) => entry.answer));
    const alternatives = related.flatMap((entry) => parseAlternatives(entry.answer));
    const dependencies = collectDependencies(related.map((entry) => entry.answer));

    points.push({
      id,
      marks: baseMarks || context.question.marks || 1,
      requirement,
      alternatives,
      annotations,
      dependencies,
      context: {
        type: 'context_type' in row ? row.context_type ?? null : null,
        value: 'context_value' in row ? row.context_value ?? null : null
      }
    });
  });

  return points;
}

function deriveAnnotations(answers: string[]): MarkingAnnotations {
  const annotations: MarkingAnnotations = {};
  answers.forEach((raw) => {
    const lower = raw.toLowerCase();
    if (lower.includes('owtte')) {
      annotations.owtte = true;
    }
    if (lower.includes('ora')) {
      annotations.ora = true;
    }
    if (lower.includes('ecf')) {
      annotations.ecf = true;
    }
    if (lower.includes('method') || /\bM\d+\b/.test(raw)) {
      annotations.method = true;
    }
    if (lower.includes('accuracy') || /\bA\d+\b/.test(raw)) {
      annotations.accuracy = true;
    }
    if (lower.includes('sig fig') || lower.includes('significant figures') || lower.includes('dp')) {
      annotations.accuracy = true;
    }
    if (lower.includes('diagram')) {
      annotations.diagram = true;
    }
    if (lower.includes('working box')) {
      annotations.workingBox = true;
    }
    if (lower.includes('qwc')) {
      annotations.qwc = true;
    }
    if (lower.includes('unit')) {
      annotations.unitsRequired = true;
    }
  });
  return annotations;
}

function determineRequirement(
  answers: string[],
  rows?: (RawCorrectAnswerRow | RawAnswerComponentRow)[]
): MarkingPoint['requirement'] {
  // CRITICAL FIX: Check database field first before parsing text
  if (rows && rows.length > 0) {
    const explicitType = rows[0].alternative_type;
    if (explicitType === 'one_required') return 'one_required';
    if (explicitType === 'all_required') return 'all_required';
    if (explicitType === 'standalone') return 'one_required';
    if (explicitType === 'structure_function_pair') return 'all_required'; // Both structure and function must be correct
    if (explicitType === 'two_required') return 'any_from'; // Any 2 required
    if (explicitType === 'three_required') return 'any_from'; // Any 3 required
  }

  // Fallback: parse from answer text content
  if (answers.some((text) => /\ball\b/i.test(text) || /\bboth\b/i.test(text) || text.includes(' AND '))) {
    return 'all_required';
  }
  if (answers.some((text) => /any\s*\d+/i.test(text))) {
    return 'any_from';
  }
  return 'one_required';
}

function collectDependencies(answers: string[]): string[] {
  const dependencies: string[] = [];
  answers.forEach((text) => {
    const match = text.match(/depends?\s+on\s+([A-Z]\d+)/i);
    if (match) {
      dependencies.push(match[1]);
    }
  });
  return dependencies;
}

function parseAlternatives(answer: string): string[] {
  const cleaned = replaceUnicodeFractions(answer)
    .replace(/\(.*?\)/g, '')
    .replace(/\b(owtte|ora|ecf)\b/gi, '')
    .replace(/\b\d+\s*m?\b(?=\))/gi, '');

  const fractions: string[] = [];
  const working = cleaned.replace(FRACTION_PATTERN, (_, numerator: string, denominator: string) => {
    const index = fractions.length;
    fractions.push(`${numerator}/${denominator}`);
    return `__FRACTION_${index}__`;
  });

  const parts = working
    .split('/')
    .map((segment) => segment.split(/\bor\b/i))
    .flat()
    .map((segment) => segment.split(/\band\b/i))
    .flat()
    .map((segment) => segment.trim())
    .filter(Boolean);

  return parts.map((segment) =>
    segment.replace(/__FRACTION_(\d+)__/g, (_, index) => fractions[Number(index)]).trim()
  );
}

function replaceUnicodeFractions(value: string): string {
  return value
    .split('')
    .map((char) => UNICODE_FRACTIONS[char] ?? char)
    .join('');
}

function normalizeStudentResponse(raw: AnswerSubmissionPayload, subject?: AutoMarkContext['subjectArea']): string[] {
  const values: string[] = [];

  const addValue = (value: unknown) => {
    if (value === null || value === undefined) {
      return;
    }
    if (typeof value === 'string') {
      values.push(...value.split(/\n|;|\||,/g).map((entry) => entry.trim()).filter(Boolean));
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(addValue);
      return;
    }
    if (typeof value === 'number') {
      values.push(value.toString());
      return;
    }
    if (typeof value === 'object') {
      Object.values(value as Record<string, unknown>).forEach(addValue);
    }
  };

  addValue(raw.value);
  if (raw.working) {
    addValue(raw.working);
  }
  if (raw.units) {
    values.push(raw.units);
  }

  return values.map((entry) => normalizeText(entry, subject));
}

function normalizeText(value: string, subject?: AutoMarkContext['subjectArea']): string {
  let text = replaceUnicodeFractions(value)
    .replace(/\[(owtte|ora|ecf)]/gi, '')
    .replace(/\b(owtte|ora|ecf)\b/gi, '')
    .trim();

  text = text.replace(/[“”"']/g, '').replace(/\s+/g, ' ').toLowerCase();
  text = text.replace(/−/g, '-');
  text = text.replace(/°c/g, 'degc');
  text = text.replace(/°f/g, 'degf');

  text = text.replace(FRACTION_PATTERN, (_, numerator: string, denominator: string) => {
    const decimal = parseFloat(numerator) / parseFloat(denominator);
    if (!Number.isFinite(decimal)) {
      return `${numerator}/${denominator}`;
    }
    return decimal.toString();
  });

  text = text.replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\b/g, (match) => {
    const mapping: Record<string, string> = {
      one: '1',
      two: '2',
      three: '3',
      four: '4',
      five: '5',
      six: '6',
      seven: '7',
      eight: '8',
      nine: '9',
      ten: '10'
    };
    return mapping[match as keyof typeof mapping] ?? match;
  });

  if (subject === 'mathematics') {
    text = text.replace(/pi/g, 'π');
  }

  return text.trim();
}

function evaluateMarkingPoints(
  points: MarkingPoint[],
  responses: string[],
  context: AutoMarkContext
): EvaluationResult {
  const awarded: AutoMarkPointAward[] = [];
  const denied: AutoMarkPointDenied[] = [];
  const notes: string[] = [];
  let ecf = false;
  let totalAwarded = 0;
  let totalAvailable = 0;

  points.forEach((point) => {
    totalAvailable += point.marks;
    const evaluation = evaluatePoint(point, responses, context);

    if (evaluation.matched) {
      totalAwarded += point.marks;
      awarded.push({
        pointId: point.id,
        marks: point.marks,
        notes: evaluation.notes.length ? evaluation.notes.join('; ') : undefined
      });
    } else {
      denied.push({
        pointId: point.id,
        reason: evaluation.reason ?? 'response not matched',
        expected: point.alternatives.join(' / ')
      });
    }

    if (evaluation.notes.length) {
      notes.push(...evaluation.notes);
    }
    if (evaluation.ecfApplied) {
      ecf = true;
    }
  });

  if (!totalAvailable) {
    totalAvailable = context.question.marks || 0;
  }

  return {
    awarded,
    denied,
    ecf,
    totalAwarded,
    totalAvailable,
    notes
  };
}

interface PointEvaluation {
  matched: boolean;
  reason?: string;
  notes: string[];
  ecfApplied: boolean;
}

function evaluatePoint(point: MarkingPoint, responses: string[], context: AutoMarkContext): PointEvaluation {
  const notes: string[] = [];
  let ecfApplied = false;

  const requirement = point.requirement;
  const alternatives = point.alternatives.map((entry) => normalizeText(entry, context.subjectArea));

  const matchesAlternative = (candidate: string): boolean => {
    return responses.some((response) => responseMatches(response, candidate, point, context, notes));
  };

  let matched = false;

  if (requirement === 'all_required') {
    matched = alternatives.every(matchesAlternative);
    if (!matched) {
      return { matched, reason: 'missing required component', notes, ecfApplied };
    }
  } else if (requirement === 'any_from') {
    const quantity = point.quantityRequired ?? 1;
    const count = alternatives.filter(matchesAlternative).length;
    matched = count >= quantity;
    if (!matched) {
      return {
        matched,
        reason: `requires ${quantity} of ${alternatives.length} responses`,
        notes,
        ecfApplied
      };
    }
  } else {
    matched = alternatives.some(matchesAlternative);
    if (!matched) {
      return { matched, reason: 'no alternative matched', notes, ecfApplied };
    }
  }

  if (point.annotations.ecf) {
    ecfApplied = true;
    notes.push('ecf applied');
  }

  if (point.annotations.method) {
    notes.push('method mark awarded');
  }
  if (point.annotations.accuracy) {
    notes.push('accuracy requirement satisfied');
  }
  if (point.annotations.owtte) {
    notes.push('owtte matched');
  }
  if (point.annotations.ora) {
    notes.push('ora accepted');
  }

  return { matched, notes, ecfApplied };
}

function responseMatches(
  response: string,
  candidate: string,
  point: MarkingPoint,
  context: AutoMarkContext,
  notes: string[]
): boolean {
  if (!candidate) {
    return false;
  }

  if (candidate === response) {
    return true;
  }

  if (areEquivalentNumbers(candidate, response)) {
    notes.push('accepted numerical equivalent');
    return true;
  }

  if (point.annotations.unitsRequired) {
    if (matchWithUnits(candidate, response)) {
      notes.push('unit validated');
      return true;
    }
  }

  if (point.annotations.owtte && lexicalSimilarity(candidate, response) >= 0.7) {
    return true;
  }

  if (point.annotations.ora && checkOra(candidate, response)) {
    return true;
  }

  if (context.subjectArea === 'chemistry' && matchChemistry(candidate, response)) {
    notes.push('accepted chemistry equivalent');
    return true;
  }

  if (context.subjectArea === 'biology' && matchBiology(candidate, response)) {
    notes.push('accepted biological equivalent');
    return true;
  }

  if (context.subjectArea === 'physics' && matchPhysics(candidate, response)) {
    notes.push('accepted physics equivalent');
    return true;
  }

  if (context.subjectArea === 'mathematics' && matchMathematics(candidate, response)) {
    notes.push('accepted mathematical equivalent');
    return true;
  }

  if (COMMAND_WORDS.some((command) => candidate.startsWith(command))) {
    return lexicalSimilarity(candidate, response) >= 0.6;
  }

  return false;
}

function areEquivalentNumbers(candidate: string, response: string): boolean {
  const candidateValue = parseFloat(candidate.replace(/[^0-9.-]/g, ''));
  const responseValue = parseFloat(response.replace(/[^0-9.-]/g, ''));
  if (Number.isFinite(candidateValue) && Number.isFinite(responseValue)) {
    const tolerance = Math.max(Math.abs(candidateValue), 1) * 0.01; // 1% tolerance
    return Math.abs(candidateValue - responseValue) <= tolerance;
  }
  return false;
}

function matchWithUnits(candidate: string, response: string): boolean {
  const unitPattern = /([0-9.]+)\s*([a-zμ°/%-]+)/i;
  const candidateMatch = candidate.match(unitPattern);
  const responseMatch = response.match(unitPattern);
  if (!candidateMatch || !responseMatch) {
    return false;
  }
  const [, candidateValue, candidateUnit] = candidateMatch;
  const [, responseValue, responseUnit] = responseMatch;
  if (!candidateUnit || !responseUnit) {
    return false;
  }
  return areEquivalentNumbers(candidateValue, responseValue) && normaliseUnit(candidateUnit) === normaliseUnit(responseUnit);
}

function normaliseUnit(unit: string): string {
  return unit
    .replace(/seconds|second|sec|s\b/g, 's')
    .replace(/metres|meter|metre|mtr|m\b/g, 'm')
    .replace(/kilograms|kilogram|kg\b/g, 'kg')
    .replace(/newtons|newton|n\b/g, 'n')
    .replace(/volts|volt|v\b/g, 'v')
    .replace(/amps|ampere|amp|a\b/g, 'a')
    .replace(/celsius|degrees c|degc/g, 'degc')
    .trim();
}

function lexicalSimilarity(a: string, b: string): number {
  const tokensA = new Set(a.split(' '));
  const tokensB = new Set(b.split(' '));
  const intersection = new Set([...tokensA].filter((token) => tokensB.has(token)));
  const union = new Set([...tokensA, ...tokensB]);
  if (union.size === 0) {
    return 0;
  }
  return intersection.size / union.size;
}

function checkOra(candidate: string, response: string): boolean {
  const reversedCandidate = candidate.split(' ').reverse().join(' ');
  return lexicalSimilarity(reversedCandidate, response) >= 0.7;
}

function matchChemistry(candidate: string, response: string): boolean {
  const normalizedCandidate = candidate.replace(/\s+/g, '');
  const normalizedResponse = response.replace(/\s+/g, '');
  if (normalizedCandidate === normalizedResponse) {
    return true;
  }
  const candidateCharges = normalizedCandidate.replace(/\^/g, '');
  const responseCharges = normalizedResponse.replace(/\^/g, '');
  return candidateCharges === responseCharges;
}

function matchBiology(candidate: string, response: string): boolean {
  return lexicalSimilarity(candidate, response) >= 0.65;
}

function matchPhysics(candidate: string, response: string): boolean {
  if (matchWithUnits(candidate, response)) {
    return true;
  }
  return lexicalSimilarity(candidate, response) >= 0.6;
}

function matchMathematics(candidate: string, response: string): boolean {
  if (areEquivalentNumbers(candidate, response)) {
    return true;
  }
  const sanitizedCandidate = candidate.replace(/\s+/g, '');
  const sanitizedResponse = response.replace(/\s+/g, '');
  return sanitizedCandidate === sanitizedResponse;
}

function deriveExplanationId(question: QuestionMasterAdmin): string | undefined {
  if (question.question_number) {
    return `${question.question_number}`;
  }
  if (question.paper_id && question.id) {
    return `${question.paper_id}-${question.id}`;
  }
  return undefined;
}

export function detectBoard(paperCode?: string | null): AutoMarkContext['board'] {
  if (!paperCode) {
    return 'unknown';
  }
  const code = paperCode.toUpperCase();
  if (/^\d{4}\//.test(code)) {
    return 'cambridge';
  }
  if (/^4[A-Z]{2}\d\//.test(code) || /^4\w{2}\d\//.test(code) || code.includes('EDEXCEL')) {
    return 'edexcel';
  }
  return 'unknown';
}

export function detectSubjectArea(subjectName?: string | null): AutoMarkContext['subjectArea'] {
  if (!subjectName) {
    return 'general';
  }
  const name = subjectName.toLowerCase();
  if (name.includes('math')) {
    return 'mathematics';
  }
  if (name.includes('phys')) {
    return 'physics';
  }
  if (name.includes('chem')) {
    return 'chemistry';
  }
  if (name.includes('bio')) {
    return 'biology';
  }
  return 'general';
}

export function calculateSpeedBonus(startedAt: string, submittedAt: string, baselineSeconds = 90): number {
  const duration = dayjs(submittedAt).diff(dayjs(startedAt), 'second');
  if (duration <= 0) {
    return 0;
  }
  if (duration < baselineSeconds) {
    return Math.ceil((baselineSeconds - duration) / 10);
  }
  return 0;
}
