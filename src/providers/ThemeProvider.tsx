import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import {
  applyDarkModeClass,
  detectSystemPrefersDark,
  readDarkModePreference,
  writeDarkModePreference,
  DARK_MODE_STORAGE_KEY
} from '../lib/darkMode';

export type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  mode: ThemeMode;
  isDark: boolean;
  toggle: () => void;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const getInitialMode = (): ThemeMode => {
  const storedPreference = readDarkModePreference();

  if (storedPreference !== null) {
    return storedPreference ? 'dark' : 'light';
  }

  return detectSystemPrefersDark() ? 'dark' : 'light';
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(() => getInitialMode());
  const lastPersistedValue = useRef<boolean | null>(null);

  useEffect(() => {
    const isDark = mode === 'dark';
    applyDarkModeClass(isDark);

    if (lastPersistedValue.current !== isDark) {
      writeDarkModePreference(isDark);
      lastPersistedValue.current = isDark;
    }
  }, [mode]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleMediaChange = (event: MediaQueryListEvent) => {
      setMode(event.matches ? 'dark' : 'light');
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleMediaChange);
      return () => mediaQuery.removeEventListener('change', handleMediaChange);
    }

    mediaQuery.addListener(handleMediaChange);
    return () => mediaQuery.removeListener(handleMediaChange);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== DARK_MODE_STORAGE_KEY) {
        return;
      }

      if (event.newValue === null) {
        setMode(getInitialMode());
        return;
      }

      setMode(event.newValue === 'true' ? 'dark' : 'light');
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const toggle = useCallback(() => {
    setMode((previous) => (previous === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo<ThemeContextValue>(() => ({
    mode,
    isDark: mode === 'dark',
    toggle,
    setMode,
  }), [mode, toggle]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }

  return context;
}
