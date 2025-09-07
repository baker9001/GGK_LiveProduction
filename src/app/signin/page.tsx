/**
 * File: /src/app/signin/page.tsx
 * Production-Ready Sign In Page - Security Hardened
 * Version: 2.0.0
 * 
 * Security Features:
 *   - Server-side authentication only
 *   - CSRF tokens from server
 *   - HttpOnly cookie sessions
 *   - Comprehensive input sanitization
 *   - Server-side rate limiting
 *   - Security headers compliance
 *   - OWASP Top 10 compliant
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import DOMPurify from 'isomorphic-dompurify';
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
  refreshSession,
  type User, 
  type UserRole 
} from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { SecurityService } from '../../services/SecurityService';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { config } from '../../config/environment';

// Strict type definitions
interface SignInRequest {
  email: string;
  password: string;
  csrfToken: string;
  recaptchaToken?: string;
  deviceId?: string;
}

interface SignInResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    userType: string;
    role: UserRole;
  };
  requiresPasswordChange?: boolean;
  requiresMFA?: boolean;
  error?: {
    code: 'INVALID_CREDENTIALS' | 'ACCOUNT_LOCKED' | 'VERIFICATION_REQUIRED' | 
          'RATE_LIMITED' | 'MFA_REQUIRED' | 'SERVER_ERROR';
    message: string;
    attemptsRemaining?: number;
    lockoutDuration?: number;
  };
}

// Environment-based configuration
const IMAGE_CONFIG = {
  cdn: config.CDN_URL || '',
  images: {
    small: `${config.CDN_URL}/assets/signin-bg-640w.webp`,
    medium: `${config.CDN_URL}/assets/signin-bg-1024w.webp`,
    large: `${config.CDN_URL}/assets/signin-bg-1920w.webp`,
    fallback: `${config.CDN_URL}/assets/signin-bg-fallback.jpg`
  }
};

// Security service instance
const security = new SecurityService();

function SignInPageComponent() {
  const navigate = useNavigate();
  const location = useLocation();
  const formRef = useRef<HTMLFormElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  
  // Form state with validation
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // Security state
  const [csrfToken, setCSRFToken] = useState('');
  const [isSecureContext, setIsSecureContext] = useState(true);
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isVerificationNeeded, setIsVerificationNeeded] = useState(false);
  const [isAccountLocked, setIsAccountLocked] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [networkError, setNetworkError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  // Performance monitoring
  const [pageLoadTime] = useState(Date.now());
  
  // Secure redirect validation
  const from = location.state?.from?.pathname || '/app/dashboard';
  const isValidRedirect = /^\/app\/[a-zA-Z0-9\-\/]+$/.test(from);
  const safeRedirect = isValidRedirect ? from : '/app/dashboard';
  
  // Initialize security context and fetch CSRF token
  useEffect(() => {
    let mounted = true;
    
    const initializeSecurity = async () => {
      try {
        // Check if we're in a secure context (HTTPS)
        if (window.location.protocol !== 'https:' && !window.location.hostname.includes('localhost')) {
          setIsSecureContext(false);
          setGeneralError('Please access this page over a secure connection (HTTPS)');
          return;
        }
        
        // Clear all auth data on mount
        security.clearAllAuthData();
        clearAuthenticatedUser();
        
        // Fetch CSRF token from server
        const response = await fetch(`${config.API_URL}/auth/csrf-token`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'X-Requested-With': 'XMLHttpRequest'
          }
        });
        
        if (!response.ok) throw new Error('Failed to fetch CSRF token');
        
        const data = await response.json();
        if (mounted && data.csrfToken) {
          setCSRFToken(data.csrfToken);
        }
        
        // Load remembered email if exists (sanitized)
        const savedEmail = localStorage.getItem('ggk_remembered_email');
        if (savedEmail) {
          const sanitizedEmail = DOMPurify.sanitize(savedEmail);
          if (security.isValidEmail(sanitizedEmail)) {
            setFormData(prev => ({ ...prev, email: sanitizedEmail }));
            setRememberMe(true);
          }
        }
        
        // Focus email input
        if (emailInputRef.current) {
          emailInputRef.current.focus();
        }
        
        // Log page performance
        const loadTime = Date.now() - pageLoadTime;
        console.log(`[Performance] SignIn page loaded in ${loadTime}ms`);
        
      } catch (error) {
        console.error('[Security] Failed to initialize:', error);
        if (mounted) {
          setGeneralError('Failed to initialize security. Please refresh the page.');
        }
      }
    };
    
    initializeSecurity();
    
    // Cleanup function
    return () => {
      mounted = false;
      // Clear sensitive data from memory
      setFormData({ email: '', password: '' });
      setCSRFToken('');
    };
  }, [pageLoadTime]);
  
  // Input validation
  const validateInput = useCallback((name: string, value: string): string | null => {
    switch (name) {
      case 'email':
        if (!value) return 'Email is required';
        if (!security.isValidEmail(value)) return 'Please enter a valid email address';
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
  
  // Handle input changes with sanitization
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Sanitize input
    const sanitizedValue = DOMPurify.sanitize(value.trim());
    
    // Update form data
    setFormData(prev => ({ ...prev, [name]: sanitizedValue }));
    
    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
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
    
    // Clear previous errors
    setGeneralError(null);
    setFormErrors({});
    setIsVerificationNeeded(false);
    setIsAccountLocked(false);
    setNetworkError(false);
    
    // Validate all inputs
    const errors: Record<string, string> = {};
    Object.entries(formData).forEach(([key, value]) => {
      const error = validateInput(key, value);
      if (error) errors[key] = error;
    });
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    // Check CSRF token
    if (!csrfToken) {
      setGeneralError('Security token missing. Please refresh the page.');
      return;
    }
    
    // Check secure context
    if (!isSecureContext) {
      setGeneralError('Secure connection required');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Prepare request
      const signInRequest: SignInRequest = {
        email: formData.email.toLowerCase(),
        password: formData.password,
        csrfToken: csrfToken,
        deviceId: await security.getDeviceId()
      };
      
      // Make secure API call
      const response = await fetch(`${config.API_URL}/auth/signin`, {
        method: 'POST',
        credentials: 'include', // Include cookies
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(signInRequest)
      });
      
      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After') || '60';
        setGeneralError(`Too many attempts. Please try again in ${retryAfter} seconds.`);
        setIsLoading(false);
        return;
      }
      
      const data: SignInResponse = await response.json();
      
      if (!data.success) {
        handleSignInError(data.error);
        return;
      }
      
      // Success - User is authenticated
      if (data.user) {
        // Handle remember me
        if (rememberMe) {
          localStorage.setItem('ggk_remembered_email', DOMPurify.sanitize(formData.email));
        } else {
          localStorage.removeItem('ggk_remembered_email');
        }
        
        // Set authenticated user (session is in httpOnly cookie)
        setAuthenticatedUser(data.user);
        
        // Check if password change required
        if (data.requiresPasswordChange) {
          toast.warning('Please update your password for security');
          navigate('/app/settings/change-password', { replace: true });
          return;
        }
        
        // Check if MFA required
        if (data.requiresMFA) {
          navigate('/app/mfa-verification', { 
            state: { userId: data.user.id },
            replace: true 
          });
          return;
        }
        
        // Success message
        toast.success(`Welcome back, ${data.user.name}!`);
        
        // Redirect to appropriate dashboard
        const redirectPath = getRedirectPath(data.user.userType, data.user.role);
        navigate(redirectPath, { replace: true });
      }
      
    } catch (error) {
      console.error('[Auth] Sign in error:', error);
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        setNetworkError(true);
        setGeneralError('Network error. Please check your connection and try again.');
        
        // Retry logic
        if (retryCount < 3) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
            handleSubmit(e);
          }, 2000);
        }
      } else {
        setGeneralError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle sign in errors
  const handleSignInError = (error?: SignInResponse['error']) => {
    if (!error) {
      setGeneralError('Authentication failed. Please try again.');
      return;
    }
    
    switch (error.code) {
      case 'INVALID_CREDENTIALS':
        setGeneralError('Invalid email or password');
        if (error.attemptsRemaining) {
          setAttemptsRemaining(error.attemptsRemaining);
        }
        break;
        
      case 'ACCOUNT_LOCKED':
        setIsAccountLocked(true);
        const minutes = error.lockoutDuration ? Math.ceil(error.lockoutDuration / 60) : 15;
        setGeneralError(`Account locked. Try again in ${minutes} minutes.`);
        break;
        
      case 'VERIFICATION_REQUIRED':
        setIsVerificationNeeded(true);
        setGeneralError('Please verify your email before signing in.');
        break;
        
      case 'RATE_LIMITED':
        setGeneralError('Too many attempts. Please try again later.');
        break;
        
      default:
        setGeneralError('Authentication failed. Please try again.');
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
    if (!formData.email || !security.isValidEmail(formData.email)) {
      setFormErrors({ email: 'Please enter a valid email address' });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch(`${config.API_URL}/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify({ 
          email: formData.email,
          csrfToken 
        })
      });
      
      if (response.ok) {
        toast.success('Verification email sent. Please check your inbox.');
        setIsVerificationNeeded(false);
      } else {
        toast.error('Failed to send verification email. Please try again.');
      }
    } catch (error) {
      console.error('[Auth] Resend verification error:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen relative flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Optimized Background with lazy loading */}
      <div className="absolute inset-0 z-0">
        <picture>
          <source
            srcSet={`${IMAGE_CONFIG.images.small} 640w, ${IMAGE_CONFIG.images.medium} 1024w, ${IMAGE_CONFIG.images.large} 1920w`}
            sizes="100vw"
            type="image/webp"
          />
          <img
            src={IMAGE_CONFIG.images.fallback}
            alt="Educational background"
            className="w-full h-full object-cover select-none pointer-events-none"
            loading="lazy"
            decoding="async"
            draggable="false"
            onContextMenu={(e) => e.preventDefault()}
          />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/90 via-gray-900/80 to-gray-900/90" />
      </div>
      
      {/* Skip to main content for accessibility */}
      <a href="#signin-form" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-white px-4 py-2 rounded">
        Skip to sign in form
      </a>
      
      {/* Content */}
      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center">
            <GraduationCap className="h-14 w-14 text-[#8CC63F]" aria-hidden="true" />
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
        <div id="signin-form" className="mt-8 bg-gray-900/50 backdrop-blur-md py-8 px-4 shadow-2xl sm:rounded-xl sm:px-10 border border-gray-700/50">
          
          {/* Security Warning for non-HTTPS */}
          {!isSecureContext && (
            <div className="mb-4 bg-red-500/10 backdrop-blur text-red-400 p-4 rounded-lg border border-red-500/20" role="alert">
              <div className="flex items-start">
                <ShieldAlert className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Insecure Connection</p>
                  <p className="text-sm mt-1">Please use HTTPS for secure authentication</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Error Messages */}
          {generalError && (
            <div className="mb-4" role="alert" aria-live="assertive">
              {isAccountLocked ? (
                <div className="bg-red-500/10 backdrop-blur text-red-400 p-4 rounded-lg flex items-start border border-red-500/20">
                  <ShieldAlert className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Account Locked</p>
                    <p className="text-sm mt-1">{generalError}</p>
                  </div>
                </div>
              ) : isVerificationNeeded ? (
                <div className="bg-amber-500/10 backdrop-blur text-amber-400 p-4 rounded-lg border border-amber-500/20">
                  <div className="flex items-start">
                    <MailWarning className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium">Email Verification Required</p>
                      <p className="text-sm mt-1">{generalError}</p>
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
              ) : networkError ? (
                <div className="bg-orange-500/10 backdrop-blur text-orange-400 p-4 rounded-lg flex items-start border border-orange-500/20">
                  <RefreshCw className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5 animate-spin" />
                  <div>
                    <p className="font-medium">Connection Error</p>
                    <p className="text-sm">{generalError}</p>
                    {retryCount > 0 && (
                      <p className="text-xs mt-1">Retry attempt {retryCount}/3</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-red-500/10 backdrop-blur text-red-400 p-4 rounded-lg flex items-start border border-red-500/20">
                  <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-sm">{generalError}</span>
                    {attemptsRemaining !== null && (
                      <p className="text-xs mt-1 text-red-300">
                        {attemptsRemaining} attempts remaining before account lock
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
                  Remember my email
                </label>
              </div>
              
              <div className="text-sm">
                <Link
                  to="/forgot-password"
                  className="font-medium text-[#8CC63F] hover:text-[#7AB635] transition-colors focus:outline-none focus:underline"
                >
                  Forgot password?
                </Link>
              </div>
            </div>
            
            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full justify-center bg-[#8CC63F] hover:bg-[#7AB635] text-white font-medium"
              disabled={isLoading || !csrfToken}
              aria-label="Sign in to your account"
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
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-600 rounded-lg shadow-sm bg-gray-800/50 backdrop-blur text-sm font-medium text-gray-300 hover:bg-gray-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Contact Support
              </Link>
              <Link
                to="/request-access"
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-600 rounded-lg shadow-sm bg-gray-800/50 backdrop-blur text-sm font-medium text-gray-300 hover:bg-gray-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
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

// Export with Error Boundary wrapper
export default function SignInPage() {
  return (
    <ErrorBoundary>
      <SignInPageComponent />
    </ErrorBoundary>
  );
}