// src/services/unifiedQuestionsService.ts

/**
 * Unified Questions Service
 *
 * This service provides consistent data access methods for both papers-setup (import)
 * and questions-setup (QA/management) stages.
 *
 * Key principles:
 * - Single source of truth for all question-related queries
 * - Consistent JOIN patterns across both stages
 * - Proper error handling and type safety
 * - Optimized queries with appropriate indexes
 */

import { supabase } from '@/lib/supabase';
import type {
  QuestionMasterAdmin,
  SubQuestion,
  PaperSetup,
  QuestionCorrectAnswer,
  QuestionOption,
  QuestionAttachment,
  QuestionDisplay,
  GroupedPaper,
  PaperQAProgress,
  QuestionValidationSummary
} from '@/types/questions';

// ==========================================
// Core Query Patterns
// ==========================================

/**
 * Standard SELECT clause for questions with all relationships
 * Used consistently in both papers-setup and questions-setup
 */
const QUESTION_SELECT_CLAUSE = `
  id,
  paper_id,
  question_number,
  question_description,
  question_header,
  question_content_type,
  marks,
  type,
  difficulty,
  category,
  status,
  topic_id,
  subtopic_id,
  chapter_id,
  explanation,
  hint,
  year,
  is_confirmed,
  confirmed_at,
  confirmed_by,
  answer_format,
  answer_requirement,
  total_alternatives,
  correct_answer,
  created_at,
  updated_at,
  papers_setup!inner(
    id,
    paper_code,
    subject_id,
    provider_id,
    program_id,
    region_id,
    data_structure_id,
    status,
    duration
  ),
  question_subtopics(
    subtopic_id,
    edu_subtopics(
      id,
      name,
      topic_id
    )
  ),
  question_correct_answers(
    id,
    answer,
    marks,
    alternative_id,
    linked_alternatives,
    alternative_type,
    unit,
    accepts_equivalent_phrasing,
    accepts_reverse_argument,
    error_carried_forward,
    acceptable_variations,
    marking_criteria,
    working,
    context_type,
    context_value,
    context_label,
    created_at
  ),
  question_options(
    id,
    option_text,
    is_correct,
    order
  ),
  sub_questions(
    id,
    question_id,
    parent_id,
    type,
    topic_id,
    subtopic_id,
    description,
    part_label,
    question_description,
    difficulty,
    marks,
    answer_format,
    answer_requirement,
    total_alternatives,
    correct_answer,
    has_direct_answer,
    is_contextual_only,
    hint,
    explanation,
    status,
    sort_order,
    order_index,
    order,
    level,
    is_confirmed,
    confirmed_at,
    confirmed_by,
    created_at,
    updated_at,
    question_subtopics(
      subtopic_id,
      edu_subtopics(
        id,
        name,
        topic_id
      )
    ),
    question_correct_answers(
      id,
      answer,
      marks,
      alternative_id,
      linked_alternatives,
      alternative_type,
      unit,
      accepts_equivalent_phrasing,
      accepts_reverse_argument,
      error_carried_forward,
      acceptable_variations,
      marking_criteria,
      working,
      context_type,
      context_value,
      context_label,
      created_at
    ),
    question_options(
      id,
      option_text,
      is_correct,
      order
    ),
    questions_attachments(
      id,
      file_url,
      file_name,
      file_type,
      file_size,
      created_at
    )
  ),
  questions_attachments(
    id,
    file_url,
    file_name,
    file_type,
    file_size,
    created_at
  )
`;

// ==========================================
// Questions Fetching
// ==========================================

export interface FetchQuestionsParams {
  paperIds?: string[];
  providerIds?: string[];
  subjectIds?: string[];
  unitIds?: string[];
  difficulty?: string[];
  status?: string[];
  searchTerm?: string;
  isConfirmed?: boolean;
}

/**
 * Fetches questions with full relationships
 * Used by questions-setup page for displaying and managing questions
 */
