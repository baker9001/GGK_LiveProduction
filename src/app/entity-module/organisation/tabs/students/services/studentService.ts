/**
 * File: /src/app/entity-module/organisation/tabs/students/services/studentService.ts
 * 
 * Student Management Service
 * Handles CRUD operations for students with proper user creation
 */

import { supabase } from '@/lib/supabase';
import { userCreationService } from '@/services/userCreationService';

export interface StudentData {
  id: string;
  user_id: string;
  student_code: string;
  enrollment_number: string;
  name?: string;
  email?: string;
  grade_level?: string;
  section?: string;
  admission_date?: string;
  parent_name?: string;
  parent_contact?: string;
  parent_email?: string;
  school_id?: string;
  branch_id?: string;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

interface CreateStudentPayload {
  email: string;
  name: string;
  password: string;
  student_code: string;
  enrollment_number: string;
  company_id: string;
  school_id?: string;
  branch_id?: string;
  grade_level?: string;
  section?: string;
  admission_date?: string;
  parent_name?: string;
  parent_contact?: string;
  parent_email?: string;
  phone?: string;
  is_active?: boolean;
}

interface UpdateStudentPayload {
  name?: string;
  password?: string;
  grade_level?: string;
  section?: string;
  parent_name?: string;
  parent_contact?: string;
  parent_email?: string;
  school_id?: string;
  branch_id?: string;
  is_active?: boolean;
}

interface StudentFilters {
  company_id?: string;
  school_id?: string;
  branch_id?: string;
  grade_level?: string;
  section?: string;
  is_active?: boolean;
  search?: string;
  admission_year?: number;
  limit?: number;
  offset?: number;
}

export const studentService = {
  /**
   * Create a new student
   */
  async createStudent(payload: CreateStudentPayload): Promise<StudentData> {
    try {
      // Validate required fields
      if (!payload.email || !payload.name || !payload.password) {
        throw new Error('Email, name, and password are required');
      }

      if (!payload.student_code || !payload.enrollment_number) {
        throw new Error('Student code and enrollment number are required');
      }

      // Check if student code already exists
      const { data: existingCode } = await supabase
        .from('students')
        .select('id')
        .eq('student_code', payload.student_code)
        .maybeSingle();

      if (existingCode) {
        throw new Error('Student code already exists');
      }

      // Check if enrollment number already exists
      const { data: existingEnrollment } = await supabase
        .from('students')
        .select('id')
        .eq('enrollment_number', payload.enrollment_number)
        .maybeSingle();

      if (existingEnrollment) {
        throw new Error('Enrollment number already exists');
      }

      // Use userCreationService to create the student
      const { userId, entityId } = await userCreationService.createUser({
        user_type: 'student',
        email: payload.email,
        name: payload.name,
        password: payload.password,
        phone: payload.phone,
        company_id: payload.company_id,
        student_code: payload.student_code,
        enrollment_number: payload.enrollment_number,
        grade_level: payload.grade_level,
        section: payload.section,
        admission_date: payload.admission_date,
        parent_name: payload.parent_name,
        parent_contact: payload.parent_contact,
        parent_email: payload.parent_email,
        school_id: payload.school_id,
        branch_id: payload.branch_id,
        is_active: payload.is_active
      });

      // Fetch and return the created student
      const student = await this.getStudentById(entityId);
      if (!student) {
        throw new Error('Failed to retrieve created student');
      }

      return student;
    } catch (error: any) {
      console.error('createStudent error:', error);
      throw error instanceof Error ? error : new Error('Failed to create student');
    }
  },

  /**
   * Update an existing student
   */
  async updateStudent(studentId: string, payload: UpdateStudentPayload): Promise<StudentData> {
    try {
      // Fetch existing student
      const existingStudent = await this.getStudentById(studentId);
      if (!existingStudent) {
        throw new Error('Student not found');
      }

      // Update student record
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (payload.grade_level !== undefined) updateData.grade_level = payload.grade_level;
      if (payload.section !== undefined) updateData.section = payload.section;
      if (payload.parent_name !== undefined) updateData.parent_name = payload.parent_name;
      if (payload.parent_contact !== undefined) updateData.parent_contact = payload.parent_contact;
      if (payload.parent_email !== undefined) updateData.parent_email = payload.parent_email;
      if (payload.school_id !== undefined) updateData.school_id = payload.school_id;
      if (payload.branch_id !== undefined) updateData.branch_id = payload.branch_id;

      const { error: updateError } = await supabase
        .from('students')
        .update(updateData)
        .eq('id', studentId);

      if (updateError) {
        throw new Error(`Failed to update student: ${updateError.message}`);
      }

      // Update user record if needed
      if (existingStudent.user_id) {
        const userUpdateData: any = {
          updated_at: new Date().toISOString()
        };

        if (payload.name) {
          userUpdateData.raw_user_meta_data = { 
            ...(await this.getUserMetadata(existingStudent.user_id)),
            name: payload.name 
          };
        }

        if (payload.is_active !== undefined) {
          userUpdateData.is_active = payload.is_active;
        }

        const { error: userError } = await supabase
          .from('users')
          .update(userUpdateData)
          .eq('id', existingStudent.user_id);

        if (userError) {
          console.error('Failed to update user record:', userError);
        }

        // Update password if provided
        if (payload.password) {
          try {
            await userCreationService.updatePassword(existingStudent.user_id, payload.password);
          } catch (passwordError) {
            console.error('Failed to update password:', passwordError);
          }
        }
      }

      const updatedStudent = await this.getStudentById(studentId);
      if (!updatedStudent) {
        throw new Error('Failed to retrieve updated student');
      }

      return updatedStudent;
    } catch (error: any) {
      console.error('updateStudent error:', error);
      throw error instanceof Error ? error : new Error('Failed to update student');
    }
  },

  /**
   * Get a single student by ID
   */
  async getStudentById(studentId: string): Promise<StudentData | null> {
    try {
      const { data: student, error } = await supabase
        .from('students')
        .select(`
          *,
          users!students_user_id_fkey (
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
        .eq('id', studentId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return this.transformStudentData(student);
    } catch (error) {
      console.error('getStudentById error:', error);
      return null;
    }
  },

  /**
   * List students with filters
   */
  async listStudents(filters: StudentFilters): Promise<StudentData[]> {
    try {
      let query = supabase
        .from('students')
        .select(`
          *,
          users!students_user_id_fkey (
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
        // Need to join through schools/branches for company filter
        // This might need adjustment based on your schema
      }
      if (filters.school_id) {
        query = query.eq('school_id', filters.school_id);
      }
      if (filters.branch_id) {
        query = query.eq('branch_id', filters.branch_id);
      }
      if (filters.grade_level) {
        query = query.eq('grade_level', filters.grade_level);
      }
      if (filters.section) {
        query = query.eq('section', filters.section);
      }
      if (filters.admission_year) {
        const yearStart = `${filters.admission_year}-01-01`;
        const yearEnd = `${filters.admission_year}-12-31`;
        query = query.gte('admission_date', yearStart).lte('admission_date', yearEnd);
      }
      if (filters.search) {
        const searchTerm = filters.search.trim();
        query = query.or(
          `student_code.ilike.%${searchTerm}%,enrollment_number.ilike.%${searchTerm}%,users.email.ilike.%${searchTerm}%`
        );
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

      const { data: students, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch students: ${error.message}`);
      }

      return (students || []).map(s => this.transformStudentData(s));
    } catch (error: any) {
      console.error('listStudents error:', error);
      throw error instanceof Error ? error : new Error('Failed to list students');
    }
  },

  /**
   * Delete (deactivate) a student
   */
  async deleteStudent(studentId: string): Promise<void> {
    try {
      const student = await this.getStudentById(studentId);
      if (!student) {
        throw new Error('Student not found');
      }

      // Deactivate user account
      if (student.user_id) {
        const { error: userError } = await supabase
          .from('users')
          .update({ 
            is_active: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', student.user_id);

        if (userError) {
          throw new Error(`Failed to deactivate student: ${userError.message}`);
        }
      }

      // Optionally, update student record
      const { error: studentError } = await supabase
        .from('students')
        .update({ 
          updated_at: new Date().toISOString()
        })
        .eq('id', studentId);

      if (studentError) {
        console.error('Failed to update student record:', studentError);
      }
    } catch (error: any) {
      console.error('deleteStudent error:', error);
      throw error instanceof Error ? error : new Error('Failed to delete student');
    }
  },

  /**
   * Restore (reactivate) a student
   */
  async restoreStudent(studentId: string): Promise<void> {
    try {
      const student = await this.getStudentById(studentId);
      if (!student) {
        throw new Error('Student not found');
      }

      // Reactivate user account
      if (student.user_id) {
        const { error } = await supabase
          .from('users')
          .update({ 
            is_active: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', student.user_id);

        if (error) {
          throw new Error(`Failed to restore student: ${error.message}`);
        }
      }
    } catch (error: any) {
      console.error('restoreStudent error:', error);
      throw error instanceof Error ? error : new Error('Failed to restore student');
    }
  },

  /**
   * Generate unique student code
   */
  async generateStudentCode(schoolId: string): Promise<string> {
    const prefix = 'STD';
    const year = new Date().getFullYear().toString().slice(-2);
    
    // Get the latest student code for this school
    const { data } = await supabase
      .from('students')
      .select('student_code')
      .eq('school_id', schoolId)
      .like('student_code', `${prefix}${year}%`)
      .order('student_code', { ascending: false })
      .limit(1)
      .single();

    if (data) {
      const lastNumber = parseInt(data.student_code.slice(-5)) || 0;
      return `${prefix}${year}${(lastNumber + 1).toString().padStart(5, '0')}`;
    }

    return `${prefix}${year}00001`;
  },

  /**
   * Generate unique enrollment number
   */
  async generateEnrollmentNumber(schoolId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `ENR${year}`;
    
    const { data } = await supabase
      .from('students')
      .select('enrollment_number')
      .eq('school_id', schoolId)
      .like('enrollment_number', `${prefix}%`)
      .order('enrollment_number', { ascending: false })
      .limit(1)
      .single();

    if (data) {
      const lastNumber = parseInt(data.enrollment_number.slice(-6)) || 0;
      return `${prefix}${(lastNumber + 1).toString().padStart(6, '0')}`;
    }

    return `${prefix}000001`;
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
   * Promote student to next grade
   */
  async promoteStudent(studentId: string, newGrade: string, newSection?: string): Promise<StudentData> {
    try {
      const updateData: any = {
        grade_level: newGrade,
        updated_at: new Date().toISOString()
      };

      if (newSection) {
        updateData.section = newSection;
      }

      const { error } = await supabase
        .from('students')
        .update(updateData)
        .eq('id', studentId);

      if (error) {
        throw new Error(`Failed to promote student: ${error.message}`);
      }

      const student = await this.getStudentById(studentId);
      if (!student) {
        throw new Error('Failed to retrieve promoted student');
      }

      return student;
    } catch (error: any) {
      console.error('promoteStudent error:', error);
      throw error instanceof Error ? error : new Error('Failed to promote student');
    }
  },

  /**
   * Bulk promote students
   */
  async bulkPromoteStudents(
    studentIds: string[], 
    newGrade: string, 
    newSection?: string
  ): Promise<{ success: string[], failed: string[] }> {
    const results = {
      success: [] as string[],
      failed: [] as string[]
    };

    for (const studentId of studentIds) {
      try {
        await this.promoteStudent(studentId, newGrade, newSection);
        results.success.push(studentId);
      } catch (error) {
        console.error(`Failed to promote student ${studentId}:`, error);
        results.failed.push(studentId);
      }
    }

    return results;
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
   * Transform student data for consistent structure
   */
  transformStudentData(student: any): StudentData {
    return {
      id: student.id,
      user_id: student.user_id,
      student_code: student.student_code,
      enrollment_number: student.enrollment_number,
      name: student.users?.raw_user_meta_data?.name || '',
      email: student.users?.email || '',
      grade_level: student.grade_level,
      section: student.section,
      admission_date: student.admission_date,
      parent_name: student.parent_name,
      parent_contact: student.parent_contact,
      parent_email: student.parent_email,
      school_id: student.school_id,
      branch_id: student.branch_id,
      is_active: student.users?.is_active ?? true,
      created_at: student.created_at,
      updated_at: student.updated_at
    };
  }
};