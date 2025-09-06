/**
 * File: /src/app/entity-module/license-management/page.tsx
 * 
 * Entity License Management Page
 * Allows entity admins to view and manage licenses within their scope
 * 
 * Dependencies:
 *   - @/services/entityLicenseService
 *   - @/components/entity/LicenseAssignmentModal
 *   - @/hooks/useAccessControl
 *   - @/components/shared/* (UI components)
 */

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Key, 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  Clock, 
  CheckCircle,
  XCircle,
  Calendar,
  Building2,
  School,
  MapPin,
  Plus,
  Eye,
  UserPlus,
  BarChart3,
  Download,
  RefreshCw,
  Info,
  Shield,
  Search
} from 'lucide-react';
import { DataTable } from '../../../components/shared/DataTable';
import { FilterCard } from '../../../components/shared/FilterCard';
import { FormField, Input, Select } from '../../../components/shared/FormField';
import { Button } from '../../../components/shared/Button';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import { SearchableMultiSelect } from '../../../components/shared/SearchableMultiSelect';
import { ProgressBar } from '../../../components/shared/ProgressBar';
import { toast } from '../../../components/shared/Toast';
import { useAccessControl } from '../../../hooks/useAccessControl';
import { useUser } from '../../../contexts/UserContext';
import { EntityLicenseService, type EntityLicense } from '../../../services/entityLicenseService';
import { LicenseAssignmentModal } from '../../../components/entity/LicenseAssignmentModal';

interface FilterState {
  search: string;
  subject_ids: string[];
  program_ids: string[];
  status: string[];
  expiry_status: string[];
}

