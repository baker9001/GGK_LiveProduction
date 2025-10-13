/*
  # Remove Duplicate Indexes
  
  1. Performance Improvements
    - Remove duplicate indexes to reduce storage overhead
    - Improve write performance
    - Reduce index maintenance cost
  
  2. Changes
    - Drop 9 duplicate indexes across multiple tables
    - Keep the most appropriately named index in each case
*/

-- class_sections duplicates
DROP INDEX IF EXISTS idx_class_sections_grade;

-- grade_level_schools duplicates
DROP INDEX IF EXISTS idx_grade_level_schools_grade_level;
DROP INDEX IF EXISTS idx_grade_level_schools_school;

-- mock_exam_instructions duplicates
DROP INDEX IF EXISTS idx_mock_exam_instructions_exam;

-- mock_exams duplicates
DROP INDEX IF EXISTS idx_mock_exams_company;

-- question_options duplicates
DROP INDEX IF EXISTS idx_question_options_subquestion;

-- question_subtopics duplicates
DROP INDEX IF EXISTS idx_question_subtopics_subtopic;

-- question_topics duplicates
DROP INDEX IF EXISTS idx_question_topics_topic;
DROP INDEX IF EXISTS idx_question_topics_unique;