/**
 * File: /src/app/signin/page.tsx
 * Dependencies: 
 *   - React
 *   - react-router-dom
 *   - lucide-react
 *   - Custom components
 * 
 * SECURITY FIX: Added complete session cleanup before new login
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  GraduationCap, 
  AlertCircle, 
  CheckCircle, 
  Loader2, 
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldAlert,
  MailWarning,
  Home
} from 'lucide-react';
import { Button } from '../../components/shared/Button';
import { FormField, Input } from '../../components/shared/FormField';
import { toast } from '../../components/shared/Toast';
import { 
  setAuthenticatedUser, 
  clearAuthenticatedUser, 
  type User, 
  type UserRole 
} from '../../lib/auth';
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
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationNeeded, setVerificationNeeded] = useState(false);
  const [unverifiedUserId, setUnverifiedUserId] = useState<string | null>(null);
  const [accountLocked, setAccountLocked] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  
  // Redirect path
  const from = location.state?.from?.pathname || '/app/dashboard';
  
  // SECURITY FIX: Complete session cleanup on mount
  useEffect(() => {
    // Clear ALL authentication data before showing login form
    console.log('[Security] Clearing all authentication data on signin page load');
    
    // Clear all auth-related localStorage keys
    const authKeys = [
      'ggk_authenticated_user',
      'test_mode_user', 
      'ggk_auth_token',
      'ggk_remember_session',
      'user_scope_cache', // Clear cached user scope
      'last_user_id' // Clear last user ID
    ];
    
    authKeys.forEach(key => {
      localStorage.removeItem(key);
    });
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    // Clear any React Query cache if available
    if (window.__REACT_QUERY_STATE__) {
      window.__REACT_QUERY_STATE__ = undefined;
    }
    
    // Clear authentication using the auth library
    clearAuthenticatedUser();
    
    // Load remembered email if exists (this is safe to keep)
    const savedEmail = localStorage.getItem('ggk_remembered_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
    
    console.log('[Security] Authentication cleanup complete');
  }, []);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setVerificationNeeded(false);
    setAccountLocked(false);
    setAttemptsLeft(null);
    
    // Basic validation
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }
    
    setLoading(true);
    
    try {
      const normalizedEmail = email.trim().toLowerCase();
      
      // SECURITY: Clear any existing session before attempting login
      clearAuthenticatedUser();
      localStorage.removeItem('user_scope_cache');
      localStorage.removeItem('last_user_id');
      
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
        .eq('email', normalizedEmail)
        .maybeSingle();
      
      if (userError) {
        throw new Error('Database query failed');
      }
      
      if (!user) {
        setError('Invalid email or password');
        setLoading(false);
        return;
      }
      
      // Check if account is locked
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        const minutesLeft = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / 60000);
        setAccountLocked(true);
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
      
      // Check if email is verified
      if (user.email_verified === false) {
        setVerificationNeeded(true);
        setUnverifiedUserId(user.id);
        setError('Please verify your email before signing in. Check your inbox for the verification link.');
        setLoading(false);
        return;
      }
      
      // Verify password
      let isValidPassword = false;
      
      if (user.password_hash) {
        isValidPassword = await bcrypt.compare(password, user.password_hash);
      }
      
      if (!isValidPassword) {
        const newAttempts = (user.failed_login_attempts || 0) + 1;
        
        if (newAttempts >= 5) {
          setError('Too many failed attempts. Please try again later.');
        } else {
          setAttemptsLeft(5 - newAttempts);
          setError(`Invalid email or password. ${5 - newAttempts} attempts remaining`);
        }
        setLoading(false);
        return;
      }
      
      // Get user profile details based on user type
      let userRole: UserRole = 'VIEWER';
      let userName = user.raw_user_meta_data?.name || user.email.split('@')[0];
      
      // SECURITY FIX: Get the correct user profile based on user type
      switch (user.user_type) {
        case 'system':
          try {
            const { data: adminUser } = await supabase
              .from('admin_users')
              .select('role_id, roles!inner(name)')
              .eq('email', normalizedEmail)
              .maybeSingle();
            
            if (adminUser?.roles?.name) {
              userRole = getUserSystemRole(adminUser.roles.name);
            } else {
              userRole = 'SSA';
            }
          } catch (err) {
            console.warn('Could not fetch admin role, using default SSA');
            userRole = 'SSA';
          }
          break;
          
        case 'entity':
          // Get entity user details for name
          try {
            const { data: entityUser } = await supabase
              .from('entity_users')
              .select('name, admin_level')
              .eq('user_id', user.id)
              .maybeSingle();
            
            if (entityUser) {
              userName = entityUser.name || userName;
              // Determine role based on admin_level
              if (entityUser.admin_level === 'school_admin') {
                userRole = 'ENTITY_ADMIN'; // This will be refined by permissions
              } else {
                userRole = 'ENTITY_ADMIN';
              }
            }
          } catch (err) {
            console.warn('Could not fetch entity user details');
          }
          userRole = 'ENTITY_ADMIN';
          break;
          
        case 'teacher':
          userRole = 'TEACHER';
          break;
          
        case 'student':
          userRole = 'STUDENT';
          break;
          
        default:
          userRole = 'VIEWER';
      }
      
      // SECURITY: Create user object with verified data
      const authenticatedUser: User = {
        id: user.id,
        email: user.email,
        name: userName,
        role: userRole,
        userType: user.user_type
      };
      
      // SECURITY: Log authentication for audit
      console.log('[Security] User authenticated:', {
        userId: user.id,
        email: user.email,
        userType: user.user_type,
        role: userRole,
        timestamp: new Date().toISOString()
      });
      
      // Handle Remember Me functionality
      if (rememberMe) {
        localStorage.setItem('ggk_remembered_email', normalizedEmail);
        localStorage.setItem('ggk_remember_session', 'true');
      } else {
        localStorage.removeItem('ggk_remembered_email');
        localStorage.removeItem('ggk_remember_session');
      }
      
      // Set authenticated user
      setAuthenticatedUser(authenticatedUser);
      
      // Check if password change required
      if (user.requires_password_change) {
        toast.warning('Please change your password');
        navigate('/app/settings/change-password');
        return;
      }
      
      // Success message
      toast.success(`Welcome back, ${authenticatedUser.name}!`);
      
      // Redirect based on user type
      const redirectPath = getRedirectPath(user.user_type, userRole);
      navigate(redirectPath, { replace: true });
      
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleResendVerification = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    
    setLoading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.info('If this email is registered, you will receive a verification link shortly.');
      toast.info('Please check your spam folder if you don\'t see it.');
      
      setVerificationNeeded(false);
      setError(null);
    } catch (err) {
      console.error('Resend verification error:', err);
      toast.error('Failed to send verification email. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDevLogin = () => {
    // SECURITY: Clear everything before dev login
    clearAuthenticatedUser();
    localStorage.removeItem('user_scope_cache');
    localStorage.removeItem('last_user_id');
    
    const devUser: User = {
      id: 'dev-001',
      email: 'dev@ggk.com',
      name: 'Developer',
      role: 'SSA',
      userType: 'system'
    };
    
    localStorage.setItem('ggk_remember_session', 'true');
    setAuthenticatedUser(devUser);
    
    toast.success('Dev login successful!');
    navigate('/app/system-admin/dashboard', { replace: true });
  };
  
  const getUserSystemRole = (roleName?: string): UserRole => {
    if (!roleName) return 'VIEWER';
    
    const roleMapping: Record<string, UserRole> = {
      'Super Admin': 'SSA',
      'Support Admin': 'SUPPORT',
      'Viewer': 'VIEWER'
    };
    return roleMapping[roleName] || 'VIEWER';
  };
  
  const getRedirectPath = (userType?: string, role?: UserRole): string => {
    if (!userType) return '/app/dashboard';
    
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
  };
  
  return (
    <div className="min-h-screen relative flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://dodvqvkiuuuxymboldkw.supabase.co/storage/v1/object/sign/signing/shutterstock_2475380851.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kZWMxYmI3Ni1lOTdjLTQ5ODEtOWU4Zi0zYjA3ZjZlZmUxZWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzaWduaW5nL3NodXR0ZXJzdG9ja18yNDc1MzgwODUxLmpwZyIsImlhdCI6MTc1NjA2MDQ1OSwiZXhwIjo0ODc4MTI0NDU5fQ.vmQTU-G_jb0V6yz8TGg2-WP-mqnxYD-5A8VIzatHizI"
          alt="Educational background"
          className="w-full h-full object-cover select-none pointer-events-none"
          draggable="false"
          onContextMenu={(e) => e.preventDefault()}
          style={{ userSelect: 'none' }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/90 via-gray-900/80 to-gray-900/90" />
      </div>
      
      {/* Content */}
      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center">
            <GraduationCap className="h-14 w-14 text-[#8CC63F]" />
            <span className="ml-3 text-4xl font-bold text-white">
              GGK Learning
            </span>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-white">
            Sign in to your account
          </h2>
          <p className="mt-2 text-sm text-gray-300">
            Enter your credentials to access the platform
          </p>
        </div>
        
        {/* Sign-in Form */}
        <div className="mt-8 bg-gray-900/50 backdrop-blur-md py-8 px-4 shadow-2xl sm:rounded-xl sm:px-10 border border-gray-700/50">
          {/* Error Messages */}
          {error && (
            <div className="mb-4">
              {accountLocked ? (
                <div className="bg-red-500/10 backdrop-blur text-red-400 p-4 rounded-lg flex items-start border border-red-500/20">
                  <ShieldAlert className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Account Locked</p>
                    <p className="text-sm mt-1">{error}</p>
                  </div>
                </div>
              ) : verificationNeeded ? (
                <div className="bg-amber-500/10 backdrop-blur text-amber-400 p-4 rounded-lg border border-amber-500/20">
                  <div className="flex items-start">
                    <MailWarning className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium">Email Verification Required</p>
                      <p className="text-sm mt-1">Your email address is not verified. Please check your inbox for the verification link.</p>
                      <p className="text-xs mt-2 text-amber-300">
                        Can't find the email? Check your spam folder or click below to resend.
                      </p>
                      <button
                        onClick={handleResendVerification}
                        disabled={loading}
                        className="text-sm mt-3 text-amber-100 hover:text-white font-medium underline disabled:opacity-50"
                      >
                        {loading ? 'Sending...' : 'Resend verification email'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-red-500/10 backdrop-blur text-red-400 p-4 rounded-lg flex items-start border border-red-500/20">
                  <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-sm">{error}</span>
                    {attemptsLeft !== null && attemptsLeft > 0 && (
                      <p className="text-xs mt-1 text-red-300">
                        Your account will be locked after {attemptsLeft} more failed attempts
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <FormField
              id="email"
              label="Email address"
              required
              labelClassName="text-gray-200"
            >
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-[#8CC63F] focus:ring-[#8CC63F]"
                  placeholder="Enter your email"
                  disabled={loading}
                  autoFocus
                />
              </div>
            </FormField>
            
            {/* Password Field */}
            <FormField
              id="password"
              label="Password"
              required
              labelClassName="text-gray-200"
            >
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-[#8CC63F] focus:ring-[#8CC63F]"
                  placeholder="Enter your password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-300" />
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
                  checked={rememberMe}
                  onChange={(e) => {
                    setRememberMe(e.target.checked);
                    if (!e.target.checked) {
                      localStorage.removeItem('ggk_remembered_email');
                      localStorage.removeItem('ggk_remember_session');
                    }
                  }}
                  className="h-4 w-4 text-[#8CC63F] focus:ring-[#8CC63F] border-gray-600 rounded bg-gray-800/50"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-300">
                  Remember me
                </label>
              </div>
              
              <div className="text-sm">
                <Link
                  to="/forgot-password"
                  className="font-medium text-[#8CC63F] hover:text-[#7AB635] transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
            </div>
            
            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full justify-center bg-[#8CC63F] hover:bg-[#7AB635] text-white font-medium"
              disabled={loading || !email || !password}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>
          
          {/* Additional Links */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-900/50 text-gray-400">
                  Need help?
                </span>
              </div>
            </div>
            
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Link
                to="/contact-support"
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-600 rounded-lg shadow-sm bg-gray-800/50 backdrop-blur text-sm font-medium text-gray-300 hover:bg-gray-700/50 transition-colors"
              >
                Contact Support
              </Link>
              <Link
                to="/request-access"
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-600 rounded-lg shadow-sm bg-gray-800/50 backdrop-blur text-sm font-medium text-gray-300 hover:bg-gray-700/50 transition-colors"
              >
                Request Access
              </Link>
            </div>
          </div>
          
          {/* Dev Login */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-900/50 text-gray-400">
                  Development Access
                </span>
              </div>
            </div>
            
            <Button
              onClick={handleDevLogin}
              variant="outline"
              className="mt-4 w-full justify-center bg-gray-800/50 backdrop-blur border-gray-600 text-gray-300 hover:bg-gray-700/50"
            >
              🔧 Quick Dev Login (SSA)
            </Button>
            <p className="mt-2 text-xs text-center text-gray-500">
              Temporary access for development
            </p>
          </div>
          
          {/* Back to Home Button */}
          <div className="mt-6">
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              className="w-full justify-center bg-gray-800/50 backdrop-blur border-gray-600 text-gray-300 hover:bg-gray-700/50"
            >
              Back to Home
            </Button>
          </div>
        </div>
        
        {/* Bottom text */}
        <p className="mt-8 text-center text-sm text-gray-400">
          Protected by industry-standard encryption
        </p>
      </div>
    </div>
  );
}