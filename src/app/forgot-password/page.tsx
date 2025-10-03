// /home/project/src/app/forgot-password/page.tsx
// Fixed version with correct redirect URL for Supabase

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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

      // CRITICAL FIX: Use the EXACT redirect URL that's configured in Supabase
      // This MUST match one of your allowed redirect URLs exactly
      const resetRedirectUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/reset-password`
        : 'https://ggknowledge.com/reset-password';
      
      console.log('Sending reset email with redirect URL:', resetRedirectUrl);
      
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.toLowerCase(),
        {
          redirectTo: resetRedirectUrl  // This must match exactly what's in Supabase redirect URLs
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
            method: resetError ? 'legacy' : 'supabase_auth',
            redirect_url: resetRedirectUrl
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
    console.log('Legacy reset URL:', `${typeof window !== 'undefined' ? window.location.origin : 'https://ggknowledge.com'}/reset-password?token=${token}`);
    console.log('Send this to:', userEmail);
  };

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
                Check Your Email
              </h2>
              <p className="mt-2 text-sm text-gray-300">
                If an account exists with the email <strong className="text-white">{email}</strong>, we've sent password reset instructions to that address.
              </p>
              <p className="mt-3 text-xs text-gray-400">
                Please check your inbox and spam folder. The link will expire in 2 hours.
              </p>
              
              <div className="mt-6 space-y-3">
                <Button
                  onClick={() => {
                    setSuccess(false);
                    setEmail('');
                  }}
                  variant="outline"
                  className="w-full justify-center bg-gray-800/50 backdrop-blur border-gray-600 text-gray-300 hover:bg-gray-700/50"
                >
                  Send to Different Email
                </Button>
                
                <Button
                  onClick={() => navigate('/signin')}
                  className="w-full justify-center bg-[#8CC63F] hover:bg-[#7AB635] text-white font-medium"
                >
                  Back to Sign In
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
            Forgot your password?
          </h2>
          <p className="mt-2 text-sm text-gray-300">
            Enter your email address and we'll send you instructions to reset your password
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-[#8CC63F] focus:ring-[#8CC63F]"
                  placeholder="Enter your email address"
                  disabled={loading}
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </FormField>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full justify-center bg-[#8CC63F] hover:bg-[#7AB635] text-white font-medium"
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

          {/* Divider */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-900/50 text-gray-400">
                  Remember your password?
                </span>
              </div>
            </div>

            {/* Back to Sign In Button */}
            <div className="mt-6">
              <Button
                onClick={() => navigate('/signin')}
                variant="outline"
                className="w-full justify-center bg-gray-800/50 backdrop-blur border-gray-600 text-gray-300 hover:bg-gray-700/50"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Sign In
              </Button>
            </div>
          </div>

          {/* Additional Links Section */}
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
                to="/"
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-600 rounded-lg shadow-sm bg-gray-800/50 backdrop-blur text-sm font-medium text-gray-300 hover:bg-gray-700/50 transition-colors"
              >
                Back to Home
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