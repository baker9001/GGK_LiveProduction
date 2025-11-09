/**
 * File: /src/lib/supabase.ts
 * Dependencies: 
 *   - @supabase/supabase-js
 *   - import.meta.env (Vite environment variables)
 * 
 * Preserved Features (from v1):
 *   - Trim whitespace from environment variables
 *   - Enhanced URL validation (length + domain check)
 *   - Detailed error logging with URL value
 *   - 30-second timeout configuration
 *   - Basic error helper
 * 
 * Added Features (from v3):
 *   - WebContainer compatibility
 *   - Retry logic with exponential backoff
 *   - Connection health check
 *   - Enhanced error handling with context
 *   - Storage configuration for auth
 *   - Realtime throttling
 *   - Development mode helpers
 * 
 * Database Tables:
 *   - All Supabase tables accessible through this client
 * 
 * Connected Files:
 *   - Used by all components that interact with Supabase
 */

import { createClient } from '@supabase/supabase-js';
import { markSessionExpired } from './auth';

// Get environment variables with trimming to remove any whitespace
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

// Enhanced error checking with helpful messages
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables!');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? 'Present' : 'Missing');
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Present' : 'Missing');
  console.error('Current VITE_SUPABASE_URL value:', supabaseUrl);
  console.error('Please ensure your .env file contains:');
  console.error('VITE_SUPABASE_URL=your_supabase_url');
  console.error('VITE_SUPABASE_ANON_KEY=your_supabase_anon_key');
  
  // Provide warning for development mode
  if (import.meta.env.DEV) {
    console.warn('⚠️ Running in development mode without Supabase config');
  }
  
  throw new Error('Supabase configuration error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be defined in your .env file.');
}

// Additional validation for URL format and completeness
if (supabaseUrl.length < 20 || !supabaseUrl.includes('.supabase.co')) {
  console.error('Invalid or incomplete Supabase URL:', supabaseUrl);
  console.error('Expected format: https://your-project-ref.supabase.co');
  throw new Error('Invalid Supabase URL format. Please check your VITE_SUPABASE_URL in .env file - it appears to be incomplete or malformed.');
}

// Validate URL format
try {
  new URL(supabaseUrl);
} catch (error) {
  console.error('Invalid Supabase URL format:', supabaseUrl);
  console.error('URL validation error:', error);
  throw new Error('Invalid Supabase URL format. Please check your VITE_SUPABASE_URL in .env file.');
}

// Create Supabase client with WebContainer-friendly configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Add storage key to avoid conflicts
    storageKey: 'supabase.auth.token',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
  global: {
    headers: {
      // Removed 'Content-Type': 'application/json' to allow proper MIME type detection for file uploads
    }
  },
  // Enhanced fetch configuration for WebContainer with retry logic
  fetch: async (url, options = {}) => {
    // Add retry logic for WebContainer environments
    const maxRetries = 3;
    let lastError;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(url, {
          ...options,
          signal: options.signal || controller.signal,
          // Add CORS mode for WebContainer
          mode: 'cors',
          // CRITICAL FIX: Use 'include' to ensure auth cookies and headers are sent
          // Changed from 'same-origin' to 'include' for cross-origin auth
          credentials: 'include',
        });

        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        lastError = error;
        console.warn(`Fetch attempt ${i + 1} failed:`, error);

        // If it's a network error, wait before retrying
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
    }

    throw lastError;
  },
  // Add realtime configuration
  realtime: {
    params: {
      eventsPerSecond: 2
    }
  }
});

// Connection health check function
type ConnectionCheckResult = {
  connected: boolean;
  error?: string;
  shouldRetry?: boolean;
};

