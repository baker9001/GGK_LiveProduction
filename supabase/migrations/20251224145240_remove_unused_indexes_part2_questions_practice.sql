/*
  # Remove Unused Indexes - Part 2: Questions, Practice & Analytics

  1. Overview
    - Continues removing unused indexes
    - Part 2 focuses on questions, practice sessions, and analytics tables

  2. Tables Affected
    - Analytics facts and performance tables
    - Answer components and requirements
    - Exam answers extended
    - Paper status and setup
    - Practice sessions, answers, and events
    - Question-related tables (attachments, correct answers, navigation, etc.)

  3. Storage & Performance Benefits
    - Reduces index maintenance overhead during writes
    - Frees significant disk space
    - No impact on query performance (indexes are unused)
*/

-- Analytics Facts
DROP INDEX IF EXISTS idx_analytics_facts_sub_question_id;

-- Answer Components
DROP INDEX IF EXISTS idx_answer_components_sub_question_id;

-- Answer Requirements
DROP INDEX IF EXISTS idx_answer_requirements_sub_question_id;

-- Context Performance
DROP INDEX IF EXISTS idx_context_performance_component_id;
DROP INDEX IF EXISTS idx_context_performance_sub_question_id;

-- Exam Answers Extended
DROP INDEX IF EXISTS idx_exam_answers_extended_graded_by;
DROP INDEX IF EXISTS idx_exam_answers_extended_sub_question_id;

-- Paper Status History
DROP INDEX IF EXISTS idx_paper_status_history_paper_id;

-- Papers Setup
DROP INDEX IF EXISTS idx_papers_setup_data_structure_id;
DROP INDEX IF EXISTS idx_papers_setup_region_id;
DROP INDEX IF EXISTS idx_papers_setup_published_by;

-- Past Paper Files
DROP INDEX IF EXISTS idx_past_paper_files_import_session_id;
DROP INDEX IF EXISTS idx_past_paper_files_uploaded_by;

-- Practice Answers
DROP INDEX IF EXISTS idx_practice_answers_item_id;
DROP INDEX IF EXISTS idx_practice_answers_question_id;

-- Practice Session Events
DROP INDEX IF EXISTS idx_practice_session_events_item_id;
DROP INDEX IF EXISTS idx_practice_session_events_session_id;

-- Practice Sessions
DROP INDEX IF EXISTS idx_practice_sessions_practice_set_id;
DROP INDEX IF EXISTS idx_practice_sessions_student_id;

-- Practice Sets
DROP INDEX IF EXISTS idx_practice_sets_subtopic_id;

-- Question Attachment Tracking
DROP INDEX IF EXISTS idx_question_attachment_tracking_paper_id;
DROP INDEX IF EXISTS idx_question_attachment_tracking_question_id;
DROP INDEX IF EXISTS idx_question_attachment_tracking_sub_q_id;

-- Question Correct Answers
DROP INDEX IF EXISTS idx_question_correct_answers_question_id;
DROP INDEX IF EXISTS idx_question_correct_answers_sub_q_id;

-- Question Distractors
DROP INDEX IF EXISTS idx_question_distractors_sub_question_id;

-- Question Navigation State
DROP INDEX IF EXISTS idx_question_navigation_state_paper_id;

-- Question Options
DROP INDEX IF EXISTS idx_question_options_sub_question_id;

-- Question Review Progress
DROP INDEX IF EXISTS idx_question_review_progress_paper_id;
DROP INDEX IF EXISTS idx_question_review_progress_question_id;
DROP INDEX IF EXISTS idx_question_review_progress_sub_q_id;

-- Question Subtopics
DROP INDEX IF EXISTS idx_question_subtopics_sub_question_id;

-- Question Topics
DROP INDEX IF EXISTS idx_question_topics_topic_id;

-- Questions Hints
DROP INDEX IF EXISTS idx_questions_hints_sub_question_id;
