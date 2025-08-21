import { supabase } from '../lib/supabase';
import { setAuthenticatedUser, mapUserTypeToRole, type User, type UserRole } from '../lib/auth';
import bcrypt from 'bcryptjs';

interface LoginResponse {
  success: boolean;
  user?: User;
  error?: string;
  message?: string;
}

interface PasswordResetResponse {
  success: boolean;
  message: string;
}

export const authService = {
  /**
   * Login user with email and password
   */
  async login({ email, password }: { email: string; password: string }): Promise<LoginResponse> {
    try {
      // Get user from database
      const { data: user, error: userError } = await supabase
        .from('users')
        .select(`
          id,
          email,
          password_hash,
          user_type,
          is_active,
          email_verified,
          locked_until,
          failed_login_attempts,
          requires_password_change,
          raw_user_meta_data
        `)
        .eq('email', email.toLowerCase())
        .single();
      
      // Check if user exists
      if (userError || !user) {
        return {
          success: false,
          error: 'Invalid credentials'
        };
      }
      
      // Check if account is locked
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        const minutesLeft = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / 60000);
        return {
          success: false,
          error: `Account locked. Try again in ${minutesLeft} minutes.`
        };
      }
      
      // Check if account is active
      if (!user.is_active) {
        return {
          success: false,
          error: 'Account is inactive. Please contact support.'
        };
      }
      
      // Verify password
      let isValidPassword = false;
      
      if (user.password_hash) {
        try {
          isValidPassword = await bcrypt.compare(password, user.password_hash);
        } catch (bcryptError) {
          console.error('Bcrypt error:', bcryptError);
          return {
            success: false,
            error: 'Authentication failed'
          };
        }
      }
      
      if (!isValidPassword) {
        // Increment failed attempts
        const newAttempts = (user.failed_login_attempts || 0) + 1;
        const shouldLock = newAttempts >= 5;
        
        await supabase
          .from('users')
          .update({
            failed_login_attempts: newAttempts,
            locked_until: shouldLock ? new Date(Date.now() + 30 * 60 * 1000).toISOString() : null
          })
          .eq('id', user.id);
        
        // Return appropriate error
        if (shouldLock) {
          return {
            success: false,
            error: 'Too many failed attempts. Account locked for 30 minutes.'
          };
        }
        
        return {
          success: false,
          error: 'Invalid credentials'
        };
      }
      
      // Success - reset failed attempts and update last login
      await supabase
        .from('users')
        .update({
          failed_login_attempts: 0,
          locked_until: null,
          last_login_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      // Get user profile details based on user type
      let userRole: UserRole = 'VIEWER';
      
      switch (user.user_type) {
        case 'system':
          const { data: adminProfile } = await supabase
            .from('admin_users')
            .select('role_id, status, roles(name)')
            .eq('id', user.id)
            .single();
          
          if (adminProfile?.roles?.name) {
            const roleMapping: Record<string, UserRole> = {
              'Super Admin': 'SSA',
              'Support Admin': 'SUPPORT',
              'Viewer': 'VIEWER'
            };
            userRole = roleMapping[adminProfile.roles.name] || 'VIEWER';
          }
          break;
          
        case 'entity':
          userRole = 'ENTITY_ADMIN';
          break;
          
        case 'teacher':
          userRole = 'TEACHER';
          break;
          
        case 'student':
          userRole = 'STUDENT';
          break;
          
        default:
          userRole = mapUserTypeToRole(user.user_type);
      }
      
      // Create user object
      const authenticatedUser: User = {
        id: user.id,
        name: user.raw_user_meta_data?.name || user.email.split('@')[0],
        email: user.email,
        role: userRole,
        userType: user.user_type
      };
      
      // Set authenticated user in localStorage
      setAuthenticatedUser(authenticatedUser);
      
      return {
        success: true,
        user: authenticatedUser,
        message: 'Login successful'
      };
      
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'An error occurred during login'
      };
    }
  },

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<PasswordResetResponse> {
    try {
      // Check if user exists
      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, user_type')
        .eq('email', email.toLowerCase())
        .single();

      if (error || !user) {
        // Don't reveal if email exists or not for security
        return {
          success: true,
          message: 'If an account with this email exists, you will receive password reset instructions.'
        };
      }

      // Generate reset token
      const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Store reset token
      const { error: tokenError } = await supabase
        .from('password_reset_tokens')
        .insert({
          user_id: user.id,
          user_type: user.user_type === 'system' ? 'admin' : 'user',
          token,
          expires_at: expiresAt.toISOString()
        });

      if (tokenError) {
        console.error('Token creation error:', tokenError);
        return {
          success: false,
          message: 'Failed to create password reset request'
        };
      }

      // In a real app, you would send an email here
      console.log(`Password reset link: ${window.location.origin}/reset-password?token=${token}`);

      return {
        success: true,
        message: 'Password reset instructions have been sent to your email.'
      };
    } catch (error) {
      console.error('Password reset error:', error);
      return {
        success: false,
        message: 'Failed to process password reset request'
      };
    }
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    try {
      const user = localStorage.getItem('ggk_authenticated_user');
      return !!user;
    } catch {
      return false;
    }
  },

  /**
   * Get current authenticated user
   */
  getCurrentUser(): User | null {
    try {
      const user = localStorage.getItem('ggk_authenticated_user');
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  }
};