export async function fetchQuestionsWithRelationships(
  params: FetchQuestionsParams = {}
) {
  let query = supabase
    .from('questions_master_admin')
    .select(QUESTION_SELECT_CLAUSE)
    .is('deleted_at', null)
    .order('question_number', { ascending: true });

  // Apply filters
  if (params.difficulty && params.difficulty.length > 0) {
    query = query.in('difficulty', params.difficulty);
  }

  if (params.status && params.status.length > 0) {
    query = query.in('status', params.status);
  }

  if (params.isConfirmed !== undefined) {
    query = query.eq('is_confirmed', params.isConfirmed);
  }

  if (params.searchTerm) {
    query = query.or(`question_description.ilike.%${params.searchTerm}%,question_header.ilike.%${params.searchTerm}%,question_number.ilike.%${params.searchTerm}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching questions:', error);
    throw error;
  }

  return data || [];
}

/**
 * Fetches questions grouped by paper
 * Used by both stages to display questions organized by their papers
 */
export async function fetchQuestionsGroupedByPaper(
  params: FetchQuestionsParams = {}
): Promise<GroupedPaper[]> {
  const questions = await fetchQuestionsWithRelationships(params);

  if (!questions || questions.length === 0) {
    return [];
  }

  // Get paper IDs
  const paperIds = [...new Set(questions.map(q => q.papers_setup.id))];

  // Fetch paper details with data structure
  const { data: paperDetails, error: paperError } = await supabase
    .from('papers_setup')
    .select(`
      id,
      paper_code,
      data_structure_id,
      data_structures(
        id,
        edu_subjects(id, name),
        providers(id, name),
        programs(id, name),
        regions(id, name)
      )
    `)
    .in('id', paperIds);

  if (paperError) {
    console.error('Error fetching paper details:', paperError);
    throw paperError;
  }

  // Get topic details for all questions
  const topicIds = [
    ...new Set([
      ...questions.map(q => q.topic_id).filter(Boolean),
      ...questions.flatMap(q => q.sub_questions?.map((sq: any) => sq.topic_id).filter(Boolean) || [])
    ])
  ];

  const { data: topicDetails, error: topicError } = await supabase
    .from('edu_topics')
    .select('id, name, unit_id')
    .in('id', topicIds);

  if (topicError) {
    console.error('Error fetching topics:', topicError);
  }

  const topicMap = new Map(topicDetails?.map(t => [t.id, t]) || []);

  // Get unit details
  const unitIds = [...new Set(topicDetails?.map(t => t.unit_id).filter(Boolean) || [])];

  const { data: unitDetails, error: unitError } = await supabase
    .from('edu_units')
    .select('id, name')
    .in('id', unitIds);

  if (unitError) {
    console.error('Error fetching units:', unitError);
  }

  const unitMap = new Map(unitDetails?.map(u => [u.id, u.name]) || []);

  // Group questions by paper
  const paperGroups: Record<string, GroupedPaper> = {};

  questions.forEach((question: any) => {
    const paper = question.papers_setup;
    const paperId = paper.id;
    const paperDetail = paperDetails?.find(p => p.id === paperId);

    if (!paperGroups[paperId]) {
      const dataStructure = paperDetail?.data_structures;
      paperGroups[paperId] = {
        id: paperId,
        code: paper.paper_code,
        subject: dataStructure?.edu_subjects?.name || 'Unknown',
        provider: dataStructure?.providers?.name || 'Unknown',
        program: dataStructure?.programs?.name || 'Unknown',
        region: dataStructure?.regions?.name || 'Unknown',
        status: paper.status,
        duration: paper.duration,
        total_marks: 0,
        subject_id: dataStructure?.edu_subjects?.id,
        provider_id: dataStructure?.providers?.id,
        program_id: dataStructure?.programs?.id,
        region_id: dataStructure?.regions?.id,
        data_structure_id: dataStructure?.id || paperDetail?.data_structure_id,
        questions: []
      };
    }

    // Get topic and unit info
    const topicInfo = topicMap.get(question.topic_id);
    const unitName = topicInfo?.unit_id ? unitMap.get(topicInfo.unit_id) : undefined;

    // Calculate total marks
    const questionMarks = question.marks + (question.sub_questions?.reduce((sum: number, sq: any) => sum + sq.marks, 0) || 0);
    paperGroups[paperId].total_marks += questionMarks;

    // Format the question
    const formattedQuestion: QuestionDisplay = {
      ...question,
      topic_name: topicInfo?.name,
      unit_name: unitName,
      unit_id: topicInfo?.unit_id,
      subtopic_names: question.question_subtopics?.map((qs: any) => qs.edu_subtopics.name) || [],
      parts: question.sub_questions?.map((sq: any, index: number) => {
        const subTopicInfo = topicMap.get(sq.topic_id);
        const subUnitName = subTopicInfo?.unit_id ? unitMap.get(subTopicInfo.unit_id) : undefined;

        return {
          ...sq,
          topic_name: subTopicInfo?.name,
          unit_name: subUnitName,
          unit_id: subTopicInfo?.unit_id,
          subtopic_names: sq.question_subtopics?.map((qs: any) => qs.edu_subtopics.name) || []
        };
      })
        .sort((a: any, b: any) => (a.sort_order || a.order_index || a.order || 0) - (b.sort_order || b.order_index || b.order || 0)) || []
    };

    paperGroups[paperId].questions.push(formattedQuestion);
  });

  return Object.values(paperGroups);
}

// ==========================================
// Single Question Fetching
// ==========================================

/**
 * Fetches a single question with all relationships
 * Used by both stages when viewing/editing question details
 */
export async function fetchQuestionById(questionId: string) {
  const { data, error } = await supabase
    .from('questions_master_admin')
    .select(QUESTION_SELECT_CLAUSE)
    .eq('id', questionId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    console.error('Error fetching question:', error);
    throw error;
  }

  if (!data) {
    return null;
  }

  // Fetch correct answers
  const { data: correctAnswers, error: answersError } = await supabase
    .from('question_correct_answers')
    .select('*')
    .eq('question_id', questionId)
    .order('alternative_id', { ascending: true });

  if (answersError) {
    console.error('Error fetching correct answers:', answersError);
  }

  return {
    ...data,
    correctAnswers: correctAnswers || []
  };
}

// ==========================================
// Paper Progress Tracking
// ==========================================

/**
 * Fetches QA progress for papers
 * Uses the papers_qa_dashboard view for consistent metrics
 */
export async function fetchPaperQAProgress(
  paperIds?: string[]
): Promise<PaperQAProgress[]> {
  let query = supabase
    .from('papers_qa_dashboard')
    .select('*')
    .order('created_at', { ascending: false });

  if (paperIds && paperIds.length > 0) {
    query = query.in('paper_id', paperIds);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching paper QA progress:', error);
    throw error;
  }

  return data || [];
}

/**
 * Fetches validation summary for questions
 * Uses the question_validation_summary view
 */
export async function fetchQuestionValidationSummary(
  questionIds?: string[]
): Promise<QuestionValidationSummary[]> {
  let query = supabase
    .from('question_validation_summary')
    .select('*');

  if (questionIds && questionIds.length > 0) {
    query = query.in('question_id', questionIds);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching question validation summary:', error);
    throw error;
  }

  return data || [];
}

// ==========================================
// Paper Readiness Check
// ==========================================

/**
 * Checks if a paper is ready for publishing
 * Uses the is_paper_ready_for_publishing database function
 */
export async function checkPaperReadiness(paperId: string) {
  const { data, error } = await supabase
    .rpc('is_paper_ready_for_publishing', { paper_uuid: paperId });

  if (error) {
    console.error('Error checking paper readiness:', error);
    throw error;
  }

  return data?.[0] || {
    is_ready: false,
    total_questions: 0,
    confirmed_questions: 0,
    missing_fields_count: 0,
    validation_message: 'Unable to determine readiness'
  };
}

// ==========================================
// Correct Answers Management
// ==========================================

/**
 * Fetches correct answers for a question or sub-question
 * Used by both stages to display answers
 */
export async function fetchCorrectAnswers(
  questionId?: string,
  subQuestionId?: string
): Promise<QuestionCorrectAnswer[]> {
  let query = supabase
    .from('question_correct_answers')
    .select('*')
    .order('alternative_id', { ascending: true });

  if (questionId) {
    query = query.eq('question_id', questionId);
  } else if (subQuestionId) {
    query = query.eq('sub_question_id', subQuestionId);
  } else {
    throw new Error('Either questionId or subQuestionId must be provided');
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching correct answers:', error);
    throw error;
  }

  return data || [];
}

// ==========================================
// Options Management
// ==========================================

/**
 * Fetches options for MCQ questions
 * Used by both stages to display MCQ options
 */
export async function fetchQuestionOptions(
  questionId?: string,
  subQuestionId?: string
): Promise<QuestionOption[]> {
  let query = supabase
    .from('question_options')
    .select('*')
    .order('order', { ascending: true });

  if (questionId) {
    query = query.eq('question_id', questionId);
  } else if (subQuestionId) {
    query = query.eq('sub_question_id', subQuestionId);
  } else {
    throw new Error('Either questionId or subQuestionId must be provided');
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching question options:', error);
    throw error;
  }

  return data || [];
}

// ==========================================
// Attachments Management
// ==========================================

/**
 * Fetches attachments for a question or sub-question
 * Used by both stages to display attachments
 */
export async function fetchQuestionAttachments(
  questionId?: string,
  subQuestionId?: string
): Promise<QuestionAttachment[]> {
  let query = supabase
    .from('questions_attachments')
    .select('*')
    .order('created_at', { ascending: true });

  if (questionId) {
    query = query.eq('question_id', questionId);
  } else if (subQuestionId) {
    query = query.eq('sub_question_id', subQuestionId);
  } else {
    throw new Error('Either questionId or subQuestionId must be provided');
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching attachments:', error);
    throw error;
  }

  return data || [];
}

// ==========================================
// Export all functions
// ==========================================

export const UnifiedQuestionsService = {
  fetchQuestionsWithRelationships,
  fetchQuestionsGroupedByPaper,
  fetchQuestionById,
  fetchPaperQAProgress,
  fetchQuestionValidationSummary,
  checkPaperReadiness,
  fetchCorrectAnswers,
  fetchQuestionOptions,
  fetchQuestionAttachments
};
