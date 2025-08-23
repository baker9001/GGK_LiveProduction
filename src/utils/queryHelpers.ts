// FIXED: Updated query functions without non-existent columns

// src/utils/queryHelpers.ts - UPDATED VERSION
/**
 * Query Helper Utilities - FIXED VERSION
 * 
 * Fixes Applied:
 * 1. Removed 'name' column from teachers and students queries (doesn't exist in DB)
 * 2. Names are derived from users.raw_user_meta_data.name
 * 3. Proper error handling for missing columns
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

/**
 * Query active students - FIXED VERSION
 * REMOVED: name column (doesn't exist in students table)
 */
export const queryActiveStudents = async (
  companyId: string, 
  filters: QueryFilters = {}
): Promise<any[]> => {
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
      .eq('users.is_active', true)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.school_ids && filters.school_ids.length > 0) {
      if (filters.branch_ids && filters.branch_ids.length > 0) {
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

    if (filters.grade_level) {
      query = query.eq('grade_level', filters.grade_level);
    }

    if (filters.search) {
      const searchTerm = filters.search.trim();
      query = query.or(`student_code.ilike.%${searchTerm}%,users.email.ilike.%${searchTerm}%`);
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

    // Transform and enrich the data
    return (data || []).map(student => ({
      ...student,
      // FIXED: Derive name from user metadata, not from students table
      name: student.users?.raw_user_meta_data?.name || 
            student.users?.email?.split('@')[0] || 
            'Unknown Student',
      email: student.users?.email || '',
      is_active: student.users?.is_active || false,
      school_name: student.schools?.name || 'No School Assigned',
      branch_name: student.branches?.name || 'No Branch Assigned',
      user_data: student.users
    }));

  } catch (error) {
    console.error('Error in queryActiveStudents:', error);
    throw error;
  }
};

/**
 * Query active teachers - FIXED VERSION  
 * REMOVED: name column (doesn't exist in teachers table)
 */
export const queryActiveTeachers = async (
  companyId: string, 
  filters: QueryFilters = {}
): Promise<any[]> => {
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
      .eq('users.is_active', true)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.school_ids && filters.school_ids.length > 0) {
      if (filters.branch_ids && filters.branch_ids.length > 0) {
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

    if (filters.specialization) {
      query = query.contains('specialization', [filters.specialization]);
    }

    if (filters.search) {
      const searchTerm = filters.search.trim();
      query = query.or(`teacher_code.ilike.%${searchTerm}%,users.email.ilike.%${searchTerm}%`);
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

    // Transform and enrich the data
    return (data || []).map(teacher => ({
      ...teacher,
      // FIXED: Derive name from user metadata, not from teachers table
      name: teacher.users?.raw_user_meta_data?.name || 
            teacher.users?.email?.split('@')[0] || 
            'Unknown Teacher',
      email: teacher.users?.email || '',
      is_active: teacher.users?.is_active || false,
      school_name: teacher.schools?.name || 'No School Assigned',
      branch_name: teacher.branches?.name || 'No Branch Assigned',
      user_data: teacher.users
    }));

  } catch (error) {
    console.error('Error in queryActiveTeachers:', error);
    throw error;
  }
};

// Update the TeachersTab query as well
export const getFixedTeachersQuery = (companyId: string, scopeFilters: any = {}) => {
  return async () => {
    try {
      if (!companyId) {
        throw new Error('Company ID is required');
      }

      // Base query without 'name' column
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
        .eq('users.is_active', true)
        .order('created_at', { ascending: false });

      // Apply scope-based filtering
      if (scopeFilters.school_ids && scopeFilters.school_ids.length > 0) {
        if (scopeFilters.branch_ids && scopeFilters.branch_ids.length > 0) {
          const orConditions = [
            `school_id.in.(${scopeFilters.school_ids.join(',')})`,
            `branch_id.in.(${scopeFilters.branch_ids.join(',')})`
          ];
          query = query.or(orConditions.join(','));
        } else {
          query = query.in('school_id', scopeFilters.school_ids);
        }
      } else if (scopeFilters.branch_ids && scopeFilters.branch_ids.length > 0) {
        query = query.in('branch_id', scopeFilters.branch_ids);
      }

      const { data: teachersData, error: teachersError } = await query;

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
        name: teacher.users?.raw_user_meta_data?.name || 
              teacher.users?.email?.split('@')[0] || 
              'Unknown Teacher',
        email: teacher.users?.email || '',
        is_active: teacher.users?.is_active ?? true,
        school_name: teacher.schools?.name || 'No School Assigned',
        branch_name: teacher.branches?.name || 'No Branch Assigned',
        user_data: teacher.users
      }));

    } catch (error) {
      console.error('Error fetching teachers:', error);
      throw error;
    }
  };
};

export default {
  queryActiveStudents,
  queryActiveTeachers,
  getFixedTeachersQuery
};