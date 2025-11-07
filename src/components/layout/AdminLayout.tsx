// /src/components/layout/AdminLayout.tsx
// SECURITY ENHANCED VERSION with module access validation

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  ChevronDown,
  Menu,
  X,
  Bell,
  User,
  Accessibility,
  Sun,
  Moon,
  LogOut,
  LayoutDashboard,
  Users,
  Building2,
  Key,
  BookOpen,
  FileText,
  Library,
  Target,
  Settings,
  MapPin,
  Database,
  Network,
  BarChart3,
  UserPlus,
  TrendingUp,
  Route,
  Calendar,
  Circle,
  ClipboardList,
  UserCircle,
  type LucideIcon
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useTheme } from '../../hooks/useTheme';
import { getDyslexiaPreference, setDyslexiaPreference } from '../../lib/accessibility';
import { ModuleNavigation } from '../shared/ModuleNavigation';
import { WelcomeBanner } from '../shared/WelcomeBanner';
import { PageContainer } from './PageContainer';
import {
  clearAuthenticatedUser,
  clearSessionExpiredNotice,
  getCurrentUser,
  getRealAdminUser,
  isInTestMode,
  markUserLogout
} from '../../lib/auth';
import { useUser } from '../../contexts/UserContext';
import { getSubmenusForModule, type SubMenuItem } from '../../lib/constants/moduleSubmenus';
import { supabase } from '../../lib/supabase';
import { getPublicUrl } from '../../lib/storageHelpers';
import { clearWelcomeNotice, loadWelcomeNotice, type WelcomeNotice } from '../../lib/welcomeNotice';

// Icon mapping
const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  Building2,
  Key,
  BookOpen,
  FileText,
  Library,
  Target,
  Settings,
  MapPin,
  Database,
  Network,
  BarChart3,
  UserPlus,
  TrendingUp,
  Route,
  Calendar,
  ClipboardList,
  UserCircle
};

interface AdminLayoutProps {
  children: React.ReactNode;
  moduleKey: string;
}

interface SidebarProfileData {
  avatarPath: string | null;
  name: string | null;
  email: string | null;
}

