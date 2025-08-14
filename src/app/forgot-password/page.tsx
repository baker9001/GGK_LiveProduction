// /home/project/src/app/forgot-password/page.tsx

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, Mail, ArrowLeft, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '../../components/shared/Button';
import { FormField, Input } from '../../components/shared/FormField';
import { supabase } from '../../lib/supabase';

// Generate secure random token
function generateResetToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!email) {
        throw new Error('Please enter your email address');
      }

      // Check if user exists in admin_users first
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('id, email, status')
        .eq('email', email.toLowerCase())
        .single();

      let userId: string | null = null;
      let userType: 'admin' | 'user' = 'user';

      if (adminUser && adminUser.status === 'active') {
        userId = adminUser.id;
        userType = 'admin';
      } else {
        // Check in users table
        const { data: regularUser } = await supabase
          .from('users')
          .select('id, email, is_active')
          .eq('email', email.toLowerCase())
          .single();

        if (regularUser && regularUser.is_active) {
          userId = regularUser.id;
          userType = 'user';
        }
      }

      if (!userId) {
        // Don't reveal if email exists or not for security
        setSuccess(true);
        return;
      }

      // Generate reset token
      const token = generateResetToken();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry

      // Store token in database
      const { error: tokenError } = await supabase
        .from('password_reset_tokens')
        .insert({
          user_id: userId,
          user_type: userType,
          token: token,
          expires_at: expiresAt.toISOString()
        });

      if (tokenError) {
        console.error('Token storage error:', tokenError);
        throw new Error('Failed to process password reset request');
      }

      // In a real application, you would send an email here
      // For development, we'll show the reset link
      if (process.env.NODE_ENV === 'development') {
        console.log('Password reset link:', `${window.location.origin}/reset-password?token=${token}`);
      }

      setSuccess(true);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process request');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <div className="flex items-center">
              <GraduationCap className="h-12 w-12 text-[#8CC63F]" />
              <span className="ml-2 text-3xl font-bold text-gray-900 dark:text-white">GGK</span>
            </div>
          </div>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow-md dark:shadow-gray-900/20 sm:rounded-lg sm:px-10 border border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                Check your email
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                If an account exists for
              </p>
              <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                {email}
              </p>
              <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                You will receive password reset instructions.
              </p>
              
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-4">
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">
                    <strong>Dev Mode:</strong> Check console for reset link
                  </p>
                </div>
              )}
              
              <div className="mt-6 space-y-3">
                <Button
                  onClick={() => navigate('/signin')}
                  className="w-full justify-center"
                >
                  Back to Sign In
                </Button>
                
                <button
                  onClick={() => {
                    setSuccess(false);
                    setEmail('');
                  }}
                  className="text-sm text-[#8CC63F] hover:text-[#5da82f] font-medium"
                >
                  Try a different email
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="flex items-center">
            <GraduationCap className="h-12 w-12 text-[#8CC63F]" />
            <span className="ml-2 text-3xl font-bold text-gray-900 dark:text-white">GGK</span>
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          Forgot your password?
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          Enter your email and we'll help you reset it
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow-md dark:shadow-gray-900/20 sm:rounded-lg sm:px-10 border border-gray-200 dark:border-gray-700">
          <Link
            to="/signin"
            className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-[#8CC63F] dark:hover:text-[#8CC63F] transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to sign in
          </Link>

          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded-md flex items-start border border-red-200 dark:border-red-800">
              <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  placeholder="Enter your email"
                  disabled={loading}
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </FormField>

            <Button
              type="submit"
              className="w-full justify-center"
              disabled={loading || !email}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Sending reset link...
                </>
              ) : (
                'Send reset link'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Remember your password?{' '}
              <Link to="/signin" className="font-medium text-[#8CC63F] hover:text-[#5da82f]">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Single default export - matching project pattern
export default ForgotPasswordPage;