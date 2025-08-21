/**
 * File: /src/app/signin/page.tsx
 * 
 * Sign In Page Component
 * Handles user authentication without Supabase Auth
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Lock, Mail, Eye, EyeOff, AlertCircle, 
  Loader2, School, CheckCircle 
} from 'lucide-react';
import { z } from 'zod';
import { getRedirectPathForUser, isAuthenticated, getCurrentUser } from '../../lib/auth';
import { useUser } from '../../contexts/UserContext';
import { useToast } from '../../hooks/useToast';

// Validation schemas
const emailSchema = z.string()
  .email('Please enter a valid email address')
  .min(5, 'Email must be at least 5 characters');

const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters');

export default function SignInPage() {
  const navigate = useNavigate();
  const { setUser } = useUser();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Check if already authenticated
  useEffect(() => {
    if (isAuthenticated()) {
      const user = getCurrentUser();
      if (user) {
        const redirectPath = getRedirectPathForUser(user);
        navigate(redirectPath);
      }
    }
  }, [navigate]);

  const validateForm = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};

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

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      // TODO: Implement actual authentication API call
      // For now, show error that auth service is not implemented
      toast.error('Authentication service not implemented yet');
    } catch (error: any) {
      console.error('Sign in error:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resetEmail) {
      toast.error('Please enter your email address');
      return;
    }

    setIsLoading(true);

    try {
      // TODO: Implement password reset API call
      // For now, show error that reset service is not implemented
      toast.error('Password reset service not implemented yet');
    } catch (error) {
      toast.error('Failed to send reset instructions');
    } finally {
      setIsLoading(false);
    }
  };

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
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-800 dark:text-green-200">
                        Reset instructions sent!
                      </p>
                      <p className="mt-1 text-sm text-green-700 dark:text-green-300">
                        Check your email for password reset instructions.
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetSent(false);
                    setResetEmail('');
                  }}
                  className="mt-4 w-full text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400"
                >
                  Back to sign in
                </button>
              </div>
            ) : (
              <form className="mt-8 space-y-6" onSubmit={handleForgotPassword}>
                <div>
                  <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email address
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter your email"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(false)}
                    className="text-sm text-gray-600 hover:text-gray-500 dark:text-gray-400"
                  >
                    Back to sign in
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
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
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSignIn}>
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
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className={`appearance-none relative block w-full pl-10 px-3 py-2 border ${
                      errors.email ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                    } rounded-md placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
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
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className={`appearance-none relative block w-full pl-10 pr-10 px-3 py-2 border ${
                      errors.password ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                    } rounded-md placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
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
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                  Remember me
                </label>
              </div>

              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400"
              >
                Forgot password?
              </button>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </div>

            {/* Demo Credentials */}
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="text-xs text-gray-600 dark:text-gray-400 text-center mb-3">
                Demo Credentials (for testing)
              </p>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Admin:</span>
                  <span className="text-gray-700 dark:text-gray-300">admin@company.com / Admin123!</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Teacher:</span>
                  <span className="text-gray-700 dark:text-gray-300">teacher@school.com / Teacher123!</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Student:</span>
                  <span className="text-gray-700 dark:text-gray-300">student@school.com / Student123!</span>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}