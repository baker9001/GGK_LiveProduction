/**
 * File: /src/components/entity/LicenseAssignmentModal.tsx
 * 
 * License Assignment Modal Component
 * Allows entity admins to assign/revoke licenses to/from students
 * 
 * Dependencies:
 *   - @/services/entityLicenseService
 *   - @/components/shared/SlideInForm
 *   - @/components/shared/SearchableMultiSelect
 *   - @/components/shared/DataTable
 *   - @/hooks/useAccessControl
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  UserPlus,
  UserMinus,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  School,
  MapPin,
  Mail,
  Hash,
  Calendar,
  Info
} from 'lucide-react';
import { SlideInForm } from '../shared/SlideInForm';
import { SearchableMultiSelect } from '../shared/SearchableMultiSelect';
import { DataTable } from '../shared/DataTable';
import { FormField, Input, Select } from '../shared/FormField';
import { Button } from '../shared/Button';
import { StatusBadge } from '../shared/StatusBadge';
import { ConfirmationDialog } from '../shared/ConfirmationDialog';
import { toast } from '../shared/Toast';
import { useAccessControl } from '../../hooks/useAccessControl';
import { useUser } from '../../contexts/UserContext';
import { EntityLicenseService, type EntityLicense, type StudentLicenseAssignment } from '../../services/entityLicenseService';
import { supabase } from '../../lib/supabase';

interface LicenseAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  license: EntityLicense | null;
  companyId: string;
  onSuccess?: () => void;
}

export function LicenseAssignmentModal({
  isOpen,
  onClose,
  license,
  companyId,
  onSuccess
}: LicenseAssignmentModalProps) {
  const { user } = useUser();
  const { getScopeFilters, can } = useAccessControl();
  const queryClient = useQueryClient();

  // Local state
  const [activeTab, setActiveTab] = useState<'assign' | 'manage'>('assign');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [filterSchool, setFilterSchool] = useState<string>('all');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [studentsToRevoke, setStudentsToRevoke] = useState<StudentLicenseAssignment[]>([]);

  // Get scope filters
  const scopeFilters = useMemo(() => getScopeFilters('students'), [getScopeFilters]);

  // Permission checks
  const canAssignLicense = can('assign_license');
  const canRevokeLicense = can('revoke_license');

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setActiveTab('assign');
      setSelectedStudents([]);
      setSearchTerm('');
      setFilterGrade('all');
      setFilterSchool('all');
    }
  }, [isOpen]);

  // Fetch available students for assignment
  const { data: availableStudents = [], isLoading: isLoadingStudents } = useQuery({
    queryKey: ['available-students', companyId, scopeFilters, searchTerm, filterGrade, filterSchool],
    queryFn: async () => {
      if (!license || !isOpen) return [];

      return await EntityLicenseService.getAvailableStudents(
        companyId,
        scopeFilters,
        {
          search: searchTerm,
          grade_level: filterGrade !== 'all' ? filterGrade : undefined
        }
      );
    },
    enabled: !!license && !!companyId && isOpen && activeTab === 'assign',
    staleTime: 2 * 60 * 1000
  });

  // Fetch currently assigned students
  const { data: assignedStudents = [], isLoading: isLoadingAssigned } = useQuery({
    queryKey: ['assigned-students', license?.id, companyId],
    queryFn: async () => {
      if (!license) return [];

      return await EntityLicenseService.getStudentsForLicense(
        license.id,
        companyId,
        scopeFilters
      );
    },
    enabled: !!license && !!companyId && isOpen,
    staleTime: 30 * 1000
  });

  // Get available schools for filter
  const { data: availableSchools = [] } = useQuery({
    queryKey: ['schools-for-license-filter', companyId, scopeFilters],
    queryFn: async () => {
      if (!scopeFilters.school_ids || scopeFilters.school_ids.length === 0) return [];

      const { data, error } = await supabase
        .from('schools')
        .select('id, name')
        .in('id', scopeFilters.school_ids)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId && isOpen,
    staleTime: 5 * 60 * 1000
  });

  // Get unique grade levels from available students
  const availableGrades = useMemo(() => {
    const grades = availableStudents
      .map(s => s.grade_level)
      .filter((grade, index, arr) => grade && arr.indexOf(grade) === index)
      .sort();
    return grades;
  }, [availableStudents]);

  // Filter available students (exclude already assigned)
  const filteredAvailableStudents = useMemo(() => {
    const assignedStudentIds = new Set(assignedStudents.map(a => a.student_id));
    
    return availableStudents.filter(student => {
      const isNotAssigned = !assignedStudentIds.has(student.id);
      const matchesSchool = filterSchool === 'all' || student.school_id === filterSchool;
      
      return isNotAssigned && matchesSchool;
    });
  }, [availableStudents, assignedStudents, filterSchool]);

  // Assignment mutation
  const assignMutation = useMutation({
    mutationFn: async (studentIds: string[]) => {
      if (!license || !user?.id) throw new Error('Missing license or user information');

      const results = await EntityLicenseService.bulkAssignLicenses(
        license.id,
        studentIds,
        user.id
      );

      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries(['available-students']);
      queryClient.invalidateQueries(['assigned-students']);
      queryClient.invalidateQueries(['entity-licenses']);

      if (results.successful > 0) {
        toast.success(`Successfully assigned license to ${results.successful} student(s)`);
      }

      if (results.failed > 0) {
        toast.warning(`Failed to assign to ${results.failed} student(s). Check individual errors.`);
        results.errors.forEach(error => {
          console.warn('Assignment error:', error);
        });
      }

      setSelectedStudents([]);
      onSuccess?.();
    },
    onError: (error) => {
      console.error('Bulk assignment error:', error);
      toast.error('Failed to assign licenses. Please try again.');
    }
  });

  // Revocation mutation
  const revokeMutation = useMutation({
    mutationFn: async (assignments: StudentLicenseAssignment[]) => {
      if (!license) throw new Error('Missing license information');

      const results = {
        successful: 0,
        failed: 0,
        errors: [] as string[]
      };

      for (const assignment of assignments) {
        try {
          const result = await EntityLicenseService.revokeLicenseFromStudent(
            license.id,
            assignment.student_id
          );

          if (result.success) {
            results.successful++;
          } else {
            results.failed++;
            results.errors.push(`${assignment.student_name}: ${result.error || result.message}`);
          }
        } catch (error) {
          results.failed++;
          results.errors.push(`${assignment.student_name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries(['available-students']);
      queryClient.invalidateQueries(['assigned-students']);
      queryClient.invalidateQueries(['entity-licenses']);

      if (results.successful > 0) {
        toast.success(`Successfully revoked license from ${results.successful} student(s)`);
      }

      if (results.failed > 0) {
        toast.warning(`Failed to revoke from ${results.failed} student(s). Check individual errors.`);
      }

      setShowConfirmDialog(false);
      setStudentsToRevoke([]);
      onSuccess?.();
    },
    onError: (error) => {
      console.error('Bulk revocation error:', error);
      toast.error('Failed to revoke licenses. Please try again.');
      setShowConfirmDialog(false);
      setStudentsToRevoke([]);
    }
  });

  // Handle assignment
  const handleAssignLicenses = () => {
    if (!canAssignLicense) {
      toast.error('You do not have permission to assign licenses');
      return;
    }

    if (selectedStudents.length === 0) {
      toast.error('Please select at least one student');
      return;
    }

    if (!license || license.available_quantity < selectedStudents.length) {
      toast.error('Not enough license capacity available');
      return;
    }

    assignMutation.mutate(selectedStudents);
  };

  // Handle revocation
  const handleRevokeLicenses = (assignments: StudentLicenseAssignment[]) => {
    if (!canRevokeLicense) {
      toast.error('You do not have permission to revoke licenses');
      return;
    }

    setStudentsToRevoke(assignments);
    setShowConfirmDialog(true);
  };

  const confirmRevocation = () => {
    revokeMutation.mutate(studentsToRevoke);
  };

  // Helper function to get status badge styling
  const getStatusBadge = (status: string, expiresAt: string) => {
    const expiryDate = new Date(expiresAt);
    const isExpired = expiryDate < new Date();

    if (isExpired) {
      return {
        color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700',
        icon: XCircle,
        text: 'Expired'
      };
    }

    switch (status) {
      case 'ASSIGNED_PENDING_ACTIVATION':
        return {
          color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700',
          icon: Clock,
          text: 'Pending Activation'
        };
      case 'CONSUMED_ACTIVATED':
        return {
          color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700',
          icon: CheckCircle,
          text: 'Activated'
        };
      case 'REVOKED':
        return {
          color: 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700',
          icon: XCircle,
          text: 'Revoked'
        };
      default:
        return {
          color: 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700',
          icon: AlertTriangle,
          text: status
        };
    }
  };

  // Columns for assigned students table
  const assignedStudentsColumns = [
    {
      id: 'student_info',
      header: 'Student',
      cell: (row: StudentLicenseAssignment) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
            <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-white">
              {row.student_name}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Mail className="w-3 h-3" />
              {row.student_email}
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'student_code',
      header: 'Student Code',
      cell: (row: StudentLicenseAssignment) => (
        <span className="font-mono text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
          {row.student_code || 'N/A'}
        </span>
      )
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row: StudentLicenseAssignment) => {
        const badge = getStatusBadge(row.status, row.expires_at);
        const Icon = badge.icon;
        return (
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${badge.color}`}>
            <Icon className="w-3.5 h-3.5" />
            {badge.text}
          </div>
        );
      }
    },
    {
      id: 'location',
      header: 'Location',
      cell: (row: StudentLicenseAssignment) => (
        <div className="text-sm">
          <div className="flex items-center gap-1 text-gray-900 dark:text-white">
            <School className="w-3 h-3" />
            {row.school_name}
          </div>
          {row.branch_name && (
            <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
              <MapPin className="w-3 h-3" />
              {row.branch_name}
            </div>
          )}
        </div>
      )
    },
    {
      id: 'assigned_at',
      header: 'Assigned',
      cell: (row: StudentLicenseAssignment) => (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {new Date(row.assigned_at).toLocaleDateString()}
          </div>
        </div>
      )
    },
    {
      id: 'expires_at',
      header: 'Expires',
      cell: (row: StudentLicenseAssignment) => {
        const expiryDate = new Date(row.expires_at);
        const isExpired = expiryDate < new Date();
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

        return (
          <div className="text-sm">
            <div className={`flex items-center gap-1 ${
              isExpired ? 'text-red-600 dark:text-red-400' : 
              daysUntilExpiry <= 30 ? 'text-amber-600 dark:text-amber-400' : 
              'text-gray-600 dark:text-gray-400'
            }`}>
              <Clock className="w-3 h-3" />
              {expiryDate.toLocaleDateString()}
            </div>
            {isExpired && (
              <div className="text-xs text-red-500">Expired</div>
            )}
            {!isExpired && daysUntilExpiry <= 30 && (
              <div className="text-xs text-amber-500">{daysUntilExpiry} days left</div>
            )}
          </div>
        );
      }
    }
  ];

  if (!license) return null;

  return (
    <>
      <SlideInForm
        title={`Manage License: ${license.subject_name}`}
        isOpen={isOpen}
        onClose={onClose}
        onSave={activeTab === 'assign' ? handleAssignLicenses : undefined}
        saveButtonText={activeTab === 'assign' ? `Assign to ${selectedStudents.length} Student(s)` : undefined}
        loading={assignMutation.isLoading || revokeMutation.isLoading}
        width="xl"
        footerContent={
          activeTab === 'manage' && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {assignedStudents.length} student(s) currently assigned
            </div>
          )
        }
      >
        <div className="space-y-6">
          {/* License Information */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                License Details
              </h3>
              <StatusBadge 
                status={license.is_expired ? 'expired' : 'active'} 
                size="sm"
              />
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-blue-700 dark:text-blue-300 font-medium">Subject:</span>
                <div className="text-blue-900 dark:text-blue-100">{license.subject_name}</div>
              </div>
              <div>
                <span className="text-blue-700 dark:text-blue-300 font-medium">Program:</span>
                <div className="text-blue-900 dark:text-blue-100">{license.program_name}</div>
              </div>
              <div>
                <span className="text-blue-700 dark:text-blue-300 font-medium">Provider:</span>
                <div className="text-blue-900 dark:text-blue-100">{license.provider_name}</div>
              </div>
              <div>
                <span className="text-blue-700 dark:text-blue-300 font-medium">Region:</span>
                <div className="text-blue-900 dark:text-blue-100">{license.region_name}</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-blue-200 dark:border-blue-700">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {license.total_quantity}
                </div>
                <div className="text-xs text-blue-700 dark:text-blue-300">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {license.used_quantity}
                </div>
                <div className="text-xs text-green-700 dark:text-green-300">Used</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {license.available_quantity}
                </div>
                <div className="text-xs text-orange-700 dark:text-orange-300">Available</div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('assign')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'assign'
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <UserPlus className="w-4 h-4 inline mr-2" />
              Assign Students ({license.available_quantity} available)
            </button>
            <button
              onClick={() => setActiveTab('manage')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'manage'
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Manage Assigned ({assignedStudents.length})
            </button>
          </div>

          {/* Assign Students Tab */}
          {activeTab === 'assign' && (
            <div className="space-y-4">
              {!canAssignLicense && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3">
                  <div className="flex items-center">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mr-2" />
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      You do not have permission to assign licenses
                    </p>
                  </div>
                </div>
              )}

              {license.available_quantity === 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3">
                  <div className="flex items-center">
                    <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 mr-2" />
                    <p className="text-sm text-red-700 dark:text-red-300">
                      This license has no available capacity. All {license.total_quantity} licenses are currently assigned.
                    </p>
                  </div>
                </div>
              )}

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField id="search" label="Search Students">
                  <Input
                    id="search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name, email, or code..."
                    leftIcon={<Search className="h-4 w-4" />}
                  />
                </FormField>

                {availableGrades.length > 0 && (
                  <FormField id="grade" label="Grade Level">
                    <Select
                      id="grade"
                      value={filterGrade}
                      onChange={setFilterGrade}
                      options={[
                        { value: 'all', label: 'All Grades' },
                        ...availableGrades.map(grade => ({ value: grade, label: `Grade ${grade}` }))
                      ]}
                    />
                  </FormField>
                )}

                {availableSchools.length > 0 && (
                  <FormField id="school" label="School">
                    <Select
                      id="school"
                      value={filterSchool}
                      onChange={setFilterSchool}
                      options={[
                        { value: 'all', label: 'All Schools' },
                        ...availableSchools.map(school => ({ value: school.id, label: school.name }))
                      ]}
                    />
                  </FormField>
                )}
              </div>

              {/* Student Selection */}
              <div>
                <SearchableMultiSelect
                  label="Select Students to Assign"
                  options={filteredAvailableStudents.map(student => ({
                    value: student.id,
                    label: `${student.name} (${student.student_code || 'No Code'}) - ${student.school_name}`
                  }))}
                  selectedValues={selectedStudents}
                  onChange={setSelectedStudents}
                  placeholder="Search and select students..."
                  disabled={!canAssignLicense || license.available_quantity === 0 || isLoadingStudents}
                />
                
                {selectedStudents.length > 0 && (
                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {selectedStudents.length} student(s) selected for assignment
                    {selectedStudents.length > license.available_quantity && (
                      <span className="text-red-600 dark:text-red-400 ml-2">
                        (Exceeds available capacity by {selectedStudents.length - license.available_quantity})
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Manage Assigned Students Tab */}
          {activeTab === 'manage' && (
            <div className="space-y-4">
              {/* Status Legend */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Status Legend
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full border bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700">
                      <Clock className="w-3 h-3" />
                      <span className="font-medium">Pending</span>
                    </div>
                    <span className="text-gray-600 dark:text-gray-400">Awaiting activation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full border bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700">
                      <CheckCircle className="w-3 h-3" />
                      <span className="font-medium">Activated</span>
                    </div>
                    <span className="text-gray-600 dark:text-gray-400">In use</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full border bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700">
                      <XCircle className="w-3 h-3" />
                      <span className="font-medium">Expired</span>
                    </div>
                    <span className="text-gray-600 dark:text-gray-400">Past validity</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full border bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700">
                      <XCircle className="w-3 h-3" />
                      <span className="font-medium">Revoked</span>
                    </div>
                    <span className="text-gray-600 dark:text-gray-400">Removed</span>
                  </div>
                </div>
              </div>

              {!canRevokeLicense && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3">
                  <div className="flex items-center">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mr-2" />
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      You can view assigned students but cannot revoke licenses
                    </p>
                  </div>
                </div>
              )}

              {isLoadingAssigned ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <span className="ml-2 text-gray-600 dark:text-gray-400">Loading assigned students...</span>
                </div>
              ) : assignedStudents.length === 0 ? (
                <div className="text-center p-8 text-gray-500 dark:text-gray-400">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium mb-2">No Students Assigned</h3>
                  <p className="text-sm">
                    No students have been assigned to this license yet.
                  </p>
                </div>
              ) : (
                <DataTable
                  data={assignedStudents}
                  columns={assignedStudentsColumns}
                  keyField="id"
                  emptyMessage="No assigned students found"
                  onDelete={canRevokeLicense ? handleRevokeLicenses : undefined}
                  renderActions={canRevokeLicense ? (row) => (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRevokeLicenses([row])}
                      leftIcon={<UserMinus className="h-3 w-3" />}
                      className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                    >
                      Revoke
                    </Button>
                  ) : undefined}
                />
              )}
            </div>
          )}
        </div>
      </SlideInForm>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showConfirmDialog}
        title="Revoke License Access"
        message={`Are you sure you want to revoke license access from ${studentsToRevoke.length} student(s)? This will immediately remove their access to the licensed content.`}
        confirmText="Revoke Access"
        cancelText="Cancel"
        confirmVariant="destructive"
        onConfirm={confirmRevocation}
        onCancel={() => {
          setShowConfirmDialog(false);
          setStudentsToRevoke([]);
        }}
      />
    </>
  );
}