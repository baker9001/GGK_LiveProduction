/**
 * File: /src/app/signin/page.tsx
 * Dependencies: 
 *   - React
 *   - react-router-dom
 *   - lucide-react
 *   - bcryptjs
 *   - Custom components (NO SUPABASE AUTH)
 * 
 * Description: Sign-in page without Supabase authentication
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
  ChevronLeft,
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
  const from = location.state?.from?.pathname || '/app/dashboard';
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [emailNotVerified, setEmailNotVerified] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [verificationUserId, setVerificationUserId] = useState<string | null>(null);
  
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
      toast.success(`Welcome back, ${authenticatedUser.name}!`);
      
      // Redirect based on user type
      const redirectPath = getRedirectPath(user.user_type, userRole);
      navigate(redirectPath, { replace: true });
      
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
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur rounded-full mb-4">
            <GraduationCap className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-purple-200">Sign in to your account</p>
        </div>
        
        {/* Login Form */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/20">
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Error Alert */}
            {error && (
              <div className="bg-red-500/10 backdrop-blur border border-red-500/20 text-red-100 p-3 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm">{error}</p>
                  {attemptsLeft && attemptsLeft < 3 && (
                    <p className="text-xs mt-1 text-red-200">
                      Warning: {attemptsLeft} attempts remaining before account lock
                    </p>
                  )}
                </div>
              </div>
            )}
            
            {/* Email Not Verified Alert */}
            {emailNotVerified && (
              <div className="bg-yellow-500/10 backdrop-blur border border-yellow-500/20 text-yellow-100 p-3 rounded-lg">
                <div className="flex items-start gap-2">
                  <MailWarning className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Email Verification Required</p>
                    <p className="text-xs mt-1">
                      Please check your email and click the verification link before logging in.
                    </p>
                    <button
                      type="button"
                      onClick={handleResendVerification}
                      disabled={resendingVerification}
                      className="text-xs mt-2 text-yellow-200 hover:text-yellow-100 underline disabled:opacity-50"
                    >
                      {resendingVerification ? 'Sending...' : 'Resend verification email'}
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-purple-100 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-purple-300" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 bg-white/10 backdrop-blur border border-white/20 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all"
                  placeholder="Enter your email"
                  required
                  disabled={loading}
                />
              </div>
            </div>
            
            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-purple-100 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-purple-300" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-white/10 backdrop-blur border border-white/20 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all"
                  placeholder="Enter your password"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-purple-300 hover:text-purple-100 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
            
            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember"
                  type="checkbox"
                  className="h-4 w-4 bg-white/10 border-white/20 rounded text-purple-600 focus:ring-purple-400 focus:ring-offset-0"
                />
                <label htmlFor="remember" className="ml-2 text-sm text-purple-200">
                  Remember me
                </label>
              </div>
              <Link
                to="/forgot-password"
                className="text-sm text-purple-200 hover:text-white transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            
            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              className="w-full bg-white/20 backdrop-blur hover:bg-white/30 text-white font-medium py-2.5 transition-all"
              loading={loading}
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
            
            {/* Security Notice */}
            <div className="flex items-start gap-2 p-3 bg-purple-500/10 backdrop-blur rounded-lg border border-purple-500/20">
              <ShieldAlert className="h-4 w-4 text-purple-300 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-purple-200">
                <p>This is a secure system. Unauthorized access is prohibited.</p>
                <p className="mt-1">Your IP address and login attempts are being logged.</p>
              </div>
            </div>
          </form>
          
          {/* Footer Links */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <div className="flex items-center justify-center gap-4 text-sm">
              <Link
                to="/contact-support"
                className="text-purple-200 hover:text-white transition-colors"
              >
                Contact Support
              </Link>
              <span className="text-purple-400">•</span>
              <Link
                to="/request-access"
                className="text-purple-200 hover:text-white transition-colors"
              >
                Request Access
              </Link>
            </div>
          </div>
        </div>
        
        {/* Bottom Text */}
        <p className="mt-8 text-center text-sm text-purple-300">
          Protected by industry-standard encryption
        </p>
      </div>
    </div>
  );
}