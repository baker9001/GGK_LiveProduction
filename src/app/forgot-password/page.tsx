// /home/project/src/app/reset-password/page.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { 
  GraduationCap, 
  Lock, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Eye, 
  EyeOff,
  ChevronLeft,
  ShieldCheck
} from 'lucide-react';
import { Button } from '../../components/shared/Button';
import { FormField, Input } from '../../components/shared/FormField';
import { supabase } from '../../lib/supabase';
import bcrypt from 'bcryptjs/dist/bcrypt.min';

interface PasswordStrength {
  score: number;
  feedback: string[];
}

function calculatePasswordStrength(password: string): PasswordStrength {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) score += 1;
  else feedback.push('8+ characters');

  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('uppercase');

  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('lowercase');

  if (/[0-9]/.test(password)) score += 1;
  else feedback.push('number');

  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  else feedback.push('special character');

  return { score, feedback };
}

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [checkingToken, setCheckingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenData, setTokenData] = useState<any>(null);
  
  const passwordStrength = calculatePasswordStrength(password);

  useEffect(() => {
    if (token) {
      checkResetToken();
    } else {
      setError('No reset token provided');
      setCheckingToken(false);
    }
  }, [token]);

  const checkResetToken = async () => {
    try {
      // Validate token
      const { data, error } = await supabase
        .from('password_reset_tokens')
        .select('*')
        .eq('token', token)
        .eq('used', false)
        .gte('expires_at', new Date().toISOString())
        .single();

      if (error || !data) {
        setError('Invalid or expired reset link. Please request a new one.');
        setTokenValid(false);
      } else {
        setTokenData(data);
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
      // Hash the new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Update password based on user type
      if (tokenData.user_type === 'admin') {
        const { error: updateError } = await supabase
          .from('admin_users')
          .update({ password_hash: hashedPassword })
          .eq('id', tokenData.user_id);

        if (updateError) throw updateError;
      } else {
        // For regular users, you'd need to update the users table
        const { error: updateError } = await supabase
          .from('users')
          .update({ password_hash: hashedPassword })
          .eq('id', tokenData.user_id);

        if (updateError) throw updateError;
      }

      // Mark token as used
      const { error: tokenError } = await supabase
        .from('password_reset_tokens')
        .update({ 
          used: true, 
          used_at: new Date().toISOString() 
        })
        .eq('id', tokenData.id);

      if (tokenError) {
        console.error('Failed to mark token as used:', tokenError);
      }
      
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (checkingToken) {
    return (
      <div className="min-h-screen relative flex items-center justify-center">
        {/* Background */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80"
            alt="Students in classroom"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900/90 via-gray-900/80 to-gray-900/90" />
        </div>
        
        <div className="relative z-10 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#8CC63F] mx-auto" />
          <p className="mt-2 text-sm text-gray-300">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  // Invalid token state
  if (!tokenValid) {
    return (
      <div className="min-h-screen relative flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        {/* Background */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80"
            alt="Students in classroom"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900/90 via-gray-900/80 to-gray-900/90" />
        </div>

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

          <div className="mt-8 bg-gray-900/50 backdrop-blur-md py-8 px-4 shadow-2xl sm:rounded-xl sm:px-10 border border-gray-700/50">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 backdrop-blur">
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
                  className="w-full justify-center bg-gray-800/50 border-gray-600 text-gray-300 hover:bg-gray-700/50"
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

  // Success state
  if (success) {
    return (
      <div className="min-h-screen relative flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        {/* Background */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80"
            alt="Students in classroom"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900/90 via-gray-900/80 to-gray-900/90" />
        </div>

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

          <div className="mt-8 bg-gray-900/50 backdrop-blur-md py-8 px-4 shadow-2xl sm:rounded-xl sm:px-10 border border-gray-700/50">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10 backdrop-blur">
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
      </div>
    );
  }

  // Reset form
  return (
    <div className="min-h-screen relative flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80"
          alt="Students in classroom"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/90 via-gray-900/80 to-gray-900/90" />
      </div>

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
            Reset your password
          </h2>
          <p className="mt-2 text-sm text-gray-300">
            Enter your new password below
          </p>
        </div>

        <div className="mt-8 bg-gray-900/50 backdrop-blur-md py-8 px-4 shadow-2xl sm:rounded-xl sm:px-10 border border-gray-700/50">
          {/* Back to Sign In */}
          <Link
            to="/signin"
            className="inline-flex items-center text-sm text-gray-400 hover:text-[#8CC63F] transition-colors mb-6 group"
          >
            <ChevronLeft className="h-4 w-4 mr-1 transition-transform group-hover:-translate-x-1" />
            Back to sign in
          </Link>

          {/* Error Alert */}
          {error && (
            <div className="mb-4 bg-red-500/10 backdrop-blur text-red-400 p-4 rounded-lg flex items-start border border-red-500/20">
              <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* New Password */}
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
                        className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                          i < passwordStrength.score
                            ? passwordStrength.score <= 2
                              ? 'bg-red-500'
                              : passwordStrength.score <= 3
                              ? 'bg-amber-500'
                              : 'bg-green-500'
                            : 'bg-gray-600'
                        }`}
                      />
                    ))}
                  </div>
                  {passwordStrength.feedback.length > 0 && (
                    <p className="text-xs text-gray-400">
                      Need: {passwordStrength.feedback.join(', ')}
                    </p>
                  )}
                </div>
              )}
            </FormField>

            {/* Confirm Password */}
            <FormField
              id="confirmPassword"
              label="Confirm New Password"
              required
              labelClassName="text-gray-200"
            >
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <ShieldCheck className="h-5 w-5 text-gray-400" />
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
                  Resetting password...
                </>
              ) : (
                'Reset Password'
              )}
            </Button>
          </form>

          {/* Help Text */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-400">
              Password must be at least 8 characters with mixed case, numbers and symbols
            </p>
          </div>
        </div>

        {/* Bottom Security Text */}
        <p className="mt-8 text-center text-sm text-gray-400">
          Protected by industry-standard encryption
        </p>
      </div>
    </div>
  );
}