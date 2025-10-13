// src/types/questions.ts

/**
 * Unified Type Definitions for Questions System
 *
 * These types are shared between papers-setup (import) and questions-setup (QA/management) stages
 * to ensure consistency across the entire workflow.
 */

// ==========================================
// Status Enumerations
// ==========================================

export type QuestionStatus = 'draft' | 'qa_review' | 'active' | 'inactive' | 'archived';
export type PaperStatus = 'draft' | 'qa_review' | 'active' | 'inactive' | 'archived' | 'completed' | 'failed';
export type QAStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

// ==========================================
// Question Types
// ==========================================

export type QuestionType = 'mcq' | 'tf' | 'descriptive' | 'complex';
export type QuestionCategory = 'direct' | 'complex';
export type QuestionContentType = 'text' | 'figure' | 'text_and_figure' | 'parts_only';
export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';

// ==========================================
// Answer Format Types
// ==========================================

export type AnswerFormat =
  | 'single_word'
  | 'single_line'
  | 'two_items'
  | 'two_items_connected'
  | 'multi_line'
  | 'multi_line_labeled'
  | 'calculation'
  | 'equation'
  | 'chemical_structure'
  | 'structural_diagram'
  | 'diagram'
  | 'table'
  | 'graph'
  | 'code'
  | 'audio'
  | 'file_upload';

export type AnswerRequirement =
  | 'single_choice'
  | 'both_required'
  | 'any_2_from'
  | 'any_3_from'
  | 'all_required'
  | 'alternative_methods';

// ==========================================
// Context Types
// ==========================================

export interface AnswerContext {
  type: string;
  value: string;
  label?: string;
}

// ==========================================
// Database Table Types
// ==========================================

export interface QuestionMasterAdmin {
  id: string;
  paper_id: string;
  data_structure_id: string;
  region_id: string;
  program_id: string;
  provider_id: string;
  subject_id: string;
  chapter_id: string | null;
  topic_id: string | null;
  subtopic_id: string | null;
  question_number: string;
  question_header: string | null;
  question_description: string;
  question_content_type: QuestionContentType | null;
  type: QuestionType;
  category: QuestionCategory;
  marks: number;
  difficulty: DifficultyLevel | null;
  status: QuestionStatus;
  year: number;

  // QA fields
  is_confirmed: boolean;
  confirmed_at: string | null;
  confirmed_by: string | null;
  qa_notes: string | null;
  qa_reviewed_at: string | null;
  qa_reviewed_by: string | null;

  // Answer fields
  answer_format: AnswerFormat | null;
  answer_requirement: AnswerRequirement | null;
  total_alternatives: number | null;
  correct_answer: string | null; // DEPRECATED - use question_correct_answers table

  // Context and analytics
  context_metadata: Record<string, any>;
  has_context_structure: boolean;
  context_extraction_status: 'pending' | 'in_progress' | 'completed' | 'failed';

  // Educational content
  hint: string | null;
  explanation: string | null;
  tags: string[] | null;

