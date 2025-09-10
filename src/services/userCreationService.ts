/**
 * File: /src/services/userCreationService.ts
 * 
 * Comprehensive User Creation Service
 * Handles creation of all user types without Supabase Authentication
 * 
 * Workflow:
 * 1. Create user in 'users' table
 * 2. Create corresponding record in entity-specific table
 *    - entity_users for admins
 *    - teachers for teachers
 *    - students for students
 */

import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs/dist/bcrypt.min';

// ============= TYPE DEFINITIONS =============

export type UserType = 'entity_admin' | 'sub_entity_admin' | 'school_admin' | 'branch_admin' | 'teacher' | 'student';

export interface BaseUserPayload {
  email: string;
  name: string;
  password: string;
  phone?: string;
  company_id: string;
  is_active?: boolean;
  metadata?: Record<string, any>;
}

export interface AdminUserPayload extends BaseUserPayload {
  user_type: 'entity_admin' | 'sub_entity_admin' | 'school_admin' | 'branch_admin';
  admin_level: string;
  permissions?: Record<string, any>;
  parent_admin_id?: string;
  created_by?: string;
}

export interface TeacherUserPayload extends BaseUserPayload {
  user_type: 'teacher';
  teacher_code: string;
  specialization?: string[];
  qualification?: string;
  experience_years?: number;
  bio?: string;
  hire_date?: string;
  school_id?: string;
  branch_id?: string;
}

export interface StudentUserPayload extends BaseUserPayload {
  user_type: 'student';
  student_code: string;
  enrollment_number: string;
  grade_level?: string;
  section?: string;
  admission_date?: string;
  parent_name?: string;
  parent_contact?: string;
  parent_email?: string;
  school_id?: string;
  branch_id?: string;
}

type CreateUserPayload = AdminUserPayload | TeacherUserPayload | StudentUserPayload;

// ============= HELPER FUNCTIONS =============

/**
 * Hash password using bcrypt
 */
async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Validate email format
 */
function validateEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9][a-zA-Z0-9._%+-]*@[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email.trim().toLowerCase());
}

/**
 * Sanitize input strings
 */
