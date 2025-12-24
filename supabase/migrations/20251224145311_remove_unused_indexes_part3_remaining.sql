/*
  # Remove Unused Indexes - Part 3: Students, Teachers, Materials & Misc

  1. Overview
    - Final batch of unused indexes removal
    - Covers students, teachers, materials, licenses, and organizational tables

  2. Tables Affected
    - License actions
    - Materials (multiple unused indexes)
    - Students and student-related tables
    - Teachers and teacher-related tables
    - Table templates
    - Branches, cities, companies, countries, departments
    - Configuration, data structures, education catalogue
    - Entity positions, programs, reports, SMTP

  3. Cleanup Complete
    - This completes the removal of all unused indexes identified in the audit
    - Significant storage savings and write performance improvement
*/

-- License Actions
DROP INDEX IF EXISTS idx_license_actions_license_id;

-- Materials (7 unused indexes)
DROP INDEX IF EXISTS idx_materials_topic_id;
DROP INDEX IF EXISTS idx_materials_unit_id;
DROP INDEX IF EXISTS idx_materials_grade_id;
DROP INDEX IF EXISTS idx_materials_school_id;
DROP INDEX IF EXISTS idx_materials_subtopic_id;
DROP INDEX IF EXISTS idx_materials_teacher_id;
DROP INDEX IF EXISTS idx_materials_document_metadata;
DROP INDEX IF EXISTS idx_materials_file_category;
DROP INDEX IF EXISTS idx_materials_viewer_type;
DROP INDEX IF EXISTS idx_materials_file_extension;
DROP INDEX IF EXISTS idx_materials_created_by;
DROP INDEX IF EXISTS idx_materials_status;
DROP INDEX IF EXISTS idx_materials_type;

-- Programs
DROP INDEX IF EXISTS idx_programs_provider_id;

-- Reports Cache Student
DROP INDEX IF EXISTS idx_reports_cache_student_subject_id;
DROP INDEX IF EXISTS idx_reports_cache_student_topic_id;

-- SMTP Configuration
DROP INDEX IF EXISTS idx_smtp_configuration_company_id;

-- Student Achievements
DROP INDEX IF EXISTS idx_student_achievements_achievement_id;

-- Student Class Sections
DROP INDEX IF EXISTS idx_student_class_sections_academic_year_id;
DROP INDEX IF EXISTS idx_student_class_sections_class_section_id;

-- Student Daily Challenges
DROP INDEX IF EXISTS idx_student_daily_challenges_challenge_id;

-- Student Licenses
DROP INDEX IF EXISTS idx_student_licenses_student_id;

-- Students
DROP INDEX IF EXISTS idx_students_branch_id;
DROP INDEX IF EXISTS idx_students_class_section_id;

-- Sub Questions
DROP INDEX IF EXISTS idx_sub_questions_confirmed_by;
DROP INDEX IF EXISTS idx_sub_questions_parent_id;

-- Suspicious Activities
DROP INDEX IF EXISTS idx_suspicious_activities_material_id;
DROP INDEX IF EXISTS idx_suspicious_activities_reviewed_by;
DROP INDEX IF EXISTS idx_suspicious_activities_user_id;

-- Table Template Cells
DROP INDEX IF EXISTS idx_table_template_cells_template_id;

-- Table Templates
DROP INDEX IF EXISTS idx_table_templates_question_id;
DROP INDEX IF EXISTS idx_table_templates_sub_question_id;

-- Teacher Branches
DROP INDEX IF EXISTS idx_teacher_branches_branch_id;

-- Teacher Departments
DROP INDEX IF EXISTS idx_teacher_departments_department_id;

-- Teacher Grade Levels
DROP INDEX IF EXISTS idx_teacher_grade_levels_grade_level_id;

-- Teacher Programs
DROP INDEX IF EXISTS idx_teacher_programs_program_id;

-- Teacher Schools
DROP INDEX IF EXISTS idx_teacher_schools_school_id;

-- Teacher Sections
DROP INDEX IF EXISTS idx_teacher_sections_grade_level_id;
DROP INDEX IF EXISTS idx_teacher_sections_section_id;

-- Teacher Subjects
DROP INDEX IF EXISTS idx_teacher_subjects_subject_id;

-- Teachers
DROP INDEX IF EXISTS idx_teachers_department_id;

-- Branches
DROP INDEX IF EXISTS idx_branches_created_by;
DROP INDEX IF EXISTS idx_branches_updated_by;

-- Cities
DROP INDEX IF EXISTS idx_cities_country_id;

-- Companies
DROP INDEX IF EXISTS idx_companies_country_id;
DROP INDEX IF EXISTS idx_companies_region_id;

-- Configuration Templates
DROP INDEX IF EXISTS idx_configuration_templates_company_id;

-- Countries
DROP INDEX IF EXISTS idx_countries_region_id;

-- Data Structures
DROP INDEX IF EXISTS idx_data_structures_program_id;
DROP INDEX IF EXISTS idx_data_structures_provider_id;

-- Department Branches
DROP INDEX IF EXISTS idx_department_branches_branch_id;

-- Department Schools
DROP INDEX IF EXISTS idx_department_schools_school_id;

-- Education Catalogue
DROP INDEX IF EXISTS idx_edu_learning_objectives_subtopic_id;
DROP INDEX IF EXISTS idx_edu_specific_concepts_objective_id;

-- Email Queue
DROP INDEX IF EXISTS idx_email_queue_company_id;

-- Entity Admin Audit Log
DROP INDEX IF EXISTS idx_entity_admin_audit_log_company_id;

-- Entity Positions
DROP INDEX IF EXISTS idx_entity_positions_reports_to;

-- Entity Users
DROP INDEX IF EXISTS idx_entity_users_department_id;
DROP INDEX IF EXISTS idx_entity_users_parent_admin_id;
