/**
 * File: /src/app/entity-module/organisation/tabs/admins/services/adminService.ts
 * 
 * UPDATED VERSION - Integrated with userCreationService
 * Now properly creates users in both users and entity_users tables
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
  password: string; // Now required
  admin_level: AdminLevel;
  company_id: string;
  permissions?: AdminPermissions;
  is_active?: boolean;
  created_by?: string;
  parent_admin_id?: string;
  metadata?: Record<string, any>;
  actor_id: string; // Required for audit logging
}

interface UpdateAdminPayload {
  name?: string;
  email?: string;
  password?: string;
  admin_level?: AdminLevel;
  permissions?: AdminPermissions;
  is_active?: boolean;
  metadata?: Record<string, any>;
  actor_id: string; // Required for audit logging
}

interface AdminFilters {
  company_id?: string;
  admin_level?: AdminLevel | AdminLevel[];
  is_active?: boolean | string[];
  search?: string;
  created_after?: string;
  created_before?: string;
  limit?: number;
  offset?: number;
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

export const adminService = {
  /**
   * Create a new administrator using the userCreationService
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

      // Use userCreationService to create the user
      const { userId, entityId } = await userCreationService.createUser({
        user_type: payload.admin_level as any,
        email: payload.email,
        name: payload.name,
        password: payload.password,
        company_id: payload.company_id,
        admin_level: payload.admin_level,
        permissions: payload.permissions,
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

      // Security check: Prevent admin from deactivating their own account
      if (validatedPayload.is_active === false && userId === validatedPayload.actor_id) {
        throw new Error('You cannot deactivate your own account');
      }

      // Additional security check: Prevent admin from deactivating their own account via user_id
      if (validatedPayload.is_active === false && existingAdmin.user_id === validatedPayload.actor_id) {
        throw new Error('You cannot deactivate your own account for security reasons');
      }

      // Security check: Prevent non-entity admins from modifying entity admins
      if (existingAdmin.admin_level === 'entity_admin' && validatedPayload.actor_id !== userId) {
        // Check if actor is also an entity admin
        const { data: actorAdmin } = await supabase
          .from('entity_users')
          .select('admin_level')
          .eq('user_id', validatedPayload.actor_id)
          .single();

        if (!actorAdmin || actorAdmin.admin_level !== 'entity_admin') {
          throw new Error('Only entity administrators can modify other entity administrators');
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
        const newDefaultPermissions = permissionService.getPermissionsForLevel(validatedPayload.admin_level);
        updateData.permissions = validatedPayload.permissions 
          ? { ...newDefaultPermissions, ...validatedPayload.permissions }
          : newDefaultPermissions;
      }

      if (validatedPayload.permissions !== undefined) {
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
   * Get a single admin by ID with full details
   */
  async getAdminById(adminId: string): Promise<AdminUser | null> {
    try {
      if (!adminId) {
        return null;
      }

      // Fetch admin with user details
      const { data: admin, error } = await supabase
        .from('entity_users')
        .select(`
          *,
          users!entity_users_user_id_fkey (
            id,
            email,
            raw_user_meta_data,
            is_active,
            last_login_at
          )
        `)
        .eq('id', adminId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        console.error('Error fetching admin:', error);
        return null;
      }

      // Fetch scope assignments
      let assignedSchools: string[] = [];
      let assignedBranches: string[] = [];

      try {
        const { data: scopes } = await supabase
          .from('entity_admin_scope')
          .select('scope_type, scope_id')
          .eq('user_id', adminId)
          .eq('is_active', true);

        if (scopes) {
          assignedSchools = scopes.filter(s => s.scope_type === 'school').map(s => s.scope_id);
          assignedBranches = scopes.filter(s => s.scope_type === 'branch').map(s => s.scope_id);
        }
      } catch (scopeError) {
        console.log('Scope data not available');
      }

      const enrichedAdmin: AdminUser = {
        id: admin.id,
        user_id: admin.user_id || '',
        email: getAdminEmail(admin),
        name: getAdminName(admin),
        admin_level: admin.admin_level || 'entity_admin',
        company_id: admin.company_id,
        permissions: admin.permissions || permissionService.getDefaultPermissions(),
        is_active: admin.is_active ?? true,
        created_at: admin.created_at || new Date().toISOString(),
        updated_at: admin.updated_at || admin.created_at || new Date().toISOString(),
        metadata: admin.metadata || {},
        parent_admin_id: admin.parent_admin_id || null,
        assigned_schools: assignedSchools,
        assigned_branches: assignedBranches
      };

      return enrichedAdmin;
    } catch (error) {
      console.error('getAdminById error:', error);
      return null;
    }
  },

  /**
   * List administrators with filters
   */
  async listAdmins(companyId: string, filters?: AdminFilters): Promise<AdminUser[]> {
    try {
      if (!companyId) {
        throw new Error('Company ID is required');
      }

      // Build query with join to users table
      let query = supabase
        .from('entity_users')
        .select(`
          *,
          users!entity_users_user_id_fkey (
            id,
            email,
            raw_user_meta_data,
            is_active,
            last_login_at
          )
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters) {
        if (filters.admin_level) {
          if (Array.isArray(filters.admin_level)) {
            query = query.in('admin_level', filters.admin_level);
          } else {
            query = query.eq('admin_level', filters.admin_level);
          }
        }
        if (filters.is_active !== undefined) {
          if (Array.isArray(filters.is_active)) {
            // Convert string array to boolean array for is_active filter
            const booleanValues = filters.is_active.map(val => val === 'active');
            query = query.in('is_active', booleanValues);
          } else {
            query = query.eq('is_active', filters.is_active);
          }
        }
        if (filters.search) {
          const searchTerm = filters.search.trim();
          query = query.or(`email.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`);
        }
        if (filters.created_after) {
          query = query.gte('created_at', filters.created_after);
        }
        if (filters.created_before) {
          query = query.lte('created_at', filters.created_before);
        }
        if (filters.limit) {
          query = query.limit(filters.limit);
        }
        if (filters.offset) {
          query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
        }
      }

      const { data: admins, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch admins: ${error.message}`);
      }

      if (!admins || admins.length === 0) {
        return [];
      }

      // Fetch scope assignments for all admins
      const adminIds = admins.map(a => a.id);
      const { data: allScopes } = await supabase
        .from('entity_admin_scope')
        .select('user_id, scope_type, scope_id')
        .in('user_id', adminIds)
        .eq('is_active', true);

      const scopeMap = new Map<string, { schools: string[], branches: string[] }>();
      if (allScopes) {
        allScopes.forEach(scope => {
          if (!scopeMap.has(scope.user_id)) {
            scopeMap.set(scope.user_id, { schools: [], branches: [] });
          }
          const userScopes = scopeMap.get(scope.user_id)!;
          if (scope.scope_type === 'school') {
            userScopes.schools.push(scope.scope_id);
          } else if (scope.scope_type === 'branch') {
            userScopes.branches.push(scope.scope_id);
          }
        });
      }

      // Transform and enrich admin data
      const enrichedAdmins: AdminUser[] = admins.map(admin => {
        const scopes = scopeMap.get(admin.id) || { schools: [], branches: [] };
        return {
          id: admin.id,
          user_id: admin.user_id || '',
          email: getAdminEmail(admin),
          name: getAdminName(admin),
          admin_level: admin.admin_level || 'entity_admin',
          company_id: admin.company_id,
          permissions: admin.permissions || permissionService.getDefaultPermissions(),
          is_active: admin.is_active ?? true,
          created_at: admin.created_at,
          updated_at: admin.updated_at,
          metadata: admin.metadata || {},
          parent_admin_id: admin.parent_admin_id || null,
          assigned_schools: scopes.schools,
          assigned_branches: scopes.branches
        };
      });

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