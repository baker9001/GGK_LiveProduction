// File: /src/app/signin/page.tsx
// Purpose: Fixed sign-in page with proper authentication flow
// This replaces the existing signin page entirely

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { GraduationCap, AlertCircle, CheckCircle, Loader2, ArrowLeft } from 'lucide-react';
import { setAuthenticatedUser, type User, type UserRole, isInTestMode, exitTestMode } from '../../lib/auth';
import { Button } from '../../components/shared/Button';
import { FormField, Input } from '../../components/shared/FormField';
import { supabase } from '../../lib/supabase';
import bcrypt from 'bcryptjs';

interface LoginFormData {
  email: string;
  password: string;
}

export default function SignInPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const from = location.state?.from?.pathname || '/app/system-admin/dashboard';

  useEffect(() => {
    if (isInTestMode()) {
      console.warn('Test mode was active on signin page - clearing for security');
      exitTestMode();
      setError('Test mode has been terminated for security. Please sign in again.');
      setTimeout(() => setError(null), 5000);
    }
    
    const authUser = localStorage.getItem('ggk_authenticated_user');
    if (!authUser) {
      localStorage.removeItem('test_mode_user');
      sessionStorage.clear();
    }
  }, []);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);

    if (isInTestMode()) {
      exitTestMode();
    }

    const emailInput = document.getElementById('email') as HTMLInputElement;
    const passwordInput = document.getElementById('password') as HTMLInputElement;
    
    const data: LoginFormData = {
      email: emailInput?.value || '',
      password: passwordInput?.value || '',
    };

    if (!data.email || !data.password) {
      setError('Please enter both email and password');
      setLoading(false);
      return;
    }

    try {
      const normalizedEmail = data.email.trim().toLowerCase();

      // Step 1: Query admin user with role information
      const { data: adminUser, error: queryError } = await supabase
        .from('admin_users')
        .select(`
          id,
          name,
          email,
          password_hash,
          status,
          email_verified,
          roles (name)
        `)
        .eq('email', normalizedEmail)
        .eq('status', 'active')
        .maybeSingle();

      if (queryError) {
        throw new Error('Failed to check credentials');
      }

      if (!adminUser) {
        throw new Error('Invalid credentials');
      }

      // Step 2: Verify password against admin_users table
      const isValidPassword = await bcrypt.compare(data.password, adminUser.password_hash);
      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }

      console.log('Admin credentials verified, handling authentication...');

      // Step 3: Ensure user exists in centralized users table
      const { data: centralUser } = await supabase
        .from('users')
        .select('id, email_verified')
        .eq('id', adminUser.id)
        .maybeSingle();

      if (!centralUser) {
        // Create entry in users table if missing
        await supabase
          .from('users')
          .insert({
            id: adminUser.id,
            email: normalizedEmail,
            user_type: 'system',
            email_verified: adminUser.email_verified || false,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      }

      // Step 4: Handle Supabase Auth - Try signing in ONLY (no signup)
      let supabaseSession = null;
      
      try {
        // Try to sign in with Supabase Auth
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password: data.password // Use the actual password first
        });

        if (!signInError && signInData?.session) {
          console.log('Successfully signed in with Supabase Auth');
          supabaseSession = signInData.session;
        } else {
          // If direct password fails, Supabase user might not exist or have different password
          // We'll create/update them in Supabase Auth
          console.log('Direct Supabase sign-in failed, syncing auth...');
          
          // First, try to sign out any existing session
          await supabase.auth.signOut();
          
          // Use admin API to upsert the user in Supabase Auth
          // This requires server-side API call
          const response = await fetch('/api/auth/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: adminUser.id,
              email: normalizedEmail,
              password: data.password,
              name: adminUser.name
            })
          });

          if (response.ok) {
            // Try signing in again
            const { data: retrySignIn } = await supabase.auth.signInWithPassword({
              email: normalizedEmail,
              password: data.password
            });
            
            if (retrySignIn?.session) {
              supabaseSession = retrySignIn.session;
            }
          }
        }
      } catch (authError) {
        console.error('Supabase Auth error:', authError);
        // Continue without Supabase session - app will work with limited functionality
      }

      // Step 5: Map role to UserRole type
      const roleMapping: Record<string, UserRole> = {
        'Super Admin': 'SSA',
        'Support Admin': 'SUPPORT',
        'Viewer': 'VIEWER'
      };

      const userRole = roleMapping[adminUser.roles?.name] || 'VIEWER';

      // Step 6: Create authenticated user object
      const authenticatedUser: User = {
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email,
        role: userRole
      };

      // Step 7: Set authentication
      setAuthenticatedUser(authenticatedUser);
      setSuccess(true);

      if (!supabaseSession) {
        console.warn('⚠️ No Supabase session - some features may be limited');
      } else {
        console.log('✅ Full authentication successful');
      }

      // Redirect after brief delay
      setTimeout(() => {
        navigate(from, { replace: true });
      }, 500);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDevLogin = async () => {
    setLoading(true);
    setError(null);

    if (isInTestMode()) {
      exitTestMode();
    }

    try {
      const devEmail = 'bakir.alramadi@gmail.com';
      const devPassword = 'dev_password';
      
      // Check if dev user exists
      const { data: user } = await supabase
        .from('admin_users')
        .select(`
          id,
          name,
          email,
          password_hash,
          status,
          roles (name)
        `)
        .eq('email', devEmail)
        .maybeSingle();

      if (!user) {
        // Create dev user
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(devPassword, salt);

        const { data: ssaRole } = await supabase
          .from('roles')
          .select('id')
          .eq('name', 'Super Admin')
          .single();

        if (!ssaRole) {
          throw new Error('SSA role not found');
        }

        const { data: newUser, error: insertError } = await supabase
          .from('admin_users')
          .insert([{
            name: 'Baker R.',
            email: devEmail,
            password_hash: hashedPassword,
            role_id: ssaRole.id,
            status: 'active',
            email_verified: false
          }])
          .select(`
            id,
            name,
            email,
            roles (name)
          `)
          .single();

        if (insertError) throw insertError;

        // Also create in users table
        await supabase
          .from('users')
          .insert({
            id: newUser.id,
            email: devEmail,
            user_type: 'system',
            email_verified: false,
            is_active: true
          });

        const authenticatedUser: User = {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: 'SSA'
        };

        setAuthenticatedUser(authenticatedUser);
      } else {
        // Verify password
        const isValid = await bcrypt.compare(devPassword, user.password_hash);
        if (!isValid) {
          // Update password
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(devPassword, salt);
          
          await supabase
            .from('admin_users')
            .update({ password_hash: hashedPassword })
            .eq('id', user.id);
        }

        const roleMapping: Record<string, UserRole> = {
          'Super Admin': 'SSA',
          'Support Admin': 'SUPPORT',
          'Viewer': 'VIEWER'
        };

        const authenticatedUser: User = {
          id: user.id,
          name: user.name,
          email: user.email,
          role: roleMapping[user.roles?.name] || 'SSA'
        };

        setAuthenticatedUser(authenticatedUser);
      }

      setSuccess(true);
      setTimeout(() => {
        navigate(from, { replace: true });
      }, 500);

    } catch (err) {
      setError('Failed to create/login dev account');
      console.error('Dev login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="flex justify-center items-center">
          <GraduationCap className="h-12 w-12 text-[#8CC63F]" />
          <span className="ml-2 text-3xl font-bold text-gray-900 dark:text-white">GGK</span>
        </Link>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          Sign in to your account
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow-md dark:shadow-gray-900/20 sm:rounded-lg sm:px-10 border border-gray-200 dark:border-gray-700">
          {error && (
            <div className="mb-4 p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <div className="flex">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <div className="ml-3">
                  <p className="text-sm text-green-700 dark:text-green-400">
                    Login successful! Redirecting...
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-6">
            <FormField id="email" label="Email address" required>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="Enter your email"
              />
            </FormField>

            <FormField id="password" label="Password" required>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="Enter your password"
              />
            </FormField>

            <div className="flex items-center justify-between">
              <Link
                to="/forgot-password"
                className="text-sm text-[#8CC63F] hover:text-[#7AB62F]"
              >
                Forgot your password?
              </Link>
            </div>

            <Button
              type="button"
              variant="primary"
              className="w-full"
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </div>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">Or</span>
              </div>
            </div>

            <div className="mt-6">
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={handleDevLogin}
                disabled={loading}
              >
                Dev Quick Login (Baker)
              </Button>
            </div>
            
            <p className="mt-4 text-xs text-center text-gray-500 dark:text-gray-400">
              Development quick access for testing purposes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}