// /src/components/layout/StudentLayout.tsx

import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  X,
  Bell,
  User,
  Sun,
  Moon,
  LogOut,
  BookOpen,
  Zap,
  Trophy,
  Gamepad2,
  Home,
  Target,
  TrendingUp,
  Award,
  ShoppingBag,
  Swords,
  Calendar,
  Settings,
  HelpCircle,
  Coins,
  Flame,
  Star,
  ChevronRight,
  Gift,
  Crown,
  type LucideIcon
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useUser } from '../../contexts/UserContext';

// LEAP Navigation Structure
interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  badge?: string | number;
  isNew?: boolean;
  children?: NavItem[];
}

// Student-specific navigation items (LEAP)
const navigationItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/student',
    icon: Home,
  },
  {
    id: 'learn',
    label: 'Learn',
    path: '/student/learn',
    icon: BookOpen,
    children: [
      { id: 'my-courses', label: 'My Courses', path: '/student/learn/courses', icon: BookOpen },
      { id: 'materials', label: 'Study Materials', path: '/student/learn/materials', icon: BookOpen },
      { id: 'videos', label: 'Video Lessons', path: '/student/learn/videos', icon: BookOpen },
      { id: 'progress', label: 'Learning Progress', path: '/student/learn/progress', icon: TrendingUp },
    ]
  },
  {
    id: 'engage',
    label: 'Engage',
    path: '/student/engage',
    icon: Zap,
    badge: 3, // Number of pending assignments
    children: [
      { id: 'assignments', label: 'Assignments', path: '/student/engage/assignments', icon: Target, badge: 2 },
      { id: 'quizzes', label: 'Quizzes', path: '/student/engage/quizzes', icon: Award, badge: 1 },
      { id: 'practice', label: 'Practice Tests', path: '/student/engage/practice', icon: Target },
      { id: 'homework', label: 'Homework', path: '/student/engage/homework', icon: BookOpen },
    ]
  },
  {
    id: 'achieve',
    label: 'Achieve',
    path: '/student/achieve',
    icon: Trophy,
    children: [
      { id: 'progress', label: 'My Progress', path: '/student/achieve/progress', icon: TrendingUp },
      { id: 'goals', label: 'Goals', path: '/student/achieve/goals', icon: Target },
      { id: 'badges', label: 'Badges', path: '/student/achieve/badges', icon: Award },
      { id: 'analytics', label: 'Performance', path: '/student/achieve/analytics', icon: TrendingUp },
    ]
  },
  {
    id: 'play',
    label: 'Play',
    path: '/student/play',
    icon: Gamepad2,
    isNew: true,
    children: [
      { id: 'daily-challenge', label: 'Daily Challenge', path: '/student/play/daily', icon: Flame, isNew: true },
      { id: 'battle', label: 'Battle Arena', path: '/student/play/battle', icon: Swords },
      { id: 'tournament', label: 'Tournaments', path: '/student/play/tournament', icon: Crown },
      { id: 'leaderboard', label: 'Leaderboard', path: '/student/play/leaderboard', icon: Trophy },
      { id: 'shop', label: 'Rewards Shop', path: '/student/play/shop', icon: ShoppingBag },
    ]
  }
];

// Gamification data interface
interface StudentStats {
  level: number;
  xp: number;
  xpToNextLevel: number;
  coins: number;
  streak: number;
  rank: string;
  rankIcon: string;
}

interface StudentLayoutProps {
  children: React.ReactNode;
}

