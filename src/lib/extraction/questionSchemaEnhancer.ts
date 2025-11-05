/**
 * Question Schema Enhancer
 *
 * Enhances question JSON structures with:
 * - is_container: Flag indicating if element only provides context for sub-elements
 * - has_direct_answer: Flag indicating if element expects a direct answer
 * - Improved hierarchy support for parts and subparts
 */

import { detectAnswerExpectation } from './answerExpectationDetector';

export interface EnhancedQuestionBase {
  id?: string;
  question_number?: string;
  question_text?: string;
  question_description?: string;
  marks?: number;
  figure?: boolean;
  attachments?: any[];
  correct_answers?: any[];
  answer_format?: string;
  answer_requirement?: string;
  hint?: string;
  explanation?: string;
  topic?: string;
  subtopic?: string;
  unit?: string;
  difficulty?: string;

  // NEW FLAGS
  is_container?: boolean;
  has_direct_answer?: boolean;
}

export interface EnhancedSubpart extends EnhancedQuestionBase {
  subpart_id?: string;
  subpart_label?: string;
  subpart_number?: string;
}

export interface EnhancedPart extends EnhancedQuestionBase {
  part_id?: string;
  part_label?: string;
  part_number?: string;
  subparts?: EnhancedSubpart[];
}

export interface EnhancedQuestion extends EnhancedQuestionBase {
  type?: string;
  parts?: EnhancedPart[];
}

export interface EnhancedPaper {
  exam_board?: string;
  qualification?: string;
  subject?: string;
  paper_code?: string;
  paper_name?: string;
  exam_year?: number;
  exam_session?: string;
  paper_duration?: string;
  total_marks?: number;
  region?: string;
  questions: EnhancedQuestion[];
}

/**
 * Enhance a single subpart with answer expectation flags
 */
export function enhanceSubpart(subpart: any, index: number): EnhancedSubpart {
  // Subparts ALWAYS require direct answers (Level 3 in hierarchy)
  const expectation = detectAnswerExpectation(subpart, {
    hasSubparts: false,
    level: 'subpart'
  });

  // Use proper roman numerals for subpart labels
  const romanNumerals = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii'];

  return {
    ...subpart,
    subpart_id: subpart.subpart_id || `subpart_${index}`,
    subpart_label: subpart.subpart_label || romanNumerals[index] || String(index + 1),
    is_container: false, // Subparts never contain other elements
    has_direct_answer: true, // Subparts always require answers
  };
}

/**
 * Enhance a single part with answer expectation flags
 */
export function enhancePart(part: any, index: number): EnhancedPart {
  const hasSubparts = part.subparts && part.subparts.length > 0;

  // Detect if this part expects a direct answer
  const expectation = detectAnswerExpectation(part, {
    hasSubparts,
    level: 'part'
  });

  // Enhance subparts if they exist
  const enhancedSubparts = hasSubparts
    ? part.subparts.map((subpart: any, subIdx: number) => enhanceSubpart(subpart, subIdx))
    : undefined;

  return {
    ...part,
    part_id: part.part_id || `part_${index}`,
    part_label: part.part_label || String.fromCharCode(97 + index), // a, b, c...
    is_container: hasSubparts && !expectation.has_direct_answer,
    has_direct_answer: expectation.has_direct_answer,
    subparts: enhancedSubparts,
  };
}

/**
 * Enhance a single question with answer expectation flags
 */
export function enhanceQuestion(question: any, index: number): EnhancedQuestion {
  const hasParts = question.parts && question.parts.length > 0;

  // Detect if this question expects a direct answer
  const expectation = detectAnswerExpectation(question, {
    hasSubparts: hasParts,
    level: 'main'
  });

  // Enhance parts if they exist
  const enhancedParts = hasParts
    ? question.parts.map((part: any, partIdx: number) => enhancePart(part, partIdx))
    : undefined;

  return {
    ...question,
    id: question.id || `question_${index}`,
    question_number: question.question_number || String(index + 1),
    is_container: hasParts && !expectation.has_direct_answer,
    has_direct_answer: expectation.has_direct_answer,
    parts: enhancedParts,
  };
}

/**
 * Enhance an entire paper with answer expectation flags
 */
export function enhancePaper(paper: any): EnhancedPaper {
  return {
    ...paper,
    questions: paper.questions.map((question: any, index: number) =>
      enhanceQuestion(question, index)
    ),
  };
}

/**
 * Enhance questions array (for direct import)
 */
export function enhanceQuestions(questions: any[]): EnhancedQuestion[] {
  return questions.map((question, index) => enhanceQuestion(question, index));
}

/**
 * Calculate marks rollup for hierarchical questions
 */
