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
import { getDyslexiaPreference, setDyslexiaPreference } from '../../lib/accessibility';
import { ModuleNavigation } from '../shared/ModuleNavigation';
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
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [isDyslexiaEnabled, setIsDyslexiaEnabled] = useState(() => getDyslexiaPreference());
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
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

  const { data: sidebarProfile } = useQuery<SidebarProfileData>(
    ['userSidebarProfile', user?.id],
    async () => {
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
    {
      enabled: !!user?.id
    }
  );

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

  // Handle dark mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

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
              'w-full group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer',
              'hover:bg-gray-100 dark:hover:bg-gray-700/50',
              isActive && 'bg-[#64BC46]/10 dark:bg-[#64BC46]/20'
            )}
          >
            {depth === 0 ? (
              <div className={cn(
                "flex items-center justify-center w-8 h-8 rounded-lg transition-colors mr-3",
                isActive
                  ? "bg-[#64BC46]/20 text-[#64BC46]" 
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
              )}>
                <Icon className="h-4 w-4" />
              </div>
            ) : (
              <div className="w-8 h-8 flex items-center justify-center mr-3">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  isActive ? "bg-[#64BC46]" : "bg-gray-400 dark:bg-gray-600"
                )} />
              </div>
            )}
            <span className={cn(
              'flex-1 text-left font-medium',
              isActive ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300',
              !sidebarOpen && 'hidden'
            )}>
              {item.label}
            </span>
            {sidebarOpen && (
              isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-400" />
              )
            )}
          </div>
          
          {isExpanded && (
            <div className={cn(
              "mt-1 space-y-1",
              depth === 0 && "ml-4 pl-4 border-l-2 border-gray-200 dark:border-gray-700"
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
          'group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 mb-1',
          isActive
            ? 'bg-[#64BC46] text-white shadow-md'
            : 'hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-300'
        )}
      >
        {depth === 0 ? (
          <div className={cn(
            "flex items-center justify-center w-8 h-8 rounded-lg transition-colors mr-3",
            isActive 
              ? "bg-white/20" 
              : "bg-gray-100 dark:bg-gray-800"
          )}>
            <Icon className={cn(
              "h-4 w-4",
              isActive ? "text-white" : "text-gray-600 dark:text-gray-400"
            )} />
          </div>
        ) : (
          <div className="w-8 h-8 flex items-center justify-center mr-3">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isActive ? "bg-white" : "bg-gray-400 dark:bg-gray-600"
            )} />
          </div>
        )}
        <span className={cn(
          'font-medium',
          !sidebarOpen && depth === 0 && 'hidden'
        )}>
          {item.label}
        </span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Mobile menu button */}
      <div className={cn(
        "lg:hidden fixed top-4 z-50 transition-all duration-300",
        sidebarOpen ? "left-4" : "left-20"
      )}>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-md text-gray-500 hover:text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-800"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Sidebar - Fixed to use flex column layout */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 shadow-xl',
          sidebarOpen ? 'w-64' : 'w-16',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Sidebar Header - Fixed height */}
        <div className="shrink-0 flex h-16 items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
          <span className={cn(
            "text-xl font-bold text-[#64BC46] transition-opacity",
            !sidebarOpen && "opacity-0"
          )}>
            GGK Admin
          </span>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={cn(
              "p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all duration-300",
              !sidebarOpen && "absolute top-4 left-4 bg-white dark:bg-gray-800 shadow-md border border-gray-200 dark:border-gray-700"
            )}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        {/* Module Navigation - Fixed height */}
        <div className="shrink-0 px-3 py-4 border-b border-gray-200 dark:border-gray-700">
          <ModuleNavigation sidebarOpen={sidebarOpen} activeModule={moduleKey} />
        </div>

        {/* Main Navigation - Flexible and scrollable */}
        <nav 
          ref={navRef}
          className="flex-1 min-h-0 overflow-y-auto px-3 py-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent hover:scrollbar-thumb-gray-400 dark:hover:scrollbar-thumb-gray-500"
        >
          {sidebarOpen && (
            <h3 className="px-3 mb-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Navigation
            </h3>
          )}
          <div className="space-y-0.5">
            {navigationItems.map((item) => (
              <NavItem key={item.id} item={item} />
            ))}
          </div>
        </nav>

        {/* User Info - Fixed height at bottom */}
        {sidebarOpen && (
          <div className="shrink-0 border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm overflow-hidden border border-gray-200 dark:border-gray-700',
                  sidebarAvatarUrl ? 'bg-gray-100 dark:bg-gray-700' : 'bg-[#64BC46] text-white'
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
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{displayName}</p>
                <p className="text-xs text-gray-500">{displayEmail}</p>
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
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">GGK Admin System</h1>
              
              <div className="flex items-center space-x-3">
                {/* Notifications */}
                <button className="relative p-2 text-gray-500 hover:text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-700 rounded-lg">
                  <Bell className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 h-5 w-5 text-xs flex items-center justify-center bg-red-500 text-white rounded-full font-semibold">
                    3
                  </span>
                </button>

                {/* Dyslexia Support Toggle */}
                <button
                  className={cn(
                    'p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700',
                    'text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
                    isDyslexiaEnabled && 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-600'
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
                  className="p-2 text-gray-500 hover:text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-700 rounded-lg"
                  onClick={() => setIsDarkMode(!isDarkMode)}
                >
                  {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </button>

                {/* User Profile */}
                <div className="relative" ref={profileDropdownRef}>
                  <button 
                    className="p-2 text-gray-500 hover:text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-700 rounded-lg"
                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  >
                    <User className="h-5 w-5" />
                  </button>
                  
                  {isProfileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-1 border border-gray-200 dark:border-gray-700">
                      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{user?.name || 'User'}</p>
                        <p className="text-xs text-gray-500">{user?.email || 'user@example.com'}</p>
                      </div>
                      <Link 
                        to={getProfilePath()}
                        className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => setIsProfileDropdownOpen(false)}
                      >
                        Profile Settings
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
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

        <main className="min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900">
          {children}
        </main>
      </div>
    </div>
  );
}