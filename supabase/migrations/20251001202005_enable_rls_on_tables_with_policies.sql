/*
  # Enable RLS on Tables With Policies

  ## Overview
  Enables Row Level Security on 22 tables that have RLS policies defined
  but RLS is not enabled. This is a critical security issue as policies
  are not enforced when RLS is disabled.

  ## Security Impact
  - Policies will now be enforced on these tables
  - Prevents unauthorized data access
  - Critical for data security compliance

  ## Tables Updated (22 tables)
  - admin_invitations (5 policies)
  - audit_logs (7 policies)
  - cities (5 policies)
  - countries (5 policies)
  - data_structures (4 policies)
  - departments (9 policies)
  - edu_subjects (4 policies)
  - email_verifications (2 policies)
  - entity_admin_audit_log (1 policy)
  - entity_admin_hierarchy (2 policies)
  - entity_admin_scope (1 policy)
  - materials (7 policies)
  - parent_students (2 policies)
  - parents (2 policies)
  - password_reset_tokens (2 policies)
  - programs (4 policies)
  - providers (4 policies)
  - question_confirmations (2 policies)
  - regions (4 policies)
  - role_permissions (5 policies)
  - roles (7 policies)
  - test_mode_logs (1 policy)
*/

-- ============================================================================
-- ENABLE RLS ON ALL TABLES WITH EXISTING POLICIES
-- ============================================================================

ALTER TABLE admin_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE edu_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_admin_hierarchy ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_admin_scope ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_mode_logs ENABLE ROW LEVEL SECURITY;
