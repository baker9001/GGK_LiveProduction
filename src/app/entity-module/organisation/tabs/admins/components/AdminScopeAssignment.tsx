/**
 * File: /src/app/entity-module/organisation/tabs/admins/components/AdminScopeAssignment.tsx
 * 
 * Admin Scope Assignment Component
 * Handles assignment of schools and branches to administrators
 * 
 * Features:
 * ✅ Entity admin full access handling
 * ✅ Dynamic school/branch loading
 * ✅ Scope assignment and removal
 * ✅ Permission-based field control
 * ✅ Real-time validation and feedback
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  School, 
  MapPin, 
  CheckCircle, 
  AlertCircle, 
  Building2,
  Shield,
  Users,
  Save,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/shared/Button';
import { SearchableMultiSelect } from '@/components/shared/SearchableMultiSelect';
import { toast } from '@/components/shared/Toast';
import { supabase } from '@/lib/supabase';
import { scopeService } from '../services/scopeService';
import { AdminLevel, EntityAdminScope } from '../types/admin.types';

interface AdminScopeAssignmentProps {
  userId: string;
  companyId: string;
  adminLevel: AdminLevel;
  onScopesUpdated?: () => void;
  className?: string;
}

interface SchoolOption {
  value: string;
  label: string;
}

interface BranchOption {
  value: string;
  label: string;
  schoolId: string;
  schoolName: string;
}

export function AdminScopeAssignment({
  userId,
  companyId,
  adminLevel,
  onScopesUpdated,
  className
}: AdminScopeAssignmentProps) {
  const queryClient = useQueryClient();
  const [selectedSchoolIds, setSelectedSchoolIds] = useState<string[]>([]);
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Check if user is entity admin (has full access)
  const isEntityAdmin = adminLevel === 'entity_admin';

  // Fetch assigned scopes
  const { data: assignedScopes = [], isLoading: isLoadingScopes } = useQuery(
    ['adminScopes', userId],
    () => scopeService.getScopes(userId),
    {
      enabled: !!userId && !isEntityAdmin,
      staleTime: 2 * 60 * 1000,
    }
  );

  // Fetch all schools for this company
  const { data: allSchools = [], isLoading: isLoadingSchools } = useQuery(
    ['company-schools', companyId],
    async () => {
      const { data, error } = await supabase
        .from('schools')
        .select('id, name, code')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;

      return (data || []).map(school => ({
        value: school.id,
        label: `${school.name}${school.code ? ` (${school.code})` : ''}`
      }));
    },
    {
      enabled: !!companyId && !isEntityAdmin,
      staleTime: 5 * 60 * 1000,
    }
  );

  // Fetch all branches for this company
  const { data: allBranches = [], isLoading: isLoadingBranches } = useQuery(
    ['company-branches', companyId],
    async () => {
      // First get all schools for this company
      const { data: schools, error: schoolsError } = await supabase
        .from('schools')
        .select('id, name')
        .eq('company_id', companyId)
        .eq('status', 'active');

      if (schoolsError) throw schoolsError;

      const schoolIds = schools?.map(s => s.id) || [];
      if (schoolIds.length === 0) return [];

      // Then get all branches for these schools
      const { data: branches, error: branchesError } = await supabase
        .from('branches')
        .select('id, name, code, school_id')
        .in('school_id', schoolIds)
        .eq('status', 'active')
        .order('name');

      if (branchesError) throw branchesError;

      // Create school lookup map
      const schoolMap = new Map(schools?.map(s => [s.id, s.name]) || []);

      return (branches || []).map(branch => ({
        value: branch.id,
        label: `${branch.name}${branch.code ? ` (${branch.code})` : ''}`,
        schoolId: branch.school_id,
        schoolName: schoolMap.get(branch.school_id) || 'Unknown School'
      }));
    },
    {
      enabled: !!companyId && !isEntityAdmin,
      staleTime: 5 * 60 * 1000,
    }
  );

  // Initialize selected values from assigned scopes
  useEffect(() => {
    if (assignedScopes.length > 0) {
      const schoolIds = assignedScopes
        .filter(scope => scope.scope_type === 'school')
        .map(scope => scope.scope_id);
      
      const branchIds = assignedScopes
        .filter(scope => scope.scope_type === 'branch')
        .map(scope => scope.scope_id);

      setSelectedSchoolIds(schoolIds);
      setSelectedBranchIds(branchIds);
    }
  }, [assignedScopes]);

  // Track changes
  useEffect(() => {
    const initialSchoolIds = assignedScopes
      .filter(scope => scope.scope_type === 'school')
      .map(scope => scope.scope_id);
    
    const initialBranchIds = assignedScopes
      .filter(scope => scope.scope_type === 'branch')
      .map(scope => scope.scope_id);

    const schoolsChanged = 
      selectedSchoolIds.length !== initialSchoolIds.length ||
      selectedSchoolIds.some(id => !initialSchoolIds.includes(id)) ||
      initialSchoolIds.some(id => !selectedSchoolIds.includes(id));

    const branchesChanged = 
      selectedBranchIds.length !== initialBranchIds.length ||
      selectedBranchIds.some(id => !initialBranchIds.includes(id)) ||
      initialBranchIds.some(id => !selectedBranchIds.includes(id));

    setHasChanges(schoolsChanged || branchesChanged);
  }, [selectedSchoolIds, selectedBranchIds, assignedScopes]);

  // Assign scope mutation
  const assignScopeMutation = useMutation(
    (scope: Omit<EntityAdminScope, 'id' | 'user_id' | 'assigned_at'>) =>
      scopeService.assignScope(userId, scope),
    {
      onError: (error: any) => {
        console.error('Error assigning scope:', error);
        toast.error(error.message || 'Failed to assign scope');
      }
    }
  );

  // Remove scope mutation
  const removeScopeMutation = useMutation(
    (scopeId: string) => scopeService.removeScope(userId, scopeId),
    {
      onError: (error: any) => {
        console.error('Error removing scope:', error);
        toast.error(error.message || 'Failed to remove scope');
      }
    }
  );

  // Handle save changes
  const handleSaveChanges = async () => {
    if (!hasChanges) {
      toast.info('No changes to save');
      return;
    }

    setIsSaving(true);

    try {
      const mutations: Promise<any>[] = [];

      // Get current scope IDs
      const currentSchoolIds = assignedScopes
        .filter(scope => scope.scope_type === 'school')
        .map(scope => scope.scope_id);
      
      const currentBranchIds = assignedScopes
        .filter(scope => scope.scope_type === 'branch')
        .map(scope => scope.scope_id);

      // Schools to add
      const schoolsToAdd = selectedSchoolIds.filter(id => !currentSchoolIds.includes(id));
      schoolsToAdd.forEach(schoolId => {
        mutations.push(assignScopeMutation.mutateAsync({
          company_id: companyId,
          scope_type: 'school',
          scope_id: schoolId,
          permissions: {},
          can_create_users: false,
          can_modify_users: false,
          can_delete_users: false,
          can_view_all: true,
          can_export_data: false,
          can_manage_settings: false,
          assigned_by: null,
          expires_at: null,
          is_active: true,
          notes: null
        }));
      });

      // Schools to remove
      const schoolsToRemove = currentSchoolIds.filter(id => !selectedSchoolIds.includes(id));
      schoolsToRemove.forEach(schoolId => {
        const scopeToRemove = assignedScopes.find(s => s.scope_type === 'school' && s.scope_id === schoolId);
        if (scopeToRemove) {
          mutations.push(removeScopeMutation.mutateAsync(scopeToRemove.id));
        }
      });

      // Branches to add
      const branchesToAdd = selectedBranchIds.filter(id => !currentBranchIds.includes(id));
      branchesToAdd.forEach(branchId => {
        mutations.push(assignScopeMutation.mutateAsync({
          company_id: companyId,
          scope_type: 'branch',
          scope_id: branchId,
          permissions: {},
          can_create_users: false,
          can_modify_users: false,
          can_delete_users: false,
          can_view_all: true,
          can_export_data: false,
          can_manage_settings: false,
          assigned_by: null,
          expires_at: null,
          is_active: true,
          notes: null
        }));
      });

      // Branches to remove
      const branchesToRemove = currentBranchIds.filter(id => !selectedBranchIds.includes(id));
      branchesToRemove.forEach(branchId => {
        const scopeToRemove = assignedScopes.find(s => s.scope_type === 'branch' && s.scope_id === branchId);
        if (scopeToRemove) {
          mutations.push(removeScopeMutation.mutateAsync(scopeToRemove.id));
        }
      });

      // Execute all mutations
      await Promise.all(mutations);

      // Invalidate queries to refresh data
      queryClient.invalidateQueries(['adminScopes', userId]);
      
      toast.success('Scope assignments updated successfully');
      onScopesUpdated?.();
      setHasChanges(false);

    } catch (error: any) {
      console.error('Error saving scope changes:', error);
      toast.error(error.message || 'Failed to save scope changes');
    } finally {
      setIsSaving(false);
    }
  };

  // If entity admin, show full access notice
  if (isEntityAdmin) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="bg-[#8CC63F]/10 border border-[#8CC63F]/20 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-[#8CC63F] mr-2 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Full Company Access Granted
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Entity Administrators have unrestricted access to all schools, branches, and company-wide settings. 
                No scope assignment is needed.
              </p>
            </div>
          </div>
        </div>

        {/* Summary stats for entity admin */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Available Schools</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {allSchools.length}
                </p>
              </div>
              <School className="h-6 w-6 text-blue-400" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Available Branches</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {allBranches.length}
                </p>
              </div>
              <MapPin className="h-6 w-6 text-purple-400" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoadingScopes || isLoadingSchools || isLoadingBranches) {
    return (
      <div className={cn("flex items-center justify-center py-8", className)}>
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading scope data...</span>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Current Scope Summary */}
      {assignedScopes.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2 flex items-center">
            <Shield className="h-4 w-4 mr-2" />
            Current Scope Assignments
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-blue-700 dark:text-blue-300">Schools: </span>
              <span className="font-medium">
                {assignedScopes.filter(s => s.scope_type === 'school').length}
              </span>
            </div>
            <div>
              <span className="text-blue-700 dark:text-blue-300">Branches: </span>
              <span className="font-medium">
                {assignedScopes.filter(s => s.scope_type === 'branch').length}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* School Assignment */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center mb-4">
          <Building2 className="h-5 w-5 text-blue-500 mr-2" />
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
            Assign Schools
          </h4>
        </div>
        
        <SearchableMultiSelect
          label="Schools"
          options={allSchools}
          selectedValues={selectedSchoolIds}
          onChange={setSelectedSchoolIds}
          placeholder="Select schools to assign..."
          disabled={isSaving}
        />
        
        {selectedSchoolIds.length > 0 && (
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {selectedSchoolIds.length} school{selectedSchoolIds.length > 1 ? 's' : ''} selected
          </div>
        )}
      </div>

      {/* Branch Assignment */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center mb-4">
          <MapPin className="h-5 w-5 text-purple-500 mr-2" />
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
            Assign Branches
          </h4>
        </div>
        
        <SearchableMultiSelect
          label="Branches"
          options={allBranches.map(branch => ({
            value: branch.value,
            label: `${branch.label} (${branch.schoolName})`
          }))}
          selectedValues={selectedBranchIds}
          onChange={setSelectedBranchIds}
          placeholder="Select branches to assign..."
          disabled={isSaving}
        />
        
        {selectedBranchIds.length > 0 && (
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {selectedBranchIds.length} branch{selectedBranchIds.length > 1 ? 'es' : ''} selected
          </div>
        )}
      </div>

      {/* Save Changes Button */}
      {hasChanges && (
        <div className="flex justify-end">
          <Button
            onClick={handleSaveChanges}
            disabled={isSaving}
            leftIcon={isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            className="bg-[#8CC63F] hover:bg-[#7AB635] text-white"
          >
            {isSaving ? 'Saving Changes...' : 'Save Scope Changes'}
          </Button>
        </div>
      )}

      {/* No Changes Message */}
      {!hasChanges && assignedScopes.length === 0 && (
        <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-center">
          <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No scope assignments configured. This admin has full company access.
          </p>
        </div>
      )}

      {/* Warning for removing all scopes */}
      {hasChanges && selectedSchoolIds.length === 0 && selectedBranchIds.length === 0 && assignedScopes.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mr-2" />
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              Removing all scope assignments will grant this admin full company access.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}