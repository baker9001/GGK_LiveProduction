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
      gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)
      retry: (failureCount, error) => {
        // Don't retry on session expiration
        if (isSessionExpirationError(error)) {
          return false;
        }
        // Retry once for other errors
        return failureCount < 1;
      },
      throwOnError: (error) => {
        // Handle session expiration errors globally
        if (isSessionExpirationError(error)) {
          handleQueryError(error);
          return false; // Don't throw, we handle it
        }
        return false; // Don't throw by default
      },
    },
    mutations: {
      retry: (failureCount, error) => {
        // Don't retry on session expiration
        if (isSessionExpirationError(error)) {
          return false;
        }
        return false; // Don't retry mutations by default
      },
      throwOnError: (error) => {
        // Handle session expiration errors globally
        if (isSessionExpirationError(error)) {
          handleMutationError(error);
          return false; // Don't throw, we handle it
        }
        return false; // Don't throw by default
      },
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