export function AdminLayout({ children, moduleKey }: AdminLayoutProps) {
  const { user } = useUser();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const { isDark: isDarkMode, toggle } = useTheme();
  const [isDyslexiaEnabled, setIsDyslexiaEnabled] = useState(() => getDyslexiaPreference());
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [welcomeNotice, setWelcomeNotice] = useState<WelcomeNotice | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleDyslexiaChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ enabled: boolean }>;
      setIsDyslexiaEnabled(customEvent.detail.enabled);
    };

    window.addEventListener('dyslexia-support-change', handleDyslexiaChange);
    return () => window.removeEventListener('dyslexia-support-change', handleDyslexiaChange);
  }, []);

  useEffect(() => {
    setDyslexiaPreference(isDyslexiaEnabled);
  }, [isDyslexiaEnabled]);

  useEffect(() => {
    const notice = loadWelcomeNotice();
    if (notice) {
      setWelcomeNotice(notice);
      clearWelcomeNotice();
    }
  }, []);

  const handleDismissWelcome = () => {
    setWelcomeNotice(null);
  };

  const { data: sidebarProfile } = useQuery<SidebarProfileData>({
    queryKey: ['userSidebarProfile', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        return {
          avatarPath: user?.avatarUrl ?? null,
          name: user?.name ?? null,
          email: user?.email ?? null
        };
      }

      let avatarPath: string | null = user?.avatarUrl ?? null;
      let name: string | null = user?.name ?? null;
      let email: string | null = user?.email ?? null;

      try {
        const { data: adminUser, error: adminError } = await supabase
          .from('admin_users')
          .select('avatar_url, name, email')
          .eq('id', user.id)
          .maybeSingle();

        if (adminError && adminError.code !== 'PGRST116') {
          console.warn('[AdminLayout] Failed to load admin user profile:', adminError);
        }

        if (adminUser) {
          avatarPath = adminUser.avatar_url ?? avatarPath;
          name = adminUser.name ?? name;
          email = adminUser.email ?? email;
        }
      } catch (error) {
        console.warn('[AdminLayout] Unexpected error loading admin user profile:', error);
      }

      if (!avatarPath || !name || !email) {
        try {
          const { data: userRecord, error: userError } = await supabase
            .from('users')
            .select('raw_user_meta_data, email')
            .eq('id', user.id)
            .maybeSingle();

          if (userError && userError.code !== 'PGRST116') {
            console.warn('[AdminLayout] Failed to load base user profile:', userError);
          }

          if (userRecord) {
            const metadata = (userRecord.raw_user_meta_data ?? {}) as { avatar_url?: string; name?: string };
            avatarPath = metadata.avatar_url ?? avatarPath;
            name = metadata.name ?? name;
            email = (userRecord as { email?: string }).email ?? email;
          }
        } catch (error) {
          console.warn('[AdminLayout] Unexpected error loading base user profile:', error);
        }
      }

      return {
        avatarPath,
        name,
        email
      };
    },
    enabled: !!user?.id
  });

  const displayName = sidebarProfile?.name ?? user?.name ?? 'User';
  const displayEmail = sidebarProfile?.email ?? user?.email ?? 'user@example.com';
  const avatarPath = sidebarProfile?.avatarPath ?? user?.avatarUrl ?? null;
  const sidebarAvatarUrl = useMemo(() => {
    return avatarPath ? getPublicUrl('avatars', avatarPath) : null;
  }, [avatarPath]);
  const displayInitial = displayName?.charAt(0)?.toUpperCase() || 'U';

  // SECURITY: Get current user for validation
  const currentUser = getCurrentUser();
  const inTestMode = isInTestMode();
  const realAdmin = getRealAdminUser();

  // SECURITY: Validate module access on mount, when moduleKey changes, or when test mode changes
  useEffect(() => {
    const validateModuleAccess = () => {
      if (!currentUser) {
        console.error('[AdminLayout] No authenticated user');
        navigate('/signin', { replace: true });
        return;
      }

      const modulePermissions: Record<string, string[]> = {
        'system-admin': ['SSA', 'SUPPORT', 'VIEWER'],
        'entity-module': ['SSA', 'ENTITY_ADMIN'],
        'student-module': ['SSA', 'STUDENT'],
        'teachers-module': ['SSA', 'TEACHER']
      };

      const allowedRoles = modulePermissions[moduleKey];

      if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
        // Check if this is test mode - don't log as violation if SSA is testing
        const isTestModeViolation = inTestMode && realAdmin?.role === 'SSA';

        if (isTestModeViolation) {
          console.log(`[TestMode] AdminLayout: SSA testing as ${currentUser.email} (${currentUser.role}) - access denied to ${moduleKey}`);
        } else {
          console.error(`[Security Violation] AdminLayout: User ${currentUser.email} (${currentUser.role}) attempted unauthorized access to ${moduleKey}`);

          // Log security event only for real violations
          const securityEvent = {
            type: 'UNAUTHORIZED_MODULE_ACCESS',
            userId: currentUser.id,
            userEmail: currentUser.email,
            userRole: currentUser.role,
            attemptedModule: moduleKey,
            attemptedPath: location.pathname,
            timestamp: new Date().toISOString()
          };

          console.error('[SECURITY EVENT]', securityEvent);

          // Store violation for audit
          const violations = JSON.parse(localStorage.getItem('security_violations') || '[]');
          violations.push(securityEvent);
          localStorage.setItem('security_violations', JSON.stringify(violations.slice(-100)));
        }

        // Redirect to appropriate module
        const redirectMap: Record<string, string> = {
          'ENTITY_ADMIN': '/app/entity-module/dashboard',
          'STUDENT': '/app/student-module/dashboard',
          'TEACHER': '/app/teachers-module/dashboard',
          'SSA': '/app/system-admin/dashboard',
          'SUPPORT': '/app/system-admin/dashboard',
          'VIEWER': '/app/system-admin/dashboard'
        };

        navigate(redirectMap[currentUser.role] || '/signin', { replace: true });
      }
    };

    validateModuleAccess();

    // Listen for test mode changes
    const handleTestModeChange = () => {
      console.log('[AdminLayout] Test mode changed, re-validating access');
      validateModuleAccess();
    };

    window.addEventListener('test-mode-change', handleTestModeChange);
    window.addEventListener('auth-change', handleTestModeChange);

    return () => {
      window.removeEventListener('test-mode-change', handleTestModeChange);
      window.removeEventListener('auth-change', handleTestModeChange);
    };
  }, [currentUser, moduleKey, navigate, location.pathname, inTestMode, realAdmin]);

  // Get navigation items
  const navigationItems = getSubmenusForModule(moduleKey);

  // Generate the profile path based on the user's role
  const getProfilePath = () => {
    if (!currentUser) return '/signin';

    // Map user roles to their profile paths
    const profilePaths: Record<string, string> = {
      'SSA': '/app/system-admin/profile',
      'SUPPORT': '/app/system-admin/profile',
      'VIEWER': '/app/system-admin/profile',
      'ENTITY_ADMIN': '/app/entity-module/profile',
      'TEACHER': '/app/teachers-module/profile',
      'STUDENT': '/app/student-module/profile'
    };

    return profilePaths[currentUser.role] || '/app/system-admin/profile';
  };

  // Initialize expanded items on first load
  useEffect(() => {
    const toExpand = new Set<string>();
    
    const checkPath = (items: SubMenuItem[]) => {
      items.forEach(item => {
        if (item.children && item.children.length > 0) {
          const isChildActive = item.children.some(child => 
            location.pathname === child.path || 
            location.pathname.startsWith(child.path + '/')
          );
          
          if (isChildActive || location.pathname.startsWith(item.path + '/')) {
            toExpand.add(item.id);
          }
          
          // Check nested children
          checkPath(item.children);
        }
      });
    };
    
    checkPath(navigationItems);
    
    if (toExpand.size > 0) {
      setExpandedItems(toExpand);
    }
  }, []); // Only run once on mount

  // Handle clicks outside profile dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };

    if (isProfileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileDropdownOpen]);

  const handleLogout = () => {
    markUserLogout();
    clearSessionExpiredNotice();
    clearAuthenticatedUser();
    navigate('/signin');
  };

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const NavItem = ({ item, depth = 0 }: { item: SubMenuItem; depth?: number }) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const isActive = location.pathname === item.path;
    const Icon = iconMap[item.icon] || Circle;

    if (hasChildren) {
      return (
        <div className={cn('mb-1.5', depth > 0 && 'ml-3')}>
          <div
            onClick={() => toggleExpanded(item.id)}
            className={cn(
              'module-tile group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-theme cursor-pointer',
              isActive
                ? 'bg-[color:var(--color-action-primary-soft)] text-theme-primary ring-1 ring-[color:var(--color-action-primary)]/35'
                : 'text-theme-secondary hover:bg-white/55 hover:text-theme-primary dark:hover:bg-white/10'
            )}
          >
            {depth === 0 ? (
              <div
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-xl transition-theme',
                  isActive
                    ? 'bg-[color:var(--color-action-primary)] text-action-contrast shadow-theme-elevated'
                    : 'bg-theme-subtle text-theme-muted dark:bg-white/5'
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
            ) : (
              <div className="flex h-9 w-9 items-center justify-center">
                <span
                  className={cn(
                    'h-2.5 w-2.5 rounded-full transition-theme',
                    isActive ? 'bg-[color:var(--color-action-primary)]' : 'bg-theme-muted'
                  )}
                />
              </div>
            )}
            <span
              className={cn(
                'flex-1 truncate transition-theme',
                isActive ? 'text-theme-primary' : 'text-theme-secondary',
                !sidebarOpen && 'hidden'
              )}
            >
              {item.label}
            </span>
            {sidebarOpen && (
              isExpanded ? (
                <ChevronDown className="h-4 w-4 text-theme-muted" />
              ) : (
                <ChevronRight className="h-4 w-4 text-theme-muted" />
              )
            )}
          </div>

          {isExpanded && (
            <div
              className={cn(
                'mt-1 space-y-1 border-l border-theme-muted/60 pl-4',
                depth === 0 && 'ml-3'
              )}
            >
              {item.children.map((child) => (
                <NavItem key={child.id} item={child} depth={depth + 1} />
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        to={item.path}
        className={cn(
          'module-tile group mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-theme',
          isActive
            ? 'bg-[color:var(--color-action-primary)] text-action-contrast shadow-theme-elevated'
            : 'text-theme-secondary hover:bg-white/55 hover:text-theme-primary dark:hover:bg-white/10'
        )}
      >
        {depth === 0 ? (
          <div
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-xl transition-theme',
              isActive
                ? 'bg-[color:var(--color-action-primary-soft)] text-action-contrast'
                : 'bg-theme-subtle text-theme-muted dark:bg-white/5'
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        ) : (
          <div className="flex h-9 w-9 items-center justify-center">
            <span
              className={cn(
                'h-2.5 w-2.5 rounded-full transition-theme',
                isActive ? 'bg-action-contrast' : 'bg-theme-muted'
              )}
            />
          </div>
        )}
        <span
          className={cn(
            'truncate transition-theme',
            isActive ? 'text-action-contrast' : 'text-theme-secondary',
            !sidebarOpen && depth === 0 && 'hidden'
          )}
        >
          {item.label}
        </span>
      </Link>
    );
  };

  return (
    <div className="app-shell text-theme-primary transition-theme">
      {/* Mobile menu button */}
      <div className="fixed left-4 top-4 z-50 lg:hidden">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className={cn(
            'surface-glass flex h-11 w-11 items-center justify-center rounded-xl text-theme-secondary hover:text-theme-primary transition-theme',
            mobileMenuOpen && 'ring-2 ring-[color:var(--color-action-primary)]/40'
          )}
          aria-label={mobileMenuOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col px-3 py-5 transition-all duration-300 ease-out',
          'surface-card surface-card--strong border border-theme-muted/60 shadow-theme-elevated backdrop-blur-xl',
          'lg:my-4 lg:ml-4 lg:rounded-[1.75rem]',
          sidebarOpen ? 'w-72' : 'w-20',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
        ref={navRef}
      >
        <div className="relative flex h-16 items-center justify-between px-2">
          <span
            className={cn(
              'sidebar-brand text-lg font-semibold text-theme-primary transition-opacity',
              !sidebarOpen && 'opacity-0'
            )}
          >
            GGK Console
          </span>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={cn(
              'surface-glass flex h-9 w-9 items-center justify-center rounded-xl text-theme-secondary hover:text-theme-primary transition-theme',
              !sidebarOpen && 'absolute left-3 top-4 h-10 w-10'
            )}
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        <div className="shrink-0 rounded-2xl border border-theme-muted/50 bg-white/60 p-3 shadow-sm dark:bg-white/5">
          <ModuleNavigation sidebarOpen={sidebarOpen} activeModule={moduleKey} />
        </div>

        <nav className="mt-4 flex-1 space-y-2 overflow-y-auto px-1 py-2 scrollbar-thin scrollbar-thumb-[color:var(--color-border-muted)] scrollbar-track-transparent">
          {sidebarOpen && (
            <h3 className="px-3 text-xs font-semibold uppercase tracking-[0.3em] text-theme-muted">
              Navigation
            </h3>
          )}
          <div className="space-y-1.5 px-1">
            {navigationItems.map(item => (
              <NavItem key={item.id} item={item} />
            ))}
          </div>
        </nav>

        <div className="mt-auto pt-4">
          <div
            className={cn(
              'rounded-xl border border-theme-muted/50 transition-theme',
              sidebarOpen
                ? 'surface-glass surface-glass--strong flex items-center gap-3 px-3 py-3'
                : 'surface-glass flex items-center justify-center p-3'
            )}
          >
            <div
              className={cn(
                'flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-theme-muted text-sm font-semibold',
                sidebarAvatarUrl
                  ? 'bg-theme-subtle text-theme-secondary'
                  : 'bg-[color:var(--color-action-primary)] text-action-contrast'
              )}
            >
              {sidebarAvatarUrl ? (
                <img
                  src={sidebarAvatarUrl}
                  alt={`${displayName}'s avatar`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <span>{displayInitial}</span>
              )}
            </div>

            {sidebarOpen && (
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-theme-primary">{displayName}</p>
                <p className="truncate text-xs text-theme-muted">{displayEmail}</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div
        className={cn(
          'transition-all duration-300 ease-out',
          sidebarOpen ? 'lg:ml-[19rem]' : 'lg:ml-28'
        )}
      >
        <header className="header-surface sticky top-0 z-30">
          <div className="px-4 py-4 sm:px-6 lg:px-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="pill-indicator">Control Center</span>
                  {inTestMode && (
                    <span className="pill-indicator bg-amber-500/15 text-amber-700 dark:bg-amber-400/20 dark:text-amber-100">
                      Test mode
                    </span>
                  )}
                  {realAdmin && currentUser && realAdmin.id !== currentUser.id && (
                    <span className="pill-indicator bg-indigo-500/15 text-indigo-600 dark:bg-indigo-400/15 dark:text-indigo-200">
                      Acting as {currentUser.email}
                    </span>
                  )}
                </div>
                <div>
                  <h1 className="font-display text-2xl font-semibold leading-tight">GGK Admin System</h1>
                  <p className="text-sm text-theme-muted">
                    Unified oversight for entities, teachers, and learners across GGK.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  className="surface-glass relative flex h-11 w-11 items-center justify-center rounded-xl text-theme-secondary hover:text-theme-primary transition-theme"
                  type="button"
                  aria-label="View notifications"
                >
                  <Bell className="h-5 w-5" />
                  <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white">
                    3
                  </span>
                </button>

                <button
                  className={cn(
                    'surface-glass flex h-11 w-11 items-center justify-center rounded-xl transition-theme',
                    isDyslexiaEnabled
                      ? 'text-emerald-600 hover:text-emerald-600'
                      : 'text-theme-secondary hover:text-theme-primary'
                  )}
                  onClick={() => setIsDyslexiaEnabled(prev => !prev)}
                  aria-pressed={isDyslexiaEnabled}
                  type="button"
                  title={isDyslexiaEnabled ? 'Disable dyslexia-friendly font' : 'Enable dyslexia-friendly font'}
                >
                  <span className="sr-only">Toggle dyslexia-friendly font</span>
                  <Accessibility className="h-5 w-5" />
                </button>

                <button
                  className="surface-glass flex h-11 w-11 items-center justify-center rounded-xl text-theme-secondary hover:text-theme-primary transition-theme"
                  onClick={toggle}
                  aria-label="Toggle theme"
                  aria-pressed={isDarkMode}
                  type="button"
                >
                  {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </button>

                <div className="relative" ref={profileDropdownRef}>
                  <button
                    className="surface-glass flex h-11 w-11 items-center justify-center rounded-xl text-theme-secondary hover:text-theme-primary transition-theme"
                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={isProfileDropdownOpen}
                  >
                    <User className="h-5 w-5" />
                  </button>

                  {isProfileDropdownOpen && (
                    <div className="absolute right-0 mt-3 w-60 rounded-2xl border border-theme-muted/50 bg-theme-surface shadow-theme-popover">
                      <div className="border-b border-theme-muted px-4 py-3">
                        <p className="text-sm font-medium text-theme-primary">{user?.name || 'User'}</p>
                        <p className="text-xs text-theme-muted">{user?.email || 'user@example.com'}</p>
                      </div>
                      <Link
                        to={getProfilePath()}
                        className="block px-4 py-3 text-sm text-theme-secondary transition-theme hover:bg-theme-subtle hover:text-theme-primary"
                        onClick={() => setIsProfileDropdownOpen(false)}
                      >
                        Profile Settings
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-theme-secondary transition-theme hover:bg-theme-subtle hover:text-theme-primary"
                        type="button"
                      >
                        <LogOut className="h-4 w-4" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="relative min-h-[calc(100vh-6rem)] pb-12">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(100,188,70,0.14),transparent_58%)]"
          />

          {welcomeNotice && (
            <div className="px-4 pt-6 sm:px-6 lg:px-10">
              <WelcomeBanner notice={welcomeNotice} onDismiss={handleDismissWelcome} />
            </div>
          )}

          <PageContainer
            fullWidth
            tone="transparent"
            className={cn(welcomeNotice ? 'pt-4' : 'pt-8')}
          >
            {children}
          </PageContainer>
        </main>
      </div>
    </div>
  );
}