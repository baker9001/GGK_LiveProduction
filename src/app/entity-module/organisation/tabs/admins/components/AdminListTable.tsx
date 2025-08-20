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
  Settings,
  Users
} from 'lucide-react';
import { DataTable } from '@/components/shared/DataTable';
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

  // Mutations
  const deleteAdminMutation = useDeleteAdmin();
  const restoreAdminMutation = useRestoreAdmin();

  // Helper function to get admin level configuration
  const getAdminLevelConfig = (level: AdminLevel) => {
    switch (level) {
      case 'entity_admin':
        return {
          label: 'Entity Admin',
          color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-700',
          icon: <Crown className="w-3 h-3" />
        };
      case 'sub_entity_admin':
        return {
          label: 'Sub Admin',
          color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-700',
          icon: <Shield className="w-3 h-3" />
        };
      case 'school_admin':
        return {
          label: 'School Admin',
          color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-700',
          icon: <School className="w-3 h-3" />
        };
      case 'branch_admin':
        return {
          label: 'Branch Admin',
          color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-700',
          icon: <MapPin className="w-3 h-3" />
        };
      default:
        return {
          label: 'Admin',
          color: 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300 border-gray-200 dark:border-gray-600',
          icon: <User className="w-3 h-3" />
        };
    }
  };

  // Handle filter changes
  const updateFilter = (key: keyof AdminFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page when filters change
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      search: '',
      admin_level: [],
      is_active: [],
      created_after: '',
      created_before: ''
    });
    setPage(1);
  };

  // Handle admin deletion
  const handleDelete = (adminsToDelete: EntityUser[]) => {
    setAdminsToDelete(adminsToDelete);
    setDeleteAction('delete');
    setIsConfirmDialogOpen(true);
  };

  // Handle admin restoration
  const handleRestore = (adminsToRestore: EntityUser[]) => {
    setAdminsToDelete(adminsToRestore);
    setDeleteAction('restore');
    setIsConfirmDialogOpen(true);
  };

  // Confirm delete/restore action
  const confirmAction = () => {
    if (deleteAction === 'delete') {
      adminsToDelete.forEach(admin => {
        deleteAdminMutation.mutate(admin.id, {
          onSuccess: () => {
            refetch();
            setSelectedAdmins([]);
          }
        });
      });
    } else {
      adminsToDelete.forEach(admin => {
        restoreAdminMutation.mutate(admin.id, {
          onSuccess: () => {
            refetch();
            setSelectedAdmins([]);
          }
        });
      });
    }
    setIsConfirmDialogOpen(false);
    setAdminsToDelete([]);
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

  // Define table columns
  const columns = [
    {
      id: 'admin_info',
      header: 'Administrator',
      enableSorting: true,
      cell: (row: EntityUser) => (
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm",
            row.is_active 
              ? "bg-gradient-to-br from-blue-500 to-blue-600" 
              : "bg-gray-400 dark:bg-gray-600"
          )}>
            {row.name.charAt(0).toUpperCase()}
          </div>
          
          {/* Info */}
          <div className="min-w-0 flex-1">
            <div className="font-medium text-gray-900 dark:text-white truncate">
              {row.name}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {row.email}
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
              {row.assigned_schools?.length && (
                <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <School className="w-3 h-3" />
                  <span>{row.assigned_schools.length} school{row.assigned_schools.length > 1 ? 's' : ''}</span>
                </div>
              )}
              {row.assigned_branches?.length && (
                <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                  <MapPin className="w-3 h-3" />
                  <span>{row.assigned_branches.length} branch{row.assigned_branches.length > 1 ? 'es' : ''}</span>
                </div>
              )}
            </div>
          ) : (
            <span className="text-gray-400 dark:text-gray-500 italic">No scope assigned</span>
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
          showIcon={true}
        />
      ),
    },
    {
      id: 'last_activity',
      header: 'Last Activity',
      enableSorting: true,
      cell: (row: EntityUser) => (
        <div className="text-sm">
          {row.last_login_at ? (
            <>
              <div className="font-medium text-gray-900 dark:text-white">
                {new Date(row.last_login_at).toLocaleDateString()}
              </div>
              <div className="text-gray-500 dark:text-gray-400">
                {new Date(row.last_login_at).toLocaleTimeString()}
              </div>
            </>
          ) : (
            <span className="text-gray-400 dark:text-gray-500 italic">Never logged in</span>
          )}
        </div>
      ),
    },
    {
      id: 'created_at',
      header: 'Created',
      enableSorting: true,
      cell: (row: EntityUser) => (
        <div className="text-sm">
          <div className="font-medium text-gray-900 dark:text-white">
            {new Date(row.created_at).toLocaleDateString()}
          </div>
          <div className="text-gray-500 dark:text-gray-400">
            {new Date(row.created_at).toLocaleTimeString()}
          </div>
        </div>
      ),
    },
  ];

  // Custom actions renderer
  const renderActions = (row: EntityUser) => (
    <div className="flex items-center gap-1">
      {/* View Details */}
      <button
        onClick={() => onViewDetails?.(row)}
        className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
        title="View Details"
      >
        <Eye className="h-4 w-4" />
      </button>

      {/* Edit */}
      <button
        onClick={() => onEditAdmin?.(row)}
        className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
        title="Edit Admin"
      >
        <Edit2 className="h-4 w-4" />
      </button>

      {/* Delete/Restore */}
      {row.is_active ? (
        <button
          onClick={() => handleDelete([row])}
          className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
          title="Deactivate Admin"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ) : (
        <button
          onClick={() => handleRestore([row])}
          className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-full transition-colors"
          title="Restore Admin"
        >
          <CheckCircle className="h-4 w-4" />
        </button>
      )}

      {/* More Actions Menu */}
      <button
        onClick={() => {
          // TODO: Open context menu with additional actions
          console.log('TODO: Open admin context menu for:', row.id);
        }}
        className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-full transition-colors"
        title="More Actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
    </div>
  );

  // Admin level options for filter
  const adminLevelOptions = [
    { value: 'entity_admin', label: 'Entity Admin' },
    { value: 'sub_entity_admin', label: 'Sub Admin' },
    { value: 'school_admin', label: 'School Admin' },
    { value: 'branch_admin', label: 'Branch Admin' },
  ];

  // Status options for filter
  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ];

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const allAdmins = admins?.data || [];
    return {
      total: allAdmins.length,
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

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Administrator List
          </h2>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Bulk Actions */}
          {selectedAdmins.length > 0 && (
            <div className="flex items-center gap-2 mr-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {selectedAdmins.length} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const adminsToProcess = (admins?.data || []).filter(a => selectedAdmins.includes(a.id));
                  handleDelete(adminsToProcess);
                }}
                leftIcon={<Trash2 className="h-4 w-4" />}
              >
                Bulk Delete
              </Button>
            </div>
          )}

          {/* Export */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            leftIcon={<Download className="h-4 w-4" />}
          >
            Export CSV
          </Button>

          {/* Create Admin */}
          {onCreateAdmin && (
            <Button
              onClick={onCreateAdmin}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Create Admin
            </Button>
          )}
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
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

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Branch</p>
              <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
                {summaryStats.byLevel.branch_admin}
              </p>
            </div>
            <MapPin className="h-6 w-6 text-orange-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <FilterCard
        title="Filter Administrators"
        onApply={() => {}} // Auto-apply with React Query
        onClear={clearFilters}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Search */}
          <FormField id="search" label="Search">
            <Input
              id="search"
              placeholder="Search by name or email..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              leftIcon={<Search className="h-4 w-4 text-gray-400" />}
            />
          </FormField>

          {/* Admin Level */}
          <SearchableMultiSelect
            label="Admin Level"
            options={adminLevelOptions}
            selectedValues={filters.admin_level}
            onChange={(values) => updateFilter('admin_level', values)}
            placeholder="Select admin levels..."
          />

          {/* Status */}
          <SearchableMultiSelect
            label="Status"
            options={statusOptions}
            selectedValues={filters.is_active}
            onChange={(values) => updateFilter('is_active', values)}
            placeholder="Select status..."
          />

          {/* Date From */}
          <FormField id="created_after" label="Created After">
            <Input
              id="created_after"
              type="date"
              value={filters.created_after}
              onChange={(e) => updateFilter('created_after', e.target.value)}
              leftIcon={<Calendar className="h-4 w-4 text-gray-400" />}
            />
          </FormField>

          {/* Date To */}
          <FormField id="created_before" label="Created Before">
            <Input
              id="created_before"
              type="date"
              value={filters.created_before}
              onChange={(e) => updateFilter('created_before', e.target.value)}
              leftIcon={<Calendar className="h-4 w-4 text-gray-400" />}
            />
          </FormField>
        </div>

        {/* Date Range Presets */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Quick Date Ranges
          </label>
          <div className="flex flex-wrap gap-2">
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
              Last 7 Days
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyDatePreset('month')}
            >
              Last 30 Days
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyDatePreset('quarter')}
            >
              Last 90 Days
            </Button>
          </div>
        </div>
      </FilterCard>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">Error Loading Administrators</span>
          </div>
          <p className="text-sm text-red-600 dark:text-red-400 mt-1">
            {error instanceof Error ? error.message : 'Failed to load administrators. Please try again.'}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="mt-3"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Administrators Table */}
      <DataTable
        data={admins?.data || []}
        columns={columns}
        keyField="id"
        caption="List of administrators with their roles, status, and activity information"
        ariaLabel="Administrators data table"
        loading={isLoading}
        isFetching={isFetching}
        onSelectionChange={setSelectedAdmins}
        renderActions={renderActions}
        emptyMessage="No administrators found for the selected criteria"
        pagination={{
          page,
          rowsPerPage,
          totalCount: admins?.total || 0,
          totalPages: Math.ceil((admins?.total || 0) / rowsPerPage),
          goToPage: setPage,
          nextPage: () => setPage(prev => prev + 1),
          previousPage: () => setPage(prev => Math.max(prev - 1, 1)),
          changeRowsPerPage: (newSize) => {
            setRowsPerPage(newSize);
            setPage(1);
          },
          ariaLabel: "Administrators pagination"
        }}
        className="bg-white dark:bg-gray-800"
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