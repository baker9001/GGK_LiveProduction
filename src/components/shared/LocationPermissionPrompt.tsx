/**
 * File: /src/components/shared/LocationPermissionPrompt.tsx
 *
 * A subtle, non-intrusive prompt for requesting location permission.
 * Displays when we're using IP-based location and browser permission is available.
 *
 * Features:
 *   - Only shows when permission state is 'prompt' (not granted/denied)
 *   - Dismissible by user
 *   - Explains the benefit of sharing precise location
 *   - Handles permission request flow
 */

import React, { useState, useEffect } from 'react';
import { MapPin, X, Navigation } from 'lucide-react';
import clsx from 'clsx';
import type { PermissionState } from '@/lib/geolocation';

interface LocationPermissionPromptProps {
  /** Current permission state */
  permissionState: PermissionState;
  /** Whether we're currently using high-accuracy location */
  isHighAccuracy: boolean;
  /** Handler to request permission */
  onRequestPermission: () => Promise<boolean>;
  /** Optional className for styling */
  className?: string;
}

const DISMISS_KEY = 'ggk_location_prompt_dismissed';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function isDismissed(): boolean {
  try {
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (!dismissed) return false;
    const timestamp = parseInt(dismissed, 10);
    if (Date.now() - timestamp > DISMISS_DURATION_MS) {
      localStorage.removeItem(DISMISS_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function setDismissed(): void {
  try {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
  } catch {
    // Ignore storage errors
  }
}

export function LocationPermissionPrompt({
  permissionState,
  isHighAccuracy,
  onRequestPermission,
  className
}: LocationPermissionPromptProps) {
  const [visible, setVisible] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    // Only show if:
    // 1. Permission is in 'prompt' state (never asked)
    // 2. We're not already using high-accuracy location
    // 3. User hasn't dismissed the prompt recently
    const shouldShow =
      permissionState === 'prompt' &&
      !isHighAccuracy &&
      !isDismissed();

    // Delay showing to avoid flash on initial load
    if (shouldShow) {
      const timer = setTimeout(() => setVisible(true), 2000);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [permissionState, isHighAccuracy]);

  const handleDismiss = () => {
    setDismissed();
    setVisible(false);
  };

  const handleEnableLocation = async () => {
    setRequesting(true);
    try {
      const granted = await onRequestPermission();
      if (granted) {
        setVisible(false);
      } else {
        // Permission was denied, hide the prompt
        setVisible(false);
      }
    } finally {
      setRequesting(false);
    }
  };

  if (!visible) return null;

  return (
    <div
      className={clsx(
        'flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3',
        'text-sm text-amber-800 shadow-sm',
        'dark:border-amber-500/30 dark:bg-amber-900/20 dark:text-amber-200',
        'animate-in fade-in slide-in-from-top-2 duration-300',
        className
      )}
      role="alert"
    >
      <MapPin className="h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />

      <div className="flex-1 min-w-0">
        <p className="font-medium">Get precise local weather</p>
        <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
          Enable location access for accurate weather at your exact location instead of approximate IP-based location.
        </p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleEnableLocation}
          disabled={requesting}
          className={clsx(
            'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5',
            'bg-amber-600 text-white text-xs font-medium',
            'hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-colors'
          )}
        >
          {requesting ? (
            <>
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Requesting...
            </>
          ) : (
            <>
              <Navigation className="h-3 w-3" />
              Enable
            </>
          )}
        </button>

        <button
          onClick={handleDismiss}
          className={clsx(
            'p-1 rounded text-amber-600 hover:text-amber-800 hover:bg-amber-100',
            'dark:text-amber-400 dark:hover:text-amber-200 dark:hover:bg-amber-800/30',
            'focus:outline-none focus:ring-2 focus:ring-amber-500',
            'transition-colors'
          )}
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default LocationPermissionPrompt;
