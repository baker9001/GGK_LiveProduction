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
        'backdrop-blur-md sticky top-0 z-50 transition-theme border-b backdrop-saturate-150',
        isLandingPage
          ? isDark
            ? 'text-white/95 bg-white/10 supports-[backdrop-filter]:bg-white/5 border-white/20 shadow-[0_10px_30px_rgba(15,23,42,0.45)]'
            : 'text-slate-900/95 bg-white/80 supports-[backdrop-filter]:bg-white/65 border-white/70 shadow-[0_10px_30px_rgba(15,23,42,0.12)]'
          : 'bg-theme-surface shadow-theme-elevated border-theme-muted'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <GraduationCap className="h-8 w-8 text-[#8CC63F]" />
              <span
                className={clsx(
                  'ml-2 text-xl font-bold transition-theme',
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
            <div className="hidden md:flex ml-10 space-x-8">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={clsx(
                    'inline-flex items-center px-1 pt-1 text-sm font-medium transition-theme border-b-2 border-transparent',
                    isLandingPage
                      ? isDark
                        ? location.pathname === item.path
                          ? 'text-white border-white/80'
                          : 'text-white/80 hover:text-white/95 hover:border-white/60'
                        : location.pathname === item.path
                          ? 'text-slate-900 border-slate-900/60'
                          : 'text-slate-700 hover:text-slate-900 hover:border-slate-400/60'
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
                'p-2 mr-2 rounded-full transition-theme backdrop-blur-sm',
                isLandingPage
                  ? isDark
                    ? 'text-white/80 hover:text-white hover:bg-white/15 focus-visible:ring-white/30'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/40 focus-visible:ring-slate-300/60'
                  : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-subtle'
              )}
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
              className={clsx(
                'md:hidden ml-2 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[color:var(--color-action-primary)] transition-theme',
                isLandingPage
                  ? isDark
                    ? 'text-white/80 hover:text-white hover:bg-white/10'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                  : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-subtle'
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
              'px-2 pt-2 pb-3 space-y-1 transition-theme backdrop-blur-md',
              isLandingPage
                ? isDark
                  ? 'bg-slate-950/85 text-white border-t border-white/10 shadow-[0_16px_40px_rgba(15,23,42,0.45)]'
                  : 'bg-slate-100/95 text-slate-900 border-t border-slate-200/80 shadow-[0_16px_40px_rgba(15,23,42,0.15)]'
                : 'bg-theme-surface'
            )}
          >
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={clsx(
                  'block px-3 py-2 rounded-md text-base font-medium transition-theme',
                  isLandingPage
                    ? isDark
                      ? location.pathname === item.path
                        ? 'text-white bg-white/10'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                      : location.pathname === item.path
                        ? 'text-slate-900 bg-white/70'
                        : 'text-slate-700 hover:text-slate-900 hover:bg-white/70'
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