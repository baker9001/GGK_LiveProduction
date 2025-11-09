// /home/project/src/app/signin/page.tsx
// Production version - Dev Access section removed for security

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  GraduationCap,
  AlertCircle,
  Loader2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  MailWarning,
  Sparkles,
  ShieldCheck,
  BarChart3
} from 'lucide-react';
import { Button } from '../../components/shared/Button';
import { FormField, Input } from '../../components/shared/FormField';
import { toast } from '../../components/shared/Toast';
import {
  setAuthenticatedUser,
  clearAuthenticatedUser,
  consumeSessionExpiredNotice,
  suppressSessionExpiredNoticeOnce,
  type User,
  type UserRole
} from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { getPreferredName, getTimeBasedGreeting } from '../../lib/greeting';
import { saveWelcomeNotice } from '../../lib/welcomeNotice';

export default function SignInPage() {
  const navigate = useNavigate();

  const highlightItems = [
    {
      icon: Sparkles,
      title: 'Curated learning intelligence',
      description:
        'Surface the most relevant insights and assignments for every stakeholder in a single dashboard.'
    },
    {
      icon: ShieldCheck,
      title: 'Enterprise-grade security',
      description: 'Rely on multi-layer protection, session monitoring, and compliance-ready audit trails.'
    },
    {
      icon: BarChart3,
      title: 'Real-time performance analytics',
      description: 'Track progress with live metrics, cohort comparisons, and actionable recommendations.'
    },
    {
      icon: Loader2,
      title: 'Frictionless onboarding',
      description: 'Resume exactly where you left off with intelligent session recovery and tailored notices.'
    }
  ];
  
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
  
  // Clear session on mount
  useEffect(() => {
    console.log('[Auth] Clearing session on sign-in page load');
    
    // Sign out from Supabase Auth without triggering a session expired notice
    suppressSessionExpiredNoticeOnce();
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
      suppressSessionExpiredNoticeOnce();
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
        suppressSessionExpiredNoticeOnce();
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
          suppressSessionExpiredNoticeOnce();
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

      const formattedGreeting = personalizedGreeting.replace(/\.$/, '!');
      saveWelcomeNotice({
        greeting: formattedGreeting,
        message: 'We refreshed your workspace with the latest insights.',
        timestamp: Date.now()
      });
      
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
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0">
        <img
          src="https://dodvqvkiuuuxymboldkw.supabase.co/storage/v1/object/public/signing/Singin%20new.jpg"
          alt="Educational background"
          className="h-full w-full select-none object-cover"
          draggable="false"
          onContextMenu={(e) => e.preventDefault()}
          style={{ userSelect: 'none' }}
        />
        <div className="absolute inset-0 bg-slate-950/70" />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/80 via-slate-900/55 to-slate-950/75" />
        <div className="absolute left-1/4 top-12 h-72 w-72 rounded-full bg-ggk-primary-400/30 blur-3xl" />
        <div className="absolute right-1/4 bottom-10 h-80 w-80 rounded-full bg-sky-400/20 blur-3xl" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-6 py-6 sm:px-10 lg:px-16">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white shadow-lg backdrop-blur">
              <GraduationCap className="h-7 w-7 text-ggk-primary-300" />
            </span>
            <div className="text-white">
              <p className="text-xs uppercase tracking-[0.4em] text-white/60">GGK Learning</p>
              <p className="text-2xl font-semibold leading-tight">Intelligent Education Workspace</p>
            </div>
          </div>

          <div className="hidden items-center gap-3 sm:flex">
            <Button
              variant="ghost"
              size="sm"
              className="text-white/80 hover:text-white"
              onClick={() => navigate('/contact-support')}
            >
              Contact support
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-white/30 text-white hover:border-white/60 hover:bg-white/10"
              onClick={() => navigate('/request-access')}
            >
              Request access
            </Button>
          </div>
        </header>

        <main className="flex flex-1 flex-col justify-center px-6 pb-16 pt-4 sm:px-10 lg:px-16">
          <div className="mx-auto w-full max-w-6xl">
            <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] xl:grid-cols-[1fr_0.9fr]">
              <section className="flex flex-col justify-center text-white">
                <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.4em] text-white/70 backdrop-blur">
                  <Sparkles className="h-3.5 w-3.5" />
                  Welcome back
                </span>
                <h1 className="mt-6 text-4xl font-semibold leading-tight text-white sm:text-5xl">
                  Sign in to orchestrate brilliant learning journeys.
                </h1>
                <p className="mt-4 text-base text-white/75 sm:text-lg">
                  Access the GGK ecosystem to manage stakeholders, unlock curated insights, and deliver meaningful progress updates across every cohort.
                </p>

                <div className="mt-10 grid gap-4 sm:grid-cols-2">
                  {highlightItems.map((item, index) => (
                    <div
                      key={index}
                      className="group flex h-full flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20 backdrop-blur-xl transition-transform duration-300 ease-out hover:-translate-y-1 hover:border-white/25 hover:bg-white/10"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white/90">
                        <item.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                        <p className="mt-1 text-sm leading-relaxed text-white/70">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-12 flex flex-wrap items-center gap-6 text-sm text-white/60">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    99.9% uptime SLA
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-ggk-primary-300" />
                    SOC2-ready controls
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-sky-300" />
                    Continuous backups
                  </div>
                </div>
              </section>

              <section className="relative">
                <div className="absolute -top-6 -right-6 h-32 w-32 rounded-full bg-ggk-primary-400/30 blur-3xl" />
                <div className="absolute -bottom-10 -left-6 h-40 w-40 rounded-full bg-sky-500/20 blur-3xl" />

                <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70 shadow-2xl shadow-black/40 backdrop-blur-2xl">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-ggk-primary-300 via-emerald-300 to-sky-300" />
                  <div className="relative z-10 p-8 sm:p-10">
                    <div className="flex flex-col gap-2 pb-6">
                      <h2 className="text-2xl font-semibold text-white">Sign in to GGK Learning</h2>
                      <p className="text-sm text-white/65">
                        Use your work email and password. Your session activity is protected with continuous monitoring.
                      </p>
                    </div>
            {/* Session expiration inline notice */}
            {sessionExpiredMessage && (
              <div className="mb-6 rounded-2xl border border-blue-400/40 bg-blue-500/10 p-4 text-blue-100">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-200" />
                  <div>
                    <p className="font-semibold">Session expired</p>
                    <p className="mt-1 text-sm text-blue-100/80">{sessionExpiredMessage}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Error Messages */}
            {error && (
              <div className="mb-6">
                {verificationNeeded ? (
                  <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4 text-amber-100">
                    <div className="flex items-start gap-3">
                      <MailWarning className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-200" />
                      <div className="flex-1">
                        <p className="font-semibold">Email verification required</p>
                        <p className="mt-1 text-sm text-amber-100/80">Your email address is not verified. Please check your inbox for the verification link.</p>
                        <p className="mt-2 text-xs text-amber-100/70">
                          Can't find the email? Check your spam folder or click below to resend.
                        </p>
                        <button
                          onClick={handleResendVerification}
                          disabled={loading}
                          className="mt-3 text-sm font-semibold text-amber-100 underline decoration-amber-200/70 underline-offset-4 transition hover:text-amber-50 disabled:opacity-50"
                        >
                          {loading ? 'Sending...' : 'Resend verification email'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-red-100">
                    <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-200" />
                    <div>
                      <span className="text-sm font-medium text-red-100">{error}</span>
                      {loginErrorType === 'invalid_credentials' && (
                        <div className="mt-3">
                          <Link
                            to="/forgot-password"
                            className="inline-flex items-center text-sm font-semibold text-red-100 underline decoration-red-200/70 underline-offset-4 transition hover:text-red-50"
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
                labelClassName="text-sm font-semibold text-white/75"
              >
                <div className="relative mt-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-white/40" />
                  </div>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 rounded-2xl border border-white/10 bg-white/5 pl-10 pr-3 text-white placeholder:text-white/50 focus:border-ggk-primary-300 focus:ring-ggk-primary-300"
                    placeholder="name@yourorganization.com"
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
                labelClassName="text-sm font-semibold text-white/75"
              >
                <div className="relative mt-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-white/40" />
                  </div>
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 rounded-2xl border border-white/10 bg-white/5 pl-10 pr-10 text-white placeholder:text-white/50 focus:border-ggk-primary-300 focus:ring-ggk-primary-300"
                    placeholder="Enter your password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-white/50 transition hover:text-white"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
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
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-sm text-white/70">
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
                    className="h-4 w-4 cursor-pointer rounded border-white/20 bg-white/5 text-ggk-primary-300 focus:ring-ggk-primary-300 focus:ring-offset-0"
                  />
                  <label htmlFor="remember-me" className="ml-2 cursor-pointer text-sm font-medium">
                    Remember me
                  </label>
                </div>

                <div>
                  <Link
                    to="/forgot-password"
                    className="font-semibold text-ggk-primary-200 underline decoration-ggk-primary-200/60 underline-offset-4 transition hover:text-ggk-primary-100"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  size="lg"
                  fullWidth
                  className="h-12 w-full rounded-2xl text-base tracking-wide shadow-lg shadow-ggk-primary-900/40"
                  disabled={loading || !email || !password}
                  loading={loading}
                  loadingText="Signing in..."
                >
                  Sign in
                </Button>
              </div>
            </form>


            {/* Additional Links */}
            <div className="mt-8 space-y-6 pt-6">
              <div className="text-center text-sm font-semibold text-white/75">
                Need help?
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  variant="secondary"
                  className="h-11 rounded-2xl bg-white/10 text-white hover:bg-white/20"
                  onClick={() => navigate('/contact-support')}
                >
                  Contact support
                </Button>
                <Button
                  variant="ghost"
                  className="h-11 rounded-2xl text-white/85 hover:bg-white/10 hover:text-white"
                  onClick={() => navigate('/request-access')}
                >
                  Request access
                </Button>
              </div>
            </div>

            {/* Back to Home Button */}
            <div className="mt-6">
              <Button
                onClick={() => navigate('/')}
                variant="outline"
                fullWidth
                className="h-11 rounded-2xl border-white/30 text-white hover:border-white/60 hover:bg-white/10"
              >
                Back to home
              </Button>
            </div>

            <p className="mt-6 text-center text-xs font-medium uppercase tracking-[0.3em] text-white/40">
              Protected by advanced encryption & compliance monitoring
            </p>
          </div>
        </div>
      </section>
    </div>
  </div>
        </main>
      </div>
    </div>
  );
}
