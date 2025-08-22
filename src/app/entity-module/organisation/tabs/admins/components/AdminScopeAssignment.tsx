/**
 * File: /src/app/entity-module/organisation/tabs/admins/components/AdminScopeAssignment.tsx
 * 
 * Admin Scope Assignment Component
 * Manages school and branch scope assignments for administrators
 * 
 * Dependencies:
 *   - @/components/shared/SearchableMultiSelect
 *   - @/components/shared/Button
 *   - @/components/shared/Toast
 *   - @/lib/supabase
 *   - ../types/admin.types
 *   - ../hooks/useAdminScope
 *   - ../hooks/useAdminPermissions
 * 
 * Features:
 *   - Fetch and display assigned scopes for a user
 *   - Allow assignment of schools and branches
 *   - Handle scope removal
 *   - Manage permissions for each scope
 */

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SearchableMultiSelect } from '@/components/shared/SearchableMultiSelect';
import { Button } from '@/components/shared/Button';
import { toast } from '@/components/shared/Toast';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { EntityAdminScope } from '../types/admin.types';
import { useAdminScope, useAssignScope, useRemoveScope } from '../hooks/useAdminScope';
import { useAdminPermissions } from '../hooks/useAdminPermissions'; // For future permission checks
import { School, MapPin, CheckCircle } from 'lucide-react'; // Icons

interface AdminScopeAssignmentProps {
  userId: string;
  companyId: string; // Added companyId as a prop for fetching relevant schools/branches
  adminLevel?: string;
  canModifyScope?: boolean;
  onScopesUpdated?: () => void;
}

interface SchoolOption {
  value: string;
  label: string;
}

interface BranchOption {
  value: string;
  label: string;
  schoolId: string; // To link branches to schools
}

