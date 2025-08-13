// /src/app/signin/page.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { GraduationCap, AlertCircle, CheckCircle as CircleCheck, Loader2, ArrowLeft } from 'lucide-react';
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

  // Default redirect to dashboard
  const from = location.state?.from?.pathname || '/app/system-admin/dashboard';

  // CRITICAL: Clear test mode when signin page loads
  useEffect(() => {
    if (isInTestMode()) {
      console.warn('Test mode was active on signin page - clearing for security');
      exitTestMode();
      
      // Show a brief notification
      setError('Test mode has been terminated for security. Please sign in again.');
      setTimeout(() => setError(null), 5000);
    }
    
    // Also clear any stale authentication
    const authUser = localStorage.getItem('ggk_authenticated_user');
    if (!authUser) {
      // No authenticated user, clear everything
      localStorage.removeItem('test_mode_user');
      sessionStorage.clear();
    }
  }, []);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Clear any existing test mode before login
    if (isInTestMode()) {
      exitTestMode();
    }

    const formData = new FormData(e.currentTarget);
    const data: LoginFormData = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    };

    try {
      // Step 1: Query admin user with role information
      const { data: user, error: queryError } = await supabase
        .from('admin_users')
        .select(`
          id,
          name,
          email,
          password_hash,
          status,
          roles (name)
        `)
        .eq('email', data.email)
        .eq('status', 'active')
        .maybeSingle();

      if (queryError) {
        throw new Error('Failed to check credentials');
      }

      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Step 2: Compare password with hashed password
      const isValidPassword = await bcrypt.compare(data.password, user.password_hash);
      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }

      // Step 3: Create or sign in with Supabase Auth
      // First, try to sign in
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password
      });

      if (signInError) {
        console.log('Supabase sign-in failed, attempting to create user:', signInError.message);
        
        // If sign-in fails, try to create the user in Supabase Auth
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            emailRedirectTo: window.location.origin + '/auth/callback',
            data: {
              name: user.name,
              user_type: 'system',
              role: user.roles?.name || 'Viewer'
            }
          }
        });

        if (signUpError) {
          console.error('Failed to create Supabase auth user:', signUpError);
          // Continue anyway - the custom auth will work for UI
          // but API calls might fail
        } else {
          console.log('Created new Supabase auth user');
          
          // Now try to sign in again
          const { data: retryAuthData, error: retryError } = await supabase.auth.signInWithPassword({
            email: data.email,
            password: data.password
          });

          if (retryError) {
            console.error('Still failed to sign in after creating user:', retryError);
          } else {
            console.log('Successfully signed in with Supabase after creating user');
          }
        }
      } else {
        console.log('Successfully signed in with Supabase');
      }

      // Step 4: Map role name to UserRole type
      const roleMapping: Record<string, UserRole> = {
        'Super Admin': 'SSA',
        'Support Admin': 'SUPPORT',
        'Viewer': 'VIEWER'
      };

      const userRole = roleMapping[user.roles?.name] || 'VIEWER';

      // Step 5: Create user object for custom auth
      const authenticatedUser: User = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: userRole
      };

      // Step 6: Set custom authentication state
      setAuthenticatedUser(authenticatedUser);
      setSuccess(true);

      // Step 7: Verify Supabase session was created
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log('Supabase session created successfully');
      } else {
        console.warn('Warning: No Supabase session created. API calls may fail.');
      }

      // Redirect after a brief delay to show success state
      setTimeout(() => {
        navigate(from, { replace: true });
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  const handleDevLogin = async () => {
    setLoading(true);
    setError(null);

    // Clear any existing test mode before dev login
    if (isInTestMode()) {
      exitTestMode();
    }

    try {
      // Check if dev user exists
      const { data: user, error: queryError } = await supabase
        .from('admin_users')
        .select(`
          id,
          name,
          email,
          password_hash,
          status,
          roles (name)
        `)
        .eq('email', 'bakir.alramadi@gmail.com')
        .maybeSingle();

      if (queryError) {
        throw new Error('Failed to check dev user');
      }

      const devPassword = 'dev_password'; // Default dev password

      if (!user) {
        // Create dev admin user if it doesn't exist
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(devPassword, salt);

        // Get SSA role ID
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
            email: 'bakir.alramadi@gmail.com',
            password_hash: hashedPassword,
            role_id: ssaRole.id,
            status: 'active'
          }])
          .select(`
            id,
            name,
            email,
            roles (name)
          `)
          .single();

        if (insertError) throw insertError;

        // Create Supabase auth user for dev
        await supabase.auth.signUp({
          email: 'bakir.alramadi@gmail.com',
          password: devPassword,
          options: {
            data: {
              name: 'Baker R.',
              user_type: 'system',
              role: 'Super Admin'
            }
          }
        });

        // Sign in with Supabase
        await supabase.auth.signInWithPassword({
          email: 'bakir.alramadi@gmail.com',
          password: devPassword
        });

        // Create user object for new user
        const authenticatedUser: User = {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: 'SSA'
        };

        setAuthenticatedUser(authenticatedUser);
      } else {
        // Sign in with Supabase for existing dev user
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: 'bakir.alramadi@gmail.com',
          password: devPassword
        });

        if (signInError) {
          console.log('Supabase sign-in failed for dev user, attempting to create:', signInError.message);
          
          // Try to create if doesn't exist
          await supabase.auth.signUp({
            email: 'bakir.alramadi@gmail.com',
            password: devPassword,
            options: {
              data: {
                name: user.name,
                user_type: 'system',
                role: user.roles?.name || 'Super Admin'
              }
            }
          });

          // Try signing in again
          await supabase.auth.signInWithPassword({
            email: 'bakir.alramadi@gmail.com',
            password: devPassword
          });
        }

        // Map role name to UserRole type
        const roleMapping: Record<string, UserRole> = {
          'Super Admin': 'SSA',
          'Support Admin': 'SUPPORT',
          'Viewer': 'VIEWER'
        };

        const userRole = roleMapping[user.roles?.name] || 'SSA';

        // Create user object for existing user
        const authenticatedUser: User = {
          id: user.id,
          name: user.name,
          email: user.email,
          role: userRole
        };

        setAuthenticatedUser(authenticatedUser);
      }

      // Verify Supabase session was created
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log('Dev user Supabase session created successfully');
      } else {
        console.warn('Warning: No Supabase session for dev user. API calls may fail.');
      }

      setSuccess(true);

      setTimeout(() => {
        navigate(from, { replace: true });
      }, 500);
    } catch (err) {
      setError('Failed to create dev account');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="flex items-center">
            <GraduationCap className="h-12 w-12 text-[#8CC63F]" />
            <span className="ml-2 text-3xl font-bold text-gray-900 dark:text-white">GGK</span>
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          System Administration
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          Access the GGK admin dashboard
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow-md dark:shadow-gray-900/20 sm:rounded-lg sm:px-10 border border-gray-200 dark:border-gray-700 transition-colors duration-200">
          <Link
            to="/"
            className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-[#8CC63F] dark:hover:text-[#8CC63F] transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to home
          </Link>

          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded-md flex items-center border border-red-200 dark:border-red-800">
              <AlertCircle className="h-5 w-5 mr-2" />
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 p-4 rounded-md flex items-center border border-green-200 dark:border-green-800">
              <CircleCheck className="h-5 w-5 mr-2" />
              Login successful! Redirecting...
            </div>
          )}

          <form className="space-y-6" onSubmit={handleLogin}>
            <FormField
              id="email"
              label="Email"
              required
            >
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="Enter your email"
                disabled={loading || success}
              />
            </FormField>

            <FormField
              id="password"
              label="Password"
              required
            >
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                disabled={loading || success}
              />
            </FormField>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-[#8CC63F] focus:ring-[#8CC63F] border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <Link to="/forgot-password" className="font-medium text-[#8CC63F] hover:text-[#5da82f]">
                  Forgot your password?
                </Link>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full justify-center"
              disabled={loading || success}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  Development access
                </span>
              </div>
            </div>

            <div className="mt-6">
              <Button
                onClick={handleDevLogin}
                variant="outline"
                className="w-full justify-center"
                disabled={loading || success}
              >
                🔧 Dev Login (Baker R.)
              </Button>
            </div>
            
            <p className="mt-4 text-xs text-center text-gray-500 dark:text-gray-400">
              This is a temporary login for development purposes.
              <br />
              Production authentication will be implemented later.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}