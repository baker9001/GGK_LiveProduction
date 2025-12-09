/*
  # Add Missing Foreign Key Indexes - Part 4: Remaining Tables
  
  This migration adds indexes for unindexed foreign keys on remaining tables.

  ## Tables Covered:
  - license_actions (license_id)
  - material_access_logs (material_id)
  - materials (topic, unit, data_structure_id, grade_id, school_id, subtopic_id, teacher_id)
  - programs (provider_id)
  - reports_cache_student (subject_id, topic_id)
  - smtp_configuration (company_id)
  - student_achievements (achievement_id)
  - student_class_sections (academic_year_id, class_section_id)
  - student_daily_challenges (challenge_id)
  - student_licenses (student_id)
  - students (branch_id, class_section_id)
  - sub_questions (confirmed_by, parent_id)
  - suspicious_activities (material_id, reviewed_by, user_id)
  - table_template_cells (template_id)
  - table_templates (question_id, sub_question_id)
  - teacher_branches (branch_id)
  - teacher_departments (department_id)
  - teacher_grade_levels (grade_level_id)
  - teacher_programs (program_id)
  - teacher_schools (school_id)
  - teacher_sections (grade_level_id, section_id)
  - teacher_subjects (subject_id)
  - teachers (department_id)

  ## Security:
  - No RLS changes
  - Indexes only improve performance
*/

-- license_actions.license_id
CREATE INDEX IF NOT EXISTS idx_license_actions_license_id 
ON public.license_actions(license_id);

-- material_access_logs.material_id
CREATE INDEX IF NOT EXISTS idx_material_access_logs_material_id 
ON public.material_access_logs(material_id);

-- materials.topic_id (fk_materials_topic)
CREATE INDEX IF NOT EXISTS idx_materials_topic_id 
ON public.materials(topic_id);

-- materials.unit_id (fk_materials_unit)
CREATE INDEX IF NOT EXISTS idx_materials_unit_id 
ON public.materials(unit_id);

-- materials.data_structure_id
CREATE INDEX IF NOT EXISTS idx_materials_data_structure_id 
ON public.materials(data_structure_id);

-- materials.grade_id
CREATE INDEX IF NOT EXISTS idx_materials_grade_id 
ON public.materials(grade_id);

-- materials.school_id
CREATE INDEX IF NOT EXISTS idx_materials_school_id 
ON public.materials(school_id);

-- materials.subtopic_id
CREATE INDEX IF NOT EXISTS idx_materials_subtopic_id 
ON public.materials(subtopic_id);

-- materials.teacher_id
CREATE INDEX IF NOT EXISTS idx_materials_teacher_id 
ON public.materials(teacher_id);

-- programs.provider_id
CREATE INDEX IF NOT EXISTS idx_programs_provider_id 
ON public.programs(provider_id);

-- reports_cache_student.subject_id
CREATE INDEX IF NOT EXISTS idx_reports_cache_student_subject_id 
ON public.reports_cache_student(subject_id);

-- reports_cache_student.topic_id
CREATE INDEX IF NOT EXISTS idx_reports_cache_student_topic_id 
ON public.reports_cache_student(topic_id);

-- smtp_configuration.company_id
CREATE INDEX IF NOT EXISTS idx_smtp_configuration_company_id 
ON public.smtp_configuration(company_id);

-- student_achievements.achievement_id
CREATE INDEX IF NOT EXISTS idx_student_achievements_achievement_id 
ON public.student_achievements(achievement_id);

-- student_class_sections.academic_year_id
CREATE INDEX IF NOT EXISTS idx_student_class_sections_academic_year_id 
ON public.student_class_sections(academic_year_id);

-- student_class_sections.class_section_id
CREATE INDEX IF NOT EXISTS idx_student_class_sections_class_section_id 
ON public.student_class_sections(class_section_id);

-- student_daily_challenges.challenge_id
CREATE INDEX IF NOT EXISTS idx_student_daily_challenges_challenge_id 
ON public.student_daily_challenges(challenge_id);

-- student_licenses.student_id
CREATE INDEX IF NOT EXISTS idx_student_licenses_student_id 
ON public.student_licenses(student_id);

-- students.branch_id
CREATE INDEX IF NOT EXISTS idx_students_branch_id 
ON public.students(branch_id);

-- students.class_section_id
CREATE INDEX IF NOT EXISTS idx_students_class_section_id 
ON public.students(class_section_id);

-- sub_questions.confirmed_by
CREATE INDEX IF NOT EXISTS idx_sub_questions_confirmed_by 
ON public.sub_questions(confirmed_by);

-- sub_questions.parent_id
CREATE INDEX IF NOT EXISTS idx_sub_questions_parent_id 
ON public.sub_questions(parent_id);

-- suspicious_activities.material_id
CREATE INDEX IF NOT EXISTS idx_suspicious_activities_material_id 
ON public.suspicious_activities(material_id);

-- suspicious_activities.reviewed_by
CREATE INDEX IF NOT EXISTS idx_suspicious_activities_reviewed_by 
ON public.suspicious_activities(reviewed_by);

-- suspicious_activities.user_id
CREATE INDEX IF NOT EXISTS idx_suspicious_activities_user_id 
ON public.suspicious_activities(user_id);

-- table_template_cells.template_id
CREATE INDEX IF NOT EXISTS idx_table_template_cells_template_id 
ON public.table_template_cells(template_id);

-- table_templates.question_id
CREATE INDEX IF NOT EXISTS idx_table_templates_question_id 
ON public.table_templates(question_id);

-- table_templates.sub_question_id
CREATE INDEX IF NOT EXISTS idx_table_templates_sub_question_id 
ON public.table_templates(sub_question_id);

-- teacher_branches.branch_id
CREATE INDEX IF NOT EXISTS idx_teacher_branches_branch_id 
ON public.teacher_branches(branch_id);

-- teacher_departments.department_id
CREATE INDEX IF NOT EXISTS idx_teacher_departments_department_id 
ON public.teacher_departments(department_id);

-- teacher_grade_levels.grade_level_id
CREATE INDEX IF NOT EXISTS idx_teacher_grade_levels_grade_level_id 
ON public.teacher_grade_levels(grade_level_id);

-- teacher_programs.program_id
CREATE INDEX IF NOT EXISTS idx_teacher_programs_program_id 
ON public.teacher_programs(program_id);

-- teacher_schools.school_id
CREATE INDEX IF NOT EXISTS idx_teacher_schools_school_id 
ON public.teacher_schools(school_id);

-- teacher_sections.grade_level_id
CREATE INDEX IF NOT EXISTS idx_teacher_sections_grade_level_id 
ON public.teacher_sections(grade_level_id);

-- teacher_sections.section_id
CREATE INDEX IF NOT EXISTS idx_teacher_sections_section_id 
ON public.teacher_sections(section_id);

-- teacher_subjects.subject_id
CREATE INDEX IF NOT EXISTS idx_teacher_subjects_subject_id 
ON public.teacher_subjects(subject_id);

-- teachers.department_id
CREATE INDEX IF NOT EXISTS idx_teachers_department_id 
ON public.teachers(department_id);
