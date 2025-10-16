// /home/project/src/app/signin/page.tsx
// Production version - Dev Access section removed for security

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  GraduationCap, 
  AlertCircle, 
  Loader2, 
  Mail,
  Lock,
  Eye,
  EyeOff,
  MailWarning
} from 'lucide-react';
import { Button } from '../../components/shared/Button';
import { FormField, Input } from '../../components/shared/FormField';
import { toast } from '../../components/shared/Toast';
import {
  setAuthenticatedUser,
  clearAuthenticatedUser,
  consumeSessionExpiredNotice,
  type User,
  type UserRole
} from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { getPreferredName, getTimeBasedGreeting } from '../../lib/greeting';

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
  const [loginErrorType, setLoginErrorType] = useState<string | null>(null);
  const [verificationNeeded, setVerificationNeeded] = useState(false);
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState<string | null>(null);
  
  // Redirect path
  const from = location.state?.from?.pathname || '/app/dashboard';
  
  // Clear session on mount
  useEffect(() => {
    console.log('[Auth] Clearing session on sign-in page load');
    
    // Sign out from Supabase Auth
    supabase.auth.signOut();
    
    // Clear local storage
    const authKeys = [
      'ggk_authenticated_user',
      'test_mode_user', 
      'ggk_auth_token',
      'ggk_remember_session',
      'user_scope_cache',
      'last_user_id'
    ];
    
    authKeys.forEach(key => localStorage.removeItem(key));
    sessionStorage.clear();
    clearAuthenticatedUser();

    // Load remembered email
    const savedEmail = localStorage.getItem('ggk_remembered_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }

    // Check if the previous session expired and surface the inline notice if present
    const expirationNotice = consumeSessionExpiredNotice();
    if (expirationNotice) {
      setSessionExpiredMessage(expirationNotice);
    }
  }, []);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoginErrorType(null);
    setVerificationNeeded(false);
    
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }
    
    setLoading(true);
    
    try {
      const normalizedEmail = email.trim().toLowerCase();
      
      // Clear existing session
      await supabase.auth.signOut();
      clearAuthenticatedUser();
      
      console.log('[Auth] Attempting login for:', normalizedEmail);
      
      // Attempt to sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: password
      });
      
      if (authError) {
        console.error('[Auth] Login error:', authError);
        
        // Handle specific Supabase Auth errors
        if (authError.message?.toLowerCase().includes('database error granting user')) {
          setError('Authentication service is temporarily unavailable. Please try again in a few moments or contact support if the issue persists.');
        } else if (authError.message?.toLowerCase().includes('email not confirmed') || 
                   authError.message?.toLowerCase().includes('email confirmation')) {
          setVerificationNeeded(true);
          setError('Please verify your email before signing in. Check your inbox for the verification link.');
        } else if (authError.message?.toLowerCase().includes('invalid login credentials')) {
          setLoginErrorType('invalid_credentials');
          setError('Invalid email or password. Please check your credentials.');
        } else if (authError.message?.toLowerCase().includes('too many requests')) {
          setError('Too many login attempts. Please try again later.');
        } else if (authError.message?.toLowerCase().includes('unexpected_failure')) {
          setError('Authentication service encountered an unexpected error. Please try again or contact support.');
        } else {
          setError(authError.message || 'Login failed. Please try again.');
        }
        
        setLoading(false);
        return;
      }
      
      if (!authData?.user) {
        setError('Authentication failed. Please try again.');
        setLoading(false);
        return;
      }
      
      // Check if email is confirmed in Supabase Auth
      if (!authData.user.email_confirmed_at) {
        console.log('[Auth] Email not confirmed for user:', authData.user.email);
        setVerificationNeeded(true);
        setError('Please verify your email before signing in. Check your inbox for the verification link.');
        
        // Sign out since email isn't verified
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }
      
      console.log('[Auth] Login successful for:', authData.user.email);
      
      // Get user metadata from custom tables
      let userId = authData.user.id;
      let userType = 'user';
      let userName = authData.user.user_metadata?.name || normalizedEmail.split('@')[0];
      let userRole: UserRole = 'VIEWER';
      let avatarUrl: string | null = null;
      
      // Fetch additional user data
      console.log('[Auth] Fetching user data from users table');
      const { data: userDataFetch, error: userFetchError } = await supabase
        .from('users')
        .select(`
          id,
          email,
          user_type,
          is_active,
          raw_user_meta_data
        `)
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (userFetchError) {
        console.error('[Auth] Error fetching user data:', userFetchError);
        setError('Failed to retrieve user information. Please try again.');
        setLoading(false);
        return;
      }
      
      if (userDataFetch) {
        // Check if account is active
        if (!userDataFetch.is_active) {
          await supabase.auth.signOut();
          setError('Your account is inactive. Please contact support.');
          setLoading(false);
          return;
        }
        
        userId = userDataFetch.id;
        userType = userDataFetch.user_type || 'user';
        userName = userDataFetch.raw_user_meta_data?.name || userName;
        avatarUrl = userDataFetch.raw_user_meta_data?.avatar_url ?? avatarUrl;
        
        // Update email_verified in custom table to match Supabase Auth
        if (!userDataFetch.email_verified && authData.user.email_confirmed_at) {
          await supabase
            .from('users')
            .update({ 
              email_verified: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', userId);
        }
        
      } else {
        // Create user in custom table if doesn't exist
        console.log('[Auth] Creating user in custom users table');
        
        await supabase
          .from('users')
          .upsert({
            id: authData.user.id,
            email: normalizedEmail,
            user_type: 'user',
            is_active: true,
            email_verified: true, // Already verified in Supabase Auth
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            raw_user_meta_data: authData.user.user_metadata
          }, { onConflict: 'id' });

        userId = authData.user.id;
        userName = authData.user.user_metadata?.name || userName;
        avatarUrl = authData.user.user_metadata?.avatar_url || avatarUrl;
      }

      // Determine user role based on type
      switch (userType) {
        case 'system':
          const { data: adminUser } = await supabase
            .from('admin_users')
            .select('role_id, roles!inner(name), avatar_url')
            .eq('id', authData.user.id)
            .maybeSingle();

          if (adminUser?.roles?.name) {
            userRole = getUserSystemRole(adminUser.roles.name);
          } else {
            userRole = 'SSA';
          }

          if (adminUser?.avatar_url) {
            avatarUrl = adminUser.avatar_url;
          }
          break;

        case 'entity':
          userRole = 'ENTITY_ADMIN';
          const { data: entityUser } = await supabase
            .from('entity_users')
            .select('name')
            .eq('user_id', userId)
            .maybeSingle();
          
          if (entityUser?.name) {
            userName = entityUser.name;
          }
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

      // Update last login
      console.log('[Auth] Updating last login timestamp');
      const { error: updateError } = await supabase
        .from('users')
        .update({
          last_login_at: new Date().toISOString(),
          last_sign_in_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        console.warn('[Auth] Failed to update login timestamp (non-critical):', updateError);
        // Don't fail login just because timestamp update failed
      }
      
      // Create authenticated user
      const authenticatedUser: User = {
        id: userId,
        email: normalizedEmail,
        name: userName,
        role: userRole,
        userType: userType,
        avatarUrl: avatarUrl
      };
      
      console.log('[Auth] User authenticated:', {
        userId: userId,
        email: normalizedEmail,
        userType: userType,
        role: userRole,
        emailVerified: true
      });
      
      // Handle Remember Me
      if (rememberMe) {
        localStorage.setItem('ggk_remembered_email', normalizedEmail);
        localStorage.setItem('ggk_remember_session', 'true');
      } else {
        localStorage.removeItem('ggk_remembered_email');
        localStorage.removeItem('ggk_remember_session');
      }
      
      // Set authenticated user
      setAuthenticatedUser(authenticatedUser);
      
      // Success
      const friendlyGreeting = getTimeBasedGreeting();
      const displayName = getPreferredName(authenticatedUser.name);
      const personalizedGreeting = displayName
        ? `${friendlyGreeting}, ${displayName}.`
        : `${friendlyGreeting}.`;
      toast.success(`${personalizedGreeting} You're now signed in and ready to go.`);
      
      // Redirect based on user type
      const redirectPath = getRedirectPath(userType, userRole);
      navigate(redirectPath, { replace: true });
      
    } catch (err) {
      console.error('[Auth] Unexpected error:', err);
      setError('An unexpected error occurred. Please try again.');
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
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim().toLowerCase()
      });
      
      if (error) {
        console.error('Resend verification error:', error);
        toast.error('Failed to send verification email.');
      } else {
        toast.success('Verification email sent! Please check your inbox.');
        toast.info('Check your spam folder if you don\'t see it.');
        setVerificationNeeded(false);
        setError(null);
      }
    } catch (err) {
      console.error('Resend error:', err);
      toast.error('Failed to send verification email.');
    } finally {
      setLoading(false);
    }
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
            Enter your registered email and password to access the platform
          </p>
        </div>
        
        {/* Sign-in Form */}
        <div className="mt-8 bg-gray-900/50 backdrop-blur-md py-8 px-4 shadow-2xl sm:rounded-xl sm:px-10 border border-gray-700/50">
          {/* Session expiration inline notice */}
          {sessionExpiredMessage && (
            <div className="mb-4 bg-blue-500/10 backdrop-blur text-blue-200 p-4 rounded-lg border border-blue-500/20">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Session expired</p>
                  <p className="text-sm mt-1">{sessionExpiredMessage}</p>
                </div>
              </div>
            </div>
          )}

          {/* Error Messages */}
          {error && (
            <div className="mb-4">
              {verificationNeeded ? (
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
                    {loginErrorType === 'invalid_credentials' && (
                      <div className="mt-3">
                        <Link
                          to="/forgot-password"
                          className="inline-flex items-center text-sm font-medium text-red-300 hover:text-red-200 underline"
                        >
                          Forgot your password?
                        </Link>
                      </div>
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