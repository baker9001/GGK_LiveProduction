# Mock Exam Wizard "Failed to Load Exam Data" - Fix Summary

## Issue Description
Users were encountering a "Failed to Load Exam Data" error when opening the mock exam status transition wizard. The error prevented the wizard from loading, making it impossible to update exam statuses.

## Root Cause
The issue was caused by missing or incorrectly configured Row Level Security (RLS) policies that prevented entity users from reading mock exam data and related tables:

1. **Missing SELECT policies** - Entity admins, school admins, and branch admins did not have explicit SELECT policies on the `mock_exams` table
2. **Incorrect helper functions** - The `is_system_admin()` function was using the wrong column name (`user_id` instead of `id`) for the `admin_users` table
3. **Incomplete related table policies** - Tables like `data_structures` and `questions_master_admin` lacked proper SELECT policies for authenticated users
4. **Service layer used `.single()`** - The service was using `.single()` which throws an error on no results, instead of `.maybeSingle()`

## Solution Implemented

### 1. Database Migration (`20251003154812_fix_mock_exam_wizard_data_access.sql`)

Created a comprehensive migration that:

#### Helper Functions
- **`is_system_admin()`** - Fixed to use `admin_users.id` instead of non-existent `user_id` column
- **`is_entity_admin(company_uuid)`** - Checks if user is an entity admin for a specific company
- **`user_has_exam_access(exam_id)`** - Comprehensive function that checks if user has access via entity admin, school admin, or branch admin roles

#### RLS Policies on `mock_exams` Table
- **Entity admins** can view all exams in their company
- **School admins** can view exams assigned to their schools
- **Branch admins** can view exams assigned to their branches
- **System admins** can view all exams (via existing policy)

#### Related Tables
- **`data_structures`** - Added policy for authenticated users to view active data structures
- **`questions_master_admin`** - Added policy for authenticated users to view active questions

#### Wizard Tables
- **`mock_exam_stage_progress`** - SELECT, INSERT, UPDATE, DELETE policies using `user_has_exam_access()`
- **`mock_exam_instructions`** - SELECT, INSERT, UPDATE, DELETE policies using `user_has_exam_access()`
- **`mock_exam_questions`** - SELECT, INSERT, UPDATE, DELETE policies using `user_has_exam_access()`

#### Junction Tables
- **`mock_exam_schools`** - SELECT policy using `user_has_exam_access()`
- **`mock_exam_branches`** - SELECT policy using `user_has_exam_access()`
- **`mock_exam_grade_levels`** - SELECT policy using `user_has_exam_access()`
- **`mock_exam_sections`** - SELECT policy using `user_has_exam_access()`
- **`mock_exam_teachers`** - SELECT policy using `user_has_exam_access()`

#### Performance Indexes
Added indexes to optimize RLS policy checks:
- `idx_entity_users_user_company_active` - For entity user lookups
- `idx_entity_user_schools_entity_user_school` - For school admin lookups
- `idx_entity_user_branches_entity_user_branch` - For branch admin lookups
- `idx_mock_exam_schools_exam_school` - For exam-school relationships
- `idx_mock_exam_branches_exam_branch` - For exam-branch relationships
- `idx_admin_users_id` - For admin user lookups
- `idx_mock_exams_company` - For company-based exam queries

### 2. Service Layer Improvements (`src/services/mockExamService.ts`)

#### Changed `.single()` to `.maybeSingle()`
- Changed from `.single()` which throws on no results
- To `.maybeSingle()` which returns null gracefully
- Prevents unnecessary error throwing for missing data

#### Enhanced Error Handling
Added specific error categorization:
- **PGRST116** - Exam not found (deleted)
- **PGRST301 / JWT errors** - Authentication errors
- **Policy/Permission errors** - Permission denied with helpful message
- **Network errors** - Network connectivity issues
- **Generic errors** - Catch-all with error message

#### Better Error Messages
All errors now include:
- Clear description of the problem
- Actionable next steps (e.g., "contact administrator")
- Contextual information about the failure

## Testing
- ✅ Build completed successfully without errors
- ✅ All RLS policies applied without conflicts
- ✅ Helper functions created with proper SECURITY DEFINER
- ✅ Indexes created for optimal query performance
- ✅ Function permissions granted to authenticated role

## Expected Behavior After Fix

### For Entity Admins
- Can view and modify all mock exams in their company
- Can access the status wizard for any exam in their company
- Can update exam statuses, instructions, and questions

### For School Admins
- Can view mock exams assigned to their schools
- Can access the status wizard for exams in their schools
- Can update exam statuses for their schools' exams

### For Branch Admins
- Can view mock exams assigned to their branches
- Can access the status wizard for exams in their branches
- Can update exam statuses for their branches' exams

### For System Admins
- Can view and modify all mock exams across all companies
- Full access to all wizard functionality

## Security Notes

### Data Access Boundaries
- Entity admins: Limited to their company
- School admins: Limited to their assigned schools
- Branch admins: Limited to their assigned branches
- System admins: Full access across platform

### SECURITY DEFINER Functions
All helper functions use `SECURITY DEFINER` to:
- Avoid infinite recursion in RLS policies
- Centralize permission logic
- Ensure consistent security checks

### Active Status Checks
All policies verify:
- User is active (`is_active = true`)
- Proper admin level assignment
- Valid company/school/branch relationships

## Files Changed
1. `/supabase/migrations/20251003154812_fix_mock_exam_wizard_data_access.sql` - Database migration
2. `/src/services/mockExamService.ts` - Service layer error handling

## Migration Applied
The migration was successfully applied to the database using individual SQL statements via the Supabase MCP tool.

## Next Steps
The fix is now complete. Users should be able to:
1. Open the status transition wizard without errors
2. View exam data including stage progress, instructions, and questions
3. Update exam statuses and related information
4. See clear error messages if permissions are denied

If users still experience issues, verify:
- User has an active `entity_users` record with correct `company_id`
- User's `admin_level` is set correctly ('entity_admin', 'sub_entity_admin', 'school_admin', or 'branch_admin')
- For school/branch admins, proper assignments exist in `entity_user_schools` or `entity_user_branches`
- The exam exists and hasn't been deleted