function sanitizeString(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

/**
 * Get user type array based on role
 */
function getUserTypes(userType: UserType): string[] {
  const typeMap: Record<UserType, string[]> = {
    'entity_admin': ['entity', 'admin'],
    'sub_entity_admin': ['entity', 'admin'],
    'school_admin': ['entity', 'admin'],
    'branch_admin': ['entity', 'admin'],
    'teacher': ['teacher', 'staff'],
    'student': ['student']
  };
  return typeMap[userType] || ['user'];
}

// Safe columns that exist in users table (for queries)
export const SAFE_USER_COLUMNS = [
  'id',
  'email',
  'user_type',
  'is_active',
  'email_verified',
  'created_at',
  'updated_at',
  'last_sign_in_at',
  'last_login_at',
  'raw_user_meta_data',
  'raw_app_meta_data',
  'password_hash',
  'password_updated_at',
  'requires_password_change',
  'failed_login_attempts',
  'locked_until',
  'verification_token',
  'verification_sent_at',
  'verified_at',
  'user_types',
  'primary_type'
].join(', ');

// ============= MAIN USER CREATION SERVICE =============

export const userCreationService = {
  /**
   * Main method to create any type of user
   */
  async createUser(payload: CreateUserPayload): Promise<{ userId: string; entityId: string }> {
    try {
      // Input validation
      if (!validateEmail(payload.email)) {
        throw new Error('Invalid email format');
      }

      if (!payload.password || payload.password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }

      if (!payload.name || payload.name.length < 2) {
        throw new Error('Name must be at least 2 characters long');
      }

      // Check if email already exists in users table
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', payload.email.toLowerCase())
        .maybeSingle();

      if (existingUser) {
        throw new Error('A user with this email already exists');
      }

      // Start transaction-like operation
      let userId: string | null = null;
      let entityId: string | null = null;

      try {
        // Step 1: Create user in users table
        userId = await this.createUserInUsersTable(payload);

        // Step 2: Create entity-specific record
        switch (payload.user_type) {
          case 'entity_admin':
          case 'sub_entity_admin':
          case 'school_admin':
          case 'branch_admin':
            entityId = await this.createAdminUser(userId, payload as AdminUserPayload);
            break;
          case 'teacher':
            entityId = await this.createTeacherUser(userId, payload as TeacherUserPayload);
            break;
          case 'student':
            entityId = await this.createStudentUser(userId, payload as StudentUserPayload);
            break;
          default:
            throw new Error('Invalid user type');
        }

        return { userId, entityId };
      } catch (error) {
        // Rollback: Delete user from users table if entity creation fails
        if (userId) {
          await this.rollbackUserCreation(userId);
        }
        throw error;
      }
    } catch (error: any) {
      console.error('User creation failed:', error);
      throw error instanceof Error ? error : new Error('Failed to create user');
    }
  },

  /**
   * Step 1: Create user in users table
   * IMPORTANT: Phone is NOT stored in users table - only in entity-specific tables
   */
  async createUserInUsersTable(payload: CreateUserPayload): Promise<string> {
    const hashedPassword = await hashPassword(payload.password);
    const userTypes = getUserTypes(payload.user_type);
    
    // Create clean metadata without phone
    const cleanMetadata = { ...payload.metadata };
    delete cleanMetadata.phone; // Ensure phone is never in users table metadata
    
    const userData = {
      email: payload.email.toLowerCase(),
      user_type: userTypes[0],
      user_types: userTypes,
      primary_type: userTypes[0],
      is_active: payload.is_active !== false,
      email_verified: false,
      password_hash: hashedPassword,
      password_updated_at: new Date().toISOString(),
      raw_user_meta_data: {
        name: sanitizeString(payload.name),
        company_id: payload.company_id,
        created_via: 'entity_module',
        ...cleanMetadata // Use cleaned metadata without phone
      },
      raw_app_meta_data: {
        provider: 'email',
        providers: ['email']
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('users')
      .insert([userData])
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create user account: ${error.message}`);
    }

    return data.id;
  },

  /**
   * Step 2a: Create admin user in entity_users table
   * Phone IS stored here for entity users
   */
  async createAdminUser(userId: string, payload: AdminUserPayload): Promise<string> {
    // Get default permissions based on admin level
    const defaultPermissions = this.getDefaultPermissions(payload.admin_level);
    const finalPermissions = {
      ...defaultPermissions,
      ...(payload.permissions || {})
    };

    const adminData = {
      user_id: userId,
      company_id: payload.company_id,
      email: payload.email.toLowerCase(),
      name: sanitizeString(payload.name),
      phone: payload.phone || null, // Phone stored in entity_users
      admin_level: payload.admin_level,
      permissions: finalPermissions,
      is_active: payload.is_active !== false,
      created_by: payload.created_by || null,
      parent_admin_id: payload.parent_admin_id || null,
      metadata: {
        created_via: 'user_creation_service',
        created_at: new Date().toISOString(),
        ...payload.metadata
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('entity_users')
      .insert([adminData])
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create admin profile: ${error.message}`);
    }

    return data.id;
  },

  /**
   * Step 2b: Create teacher user in teachers table
   * Phone IS stored here for teachers
   */
  async createTeacherUser(userId: string, payload: TeacherUserPayload): Promise<string> {
    const teacherData: any = {
      user_id: userId,
      company_id: payload.company_id,
      teacher_code: payload.teacher_code,
      specialization: payload.specialization || [],
      qualification: payload.qualification || null,
      experience_years: payload.experience_years || 0,
      bio: payload.bio || null,
      hire_date: payload.hire_date || new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Add school/branch if provided
    if (payload.school_id) {
      teacherData.school_id = payload.school_id;
    }
    if (payload.branch_id) {
      teacherData.branch_id = payload.branch_id;
    }

    const { data, error } = await supabase
      .from('teachers')
      .insert([teacherData])
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create teacher profile: ${error.message}`);
    }

    return data.id;
  },

  /**
   * Step 2c: Create student user in students table
   * Phone IS stored here for students
   */
  async createStudentUser(userId: string, payload: StudentUserPayload): Promise<string> {
    const studentData: any = {
      user_id: userId,
      company_id: payload.company_id,
      email: payload.email.toLowerCase(),
      name: sanitizeString(payload.name),
      phone: payload.phone || null, // Phone stored in students table
      student_code: payload.student_code,
      enrollment_number: payload.enrollment_number,
      grade_level: payload.grade_level || null,
      section: payload.section || null,
      admission_date: payload.admission_date || new Date().toISOString(),
      parent_name: payload.parent_name || null,
      parent_contact: payload.parent_contact || null,
      parent_email: payload.parent_email || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Add school/branch if provided
    if (payload.school_id) {
      studentData.school_id = payload.school_id;
    }
    if (payload.branch_id) {
      studentData.branch_id = payload.branch_id;
    }

    const { data, error } = await supabase
      .from('students')
      .insert([studentData])
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create student profile: ${error.message}`);
    }

    return data.id;
  },

  /**
   * Rollback user creation if entity creation fails
   */
  async rollbackUserCreation(userId: string): Promise<void> {
    try {
      await supabase
        .from('users')
        .delete()
        .eq('id', userId);
    } catch (error) {
      console.error('Rollback failed:', error);
    }
  },

  /**
   * Update user password
   */
  async updatePassword(userId: string, newPassword: string): Promise<void> {
    // Password updates require service role permissions
    // This should be handled by a backend service or Edge Function
    throw new Error('Password updates require backend service. Use Supabase Auth methods instead.');
  },

  /**
   * Deactivate user account with self-deactivation protection
   */
  async deactivateUser(userId: string, actorId: string): Promise<void> {
    // Prevent self-deactivation
    if (userId === actorId) {
      throw new Error('You cannot deactivate your own account for security reasons');
    }

    const { error } = await supabase
      .from('users')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      throw new Error(`Failed to deactivate user: ${error.message}`);
    }
  },

  /**
   * Verify user password for login
   * IMPORTANT: Only selects columns that exist in users table
   */
  async verifyPassword(email: string, password: string): Promise<{ isValid: boolean; userId?: string }> {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, password_hash, is_active')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !user) {
      return { isValid: false };
    }

    if (!user.is_active) {
      throw new Error('Account is deactivated');
    }

    const isValid = await bcrypt.compare(password, user.password_hash);

    if (isValid) {
      // Update last login
      await supabase
        .from('users')
        .update({
          last_login_at: new Date().toISOString(),
          last_sign_in_at: new Date().toISOString()
        })
        .eq('id', user.id);
    }

    return { isValid, userId: isValid ? user.id : undefined };
  },

  /**
   * Fetch user safely with only existing columns
   */
  async getUserById(userId: string): Promise<any | null> {
    const { data, error } = await supabase
      .from('users')
      .select(SAFE_USER_COLUMNS)
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user:', error);
      return null;
    }

    return data;
  },

  /**
   * Get default permissions based on admin level
   */
  getDefaultPermissions(adminLevel: string): Record<string, any> {
    const permissionMap: Record<string, any> = {
      'entity_admin': {
        users: {
          create_entity_admin: true,
          create_sub_admin: true,
          create_school_admin: true,
          create_branch_admin: true,
          create_teacher: true,
          create_student: true,
          modify_entity_admin: true,
          modify_sub_admin: true,
          modify_school_admin: true,
          modify_branch_admin: true,
          modify_teacher: true,
          modify_student: true,
          delete_users: true,
          view_all_users: true
        },
        organization: {
          create_school: true,
          modify_school: true,
          delete_school: true,
          create_branch: true,
          modify_branch: true,
          delete_branch: true,
          view_all_schools: true,
          view_all_branches: true,
          manage_departments: true
        },
        settings: {
          manage_company_settings: true,
          manage_school_settings: true,
          manage_branch_settings: true,
          view_audit_logs: true,
          export_data: true
        }
      },
      'sub_entity_admin': {
        users: {
          create_entity_admin: false,
          create_sub_admin: true,
          create_school_admin: true,
          create_branch_admin: true,
          create_teacher: true,
          create_student: true,
          modify_entity_admin: false,
          modify_sub_admin: true,
          modify_school_admin: true,
          modify_branch_admin: true,
          modify_teacher: true,
          modify_student: true,
          delete_users: true,
          view_all_users: true
        },
        organization: {
          create_school: true,
          modify_school: true,
          delete_school: true,
          create_branch: true,
          modify_branch: true,
          delete_branch: true,
          view_all_schools: true,
          view_all_branches: true,
          manage_departments: true
        },
        settings: {
          manage_company_settings: false,
          manage_school_settings: true,
          manage_branch_settings: true,
          view_audit_logs: true,
          export_data: true
        }
      },
      'school_admin': {
        users: {
          create_entity_admin: false,
          create_sub_admin: false,
          create_school_admin: false,
          create_branch_admin: true,
          create_teacher: true,
          create_student: true,
          modify_entity_admin: false,
          modify_sub_admin: false,
          modify_school_admin: false,
          modify_branch_admin: true,
          modify_teacher: true,
          modify_student: true,
          delete_users: false,
          view_all_users: true
        },
        organization: {
          create_school: false,
          modify_school: false,
          delete_school: false,
          create_branch: true,
          modify_branch: true,
          delete_branch: false,
          view_all_schools: false,
          view_all_branches: true,
          manage_departments: true
        },
        settings: {
          manage_company_settings: false,
          manage_school_settings: true,
          manage_branch_settings: true,
          view_audit_logs: false,
          export_data: true
        }
      },
      'branch_admin': {
        users: {
          create_entity_admin: false,
          create_sub_admin: false,
          create_school_admin: false,
          create_branch_admin: false,
          create_teacher: true,
          create_student: true,
          modify_entity_admin: false,
          modify_sub_admin: false,
          modify_school_admin: false,
          modify_branch_admin: false,
          modify_teacher: true,
          modify_student: true,
          delete_users: false,
          view_all_users: true
        },
        organization: {
          create_school: false,
          modify_school: false,
          delete_school: false,
          create_branch: false,
          modify_branch: false,
          delete_branch: false,
          view_all_schools: false,
          view_all_branches: false,
          manage_departments: true
        },
        settings: {
          manage_company_settings: false,
          manage_school_settings: false,
          manage_branch_settings: true,
          view_audit_logs: false,
          export_data: false
        }
      }
    };

    return permissionMap[adminLevel] || this.getMinimalPermissions();
  },

  /**
   * Get minimal permissions (view only)
   */
  getMinimalPermissions(): Record<string, any> {
    return {
      users: {
        create_entity_admin: false,
        create_sub_admin: false,
        create_school_admin: false,
        create_branch_admin: false,
        create_teacher: false,
        create_student: false,
        modify_entity_admin: false,
        modify_sub_admin: false,
        modify_school_admin: false,
        modify_branch_admin: false,
        modify_teacher: false,
        modify_student: false,
        delete_users: false,
        view_all_users: false
      },
      organization: {
        create_school: false,
        modify_school: false,
        delete_school: false,
        create_branch: false,
        modify_branch: false,
        delete_branch: false,
        view_all_schools: false,
        view_all_branches: false,
        manage_departments: false
      },
      settings: {
        manage_company_settings: false,
        manage_school_settings: false,
        manage_branch_settings: false,
        view_audit_logs: false,
        export_data: false
      }
    };
  }
};

