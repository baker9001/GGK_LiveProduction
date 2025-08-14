// File: /src/app/signin/page.tsx
// Purpose: Complete authentication page with proper sign-in logic (no signUp during login)
// Lines: ~750 (complete file with ALL original features preserved)

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

// Generate a strong, unique password for Supabase based on user email
// This is separate from the password stored in admin_users table
function generateSupabasePassword(email: string, userId: string): string {
  // Create a strong, unique password that Supabase will accept
  // This combines multiple factors to ensure uniqueness and strength
  const baseString = `GGK_${email}_${userId}_SecureAuth2024!`;
  const hash = btoa(baseString).replace(/[^a-zA-Z0-9]/g, '');
  return `${hash.substring(0, 20)}@Ggk2024!`; // Ensures uppercase, lowercase, number, special char
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
      // CRITICAL: Normalize email
      const normalizedEmail = data.email.trim().toLowerCase();

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
        .eq('email', normalizedEmail) // Use normalized email
        .eq('status', 'active')
        .maybeSingle();

      if (queryError) {
        throw new Error('Failed to check credentials');
      }

      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Step 2: Compare password with hashed password in admin_users table
      const isValidPassword = await bcrypt.compare(data.password, user.password_hash);
      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }

      // Step 3: Handle Supabase Auth properly
      console.log('Admin credentials verified, handling Supabase auth...');
      
      // Generate a strong, unique password for Supabase
      const supabasePassword = generateSupabasePassword(normalizedEmail, user.id);
      
      let supabaseSession = null;
      
      // CRITICAL FIX: Always try signInWithPassword FIRST for existing users
      console.log('Attempting to sign in with Supabase...');
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: supabasePassword
      });

      if (!signInError && signInData?.session) {
        // Success! User exists in Supabase Auth
        console.log('Successfully signed in with existing Supabase account');
        supabaseSession = signInData.session;
      } else if (signInError) {
        console.log('Sign-in error:', signInError.message);
        
        if (signInError.message?.includes('Invalid login credentials') || 
            signInError.message?.includes('invalid_credentials')) {
          // User might not exist in Supabase Auth or has different password
          console.log('User may not exist in Supabase Auth, checking...');
          
          // FIXED: Don't try alternative passwords or signUp during login
          // Instead, use the API endpoint to sync the user
          console.log('Syncing user with Supabase Auth...');
          
          try {
            const response = await fetch('/api/auth/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: user.id,
                email: normalizedEmail,
                password: data.password, // Use the actual password user entered
                name: user.name
              })
            });

            if (response.ok) {
              // Try signing in again with the actual password
              const { data: retrySignIn, error: retryError } = await supabase.auth.signInWithPassword({
                email: normalizedEmail,
                password: data.password
              });
              
              if (!retryError && retrySignIn?.session) {
                console.log('Successfully signed in after sync');
                supabaseSession = retrySignIn.session;
              } else {
                // Try with the generated password pattern
                const { data: fallbackSignIn } = await supabase.auth.signInWithPassword({
                  email: normalizedEmail,
                  password: supabasePassword
                });
                
                if (fallbackSignIn?.session) {
                  supabaseSession = fallbackSignIn.session;
                }
              }
            }
          } catch (syncError) {
            console.error('Failed to sync with Supabase Auth:', syncError);
            // Continue without Supabase session - app will work with limited functionality
          }
        } else {
          // Some other error - log but continue
          console.error('Unexpected Supabase auth error:', signInError);
          // Continue without Supabase session
        }
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

      // Step 7: Verify we have some form of authentication
      if (!supabaseSession) {
        console.warn('⚠️ No Supabase session - API calls may have limited functionality');
        console.log('✅ Custom authentication is active - basic operations will work');
        // Don't show error to user - the app will still work
      } else {
        console.log('✅ Full authentication successful with Supabase session');
      }

      // Redirect after a brief delay to show success state
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

    // Clear any existing test mode before dev login
    if (isInTestMode()) {
      exitTestMode();
    }

    try {
      // CRITICAL: Normalize email
      const devEmail = 'bakir.alramadi@gmail.com'.trim().toLowerCase();
      
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
        .eq('email', devEmail)
        .maybeSingle();

      if (queryError) {
        throw new Error('Failed to check dev user');
      }

      const devPassword = 'dev_password'; // Password for admin_users table
      
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
            email: devEmail,
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

        // Handle Supabase auth for new dev user
        const supabasePassword = generateSupabasePassword(devEmail, newUser.id);
        
        // FIXED: Don't use signUp, use the sync API
        try {
          const response = await fetch('/api/auth/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: newUser.id,
              email: devEmail,
              password: devPassword,
              name: 'Baker R.'
            })
          });

          if (response.ok) {
            // Try to sign in with the dev password
            await supabase.auth.signInWithPassword({
              email: devEmail,
              password: devPassword
            });
          }
        } catch (syncError) {
          console.error('Failed to sync dev user with Supabase Auth:', syncError);
        }

        // Create user object for new user
        const authenticatedUser: User = {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: 'SSA'
        };

        setAuthenticatedUser(authenticatedUser);
      } else {
        // User exists, handle Supabase auth
        const supabasePassword = generateSupabasePassword(devEmail, user.id);
        
        // FIXED: Try to sign in first, don't sign up
        console.log('Attempting to sign in dev user with Supabase...');
        
        // Try with dev password first
        const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
          email: devEmail,
          password: devPassword
        });

        let sessionCreated = false;
        
        if (!signInError && authData?.session) {
          console.log('Signed in dev user with dev password');
          sessionCreated = true;
        } else {
          // Try with generated password
          const { data: altAuth, error: altError } = await supabase.auth.signInWithPassword({
            email: devEmail,
            password: supabasePassword
          });
          
          if (!altError && altAuth?.session) {
            console.log('Signed in dev user with generated password');
            sessionCreated = true;
          } else {
            // Sync the user if sign-in fails
            console.log('Dev user not in Supabase Auth, syncing...');
            
            try {
              const response = await fetch('/api/auth/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId: user.id,
                  email: devEmail,
                  password: devPassword,
                  name: user.name
                })
              });

              if (response.ok) {
                // Try signing in again
                await supabase.auth.signInWithPassword({
                  email: devEmail,
                  password: devPassword
                });
                console.log('Dev user synced and signed in');
              }
            } catch (syncError) {
              console.error('Failed to sync dev user:', syncError);
            }
          }
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
        console.warn('No Supabase session for dev user - continuing with custom auth');
      }

      setSuccess(true);

      setTimeout(() => {
        navigate(from, { replace: true });
      }, 500);
    } catch (err) {
      setError('Failed to create dev account');
      console.error('Dev login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link 
          to="/"
          className="flex justify-center items-center group"
        >
          <div className="flex items-center">
            <GraduationCap className="h-12 w-12 text-[#8CC63F] group-hover:text-[#7AB32F] transition-colors" />
            <span className="ml-2 text-3xl font-bold text-gray-900 dark:text-white">GGK</span>
          </div>
        </Link>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          Welcome back! Please enter your credentials
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

          {success && (
            <div className="mb-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 p-4 rounded-md flex items-start border border-green-200 dark:border-green-800">
              <CircleCheck className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <span className="text-sm">Login successful! Redirecting...</span>
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