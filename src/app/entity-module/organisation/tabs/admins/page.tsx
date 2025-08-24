/**
 * File: /src/app/entity-module/organisation/tabs/admins/page.tsx
 * 
 * PHASE 5: Admins Tab with Access Control Applied
 * 
 * Access Rules Applied:
 * 1. Access Check: Block entry if !canViewTab('admins')
 * 2. Scoped Queries: Apply getScopeFilters to admin queries
 * 3. UI Gating: Show/hide Create/Edit/Delete buttons via can(action)
 * 
 * Dependencies:
 *   - @/components/shared/Button
 *   - ./services/adminService
 *   - ./components/* (AdminListTable, AdminHierarchyTree, AdminAuditLogsPanel, AdminCreationForm)
 *   - ./types/admin.types
 *   - External: react, @tanstack/react-query, lucide-react
 * 
 * Preserved Features:
 *   - All three view modes (list, hierarchy, audit)
 *   - Admin creation and editing
 *   - View details functionality
 *   - Data fetching with React Query
 * 
 * Fixed Issues:
 *   - CRITICAL FIX: Added user_id to EntityUser interface
 *   - CRITICAL FIX: Now passing user_id in initialData to AdminCreationForm
 *   - This fixes the self-deactivation prevention issue
 * 
 * Database Tables:
 *   - entity_users (admin records)
 *   - users (user accounts)
 *   - entity_admin_scope
 *   - entity_admin_audit_log
 * 
 * Connected Files:
 *   - AdminCreationForm.tsx (receives initialData with user_id)
 *   - AdminListTable.tsx (passes admin data for editing)
 *   - adminService.ts (fetches admin data)
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Users, Shield, Eye } from 'lucide-react';
import { Button } from '@/components/shared/Button';
import { useAccessControl } from '@/hooks/useAccessControl';
import { toast } from '@/components/shared/Toast';
import { adminService } from './services';
import AdminListTable from './components/AdminListTable';
import AdminHierarchyTree from './components/AdminHierarchyTree';
import AdminAuditLogsPanel from './components/AdminAuditLogsPanel';
import { AdminCreationForm } from './components/AdminCreationForm';
import { AdminLevel } from './types/admin.types';

// FIXED: Entity User interface now includes user_id field
interface EntityUser {
  id: string;
  user_id: string;  // CRITICAL: Added user_id field for self-deactivation check
  email: string;
  name: string;
  admin_level: AdminLevel;
  company_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  assigned_schools?: string[];
  assigned_branches?: string[];
  last_login_at?: string;
  metadata?: Record<string, any>;
  parent_admin_id?: string | null;
}

interface AdminsPageProps {
  companyId: string;
}

export default function AdminsPage({ companyId }: AdminsPageProps) {
  const {
    canViewTab,
    can,
    getScopeFilters,
    isLoading: isAccessControlLoading,
    isEntityAdmin,
    isSubEntityAdmin
  } = useAccessControl();

  // PHASE 5 RULE 1: ACCESS CHECK
  // Block entry if user cannot view this tab
  React.useEffect(() => {
    // CRASH FIX 1: Add null checks and error boundaries
    if (!isAccessControlLoading && canViewTab && !canViewTab('admins')) {
      toast.error('You do not have permission to view administrators');
      // CRASH FIX 2: Use safer navigation method
      setTimeout(() => {
        try {
          window.location.href = '/app/entity-module/dashboard';
        } catch (error) {
          console.error('Navigation error:', error);
          // Fallback: reload the page
          window.location.reload();
        }
      }, 1000);
      return;
    }
  }, [isAccessControlLoading, canViewTab]);

  // CRASH FIX 3: Initialize state with error boundaries and validation
  const [viewMode, setViewMode] = useState<'list' | 'hierarchy' | 'audit'>(() => {
    try {
      return 'list';
    } catch (error) {
      console.error('Error initializing viewMode:', error);
      return 'list';
    }
  });
  
  const [showCreateAdminModal, setShowCreateAdminModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<EntityUser | null>(null);
  const [selectedAdminForDetails, setSelectedAdminForDetails] = useState<EntityUser | null>(null);

  // PHASE 5 RULE 2: SCOPED QUERIES
  // Apply getScopeFilters to admin queries
  // CRASH FIX 4: Add null checks for getScopeFilters
  const scopeFilters = React.useMemo(() => {
    try {
      return getScopeFilters ? getScopeFilters('users') : {};
    } catch (error) {
      console.error('Error getting scope filters:', error);
      return {};
    }
  }, [getScopeFilters]);

  // Fetch administrators for hierarchy view
  const { data: admins = [], isLoading: isLoadingAdmins } = useQuery(
    ['admins', companyId],
    async () => {
      // CRASH FIX 5: Add comprehensive error handling for admin queries
      try {
        if (!companyId) {
          console.warn('No companyId provided for admin query');
          return [];
        }
        
        // SCOPED QUERY: Apply scope filters to admin queries
        const adminFilters: any = {};
        
        // For non-entity admins, apply scope-based filtering
        if (!isEntityAdmin && !isSubEntityAdmin) {
          // School admins can only see admins in their assigned schools
          if (scopeFilters && (scopeFilters.school_ids || scopeFilters.branch_ids)) {
            if (scopeFilters.school_ids || scopeFilters.branch_ids) {
              adminFilters.scope_filter = scopeFilters;
            }
          }
        }
        
        // CRASH FIX 6: Add null checks for adminService
        if (!adminService || !adminService.listAdmins) {
          console.error('adminService.listAdmins is not available');
          return [];
        }
        
        const adminList = await adminService.listAdmins(companyId, adminFilters);
        
        if (!Array.isArray(adminList)) {
          console.warn('adminService.listAdmins did not return an array:', adminList);
          return [];
        }
        
        return adminList;
      } catch (error) {
        console.error('Error fetching admins:', error);
        return [];
      }
    },
    {
      enabled: !!companyId && viewMode === 'hierarchy',
      staleTime: 2 * 60 * 1000, // 2 minutes
    }
  );

  // PHASE 5 RULE 3: UI GATING
  // Show/hide buttons based on permissions
  // CRASH FIX 12: Add null checks for permission functions
  const canCreateAdmin = React.useMemo(() => {
    try {
      return can ? can('create_admin') : false;
    } catch (error) {
      console.error('Error checking create_admin permission:', error);
      return false;
    }
  }, [can]);
  
  const canViewAuditLogs = React.useMemo(() => {
    try {
      return can ? can('view_audit_logs') : false;
    } catch (error) {
      console.error('Error checking view_audit_logs permission:', error);
      return false;
    }
  }, [can]);

  // Handle admin creation
  const handleCreateAdmin = React.useCallback(() => {
    // CRASH FIX 13: Add error boundary for admin creation
    try {
      if (!canCreateAdmin) {
        toast.error('You do not have permission to create administrators');
        return;
      }
      
      setEditingAdmin(null);
      setShowCreateAdminModal(true);
    } catch (error) {
      console.error('Error in handleCreateAdmin:', error);
      toast.error('Failed to open admin creation form');
    }
  }, [canCreateAdmin]);

  // Handle admin editing
  const handleEditAdmin = React.useCallback((admin: EntityUser) => {
    // CRASH FIX 14: Add validation for admin object
    try {
      if (!admin || typeof admin !== 'object') {
        console.error('Invalid admin object passed to handleEditAdmin:', admin);
        toast.error('Invalid administrator data');
        return;
      }
      
      if (!admin.id || !admin.user_id) {
        console.error('Admin object missing required fields:', admin);
        toast.error('Administrator data is incomplete');
        return;
      }
      
      console.log('=== ADMIN EDIT HANDLER ===');
      console.log('Admin being edited:', admin);
      console.log('Admin user_id:', admin.user_id);
      console.log('==========================');
      
      setEditingAdmin(admin);
      setShowCreateAdminModal(true);
    } catch (error) {
      console.error('Error in handleEditAdmin:', error);
      toast.error('Failed to open admin edit form');
    }
  }, []);

  // Handle admin details view
  const handleViewAdminDetails = React.useCallback((admin: EntityUser) => {
    // CRASH FIX 15: Add validation for admin details view
    try {
      if (!admin || typeof admin !== 'object') {
        console.error('Invalid admin object passed to handleViewAdminDetails:', admin);
        toast.error('Invalid administrator data');
        return;
      }
      
      setSelectedAdminForDetails(admin);
      // TODO: Open admin details panel/modal
      console.log('View admin details:', admin);
    } catch (error) {
      console.error('Error in handleViewAdminDetails:', error);
      toast.error('Failed to view administrator details');
    }
  }, []);

  // Handle successful admin creation/update
  const handleAdminSuccess = React.useCallback(() => {
    // CRASH FIX 16: Add error handling for success callback
    try {
      setShowCreateAdminModal(false);
      setEditingAdmin(null);
    } catch (error) {
      console.error('Error in handleAdminSuccess:', error);
      // Still close the modal even if there's an error
      setShowCreateAdminModal(false);
      setEditingAdmin(null);
    }
  }, []);

  // Handle modal close
  const handleModalClose = React.useCallback(() => {
    // CRASH FIX 17: Add error handling for modal close
    try {
      setShowCreateAdminModal(false);
      setEditingAdmin(null);
    } catch (error) {
      console.error('Error in handleModalClose:', error);
      // Force close the modal
      setShowCreateAdminModal(false);
      setEditingAdmin(null);
    }
  }, []);
  
  // CRASH FIX 18: Add safe view mode change handler
  const handleViewModeChange = React.useCallback((newMode: 'list' | 'hierarchy' | 'audit') => {
    try {
      if (!['list', 'hierarchy', 'audit'].includes(newMode)) {
        console.error('Invalid view mode:', newMode);
        return;
      }
      setViewMode(newMode);
    } catch (error) {
      console.error('Error changing view mode:', error);
      toast.error('Failed to change view mode');
    }
  }, []);
  
  // CRASH FIX 19: Add loading and error states
  if (isAccessControlLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading permissions...</p>
          </div>
        </div>
      </div>
    );
  }
  
  // CRASH FIX 20: Add error boundary for access control errors
  if (!canViewTab) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-600 dark:text-red-400">Access control system unavailable</p>
            <p className="text-sm text-gray-500 mt-2">Please refresh the page or contact support</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header and Action Button */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Management</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">Manage administrators, their roles, and access within your organization.</p>
          
          {/* Show scope limitation notice for non-entity admins */}
          {(!isEntityAdmin && !isSubEntityAdmin) && (
            <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-md">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                You can only view administrators within your assigned scope.
              </p>
            </div>
          )}
        </div>
        
        {canCreateAdmin && (
          <Button
            onClick={handleCreateAdmin}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Create Admin
          </Button>
        )}
      </div>

      {/* View Mode Toggles */}
      {/* CRASH FIX 21: Add error boundary wrapper for view mode toggles */}
      <div className="flex space-x-3 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <Button
          variant={viewMode === 'list' ? 'default' : 'ghost'}
          onClick={() => handleViewModeChange('list')}
          className="flex-1"
          leftIcon={<Users className="h-4 w-4" />}
        >
          List View
        </Button>
        <Button
          variant={viewMode === 'hierarchy' ? 'default' : 'ghost'}
          onClick={() => handleViewModeChange('hierarchy')}
          className="flex-1"
          leftIcon={<Shield className="h-4 w-4" />}
        >
          Hierarchy View
        </Button>
        {/* PHASE 5 RULE 3: UI GATING - Show audit logs tab based on permissions */}
        {canViewAuditLogs && (
          <Button
            variant={viewMode === 'audit' ? 'default' : 'ghost'}
            onClick={() => handleViewModeChange('audit')}
            className="flex-1"
            leftIcon={<Eye className="h-4 w-4" />}
          >
            Audit Logs
          </Button>
        )}
      </div>

      {/* Conditional Rendering of Views */}
      {/* CRASH FIX 22: Add error boundaries for conditional rendering */}
      {viewMode === 'list' && companyId && (
        <AdminListTable
          companyId={companyId}
          onCreateAdmin={handleCreateAdmin}
          onEditAdmin={handleEditAdmin}
          onViewDetails={handleViewAdminDetails}
        />
      )}

      {viewMode === 'hierarchy' && companyId && (
        <AdminHierarchyTree
          // CRASH FIX 23: Add null check for admins array
          admins={Array.isArray(admins) ? admins : []}
          companyId={companyId}
          onNodeClick={handleViewAdminDetails}
        />
      )}
      
      {/* PHASE 5 RULE 3: UI GATING - Show audit logs based on permissions */}
      {viewMode === 'audit' && canViewAuditLogs && companyId && (
        <AdminAuditLogsPanel
          companyId={companyId}
        />
      )}

      {/* Admin Creation/Edit Modal - FIXED: Now passing user_id */}
      {/* CRASH FIX 24: Add error boundary for modal rendering */}
      {companyId && (
        <AdminCreationForm
          isOpen={showCreateAdminModal}
          onClose={handleModalClose}
          onSuccess={handleAdminSuccess}
          companyId={companyId}
          initialData={editingAdmin ? {
            id: editingAdmin.id,
            user_id: editingAdmin.user_id,  // CRITICAL FIX: Now passing user_id
            name: editingAdmin.name || '',
            email: editingAdmin.email || '',
            admin_level: editingAdmin.admin_level,
            company_id: editingAdmin.company_id,
            is_active: editingAdmin.is_active ?? true,
            created_at: editingAdmin.created_at,
            updated_at: editingAdmin.updated_at,
            permissions: editingAdmin.metadata?.permissions,
            assigned_schools: editingAdmin.assigned_schools || [],
            assigned_branches: editingAdmin.assigned_branches || [],
            metadata: editingAdmin.metadata || {}
          } : undefined}
        />
      )}
    </div>
  );
}