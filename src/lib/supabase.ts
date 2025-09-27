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

// Debug logging for environment variables
console.log('Environment variables check:');
console.log('VITE_SUPABASE_URL:', supabaseUrl);
console.log('VITE_SUPABASE_ANON_KEY length:', supabaseAnonKey?.length || 0);

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
if (supabaseUrl.length < 30) {
  console.error('Invalid or incomplete Supabase URL:', supabaseUrl);
  console.error('URL length:', supabaseUrl.length);
  console.error('Expected format: https://your-project-ref.supabase.co');
  throw new Error('Invalid Supabase URL format. Please check your VITE_SUPABASE_URL in .env file - it appears to be incomplete or malformed.');
}

// Enhanced URL validation to prevent common misconfigurations
if (!supabaseUrl.includes('.supabase.co')) {
  console.error('Invalid Supabase URL domain:', supabaseUrl);
  console.error('Expected domain: .supabase.co');
  throw new Error('Invalid Supabase URL domain. Please ensure your VITE_SUPABASE_URL uses the correct Supabase domain (.supabase.co).');
}

// Check for common URL misconfiguration (storage/auth endpoints instead of base URL)
if (supabaseUrl.includes('/storage') || supabaseUrl.includes('/auth') || supabaseUrl.includes('/rest')) {
  console.error('Supabase URL appears to be a service-specific endpoint:', supabaseUrl);
  console.error('Expected base URL format: https://your-project-ref.supabase.co');
  console.error('Current URL contains service path which should not be in VITE_SUPABASE_URL');
  throw new Error('Invalid Supabase URL: Please use the base URL (https://your-project-ref.supabase.co) not a service-specific endpoint.');
}

// Validate URL doesn't have trailing slashes or extra paths
const cleanUrl = supabaseUrl.replace(/\/+$/, ''); // Remove trailing slashes
if (cleanUrl !== supabaseUrl) {
  console.warn('Supabase URL had trailing slashes, cleaning:', supabaseUrl, '->', cleanUrl);
}

// Validate URL format
try {
  const urlObj = new URL(cleanUrl);
  if (urlObj.pathname !== '/' && urlObj.pathname !== '') {
    console.error('Supabase URL should not contain paths:', cleanUrl);
    console.error('URL pathname:', urlObj.pathname);
    console.error('Expected: https://your-project-ref.supabase.co (no additional paths)');
    throw new Error('Invalid Supabase URL: Base URL should not contain additional paths.');
  }
} catch (error) {
  console.error('Invalid Supabase URL format:', cleanUrl);
  console.error('URL validation error:', error);
  throw new Error('Invalid Supabase URL format. Please check your VITE_SUPABASE_URL in .env file.');
}

// Additional validation for HTTPS when app is served over HTTPS
if (typeof window !== 'undefined' && window.location.protocol === 'https:' && !cleanUrl.startsWith('https:')) {
  console.error('Mixed content error: Application is served over HTTPS but Supabase URL uses HTTP');
  console.error('Current protocol:', window.location.protocol);
  console.error('Supabase URL:', cleanUrl);
  console.error('This can cause "Failed to fetch" errors due to browser security restrictions');
  throw new Error('Mixed content error: Supabase URL must use HTTPS when the application is served over HTTPS. Please update your VITE_SUPABASE_URL to use https://');
}

// Create Supabase client with WebContainer-friendly configuration
export const supabase = createClient(cleanUrl, supabaseAnonKey, {
export const supabase = createClient(cleanUrl, supabaseAnonKey, {
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
      'Content-Type': 'application/json',
      'User-Agent': 'GGK-Admin-App/1.0'
    }
  },
  // Enhanced fetch configuration for WebContainer with retry logic
  fetch: async (url, options = {}) => {
    console.log('Supabase fetch attempt to:', url);
    
    // Add retry logic for WebContainer environments
    const maxRetries = 3;
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000); // Increased timeout
        
        const response = await fetch(url, {
          ...options,
          signal: options.signal || controller.signal,
          // Add CORS mode for WebContainer
          mode: 'cors',
          credentials: 'omit',
          headers: {
            ...options.headers,
            'Accept': 'application/json',
          }
        });
        
        clearTimeout(timeoutId);
        console.log('Supabase fetch successful:', response.status);
        return response;
      } catch (error) {
        lastError = error;
        console.warn(`Supabase fetch attempt ${i + 1} failed:`, error);
        console.warn('URL that failed:', url);
        
        // If it's a network error, wait before retrying
        if (i < maxRetries - 1) {
          const delay = Math.min(1000 * Math.pow(2, i), 5000); // Exponential backoff, max 5s
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    console.error('All Supabase fetch attempts failed:', lastError);
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
    console.log('Checking Supabase connection...');
    const { error } = await supabase.from('users').select('count', { count: 'exact', head: true });
    if (error && error.code !== 'PGRST116') {
      console.warn('Supabase connection check failed:', error);
      console.warn('Error code:', error.code);
      console.warn('Error message:', error.message);
      return false;
    }
    console.log('✅ Supabase connection successful');
    return true;
  } catch (error) {
    // Log the error details for debugging
    console.warn('❌ Supabase connection error:', error);
    console.warn('Error type:', typeof error);
    console.warn('Error constructor:', error.constructor.name);
    
    // Check for specific error types and provide helpful logging
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      console.warn('Network connectivity issue detected. This might be due to:');
      console.warn('1. WebContainer/StackBlitz network restrictions');
      console.warn('2. Supabase service temporarily unavailable');
      console.warn('3. Internet connectivity issues');
      console.warn('4. Environment variable configuration issue');
      console.warn('Current Supabase URL being used:', supabaseUrl);
    }
    
    // Always return false for any connection failure
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
  }).catch(error => {
    console.warn('⚠️ Initial Supabase connection check failed:', error.message);
    console.warn('Application will continue to run. Connection will be retried on first query.');
  });
}