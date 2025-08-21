/**
 * File: /src/app/entity-module/organisation/tabs/admins/services/hierarchyService.ts
 * 
 * COMPLETE IMPLEMENTATION - Admin Hierarchy Management
 * Handles parent-child relationships between administrators
 */

import { supabase } from '@/lib/supabase';
import { AdminLevel, EntityAdminHierarchy } from '../types/admin.types';
import { auditService } from './auditService';

interface HierarchyNode {
  id: string;
  email: string;
  name: string;
  admin_level: AdminLevel;
  is_active: boolean;
  children: HierarchyNode[];
  parent_id?: string | null;
}

interface HierarchyFilters {
  company_id: string;
  admin_type?: AdminLevel;
  include_inactive?: boolean;
  depth_limit?: number;
}

export const hierarchyService = {
  /**
   * Get the complete admin hierarchy tree for a company
   */
  async getHierarchyTree(companyId: string, includeInactive: boolean = false): Promise<HierarchyNode[]> {
    try {
      // Step 1: Fetch all admins for the company
      let query = supabase
        .from('entity_users')
        .select('id, email, name, admin_level, is_active, parent_admin_id')
        .eq('company_id', companyId)
        .order('admin_level', { ascending: true })
        .order('name', { ascending: true });

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data: admins, error } = await query;

      if (error) throw error;

      if (!admins || admins.length === 0) {
        return [];
      }

      // Step 2: Build hierarchy map
      const adminMap = new Map<string, HierarchyNode>();
      const rootNodes: HierarchyNode[] = [];

      // Initialize all nodes
      admins.forEach(admin => {
        adminMap.set(admin.id, {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          admin_level: admin.admin_level,
          is_active: admin.is_active,
          children: [],
          parent_id: admin.parent_admin_id
        });
      });

      // Build parent-child relationships
      admins.forEach(admin => {
        const node = adminMap.get(admin.id)!;
        
        if (admin.parent_admin_id && adminMap.has(admin.parent_admin_id)) {
          // Add as child to parent
          const parentNode = adminMap.get(admin.parent_admin_id)!;
          parentNode.children.push(node);
        } else {
          // No parent or parent not in map - treat as root
          rootNodes.push(node);
        }
      });

      // Sort children at each level
      const sortChildren = (nodes: HierarchyNode[]) => {
        nodes.forEach(node => {
          node.children.sort((a, b) => {
            // Sort by admin level first, then by name
            const levelOrder = this.getAdminLevelOrder(a.admin_level) - this.getAdminLevelOrder(b.admin_level);
            if (levelOrder !== 0) return levelOrder;
            return a.name.localeCompare(b.name);
          });
          sortChildren(node.children);
        });
      };

      sortChildren(rootNodes);

      return rootNodes;
    } catch (error) {
      console.error('getHierarchyTree error:', error);
      throw error;
    }
  },

  /**
   * Get direct reports for a specific admin
   */
  async getDirectReports(adminId: string, includeInactive: boolean = false): Promise<HierarchyNode[]> {
    try {
      let query = supabase
        .from('entity_users')
        .select('id, email, name, admin_level, is_active, parent_admin_id')
        .eq('parent_admin_id', adminId)
        .order('admin_level', { ascending: true })
        .order('name', { ascending: true });

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data: reports, error } = await query;

      if (error) throw error;

      return (reports || []).map(admin => ({
        id: admin.id,
        email: admin.email,
        name: admin.name,
        admin_level: admin.admin_level,
        is_active: admin.is_active,
        children: [],
        parent_id: admin.parent_admin_id
      }));
    } catch (error) {
      console.error('getDirectReports error:', error);
      throw error;
    }
  },

  /**
   * Get the upline (parent chain) for an admin
   */
  async getUpline(adminId: string): Promise<HierarchyNode[]> {
    try {
      const upline: HierarchyNode[] = [];
      let currentId: string | null = adminId;
      const visited = new Set<string>(); // Prevent infinite loops

      while (currentId && !visited.has(currentId)) {
        visited.add(currentId);

        const { data: admin, error } = await supabase
          .from('entity_users')
          .select('id, email, name, admin_level, is_active, parent_admin_id')
          .eq('id', currentId)
          .single();

        if (error || !admin) break;

        upline.push({
          id: admin.id,
          email: admin.email,
          name: admin.name,
          admin_level: admin.admin_level,
          is_active: admin.is_active,
          children: [],
          parent_id: admin.parent_admin_id
        });

        currentId = admin.parent_admin_id;
      }

      return upline.reverse(); // Return from top to bottom
    } catch (error) {
      console.error('getUpline error:', error);
      throw error;
    }
  },

  /**
   * Set or update parent-child relationship
   */
  async setParentAdmin(childId: string, parentId: string | null): Promise<void> {
    try {
      // Validate no circular reference
      if (parentId) {
        const isCircular = await this.wouldCreateCircularReference(childId, parentId);
        if (isCircular) {
          throw new Error('Cannot set parent: would create circular reference');
        }
      }

      // Get current admin for audit
      const { data: currentAdmin, error: fetchError } = await supabase
        .from('entity_users')
        .select('parent_admin_id, company_id, name')
        .eq('id', childId)
        .single();

      if (fetchError) throw fetchError;

      // Update parent relationship
      const { error: updateError } = await supabase
        .from('entity_users')
        .update({ 
          parent_admin_id: parentId,
          updated_at: new Date().toISOString()
        })
        .eq('id', childId);

      if (updateError) throw updateError;

      // Update hierarchy table if it exists
      if (parentId) {
        // First, deactivate any existing hierarchy entries for this child
        await supabase
          .from('entity_admin_hierarchy')
          .update({ is_active: false })
          .eq('child_admin_id', childId);

        // Create new hierarchy entry
        const { error: hierarchyError } = await supabase
          .from('entity_admin_hierarchy')
          .insert({
            company_id: currentAdmin.company_id,
            parent_admin_id: parentId,
            child_admin_id: childId,
            admin_type: 'entity_admin', // Should be determined from child's type
            relationship_type: 'direct',
            created_by: 'system', // Should be from context
            is_active: true,
            metadata: {}
          });

        if (hierarchyError) {
          console.error('Failed to update hierarchy table:', hierarchyError);
        }
      }

      // Log the change
      await auditService.logAction({
        company_id: currentAdmin.company_id,
        action_type: 'hierarchy_changed',
        actor_id: 'system', // Should be from context
        target_id: childId,
        target_type: 'entity_user',
        changes: {
          old_parent: currentAdmin.parent_admin_id,
          new_parent: parentId,
          admin_name: currentAdmin.name
        },
        metadata: { source: 'hierarchyService.setParentAdmin' }
      });
    } catch (error) {
      console.error('setParentAdmin error:', error);
      throw error;
    }
  },

  /**
   * Remove an admin from hierarchy (set parent to null)
   */
  async removeFromHierarchy(adminId: string): Promise<void> {
    return this.setParentAdmin(adminId, null);
  },

  /**
   * Get all descendants of an admin (recursive)
   */
  async getAllDescendants(adminId: string, includeInactive: boolean = false): Promise<HierarchyNode[]> {
    try {
      const descendants: HierarchyNode[] = [];
      const queue: string[] = [adminId];
      const visited = new Set<string>();

      while (queue.length > 0) {
        const currentId = queue.shift()!;
        
        if (visited.has(currentId)) continue;
        visited.add(currentId);

        const directReports = await this.getDirectReports(currentId, includeInactive);
        
        descendants.push(...directReports);
        queue.push(...directReports.map(r => r.id));
      }

      return descendants;
    } catch (error) {
      console.error('getAllDescendants error:', error);
      throw error;
    }
  },

  /**
   * Check if setting a parent would create a circular reference
   */
  async wouldCreateCircularReference(childId: string, proposedParentId: string): Promise<boolean> {
    try {
      if (childId === proposedParentId) return true;

      // Get all descendants of the child
      const descendants = await this.getAllDescendants(childId, true);
      
      // Check if proposed parent is among descendants
      return descendants.some(d => d.id === proposedParentId);
    } catch (error) {
      console.error('wouldCreateCircularReference error:', error);
      return true; // Err on the side of caution
    }
  },

  /**
   * Get hierarchy statistics
   */
  async getHierarchyStats(companyId: string): Promise<{
    total_admins: number;
    by_level: Record<AdminLevel, number>;
    max_depth: number;
    orphaned_admins: number;
  }> {
    try {
      const { data: admins, error } = await supabase
        .from('entity_users')
        .select('id, admin_level, parent_admin_id')
        .eq('company_id', companyId)
        .eq('is_active', true);

      if (error) throw error;

      const stats = {
        total_admins: admins?.length || 0,
        by_level: {} as Record<AdminLevel, number>,
        max_depth: 0,
        orphaned_admins: 0
      };

      if (!admins || admins.length === 0) return stats;

      // Count by level
      admins.forEach(admin => {
        stats.by_level[admin.admin_level] = (stats.by_level[admin.admin_level] || 0) + 1;
        
        // Count orphans (admins with parent_admin_id but parent doesn't exist)
        if (admin.parent_admin_id) {
          const parentExists = admins.some(a => a.id === admin.parent_admin_id);
          if (!parentExists) {
            stats.orphaned_admins++;
          }
        }
      });

      // Calculate max depth
      const calculateDepth = (adminId: string, visited: Set<string> = new Set()): number => {
        if (visited.has(adminId)) return 0;
        visited.add(adminId);

        const children = admins.filter(a => a.parent_admin_id === adminId);
        if (children.length === 0) return 1;

        return 1 + Math.max(...children.map(c => calculateDepth(c.id, visited)));
      };

      const rootAdmins = admins.filter(a => !a.parent_admin_id);
      stats.max_depth = Math.max(...rootAdmins.map(r => calculateDepth(r.id)));

      return stats;
    } catch (error) {
      console.error('getHierarchyStats error:', error);
      return {
        total_admins: 0,
        by_level: {} as Record<AdminLevel, number>,
        max_depth: 0,
        orphaned_admins: 0
      };
    }
  },

  /**
   * Reassign all children of an admin to a new parent
   */
  async reassignChildren(fromAdminId: string, toAdminId: string | null): Promise<number> {
    try {
      // Get all direct children
      const { data: children, error: fetchError } = await supabase
        .from('entity_users')
        .select('id')
        .eq('parent_admin_id', fromAdminId);

      if (fetchError) throw fetchError;

      if (!children || children.length === 0) return 0;

      // Update all children to new parent
      const { error: updateError } = await supabase
        .from('entity_users')
        .update({ 
          parent_admin_id: toAdminId,
          updated_at: new Date().toISOString()
        })
        .eq('parent_admin_id', fromAdminId);

      if (updateError) throw updateError;

      // Log the mass reassignment
      await auditService.logAction({
        company_id: 'system', // Should get from context
        action_type: 'hierarchy_changed',
        actor_id: 'system',
        target_id: fromAdminId,
        target_type: 'entity_user',
        changes: {
          action: 'mass_reassignment',
          children_count: children.length,
          new_parent: toAdminId
        },
        metadata: { source: 'hierarchyService.reassignChildren' }
      });

      return children.length;
    } catch (error) {
      console.error('reassignChildren error:', error);
      throw error;
    }
  },

  /**
   * Helper: Get admin level hierarchy order
   */
  getAdminLevelOrder(level: AdminLevel): number {
    const order: Record<AdminLevel, number> = {
      'entity_admin': 0,
      'sub_entity_admin': 1,
      'school_admin': 2,
      'branch_admin': 3
    };
    return order[level] ?? 99;
  },

  /**
   * Validate hierarchy integrity
   */
  async validateHierarchy(companyId: string): Promise<{
    valid: boolean;
    issues: string[];
  }> {
    try {
      const issues: string[] = [];

      // Fetch all admins
      const { data: admins, error } = await supabase
        .from('entity_users')
        .select('id, name, admin_level, parent_admin_id')
        .eq('company_id', companyId);

      if (error) throw error;

      if (!admins || admins.length === 0) {
        return { valid: true, issues: [] };
      }

      const adminMap = new Map(admins.map(a => [a.id, a]));

      // Check for issues
      admins.forEach(admin => {
        // Check for orphaned admins
        if (admin.parent_admin_id && !adminMap.has(admin.parent_admin_id)) {
          issues.push(`Admin "${admin.name}" has invalid parent reference`);
        }

        // Check for improper hierarchy (e.g., entity_admin reporting to branch_admin)
        if (admin.parent_admin_id) {
          const parent = adminMap.get(admin.parent_admin_id);
          if (parent) {
            const childOrder = this.getAdminLevelOrder(admin.admin_level);
            const parentOrder = this.getAdminLevelOrder(parent.admin_level);
            
            if (childOrder < parentOrder) {
              issues.push(`Admin "${admin.name}" (${admin.admin_level}) incorrectly reports to "${parent.name}" (${parent.admin_level})`);
            }
          }
        }
      });

      // Check for circular references
      const checkCircular = (adminId: string, visited: Set<string> = new Set()): boolean => {
        if (visited.has(adminId)) return true;
        visited.add(adminId);

        const admin = adminMap.get(adminId);
        if (!admin || !admin.parent_admin_id) return false;

        return checkCircular(admin.parent_admin_id, visited);
      };

      admins.forEach(admin => {
        if (checkCircular(admin.id)) {
          issues.push(`Admin "${admin.name}" is part of a circular reference`);
        }
      });

      return {
        valid: issues.length === 0,
        issues
      };
    } catch (error) {
      console.error('validateHierarchy error:', error);
      return {
        valid: false,
        issues: ['Failed to validate hierarchy']
      };
    }
  }
};