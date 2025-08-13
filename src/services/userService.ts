// /src/services/userService.ts
// Enhanced client-side service for interacting with the universal user API

import { supabase } from '../lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ===== TYPE DEFINITIONS =====
export type UserType = 'system' | 'student' | 'teacher' | 'entity' | 'parent';

export interface CreateUserData {
  email: string;
  name: string;
  user_type: UserType;
  password?: string;
  is_active?: boolean;
  send_verification?: boolean;
  
  // Type-specific fields
  role_id?: string;
  company_id?: string;
  school_id?: string; 
  branch_id?: string;
  department_id?: string;
  student_ids?: string[];
  
  // Additional profile data
  phone?: string;
  address?: string;
  date_of_birth?: string;
  position?: string;
  department?: string;
  employee_id?: string;
  teacher_code?: string;
  student_code?: string;
  enrollment_number?: string;
  grade_level?: string;
  section?: string;
  parent_name?: string;
  parent_contact?: string;
  parent_email?: string;
}

export interface UpdateUserData extends Partial<CreateUserData> {
  userId: string;
}

export interface UserFilter {
  user_type?: UserType;
  email?: string;
  name?: string;
  is_active?: boolean;
  company_id?: string;
  school_id?: string;
  branch_id?: string;
  limit?: number;
  offset?: number;
}

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
  // Type-specific additional fields
  role?: string;
  company?: string;
  school?: string;
  position?: string;
  department?: string;
  code?: string;
  grade?: string;
  children_count?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface BatchCreateResult {
  success: UserResponse[];
  failed: Array<{ data: CreateUserData; error: string }>;
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
class UserService {
  private baseUrl = '/api/users';
  private requestCache = new Map<string, Promise<any>>();
  private cacheTimeout = 5000; // 5 seconds

  // Get authorization header
  private async getAuthHeader(): Promise<HeadersInit> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new UserServiceError('No active session', 401);
    }
    
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    };
  }

  // Cached request wrapper
  private async cachedRequest<T>(key: string, request: () => Promise<T>): Promise<T> {
    const cached = this.requestCache.get(key);
    if (cached) {
      return cached;
    }

    const promise = request();
    this.requestCache.set(key, promise);
    
    setTimeout(() => {
      this.requestCache.delete(key);
    }, this.cacheTimeout);

    return promise;
  }

  // Create a new user
  async createUser(data: CreateUserData): Promise<UserResponse> {
    try {
      const headers = await this.getAuthHeader();
      
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new UserServiceError(
          error.error || 'Failed to create user',
          response.status,
          error.details
        );
      }

      const result = await response.json();
      return result.user;
    } catch (error) {
      if (error instanceof UserServiceError) throw error;
      console.error('Error creating user:', error);
      throw new UserServiceError('Failed to create user');
    }
  }

  // Update an existing user
  async updateUser(data: UpdateUserData): Promise<{ success: boolean; message: string }> {
    try {
      const headers = await this.getAuthHeader();
      
      const response = await fetch(this.baseUrl, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new UserServiceError(
          error.error || 'Failed to update user',
          response.status,
          error.details
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof UserServiceError) throw error;
      console.error('Error updating user:', error);
      throw new UserServiceError('Failed to update user');
    }
  }

  // Delete a user
  async deleteUser(userId: string): Promise<{ success: boolean }> {
    try {
      const headers = await this.getAuthHeader();
      
      const response = await fetch(`${this.baseUrl}?userId=${userId}`, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) {
        const error = await response.json();
        throw new UserServiceError(
          error.error || 'Failed to delete user',
          response.status
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof UserServiceError) throw error;
      console.error('Error deleting user:', error);
      throw new UserServiceError('Failed to delete user');
    }
  }

  // Get users with filters
  async getUsers(filters: UserFilter = {}): Promise<PaginatedResponse<UserResponse>> {
    try {
      const headers = await this.getAuthHeader();
      
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });

      const cacheKey = `users-${params.toString()}`;
      
      return await this.cachedRequest(cacheKey, async () => {
        const response = await fetch(`${this.baseUrl}?${params.toString()}`, {
          method: 'GET',
          headers
        });

        if (!response.ok) {
          const error = await response.json();
          throw new UserServiceError(
            error.error || 'Failed to fetch users',
            response.status
          );
        }

        return await response.json();
      });
    } catch (error) {
      if (error instanceof UserServiceError) throw error;
      console.error('Error fetching users:', error);
      throw new UserServiceError('Failed to fetch users');
    }
  }

  // Get a single user by ID
  async getUserById(userId: string): Promise<UserResponse | null> {
    try {
      const { data } = await this.getUsers({ limit: 1 });
      return data.find(user => user.id === userId) || null;
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  }

  // Resend verification email
  async resendVerificationEmail(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const headers = await this.getAuthHeader();
      
      const response = await fetch(this.baseUrl, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ userId })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new UserServiceError(
          error.error || 'Failed to send verification email',
          response.status
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof UserServiceError) throw error;
      console.error('Error resending verification:', error);
      throw new UserServiceError('Failed to send verification email');
    }
  }

  // Batch create users
  async batchCreateUsers(users: CreateUserData[]): Promise<BatchCreateResult> {
    const results: BatchCreateResult = {
      success: [],
      failed: []
    };

    // Process in chunks to avoid overwhelming the server
    const chunkSize = 5;
    const chunks = [];
    for (let i = 0; i < users.length; i += chunkSize) {
      chunks.push(users.slice(i, i + chunkSize));
    }

    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(async (userData) => {
          try {
            const user = await this.createUser(userData);
            results.success.push(user);
          } catch (error) {
            results.failed.push({
              data: userData,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        })
      );
    }

    return results;
  }

  // Type-specific helper methods

  // Create system user (admin)
  async createSystemUser(data: {
    email: string;
    name: string;
    password: string;
    role_id: string;
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
    password?: string;
    company_id: string;
    position?: string;
    department?: string;
    employee_id?: string;
    phone?: string;
    is_active?: boolean;
  }): Promise<UserResponse> {
    return this.createUser({
      ...data,
      user_type: 'entity'
    });
  }

  // Create teacher
  async createTeacher(data: {
    email: string;
    name: string;
    password?: string;
    company_id: string;
    school_id?: string;
    branch_id?: string;
    department_id?: string;
    teacher_code?: string;
    phone?: string;
    is_active?: boolean;
  }): Promise<UserResponse> {
    return this.createUser({
      ...data,
      user_type: 'teacher'
    });
  }

  // Create student
  async createStudent(data: {
    email: string;
    name: string;
    password?: string;
    company_id: string;
    school_id?: string;
    branch_id?: string;
    student_code?: string;
    enrollment_number?: string;
    grade_level?: string;
    section?: string;
    parent_name?: string;
    parent_contact?: string;
    parent_email?: string;
    phone?: string;
    is_active?: boolean;
  }): Promise<UserResponse> {
    return this.createUser({
      ...data,
      user_type: 'student'
    });
  }

  // Create parent
  async createParent(data: {
    email: string;
    name: string;
    password?: string;
    student_ids: string[];
    phone?: string;
    address?: string;
    is_active?: boolean;
  }): Promise<UserResponse> {
    return this.createUser({
      ...data,
      user_type: 'parent'
    });
  }

  // Get users by company
  async getUsersByCompany(companyId: string, userType?: UserType): Promise<UserResponse[]> {
    const filters: UserFilter = { company_id: companyId };
    if (userType) {
      filters.user_type = userType;
    }
    
    const { data } = await this.getUsers(filters);
    return data;
  }

  // Get users by school
  async getUsersBySchool(schoolId: string, userType?: UserType): Promise<UserResponse[]> {
    const filters: UserFilter = { school_id: schoolId };
    if (userType) {
      filters.user_type = userType;
    }
    
    const { data } = await this.getUsers(filters);
    return data;
  }

  // Search users
  async searchUsers(query: string, userType?: UserType): Promise<UserResponse[]> {
    const filters: UserFilter = {
      name: query,
      user_type: userType
    };
    
    const { data } = await this.getUsers(filters);
    
    // Also search by email if no results found by name
    if (data.length === 0) {
      const emailResults = await this.getUsers({
        email: query,
        user_type: userType
      });
      return emailResults.data;
    }
    
    return data;
  }

  // Validate email availability
  async isEmailAvailable(email: string, excludeUserId?: string): Promise<boolean> {
    try {
      const { data } = await supabase
        .from('users')
        .select('id')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (!data) return true;
      if (excludeUserId && data.id === excludeUserId) return true;
      
      return false;
    } catch (error) {
      console.error('Error checking email availability:', error);
      return false;
    }
  }

  // Get user statistics
  async getUserStatistics(companyId?: string): Promise<{
    total: number;
    byType: Record<UserType, number>;
    active: number;
    inactive: number;
    verified: number;
    unverified: number;
  }> {
    try {
      let query = supabase
        .from('users')
        .select('user_type, is_active, email_verified');

      if (companyId) {
        // Filter by company across different user types
        const companyUserIds = await this.getCompanyUserIds(companyId);
        query = query.in('id', companyUserIds);
      }

      const { data, error } = await query;
      
      if (error) throw error;

      const stats = {
        total: data?.length || 0,
        byType: {} as Record<UserType, number>,
        active: 0,
        inactive: 0,
        verified: 0,
        unverified: 0
      };

      data?.forEach(user => {
        // Count by type
        stats.byType[user.user_type as UserType] = (stats.byType[user.user_type as UserType] || 0) + 1;
        
        // Count active/inactive
        if (user.is_active) {
          stats.active++;
        } else {
          stats.inactive++;
        }
        
        // Count verified/unverified
        if (user.email_verified) {
          stats.verified++;
        } else {
          stats.unverified++;
        }
      });

      return stats;
    } catch (error) {
      console.error('Error fetching user statistics:', error);
      throw new UserServiceError('Failed to fetch user statistics');
    }
  }

  // Helper: Get all user IDs for a company
  private async getCompanyUserIds(companyId: string): Promise<string[]> {
    const userIds: string[] = [];
    
    // Get entity users
    const { data: entityUsers } = await supabase
      .from('entity_users')
      .select('user_id')
      .eq('company_id', companyId);
    
    userIds.push(...(entityUsers?.map(u => u.user_id) || []));
    
    // Get teachers
    const { data: teachers } = await supabase
      .from('teachers')
      .select('user_id')
      .eq('company_id', companyId);
    
    userIds.push(...(teachers?.map(t => t.user_id) || []));
    
    // Get students
    const { data: students } = await supabase
      .from('students')
      .select('user_id')
      .eq('company_id', companyId);
    
    userIds.push(...(students?.map(s => s.user_id) || []));
    
    return userIds;
  }
}

