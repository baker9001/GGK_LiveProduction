import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { handleSupabaseError } from '../lib/supabase';
import { clearAuthenticatedUser, markSessionExpired } from '../lib/auth';

// Check if error is session expiration
function isSessionExpirationError(error: any): boolean {
  const errorCode = error?.code || '';
  const errorMessage = error?.message || '';

  return (
    errorCode === 'PGRST000' ||
    errorCode === 'PGRST301' ||
    errorCode === '42501' ||
    errorMessage.includes('JWT') ||
    errorMessage.includes('expired') ||
    errorMessage.includes('authentication') ||
    errorMessage.includes('Session expired')
  );
}

// Global error handler for queries
function handleQueryError(error: any): void {
  console.error('[ReactQuery] Query error:', error);

  if (isSessionExpirationError(error)) {
    // CRITICAL FIX: Check test mode exit flag before expiring session
    try {
      const testModeExiting = localStorage.getItem('test_mode_exiting');
      if (testModeExiting) {
        console.log('[ReactQuery] Skipping expiration - test mode exit in progress');
        return;
      }
    } catch (err) {
      console.warn('[ReactQuery] Error checking test mode exit flag:', err);
    }

    console.error('[ReactQuery] Session expiration detected in query');
    clearAuthenticatedUser();
    markSessionExpired('Your session has expired. Please sign in again to continue.');

    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/signin')) {
      window.location.replace('/signin');
    }
  }
}

// Global error handler for mutations
function handleMutationError(error: any): void {
  console.error('[ReactQuery] Mutation error:', error);

  if (isSessionExpirationError(error)) {
    // CRITICAL FIX: Check test mode exit flag before expiring session
    try {
      const testModeExiting = localStorage.getItem('test_mode_exiting');
      if (testModeExiting) {
        console.log('[ReactQuery] Skipping expiration - test mode exit in progress');
        return;
      }
    } catch (err) {
      console.warn('[ReactQuery] Error checking test mode exit flag:', err);
    }

    console.error('[ReactQuery] Session expiration detected in mutation');
    clearAuthenticatedUser();
    markSessionExpired('Your session has expired. Please sign in again to continue.');

    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/signin')) {
      window.location.replace('/signin');
    }
  }
}

// Create a client with enhanced error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error) => {
        // Don't retry on session expiration
        if (isSessionExpirationError(error)) {
          return false;
        }
        // Retry once for other errors
        return failureCount < 1;
      },
      onError: handleQueryError,
    },
    mutations: {
      retry: (failureCount, error) => {
        // Don't retry on session expiration
        if (isSessionExpirationError(error)) {
          return false;
        }
        return false; // Don't retry mutations by default
      },
      onError: handleMutationError,
    },
  },
});

interface ReactQueryProviderProps {
  children: React.ReactNode;
}

export function ReactQueryProvider({ children }: ReactQueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}