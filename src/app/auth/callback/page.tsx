/**
 * File: /src/app/auth/callback/page.tsx
 * Purpose: Handle email verification callbacks from Supabase
 * 
 * This page processes:
 * - Email confirmation links
 * - Password reset links
 * - Magic link logins
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { toast } from '@/components/shared/Toast';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing verification...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the hash parameters from the URL
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const error = hashParams.get('error');
        const errorDescription = hashParams.get('error_description');
        
        if (error) {
          console.error('Auth callback error:', error, errorDescription);
          setStatus('error');
          setMessage(errorDescription || 'Verification failed');
          toast.error('Verification failed. Please try again.');
          
          // Redirect to signin after delay
          setTimeout(() => navigate('/signin'), 3000);
          return;
        }

        // Exchange the code for a session
        const { data, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          setStatus('error');
          setMessage('Failed to verify email');
          toast.error('Verification failed. Please try again.');
          setTimeout(() => navigate('/signin'), 3000);
          return;
        }

        if (data.session) {
          // Email verified successfully
          setStatus('success');
          setMessage('Email verified successfully! Redirecting...');
          
          // Update the users table to mark email as verified
          await supabase
            .from('users')
            .update({ 
              email_verified: true,
              verified_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', data.session.user.id);
          
          toast.success('Email verified! Please sign in to continue.');
          
          // Sign out to ensure clean login
          await supabase.auth.signOut();
          
          // Redirect to signin
          setTimeout(() => navigate('/signin'), 2000);
        } else {
          // No session found
          setStatus('error');
          setMessage('Verification link may have expired');
          toast.error('Verification link expired. Please request a new one.');
          setTimeout(() => navigate('/signin'), 3000);
        }
      } catch (error) {
        console.error('Callback error:', error);
        setStatus('error');
        setMessage('An unexpected error occurred');
        toast.error('Verification failed. Please contact support.');
        setTimeout(() => navigate('/signin'), 3000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-md w-full mx-auto p-6">
        <div className="bg-white/10 backdrop-blur-md rounded-lg shadow-xl p-8 text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-[#8CC63F] mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">Verifying Email</h2>
              <p className="text-gray-300">{message}</p>
            </>
          )}
          
          {status === 'success' && (
            <>
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">Success!</h2>
              <p className="text-gray-300">{message}</p>
            </>
          )}
          
          {status === 'error' && (
            <>
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">Verification Failed</h2>
              <p className="text-gray-300">{message}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}