export function AdminScopeAssignment({
  userId,
  companyId,
  adminLevel,
  canModifyScope = true,
  onScopesUpdated,
}: AdminScopeAssignmentProps) {
  // Fetch assigned scopes for the user
  const { data: assignedScopes = [], isLoading: isLoadingAssignedScopes, isError: isErrorAssignedScopes } = useAdminScope(userId);

  // Fetch all available schools for the company
  const { data: allSchools = [], isLoading: isLoadingAllSchools, isError: isErrorAllSchools } = useQuery<SchoolOption[]>(
    ['allSchools', companyId],
    async () => {
      const { data, error } = await supabase
        .from('schools')
        .select('id, name')
        .eq('company_id', companyId)
        .eq('status', 'active'); // Only active schools
      if (error) throw error;
      return data.map(s => ({ value: s.id, label: s.name }));
    },
    { enabled: !!companyId, staleTime: 5 * 60 * 1000 }
  );

  // Fetch all available branches for the company's schools
  const { data: allBranches = [], isLoading: isLoadingAllBranches, isError: isErrorAllBranches } = useQuery<BranchOption[]>(
    ['allBranches', companyId],
    async () => {
      // First, get all school IDs for the company
      const { data: schoolIdsData, error: schoolIdsError } = await supabase
        .from('schools')
        .select('id')
        .eq('company_id', companyId)
        .eq('status', 'active');
      if (schoolIdsError) throw schoolIdsError;
      const schoolIds = schoolIdsData.map(s => s.id);

      if (schoolIds.length === 0) return [];

      const { data, error } = await supabase
        .from('branches')
        .select('id, name, school_id')
        .in('school_id', schoolIds)
        .eq('status', 'active'); // Only active branches
      if (error) throw error;
      return data.map(b => ({ value: b.id, label: b.name, schoolId: b.school_id }));
    },
    { enabled: !!companyId, staleTime: 5 * 60 * 1000 }
  );

  // Local state for selected schools and branches
  const [selectedSchoolIds, setSelectedSchoolIds] = useState<string[]>([]);
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);

  // Initialize local state from assignedScopes
  useEffect(() => {
    if (assignedScopes) {
      setSelectedSchoolIds(assignedScopes.filter(s => s.scope_type === 'school').map(s => s.scope_id));
      setSelectedBranchIds(assignedScopes.filter(s => s.scope_type === 'branch').map(s => s.scope_id));
    }
  }, [assignedScopes]);

  // Mutation hooks
  const assignScopeMutation = useAssignScope(userId);
  const removeScopeMutation = useRemoveScope(userId);

  const isLoading = isLoadingAssignedScopes || isLoadingAllSchools || isLoadingAllBranches;
  const isSaving = assignScopeMutation.isLoading || removeScopeMutation.isLoading;

  // Check if user is entity admin (should have full access)
  const isEntityAdmin = adminLevel === 'entity_admin';

  // Disable all controls if user cannot modify scope or is entity admin
  const isDisabled = !canModifyScope || isEntityAdmin;

  // Handle save changes
  const handleSaveChanges = async () => {
    if (isEntityAdmin) {
      toast.info('Entity Administrators have full access by default');
      return;
    }

    if (!canModifyScope) {
      toast.error('You do not have permission to modify scope assignments');
      return;
    }

    const currentSchoolScopeIds = assignedScopes.filter(s => s.scope_type === 'school').map(s => s.scope_id);
    const currentBranchScopeIds = assignedScopes.filter(s => s.scope_type === 'branch').map(s => s.scope_id);

    const schoolsToAdd = selectedSchoolIds.filter(id => !currentSchoolScopeIds.includes(id));
    const schoolsToRemove = currentSchoolScopeIds.filter(id => !selectedSchoolIds.includes(id));
    const branchesToAdd = selectedBranchIds.filter(id => !currentBranchScopeIds.includes(id));
    const branchesToRemove = currentBranchScopeIds.filter(id => !selectedBranchIds.includes(id));

    const mutations: Promise<any>[] = [];

    // Assign new scopes
    schoolsToAdd.forEach(schoolId => {
      mutations.push(assignScopeMutation.mutateAsync({
        company_id: companyId,
        scope_type: 'school',
        scope_id: schoolId,
        permissions: {}, // Default permissions, can be expanded later
        can_create_users: false, 
        can_modify_users: false, 
        can_delete_users: false,
        can_view_all: true, 
        can_export_data: false, 
        can_manage_settings: false,
        assigned_by: userId, // Assuming the current user is the one assigning
        expires_at: null,
        is_active: true,
        notes: null,
      }));
    });

    branchesToAdd.forEach(branchId => {
      mutations.push(assignScopeMutation.mutateAsync({
        company_id: companyId,
        scope_type: 'branch',
        scope_id: branchId,
        permissions: {}, // Default permissions
        can_create_users: false, 
        can_modify_users: false, 
        can_delete_users: false,
        can_view_all: true, 
        can_export_data: false, 
        can_manage_settings: false,
        assigned_by: userId,
        expires_at: null,
        is_active: true,
        notes: null,
      }));
    });

    // Remove old scopes
    schoolsToRemove.forEach(schoolId => {
      const scopeToRemove = assignedScopes.find(s => s.scope_type === 'school' && s.scope_id === schoolId);
      if (scopeToRemove) {
        mutations.push(removeScopeMutation.mutateAsync(scopeToRemove.id));
      }
    });

    branchesToRemove.forEach(branchId => {
      const scopeToRemove = assignedScopes.find(s => s.scope_type === 'branch' && s.scope_id === branchId);
      if (scopeToRemove) {
        mutations.push(removeScopeMutation.mutateAsync(scopeToRemove.id));
      }
    });

    try {
      await Promise.all(mutations);
      toast.success('Scope assignments updated successfully!');
      onScopesUpdated?.();
    } catch (error) {
      console.error('Failed to update scope assignments:', error);
      toast.error('Failed to update scope assignments.');
    }
  };

  // TODO: Integrate useAdminPermissions to disable inputs if current user lacks permissions
  const { canManageSchools, canManageBranches } = useAdminPermissions(userId); // Mock for now

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Loading scopes...</p>
      </div>
    );
  }

  if (isErrorAssignedScopes || isErrorAllSchools || isErrorAllBranches) {
    return (
      <div className="text-center py-8 text-red-600 dark:text-red-400">
        <p>Error loading scope data. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Entity Admin Full Access Notice */}
      {isEntityAdmin && (
        <div className="bg-[#8CC63F]/10 border border-[#8CC63F]/20 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-[#8CC63F] mr-2 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Full Company Access
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Entity Administrators automatically have access to all schools and branches within the company. 
                No specific scope assignment is required.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Assign Schools Section */}
      <div className={cn(
        "bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700",
        isEntityAdmin && "opacity-50"
      )}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <School className="h-5 w-5 mr-2 text-blue-500" /> Assign Schools
        </h3>
        {isEntityAdmin && (
          <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            Entity Administrators have access to all schools automatically.
          </div>
        )}
        <SearchableMultiSelect
          label="Schools"
          options={allSchools}
          selectedValues={selectedSchoolIds}
          onChange={setSelectedSchoolIds}
          placeholder="Select schools to assign..."
          disabled={isSaving || isDisabled}
        />
        {!canModifyScope && !isEntityAdmin && (
          <div className="mt-2 text-xs text-amber-600 dark:text-amber-400">
            You do not have permission to modify school assignments
          </div>
        )}
      </div>

      {/* Assign Branches Section */}
      <div className={cn(
        "bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700",
        isEntityAdmin && "opacity-50"
      )}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <MapPin className="h-5 w-5 mr-2 text-purple-500" /> Assign Branches
        </h3>
        {isEntityAdmin && (
          <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            Entity Administrators have access to all branches automatically.
          </div>
        )}
        <SearchableMultiSelect
          label="Branches"
          options={allBranches}
          selectedValues={selectedBranchIds}
          onChange={setSelectedBranchIds}
          placeholder="Select branches to assign..."
          disabled={isSaving || isDisabled}
        />
        {!canModifyScope && !isEntityAdmin && (
          <div className="mt-2 text-xs text-amber-600 dark:text-amber-400">
            You do not have permission to modify branch assignments
          </div>
        )}
      </div>

      {!isEntityAdmin && canModifyScope && (
        <div className="flex justify-end">
          <Button onClick={handleSaveChanges} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      )}
    </div>
  );
}