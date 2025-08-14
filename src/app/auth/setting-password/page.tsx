// /src/app/auth/setting-password/page.tsx
// Password setting page for email verification flow

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from '../../../components/shared/Toast';
import bcrypt from 'bcryptjs';

export default function SettingPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState('');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    // Verify the token/session
    verifyAccess();
  }, []);

  const verifyAccess = async () => {
    try {
      // Check if we have a valid session from the email link
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        setError('Invalid or expired link. Please request a new verification email.');
        setVerifying(false);
        return;
      }

      setUserEmail(session.user.email || '');
      setVerifying(false);
    } catch (err) {
      console.error('Verification error:', err);
      setError('Unable to verify your access. Please try again.');
      setVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      // Update password in Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        throw updateError;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Update email_verified status in users table
        await supabase
          .from('users')
          .update({ 
            email_verified: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        // Update password hash in admin_users table if system user
        const { data: userData } = await supabase
          .from('users')
          .select('user_type')
          .eq('id', user.id)
          .single();

        if (userData?.user_type === 'system') {
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(password, salt);
          
          await supabase
            .from('admin_users')
            .update({ password_hash: hashedPassword })
            .eq('id', user.id);
        }
      }

      toast.success('Password set successfully! Redirecting to login...');
      
      // Sign out and redirect to login
      await supabase.auth.signOut();
      
      setTimeout(() => {
        navigate('/signin');
      }, 2000);
      
    } catch (err: any) {
      console.error('Password setting error:', err);
      setError(err.message || 'Failed to set password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Verifying your access...</span>
        </div>
      </div>
    );
  }

  if (error && !userEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">
              Access Error
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <button
              onClick={() => navigate('/signin')}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Go to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Set Your Password
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            {userEmail ? `Setting password for ${userEmail}` : 'Create a secure password for your account'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-md">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter your password (min 8 characters)"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Confirm your password"
                  required
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Setting Password...
                </>
              ) : (
                'Set Password & Verify Account'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <a
              href="/signin"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Back to Sign In
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}