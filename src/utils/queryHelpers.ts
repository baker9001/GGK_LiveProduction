// src/utils/queryHelpers.ts
/**
 * Query Helper Utilities for Students and Teachers
 * 
 * COMPLETE UPDATED VERSION: Works with current database schema
 * 
 * Fixes Applied:
 * 1. Queries filter active status through users table relationships
 * 2. Proper error handling and data transformation
 * 3. Flexible filtering and search capabilities
 * 4. Scope-aware query building
 * 
 * Usage:
 *   import { queryActiveStudents, queryActiveTeachers } from '@/utils/queryHelpers';
 */

import { supabase } from '../lib/supabase';

// Type definitions
interface QueryFilters {
  school_ids?: string[];
  branch_ids?: string[];
  grade_level?: string;
  specialization?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

interface StudentRecord {
  id: string;
  user_id: string;
  student_code?: string;
  name?: string;
  email: string;
  grade_level?: string;
  section?: string;
  admission_date?: string;
  company_id: string;
  school_id?: string;
  branch_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  school_name?: string;
  branch_name?: string;
  user_data?: any;
}

interface TeacherRecord {
  id: string;
  user_id: string;
  teacher_code?: string;
  name?: string;
  email: string;
  specialization?: string[];
  qualification?: string;
  experience_years?: number;
  company_id: string;
  school_id?: string;
  branch_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  school_name?: string;
  branch_name?: string;
  user_data?: any;
}

/**
 * Query active students with proper scope filtering
 * FIXED: Works with current schema by filtering through users table
 */
export const queryActiveStudents = async (
  companyId: string, 
  filters: QueryFilters = {}
): Promise<StudentRecord[]> => {
  try {
    if (!companyId) {
      throw new Error('Company ID is required');
    }

    let query = supabase
      .from('students')
      .select(`
        id,
        user_id,
        student_code,
        grade_level,
        section,
        admission_date,
        company_id,
        school_id,
        branch_id,
        created_at,
        updated_at,
        users!students_user_id_fkey (
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
      .eq('users.is_active', true)  // FIXED: Filter active through users table
      .order('created_at', { ascending: false });

    // Apply school/branch filters
    if (filters.school_ids && filters.school_ids.length > 0) {
      if (filters.branch_ids && filters.branch_ids.length > 0) {
        // OR condition for both schools and branches
        const orConditions = [
          `school_id.in.(${filters.school_ids.join(',')})`,
          `branch_id.in.(${filters.branch_ids.join(',')})`
        ];
        query = query.or(orConditions.join(','));
      } else {
        query = query.in('school_id', filters.school_ids);
      }
    } else if (filters.branch_ids && filters.branch_ids.length > 0) {
      query = query.in('branch_id', filters.branch_ids);
    }

    // Apply additional filters
    if (filters.grade_level) {
      query = query.eq('grade_level', filters.grade_level);
    }

    if (filters.search) {
      const searchTerm = filters.search.trim();
      query = query.or(`student_code.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%,users.email.ilike.%${searchTerm}%`);
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Students query error:', error);
      throw new Error(`Failed to fetch students: ${error.message}`);
    }

    // FIXED: Transform and enrich the data - name derived from users table
    return (data || []).map(student => ({
      ...student,
      name: student.users?.raw_user_meta_data?.name || 
            student.users?.email?.split('@')[0] || 
            'Unknown Student',
      email: student.users?.email || '',
      is_active: student.users?.is_active || false,
      school_name: student.schools?.name || 'No School Assigned',
      branch_name: student.branches?.name || 'No Branch Assigned',
      user_data: student.users
    })) as StudentRecord[];

  } catch (error) {
    console.error('Error in queryActiveStudents:', error);
    throw error;
  }
};

/**
 * Query active teachers with proper scope filtering
 * FIXED: Works with current schema by filtering through users table
 */
export const queryActiveTeachers = async (
  companyId: string, 
  filters: QueryFilters = {}
): Promise<TeacherRecord[]> => {
  try {
    if (!companyId) {
      throw new Error('Company ID is required');
    }

    let query = supabase
      .from('teachers')
      .select(`
        id,
        user_id,
        teacher_code,
        specialization,
        qualification,
        experience_years,
        bio,
        company_id,
        school_id,
        branch_id,
        hire_date,
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
      .eq('users.is_active', true)  // FIXED: Filter active through users table
      .order('created_at', { ascending: false });

    // Apply school/branch filters
    if (filters.school_ids && filters.school_ids.length > 0) {
      if (filters.branch_ids && filters.branch_ids.length > 0) {
        // OR condition for both schools and branches
        const orConditions = [
          `school_id.in.(${filters.school_ids.join(',')})`,
          `branch_id.in.(${filters.branch_ids.join(',')})`
        ];
        query = query.or(orConditions.join(','));
      } else {
        query = query.in('school_id', filters.school_ids);
      }
    } else if (filters.branch_ids && filters.branch_ids.length > 0) {
      query = query.in('branch_id', filters.branch_ids);
    }

    // Apply additional filters
    if (filters.specialization) {
      query = query.contains('specialization', [filters.specialization]);
    }

    if (filters.search) {
      const searchTerm = filters.search.trim();
      query = query.or(`teacher_code.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%,users.email.ilike.%${searchTerm}%`);
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Teachers query error:', error);
      throw new Error(`Failed to fetch teachers: ${error.message}`);
    }

    // FIXED: Transform and enrich the data - name derived from users table
    return (data || []).map(teacher => ({
      ...teacher,
      name: teacher.users?.raw_user_meta_data?.name || 
            teacher.users?.email?.split('@')[0] || 
            'Unknown Teacher',
      email: teacher.users?.email || '',
      is_active: teacher.users?.is_active || false,
      school_name: teacher.schools?.name || 'No School Assigned',
      branch_name: teacher.branches?.name || 'No Branch Assigned',
      user_data: teacher.users
    })) as TeacherRecord[];

  } catch (error) {
    console.error('Error in queryActiveTeachers:', error);
    throw error;
  }
};

/**
 * Get scope filters compatible with current schema
 * FIXED: Returns filters that work with the helper query functions
 */
export const getScopeFiltersForQueries = (
  userScope: any,
  resourceType?: 'schools' | 'branches' | 'users' | 'teachers' | 'students'
): QueryFilters => {
  if (!userScope) return {};

  const { adminLevel, companyId, schoolIds, branchIds } = userScope;

  // Entity admin and sub-entity admin see everything in their company
  if (adminLevel === 'entity_admin' || adminLevel === 'sub_entity_admin') {
    return {}; // No additional filters needed - company_id is handled in queries
  }

  // School admin sees their assigned schools and their branches
  if (adminLevel === 'school_admin' && schoolIds && schoolIds.length > 0) {
    return {
      school_ids: schoolIds,
      branch_ids: branchIds && branchIds.length > 0 ? branchIds : []
    };
  }

  // Branch admin sees only their assigned branches
  if (adminLevel === 'branch_admin' && branchIds && branchIds.length > 0) {
    return {
      branch_ids: branchIds
    };
  }

  // Default: no access (will return empty results)
  return { school_ids: [], branch_ids: [] };
};

/**
 * React Query hook factory for students
 */
export const useStudentsQuery = (companyId: string, userScope: any, additionalFilters: QueryFilters = {}) => {
  return {
    queryKey: ['students', companyId, userScope?.userId, additionalFilters],
    queryFn: async () => {
      const scopeFilters = getScopeFiltersForQueries(userScope, 'students');
      const combinedFilters = { ...scopeFilters, ...additionalFilters };
      return await queryActiveStudents(companyId, combinedFilters);
    },
    enabled: !!companyId && !!userScope,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: (failureCount: number, error: any) => {
      if (error.message.includes('permission')) return false;
      return failureCount < 2;
    }
  };
};

/**
 * React Query hook factory for teachers
 */
export const useTeachersQuery = (companyId: string, userScope: any, additionalFilters: QueryFilters = {}) => {
  return {
    queryKey: ['teachers', companyId, userScope?.userId, additionalFilters],
    queryFn: async () => {
      const scopeFilters = getScopeFiltersForQueries(userScope, 'teachers');
      const combinedFilters = { ...scopeFilters, ...additionalFilters };
      return await queryActiveTeachers(companyId, combinedFilters);
    },
    enabled: !!companyId && !!userScope,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: (failureCount: number, error: any) => {
      if (error.message.includes('permission')) return false;
      return failureCount < 2;
    }
  };
};

/**
 * Get available schools for filter dropdowns
 */
export const queryAvailableSchools = async (companyId: string, scopeFilters: QueryFilters = {}) => {
  try {
    let query = supabase
      .from('schools')
      .select('id, name, status')
      .eq('company_id', companyId)
      .eq('status', 'active')
      .order('name');

    // Apply scope filtering if provided
    if (scopeFilters.school_ids && scopeFilters.school_ids.length > 0) {
      query = query.in('id', scopeFilters.school_ids);
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Schools query error:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching available schools:', error);
    return [];
  }
};

/**
 * Count students/teachers for dashboard statistics
 */
export const getEntityCounts = async (companyId: string, scopeFilters: QueryFilters = {}) => {
  try {
    const [studentsData, teachersData] = await Promise.all([
      queryActiveStudents(companyId, scopeFilters),
      queryActiveTeachers(companyId, scopeFilters)
    ]);

    const students = studentsData || [];
    const teachers = teachersData || [];

    return {
      students: {
        total: students.length,
        active: students.filter(s => s.is_active).length,
        byGrade: students.reduce((acc, student) => {
          const grade = student.grade_level || 'Unknown';
          acc[grade] = (acc[grade] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      },
      teachers: {
        total: teachers.length,
        active: teachers.filter(t => t.is_active).length,
        withSpecialization: teachers.filter(t => t.specialization && t.specialization.length > 0).length
      }
    };
  } catch (error) {
    console.error('Error getting entity counts:', error);
    return {
      students: { total: 0, active: 0, byGrade: {} },
      teachers: { total: 0, active: 0, withSpecialization: 0 }
    };
  }
};

/**
 * Example usage in components:
 * 
 * // In TeachersTab:
 * const { data: teachers = [], isLoading, error } = useQuery(
 *   useTeachersQuery(companyId, getUserContext(), {
 *     search: searchTerm,
 *     specialization: filterSpecialization !== 'all' ? filterSpecialization : undefined
 *   })
 * );
 * 
 * // In StudentsTab:
 * const { data: students = [], isLoading, error } = useQuery(
 *   useStudentsQuery(companyId, getUserContext(), {
 *     search: searchTerm,
 *     grade_level: filterGrade !== 'all' ? filterGrade : undefined
 *   })
 * );
 */

export default {
  queryActiveStudents,
  queryActiveTeachers,
  getScopeFiltersForQueries,
  useStudentsQuery,
  useTeachersQuery,
  queryAvailableSchools,
  getEntityCounts
};