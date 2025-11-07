/**
 * File: /src/hooks/useAuthQuery.ts
 *
 * Custom React Query hooks with built-in session expiration handling
 */

import { useEffect } from 'react';
import { useQuery, useMutation, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { supabaseAuthQuery } from '../lib/supabase';
import { clearAuthenticatedUser, markSessionExpired } from '../lib/auth';

// Check if error is session expiration
function isSessionExpirationError(error: any): boolean {
  const errorCode = error?.code || '';
  const errorMessage = error?.message || '';

  return (
    errorCode === 'PGRST000' ||
    errorCode === 'PGRST301' ||
    errorCode === '42501' ||
    errorCode === 'AUTH_ERROR' ||
    errorMessage.includes('JWT') ||
    errorMessage.includes('expired') ||
    errorMessage.includes('authentication') ||
    errorMessage.includes('Session expired')
  );
}

// Handle session expiration
function handleSessionExpiration(): void {
  console.error('[useAuthQuery] Session expiration detected');
  clearAuthenticatedUser();
  markSessionExpired('Your session has expired. Please sign in again to continue.');

  if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/signin')) {
    window.location.replace('/signin');
  }
}

/**
 * Custom useQuery hook with session expiration handling
 */
export function useAuthQuery<T>(
  queryKey: any[],
  queryFn: () => Promise<{ data: T | null; error: any }>,
  options?: Omit<UseQueryOptions<T, any>, 'queryKey' | 'queryFn'>
) {
  const { onError, retry: retryOption, ...restOptions } = options ?? {};

  const queryResult = useQuery<T, any>({
    queryKey,
    queryFn: async () => {
      const result = await supabaseAuthQuery<T>(queryFn, queryKey.join('/'));

      if (result.error) {
        if (isSessionExpirationError(result.error)) {
          handleSessionExpiration();
        }
        throw result.error;
      }

      if (result.data === null) {
        throw new Error('No data returned from query');
      }

      return result.data;
    },
    retry: (failureCount, error) => {
      // Don't retry on session expiration
      if (isSessionExpirationError(error)) {
        return false;
      }

      if (typeof retryOption === 'function') {
        return (retryOption as (failureCount: number, error: any) => boolean | number)(failureCount, error);
      }

      if (typeof retryOption === 'number') {
        return failureCount < retryOption;
      }

      if (typeof retryOption === 'boolean') {
        return retryOption;
      }

      return failureCount < 1;
    },
    ...restOptions,
  });

  useEffect(() => {
    if (!queryResult.error) {
      return;
    }

    if (isSessionExpirationError(queryResult.error)) {
      handleSessionExpiration();
    }

    onError?.(queryResult.error);
  }, [queryResult.error, onError]);

  return queryResult;
}

/**
 * Custom useMutation hook with session expiration handling
 */
export function useAuthMutation<TData = unknown, TVariables = unknown>(
  mutationFn: (variables: TVariables) => Promise<{ data: TData | null; error: any }>,
  options?: Omit<UseMutationOptions<TData, any, TVariables>, 'mutationFn'>
) {
  return useMutation<TData, any, TVariables>({
    mutationFn: async (variables: TVariables) => {
      const result = await supabaseAuthQuery<TData>(
        () => mutationFn(variables),
        'mutation'
      );

      if (result.error) {
        if (isSessionExpirationError(result.error)) {
          handleSessionExpiration();
        }
        throw result.error;
      }

      if (result.data === null) {
        throw new Error('No data returned from mutation');
      }

      return result.data;
    },
    retry: (failureCount, error) => {
      // Don't retry on session expiration
      if (isSessionExpirationError(error)) {
        return false;
      }
      return false; // Don't retry mutations by default
    },
    onError: (error, variables, context) => {
      if (isSessionExpirationError(error)) {
        handleSessionExpiration();
      }
      options?.onError?.(error, variables, context);
    },
    ...options,
  });
}
