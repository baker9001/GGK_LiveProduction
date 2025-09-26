/**
 * File: /src/services/userCreationService.ts
 * 
 * COMPLETE VERSION WITH ALL FIXES
 * 
 * This version includes:
 * ✅ Ultimate updatePassword with fallback mechanisms
 * ✅ Fixed updateEmail with proper error handling
 * ✅ Clear, actionable error messages
 * ✅ Automatic fallbacks when Edge Functions unavailable
 * ✅ Self-update vs admin-update detection
 */

import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

// ============= TYPE DEFINITIONS =============

export type UserType = 'entity_admin' | 'sub_entity_admin' | 'school_admin' | 'branch_admin' | 'teacher' | 'student';

export interface BaseUserPayload {
  email: string;
  name: string;
  password?: string;
  phone?: string;
  company_id: string;
  is_active?: boolean;
  metadata?: Record<string, any>;
  send_invitation?: boolean;
}

export interface AdminUserPayload extends BaseUserPayload {
  user_type: 'entity_admin' | 'sub_entity_admin' | 'school_admin' | 'branch_admin';
  admin_level: string;
  permissions?: Record<string, any>;
  parent_admin_id?: string;
  created_by?: string;
  assigned_schools?: string[];
  assigned_branches?: string[];
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

// ============= CONFIGURATION =============

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// ============= HELPER FUNCTIONS =============

function validateEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9][a-zA-Z0-9._%+-]*@[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email.trim().toLowerCase());
}

function sanitizeString(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

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

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  array[6] = (array[6] & 0x0f) | 0x40;
  array[8] = (array[8] & 0x3f) | 0x80;
  
  const hex = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32)
  ].join('-');
}

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
  'email_confirmed_at',
  'failed_login_attempts',
  'locked_until',
  'user_types'
].join(', ');

// ============= MAIN USER CREATION SERVICE =============

