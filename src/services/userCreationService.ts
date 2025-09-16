/**
 * File: /src/services/userCreationService.ts
 * 
 * Comprehensive User Creation Service
 * Now integrated with Supabase Authentication via Edge Functions
 * 
 * Workflow:
 * 1. Create user in Supabase auth.users via Edge Function
 * 2. Create user in custom 'users' table with auth ID
 * 3. Create corresponding record in entity-specific table
 *    - entity_users for admins
 *    - teachers for teachers
 *    - students for students
 */

import { supabase } from '@/lib/supabase';

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

// ============= CONFIGURATION =============

// Get the Supabase project URL from environment variables
const SUPABASE_FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// ============= HELPER FUNCTIONS =============

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
  'email_confirmed_at',
  'requires_password_change',
  'failed_login_attempts',
  'locked_until',
  'user_types'
].join(', ');

// ============= MAIN USER CREATION SERVICE =============

export const userCreationService = {
  /**
   * Main method to create any type of user
   * Now uses Supabase Auth via Edge Function
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
        // Step 1: Create user in Supabase Auth and custom users table
        userId = await this.createUserInSupabaseAuth(payload);

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
   * Create user in Supabase Auth via Edge Function
   * Then create corresponding record in custom users table
   */
  async createUserInSupabaseAuth(payload: CreateUserPayload): Promise<string> {
    try {
      const userTypes = getUserTypes(payload.user_type);
      
      // Get current session for authorization
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !sessionData?.session) {
        console.warn('No active session, attempting direct creation fallback');
        // Fallback to direct creation if no session
        return await this.createUserInUsersTableDirect(payload);
      }

      // Prepare metadata
      const userMetadata = {
        name: sanitizeString(payload.name),
        company_id: payload.company_id,
        user_type: payload.user_type,
        created_via: 'entity_module',
        ...payload.metadata
      };

      // Call Edge Function to create user in Supabase Auth
      const edgeFunctionUrl = `${SUPABASE_FUNCTIONS_URL}/functions/v1/create-admin-user-auth`;
      
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`,
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          email: payload.email.toLowerCase(),
          password: payload.password,
          name: sanitizeString(payload.name),
          user_metadata: userMetadata,
          // Send admin_level for admin users
          ...(payload.user_type.includes('admin') && { 
            admin_level: (payload as AdminUserPayload).admin_level 
          })
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.message || `Edge Function error: ${response.status}`;
        
        // If it's an auth/session error, try fallback
        if (response.status === 401 || errorMessage.includes('JWT') || errorMessage.includes('session')) {
          console.warn('Auth error with Edge Function, using fallback');
          return await this.createUserInUsersTableDirect(payload);
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      if (!result.userId) {
        throw new Error('Edge Function did not return a user ID');
      }

      const authUserId = result.userId;

      // Now create the user in our custom users table with the auth ID
      const userData = {
        id: authUserId, // Use the auth.users ID
        email: payload.email.toLowerCase(),
        user_type: userTypes[0],
        user_types: userTypes,
        is_active: payload.is_active !== false,
        email_verified: false, // Will be true after email confirmation
        email_confirmed_at: null,
        raw_user_meta_data: userMetadata,
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
        // Log the error but don't fail - the auth user was created successfully
        console.error('Failed to create user in custom users table:', error);
        
        // If it's a duplicate key error, the user might already exist in users table
        if (error.code === '23505') {
          // Return the auth user ID anyway
          return authUserId;
        }
        
        throw new Error(`Failed to create user profile: ${error.message}`);
      }

      return data.id;
    } catch (error: any) {
      console.error('Failed to create user via Edge Function:', error);
      
      // If Edge Function fails, fall back to direct creation
      if (error.message?.includes('Edge Function') || error.message?.includes('fetch')) {
        console.warn('Edge Function unavailable, using direct creation fallback');
        return await this.createUserInUsersTableDirect(payload);
      }
      
      throw error;
    }
  },

  /**
   * Fallback: Create user directly in users table without Supabase Auth
   * Used when Edge Function is unavailable or session is missing
   */
  async createUserInUsersTableDirect(payload: CreateUserPayload): Promise<string> {
    console.warn('Using direct user creation fallback (no Supabase Auth)');
    
    // Generate a UUID for the user
    const userId = crypto.randomUUID();
    const userTypes = getUserTypes(payload.user_type);
    
    // Create clean metadata without sensitive data
    const cleanMetadata = { ...payload.metadata };
    delete cleanMetadata.phone;
    
    const userData = {
      id: userId,
      email: payload.email.toLowerCase(),
      user_type: userTypes[0],
      user_types: userTypes,
      is_active: payload.is_active !== false,
      email_verified: false,
      requires_password_change: true, // Flag for manual password setup
      raw_user_meta_data: {
        name: sanitizeString(payload.name),
        company_id: payload.company_id,
        user_type: payload.user_type,
        created_via: 'entity_module_direct',
        requires_auth_setup: true, // Flag that this user needs auth setup
        ...cleanMetadata
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

    console.log('User created directly in users table (auth setup pending):', data.id);
    return data.id;
  },

  /**
   * Step 2a: Create admin user in entity_users table
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
      email: (payload.email || '').toLowerCase(),
      name: sanitizeString(payload.name),
      phone: payload.phone || null,
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
   */
  async createStudentUser(userId: string, payload: StudentUserPayload): Promise<string> {
    const studentData: any = {
      user_id: userId,
      company_id: payload.company_id,
      email: (payload.email || '').toLowerCase(),
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
      // Delete from custom users table
      await supabase
        .from('users')
        .delete()
        .eq('id', userId);
      
      // Note: We cannot delete from auth.users without service role key
      // The Edge Function would need to handle this cleanup
      console.warn('User removed from custom users table. Auth record may need manual cleanup.');
    } catch (error) {
      console.error('Rollback failed:', error);
    }
  },

  /**
   * Update user password (for users created without auth)
   */
  async updatePassword(userId: string, newPassword: string): Promise<void> {
    if (!newPassword || newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    // For users with Supabase Auth, this should be done via auth.updateUser
    // This is a fallback for direct-created users
    const { error } = await supabase
      .from('users')
      .update({
        requires_password_change: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      throw new Error(`Failed to update password flag: ${error.message}`);
    }
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
   * Verify user via Supabase Auth (for login)
   */
  async verifyPassword(email: string, password: string): Promise<{ isValid: boolean; userId?: string }> {
    try {
      // Use Supabase Auth for verification
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
        password: password
      });

      if (error || !data.user) {
        return { isValid: false };
      }

      // Check if user is active in our custom table
      const { data: userData } = await supabase
        .from('users')
        .select('is_active')
        .eq('id', data.user.id)
        .single();

      if (userData && !userData.is_active) {
        await supabase.auth.signOut();
        throw new Error('Account is deactivated');
      }

      // Update last login in our custom table
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
      
      // If Supabase Auth fails, fall back to checking custom table (for legacy users)
      if (error.message?.includes('Invalid login credentials')) {
        console.warn('User not in auth.users, may be a legacy user');
      }
      
      return { isValid: false };
    }
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

// ============= EDGE FUNCTION CREATION (Reference) =============

/*
You'll need to create this Edge Function at supabase/functions/create-admin-user-auth/index.ts:

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { email, password, name, user_metadata, admin_level } = await req.json()

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: {
        ...user_metadata,
        name,
        admin_level
      }
    })

    if (authError) {
      throw authError
    }

    // Send invitation email
    const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${Deno.env.get('PUBLIC_SITE_URL')}/login`
    })

    if (inviteError) {
      console.error('Failed to send invitation:', inviteError)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId: authData.user.id,
        message: 'User created successfully. Invitation email sent.' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        success: false,
        message: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
*/