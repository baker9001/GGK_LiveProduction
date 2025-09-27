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

    // First, get students data
    let studentsQuery = supabase
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

    // Apply school/branch filters
    if (filters.school_ids && filters.school_ids.length > 0) {
      if (filters.branch_ids && filters.branch_ids.length > 0) {
        // OR condition for both schools and branches
        const orConditions = [
          `school_id.in.(${filters.school_ids.join(',')})`,
          `branch_id.in.(${filters.branch_ids.join(',')})`
        ];
        studentsQuery = studentsQuery.or(orConditions.join(','));
      } else {
        studentsQuery = studentsQuery.in('school_id', filters.school_ids);
      }
    } else if (filters.branch_ids && filters.branch_ids.length > 0) {
      studentsQuery = studentsQuery.in('branch_id', filters.branch_ids);
    }

    // Apply additional filters
    if (filters.grade_level) {
      studentsQuery = studentsQuery.eq('grade_level', filters.grade_level);
    }

    if (filters.limit) {
      studentsQuery = studentsQuery.limit(filters.limit);
    }

    if (filters.offset) {
      studentsQuery = studentsQuery.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    const { data: studentsData, error: studentsError } = await studentsQuery;

    if (studentsError) {
      console.error('Students query error:', studentsError);
      throw new Error(`Failed to fetch students: ${studentsError.message}`);
    }

    if (!studentsData) {
      return [];
    }

    // Get user IDs from students
    const userIds = studentsData.map(s => s.user_id).filter(Boolean);
    
    // Fetch users data separately
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, email, is_active, raw_user_meta_data, last_login_at')
      .in('id', userIds)
      .eq('is_active', true);

    if (usersError) {
      console.error('Users query error:', usersError);
      throw new Error(`Failed to fetch user data: ${usersError.message}`);
    }

    // Create a map of users by ID for quick lookup
    const usersMap = new Map();
    (usersData || []).forEach(user => {
      usersMap.set(user.id, user);
    });

    // Filter students to only include those with active users
    const studentsWithActiveUsers = studentsData.filter(student => 
      student.user_id && usersMap.has(student.user_id)
    );

    // Apply search filter after getting user data
    let filteredStudents = studentsWithActiveUsers;
    if (filters.search) {
      const searchTerm = filters.search.trim().toLowerCase();
      filteredStudents = studentsWithActiveUsers.filter(student => {
        const userData = usersMap.get(student.user_id);
        const name = userData?.raw_user_meta_data?.name || userData?.email?.split('@')[0] || '';
        const email = userData?.email || '';
        
        return (
          student.student_code?.toLowerCase().includes(searchTerm) ||
          name.toLowerCase().includes(searchTerm) ||
          email.toLowerCase().includes(searchTerm)
        );
      });
    }

    // Transform and enrich the data
    return filteredStudents.map(student => {
      const userData = usersMap.get(student.user_id);
      return {
      ...student,
      name: userData?.raw_user_meta_data?.name || 
            userData?.email?.split('@')[0] || 
            'Unknown Student',
      email: userData?.email || '',
      is_active: userData?.is_active || false,
      school_name: student.schools?.name || 'No School Assigned',
      branch_name: student.branches?.name || 'No Branch Assigned',
      user_data: userData
      };
    }) as StudentRecord[];

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

    // First, get teachers data
    let teachersQuery = supabase
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
        hire_date,
        created_at,
        updated_at,
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

    // Apply school/branch filters
    if (filters.school_ids && filters.school_ids.length > 0) {
      if (filters.branch_ids && filters.branch_ids.length > 0) {
        // OR condition for both schools and branches
        const orConditions = [
          `school_id.in.(${filters.school_ids.join(',')})`,
          `branch_id.in.(${filters.branch_ids.join(',')})`
        ];
        teachersQuery = teachersQuery.or(orConditions.join(','));
      } else {
        teachersQuery = teachersQuery.in('school_id', filters.school_ids);
      }
    } else if (filters.branch_ids && filters.branch_ids.length > 0) {
      teachersQuery = teachersQuery.in('branch_id', filters.branch_ids);
    }

    // Apply additional filters
    if (filters.specialization) {
      teachersQuery = teachersQuery.contains('specialization', [filters.specialization]);
    }

    if (filters.limit) {
      teachersQuery = teachersQuery.limit(filters.limit);
    }

    if (filters.offset) {
      teachersQuery = teachersQuery.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    const { data: teachersData, error: teachersError } = await teachersQuery;

    if (teachersError) {
      console.error('Teachers query error:', teachersError);
      throw new Error(`Failed to fetch teachers: ${teachersError.message}`);
    }

    if (!teachersData) {
      return [];
    }

    // Get user IDs from teachers
    const userIds = teachersData.map(t => t.user_id).filter(Boolean);
    
    // Fetch users data separately
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, email, is_active, raw_user_meta_data, last_login_at')
      .in('id', userIds)
      .eq('is_active', true);

    if (usersError) {
      console.error('Users query error:', usersError);
      throw new Error(`Failed to fetch user data: ${usersError.message}`);
    }

    // Create a map of users by ID for quick lookup
    const usersMap = new Map();
    (usersData || []).forEach(user => {
      usersMap.set(user.id, user);
    });

    // Filter teachers to only include those with active users
    const teachersWithActiveUsers = teachersData.filter(teacher => 
      teacher.user_id && usersMap.has(teacher.user_id)
    );

    // Apply search filter after getting user data
    let filteredTeachers = teachersWithActiveUsers;
    if (filters.search) {
      const searchTerm = filters.search.trim().toLowerCase();
      filteredTeachers = teachersWithActiveUsers.filter(teacher => {
        const userData = usersMap.get(teacher.user_id);
        const name = userData?.raw_user_meta_data?.name || userData?.email?.split('@')[0] || '';
        const email = userData?.email || '';
        
        return (
          teacher.teacher_code?.toLowerCase().includes(searchTerm) ||
          name.toLowerCase().includes(searchTerm) ||
          email.toLowerCase().includes(searchTerm)
        );
      });
    }

    // Transform and enrich the data
    return filteredTeachers.map(teacher => {
      const userData = usersMap.get(teacher.user_id);
      return {
      ...teacher,
      name: userData?.raw_user_meta_data?.name || 
            userData?.email?.split('@')[0] || 
            'Unknown Teacher',
      email: userData?.email || '',
      is_active: userData?.is_active || false,
      school_name: teacher.schools?.name || 'No School Assigned',
      branch_name: teacher.branches?.name || 'No Branch Assigned',
      user_data: userData
      };
    }) as TeacherRecord[];

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