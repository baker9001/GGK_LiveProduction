import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Check for dark mode preference
const darkModePreference = localStorage.getItem('darkMode');
if (darkModePreference === 'true') {
  document.documentElement.classList.add('dark');
} else if (darkModePreference === null) {
  // Check system preference if no stored preference
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (prefersDark) {
    document.documentElement.classList.add('dark');
    localStorage.setItem('darkMode', 'true');
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);