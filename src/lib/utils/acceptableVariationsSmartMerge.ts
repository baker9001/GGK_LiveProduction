/**
 * Smart Merge Strategy for acceptable_variations
 *
 * This utility handles the intelligent merging of acceptable_variations from
 * raw_json (immutable backup) and working_json (editable working copy).
 *
 * Strategy:
 * - Use working_json IF the field exists (respects user edits)
 * - Restore from raw_json IF field is completely missing (protects against data loss bugs)
 * - Distinguishes between "user cleared it" vs "bug stripped it"
 */

interface AnswerWithVariations {
  acceptable_variations?: string[];
  [key: string]: any;
}

interface AnswerContext {
  type?: string;
  value?: string;
  label?: string;
  [key: string]: any;
}

interface CorrectAnswer extends AnswerWithVariations {
  answer?: string;
  marks?: number;
  alternative_id?: number;
  context?: AnswerContext;
}

interface SubPart {
  correct_answers?: CorrectAnswer[];
  [key: string]: any;
}

interface Part {
  correct_answers?: CorrectAnswer[];
  subparts?: SubPart[];
  [key: string]: any;
}

interface Question {
  id?: string;
  correct_answers?: CorrectAnswer[];
  parts?: Part[];
  [key: string]: any;
}

/**
 * Determines if a field exists in an object (even if it's null or empty array)
 * This is critical to distinguish between intentional removal vs data loss
 */
function hasField<T extends Record<string, any>>(obj: T, fieldName: keyof T): boolean {
  return Object.prototype.hasOwnProperty.call(obj, fieldName);
}

/**
 * Merges acceptable_variations for a single answer object
 * Priority: working answer (if field exists) > raw answer (fallback)
 */
export function mergeAnswerVariations(
  workingAnswer: CorrectAnswer | undefined,
  rawAnswer: CorrectAnswer | undefined
): string[] {
  // If working answer exists and has the field (even if empty), respect it
  if (workingAnswer && hasField(workingAnswer, 'acceptable_variations')) {
    return workingAnswer.acceptable_variations || [];
  }

  // Field is missing - restore from raw_json if available
  if (rawAnswer?.acceptable_variations) {
    console.warn(
      '[Smart Merge] Restoring lost acceptable_variations from raw_json',
      { rawVariations: rawAnswer.acceptable_variations }
    );
    return rawAnswer.acceptable_variations;
  }

  // Never existed in either source
  return [];
}

/**
 * Merges correct_answers array, ensuring acceptable_variations are preserved
 */
export function mergeCorrectAnswers(
  workingAnswers: CorrectAnswer[] | undefined,
  rawAnswers: CorrectAnswer[] | undefined
): CorrectAnswer[] {
  if (!workingAnswers && !rawAnswers) return [];

  const answers = workingAnswers || rawAnswers || [];
  const rawAnswersMap = new Map<number, CorrectAnswer>();

  // Build map of raw answers by alternative_id for quick lookup
  if (rawAnswers) {
    rawAnswers.forEach((rawAns) => {
      const altId = rawAns.alternative_id ?? 0;
      rawAnswersMap.set(altId, rawAns);
    });
  }

  // Merge each answer
  return answers.map((workingAns) => {
    const altId = workingAns.alternative_id ?? 0;
    const rawAns = rawAnswersMap.get(altId);

    return {
      ...workingAns,
      acceptable_variations: mergeAnswerVariations(workingAns, rawAns)
    };
  });
}

/**
 * Merges subparts, preserving acceptable_variations
 */
export function mergeSubparts(
  workingSubparts: SubPart[] | undefined,
  rawSubparts: SubPart[] | undefined
): SubPart[] {
  if (!workingSubparts && !rawSubparts) return [];

  const subparts = workingSubparts || rawSubparts || [];
  const rawSubpartsMap = new Map<string, SubPart>();

  // Build map by part_label or index
  if (rawSubparts) {
    rawSubparts.forEach((rawSp, index) => {
      const key = (rawSp as any).part_label || (rawSp as any).part || index.toString();
      rawSubpartsMap.set(key, rawSp);
    });
  }

  return subparts.map((workingSp, index) => {
    const key = (workingSp as any).part_label || (workingSp as any).part || index.toString();
    const rawSp = rawSubpartsMap.get(key);

    return {
      ...workingSp,
      correct_answers: mergeCorrectAnswers(
        workingSp.correct_answers,
        rawSp?.correct_answers
      )
    };
  });
}

/**
 * Merges parts, preserving acceptable_variations in answers and subparts
 */
