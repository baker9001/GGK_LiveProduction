/**
 * File: /src/app/entity-module/organisation/tabs/admins/services/adminService.ts
 * 
 * FIXED VERSION - Complete validation and error handling
 * - Fixed email validation regex
 * - Added fallback for missing parent_admin_id column
 * - Enhanced error messages
 */

import { supabase } from '@/lib/supabase';
import { AdminLevel, EntityAdminHierarchy, EntityAdminScope, AdminPermissions } from '../types/admin.types';
import { auditService } from './auditService';
import { permissionService } from './permissionService';

interface CreateAdminPayload {
  email: string;
  name: string;
  password?: string;
  admin_level: AdminLevel;
  company_id: string;
  permissions?: AdminPermissions;
  is_active?: boolean;
  created_by?: string;
  parent_admin_id?: string;
  metadata?: Record<string, any>;
}

interface UpdateAdminPayload {
  name?: string;
  email?: string;
  password?: string;
  admin_level?: AdminLevel;
  permissions?: AdminPermissions;
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

// Helper functions for safe data extraction
const getAdminEmail = (admin: any): string => {
  if (admin.users?.email) return admin.users.email;
  if (admin.metadata?.email) return admin.metadata.email;
  if (admin.email) return admin.email;
  return '';
};

const getAdminName = (admin: any): string => {
  if (admin.users?.raw_user_meta_data?.name) return admin.users.raw_user_meta_data.name;
  if (admin.metadata?.name) return admin.metadata.name;
  if (admin.name) return admin.name;
  return 'Unknown Admin';
};

// Enhanced email validation function
const validateEmail = (email: string): { isValid: boolean; sanitized: string; error?: string } => {
  // First trim and lowercase
  const trimmed = email.trim().toLowerCase();
  
  // Remove any dangerous characters but keep valid email chars
  const sanitized = trimmed.replace(/[^\w.@+_-]/gi, '');
  
  // Check basic structure
  if (!sanitized || sanitized.length < 3) {
    return { isValid: false, sanitized, error: 'Email address is too short' };
  }
  
  // Check for @ symbol
  if (!sanitized.includes('@')) {
    return { isValid: false, sanitized, error: 'Email address must contain @ symbol' };
  }
  
  // Split and validate parts
  const parts = sanitized.split('@');
  if (parts.length !== 2) {
    return { isValid: false, sanitized, error: 'Email address must have exactly one @ symbol' };
  }
  
  const [localPart, domain] = parts;
  
  // Validate local part
  if (!localPart || localPart.length === 0) {
    return { isValid: false, sanitized, error: 'Email address must have a username before @' };
  }
  
  // Validate domain
  if (!domain || domain.length < 3) {
    return { isValid: false, sanitized, error: 'Email address must have a valid domain' };
  }
  
  // Check for dot in domain
  if (!domain.includes('.')) {
    return { isValid: false, sanitized, error: 'Email domain must contain a dot' };
  }
  
  // More comprehensive email regex
  const emailRegex = /^[a-zA-Z0-9][a-zA-Z0-9._%+-]*@[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}$/;
  
  if (!emailRegex.test(sanitized)) {
    // Check specific issues
    if (sanitized.startsWith('.') || sanitized.startsWith('@')) {
      return { isValid: false, sanitized, error: 'Email address cannot start with . or @' };
    }
    if (sanitized.endsWith('.') || sanitized.endsWith('@')) {
      return { isValid: false, sanitized, error: 'Email address cannot end with . or @' };
    }
    if (sanitized.includes('..')) {
      return { isValid: false, sanitized, error: 'Email address cannot contain consecutive dots' };
    }
    return { isValid: false, sanitized, error: `Email address "${sanitized}" is invalid` };
  }
  
  return { isValid: true, sanitized };
};

// Input sanitization for name
const sanitizeName = (name: string): string => {
  return name.trim().replace(/[^a-zA-Z\s'-]/g, '');
};

// Helper to get current user context
const getCurrentUserId = (): string => {
  // This should be replaced with actual user context
  return 'system';
};

// Check if parent_admin_id column exists
const checkParentAdminColumnExists = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('entity_users')
      .select('parent_admin_id')
      .limit(0);
    
    return !error;
  } catch {
    return false;
  }
};

export const adminService = {
  /**
   * Create a new administrator user with complete validation
   */
  async createAdmin(payload: CreateAdminPayload): Promise<AdminUser> {
    try {
      const createdBy = payload.created_by || getCurrentUserId();

      // Input sanitization and validation
      const sanitizedName = sanitizeName(payload.name);
      
      // Validate name
      if (!sanitizedName || sanitizedName.length < 2) {
        throw new Error('Name must be at least 2 characters long');
      }

      // Enhanced email validation
      const emailValidation = validateEmail(payload.email);
      if (!emailValidation.isValid) {
        throw new Error(emailValidation.error || 'Invalid email format');
      }
      const sanitizedEmail = emailValidation.sanitized;

      // Validate required fields
      if (!payload.company_id) {
        throw new Error('Company ID is required');
      }

      // Step 1: Check for existing admin with same email
      const { data: existingUser, error: checkError } = await supabase
        .from('entity_users')
        .select('id')
        .eq('email', sanitizedEmail)
        .eq('company_id', payload.company_id)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        throw new Error(`Email validation failed: ${checkError.message}`);
      }

      if (existingUser) {
        throw new Error('An administrator with this email already exists in your organization');
      }

      // Step 2: Get and validate permissions
      let finalPermissions: AdminPermissions;
      
      if (payload.permissions && permissionService.isValidPermissionObject(payload.permissions)) {
        // Merge provided permissions with defaults
        const defaultPermissions = permissionService.getPermissionsForLevel(payload.admin_level);
        finalPermissions = permissionService.mergePermissions(defaultPermissions, payload.permissions);
      } else {
        // Use default permissions for admin level
        finalPermissions = permissionService.getPermissionsForLevel(payload.admin_level);
      }

      // Step 3: Create auth user if password provided
      let authUserId = null;
      if (payload.password) {
        try {
          const { data: authUser, error: authError } = await supabase.auth.signUp({
            email: sanitizedEmail,
            password: payload.password,
            options: {
              data: {
                name: sanitizedName,
                admin_level: payload.admin_level,
                company_id: payload.company_id
              }
            }
          });

          if (authError) {
            // Check for specific error messages
            if (authError.message.includes('email_address_invalid')) {
              throw new Error(`Email validation failed: The email address "${sanitizedEmail}" was rejected by the authentication service`);
            }
            throw new Error(`Failed to create auth user: ${authError.message}`);
          }

          authUserId = authUser.user?.id;
        } catch (authError: any) {
          console.error('Auth creation failed:', authError);
          throw authError;
        }
      }

      // Step 4: Check if parent_admin_id column exists
      const hasParentAdminColumn = await checkParentAdminColumnExists();

      // Step 5: Create admin record with dynamic column selection
      const adminData: any = {
        user_id: authUserId,
        email: sanitizedEmail,
        name: sanitizedName,
        admin_level: payload.admin_level,
        company_id: payload.company_id,
        permissions: finalPermissions,
        is_active: payload.is_active !== false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          ...payload.metadata,
          email: sanitizedEmail,
          name: sanitizedName,
          created_by: createdBy,
          created_at: new Date().toISOString()
        }
      };

      // Only add parent_admin_id if column exists
      if (hasParentAdminColumn && payload.parent_admin_id) {
        adminData.parent_admin_id = payload.parent_admin_id;
      }

      // Build column list dynamically
      const columns = Object.keys(adminData).filter(key => {
        // Exclude parent_admin_id if column doesn't exist
        if (key === 'parent_admin_id' && !hasParentAdminColumn) {
          return false;
        }
        return true;
      });

      const { data: newAdmin, error: createError } = await supabase
        .from('entity_users')
        .insert([adminData])
        .select(columns.join(', '))
        .single();

      if (createError) {
        // Rollback auth user if admin creation fails
        if (authUserId) {
          try {
            await supabase.auth.admin.deleteUser(authUserId);
          } catch (rollbackError) {
            console.error('Failed to rollback auth user:', rollbackError);
          }
        }
        
        // Check for specific errors
        if (createError.message.includes('parent_admin_id')) {
          throw new Error('Admin hierarchy feature is not yet enabled. Please run the database migration or contact support.');
        }
        
        throw new Error(`Failed to create admin: ${createError.message}`);
      }

      // Step 6: Log the action
      try {
        await auditService.logAction({
          company_id: payload.company_id,
          action_type: 'admin_created',
          actor_id: createdBy,
          target_id: newAdmin.id,
          target_type: 'entity_user',
          changes: {
            admin_level: payload.admin_level,
            email: sanitizedEmail,
            name: sanitizedName
          },
          metadata: { source: 'adminService.createAdmin' }
        });
      } catch (auditError) {
        console.log('Audit logging failed:', auditError);
      }

      return newAdmin as AdminUser;
    } catch (error: any) {
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

      // Sanitize and validate fields
      if (payload.name !== undefined) {
        updateData.name = sanitizeName(payload.name);
        if (!updateData.name || updateData.name.length < 2) {
          throw new Error('Name must be at least 2 characters long');
        }
        updateData.metadata = {
          ...existingAdmin.metadata,
          name: updateData.name
        };
      }

      if (payload.email !== undefined) {
        const emailValidation = validateEmail(payload.email);
        if (!emailValidation.isValid) {
          throw new Error(emailValidation.error || 'Invalid email format');
        }
        updateData.email = emailValidation.sanitized;
        
        // Check if new email is already in use
        if (updateData.email !== existingAdmin.email) {
          const { data: emailCheck } = await supabase
            .from('entity_users')
            .select('id')
            .eq('email', updateData.email)
            .eq('company_id', existingAdmin.company_id)
            .neq('id', userId)
            .maybeSingle();

          if (emailCheck) {
            throw new Error('This email is already in use by another administrator');
          }
        }

        updateData.metadata = {
          ...updateData.metadata,
          email: updateData.email
        };
      }

      if (payload.admin_level !== undefined) {
        updateData.admin_level = payload.admin_level;
        
        // Update permissions based on new admin level
        if (payload.admin_level !== existingAdmin.admin_level) {
          const newDefaultPermissions = permissionService.getPermissionsForLevel(payload.admin_level);
          updateData.permissions = payload.permissions 
            ? permissionService.mergePermissions(newDefaultPermissions, payload.permissions)
            : newDefaultPermissions;
        }
      }

      if (payload.permissions !== undefined) {
        // Validate and merge permissions
        if (permissionService.isValidPermissionObject(payload.permissions)) {
          updateData.permissions = updateData.permissions 
            ? permissionService.mergePermissions(updateData.permissions, payload.permissions)
            : permissionService.mergePermissions(existingAdmin.permissions || {}, payload.permissions);
        } else {
          throw new Error('Invalid permissions structure');
        }
      }

      if (payload.is_active !== undefined) {
        updateData.is_active = payload.is_active;
      }

      // Step 3: Update auth user if password provided
      if (payload.password) {
        if (existingAdmin.user_id) {
          try {
            const { error: passwordError } = await supabase.auth.admin.updateUserById(
              existingAdmin.user_id,
              { password: payload.password }
            );

            if (passwordError) {
              console.error('Failed to update password:', passwordError);
            }
          } catch (error) {
            console.error('Password update failed:', error);
          }
        }
      }

      // Step 4: Update the admin record
      const { data: updatedAdmin, error: updateError } = await supabase
        .from('entity_users')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to update admin: ${updateError.message}`);
      }

      // Step 5: Log the update action
      try {
        const changes: Record<string, any> = {};
        Object.keys(updateData).forEach(key => {
          if (key !== 'updated_at' && key !== 'metadata' && existingAdmin[key] !== updateData[key]) {
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
    } catch (error: any) {
      console.error('updateAdmin error:', error);
      throw error instanceof Error ? error : new Error('Failed to update administrator');
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

      // Check if parent_admin_id column exists
      const hasParentAdminColumn = await checkParentAdminColumnExists();

      // Build column selection dynamically
      const baseColumns = [
        'id',
        'user_id',
        'email',
        'name',
        'admin_level',
        'company_id',
        'permissions',
        'is_active',
        'created_at',
        'updated_at',
        'metadata'
      ];

      if (hasParentAdminColumn) {
        baseColumns.push('parent_admin_id');
      }

      // Build query
      let query = supabase
        .from('entity_users')
        .select(`
          ${baseColumns.join(', ')},
          users:user_id (
            email,
            raw_user_meta_data
          )
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters) {
        if (filters.admin_level) {
          query = query.eq('admin_level', filters.admin_level);
        }
        if (filters.is_active !== undefined) {
          query = query.eq('is_active', filters.is_active);
        }
        if (filters.search) {
          query = query.or(`email.ilike.%${filters.search}%,metadata->name.ilike.%${filters.search}%`);
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
        // Check for specific column errors
        if (error.message.includes('parent_admin_id')) {
          console.warn('parent_admin_id column not found, fetching without it');
          // Retry without parent_admin_id
          const retryQuery = supabase
            .from('entity_users')
            .select(`
              id, user_id, email, name, admin_level, company_id,
              permissions, is_active, created_at, updated_at, metadata,
              users:user_id (
                email,
                raw_user_meta_data
              )
            `)
            .eq('company_id', companyId)
            .order('created_at', { ascending: false });
          
          const { data: retriedAdmins, error: retryError } = await retryQuery;
          if (retryError) {
            throw new Error(`Failed to fetch admins: ${retryError.message}`);
          }
          return (retriedAdmins || []).map(admin => ({
            id: admin.id,
            email: getAdminEmail(admin),
            name: getAdminName(admin),
            admin_level: admin.admin_level || 'entity_admin',
            company_id: admin.company_id,
            permissions: admin.permissions || permissionService.getDefaultPermissions(),
            is_active: admin.is_active ?? true,
            created_at: admin.created_at,
            updated_at: admin.updated_at,
            metadata: admin.metadata || {},
            parent_admin_id: null
          }));
        }
        throw new Error(`Failed to fetch admins: ${error.message}`);
      }

      if (!admins || admins.length === 0) {
        return [];
      }

      // Transform and enrich data
      const enrichedAdmins = admins.map(admin => ({
        id: admin.id,
        email: getAdminEmail(admin),
        name: getAdminName(admin),
        admin_level: admin.admin_level || 'entity_admin',
        company_id: admin.company_id,
        permissions: admin.permissions || permissionService.getDefaultPermissions(),
        is_active: admin.is_active ?? true,
        created_at: admin.created_at,
        updated_at: admin.updated_at,
        metadata: admin.metadata || {},
        parent_admin_id: hasParentAdminColumn ? admin.parent_admin_id : null
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
  async deleteAdmin(userId: string): Promise<void> {
    try {
      const actorId = getCurrentUserId();

      const { data: admin, error: fetchError } = await supabase
        .from('entity_users')
        .select('company_id, name, email')
        .eq('id', userId)
        .single();

      if (fetchError || !admin) {
        throw new Error('Administrator not found');
      }

      // Deactivate instead of hard delete
      const { error: updateError } = await supabase
        .from('entity_users')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        throw new Error(`Failed to deactivate admin: ${updateError.message}`);
      }

      // Log the action
      try {
        await auditService.logAction({
          company_id: admin.company_id,
          action_type: 'admin_deleted',
          actor_id: actorId,
          target_id: userId,
          target_type: 'entity_user',
          changes: {
            admin_name: getAdminName(admin),
            admin_email: getAdminEmail(admin)
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
  async restoreAdmin(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('entity_users')
        .update({ 
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        throw new Error(`Failed to restore admin: ${error.message}`);
      }
    } catch (error: any) {
      console.error('restoreAdmin error:', error);
      throw error instanceof Error ? error : new Error('Failed to restore administrator');
    }
  }
};