export function calculateMarksRollup(question: EnhancedQuestion): {
  totalMarks: number;
  directMarks: number;
  childMarks: number;
  breakdown: {
    parts?: Array<{
      label: string;
      marks: number;
      subparts?: Array<{ label: string; marks: number }>;
    }>;
  };
} {
  let directMarks = 0;
  let childMarks = 0;
  const breakdown: any = {};

  // If question has direct answer, count its marks
  if (question.has_direct_answer && question.marks) {
    directMarks = question.marks;
  }

  // Calculate child marks from parts
  if (question.parts && question.parts.length > 0) {
    breakdown.parts = [];

    for (const part of question.parts) {
      let partDirectMarks = 0;
      let partChildMarks = 0;
      const partBreakdown: any = {
        label: part.part_label || '',
        marks: part.marks || 0,
      };

      // Part direct marks
      if (part.has_direct_answer && part.marks) {
        partDirectMarks = part.marks;
      }

      // Subpart marks
      if (part.subparts && part.subparts.length > 0) {
        partBreakdown.subparts = [];

        for (const subpart of part.subparts) {
          const subpartMarks = subpart.marks || 0;
          partChildMarks += subpartMarks;
          partBreakdown.subparts.push({
            label: subpart.subpart_label || '',
            marks: subpartMarks,
          });
        }
      }

      const partTotalMarks = partDirectMarks + partChildMarks;
      partBreakdown.marks = partTotalMarks;
      childMarks += partTotalMarks;
      breakdown.parts.push(partBreakdown);
    }
  }

  const totalMarks = directMarks + childMarks;

  return {
    totalMarks,
    directMarks,
    childMarks,
    breakdown,
  };
}

/**
 * Validate enhanced question structure
 */
export function validateEnhancedQuestion(question: EnhancedQuestion): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check marks rollup
  const marksRollup = calculateMarksRollup(question);
  if (question.marks && question.marks !== marksRollup.totalMarks) {
    warnings.push(
      `Question marks mismatch: declared ${question.marks}, calculated ${marksRollup.totalMarks}`
    );
  }

  // Check is_container consistency
  if (question.is_container && question.has_direct_answer) {
    errors.push('Question cannot be both a container and have a direct answer');
  }

  // Check parts
  if (question.parts) {
    question.parts.forEach((part, partIdx) => {
      if (part.is_container && part.has_direct_answer) {
        errors.push(`Part ${part.part_label} cannot be both a container and have a direct answer`);
      }

      // If part is container, must have subparts
      if (part.is_container && (!part.subparts || part.subparts.length === 0)) {
        errors.push(`Part ${part.part_label} is marked as container but has no subparts`);
      }

      // Check subparts
      if (part.subparts) {
        part.subparts.forEach((subpart, subIdx) => {
          // Subparts should never be containers
          if (subpart.is_container) {
            errors.push(`Subpart ${subpart.subpart_label} should not be a container`);
          }

          // Subparts should always have direct answers
          if (!subpart.has_direct_answer) {
            warnings.push(`Subpart ${subpart.subpart_label} should have a direct answer`);
          }
        });
      }
    });
  }

  // Check answer expectation consistency
  if (question.has_direct_answer) {
    if (!question.answer_format && !question.correct_answers?.length) {
      warnings.push('Question expects answer but has no answer_format or correct_answers');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Generate enhanced schema documentation
 */
export function getSchemaDocumentation(): string {
  return `
# Enhanced Question Schema

## New Fields

### is_container (boolean)
- **Purpose**: Indicates if the element only provides context for child elements
- **Usage**:
  - true: Element is contextual-only, provides context for parts/subparts
  - false: Element may have a direct answer expected
- **Rules**:
  - Questions: true if has parts but no direct answer expected
  - Parts: true if has subparts but no direct answer expected
  - Subparts: always false (leaf nodes)

### has_direct_answer (boolean)
- **Purpose**: Indicates if a direct answer is expected for this element
- **Usage**:
  - true: User should provide an answer at this level
  - false: No answer expected at this level
- **Rules**:
  - Questions: depends on content analysis (see answerExpectationDetector)
  - Parts: depends on content analysis and presence of subparts
  - Subparts: always true (leaf nodes always require answers)

## Hierarchy Rules

### Level 1: Question
- Can have parts (children)
- Can be container OR have direct answer (mutually exclusive)
- If container: is_container=true, has_direct_answer=false
- If answerable: is_container=false, has_direct_answer=true

### Level 2: Part
- Can have subparts (children)
- Can be container OR have direct answer (mutually exclusive)
- If container: is_container=true, has_direct_answer=false
- If answerable: is_container=false, has_direct_answer=true

### Level 3: Subpart
- Leaf node (cannot have children)
- Always answerable: is_container=false, has_direct_answer=true

## Marks Rollup

Marks are calculated as:
- Question total = Question direct marks + Sum of all part marks
- Part total = Part direct marks + Sum of all subpart marks
- Subpart total = Subpart marks (no children)

## Example Structure

\`\`\`json
{
  "question_number": "1",
  "question_text": "Fig 1.1 shows the production of ammonia.",
  "marks": 12,
  "is_container": true,
  "has_direct_answer": false,
  "parts": [
    {
      "part_label": "a",
      "question_text": "Name the process shown.",
      "marks": 1,
      "is_container": false,
      "has_direct_answer": true,
      "answer_format": "single_word"
    },
    {
      "part_label": "b",
      "question_text": "Explain the conditions needed.",
      "marks": 6,
      "is_container": true,
      "has_direct_answer": false,
      "subparts": [
        {
          "subpart_label": "i",
          "question_text": "State the temperature used.",
          "marks": 1,
          "is_container": false,
          "has_direct_answer": true
        },
        {
          "subpart_label": "ii",
          "question_text": "Explain why this temperature is used.",
          "marks": 2,
          "is_container": false,
          "has_direct_answer": true
        }
      ]
    }
  ]
}
\`\`\`
`;
}
