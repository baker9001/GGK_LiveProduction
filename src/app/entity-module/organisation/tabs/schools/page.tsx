/**
 * File: /src/app/entity-module/organisation/tabs/schools/page.tsx
 * Schools Management Tab
 */

'use client';

import React, { useState, useEffect, memo, useCallback, useMemo } from 'react';
import { School, Plus, Edit2, Trash2, Search, Users, Building, Phone, Mail, Info, Loader2, Grid3x3 as Grid3X3, List } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { getAuthenticatedUser } from '@/lib/auth';
import { useUser } from '@/contexts/UserContext';
import { SlideInForm } from '@/components/shared/SlideInForm';
import { FormField, Input, Textarea } from '@/components/shared/FormField';
import { Button } from '@/components/shared/Button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useAccessControl } from '@/hooks/useAccessControl';
import { SchoolFormContent } from '@/components/forms/SchoolFormContent';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { usePagination } from '@/hooks/usePagination';

// ===== TYPE DEFINITIONS =====
interface SchoolData {
  id: string;
  name: string;
  code?: string;
  entity_id: string;
  status: 'active' | 'inactive';
  address?: string;
  phone?: string;
  email?: string;
  notes?: string;
  logo?: string;
  created_at: string;
  branch_count?: number;
  student_count?: number;
  readOnly?: boolean;
}

export interface SchoolsTabProps {
  companyId: string;
  refreshData?: () => void;
}

