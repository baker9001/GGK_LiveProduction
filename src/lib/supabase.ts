//home/project/src/lib/supabase.ts

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? 'Present' : 'Missing');
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Present' : 'Missing');
  console.error('Current VITE_SUPABASE_URL value:', supabaseUrl);
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

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      // Removed 'Content-Type': 'application/json' to allow proper MIME type detection for file uploads
    }
  },
  // Add fetch options with longer timeout
  fetch: (url, options) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    return fetch(url, {
      ...options,
      signal: options?.signal || controller.signal
    }).finally(() => {
      clearTimeout(timeoutId);
    });
  }
});

// Helper function to handle Supabase errors
export const handleSupabaseError = (error: any) => {
  console.error('Supabase error:', error);
  throw new Error(error.message || 'An error occurred while connecting to the database');
};