export function mergeParts(
  workingParts: Part[] | undefined,
  rawParts: Part[] | undefined
): Part[] {
  if (!workingParts && !rawParts) return [];

  const parts = workingParts || rawParts || [];
  const rawPartsMap = new Map<string, Part>();

  // Build map by part_label or index
  if (rawParts) {
    rawParts.forEach((rawPart, index) => {
      const key = (rawPart as any).part_label || (rawPart as any).part || index.toString();
      rawPartsMap.set(key, rawPart);
    });
  }

  return parts.map((workingPart, index) => {
    const key = (workingPart as any).part_label || (workingPart as any).part || index.toString();
    const rawPart = rawPartsMap.get(key);

    return {
      ...workingPart,
      correct_answers: mergeCorrectAnswers(
        workingPart.correct_answers,
        rawPart?.correct_answers
      ),
      subparts: mergeSubparts(workingPart.subparts, rawPart?.subparts)
    };
  });
}

/**
 * Merges a single question, applying smart merge to all nested structures
 */
export function mergeQuestion(
  workingQuestion: Question,
  rawQuestion: Question | undefined
): Question {
  return {
    ...workingQuestion,
    correct_answers: mergeCorrectAnswers(
      workingQuestion.correct_answers,
      rawQuestion?.correct_answers
    ),
    parts: mergeParts(workingQuestion.parts, rawQuestion?.parts)
  };
}

/**
 * Merges all questions from working_json with raw_json backup
 * This is the main entry point for the smart merge strategy
 */
export function mergeQuestionsWithSmartVariations(
  workingQuestions: Question[],
  rawQuestions: Question[] | undefined
): Question[] {
  if (!rawQuestions || rawQuestions.length === 0) {
    return workingQuestions;
  }

  // Build map of raw questions by ID
  const rawQuestionsMap = new Map<string, Question>();
  rawQuestions.forEach((rawQ) => {
    if (rawQ.id) {
      rawQuestionsMap.set(rawQ.id, rawQ);
    }
  });

  // Merge each working question with its raw counterpart
  return workingQuestions.map((workingQ) => {
    const rawQ = workingQ.id ? rawQuestionsMap.get(workingQ.id) : undefined;
    return mergeQuestion(workingQ, rawQ);
  });
}

/**
 * Validates that acceptable_variations are preserved during save operations
 * Returns warnings (non-blocking) if data loss is detected
 */
export function validateVariationsBeforeSave(
  questionsToSave: Question[],
  originalRawQuestions: Question[] | undefined
): { warnings: string[]; lostVariationsCount: number } {
  const warnings: string[] = [];
  let lostVariationsCount = 0;

  if (!originalRawQuestions) {
    return { warnings, lostVariationsCount };
  }

  const rawQuestionsMap = new Map<string, Question>();
  originalRawQuestions.forEach((rawQ) => {
    if (rawQ.id) {
      rawQuestionsMap.set(rawQ.id, rawQ);
    }
  });

  questionsToSave.forEach((saveQ) => {
    const rawQ = saveQ.id ? rawQuestionsMap.get(saveQ.id) : undefined;
    if (!rawQ) return;

    // Check direct answers
    saveQ.correct_answers?.forEach((saveAns, idx) => {
      const rawAns = rawQ.correct_answers?.[idx];
      if (
        rawAns?.acceptable_variations?.length &&
        !hasField(saveAns, 'acceptable_variations')
      ) {
        warnings.push(
          `Question ${saveQ.id}: acceptable_variations missing in answer ${idx + 1}`
        );
        lostVariationsCount++;
      }
    });

    // Check parts
    saveQ.parts?.forEach((savePart, partIdx) => {
      const rawPart = rawQ.parts?.[partIdx];
      if (!rawPart) return;

      savePart.correct_answers?.forEach((saveAns, ansIdx) => {
        const rawAns = rawPart.correct_answers?.[ansIdx];
        if (
          rawAns?.acceptable_variations?.length &&
          !hasField(saveAns, 'acceptable_variations')
        ) {
          warnings.push(
            `Question ${saveQ.id}, Part ${partIdx + 1}: acceptable_variations missing in answer ${ansIdx + 1}`
          );
          lostVariationsCount++;
        }
      });

      // Check subparts
      savePart.subparts?.forEach((saveSubpart, subpartIdx) => {
        const rawSubpart = rawPart.subparts?.[subpartIdx];
        if (!rawSubpart) return;

        saveSubpart.correct_answers?.forEach((saveAns, ansIdx) => {
          const rawAns = rawSubpart.correct_answers?.[ansIdx];
          if (
            rawAns?.acceptable_variations?.length &&
            !hasField(saveAns, 'acceptable_variations')
          ) {
            warnings.push(
              `Question ${saveQ.id}, Part ${partIdx + 1}, Subpart ${subpartIdx + 1}: acceptable_variations missing`
            );
            lostVariationsCount++;
          }
        });
      });
    });
  });

  return { warnings, lostVariationsCount };
}
