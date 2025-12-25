import React, { useEffect, useState } from 'react';
import { LogIn, RefreshCw } from 'lucide-react';
import { Button } from './Button';
import { SESSION_EXPIRED_EVENT, consumeSessionExpiredNotice } from '../../lib/auth';
import { isPublicPath } from '../../lib/sessionConfig';

const DEFAULT_MESSAGE = 'Your session has expired. Please sign in again to continue.';

/**
 * Modern SVG illustration for session timeout
 * Shows a friendly character with a clock indicating time has passed
 */
function TimeoutIllustration() {
  return (
    <svg
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full max-w-sm mx-auto"
    >
      {/* Background Elements */}
      <defs>
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f0fdf4" />
          <stop offset="100%" stopColor="#dcfce7" />
        </linearGradient>
        <linearGradient id="clockGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="personGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>

      {/* Decorative circles */}
      <circle cx="50" cy="50" r="30" fill="#dcfce7" opacity="0.6" />
      <circle cx="350" cy="80" r="20" fill="#fef3c7" opacity="0.6" />
      <circle cx="320" cy="250" r="25" fill="#dcfce7" opacity="0.6" />
      <circle cx="80" cy="230" r="15" fill="#fef3c7" opacity="0.6" />

      {/* Large Clock */}
      <g className="animate-pulse" style={{ animationDuration: '3s' }}>
        <circle cx="200" cy="120" r="70" fill="white" stroke="url(#clockGradient)" strokeWidth="6" />
        <circle cx="200" cy="120" r="60" fill="white" />

        {/* Clock face markers */}
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle, i) => (
          <line
            key={i}
            x1={200 + 48 * Math.cos((angle - 90) * Math.PI / 180)}
            y1={120 + 48 * Math.sin((angle - 90) * Math.PI / 180)}
            x2={200 + 54 * Math.cos((angle - 90) * Math.PI / 180)}
            y2={120 + 54 * Math.sin((angle - 90) * Math.PI / 180)}
            stroke="#10b981"
            strokeWidth={i % 3 === 0 ? 3 : 1.5}
            strokeLinecap="round"
          />
        ))}

        {/* Clock hands - showing timeout position */}
        <line x1="200" y1="120" x2="200" y2="80" stroke="#064e3b" strokeWidth="4" strokeLinecap="round" />
        <line x1="200" y1="120" x2="230" y2="135" stroke="#064e3b" strokeWidth="3" strokeLinecap="round" />
        <circle cx="200" cy="120" r="6" fill="#064e3b" />
      </g>

      {/* Expired badge */}
      <g transform="translate(240, 60)">
        <rect x="0" y="0" width="70" height="28" rx="14" fill="#fef2f2" stroke="#fca5a5" strokeWidth="2" />
        <text x="35" y="18" textAnchor="middle" fontSize="11" fontWeight="600" fill="#dc2626">
          TIMEOUT
        </text>
      </g>

      {/* Person illustration */}
      <g transform="translate(100, 180)">
        {/* Body */}
        <ellipse cx="100" cy="85" rx="45" ry="30" fill="#10b981" />

        {/* Head */}
        <circle cx="100" cy="30" r="28" fill="#fcd9b6" />

        {/* Hair */}
        <path d="M72 20 Q72 5, 100 5 Q128 5, 128 20 Q125 12, 100 12 Q75 12, 72 20" fill="#4b5563" />

        {/* Eyes - sleepy/tired expression */}
        <path d="M88 28 Q92 32 96 28" stroke="#1f2937" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M104 28 Q108 32 112 28" stroke="#1f2937" strokeWidth="2" fill="none" strokeLinecap="round" />

        {/* Slight smile */}
        <path d="M92 42 Q100 48 108 42" stroke="#9ca3af" strokeWidth="2" fill="none" strokeLinecap="round" />

        {/* Arms raised in "oh well" gesture */}
        <path d="M55 70 Q40 50 50 40" stroke="#fcd9b6" strokeWidth="14" fill="none" strokeLinecap="round" />
        <path d="M145 70 Q160 50 150 40" stroke="#fcd9b6" strokeWidth="14" fill="none" strokeLinecap="round" />

        {/* Hands */}
        <circle cx="50" cy="38" r="8" fill="#fcd9b6" />
        <circle cx="150" cy="38" r="8" fill="#fcd9b6" />
      </g>

      {/* Floating elements */}
      <g className="animate-bounce" style={{ animationDuration: '2s', animationDelay: '0.5s' }}>
        <circle cx="320" cy="140" r="8" fill="#fbbf24" opacity="0.8" />
        <circle cx="340" cy="160" r="5" fill="#10b981" opacity="0.8" />
      </g>

      <g className="animate-bounce" style={{ animationDuration: '2.5s' }}>
        <circle cx="70" cy="140" r="6" fill="#10b981" opacity="0.8" />
        <circle cx="55" cy="165" r="4" fill="#fbbf24" opacity="0.8" />
      </g>

      {/* Zzz for session "sleeping" */}
      <g fill="#9ca3af" fontFamily="sans-serif" fontWeight="bold">
        <text x="270" y="190" fontSize="16" opacity="0.7">z</text>
        <text x="285" y="175" fontSize="20" opacity="0.8">z</text>
        <text x="305" y="155" fontSize="24" opacity="0.9">Z</text>
      </g>
    </svg>
  );
}

/**
 * Check if current page is a public page that doesn't require authentication
 * Uses centralized isPublicPath from sessionConfig.ts
 */
