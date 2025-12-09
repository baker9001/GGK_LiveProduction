/*
  # Add Missing Foreign Key Indexes - Part 3: Questions & Practice Tables
  
  This migration adds indexes for unindexed foreign keys on question and practice related tables.

  ## Tables Covered:
  - analytics_facts (sub_question_id)
  - answer_components (sub_question_id)
  - answer_requirements (sub_question_id)
  - context_performance (component_id, sub_question_id)
  - exam_answers_extended (graded_by, sub_question_id)
  - paper_status_history (paper_id)
  - papers_setup (data_structure, region, published_by)
  - past_paper_files (import_session_id, uploaded_by)
  - practice_answers (item_id, question_id)
  - practice_session_events (item_id, session_id)
  - practice_sessions (practice_set_id, student_id)
  - practice_sets (subtopic_id)
  - question_attachment_tracking (paper_id, question_id, sub_question_id)
  - question_correct_answers (question_id, sub_question_id)
  - question_distractors (sub_question_id)
  - question_navigation_state (paper_id)
  - question_options (sub_question_id - fk_option_subq)
  - question_review_progress (paper_id, question_id, sub_question_id)
  - question_subtopics (sub_question_id)
  - question_topics (topic_id)
  - questions_hints (sub_question_id - fk_hint_subq)

  ## Security:
  - No RLS changes
  - Indexes only improve performance
*/

-- analytics_facts.sub_question_id
CREATE INDEX IF NOT EXISTS idx_analytics_facts_sub_question_id 
ON public.analytics_facts(sub_question_id);

-- answer_components.sub_question_id
CREATE INDEX IF NOT EXISTS idx_answer_components_sub_question_id 
ON public.answer_components(sub_question_id);

-- answer_requirements.sub_question_id
CREATE INDEX IF NOT EXISTS idx_answer_requirements_sub_question_id 
ON public.answer_requirements(sub_question_id);

-- context_performance.component_id
CREATE INDEX IF NOT EXISTS idx_context_performance_component_id 
ON public.context_performance(component_id);

-- context_performance.sub_question_id
CREATE INDEX IF NOT EXISTS idx_context_performance_sub_question_id 
ON public.context_performance(sub_question_id);

-- exam_answers_extended.graded_by
CREATE INDEX IF NOT EXISTS idx_exam_answers_extended_graded_by 
ON public.exam_answers_extended(graded_by);

-- exam_answers_extended.sub_question_id
CREATE INDEX IF NOT EXISTS idx_exam_answers_extended_sub_question_id 
ON public.exam_answers_extended(sub_question_id);

-- paper_status_history.paper_id
CREATE INDEX IF NOT EXISTS idx_paper_status_history_paper_id 
ON public.paper_status_history(paper_id);

-- papers_setup.data_structure_id (fk_papers_setup_data_structure)
CREATE INDEX IF NOT EXISTS idx_papers_setup_data_structure_id 
ON public.papers_setup(data_structure_id);

-- papers_setup.region_id (fk_papers_setup_region)
CREATE INDEX IF NOT EXISTS idx_papers_setup_region_id 
ON public.papers_setup(region_id);

-- papers_setup.published_by
CREATE INDEX IF NOT EXISTS idx_papers_setup_published_by 
ON public.papers_setup(published_by);

-- past_paper_files.import_session_id
CREATE INDEX IF NOT EXISTS idx_past_paper_files_import_session_id 
ON public.past_paper_files(import_session_id);

-- past_paper_files.uploaded_by
CREATE INDEX IF NOT EXISTS idx_past_paper_files_uploaded_by 
ON public.past_paper_files(uploaded_by);

-- practice_answers.item_id
CREATE INDEX IF NOT EXISTS idx_practice_answers_item_id 
ON public.practice_answers(item_id);

-- practice_answers.question_id
CREATE INDEX IF NOT EXISTS idx_practice_answers_question_id 
ON public.practice_answers(question_id);

-- practice_session_events.item_id
CREATE INDEX IF NOT EXISTS idx_practice_session_events_item_id 
ON public.practice_session_events(item_id);

-- practice_session_events.session_id
CREATE INDEX IF NOT EXISTS idx_practice_session_events_session_id 
ON public.practice_session_events(session_id);

-- practice_sessions.practice_set_id
CREATE INDEX IF NOT EXISTS idx_practice_sessions_practice_set_id 
ON public.practice_sessions(practice_set_id);

-- practice_sessions.student_id
CREATE INDEX IF NOT EXISTS idx_practice_sessions_student_id 
ON public.practice_sessions(student_id);

-- practice_sets.subtopic_id
CREATE INDEX IF NOT EXISTS idx_practice_sets_subtopic_id 
ON public.practice_sets(subtopic_id);

-- question_attachment_tracking.paper_id
CREATE INDEX IF NOT EXISTS idx_question_attachment_tracking_paper_id 
ON public.question_attachment_tracking(paper_id);

-- question_attachment_tracking.question_id
CREATE INDEX IF NOT EXISTS idx_question_attachment_tracking_question_id 
ON public.question_attachment_tracking(question_id);

-- question_attachment_tracking.sub_question_id
CREATE INDEX IF NOT EXISTS idx_question_attachment_tracking_sub_q_id 
ON public.question_attachment_tracking(sub_question_id);

-- question_correct_answers.question_id
CREATE INDEX IF NOT EXISTS idx_question_correct_answers_question_id 
ON public.question_correct_answers(question_id);

-- question_correct_answers.sub_question_id
CREATE INDEX IF NOT EXISTS idx_question_correct_answers_sub_q_id 
ON public.question_correct_answers(sub_question_id);

-- question_distractors.sub_question_id
CREATE INDEX IF NOT EXISTS idx_question_distractors_sub_question_id 
ON public.question_distractors(sub_question_id);

-- question_navigation_state.paper_id
CREATE INDEX IF NOT EXISTS idx_question_navigation_state_paper_id 
ON public.question_navigation_state(paper_id);

-- question_options.sub_question_id (fk_option_subq)
CREATE INDEX IF NOT EXISTS idx_question_options_sub_question_id 
ON public.question_options(sub_question_id);

-- question_review_progress.paper_id
CREATE INDEX IF NOT EXISTS idx_question_review_progress_paper_id 
ON public.question_review_progress(paper_id);

-- question_review_progress.question_id
CREATE INDEX IF NOT EXISTS idx_question_review_progress_question_id 
ON public.question_review_progress(question_id);

-- question_review_progress.sub_question_id
CREATE INDEX IF NOT EXISTS idx_question_review_progress_sub_q_id 
ON public.question_review_progress(sub_question_id);

-- question_subtopics.sub_question_id
CREATE INDEX IF NOT EXISTS idx_question_subtopics_sub_question_id 
ON public.question_subtopics(sub_question_id);

-- question_topics.topic_id
CREATE INDEX IF NOT EXISTS idx_question_topics_topic_id 
ON public.question_topics(topic_id);

-- questions_hints.sub_question_id (fk_hint_subq)
CREATE INDEX IF NOT EXISTS idx_questions_hints_sub_question_id 
ON public.questions_hints(sub_question_id);
