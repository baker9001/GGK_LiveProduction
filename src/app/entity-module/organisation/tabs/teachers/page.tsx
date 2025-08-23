/**
 * File: /src/app/entity-module/organisation/tabs/teachers/page.tsx
 * 
 * PHASE 5: Teachers Tab with Complete Access Control Applied
 * 
 * Access Rules Applied:
 * 1. Access Check: Block entry if !canViewTab('teachers')
 * 2. Scoped Queries: Apply getScopeFilters to teacher queries  
 * 3. UI Gating: Show/hide Create/Edit/Delete buttons via can(action)
 * 4. Enhanced Error Handling: Better user feedback for access issues
 * 5. Improved Query Logic: More robust scope filtering
 * 
 * Dependencies:
 *   - @/hooks/useAccessControl
 *   - @/components/shared/FormField
 *   - @/components/shared/Button
 *   - @/components/shared/StatusBadge
 *   - @/components/shared/Toast
 *   - @/contexts/UserContext
 *   - @/lib/supabase
 *   - External: react, @tanstack/react-query, lucide-react
 * 
 * Preserved Features:
 *   - All search and filter functionality
 *   - Teacher data display with school/branch information
 *   - Status filtering (active/inactive)
 *   - Development notices and feature cards
 * 
 * Enhanced Features:
 *   - Complete access control integration
 *   - Better scope-based filtering logic
 *   - Improved error handling and user feedback
 *   - Enhanced loading states
 *   - Proper permission-based UI rendering
 * 
 * Database Tables:
 *   - teachers (main teacher records)
 *   - users (user accounts linked to teachers)
 *   - schools (organization structure)  
 *   - branches (organization structure)
 *   - entity_admin_scope (scope assignments)
 * 
 * Connected Files:
 *   - useAccessControl hook (access control logic)
 *   - PermissionContext (permission checks)
 *   - UserContext (user authentication)
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Award, Calendar, BookOpen, Clock, Briefcase, 
  Plus, Search, Filter, AlertTriangle, Info, CheckCircle2,
  Loader2, UserCheck, GraduationCap
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../../../lib/supabase';
import { useUser } from '../../../../../contexts/UserContext';
import { useAccessControl } from '../../../../../hooks/useAccessControl';
import { FormField, Input, Select } from '../../../../../components/shared/FormField';
import { Button } from '../../../../../components/shared/Button';
import { StatusBadge } from '../../../../../components/shared/StatusBadge';
import { toast } from '../../../../../components/shared/Toast';

interface TeacherData {
  id: string;
  user_id: string;
  teacher_code: string;
  name?: string;
  email?: string;
  specialization?: string[];
  qualification?: string;
  experience_years?: number;
  company_id: string;
  school_id?: string;
  branch_id?: string;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
  school_name?: string;
  branch_name?: string;
  user_data?: {
    email: string;
    is_active: boolean;
    raw_user_meta_data?: any;
    last_login_at?: string;
  };
}

export interface TeachersTabProps {
  companyId: string;
  refreshData?: () => void;
}

export default function TeachersTab({ companyId, refreshData }: TeachersTabProps) {
  const { user } = useUser();
  const {
    canViewTab,
    can,
    getScopeFilters,
    isLoading: isAccessControlLoading,
    isEntityAdmin,
    isSubEntityAdmin,
    getUserContext
  } = useAccessControl();

  // PHASE 5 RULE 1: ACCESS CHECK
  // Block entry if user cannot view this tab
  React.useEffect(() => {
    if (!isAccessControlLoading && !canViewTab('teachers')) {
      toast.error('You do not have permission to view teachers');
      window.location.href = '/app/entity-module/dashboard';
      return;
    }
  }, [isAccessControlLoading, canViewTab]);

  // Local state for filters and UI
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterSchool, setFilterSchool] = useState<string>('all');
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);

  // PHASE 5 RULE 2: SCOPED QUERIES
  // Apply getScopeFilters to all database queries
  const scopeFilters = useMemo(() => getScopeFilters('teachers'), [getScopeFilters]);
  const userContext = useMemo(() => getUserContext(), [getUserContext]);

  // Determine access level for UI purposes
  const canAccessAll = useMemo(() => 
    isEntityAdmin || isSubEntityAdmin, 
    [isEntityAdmin, isSubEntityAdmin]
  );

  // ENHANCED: Fetch teachers with comprehensive scope filtering
  const { data: teachers = [], isLoading: isLoadingTeachers, error: teachersError } = useQuery(
    ['teachers', companyId, scopeFilters],
    async () => {
      try {
        if (!companyId) {
          throw new Error('Company ID is required');
        }

        // SCOPED QUERY: Build teachers query with comprehensive filtering
        let teachersQuery = supabase
          .from('teachers')
          .select(`
            id,
            user_id,
            teacher_code,
            name,
            specialization,
            qualification,
            experience_years,
            company_id,
            school_id,
            branch_id,
            is_active,
            created_at,
            updated_at,
            users!teachers_user_id_fkey (
              id,
              email,
              is_active,
              raw_user_meta_data,
              last_login_at
            ),
            schools (
              id,
              name,
              status
            ),
            branches (
              id,
              name,
              status
            )
          `)
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });

        // Apply scope-based filtering for non-entity admins
        if (!canAccessAll && (scopeFilters.school_ids || scopeFilters.branch_ids)) {
          // Build OR condition for school or branch access
          const orConditions: string[] = [];
          
          if (scopeFilters.school_ids && scopeFilters.school_ids.length > 0) {
            orConditions.push(`school_id.in.(${scopeFilters.school_ids.join(',')})`);
          }
          
          if (scopeFilters.branch_ids && scopeFilters.branch_ids.length > 0) {
            orConditions.push(`branch_id.in.(${scopeFilters.branch_ids.join(',')})`);
          }
          
          if (orConditions.length > 0) {
            teachersQuery = teachersQuery.or(orConditions.join(','));
          }
        }

        const { data: teachersData, error: teachersError } = await teachersQuery;

        if (teachersError) {
          console.error('Teachers query error:', teachersError);
          throw new Error(`Failed to fetch teachers: ${teachersError.message}`);
        }

        if (!teachersData) {
          return [];
        }

        // Transform and enrich the data
        return teachersData.map(teacher => ({
          ...teacher,
          name: teacher.name || 
                teacher.users?.raw_user_meta_data?.name || 
                teacher.users?.email?.split('@')[0] || 
                'Unknown Teacher',
          email: teacher.users?.email || '',
          is_active: teacher.users?.is_active ?? teacher.is_active ?? true,
          school_name: teacher.schools?.name || 'No School Assigned',
          branch_name: teacher.branches?.name || 'No Branch Assigned',
          user_data: teacher.users
        })) as TeacherData[];

      } catch (error) {
        console.error('Error fetching teachers:', error);
        throw error;
      }
    },
    {
      enabled: !!companyId && !isAccessControlLoading,
      staleTime: 2 * 60 * 1000, // 2 minutes
      retry: (failureCount, error) => {
        if (error.message.includes('permission')) return false;
        return failureCount < 2;
      }
    }
  );

  // Fetch available schools for filter dropdown (also scoped)
  const { data: availableSchools = [] } = useQuery(
    ['schools-for-teachers-filter', companyId, scopeFilters],
    async () => {
      try {
        let schoolsQuery = supabase
          .from('schools')
          .select('id, name, status')
          .eq('company_id', companyId)
          .eq('status', 'active')
          .order('name');

        // Apply scope filtering for schools
        if (!canAccessAll && scopeFilters.school_ids && scopeFilters.school_ids.length > 0) {
          schoolsQuery = schoolsQuery.in('id', scopeFilters.school_ids);
        }

        const { data, error } = await schoolsQuery;
        
        if (error) {
          console.error('Schools query error:', error);
          return [];
        }
        
        return data || [];
      } catch (error) {
        console.error('Error fetching schools for filter:', error);
        return [];
      }
    },
    { 
      enabled: !!companyId && !isAccessControlLoading,
      staleTime: 5 * 60 * 1000 // 5 minutes
    }
  );

  // Apply client-side filtering
  const filteredTeachers = useMemo(() => {
    return teachers.filter(teacher => {
      // Search filter
      const matchesSearch = !searchTerm || 
        teacher.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        teacher.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        teacher.teacher_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        teacher.specialization?.some(spec => 
          spec.toLowerCase().includes(searchTerm.toLowerCase())
        );
      
      // Status filter
      const matchesStatus = filterStatus === 'all' || 
        (filterStatus === 'active' && teacher.is_active) ||
        (filterStatus === 'inactive' && !teacher.is_active);
      
      // School filter
      const matchesSchool = filterSchool === 'all' || 
        teacher.school_id === filterSchool;
      
      return matchesSearch && matchesStatus && matchesSchool;
    });
  }, [teachers, searchTerm, filterStatus, filterSchool]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    return {
      total: teachers.length,
      active: teachers.filter(t => t.is_active).length,
      inactive: teachers.filter(t => !t.is_active).length,
      withSpecialization: teachers.filter(t => 
        t.specialization && t.specialization.length > 0
      ).length
    };
  }, [teachers]);

  // PHASE 5 RULE 3: UI GATING - Permission checks for actions
  const canCreateTeacher = can('create_teacher');
  const canModifyTeacher = can('modify_teacher');
  const canDeleteTeacher = can('delete_teacher');

  // Handle teacher creation
  const handleCreateTeacher = () => {
    if (!canCreateTeacher) {
      toast.error('You do not have permission to create teachers');
      return;
    }
    // TODO: Open teacher creation modal/form
    console.log('Create teacher - TODO: Implement teacher creation form');
    toast.info('Teacher creation form will be implemented soon');
  };

  // Handle bulk actions
  const handleBulkAction = (action: string) => {
    if (selectedTeachers.length === 0) {
      toast.error('Please select teachers first');
      return;
    }

    switch (action) {
      case 'activate':
        if (!canModifyTeacher) {
          toast.error('You do not have permission to modify teachers');
          return;
        }
        console.log('Bulk activate teachers:', selectedTeachers);
        toast.info('Bulk activation will be implemented soon');
        break;
      case 'deactivate':
        if (!canModifyTeacher) {
          toast.error('You do not have permission to modify teachers');
          return;
        }
        console.log('Bulk deactivate teachers:', selectedTeachers);
        toast.info('Bulk deactivation will be implemented soon');
        break;
      case 'delete':
        if (!canDeleteTeacher) {
          toast.error('You do not have permission to delete teachers');
          return;
        }
        console.log('Bulk delete teachers:', selectedTeachers);
        toast.info('Bulk deletion will be implemented soon');
        break;
      default:
        toast.error('Unknown action');
    }
  };

  // Handle loading and error states
  if (isAccessControlLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600 dark:text-gray-400">
          Checking permissions...
        </span>
      </div>
    );
  }

  if (teachersError) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
          <div>
            <h3 className="font-semibold text-red-800 dark:text-red-200">
              Error Loading Teachers
            </h3>
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
              {teachersError.message || 'Failed to load teacher data. Please try again.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        
        {/* Summary Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {summaryStats.total}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Teachers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {summaryStats.active}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Active</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
              {summaryStats.inactive}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Inactive</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {summaryStats.withSpecialization}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Specialized</div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search teachers by name, email, or code..."
                className="pl-10"
              />
            </div>
            
            {availableSchools.length > 0 && (
              <Select
                value={filterSchool}
                onChange={(value) => setFilterSchool(value)}
                options={[
                  { value: 'all', label: 'All Schools' },
                  ...availableSchools.map(s => ({ value: s.id, label: s.name }))
                ]}
              />
            )}
            
            <Select
              value={filterStatus}
              onChange={(value) => setFilterStatus(value as 'all' | 'active' | 'inactive')}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'active', label: 'Active Only' },
                { value: 'inactive', label: 'Inactive Only' }
              ]}
            />
          </div>
          
          {/* PHASE 5 RULE 3: UI GATING - Show create button based on permissions */}
          {canCreateTeacher && (
            <Button onClick={handleCreateTeacher} className="ml-4">
              <Plus className="w-4 h-4 mr-2" />
              Add Teacher
            </Button>
          )}
        </div>

        {/* Access Control Notices */}
        {!canCreateTeacher && (
          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
            <div className="flex items-center">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mr-2" />
              <p className="text-sm text-amber-700 dark:text-amber-300">
                You don't have permission to create new teachers.
              </p>
            </div>
          </div>
        )}

        {!canAccessAll && userContext && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
            <div className="flex items-center">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mr-2" />
              <div className="text-sm">
                <p className="text-blue-700 dark:text-blue-300 font-medium">
                  Scope-based access active
                </p>
                <p className="text-blue-600 dark:text-blue-400 mt-1">
                  You can only view and manage teachers within your assigned schools and branches.
                  Showing {filteredTeachers.length} of {summaryStats.total} teachers based on your access level.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Actions Bar */}
        {selectedTeachers.length > 0 && (canModifyTeacher || canDeleteTeacher) && (
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {selectedTeachers.length} teacher{selectedTeachers.length !== 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                {canModifyTeacher && (
                  <>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleBulkAction('activate')}
                    >
                      <UserCheck className="w-4 h-4 mr-1" />
                      Activate
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleBulkAction('deactivate')}
                    >
                      Deactivate
                    </Button>
                  </>
                )}
                {canDeleteTeacher && (
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => handleBulkAction('delete')}
                  >
                    Delete Selected
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Teachers List */}
        {isLoadingTeachers ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-2 text-gray-600 dark:text-gray-400">Loading teachers...</span>
          </div>
        ) : filteredTeachers.length === 0 ? (
          <div className="text-center p-8 text-gray-500 dark:text-gray-400">
            <GraduationCap className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            {teachers.length === 0 ? (
              <>
                <h3 className="text-lg font-medium mb-2">No Teachers Found</h3>
                <p className="text-sm">
                  {!canAccessAll 
                    ? "No teachers found within your assigned scope." 
                    : "No teachers have been added to this organization yet."
                  }
                </p>
                {canCreateTeacher && (
                  <Button 
                    onClick={handleCreateTeacher}
                    className="mt-4"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Teacher
                  </Button>
                )}
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium mb-2">No Matching Teachers</h3>
                <p className="text-sm">
                  Try adjusting your search terms or filters to find teachers.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left p-2">
                    <input
                      type="checkbox"
                      checked={
                        selectedTeachers.length === filteredTeachers.length &&
                        filteredTeachers.length > 0
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTeachers(filteredTeachers.map(t => t.id));
                        } else {
                          setSelectedTeachers([]);
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="text-left p-2 font-medium">Teacher</th>
                  <th className="text-left p-2 font-medium">Code</th>
                  <th className="text-left p-2 font-medium">Specialization</th>
                  <th className="text-left p-2 font-medium">School</th>
                  <th className="text-left p-2 font-medium">Branch</th>
                  <th className="text-left p-2 font-medium">Status</th>
                  <th className="text-left p-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeachers.map((teacher) => (
                  <tr 
                    key={teacher.id} 
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={selectedTeachers.includes(teacher.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTeachers([...selectedTeachers, teacher.id]);
                          } else {
                            setSelectedTeachers(selectedTeachers.filter(id => id !== teacher.id));
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="p-2">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {teacher.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {teacher.email}
                        </div>
                      </div>
                    </td>
                    <td className="p-2 text-gray-700 dark:text-gray-300">
                      {teacher.teacher_code || 'N/A'}
                    </td>
                    <td className="p-2">
                      {teacher.specialization && teacher.specialization.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {teacher.specialization.slice(0, 2).map((spec, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded"
                            >
                              {spec}
                            </span>
                          ))}
                          {teacher.specialization.length > 2 && (
                            <span className="text-xs text-gray-500">
                              +{teacher.specialization.length - 2} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500 text-sm">None</span>
                      )}
                    </td>
                    <td className="p-2 text-gray-700 dark:text-gray-300">
                      {teacher.school_name}
                    </td>
                    <td className="p-2 text-gray-700 dark:text-gray-300">
                      {teacher.branch_name}
                    </td>
                    <td className="p-2">
                      <StatusBadge
                        status={teacher.is_active ? 'active' : 'inactive'}
                        variant={teacher.is_active ? 'success' : 'warning'}
                      />
                    </td>
                    <td className="p-2">
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline">
                          View
                        </Button>
                        {canModifyTeacher && (
                          <Button size="sm" variant="outline">
                            Edit
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 mb-6">
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 text-center">
            <Calendar className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
              Schedule Management
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Track classes and timetables
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 text-center">
            <Award className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
              Performance Tracking
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Monitor teaching effectiveness
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 text-center">
            <BookOpen className="w-8 h-8 text-purple-500 mx-auto mb-2" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
              Subject Management
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Assign subjects and courses
            </p>
          </div>
        </div>

        {/* Development Notice */}
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-4">
          <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 mb-2">
            <Clock className="w-5 h-5" />
            <span className="font-semibold">Feature Development Status</span>
          </div>
          <p className="text-sm text-purple-600 dark:text-purple-400 mb-3">
            Teachers management module is currently under active development. The following features are planned:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <ul className="text-sm text-purple-600 dark:text-purple-400 space-y-1">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Teacher listing and filtering ✓
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Scope-based access control ✓
              </li>
              <li className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Teacher registration and onboarding
              </li>
              <li className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Qualification and certification tracking
              </li>
            </ul>
            <ul className="text-sm text-purple-600 dark:text-purple-400 space-y-1">
              <li className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Class assignments and schedules
              </li>
              <li className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Attendance monitoring
              </li>
              <li className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Performance evaluations
              </li>
              <li className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Professional development tracking
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}