// ============= USAGE EXAMPLES =============

/*
// Example 1: Create an Entity Admin
const adminResult = await userCreationService.createUser({
  user_type: 'entity_admin',
  email: 'admin@company.com',
  name: 'John Admin',
  password: 'SecurePassword123!',
  company_id: 'company-uuid',
  admin_level: 'entity_admin',
  permissions: {}, // Will use defaults
  is_active: true
});

// Example 2: Create a Teacher
const teacherResult = await userCreationService.createUser({
  user_type: 'teacher',
  email: 'teacher@school.com',
  name: 'Jane Teacher',
  password: 'TeacherPass123!',
  company_id: 'company-uuid',
  teacher_code: 'TCH001',
  specialization: ['Mathematics', 'Physics'],
  qualification: 'M.Sc Physics',
  experience_years: 5,
  school_id: 'school-uuid',
  branch_id: 'branch-uuid'
});

// Example 3: Create a Student
const studentResult = await userCreationService.createUser({
  user_type: 'student',
  email: 'student@school.com',
  name: 'Bob Student',
  password: 'StudentPass123!',
  company_id: 'company-uuid',
  student_code: 'STD001',
  enrollment_number: 'ENR2024001',
  grade_level: '10',
  section: 'A',
  parent_name: 'Parent Name',
  parent_contact: '+1234567890',
  school_id: 'school-uuid',
  branch_id: 'branch-uuid'
});

// Example 4: Verify password for login
const loginResult = await userCreationService.verifyPassword(
  'admin@company.com',
  'SecurePassword123!'
);
if (loginResult.isValid) {
  console.log('Login successful, userId:', loginResult.userId);
}
*/