  // Metadata
  import_session_id: string | null;
  confidence_level: 'under_review' | 'high_confidence';
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface SubQuestion {
  id: string;
  question_id: string;
  parent_id: string | null;
  level: number;
  part_label: string | null;
  type: QuestionType;
  topic_id: string | null;
  subtopic_id: string | null;
  question_description: string;
  description: string | null;
  marks: number;
  difficulty: DifficultyLevel | null;
  status: QuestionStatus;

  // QA fields
  is_confirmed: boolean;
  confirmed_at: string | null;
  confirmed_by: string | null;

  // Answer fields
  answer_format: AnswerFormat | null;
  answer_requirement: AnswerRequirement | null;
  total_alternatives: number | null;
  correct_answer: string | null; // DEPRECATED - use question_correct_answers table

  // Context
  context_metadata: Record<string, any>;
  has_context_structure: boolean;

  // Educational content
  hint: string | null;
  explanation: string | null;

  // Ordering
  sort_order: number;
  order_index: number;
  order: number | null;

  // Metadata
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface PaperSetup {
  id: string;
  paper_code: string;
  subject_code: string;
  paper_number: string;
  variant_number: string | null;
  exam_session: string;
  exam_year: number;

  // Foreign keys
  data_structure_id: string;
  region_id: string;
  program_id: string;
  provider_id: string;
  subject_id: string;
  import_session_id: string | null;

  // Status
  status: PaperStatus;
  qa_status: QAStatus;

  // QA workflow
  qa_started_at: string | null;
  qa_started_by: string | null;
  qa_completed_at: string | null;
  qa_completed_by: string | null;

  // Paper metadata
  board: string | null;
  duration: string | null;
  title: string | null;
  total_marks: string | null;
  paper_type: string | null;
  program: string | null;
  provider: string | null;
  subject: string | null;
  notes: string | null;

  // Import tracking
  questions_imported: boolean;
  questions_imported_at: string | null;

  // Publishing
  published_at: string | null;
  published_by: string | null;

  // Status tracking
  last_status_change_at: string | null;
  last_status_change_by: string | null;

  // Analytics
  analytics_enabled: boolean;
  context_analysis_completed: boolean;
  total_context_components: number;

  // Metadata
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface QuestionCorrectAnswer {
  id: string;
  question_id: string | null;
  sub_question_id: string | null;
  answer: string;
  marks: number | null;
  alternative_id: number | null;
  context_type: string | null;
  context_value: string | null;
  context_label: string | null;
  created_at: string;
}

export interface QuestionOption {
  id: string;
  question_id: string | null;
  sub_question_id: string | null;
  label: string;
  text: string | null;
  option_text: string;
  image_id: string | null;
  explanation: string | null;
  is_correct: boolean;
  order: number;
  context_type: string | null;
  context_value: string | null;
  context_label: string | null;
  created_at: string;
}

export interface QuestionAttachment {
  id: string;
  question_id: string | null;
  sub_question_id: string | null;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
  uploaded_by: string | null;
  created_at: string;
}

export interface QuestionSubtopic {
  id: string;
  question_id: string | null;
  sub_question_id: string | null;
  subtopic_id: string;
  created_at: string;
}

export interface QuestionTopic {
  id: string;
  question_id: string;
  topic_id: string;
  created_at: string;
}

export interface QuestionConfirmation {
  id: string;
  question_id: string;
  action: string;
  performed_by: string;
  performed_at: string;
  notes: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

export interface PaperStatusHistory {
  id: string;
  paper_id: string;
  previous_status: string | null;
  new_status: string;
  changed_by: string;
  changed_at: string;
  reason: string | null;
  metadata: Record<string, any> | null;
}

export interface PastPaperImportSession {
  id: string;
  json_file_name: string;
  raw_json: Record<string, any>;
  json_hash: string | null;
  status: 'in_progress' | 'completed' | 'failed' | 'completed_with_errors';
  metadata: Record<string, any> | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string | null;
}

// ==========================================
// View Types
// ==========================================

export interface PaperQAProgress {
  paper_id: string;
  paper_code: string;
  paper_status: PaperStatus;
  qa_status: QAStatus;
  qa_started_at: string | null;
  qa_completed_at: string | null;
  questions_imported: boolean;
  questions_imported_at: string | null;
  total_questions: number;
  confirmed_questions: number;
  qa_review_questions: number;
  active_questions: number;
  total_sub_questions: number;
  confirmed_sub_questions: number;
  questions_missing_topic: number;
  questions_missing_difficulty: number;
  qa_progress_percentage: number;
  last_question_confirmed_at: string | null;
  last_sub_question_confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuestionValidationSummary {
  question_id: string;
  paper_id: string;
  question_number: string;
  status: QuestionStatus;
  is_confirmed: boolean;
  difficulty: DifficultyLevel | null;
  topic_id: string | null;
  marks: number;
  has_description: boolean;
  has_valid_marks: boolean;
  has_difficulty: boolean;
  has_topic: boolean;
  has_correct_answers: boolean;
  has_attachments: boolean;
  has_subtopics: boolean;
  is_valid_for_qa: boolean;
}

// ==========================================
// Frontend Display Types
// ==========================================

export interface QuestionDisplay extends Omit<QuestionMasterAdmin, 'marks'> {
  marks: number;
  topic_name?: string;
  subtopic_names?: string[];
  unit_name?: string;
  unit_id?: string;
  options?: QuestionOption[];
  parts: SubQuestionDisplay[];
  attachments: QuestionAttachment[];
  correctAnswers?: QuestionCorrectAnswer[];
}

export interface SubQuestionDisplay extends Omit<SubQuestion, 'marks'> {
  marks: number;
  topic_name?: string;
  subtopic_names?: string[];
  unit_name?: string;
  unit_id?: string;
  options?: QuestionOption[];
  attachments: QuestionAttachment[];
  correctAnswers?: QuestionCorrectAnswer[];
}

export interface GroupedPaper {
  id: string;
  code: string;
  subject: string;
  provider: string;
  program: string;
  region: string;
  status: PaperStatus;
  duration?: string;
  total_marks: number;
  subject_id?: string;
  provider_id?: string;
  program_id?: string;
  region_id?: string;
  data_structure_id?: string;
  questions: QuestionDisplay[];
}

// ==========================================
// Validation Types
// ==========================================

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
}

// ==========================================
// Import/Export Types
// ==========================================

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
