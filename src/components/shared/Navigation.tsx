///home/project/src/components/shared/Navigation.tsx


import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { GraduationCap, X, Menu, Moon, Sun } from 'lucide-react';
import { Button } from './Button';
import {
  applyDarkModeClass,
  isDocumentDark,
  readDarkModePreference,
  writeDarkModePreference
} from '../../lib/darkMode';

const NAV_ITEMS = [
  { label: 'Home', path: '/' },
  { label: 'Subjects', path: '/subjects' },
  { label: 'Resources', path: '/resources' },
  { label: 'About', path: '/about' },
  { label: 'Contact', path: '/contact' },
];

export function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const stored = readDarkModePreference();
    return stored !== null ? stored : isDocumentDark();
  });

  useEffect(() => {
    applyDarkModeClass(isDarkMode);
    writeDarkModePreference(isDarkMode);

    // Dispatch event to notify other components
    window.dispatchEvent(new CustomEvent('darkmode-change'));
  }, [isDarkMode]);

  // Listen for dark mode changes from other components
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'darkMode' && e.newValue !== null) {
        const newValue = e.newValue === 'true';
        setIsDarkMode(newValue);
      }
    };

    const handleDarkModeChange = () => {
      const stored = readDarkModePreference();
      if (stored !== null && stored !== isDarkMode) {
        setIsDarkMode(stored);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('darkmode-change', handleDarkModeChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('darkmode-change', handleDarkModeChange);
    };
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(previous => !previous);
  };
  
  const handleSignInClick = () => {
    // Use React Router navigation instead of window.location
    navigate('/signin');
  };
  
  return (
    <nav className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md shadow-sm dark:shadow-gray-900/20 sticky top-0 z-50 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <GraduationCap className="h-8 w-8 text-[#8CC63F]" />
              <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">GGK</span>
            </Link>
            <div className="hidden md:flex ml-10 space-x-8">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`inline-flex items-center px-1 pt-1 text-sm font-medium transition-colors duration-200 ${
                    location.pathname === item.path
                      ? 'text-[#8CC63F] border-b-2 border-[#8CC63F]'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-b-2 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center">
            <button
              onClick={toggleDarkMode}
              className="p-2 mr-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors duration-200"
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>
            
            <Button
              variant="default"
              onClick={handleSignInClick}
              className="ml-4 bg-[#8CC63F] hover:bg-[#7AB32F]"
            >
              Sign In
            </Button>
            
            <button
              type="button"
              className="md:hidden ml-2 p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#8CC63F] transition-colors duration-200"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <span className="sr-only">Toggle menu</span>
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 bg-white dark:bg-gray-900 transition-colors duration-200">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200 ${
                  location.pathname === item.path
                    ? 'text-[#8CC63F] bg-gray-50 dark:bg-gray-800'
                    : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            
            {/* Mobile Sign In Button */}
            <Button
              variant="default"
              onClick={() => {
                setIsMenuOpen(false);
                handleSignInClick();
              }}
              className="w-full mt-4 bg-[#8CC63F] hover:bg-[#7AB32F]"
            >
              Sign In
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
}