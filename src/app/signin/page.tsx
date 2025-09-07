/**
 * File: /src/app/signin/page.tsx
 * Production-Ready Sign In Page - Simplified Version
 * Works with existing project structure
 * 
 * Security Features:
 *   - Removed all dev backdoors
 *   - Server-side authentication via Supabase
 *   - Input validation and sanitization
 *   - Secure session management
 *   - Rate limiting ready
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  GraduationCap, 
  AlertCircle, 
  Loader2, 
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldAlert,
  MailWarning,
  Shield,
  RefreshCw
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

// Type definitions
interface SignInFormData {
  email: string;
  password: string;
}

interface SignInError {
  message: string;
  code?: 'INVALID_CREDENTIALS' | 'ACCOUNT_LOCKED' | 'VERIFICATION_REQUIRED' | 'RATE_LIMITED';
  attemptsRemaining?: number;
}

// Email validation regex
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Simple input sanitization function
const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .slice(0, 255); // Limit length
};

// Optimized background image configuration
const BACKGROUND_IMAGE = {
  // Use a local optimized image or CDN URL
  src: '/images/signin-background.jpg',
  // For Supabase storage, use a proper CDN URL if available
  // src: 'https://your-cdn.com/images/signin-background.jpg',
  alt: 'Educational background'
};

export default function SignInPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const formRef = useRef<HTMLFormElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  
  // Form state
  const [formData, setFormData] = useState<SignInFormData>({
    email: '',
    password: ''
  });
  const [formErrors, setFormErrors] = useState<Partial<SignInFormData>>({});
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [generalError, setGeneralError] = useState<SignInError | null>(null);
  const [isVerificationNeeded, setIsVerificationNeeded] = useState(false);
  const [isAccountLocked, setIsAccountLocked] = useState(false);
  const [networkRetryCount, setNetworkRetryCount] = useState(0);
  
  // Rate limiting
  const [lastAttemptTime, setLastAttemptTime] = useState(0);
  const RATE_LIMIT_DELAY = 1000; // 1 second between attempts
  
  // Secure redirect
  const from = location.state?.from?.pathname || '/app/dashboard';
  const isValidRedirect = from.startsWith('/app/');
  const safeRedirect = isValidRedirect ? from : '/app/dashboard';
  
  // Initialize and cleanup on mount
  useEffect(() => {
    // Clear all authentication data on mount
    const clearAuthData = () => {
      // Clear auth-related storage
      const authKeys = [
        'ggk_authenticated_user',
        'ggk_auth_token',
        'ggk_session_id',
        'user_scope_cache',
        'last_user_id',
        'test_mode_user' // Remove any dev mode data
      ];
      
      authKeys.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
      
      // Clear auth state
      clearAuthenticatedUser();
    };
    
    clearAuthData();
    
    // Load remembered email if exists
    const savedEmail = localStorage.getItem('ggk_remembered_email');
    if (savedEmail && EMAIL_REGEX.test(savedEmail)) {
      setFormData(prev => ({ ...prev, email: savedEmail }));
      setRememberMe(true);
    }
    
    // Focus email input
    if (emailInputRef.current) {
      emailInputRef.current.focus();
    }
    
    // Security check for HTTPS in production
    if (window.location.hostname !== 'localhost' && window.location.protocol !== 'https:') {
      console.warn('Warning: Should use HTTPS in production');
    }
    
    return () => {
      // Clear sensitive data on unmount
      setFormData({ email: '', password: '' });
    };
  }, []);
  
  // Validate form input
  const validateInput = useCallback((name: keyof SignInFormData, value: string): string | null => {
    switch (name) {
      case 'email':
        if (!value) return 'Email is required';
        if (!EMAIL_REGEX.test(value)) return 'Please enter a valid email address';
        if (value.length > 254) return 'Email address is too long';
        return null;
        
      case 'password':
        if (!value) return 'Password is required';
        if (value.length < 8) return 'Password must be at least 8 characters';
        if (value.length > 128) return 'Password is too long';
        return null;
        
      default:
        return null;
    }
  }, []);
  
  // Handle input changes
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Sanitize input
    const sanitizedValue = sanitizeInput(value);
    
    // Update form data
    setFormData(prev => ({ ...prev, [name]: sanitizedValue }));
    
    // Clear error for this field
    if (formErrors[name as keyof SignInFormData]) {
      setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }
    
    // Clear general error
    if (generalError) {
      setGeneralError(null);
    }
  }, [formErrors, generalError]);
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isLoading) return;
    
    // Client-side rate limiting
    const now = Date.now();
    if (now - lastAttemptTime < RATE_LIMIT_DELAY) {
      setGeneralError({
        message: 'Please wait a moment before trying again',
        code: 'RATE_LIMITED'
      });
      return;
    }
    setLastAttemptTime(now);
    
    // Clear previous errors
    setGeneralError(null);
    setFormErrors({});
    setIsVerificationNeeded(false);
    setIsAccountLocked(false);
    
    // Validate all inputs
    const errors: Partial<SignInFormData> = {};
    Object.entries(formData).forEach(([key, value]) => {
      const error = validateInput(key as keyof SignInFormData, value);
      if (error) {
        errors[key as keyof SignInFormData] = error;
      }
    });
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    setIsLoading(true);
    
    try {
      const normalizedEmail = formData.email.trim().toLowerCase();
      
      // Use Supabase Auth for secure authentication
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: formData.password,
      });
      
      if (authError) {
        // Handle different error types
        if (authError.message.includes('Invalid login credentials')) {
          setGeneralError({
            message: 'Invalid email or password',
            code: 'INVALID_CREDENTIALS'
          });
        } else if (authError.message.includes('Email not confirmed')) {
          setIsVerificationNeeded(true);
          setGeneralError({
            message: 'Please verify your email before signing in',
            code: 'VERIFICATION_REQUIRED'
          });
        } else if (authError.message.includes('Too many requests')) {
          setIsAccountLocked(true);
          setGeneralError({
            message: 'Too many attempts. Please try again later',
            code: 'ACCOUNT_LOCKED'
          });
        } else {
          setGeneralError({
            message: 'Authentication failed. Please try again',
            code: 'INVALID_CREDENTIALS'
          });
        }
        setIsLoading(false);
        return;
      }
      
      if (!data.user) {
        setGeneralError({
          message: 'Authentication failed. Please try again',
          code: 'INVALID_CREDENTIALS'
        });
        setIsLoading(false);
        return;
      }
      
      // Get additional user details from database
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select(`
          id,
          email,
          user_type,
          is_active,
          email_verified,
          requires_password_change,
          raw_user_meta_data
        `)
        .eq('id', data.user.id)
        .single();
      
      if (userError || !userData) {
        console.error('Failed to fetch user data:', userError);
        setGeneralError({
          message: 'Failed to load user profile. Please try again',
          code: 'INVALID_CREDENTIALS'
        });
        setIsLoading(false);
        return;
      }
      
      // Check if account is active
      if (!userData.is_active) {
        await supabase.auth.signOut();
        setGeneralError({
          message: 'Your account is inactive. Please contact support',
          code: 'ACCOUNT_LOCKED'
        });
        setIsLoading(false);
        return;
      }
      
      // Get user role
      const userRole = await getUserRole(userData.user_type, userData.id, normalizedEmail);
      const userName = userData.raw_user_meta_data?.name || normalizedEmail.split('@')[0];
      
      // Create authenticated user object
      const authenticatedUser: User = {
        id: userData.id,
        email: userData.email,
        name: userName,
        role: userRole,
        userType: userData.user_type
      };
      
      // Handle remember me
      if (rememberMe) {
        localStorage.setItem('ggk_remembered_email', normalizedEmail);
      } else {
        localStorage.removeItem('ggk_remembered_email');
      }
      
      // Update last login time
      await supabase
        .from('users')
        .update({
          last_login_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userData.id);
      
      // Set authenticated user
      setAuthenticatedUser(authenticatedUser);
      
      // Check if password change required
      if (userData.requires_password_change) {
        toast.warning('Please update your password for security');
        navigate('/app/settings/change-password', { replace: true });
        return;
      }
      
      // Success
      toast.success(`Welcome back, ${authenticatedUser.name}!`);
      
      // Redirect to appropriate dashboard
      const redirectPath = getRedirectPath(userData.user_type, userRole);
      navigate(redirectPath, { replace: true });
      
    } catch (error) {
      console.error('Sign in error:', error);
      
      // Handle network errors with retry
      if (error instanceof TypeError && error.message.includes('fetch')) {
        if (networkRetryCount < 2) {
          setNetworkRetryCount(prev => prev + 1);
          setGeneralError({
            message: `Network error. Retrying... (${networkRetryCount + 1}/3)`,
            code: 'RATE_LIMITED'
          });
          
          // Retry after delay
          setTimeout(() => {
            handleSubmit(e);
          }, 2000);
        } else {
          setGeneralError({
            message: 'Network error. Please check your connection and try again',
            code: 'RATE_LIMITED'
          });
        }
      } else {
        setGeneralError({
          message: 'An unexpected error occurred. Please try again',
          code: 'INVALID_CREDENTIALS'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Get user role from database
  const getUserRole = async (userType: string, userId: string, email: string): Promise<UserRole> => {
    switch (userType) {
      case 'system':
        try {
          const { data } = await supabase
            .from('admin_users')
            .select('role_id, roles!inner(name)')
            .eq('email', email)
            .single();
          
          if (data?.roles?.name) {
            const roleMap: Record<string, UserRole> = {
              'Super Admin': 'SSA',
              'Support Admin': 'SUPPORT',
              'Viewer': 'VIEWER'
            };
            return roleMap[data.roles.name] || 'VIEWER';
          }
        } catch (err) {
          console.warn('Could not fetch admin role');
        }
        return 'SSA';
        
      case 'entity':
        return 'ENTITY_ADMIN';
        
      case 'teacher':
        return 'TEACHER';
        
      case 'student':
        return 'STUDENT';
        
      default:
        return 'VIEWER';
    }
  };
  
  // Get redirect path based on user type
  const getRedirectPath = (userType: string, role: UserRole): string => {
    const paths: Record<string, string> = {
      'system': '/app/system-admin/dashboard',
      'entity': '/app/entity-module/dashboard',
      'teacher': '/app/teachers-module/dashboard',
      'student': '/app/student-module/dashboard'
    };
    return paths[userType] || '/app/dashboard';
  };
  
  // Handle resend verification
  const handleResendVerification = async () => {
    if (!formData.email || !EMAIL_REGEX.test(formData.email)) {
      setFormErrors({ email: 'Please enter a valid email address' });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: formData.email.trim().toLowerCase(),
      });
      
      if (!error) {
        toast.success('Verification email sent. Please check your inbox.');
        setIsVerificationNeeded(false);
      } else {
        toast.error('Failed to send verification email. Please try again.');
      }
    } catch (error) {
      console.error('Resend verification error:', error);
      toast.error('An error occurred. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen relative flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src={BACKGROUND_IMAGE.src}
          alt={BACKGROUND_IMAGE.alt}
          className="w-full h-full object-cover select-none pointer-events-none"
          loading="eager"
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
            <h1 className="ml-3 text-4xl font-bold text-white">
              GGK Learning
            </h1>
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
          {generalError && (
            <div className="mb-4" role="alert" aria-live="assertive">
              {isAccountLocked ? (
                <div className="bg-red-500/10 backdrop-blur text-red-400 p-4 rounded-lg flex items-start border border-red-500/20">
                  <ShieldAlert className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Account Temporarily Locked</p>
                    <p className="text-sm mt-1">{generalError.message}</p>
                  </div>
                </div>
              ) : isVerificationNeeded ? (
                <div className="bg-amber-500/10 backdrop-blur text-amber-400 p-4 rounded-lg border border-amber-500/20">
                  <div className="flex items-start">
                    <MailWarning className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium">Email Verification Required</p>
                      <p className="text-sm mt-1">{generalError.message}</p>
                      <button
                        onClick={handleResendVerification}
                        disabled={isLoading}
                        className="text-sm mt-3 text-amber-100 hover:text-white font-medium underline disabled:opacity-50"
                      >
                        {isLoading ? 'Sending...' : 'Resend verification email'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : networkRetryCount > 0 ? (
                <div className="bg-orange-500/10 backdrop-blur text-orange-400 p-4 rounded-lg flex items-start border border-orange-500/20">
                  <RefreshCw className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5 animate-spin" />
                  <div>
                    <p className="font-medium">Connection Error</p>
                    <p className="text-sm">{generalError.message}</p>
                  </div>
                </div>
              ) : (
                <div className="bg-red-500/10 backdrop-blur text-red-400 p-4 rounded-lg flex items-start border border-red-500/20">
                  <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-sm">{generalError.message}</span>
                    {generalError.attemptsRemaining && (
                      <p className="text-xs mt-1 text-red-300">
                        {generalError.attemptsRemaining} attempts remaining
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-6" noValidate>
            {/* Email Field */}
            <FormField
              id="email"
              label="Email address"
              required
              error={formErrors.email}
              labelClassName="text-gray-200"
            >
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  ref={emailInputRef}
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="pl-10 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-[#8CC63F] focus:ring-[#8CC63F]"
                  placeholder="Enter your email"
                  disabled={isLoading}
                  required
                  aria-required="true"
                  aria-invalid={!!formErrors.email}
                  aria-describedby={formErrors.email ? 'email-error' : undefined}
                  maxLength={254}
                />
              </div>
              {formErrors.email && (
                <p id="email-error" className="mt-1 text-sm text-red-400">
                  {formErrors.email}
                </p>
              )}
            </FormField>
            
            {/* Password Field */}
            <FormField
              id="password"
              label="Password"
              required
              error={formErrors.password}
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
                  value={formData.password}
                  onChange={handleInputChange}
                  className="pl-10 pr-10 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-[#8CC63F] focus:ring-[#8CC63F]"
                  placeholder="Enter your password"
                  disabled={isLoading}
                  required
                  aria-required="true"
                  aria-invalid={!!formErrors.password}
                  aria-describedby={formErrors.password ? 'password-error' : undefined}
                  maxLength={128}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                  )}
                </button>
              </div>
              {formErrors.password && (
                <p id="password-error" className="mt-1 text-sm text-red-400">
                  {formErrors.password}
                </p>
              )}
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
              disabled={isLoading || !formData.email || !formData.password}
            >
              {isLoading ? (
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
          
          {/* Back to Home */}
          <div className="mt-6">
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              className="w-full justify-center bg-gray-800/50 backdrop-blur border-gray-600 text-gray-300 hover:bg-gray-700/50"
            >
              Back to Home
            </Button>
          </div>
          
          {/* Security Badge */}
          <div className="mt-6 flex items-center justify-center text-xs text-gray-500">
            <Shield className="h-4 w-4 mr-1" />
            <span>Protected by enterprise-grade security</span>
          </div>
        </div>
        
        {/* Footer */}
        <p className="mt-8 text-center text-sm text-gray-400">
          © 2025 GGK Learning. All rights reserved.
        </p>
      </div>
    </div>
  );
}