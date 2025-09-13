/**
 * File: /src/services/supabaseAuthService.ts
 * 
 * Supabase Auth Service - Handles all Auth operations
 * Ensures users are created in Supabase Auth and invitations are sent
 */

import { createClient } from '@supabase/supabase-js';

// Get environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validation
if (!SUPABASE_URL) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL is not set');
}

if (!SERVICE_ROLE_KEY) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY is not set');
  console.log('To enable Supabase Auth invitations, add to your .env.local:');
  console.log('NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here');
}

// Initialize admin client only if we have both required values
let supabaseAdmin: any = null;
let _isAuthEnabledInternal = false;

if (SUPABASE_URL && SERVICE_ROLE_KEY) {
  try {
    supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      },
      db: {
        schema: 'auth' // Explicitly use auth schema for auth operations
      }
    });
    
    _isAuthEnabledInternal = true;
    console.log('✅ Supabase Auth Service initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Supabase Admin client:', error);
  }
}

export const supabaseAuthService = {
  /**
   * Check if Auth is properly configured
   */
  isEnabled(): boolean {
    return _isAuthEnabledInternal && supabaseAdmin !== null;
  },

  /**
   * Verify the admin client is working by making a test call
   */
  async verifyConnection(): Promise<boolean> {
    if (!this.isEnabled()) {
      console.log('Auth service not enabled');
      return false;
    }

    try {
      // Try to list users (with limit 1) to verify connection
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1
      });

      if (error) {
        console.error('❌ Auth connection test failed:', error);
        return false;
      }

      console.log('✅ Auth connection verified successfully');
      return true;
    } catch (error) {
      console.error('❌ Auth connection test error:', error);
      return false;
    }
  },

  /**
   * Create a new user in Supabase Auth and send invitation
   */
  async createUserAndSendInvitation(params: {
    email: string;
    password?: string;
    userData?: any;
    sendInvite?: boolean;
  }): Promise<{
    success: boolean;
    userId?: string;
    error?: any;
    method?: 'invitation' | 'password';
  }> {
    if (!this.isEnabled()) {
      console.warn('Auth service not enabled, cannot create Auth user');
      return { 
        success: false, 
        error: 'Auth service not configured',
        method: 'password'
      };
    }

    const { email, password, userData, sendInvite = true } = params;

    try {
      console.log(`🔄 Creating Auth user for: ${email}`);
      
      if (sendInvite && !password) {
        // Method 1: Send invitation email (preferred)
        console.log('📧 Sending invitation email...');
        
        const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
          data: userData || {},
          redirectTo: `${window.location.origin}/auth/accept-invite` // Customize this URL
        });

        if (error) {
          console.error('❌ Invitation failed:', error);
          
          // Check if user already exists
          if (error.message?.includes('already registered')) {
            console.log('User already exists in Auth, trying to get their ID...');
            const existingUser = await this.getUserByEmail(email);
            if (existingUser) {
              return {
                success: true,
                userId: existingUser.id,
                method: 'invitation',
                error: 'User already exists'
              };
            }
          }
          
          return { success: false, error: error.message };
        }

        console.log('✅ Invitation sent successfully');
        return {
          success: true,
          userId: data?.user?.id,
          method: 'invitation'
        };

      } else if (password) {
        // Method 2: Create with password (fallback)
        console.log('🔑 Creating user with password...');
        
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email: email,
          password: password,
          email_confirm: true, // Auto-confirm email since admin is creating
          user_metadata: userData || {}
        });

        if (error) {
          console.error('❌ User creation failed:', error);
          
          // Check if user already exists
          if (error.message?.includes('already registered')) {
            const existingUser = await this.getUserByEmail(email);
            if (existingUser) {
              return {
                success: true,
                userId: existingUser.id,
                method: 'password',
                error: 'User already exists'
              };
            }
          }
          
          return { success: false, error: error.message };
        }

        console.log('✅ User created with password');
        
        // Send password reset email so user can set their own password
        if (sendInvite) {
          await this.sendPasswordResetEmail(email);
        }

        return {
          success: true,
          userId: data?.user?.id,
          method: 'password'
        };
      }

      return { 
        success: false, 
        error: 'Either invitation or password must be provided' 
      };

    } catch (error: any) {
      console.error('❌ Unexpected error in createUserAndSendInvitation:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  },

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<any | null> {
    if (!this.isEnabled()) return null;

    try {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000 // Adjust as needed
      });

      if (error) {
        console.error('Error fetching users:', error);
        return null;
      }

      // Find user by email
      const user = data?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
      return user || null;

    } catch (error) {
      console.error('Error in getUserByEmail:', error);
      return null;
    }
  },

  /**
   * Update user in Supabase Auth
   */
  async updateUser(userId: string, updates: any): Promise<{
    success: boolean;
    error?: any;
  }> {
    if (!this.isEnabled()) {
      return { success: false, error: 'Auth service not configured' };
    }

    try {
      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, updates);

      if (error) {
        console.error('Error updating Auth user:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error in updateUser:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Delete user from Supabase Auth
   */
  async deleteUser(userId: string): Promise<{
    success: boolean;
    error?: any;
  }> {
    if (!this.isEnabled()) {
      return { success: false, error: 'Auth service not configured' };
    }

    try {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

      if (error) {
        console.error('Error deleting Auth user:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error in deleteUser:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string): Promise<{
    success: boolean;
    error?: any;
  }> {
    if (!this.isEnabled()) {
      return { success: false, error: 'Auth service not configured' };
    }

    try {
      const { error } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: email
      });

      if (error) {
        console.error('Error sending password reset:', error);
        return { success: false, error: error.message };
      }

      console.log(`📧 Password reset email sent to ${email}`);
      return { success: true };

    } catch (error: any) {
      console.error('Error in sendPasswordResetEmail:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Resend invitation email
   */
  async resendInvitation(email: string, userData?: any): Promise<{
    success: boolean;
    error?: any;
  }> {
    if (!this.isEnabled()) {
      return { success: false, error: 'Auth service not configured' };
    }

    try {
      // First check if user exists
      const existingUser = await this.getUserByEmail(email);
      
      if (existingUser) {
        // User exists, send magic link
        const { error } = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email: email
        });

        if (error) {
          console.error('Error sending magic link:', error);
          return { success: false, error: error.message };
        }

        console.log(`📧 Magic link sent to existing user: ${email}`);
        return { success: true };
      } else {
        // User doesn't exist, send invitation
        const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
          data: userData || {},
          redirectTo: `${window.location.origin}/auth/accept-invite`
        });

        if (error) {
          console.error('Error resending invitation:', error);
          return { success: false, error: error.message };
        }

        console.log(`📧 Invitation resent to: ${email}`);
        return { success: true };
      }
    } catch (error: any) {
      console.error('Error in resendInvitation:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Debug: List all Auth users
   */
  async listAllAuthUsers(): Promise<any[]> {
    if (!this.isEnabled()) {
      console.log('Auth service not enabled');
      return [];
    }

    try {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000
      });

      if (error) {
        console.error('Error listing users:', error);
        return [];
      }

      console.log(`Found ${data?.users?.length || 0} users in Supabase Auth`);
      return data?.users || [];
    } catch (error) {
      console.error('Error in listAllAuthUsers:', error);
      return [];
    }
  }
};

// Export for convenience (with proper binding)
export const isAuthEnabled = () => supabaseAuthService.isEnabled();
export const verifyAuthConnection = () => supabaseAuthService.verifyConnection();
export const createUserAndSendInvitation = supabaseAuthService.createUserAndSendInvitation.bind(supabaseAuthService);
export const getAuthUserByEmail = supabaseAuthService.getUserByEmail.bind(supabaseAuthService);
export const updateAuthUser = supabaseAuthService.updateUser.bind(supabaseAuthService);
export const deleteAuthUser = supabaseAuthService.deleteUser.bind(supabaseAuthService);
export const sendPasswordResetEmail = supabaseAuthService.sendPasswordResetEmail.bind(supabaseAuthService);
export const resendAuthInvitation = supabaseAuthService.resendInvitation.bind(supabaseAuthService);
export const listAllAuthUsers = supabaseAuthService.listAllAuthUsers.bind(supabaseAuthService);

// Auto-verify connection on module load (in development)
if (process.env.NODE_ENV === 'development' && supabaseAuthService.isEnabled()) {
  supabaseAuthService.verifyConnection().then(isConnected => {
    if (!isConnected) {
      console.error('⚠️ Supabase Auth connection failed. Check your service role key.');
    }
  });
}