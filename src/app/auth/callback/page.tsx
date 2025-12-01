import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import {
  setAuthenticatedUser,
  clearAuthenticatedUser,
  type User,
  type UserRole,
  getRedirectPathForUser,
  mapUserTypeToRole
} from '../../../lib/auth';
import { toast } from '../../../components/shared/Toast';
import { LoadingSpinner } from '../../../components/shared/LoadingSpinner';

interface StatusState {
  message: string;
  subMessage?: string;
}

const getSystemRoleFromName = (roleName?: string): UserRole => {
  if (!roleName) return 'VIEWER';

  const roleMapping: Record<string, UserRole> = {
    'Super Admin': 'SSA',
    'Support Admin': 'SUPPORT',
    'Viewer': 'VIEWER'
  };

  return roleMapping[roleName] || 'VIEWER';
};

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [statusState, setStatusState] = useState<StatusState>({ message: 'Verifying your request…' });
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    let isMounted = true;

    const handleCallback = async () => {
      if (typeof window === 'undefined') {
        return;
      }

      try {
        setStatus('processing');
        setStatusState({ message: 'Reading verification link…' });

        const hash = window.location.hash.startsWith('#')
          ? window.location.hash.substring(1)
          : window.location.hash;
        const hashParams = new URLSearchParams(hash);
        const queryParams = new URLSearchParams(window.location.search);

        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token') || '';
        const type = hashParams.get('type') || '';
        const errorCode = hashParams.get('error_code') || hashParams.get('error');
        const errorDescription = hashParams.get('error_description');

        if (errorCode || errorDescription) {
          throw new Error(errorDescription || errorCode || 'The verification link is invalid or has expired.');
        }

        if (!accessToken) {
          throw new Error('Missing access token. Please request a new verification email.');
        }

        setStatusState({ message: 'Creating secure session…' });

        // Clear any previous session data before establishing the new session
        clearAuthenticatedUser();
        await supabase.auth.signOut();

        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });

        if (sessionError) {
          console.error('[AuthCallback] Failed to set session:', sessionError);
          throw new Error(sessionError.message || 'Unable to establish session from verification link.');
        }

        let supabaseUser = sessionData?.user ?? null;

        if (!supabaseUser) {
          const { data: currentUserData, error: getUserError } = await supabase.auth.getUser();

          if (getUserError) {
            console.error('[AuthCallback] Failed to fetch user after session creation:', getUserError);
            throw new Error('Unable to load user information from verification link.');
          }

          supabaseUser = currentUserData.user;
        }

        if (!supabaseUser) {
          throw new Error('Unable to load user information from verification link.');
        }

        setStatusState({ message: 'Loading your account…' });

        const normalizedEmail = supabaseUser.email?.toLowerCase() || '';

        // Attempt to load the custom user record by ID first
        let { data: userRecord, error: userRecordError } = await supabase
          .from('users')
          .select('id, email, user_type, is_active, email_verified, raw_user_meta_data')
          .eq('id', supabaseUser.id)
          .maybeSingle();

        if (userRecordError && userRecordError.code !== 'PGRST116') {
          console.error('[AuthCallback] Error fetching user record by ID:', userRecordError);
          throw new Error('Failed to load user profile.');
        }

        if (!userRecord && normalizedEmail) {
          const fallbackLookup = await supabase
            .from('users')
            .select('id, email, user_type, is_active, email_verified, raw_user_meta_data')
            .eq('email', normalizedEmail)
            .maybeSingle();

          if (fallbackLookup.error && fallbackLookup.error.code !== 'PGRST116') {
            console.error('[AuthCallback] Error fetching user record by email:', fallbackLookup.error);
            throw new Error('Failed to load user profile.');
          }

          userRecord = fallbackLookup.data || null;
        }

        if (userRecord && userRecord.is_active === false) {
          throw new Error('Your account is inactive. Please contact support for assistance.');
        }

        const userTypeMetadata =
          userRecord?.user_type ||
          supabaseUser.app_metadata?.user_type ||
          (typeof supabaseUser.user_metadata?.user_type === 'string'
            ? supabaseUser.user_metadata?.user_type
            : undefined) ||
          (typeof supabaseUser.user_metadata?.role === 'string'
            ? supabaseUser.user_metadata?.role.replace('_admin', '')
            : undefined) ||
          'user';

        let resolvedUserType = userTypeMetadata;

        if (resolvedUserType === 'entity_admin') {
          resolvedUserType = 'entity';
        }

        let displayName =
          userRecord?.raw_user_meta_data?.name ||
          supabaseUser.user_metadata?.name ||
          (normalizedEmail ? normalizedEmail.split('@')[0] : 'User');
        let avatarUrl: string | null =
          userRecord?.raw_user_meta_data?.avatar_url ||
          supabaseUser.user_metadata?.avatar_url ||
          null;

        let resolvedRole: UserRole = mapUserTypeToRole(resolvedUserType);

        if (resolvedUserType === 'system') {
          const { data: adminUser, error: adminError } = await supabase
            .from('admin_users')
            .select('role_id, roles!inner(name), avatar_url')
            .eq('id', supabaseUser.id)
            .maybeSingle();

          if (adminError && adminError.code !== 'PGRST116') {
            console.warn('[AuthCallback] Failed to load admin role:', adminError);
          }

          if (adminUser?.roles?.name) {
            resolvedRole = getSystemRoleFromName(adminUser.roles.name);
          } else {
            resolvedRole = 'SSA';
          }

          if (adminUser?.avatar_url) {
            avatarUrl = adminUser.avatar_url;
          }
        } else if (resolvedUserType === 'entity') {
          resolvedRole = 'ENTITY_ADMIN';

          const { data: entityUser, error: entityError } = await supabase
            .from('entity_users')
            .select('name')
            .eq('user_id', supabaseUser.id)
            .maybeSingle();

          if (!entityError && entityUser?.name) {
            displayName = entityUser.name;
          }
        } else if (resolvedUserType === 'teacher') {
          resolvedRole = 'TEACHER';
        } else if (resolvedUserType === 'student') {
          resolvedRole = 'STUDENT';
        }

        const timestamp = new Date().toISOString();

        if (userRecord && normalizedEmail && userRecord.email !== normalizedEmail) {
          await supabase
            .from('users')
            .update({
              email: normalizedEmail,
              updated_at: timestamp
            })
            .eq('id', userRecord.id);
        }

        if (!userRecord) {
          await supabase
            .from('users')
            .upsert({
              id: supabaseUser.id,
              email: normalizedEmail,
              user_type: resolvedUserType,
              is_active: true,
              email_verified: !!supabaseUser.email_confirmed_at,
              created_at: timestamp,
              updated_at: timestamp,
              raw_user_meta_data: supabaseUser.user_metadata
            }, { onConflict: 'id' });
        } else if (!userRecord.email_verified && supabaseUser.email_confirmed_at) {
          await supabase
            .from('users')
            .update({
              email_verified: true,
              updated_at: timestamp
            })
            .eq('id', userRecord.id);
        }

        await supabase
          .from('users')
          .update({
            last_login_at: timestamp,
            last_sign_in_at: timestamp,
            updated_at: timestamp
          })
          .eq('id', supabaseUser.id);

        const authenticatedUser: User = {
          id: supabaseUser.id,
          email: normalizedEmail,
          name: displayName,
          role: resolvedRole,
          userType: resolvedUserType,
          avatarUrl
        };

        setAuthenticatedUser(authenticatedUser);

        setStatusState({ message: 'Signed in successfully!', subMessage: 'Redirecting you to your dashboard…' });
        setStatus('success');
        toast.success('Verification successful. Welcome back!');

        const redirectParam = queryParams.get('next') || queryParams.get('redirect_to');
        const storedRedirect = localStorage.getItem('ggk_post_auth_redirect') || undefined;
        const fallbackRedirect = type === 'recovery' ? '/reset-password' : getRedirectPathForUser(authenticatedUser);

        const finalRedirect = redirectParam || storedRedirect || fallbackRedirect;

        if (storedRedirect) {
          localStorage.removeItem('ggk_post_auth_redirect');
        }

        window.history.replaceState({}, document.title, window.location.pathname);

        setTimeout(() => {
          if (!isMounted) {
            return;
          }
          navigate(finalRedirect, { replace: true });
        }, 1200);
      } catch (error: any) {
        console.error('[AuthCallback] Error handling callback:', error);
        if (!isMounted) {
          return;
        }

        const message =
          typeof error?.message === 'string'
            ? error.message
            : 'We could not verify your link. Please try again or request a new email.';

        setErrorMessage(message);
        setStatus('error');
        setStatusState({ message: 'Verification failed' });
        toast.error(message);
      }
    };

    void handleCallback();

    return () => {
      isMounted = false;
    };
  }, [location.hash, location.search, navigate]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/70 backdrop-blur-xl p-10 text-center shadow-2xl">
        {status === 'processing' && (
          <div className="flex flex-col items-center space-y-6">
            <LoadingSpinner size="lg" animation="hybrid" />
            <div>
              <p className="text-lg font-semibold text-white">{statusState.message}</p>
              {statusState.subMessage && (
                <p className="mt-1 text-sm text-white/70">{statusState.subMessage}</p>
              )}
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-lime-500/10">
              <CheckCircle2 className="h-10 w-10 text-lime-400" />
            </div>
            <div>
              <p className="text-xl font-semibold text-white">{statusState.message}</p>
              {statusState.subMessage && (
                <p className="mt-1 text-sm text-white/70">{statusState.subMessage}</p>
              )}
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
              <AlertCircle className="h-10 w-10 text-red-400" />
            </div>
            <div>
              <p className="text-xl font-semibold text-white">{statusState.message}</p>
              <p className="mt-2 text-sm text-red-200">{errorMessage}</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/signin', { replace: true })}
              className="inline-flex items-center justify-center rounded-full bg-white/10 px-6 py-2 text-sm font-medium text-white transition hover:bg-white/20"
            >
              Return to sign in
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
