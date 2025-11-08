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
        <div className={cn("mb-1", depth > 0 && "ml-3")}>
          <div
            onClick={() => toggleExpanded(item.id)}
            className={cn(
              'w-full group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer',
              'hover:bg-gray-50',
              isActive && 'bg-[#E8F5DC] text-gray-900'
            )}
          >
            {depth === 0 ? (
              <div className={cn(
                "flex items-center justify-center w-8 h-8 rounded-lg transition-colors mr-3",
                isActive
                  ? "bg-gradient-to-br from-[#8CC63F] to-[#7AB635] text-white"
                  : "bg-gray-100 text-gray-600"
              )}>
                <Icon className="h-4 w-4" />
              </div>
            ) : (
              <div className="w-8 h-8 flex items-center justify-center mr-3">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  isActive ? "bg-[#8CC63F]" : "bg-gray-300"
                )} />
              </div>
            )}
            <span className={cn(
              'flex-1 text-left font-medium transition-colors',
              isActive ? 'text-gray-900' : 'text-gray-700',
              !sidebarOpen && 'hidden'
            )}>
              {item.label}
            </span>
            {sidebarOpen && (
              isExpanded ? (
                <ChevronDown className={cn("h-4 w-4", isActive ? "text-[#8CC63F]" : "text-gray-400")} />
              ) : (
                <ChevronRight className={cn("h-4 w-4", isActive ? "text-[#8CC63F]" : "text-gray-400")} />
              )
            )}
          </div>

          {isExpanded && (
            <div className={cn(
              "mt-1 space-y-0.5",
              depth === 0 && "ml-4 pl-4"
            )}>
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
          'group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors mb-1',
          isActive
            ? 'bg-gradient-to-r from-[#8CC63F] to-[#7AB635] text-white'
            : 'hover:bg-gray-50 text-gray-700'
        )}
      >
        {depth === 0 ? (
          <div className={cn(
            "flex items-center justify-center w-8 h-8 rounded-lg transition-colors mr-3",
            isActive
              ? "bg-white/20"
              : "bg-gray-100"
          )}>
            <Icon className={cn(
              "h-4 w-4",
              isActive ? "text-white" : "text-gray-600"
            )} />
          </div>
        ) : (
          <div className="w-8 h-8 flex items-center justify-center mr-3">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isActive ? "bg-white" : "bg-gray-300"
            )} />
          </div>
        )}
        <span className={cn(
          'font-medium transition-colors',
          isActive ? 'text-white' : '',
          !sidebarOpen && depth === 0 && 'hidden'
        )}>
          {item.label}
        </span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 transition-theme">
      {/* Mobile menu button */}
      <div className={cn(
        "lg:hidden fixed top-4 z-50 transition-all duration-300",
        sidebarOpen ? "left-4" : "left-20"
      )}>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-md text-theme-secondary hover:text-theme-primary hover:bg-theme-subtle transition-theme"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Sidebar - Fixed to use flex column layout */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col bg-white transition-theme',
          sidebarOpen ? 'w-64' : 'w-16',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Sidebar Header - Fixed height */}
        <div className="shrink-0 flex h-16 items-center justify-between px-4 bg-gradient-to-r from-[#8CC63F] to-[#7AB635]">
          <span className={cn(
            "text-xl font-bold text-white transition-opacity",
            !sidebarOpen && "opacity-0"
          )}>
            GGK Admin
          </span>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={cn(
              "p-1.5 rounded-md text-white/90 hover:text-white hover:bg-white/10 transition-colors",
              !sidebarOpen && "absolute top-4 left-4 bg-gradient-to-r from-[#8CC63F] to-[#7AB635] shadow-sm"
            )}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        {/* Module Navigation - Fixed height */}
        <div className="shrink-0 px-3 py-4">
          <ModuleNavigation sidebarOpen={sidebarOpen} activeModule={moduleKey} />
        </div>

        {/* Main Navigation - Flexible and scrollable */}
        <nav
          ref={navRef}
          className="flex-1 min-h-0 overflow-y-auto px-3 py-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400"
        >
          {sidebarOpen && (
            <h3 className="px-3 mb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Navigation
            </h3>
          )}
          <div className="space-y-1">
            {navigationItems.map((item) => (
              <NavItem key={item.id} item={item} />
            ))}
          </div>
        </nav>

        {/* User Info - Fixed height at bottom */}
        {sidebarOpen && (
          <div className="shrink-0 p-4">
            <div className="flex items-center">
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm overflow-hidden',
                  sidebarAvatarUrl ? 'bg-gray-100' : 'bg-gradient-to-br from-[#8CC63F] to-[#7AB635] text-white'
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
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
                <p className="text-xs text-gray-600 truncate">{displayEmail}</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main content area */}
      <div className={cn(
        'transition-all duration-300',
        sidebarOpen ? 'lg:ml-64' : 'lg:ml-16'
      )}>
        {/* Top header */}
        <header className="sticky top-0 z-30 bg-white transition-theme">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <h1 className="text-xl font-semibold text-gray-900 transition-theme">GGK Admin System</h1>

              <div className="flex items-center space-x-3">
                {/* Notifications */}
                <button className="relative p-2 text-gray-600 hover:text-gray-900 rounded-lg transition-colors">
                  <Bell className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 h-5 w-5 text-xs flex items-center justify-center bg-red-500 text-white rounded-full font-semibold">
                    3
                  </span>
                </button>

                {/* Dyslexia Support Toggle */}
                <button
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    isDyslexiaEnabled
                      ? 'text-emerald-600'
                      : 'text-gray-600 hover:text-gray-900'
                  )}
                  onClick={() => setIsDyslexiaEnabled((prev) => !prev)}
                  aria-pressed={isDyslexiaEnabled}
                  type="button"
                  title={isDyslexiaEnabled ? 'Disable dyslexia-friendly font' : 'Enable dyslexia-friendly font'}
                >
                  <span className="sr-only">Toggle dyslexia-friendly font</span>
                  <Accessibility className="h-5 w-5" />
                </button>

                {/* Theme Toggle */}
                <button
                  className="p-2 text-gray-600 hover:text-gray-900 rounded-lg transition-colors"
                  onClick={toggle}
                  aria-label="Toggle theme"
                  aria-pressed={isDarkMode}
                >
                  {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </button>

                {/* User Profile */}
                <div className="relative" ref={profileDropdownRef}>
                  <button
                    className="p-2 text-theme-secondary hover:text-theme-primary hover:bg-theme-subtle rounded-lg transition-theme"
                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  >
                    <User className="h-5 w-5" />
                  </button>

                  {isProfileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1">
                      <div className="px-4 py-2">
                        <p className="text-sm font-medium text-gray-900">{user?.name || 'User'}</p>
                        <p className="text-xs text-gray-600">{user?.email || 'user@example.com'}</p>
                      </div>
                      <Link
                        to={getProfilePath()}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setIsProfileDropdownOpen(false)}
                      >
                        Profile Settings
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center transition-colors"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="min-h-[calc(100vh-4rem)] bg-gray-50 transition-theme">
          {welcomeNotice && (
            <div className="px-6 pb-2 pt-6">
              <WelcomeBanner notice={welcomeNotice} onDismiss={handleDismissWelcome} />
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}