export async function checkSupabaseConnection(): Promise<ConnectionCheckResult> {
  try {
    const { error } = await supabase.from('users').select('count', { count: 'exact', head: true });
    if (error && error.code !== 'PGRST116') {
      const errorMessage = error.message || 'Failed to connect to Supabase';
      console.warn('Supabase connection check failed:', error);
      const shouldRetry =
        error.code === 'PGRST301' || // RLS policy violation while auth session restores
        error.code === '42501' ||
        error.code === 'PGRST000' ||
        /jwt|authentication|permission denied/i.test(errorMessage);
      return {
        connected: false,
        error: errorMessage,
        shouldRetry
      };
    }
    console.log('✅ Supabase connection successful');
    return { connected: true };
  } catch (error) {
    let errorMessage = 'Unable to connect to the database. Please check your connection and try again.';

    try {
      handleSupabaseError(error, 'connection check');
    } catch (handledError: any) {
      errorMessage = handledError?.message || String(handledError);
      console.warn('❌ Supabase connection error:', errorMessage);
      const shouldRetry = /access denied|authentication required/i.test(errorMessage);
      return {
        connected: false,
        error: errorMessage,
        shouldRetry
      };
    }

    if (error instanceof Error) {
      errorMessage = error.message;
    }

    console.warn('❌ Supabase connection error:', errorMessage);
    return {
      connected: false,
      error: errorMessage,
      shouldRetry: /authentication/i.test(errorMessage)
    };
  }
}

// Helper function to handle Supabase errors with better context
export const handleSupabaseError = (error: any, context?: string) => {
  const errorMessage = error?.message || 'An error occurred while connecting to the database';
  const errorCode = error?.code || '';
  const errorDetails = error?.details || '';

  // CRITICAL: Check for RLS policy violations
  if (errorCode === 'PGRST301' || errorMessage.includes('row-level security') ||
      errorMessage.includes('policy') || errorCode === '42501') {
    console.error(`🔒 RLS Policy Violation${context ? ` in ${context}` : ''}:`);
    console.error('Error:', errorMessage);
    console.error('Code:', errorCode);
    console.error('Details:', errorDetails);
    console.error('DIAGNOSIS: User may not have proper authentication or permissions.');
    console.error('ACTION REQUIRED: Check if user is logged in with Supabase auth and has required role.');

    throw new Error('Access denied. Please ensure you are logged in with proper permissions.');
  }

  // Check for authentication errors
  if (errorCode === 'PGRST000' || errorMessage.includes('JWT') ||
      errorMessage.includes('authentication') || errorMessage.includes('expired')) {
    console.error(`🔐 Authentication Error${context ? ` in ${context}` : ''}:`, errorMessage);
    console.error('DIAGNOSIS: No valid authentication session found or session expired.');

    // Clear authentication and redirect to login
    import('./auth').then(({ clearAuthenticatedUser, markSessionExpired }) => {
      clearAuthenticatedUser();
      markSessionExpired('Your session has expired. Please sign in again to continue.');

      // Only redirect if not already on signin page
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/signin')) {
        window.location.replace('/signin');
      }
    });

    throw new Error('Session expired. Please sign in to continue.');
  }

  // Check for Supabase backend errors
  if (errorMessage.includes('Database error granting user') ||
      errorMessage.includes('unexpected_failure')) {
    console.error(`🔧 Supabase Backend Error${context ? ` in ${context}` : ''}:`, errorMessage);
    console.error('This is a Supabase service issue. Check Supabase dashboard for service status.');

    throw new Error('Authentication service is temporarily unavailable. Please try again in a few moments.');
  }

  // Check for common WebContainer issues
  if (errorMessage.includes('Failed to fetch') || errorMessage.includes('TypeError')) {
    console.error(`🔌 Connection Error${context ? ` in ${context}` : ''}:`, errorMessage);
    console.error('This might be a WebContainer/StackBlitz network issue.');
    console.error('Try: 1) Refreshing the page, 2) Checking your internet connection, 3) Verifying Supabase URL');

    // Return a user-friendly error
    throw new Error('Unable to connect to the database. Please check your connection and try again.');
  }

  console.error(`Supabase error${context ? ` in ${context}` : ''}:`, error);
  throw new Error(errorMessage);
};

// Export a wrapped query function with better error handling
export async function supabaseQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  context?: string
): Promise<T | null> {
  try {
    const { data, error } = await queryFn();
    if (error) {
      handleSupabaseError(error, context);
    }
    return data;
  } catch (error) {
    handleSupabaseError(error, context);
    return null;
  }
}

