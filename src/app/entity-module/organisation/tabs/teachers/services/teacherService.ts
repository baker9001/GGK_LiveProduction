/**
 * File: /src/app/entity-module/organisation/tabs/teachers/services/teacherService.ts
 * 
 * Teacher Management Service
 * Handles CRUD operations for teachers with proper user creation
 */

import { supabase } from '@/lib/supabase';
import { userCreationService } from '@/services/userCreationService';

export interface TeacherData {
  id: string;
  user_id: string;
  teacher_code: string;
  name?: string;
  email?: string;
  specialization?: string[];
  qualification?: string;
  experience_years?: number;
  bio?: string;
  company_id: string;
  school_id?: string;
  branch_id?: string;
  hire_date?: string;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

interface CreateTeacherPayload {
  email: string;
  name: string;
  password: string;
  teacher_code: string;
  company_id: string;
  school_id?: string;
  branch_id?: string;
  specialization?: string[];
  qualification?: string;
  experience_years?: number;
  bio?: string;
  hire_date?: string;
  phone?: string;
  is_active?: boolean;
}

interface UpdateTeacherPayload {
  name?: string;
  password?: string;
  specialization?: string[];
  qualification?: string;
  experience_years?: number;
  bio?: string;
  school_id?: string;
  branch_id?: string;
  is_active?: boolean;
}

interface TeacherFilters {
  company_id?: string;
  school_id?: string;
  branch_id?: string;
  is_active?: boolean;
  search?: string;
  specialization?: string;
  limit?: number;
  offset?: number;
}

export const teacherService = {
  /**
   * Create a new teacher
   */
  async createTeacher(payload: CreateTeacherPayload): Promise<TeacherData> {
    try {
      // Validate required fields
      if (!payload.email || !payload.name || !payload.password) {
        throw new Error('Email, name, and password are required');
      }

      if (!payload.teacher_code) {
        throw new Error('Teacher code is required');
      }

      // Check if teacher code already exists
      const { data: existingCode } = await supabase
        .from('teachers')
        .select('id')
        .eq('teacher_code', payload.teacher_code)
        .maybeSingle();

      if (existingCode) {
        throw new Error('Teacher code already exists');
      }

      // Use userCreationService to create the teacher
      const { userId, entityId } = await userCreationService.createUser({
        user_type: 'teacher',
        email: payload.email,
        name: payload.name,
        password: payload.password,
        phone: payload.phone,
        company_id: payload.company_id,
        teacher_code: payload.teacher_code,
        specialization: payload.specialization,
        qualification: payload.qualification,
        experience_years: payload.experience_years,
        bio: payload.bio,
        hire_date: payload.hire_date,
        school_id: payload.school_id,
        branch_id: payload.branch_id,
        is_active: payload.is_active
      });

      // Fetch and return the created teacher
      const teacher = await this.getTeacherById(entityId);
      if (!teacher) {
        throw new Error('Failed to retrieve created teacher');
      }

      return teacher;
    } catch (error: any) {
      console.error('createTeacher error:', error);
      throw error instanceof Error ? error : new Error('Failed to create teacher');
    }
  },

  /**
   * Update an existing teacher
   */
  async updateTeacher(teacherId: string, payload: UpdateTeacherPayload): Promise<TeacherData> {
    try {
      // Fetch existing teacher
      const existingTeacher = await this.getTeacherById(teacherId);
      if (!existingTeacher) {
        throw new Error('Teacher not found');
      }

      // Update teacher record
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (payload.specialization !== undefined) updateData.specialization = payload.specialization;
      if (payload.qualification !== undefined) updateData.qualification = payload.qualification;
      if (payload.experience_years !== undefined) updateData.experience_years = payload.experience_years;
      if (payload.bio !== undefined) updateData.bio = payload.bio;
      if (payload.school_id !== undefined) updateData.school_id = payload.school_id;
      if (payload.branch_id !== undefined) updateData.branch_id = payload.branch_id;

      const { error: updateError } = await supabase
        .from('teachers')
        .update(updateData)
        .eq('id', teacherId);

      if (updateError) {
        throw new Error(`Failed to update teacher: ${updateError.message}`);
      }

      // Update user record if needed
      if (existingTeacher.user_id) {
        const userUpdateData: any = {
          updated_at: new Date().toISOString()
        };

        if (payload.name) {
          userUpdateData.raw_user_meta_data = { 
            ...(await this.getUserMetadata(existingTeacher.user_id)),
            name: payload.name 
          };
        }

        if (payload.is_active !== undefined) {
          userUpdateData.is_active = payload.is_active;
        }

        const { error: userError } = await supabase
          .from('users')
          .update(userUpdateData)
          .eq('id', existingTeacher.user_id);

        if (userError) {
          console.error('Failed to update user record:', userError);
        }

        // Update password if provided
        if (payload.password) {
          try {
            await userCreationService.updatePassword(existingTeacher.user_id, payload.password);
          } catch (passwordError) {
            console.error('Failed to update password:', passwordError);
          }
        }
      }

      const updatedTeacher = await this.getTeacherById(teacherId);
      if (!updatedTeacher) {
        throw new Error('Failed to retrieve updated teacher');
      }

      return updatedTeacher;
    } catch (error: any) {
      console.error('updateTeacher error:', error);
      throw error instanceof Error ? error : new Error('Failed to update teacher');
    }
  },

  /**
   * Get a single teacher by ID
   */
  async getTeacherById(teacherId: string): Promise<TeacherData | null> {
    try {
      const { data: teacher, error } = await supabase
        .from('teachers')
        .select(`
          *,
          users!teachers_user_id_fkey (
            id,
            email,
            phone,
            is_active,
            raw_user_meta_data,
            last_login_at
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
        .eq('id', teacherId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return this.transformTeacherData(teacher);
    } catch (error) {
      console.error('getTeacherById error:', error);
      return null;
    }
  },

  /**
   * List teachers with filters
   */
  async listTeachers(filters: TeacherFilters): Promise<TeacherData[]> {
    try {
      let query = supabase
        .from('teachers')
        .select(`
          *,
          users!teachers_user_id_fkey (
            id,
            email,
            phone,
            is_active,
            raw_user_meta_data,
            last_login_at
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
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.company_id) {
        query = query.eq('company_id', filters.company_id);
      }
      if (filters.school_id) {
        query = query.eq('school_id', filters.school_id);
      }
      if (filters.branch_id) {
        query = query.eq('branch_id', filters.branch_id);
      }
      if (filters.specialization) {
        query = query.contains('specialization', [filters.specialization]);
      }
      if (filters.search) {
        const searchTerm = filters.search.trim();
        query = query.or(`teacher_code.ilike.%${searchTerm}%,users.email.ilike.%${searchTerm}%`);
      }
      if (filters.is_active !== undefined) {
        query = query.eq('users.is_active', filters.is_active);
      }
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
      }

      const { data: teachers, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch teachers: ${error.message}`);
      }

      return (teachers || []).map(t => this.transformTeacherData(t));
    } catch (error: any) {
      console.error('listTeachers error:', error);
      throw error instanceof Error ? error : new Error('Failed to list teachers');
    }
  },

  /**
   * Delete (deactivate) a teacher
   */
  async deleteTeacher(teacherId: string): Promise<void> {
    try {
      const teacher = await this.getTeacherById(teacherId);
      if (!teacher) {
        throw new Error('Teacher not found');
      }

      // Deactivate user account
      if (teacher.user_id) {
        const { error: userError } = await supabase
          .from('users')
          .update({ 
            is_active: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', teacher.user_id);

        if (userError) {
          throw new Error(`Failed to deactivate teacher: ${userError.message}`);
        }
      }

      // Optionally, update teacher record
      const { error: teacherError } = await supabase
        .from('teachers')
        .update({ 
          updated_at: new Date().toISOString()
        })
        .eq('id', teacherId);

      if (teacherError) {
        console.error('Failed to update teacher record:', teacherError);
      }
    } catch (error: any) {
      console.error('deleteTeacher error:', error);
      throw error instanceof Error ? error : new Error('Failed to delete teacher');
    }
  },

  /**
   * Restore (reactivate) a teacher
   */
  async restoreTeacher(teacherId: string): Promise<void> {
    try {
      const teacher = await this.getTeacherById(teacherId);
      if (!teacher) {
        throw new Error('Teacher not found');
      }

      // Reactivate user account
      if (teacher.user_id) {
        const { error } = await supabase
          .from('users')
          .update({ 
            is_active: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', teacher.user_id);

        if (error) {
          throw new Error(`Failed to restore teacher: ${error.message}`);
        }
      }
    } catch (error: any) {
      console.error('restoreTeacher error:', error);
      throw error instanceof Error ? error : new Error('Failed to restore teacher');
    }
  },

  /**
   * Generate unique teacher code
   */
  async generateTeacherCode(companyId: string): Promise<string> {
    const prefix = 'TCH';
    const year = new Date().getFullYear().toString().slice(-2);
    
    // Get the latest teacher code
    const { data } = await supabase
      .from('teachers')
      .select('teacher_code')
      .eq('company_id', companyId)
      .like('teacher_code', `${prefix}${year}%`)
      .order('teacher_code', { ascending: false })
      .limit(1)
      .single();

    if (data) {
      const lastNumber = parseInt(data.teacher_code.slice(-4)) || 0;
      return `${prefix}${year}${(lastNumber + 1).toString().padStart(4, '0')}`;
    }

    return `${prefix}${year}0001`;
  },

  /**
   * Check if email is available
   */
  async isEmailAvailable(email: string): Promise<boolean> {
    const { data } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    return !data;
  },

  /**
   * Helper to get user metadata
   */
  async getUserMetadata(userId: string): Promise<any> {
    const { data } = await supabase
      .from('users')
      .select('raw_user_meta_data')
      .eq('id', userId)
      .single();

    return data?.raw_user_meta_data || {};
  },

  /**
   * Transform teacher data for consistent structure
   */
  transformTeacherData(teacher: any): TeacherData {
    return {
      id: teacher.id,
      user_id: teacher.user_id,
      teacher_code: teacher.teacher_code,
      name: teacher.users?.raw_user_meta_data?.name || '',
      email: teacher.users?.email || '',
      specialization: teacher.specialization || [],
      qualification: teacher.qualification,
      experience_years: teacher.experience_years,
      bio: teacher.bio,
      company_id: teacher.company_id,
      school_id: teacher.school_id,
      branch_id: teacher.branch_id,
      hire_date: teacher.hire_date,
      is_active: teacher.users?.is_active ?? true,
      created_at: teacher.created_at,
      updated_at: teacher.updated_at
    };
  }
};