// /home/project/src/app/reset-password/page.tsx
// Updated with consistent UI/UX matching signin page

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import { GraduationCap, Lock, CheckCircle, AlertCircle, Loader2, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/shared/Button';
import { FormField, Input } from '../../components/shared/FormField';
import { supabase } from '../../lib/supabase';
import bcrypt from 'bcryptjs/dist/bcrypt.min';
import { getCurrentUser } from '../../lib/auth';

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

// Helper function to parse hash fragments
function parseHashParams(hash: string): URLSearchParams {
  // Remove the leading # if present
  const cleanHash = hash.startsWith('#') ? hash.substring(1) : hash;
  return new URLSearchParams(cleanHash);
}

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  
  // Parse tokens from either hash fragments or query params
  const hashParams = parseHashParams(window.location.hash);
  
  // Try to get params from hash first (Supabase default), then fall back to query params
  const access_token = hashParams.get('access_token') || searchParams.get('access_token');
  const refresh_token = hashParams.get('refresh_token') || searchParams.get('refresh_token');
  const type = hashParams.get('type') || searchParams.get('type');
  const error_code = hashParams.get('error_code') || searchParams.get('error_code');
  const error_description = hashParams.get('error_description') || searchParams.get('error_description');
  
  // Legacy token support (for your existing system)
  const legacyToken = searchParams.get('token');
  
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
  
  // State for first-login password change
  const [isFirstLoginChange, setIsFirstLoginChange] = useState(false);
  const [userIdToProcess, setUserIdToProcess] = useState<string | null>(null);
  const [userTypeToProcess, setUserTypeToProcess] = useState<string | null>(null);
  
  // Legacy token data
  const [legacyTokenData, setLegacyTokenData] = useState<any>(null);
  
  const passwordStrength = calculatePasswordStrength(password);

  useEffect(() => {
    const initializeReset = async () => {
      console.log('Initializing password reset...');
      console.log('Hash params:', window.location.hash);
      console.log('Query params:', window.location.search);
      console.log('Parsed access_token:', access_token ? 'present' : 'missing');
      console.log('Parsed type:', type);
      
      // Check for Supabase error parameters
      if (error_code || error_description) {
        setError(error_description || 'Invalid or expired reset link');
        setTokenValid(false);
        setCheckingToken(false);
        return;
      }

      // Handle Supabase Auth reset flow
      if (access_token && type === 'recovery') {
        try {
          console.log('Setting Supabase session with recovery token...');
          
          // Set the session with the recovery token
          const { error: sessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token: refresh_token || ''
          });

          if (sessionError) {
            console.error('Session error:', sessionError);
            setError('Failed to verify reset link. Please request a new one.');
            setTokenValid(false);
          } else {
            // Get the current user from the session
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            
            if (userError || !user) {
              console.error('User error:', userError);
              setError('Failed to verify user. Please request a new reset link.');
              setTokenValid(false);
            } else {
              console.log('Session established successfully for user:', user.id);
              setTokenValid(true);
              setSessionReady(true);
              setUserIdToProcess(user.id);
              
              // Clear the hash from the URL for cleaner appearance
              window.history.replaceState(null, '', window.location.pathname);
            }
          }
        } catch (err) {
          console.error('Error setting session:', err);
          setError('Failed to process reset link');
          setTokenValid(false);
        } finally {
          setCheckingToken(false);
        }
        return;
      }

      // Handle legacy token-based reset
      if (legacyToken) {
        console.log('Processing legacy token...');
        await checkLegacyResetToken();
        return;
      }

      // Check if this is a first-login password change
      const currentUser = getCurrentUser();
      if (currentUser && location.pathname === '/app/settings/change-password') {
        console.log('First login password change detected');
        setIsFirstLoginChange(true);
        setUserIdToProcess(currentUser.id);
        setUserTypeToProcess(currentUser.userType || 'user');
        setTokenValid(true);
        setCheckingToken(false);
        return;
      }

      console.log('No valid reset token found');
      setError('No reset token provided');
      setCheckingToken(false);
    };

    initializeReset();
  }, [access_token, refresh_token, type, legacyToken, location.pathname, error_code, error_description]);

  const checkLegacyResetToken = async () => {
    try {
      // Validate legacy token from your custom table
      const { data, error } = await supabase
        .from('password_reset_tokens')
        .select('*')
        .eq('token', legacyToken)
        .eq('used', false)
        .gte('expires_at', new Date().toISOString())
        .single();

      if (error || !data) {
        setError('Invalid or expired reset link. Please request a new one.');
        setTokenValid(false);
      } else {
        setLegacyTokenData(data);
        setUserIdToProcess(data.user_id);
        setUserTypeToProcess(data.user_type);
        setTokenValid(true);
      }
    } catch (err) {
      setError('Failed to verify reset link');
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
      // Use Supabase Auth if we have a valid session
      if (sessionReady) {
        console.log('Updating password via Supabase Auth...');
        
        const { error: updateError } = await supabase.auth.updateUser({
          password: password
        });

        if (updateError) {
          throw new Error(updateError.message);
        }

        // Also update the password hash in your custom tables for consistency
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Update users table
        const { error: userTableError } = await supabase
          .from('users')
          .update({
            password_hash: hashedPassword,
            password_updated_at: new Date().toISOString(),
            requires_password_change: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', userIdToProcess);

        if (userTableError) {
          console.error('Failed to update users table:', userTableError);
          // Don't throw - the main password update in Supabase Auth succeeded
        }

        // Sign out after password reset (Supabase best practice)
        await supabase.auth.signOut();
        
      } else {
        // Fallback: Update password directly in database (legacy approach)
        console.log('Updating password via legacy method...');
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Update users table
        const { error: userUpdateError } = await supabase
          .from('users')
          .update({
            password_hash: hashedPassword,
            password_updated_at: new Date().toISOString(),
            requires_password_change: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', userIdToProcess);

        if (userUpdateError) {
          throw new Error(`Failed to update password: ${userUpdateError.message}`);
        }

        // Also update admin_users table if this is an admin user
        if (userTypeToProcess === 'admin' || userTypeToProcess === 'system') {
          const { error: updateError } = await supabase
            .from('admin_users')
            .update({ 
              password_hash: hashedPassword,
              updated_at: new Date().toISOString()
            })
            .eq('id', userIdToProcess);

          if (updateError) {
            console.error('Failed to update admin_users table:', updateError);
            // Don't throw - the main password update succeeded
          }
        }

        // Mark legacy token as used
        if (legacyTokenData && legacyTokenData.id) {
          const { error: tokenError } = await supabase
            .from('password_reset_tokens')
            .update({ 
              used: true, 
              used_at: new Date().toISOString() 
            })
            .eq('id', legacyTokenData.id);

          if (tokenError) {
            console.error('Failed to mark token as used:', tokenError);
          }
        }
      }
      
      console.log('Password updated successfully');
      setSuccess(true);
    } catch (err) {
      console.error('Password update error:', err);
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (checkingToken) {
    return (
      <div className="min-h-screen relative flex items-center justify-center">
        {/* Background Image */}
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
        
        <div className="text-center relative z-10">
          <Loader2 className="h-8 w-8 animate-spin text-[#8CC63F] mx-auto" />
          <p className="mt-2 text-sm text-gray-300">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen relative flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        {/* Background Image */}
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
          </div>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
          <div className="bg-gray-900/50 backdrop-blur-md py-8 px-4 shadow-2xl sm:rounded-xl sm:px-10 border border-gray-700/50">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100/20 backdrop-blur">
                <AlertCircle className="h-6 w-6 text-red-400" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-white">
                Invalid Reset Link
              </h2>
              <p className="mt-2 text-sm text-gray-300">
                {error || 'This password reset link is invalid or has expired.'}
              </p>
              
              <div className="mt-6 space-y-3">
                <Button
                  onClick={() => navigate('/forgot-password')}
                  className="w-full justify-center bg-[#8CC63F] hover:bg-[#7AB635] text-white font-medium"
                >
                  Request New Link
                </Button>
                
                <Button
                  onClick={() => navigate('/signin')}
                  variant="outline"
                  className="w-full justify-center bg-gray-800/50 backdrop-blur border-gray-600 text-gray-300 hover:bg-gray-700/50"
                >
                  Back to Sign In
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen relative flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        {/* Background Image */}
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
          </div>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
          <div className="bg-gray-900/50 backdrop-blur-md py-8 px-4 shadow-2xl sm:rounded-xl sm:px-10 border border-gray-700/50">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100/20 backdrop-blur">
                <CheckCircle className="h-6 w-6 text-green-400" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-white">
                Password Reset Successful
              </h2>
              <p className="mt-2 text-sm text-gray-300">
                Your password has been successfully reset. You can now sign in with your new password.
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
        
        {/* Bottom text */}
        <p className="mt-8 text-center text-sm text-gray-400 relative z-10">
          Protected by industry-standard encryption
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Background Image - Same as signin page */}
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
            {isFirstLoginChange ? 'Change your password' : 'Reset your password'}
          </h2>
          <p className="mt-2 text-sm text-gray-300">
            {isFirstLoginChange 
              ? 'Please set a new password for your account' 
              : 'Enter your new password below'}
          </p>
        </div>

        {/* Form Container - Matching signin page style */}
        <div className="mt-8 bg-gray-900/50 backdrop-blur-md py-8 px-4 shadow-2xl sm:rounded-xl sm:px-10 border border-gray-700/50">
          {/* Error Message */}
          {error && (
            <div className="mb-4 bg-red-500/10 backdrop-blur text-red-400 p-4 rounded-lg flex items-start border border-red-500/20">
              <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* New Password Field */}
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
              
              {/* Password Strength Indicator */}
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

            {/* Confirm Password Field */}
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

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full justify-center bg-[#8CC63F] hover:bg-[#7AB635] text-white font-medium"
              disabled={loading || !password || !confirmPassword || passwordStrength.score < 3}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Resetting password...
                </>
              ) : (
                'Reset Password'
              )}
            </Button>
          </form>

          {/* Divider and Back to Sign In */}
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
        
        {/* Bottom text */}
        <p className="mt-8 text-center text-sm text-gray-400">
          Protected by industry-standard encryption
        </p>
      </div>
    </div>
  );
}