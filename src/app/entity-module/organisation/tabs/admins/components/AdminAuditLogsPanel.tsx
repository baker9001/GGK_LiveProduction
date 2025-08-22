import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Calendar, 
  Search, 
  Filter, 
  Download, 
  Plus, 
  Edit2, 
  Trash2, 
  Shield, 
  User, 
  Settings, 
  Eye,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  UserPlus,
  UserMinus,
  Key,
  Building2,
  School,
  MapPin
} from 'lucide-react';
import { DataTable } from '../../../../../../components/shared/DataTable';
import { FormField, Input, Select } from '../../../../../../components/shared/FormField';
import { Button } from '../../../../../../components/shared/Button';
import { StatusBadge } from '../../../../../../components/shared/StatusBadge';
import { FilterCard } from '../../../../../../components/shared/FilterCard';
import { cn } from '../../../../../../lib/utils';
import { auditService } from '../services/auditService';
import { AdminAuditLog } from '../types/admin.types';

interface AdminAuditLogsPanelProps {
  companyId: string;
  className?: string;
  defaultFilters?: {
    actorId?: string;
    targetId?: string;
    actionType?: string;
    dateFrom?: string;
    dateTo?: string;
  };
}

interface AuditLogFilters {
  search: string;
  actionType: string;
  dateFrom: string;
  dateTo: string;
  actorId: string;
  targetId: string;
}

