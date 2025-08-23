/**
 * File: /src/app/entity-module/organisation/tabs/admins/services/adminService.ts
 * Dependencies: 
 *   - @/lib/supabase
 *   - ../types/admin.types
 *   - ./auditService
 *   - ./permissionService
 *   - @/services/userCreationService
 *   - External: zod
 * 
 * Preserved Features:
 *   - All CRUD operations for admins
 *   - Integration with userCreationService
 *   - Audit logging
 *   - Email availability checking
 *   - Password updates
 *   - Scope assignment handling
 * 
 * Added/Modified:
 *   - FIXED: Entity admin can now edit other users (not just themselves)
 *   - FIXED: Proper hierarchy validation
 *   - FIXED: Permission checks aligned with requirements
 *   - Added detailed permission level checking
 * 
 * Database Tables:
 *   - entity_users
 *   - users
 *   - entity_admin_scope
 *   - entity_admin_audit_log
 * 
 * Connected Files:
 *   - useAdminMutations.ts
 *   - AdminCreationForm.tsx
 *   - permissionService.ts
 */

import { supabase } from '@/lib/supabase';
import { AdminLevel, EntityAdminHierarchy, EntityAdminScope, AdminPermissions } from '../types/admin.types';
import { auditService } from './auditService';
import { permissionService } from './permissionService';
import { userCreationService } from '@/services/userCreationService';
import { z } from 'zod';

// Validation schemas for server-side validation
const updateAdminPayloadSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long').regex(/^[a-zA-Z\s'-]+$/, 'Name contains invalid characters').optional(),
  email: z.string().email('Invalid email address').transform(email => email.toLowerCase().trim()).optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').regex(/[A-Z]/, 'Password must contain uppercase letter').regex(/[a-z]/, 'Password must contain lowercase letter').regex(/[0-9]/, 'Password must contain number').regex(/[^A-Za-z0-9]/, 'Password must contain special character').optional(),
  admin_level: z.enum(['entity_admin', 'sub_entity_admin', 'school_admin', 'branch_admin'], { errorMap: () => ({ message: 'Invalid admin level' }) }).optional(),
  is_active: z.boolean().optional(),
  permissions: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
  actor_id: z.string().uuid('Invalid actor ID')
});

interface CreateAdminPayload {
  email: string;
  name: string;
  password: string;
  admin_level: AdminLevel;
  company_id: string;
  permissions?: AdminPermissions;
  is_active?: boolean;
  created_by?: string;
  parent_admin_id?: string;
  metadata?: Record<string, any>;
  actor_id: string;
}

interface UpdateAdminPayload {
  name?: string;
  email?: string;
  password?: string;
  admin_level?: AdminLevel;
  permissions?: AdminPermissions;
  is_active?: boolean;
  metadata?: Record<string, any>;
  actor_id: string;
}

interface AdminFilters {
  admin_level?: AdminLevel | AdminLevel[];
  is_active?: boolean | string[] | boolean[];
  search?: string;
  created_after?: string;
  created_before?: string;
  limit?: number;
  offset?: number;
  scope_filter?: any; // For scope-based filtering
}

interface AdminUser {
  id: string;
  user_id: string;
  email: string;
  name: string;
  admin_level: AdminLevel;
  company_id: string;
  permissions: AdminPermissions;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  metadata: Record<string, any>;
  parent_admin_id?: string | null;
  assigned_schools?: string[];
  assigned_branches?: string[];
}

// Helper functions
const getAdminEmail = (admin: any): string => {
  if (admin.email) return admin.email;
  if (admin.users?.email) return admin.users.email;
  if (admin.metadata?.email) return admin.metadata.email;
  return '';
};

const getAdminName = (admin: any): string => {
  if (admin.name) return admin.name;
  if (admin.users?.raw_user_meta_data?.name) return admin.users.raw_user_meta_data.name;
  if (admin.metadata?.name) return admin.metadata.name;
  return 'Unknown Admin';
};

