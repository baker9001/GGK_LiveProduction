/**
 * File: /src/app/entity-module/organisation/tabs/admins/page.tsx
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
  const [viewMode, setViewMode] = useState<'list' | 'hierarchy' | 'audit'>('list');
  const [showCreateAdminModal, setShowCreateAdminModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<EntityUser | null>(null);
  const [selectedAdminForDetails, setSelectedAdminForDetails] = useState<EntityUser | null>(null);

  // Fetch administrators for hierarchy view
  const { data: admins = [], isLoading: isLoadingAdmins } = useQuery(
    ['admins', companyId],
    async () => {
      const adminList = await adminService.listAdmins(companyId);
      return adminList;
    },
    {
      enabled: !!companyId && viewMode === 'hierarchy',
      staleTime: 2 * 60 * 1000, // 2 minutes
    }
  );

  // TODO: Replace with actual useAdminPermissions() hook
  const canCreateAdmin = true; // Mock for now

  // Handle admin creation
  const handleCreateAdmin = () => {
    setEditingAdmin(null);
    setShowCreateAdminModal(true);
  };

  // Handle admin editing
  const handleEditAdmin = (admin: EntityUser) => {
    console.log('=== ADMIN EDIT HANDLER ===');
    console.log('Admin being edited:', admin);
    console.log('Admin user_id:', admin.user_id);
    console.log('==========================');
    
    setEditingAdmin(admin);
    setShowCreateAdminModal(true);
  };

  // Handle admin details view
  const handleViewAdminDetails = (admin: EntityUser) => {
    setSelectedAdminForDetails(admin);
    // TODO: Open admin details panel/modal
    console.log('View admin details:', admin);
  };

  // Handle successful admin creation/update
  const handleAdminSuccess = () => {
    setShowCreateAdminModal(false);
    setEditingAdmin(null);
    // Refresh data will be handled by React Query invalidation
  };

  // Handle modal close
  const handleModalClose = () => {
    setShowCreateAdminModal(false);
    setEditingAdmin(null);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header and Action Button */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Management</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">Manage administrators, their roles, and access within your organization.</p>
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
      <div className="flex space-x-3 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <Button
          variant={viewMode === 'list' ? 'default' : 'ghost'}
          onClick={() => setViewMode('list')}
          className="flex-1"
          leftIcon={<Users className="h-4 w-4" />}
        >
          List View
        </Button>
        <Button
          variant={viewMode === 'hierarchy' ? 'default' : 'ghost'}
          onClick={() => setViewMode('hierarchy')}
          className="flex-1"
          leftIcon={<Shield className="h-4 w-4" />}
        >
          Hierarchy View
        </Button>
        <Button
          variant={viewMode === 'audit' ? 'default' : 'ghost'}
          onClick={() => setViewMode('audit')}
          className="flex-1"
          leftIcon={<Eye className="h-4 w-4" />}
        >
          Audit Logs
        </Button>
      </div>

      {/* Conditional Rendering of Views */}
      {viewMode === 'list' && (
        <AdminListTable
          companyId={companyId}
          onCreateAdmin={handleCreateAdmin}
          onEditAdmin={handleEditAdmin}
          onViewDetails={handleViewAdminDetails}
        />
      )}
      
      {viewMode === 'hierarchy' && (
        <AdminHierarchyTree
          admins={admins}
          companyId={companyId}
          onNodeClick={handleViewAdminDetails}
        />
      )}
      
      {viewMode === 'audit' && (
        <AdminAuditLogsPanel
          companyId={companyId}
        />
      )}

      {/* Admin Creation/Edit Modal - FIXED: Now passing user_id */}
      <AdminCreationForm
        isOpen={showCreateAdminModal}
        onClose={handleModalClose}
        onSuccess={handleAdminSuccess}
        companyId={companyId}
        initialData={editingAdmin ? {
          id: editingAdmin.id,
          user_id: editingAdmin.user_id,  // CRITICAL FIX: Now passing user_id
          name: editingAdmin.name,
          email: editingAdmin.email,
          admin_level: editingAdmin.admin_level,
          company_id: editingAdmin.company_id,
          is_active: editingAdmin.is_active,
          created_at: editingAdmin.created_at,
          updated_at: editingAdmin.updated_at,
          permissions: editingAdmin.metadata?.permissions,
          assigned_schools: editingAdmin.assigned_schools,
          assigned_branches: editingAdmin.assigned_branches,
          metadata: editingAdmin.metadata
        } : undefined}
      />
    </div>
  );
}