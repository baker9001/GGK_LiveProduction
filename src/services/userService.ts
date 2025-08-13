// /src/services/userService.ts
// Standardized client-side service for all user operations

import { supabase } from '../lib/supabase';
import { z } from 'zod';
import { toast } from '../components/shared/Toast';

// ===== TYPE DEFINITIONS =====
export type UserType = 'system' | 'student' | 'teacher' | 'entity' | 'parent';
export type UserRole = 'SSA' | 'SUPPORT' | 'VIEWER' | 'TEACHER' | 'STUDENT' | 'ENTITY_ADMIN';

// ===== VALIDATION SCHEMAS =====
export const userEmailSchema = z.string()
  .email('Invalid email address')
  .transform(email => email.toLowerCase());

export const userPasswordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const userPhoneSchema = z.string()
  .regex(/^[+]?[\d\s-()]+$/, 'Invalid phone number')
  .optional()
  .nullable();

// Base user schema
export const baseUserSchema = z.object({
  email: userEmailSchema,
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  user_type: z.enum(['system', 'student', 'teacher', 'entity', 'parent']),
  password: userPasswordSchema.optional(),
  phone: userPhoneSchema,
  is_active: z.boolean().default(true),
  send_verification: z.boolean().default(true),
});

// System admin user schema
export const systemUserSchema = baseUserSchema.extend({
  user_type: z.literal('system'),
  role_id: z.string().uuid('Invalid role ID'),
});

// Entity user schema
export const entityUserSchema = baseUserSchema.extend({
  user_type: z.literal('entity'),
  company_id: z.string().uuid('Invalid company ID'),
  position: z.string().optional().default('Staff'),
  department: z.string().optional().default('General'),
  employee_id: z.string().optional(),
  is_company_admin: z.boolean().default(false),
});

// Teacher schema
export const teacherSchema = baseUserSchema.extend({
  user_type: z.literal('teacher'),
  company_id: z.string().uuid('Invalid company ID'),
  school_id: z.string().uuid('Invalid school ID').optional(),
  branch_id: z.string().uuid('Invalid branch ID').optional(),
  department_id: z.string().uuid('Invalid department ID').optional(),
  teacher_code: z.string().optional(),
});

// Student schema
export const studentSchema = baseUserSchema.extend({
  user_type: z.literal('student'),
  company_id: z.string().uuid('Invalid company ID'),
  school_id: z.string().uuid('Invalid school ID').optional(),
  branch_id: z.string().uuid('Invalid branch ID').optional(),
  class_id: z.string().uuid('Invalid class ID').optional(),
  student_code: z.string().optional(),
  enrollment_number: z.string().optional(),
  grade_level: z.string().optional(),
  section: z.string().optional(),
  parent_name: z.string().optional(),
  parent_contact: z.string().optional(),
  parent_email: z.string().email().optional(),
});

// Parent schema
export const parentSchema = baseUserSchema.extend({
  user_type: z.literal('parent'),
  student_ids: z.array(z.string().uuid()).min(1, 'At least one student must be selected'),
  address: z.string().optional(),
});

// ===== INTERFACES =====
export interface UserResponse {
  id: string;
  email: string;
  name: string;
  user_type: UserType;
  is_active: boolean;
  email_verified: boolean;
  phone?: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
}

// ===== ERROR HANDLING =====
export class UserServiceError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'UserServiceError';
  }
}

// ===== USER SERVICE CLASS =====
export class UserService {
  private static instance: UserService;
  private readonly baseUrl = '/api/users';

  private constructor() {}

