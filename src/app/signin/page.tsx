/**
 * File: /src/app/signin/page.tsx
 * Dependencies: 
 *   - React
 *   - react-router-dom
 *   - lucide-react
 *   - Custom components
 * 
 * Description: Sign-in page with IGCSE background and proper error handling
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
  ArrowLeft,
  Home
} from 'lucide-react';
import { Button } from '../../components/shared/Button';
import { FormField, Input } from '../../components/shared/FormField';
import { toast } from '../../components/shared/Toast';
import { setAuthenticatedUser, type User, type UserRole } from '../../lib/auth';
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
  
  // Clear any existing sessions on mount
  useEffect(() => {
    // Clear any test mode or existing sessions
    localStorage.removeItem('test_user');
    sessionStorage.clear();
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
      // Direct database authentication since we're not using separate auth endpoints yet
      // This is a temporary solution until the API routes are properly set up
      
      const normalizedEmail = email.trim().toLowerCase();
      
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
      if (!user.email_verified) {
        setVerificationNeeded(true);
        setUnverifiedUserId(user.id);
        setError('Please verify your email before signing in');
        setLoading(false);
        return;
      }
      
      // Verify password
      let isValidPassword = false;
      
      if (user.password_hash) {
        isValidPassword = await bcrypt.compare(password, user.password_hash);
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
      
      // Get user profile details based on user type
      let roleInfo = null;
      let userRole: UserRole = 'VIEWER';
      
      switch (user.user_type) {
        case 'system':
          const { data: adminUser } = await supabase
            .from('admin_users')
            .select('role_id, roles!inner(name)')
            .eq('id', user.id)
            .single();
          
          if (adminUser) {
            roleInfo = adminUser.roles;
            userRole = getUserSystemRole(adminUser.roles?.name);
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
        role: userRole
      };
      
      // Set authenticated user
      setAuthenticatedUser(authenticatedUser);
      
      // Create Supabase session for API calls
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: password
      });
      
      // If Supabase auth fails, create a minimal session
      if (signInError) {
        console.warn('Supabase Auth not configured, using custom auth only');
      }
      
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
    if (!unverifiedUserId && !email) {
      setError('Please enter your email address');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // For now, just show a message since email service isn't configured
      toast.info('Verification email feature will be available soon');
      setVerificationNeeded(false);
    } catch (err) {
      console.error('Resend verification error:', err);
      setError('Failed to send verification email');
    } finally {
      setLoading(false);
    }
  };
  
  const getUserSystemRole = (roleName?: string): UserRole => {
    const roleMapping: Record<string, UserRole> = {
      'Super Admin': 'SSA',
      'Support Admin': 'SUPPORT',
      'Viewer': 'VIEWER'
    };
    return roleMapping[roleName || ''] || 'VIEWER';
  };
  
  const getRedirectPath = (userType: string, role: UserRole): string => {
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
          src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80"
          alt="Students in classroom"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/90 via-gray-900/80 to-gray-900/90" />
      </div>
      
      {/* Back/Home Button */}
      <div className="absolute top-4 left-4 z-20">
        <Link
          to="/"
          className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm text-white rounded-lg hover:bg-white/20 transition-colors duration-200 border border-white/20"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Link>
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
                      <p className="text-sm mt-1">{error}</p>
                      <button
                        onClick={handleResendVerification}
                        disabled={loading}
                        className="text-sm mt-2 text-amber-300 hover:text-amber-200 font-medium underline"
                      >
                        Resend verification email
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
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-[#8CC63F] focus:ring-[#8CC63F] border-gray-600 rounded bg-gray-800/50"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-300">
                  Remember me
                </label>
              </div>
              
              <div className="text-sm">
                <Link
                  to="/forgot-password"
                  className="font-medium text-[#8CC63F] hover:text-[#7AB635]"
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
        </div>
        
        {/* Bottom text */}
        <p className="mt-8 text-center text-sm text-gray-400">
          Protected by industry-standard encryption
        </p>
      </div>
    </div>
  );
}