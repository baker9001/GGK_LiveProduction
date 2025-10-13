/*
  # Fix Unindexed Foreign Keys
  
  1. Performance Improvements
    - Add indexes for all unindexed foreign keys
    - Improves query performance and join operations
    - Prevents table scans on foreign key lookups
  
  2. Changes
    - Add 16 missing foreign key indexes across multiple tables
*/

-- Context and analytics tables
CREATE INDEX IF NOT EXISTS idx_context_difficulty_metrics_subject_id 
  ON context_difficulty_metrics(subject_id);

CREATE INDEX IF NOT EXISTS idx_context_mastery_cache_subject_id 
  ON context_mastery_cache(subject_id);

-- Mock exam tables
CREATE INDEX IF NOT EXISTS idx_mock_exam_instructions_created_by 
  ON mock_exam_instructions(created_by);

CREATE INDEX IF NOT EXISTS idx_mock_exam_question_performance_sub_question_id 
  ON mock_exam_question_performance(sub_question_id);

CREATE INDEX IF NOT EXISTS idx_mock_exam_questions_created_by 
  ON mock_exam_questions(created_by);

CREATE INDEX IF NOT EXISTS idx_mock_exam_stage_progress_completed_by 
  ON mock_exam_stage_progress(completed_by);

CREATE INDEX IF NOT EXISTS idx_mock_exam_status_history_changed_by 
  ON mock_exam_status_history(changed_by);

-- Papers and questions
CREATE INDEX IF NOT EXISTS idx_papers_setup_published_by 
  ON papers_setup(published_by);

-- Student gamification
CREATE INDEX IF NOT EXISTS idx_student_achievements_achievement_id 
  ON student_achievements(achievement_id);

CREATE INDEX IF NOT EXISTS idx_student_daily_challenges_challenge_id 
  ON student_daily_challenges(challenge_id);

-- Security
CREATE INDEX IF NOT EXISTS idx_suspicious_activities_reviewed_by 
  ON suspicious_activities(reviewed_by);

-- Teacher assignments
CREATE INDEX IF NOT EXISTS idx_teacher_departments_department_id 
  ON teacher_departments(department_id);

CREATE INDEX IF NOT EXISTS idx_teacher_grade_levels_grade_level_id 
  ON teacher_grade_levels(grade_level_id);

CREATE INDEX IF NOT EXISTS idx_teacher_programs_program_id 
  ON teacher_programs(program_id);

CREATE INDEX IF NOT EXISTS idx_teacher_sections_section_id 
  ON teacher_sections(section_id);

CREATE INDEX IF NOT EXISTS idx_teacher_subjects_subject_id 
  ON teacher_subjects(subject_id);