/**
 * File: /src/app/entity-module/organisation/tabs/admins/services/scopeService.ts
 * 
 * Admin Scope Management Service
 * Handles school/branch-level access assignments for administrators
 * 
 * FIXED: Corrected entity fetching without relying on non-existent foreign keys
 * 
 * Dependencies:
 *   - @/lib/supabase (Supabase client)
 *   - ../types/admin.types.ts (Type definitions)
 * 
 * Database Tables:
 *   - entity_admin_scope (primary)
 *   - schools, branches, companies (for scope validation)
 * 
 * Functions:
 *   - getScopes: Retrieve all assigned scopes for a user
 *   - assignScope: Assign new scope to a user
 *   - removeScope: Remove specific scope from a user
 *   - hasAccessToScope: Check if user has access to specific scope
 */

import { supabase } from '@/lib/supabase';
import { EntityAdminScope, AdminPermissions } from '../types/admin.types';

export const scopeService = {
  /**
   * Retrieve all assigned scopes for a given user
   * Fetch all scope assignments with related entity details
   * @param userId - The user ID to fetch scopes for
   * @returns Promise<EntityAdminScope[]> - Array of scope assignments
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
          
          try {
            switch (scope.scope_type) {
              case 'company':
                const { data: company } = await supabase
                  .from('companies')
                  .select('id, name, code')
                  .eq('id', scope.scope_id)
                  .maybeSingle();
                entityDetails = company;
                break;
                
              case 'school':
                const { data: school } = await supabase
                  .from('schools')
                  .select('id, name, code')
                  .eq('id', scope.scope_id)
                  .maybeSingle();
                entityDetails = school;
                break;
                
              case 'branch':
                const { data: branch } = await supabase
                  .from('branches')
                  .select('id, name, code')
                  .eq('id', scope.scope_id)
                  .maybeSingle();
                entityDetails = branch;
                break;
            }
          } catch (err) {
            console.warn(`Failed to fetch details for ${scope.scope_type} ${scope.scope_id}:`, err);
          }
          
          return {
            ...scope,
            entity_details: entityDetails
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
   * Assign a new scope to a user
   * Create scope assignment with permission validation
   * @param userId - The user ID to assign scope to
   * @param scope - The scope configuration to assign
   * @returns Promise<EntityAdminScope> - The created scope assignment
   */
  async assignScope(userId: string, scope: Omit<EntityAdminScope, 'id' | 'user_id' | 'assigned_at'>): Promise<EntityAdminScope> {
    try {
      // Validate that the scope entity exists
      const isValid = await this.validateScopeEntity(
        scope.scope_type,
        scope.scope_id,
        scope.company_id
      );
      
      if (!isValid) {
        throw new Error(`Invalid ${scope.scope_type} with ID ${scope.scope_id}`);
      }
      
      const scopeData = {
        user_id: userId,
        company_id: scope.company_id,
        scope_type: scope.scope_type,
        scope_id: scope.scope_id,
        permissions: scope.permissions || {},
        can_create_users: scope.can_create_users ?? false,
        can_modify_users: scope.can_modify_users ?? false,
        can_delete_users: scope.can_delete_users ?? false,
        can_view_all: scope.can_view_all ?? true,
        can_export_data: scope.can_export_data ?? false,
        can_manage_settings: scope.can_manage_settings ?? false,
        assigned_by: scope.assigned_by,
        expires_at: scope.expires_at,
        is_active: true,
        notes: scope.notes
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
   * @param userId - The user ID to remove scope from
   * @param scopeId - The scope assignment ID to remove
   * @returns Promise<void>
   */
  async removeScope(userId: string, scopeId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('entity_admin_scope')
        .update({ is_active: false })
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
   * Validate user access to scope type and entity
   * @param userId - The user ID to check access for
   * @param scopeType - The type of scope ('company' | 'school' | 'branch')
   * @param scopeId - The specific entity ID within the scope type
   * @returns Promise<boolean> - True if user has access to the scope
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

      if (error) throw error;
      
      return !!data;
    } catch (error) {
      console.error('hasAccessToScope error:', error);
      throw error;
    }
  },

  /**
   * Get all scopes for a specific company
   * Retrieve all scope assignments within a company with user details
   * @param companyId - The company ID to fetch scopes for
   * @returns Promise<EntityAdminScope[]> - Array of all scope assignments in the company
   */
  async getCompanyScopes(companyId: string): Promise<EntityAdminScope[]> {
    try {
      // Fetch scopes with user details (this foreign key should exist)
      const { data: scopes, error } = await supabase
        .from('entity_admin_scope')
        .select(`
          *,
          entity_users!entity_admin_scope_user_id_fkey(
            user_id,
            email,
            raw_user_meta_data,
            admin_level
          )
        `)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('assigned_at', { ascending: false });

      if (error) {
        // If the foreign key doesn't exist, fetch without join
        const { data: basicScopes, error: basicError } = await supabase
          .from('entity_admin_scope')
          .select('*')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .order('assigned_at', { ascending: false });
        
        if (basicError) throw basicError;
        
        // Fetch user details separately
        const enrichedScopes = await Promise.all(
          (basicScopes || []).map(async (scope) => {
            const { data: user } = await supabase
              .from('entity_users')
              .select('user_id, email, raw_user_meta_data, admin_level')
              .eq('user_id', scope.user_id)
              .maybeSingle();
            
            return {
              ...scope,
              entity_users: user
            };
          })
        );
        
        return enrichedScopes;
      }
      
      return scopes || [];
    } catch (error) {
      console.error('getCompanyScopes error:', error);
      throw error;
    }
  },

  /**
   * Update scope permissions for a user
   * Modify existing scope permissions
   * @param scopeId - The scope assignment ID to update
   * @param permissions - The new permissions to apply
   * @returns Promise<EntityAdminScope> - The updated scope assignment
   */
  async updateScopePermissions(scopeId: string, permissions: Partial<AdminPermissions>): Promise<EntityAdminScope> {
    try {
      const { data, error } = await supabase
        .from('entity_admin_scope')
        .update({ permissions })
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
   * @param companyId - The company ID to filter by
   * @param scopeType - The scope type to filter by
   * @returns Promise<EntityAdminScope[]> - Array of filtered scope assignments
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
            .select('user_id, email, raw_user_meta_data, admin_level')
            .eq('user_id', scope.user_id)
            .maybeSingle();
          
          // Also fetch entity details
          let entityDetails = null;
          
          try {
            switch (scopeType) {
              case 'company':
                const { data: company } = await supabase
                  .from('companies')
                  .select('id, name, code')
                  .eq('id', scope.scope_id)
                  .maybeSingle();
                entityDetails = company;
                break;
                
              case 'school':
                const { data: school } = await supabase
                  .from('schools')
                  .select('id, name, code')
                  .eq('id', scope.scope_id)
                  .maybeSingle();
                entityDetails = school;
                break;
                
              case 'branch':
                const { data: branch } = await supabase
                  .from('branches')
                  .select('id, name, code')
                  .eq('id', scope.scope_id)
                  .maybeSingle();
                entityDetails = branch;
                break;
            }
          } catch (err) {
            console.warn(`Failed to fetch details for ${scopeType} ${scope.scope_id}:`, err);
          }
          
          return {
            ...scope,
            entity_users: user,
            entity_details: entityDetails
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
   * Validate scope entity exists
   * Check if the scope entity (school/branch) exists and is accessible
   * @param scopeType - The type of scope to validate
   * @param scopeId - The entity ID to validate
   * @param companyId - The company ID for validation context
   * @returns Promise<boolean> - True if scope entity exists and is valid
   */
  async validateScopeEntity(scopeType: string, scopeId: string, companyId: string): Promise<boolean> {
    try {
      let tableName = '';
      let companyField = '';
      
      switch (scopeType) {
        case 'company':
          tableName = 'companies';
          companyField = 'id';
          break;
        case 'school':
          tableName = 'schools';
          companyField = 'company_id';
          break;
        case 'branch':
          tableName = 'branches';
          // For branches, need to join through schools
          const { data: branchData, error: branchError } = await supabase
            .from('branches')
            .select(`
              id,
              schools!inner(company_id)
            `)
            .eq('id', scopeId)
            .eq('schools.company_id', companyId)
            .maybeSingle();
          
          if (branchError) throw branchError;
          return !!branchData;
        default:
          return false;
      }
      
      const { data, error } = await supabase
        .from(tableName)
        .select('id')
        .eq('id', scopeId)
        .eq(companyField, companyId)
        .maybeSingle();

      if (error) throw error;
      
      return !!data;
    } catch (error) {
      console.error('validateScopeEntity error:', error);
      throw error;
    }
  }
};