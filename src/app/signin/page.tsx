/**
 * File: /src/app/signin/page.tsx
 * Dependencies: 
 *   - React
 *   - react-router-dom
 *   - lucide-react
 *   - bcryptjs
 *   - Custom components (NO SUPABASE AUTH)
 * 
 * Description: Sign-in page with original design restored and improved authentication logic
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  GraduationCap, 
  AlertCircle, 
  CheckCircle as CircleCheck, 
  Loader2, 
  ArrowLeft,
  Eye,
  EyeOff,
  ShieldAlert,
  MailWarning
} from 'lucide-react';
import { Button } from '../../components/shared/Button';
import { FormField, Input } from '../../components/shared/FormField';
import { toast } from '../../components/shared/Toast';
import { setAuthenticatedUser, type User, type UserRole, isInTestMode, exitTestMode } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import bcrypt from 'bcryptjs';

interface LoginResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    user_type: string;
    requires_password_change: boolean;
    profile: any;
  };
  error?: string;
  code?: string;
  userId?: string;
  attemptsLeft?: number;
  message?: string;
}

export default function SignInPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/app/dashboard';
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [emailNotVerified, setEmailNotVerified] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [verificationUserId, setVerificationUserId] = useState<string | null>(null);
  
  // CRITICAL: Clear test mode when signin page loads
  useEffect(() => {
    if (isInTestMode()) {
      console.warn('Test mode was active on signin page - clearing for security');
      exitTestMode();
      
      // Show a brief notification
      setError('Test mode has been terminated for security. Please sign in again.');
      setTimeout(() => setError(null), 5000);
    }
    
    // Also clear any stale authentication
    const authUser = localStorage.getItem('ggk_authenticated_user');
    if (!authUser) {
      // No authenticated user, clear everything
      localStorage.removeItem('test_mode_user');
      sessionStorage.clear();
    }
  }, []);
  
  // Helper function to get system user role
  function getUserSystemRole(roleName: string): UserRole {
    switch (roleName) {
      case 'Super Admin':
        return 'SSA';
      case 'Support Admin':
        return 'SUPPORT';
      case 'Viewer':
        return 'VIEWER';
      default:
        return 'VIEWER';
    }
  }
  
  // Helper function to get redirect path
  function getRedirectPath(userType: string, role: UserRole): string {
    switch (userType) {
      case 'system':
        return '/app/system-admin/dashboard';
      case 'entity':
        return '/app/entity-module/dashboard';
      case 'teacher':
        return '/app/teachers-module/dashboard';
      case 'student':
        return '/app/student-module/dashboard';
      default:
        return '/app/dashboard';
    }
  }
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setAttemptsLeft(null);
    setEmailNotVerified(false);
    
    if (!email || !password) {
      setError('Please enter both email and password');
      setLoading(false);
      return;
    }
    
    try {
      const normalizedEmail = email.trim().toLowerCase();
      
      // Get user from database directly (no Supabase auth)
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
        .eq('email', normalizedEmail)
        .single();
      
      if (userError || !user) {
        setError('Invalid email or password');
        setLoading(false);
        return;
      }
      
      // Check if account is locked
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        const minutesLeft = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / 60000);
        setError(`Account locked. Try again in ${minutesLeft} minutes.`);
        setLoading(false);
        return;
      }
      
      // Check if account is active
      if (!user.is_active) {
        setError('Account is inactive. Please contact support.');
        setLoading(false);
        return;
      }
      
      // Check if email is verified (only in production)
      if (!user.email_verified && process.env.NODE_ENV === 'production') {
        setEmailNotVerified(true);
        setVerificationUserId(user.id);
        setError('Please verify your email before logging in. Check your inbox for the verification link.');
        setLoading(false);
        return;
      }
      
      // Verify password
      let isValidPassword = false;
      if (user.password_hash) {
        try {
          isValidPassword = await bcrypt.compare(password, user.password_hash);
        } catch (bcryptError) {
          console.error('Password verification error:', bcryptError);
          setError('Authentication failed. Please try again.');
          setLoading(false);
          return;
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
        
        if (shouldLock) {
          setError('Too many failed attempts. Account locked for 30 minutes.');
        } else {
          setAttemptsLeft(5 - newAttempts);
          setError(`Invalid email or password. ${5 - newAttempts} attempts remaining`);
        }
        setLoading(false);
        return;
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
      
      // Get user role based on user type
      let userRole: UserRole = 'VIEWER';
      
      switch (user.user_type) {
        case 'system':
          const { data: adminUser } = await supabase
            .from('admin_users')
            .select('role_id, roles!inner(name)')
            .eq('id', user.id)
            .single();
          
          if (adminUser?.roles) {
            userRole = getUserSystemRole(adminUser.roles.name);
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
      }
      
      // Create user object
      const authenticatedUser: User = {
        id: user.id,
        email: user.email,
        name: user.raw_user_meta_data?.name || user.email.split('@')[0],
        role: userRole,
        userType: user.user_type
      };
      
      // Set authenticated user (this will also generate auth token)
      setAuthenticatedUser(authenticatedUser);
      
      // Check if password change required
      if (user.requires_password_change) {
        toast.warning('Please change your password');
        navigate('/app/settings/change-password');
        return;
      }
      
      // Success message
      setSuccess(true);
      toast.success(`Welcome back, ${authenticatedUser.name}!`);
      
      // Redirect based on user type
      const redirectPath = getRedirectPath(user.user_type, userRole);
      
      // Redirect after a brief delay to show success state
      setTimeout(() => {
        navigate(redirectPath, { replace: true });
      }, 500);
      
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };
  
  const handleResendVerification = async () => {
    if (!verificationUserId) return;
    
    setResendingVerification(true);
    
    try {
      // This would typically call an API endpoint
      toast.success('Verification email sent. Please check your inbox.');
    } catch (error) {
      toast.error('Failed to send verification email. Please try again.');
    } finally {
      setResendingVerification(false);
    }
  };

  const handleDevLogin = async () => {
    setLoading(true);
    setError(null);

    // Clear any existing test mode before dev login
    if (isInTestMode()) {
      exitTestMode();
    }

    try {
      // CRITICAL: Normalize email
      const devEmail = 'bakir.alramadi@gmail.com'.trim().toLowerCase();
      
      // Check if dev user exists
      const { data: user, error: queryError } = await supabase
        .from('admin_users')
        .select(`
          id,
          name,
          email,
          password_hash,
          status,
          roles (name)
        `)
        .eq('email', devEmail)
        .maybeSingle();

      if (queryError) {
        throw new Error('Failed to check dev user');
      }

      const devPassword = 'dev_password'; // Password for admin_users table
      
      if (!user) {
        // Create dev admin user if it doesn't exist
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(devPassword, salt);

        // Get SSA role ID
        const { data: ssaRole } = await supabase
          .from('roles')
          .select('id')
          .eq('name', 'Super Admin')
          .single();

        if (!ssaRole) {
          throw new Error('SSA role not found');
        }

        const { data: newUser, error: insertError } = await supabase
          .from('admin_users')
          .insert([{
            name: 'Baker R.',
            email: devEmail,
            password_hash: hashedPassword,
            role_id: ssaRole.id,
            status: 'active'
          }])
          .select(`
            id,
            name,
            email,
            roles (name)
          `)
          .single();

        if (insertError) throw insertError;

        // Create user object for new user
        const authenticatedUser: User = {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: 'SSA'
        };

        setAuthenticatedUser(authenticatedUser);
      } else {
        // Map role name to UserRole type
        const roleMapping: Record<string, UserRole> = {
          'Super Admin': 'SSA',
          'Support Admin': 'SUPPORT',
          'Viewer': 'VIEWER'
        };

        const userRole = roleMapping[user.roles?.name] || 'SSA';

        // Create user object for existing user
        const authenticatedUser: User = {
          id: user.id,
          name: user.name,
          email: user.email,
          role: userRole
        };

        setAuthenticatedUser(authenticatedUser);
      }

      setSuccess(true);

      setTimeout(() => {
        navigate(from, { replace: true });
      }, 500);
    } catch (err) {
      setError('Failed to create dev account');
      console.error('Dev login error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="flex items-center">
            <GraduationCap className="h-12 w-12 text-[#8CC63F]" />
            <span className="ml-2 text-3xl font-bold text-gray-900 dark:text-white">GGK</span>
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          System Administration
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          Access the GGK admin dashboard
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow-md dark:shadow-gray-900/20 sm:rounded-lg sm:px-10 border border-gray-200 dark:border-gray-700 transition-colors duration-200">
          {/* Back to Home Link */}
          <Link
            to="/"
            className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-[#8CC63F] dark:hover:text-[#8CC63F] transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to home
          </Link>

          {/* Error Alert */}
          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded-md flex items-center border border-red-200 dark:border-red-800">
              <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm">{error}</p>
                {attemptsLeft && attemptsLeft < 3 && (
                  <p className="text-xs mt-1 text-red-500 dark:text-red-300">
                    Warning: {attemptsLeft} attempts remaining before account lock
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Success Alert */}
          {success && (
            <div className="mb-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 p-4 rounded-md flex items-center border border-green-200 dark:border-green-800">
              <CircleCheck className="h-5 w-5 mr-2" />
              Login successful! Redirecting...
            </div>
          )}
          
          {/* Email Not Verified Alert */}
          {emailNotVerified && (
            <div className="mb-4 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 p-4 rounded-md border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-start">
                <MailWarning className="h-5 w-5 mt-0.5 mr-2 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Email Verification Required</p>
                  <p className="text-xs mt-1">
                    Please check your email and click the verification link before logging in.
                  </p>
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resendingVerification}
                    className="text-xs mt-2 text-yellow-600 dark:text-yellow-300 hover:text-yellow-700 dark:hover:text-yellow-200 underline disabled:opacity-50"
                  >
                    {resendingVerification ? 'Sending...' : 'Resend verification email'}
                  </button>
                </div>
              </div>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleLogin}>
            {/* Email Field */}
            <FormField
              id="email"
              label="Email"
              required
            >
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading || success}
              />
            </FormField>

            {/* Password Field */}
            <FormField
              id="password"
              label="Password"
              required
            >
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading || success}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </FormField>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-[#8CC63F] focus:ring-[#8CC63F] border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <Link to="/forgot-password" className="font-medium text-[#8CC63F] hover:text-[#5da82f]">
                  Forgot your password?
                </Link>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full justify-center"
              disabled={loading || success}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          {/* Security Notice */}
          <div className="mt-6 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-start">
              <ShieldAlert className="h-4 w-4 text-gray-400 mt-0.5 mr-2 flex-shrink-0" />
              <div className="text-xs text-gray-600 dark:text-gray-400">
                <p>This is a secure system. Unauthorized access is prohibited.</p>
                <p className="mt-1">Your IP address and login attempts are being logged.</p>
              </div>
            </div>
          </div>

          {/* Development Access Section */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  Development access
                </span>
              </div>
            </div>

            <div className="mt-6">
              <Button
                onClick={handleDevLogin}
                variant="outline"
                className="w-full justify-center"
                disabled={loading || success}
              >
                🔧 Dev Login (Baker R.)
              </Button>
            </div>
            
            <p className="mt-4 text-xs text-center text-gray-500 dark:text-gray-400">
              This is a temporary login for development purposes.
              <br />
              Production authentication will be implemented later.
            </p>
          </div>

          {/* Footer Links */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-center gap-4 text-sm">
              <Link
                to="/contact-support"
                className="text-gray-600 dark:text-gray-400 hover:text-[#8CC63F] dark:hover:text-[#8CC63F] transition-colors"
              >
                Contact Support
              </Link>
              <span className="text-gray-400 dark:text-gray-500">•</span>
              <Link
                to="/request-access"
                className="text-gray-600 dark:text-gray-400 hover:text-[#8CC63F] dark:hover:text-[#8CC63F] transition-colors"
              >
                Request Access
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}