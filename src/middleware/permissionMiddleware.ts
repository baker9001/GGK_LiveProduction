/**
 * File: /src/middleware/permissionMiddleware.ts
 * Dependencies:
 *   - @/lib/supabase
 *   - @/app/entity-module/organisation/tabs/admins/types/admin.types
 *   - @/app/entity-module/organisation/tabs/admins/services/permissionService
 *   - @/app/entity-module/organisation/tabs/admins/services/scopeService
 *   - External: next/server
 * 
 * Preserved Features:
 *   - API route permission checking
 *   - Bearer token authentication
 *   - Permission requirements definitions
 *   - RLS policy examples
 * 
 * Added/Modified:
 *   - Module-level access control based on user_type
 *   - Scope-based permission checking
 *   - Admin hierarchy enforcement
 *   - Audit logging for permission checks
 *   - Enhanced error handling with specific messages
 *   - Support for both users and entity_users tables
 * 
 * Database Tables:
 *   - users (user_type, email_verified)
 *   - entity_users (admin_level, permissions, is_active)
 *   - entity_user_schools (scope assignments)
 *   - entity_user_branches (scope assignments)
 *   - entity_admin_audit_log (audit trail)
 * 
 * Connected Files:
 *   - permissionService.ts (permission logic)
 *   - scopeService.ts (scope management)
 *   - admin.types.ts (type definitions)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { AdminPermissions, AdminLevel } from '@/app/entity-module/organisation/tabs/admins/types/admin.types';
import { permissionService } from '@/app/entity-module/organisation/tabs/admins/services/permissionService';
import { scopeService } from '@/app/entity-module/organisation/tabs/admins/services/scopeService';

// ============= TYPE DEFINITIONS =============

export type UserType = 'system' | 'entity' | 'teacher' | 'student' | 'parent';

interface PermissionRequirement {
  category: keyof AdminPermissions;
  permission: string;
  requireAll?: boolean;
}

interface ModuleAccessRequirement {
  allowedUserTypes: UserType[];
  allowedAdminLevels?: AdminLevel[];
}

interface PermissionCheckResult {
  hasPermission: boolean;
  userId?: string;
  userType?: UserType;
  adminLevel?: AdminLevel;
  companyId?: string;
  error?: string;
  details?: any;
}

// ============= MODULE ACCESS DEFINITIONS =============

/**
 * Module access control based on user types
 * Implements the agreed plan's module restrictions
 */
export const ModuleAccessControl: Record<string, ModuleAccessRequirement> = {
  '/app/system-admin': {
    allowedUserTypes: ['system']
  },
  '/app/entity-module': {
    allowedUserTypes: ['entity'],
    allowedAdminLevels: ['entity_admin', 'sub_entity_admin', 'school_admin', 'branch_admin']
  },
  '/app/teachers-module': {
    allowedUserTypes: ['teacher']
  },
  '/app/student-module': {
    allowedUserTypes: ['student']
  },
  '/app/parent-module': {
    allowedUserTypes: ['parent']
  }
};

// ============= CORE PERMISSION CHECKING =============

/**
 * Enhanced API Route permission checker
 * Checks both module access and specific permissions
 */
