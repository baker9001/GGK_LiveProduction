///home/project/src/components/shared/Navigation.tsx


import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { GraduationCap, X, Menu, Moon, Sun } from 'lucide-react';
import { Button } from './Button';
import { useTheme } from '../../hooks/useTheme';

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
  const { isDark, toggle } = useTheme();
  
  const handleSignInClick = () => {
    // Use React Router navigation instead of window.location
    navigate('/signin');
  };
  
  return (
    <nav className="bg-theme-surface backdrop-blur-md shadow-theme-elevated sticky top-0 z-50 transition-theme border-b border-theme-muted">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <GraduationCap className="h-8 w-8 text-[#8CC63F]" />
              <span className="ml-2 text-xl font-bold text-theme-primary transition-theme">GGK</span>
            </Link>
            <div className="hidden md:flex ml-10 space-x-8">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`inline-flex items-center px-1 pt-1 text-sm font-medium transition-theme ${
                    location.pathname === item.path
                      ? 'text-action-contrast border-b-2 border-[color:var(--color-action-primary)]'
                      : 'text-theme-secondary hover:text-theme-primary hover:border-b-2 hover:border-theme-muted'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center">
            <button
              onClick={toggle}
              className="p-2 mr-2 text-theme-secondary hover:text-theme-primary hover:bg-theme-subtle rounded-full transition-theme"
              aria-label="Toggle dark mode"
              aria-pressed={isDark}
            >
              {isDark ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>

            <Button
              variant="default"
              onClick={handleSignInClick}
              className="ml-4"
            >
              Sign In
            </Button>

            <button
              type="button"
              className="md:hidden ml-2 p-2 rounded-md text-theme-secondary hover:text-theme-primary hover:bg-theme-subtle focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[color:var(--color-action-primary)] transition-theme"
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
          <div className="px-2 pt-2 pb-3 space-y-1 bg-theme-surface transition-theme">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`block px-3 py-2 rounded-md text-base font-medium transition-theme ${
                  location.pathname === item.path
                    ? 'text-action-contrast bg-[color:var(--color-action-primary-soft)]'
                    : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-subtle'
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
              className="w-full mt-4"
            >
              Sign In
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
}