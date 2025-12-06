// /src/app/system-admin/dashboard/page.tsx

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
  Clock3
} from 'lucide-react';
import { Button } from '../../../components/shared/Button';
import { TestAnyUserModal } from '../../../components/admin/TestAnyUserModal';
import { getRealAdminUser, isInTestMode } from '../../../lib/auth';
import { getPreferredName, getTimeBasedGreeting } from '../../../lib/greeting';
import { LoadingSpinner } from '../../../components/shared/LoadingSpinner';

interface EnvironmentSnapshot {
  locationLabel: string;
  temperatureC: number;
  temperatureF: number;
  condition: string;
  timezone?: string;
  fetchedAt: Date;
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
}

function EnvironmentSummary({ environment, status, timeDisplay }: EnvironmentSummaryProps) {
  const temperatureSummary = environment
    ? `${Math.round(environment.temperatureC)}°C / ${Math.round(environment.temperatureF)}°F`
    : null;

  return (
    <div className="w-full max-w-sm rounded-2xl border border-indigo-200/70 bg-white/80 p-4 text-indigo-900 shadow-sm backdrop-blur dark:border-indigo-500/40 dark:bg-indigo-950/50 dark:text-indigo-100">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-700 dark:bg-indigo-500/25 dark:text-indigo-100">
          <Thermometer className="h-5 w-5" />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-indigo-500 dark:text-indigo-300">
            Local outlook
          </span>
          {status === 'loading' && (
            <span className="flex items-center gap-2 text-sm font-medium">
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
            <span className="text-sm font-medium">Weather data is unavailable right now.</span>
          )}
          {status === 'ready' && temperatureSummary && (
            <span className="text-sm font-semibold">
              {temperatureSummary} • {environment?.condition}
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-indigo-700 dark:text-indigo-200/80">
        <span className="flex items-center gap-1">
          <MapPin className="h-4 w-4" />
          {environment?.locationLabel ?? 'Locating you'}
        </span>
        <span className="flex items-center gap-1">
          <Clock3 className="h-4 w-4" />
          {timeDisplay} local time
        </span>
        {status === 'ready' && environment && (
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Updated moments ago
          </span>
        )}
      </div>

      {status === 'error' && (
        <p className="mt-2 text-xs font-normal text-indigo-500/80 dark:text-indigo-200/70">
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

  const realAdmin = getRealAdminUser();
  const isSSA = realAdmin?.role === 'SSA';
  const inTestMode = isInTestMode();

  const greeting = getTimeBasedGreeting();
  const preferredName = getPreferredName(realAdmin?.name) ?? 'Admin';

  useEffect(() => {
    let cancelled = false;
    let retryTimer: number | undefined;

    async function loadEnvironmentSnapshot() {
      try {
        setEnvironmentStatus(previous => (previous === 'ready' ? previous : 'loading'));

        const locationResponse = await fetch('https://ipapi.co/json/');
        if (!locationResponse.ok) {
          throw new Error('Failed to determine location');
        }

        const locationData: {
          city?: string;
          region?: string;
          region_code?: string;
          country_name?: string;
          latitude?: number | string;
          longitude?: number | string;
          timezone?: string;
        } = await locationResponse.json();

        const latitude = Number(locationData.latitude);
        const longitude = Number(locationData.longitude);

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          throw new Error('Location did not include coordinates');
        }

        const weatherUrl = new URL('https://api.open-meteo.com/v1/forecast');
        weatherUrl.searchParams.set('latitude', latitude.toString());
        weatherUrl.searchParams.set('longitude', longitude.toString());
        weatherUrl.searchParams.set('current_weather', 'true');

        const weatherResponse = await fetch(weatherUrl.toString());
        if (!weatherResponse.ok) {
          throw new Error('Failed to fetch weather');
        }

        const weatherData: {
          current_weather?: { temperature?: number; weathercode?: number };
        } = await weatherResponse.json();

        const temperatureC = Number(weatherData.current_weather?.temperature);
        const weatherCode = Number(weatherData.current_weather?.weathercode);

        if (!Number.isFinite(temperatureC)) {
          throw new Error('Weather response missing temperature');
        }

        const locationParts = [locationData.city, locationData.region_code ?? locationData.region]
          .map(part => (typeof part === 'string' && part.trim() ? part.trim() : null))
          .filter((part): part is string => Boolean(part));

        const locationLabel = locationParts.join(', ') || locationData.country_name || 'your area';

        if (cancelled) {
          return;
        }

        const snapshot: EnvironmentSnapshot = {
          locationLabel,
          temperatureC,
          temperatureF: (temperatureC * 9) / 5 + 32,
          condition: getWeatherDescription(weatherCode),
          timezone: locationData.timezone,
          fetchedAt: new Date()
        };

        setEnvironment(snapshot);
        setEnvironmentStatus('ready');
      } catch (error) {
        console.warn('[Dashboard] Failed to load environment snapshot:', error);
        if (!cancelled) {
          setEnvironmentStatus('error');
          retryTimer = window.setTimeout(() => {
            loadEnvironmentSnapshot();
          }, 60_000);
        }
      }
    }

    loadEnvironmentSnapshot();

    return () => {
      cancelled = true;
      if (retryTimer) {
        window.clearTimeout(retryTimer);
      }
    };
  }, []);

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
          'bg-gradient-to-r from-indigo-50 via-white to-purple-50 p-6 shadow-sm',
          'dark:border-gray-700 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950'
        )}
        aria-live="polite"
      >
        <div
          className={clsx(
            'pointer-events-none absolute -right-12 top-0 hidden h-40 w-40 rounded-full',
            'bg-indigo-200/50 blur-3xl sm:block dark:bg-indigo-500/10'
          )}
          aria-hidden="true"
        />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
              {greeting}, {preferredName}
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">
              Here's what's happening across your organization today.
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-gray-600 dark:text-gray-300">
              Stay ahead of adoption, licensing, and engagement trends with a quick scan of live metrics
              and local operating conditions.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {DASHBOARD_PRIORITIES.map(priority => (
                <span
                  key={priority}
                  className="inline-flex items-center gap-2 rounded-full bg-indigo-100/80 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-100"
                >
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-indigo-500 dark:bg-indigo-300" />
                  {priority}
                </span>
              ))}
            </div>
          </div>

          <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:items-end">
            <EnvironmentSummary environment={environment} status={environmentStatus} timeDisplay={timeDisplay} />

            {/* Test Mode Button - Only show for SSA and not already in test mode */}
            {isSSA && !inTestMode && (
              <Button
                onClick={() => setShowTestModal(true)}
                variant="outline"
                leftIcon={<FlaskConical className="h-4 w-4" />}
                className={clsx(
                  'border-indigo-500 text-indigo-600 backdrop-blur hover:bg-indigo-50',
                  'dark:border-indigo-500/50 dark:text-indigo-200 dark:hover:bg-indigo-500/10'
                )}
              >
                Test as User
              </Button>
            )}
          </div>
        </div>
      </section>

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