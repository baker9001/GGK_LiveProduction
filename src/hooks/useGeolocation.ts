/**
 * File: /src/hooks/useGeolocation.ts
 *
 * React hook for geolocation with permission state management.
 *
 * Features:
 *   - Automatic location fetching on mount
 *   - Permission state tracking
 *   - Loading and error states
 *   - Manual refresh capability
 *   - Permission request handler
 *
 * Usage:
 *   const {
 *     location,
 *     isLoading,
 *     error,
 *     permissionState,
 *     refresh,
 *     requestPermission
 *   } = useGeolocation();
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getLocation,
  getPermissionState,
  requestLocationPermission,
  onPermissionChange,
  clearLocationCache,
  type GeoLocationResult,
  type GeolocationOptions,
  type PermissionState
} from '@/lib/geolocation/geolocationService';

export interface UseGeolocationOptions extends GeolocationOptions {
  /** Disable automatic location fetching on mount. Default: false */
  manual?: boolean;
  /** Auto-retry on error after this many milliseconds. 0 to disable. Default: 30000 */
  retryInterval?: number;
}

export interface UseGeolocationResult {
  /** The current location data, or null if not yet fetched */
  location: GeoLocationResult | null;
  /** Whether location is currently being fetched */
  isLoading: boolean;
  /** Error message if location fetch failed */
  error: string | null;
  /** Current permission state for browser geolocation */
  permissionState: PermissionState;
  /** Whether we're using high-accuracy browser location vs IP fallback */
  isHighAccuracy: boolean;
  /** Manually refresh location (bypasses cache) */
  refresh: () => Promise<void>;
  /** Request browser location permission */
  requestPermission: () => Promise<boolean>;
  /** Clear cached location */
  clearCache: () => void;
}

export function useGeolocation(options: UseGeolocationOptions = {}): UseGeolocationResult {
  const {
    manual = false,
    retryInterval = 30000,
    ...geolocationOptions
  } = options;

  const [location, setLocation] = useState<GeoLocationResult | null>(null);
  const [isLoading, setIsLoading] = useState(!manual);
  const [error, setError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<PermissionState>('prompt');

  const retryTimeoutRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  // Fetch permission state on mount
  useEffect(() => {
    getPermissionState().then(state => {
      if (mountedRef.current) {
        setPermissionState(state);
      }
    });

    // Subscribe to permission changes
    const unsubscribe = onPermissionChange(state => {
      if (mountedRef.current) {
        setPermissionState(state);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (retryTimeoutRef.current) {
        window.clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  const fetchLocation = useCallback(async (skipCache = false) => {
    // Clear any pending retry
    if (retryTimeoutRef.current) {
      window.clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    // Don't set loading if we already have a location (background refresh)
    setIsLoading(prev => location === null || skipCache ? true : prev);
    setError(null);

    try {
      const result = await getLocation({
        ...geolocationOptions,
        skipCache
      });

      if (mountedRef.current) {
        setLocation(result);
        setIsLoading(false);
        setError(null);
      }
    } catch (err) {
      if (mountedRef.current) {
        const message = err instanceof Error ? err.message : 'Failed to get location';
        setError(message);
        setIsLoading(false);

        // Schedule retry if enabled
        if (retryInterval > 0) {
          console.log(`[useGeolocation] Will retry in ${retryInterval / 1000}s`);
          retryTimeoutRef.current = window.setTimeout(() => {
            if (mountedRef.current) {
              fetchLocation(true);
            }
          }, retryInterval);
        }
      }
    }
  }, [geolocationOptions, retryInterval, location]);

  // Fetch location on mount (unless manual mode)
  useEffect(() => {
    if (!manual) {
      fetchLocation();
    }
  }, [manual]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = useCallback(async () => {
    await fetchLocation(true);
  }, [fetchLocation]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await requestLocationPermission();
      if (mountedRef.current) {
        if (result) {
          setLocation(result);
          setPermissionState('granted');
          setIsLoading(false);
          return true;
        } else {
          setPermissionState('denied');
          setIsLoading(false);
          // Fall back to IP location
          await fetchLocation();
          return false;
        }
      }
      return false;
    } catch (err) {
      if (mountedRef.current) {
        setPermissionState('denied');
        setIsLoading(false);
        // Fall back to IP location
        await fetchLocation();
      }
      return false;
    }
  }, [fetchLocation]);

  const clearCache = useCallback(() => {
    clearLocationCache();
    setLocation(null);
  }, []);

  const isHighAccuracy = location?.source === 'browser';

  return {
    location,
    isLoading,
    error,
    permissionState,
    isHighAccuracy,
    refresh,
    requestPermission,
    clearCache
  };
}

export default useGeolocation;