function isPublicPage(path: string): boolean {
  return isPublicPath(path);
}

/**
 * Parse expiration reason from message
 */
function getExpirationReason(message: string): 'inactivity' | 'absolute' | 'security' | 'unknown' {
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes('inactivity') || lowerMessage.includes('inactive')) {
    return 'inactivity';
  }
  if (lowerMessage.includes('secure') || lowerMessage.includes('security') || lowerMessage.includes('another device')) {
    return 'security';
  }
  if (lowerMessage.includes('maximum') || lowerMessage.includes('absolute')) {
    return 'absolute';
  }
  return 'unknown';
}

/**
 * Get friendly message based on expiration reason
 */
function getReasonMessage(reason: 'inactivity' | 'absolute' | 'security' | 'unknown'): { title: string; description: string } {
  switch (reason) {
    case 'inactivity':
      return {
        title: 'Looks like you took a break',
        description: 'Your session ended after being inactive. We do this to keep your account safe.'
      };
    case 'absolute':
      return {
        title: 'Time for a fresh start',
        description: 'Sessions automatically refresh after 8 hours for your security.'
      };
    case 'security':
      return {
        title: 'Security check completed',
        description: 'We signed you out to protect your account. This happens when signing in elsewhere.'
      };
    default:
      return {
        title: 'Your session has ended',
        description: 'Please sign back in to continue where you left off.'
      };
  }
}

export function SessionExpiredNotice() {
  const [isVisible, setIsVisible] = useState(false);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    // CRITICAL FIX: Don't show session expired notice on public pages
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      if (isPublicPage(currentPath)) {
        console.log('[SessionExpiredNotice] On public page, clearing any stale session data');
        // Clear any stale session expiration data
        consumeSessionExpiredNotice();
        return; // Exit early, don't set up listeners
      }
    }

    const handleSessionExpired = (event: Event) => {
      if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        // Double-check we're not on a public page
        if (isPublicPage(path)) {
          console.log('[SessionExpiredNotice] Session expired event on public page, ignoring');
          return;
        }
      }

      const customEvent = event as CustomEvent<{ message?: string }>;
      const detailMessage = customEvent.detail?.message || DEFAULT_MESSAGE;
      setMessage(detailMessage);
      setIsVisible(true);
      // Trigger fade-in animation
      setTimeout(() => setFadeIn(true), 10);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired as EventListener);

      // Check for stored expiration message (from previous session)
      const storedMessage = consumeSessionExpiredNotice();
      if (storedMessage) {
        console.log('[SessionExpiredNotice] Found stored session expiration message');
        setMessage(storedMessage);
        setIsVisible(true);
        // Trigger fade-in animation
        setTimeout(() => setFadeIn(true), 10);
      }
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired as EventListener);
      }
    };
  }, []);

  const handleAcknowledge = () => {
    setFadeIn(false);
    setTimeout(() => {
      setIsVisible(false);
      if (typeof window !== 'undefined') {
        window.location.replace('/signin');
      }
    }, 300);
  };

  if (!isVisible) {
    return null;
  }

  const reason = getExpirationReason(message);
  const { title, description } = getReasonMessage(reason);

  return (
    <div
      className={`fixed inset-0 z-[10000] flex items-center justify-center px-4 transition-all duration-500 ${
        fadeIn ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 25%, #fefce8 50%, #fff7ed 75%, #fef2f2 100%)'
      }}
    >
      {/* Animated background shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-200/30 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: '4s' }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-amber-200/30 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: '5s', animationDelay: '1s' }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-100/20 rounded-full blur-3xl"
        />
      </div>

      <div
        className={`relative max-w-md w-full transition-all duration-500 ${
          fadeIn ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-4 opacity-0'
        }`}
      >
        {/* Main Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-emerald-900/10 overflow-hidden border border-white/50">
          {/* Illustration Section */}
          <div className="pt-8 pb-4 px-6">
            <TimeoutIllustration />
          </div>

          {/* Content Section */}
          <div className="px-8 pb-8 text-center">
            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-3">
              {title}
            </h1>

            {/* Description */}
            <p className="text-slate-600 text-base mb-8 leading-relaxed max-w-sm mx-auto">
              {description}
            </p>

            {/* Data safe message */}
            <div className="flex items-center justify-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-full py-2 px-4 mb-8 mx-auto w-fit">
              <RefreshCw className="h-4 w-4" />
              <span>Don't worry, your work is saved</span>
            </div>

            {/* Sign In Button */}
            <Button
              onClick={handleAcknowledge}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-10 py-4 rounded-2xl font-semibold text-lg shadow-xl shadow-emerald-500/25 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/30 hover:-translate-y-0.5 active:translate-y-0"
            >
              <LogIn className="h-5 w-5" aria-hidden="true" />
              Sign Back In
            </Button>

            {/* Footer note */}
            <p className="text-xs text-slate-400 mt-6">
              Need help? Contact your administrator
            </p>
          </div>
        </div>

        {/* Decorative elements outside the card */}
        <div className="absolute -top-6 -right-6 w-12 h-12 bg-amber-400 rounded-full opacity-80 animate-bounce" style={{ animationDuration: '3s' }} />
        <div className="absolute -bottom-4 -left-4 w-8 h-8 bg-emerald-400 rounded-full opacity-80 animate-bounce" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />
      </div>
    </div>
  );
}

export default SessionExpiredNotice;