export function AdminAuditLogsPanel({ 
  companyId, 
  className,
  defaultFilters = {}
}: AdminAuditLogsPanelProps) {
  // Filter state
  const [filters, setFilters] = useState<AuditLogFilters>({
    search: '',
    actionType: '',
    dateFrom: defaultFilters.dateFrom || '',
    dateTo: defaultFilters.dateTo || '',
    actorId: defaultFilters.actorId || '',
    targetId: defaultFilters.targetId || ''
  });

  // Pagination state
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  // Fetch audit logs with React Query
  const { 
    data: queryResult, 
    isLoading, 
    isFetching,
    error 
  } = useQuery(
    ['adminAuditLogs', companyId, filters, page, rowsPerPage],
    async () => {
      // Build filter object for auditService
      const serviceFilters: any = {
        company_id: companyId,
        limit: rowsPerPage,
        offset: (page - 1) * rowsPerPage
      };

      if (filters.actionType) serviceFilters.action_type = filters.actionType;
      if (filters.dateFrom) serviceFilters.date_from = filters.dateFrom;
      if (filters.dateTo) serviceFilters.date_to = filters.dateTo;
      if (filters.actorId) serviceFilters.actor_id = filters.actorId;
      if (filters.targetId) serviceFilters.target_id = filters.targetId;

      const logs = await auditService.getAuditLogs(serviceFilters);
      
      // Filter by search term on client side (for name/email search)
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const filteredLogs = logs.filter(log => 
          log.actor_id?.toLowerCase().includes(searchLower) ||
          log.target_id?.toLowerCase().includes(searchLower) ||
          log.action_type.toLowerCase().includes(searchLower)
        );
        return { logs: filteredLogs, total: filteredLogs.length };
      }
      
      return { logs, total: logs.length };
    },
    {
      keepPreviousData: true,
      staleTime: 30 * 1000, // 30 seconds
      enabled: !!companyId
    }
  );

  // Extract logs and total from query result
  const auditLogs = queryResult?.logs || [];
  const totalCount = queryResult?.total || 0;
  // Get action type icon
  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'admin_created':
        return <UserPlus className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case 'admin_modified':
        return <Edit2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      case 'admin_deleted':
        return <UserMinus className="h-4 w-4 text-red-600 dark:text-red-400" />;
      case 'permission_granted':
        return <Key className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
      case 'permission_revoked':
        return <XCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />;
      case 'scope_assigned':
        return <Building2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />;
      case 'scope_removed':
        return <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />;
      case 'hierarchy_changed':
        return <Shield className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600 dark:text-gray-400" />;
    }
  };

  // Get action type badge color
  const getActionBadgeColor = (actionType: string) => {
    switch (actionType) {
      case 'admin_created':
      case 'permission_granted':
      case 'scope_assigned':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'admin_modified':
      case 'hierarchy_changed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'admin_deleted':
      case 'permission_revoked':
      case 'scope_removed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300';
    }
  };

  // Format action type for display
  const formatActionType = (actionType: string) => {
    return actionType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Generate summary message
  const generateSummary = (log: AdminAuditLog) => {
    const changes = log.changes || {};
    
    switch (log.action_type) {
      case 'admin_created':
        return `Created new ${changes.admin_level || 'admin'} user`;
      case 'admin_modified':
        const modifiedFields = Object.keys(changes).join(', ');
        return `Modified ${modifiedFields || 'admin details'}`;
      case 'admin_deleted':
        return 'Deactivated admin user';
      case 'permission_granted':
        return `Granted ${changes.permission || 'permissions'}`;
      case 'permission_revoked':
        return `Revoked ${changes.permission || 'permissions'}`;
      case 'scope_assigned':
        return `Assigned ${changes.scope_type || 'scope'} access`;
      case 'scope_removed':
        return `Removed ${changes.scope_type || 'scope'} access`;
      case 'hierarchy_changed':
        return 'Updated admin hierarchy';
      default:
        return formatActionType(log.action_type);
    }
  };

  // Handle filter changes
  const updateFilter = (key: keyof AuditLogFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page when filters change
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      search: '',
      actionType: '',
      dateFrom: '',
      dateTo: '',
      actorId: '',
      targetId: ''
    });
    setPage(1);
  };

  // TODO: Export to CSV functionality
  const handleExportCSV = () => {
    console.log('TODO: Export audit logs to CSV');
    // Implementation would convert auditLogs to CSV format and trigger download
  };

  // Define table columns
  const columns = [
    {
      id: 'timestamp',
      header: 'Date/Time',
      enableSorting: true,
      cell: (row: AdminAuditLog) => (
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
    {
      id: 'action_type',
      header: 'Action',
      enableSorting: true,
      cell: (row: AdminAuditLog) => (
        <div className="flex items-center gap-2">
          {getActionIcon(row.action_type)}
          <span className={cn(
            'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
            getActionBadgeColor(row.action_type)
          )}>
            {formatActionType(row.action_type)}
          </span>
        </div>
      ),
    },
    {
      id: 'actor',
      header: 'Actor',
      enableSorting: true,
      cell: (row: AdminAuditLog) => (
        <div className="text-sm">
          <div className="font-medium text-gray-900 dark:text-white">
            {/* TODO: Fetch and display actual admin name */}
            {row.actor_id ? `Admin ${row.actor_id.slice(0, 8)}...` : 'System'}
          </div>
          <div className="text-gray-500 dark:text-gray-400">
            {row.actor_id || 'Automated'}
          </div>
        </div>
      ),
    },
    {
      id: 'target',
      header: 'Target',
      enableSorting: true,
      cell: (row: AdminAuditLog) => (
        <div className="text-sm">
          {row.target_id ? (
            <>
              <div className="font-medium text-gray-900 dark:text-white">
                {/* TODO: Fetch and display actual target name */}
                {row.target_type || 'Entity'} {row.target_id.slice(0, 8)}...
              </div>
              <div className="text-gray-500 dark:text-gray-400">
                {row.target_id}
              </div>
            </>
          ) : (
            <span className="text-gray-500 dark:text-gray-400 italic">No target</span>
          )}
        </div>
      ),
    },
    {
      id: 'summary',
      header: 'Summary',
      enableSorting: false,
      cell: (row: AdminAuditLog) => (
        <div className="text-sm text-gray-900 dark:text-white">
          {generateSummary(row)}
        </div>
      ),
    },
    {
      id: 'metadata',
      header: 'Details',
      enableSorting: false,
      cell: (row: AdminAuditLog) => (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {row.ip_address && (
            <div>IP: {row.ip_address}</div>
          )}
          {row.metadata && Object.keys(row.metadata).length > 0 && (
            <button
              onClick={() => {
                // TODO: Show metadata in a modal or expandable section
                console.log('Show metadata:', row.metadata);
              }}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
            >
              View Details
            </button>
          )}
        </div>
      ),
    },
  ];

  // Action type options for filter
  const actionTypeOptions = [
    { value: '', label: 'All Actions' },
    { value: 'admin_created', label: 'Admin Created' },
    { value: 'admin_modified', label: 'Admin Modified' },
    { value: 'admin_deleted', label: 'Admin Deleted' },
    { value: 'permission_granted', label: 'Permission Granted' },
    { value: 'permission_revoked', label: 'Permission Revoked' },
    { value: 'scope_assigned', label: 'Scope Assigned' },
    { value: 'scope_removed', label: 'Scope Removed' },
    { value: 'hierarchy_changed', label: 'Hierarchy Changed' },
  ];

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
      dateFrom: range.from,
      dateTo: range.to
    }));
    setPage(1);
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Admin Audit Logs
          </h2>
        </div>
        
        <div className="flex items-center gap-2">
          {/* TODO: Export functionality */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            leftIcon={<Download className="h-4 w-4" />}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <FilterCard
        title="Filter Audit Logs"
        onApply={() => {}} // Auto-apply with React Query
        onClear={clearFilters}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Search */}
          <FormField id="search" label="Search">
            <Input
              id="search"
              placeholder="Search by actor, target, or action..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              leftIcon={<Search className="h-4 w-4 text-gray-400" />}
            />
          </FormField>

          {/* Action Type */}
          <FormField id="actionType" label="Action Type">
            <Select
              id="actionType"
              options={actionTypeOptions}
              value={filters.actionType}
              onChange={(value) => updateFilter('actionType', value)}
            />
          </FormField>

          {/* Date From */}
          <FormField id="dateFrom" label="Date From">
            <Input
              id="dateFrom"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => updateFilter('dateFrom', e.target.value)}
              leftIcon={<Calendar className="h-4 w-4 text-gray-400" />}
            />
          </FormField>

          {/* Date To */}
          <FormField id="dateTo" label="Date To">
            <Input
              id="dateTo"
              type="date"
              value={filters.dateTo}
              onChange={(e) => updateFilter('dateTo', e.target.value)}
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
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Error Loading Audit Logs</span>
          </div>
          <p className="text-sm text-red-600 dark:text-red-400 mt-1">
            {error instanceof Error ? error.message : 'Failed to load audit logs. Please try again.'}
          </p>
        </div>
      )}

      {/* Audit Logs Table */}
      <DataTable
        data={auditLogs}
        columns={columns}
        keyField="id"
        caption="Admin activity audit logs with timestamps and action details"
        ariaLabel="Admin audit logs data table"
        loading={isLoading}
        isFetching={isFetching}
        emptyMessage="No audit logs found for the selected criteria"
        pagination={{
          page,
          rowsPerPage,
          totalCount: totalCount,
          totalPages: Math.ceil(totalCount / rowsPerPage),
          goToPage: setPage,
          nextPage: () => setPage(prev => prev + 1),
          previousPage: () => setPage(prev => Math.max(prev - 1, 1)),
          changeRowsPerPage: (newSize) => {
            setRowsPerPage(newSize);
            setPage(1);
          },
          ariaLabel: "Audit logs pagination"
        }}
        className="bg-white dark:bg-gray-800"
      />

      {/* Summary Stats */}
      {auditLogs.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Activity Summary
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {auditLogs.length}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Total Actions
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {auditLogs.filter(log => 
                  ['admin_created', 'permission_granted', 'scope_assigned'].includes(log.action_type)
                ).length}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Positive Actions
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {auditLogs.filter(log => 
                  ['admin_modified', 'hierarchy_changed'].includes(log.action_type)
                ).length}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Modifications
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {auditLogs.filter(log => 
                  ['admin_deleted', 'permission_revoked', 'scope_removed'].includes(log.action_type)
                ).length}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Removals
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Future Enhancements */}
      {process.env.NODE_ENV === 'development' && auditLogs.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
          <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
            🚧 Future Enhancements (TODO)
          </h4>
          <ul className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
            <li>• Click on actor/target to view admin details</li>
            <li>• Expandable metadata view for detailed change information</li>
            <li>• Real-time updates using WebSocket or polling</li>
            <li>• Advanced filtering by IP address, user agent, etc.</li>
            <li>• Bulk operations (archive, export selected logs)</li>
            <li>• Integration with external SIEM systems</li>
            <li>• Automated anomaly detection and alerts</li>
            <li>• Compliance reporting templates</li>
          </ul>
        </div>
      )}
    </div>
  );
}

export default AdminAuditLogsPanel;