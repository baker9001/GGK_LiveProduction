const DYSLEXIA_STORAGE_KEY = 'dyslexiaSupportEnabled';
export const DYSLEXIA_FONT_CLASS = 'font-dyslexic';

export interface DyslexiaPreferenceDetail {
  enabled: boolean;
}

declare global {
  interface WindowEventMap {
    'dyslexia-support-change': CustomEvent<DyslexiaPreferenceDetail>;
  }
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

export function getDyslexiaPreference(): boolean {
  if (!isBrowser()) {
    return false;
  }
  try {
    return localStorage.getItem(DYSLEXIA_STORAGE_KEY) === 'true';
  } catch (error) {
    console.warn('Unable to read dyslexia preference from storage', error);
    return false;
  }
}

export function applyDyslexiaClass(enabled: boolean): void {
  if (!isBrowser()) {
    return;
  }
  document.body.classList.toggle(DYSLEXIA_FONT_CLASS, enabled);
}

export function setDyslexiaPreference(enabled: boolean): void {
  if (!isBrowser()) {
    return;
  }
  try {
    localStorage.setItem(DYSLEXIA_STORAGE_KEY, enabled ? 'true' : 'false');
  } catch (error) {
    console.warn('Unable to persist dyslexia preference to storage', error);
  }
  applyDyslexiaClass(enabled);
  window.dispatchEvent(
    new CustomEvent<DyslexiaPreferenceDetail>('dyslexia-support-change', {
      detail: { enabled }
    })
  );
}

export function initializeDyslexiaPreference(): boolean {
  const enabled = getDyslexiaPreference();
  applyDyslexiaClass(enabled);
  return enabled;
}
