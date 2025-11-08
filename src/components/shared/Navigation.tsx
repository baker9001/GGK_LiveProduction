///home/project/src/components/shared/Navigation.tsx


import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { GraduationCap, X, Menu, Moon, Sun } from 'lucide-react';
import clsx from 'clsx';
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
  const isLandingPage = location.pathname === '/' || location.pathname.startsWith('/landing');

  const handleSignInClick = () => {
    // Use React Router navigation instead of window.location
    navigate('/signin');
  };

  return (
    <nav
      className={clsx(
        'sticky top-0 z-[100] transition-all duration-300 border-b backdrop-blur-xl',
        isLandingPage
          ? isDark
            ? 'text-white bg-slate-900/90 border-slate-800/50 shadow-2xl'
            : 'text-slate-900 bg-white/90 border-slate-200/50 shadow-lg'
          : 'bg-theme-surface shadow-theme-elevated border-theme-muted backdrop-blur-xl'
      )}
      style={{
        backgroundColor: isLandingPage
          ? isDark
            ? 'rgba(15, 23, 42, 0.90)'
            : 'rgba(255, 255, 255, 0.90)'
          : undefined
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <GraduationCap className="h-10 w-10 text-[#8CC63F]" />
              <span
                className={clsx(
                  'ml-3 text-2xl font-bold transition-theme',
                  isLandingPage
                    ? isDark
                      ? 'text-white'
                      : 'text-slate-900'
                    : 'text-theme-primary'
                )}
              >
                GGK
              </span>
            </Link>
            <div className="hidden md:flex ml-12 space-x-8">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={clsx(
                    'inline-flex items-center px-2 pt-1 text-base font-semibold transition-all duration-200 border-b-2 border-transparent',
                    isLandingPage
                      ? isDark
                        ? location.pathname === item.path
                          ? 'text-white border-[#8CC63F]'
                          : 'text-slate-300 hover:text-white hover:border-slate-600'
                        : location.pathname === item.path
                          ? 'text-slate-900 border-[#8CC63F]'
                          : 'text-slate-600 hover:text-slate-900 hover:border-slate-300'
                      : location.pathname === item.path
                        ? 'text-action-contrast border-[color:var(--color-action-primary)]'
                        : 'text-theme-secondary hover:text-theme-primary hover:border-theme-muted'
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center">
            <button
              onClick={toggle}
              className={clsx(
                'p-2.5 mr-3 rounded-full transition-all duration-200',
                isLandingPage
                  ? isDark
                    ? 'text-slate-300 hover:text-white hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-slate-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-slate-300'
                  : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-subtle'
              )}
              aria-label="Toggle dark mode"
              aria-pressed={isDark}
            >
              {isDark ? (
                <Sun className="h-6 w-6" />
              ) : (
                <Moon className="h-6 w-6" />
              )}
            </button>

            <Button
              variant="default"
              size="lg"
              onClick={handleSignInClick}
              className="ml-4"
            >
              Sign In
            </Button>

            <button
              type="button"
              className={clsx(
                'md:hidden ml-2 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-inset transition-all duration-200',
                isLandingPage
                  ? isDark
                    ? 'text-slate-300 hover:text-white hover:bg-slate-800 focus:ring-slate-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:ring-slate-300'
                  : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-subtle focus:ring-[color:var(--color-action-primary)]'
              )}
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
          <div
            className={clsx(
              'px-2 pt-2 pb-3 space-y-1 transition-all duration-300 backdrop-blur-xl',
              isLandingPage
                ? isDark
                  ? 'bg-slate-900/95 text-white border-t border-slate-800/50 shadow-2xl'
                  : 'bg-white/95 text-slate-900 border-t border-slate-200/50 shadow-lg'
                : 'bg-theme-surface backdrop-blur-xl'
            )}
            style={{
              backgroundColor: isLandingPage
                ? isDark
                  ? 'rgba(15, 23, 42, 0.95)'
                  : 'rgba(255, 255, 255, 0.95)'
                : undefined
            }}
          >
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={clsx(
                  'block px-3 py-2 rounded-md text-base font-medium transition-all duration-200',
                  isLandingPage
                    ? isDark
                      ? location.pathname === item.path
                        ? 'text-white bg-slate-800'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      : location.pathname === item.path
                        ? 'text-slate-900 bg-slate-100'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    : location.pathname === item.path
                      ? 'text-action-contrast bg-[color:var(--color-action-primary-soft)]'
                      : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-subtle'
                )}
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
              className={clsx(
                'w-full mt-4',
                isLandingPage &&
                  (isDark
                    ? 'bg-[#8CC63F] text-white hover:bg-[#7ab635]'
                    : 'bg-[#8CC63F] text-white hover:bg-[#7ab635] shadow-[0_12px_30px_rgba(140,198,63,0.35)]')
              )}
            >
              Sign In
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
}