// Export singleton instance
export const userService = new UserService();

// ===== REACT HOOKS =====

// Hook to fetch users
export function useUsers(filters?: UserFilter) {
  return useQuery({
    queryKey: ['users', filters],
    queryFn: () => userService.getUsers(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

// Hook to fetch a single user
export function useUser(userId: string) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => userService.getUserById(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

// Hook to create a user
export function useCreateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateUserData) => userService.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user-statistics'] });
    },
  });
}

// Hook to update a user
export function useUpdateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: UpdateUserData) => userService.updateUser(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['user-statistics'] });
    },
  });
}

// Hook to delete a user
export function useDeleteUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (userId: string) => userService.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user-statistics'] });
    },
  });
}

// Hook to resend verification email
export function useResendVerification() {
  return useMutation({
    mutationFn: (userId: string) => userService.resendVerificationEmail(userId),
  });
}

// Hook for user statistics
export function useUserStatistics(companyId?: string) {
  return useQuery({
    queryKey: ['user-statistics', companyId],
    queryFn: () => userService.getUserStatistics(companyId),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Hook for batch user creation
export function useBatchCreateUsers() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (users: CreateUserData[]) => userService.batchCreateUsers(users),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user-statistics'] });
    },
  });
}

// Hook to validate email availability
export function useEmailAvailability(email: string, excludeUserId?: string) {
  return useQuery({
    queryKey: ['email-availability', email, excludeUserId],
    queryFn: () => userService.isEmailAvailable(email, excludeUserId),
    enabled: !!email && email.includes('@'),
    staleTime: 30 * 1000, // 30 seconds
  });
}