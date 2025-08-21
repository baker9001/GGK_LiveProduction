/**
 * File: /src/app/login/page.tsx (or /src/app/signin/page.tsx)
 * 
 * MERGED LOGIN/SIGNIN PAGE COMPONENT
 * Unified authentication page with all features
 * 
 * Dependencies:
 *   - @/lib/auth (authentication service)
 *   - @/contexts/UserContext (user state management)
 *   - react-hot-toast (notifications)
 *   - zod (validation)
 *   - lucide-react (icons)
 * 
 * Features:
 * ✅ Email and password validation with Zod
 * ✅ Remember Me functionality
 * ✅ Password visibility toggle
 * ✅ Forgot password flow
 * ✅ Role-based redirects after login
 * ✅ Demo credentials display
 * ✅ Loading states and error handling
 * ✅ Dark mode support
 * ✅ Responsive design
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Lock, Mail, Eye, EyeOff, AlertCircle, 
  Loader2, School, CheckCircle, ArrowLeft,
  ShieldCheck, Users, GraduationCap, BookOpen
} from 'lucide-react';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { authService, getRedirectPathForUser } from '@/lib/auth';
import { useUser } from '@/contexts/UserContext';

// Validation schemas
const emailSchema = z.string()
  .email('Please enter a valid email address')
  .min(5, 'Email must be at least 5 characters')
  .max(255, 'Email must be less than 255 characters');

const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters');

const resetEmailSchema = z.string()
  .email('Please enter a valid email address');

// Demo credentials configuration
const DEMO_CREDENTIALS = [
  {
    role: 'System Admin',
    email: 'admin@system.com',
    password: 'Admin123!',
    icon: ShieldCheck,
    color: 'text-purple-600 dark:text-purple-400'
  },
  {
    role: 'Entity Admin',
    email: 'admin@company.com',
    password: 'Admin123!',
    icon: Users,
    color: 'text-blue-600 dark:text-blue-400'
  },
  {
    role: 'Teacher',
    email: 'teacher@school.com',
    password: 'Teacher123!',
    icon: BookOpen,
    color: 'text-green-600 dark:text-green-400'
  },
  {
    role: 'Student',
    email: 'student@school.com',
    password: 'Student123!',
    icon: GraduationCap,
    color: 'text-orange-600 dark:text-orange-400'
  }
];

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useUser();
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  
  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  
  // Demo mode state
  const [showDemoCredentials, setShowDemoCredentials] = useState(true);
  const [selectedDemo, setSelectedDemo] = useState<number | null>(null);

  // Get redirect URL from query params
  const redirectTo = searchParams?.get('redirect') || null;
  const sessionExpired = searchParams?.get('session_expired') === 'true';

  // Check if already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      if (authService.isAuthenticated()) {
        const user = authService.getCurrentUser();
        if (user) {
          const redirectPath = redirectTo || getRedirectPathForUser(user);
          router.push(redirectPath);
        }
      }
    };
    
    checkAuth();
  }, [router, redirectTo]);

  // Show session expired message
  useEffect(() => {
    if (sessionExpired) {
      toast.error('Your session has expired. Please sign in again.');
    }
  }, [sessionExpired]);

  // Load remembered email if exists
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('ggk_remembered_email');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  // Validate form fields
  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    try {
      emailSchema.parse(email);
    } catch (error: any) {
      newErrors.email = error.errors[0]?.message || 'Invalid email';
    }

    try {
      passwordSchema.parse(password);
    } catch (error: any) {
      newErrors.password = error.errors[0]?.message || 'Invalid password';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle login/signin
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const response = await authService.login({
        email: email.trim().toLowerCase(),
        password,
        rememberMe
      });

      if (response.success && response.user) {
        // Save email if remember me is checked
        if (rememberMe) {
          localStorage.setItem('ggk_remembered_email', email.trim().toLowerCase());
        } else {
          localStorage.removeItem('ggk_remembered_email');
        }

        // Set user in context
        setUser(response.user);

        // Show success message
        toast.success(`Welcome back, ${response.user.name || response.user.email}!`);

        // Redirect to appropriate dashboard
        const redirectPath = redirectTo || getRedirectPathForUser(response.user);
        router.push(redirectPath);
      } else {
        // Handle specific error cases
        if (response.error?.includes('deactivated')) {
          setErrors({ general: response.error });
        } else if (response.error?.includes('password')) {
          setErrors({ password: response.error });
        } else if (response.error?.includes('email')) {
          setErrors({ email: response.error });
        } else {
          setErrors({ general: response.error || 'Login failed. Please try again.' });
        }
        
        toast.error(response.error || 'Login failed');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setErrors({ general: 'An unexpected error occurred. Please try again.' });
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle forgot password
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate email
    try {
      resetEmailSchema.parse(resetEmail);
    } catch (error: any) {
      toast.error(error.errors[0]?.message || 'Please enter a valid email');
      return;
    }

    setResetLoading(true);

    try {
      const response = await authService.requestPasswordReset(resetEmail.trim().toLowerCase());
      
      if (response.success) {
        setResetSent(true);
        toast.success(response.message);
      } else {
        toast.error(response.message);
      }
    } catch (error) {
      toast.error('Failed to send reset instructions. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  // Fill demo credentials
  const fillDemoCredentials = (index: number) => {
    const demo = DEMO_CREDENTIALS[index];
    setEmail(demo.email);
    setPassword(demo.password);
    setSelectedDemo(index);
    toast.info(`Demo credentials filled for ${demo.role}`);
  };

  // Reset forgot password state
  const resetForgotPasswordState = () => {
    setShowForgotPassword(false);
    setResetSent(false);
    setResetEmail('');
  };

  // Render forgot password view
  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="bg-white dark:bg-gray-800 shadow-2xl rounded-2xl p-8">
            <div className="text-center">
              <div className="mx-auto h-16 w-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <Lock className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
                Reset Password
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Enter your email address and we'll send you instructions to reset your password.
              </p>
            </div>

            {resetSent ? (
              <div className="mt-8">
                <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-4">
                  <div className="flex">
                    <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-800 dark:text-green-200">
                        Reset instructions sent!
                      </p>
                      <p className="mt-1 text-sm text-green-700 dark:text-green-300">
                        Check your email for password reset instructions. The link will expire in 1 hour.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 space-y-3">
                  <button
                    onClick={resetForgotPasswordState}
                    className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Sign In
                  </button>
                  
                  <button
                    onClick={() => setResetSent(false)}
                    className="w-full text-sm text-gray-600 hover:text-gray-500 dark:text-gray-400"
                  >
                    Didn't receive the email? Send again
                  </button>
                </div>
              </div>
            ) : (
              <form className="mt-8 space-y-6" onSubmit={handleForgotPassword}>
                <div>
                  <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email address
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="reset-email"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                      className="appearance-none relative block w-full pl-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                      placeholder="Enter your email address"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between space-x-3">
                  <button
                    type="button"
                    onClick={resetForgotPasswordState}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {resetLoading ? (
                      <>
                        <Loader2 className="animate-spin h-4 w-4 mr-2" />
                        Sending...
                      </>
                    ) : (
                      'Send Instructions'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main login view
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white dark:bg-gray-800 shadow-2xl rounded-2xl p-8">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
              <School className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
              Welcome Back
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Sign in to your account to continue
            </p>
            
            {/* Session expired message */}
            {sessionExpired && (
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-md">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Your session has expired. Please sign in again.
                </p>
              </div>
            )}
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            {/* General error message */}
            {errors.general && (
              <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                  <div className="ml-3">
                    <p className="text-sm text-red-800 dark:text-red-200">
                      {errors.general}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email address
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors({ ...errors, email: undefined });
                    }}
                    required
                    className={`appearance-none relative block w-full pl-10 px-3 py-2 border ${
                      errors.email ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                    } rounded-md placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors`}
                    placeholder="Enter your email"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Password
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors({ ...errors, password: undefined });
                    }}
                    required
                    className={`appearance-none relative block w-full pl-10 pr-10 px-3 py-2 border ${
                      errors.password ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                    } rounded-md placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors`}
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password}</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                  Remember me for 30 days
                </label>
              </div>

              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 transition-colors"
              >
                Forgot password?
              </button>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </div>

            {/* Demo Credentials */}
            {showDemoCredentials && (
              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">Or use demo account</span>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {DEMO_CREDENTIALS.map((demo, index) => {
                    const Icon = demo.icon;
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => fillDemoCredentials(index)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-sm border rounded-md transition-all ${
                          selectedDemo === index
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        <div className="flex items-center">
                          <Icon className={`h-4 w-4 mr-2 ${demo.color}`} />
                          <span className="text-gray-700 dark:text-gray-300">{demo.role}</span>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {demo.email}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setShowDemoCredentials(false)}
                  className="mt-2 w-full text-xs text-gray-500 hover:text-gray-400 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  Hide demo accounts
                </button>
              </div>
            )}

            {!showDemoCredentials && (
              <button
                type="button"
                onClick={() => setShowDemoCredentials(true)}
                className="w-full text-sm text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300"
              >
                Show demo accounts
              </button>
            )}
          </form>

          {/* Links */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Don't have an account?{' '}
              <Link href="/signup" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}