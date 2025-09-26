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
export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('users').select('count', { count: 'exact', head: true });
    if (error && error.code !== 'PGRST116') {
      console.warn('Supabase connection check failed:', error);
      return false;
    }
    console.log('✅ Supabase connection successful');
    return true;
  } catch (error) {
    try {
      handleSupabaseError(error, 'connection check');
    } catch (handledError) {
      // handleSupabaseError throws user-friendly errors, but we want to continue gracefully
      console.warn('❌ Supabase connection error:', handledError.message);
    }
    return false;
  }
}

// Helper function to handle Supabase errors with better context
export const handleSupabaseError = (error: any, context?: string) => {
  const errorMessage = error?.message || 'An error occurred while connecting to the database';
  
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

// Initialize connection check on load (development only)
if (import.meta.env.DEV) {
  checkSupabaseConnection().then(connected => {
    if (!connected) {
      console.warn('⚠️ Initial Supabase connection failed. Will retry on first query.');
    }
  });
}