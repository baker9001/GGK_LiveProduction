// /home/project/src/app/forgot-password/page.tsx
// Updated to use Supabase Auth for password reset email

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Mail, AlertCircle, CheckCircle, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/shared/Button';
import { FormField, Input } from '../../components/shared/FormField';
import { supabase } from '../../lib/supabase';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      // First, check if the user exists in your system
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, user_type')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (userError && userError.code !== 'PGRST116') {
        throw userError;
      }

      if (!userData) {
        // Don't reveal whether the email exists (security best practice)
        // But still show success message
        setSuccess(true);
        return;
      }

      // Use Supabase Auth to send password reset email
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.toLowerCase(),
        {
          redirectTo: `${window.location.origin}/reset-password`
        }
      );

      if (resetError) {
        console.error('Supabase reset error:', resetError);
        
        // If Supabase Auth fails, try legacy approach as fallback
        if (resetError.message.includes('not found') || resetError.message.includes('User not found')) {
          // User might not be in Supabase Auth yet, create a legacy token
          await createLegacyResetToken(userData.id, userData.user_type, email);
        } else {
          throw resetError;
        }
      }

      // Log the password reset request
      await supabase
        .from('audit_logs')
        .insert({
          user_id: userData.id,
          action: 'password_reset_requested',
          entity_type: 'user',
          entity_id: userData.id,
          details: {
            email: email.toLowerCase(),
            method: resetError ? 'legacy' : 'supabase_auth'
          },
          created_at: new Date().toISOString()
        });

      setSuccess(true);
    } catch (err) {
      console.error('Error sending reset email:', err);
      
      // Generic error message for security
      setError('Failed to send reset email. Please try again or contact support.');
    } finally {
      setLoading(false);
    }
  };

  // Fallback function for legacy reset token creation
  const createLegacyResetToken = async (userId: string, userType: string, userEmail: string) => {
    // Generate a secure token
    const token = crypto.randomUUID() + crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

    // Store the token in your custom table
    const { error: tokenError } = await supabase
      .from('password_reset_tokens')
      .insert({
        user_id: userId,
        user_type: userType,
        token: token,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
        used: false
      });

    if (tokenError) {
      throw tokenError;
    }

    // TODO: Send email manually with your email service
    // For now, log the reset URL
    console.log('Legacy reset URL:', `${window.location.origin}/reset-password?token=${token}`);
    console.log('Send this to:', userEmail);
    
    // In production, you would send an actual email here
    // Example with a hypothetical email service:
    // await sendEmail({
    //   to: userEmail,
    //   subject: 'Reset Your Password',
    //   template: 'password-reset',
    //   data: {
    //     resetUrl: `${window.location.origin}/reset-password?token=${token}`,
    //     expiresIn: '2 hours'
    //   }
    // });
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
                Check Your Email
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                If an account exists with the email <strong>{email}</strong>, we've sent password reset instructions to that address.
              </p>
              <p className="mt-3 text-xs text-gray-500 dark:text-gray-500">
                Please check your inbox and spam folder. The link will expire in 2 hours.
              </p>
              
              <div className="mt-6 space-y-3">
                <Button
                  onClick={() => {
                    setSuccess(false);
                    setEmail('');
                  }}
                  variant="outline"
                  className="w-full justify-center"
                >
                  Send to Different Email
                </Button>
                
                <Button
                  onClick={() => navigate('/signin')}
                  className="w-full justify-center"
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
          Enter your email address and we'll send you instructions to reset your password.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow-md dark:shadow-gray-900/20 sm:rounded-lg sm:px-10 border border-gray-200 dark:border-gray-700">
          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded-md flex items-start border border-red-200 dark:border-red-800">
              <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <FormField
              id="email"
              label="Email Address"
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
                  placeholder="Enter your email address"
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
                  Sending reset email...
                </>
              ) : (
                'Send Reset Email'
              )}
            </Button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">
                  Remember your password?
                </span>
              </div>
            </div>

            <div className="mt-6">
              <Button
                onClick={() => navigate('/signin')}
                variant="outline"
                className="w-full justify-center"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Sign In
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}