export function StudentLayout({ children }: StudentLayoutProps) {
  const { user } = useUser();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(5);
  
  // Student-specific stats (would come from context/API)
  const [studentStats] = useState<StudentStats>({
    level: 12,
    xp: 3420,
    xpToNextLevel: 5000,
    coins: 1250,
    streak: 7,
    rank: 'Scholar',
    rankIcon: '🎓'
  });

  const location = useLocation();
  const navigate = useNavigate();
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Handle dark mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  // Initialize expanded items based on current path
  useEffect(() => {
    const toExpand = new Set<string>();
    navigationItems.forEach(item => {
      if (item.children && item.children.length > 0) {
        const isChildActive = item.children.some(child => 
          location.pathname === child.path || 
          location.pathname.startsWith(child.path + '/')
        );
        if (isChildActive) {
          toExpand.add(item.id);
        }
      }
    });
    setExpandedItems(toExpand);
  }, [location.pathname]);

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

  // XP Progress percentage
  const xpProgress = (studentStats.xp / studentStats.xpToNextLevel) * 100;

  const NavItem = ({ item, depth = 0 }: { item: NavItem; depth?: number }) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const isActive = location.pathname === item.path || 
                    (item.children && item.children.some(child => location.pathname.startsWith(child.path)));
    const Icon = item.icon;
    
    if (hasChildren) {
      return (
        <div className={cn("mb-1", depth > 0 && "ml-3")}>
          <div
            onClick={() => toggleExpanded(item.id)}
            className={cn(
              'w-full group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer',
              'hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 dark:hover:from-purple-900/20 dark:hover:to-pink-900/20',
              isActive && 'bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30'
            )}
          >
            <div className={cn(
              "flex items-center justify-center w-8 h-8 rounded-lg transition-all mr-3",
              isActive
                ? "bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-md" 
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
            )}>
              <Icon className="h-4 w-4" />
            </div>
            <span className={cn(
              'flex-1 text-left font-medium',
              isActive ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300',
              !sidebarOpen && 'hidden'
            )}>
              {item.label}
            </span>
            {item.badge && sidebarOpen && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                {item.badge}
              </span>
            )}
            {item.isNew && sidebarOpen && (
              <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                NEW
              </span>
            )}
            {sidebarOpen && (
              <ChevronRight className={cn(
                "h-4 w-4 text-gray-400 transition-transform ml-2",
                isExpanded && "rotate-90"
              )} />
            )}
          </div>
          
          {isExpanded && sidebarOpen && (
            <div className="mt-1 space-y-1 ml-4 pl-4 border-l-2 border-purple-200 dark:border-purple-700">
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
            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
            : 'hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 dark:hover:from-purple-900/20 dark:hover:to-pink-900/20 text-gray-600 dark:text-gray-300'
        )}
      >
        <div className={cn(
          "flex items-center justify-center w-8 h-8 rounded-lg transition-all mr-3",
          isActive 
            ? "bg-white/20" 
            : depth === 0 
              ? "bg-gray-100 dark:bg-gray-800"
              : ""
        )}>
          {depth === 0 ? (
            <Icon className={cn(
              "h-4 w-4",
              isActive ? "text-white" : "text-gray-600 dark:text-gray-400"
            )} />
          ) : (
            <div className={cn(
              "w-2 h-2 rounded-full",
              isActive ? "bg-white" : "bg-gray-400 dark:bg-gray-600"
            )} />
          )}
        </div>
        <span className={cn(
          'font-medium',
          !sidebarOpen && depth === 0 && 'hidden'
        )}>
          {item.label}
        </span>
        {item.badge && sidebarOpen && (
          <span className={cn(
            "ml-auto text-xs px-2 py-0.5 rounded-full font-semibold",
            isActive 
              ? "bg-white/20 text-white" 
              : "bg-red-500 text-white"
          )}>
            {item.badge}
          </span>
        )}
        {item.isNew && sidebarOpen && (
          <span className="ml-auto bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
            NEW
          </span>
        )}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 transition-all duration-200">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-md bg-white dark:bg-gray-800 shadow-lg text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 shadow-xl',
          sidebarOpen ? 'w-72' : 'w-16',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Sidebar Header with Logo */}
        <div className="shrink-0 flex h-16 items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-500 to-pink-500">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <span className="text-xl">🎮</span>
            </div>
            {sidebarOpen && (
              <span className="text-xl font-bold text-white">
                GGK Learn
              </span>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-md text-white/80 hover:text-white hover:bg-white/10"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        {/* Student Stats Section */}
        {sidebarOpen && (
          <div className="shrink-0 px-4 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800">
            {/* Level & XP */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{studentStats.rankIcon}</span>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Level {studentStats.level}</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{studentStats.rank}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Next Level</p>
                  <p className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                    {studentStats.xp}/{studentStats.xpToNextLevel} XP
                  </p>
                </div>
              </div>
              {/* XP Progress Bar */}
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500 rounded-full"
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
            </div>

            {/* Coins & Streak */}
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Coins className="h-5 w-5 text-yellow-500" />
                <span className="font-bold text-gray-900 dark:text-white">{studentStats.coins.toLocaleString()}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Flame className="h-5 w-5 text-orange-500" />
                <span className="font-bold text-gray-900 dark:text-white">{studentStats.streak} days</span>
              </div>
            </div>
          </div>
        )}

        {/* Main Navigation */}
        <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
          <div className="space-y-1">
            {navigationItems.map((item) => (
              <NavItem key={item.id} item={item} />
            ))}
          </div>
          
          {/* Bottom Navigation Items */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 space-y-1">
            <Link
              to="/student/calendar"
              className="group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-300"
            >
              <Calendar className="h-4 w-4 mr-3" />
              {sidebarOpen && <span>Calendar</span>}
            </Link>
            <Link
              to="/student/help"
              className="group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-300"
            >
              <HelpCircle className="h-4 w-4 mr-3" />
              {sidebarOpen && <span>Help & Support</span>}
            </Link>
            <Link
              to="/student/settings"
              className="group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-300"
            >
              <Settings className="h-4 w-4 mr-3" />
              {sidebarOpen && <span>Settings</span>}
            </Link>
          </div>
        </nav>

        {/* User Info - Bottom */}
        {sidebarOpen && (
          <div className="shrink-0 border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900">
            <div className="flex items-center">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center font-semibold text-sm">
                  {user?.name?.charAt(0)?.toUpperCase() || 'S'}
                </div>
                {/* Online status indicator */}
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{user?.name || 'Student'}</p>
                <p className="text-xs text-gray-500">Grade 10 • Science</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main content area */}
      <div className={cn(
        'transition-all duration-300',
        sidebarOpen ? 'lg:ml-72' : 'lg:ml-16'
      )}>
        {/* Top header */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              {/* Welcome Message */}
              <div className="flex items-center space-x-4">
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Welcome back, {user?.name?.split(' ')[0] || 'Student'}! 🚀
                </h1>
                {/* Daily Login Reward */}
                <div className="hidden sm:flex items-center space-x-2 bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/20 dark:to-orange-900/20 px-3 py-1 rounded-full">
                  <Gift className="h-4 w-4 text-orange-500" />
                  <span className="text-xs font-semibold text-orange-700 dark:text-orange-300">
                    Daily Reward Available!
                  </span>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                {/* Quick Actions */}
                <button className="p-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:text-purple-400 dark:hover:text-purple-300 dark:hover:bg-purple-900/20 rounded-lg">
                  <Star className="h-5 w-5" />
                </button>

                {/* Notifications */}
                <button 
                  className="relative p-2 text-gray-500 hover:text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-700 rounded-lg"
                  onClick={() => setNotificationCount(0)}
                >
                  <Bell className="h-5 w-5" />
                  {notificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 text-xs flex items-center justify-center bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full font-semibold animate-pulse">
                      {notificationCount}
                    </span>
                  )}
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
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-1 border border-gray-200 dark:border-gray-700">
                      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center font-semibold">
                            {user?.name?.charAt(0)?.toUpperCase() || 'S'}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{user?.name || 'Student'}</p>
                            <p className="text-xs text-gray-500">{user?.email || 'student@school.com'}</p>
                          </div>
                        </div>
                        {/* Mini Stats in Dropdown */}
                        <div className="mt-3 flex justify-around text-center">
                          <div>
                            <p className="text-xs text-gray-500">Level</p>
                            <p className="text-sm font-bold text-purple-600 dark:text-purple-400">{studentStats.level}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Coins</p>
                            <p className="text-sm font-bold text-yellow-600 dark:text-yellow-400">{studentStats.coins}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Streak</p>
                            <p className="text-sm font-bold text-orange-600 dark:text-orange-400">{studentStats.streak}</p>
                          </div>
                        </div>
                      </div>
                      <Link 
                        to="/student/profile" 
                        className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => setIsProfileDropdownOpen(false)}
                      >
                        My Profile
                      </Link>
                      <Link 
                        to="/student/achieve/badges" 
                        className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => setIsProfileDropdownOpen(false)}
                      >
                        My Achievements
                      </Link>
                      <Link 
                        to="/student/settings" 
                        className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => setIsProfileDropdownOpen(false)}
                      >
                        Settings
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

        {/* Main Content */}
        <main className="min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation (for key actions) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-30">
        <div className="grid grid-cols-5 gap-1 p-2">
          <Link to="/student" className="flex flex-col items-center py-2 text-gray-600 dark:text-gray-400">
            <Home className="h-5 w-5" />
            <span className="text-xs mt-1">Home</span>
          </Link>
          <Link to="/student/learn" className="flex flex-col items-center py-2 text-gray-600 dark:text-gray-400">
            <BookOpen className="h-5 w-5" />
            <span className="text-xs mt-1">Learn</span>
          </Link>
          <Link to="/student/engage" className="flex flex-col items-center py-2 text-gray-600 dark:text-gray-400 relative">
            <Zap className="h-5 w-5" />
            <span className="text-xs mt-1">Engage</span>
            {navigationItems.find(item => item.id === 'engage')?.badge && (
              <span className="absolute -top-1 right-4 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-semibold">
                {navigationItems.find(item => item.id === 'engage')?.badge}
              </span>
            )}
          </Link>
          <Link to="/student/achieve" className="flex flex-col items-center py-2 text-gray-600 dark:text-gray-400">
            <Trophy className="h-5 w-5" />
            <span className="text-xs mt-1">Achieve</span>
          </Link>
          <Link to="/student/play" className="flex flex-col items-center py-2 text-gray-600 dark:text-gray-400 relative">
            <Gamepad2 className="h-5 w-5" />
            <span className="text-xs mt-1">Play</span>
            <span className="absolute -top-1 right-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-1.5 py-0.5 rounded-full font-semibold scale-75">
              NEW
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}