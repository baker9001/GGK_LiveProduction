/**
 * File: /src/lib/supabase.ts
 * 
 * ENHANCED VERSION V2 - Handles both network and authentication errors
 * 
 * Dependencies: 
 *   - @supabase/supabase-js
 *   - import.meta.env (Vite environment variables)
 * 
 * Enhanced Features:
 *   - Handles 401 Unauthorized errors gracefully
 *   - Differentiates between network and auth errors
 *   - Provides clear guidance for fixing auth issues
 *   - Improved connection health check for auth scenarios
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Get environment variables with trimming to remove any whitespace
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

// Connection state tracking
let connectionState: 'connected' | 'disconnected' | 'connecting' | 'unauthorized' = 'disconnected';
let lastConnectionCheck = 0;
const CONNECTION_CHECK_INTERVAL = 30000; // 30 seconds

// Enhanced error checking with helpful messages
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables!');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? 'Present' : 'Missing');
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Present (length: ' + supabaseAnonKey.length + ')' : 'Missing');
  console.error('Please ensure your .env file contains:');
  console.error('VITE_SUPABASE_URL=your_supabase_url');
  console.error('VITE_SUPABASE_ANON_KEY=your_supabase_anon_key');
  
  throw new Error('Supabase configuration error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be defined in your .env file.');
}

// Validate Supabase URL format
if (supabaseUrl.length < 20 || !supabaseUrl.includes('.supabase.co')) {
  console.error('Invalid or incomplete Supabase URL:', supabaseUrl);
  console.error('Expected format: https://your-project-ref.supabase.co');
  throw new Error('Invalid Supabase URL format.');
}

// Validate anonymous key format (should be a JWT)
if (!supabaseAnonKey.includes('.') || supabaseAnonKey.length < 100) {
  console.error('⚠️ Supabase anonymous key appears to be invalid');
  console.error('Key length:', supabaseAnonKey.length);
  console.error('Expected: A JWT token (usually 200+ characters with dots)');
}

// Validate URL format
try {
  new URL(supabaseUrl);
} catch (error) {
  console.error('Invalid Supabase URL format:', supabaseUrl);
  throw new Error('Invalid Supabase URL format.');
}

// Enhanced fetch wrapper for WebContainer environments with auth error handling
const webContainerFetch = async (url: string | Request | URL, options: RequestInit = {}): Promise<Response> => {
  const maxRetries = 3;
  let lastError: any;
  let lastResponse: Response | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      // Merge options with WebContainer-specific settings
      const fetchOptions: RequestInit = {
        ...options,
        signal: options.signal || controller.signal,
        mode: 'cors',
        credentials: 'same-origin',
        headers: {
          ...options.headers,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      };
      
      // Attempt the fetch
      const response = await fetch(url, fetchOptions);
      lastResponse = response;
      
      clearTimeout(timeoutId);
      
      // Handle authentication errors specially
      if (response.status === 401) {
        connectionState = 'unauthorized';
        console.error('🔐 Authentication Error (401):', {
          url: url.toString(),
          message: 'Unauthorized access. Check your Supabase configuration:'
        });
        console.error('Possible causes:');
        console.error('1. Invalid or expired anonymous key in .env file');
        console.error('2. RLS policies blocking access');
        console.error('3. User not properly authenticated');
        console.error('Current anonymous key starts with:', supabaseAnonKey.substring(0, 20) + '...');
        
        // Don't retry auth errors
        return response;
      }
      
      // Handle other HTTP errors
      if (!response.ok && response.status !== 404) {
        console.warn(`HTTP ${response.status} error:`, response.statusText);
      }
      
      // Update connection state on successful response
      if (response.ok && connectionState !== 'connected') {
        connectionState = 'connected';
        console.log('✅ Supabase connection established');
      }
      
      return response;
    } catch (error: any) {
      lastError = error;
      
      console.warn(`[Supabase] Fetch attempt ${attempt + 1} failed:`, {
        url: url.toString(),
        error: error.message,
        type: error.name
      });
      
      // Update connection state
      if (connectionState === 'connected') {
        connectionState = 'disconnected';
        console.warn('⚠️ Supabase connection lost');
      }
      
      // Don't retry on abort errors (timeout)
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - the server took too long to respond');
      }
      
      // Wait before retrying with exponential backoff
      if (attempt < maxRetries - 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // If we have a response (even with error status), return it
  if (lastResponse) {
    return lastResponse;
  }
  
  // All retries failed
  connectionState = 'disconnected';
  
  if (lastError?.message?.includes('Failed to fetch') || lastError?.name === 'TypeError') {
    throw new Error('Unable to connect to Supabase. This may be a network issue. Please try refreshing the page.');
  }
  
  throw lastError;
};

// Create Supabase client with enhanced configuration
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'supabase.auth.token',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    flowType: 'implicit'
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js/webcontainer',
      'apikey': supabaseAnonKey
    },
    fetch: webContainerFetch
  },
  realtime: {
    params: {
      eventsPerSecond: 2
    },
    timeout: 10000,
    heartbeatIntervalMs: 30000
  },
  db: {
    schema: 'public'
  }
});

// Enhanced connection health check that handles auth errors
export async function checkSupabaseConnection(): Promise<{ connected: boolean; error?: string; isAuthError?: boolean }> {
  // Check cache to avoid excessive checks
  const now = Date.now();
  if (connectionState === 'connected' && (now - lastConnectionCheck) < CONNECTION_CHECK_INTERVAL) {
    return { connected: true };
  }
  
  // Update state to connecting
  if (connectionState !== 'connecting' && connectionState !== 'unauthorized') {
    connectionState = 'connecting';
  }
  
  try {
    // First, try a simple auth check (doesn't require database access)
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      console.warn('Auth session check failed:', authError);
    }
    
    // Now try a database query - use auth.users table which should be accessible
    const { error, status } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true })
      .limit(1)
      .maybeSingle();
    
    // Check for authentication errors
    if (status === 401) {
      connectionState = 'unauthorized';
      console.error('🔐 Supabase Authentication Failed');
      console.error('Please check:');
      console.error('1. Your VITE_SUPABASE_ANON_KEY in .env file');
      console.error('2. The key should be the "anon public" key from Supabase dashboard');
      console.error('3. Make sure the key hasn\'t been regenerated in Supabase');
      
      return { 
        connected: false, 
        error: 'Authentication failed. Please check your Supabase configuration.',
        isAuthError: true
      };
    }
    
    // PGRST116 means table doesn't exist or no access, but connection works
    // PGRST301 means the table doesn't exist
    // Both indicate the connection itself is working
    if (!error || error.code === 'PGRST116' || error.code === 'PGRST301' || error.code === '42P01') {
      connectionState = 'connected';
      lastConnectionCheck = now;
      console.log('✅ Supabase connection verified');
      return { connected: true };
    }
    
    console.error('Supabase connection check failed:', error);
    connectionState = 'disconnected';
    return { 
      connected: false, 
      error: error.message || 'Connection check failed'
    };
  } catch (error: any) {
    console.error('❌ Supabase connection error:', error);
    
    // Check if the error response indicates auth failure
    if (error?.status === 401 || error?.message?.includes('401') || error?.message?.includes('Unauthorized')) {
      connectionState = 'unauthorized';
      return { 
        connected: false, 
        error: 'Authentication failed. Invalid Supabase credentials.',
        isAuthError: true
      };
    }
    
    connectionState = 'disconnected';
    
    if (error?.message?.includes('Failed to fetch') || error?.message?.includes('TypeError')) {
      return { 
        connected: false, 
        error: 'Network connection error. Please check your internet connection.'
      };
    }
    
    return { 
      connected: false, 
      error: error?.message || 'Unknown connection error'
    };
  }
}

// Get current connection state
export function getConnectionState(): 'connected' | 'disconnected' | 'connecting' | 'unauthorized' {
  return connectionState;
}

// Check if error is authentication-related
export function isAuthError(error: any): boolean {
  if (!error) return false;
  
  return error.status === 401 || 
         error.code === '401' ||
         error.message?.includes('401') ||
         error.message?.includes('Unauthorized') ||
         error.message?.includes('JWT') ||
         error.message?.includes('Invalid API key');
}

// Helper function to handle Supabase errors with better context
export const handleSupabaseError = (error: any, context?: string) => {
  const errorMessage = error?.message || 'An error occurred while connecting to the database';
  
  // Check for authentication errors
  if (isAuthError(error)) {
    console.error(`🔐 Authentication Error${context ? ` in ${context}` : ''}:`, errorMessage);
    console.error('This is a configuration issue. Please verify:');
    console.error('1. VITE_SUPABASE_URL is correct:', supabaseUrl);
    console.error('2. VITE_SUPABASE_ANON_KEY is valid (should be ~200+ chars)');
    console.error('3. The anonymous key hasn\'t been regenerated in Supabase dashboard');
    
    return new Error('Authentication failed. Please check your Supabase configuration in the .env file.');
  }
  
  // Check for common WebContainer issues
  if (errorMessage.includes('Failed to fetch') || 
      errorMessage.includes('TypeError') || 
      errorMessage.includes('NetworkError')) {
    console.error(`🔌 Connection Error${context ? ` in ${context}` : ''}:`, errorMessage);
    console.error('This appears to be a network issue.');
    
    return new Error('Connection issue detected. The app will work in limited mode.');
  }
  
  console.error(`Supabase error${context ? ` in ${context}` : ''}:`, error);
  throw new Error(errorMessage);
};

// Enhanced wrapped query function with auth error handling
export async function supabaseQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any; status?: number }>,
  context?: string,
  options?: { 
    retries?: number; 
    retryDelay?: number;
    fallbackValue?: T;
    skipAuthRetry?: boolean;
  }
): Promise<T | null> {
  const maxRetries = options?.retries ?? 3;
  const retryDelay = options?.retryDelay ?? 1000;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await queryFn();
      
      if (result.error) {
        // Don't retry auth errors unless explicitly told to
        if (isAuthError(result.error) && options?.skipAuthRetry !== false) {
          console.error(`Auth error in ${context}:`, result.error);
          
          if (options?.fallbackValue !== undefined) {
            console.warn(`Using fallback value due to auth error`);
            return options.fallbackValue;
          }
          
          handleSupabaseError(result.error, context);
          return null;
        }
        
        // Retry network errors
        if ((result.error.message?.includes('Failed to fetch') || 
             result.error.message?.includes('TypeError')) && 
            attempt < maxRetries - 1) {
          console.warn(`Query attempt ${attempt + 1} failed, retrying...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
          continue;
        }
        
        // Use fallback for any error if provided
        if (options?.fallbackValue !== undefined) {
          console.warn(`Using fallback value for ${context}`);
          return options.fallbackValue;
        }
        
        handleSupabaseError(result.error, context);
      }
      
      return result.data;
    } catch (error) {
      // If this is our last attempt, handle the error
      if (attempt === maxRetries - 1) {
        if (options?.fallbackValue !== undefined) {
          console.warn(`All retries failed, using fallback value for ${context}`);
          return options.fallbackValue;
        }
        
        handleSupabaseError(error, context);
        return null;
      }
      
      // Don't retry auth errors
      if (isAuthError(error) && options?.skipAuthRetry !== false) {
        if (options?.fallbackValue !== undefined) {
          return options.fallbackValue;
        }
        return null;
      }
      
      // Wait before next retry
      await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
    }
  }
  
  return null;
}

// Auto-reconnection mechanism (skip if auth error)
let reconnectionInterval: NodeJS.Timeout | null = null;

export function startAutoReconnection() {
  if (reconnectionInterval) return;
  
  // Don't try to reconnect if it's an auth error
  if (connectionState === 'unauthorized') {
    console.warn('Skipping auto-reconnection due to authentication error');
    return;
  }
  
  reconnectionInterval = setInterval(async () => {
    if (connectionState === 'disconnected') {
      console.log('Attempting to reconnect to Supabase...');
      const { connected, isAuthError } = await checkSupabaseConnection();
      
      if (connected) {
        console.log('✅ Successfully reconnected to Supabase');
        window.dispatchEvent(new CustomEvent('supabase-reconnected'));
      } else if (isAuthError) {
        // Stop trying if it's an auth error
        console.error('Stopping reconnection attempts due to authentication error');
        stopAutoReconnection();
      }
    }
  }, 30000); // Try every 30 seconds
}

export function stopAutoReconnection() {
  if (reconnectionInterval) {
    clearInterval(reconnectionInterval);
    reconnectionInterval = null;
  }
}

// Initialize connection check
if (typeof window !== 'undefined') {
  // Check connection on load
  checkSupabaseConnection().then(({ connected, error, isAuthError }) => {
    if (!connected) {
      if (isAuthError) {
        console.error('⚠️ CRITICAL: Supabase authentication failed!');
        console.error('The application cannot connect to the database.');
        console.error('Please fix the configuration in your .env file.');
      } else {
        console.warn('⚠️ Initial Supabase connection failed:', error);
        // Only start auto-reconnection for network errors
        startAutoReconnection();
      }
    }
  });
  
  // Listen for online/offline events
  window.addEventListener('online', () => {
    console.log('Network connection restored, checking Supabase...');
    checkSupabaseConnection();
  });
  
  window.addEventListener('offline', () => {
    console.log('Network connection lost');
    connectionState = 'disconnected';
  });
  
  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    stopAutoReconnection();
  });
}

// Export for use in other modules
export default supabase;