// src/services/answerFieldAutoPopulationService.ts

import { supabase } from '../lib/supabase';
import { deriveAnswerFormat, deriveAnswerRequirement } from '../lib/constants/answerOptions';
import { detectAnswerExpectation } from '../lib/extraction/answerExpectationDetector';

interface QuestionData {
  id: string;
  type: string;
  question_description?: string;
  answer_format?: string | null;
  answer_requirement?: string | null;
  total_alternatives?: number | null;
  has_direct_answer?: boolean | null;
  is_contextual_only?: boolean | null;
}

interface CorrectAnswerData {
  answer: string;
  alternative_id?: number | null;
}

export interface AutoPopulationResult {
  questionsUpdated: number;
  subQuestionsUpdated: number;
  errors: Array<{
    questionId: string;
    error: string;
  }>;
}

/**
 * Auto-populate answer_format and answer_requirement for questions missing these fields
 * Uses intelligent heuristics based on question type, description, and correct answers
 */
export async function autoPopulateAnswerFields(
  paperId?: string
): Promise<AutoPopulationResult> {
  const result: AutoPopulationResult = {
    questionsUpdated: 0,
    subQuestionsUpdated: 0,
    errors: []
  };

  try {
    // Build query for main questions
    let mainQuestionsQuery = supabase
      .from('questions_master_admin')
      .select(`
        id,
        type,
        question_description,
        answer_format,
        answer_requirement,
        total_alternatives
      `)
      .or('answer_format.is.null,answer_requirement.is.null');

    if (paperId) {
      mainQuestionsQuery = mainQuestionsQuery.eq('paper_id', paperId);
    }

    const { data: questions, error: questionsError } = await mainQuestionsQuery;

    if (questionsError) throw questionsError;

    // Process each question
    for (const question of questions || []) {
      try {
        // Get correct answers for this question
        const { data: correctAnswers } = await supabase
          .from('question_correct_answers')
          .select('answer, alternative_id')
          .eq('question_id', question.id)
          .is('sub_question_id', null);

        // Get parts/subparts to check if question is contextual
        const { data: parts } = await supabase
          .from('sub_questions')
          .select('id')
          .eq('question_id', question.id);

        const hasSubparts = (parts?.length || 0) > 0;

        // Detect answer expectation first
        const answerExpectation = detectAnswerExpectation(
          {
            question_text: question.question_description,
            question_description: question.question_description,
            correct_answers: correctAnswers || [],
            answer_format: question.answer_format,
            answer_requirement: question.answer_requirement,
            parts: parts || []
          },
          {
            hasSubparts,
            level: 'main'
          }
        );

        const updates: Partial<QuestionData> = {};

        // Always set has_direct_answer and is_contextual_only flags
        updates.has_direct_answer = answerExpectation.has_direct_answer;
        updates.is_contextual_only = answerExpectation.is_contextual_only;

        // Auto-populate answer_format if missing
        if (!question.answer_format) {
          const derivedFormat = deriveAnswerFormat({
            type: question.type,
            question_description: question.question_description,
            correct_answers: correctAnswers || [],
            has_direct_answer: answerExpectation.has_direct_answer,
            is_contextual_only: answerExpectation.is_contextual_only
          });
          if (derivedFormat) {
            updates.answer_format = derivedFormat;
          }
        }

        // Auto-populate answer_requirement if missing
        if (!question.answer_requirement) {
          const derivedRequirement = deriveAnswerRequirement({
            type: question.type,
            correct_answers: correctAnswers || [],
            total_alternatives: question.total_alternatives,
            has_direct_answer: answerExpectation.has_direct_answer,
            is_contextual_only: answerExpectation.is_contextual_only
          });
          if (derivedRequirement) {
            updates.answer_requirement = derivedRequirement;
          }
        }

        // Update if we have changes
        if (Object.keys(updates).length > 0) {
          const { error: updateError } = await supabase
            .from('questions_master_admin')
            .update(updates)
            .eq('id', question.id);

          if (updateError) {
            result.errors.push({
              questionId: question.id,
              error: updateError.message
            });
          } else {
            result.questionsUpdated++;
          }
        }
      } catch (err) {
        result.errors.push({
          questionId: question.id,
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      }
    }

    // Build query for sub-questions
    let subQuestionsQuery = supabase
      .from('sub_questions')
      .select(`
        id,
        type,
        question_description,
        answer_format,
        answer_requirement,
        total_alternatives
      `)
      .or('answer_format.is.null,answer_requirement.is.null');

    const { data: subQuestions, error: subQuestionsError } = await subQuestionsQuery;

    if (subQuestionsError) throw subQuestionsError;

    // Process each sub-question
    for (const subQuestion of subQuestions || []) {
      try {
        // Get correct answers for this sub-question
        const { data: correctAnswers } = await supabase
          .from('question_correct_answers')
          .select('answer, alternative_id')
          .eq('sub_question_id', subQuestion.id)
          .is('question_id', null);

        // Get nested subparts to check if this is contextual
        const { data: nestedSubparts } = await supabase
          .from('sub_questions')
          .select('id')
          .eq('parent_id', subQuestion.id);

        const hasSubparts = (nestedSubparts?.length || 0) > 0;

        // Detect answer expectation
        const answerExpectation = detectAnswerExpectation(
          {
            question_text: subQuestion.question_description,
            question_description: subQuestion.question_description,
            correct_answers: correctAnswers || [],
            answer_format: subQuestion.answer_format,
            answer_requirement: subQuestion.answer_requirement,
            subparts: nestedSubparts || []
          },
          {
            hasSubparts,
            level: 'part'
          }
        );

        const updates: Partial<QuestionData> = {};

        // Always set has_direct_answer and is_contextual_only flags
        updates.has_direct_answer = answerExpectation.has_direct_answer;
        updates.is_contextual_only = answerExpectation.is_contextual_only;

        // Auto-populate answer_format if missing
        if (!subQuestion.answer_format) {
          const derivedFormat = deriveAnswerFormat({
            type: subQuestion.type,
            question_description: subQuestion.question_description,
            correct_answers: correctAnswers || [],
            has_direct_answer: answerExpectation.has_direct_answer,
            is_contextual_only: answerExpectation.is_contextual_only
          });
          if (derivedFormat) {
            updates.answer_format = derivedFormat;
          }
        }

        // Auto-populate answer_requirement if missing
        if (!subQuestion.answer_requirement) {
          const derivedRequirement = deriveAnswerRequirement({
            type: subQuestion.type,
            correct_answers: correctAnswers || [],
            total_alternatives: subQuestion.total_alternatives,
            has_direct_answer: answerExpectation.has_direct_answer,
            is_contextual_only: answerExpectation.is_contextual_only
          });
          if (derivedRequirement) {
            updates.answer_requirement = derivedRequirement;
          }
        }

        // Update if we have changes
        if (Object.keys(updates).length > 0) {
          const { error: updateError } = await supabase
            .from('sub_questions')
            .update(updates)
            .eq('id', subQuestion.id);

          if (updateError) {
            result.errors.push({
              questionId: subQuestion.id,
              error: updateError.message
            });
          } else {
            result.subQuestionsUpdated++;
          }
        }
      } catch (err) {
        result.errors.push({
          questionId: subQuestion.id,
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      }
    }

    return result;
  } catch (error) {
    console.error('Error in autoPopulateAnswerFields:', error);
    throw error;
  }
}

/**
 * Auto-populate for a single question
 */
export async function autoPopulateQuestionAnswerFields(
  questionId: string,
  isSubQuestion: boolean = false
): Promise<{ success: boolean; updates?: any; error?: string }> {
  try {
    const table = isSubQuestion ? 'sub_questions' : 'questions_master_admin';
    const foreignKeyField = isSubQuestion ? 'sub_question_id' : 'question_id';
    const nullField = isSubQuestion ? 'question_id' : 'sub_question_id';

    // Get question data
    const { data: question, error: questionError } = await supabase
      .from(table)
      .select('id, type, question_description, answer_format, answer_requirement, total_alternatives')
      .eq('id', questionId)
      .single();

    if (questionError) throw questionError;

    // Get correct answers
    const { data: correctAnswers } = await supabase
      .from('question_correct_answers')
      .select('answer, alternative_id')
      .eq(foreignKeyField, questionId)
      .is(nullField, null);

    // Get subparts to detect if contextual
    let hasSubparts = false;
    if (isSubQuestion) {
      const { data: nestedSubparts } = await supabase
        .from('sub_questions')
        .select('id')
        .eq('parent_id', questionId);
      hasSubparts = (nestedSubparts?.length || 0) > 0;
    } else {
      const { data: parts } = await supabase
        .from('sub_questions')
        .select('id')
        .eq('question_id', questionId);
      hasSubparts = (parts?.length || 0) > 0;
    }

    // Detect answer expectation
    const answerExpectation = detectAnswerExpectation(
      {
        question_text: question.question_description,
        question_description: question.question_description,
        correct_answers: correctAnswers || [],
        answer_format: question.answer_format,
        answer_requirement: question.answer_requirement
      },
      {
        hasSubparts,
        level: isSubQuestion ? 'part' : 'main'
      }
    );

    const updates: any = {};

    // Always set has_direct_answer and is_contextual_only flags
    updates.has_direct_answer = answerExpectation.has_direct_answer;
    updates.is_contextual_only = answerExpectation.is_contextual_only;

    // Derive answer_format if missing
    if (!question.answer_format) {
      const derivedFormat = deriveAnswerFormat({
        type: question.type,
        question_description: question.question_description,
        correct_answers: correctAnswers || [],
        has_direct_answer: answerExpectation.has_direct_answer,
        is_contextual_only: answerExpectation.is_contextual_only
      });
      if (derivedFormat) {
        updates.answer_format = derivedFormat;
      }
    }

    // Derive answer_requirement if missing
    if (!question.answer_requirement) {
      const derivedRequirement = deriveAnswerRequirement({
        type: question.type,
        correct_answers: correctAnswers || [],
        total_alternatives: question.total_alternatives,
        has_direct_answer: answerExpectation.has_direct_answer,
        is_contextual_only: answerExpectation.is_contextual_only
      });
      if (derivedRequirement) {
        updates.answer_requirement = derivedRequirement;
      }
    }

    // Update if we have changes
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from(table)
        .update(updates)
        .eq('id', questionId);

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      return { success: true, updates };
    }

    return { success: true, updates: {} };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
