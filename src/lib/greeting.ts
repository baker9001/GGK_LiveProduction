// /src/lib/greeting.ts
// Utility helpers for time-aware, human-friendly greetings across the app.

/**
 * Returns a localized greeting based on the provided (or current) time.
 * The ranges follow common UX guidance for time-based salutations.
 */
export function getTimeBasedGreeting(now: Date = new Date()): string {
  const hour = now.getHours();

  if (hour >= 5 && hour < 12) {
    return 'Good morning';
  }

  if (hour >= 12 && hour < 17) {
    return 'Good afternoon';
  }

  if (hour >= 17 && hour < 22) {
    return 'Good evening';
  }

  return 'Welcome back';
}

/**
 * Provides a user-friendly first name fallback for personalized greetings.
 */
export function getPreferredName(fullName?: string | null): string | null {
  if (!fullName) {
    return null;
  }

  const trimmed = fullName.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.split(/\s+/)[0];
}