export async function checkApiPermission(
  request: NextRequest,
  requirements: PermissionRequirement[],
  options?: {
    checkModuleAccess?: boolean;
    scopeId?: string;
    scopeType?: 'company' | 'school' | 'branch';
    logAudit?: boolean;
  }
): Promise<PermissionCheckResult> {
  try {
    // 1. Extract and validate auth token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { hasPermission: false, error: 'No authorization token provided' };
    }

    const token = authHeader.replace('Bearer ', '');

    // 2. Verify token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return { hasPermission: false, error: 'Invalid or expired token' };
    }

    // 3. Get user details from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, user_type, is_active, email_verified')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return { hasPermission: false, error: 'User not found' };
    }

    // 4. Check if user is active and verified
    if (!userData.is_active) {
      return { hasPermission: false, error: 'User account is inactive' };
    }

    if (!userData.email_verified) {
      return { hasPermission: false, error: 'Email verification required' };
    }

    // 5. Check module access based on user type
    if (options?.checkModuleAccess) {
      const pathname = request.nextUrl.pathname;
      const moduleAccess = Object.entries(ModuleAccessControl).find(([path]) => 
        pathname.startsWith(path)
      );

      if (moduleAccess) {
        const [, requirement] = moduleAccess;
        if (!requirement.allowedUserTypes.includes(userData.user_type as UserType)) {
          return { 
            hasPermission: false, 
            error: 'Access denied for this user type',
            userType: userData.user_type as UserType
          };
        }
      }
    }

    // 6. For non-entity users, check basic permissions
    if (userData.user_type !== 'entity') {
      // Teachers, students, and parents have limited permissions
      // They can only access their own modules and data
      return {
        hasPermission: true,
        userId: user.id,
        userType: userData.user_type as UserType
      };
    }

    // 7. For entity users, get admin details and permissions
    const { data: adminUser, error: adminError } = await supabase
      .from('entity_users')
      .select('admin_level, permissions, is_active, company_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (adminError || !adminUser) {
      return { hasPermission: false, error: 'User is not an active administrator' };
    }

    // 8. Check admin level restrictions if specified
    if (options?.checkModuleAccess) {
      const pathname = request.nextUrl.pathname;
      const moduleAccess = ModuleAccessControl[pathname.split('/').slice(0, 3).join('/')];
      
      if (moduleAccess?.allowedAdminLevels) {
        if (!moduleAccess.allowedAdminLevels.includes(adminUser.admin_level)) {
          return {
            hasPermission: false,
            error: 'Insufficient admin level for this operation',
            adminLevel: adminUser.admin_level
          };
        }
      }
    }

    // 9. Get effective permissions (base + scope-specific)
    const effectivePermissions = await permissionService.getEffectivePermissions(user.id);

    // 10. Check specific permission requirements
    const requireAll = requirements.some(r => r.requireAll);
    let hasRequiredPermissions = false;

    if (requireAll) {
      // All requirements must be met
      hasRequiredPermissions = requirements.every(req => 
        (effectivePermissions[req.category] as any)?.[req.permission] === true
      );
    } else {
      // At least one requirement must be met
      hasRequiredPermissions = requirements.some(req => 
        (effectivePermissions[req.category] as any)?.[req.permission] === true
      );
    }

    // 11. Check scope-based access if specified
    if (hasRequiredPermissions && options?.scopeId && options?.scopeType) {
      // For entity_admin and sub_entity_admin, always allow within their company
      if (adminUser.admin_level === 'entity_admin' || adminUser.admin_level === 'sub_entity_admin') {
        hasRequiredPermissions = true;
      } else {
        // For other admin levels, check scope assignment
        const hasScope = await scopeService.hasAccessToScope(
          user.id,
          options.scopeType,
          options.scopeId
        );
        hasRequiredPermissions = hasScope;
      }
    }

    // 12. Log audit trail if requested
    if (options?.logAudit) {
      await logPermissionCheck({
        userId: user.id,
        action: requirements.map(r => `${r.category}.${r.permission}`).join(','),
        result: hasRequiredPermissions,
        scopeId: options.scopeId,
        scopeType: options.scopeType,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent')
      });
    }

    return {
      hasPermission: hasRequiredPermissions,
      userId: user.id,
      userType: userData.user_type as UserType,
      adminLevel: adminUser?.admin_level,
      companyId: adminUser?.company_id
    };

  } catch (error) {
    console.error('Permission check error:', error);
    return { 
      hasPermission: false, 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// ============= MIDDLEWARE WRAPPER =============

/**
 * Create permission-protected API route handler
 * Wraps API routes with permission checking
 */
export function withPermissions(
  requirements: PermissionRequirement[],
  options?: {
    checkModuleAccess?: boolean;
    requireScope?: boolean;
    logAudit?: boolean;
  }
) {
  return function (
    handler: (req: NextRequest, context?: any) => Promise<NextResponse>
  ) {
    return async (req: NextRequest, context?: any) => {
      // Extract scope from request body or query params
      let scopeId: string | undefined;
      let scopeType: 'company' | 'school' | 'branch' | undefined;

      if (options?.requireScope) {
        try {
          const body = await req.clone().json();
          scopeId = body.scopeId || body.school_id || body.branch_id;
          scopeType = body.scopeType || (body.school_id ? 'school' : body.branch_id ? 'branch' : 'company');
        } catch {
          // If body parsing fails, check query params
          const { searchParams } = new URL(req.url);
          scopeId = searchParams.get('scopeId') || searchParams.get('school_id') || searchParams.get('branch_id') || undefined;
          scopeType = searchParams.get('scopeType') as any || (searchParams.get('school_id') ? 'school' : searchParams.get('branch_id') ? 'branch' : 'company');
        }
      }

      const result = await checkApiPermission(req, requirements, {
        checkModuleAccess: options?.checkModuleAccess ?? true,
        scopeId,
        scopeType,
        logAudit: options?.logAudit ?? false
      });

      if (!result.hasPermission) {
        return NextResponse.json(
          { 
            error: result.error || 'Insufficient permissions',
            details: result.details
          },
          { status: 403 }
        );
      }

      // Add user context to request for use in handler
      (req as any).userId = result.userId;
      (req as any).userType = result.userType;
      (req as any).adminLevel = result.adminLevel;
      (req as any).companyId = result.companyId;

      return handler(req, context);
    };
  };
}

// ============= PERMISSION REQUIREMENTS =============

/**
 * Predefined permission requirements for common operations
 * Based on the agreed implementation plan
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

  // Admin operations (with hierarchy)
  CREATE_ENTITY_ADMIN: [{ category: 'users' as const, permission: 'create_entity_admin' }],
  CREATE_SUB_ADMIN: [{ category: 'users' as const, permission: 'create_sub_admin' }],
  CREATE_SCHOOL_ADMIN: [{ category: 'users' as const, permission: 'create_school_admin' }],
  CREATE_BRANCH_ADMIN: [{ category: 'users' as const, permission: 'create_branch_admin' }],
  
  MODIFY_ENTITY_ADMIN: [{ category: 'users' as const, permission: 'modify_entity_admin' }],
  MODIFY_SUB_ADMIN: [{ category: 'users' as const, permission: 'modify_sub_admin' }],
  MODIFY_SCHOOL_ADMIN: [{ category: 'users' as const, permission: 'modify_school_admin' }],
  MODIFY_BRANCH_ADMIN: [{ category: 'users' as const, permission: 'modify_branch_admin' }],

  // Settings operations
  MANAGE_COMPANY_SETTINGS: [{ category: 'settings' as const, permission: 'manage_company_settings' }],
  MANAGE_SCHOOL_SETTINGS: [{ category: 'settings' as const, permission: 'manage_school_settings' }],
  MANAGE_BRANCH_SETTINGS: [{ category: 'settings' as const, permission: 'manage_branch_settings' }],
  VIEW_AUDIT_LOGS: [{ category: 'settings' as const, permission: 'view_audit_logs' }],
  EXPORT_DATA: [{ category: 'settings' as const, permission: 'export_data' }],
} as const;

// ============= HELPER FUNCTIONS =============

/**
 * Log permission check to audit trail
 */
async function logPermissionCheck(params: {
  userId: string;
  action: string;
  result: boolean;
  scopeId?: string;
  scopeType?: string;
  ip?: string | null;
  userAgent?: string | null;
}) {
  try {
    await supabase.from('entity_admin_audit_log').insert({
      action_type: 'permission_check',
      actor_id: params.userId,
      target_id: params.scopeId,
      target_type: params.scopeType,
      changes: {
        action: params.action,
        result: params.result
      },
      ip_address: params.ip,
      user_agent: params.userAgent,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    // Don't fail the permission check if audit logging fails
    console.error('Failed to log permission check:', error);
  }
}

// ============= EXAMPLE USAGE =============

/**
 * Example: Protected API route for creating a school
 */
export async function createSchoolRoute(req: NextRequest) {
  return withPermissions(
    PermissionRequirements.CREATE_SCHOOL,
    { 
      checkModuleAccess: true,
      requireScope: false,
      logAudit: true 
    }
  )(async (req) => {
    const body = await req.json();
    const userId = (req as any).userId;
    const companyId = (req as any).companyId;
    
    // Ensure user can only create schools in their company
    const { data, error } = await supabase
      .from('schools')
      .insert([{ 
        ...body, 
        company_id: companyId,
        created_by: userId 
      }])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data }, { status: 201 });
  })(req);
}

/**
 * Example: Protected API route for modifying a teacher (with scope check)
 */
export async function modifyTeacherRoute(req: NextRequest) {
  return withPermissions(
    PermissionRequirements.MODIFY_TEACHER,
    { 
      checkModuleAccess: true,
      requireScope: true,
      logAudit: true 
    }
  )(async (req) => {
    const body = await req.json();
    const userId = (req as any).userId;
    const adminLevel = (req as any).adminLevel;
    
    // Additional validation based on admin level
    if (adminLevel === 'branch_admin' && !body.branch_id) {
      return NextResponse.json(
        { error: 'Branch admin must specify branch_id' },
        { status: 400 }
      );
    }
    
    const { data, error } = await supabase
      .from('teachers')
      .update({ 
        ...body,
        updated_by: userId,
        updated_at: new Date().toISOString()
      })
      .eq('id', body.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data }, { status: 200 });
  })(req);
}

// ============= RLS POLICIES (UPDATED) =============

/**
 * Enhanced RLS Policies with scope-based access
 * These should be applied in Supabase dashboard
 */
export const EnhancedRLSPolicies = `
-- ===== MODULE ACCESS POLICIES =====

-- System users can only access system tables
CREATE POLICY "system_users_access" ON admin_users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND user_type = 'system'
    )
  );

-- Entity users can only access entity module data
CREATE POLICY "entity_users_access" ON entity_users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND user_type = 'entity'
    )
  );

-- ===== SCOPE-BASED ACCESS POLICIES =====

-- Schools: Users can only see schools they have access to
CREATE POLICY "scope_based_schools_access" ON schools
  FOR SELECT USING (
    -- Entity admins see all schools in their company
    EXISTS (
      SELECT 1 FROM entity_users eu
      WHERE eu.user_id = auth.uid()
      AND eu.admin_level IN ('entity_admin', 'sub_entity_admin')
      AND eu.company_id = schools.company_id
      AND eu.is_active = true
    )
    OR
    -- School admins see only their assigned schools
    EXISTS (
      SELECT 1 FROM entity_user_schools eus
      WHERE eus.user_id = auth.uid()
      AND eus.school_id = schools.id
      AND eus.is_active = true
    )
  );

-- Branches: Users can only see branches they have access to
CREATE POLICY "scope_based_branches_access" ON branches
  FOR SELECT USING (
    -- Entity admins see all branches in their company
    EXISTS (
      SELECT 1 FROM entity_users eu
      JOIN schools s ON s.company_id = eu.company_id
      WHERE eu.user_id = auth.uid()
      AND eu.admin_level IN ('entity_admin', 'sub_entity_admin')
      AND s.id = branches.school_id
      AND eu.is_active = true
    )
    OR
    -- School admins see branches in their schools
    EXISTS (
      SELECT 1 FROM entity_user_schools eus
      WHERE eus.user_id = auth.uid()
      AND eus.school_id = branches.school_id
      AND eus.is_active = true
    )
    OR
    -- Branch admins see only their assigned branches
    EXISTS (
      SELECT 1 FROM entity_user_branches eub
      WHERE eub.user_id = auth.uid()
      AND eub.branch_id = branches.id
      AND eub.is_active = true
    )
  );

-- ===== PERMISSION-BASED POLICIES =====

-- Create school: Only users with create_school permission
CREATE POLICY "permission_create_school" ON schools
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM entity_users
      WHERE user_id = auth.uid()
      AND is_active = true
      AND (permissions->'organization'->>'create_school')::boolean = true
    )
  );

-- Modify school: Only users with modify_school permission and proper scope
CREATE POLICY "permission_modify_school" ON schools
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM entity_users eu
      WHERE eu.user_id = auth.uid()
      AND eu.is_active = true
      AND (eu.permissions->'organization'->>'modify_school')::boolean = true
      AND (
        -- Entity admins can modify any school in their company
        (eu.admin_level IN ('entity_admin', 'sub_entity_admin') AND eu.company_id = schools.company_id)
        OR
        -- School admins can modify their assigned schools
        EXISTS (
          SELECT 1 FROM entity_user_schools
          WHERE user_id = auth.uid()
          AND school_id = schools.id
          AND is_active = true
        )
      )
    )
  );

-- ===== HIERARCHY ENFORCEMENT =====

-- Prevent users from modifying higher or equal level admins
CREATE POLICY "admin_hierarchy_enforcement" ON entity_users
  FOR UPDATE USING (
    -- Get the user's admin level
    EXISTS (
      SELECT 1 FROM entity_users actor
      WHERE actor.user_id = auth.uid()
      AND actor.is_active = true
      AND (
        -- Entity admins can modify anyone except other entity admins (unless it's themselves)
        (actor.admin_level = 'entity_admin' AND (entity_users.admin_level != 'entity_admin' OR entity_users.user_id = auth.uid()))
        OR
        -- Sub-entity admins can modify school and branch admins
        (actor.admin_level = 'sub_entity_admin' AND entity_users.admin_level IN ('school_admin', 'branch_admin'))
        OR
        -- School admins can modify branch admins
        (actor.admin_level = 'school_admin' AND entity_users.admin_level = 'branch_admin')
        -- Branch admins cannot modify any admins
      )
    )
  );

-- ===== AUDIT LOG ACCESS =====

-- Only users with view_audit_logs permission can see audit logs
CREATE POLICY "audit_log_access" ON entity_admin_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM entity_users
      WHERE user_id = auth.uid()
      AND is_active = true
      AND (permissions->'settings'->>'view_audit_logs')::boolean = true
      AND company_id = entity_admin_audit_log.company_id
    )
  );
`;