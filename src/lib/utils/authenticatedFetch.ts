import { supabase } from '../supabase';

interface FetchOptions {
  method?: string;
  headers?: Record<string, string>;
  retryAttempts?: number;
  signal?: AbortSignal;
}

export class AuthenticatedFetchError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'AuthenticatedFetchError';
  }
}

export async function fetchWithAuth(
  url: string,
  options: FetchOptions = {}
): Promise<ArrayBuffer> {
  const { method = 'GET', headers = {}, retryAttempts = 2, signal } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retryAttempts; attempt++) {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new AuthenticatedFetchError(
          'No active session. Please sign in again.',
          401
        );
      }

      const authHeaders: Record<string, string> = {
        'Authorization': `Bearer ${session.access_token}`,
        ...headers,
      };

      const response = await fetch(url, {
        method,
        headers: authHeaders,
        credentials: 'include',
        signal,
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new AuthenticatedFetchError(
            'Authentication failed. Please sign in again.',
            response.status
          );
        }

        if (response.status === 404) {
          throw new AuthenticatedFetchError(
            'File not found.',
            404
          );
        }

        throw new AuthenticatedFetchError(
          `Failed to fetch file: ${response.statusText}`,
          response.status
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      return arrayBuffer;

    } catch (error) {
      lastError = error as Error;

      if (error instanceof AuthenticatedFetchError) {
        if (error.statusCode === 401 && attempt < retryAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        throw error;
      }

      if (signal?.aborted) {
        throw new AuthenticatedFetchError('Request cancelled by user');
      }

      if (attempt === retryAttempts) {
        throw new AuthenticatedFetchError(
          `Failed to fetch file after ${retryAttempts + 1} attempts`,
          undefined,
          error as Error
        );
      }

      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }

  throw lastError || new AuthenticatedFetchError('Unknown error occurred');
}

export async function fetchBlobWithAuth(
  url: string,
  options: FetchOptions = {}
): Promise<Blob> {
  const arrayBuffer = await fetchWithAuth(url, options);
  const contentType = options.headers?.['Content-Type'] || 'application/octet-stream';
  return new Blob([arrayBuffer], { type: contentType });
}

export async function createBlobUrl(
  url: string,
  mimeType?: string
): Promise<string> {
  try {
    const blob = await fetchBlobWithAuth(url, {
      headers: mimeType ? { 'Content-Type': mimeType } : {},
    });

    const blobUrl = URL.createObjectURL(blob);
    return blobUrl;
  } catch (error) {
    console.error('Error creating blob URL:', error);
    throw error;
  }
}

export function revokeBlobUrl(blobUrl: string): void {
  if (blobUrl.startsWith('blob:')) {
    URL.revokeObjectURL(blobUrl);
  }
}