// Enhanced query wrapper with session awareness
export async function supabaseAuthQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  context?: string
): Promise<{ data: T | null; error: any }> {
  try {
    // Check session before query
    const token = localStorage.getItem('ggk_auth_token');
    if (!token) {
      return {
        data: null,
        error: {
          message: 'No authentication token found',
          code: 'AUTH_ERROR'
        }
      };
    }

    const result = await queryFn();

    // Check for session expiration in response
    if (result.error) {
      const errorCode = result.error.code || '';
      const errorMessage = result.error.message || '';

      // Detect session expiration
      if (
        errorCode === 'PGRST000' ||
        errorCode === 'PGRST301' ||
        errorCode === '42501' ||
        errorMessage.includes('JWT') ||
        errorMessage.includes('expired') ||
        errorMessage.includes('authentication')
      ) {
        console.error('[supabaseAuthQuery] Session expired detected in query');
        handleSupabaseError(result.error, context);
      }
    }

    return result;
  } catch (error: any) {
    console.error('[supabaseAuthQuery] Query failed:', error);
    return {
      data: null,
      error: {
        message: error?.message || 'Query failed',
        code: error?.code || 'UNKNOWN_ERROR'
      }
    };
  }
}

// Helper function to sync Supabase auth session with local storage
export async function syncSupabaseAuth(): Promise<boolean> {
  try {
    // Check if we have a Supabase session
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      console.log('✅ Supabase session exists:', session.user.id);
      return true;
    }

    // No Supabase session, check if we have local auth
    const localAuthStr = localStorage.getItem('ggk_authenticated_user');
    if (!localAuthStr) {
      console.log('ℹ️ No local auth found');
      return false;
    }

    const localAuth = JSON.parse(localAuthStr);
    console.log('🔄 Found local auth, user:', localAuth.email, 'ID:', localAuth.id);

    // For system admins, we need to get or create a Supabase auth session
    // Check if user exists in auth.users
    const { data: authUser, error: authCheckError } = await supabase.auth.getUser();

    if (authCheckError || !authUser?.user) {
      console.warn('⚠️ No Supabase auth session found. User needs to sign in through Supabase auth.');
      return false;
    }

    console.log('✅ Supabase auth user found:', authUser.user.id);
    return true;
  } catch (error) {
    console.error('❌ Error syncing Supabase auth:', error);
    return false;
  }
}

// Monitor Supabase auth state changes
if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('[Supabase Auth] State changed:', event);

    // Handle SIGNED_OUT event
    if (event === 'SIGNED_OUT') {
      console.log('[Supabase Auth] User signed out, clearing local auth');
      import('./auth').then(({ clearAuthenticatedUser, markSessionExpired }) => {
        clearAuthenticatedUser();
        markSessionExpired('Your session has ended. Please sign in again to continue.');

        // Redirect to signin if not already there
        if (!window.location.pathname.startsWith('/signin')) {
          window.location.replace('/signin');
        }
      });
    }

    // Handle TOKEN_REFRESHED event
    if (event === 'TOKEN_REFRESHED') {
      console.log('[Supabase Auth] Token refreshed successfully');
    }

    // Handle session expiry
    if (event === 'USER_UPDATED' && !session) {
      console.log('[Supabase Auth] Session expired, no active session');
      import('./auth').then(({ clearAuthenticatedUser, markSessionExpired }) => {
        clearAuthenticatedUser();
        markSessionExpired();

        // Redirect to signin if not already there
        if (!window.location.pathname.startsWith('/signin')) {
          window.location.replace('/signin');
        }
      });
    }
  });
}

// Initialize connection check on load (development only)
if (import.meta.env.DEV) {
  checkSupabaseConnection().then(({ connected }) => {
    if (!connected) {
      console.warn('⚠️ Initial Supabase connection failed. Will retry on first query.');
    } else {
      // Check auth sync
      syncSupabaseAuth().then((synced) => {
        if (!synced) {
          console.warn('⚠️ Auth session not synced. Some queries may fail due to RLS policies.');
        }
      });
    }
  });
}