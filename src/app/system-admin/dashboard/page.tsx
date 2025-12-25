// /src/app/system-admin/dashboard/page.tsx
//
// Enhanced with browser geolocation support for accurate user location.
// Uses GPS/WiFi on supported devices with IP-based fallback.

import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import {
  Building2,
  Users,
  Key,
  ClipboardList,
  FlaskConical,
  MapPin,
  Thermometer,
  Clock3,
  Navigation
} from 'lucide-react';
import { Button } from '../../../components/shared/Button';
import { TestAnyUserModal } from '../../../components/admin/TestAnyUserModal';
import { getRealAdminUser, isInTestMode } from '../../../lib/auth';
import { getPreferredName, getTimeBasedGreeting } from '../../../lib/greeting';
import { LoadingSpinner } from '../../../components/shared/LoadingSpinner';
import { useGeolocation } from '@/hooks/useGeolocation';
import { LocationPermissionPrompt } from '@/components/shared/LocationPermissionPrompt';

interface EnvironmentSnapshot {
  locationLabel: string;
  temperatureC: number;
  temperatureF: number;
  condition: string;
  timezone?: string;
  fetchedAt: Date;
  isHighAccuracy?: boolean;
}

type EnvironmentStatus = 'idle' | 'loading' | 'ready' | 'error';

const weatherCodeDescriptions: Record<number, string> = {
  0: 'Clear skies',
  1: 'Mostly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Foggy',
  48: 'Icy fog',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Steady drizzle',
  61: 'Light rain',
  63: 'Rain showers',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Icy rain',
  71: 'Light snow',
  73: 'Snowfall',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Scattered showers',
  81: 'Frequent showers',
  82: 'Intense showers',
  85: 'Snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorms',
  96: 'Storms with hail',
  99: 'Severe storms'
};

const DASHBOARD_PRIORITIES = [
  'Review pending license approvals',
  'Check onboarding progress for new cohorts',
  'Share insights with regional leads'
];

function getWeatherDescription(code: number | undefined): string {
  if (typeof code !== 'number') {
    return 'Conditions unavailable';
  }

  return weatherCodeDescriptions[code] ?? 'Outdoor conditions unavailable';
}

interface EnvironmentSummaryProps {
  environment: EnvironmentSnapshot | null;
  status: EnvironmentStatus;
  timeDisplay: string;
  isHighAccuracy?: boolean;
}

