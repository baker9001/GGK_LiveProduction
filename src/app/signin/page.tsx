/**
 * File: /src/app/signin/page.tsx
 * Dependencies: 
 *   - React
 *   - react-router-dom
 *   - lucide-react
 *   - Custom components
 * 
 * Description: Sign-in page with centralized authentication
 * 
 * Key Changes:
 *   - Only handles login (no signup)
 *   - Checks email verification status
 *   - Shows appropriate error messages
 *   - Handles account lockout
 *   - Resend verification option
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
  MailWarning
} from 'lucide-react';
import { Button } from '../../components/shared/Button';
import { FormField, Input } from '../../components/shared/FormField';
import { toast } from '../../components/shared/Toast';
import { setAuthenticatedUser, type User, type UserRole } from '../../lib/auth';

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
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password
        })
      });
      
      const data: LoginResponse = await response.json();
      
      if (!response.ok) {
        // Handle specific error codes
        if (data.code === 'EMAIL_NOT_VERIFIED') {
          setVerificationNeeded(true);
          setUnverifiedUserId(data.userId || null);
          setError('Please verify your email before signing in');
        } else if (data.error?.includes('locked')) {
          setAccountLocked(true);
          setError(data.error);
        } else if (data.attemptsLeft !== undefined) {
          setAttemptsLeft(data.attemptsLeft);
          setError(`Invalid credentials. ${data.attemptsLeft} attempts remaining`);
        } else {
          setError(data.error || 'Sign in failed');
        }
        return;
      }
      
      if (data.success && data.user) {
        // Map user type to role
        const roleMap: Record<string, UserRole> = {
          'system': getUserSystemRole(data.user.profile?.role),
          'entity': 'ENTITY_ADMIN',
          'teacher': 'TEACHER',
          'student': 'STUDENT'
        };
        
        const user: User = {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          role: roleMap[data.user.user_type] || 'VIEWER'
        };
        
        // Set authenticated user
        setAuthenticatedUser(user);
        
        // Check if password change required
        if (data.user.requires_password_change) {
          toast.warning('Please change your password');
          navigate('/app/settings/change-password');
          return;
        }
        
        // Success message
        toast.success(`Welcome back, ${data.user.name}!`);
        
        // Redirect based on user type
        const redirectPath = getRedirectPath(data.user.user_type, user.role);
        navigate(redirectPath, { replace: true });
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Network error. Please try again.');
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
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: unverifiedUserId,
          email: email.trim().toLowerCase()
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setError(data.error || 'Failed to send verification email');
        return;
      }
      
      toast.success('Verification email sent! Please check your inbox.');
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Logo */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="flex items-center">
            <GraduationCap className="h-12 w-12 text-[#8CC63F]" />
            <span className="ml-2 text-3xl font-bold text-gray-900 dark:text-white">
              GGK Learning
            </span>
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          Enter your credentials to access the platform
        </p>
      </div>
      
      {/* Sign-in Form */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow-xl dark:shadow-gray-900/50 sm:rounded-lg sm:px-10 border border-gray-200 dark:border-gray-700">
          {/* Error Messages */}
          {error && (
            <div className="mb-4">
              {accountLocked ? (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded-lg flex items-start border border-red-200 dark:border-red-800">
                  <ShieldAlert className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Account Locked</p>
                    <p className="text-sm mt-1">{error}</p>
                  </div>
                </div>
              ) : verificationNeeded ? (
                <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="flex items-start">
                    <MailWarning className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium">Email Verification Required</p>
                      <p className="text-sm mt-1">{error}</p>
                      <button
                        onClick={handleResendVerification}
                        disabled={loading}
                        className="text-sm mt-2 text-amber-800 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-200 font-medium underline"
                      >
                        Resend verification email
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded-lg flex items-start border border-red-200 dark:border-red-800">
                  <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-sm">{error}</span>
                    {attemptsLeft !== null && attemptsLeft > 0 && (
                      <p className="text-xs mt-1">
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
                  className="pl-10"
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
                  className="pl-10 pr-10"
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
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
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
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
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
              className="w-full justify-center"
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
                <div className="w-full border-t border-gray-300 dark:border-gray-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">
                  Need help?
                </span>
              </div>
            </div>
            
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Link
                to="/contact-support"
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Contact Support
              </Link>
              <Link
                to="/request-access"
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
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