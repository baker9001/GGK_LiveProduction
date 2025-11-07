const DARK_MODE_STORAGE_KEY = 'darkMode';

function canUseWindow(): boolean {
  return typeof window !== 'undefined';
}

function canUseDocument(): boolean {
  return typeof document !== 'undefined';
}

export function readDarkModePreference(): boolean | null {
  if (!canUseWindow()) {
    return null;
  }

  try {
    const storedValue = window.localStorage.getItem(DARK_MODE_STORAGE_KEY);
    if (storedValue === null) {
      return null;
    }

    if (storedValue === 'true') {
      return true;
    }

    if (storedValue === 'false') {
      return false;
    }

    return JSON.parse(storedValue);
  } catch (error) {
    console.warn('[DarkMode] Failed to read preference from localStorage:', error);
    return null;
  }
}

export function writeDarkModePreference(enabled: boolean): void {
  if (!canUseWindow()) {
    return;
  }

  try {
    window.localStorage.setItem(DARK_MODE_STORAGE_KEY, enabled ? 'true' : 'false');
  } catch (error) {
    console.warn('[DarkMode] Failed to persist preference to localStorage:', error);
  }
}

export function applyDarkModeClass(enabled: boolean): void {
  if (!canUseDocument()) {
    return;
  }

  document.documentElement.classList.toggle('dark', enabled);
}

export function detectSystemPrefersDark(): boolean {
  if (!canUseWindow() || typeof window.matchMedia !== 'function') {
    return false;
  }

  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch (error) {
    console.warn('[DarkMode] Failed to query system dark mode preference:', error);
    return false;
  }
}

export function isDocumentDark(): boolean {
  if (!canUseDocument()) {
    return false;
  }

  try {
    return document.documentElement.classList.contains('dark');
  } catch (error) {
    console.warn('[DarkMode] Failed to determine current document theme:', error);
    return false;
  }
}