// ===== MAIN COMPONENT =====
const SchoolsTab: React.FC<SchoolsTabProps> = ({ companyId: propCompanyId, refreshData }) => {
  const queryClient = useQueryClient();
  const { user } = useUser();
  const authenticatedUser = getAuthenticatedUser();
  const {
    canViewTab,
    can,
    getScopeFilters,
    getUserContext,
    isLoading: isAccessControlLoading,
    isEntityAdmin,
    hasError: hasAccessError,
    error: accessError
  } = useAccessControl();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<SchoolData | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; schoolId: string | null }>({
    isOpen: false,
    schoolId: null,
  });

  const { currentPage, pageSize, setCurrentPage, setTotalItems } = usePagination();

  const companyId = propCompanyId || getUserContext()?.company_id;

  // Fetch schools
  const { data: schoolsData, isLoading, refetch } = useQuery({
    queryKey: ['schools', companyId, statusFilter, searchQuery],
    queryFn: async () => {
      if (!companyId) return [];

      let query = supabase
        .from('schools')
        .select(`
          id,
          name,
          code,
          entity_id,
          status,
          address,
          phone,
          email,
          notes,
          logo,
          created_at
        `)
        .eq('entity_id', companyId)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,code.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as SchoolData[];
    },
    enabled: !!companyId && canViewTab('schools'),
  });

  const schools = useMemo(() => schoolsData || [], [schoolsData]);

  useEffect(() => {
    setTotalItems(schools.length);
  }, [schools.length, setTotalItems]);

  const paginatedSchools = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return schools.slice(startIndex, startIndex + pageSize);
  }, [schools, currentPage, pageSize]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (schoolData: Partial<SchoolData>) => {
      const { data, error } = await supabase
        .from('schools')
        .insert({
          ...schoolData,
          entity_id: companyId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schools'] });
      toast.success('School created successfully');
      setIsFormOpen(false);
      refreshData?.();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create school');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SchoolData> & { id: string }) => {
      const { data, error } = await supabase
        .from('schools')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schools'] });
      toast.success('School updated successfully');
      setIsFormOpen(false);
      setEditingSchool(null);
      refreshData?.();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update school');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (schoolId: string) => {
      const { error } = await supabase
        .from('schools')
        .delete()
        .eq('id', schoolId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schools'] });
      toast.success('School deleted successfully');
      setDeleteConfirmation({ isOpen: false, schoolId: null });
      refreshData?.();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete school');
    },
  });

  const handleSubmit = (formData: Partial<SchoolData>) => {
    if (editingSchool) {
      updateMutation.mutate({ id: editingSchool.id, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (school: SchoolData) => {
    setEditingSchool(school);
    setIsFormOpen(true);
  };

  const handleDelete = (schoolId: string) => {
    setDeleteConfirmation({ isOpen: true, schoolId });
  };

  const confirmDelete = () => {
    if (deleteConfirmation.schoolId) {
      deleteMutation.mutate(deleteConfirmation.schoolId);
    }
  };

  if (isAccessControlLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (hasAccessError || !canViewTab('schools')) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">You don't have permission to view schools.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Schools</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage schools and their information
          </p>
        </div>
        {can('create', 'school') && (
          <Button
            onClick={() => {
              setEditingSchool(null);
              setIsFormOpen(true);
            }}
            variant="primary"
            icon={Plus}
          >
            Add School
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search schools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('card')}
            className={`p-2 rounded-lg ${
              viewMode === 'card'
                ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
            }`}
          >
            <Grid3X3 className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-2 rounded-lg ${
              viewMode === 'table'
                ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
            }`}
          >
            <List className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      )}

      {/* Content */}
      {!isLoading && (
        <>
          {viewMode === 'card' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedSchools.map((school) => (
                <div
                  key={school.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {school.logo ? (
                        <img src={school.logo} alt={school.name} className="w-12 h-12 rounded-lg object-cover" />
                      ) : (
                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                          <School className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{school.name}</h3>
                        {school.code && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">{school.code}</p>
                        )}
                      </div>
                    </div>
                    <StatusBadge status={school.status} />
                  </div>

                  {(school.phone || school.email) && (
                    <div className="space-y-2 mb-4">
                      {school.phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Phone className="w-4 h-4" />
                          <span>{school.phone}</span>
                        </div>
                      )}
                      {school.email && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Mail className="w-4 h-4" />
                          <span>{school.email}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <Building className="w-4 h-4" />
                        <span>{school.branch_count || 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{school.student_count || 0}</span>
                      </div>
                    </div>
                    {!school.readOnly && (
                      <div className="flex items-center gap-2">
                        {can('update', 'school') && (
                          <button
                            onClick={() => handleEdit(school)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {can('delete', 'school') && (
                          <button
                            onClick={() => handleDelete(school.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      School
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Stats
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedSchools.map((school) => (
                    <tr key={school.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {school.logo ? (
                            <img src={school.logo} alt={school.name} className="w-10 h-10 rounded-lg object-cover" />
                          ) : (
                            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                              <School className="w-5 h-5 text-green-600 dark:text-green-400" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">{school.name}</div>
                            {school.code && (
                              <div className="text-sm text-gray-500 dark:text-gray-400">{school.code}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm space-y-1">
                          {school.phone && (
                            <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                              <Phone className="w-3 h-3" />
                              <span>{school.phone}</span>
                            </div>
                          )}
                          {school.email && (
                            <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                              <Mail className="w-3 h-3" />
                              <span>{school.email}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <Building className="w-4 h-4" />
                            <span>{school.branch_count || 0} branches</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            <span>{school.student_count || 0} students</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={school.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {!school.readOnly && (
                          <div className="flex items-center justify-end gap-2">
                            {can('update', 'school') && (
                              <button
                                onClick={() => handleEdit(school)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}
                            {can('delete', 'school') && (
                              <button
                                onClick={() => handleDelete(school.id)}
                                className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <PaginationControls
            currentPage={currentPage}
            totalPages={Math.ceil(schools.length / pageSize)}
            onPageChange={setCurrentPage}
            totalItems={schools.length}
            pageSize={pageSize}
          />
        </>
      )}

      {/* Form Slide-in */}
      <SlideInForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingSchool(null);
        }}
        title={editingSchool ? 'Edit School' : 'Add School'}
      >
        <SchoolFormContent
          initialData={editingSchool || undefined}
          companyId={companyId!}
          onSubmit={handleSubmit}
          onCancel={() => {
            setIsFormOpen(false);
            setEditingSchool(null);
          }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      </SlideInForm>

      {/* Delete Confirmation */}
      <ConfirmationDialog
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation({ isOpen: false, schoolId: null })}
        onConfirm={confirmDelete}
        title="Delete School"
        message="Are you sure you want to delete this school? This action cannot be undone."
        confirmText="Delete"
        confirmVariant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};

export default SchoolsTab;
