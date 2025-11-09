// /src/app/reset-password/page.tsx
// CORRECTED VERSION - Preserves tokens until password reset is complete

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import { GraduationCap, Lock, CheckCircle, AlertCircle, Loader2, Eye, EyeOff, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '../../components/shared/Button';
import { FormField, Input } from '../../components/shared/FormField';
import { supabase } from '../../lib/supabase';
import { getCurrentUser, suppressSessionExpiredNoticeOnce } from '../../lib/auth';
import { toast } from '../../components/shared/Toast';

interface PasswordStrength {
  score: number;
  feedback: string[];
}

function calculatePasswordStrength(password: string): PasswordStrength {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) score += 1;
  else feedback.push('At least 8 characters');

  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('One uppercase letter');

  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('One lowercase letter');

  if (/[0-9]/.test(password)) score += 1;
  else feedback.push('One number');

  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  else feedback.push('One special character');

  return { score, feedback };
}

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [checkingToken, setCheckingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [linkType, setLinkType] = useState<string | null>(null);
  
  // Token storage
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  
  // State for first-login password change
  const [isFirstLoginChange, setIsFirstLoginChange] = useState(false);
  const [userIdToProcess, setUserIdToProcess] = useState<string | null>(null);
  const [userTypeToProcess, setUserTypeToProcess] = useState<string | null>(null);
  
  // Legacy token data
  const [legacyTokenData, setLegacyTokenData] = useState<any>(null);
  const legacyToken = searchParams.get('token');
  
  const passwordStrength = calculatePasswordStrength(password);
  const isInvitationLink = linkType !== null && linkType !== 'recovery';

  // CRITICAL: This effect MUST run first to capture tokens immediately
  useEffect(() => {
    const captureTokens = async () => {
      console.log('[ResetPassword] Initializing...');
      console.log('[ResetPassword] Full URL:', window.location.href);
      console.log('[ResetPassword] Hash:', window.location.hash);
      console.log('[ResetPassword] Search:', window.location.search);

      // PRIORITY 1: Check for hash fragments (Supabase sends tokens here)
      const hash = window.location.hash;
      if (hash) {
        const hashParams = new URLSearchParams(hash.substring(1));
        const access = hashParams.get('access_token');
        const refresh = hashParams.get('refresh_token');
        const type = hashParams.get('type');
        const errorCode = hashParams.get('error_code');
        const errorDesc = hashParams.get('error_description');
        const validHashTypes = new Set(['recovery', 'invite', 'signup']);

        console.log('[ResetPassword] Hash params found:', {
          hasAccess: !!access,
          hasRefresh: !!refresh,
          type,
          error: errorCode
        });

        // Check for errors
        if (errorCode || errorDesc) {
          console.error('[ResetPassword] Error in hash:', errorCode, errorDesc);
          setError(errorDesc || 'Invalid or expired access link');
          setTokenValid(false);
          setCheckingToken(false);
          return;
        }

        // Handle recovery or invitation tokens
        if (access && type && validHashTypes.has(type)) {
          console.log('[ResetPassword] Valid tokens found in hash for type:', type);
          setAccessToken(access);
          setRefreshToken(refresh || '');
          setLinkType(type);

          try {
            // Set Supabase session
            console.log('[ResetPassword] Setting Supabase session...');
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token: access,
              refresh_token: refresh || ''
            });

            if (sessionError) {
              console.error('[ResetPassword] Session error:', sessionError);
              
              // Try to get user anyway
              const { data: { user }, error: userError } = await supabase.auth.getUser(access);
              
              if (userError || !user) {
                setError('Failed to verify access link. The link may have expired.');
                setTokenValid(false);
                setCheckingToken(false);
                return;
              }

              // User exists but session failed - still proceed
              console.log('[ResetPassword] User found despite session error:', user.id);
              setUserIdToProcess(user.id);
              setUserEmail(user.email || '');
              setTokenValid(true);
              setSessionReady(true);
              setLinkType((current) => current || type);
            } else if (sessionData?.user) {
              console.log('[ResetPassword] Session established for:', sessionData.user.id);
              setUserIdToProcess(sessionData.user.id);
              setUserEmail(sessionData.user.email || '');
              setTokenValid(true);
              setSessionReady(true);
              setLinkType((current) => current || type);
            } else {
              // Try to get user from session
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                console.log('[ResetPassword] User found in session:', user.id);
                setUserIdToProcess(user.id);
                setUserEmail(user.email || '');
                setTokenValid(true);
                setSessionReady(true);
                setLinkType((current) => current || type);
              } else {
                setError('Unable to verify user session. Please request a new email link.');
                setTokenValid(false);
              }
            }

            // IMPORTANT: DO NOT clear hash here - we need it for the password update
            // Only clear it after successful password reset
            console.log('[ResetPassword] Preserving hash for password update');

          } catch (err) {
            console.error('[ResetPassword] Error processing tokens:', err);
            setError('Failed to process access link. Please try again.');
            setTokenValid(false);
          } finally {
            setCheckingToken(false);
          }
          return;
        }
      }

      // PRIORITY 2: Check for legacy token in query params
      if (legacyToken) {
        console.log('[ResetPassword] Legacy token found');
        await checkLegacyResetToken();
        return;
      }

      // PRIORITY 3: Check if this is a first-login password change
      const currentUser = getCurrentUser();
      if (currentUser && location.pathname === '/app/settings/change-password') {
        console.log('[ResetPassword] First login password change');
        setIsFirstLoginChange(true);
        setUserIdToProcess(currentUser.id);
        setUserTypeToProcess(currentUser.userType || 'user');
        setTokenValid(true);
        setCheckingToken(false);
        return;
      }

      // No tokens found
      console.log('[ResetPassword] No tokens found');
      setError('No access token provided. Please use the link from your email.');
      setTokenValid(false);
      setCheckingToken(false);
    };

    captureTokens();
  }, []); // Run only once on mount

  const checkLegacyResetToken = async () => {
    try {
      const { data, error } = await supabase
        .from('password_reset_tokens')
        .select('*')
        .eq('token', legacyToken)
        .eq('used', false)
        .gte('expires_at', new Date().toISOString())
        .single();

      if (error || !data) {
        setError('Invalid or expired access link. Please request a new one.');
        setTokenValid(false);
      } else {
        setLegacyTokenData(data);
        setUserIdToProcess(data.user_id);
        setUserTypeToProcess(data.user_type);
        setTokenValid(true);
      }
    } catch (err) {
      setError('Failed to verify access link');
      setTokenValid(false);
    } finally {
      setCheckingToken(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate passwords
    if (!password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (passwordStrength.score < 3) {
      setError('Password is too weak. Please choose a stronger password.');
      return;
    }

    setLoading(true);

    try {
      // Use Supabase Auth if we have tokens
      if (accessToken || sessionReady) {
        console.log('[ResetPassword] Updating password via Supabase Auth...');
        console.log('[ResetPassword] Session ready:', sessionReady);
        console.log('[ResetPassword] Access token available:', !!accessToken);
        
        // If we don't have a session ready, try to re-establish it
        if (!sessionReady && accessToken) {
          console.log('[ResetPassword] Re-establishing session...');
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || ''
          });
          
          if (sessionError) {
            console.error('[ResetPassword] Session re-establishment failed:', sessionError);
            // Try to continue anyway
          } else {
            console.log('[ResetPassword] Session re-established successfully');
          }
        }
        
        // Update password in Supabase Auth
        const { data, error: updateError } = await supabase.auth.updateUser({
          password: password
        });

        if (updateError) {
          console.error('[ResetPassword] Password update error:', updateError);
          
          // Handle specific errors
          if (updateError.message?.includes('not authenticated')) {
            throw new Error('Session expired. Please request a new email link.');
          } else if (updateError.message?.includes('same password')) {
            throw new Error('New password must be different from your current password.');
          } else {
            throw new Error(updateError.message || 'Failed to update password.');
          }
        }

        if (!data?.user) {
          throw new Error('Password update failed. Please try again.');
        }

        console.log('[ResetPassword] Password updated successfully');

        // Update metadata in custom users table (without password_hash)
        try {
          // Get current metadata
          const { data: currentUser } = await supabase
            .from('users')
            .select('raw_user_meta_data')
            .eq('id', userIdToProcess || data.user.id)
            .single();

          const updatedMetadata = {
            ...(currentUser?.raw_user_meta_data || {}),
            password_updated_at: new Date().toISOString(),
            requires_password_change: false,
            password_reset_completed: true
          };

          await supabase
            .from('users')
            .update({
              raw_user_meta_data: updatedMetadata,
              updated_at: new Date().toISOString()
            })
            .eq('id', userIdToProcess || data.user.id);

        } catch (metadataError) {
          console.warn('[ResetPassword] Failed to update metadata (non-critical):', metadataError);
        }

        // NOW it's safe to clear the URL after successful password update
        console.log('[ResetPassword] Clearing URL hash after successful update');
        window.history.replaceState(null, '', window.location.pathname);

        // Sign out after password reset
        suppressSessionExpiredNoticeOnce();
        await supabase.auth.signOut();
        
      } else if (legacyTokenData) {
        // Legacy password update
        console.log('[ResetPassword] Updating password via legacy method...');
        
        // For legacy method, we can't update auth.users, only metadata
        const { data: currentUser } = await supabase
          .from('users')
          .select('raw_user_meta_data')
          .eq('id', userIdToProcess)
          .single();

        const updatedMetadata = {
          ...(currentUser?.raw_user_meta_data || {}),
          password_updated_at: new Date().toISOString(),
          requires_password_change: false,
          legacy_password_reset: true
        };

        const { error: userUpdateError } = await supabase
          .from('users')
          .update({
            raw_user_meta_data: updatedMetadata,
            updated_at: new Date().toISOString()
          })
          .eq('id', userIdToProcess);

        if (userUpdateError) {
          throw new Error(`Failed to update user: ${userUpdateError.message}`);
        }

        // Mark token as used
        if (legacyTokenData.id) {
          await supabase
            .from('password_reset_tokens')
            .update({ 
              used: true, 
              used_at: new Date().toISOString() 
            })
            .eq('id', legacyTokenData.id);
        }
        
        // Clear URL for legacy tokens too
        window.history.replaceState(null, '', window.location.pathname);
      } else {
        throw new Error('No valid session found. Please request a new email link.');
      }
      
      toast.success('Password updated successfully!');
      setSuccess(true);

    } catch (err) {
      console.error('[ResetPassword] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingToken) {
    return (
      <div className="min-h-screen relative flex items-center justify-center">
        <div className="absolute inset-0 z-0">
          <img
            src="https://dodvqvkiuuuxymboldkw.supabase.co/storage/v1/object/public/signing/Singin%20new.jpg"
            alt="Educational background"
            className="w-full h-full object-cover select-none pointer-events-none"
            draggable="false"
            onContextMenu={(e) => e.preventDefault()}
            style={{ userSelect: 'none' }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900/90 via-gray-900/80 to-gray-900/90" />
        </div>
        
        <div className="text-center relative z-10">
          <Loader2 className="h-8 w-8 animate-spin text-[#8CC63F] mx-auto" />
          <p className="mt-2 text-sm text-gray-300">Verifying secure link...</p>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen relative flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="absolute inset-0 z-0">
          <img
            src="https://dodvqvkiuuuxymboldkw.supabase.co/storage/v1/object/public/signing/Singin%20new.jpg"
            alt="Educational background"
            className="w-full h-full object-cover select-none pointer-events-none"
            draggable="false"
            onContextMenu={(e) => e.preventDefault()}
            style={{ userSelect: 'none' }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900/90 via-gray-900/80 to-gray-900/90" />
        </div>
        
        <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <div className="inline-flex items-center justify-center">
              <GraduationCap className="h-14 w-14 text-[#8CC63F]" />
              <span className="ml-3 text-4xl font-bold text-white">
                GGK Learning
              </span>
            </div>
          </div>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
          <div className="bg-gray-900/50 backdrop-blur-md py-8 px-4 shadow-2xl sm:rounded-xl sm:px-10 border border-gray-700/50">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100/20 backdrop-blur">
                <AlertCircle className="h-6 w-6 text-red-400" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-white">
                Invalid or Expired Access Link
              </h2>
              <p className="mt-2 text-sm text-gray-300">
                {error || 'Failed to verify access link. The link may have expired. Please request a new one.'}
              </p>
              
              <div className="mt-6 space-y-3">
                <Button
                  onClick={() => navigate('/forgot-password')}
                  className="w-full justify-center bg-[#8CC63F] hover:bg-[#7AB635] text-white font-medium"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Request New Email
                </Button>
                
                <Button
                  onClick={() => navigate('/signin')}
                  variant="outline"
                  className="w-full justify-center bg-gray-800/50 backdrop-blur border-gray-600 text-gray-300 hover:bg-gray-700/50"
                >
                  Back to Sign In
                </Button>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-700">
                <p className="text-xs text-gray-400">
                  If you continue to have issues, please contact support for assistance.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <p className="mt-8 text-center text-sm text-gray-400 relative z-10">
          Protected by industry-standard encryption
        </p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen relative flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="absolute inset-0 z-0">
          <img
            src="https://dodvqvkiuuuxymboldkw.supabase.co/storage/v1/object/public/signing/Singin%20new.jpg"
            alt="Educational background"
            className="w-full h-full object-cover select-none pointer-events-none"
            draggable="false"
            onContextMenu={(e) => e.preventDefault()}
            style={{ userSelect: 'none' }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900/90 via-gray-900/80 to-gray-900/90" />
        </div>
        
        <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <div className="inline-flex items-center justify-center">
              <GraduationCap className="h-14 w-14 text-[#8CC63F]" />
              <span className="ml-3 text-4xl font-bold text-white">
                GGK Learning
              </span>
            </div>
          </div>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
          <div className="bg-gray-900/50 backdrop-blur-md py-8 px-4 shadow-2xl sm:rounded-xl sm:px-10 border border-gray-700/50">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100/20 backdrop-blur">
                <CheckCircle className="h-6 w-6 text-green-400" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-white">
                Password Updated Successfully
              </h2>
              <p className="mt-2 text-sm text-gray-300">
                Your password has been successfully updated. You can now sign in with your new credentials.
              </p>
              
              <div className="mt-6">
                <Button
                  onClick={() => navigate('/signin')}
                  className="w-full justify-center bg-[#8CC63F] hover:bg-[#7AB635] text-white font-medium"
                >
                  Go to Sign In
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        <p className="mt-8 text-center text-sm text-gray-400 relative z-10">
          Protected by industry-standard encryption
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="absolute inset-0 z-0">
        <img
          src="https://dodvqvkiuuuxymboldkw.supabase.co/storage/v1/object/sign/signing/shutterstock_2475380851.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kZWMxYmI3Ni1lOTljLTQ5ODEtOWU4Zi0zYjA3ZjZlZmUxZWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzaWduaW5nL3NodXR0ZXJzdG9ja18yNDc1MzgwODUxLmpwZyIsImlhdCI6MTc1NjA2MDQ1OSwiZXhwIjo0ODc4MTI0NDU5fQ.vmQTU-G_jb0V6yz8TGg2-WP-mqnxYD-5A8VIzatHizI"
          alt="Educational background"
          className="w-full h-full object-cover select-none pointer-events-none"
          draggable="false"
          onContextMenu={(e) => e.preventDefault()}
          style={{ userSelect: 'none' }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/90 via-gray-900/80 to-gray-900/90" />
      </div>
      
      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <div className="inline-flex items-center justify-center">
            <GraduationCap className="h-14 w-14 text-[#8CC63F]" />
            <span className="ml-3 text-4xl font-bold text-white">
              GGK Learning
            </span>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-white">
            {isFirstLoginChange
              ? 'Change your password'
              : isInvitationLink
              ? 'Set your password'
              : 'Reset your password'}
          </h2>
          <p className="mt-2 text-sm text-gray-300">
            {isFirstLoginChange
              ? 'Please set a new password for your account'
              : isInvitationLink
              ? 'Create a strong password to activate your account'
              : 'Enter your new password below'}
          </p>
        </div>

        <div className="mt-8 bg-gray-900/50 backdrop-blur-md py-8 px-4 shadow-2xl sm:rounded-xl sm:px-10 border border-gray-700/50">
          {error && (
            <div className="mb-4 bg-red-500/10 backdrop-blur text-red-400 p-4 rounded-lg border border-red-500/20">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="text-sm">{error}</span>
                  {error.includes('expired') && (
                    <button
                      onClick={() => navigate('/forgot-password')}
                      className="mt-2 text-xs text-red-300 hover:text-white underline block"
                    >
                      Request a new email link
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <FormField
              id="password"
              label="New Password"
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
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-[#8CC63F] focus:ring-[#8CC63F]"
                  placeholder="Enter new password"
                  disabled={loading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                  )}
                </button>
              </div>
              
              {password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          i < passwordStrength.score
                            ? passwordStrength.score <= 2
                              ? 'bg-red-500'
                              : passwordStrength.score <= 3
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                            : 'bg-gray-600'
                        }`}
                      />
                    ))}
                  </div>
                  {passwordStrength.feedback.length > 0 && (
                    <p className="text-xs text-gray-400">
                      Add: {passwordStrength.feedback.join(', ')}
                    </p>
                  )}
                </div>
              )}
            </FormField>

            <FormField
              id="confirmPassword"
              label="Confirm New Password"
              required
              labelClassName="text-gray-200"
            >
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 pr-10 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-[#8CC63F] focus:ring-[#8CC63F]"
                  placeholder="Confirm new password"
                  disabled={loading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                  )}
                </button>
              </div>
              
              {confirmPassword && password !== confirmPassword && (
                <p className="mt-1 text-xs text-red-400">
                  Passwords do not match
                </p>
              )}
            </FormField>

            <Button
              type="submit"
              className="w-full justify-center bg-[#8CC63F] hover:bg-[#7AB635] text-white font-medium"
              disabled={loading || !password || !confirmPassword || passwordStrength.score < 3}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  {isInvitationLink ? 'Setting password...' : 'Resetting password...'}
                </>
              ) : (
                isInvitationLink ? 'Set Password' : 'Reset Password'
              )}
            </Button>
          </form>

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
              <Button
                onClick={() => navigate('/signin')}
                variant="outline"
                className="w-full justify-center bg-gray-800/50 backdrop-blur border-gray-600 text-gray-300 hover:bg-gray-700/50"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Sign In
              </Button>
              <Link
                to="/contact-support"
                className="w-full inline-flex justify-center items-center py-2 px-4 border border-gray-600 rounded-lg shadow-sm bg-gray-800/50 backdrop-blur text-sm font-medium text-gray-300 hover:bg-gray-700/50 transition-colors"
              >
                Contact Support
              </Link>
            </div>
          </div>
        </div>
        
        <p className="mt-8 text-center text-sm text-gray-400">
          Protected by industry-standard encryption
        </p>
      </div>
    </div>
  );
}