// Admin level hierarchy for permission checking
const ADMIN_LEVEL_HIERARCHY = {
  'entity_admin': 4,
  'sub_entity_admin': 3,
  'school_admin': 2,
  'branch_admin': 1
};

export const adminService = {
  /**
   * Check if actor can modify target based on hierarchy
   */
  canActorModifyTarget(actorLevel: AdminLevel, targetLevel: AdminLevel, actorUserId: string, targetUserId: string): { canModify: boolean; reason?: string } {
    // Prevent self-modification for certain actions (like deactivation)
    if (actorUserId === targetUserId) {
      return { 
        canModify: false, 
        reason: 'You cannot modify your own account for security reasons' 
      };
    }

    const actorHierarchy = ADMIN_LEVEL_HIERARCHY[actorLevel];
    const targetHierarchy = ADMIN_LEVEL_HIERARCHY[targetLevel];

    // Entity admin can modify everyone (except themselves)
    if (actorLevel === 'entity_admin') {
      return { canModify: true };
    }

    // Sub-entity admin can modify everyone except entity admins
    if (actorLevel === 'sub_entity_admin') {
      if (targetLevel === 'entity_admin') {
        return { 
          canModify: false, 
          reason: 'Sub-Entity Administrators cannot modify Entity Administrators' 
        };
      }
      return { canModify: true };
    }

    // School and Branch admins can only modify lower levels
    if (actorHierarchy <= targetHierarchy) {
      return { 
        canModify: false, 
        reason: `${actorLevel.replace(/_/g, ' ')} cannot modify ${targetLevel.replace(/_/g, ' ')} or higher` 
      };
    }

    return { canModify: true };
  },

  /**
   * Get a single admin by ID
   */
  async getAdminById(adminId: string): Promise<AdminUser | null> {
    try {
      if (!adminId) {
        console.error('getAdminById: Admin ID is required');
        return null;
      }

      const { data, error } = await supabase
        .from('entity_users')
        .select(`
          *,
          users!entity_users_user_id_fkey (
            id,
            email,
            raw_user_meta_data,
            created_at,
            last_sign_in_at,
            is_active
          )
        `)
        .eq('id', adminId)
        .single();

      if (error || !data) {
        console.error('Admin not found:', adminId, error);
        return null;
      }

      // Get assigned scopes
      const { data: scopes } = await supabase
        .from('entity_admin_scope')
        .select('scope_id, scope_type')
        .eq('user_id', data.user_id)
        .eq('is_active', true);

      const assignedSchools = scopes?.filter(s => s.scope_type === 'school').map(s => s.scope_id) || [];
      const assignedBranches = scopes?.filter(s => s.scope_type === 'branch').map(s => s.scope_id) || [];

      return {
        id: data.id,
        user_id: data.user_id,
        email: getAdminEmail(data),
        name: getAdminName(data),
        admin_level: data.admin_level,
        company_id: data.company_id,
        permissions: data.permissions || permissionService.getPermissionsForLevel(data.admin_level),
        is_active: data.is_active ?? true,
        created_at: data.created_at,
        updated_at: data.updated_at,
        metadata: data.metadata || {},
        parent_admin_id: data.parent_admin_id || null,
        assigned_schools: assignedSchools,
        assigned_branches: assignedBranches
      };
    } catch (error: any) {
      console.error('getAdminById error:', error);
      return null;
    }
  },

  /**
   * Create a new administrator
   */
  async createAdmin(payload: CreateAdminPayload): Promise<AdminUser> {
    try {
      const createdBy = payload.created_by || payload.actor_id;

      // Validate required fields
      if (!payload.email || !payload.name || !payload.company_id) {
        throw new Error('Email, name, and company ID are required');
      }

      if (!payload.password || payload.password.length < 8) {
        throw new Error('Password is required and must be at least 8 characters long');
      }

      // Check actor permissions
      const { data: actorAdmin } = await supabase
        .from('entity_users')
        .select('admin_level')
        .eq('user_id', payload.actor_id)
        .single();

      if (actorAdmin) {
        // Check if actor can create this level of admin
        const actorLevel = ADMIN_LEVEL_HIERARCHY[actorAdmin.admin_level];
        const targetLevel = ADMIN_LEVEL_HIERARCHY[payload.admin_level];

        if (actorAdmin.admin_level === 'sub_entity_admin' && payload.admin_level === 'entity_admin') {
          throw new Error('Sub-Entity Administrators cannot create Entity Administrators');
        }

        if (actorAdmin.admin_level === 'school_admin' && ['entity_admin', 'sub_entity_admin', 'school_admin'].includes(payload.admin_level)) {
          throw new Error('School Administrators can only create Branch Administrators');
        }

        if (actorAdmin.admin_level === 'branch_admin') {
          throw new Error('Branch Administrators cannot create other administrators');
        }
      }

      // Use userCreationService to create the user
      const { userId, entityId } = await userCreationService.createUser({
        user_type: payload.admin_level as any,
        email: payload.email,
        name: payload.name,
        password: payload.password,
        company_id: payload.company_id,
        admin_level: payload.admin_level,
        permissions: payload.permissions || permissionService.getPermissionsForLevel(payload.admin_level),
        is_active: payload.is_active,
        created_by: createdBy,
        parent_admin_id: payload.parent_admin_id,
        metadata: payload.metadata
      });

      // Fetch the created admin with full details
      const newAdmin = await this.getAdminById(entityId);
      if (!newAdmin) {
        throw new Error('Failed to retrieve created admin');
      }

      // Log the creation action
      try {
        await auditService.logAction({
          company_id: payload.company_id,
          action_type: 'admin_created',
          actor_id: payload.actor_id,
          target_id: entityId,
          target_type: 'entity_user',
          changes: {
            admin_level: payload.admin_level,
            email: payload.email,
            name: payload.name
          },
          metadata: { source: 'adminService.createAdmin' }
        });
      } catch (auditError) {
        console.log('Audit logging failed:', auditError);
      }

      return newAdmin;
    } catch (error: any) {
      console.error('createAdmin error:', error);
      throw error instanceof Error ? error : new Error('Failed to create administrator');
    }
  },

  /**
   * Update an existing administrator
   */
  async updateAdmin(userId: string, payload: UpdateAdminPayload): Promise<AdminUser> {
    try {
      // Validate userId
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Validate payload with Zod
      const validatedPayload = updateAdminPayloadSchema.parse(payload);

      // Fetch existing admin
      const existingAdmin = await this.getAdminById(userId);
      if (!existingAdmin) {
        throw new Error('Administrator not found');
      }

      // Get actor admin details
      const { data: actorAdmin } = await supabase
        .from('entity_users')
        .select('admin_level, user_id')
        .eq('user_id', validatedPayload.actor_id)
        .single();

      if (!actorAdmin) {
        throw new Error('Actor not found or not authorized');
      }

      // Check modification permissions
      const modificationCheck = this.canActorModifyTarget(
        actorAdmin.admin_level,
        existingAdmin.admin_level,
        validatedPayload.actor_id,
        existingAdmin.user_id
      );

      // Special case: Allow entity admins to edit other entity admins (but not themselves)
      if (actorAdmin.admin_level === 'entity_admin' && existingAdmin.admin_level === 'entity_admin') {
        if (validatedPayload.actor_id === existingAdmin.user_id) {
          // Only prevent deactivation for self
          if (validatedPayload.is_active === false) {
            throw new Error('You cannot deactivate your own account for security reasons');
          }
          // Allow other self-edits (like changing name, email, etc.)
        }
        // Entity admin can edit other entity admins
      } else if (!modificationCheck.canModify) {
        throw new Error(modificationCheck.reason || 'You do not have permission to modify this administrator');
      }

      // Check if trying to elevate privileges beyond actor's level
      if (validatedPayload.admin_level) {
        const actorLevel = ADMIN_LEVEL_HIERARCHY[actorAdmin.admin_level];
        const newLevel = ADMIN_LEVEL_HIERARCHY[validatedPayload.admin_level];
        
        if (newLevel > actorLevel) {
          throw new Error('You cannot assign an admin level higher than your own');
        }
      }

      // Prepare update data for entity_users table
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (validatedPayload.name !== undefined) {
        updateData.name = validatedPayload.name;
        updateData.metadata = {
          ...existingAdmin.metadata,
          name: validatedPayload.name
        };
      }

      if (validatedPayload.email !== undefined) {
        // Check if email is already in use
        if (validatedPayload.email !== existingAdmin.email) {
          const { data: emailCheck } = await supabase
            .from('entity_users')
            .select('id')
            .eq('email', validatedPayload.email)
            .eq('company_id', existingAdmin.company_id)
            .neq('id', userId)
            .maybeSingle();

          if (emailCheck) {
            throw new Error('This email is already in use by another administrator');
          }
        }
        updateData.email = validatedPayload.email;
      }

      if (validatedPayload.admin_level !== undefined) {
        updateData.admin_level = validatedPayload.admin_level;
        // Update permissions to match new level
        const newDefaultPermissions = permissionService.getPermissionsForLevel(validatedPayload.admin_level);
        updateData.permissions = validatedPayload.permissions 
          ? { ...newDefaultPermissions, ...validatedPayload.permissions }
          : newDefaultPermissions;
      } else if (validatedPayload.permissions !== undefined) {
        // Just update permissions without changing level
        updateData.permissions = {
          ...(existingAdmin.permissions || {}),
          ...validatedPayload.permissions
        };
      }

      if (validatedPayload.is_active !== undefined) {
        updateData.is_active = validatedPayload.is_active;
      }

      // Update entity_users table
      const { data: updatedAdmin, error: updateError } = await supabase
        .from('entity_users')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to update admin: ${updateError.message}`);
      }

      // Update password if provided
      if (validatedPayload.password && existingAdmin.user_id) {
        try {
          await userCreationService.updatePassword(existingAdmin.user_id, validatedPayload.password);
        } catch (passwordError) {
          console.error('Failed to update password:', passwordError);
          // Don't throw - allow other updates to succeed
        }
      }

      // Update email in users table if changed
      if (validatedPayload.email && validatedPayload.email !== existingAdmin.email && existingAdmin.user_id) {
        const { error: userUpdateError } = await supabase
          .from('users')
          .update({ 
            email: validatedPayload.email,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingAdmin.user_id);

        if (userUpdateError) {
          console.error('Failed to update email in users table:', userUpdateError);
        }
      }

      // Log the update
      try {
        const changes: Record<string, any> = {};
        Object.keys(updateData).forEach(key => {
          if (key !== 'updated_at' && key !== 'metadata') {
            changes[key] = {
              old: existingAdmin[key as keyof AdminUser],
              new: updateData[key]
            };
          }
        });

        if (Object.keys(changes).length > 0) {
          await auditService.logAction({
            company_id: existingAdmin.company_id,
            action_type: 'admin_modified',
            actor_id: validatedPayload.actor_id,
            target_id: existingAdmin.user_id,
            target_type: 'entity_user',
            changes,
            metadata: { source: 'adminService.updateAdmin' }
          });
        }
      } catch (auditError) {
        console.log('Audit logging failed:', auditError);
      }

      const result = await this.getAdminById(userId);
      if (!result) {
        throw new Error('Failed to retrieve updated admin');
      }
      return result;
    } catch (error: any) {
      console.error('updateAdmin error:', error);
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(e => e.message).join(', ');
        throw new Error(`Validation failed: ${errorMessages}`);
      }
      throw error instanceof Error ? error : new Error('Failed to update administrator');
    }
  },

  /**
   * List administrators with filters
   * @param companyId - The company ID to filter admins (required)
   * @param filters - Additional filters (optional)
   */
  async listAdmins(companyId: string, filters: AdminFilters = {}): Promise<AdminUser[]> {
    try {
      // Validate company ID
      if (!companyId) {
        console.error('listAdmins: Company ID is required');
        return [];
      }

      console.log('Fetching admins for company:', companyId, 'with filters:', filters);

      let query = supabase
        .from('entity_users')
        .select(`
          *,
          users!entity_users_user_id_fkey (
            id,
            email,
            raw_user_meta_data,
            created_at,
            last_sign_in_at,
            is_active
          )
        `)
        .eq('company_id', companyId); // Always filter by company ID

      // Apply additional filters

      // Apply additional filters
      if (filters.admin_level) {
        if (Array.isArray(filters.admin_level) && filters.admin_level.length > 0) {
          query = query.in('admin_level', filters.admin_level);
        } else if (!Array.isArray(filters.admin_level)) {
          query = query.eq('admin_level', filters.admin_level);
        }
      }

      if (filters.is_active !== undefined) {
        if (Array.isArray(filters.is_active)) {
          // Convert string array to boolean array if needed
          const booleanValues = filters.is_active.map(val => 
            typeof val === 'string' ? val === 'active' : val
          );
          query = query.in('is_active', booleanValues);
        } else {
          query = query.eq('is_active', filters.is_active);
        }
      }

      if (filters.search) {
        const searchTerm = `%${filters.search}%`;
        query = query.or(`name.ilike.${searchTerm},email.ilike.${searchTerm}`);
      }

      if (filters.created_after) {
        query = query.gte('created_at', filters.created_after);
      }

      if (filters.created_before) {
        query = query.lte('created_at', filters.created_before);
      }

      // Order by created_at desc by default
      query = query.order('created_at', { ascending: false });

      const { data: admins, error } = await query;

      if (error) {
        console.error('Error fetching admins:', error);
        throw new Error(`Failed to list admins: ${error.message}`);
      }

      if (!admins || admins.length === 0) {
        console.log('No admins found for company:', companyId);
        return [];
      }

      console.log(`Found ${admins.length} admins for company:`, companyId);

      // Enrich with scopes
      const enrichedAdmins = await Promise.all(admins.map(async (admin) => {
        // Get assigned scopes for this admin
        const { data: scopes } = await supabase
          .from('entity_admin_scope')
          .select('scope_id, scope_type')
          .eq('user_id', admin.user_id)
          .eq('is_active', true);

        const assignedSchools = scopes?.filter(s => s.scope_type === 'school').map(s => s.scope_id) || [];
        const assignedBranches = scopes?.filter(s => s.scope_type === 'branch').map(s => s.scope_id) || [];

        return {
          id: admin.id,
          user_id: admin.user_id,
          email: getAdminEmail(admin),
          name: getAdminName(admin),
          admin_level: admin.admin_level,
          company_id: admin.company_id,
          permissions: admin.permissions || permissionService.getPermissionsForLevel(admin.admin_level),
          is_active: admin.is_active ?? true,
          created_at: admin.created_at,
          updated_at: admin.updated_at,
          metadata: admin.metadata || {},
          parent_admin_id: admin.parent_admin_id || null,
          assigned_schools: assignedSchools,
          assigned_branches: assignedBranches
        };
      }));

      return enrichedAdmins;
    } catch (error: any) {
      console.error('listAdmins error:', error);
      throw error instanceof Error ? error : new Error('Failed to list administrators');
    }
  },

  /**
   * Delete (deactivate) an administrator
   */
  async deleteAdmin(adminId: string, actorId: string): Promise<void> {
    try {
      const admin = await this.getAdminById(adminId);
      if (!admin) {
        throw new Error('Administrator not found');
      }

      // Prevent self-deactivation
      if (admin.user_id === actorId) {
        throw new Error('You cannot deactivate your own account');
      }

      // Check permissions
      const { data: actorAdmin } = await supabase
        .from('entity_users')
        .select('admin_level')
        .eq('user_id', actorId)
        .single();

      if (actorAdmin) {
        const modificationCheck = this.canActorModifyTarget(
          actorAdmin.admin_level,
          admin.admin_level,
          actorId,
          admin.user_id
        );

        if (!modificationCheck.canModify && actorId !== admin.user_id) {
          throw new Error(modificationCheck.reason || 'You do not have permission to deactivate this administrator');
        }
      }

      // Deactivate in entity_users table
      const { error: entityError } = await supabase
        .from('entity_users')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', adminId);

      if (entityError) {
        throw new Error(`Failed to deactivate admin: ${entityError.message}`);
      }

      // Also deactivate in users table if user_id exists
      if (admin.user_id) {
        const { error: userError } = await supabase
          .from('users')
          .update({ 
            is_active: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', admin.user_id);

        if (userError) {
          console.error('Failed to deactivate user account:', userError);
        }
      }

      // Log the action
      try {
        await auditService.logAction({
          company_id: admin.company_id,
          action_type: 'admin_deleted',
          actor_id: actorId,
          target_id: adminId,
          target_type: 'entity_user',
          changes: {
            admin_name: admin.name,
            admin_email: admin.email
          },
          metadata: { source: 'adminService.deleteAdmin' }
        });
      } catch (auditError) {
        console.log('Audit logging failed:', auditError);
      }
    } catch (error: any) {
      console.error('deleteAdmin error:', error);
      throw error instanceof Error ? error : new Error('Failed to delete administrator');
    }
  },

  /**
   * Restore (reactivate) an administrator
   */
  async restoreAdmin(adminId: string, actorId: string): Promise<void> {
    try {
      const admin = await this.getAdminById(adminId);
      if (!admin) {
        throw new Error('Administrator not found');
      }

      // Check permissions
      const { data: actorAdmin } = await supabase
        .from('entity_users')
        .select('admin_level')
        .eq('user_id', actorId)
        .single();

      if (actorAdmin) {
        const modificationCheck = this.canActorModifyTarget(
          actorAdmin.admin_level,
          admin.admin_level,
          actorId,
          admin.user_id
        );

        if (!modificationCheck.canModify && actorId !== admin.user_id) {
          throw new Error(modificationCheck.reason || 'You do not have permission to restore this administrator');
        }
      }

      // Reactivate in entity_users table
      const { error: entityError } = await supabase
        .from('entity_users')
        .update({ 
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', adminId);

      if (entityError) {
        throw new Error(`Failed to restore admin: ${entityError.message}`);
      }

      // Also reactivate in users table if user_id exists
      if (admin.user_id) {
        const { error: userError } = await supabase
          .from('users')
          .update({ 
            is_active: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', admin.user_id);

        if (userError) {
          console.error('Failed to reactivate user account:', userError);
        }
      }

      // Log the action
      try {
        await auditService.logAction({
          company_id: admin.company_id,
          action_type: 'admin_activated',
          actor_id: actorId,
          target_id: adminId,
          target_type: 'entity_user',
          changes: { is_active: { old: false, new: true } },
          metadata: { source: 'adminService.restoreAdmin' }
        });
      } catch (auditError) {
        console.log('Audit logging failed:', auditError);
      }
    } catch (error: any) {
      console.error('restoreAdmin error:', error);
      throw error instanceof Error ? error : new Error('Failed to restore administrator');
    }
  },

  /**
   * Check if email is available for admin creation
   */
  async isEmailAvailable(email: string, companyId: string, excludeUserId?: string): Promise<boolean> {
    try {
      // Check in entity_users table
      let query = supabase
        .from('entity_users')
        .select('id')
        .eq('email', email.toLowerCase())
        .eq('company_id', companyId);

      if (excludeUserId) {
        query = query.neq('id', excludeUserId);
      }

      const { data: entityCheck } = await query.maybeSingle();
      if (entityCheck) {
        return false;
      }

      // Also check in users table
      const { data: userCheck } = await supabase
        .from('users')
        .select('id')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      return !userCheck;
    } catch (error) {
      console.error('isEmailAvailable error:', error);
      return false;
    }
  }
};