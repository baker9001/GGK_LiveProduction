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
import { Loader2, CheckCircle, XCircle, Mail } from 'lucide-react';
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
        
        const userMetadata = user.user_metadata || {};

        // Check if this is an invitation acceptance
        if (userMetadata.invitation_type === 'admin_creation') {
          await handleInvitationAcceptance(user, userMetadata);
        } else {
          // Regular auth callback - redirect to dashboard
          setStatus('success');
          setMessage('Authentication successful! Redirecting...');
          setTimeout(() => {
            router.push('/app/dashboard');
          }, 2000);
        }
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
          setTimeout(() => navigate('/dashboard'), 2000);
        } else {
          setStatus('error');
          setMessage('No session found');
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

    const handleInvitationAcceptance = async (user: any, metadata: any) => {
      try {
        // Check if user profile already exists
        const { data: existingUser } = await supabase
          .from('users')
          .select('id, auth_user_id')
          .eq('auth_user_id', user.id)
          .single();

        if (existingUser) {
          // User profile already exists, just activate it
          await supabase
            .from('users')
            .update({
              is_active: true,
              email_verified: true,
              verified_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('auth_user_id', user.id);

          await supabase
            .from('entity_users')
            .update({
              is_active: true,
              updated_at: new Date().toISOString()
            })
            .eq('auth_user_id', user.id);

          setStatus('success');
          setMessage('Account activated successfully! Redirecting to dashboard...');
          setTimeout(() => {
            router.push('/app/dashboard');
          }, 2000);
          return;
        }

        // Create user profile from invitation metadata
        const userData = {
          id: user.id,
          email: user.email?.toLowerCase().trim(),
          user_type: 'entity',
          user_types: ['entity', 'admin'],
          primary_type: 'entity',
          is_active: true,
          email_verified: true,
          verified_at: new Date().toISOString(),
          auth_user_id: user.id,
          auth_invitation_accepted_at: new Date().toISOString(),
          raw_user_meta_data: metadata,
          raw_app_meta_data: user.app_metadata || {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { data: newUser, error: userError } = await supabase
          .from('users')
          .insert([userData])
          .select('id')
          .single();

        if (userError) {
          throw new Error(`Failed to create user profile: ${userError.message}`);
        }

        // Create entity_users record
        const entityUserData = {
          user_id: newUser.id,
          company_id: metadata.company_id,
          email: user.email?.toLowerCase().trim(),
          name: metadata.name,
          phone: metadata.phone || null,
          admin_level: metadata.admin_level,
          permissions: {}, // Will be set by default permissions
          is_active: true,
          created_by: metadata.created_by,
          parent_admin_id: metadata.parent_admin_id || null,
          auth_user_id: user.id,
          metadata: {
            created_via: 'invitation_acceptance',
            invitation_accepted_at: new Date().toISOString(),
            original_invitation_sent_at: metadata.invitation_sent_at
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { error: entityError } = await supabase
          .from('entity_users')
          .insert([entityUserData]);

        if (entityError) {
          // Rollback user creation
          await supabase.from('users').delete().eq('id', newUser.id);
          throw new Error(`Failed to create admin profile: ${entityError.message}`);
        }

        // Create scope assignments if provided
        if (metadata.assigned_schools && metadata.assigned_schools.length > 0) {
          const schoolScopes = metadata.assigned_schools.map((schoolId: string) => ({
            company_id: metadata.company_id,
            user_id: newUser.id,
            scope_type: 'school',
            scope_id: schoolId,
            permissions: {},
            can_view_all: true,
            assigned_by: metadata.created_by,
            is_active: true
          }));

          await supabase.from('entity_admin_scope').insert(schoolScopes);
        }

        if (metadata.assigned_branches && metadata.assigned_branches.length > 0) {
          const branchScopes = metadata.assigned_branches.map((branchId: string) => ({
            company_id: metadata.company_id,
            user_id: newUser.id,
            scope_type: 'branch',
            scope_id: branchId,
            permissions: {},
            can_view_all: true,
            assigned_by: metadata.created_by,
            is_active: true
          }));

          await supabase.from('entity_admin_scope').insert(branchScopes);
        }

        setStatus('success');
        setMessage('Account created successfully! Redirecting to dashboard...');
        setTimeout(() => {
          router.push('/app/dashboard');
        }, 2000);

      } catch (error: any) {
        console.error('Invitation acceptance error:', error);
        setStatus('error');
        setMessage(error.message || 'Failed to complete account setup');
      }
    };

    handleCallback();
  }, [navigate]);

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-8 h-8 text-green-600" />;
      case 'error':
        return <XCircle className="w-8 h-8 text-red-600" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'loading':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              {getStatusIcon()}
            </div>
            
            <h2 className={`text-2xl font-bold mb-4 ${getStatusColor()}`}>
              {status === 'loading' && 'Processing Authentication...'}
              {status === 'success' && 'Welcome to GGK Admin!'}
              {status === 'error' && 'Authentication Failed'}
            </h2>
            
            <p className="text-gray-600 mb-6">
              {message}
            </p>
            
            {status === 'loading' && (
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                <Mail className="w-4 h-4" />
                <span>Verifying your invitation...</span>
              </div>
            )}
            
            {status === 'error' && (
              <div className="mt-6">
                <button
                  onClick={() => router.push('/signin')}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Return to Sign In
                </button>
              </div>
            )}
          </div>
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