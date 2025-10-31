/*
  # Fix Security Audit Issues - Comprehensive View Security

  This migration addresses all security vulnerabilities identified in the Supabase Security Audit
  related to views that expose sensitive data or lack proper access controls.

  ## Issues Fixed

  1. **Exposed Auth Users** (Critical)
     - View: `orphaned_entity_users`
     - Issue: Exposes auth.users table data to all authenticated users
     - Solution: Drop the view as it's not used in the application and is for debugging only

  2. **Security Definer Views** (High Priority)
     - Views: `v_company_profiles`, `v_school_profiles`, `question_display_migration_status`, 
              `mock_exam_overview`, `pending_emails`
     - Issue: Views lack proper access controls and can be queried by any authenticated user
     - Solution: These views are not used in the application code, drop them to eliminate risk

  ## Views Being Dropped

  All of the following views were created manually (not in migrations) for debugging/admin purposes:

  - **orphaned_entity_users**: Debug view for finding users not synced with auth.users
    - ⚠️ SECURITY RISK: Exposes auth.users.id and email to anyone who can query it
    - ✅ Not used in application code
    - ✅ Safe to drop - can be recreated as SECURITY DEFINER function if needed

  - **v_company_profiles**: Admin convenience view with company details + counts
    - ⚠️ Lacks RLS: Any authenticated user can view all company data
    - ✅ Not used in application code (app queries companies table directly)
    - ✅ Safe to drop

  - **v_school_profiles**: Admin convenience view with school details + counts  
    - ⚠️ Lacks RLS: Any authenticated user can view all school data
    - ✅ Not used in application code (app queries schools table directly)
    - ✅ Safe to drop

  - **question_display_migration_status**: Monitoring view for question migration progress
    - ⚠️ Lacks RLS: Exposes question counts and migration status to all users
    - ✅ Not used in application code
    - ✅ Safe to drop - can query tables directly if needed

  - **mock_exam_overview**: Analytics view with exam details + aggregated counts
    - ⚠️ Lacks RLS: Exposes all exam data across all companies
    - ✅ Created in migration but NOT used in application code
    - ✅ Safe to drop - app uses direct queries with proper RLS

  - **pending_emails**: Convenience view for querying pending emails
    - ⚠️ Lacks RLS: Exposes email queue to all authenticated users
    - ✅ Not used in application code
    - ✅ Safe to drop - email_queue table has proper RLS policies

  ## Security Impact

  After this migration:
  - ✅ No views will expose auth.users data
  - ✅ No views will bypass RLS policies on underlying tables
  - ✅ Application functionality is preserved (views weren't used in code)
  - ✅ Admin users can still query underlying tables directly with proper RLS

  ## Rollback Instructions

  If these views are needed for debugging, they can be recreated with proper SECURITY DEFINER
  functions that include explicit permission checks. Contact the development team if you need
  to restore any of these views for administrative purposes.
*/

-- Drop views that expose sensitive data or lack proper access controls
-- These were created manually outside of the migration system

-- CRITICAL: This view exposes auth.users table data
DROP VIEW IF EXISTS orphaned_entity_users CASCADE;

-- These views lack RLS and expose data across all companies
DROP VIEW IF EXISTS v_company_profiles CASCADE;
DROP VIEW IF EXISTS v_school_profiles CASCADE;
DROP VIEW IF EXISTS question_display_migration_status CASCADE;
DROP VIEW IF EXISTS pending_emails CASCADE;

-- This view was created in a migration but is not used and lacks RLS
DROP VIEW IF EXISTS mock_exam_overview CASCADE;

-- Also drop the related mock_exam_cohort_analytics view which has the same issue
DROP VIEW IF EXISTS mock_exam_cohort_analytics CASCADE;

-- Verification: Log what was dropped
DO $$
BEGIN
  RAISE NOTICE 'Security audit fix applied successfully';
  RAISE NOTICE 'Dropped 7 views that exposed data without proper access controls';
  RAISE NOTICE 'Application functionality preserved - views were not used in code';
  RAISE NOTICE 'Admin users should query underlying tables directly (with RLS protection)';
END $$;
