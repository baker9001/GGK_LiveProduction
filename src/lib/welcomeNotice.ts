export interface WelcomeNotice {
  greeting: string;
  message: string;
  timestamp: number;
}

const WELCOME_NOTICE_KEY = 'ggk_welcome_notice';
const DEFAULT_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

export function saveWelcomeNotice(notice: WelcomeNotice): void {
  try {
    localStorage.setItem(WELCOME_NOTICE_KEY, JSON.stringify(notice));
  } catch (error) {
    console.warn('[WelcomeNotice] Failed to persist notice:', error);
  }
}

export function loadWelcomeNotice(maxAgeMs: number = DEFAULT_MAX_AGE_MS): WelcomeNotice | null {
  try {
    const raw = localStorage.getItem(WELCOME_NOTICE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<WelcomeNotice>;
    if (!parsed || typeof parsed.timestamp !== 'number') {
      clearWelcomeNotice();
      return null;
    }

    if (Date.now() - parsed.timestamp > maxAgeMs) {
      clearWelcomeNotice();
      return null;
    }

    if (typeof parsed.greeting !== 'string' || typeof parsed.message !== 'string') {
      clearWelcomeNotice();
      return null;
    }

    return {
      greeting: parsed.greeting,
      message: parsed.message,
      timestamp: parsed.timestamp
    };
  } catch (error) {
    console.warn('[WelcomeNotice] Failed to read notice:', error);
    clearWelcomeNotice();
    return null;
  }
}

export function clearWelcomeNotice(): void {
  try {
    localStorage.removeItem(WELCOME_NOTICE_KEY);
  } catch (error) {
    console.warn('[WelcomeNotice] Failed to clear notice:', error);
  }
}
