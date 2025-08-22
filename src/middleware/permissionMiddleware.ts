/**
 * File: /src/middleware/permissionMiddleware.ts
 * 
 * API-LEVEL PERMISSION ENFORCEMENT
 * Middleware for checking permissions at the API level
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { AdminPermissions } from '@/app/entity-module/organisation/tabs/admins/types/admin.types';

interface PermissionRequirement {
  category: keyof AdminPermissions;
  permission: string;
  requireAll?: boolean;
}

/**
 * API Route permission checker
 */
export async function checkApiPermission(
  request: NextRequest,
  requirements: PermissionRequirement[]
): Promise<{ hasPermission: boolean; userId?: string; error?: string }> {
  try {
    // Get auth token from request
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { hasPermission: false, error: 'No authorization token provided' };
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return { hasPermission: false, error: 'Invalid or expired token' };
    }

    // Get user's permissions
    const { data: adminUser, error: adminError } = await supabase
      .from('entity_users')
      .select('permissions, is_active')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (adminError || !adminUser) {
      return { hasPermission: false, error: 'User is not an active administrator' };
    }

    const permissions = adminUser.permissions as AdminPermissions;

    // Check requirements
    const requireAll = requirements.some(r => r.requireAll);
    
    if (requireAll) {
      // All requirements must be met
      const allMet = requirements.every(req => 
        (permissions[req.category] as any)?.[req.permission] === true
      );
      return { hasPermission: allMet, userId: user.id };
    } else {
      // At least one requirement must be met
      const anyMet = requirements.some(req => 
        (permissions[req.category] as any)?.[req.permission] === true
      );
      return { hasPermission: anyMet, userId: user.id };
    }
  } catch (error) {
    console.error('Permission check error:', error);
    return { hasPermission: false, error: 'Internal server error' };
  }
}

/**
 * Create permission-protected API route handler
 */
export function withPermissions(
  requirements: PermissionRequirement[],
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (req: NextRequest, context?: any) => {
    const { hasPermission, userId, error } = await checkApiPermission(req, requirements);

    if (!hasPermission) {
      return NextResponse.json(
        { error: error || 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Add userId to request for use in handler
    (req as any).userId = userId;

    return handler(req, context);
  };
}

/**
 * Permission requirements for common operations
 */
export const PermissionRequirements = {
  // School operations
  CREATE_SCHOOL: [{ category: 'organization' as const, permission: 'create_school' }],
  MODIFY_SCHOOL: [{ category: 'organization' as const, permission: 'modify_school' }],
  DELETE_SCHOOL: [{ category: 'organization' as const, permission: 'delete_school' }],
  VIEW_SCHOOLS: [{ category: 'organization' as const, permission: 'view_all_schools' }],

  // Branch operations
  CREATE_BRANCH: [{ category: 'organization' as const, permission: 'create_branch' }],
  MODIFY_BRANCH: [{ category: 'organization' as const, permission: 'modify_branch' }],
  DELETE_BRANCH: [{ category: 'organization' as const, permission: 'delete_branch' }],
  VIEW_BRANCHES: [{ category: 'organization' as const, permission: 'view_all_branches' }],

  // User operations
  CREATE_TEACHER: [{ category: 'users' as const, permission: 'create_teacher' }],
  MODIFY_TEACHER: [{ category: 'users' as const, permission: 'modify_teacher' }],
  CREATE_STUDENT: [{ category: 'users' as const, permission: 'create_student' }],
  MODIFY_STUDENT: [{ category: 'users' as const, permission: 'modify_student' }],
  DELETE_USERS: [{ category: 'users' as const, permission: 'delete_users' }],
  VIEW_ALL_USERS: [{ category: 'users' as const, permission: 'view_all_users' }],

  // Admin operations
  CREATE_ADMIN: [
    { category: 'users' as const, permission: 'create_entity_admin' },
    { category: 'users' as const, permission: 'create_sub_admin' },
    { category: 'users' as const, permission: 'create_school_admin' },
    { category: 'users' as const, permission: 'create_branch_admin' }
  ],
  MODIFY_ADMIN: [
    { category: 'users' as const, permission: 'modify_entity_admin' },
    { category: 'users' as const, permission: 'modify_sub_admin' },
    { category: 'users' as const, permission: 'modify_school_admin' },
    { category: 'users' as const, permission: 'modify_branch_admin' }
  ],

  // Settings operations
  MANAGE_COMPANY_SETTINGS: [{ category: 'settings' as const, permission: 'manage_company_settings' }],
  MANAGE_SCHOOL_SETTINGS: [{ category: 'settings' as const, permission: 'manage_school_settings' }],
  MANAGE_BRANCH_SETTINGS: [{ category: 'settings' as const, permission: 'manage_branch_settings' }],
  VIEW_AUDIT_LOGS: [{ category: 'settings' as const, permission: 'view_audit_logs' }],
  EXPORT_DATA: [{ category: 'settings' as const, permission: 'export_data' }],
} as const;

/**
 * Example API route with permissions
 */
export async function exampleApiRoute(req: NextRequest) {
  return withPermissions(
    PermissionRequirements.CREATE_SCHOOL,
    async (req) => {
      // Your API logic here
      const body = await req.json();
      
      // The userId is available from the permission check
      const userId = (req as any).userId;
      
      // Perform the operation
      const { data, error } = await supabase
        .from('schools')
        .insert([{ ...body, created_by: userId }])
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ data }, { status: 201 });
    }
  )(req);
}

/**
 * Supabase RLS Policy Examples
 * Add these policies to your Supabase dashboard
 */
export const RLSPolicies = `
-- Example RLS policies for permission-based access

-- Schools table policies
CREATE POLICY "Users can view schools based on permissions" ON schools
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM entity_users
      WHERE user_id = auth.uid()
      AND is_active = true
      AND (permissions->'organization'->>'view_all_schools')::boolean = true
    )
  );

CREATE POLICY "Users can create schools based on permissions" ON schools
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM entity_users
      WHERE user_id = auth.uid()
      AND is_active = true
      AND (permissions->'organization'->>'create_school')::boolean = true
    )
  );

CREATE POLICY "Users can update schools based on permissions" ON schools
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM entity_users
      WHERE user_id = auth.uid()
      AND is_active = true
      AND (permissions->'organization'->>'modify_school')::boolean = true
    )
  );

-- Branches table policies
CREATE POLICY "Users can view branches based on permissions" ON branches
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM entity_users
      WHERE user_id = auth.uid()
      AND is_active = true
      AND (permissions->'organization'->>'view_all_branches')::boolean = true
    )
  );

-- Entity users table policies
CREATE POLICY "Users can view admins based on permissions" ON entity_users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM entity_users eu
      WHERE eu.user_id = auth.uid()
      AND eu.is_active = true
      AND (eu.permissions->'users'->>'view_all_users')::boolean = true
    )
  );

-- Audit logs table policies
CREATE POLICY "Users can view audit logs based on permissions" ON entity_admin_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM entity_users
      WHERE user_id = auth.uid()
      AND is_active = true
      AND (permissions->'settings'->>'view_audit_logs')::boolean = true
    )
  );
`;