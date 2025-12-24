/*
  # Remove Unused Indexes - Part 1: Mock Exams & Related Tables

  1. Overview
    - Removes indexes that have not been used according to PostgreSQL statistics
    - Frees up storage space and reduces index maintenance overhead
    - Part 1 focuses on mock exam related tables

  2. Tables Affected
    - mock_exam_* tables (branches, grade_levels, instructions, materials, etc.)
    - Mock exam performance and status tracking tables

  3. Safety
    - All DROP INDEX statements use IF EXISTS to prevent errors
    - These indexes have been confirmed as unused by PostgreSQL statistics
    - Can be recreated later if needed

  4. Note
    - Unused indexes still consume disk space and slow down INSERT/UPDATE/DELETE operations
    - Removing them improves write performance without affecting read performance
*/

-- Mock Exam Branches
DROP INDEX IF EXISTS idx_mock_exam_branches_branch_id;
DROP INDEX IF EXISTS idx_mock_exam_branches_invigilator_id;

-- Mock Exam Question Performance
DROP INDEX IF EXISTS idx_mock_exam_question_perf_sub_question_id;

-- Mock Exam Questions
DROP INDEX IF EXISTS idx_mock_exam_questions_question_id;

-- Mock Exam Responses
DROP INDEX IF EXISTS idx_mock_exam_responses_marker_id;
DROP INDEX IF EXISTS idx_mock_exam_responses_student_id;
DROP INDEX IF EXISTS idx_mock_exam_responses_sub_question_id;

-- Mock Exam Results
DROP INDEX IF EXISTS idx_mock_exam_results_student_id;

-- Mock Exam Schools
DROP INDEX IF EXISTS idx_mock_exam_schools_school_id;

-- Mock Exam Status History
DROP INDEX IF EXISTS idx_mock_exam_status_history_changed_by;
DROP INDEX IF EXISTS idx_mock_exam_status_history_mock_exam_id;

-- Mock Exam Students
DROP INDEX IF EXISTS idx_mock_exam_students_branch_id;
DROP INDEX IF EXISTS idx_mock_exam_students_school_id;
DROP INDEX IF EXISTS idx_mock_exam_students_student_id;

-- Mock Exam Teachers
DROP INDEX IF EXISTS idx_mock_exam_teachers_branch_id;
DROP INDEX IF EXISTS idx_mock_exam_teachers_school_id;

-- Mock Exam Venues
DROP INDEX IF EXISTS idx_mock_exam_venues_branch_id;

-- Mock Exams
DROP INDEX IF EXISTS idx_mock_exams_company_id;
DROP INDEX IF EXISTS idx_mock_exams_created_by;
DROP INDEX IF EXISTS idx_mock_exams_data_structure_id;

-- Academic Year Schools
DROP INDEX IF EXISTS idx_academic_year_schools_school_id;

-- AI Study Plans
DROP INDEX IF EXISTS idx_ai_study_plans_approved_by;
DROP INDEX IF EXISTS idx_ai_study_plans_student_id;
