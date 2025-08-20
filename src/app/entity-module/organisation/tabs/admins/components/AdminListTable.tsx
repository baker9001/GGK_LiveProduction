/**
 * File: /src/app/entity-module/organisation/tabs/admins/components/AdminListTable.tsx
 * 
 * FIXED: Added defensive coding for undefined name values
 * 
 * Dependencies:
 *   - @/components/shared/* (UI components)
 *   - ../services/adminService (Admin data service)
 *   - ../hooks/useAdminMutations (Mutation hooks)
 *   - ../types/admin.types (Type definitions)
 * 
 * Fix Applied:
 * ✅ Added null checks for row.name before calling charAt()
 * ✅ Added fallback to email if name is undefined
 * ✅ Added safety for avatar initials generation
 */

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  Filter, 
  Download, 
  Eye,
  Crown,
  Shield,
  School,
  MapPin,
  User,
  Mail,
  Calendar,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MoreHorizontal,
  UserPlus,
  Settings
} from 'lucide-react';
import { DataTable } from '../../../../../components/shared/DataTable';
import { FilterCard } from '@/components/shared/FilterCard';
import { FormField, Input, Select } from '@/components/shared/FormField';
import { Button } from '@/components/shared/Button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';
import { SearchableMultiSelect } from '@/components/shared/SearchableMultiSelect';
import { cn } from '@/lib/utils';
import { adminService } from '../services/adminService';
import { useDeleteAdmin, useRestoreAdmin } from '../hooks/useAdminMutations';
import { AdminLevel } from '../types/admin.types';

// Entity User interface for the table
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
}

interface AdminListTableProps {
  companyId: string;
  onCreateAdmin?: () => void;
  onEditAdmin?: (admin: EntityUser) => void;
  onViewDetails?: (admin: EntityUser) => void;
  className?: string;
}

interface AdminFilters {
  search: string;
  admin_level: AdminLevel[];
  is_active: string[];
  created_after: string;
  created_before: string;
}

