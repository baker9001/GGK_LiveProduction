/**
 * File: /src/app/entity-module/organisation/tabs/teachers/page.tsx
 * 
 * Teachers Management Tab Component (Placeholder)
 * To be implemented with full teacher management functionality
 * 
 * Dependencies:
 *   - @/lib/supabase
 *   - @/contexts/UserContext
 *   - External: react, lucide-react
 */

'use client';

import React from 'react';
import { Users, Award, Calendar, BookOpen, Clock, Briefcase } from 'lucide-react';
/**
 * Enhanced Teachers Tab with Scope-Based Access Control
 * Teachers will be filtered based on user's assigned schools/branches
 */

'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, Award, Calendar, BookOpen, Clock, Briefcase, 
  Plus, Search, Filter, AlertTriangle, Info, CheckCircle2
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../../../lib/supabase';
import { useUser } from '../../../../../contexts/UserContext';
import { usePermissions } from '../../../../../contexts/PermissionContext';
import { useScopeFilter } from '../../../../../hooks/useScopeFilter';
import { FormField, Input, Select } from '../../../../../components/shared/FormField';
import { Button } from '../../../../../components/shared/Button';
import { StatusBadge } from '../../../../../components/shared/StatusBadge';

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
  school_name?: string;
  branch_name?: string;
}

export interface TeachersTabProps {
  companyId: string;
  refreshData?: () => void;
}

export default function TeachersTab({ companyId, refreshData }: TeachersTabProps) {
  const { user } = useUser();
  const { canCreate, canModify, adminLevel } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterSchool, setFilterSchool] = useState<string>('all');

  // Fetch teachers data
  const { data: teachers = [], isLoading } = useQuery(
    ['teachers', companyId, searchTerm, filterStatus, filterSchool],
    async () => {
      // Get all schools for this company first to filter teachers
      const { data: schoolsData, error: schoolsError } = await supabase
        .from('schools')
        .select('id, name')
        .eq('company_id', companyId);
      
      if (schoolsError) throw schoolsError;
      
      const schoolIds = schoolsData?.map(s => s.id) || [];
      
      if (schoolIds.length === 0) return [];
      
      // Build query for teachers
      let query = supabase
        .from('teachers')
        .select(`
          *,
          users!teachers_user_id_fkey (
            id,
            email,
            is_active,
            raw_user_meta_data
          ),
          schools (
            id,
            name
          ),
          branches (
            id,
            name
          )
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filterSchool !== 'all') {
        query = query.eq('school_id', filterSchool);
      }

      if (searchTerm) {
        query = query.or(`teacher_code.ilike.%${searchTerm}%,users.email.ilike.%${searchTerm}%`);
      }

      const { data: teachersData, error: teachersError } = await query;
      
      if (teachersError) throw teachersError;
      
      // Transform data
      return (teachersData || []).map(teacher => ({
        ...teacher,
        name: teacher.users?.raw_user_meta_data?.name || teacher.users?.email?.split('@')[0] || 'Unknown',
        email: teacher.users?.email || '',
        is_active: teacher.users?.is_active ?? true,
        school_name: teacher.schools?.name || 'No School',
        branch_name: teacher.branches?.name || 'No Branch'
      }));
    },
    {
      enabled: !!companyId,
      staleTime: 60 * 1000
    }
  );

  // Fetch schools for filter dropdown
  const { data: schools = [] } = useQuery(
    ['schools-for-teachers', companyId],
    async () => {
      const { data, error } = await supabase
        .from('schools')
        .select('id, name')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
    { enabled: !!companyId }
  );

  // Apply scope filtering to teachers
  const { 
    filteredData: accessibleTeachers, 
    hasAccess: hasTeacherAccess, 
    canAccessAll,
    scopeInfo
  } = useScopeFilter(teachers, { 
    entityType: 'school', // Teachers are filtered by school access
    companyId, 
    requireActiveStatus: true 
  });

  // Filter teachers based on search and status
  const displayedTeachers = accessibleTeachers.filter(teacher => {
    const matchesSearch = !searchTerm || 
      teacher.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.teacher_code?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && teacher.is_active) ||
      (filterStatus === 'inactive' && !teacher.is_active);
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* Header & Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search teachers..."
                className="pl-10"
              />
            </div>
            <Select
              value={filterSchool}
              onChange={(value) => setFilterSchool(value)}
              options={[
                { value: 'all', label: 'All Schools' },
                ...schools.map(s => ({ value: s.id, label: s.name }))
              ]}
            />
            <Select
              value={filterStatus}
              onChange={(value) => setFilterStatus(value as 'all' | 'active' | 'inactive')}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' }
              ]}
            />
          </div>
          {canCreate('teacher') && (
            <Button onClick={() => console.log('Create teacher - TODO')}>
              <Plus className="w-4 h-4 mr-2" />
              Add Teacher
            </Button>
          )}
        </div>

        {/* Access Control Notices */}
        {!canCreate('teacher') && (
          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
            <div className="flex items-center">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mr-2" />
              <p className="text-sm text-amber-700 dark:text-amber-300">
                You don't have permission to create teachers.
              </p>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <Calendar className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
              Schedule Management
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Track classes and timetables
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <Award className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
              Performance Tracking
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Monitor teaching effectiveness
            </p>
          </div>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-4">
          <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 mb-2">
            <Clock className="w-5 h-5" />
            <span className="font-semibold">In Development</span>
          </div>
          <p className="text-sm text-purple-600 dark:text-purple-400">
            This feature is currently under development and will include:
          </p>
          <ul className="mt-2 text-sm text-purple-600 dark:text-purple-400 text-left list-disc list-inside">
            <li>Teacher registration and onboarding</li>
            <li>Qualification and certification tracking</li>
            <li>Class assignments and schedules</li>
            <li>Attendance monitoring</li>
            <li>Performance evaluations</li>
            <li>Professional development tracking</li>
            <li>Leave management</li>
            <li>Payroll integration</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
