/*
  # Add Missing Foreign Key Indexes - Part 2: Mock Exam Tables
  
  This migration adds indexes for unindexed foreign keys on mock exam related tables.

  ## Tables Covered:
  - mock_exam_branches (branch_id, invigilator_id)
  - mock_exam_question_performance (sub_question_id)
  - mock_exam_questions (question_id)
  - mock_exam_responses (marker_id, student_id, sub_question_id)
  - mock_exam_results (student_id)
  - mock_exam_schools (school_id)
  - mock_exam_status_history (changed_by, mock_exam_id)
  - mock_exam_students (branch_id, school_id, student_id)
  - mock_exam_teachers (branch_id, school_id)
  - mock_exam_venues (branch_id)
  - mock_exams (company_id, created_by, data_structure_id)

  ## Security:
  - No RLS changes
  - Indexes only improve performance
*/

-- mock_exam_branches.branch_id
CREATE INDEX IF NOT EXISTS idx_mock_exam_branches_branch_id 
ON public.mock_exam_branches(branch_id);

-- mock_exam_branches.invigilator_id
CREATE INDEX IF NOT EXISTS idx_mock_exam_branches_invigilator_id 
ON public.mock_exam_branches(invigilator_id);

-- mock_exam_question_performance.sub_question_id
CREATE INDEX IF NOT EXISTS idx_mock_exam_question_perf_sub_question_id 
ON public.mock_exam_question_performance(sub_question_id);

-- mock_exam_questions.question_id
CREATE INDEX IF NOT EXISTS idx_mock_exam_questions_question_id 
ON public.mock_exam_questions(question_id);

-- mock_exam_responses.marker_id
CREATE INDEX IF NOT EXISTS idx_mock_exam_responses_marker_id 
ON public.mock_exam_responses(marker_id);

-- mock_exam_responses.student_id
CREATE INDEX IF NOT EXISTS idx_mock_exam_responses_student_id 
ON public.mock_exam_responses(student_id);

-- mock_exam_responses.sub_question_id
CREATE INDEX IF NOT EXISTS idx_mock_exam_responses_sub_question_id 
ON public.mock_exam_responses(sub_question_id);

-- mock_exam_results.student_id
CREATE INDEX IF NOT EXISTS idx_mock_exam_results_student_id 
ON public.mock_exam_results(student_id);

-- mock_exam_schools.school_id
CREATE INDEX IF NOT EXISTS idx_mock_exam_schools_school_id 
ON public.mock_exam_schools(school_id);

-- mock_exam_status_history.changed_by
CREATE INDEX IF NOT EXISTS idx_mock_exam_status_history_changed_by 
ON public.mock_exam_status_history(changed_by);

-- mock_exam_status_history.mock_exam_id
CREATE INDEX IF NOT EXISTS idx_mock_exam_status_history_mock_exam_id 
ON public.mock_exam_status_history(mock_exam_id);

-- mock_exam_students.branch_id
CREATE INDEX IF NOT EXISTS idx_mock_exam_students_branch_id 
ON public.mock_exam_students(branch_id);

-- mock_exam_students.school_id
CREATE INDEX IF NOT EXISTS idx_mock_exam_students_school_id 
ON public.mock_exam_students(school_id);

-- mock_exam_students.student_id
CREATE INDEX IF NOT EXISTS idx_mock_exam_students_student_id 
ON public.mock_exam_students(student_id);

-- mock_exam_teachers.branch_id
CREATE INDEX IF NOT EXISTS idx_mock_exam_teachers_branch_id 
ON public.mock_exam_teachers(branch_id);

-- mock_exam_teachers.school_id
CREATE INDEX IF NOT EXISTS idx_mock_exam_teachers_school_id 
ON public.mock_exam_teachers(school_id);

-- mock_exam_venues.branch_id
CREATE INDEX IF NOT EXISTS idx_mock_exam_venues_branch_id 
ON public.mock_exam_venues(branch_id);

-- mock_exams.company_id
CREATE INDEX IF NOT EXISTS idx_mock_exams_company_id 
ON public.mock_exams(company_id);

-- mock_exams.created_by
CREATE INDEX IF NOT EXISTS idx_mock_exams_created_by 
ON public.mock_exams(created_by);

-- mock_exams.data_structure_id
CREATE INDEX IF NOT EXISTS idx_mock_exams_data_structure_id 
ON public.mock_exams(data_structure_id);
