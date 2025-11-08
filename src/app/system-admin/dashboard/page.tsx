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
  Clock3,
  Loader2
} from 'lucide-react';
import { Button } from '../../../components/shared/Button';
import { TestAnyUserModal } from '../../../components/admin/TestAnyUserModal';
import { getRealAdminUser, isInTestMode } from '../../../lib/auth';
import { getPreferredName, getTimeBasedGreeting } from '../../../lib/greeting';

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
    <div className="w-full max-w-sm rounded-2xl border border-brand/30 bg-gradient-to-br from-white to-green-50/50 p-4 text-gray-900 shadow-lg backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-gradient text-white shadow-md">
          <Thermometer className="h-5 w-5" />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold uppercase tracking-wide text-brand-dark">
            Local outlook
          </span>
          {status === 'loading' && (
            <span className="flex items-center gap-2 text-sm font-medium">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
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

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-gray-700">
        <span className="flex items-center gap-1">
          <MapPin className="h-4 w-4 text-brand-primary" />
          {environment?.locationLabel ?? 'Locating you'}
        </span>
        <span className="flex items-center gap-1">
          <Clock3 className="h-4 w-4 text-brand-primary" />
          {timeDisplay} local time
        </span>
        {status === 'ready' && environment && (
          <span className="flex items-center gap-1 text-brand-primary">
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-brand-accent animate-pulse" />
            Updated moments ago
          </span>
        )}
      </div>

      {status === 'error' && (
        <p className="mt-2 text-xs font-medium text-gray-600">
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
          'relative overflow-hidden rounded-2xl border border-brand/20',
          'bg-gradient-to-br from-white via-green-50/30 to-white p-8 shadow-lg'
        )}
        aria-live="polite"
      >
        <div
          className={clsx(
            'pointer-events-none absolute -right-12 top-0 hidden h-52 w-52 rounded-full',
            'bg-gradient-to-br from-brand/20 to-transparent blur-3xl sm:block'
          )}
          aria-hidden="true"
        />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-brand-dark">
              {greeting}, {preferredName}
            </p>
            <h1 className="mt-2 text-3xl font-bold text-gray-900">
              Here's what's happening across your organization today.
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-medium text-gray-700">
              Stay ahead of adoption, licensing, and engagement trends with a quick scan of live metrics
              and local operating conditions.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {DASHBOARD_PRIORITIES.map(priority => (
                <span
                  key={priority}
                  className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-4 py-2 text-xs font-bold text-brand-dark shadow-sm"
                >
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-brand-accent" />
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
                className="border-brand text-brand-dark backdrop-blur hover:bg-brand-soft font-semibold"
              >
                Test as User
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Simple Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-white to-green-50 rounded-2xl shadow-lg border border-brand/20 p-6 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-700">Total Companies</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">24</p>
              <p className="text-xs font-semibold text-brand-primary mt-2 flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-brand-accent"></span>
                +2 this month
              </p>
            </div>
            <div className="w-14 h-14 rounded-xl bg-brand-gradient flex items-center justify-center shadow-md">
              <Building2 className="h-7 w-7 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-lg border border-blue-200/40 p-6 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-700">Total Users</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">1,234</p>
              <p className="text-xs font-semibold text-brand-primary mt-2 flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-brand-accent"></span>
                +48 this week
              </p>
            </div>
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md">
              <Users className="h-7 w-7 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-purple-50 rounded-2xl shadow-lg border border-purple-200/40 p-6 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-700">Active Licenses</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">892</p>
              <p className="text-xs font-semibold text-purple-600 mt-2 flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-purple-500"></span>
                86% utilization
              </p>
            </div>
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-md">
              <Key className="h-7 w-7 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-amber-50 rounded-2xl shadow-lg border border-amber-200/40 p-6 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-700">License Requests</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">8</p>
              <p className="text-xs font-semibold text-amber-600 mt-2 flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse"></span>
                Pending approval
              </p>
            </div>
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-md">
              <ClipboardList className="h-7 w-7 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg border border-gray-200/50">
        <div className="px-6 py-5 border-b border-brand/20 bg-gradient-to-r from-transparent to-green-50/30">
          <h2 className="text-lg font-bold text-gray-900">
            Recent Activity
          </h2>
        </div>
        <div className="p-6">
          <div className="space-y-5">
            <div className="flex items-start space-x-4 p-4 rounded-xl hover:bg-green-50/50 transition-colors">
              <div className="flex-shrink-0 w-3 h-3 mt-1.5 bg-gradient-to-br from-brand-accent to-brand-primary rounded-full shadow-sm"></div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">
                  <span className="font-bold">Sarah Johnson</span> added new company
                  <span className="font-bold text-brand-dark ml-1">Eco Innovations</span>
                </p>
                <p className="text-xs font-medium text-gray-600 mt-1">12:30 PM</p>
              </div>
            </div>

            <div className="flex items-start space-x-4 p-4 rounded-xl hover:bg-blue-50/50 transition-colors">
              <div className="flex-shrink-0 w-3 h-3 mt-1.5 bg-gradient-to-br from-blue-400 to-blue-500 rounded-full shadow-sm"></div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">
                  <span className="font-bold">Mike Brown</span> updated user role
                  <span className="font-bold text-brand-dark ml-1">Sustainable Corp</span>
                </p>
                <p className="text-xs font-medium text-gray-600 mt-1">11:45 AM</p>
              </div>
            </div>

            <div className="flex items-start space-x-4 p-4 rounded-xl hover:bg-amber-50/50 transition-colors">
              <div className="flex-shrink-0 w-3 h-3 mt-1.5 bg-gradient-to-br from-amber-400 to-amber-500 rounded-full shadow-sm"></div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">
                  <span className="font-bold">John Smith</span> allocated license
                  <span className="font-bold text-brand-dark ml-1">Green Tech Solutions</span>
                </p>
                <p className="text-xs font-medium text-gray-600 mt-1">10:15 AM</p>
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