  static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  // Get auth token
  private async getAuthToken(): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new UserServiceError('Not authenticated', 401);
    }
    return session.access_token;
  }

  // Make authenticated request
  private async makeRequest<T>(
    method: string,
    endpoint: string = '',
    body?: any
  ): Promise<ApiResponse<T>> {
    try {
      const token = await this.getAuthToken();
      
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: body ? JSON.stringify(body) : undefined
      });

      const data = await response.json();

      if (!response.ok) {
        throw new UserServiceError(
          data.error || 'Request failed',
          response.status,
          data.details
        );
      }

      return { success: true, data };
    } catch (error) {
      if (error instanceof UserServiceError) {
        throw error;
      }
      throw new UserServiceError('Network error', 500, error);
    }
  }

  // ===== CREATE USER METHODS =====
  
  // Generic create user (validates based on user type)
  async createUser(userData: any): Promise<UserResponse> {
    // Validate based on user type
    let validatedData: any;
    
    switch (userData.user_type) {
      case 'system':
        validatedData = systemUserSchema.parse(userData);
        break;
      case 'entity':
        validatedData = entityUserSchema.parse(userData);
        break;
      case 'teacher':
        validatedData = teacherSchema.parse(userData);
        break;
      case 'student':
        validatedData = studentSchema.parse(userData);
        break;
      case 'parent':
        validatedData = parentSchema.parse(userData);
        break;
      default:
        throw new UserServiceError('Invalid user type');
    }

    const response = await this.makeRequest<UserResponse>('POST', '', validatedData);
    
    if (!response.success || !response.data) {
      throw new UserServiceError(response.error || 'Failed to create user');
    }

    return response.data;
  }

  // Create system admin
  async createSystemAdmin(data: {
    email: string;
    name: string;
    password: string;
    role_id: string;
    phone?: string;
    is_active?: boolean;
  }): Promise<UserResponse> {
    return this.createUser({
      ...data,
      user_type: 'system'
    });
  }

  // Create entity user
  async createEntityUser(data: {
    email: string;
    name: string;
    password: string;
    company_id: string;
    position?: string;
    department?: string;
    employee_id?: string;
    is_company_admin?: boolean;
    phone?: string;
    is_active?: boolean;
  }): Promise<UserResponse> {
    return this.createUser({
      ...data,
      user_type: 'entity'
    });
  }

  // Create or link entity admin (special case for existing users)
  async createOrLinkEntityAdmin(data: {
    email: string;
    password?: string;
    company_id: string;
    position?: string;
    department?: string;
    employee_id?: string;
    phone?: string;
  }): Promise<UserResponse> {
    try {
      // First check if user exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, email, user_type')
        .eq('email', data.email.toLowerCase())
        .maybeSingle();

      if (existingUser) {
        // User exists, just link to company
        const { error: linkError } = await supabase
          .from('entity_users')
          .insert({
            user_id: existingUser.id,
            company_id: data.company_id,
            position: data.position || 'Administrator',
            department: data.department || 'Management',
            employee_id: data.employee_id,
            is_company_admin: true,
            hire_date: new Date().toISOString().split('T')[0]
          });

        if (linkError) {
          if (linkError.message?.includes('duplicate')) {
            throw new UserServiceError('User is already an admin for this company');
          }
          throw new UserServiceError(`Failed to link user: ${linkError.message}`);
        }

        return {
          ...existingUser,
          name: existingUser.email.split('@')[0],
          is_active: true,
          email_verified: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as UserResponse;
      }

      // User doesn't exist, create new
      if (!data.password) {
        throw new UserServiceError('Password is required for new users');
      }

      return this.createEntityUser({
        ...data,
        name: data.email.split('@')[0], // Default name from email
        is_company_admin: true
      });
    } catch (error) {
      if (error instanceof UserServiceError) {
        throw error;
      }
      throw new UserServiceError('Failed to create or link admin', 500, error);
    }
  }

  // ===== UPDATE USER METHODS =====
  
  async updateUser(userId: string, updates: any): Promise<UserResponse> {
    const response = await this.makeRequest<UserResponse>('PUT', '', {
      userId,
      ...updates
    });

    if (!response.success || !response.data) {
      throw new UserServiceError(response.error || 'Failed to update user');
    }

    return response.data;
  }

  // ===== DELETE USER METHODS =====
  
  async deleteUser(userId: string): Promise<void> {
    const response = await this.makeRequest('DELETE', `?userId=${userId}`);
    
    if (!response.success) {
      throw new UserServiceError(response.error || 'Failed to delete user');
    }
  }

  async deleteUsers(userIds: string[]): Promise<void> {
    // Delete users one by one (can be optimized to batch delete)
    for (const userId of userIds) {
      await this.deleteUser(userId);
    }
  }

  // ===== UTILITY METHODS =====
  
  // Check if email is available
  async isEmailAvailable(email: string, excludeUserId?: string): Promise<boolean> {
    const { data } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (!data) return true;
    if (excludeUserId && data.id === excludeUserId) return true;
    
    return false;
  }

  // Validate password strength
  validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Send verification email
  async sendVerificationEmail(userId: string): Promise<void> {
    try {
      const { data: user } = await supabase
        .from('users')
        .select('email')
        .eq('id', userId)
        .single();

      if (!user) {
        throw new UserServiceError('User not found');
      }

      // This would typically call a backend endpoint to send the email
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/auth/verify`
      });

      if (error) {
        throw new UserServiceError('Failed to send verification email');
      }
    } catch (error) {
      if (error instanceof UserServiceError) {
        throw error;
      }
      throw new UserServiceError('Failed to send verification email', 500, error);
    }
  }
}

// Export singleton instance
export const userService = UserService.getInstance();