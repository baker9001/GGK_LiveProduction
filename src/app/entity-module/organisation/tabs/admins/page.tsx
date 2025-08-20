import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Users, Shield, Eye } from 'lucide-react';
import { Button } from '../../../../../components/shared/Button';
import { adminService } from '../services/adminService';
import AdminListTable from '../components/AdminListTable';
import AdminHierarchyTree from '../components/AdminHierarchyTree';
import AdminAuditLogsPanel from '../components/AdminAuditLogsPanel';
import { AdminCreationForm } from '../components/AdminCreationForm';
import { AdminLevel } from '../types/admin.types';

// Entity User interface for admin data
interface EntityUser {
  id: string;
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

      {/* Admin Creation/Edit Modal */}
      <AdminCreationForm
        isOpen={showCreateAdminModal}
        onClose={handleModalClose}
        onSuccess={handleAdminSuccess}
        companyId={companyId}
        initialData={editingAdmin ? {
          id: editingAdmin.id,
          name: editingAdmin.name,
          email: editingAdmin.email,
          adminLevel: editingAdmin.admin_level,
          isActive: editingAdmin.is_active,
          createdAt: editingAdmin.created_at,
          permissions: editingAdmin.metadata?.permissions,
          scopes: [] // TODO: Fetch actual scopes for editing admin
        } : undefined}
      />
    </div>
  );
}