function EnvironmentSummary({ environment, status, timeDisplay, isHighAccuracy }: EnvironmentSummaryProps) {
  const temperatureSummary = environment
    ? `${Math.round(environment.temperatureC)}°C / ${Math.round(environment.temperatureF)}°F`
    : null;

  return (
    <div className="w-full min-w-[280px] max-w-sm rounded-2xl border border-indigo-200/70 bg-white/90 px-5 py-4 text-indigo-900 shadow-sm backdrop-blur-sm transition-shadow hover:shadow-md dark:border-indigo-500/40 dark:bg-indigo-950/60 dark:text-indigo-100">
      {/* Header row with icon and weather info */}
      <div className="flex items-start gap-3.5">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-600 dark:bg-indigo-500/25 dark:text-indigo-200">
          <Thermometer className="h-5 w-5" />
        </div>
        <div className="flex flex-col gap-0.5 pt-0.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-indigo-500 dark:text-indigo-300">
            Local outlook
          </span>
          {status === 'loading' && (
            <span className="flex items-center gap-2 text-sm font-medium text-indigo-800 dark:text-indigo-100">
              <LoadingSpinner
                size="xs"
                inline
                centered={false}
                showLogo={false}
                className="flex-row !gap-1"
              />
              Checking nearby weather…
            </span>
          )}
          {status === 'error' && (
            <span className="text-sm font-medium text-indigo-800 dark:text-indigo-100">
              Weather data is unavailable right now.
            </span>
          )}
          {status === 'ready' && temperatureSummary && (
            <span className="text-sm font-semibold text-indigo-900 dark:text-white">
              {temperatureSummary} • {environment?.condition}
            </span>
          )}
        </div>
      </div>

      {/* Location and time row */}
      <div className="mt-3.5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-indigo-100/50 pt-3 text-xs font-medium text-indigo-600 dark:border-indigo-500/20 dark:text-indigo-200/80">
        <span className="flex items-center gap-1.5">
          {isHighAccuracy ? (
            <Navigation className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <MapPin className="h-3.5 w-3.5" />
          )}
          {environment?.locationLabel ?? 'Locating you'}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock3 className="h-3.5 w-3.5" />
          {timeDisplay} local time
        </span>
      </div>

      {/* Status indicator */}
      {status === 'ready' && environment && (
        <div className="mt-2.5 flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            Updated moments ago
          </span>
          {isHighAccuracy && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <Navigation className="h-3 w-3" />
              Precise
            </span>
          )}
        </div>
      )}

      {status === 'error' && (
        <p className="mt-2.5 text-xs font-normal leading-relaxed text-indigo-500/80 dark:text-indigo-200/70">
          You can continue monitoring metrics while we retry in the background.
        </p>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [showTestModal, setShowTestModal] = useState(false);
  const [environment, setEnvironment] = useState<EnvironmentSnapshot | null>(null);
  const [environmentStatus, setEnvironmentStatus] = useState<EnvironmentStatus>('idle');
  const [timeDisplay, setTimeDisplay] = useState<string>(() =>
    new Intl.DateTimeFormat([], { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date())
  );

  // Use the enhanced geolocation hook with browser API support
  const {
    location: geoLocation,
    isLoading: geoLoading,
    error: geoError,
    permissionState,
    isHighAccuracy,
    requestPermission
  } = useGeolocation({ retryInterval: 30000 });

  const realAdmin = getRealAdminUser();
  const isSSA = realAdmin?.role === 'SSA';
  const inTestMode = isInTestMode();

  const greeting = getTimeBasedGreeting();
  const preferredName = getPreferredName(realAdmin?.name) ?? 'Admin';

  // Fetch weather when we have location coordinates
  useEffect(() => {
    if (!geoLocation) {
      setEnvironmentStatus(geoLoading ? 'loading' : (geoError ? 'error' : 'idle'));
      return;
    }

    let cancelled = false;

    async function fetchWeather() {
      try {
        setEnvironmentStatus(prev => (prev === 'ready' ? prev : 'loading'));

        // Fetch weather data from Open-Meteo
        const weatherUrl = new URL('https://api.open-meteo.com/v1/forecast');
        weatherUrl.searchParams.set('latitude', geoLocation.latitude.toString());
        weatherUrl.searchParams.set('longitude', geoLocation.longitude.toString());
        weatherUrl.searchParams.set('current_weather', 'true');

        const weatherResponse = await fetch(weatherUrl.toString(), {
          signal: AbortSignal.timeout(10000)
        });

        if (!weatherResponse.ok) {
          throw new Error(`Failed to fetch weather: ${weatherResponse.status}`);
        }

        const weatherData: {
          current_weather?: { temperature?: number; weathercode?: number };
        } = await weatherResponse.json();

        const temperatureC = Number(weatherData.current_weather?.temperature);
        const weatherCode = Number(weatherData.current_weather?.weathercode);

        if (!Number.isFinite(temperatureC)) {
          throw new Error('Weather response missing temperature');
        }

        // Build location label from available data
        const locationParts = [geoLocation.city, geoLocation.regionCode ?? geoLocation.region]
          .map(part => (typeof part === 'string' && part.trim() ? part.trim() : null))
          .filter((part): part is string => Boolean(part));

        const locationLabel = locationParts.join(', ') || geoLocation.country || 'your area';

        if (cancelled) return;

        const snapshot: EnvironmentSnapshot = {
          locationLabel,
          temperatureC,
          temperatureF: (temperatureC * 9) / 5 + 32,
          condition: getWeatherDescription(weatherCode),
          timezone: geoLocation.timezone,
          fetchedAt: new Date(),
          isHighAccuracy: geoLocation.source === 'browser'
        };

        console.log(
          '[Dashboard] Environment snapshot loaded:',
          locationLabel,
          `${Math.round(temperatureC)}°C`,
          `(${geoLocation.source}${geoLocation.accuracy ? `, ±${Math.round(geoLocation.accuracy)}m` : ''})`
        );
        setEnvironment(snapshot);
        setEnvironmentStatus('ready');
      } catch (error) {
        console.error('[Dashboard] Failed to fetch weather:', error);
        if (!cancelled) {
          setEnvironmentStatus('error');
        }
      }
    }

    fetchWeather();

    return () => {
      cancelled = true;
    };
  }, [geoLocation, geoLoading, geoError]);

  useEffect(() => {
    const targetTimezone = environment?.timezone;

    function updateTimeDisplay() {
      try {
        const formatter = new Intl.DateTimeFormat([], {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
          timeZone: targetTimezone
        });
        setTimeDisplay(formatter.format(new Date()));
      } catch (error) {
        console.warn('[Dashboard] Failed to format time for timezone:', targetTimezone, error);
        setTimeDisplay(
          new Intl.DateTimeFormat([], { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date())
        );
      }
    }

    updateTimeDisplay();
    const interval = window.setInterval(updateTimeDisplay, 60_000);
    return () => window.clearInterval(interval);
  }, [environment?.timezone]);

  return (
    <div className="p-6 space-y-6">
      {/* Header with Test Mode Button */}
      <section
        className={clsx(
          'relative overflow-hidden rounded-2xl border border-gray-200',
          'bg-gradient-to-r from-indigo-50 via-white to-purple-50 shadow-sm',
          'dark:border-gray-700 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950'
        )}
        aria-live="polite"
      >
        {/* Decorative blur element */}
        <div
          className={clsx(
            'pointer-events-none absolute -right-16 -top-8 hidden h-56 w-56 rounded-full',
            'bg-indigo-200/40 blur-3xl sm:block dark:bg-indigo-500/10'
          )}
          aria-hidden="true"
        />
        <div
          className={clsx(
            'pointer-events-none absolute -left-8 bottom-0 hidden h-32 w-32 rounded-full',
            'bg-purple-200/30 blur-2xl lg:block dark:bg-purple-500/10'
          )}
          aria-hidden="true"
        />

        {/* Content container with improved padding */}
        <div className="relative px-6 py-6 lg:px-8 lg:py-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            {/* Left side: Greeting and description */}
            <div className="flex-1 min-w-0 lg:max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
                {greeting}, {preferredName}
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-gray-900 sm:text-3xl dark:text-white">
                Here's what's happening across your organization today.
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                Stay ahead of adoption, licensing, and engagement trends with a quick scan of live metrics
                and local operating conditions.
              </p>
              <div className="mt-5 flex flex-wrap gap-2.5">
                {DASHBOARD_PRIORITIES.map(priority => (
                  <span
                    key={priority}
                    className="inline-flex items-center gap-2 rounded-full bg-indigo-100/80 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-100 dark:bg-indigo-500/20 dark:text-indigo-100 dark:hover:bg-indigo-500/30"
                  >
                    <span className="inline-flex h-1.5 w-1.5 rounded-full bg-indigo-500 dark:bg-indigo-300" />
                    {priority}
                  </span>
                ))}
              </div>
            </div>

            {/* Right side: Environment summary and test button */}
            <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-end lg:flex-col lg:items-end lg:ml-8 xl:ml-12">
              <EnvironmentSummary
                environment={environment}
                status={environmentStatus}
                timeDisplay={timeDisplay}
                isHighAccuracy={isHighAccuracy}
              />

              {/* Test Mode Button - Only show for SSA and not already in test mode */}
              {isSSA && !inTestMode && (
                <Button
                  onClick={() => setShowTestModal(true)}
                  variant="outline"
                  leftIcon={<FlaskConical className="h-4 w-4" />}
                  className={clsx(
                    'w-full sm:w-auto border-indigo-500 text-indigo-600 backdrop-blur hover:bg-indigo-50',
                    'dark:border-indigo-500/50 dark:text-indigo-200 dark:hover:bg-indigo-500/10'
                  )}
                >
                  Test as User
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Location Permission Prompt - shows when using IP location and permission not yet requested */}
      <LocationPermissionPrompt
        permissionState={permissionState}
        isHighAccuracy={isHighAccuracy}
        onRequestPermission={requestPermission}
      />

      {/* Simple Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Companies</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">24</p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-2">+2 this month</p>
            </div>
            <Building2 className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Users</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">1,234</p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-2">+48 this week</p>
            </div>
            <Users className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Licenses</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">892</p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">86% utilization</p>
            </div>
            <Key className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">License Requests</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">8</p>
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">Pending approval</p>
            </div>
            <ClipboardList className="h-8 w-8 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Recent Activity
          </h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-2 h-2 mt-2 bg-green-400 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-900 dark:text-white">
                  <span className="font-medium">Sarah Johnson</span> added new company
                  <span className="font-medium ml-1">Eco Innovations</span>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">12:30 PM</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-2 h-2 mt-2 bg-blue-400 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-900 dark:text-white">
                  <span className="font-medium">Mike Brown</span> updated user role
                  <span className="font-medium ml-1">Sustainable Corp</span>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">11:45 AM</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-2 h-2 mt-2 bg-yellow-400 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-900 dark:text-white">
                  <span className="font-medium">John Smith</span> allocated license
                  <span className="font-medium ml-1">Green Tech Solutions</span>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">10:15 AM</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Test Any User Modal */}
      <TestAnyUserModal
        isOpen={showTestModal}
        onClose={() => setShowTestModal(false)}
      />
    </div>
  );
}