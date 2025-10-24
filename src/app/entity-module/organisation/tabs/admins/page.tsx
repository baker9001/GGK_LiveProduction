/**
 * File: /src/app/entity-module/organisation/tabs/admins/page.tsx
 * FIXED VERSION - Corrected permission checks for "Create Admin" button
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Users, Shield, Eye } from 'lucide-react';
import { Button } from '@/components/shared/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shared/Tabs';
import { useAccessControl } from '@/hooks/useAccessControl';
import { toast } from 'react-hot-toast';
import { adminService } from './services/adminService';
import AdminListTable from './components/AdminListTable';
import AdminHierarchyTree from './components/AdminHierarchyTree';
import AdminAuditLogsPanel from './components/AdminAuditLogsPanel';
import { AdminCreationForm } from './components/AdminCreationForm';
import { AdminLevel } from './types/admin.types';

// Entity User interface with user_id field
interface EntityUser {
  id: string;
  user_id: string;  // Critical for self-deactivation check
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
    isSubEntityAdmin,
    isSchoolAdmin
  } = useAccessControl();

  // Access check - Block entry if user cannot view this tab
  React.useEffect(() => {
    if (!isAccessControlLoading && canViewTab && !canViewTab('admins')) {
      toast.error('You do not have permission to view administrators');
      setTimeout(() => {
        try {
          window.location.href = '/app/entity-module/dashboard';
        } catch (error) {
          console.error('Navigation error:', error);
          window.location.reload();
        }
      }, 1000);
      return;
    }
  }, [isAccessControlLoading, canViewTab]);

  // State management
  const [activeTab, setActiveTab] = useState<'list' | 'hierarchy' | 'audit'>('list');
  const [showCreateAdminModal, setShowCreateAdminModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<EntityUser | null>(null);
  const [selectedAdminForDetails, setSelectedAdminForDetails] = useState<EntityUser | null>(null);

  // Apply scope filters to admin queries
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
      try {
        if (!companyId) {
          console.warn('No companyId provided for admin query');
          return [];
        }
        
        const adminFilters: any = {};
        
        // For non-entity admins, apply scope-based filtering
        if (!isEntityAdmin && !isSubEntityAdmin) {
          if (scopeFilters && (scopeFilters.school_ids || scopeFilters.branch_ids)) {
            adminFilters.scope_filter = scopeFilters;
          }
        }
        
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
      enabled: !!companyId && activeTab === 'hierarchy',
      staleTime: 2 * 60 * 1000,
    }
  );

  // FIXED: Correct permission check for creating admins
  const canCreateAdmin = React.useMemo(() => {
    try {
      if (!can) return false;
      
      // Check for any create admin permission based on user level
      if (isEntityAdmin) {
        // Entity admins can create all types of admins
        return true;
      } else if (isSubEntityAdmin) {
        // Sub-entity admins can create school and branch admins
        return can('create_school_admin') || can('create_branch_admin');
      } else if (isSchoolAdmin) {
        // School admins can only create branch admins
        return can('create_branch_admin');
      } else {
        // Check for any create permission
        return (
          can('create_entity_admin') ||
          can('create_sub_admin') ||
          can('create_school_admin') ||
          can('create_branch_admin')
        );
      }
    } catch (error) {
      console.error('Error checking create admin permissions:', error);
      return false;
    }
  }, [can, isEntityAdmin, isSubEntityAdmin, isSchoolAdmin]);
  
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
      
      console.log('Admin being edited:', admin);
      console.log('Admin user_id:', admin.user_id);
      
      setEditingAdmin(admin);
      setShowCreateAdminModal(true);
    } catch (error) {
      console.error('Error in handleEditAdmin:', error);
      toast.error('Failed to open admin edit form');
    }
  }, []);

  // Handle admin details view
  const handleViewAdminDetails = React.useCallback((admin: EntityUser) => {
    try {
      if (!admin || typeof admin !== 'object') {
        console.error('Invalid admin object passed to handleViewAdminDetails:', admin);
        toast.error('Invalid administrator data');
        return;
      }
      
      setSelectedAdminForDetails(admin);
      console.log('View admin details:', admin);
    } catch (error) {
      console.error('Error in handleViewAdminDetails:', error);
      toast.error('Failed to view administrator details');
    }
  }, []);

  // Handle successful admin creation/update
  const handleAdminSuccess = React.useCallback(() => {
    try {
      setShowCreateAdminModal(false);
      setEditingAdmin(null);
      // Optionally refresh the admin list
      // queryClient.invalidateQueries(['admins', companyId]);
    } catch (error) {
      console.error('Error in handleAdminSuccess:', error);
      setShowCreateAdminModal(false);
      setEditingAdmin(null);
    }
  }, []);

  // Handle modal close
  const handleModalClose = React.useCallback(() => {
    try {
      setShowCreateAdminModal(false);
      setEditingAdmin(null);
    } catch (error) {
      console.error('Error in handleModalClose:', error);
      setShowCreateAdminModal(false);
      setEditingAdmin(null);
    }
  }, []);
  
  // Handle view mode change
  const handleTabChange = React.useCallback((newTab: 'list' | 'hierarchy' | 'audit') => {
    try {
      if (!['list', 'hierarchy', 'audit'].includes(newTab)) {
        console.error('Invalid tab:', newTab);
        return;
      }
      setActiveTab(newTab);
    } catch (error) {
      console.error('Error changing tab:', error);
      toast.error('Failed to change tab');
    }
  }, []);
  
  // Loading state
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
  
  // Error state
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
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Manage administrators, their roles, and access within your organization.
          </p>
          
          {/* Show scope limitation notice for non-entity admins */}
          {(!isEntityAdmin && !isSubEntityAdmin) && (
            <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-md">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                You can only view administrators within your assigned scope.
              </p>
            </div>
          )}
        </div>
        
        {/* FIXED: Create Admin button now shows properly for entity admins */}
        {canCreateAdmin && (
          <Button
            onClick={handleCreateAdmin}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Create Admin
          </Button>
        )}
      </div>

      {/* View Mode Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList>
          <TabsTrigger value="list">
            <Users className="h-4 w-4 mr-2" />
            List View
          </TabsTrigger>
          <TabsTrigger value="hierarchy">
            <Shield className="h-4 w-4 mr-2" />
            Hierarchy View
          </TabsTrigger>
          {canViewAuditLogs && (
            <TabsTrigger value="audit">
              <Eye className="h-4 w-4 mr-2" />
              Audit Logs
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="list">
          {companyId && (
            <AdminListTable
              companyId={companyId}
              onCreateAdmin={handleCreateAdmin}
              onEditAdmin={handleEditAdmin}
              onViewDetails={handleViewAdminDetails}
            />
          )}
        </TabsContent>

        <TabsContent value="hierarchy">
          {companyId && (
            <AdminHierarchyTree
              admins={Array.isArray(admins) ? admins : []}
              companyId={companyId}
              onNodeClick={handleViewAdminDetails}
            />
          )}
        </TabsContent>
        
        {canViewAuditLogs && (
          <TabsContent value="audit">
            {companyId && (
              <AdminAuditLogsPanel
                companyId={companyId}
              />
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Admin Creation/Edit Modal - Passing user_id */}
      {companyId && (
        <AdminCreationForm
          isOpen={showCreateAdminModal}
          onClose={handleModalClose}
          onSuccess={handleAdminSuccess}
          companyId={companyId}
          initialData={editingAdmin ? {
            id: editingAdmin.id,
            user_id: editingAdmin.user_id,  // Critical: passing user_id
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