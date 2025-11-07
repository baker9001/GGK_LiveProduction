import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initializeDyslexiaPreference } from './lib/accessibility';
import {
  applyDarkModeClass,
  detectSystemPrefersDark,
  readDarkModePreference,
  writeDarkModePreference
} from './lib/darkMode';
import { ThemeProvider } from './providers/ThemeProvider';

const storedDarkModePreference = readDarkModePreference();

if (storedDarkModePreference !== null) {
  applyDarkModeClass(storedDarkModePreference);
} else if (detectSystemPrefersDark()) {
  applyDarkModeClass(true);
  writeDarkModePreference(true);
}

// Initialize dyslexia-friendly font preference
initializeDyslexiaPreference();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>
);