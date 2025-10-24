import React, { useCallback, useEffect, useState } from 'react';
import { Sparkles, X, Smile } from 'lucide-react';
import clsx from 'clsx';
import type { WelcomeNotice } from '../../lib/welcomeNotice';

interface WelcomeBannerProps {
  notice: WelcomeNotice;
  onDismiss: () => void;
}

export function WelcomeBanner({ notice, onDismiss }: WelcomeBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!isVisible || isExiting) {
      return;
    }

    const autoDismissTimer = window.setTimeout(() => {
      setIsExiting(true);
    }, 5000);

    return () => window.clearTimeout(autoDismissTimer);
  }, [isVisible, isExiting]);

  useEffect(() => {
    if (!isExiting) {
      return;
    }

    const dismissTimer = window.setTimeout(() => {
      onDismiss();
    }, 300);

    return () => window.clearTimeout(dismissTimer);
  }, [isExiting, onDismiss]);

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
  }, []);

  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-6 text-white shadow-lg',
        'transition-all duration-500 ease-in-out',
        isVisible && !isExiting ? 'opacity-100 translate-y-0' : 'pointer-events-none opacity-0 -translate-y-2'
      )}
    >
      <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
      <div className="absolute -bottom-12 -left-10 h-36 w-36 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />

      <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-widest text-white/80">
            <Sparkles className="h-4 w-4" />
            Welcome back
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 backdrop-blur">
              <Smile className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xl font-semibold md:text-2xl">{notice.greeting}</p>
              <p className="text-sm text-white/90 md:text-base">{notice.message}</p>
            </div>
          </div>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={handleDismiss}
            className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/60"
          >
            Got it
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={handleDismiss}
        className="absolute right-4 top-4 rounded-full bg-white/10 p-1 text-white/70 transition hover:bg-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/50"
        aria-label="Dismiss welcome message"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