export function AdminListTable({
  companyId,
  onCreateAdmin,
  onEditAdmin,
  onViewDetails,
  className
}: AdminListTableProps) {
  // Filter state
  const [filters, setFilters] = useState<AdminFilters>({
    search: '',
    admin_level: [],
    is_active: [],
    created_after: '',
    created_before: ''
  });

  // Pagination state
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Selection state for bulk operations
  const [selectedAdmins, setSelectedAdmins] = useState<string[]>([]);

  // Confirmation dialog state
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [adminsToDelete, setAdminsToDelete] = useState<EntityUser[]>([]);
  const [deleteAction, setDeleteAction] = useState<'delete' | 'restore'>('delete');

  // Fetch administrators with React Query
  const { 
    data: admins = [], 
    isLoading, 
    isFetching,
    error,
    refetch 
  } = useQuery(
    ['admins', companyId, filters, page, rowsPerPage],
    async () => {
      // Build filter object for adminService
      const serviceFilters: any = {};

      if (filters.search) serviceFilters.search = filters.search;
      if (filters.admin_level.length > 0) serviceFilters.admin_level = filters.admin_level[0]; // Service expects single value
      if (filters.is_active.length > 0) serviceFilters.is_active = filters.is_active[0] === 'active';
      if (filters.created_after) serviceFilters.created_after = filters.created_after;
      if (filters.created_before) serviceFilters.created_before = filters.created_before;

      const adminList = await adminService.listAdmins(companyId, serviceFilters);
      
      // TODO: Implement server-side pagination in adminService
      // For now, handle pagination client-side
      const startIndex = (page - 1) * rowsPerPage;
      const endIndex = startIndex + rowsPerPage;
      
      return {
        data: adminList.slice(startIndex, endIndex),
        total: adminList.length
      };
    },
    {
      keepPreviousData: true,
      staleTime: 2 * 60 * 1000, // 2 minutes
      enabled: !!companyId
    }
  );

  // Mutation hooks
  const deleteAdminMutation = useDeleteAdmin();
  const restoreAdminMutation = useRestoreAdmin();

  // Helper function to get admin level config
  const getAdminLevelConfig = (level: AdminLevel) => {
    const configs = {
      entity_admin: {
        label: 'Entity Admin',
        icon: <Crown className="h-3 w-3" />,
        color: 'text-purple-700 bg-purple-100 border-purple-300 dark:text-purple-400 dark:bg-purple-900/30 dark:border-purple-700'
      },
      sub_entity_admin: {
        label: 'Sub Admin',
        icon: <Shield className="h-3 w-3" />,
        color: 'text-blue-700 bg-blue-100 border-blue-300 dark:text-blue-400 dark:bg-blue-900/30 dark:border-blue-700'
      },
      school_admin: {
        label: 'School Admin',
        icon: <School className="h-3 w-3" />,
        color: 'text-green-700 bg-green-100 border-green-300 dark:text-green-400 dark:bg-green-900/30 dark:border-green-700'
      },
      branch_admin: {
        label: 'Branch Admin',
        icon: <MapPin className="h-3 w-3" />,
        color: 'text-orange-700 bg-orange-100 border-orange-300 dark:text-orange-400 dark:bg-orange-900/30 dark:border-orange-700'
      }
    };
    
    return configs[level] || {
      label: level,
      icon: <User className="h-3 w-3" />,
      color: 'text-gray-700 bg-gray-100 border-gray-300 dark:text-gray-400 dark:bg-gray-900/30 dark:border-gray-700'
    };
  };

  // Filter admins based on local filters
  const filteredAdmins = useMemo(() => {
    return admins?.data || [];
  }, [admins]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const allAdmins = admins?.data || [];
    
    return {
      total: admins?.total || 0,
      active: allAdmins.filter(a => a.is_active).length,
      inactive: allAdmins.filter(a => !a.is_active).length,
      byLevel: {
        entity_admin: allAdmins.filter(a => a.admin_level === 'entity_admin').length,
        sub_entity_admin: allAdmins.filter(a => a.admin_level === 'sub_entity_admin').length,
        school_admin: allAdmins.filter(a => a.admin_level === 'school_admin').length,
        branch_admin: allAdmins.filter(a => a.admin_level === 'branch_admin').length,
      }
    };
  }, [admins]);

  // Handle bulk delete
  const handleBulkDelete = () => {
    const adminsToProcess = filteredAdmins.filter(admin => selectedAdmins.includes(admin.id));
    const activeAdmins = adminsToProcess.filter(admin => admin.is_active);
    const inactiveAdmins = adminsToProcess.filter(admin => !admin.is_active);
    
    if (activeAdmins.length > 0) {
      setDeleteAction('delete');
      setAdminsToDelete(activeAdmins);
    } else if (inactiveAdmins.length > 0) {
      setDeleteAction('restore');
      setAdminsToDelete(inactiveAdmins);
    }
    
    if (adminsToProcess.length > 0) {
      setIsConfirmDialogOpen(true);
    }
  };

  // Confirm delete/restore action
  const confirmAction = async () => {
    const mutation = deleteAction === 'delete' ? deleteAdminMutation : restoreAdminMutation;
    
    for (const admin of adminsToDelete) {
      await mutation.mutateAsync(admin.id);
    }
    
    setIsConfirmDialogOpen(false);
    setAdminsToDelete([]);
    setSelectedAdmins([]);
    refetch();
  };

  // Cancel delete/restore action
  const cancelAction = () => {
    setIsConfirmDialogOpen(false);
    setAdminsToDelete([]);
  };

  // TODO: Export to CSV functionality
  const handleExportCSV = () => {
    console.log('TODO: Export admin list to CSV');
    // Implementation would convert admins to CSV format and trigger download
  };

  // Calculate date range presets
  const getDatePreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    return {
      from: start.toISOString().split('T')[0],
      to: end.toISOString().split('T')[0]
    };
  };

  const applyDatePreset = (preset: 'today' | 'week' | 'month' | 'quarter') => {
    let range;
    switch (preset) {
      case 'today':
        range = getDatePreset(0);
        break;
      case 'week':
        range = getDatePreset(7);
        break;
      case 'month':
        range = getDatePreset(30);
        break;
      case 'quarter':
        range = getDatePreset(90);
        break;
      default:
        return;
    }
    
    setFilters(prev => ({
      ...prev,
      created_after: range.from,
      created_before: range.to
    }));
    setPage(1);
  };

  // Helper function to safely get initials
  const getInitials = (name: string | undefined | null, email: string | undefined | null): string => {
    // Try to get initials from name first
    if (name && typeof name === 'string' && name.trim()) {
      return name.charAt(0).toUpperCase();
    }
    
    // Fall back to email
    if (email && typeof email === 'string' && email.trim()) {
      return email.charAt(0).toUpperCase();
    }
    
    // Final fallback
    return '?';
  };

  // Helper function to safely get display name
  const getDisplayName = (name: string | undefined | null, email: string | undefined | null): string => {
    if (name && typeof name === 'string' && name.trim()) {
      return name;
    }
    
    if (email && typeof email === 'string' && email.trim()) {
      // Extract username from email if no name
      return email.split('@')[0];
    }
    
    return 'Unknown User';
  };

  // Define table columns
  const columns = [
    {
      id: 'admin_info',
      header: 'Administrator',
      enableSorting: true,
      cell: (row: EntityUser) => (
        <div className="flex items-center gap-3">
          {/* Avatar with safe initial extraction */}
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm",
            row.is_active 
              ? "bg-gradient-to-br from-blue-500 to-blue-600" 
              : "bg-gray-400 dark:bg-gray-600"
          )}>
            {getInitials(row.name, row.email)}
          </div>
          
          {/* Info with safe name/email display */}
          <div className="min-w-0 flex-1">
            <div className="font-medium text-gray-900 dark:text-white truncate">
              {getDisplayName(row.name, row.email)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {row.email || 'No email provided'}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'admin_level',
      header: 'Level',
      enableSorting: true,
      cell: (row: EntityUser) => {
        const config = getAdminLevelConfig(row.admin_level);
        return (
          <span className={cn(
            'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border',
            config.color
          )}>
            {config.icon}
            {config.label}
          </span>
        );
      },
    },
    {
      id: 'scope_info',
      header: 'Assigned Scope',
      enableSorting: false,
      cell: (row: EntityUser) => (
        <div className="text-sm">
          {(row.assigned_schools?.length || row.assigned_branches?.length) ? (
            <div className="space-y-1">
              {row.assigned_schools?.length ? (
                <div className="text-gray-600 dark:text-gray-400">
                  <School className="inline h-3 w-3 mr-1" />
                  {row.assigned_schools.length} Schools
                </div>
              ) : null}
              {row.assigned_branches?.length ? (
                <div className="text-gray-600 dark:text-gray-400">
                  <MapPin className="inline h-3 w-3 mr-1" />
                  {row.assigned_branches.length} Branches
                </div>
              ) : null}
            </div>
          ) : (
            <span className="text-gray-500 dark:text-gray-400">Full Access</span>
          )}
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      enableSorting: true,
      cell: (row: EntityUser) => (
        <StatusBadge 
          status={row.is_active ? 'active' : 'inactive'} 
          size="sm"
        />
      ),
    },
    {
      id: 'last_login',
      header: 'Last Login',
      enableSorting: true,
      cell: (row: EntityUser) => (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {row.last_login_at ? (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(row.last_login_at).toLocaleDateString()}
            </div>
          ) : (
            <span className="text-gray-400 dark:text-gray-500">Never</span>
          )}
        </div>
      ),
    },
    {
      id: 'created_at',
      header: 'Created',
      enableSorting: true,
      cell: (row: EntityUser) => (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {new Date(row.created_at).toLocaleDateString()}
        </div>
      ),
    }
  ];

  // Actions for DataTable
  const handleEditAdmin = (admin: EntityUser) => {
    if (onEditAdmin) {
      onEditAdmin(admin);
    }
  };

  const handleDeleteAdmin = (admin: EntityUser) => {
    setDeleteAction(admin.is_active ? 'delete' : 'restore');
    setAdminsToDelete([admin]);
    setIsConfirmDialogOpen(true);
  };

  const renderRowActions = (row: EntityUser) => (
    <div className="flex items-center gap-1">
      {onViewDetails && (
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<Eye className="h-4 w-4" />}
          onClick={() => onViewDetails(row)}
          className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
          View
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        leftIcon={<Edit2 className="h-4 w-4" />}
        onClick={() => handleEditAdmin(row)}
        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
      >
        Edit
      </Button>
      <Button
        variant="ghost"
        size="sm"
        leftIcon={row.is_active ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
        onClick={() => handleDeleteAdmin(row)}
        className={row.is_active 
          ? "text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
          : "text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
        }
      >
        {row.is_active ? 'Deactivate' : 'Restore'}
      </Button>
    </div>
  );

  return (
    <div className={cn("space-y-6", className)}>
      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {summaryStats.total}
              </p>
            </div>
            <Users className="h-6 w-6 text-gray-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Active</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400">
                {summaryStats.active}
              </p>
            </div>
            <CheckCircle className="h-6 w-6 text-green-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Entity</p>
              <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                {summaryStats.byLevel.entity_admin}
              </p>
            </div>
            <Crown className="h-6 w-6 text-purple-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Sub Admin</p>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                {summaryStats.byLevel.sub_entity_admin}
              </p>
            </div>
            <Shield className="h-6 w-6 text-blue-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">School</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400">
                {summaryStats.byLevel.school_admin}
              </p>
            </div>
            <School className="h-6 w-6 text-green-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <FilterCard
        title="Filter Administrators"
        onReset={() => {
          setFilters({
            search: '',
            admin_level: [],
            is_active: [],
            created_after: '',
            created_before: ''
          });
          setPage(1);
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Search Input */}
          <FormField label="Search">
            <Input
              type="text"
              placeholder="Search by name or email..."
              value={filters.search}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, search: e.target.value }));
                setPage(1);
              }}
              leftIcon={<Search className="h-4 w-4" />}
            />
          </FormField>

          {/* Admin Level Filter */}
          <FormField label="Admin Level">
            <SearchableMultiSelect
              options={[
                { value: 'entity_admin', label: 'Entity Admin' },
                { value: 'sub_entity_admin', label: 'Sub Admin' },
                { value: 'school_admin', label: 'School Admin' },
                { value: 'branch_admin', label: 'Branch Admin' }
              ]}
              value={filters.admin_level}
              onChange={(values) => {
                setFilters(prev => ({ ...prev, admin_level: values as AdminLevel[] }));
                setPage(1);
              }}
              placeholder="All levels"
            />
          </FormField>

          {/* Status Filter */}
          <FormField label="Status">
            <SearchableMultiSelect
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' }
              ]}
              value={filters.is_active}
              onChange={(values) => {
                setFilters(prev => ({ ...prev, is_active: values }));
                setPage(1);
              }}
              placeholder="All statuses"
            />
          </FormField>

          {/* Date Range Filters */}
          <FormField label="Created After">
            <Input
              type="date"
              value={filters.created_after}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, created_after: e.target.value }));
                setPage(1);
              }}
            />
          </FormField>

          <FormField label="Created Before">
            <Input
              type="date"
              value={filters.created_before}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, created_before: e.target.value }));
                setPage(1);
              }}
            />
          </FormField>

          {/* Date Presets */}
          <FormField label="Quick Date Range">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyDatePreset('today')}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyDatePreset('week')}
              >
                Week
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyDatePreset('month')}
              >
                Month
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyDatePreset('quarter')}
              >
                Quarter
              </Button>
            </div>
          </FormField>
        </div>
      </FilterCard>

      {/* Actions Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onCreateAdmin && (
            <Button
              variant="primary"
              leftIcon={<UserPlus className="h-4 w-4" />}
              onClick={onCreateAdmin}
            >
              Add Administrator
            </Button>
          )}
          
          {selectedAdmins.length > 0 && (
            <Button
              variant="destructive"
              leftIcon={<Trash2 className="h-4 w-4" />}
              onClick={handleBulkDelete}
            >
              Bulk Action ({selectedAdmins.length})
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="h-4 w-4" />}
            onClick={handleExportCSV}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={filteredAdmins}
        keyField="id"
        isLoading={isLoading}
        isFetching={isFetching}
        onEdit={handleEditAdmin}
        onDelete={handleDeleteAdmin}
        renderActions={renderRowActions}
        selectedRows={new Set(selectedAdmins)}
        onRowSelect={(rowId) => {
          setSelectedAdmins(prev => 
            prev.includes(rowId) 
              ? prev.filter(id => id !== rowId)
              : [...prev, rowId]
          );
        }}
        onSelectAll={(allSelected) => {
          setSelectedAdmins(allSelected ? filteredAdmins.map(a => a.id) : []);
        }}
        pagination={{
          currentPage: page,
          totalPages: Math.ceil((admins?.total || 0) / rowsPerPage),
          rowsPerPage,
          totalRows: admins?.total || 0,
          onPageChange: setPage,
          onRowsPerPageChange: (rows) => {
            setRowsPerPage(rows);
            setPage(1);
          }
        }}
        emptyMessage="No administrators found"
      />

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isConfirmDialogOpen}
        title={deleteAction === 'delete' ? 'Deactivate Administrator' : 'Restore Administrator'}
        message={
          deleteAction === 'delete'
            ? `Are you sure you want to deactivate ${adminsToDelete.length} administrator(s)? They will lose access to the system but can be restored later.`
            : `Are you sure you want to restore ${adminsToDelete.length} administrator(s)? They will regain access to the system.`
        }
        confirmText={deleteAction === 'delete' ? 'Deactivate' : 'Restore'}
        cancelText="Cancel"
        confirmVariant={deleteAction === 'delete' ? 'destructive' : 'default'}
        onConfirm={confirmAction}
        onCancel={cancelAction}
      />

      {/* Future Enhancements */}
      {process.env.NODE_ENV === 'development' && (admins?.data?.length || 0) > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
          <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
            🚧 Future Enhancements (TODO)
          </h4>
          <ul className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
            <li>• Click on admin name/email to view detailed profile</li>
            <li>• Inline editing of admin level and status</li>
            <li>• Advanced filtering by assigned scopes and permissions</li>
            <li>• Bulk operations (assign scopes, update permissions)</li>
            <li>• Real-time status updates and activity indicators</li>
            <li>• Integration with admin hierarchy for parent-child relationships</li>
            <li>• Password reset and account management actions</li>
            <li>• Export filtered results to CSV/Excel</li>
            <li>• Column sorting and customizable column visibility</li>
            <li>• Admin activity timeline and login history</li>
          </ul>
        </div>
      )}
    </div>
  );
}

export default AdminListTable;