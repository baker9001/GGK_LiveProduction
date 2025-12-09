/*
  # Add Missing Foreign Key Indexes - Part 1: Core Tables
  
  This migration adds indexes for unindexed foreign keys on core entity tables
  to improve query performance for JOINs and lookups.

  ## Tables Covered:
  - academic_year_schools (school_id)
  - ai_study_plans (approved_by, student_id)
  - branches (created_by, updated_by)
  - cities (country_id)
  - companies (country, region)
  - configuration_templates (company_id)
  - countries (region_id)
  - data_structures (program_id, provider_id)
  - department_branches (branch_id)
  - department_schools (school_id)
  - edu_learning_objectives (subtopic_id)
  - edu_specific_concepts (objective_id)
  - email_queue (company_id)
  - entity_admin_audit_log (company_id)
  - entity_positions (reports_to_position_id)
  - entity_users (department_id, parent_admin_id)

  ## Security:
  - No RLS changes
  - Indexes only improve performance, no data access changes
*/

-- academic_year_schools.school_id
CREATE INDEX IF NOT EXISTS idx_academic_year_schools_school_id 
ON public.academic_year_schools(school_id);

-- ai_study_plans.approved_by
CREATE INDEX IF NOT EXISTS idx_ai_study_plans_approved_by 
ON public.ai_study_plans(approved_by);

-- ai_study_plans.student_id
CREATE INDEX IF NOT EXISTS idx_ai_study_plans_student_id 
ON public.ai_study_plans(student_id);

-- branches.created_by
CREATE INDEX IF NOT EXISTS idx_branches_created_by 
ON public.branches(created_by);

-- branches.updated_by
CREATE INDEX IF NOT EXISTS idx_branches_updated_by 
ON public.branches(updated_by);

-- cities.country_id
CREATE INDEX IF NOT EXISTS idx_cities_country_id 
ON public.cities(country_id);

-- companies.country_id (fk_companies_country)
CREATE INDEX IF NOT EXISTS idx_companies_country_id 
ON public.companies(country_id);

-- companies.region_id (fk_companies_region)
CREATE INDEX IF NOT EXISTS idx_companies_region_id 
ON public.companies(region_id);

-- configuration_templates.company_id
CREATE INDEX IF NOT EXISTS idx_configuration_templates_company_id 
ON public.configuration_templates(company_id);

-- countries.region_id
CREATE INDEX IF NOT EXISTS idx_countries_region_id 
ON public.countries(region_id);

-- data_structures.program_id
CREATE INDEX IF NOT EXISTS idx_data_structures_program_id 
ON public.data_structures(program_id);

-- data_structures.provider_id
CREATE INDEX IF NOT EXISTS idx_data_structures_provider_id 
ON public.data_structures(provider_id);

-- department_branches.branch_id
CREATE INDEX IF NOT EXISTS idx_department_branches_branch_id 
ON public.department_branches(branch_id);

-- department_schools.school_id
CREATE INDEX IF NOT EXISTS idx_department_schools_school_id 
ON public.department_schools(school_id);

-- edu_learning_objectives.subtopic_id
CREATE INDEX IF NOT EXISTS idx_edu_learning_objectives_subtopic_id 
ON public.edu_learning_objectives(subtopic_id);

-- edu_specific_concepts.objective_id
CREATE INDEX IF NOT EXISTS idx_edu_specific_concepts_objective_id 
ON public.edu_specific_concepts(objective_id);

-- email_queue.company_id
CREATE INDEX IF NOT EXISTS idx_email_queue_company_id 
ON public.email_queue(company_id);

-- entity_admin_audit_log.company_id
CREATE INDEX IF NOT EXISTS idx_entity_admin_audit_log_company_id 
ON public.entity_admin_audit_log(company_id);

-- entity_positions.reports_to_position_id
CREATE INDEX IF NOT EXISTS idx_entity_positions_reports_to 
ON public.entity_positions(reports_to_position_id);

-- entity_users.department_id
CREATE INDEX IF NOT EXISTS idx_entity_users_department_id 
ON public.entity_users(department_id);

-- entity_users.parent_admin_id
CREATE INDEX IF NOT EXISTS idx_entity_users_parent_admin_id 
ON public.entity_users(parent_admin_id);