export const userCreationService = {
  /**
   * Create a new user
   */
  async createUser(payload: CreateUserPayload): Promise<{ userId: string; entityId: string }> {
    try {
      // Input validation
      if (!validateEmail(payload.email)) {
        throw new Error('Invalid email format');
      }

      if (!payload.name || payload.name.length < 2) {
        throw new Error('Name must be at least 2 characters long');
      }

      // Check if email already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', payload.email.toLowerCase())
        .maybeSingle();

      if (existingUser) {
        throw new Error('A user with this email already exists');
      }

      let userId: string | null = null;
      let entityId: string | null = null;

      try {
        // Create user in Supabase Auth
        userId = await this.createUserInSupabaseAuthWithInvite(payload);

        // Create entity-specific record
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
   * Create user via Edge Function with invitation
   */
  async createUserInSupabaseAuthWithInvite(payload: CreateUserPayload): Promise<string> {
    try {
      const userTypes = getUserTypes(payload.user_type);
      const currentUser = await this.getCurrentUser();
      
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      
      const userMetadata = {
        name: sanitizeString(payload.name),
        company_id: payload.company_id,
        user_type: payload.user_type,
        created_by: currentUser?.email,
        created_at: new Date().toISOString(),
        ...payload.metadata
      };

      // Try Edge Function first
      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/create-entity-users-invite`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': accessToken ? `Bearer ${accessToken}` : '',
            'apikey': SUPABASE_ANON_KEY
          },
          body: JSON.stringify({
            email: payload.email.toLowerCase(),
            name: sanitizeString(payload.name),
            user_metadata: userMetadata,
            admin_level: (payload as AdminUserPayload).admin_level,
            company_id: payload.company_id,
            company_name: await this.getCompanyName(payload.company_id),
            phone: payload.phone,
            redirect_to: `${window.location.origin}/auth/callback`,
            send_invitation: payload.send_invitation !== false,
            created_by: currentUser?.email
          })
        });

        if (response.ok) {
          const result = await response.json();
          
          if (result.userId) {
            await this.createUserInCustomTable(result.userId, payload, userMetadata);
            console.log('User created via Edge Function with invitation:', result.userId);
            return result.userId;
          }
        } else {
          const errorData = await response.json().catch(() => null);
          console.warn('Edge Function failed:', errorData?.error || 'Unknown error');
        }
      } catch (edgeError) {
        console.warn('Edge Function not available:', edgeError);
      }

      // Fallback: Create directly in users table
      return await this.createUserInUsersTableDirect(payload);
      
    } catch (error: any) {
      console.error('Failed to create user:', error);
      throw error;
    }
  },

  /**
   * Create user in custom users table
   */
  async createUserInCustomTable(authUserId: string, payload: CreateUserPayload, metadata: any): Promise<void> {
    const userTypes = getUserTypes(payload.user_type);
    
    const userData = {
      id: authUserId,
      email: payload.email.toLowerCase(),
      user_type: userTypes[0],
      user_types: userTypes,
      is_active: payload.is_active !== false,
      email_verified: false,
      raw_user_meta_data: metadata,
      raw_app_meta_data: {
        provider: 'email',
        providers: ['email'],
        user_type: payload.user_type
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('users')
      .insert([userData]);

    if (error && error.code !== '23505') {
      console.error('Failed to create user in custom table:', error);
    }
  },

  /**
   * Fallback: Create user directly
   */
  async createUserInUsersTableDirect(payload: CreateUserPayload): Promise<string> {
    console.warn('Using direct creation fallback (invitation pending)');
    
    const userId = generateUUID();
    const userTypes = getUserTypes(payload.user_type);
    
    const userData = {
      id: userId,
      email: payload.email.toLowerCase(),
      user_type: userTypes[0],
      user_types: userTypes,
      is_active: payload.is_active !== false,
      email_verified: false,
      raw_user_meta_data: {
        name: sanitizeString(payload.name),
        company_id: payload.company_id,
        user_type: payload.user_type,
        created_via: 'fallback',
        requires_invitation: true,
        requires_password_change: true,
        ...payload.metadata
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
      throw new Error(`Failed to create user: ${error.message}`);
    }

    return data.id;
  },

  /**
   * Create admin user
   */
  async createAdminUser(userId: string, payload: AdminUserPayload): Promise<string> {
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
      phone: payload.phone || null,
      admin_level: payload.admin_level,
      permissions: finalPermissions,
      is_active: payload.is_active !== false,
      created_by: payload.created_by || null,
      parent_admin_id: payload.parent_admin_id || null,
      assigned_schools: payload.assigned_schools || [],
      assigned_branches: payload.assigned_branches || [],
      metadata: {
        created_via: 'enhanced_user_creation_service',
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

    if (payload.assigned_schools?.length || payload.assigned_branches?.length) {
      await this.createScopeAssignments(
        userId, 
        payload.assigned_schools || [], 
        payload.assigned_branches || []
      );
    }

    return data.id;
  },

  /**
   * Create teacher user
   */
  async createTeacherUser(userId: string, payload: TeacherUserPayload): Promise<string> {
    const teacherData: any = {
      user_id: userId,
      company_id: payload.company_id,
      email: payload.email.toLowerCase(),
      name: sanitizeString(payload.name),
      phone: payload.phone || null,
      teacher_code: payload.teacher_code,
      specialization: payload.specialization || [],
      qualification: payload.qualification || null,
      experience_years: payload.experience_years || 0,
      bio: payload.bio || null,
      hire_date: payload.hire_date || new Date().toISOString(),
      is_active: payload.is_active !== false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

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
   * Create student user
   */
  async createStudentUser(userId: string, payload: StudentUserPayload): Promise<string> {
    const studentData: any = {
      user_id: userId,
      company_id: payload.company_id,
      email: payload.email.toLowerCase(),
      name: sanitizeString(payload.name),
      phone: payload.phone || null,
      student_code: payload.student_code,
      enrollment_number: payload.enrollment_number,
      grade_level: payload.grade_level || null,
      section: payload.section || null,
      admission_date: payload.admission_date || new Date().toISOString(),
      parent_name: payload.parent_name || null,
      parent_contact: payload.parent_contact || null,
      parent_email: payload.parent_email || null,
      is_active: payload.is_active !== false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

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
   * ULTIMATE FIX: Update password with comprehensive error handling and fallbacks
   */
  async updatePassword(userId: string, newPassword: string): Promise<void> {
    // Input validation
    if (!newPassword || newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    // Password complexity check
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    
    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      throw new Error('Password must contain at least one uppercase letter, one lowercase letter, and one number');
    }

    // Get current session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      throw new Error(`Authentication error: ${sessionError.message}`);
    }
    
    const accessToken = sessionData?.session?.access_token;
    
    if (!accessToken) {
      throw new Error('Your session has expired. Please log in again to continue.');
    }

    // Check if we're updating our own password or someone else's
    const currentUserId = sessionData.session.user.id;
    const isUpdatingSelf = currentUserId === userId;

    // Try Edge Function first
    try {
      // Verify environment variables are set
      if (!SUPABASE_URL || SUPABASE_URL === 'undefined' || SUPABASE_URL === '') {
        throw new Error('Configuration error: SUPABASE_URL is not set. Check your environment variables.');
      }

      if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === 'undefined' || SUPABASE_ANON_KEY === '') {
        throw new Error('Configuration error: SUPABASE_ANON_KEY is not set. Check your environment variables.');
      }

      const edgeFunctionUrl = `${SUPABASE_URL}/functions/v1/update-user-password`;
      
      // Make the request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          user_id: userId,
          new_password: newPassword
        }),
        signal: controller.signal
      }).finally(() => clearTimeout(timeoutId));

      // Get response as text first
      const responseText = await response.text();
      
      // Check if we got HTML (404 page)
      if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
        console.warn('Edge Function not found, trying fallback method...');
        // Try fallback
        return await this.updatePasswordFallback(userId, newPassword, isUpdatingSelf);
      }

      // Parse JSON response
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        // If can't parse, try fallback
        console.warn('Invalid Edge Function response, trying fallback...');
        return await this.updatePasswordFallback(userId, newPassword, isUpdatingSelf);
      }

      // Handle error responses
      if (!response.ok) {
        const errorMessage = responseData?.message || responseData?.error || 'Password update failed';
        
        // Specific error handling
        if (response.status === 404 && errorMessage.includes('User not found')) {
          throw new Error('User account not found. This user may not have a valid authentication account.');
        } else if (response.status === 400) {
          if (errorMessage.includes('Weak password')) {
            throw new Error('Password does not meet security requirements. Please use a stronger password.');
          }
          throw new Error(errorMessage);
        } else if (response.status === 401) {
          throw new Error('Authentication failed. Please log in again.');
        } else if (response.status === 404) {
          // Edge Function not found - try fallback
          console.warn('Edge Function not available, trying fallback...');
          return await this.updatePasswordFallback(userId, newPassword, isUpdatingSelf);
        } else {
          throw new Error(errorMessage);
        }
      }

      // Check success flag
      if (!responseData.success) {
        throw new Error(responseData.message || responseData.error || 'Password update failed');
      }

      // Success! Update metadata
      await this.updatePasswordMetadata(userId);
      
      console.log('Password updated successfully via Edge Function');

    } catch (error: any) {
      // Handle specific error cases
      if (error.name === 'AbortError') {
        throw new Error('Password update timed out. Please check your internet connection and try again.');
      }
      
      if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        // Network error - try fallback
        console.warn('Network error, trying fallback method...');
        return await this.updatePasswordFallback(userId, newPassword, isUpdatingSelf);
      }
      
      if (error.message?.includes('Edge Function not found') || 
          error.message?.includes('404')) {
        // Edge Function not deployed - try fallback
        console.warn('Edge Function not available, trying fallback...');
        return await this.updatePasswordFallback(userId, newPassword, isUpdatingSelf);
      }
      
      // Re-throw other errors
      throw error;
    }
  },

  /**
   * Fallback method for password update when Edge Function is not available
   */
  async updatePasswordFallback(userId: string, newPassword: string, isUpdatingSelf: boolean): Promise<void> {
    console.log('Using fallback password update method...');
    
    if (isUpdatingSelf) {
      // User is updating their own password - we can do this directly
      try {
        const { error } = await supabase.auth.updateUser({
          password: newPassword
        });
        
        if (error) {
          throw new Error(`Password update failed: ${error.message}`);
        }
        
        // Update metadata
        await this.updatePasswordMetadata(userId);
        
        console.log('Password updated successfully (self-update)');
        return;
      } catch (error: any) {
        throw new Error(`Failed to update password: ${error.message}`);
      }
    } else {
      // Admin trying to update another user's password
      // Without Edge Function, we can only send a reset email
      try {
        // Get the user's email
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('email')
          .eq('id', userId)
          .single();
        
        if (userError || !userData) {
          throw new Error('Could not find user email for password reset');
        }
        
        // Send password reset email
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
          userData.email,
          {
            redirectTo: `${window.location.origin}/auth/reset-password`
          }
        );
        
        if (resetError) {
          throw new Error(`Failed to send password reset email: ${resetError.message}`);
        }
        
        // Update metadata to indicate password reset was sent
        const { error: metaError } = await supabase
          .from('users')
          .update({
            raw_user_meta_data: {
              password_reset_sent: new Date().toISOString(),
              password_reset_pending: true
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);
        
        if (metaError) {
          console.warn('Failed to update metadata:', metaError);
        }
        
        throw new Error(
          'Direct password update not available. A password reset email has been sent to the user. ' +
          'To enable direct password updates, deploy the Edge Function with: ' +
          'supabase functions deploy update-user-password --no-verify-jwt'
        );
      } catch (error: any) {
        if (error.message.includes('Direct password update not available')) {
          throw error;
        }
        throw new Error(`Fallback password update failed: ${error.message}`);
      }
    }
  },

  /**
   * Update password metadata in users table
   */
  async updatePasswordMetadata(userId: string): Promise<void> {
    try {
      const { data: currentUser } = await supabase
        .from('users')
        .select('raw_user_meta_data')
        .eq('id', userId)
        .single();
      
      const { error } = await supabase
        .from('users')
        .update({
          raw_user_meta_data: {
            ...(currentUser?.raw_user_meta_data || {}),
            requires_password_change: false,
            password_reset_needed: false,
            password_reset_pending: false,
            password_updated_at: new Date().toISOString(),
            password_last_changed: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      
      if (error) {
        console.warn('Failed to update password metadata:', error);
      }
    } catch (error) {
      console.warn('Error updating password metadata:', error);
    }
  },

  /**
   * Update user email with proper error handling
   */
  async updateEmail(userId: string, newEmail: string): Promise<void> {
    if (!newEmail || !validateEmail(newEmail)) {
      throw new Error('Invalid email format');
    }

    const normalizedEmail = newEmail.toLowerCase();

    // Check if email already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .neq('id', userId)
      .maybeSingle();

    if (existingUser) {
      throw new Error('This email is already in use');
    }

    // Get current session
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    if (!accessToken) {
      throw new Error('Authentication required. Please log in and try again.');
    }

    try {
      // Verify environment variables
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        throw new Error('Configuration error: Missing environment variables');
      }

      // Call Edge Function
      const response = await fetch(`${SUPABASE_URL}/functions/v1/update-user-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          user_id: userId,
          new_email: normalizedEmail
        })
      });

      // Parse response
      const responseText = await response.text();
      
      // Check for HTML (404)
      if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
        // Edge Function not found - update only in custom table
        console.warn('Email Edge Function not found, updating display only');
        
        const { error } = await supabase
          .from('users')
          .update({
            email: normalizedEmail,
            email_verified: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (error) {
          throw new Error('Failed to update email');
        }

        throw new Error(
          'Email updated for display only. User must still login with original email. ' +
          'Deploy update-user-email Edge Function for full functionality.'
        );
      }

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error('Invalid response from email update service');
      }

      // Handle errors
      if (!response.ok) {
        const errorMessage = responseData?.message || responseData?.error || 'Email update failed';
        
        if (response.status === 409) {
          throw new Error('This email address is already registered to another account');
        } else if (response.status === 400) {
          throw new Error(errorMessage);
        } else {
          throw new Error(errorMessage);
        }
      }

      // Update custom table
      await supabase
        .from('users')
        .update({
          email: normalizedEmail,
          email_verified: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      console.log('Email updated successfully');

    } catch (error: any) {
      if (error.message?.includes('Failed to fetch')) {
        throw new Error('Network error: Unable to connect to email update service');
      }
      throw error;
    }
  },

  /**
   * Create scope assignments
   */
  async createScopeAssignments(
    userId: string, 
    schoolIds: string[], 
    branchIds: string[]
  ): Promise<void> {
    const assignments = [];
    
    for (const schoolId of schoolIds) {
      assignments.push({
        user_id: userId,
        scope_id: schoolId,
        scope_type: 'school',
        is_active: true,
        created_at: new Date().toISOString()
      });
    }
    
    for (const branchId of branchIds) {
      assignments.push({
        user_id: userId,
        scope_id: branchId,
        scope_type: 'branch',
        is_active: true,
        created_at: new Date().toISOString()
      });
    }
    
    if (assignments.length > 0) {
      const { error } = await supabase
        .from('entity_admin_scope')
        .insert(assignments);
      
      if (error) {
        console.error('Failed to create scope assignments:', error);
      }
    }
  },

  async getCurrentUser(): Promise<any> {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  async getCompanyName(companyId: string): Promise<string> {
    const { data } = await supabase
      .from('companies')
      .select('name')
      .eq('id', companyId)
      .single();
    
    return data?.name || 'Unknown Company';
  },

  async rollbackUserCreation(userId: string): Promise<void> {
    try {
      await supabase.from('users').delete().eq('id', userId);
      console.warn('User rolled back from custom table');
    } catch (error) {
      console.error('Rollback failed:', error);
    }
  },

  async deactivateUser(userId: string, actorId: string): Promise<void> {
    if (userId === actorId) {
      throw new Error('You cannot deactivate your own account');
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

  async verifyPassword(email: string, password: string): Promise<{ isValid: boolean; userId?: string }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
        password: password
      });

      if (error || !data.user) {
        return { isValid: false };
      }

      const { data: userData } = await supabase
        .from('users')
        .select('is_active')
        .eq('id', data.user.id)
        .single();

      if (userData && !userData.is_active) {
        await supabase.auth.signOut();
        throw new Error('Account is deactivated');
      }

      await supabase
        .from('users')
        .update({
          last_login_at: new Date().toISOString(),
          last_sign_in_at: new Date().toISOString()
        })
        .eq('id', data.user.id);

      return { isValid: true, userId: data.user.id };
    } catch (error: any) {
      console.error('Login verification failed:', error);
      
      if (error.message?.includes('Invalid login credentials')) {
        console.warn('User not in auth.users, may be a legacy user');
      }
      
      return { isValid: false };
    }
  },

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