export default function EntityLicenseManagementPage() {
  const { user } = useUser();
  const {
    getUserContext,
    getScopeFilters,
    can,
    isLoading: isAccessControlLoading,
    isEntityAdmin,
    isSubEntityAdmin,
    isSchoolAdmin,
    isBranchAdmin
  } = useAccessControl();

  // State management
  const [activeTab, setActiveTab] = useState<'overview' | 'licenses' | 'analytics'>('overview');
  const [selectedLicense, setSelectedLicense] = useState<EntityLicense | null>(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    subject_ids: [],
    program_ids: [],
    status: [],
    expiry_status: []
  });

  // Get user context and scope
  const userContext = getUserContext();
  const companyId = userContext?.companyId || '';
  const scopeFilters = getScopeFilters('licenses');

  // Permission checks
  const canViewLicenses = can('view_licenses');
  const canAssignLicense = can('assign_license');
  const canRevokeLicense = can('revoke_license');
  const canManageLicenseAssignments = can('manage_license_assignments');

  // Access level information
  const accessInfo = useMemo(() => {
    if (isEntityAdmin || isSubEntityAdmin) {
      return {
        level: isEntityAdmin ? 'Entity Administrator' : 'Sub-Entity Administrator',
        scope: 'Full company access',
        description: 'You can manage all licenses across the entire organization',
        scopeDetails: 'All schools and branches'
      };
    } else if (isSchoolAdmin) {
      const schoolCount = scopeFilters.school_ids?.length || 0;
      return {
        level: 'School Administrator',
        scope: `${schoolCount} assigned school${schoolCount !== 1 ? 's' : ''}`,
        description: 'You can manage licenses for students in your assigned schools',
        scopeDetails: userContext?.assignedSchools?.join(', ') || 'Loading...'
      };
    } else if (isBranchAdmin) {
      const branchCount = scopeFilters.branch_ids?.length || 0;
      return {
        level: 'Branch Administrator',
        scope: `${branchCount} assigned branch${branchCount !== 1 ? 'es' : ''}`,
        description: 'You can view licenses for students in your assigned branches',
        scopeDetails: userContext?.assignedBranches?.join(', ') || 'Loading...'
      };
    } else {
      return {
        level: 'Limited Access',
        scope: 'Restricted access',
        description: 'Your access to license data may be limited',
        scopeDetails: 'Contact administrator for details'
      };
    }
  }, [isEntityAdmin, isSubEntityAdmin, isSchoolAdmin, isBranchAdmin, scopeFilters, userContext]);

  // Fetch licenses for the user's scope
  const { 
    data: licenses = [], 
    isLoading: isLoadingLicenses, 
    error: licensesError,
    refetch: refetchLicenses 
  } = useQuery(
    ['entity-licenses', companyId, scopeFilters],
    async () => {
      if (!companyId) return [];

      return await EntityLicenseService.getLicensesForScope(companyId, {
        school_ids: scopeFilters.school_ids,
        branch_ids: scopeFilters.branch_ids
      });
    },
    {
      enabled: !!companyId && !isAccessControlLoading && (canViewLicenses || can('view_licenses')),
      staleTime: 2 * 60 * 1000,
      retry: (failureCount, error) => {
        if (error.message.includes('permission')) return false;
        return failureCount < 2;
      }
    }
  );

  // Fetch license usage statistics
  const { data: usageStats } = useQuery(
    ['license-usage-stats', companyId, scopeFilters],
    async () => {
      if (!companyId) return null;

      return await EntityLicenseService.getLicenseUsageStats(companyId, {
        school_ids: scopeFilters.school_ids,
        branch_ids: scopeFilters.branch_ids
      });
    },
    {
      enabled: !!companyId && !isAccessControlLoading && (canViewLicenses || can('view_licenses')),
      staleTime: 5 * 60 * 1000
    }
  );

  // Apply client-side filtering
  const filteredLicenses = useMemo(() => {
    return licenses.filter(license => {
      const matchesSearch = !filters.search || 
        license.subject_name.toLowerCase().includes(filters.search.toLowerCase()) ||
        license.program_name.toLowerCase().includes(filters.search.toLowerCase()) ||
        license.provider_name.toLowerCase().includes(filters.search.toLowerCase());
      
      const matchesSubject = filters.subject_ids.length === 0 || 
        filters.subject_ids.includes(license.id); // This would need subject_id from license
      
      const matchesStatus = filters.status.length === 0 || 
        filters.status.includes(license.status);
      
      const matchesExpiry = filters.expiry_status.length === 0 || 
        (filters.expiry_status.includes('expired') && license.is_expired) ||
        (filters.expiry_status.includes('expiring_soon') && !license.is_expired && license.days_until_expiry <= 30) ||
        (filters.expiry_status.includes('active') && !license.is_expired && license.days_until_expiry > 30);
      
      return matchesSearch && matchesSubject && matchesStatus && matchesExpiry;
    });
  }, [licenses, filters]);

  // Handle license assignment
  const handleAssignLicense = (license: EntityLicense) => {
    if (!canAssignLicense) {
      toast.error('You do not have permission to assign licenses');
      return;
    }

    if (license.available_quantity === 0) {
      toast.error('This license has no available capacity');
      return;
    }

    setSelectedLicense(license);
    setShowAssignmentModal(true);
  };

  // Handle assignment modal success
  const handleAssignmentSuccess = () => {
    refetchLicenses();
    setShowAssignmentModal(false);
    setSelectedLicense(null);
  };

  // Define table columns
  const licenseColumns = [
    {
      id: 'license_info',
      header: 'License Information',
      cell: (row: EntityLicense) => (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-blue-500" />
            <span className="font-semibold text-gray-900 dark:text-white">
              {row.subject_name}
            </span>
            <StatusBadge 
              status={row.is_expired ? 'expired' : 'active'} 
              size="xs"
            />
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <div>{row.program_name} • {row.provider_name}</div>
            <div className="flex items-center gap-1 mt-1">
              <MapPin className="w-3 h-3" />
              {row.region_name}
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'capacity',
      header: 'Capacity',
      cell: (row: EntityLicense) => (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Used:</span>
            <span className="font-medium">{row.used_quantity} / {row.total_quantity}</span>
          </div>
          <ProgressBar
            value={row.used_quantity}
            max={row.total_quantity}
            size="sm"
            color={row.used_quantity >= row.total_quantity ? 'red' : 'green'}
          />
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {row.available_quantity} available
          </div>
        </div>
      )
    },
    {
      id: 'validity',
      header: 'Validity Period',
      cell: (row: EntityLicense) => {
        const startDate = new Date(row.start_date);
        const endDate = new Date(row.end_date);
        
        return (
          <div className="text-sm">
            <div className="font-medium text-gray-900 dark:text-white">
              {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
            </div>
            <div className={`text-xs flex items-center gap-1 mt-1 ${
              row.is_expired ? 'text-red-600 dark:text-red-400' :
              row.days_until_expiry <= 30 ? 'text-amber-600 dark:text-amber-400' :
              'text-green-600 dark:text-green-400'
            }`}>
              <Clock className="w-3 h-3" />
              {row.is_expired ? 'Expired' : 
               row.days_until_expiry <= 30 ? `${row.days_until_expiry} days left` :
               'Active'}
            </div>
          </div>
        );
      }
    }
  ];

  // Loading state
  if (isAccessControlLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8CC63F] mx-auto mb-2"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading license management...</p>
        </div>
      </div>
    );
  }

  // Access denied
  if (!canViewLicenses && !can('view_licenses')) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
          <div className="flex items-center">
            <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
            <div>
              <h3 className="font-semibold text-red-800 dark:text-red-200">
                Access Denied
              </h3>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                You do not have permission to view license management. Please contact your administrator. 
                Current admin level: {userContext?.adminLevel || 'Unknown'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-[#8CC63F]/20 to-[#7AB635]/20 rounded-full flex items-center justify-center">
              <Key className="w-8 h-8 text-[#8CC63F]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                License Management
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Manage and assign licenses to students within your scope
              </p>
            </div>
          </div>

          {/* Access Level Indicator */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-3 py-1 bg-[#8CC63F]/10 rounded-lg">
              <Shield className="w-4 h-4 text-[#8CC63F]" />
              <span className="text-sm font-medium text-[#8CC63F]">
                {accessInfo.level}
              </span>
            </div>
          </div>
        </div>

        {/* Access Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="bg-gradient-to-r from-[#8CC63F]/10 to-[#7AB635]/10 dark:from-[#8CC63F]/20 dark:to-[#7AB635]/20 border border-[#8CC63F]/30 dark:border-[#8CC63F]/40 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="h-5 w-5 text-[#7AB635] dark:text-[#8CC63F]" />
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Your Access Level
              </h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700 dark:text-gray-300">Level:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {accessInfo.level}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700 dark:text-gray-300">Scope:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {accessInfo.scope}
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 pt-2 border-t border-[#8CC63F]/20">
                {accessInfo.description}
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Assigned Scope
              </h3>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                <strong>Coverage:</strong> {accessInfo.scopeDetails}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 pt-2 border-t border-blue-200 dark:border-blue-700">
                You can assign licenses to students within your assigned scope
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'overview'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4 inline mr-2" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('licenses')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'licenses'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Key className="w-4 h-4 inline mr-2" />
            License Management
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'analytics'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <TrendingUp className="w-4 h-4 inline mr-2" />
            Analytics
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 text-center">
              <div className="text-3xl font-bold text-[#8CC63F] mb-1">
                {usageStats?.total_licenses || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Licenses</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 text-center">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">
                {usageStats?.active_licenses || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Active Licenses</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 text-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                {usageStats?.total_used || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Students Assigned</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 text-center">
              <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-1">
                {usageStats?.utilization_percentage || 0}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Utilization</div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button
                variant="outline"
                className="h-20 flex-col"
                onClick={() => setActiveTab('licenses')}
              >
                <Key className="w-6 h-6 mb-2" />
                View Licenses
              </Button>
              
              {canAssignLicense && (
                <Button
                  variant="outline"
                  className="h-20 flex-col"
                  onClick={() => {
                    setActiveTab('licenses');
                    toast.info('Select a license to assign to students');
                  }}
                >
                  <UserPlus className="w-6 h-6 mb-2" />
                  Assign to Students
                </Button>
              )}
              
              <Button
                variant="outline"
                className="h-20 flex-col"
                onClick={() => setActiveTab('analytics')}
              >
                <BarChart3 className="w-6 h-6 mb-2" />
                View Analytics
              </Button>
              
              <Button
                variant="outline"
                className="h-20 flex-col"
                onClick={() => refetchLicenses()}
              >
                <RefreshCw className="w-6 h-6 mb-2" />
                Refresh Data
              </Button>
            </div>
          </div>

          {/* License Status Overview */}
          {licenses.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">License Status Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Active Licenses */}
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <span className="font-medium text-green-900 dark:text-green-100">Active</span>
                  </div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {usageStats?.active_licenses || 0}
                  </div>
                  <div className="text-sm text-green-700 dark:text-green-300">
                    Currently valid licenses
                  </div>
                </div>

                {/* Expiring Soon */}
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    <span className="font-medium text-amber-900 dark:text-amber-100">Expiring Soon</span>
                  </div>
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {usageStats?.expiring_soon || 0}
                  </div>
                  <div className="text-sm text-amber-700 dark:text-amber-300">
                    Expire within 30 days
                  </div>
                </div>

                {/* Expired */}
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    <span className="font-medium text-red-900 dark:text-red-100">Expired</span>
                  </div>
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {usageStats?.expired_licenses || 0}
                  </div>
                  <div className="text-sm text-red-700 dark:text-red-300">
                    Need renewal
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'licenses' && (
        <div className="space-y-6">
          {/* Filters */}
          <FilterCard
            title="Filter Licenses"
            onApply={() => {}}
            onClear={() => {
              setFilters({
                search: '',
                subject_ids: [],
                program_ids: [],
                status: [],
                expiry_status: []
              });
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <FormField id="search" label="Search">
                <Input
                  id="search"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  placeholder="Search licenses..."
                  leftIcon={<Search className="h-4 w-4" />}
                />
              </FormField>

              <FormField id="status" label="Status">
                <SearchableMultiSelect
                  label=""
                  options={[
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' }
                  ]}
                  selectedValues={filters.status}
                  onChange={(values) => setFilters({ ...filters, status: values })}
                  placeholder="All statuses"
                />
              </FormField>

              <FormField id="expiry_status" label="Expiry Status">
                <SearchableMultiSelect
                  label=""
                  options={[
                    { value: 'active', label: 'Active (>30 days)' },
                    { value: 'expiring_soon', label: 'Expiring Soon (≤30 days)' },
                    { value: 'expired', label: 'Expired' }
                  ]}
                  selectedValues={filters.expiry_status}
                  onChange={(values) => setFilters({ ...filters, expiry_status: values })}
                  placeholder="All expiry statuses"
                />
              </FormField>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => refetchLicenses()}
                  leftIcon={<RefreshCw className="h-4 w-4" />}
                  className="w-full"
                >
                  Refresh
                </Button>
              </div>
            </div>
          </FilterCard>

          {/* Licenses Table */}
          {isLoadingLicenses ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8CC63F]"></div>
              <span className="ml-2 text-gray-600 dark:text-gray-400">Loading licenses...</span>
            </div>
          ) : licensesError ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
                <div>
                  <h3 className="font-semibold text-red-800 dark:text-red-200">
                    Error Loading Licenses
                  </h3>
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    {licensesError.message || 'Failed to load license data. Please try again.'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <DataTable
              data={filteredLicenses}
              columns={licenseColumns}
              keyField="id"
              emptyMessage={
                licenses.length === 0 
                  ? "No licenses found for your scope. Contact your system administrator to allocate licenses."
                  : "No licenses match your current filters."
              }
              renderActions={(row) => (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedLicense(row);
                      setShowAssignmentModal(true);
                    }}
                    leftIcon={<Eye className="h-3 w-3" />}
                  >
                    View Details
                  </Button>
                  {canAssignLicense && row.available_quantity > 0 && (
                    <Button
                      size="sm"
                      onClick={() => handleAssignLicense(row)}
                      leftIcon={<UserPlus className="h-3 w-3" />}
                    >
                      Assign
                    </Button>
                  )}
                </div>
              )}
              caption="List of licenses available within your administrative scope"
              ariaLabel="Entity licenses data table"
            />
          )}
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Analytics Placeholder */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
            <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              License Analytics Dashboard
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Comprehensive analytics and insights will be available here
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Usage Trends</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Track license utilization over time</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Student Engagement</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Monitor how students use assigned licenses</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Capacity Planning</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Forecast future license needs</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scope Information for Non-Entity Admins */}
      {!isEntityAdmin && !isSubEntityAdmin && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Limited Scope Access
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                You can only view and manage licenses for students within your assigned scope.
                {isSchoolAdmin && ' As a School Administrator, you can assign licenses to students in your assigned schools.'}
                {isBranchAdmin && ' As a Branch Administrator, you can view licenses for students in your assigned branches.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* License Assignment Modal */}
      <LicenseAssignmentModal
        isOpen={showAssignmentModal}
        onClose={() => {
          setShowAssignmentModal(false);
          setSelectedLicense(null);
        }}
        license={selectedLicense}
        companyId={companyId}
        onSuccess={handleAssignmentSuccess}
      />
    </div>
  );
}