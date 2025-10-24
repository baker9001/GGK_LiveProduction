// src/services/answerFieldAutoPopulationService.ts

import { supabase } from '../lib/supabase';
import { deriveAnswerFormat, deriveAnswerRequirement } from '../lib/constants/answerOptions';

interface QuestionData {
  id: string;
  type: string;
  question_description?: string;
  answer_format?: string | null;
  answer_requirement?: string | null;
  total_alternatives?: number | null;
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

        const updates: Partial<QuestionData> = {};

        // Auto-populate answer_format if missing
        if (!question.answer_format) {
          const derivedFormat = deriveAnswerFormat({
            type: question.type,
            question_description: question.question_description,
            correct_answers: correctAnswers || []
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
            total_alternatives: question.total_alternatives
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

        const updates: Partial<QuestionData> = {};

        // Auto-populate answer_format if missing
        if (!subQuestion.answer_format) {
          const derivedFormat = deriveAnswerFormat({
            type: subQuestion.type,
            question_description: subQuestion.question_description,
            correct_answers: correctAnswers || []
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
            total_alternatives: subQuestion.total_alternatives
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

    const updates: any = {};

    // Derive answer_format if missing
    if (!question.answer_format) {
      const derivedFormat = deriveAnswerFormat({
        type: question.type,
        question_description: question.question_description,
        correct_answers: correctAnswers || []
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
        total_alternatives: question.total_alternatives
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
