/**
 * File: /src/app/entity-module/organisation/tabs/admins/services/scopeService.ts
 * 
 * FIXED VERSION - Corrected all logic errors and null handling
 * Properly handles entity fetching and scope validation
 */

import { supabase } from '@/lib/supabase';
import { EntityAdminScope, AdminPermissions } from '../types/admin.types';

export const scopeService = {
  /**
   * Retrieve all assigned scopes for a given user
   * FIXED: Proper null handling for entity details
   */
  async getScopes(userId: string): Promise<EntityAdminScope[]> {
    try {
      // First, fetch all scopes for the user
      const { data: scopes, error } = await supabase
        .from('entity_admin_scope')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      
      if (!scopes || scopes.length === 0) {
        return [];
      }

      // Now fetch entity details based on scope_type
      const enrichedScopes = await Promise.all(
        scopes.map(async (scope) => {
          let entityDetails = null;
          let entityName = 'Unknown Entity';
          
          try {
            switch (scope.scope_type) {
              case 'company':
                const { data: company } = await supabase
                  .from('companies')
                  .select('id, name, code')
                  .eq('id', scope.scope_id)
                  .maybeSingle();
                
                if (company) {
                  entityDetails = company;
                  entityName = company.name;
                }
                break;
                
              case 'school':
                const { data: school } = await supabase
                  .from('schools')
                  .select('id, name, code')
                  .eq('id', scope.scope_id)
                  .maybeSingle();
                
                if (school) {
                  entityDetails = school;
                  entityName = school.name;
                }
                break;
                
              case 'branch':
                const { data: branch } = await supabase
                  .from('branches')
                  .select('id, name, code')
                  .eq('id', scope.scope_id)
                  .maybeSingle();
                
                if (branch) {
                  entityDetails = branch;
                  entityName = branch.name;
                }
                break;
            }
          } catch (fetchError) {
            console.error(`Failed to fetch ${scope.scope_type} details:`, fetchError);
          }
          
          // Return enriched scope with entity details
          return {
            ...scope,
            entity_details: entityDetails,
            entity_name: entityName,
            // Ensure all required fields have defaults
            permissions: scope.permissions || {},
            can_create_users: scope.can_create_users ?? false,
            can_modify_users: scope.can_modify_users ?? false,
            can_delete_users: scope.can_delete_users ?? false,
            can_view_all: scope.can_view_all ?? true,
            can_export_data: scope.can_export_data ?? false,
            can_manage_settings: scope.can_manage_settings ?? false,
            is_active: scope.is_active ?? true
          };
        })
      );
      
      return enrichedScopes;
    } catch (error) {
      console.error('getScopes error:', error);
      throw error;
    }
  },

  /**
   * Assign a new scope to a user with proper validation
   * FIXED: Added validation and proper error handling
   */
  async assignScope(
    userId: string,
    scope: Omit<EntityAdminScope, 'id' | 'user_id' | 'assigned_at'>
  ): Promise<EntityAdminScope> {
    try {
      // Validate that the scope entity exists
      const isValidScope = await this.validateScopeEntity(scope.scope_type, scope.scope_id);
      if (!isValidScope) {
        throw new Error(`Invalid ${scope.scope_type} with ID ${scope.scope_id}`);
      }

      // Check for duplicate scope assignment
      const { data: existingScope } = await supabase
        .from('entity_admin_scope')
        .select('id')
        .eq('user_id', userId)
        .eq('scope_type', scope.scope_type)
        .eq('scope_id', scope.scope_id)
        .eq('is_active', true)
        .maybeSingle();

      if (existingScope) {
        throw new Error('This scope is already assigned to the user');
      }

      // Prepare scope data with defaults
      const scopeData = {
        company_id: scope.company_id,
        user_id: userId,
        scope_type: scope.scope_type,
        scope_id: scope.scope_id,
        permissions: scope.permissions || {},
        can_create_users: scope.can_create_users ?? false,
        can_modify_users: scope.can_modify_users ?? false,
        can_delete_users: scope.can_delete_users ?? false,
        can_view_all: scope.can_view_all ?? true,
        can_export_data: scope.can_export_data ?? false,
        can_manage_settings: scope.can_manage_settings ?? false,
        assigned_at: new Date().toISOString(),
        assigned_by: scope.assigned_by || 'system',
        expires_at: scope.expires_at || null,
        is_active: true,
        notes: scope.notes || null
      };

      const { data, error } = await supabase
        .from('entity_admin_scope')
        .insert([scopeData])
        .select()
        .single();

      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('assignScope error:', error);
      throw error;
    }
  },

  /**
   * Remove a specific scope from a user
   * Deactivate scope assignment and log the action
   */
  async removeScope(userId: string, scopeId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('entity_admin_scope')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', scopeId)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('removeScope error:', error);
      throw error;
    }
  },

  /**
   * Check if user has access to a specific scope
   * FIXED: Corrected logic - should return true if data exists
   */
  async hasAccessToScope(userId: string, scopeType: string, scopeId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('entity_admin_scope')
        .select('id')
        .eq('user_id', userId)
        .eq('scope_type', scopeType)
        .eq('scope_id', scopeId)
        .eq('is_active', true)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      // FIXED: Return true if scope exists, false otherwise
      return !!data;
    } catch (error) {
      console.error('hasAccessToScope error:', error);
      return false;
    }
  },

  /**
   * Validate that a scope entity exists
   * NEW: Added for proper validation
   */
  async validateScopeEntity(scopeType: string, scopeId: string): Promise<boolean> {
    try {
      let table: string;
      
      switch (scopeType) {
        case 'company':
          table = 'companies';
          break;
        case 'school':
          table = 'schools';
          break;
        case 'branch':
          table = 'branches';
          break;
        default:
          return false;
      }

      const { data, error } = await supabase
        .from(table)
        .select('id')
        .eq('id', scopeId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return !!data;
    } catch (error) {
      console.error('validateScopeEntity error:', error);
      return false;
    }
  },

  /**
   * Get scopes for a specific company
   * FIXED: Proper entity fetching and error handling
   */
  async getCompanyScopes(companyId: string): Promise<EntityAdminScope[]> {
    try {
      // Fetch all scopes for the company
      const { data: scopes, error } = await supabase
        .from('entity_admin_scope')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      
      if (!scopes || scopes.length === 0) {
        return [];
      }
      
      // Enrich with user details
      const enrichedScopes = await Promise.all(
        scopes.map(async (scope) => {
          // Fetch user details
          const { data: user } = await supabase
            .from('entity_users')
            .select('id, email, name, admin_level')
            .eq('id', scope.user_id)
            .maybeSingle();
          
          // Fetch entity details
          let entityDetails = null;
          let entityName = 'Unknown Entity';
          
          try {
            switch (scope.scope_type) {
              case 'company':
                const { data: company } = await supabase
                  .from('companies')
                  .select('id, name, code')
                  .eq('id', scope.scope_id)
                  .maybeSingle();
                if (company) {
                  entityDetails = company;
                  entityName = company.name;
                }
                break;
                
              case 'school':
                const { data: school } = await supabase
                  .from('schools')
                  .select('id, name, code')
                  .eq('id', scope.scope_id)
                  .maybeSingle();
                if (school) {
                  entityDetails = school;
                  entityName = school.name;
                }
                break;
                
              case 'branch':
                const { data: branch } = await supabase
                  .from('branches')
                  .select('id, name, code')
                  .eq('id', scope.scope_id)
                  .maybeSingle();
                if (branch) {
                  entityDetails = branch;
                  entityName = branch.name;
                }
                break;
            }
          } catch (fetchError) {
            console.error(`Failed to fetch ${scope.scope_type} details:`, fetchError);
          }
          
          return {
            ...scope,
            user_details: user,
            entity_details: entityDetails,
            entity_name: entityName
          };
        })
      );
      
      return enrichedScopes;
    } catch (error) {
      console.error('getCompanyScopes error:', error);
      throw error;
    }
  },

  /**
   * Update scope permissions for a user
   * Modify existing scope permissions
   */
  async updateScopePermissions(scopeId: string, permissions: Partial<AdminPermissions>): Promise<EntityAdminScope> {
    try {
      const { data, error } = await supabase
        .from('entity_admin_scope')
        .update({ 
          permissions,
          updated_at: new Date().toISOString()
        })
        .eq('id', scopeId)
        .select()
        .single();

      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('updateScopePermissions error:', error);
      throw error;
    }
  },

  /**
   * Get scopes by entity type
   * Retrieve scopes filtered by entity type (school/branch)
   */
  async getScopesByType(companyId: string, scopeType: 'company' | 'school' | 'branch'): Promise<EntityAdminScope[]> {
    try {
      // First fetch scopes
      const { data: scopes, error } = await supabase
        .from('entity_admin_scope')
        .select('*')
        .eq('company_id', companyId)
        .eq('scope_type', scopeType)
        .eq('is_active', true)
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      
      if (!scopes || scopes.length === 0) {
        return [];
      }
      
      // Fetch user details for each scope
      const enrichedScopes = await Promise.all(
        scopes.map(async (scope) => {
          const { data: user } = await supabase
            .from('entity_users')
            .select('id, email, name, admin_level')
            .eq('id', scope.user_id)
            .maybeSingle();
          
          return {
            ...scope,
            user_details: user
          };
        })
      );
      
      return enrichedScopes;
    } catch (error) {
      console.error('getScopesByType error:', error);
      throw error;
    }
  },

  /**
   * Transfer scope from one user to another
   * NEW: Added for admin handover scenarios
   */
  async transferScope(scopeId: string, fromUserId: string, toUserId: string): Promise<EntityAdminScope> {
    try {
      // Verify the scope belongs to fromUserId
      const { data: existingScope, error: fetchError } = await supabase
        .from('entity_admin_scope')
        .select('*')
        .eq('id', scopeId)
        .eq('user_id', fromUserId)
        .eq('is_active', true)
        .single();

      if (fetchError || !existingScope) {
        throw new Error('Scope not found or not assigned to the specified user');
      }

      // Deactivate old scope
      await this.removeScope(fromUserId, scopeId);

      // Create new scope for target user
      const newScope = await this.assignScope(toUserId, {
        company_id: existingScope.company_id,
        scope_type: existingScope.scope_type,
        scope_id: existingScope.scope_id,
        permissions: existingScope.permissions,
        can_create_users: existingScope.can_create_users,
        can_modify_users: existingScope.can_modify_users,
        can_delete_users: existingScope.can_delete_users,
        can_view_all: existingScope.can_view_all,
        can_export_data: existingScope.can_export_data,
        can_manage_settings: existingScope.can_manage_settings,
        assigned_by: 'system', // Should be from context
        expires_at: existingScope.expires_at,
        notes: `Transferred from user ${fromUserId} on ${new Date().toISOString()}`
      });

      return newScope;
    } catch (error) {
      console.error('transferScope error:', error);
      throw error;
    }
  }
};