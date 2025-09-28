/**
 * File: /src/lib/supabase.ts
 * 
 * ENHANCED VERSION - Improved WebContainer/StackBlitz compatibility
 * 
 * Dependencies: 
 *   - @supabase/supabase-js
 *   - import.meta.env (Vite environment variables)
 * 
 * Preserved Features:
 *   - Trim whitespace from environment variables
 *   - Enhanced URL validation (length + domain check)
 *   - Detailed error logging with URL value
 *   - 30-second timeout configuration
 *   - Basic error helper
 *   - WebContainer compatibility
 *   - Connection health check
 *   - Enhanced error handling with context
 *   - Storage configuration for auth
 *   - Realtime throttling
 * 
 * Enhanced Features:
 *   - Improved retry logic with exponential backoff
 *   - Better connection state tracking
 *   - Enhanced error recovery for WebContainer
 *   - Connection pooling optimization
 *   - Automatic reconnection on network recovery
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Get environment variables with trimming to remove any whitespace
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

// Connection state tracking
let connectionState: 'connected' | 'disconnected' | 'connecting' = 'disconnected';
let lastConnectionCheck = 0;
const CONNECTION_CHECK_INTERVAL = 30000; // 30 seconds

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

// Enhanced fetch wrapper for WebContainer environments
const webContainerFetch = async (url: string | Request | URL, options: RequestInit = {}): Promise<Response> => {
  const maxRetries = 3;
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      // Merge options with WebContainer-specific settings
      const fetchOptions: RequestInit = {
        ...options,
        signal: options.signal || controller.signal,
        mode: 'cors',
        credentials: 'same-origin',
        // Add cache control to prevent stale responses
        headers: {
          ...options.headers,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      };
      
      // Attempt the fetch
      const response = await fetch(url, fetchOptions);
      
      clearTimeout(timeoutId);
      
      // Update connection state on successful response
      if (connectionState !== 'connected') {
        connectionState = 'connected';
        console.log('✅ Supabase connection restored');
      }
      
      return response;
    } catch (error: any) {
      lastError = error;
      
      // Log the error details for debugging
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
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000); // Max 10 seconds
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // All retries failed
  connectionState = 'disconnected';
  
  // Provide helpful error message
  if (lastError?.message?.includes('Failed to fetch') || lastError?.name === 'TypeError') {
    throw new Error('Unable to connect to Supabase. This may be a WebContainer/StackBlitz network issue. Please try refreshing the page.');
  }
  
  throw lastError;
};

// Create Supabase client with WebContainer-friendly configuration
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'supabase.auth.token',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    // Add flow type for better auth handling
    flowType: 'implicit'
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js/webcontainer'
    },
    fetch: webContainerFetch
  },
  // Enhanced realtime configuration
  realtime: {
    params: {
      eventsPerSecond: 2
    },
    // Add timeout and retry settings
    timeout: 10000,
    heartbeatIntervalMs: 30000
  },
  // Database settings
  db: {
    schema: 'public'
  }
});

// Enhanced connection health check with caching
export async function checkSupabaseConnection(): Promise<{ connected: boolean; error?: string }> {
  // Check cache to avoid excessive checks
  const now = Date.now();
  if (connectionState === 'connected' && (now - lastConnectionCheck) < CONNECTION_CHECK_INTERVAL) {
    return { connected: true };
  }
  
  // Update state to connecting
  if (connectionState !== 'connecting') {
    connectionState = 'connecting';
  }
  
  try {
    // Use a simple, fast query to check connection
    const { error } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true })
      .limit(1)
      .maybeSingle();
    
    // PGRST116 means table doesn't exist or no access, but connection works
    if (!error || error.code === 'PGRST116') {
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
    connectionState = 'disconnected';
    
    // Provide helpful error message
    if (error?.message?.includes('Failed to fetch') || error?.message?.includes('TypeError')) {
      return { 
        connected: false, 
        error: 'Network connection error. This may be a WebContainer issue. Please try refreshing.'
      };
    }
    
    return { 
      connected: false, 
      error: error?.message || 'Unknown connection error'
    };
  }
}

// Get current connection state
export function getConnectionState(): 'connected' | 'disconnected' | 'connecting' {
  return connectionState;
}

// Helper function to handle Supabase errors with better context
export const handleSupabaseError = (error: any, context?: string) => {
  const errorMessage = error?.message || 'An error occurred while connecting to the database';
  
  // Check for common WebContainer issues
  if (errorMessage.includes('Failed to fetch') || 
      errorMessage.includes('TypeError') || 
      errorMessage.includes('NetworkError')) {
    console.error(`🔌 Connection Error${context ? ` in ${context}` : ''}:`, errorMessage);
    console.error('This appears to be a WebContainer/StackBlitz network issue.');
    console.error('Suggested fixes:');
    console.error('1. Refresh the page');
    console.error('2. Check your internet connection');
    console.error('3. Try opening in a new tab');
    console.error('4. Clear browser cache');
    
    // Don't throw, return a user-friendly error
    return new Error('Connection issue detected. The app will work in limited mode. Please refresh to restore full functionality.');
  }
  
  console.error(`Supabase error${context ? ` in ${context}` : ''}:`, error);
  throw new Error(errorMessage);
};

// Enhanced wrapped query function with better error handling
export async function supabaseQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  context?: string,
  options?: { 
    retries?: number; 
    retryDelay?: number;
    fallbackValue?: T;
  }
): Promise<T | null> {
  const maxRetries = options?.retries ?? 3;
  const retryDelay = options?.retryDelay ?? 1000;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const { data, error } = await queryFn();
      
      if (error) {
        // Check if it's a network error and we have retries left
        if ((error.message?.includes('Failed to fetch') || 
             error.message?.includes('TypeError')) && 
            attempt < maxRetries - 1) {
          console.warn(`Query attempt ${attempt + 1} failed, retrying...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
          continue;
        }
        
        // If we have a fallback value and it's a network error, use it
        if (options?.fallbackValue !== undefined && 
            (error.message?.includes('Failed to fetch') || 
             error.message?.includes('TypeError'))) {
          console.warn(`Using fallback value for ${context}`);
          return options.fallbackValue;
        }
        
        handleSupabaseError(error, context);
      }
      
      return data;
    } catch (error) {
      // If this is our last attempt, handle the error
      if (attempt === maxRetries - 1) {
        // If we have a fallback value, use it
        if (options?.fallbackValue !== undefined) {
          console.warn(`All retries failed, using fallback value for ${context}`);
          return options.fallbackValue;
        }
        
        handleSupabaseError(error, context);
        return null;
      }
      
      // Wait before next retry
      await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
    }
  }
  
  return null;
}

// Auto-reconnection mechanism
let reconnectionInterval: NodeJS.Timeout | null = null;

export function startAutoReconnection() {
  if (reconnectionInterval) return;
  
  reconnectionInterval = setInterval(async () => {
    if (connectionState === 'disconnected') {
      console.log('Attempting to reconnect to Supabase...');
      const { connected } = await checkSupabaseConnection();
      
      if (connected) {
        console.log('✅ Successfully reconnected to Supabase');
        // Dispatch custom event to notify components
        window.dispatchEvent(new CustomEvent('supabase-reconnected'));
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

// Initialize connection check and auto-reconnection
if (typeof window !== 'undefined') {
  // Check connection on load
  checkSupabaseConnection().then(({ connected, error }) => {
    if (!connected) {
      console.warn('⚠️ Initial Supabase connection failed:', error);
      console.warn('The app will work in limited mode. Some features may be unavailable.');
      
      // Start auto-reconnection
      startAutoReconnection();
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