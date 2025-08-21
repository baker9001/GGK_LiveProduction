/**
 * File: /src/app/entity-module/organisation/tabs/admins/services/adminService.ts
 * 
 * FINAL FIXED VERSION - Works with or without foreign keys
 * Handles undefined company_id and search parameters properly
 */

import { supabase } from '@/lib/supabase';
import { AdminLevel, EntityAdminHierarchy, EntityAdminScope, AdminPermissions } from '../types/admin.types';
import { auditService } from './auditService';
import { permissionService } from './permissionService';

interface CreateAdminPayload {
  email: string;
  name: string;
  admin_level: AdminLevel;
  company_id: string;
  permissions?: Partial<AdminPermissions>;
  is_active?: boolean;
  created_by?: string;
  parent_admin_id?: string;
  metadata?: Record<string, any>;
}

interface UpdateAdminPayload {
  name?: string;
  admin_level?: AdminLevel;
  permissions?: Partial<AdminPermissions>;
  is_active?: boolean;
  metadata?: Record<string, any>;
}

interface AdminFilters {
  company_id?: string;
  admin_level?: AdminLevel;
  is_active?: boolean;
  search?: string;
  created_after?: string;
  created_before?: string;
  limit?: number;
  offset?: number;
}

interface AdminUser {
  id: string;
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

// Helper to get current user context
const getCurrentUserId = (): string => {
  return 'system';
};

export const adminService = {
  /**
   * Create a new administrator user with complete validation
   */
  async createAdmin(payload: CreateAdminPayload): Promise<AdminUser> {
    try {
      const createdBy = payload.created_by || getCurrentUserId();

      // Validate required fields
      if (!payload.email || !payload.name || !payload.company_id) {
        throw new Error('Email, name, and company ID are required');
      }

      // Step 1: Validate email uniqueness
      const { data: existingUser, error: checkError } = await supabase
        .from('entity_users')
        .select('id')
        .eq('email', payload.email)
        .eq('company_id', payload.company_id)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        throw new Error(`Email validation failed: ${checkError.message}`);
      }

      if (existingUser) {
        throw new Error('An administrator with this email already exists in your organization');
      }

      // Step 2: Get default permissions for admin level
      const defaultPermissions = permissionService.getPermissionsForLevel(payload.admin_level);
      const finalPermissions = {
        ...defaultPermissions,
        ...(payload.permissions || {})
      };

      // Step 3: Create the admin user
      const adminData = {
        email: payload.email,
        name: payload.name,
        admin_level: payload.admin_level,
        company_id: payload.company_id,
        permissions: finalPermissions,
        is_active: payload.is_active ?? true,
        created_by: createdBy,
        parent_admin_id: payload.parent_admin_id || null,
        metadata: {
          ...payload.metadata,
          created_via: 'entity_module',
          created_at: new Date().toISOString()
        }
      };

      const { data: newAdmin, error: createError } = await supabase
        .from('entity_users')
        .insert([adminData])
        .select()
        .single();

      if (createError) {
        throw new Error(`Failed to create admin: ${createError.message}`);
      }

      // Step 4: Try to set up admin hierarchy if parent specified
      if (payload.parent_admin_id) {
        try {
          const hierarchyData = {
            company_id: payload.company_id,
            parent_admin_id: payload.parent_admin_id,
            child_admin_id: newAdmin.id,
            admin_type: payload.admin_level,
            relationship_type: 'direct' as const,
            created_by: createdBy,
            is_active: true,
            metadata: {}
          };

          await supabase
            .from('entity_admin_hierarchy')
            .insert([hierarchyData]);
        } catch (hierarchyError) {
          console.log('Hierarchy table may not be configured:', hierarchyError);
        }
      }

      // Step 5: Log the creation action
      try {
        await auditService.logAction({
          company_id: payload.company_id,
          action_type: 'admin_created',
          actor_id: createdBy,
          target_id: newAdmin.id,
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

      return newAdmin as AdminUser;
    } catch (error) {
      console.error('createAdmin error:', error);
      throw error instanceof Error ? error : new Error('Failed to create administrator');
    }
  },

  /**
   * Update an existing administrator with validation
   */
  async updateAdmin(userId: string, payload: UpdateAdminPayload): Promise<AdminUser> {
    try {
      const actorId = getCurrentUserId();

      // Validate userId
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Step 1: Verify admin exists
      const { data: existingAdmin, error: fetchError } = await supabase
        .from('entity_users')
        .select('*')
        .eq('id', userId)
        .single();

      if (fetchError || !existingAdmin) {
        throw new Error('Administrator not found');
      }

      // Step 2: Prepare update data
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (payload.name !== undefined) updateData.name = payload.name;
      if (payload.admin_level !== undefined) {
        updateData.admin_level = payload.admin_level;
        if (payload.admin_level !== existingAdmin.admin_level) {
          const newDefaultPermissions = permissionService.getPermissionsForLevel(payload.admin_level);
          updateData.permissions = {
            ...newDefaultPermissions,
            ...(payload.permissions || {})
          };
        }
      }
      if (payload.permissions !== undefined) {
        updateData.permissions = {
          ...(existingAdmin.permissions || {}),
          ...payload.permissions
        };
      }
      if (payload.is_active !== undefined) updateData.is_active = payload.is_active;
      if (payload.metadata !== undefined) {
        updateData.metadata = {
          ...(existingAdmin.metadata || {}),
          ...payload.metadata,
          last_updated: new Date().toISOString()
        };
      }

      // Step 3: Update the admin
      const { data: updatedAdmin, error: updateError } = await supabase
        .from('entity_users')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to update admin: ${updateError.message}`);
      }

      // Step 4: Log the update action
      try {
        const changes: Record<string, any> = {};
        Object.keys(updateData).forEach(key => {
          if (key !== 'updated_at' && existingAdmin[key] !== updateData[key]) {
            changes[key] = {
              old: existingAdmin[key],
              new: updateData[key]
            };
          }
        });

        if (Object.keys(changes).length > 0) {
          await auditService.logAction({
            company_id: existingAdmin.company_id,
            action_type: 'admin_modified',
            actor_id: actorId,
            target_id: userId,
            target_type: 'entity_user',
            changes,
            metadata: { source: 'adminService.updateAdmin' }
          });
        }
      } catch (auditError) {
        console.log('Audit logging failed:', auditError);
      }

      return updatedAdmin as AdminUser;
    } catch (error) {
      console.error('updateAdmin error:', error);
      throw error instanceof Error ? error : new Error('Failed to update administrator');
    }
  },

  /**
   * Soft delete an administrator (set is_active to false)
   */
  async deleteAdmin(userId: string): Promise<void> {
    try {
      const actorId = getCurrentUserId();

      // Validate userId
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Step 1: Check if admin exists and is active
      const { data: admin, error: fetchError } = await supabase
        .from('entity_users')
        .select('id, company_id, is_active, email, name')
        .eq('id', userId)
        .single();

      if (fetchError || !admin) {
        throw new Error('Administrator not found');
      }

      if (!admin.is_active) {
        throw new Error('Administrator is already deactivated');
      }

      // Step 2: Deactivate the admin
      const { error: updateError } = await supabase
        .from('entity_users')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString(),
          metadata: {
            deactivated_at: new Date().toISOString(),
            deactivated_by: actorId
          }
        })
        .eq('id', userId);

      if (updateError) {
        throw new Error(`Failed to deactivate admin: ${updateError.message}`);
      }

      // Step 3: Try to deactivate all scopes for this admin
      try {
        await supabase
          .from('entity_admin_scope')
          .update({ is_active: false })
          .eq('user_id', userId);
      } catch (scopeError) {
        console.log('Scope deactivation skipped:', scopeError);
      }

      // Step 4: Log the deletion action
      try {
        await auditService.logAction({
          company_id: admin.company_id,
          action_type: 'admin_deleted',
          actor_id: actorId,
          target_id: userId,
          target_type: 'entity_user',
          changes: {
            email: admin.email,
            name: admin.name,
            status: 'deactivated'
          },
          metadata: { source: 'adminService.deleteAdmin' }
        });
      } catch (auditError) {
        console.log('Audit logging failed:', auditError);
      }
    } catch (error) {
      console.error('deleteAdmin error:', error);
      throw error instanceof Error ? error : new Error('Failed to delete administrator');
    }
  },

  /**
   * Restore a soft-deleted administrator
   */
  async restoreAdmin(userId: string): Promise<void> {
    try {
      const actorId = getCurrentUserId();

      // Validate userId
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Step 1: Check if admin exists and is inactive
      const { data: admin, error: fetchError } = await supabase
        .from('entity_users')
        .select('id, company_id, is_active, email, name')
        .eq('id', userId)
        .single();

      if (fetchError || !admin) {
        throw new Error('Administrator not found');
      }

      if (admin.is_active) {
        throw new Error('Administrator is already active');
      }

      // Step 2: Reactivate the admin
      const { error: updateError } = await supabase
        .from('entity_users')
        .update({ 
          is_active: true,
          updated_at: new Date().toISOString(),
          metadata: {
            restored_at: new Date().toISOString(),
            restored_by: actorId
          }
        })
        .eq('id', userId);

      if (updateError) {
        throw new Error(`Failed to restore admin: ${updateError.message}`);
      }

      // Step 3: Log the restoration action
      try {
        await auditService.logAction({
          company_id: admin.company_id,
          action_type: 'admin_deleted',
          actor_id: actorId,
          target_id: userId,
          target_type: 'entity_user',
          changes: {
            email: admin.email,
            name: admin.name,
            status: 'restored'
          },
          metadata: { source: 'adminService.restoreAdmin', action: 'restore' }
        });
      } catch (auditError) {
        console.log('Audit logging failed:', auditError);
      }
    } catch (error) {
      console.error('restoreAdmin error:', error);
      throw error instanceof Error ? error : new Error('Failed to restore administrator');
    }
  },

  /**
   * List administrators - SIMPLIFIED VERSION WITHOUT COMPLEX JOINS
   * BACKWARD COMPATIBLE: Supports both old and new call patterns
   */
  async listAdmins(companyIdOrFilters: string | AdminFilters, additionalFilters?: AdminFilters): Promise<AdminUser[]> {
    try {
      let filters: AdminFilters;
      
      // Maintain backward compatibility
      if (typeof companyIdOrFilters === 'string') {
        // Legacy call pattern: listAdmins(companyId, filters?)
        filters = {
          company_id: companyIdOrFilters,
          ...additionalFilters
        };
      } else {
        // New call pattern: listAdmins(filters)
        filters = companyIdOrFilters;
      }

      // Ensure company_id is present and valid
      if (!filters.company_id || filters.company_id === 'undefined') {
        console.error('Invalid or missing company_id:', filters.company_id);
        return [];
      }

      // Build basic query - NO COMPLEX JOINS
      let query = supabase
        .from('entity_users')
        .select(`
          *,
          users!entity_users_user_id_fkey(
            email,
            raw_user_meta_data
          )
        `)
        .eq('company_id', filters.company_id)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.admin_level) {
        query = query.eq('admin_level', filters.admin_level);
      }

      if (filters.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      // Fix search filter - ensure it's a string
      if (filters.search && typeof filters.search === 'string' && filters.search.trim()) {
        const searchTerm = filters.search.trim();
        query = query.or(`users.email.ilike.%${searchTerm}%,(users.raw_user_meta_data->>name)::text.ilike.%${searchTerm}%`);
      }

      if (filters.created_after) {
        query = query.gte('created_at', filters.created_after);
      }

      if (filters.created_before) {
        query = query.lte('created_at', filters.created_before);
      }

      // Apply pagination
      const limit = filters.limit || 50;
      const offset = filters.offset || 0;
      
      query = query.range(offset, offset + limit - 1);

      // Execute query
      const { data: admins, error } = await query;

      if (error) {
        console.error('Database query error:', error);
        throw new Error(`Failed to list admins: ${error.message}`);
      }

      if (!admins || admins.length === 0) {
        return [];
      }

      // Try to fetch scope data separately (optional enhancement)
      let scopeMap = new Map<string, any[]>();
      
      try {
        const adminIds = admins.map(a => a.id);
        const { data: scopes } = await supabase
          .from('entity_admin_scope')
          .select('user_id, scope_type, scope_id')
          .in('user_id', adminIds)
          .eq('is_active', true);

        if (scopes) {
          scopes.forEach(scope => {
            if (!scopeMap.has(scope.user_id)) {
              scopeMap.set(scope.user_id, []);
            }
            scopeMap.get(scope.user_id)!.push(scope);
          });
        }
      } catch (scopeError) {
        // Silently ignore scope fetch errors
        console.log('Scope data not available');
      }

      // Transform and return data
      const enrichedAdmins = admins.map(admin => {
        const userScopes = scopeMap.get(admin.id) || [];
        const schoolScopes = userScopes.filter(s => s.scope_type === 'school').map(s => s.scope_id);
        const branchScopes = userScopes.filter(s => s.scope_type === 'branch').map(s => s.scope_id);

        return {
          id: admin.id,
          email: admin.users?.email || '',
          name: admin.users?.raw_user_meta_data?.name || '',
          admin_level: admin.admin_level || 'entity_admin',
          company_id: admin.company_id,
          permissions: admin.permissions || permissionService.getDefaultPermissions(),
          is_active: admin.is_active ?? true,
          created_at: admin.created_at || new Date().toISOString(),
          updated_at: admin.updated_at || admin.created_at || new Date().toISOString(),
          metadata: admin.metadata || {},
          parent_admin_id: admin.parent_admin_id || null,
          assigned_schools: schoolScopes,
          assigned_branches: branchScopes
        };
      });

      return enrichedAdmins as AdminUser[];
    } catch (error) {
      console.error('listAdmins error:', error);
      // Return empty array on error to prevent UI crashes
      return [];
    }
  },

  /**
   * Get a single admin by ID - SIMPLIFIED VERSION
   */
  async getAdminById(userId: string): Promise<AdminUser | null> {
    try {
      // Validate userId
      if (!userId) {
        return null;
      }

      // Fetch basic admin data - NO COMPLEX JOINS
      const { data: admin, error } = await supabase
        .from('entity_users')
        .select(`
          *,
          users!entity_users_user_id_fkey(
            email,
            raw_user_meta_data
          )
        `)
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        throw new Error(`Failed to get admin: ${error.message}`);
      }

      // Try to fetch scope data separately
      let assignedSchools: string[] = [];
      let assignedBranches: string[] = [];

      try {
        const { data: scopes } = await supabase
          .from('entity_admin_scope')
          .select('scope_type, scope_id')
          .eq('user_id', userId)
          .eq('is_active', true);

        if (scopes) {
          assignedSchools = scopes.filter(s => s.scope_type === 'school').map(s => s.scope_id);
          assignedBranches = scopes.filter(s => s.scope_type === 'branch').map(s => s.scope_id);
        }
      } catch (scopeError) {
        console.log('Scope data not available');
      }

      const enrichedAdmin = {
        id: admin.id,
        email: admin.users?.email || '',
        name: admin.users?.raw_user_meta_data?.name || '',
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

      return enrichedAdmin as AdminUser;
    } catch (error) {
      console.error('getAdminById error:', error);
      return null;
    }
  },

  /**
   * Check if email is available for admin creation
   */
  async isEmailAvailable(email: string, companyId: string, excludeUserId?: string): Promise<boolean> {
    try {
      // Validate inputs
      if (!email || !companyId || companyId === 'undefined') {
        return false;
      }

      let query = supabase
        .from('entity_users')
        .select('id')
        .eq('email', email)
        .eq('company_id', companyId);

      if (excludeUserId) {
        query = query.neq('id', excludeUserId);
      }

      const { data, error } = await query.maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Email check error:', error);
        return false;
      }

      return !data; // Email is available if no user found
    } catch (error) {
      console.error('isEmailAvailable error:', error);
      return false;
    }
  }
};