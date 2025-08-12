// src/components/shared/ModuleNavigation.tsx

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Settings, Building, GraduationCap, Users } from 'lucide-react';
import { cn } from '../../lib/utils';
import { getCurrentUser } from '../../lib/auth';
import type { UserRole } from '../../lib/auth';

interface Module {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  isActive: boolean;
  comingSoon?: boolean;
}

const MODULES: Module[] = [
  {
    id: 'system-admin',
    name: 'System Admin',
    icon: Settings,
    path: '/app/system-admin/dashboard',
    isActive: true,
  },
  {
    id: 'entity-module',
    name: 'Entity Module',
    icon: Building,
    path: '/app/entity-module',
    isActive: true,
    comingSoon: false,
  },
  {
    id: 'student-module',
    name: 'Student Module',
    icon: GraduationCap,
    path: '/app/student-module',
    isActive: true,
    comingSoon: false,
  },
  {
    id: 'teachers-module',
    name: 'Teachers Module',
    icon: Users,
    path: '/app/teachers-module',
    isActive: true,
    comingSoon: false,
  },
];

interface ModuleNavigationProps {
  sidebarOpen: boolean;
  className?: string;
  activeModule?: string;
}

export function ModuleNavigation({ sidebarOpen, className, activeModule }: ModuleNavigationProps) {
  const location = useLocation();
  const currentUser = getCurrentUser();

  // CRITICAL: Filter modules based on user role
  const getVisibleModules = (): Module[] => {
    if (!currentUser) return [];

    switch (currentUser.role) {
      case 'SSA':
        // Super Admin sees ALL modules
        return MODULES;
        
      case 'ENTITY_ADMIN':
        // Entity Admin sees ONLY Entity Module
        return MODULES.filter(m => m.id === 'entity-module');
        
      case 'STUDENT':
        // Student sees ONLY Student Module
        return MODULES.filter(m => m.id === 'student-module');
        
      case 'TEACHER':
        // Teacher sees ONLY Teachers Module
        return MODULES.filter(m => m.id === 'teachers-module');
        
      case 'SUPPORT':
      case 'VIEWER':
        // Support and Viewer see only System Admin
        return MODULES.filter(m => m.id === 'system-admin');
        
      default:
        // Unknown roles see nothing
        return [];
    }
  };

  const visibleModules = getVisibleModules();

  const isModuleActive = (module: Module) => {
    if (!module.isActive) return false;
    // Use activeModule prop if provided, otherwise fall back to path matching
    if (activeModule) {
      return module.id === activeModule;
    }
    return location.pathname.startsWith(module.path.replace('/dashboard', ''));
  };

  return (
    <div className={cn('border-b-2 border-gray-200 dark:border-gray-700 pb-4 mb-4 pt-4', className)}>
      {/* Module switcher title */}
      <div className={cn(
        'px-4 mb-3',
        !sidebarOpen && 'hidden'
      )}>
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Modules
        </h3>
      </div>

      {/* Module icons */}
      <div className="space-y-3 px-2">
        {visibleModules.length === 0 ? (
          <div className="text-sm text-gray-500 dark:text-gray-400 px-3 py-2">
            No modules available
          </div>
        ) : (
          visibleModules.map((module) => {
            const Icon = module.icon;
            const isCurrentModule = isModuleActive(module);
            
            if (module.comingSoon) {
              return (
                <div
                  key={module.id}
                  className="group relative flex items-center cursor-not-allowed"
                  title={sidebarOpen ? undefined : "Coming Soon"}
                >
                  <div className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 transition-colors',
                    !sidebarOpen && 'mx-auto'
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  
                  {sidebarOpen && (
                    <span className="ml-3 text-sm text-gray-400 dark:text-gray-500 font-medium">
                      {module.name}
                    </span>
                  )}
                  
                  {sidebarOpen && (
                    <span className="ml-auto text-xs text-gray-600 dark:text-gray-400 bg-gray-200 dark:bg-gray-600 px-1.5 py-0.5 rounded-md">
                      Soon
                    </span>
                  )}

                  {/* Tooltip for collapsed sidebar */}
                  {!sidebarOpen && (
                    <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                      <div className="bg-gray-900 dark:bg-gray-700 text-white dark:text-gray-100 text-xs rounded py-2 px-3 whitespace-nowrap">
                        {module.name} - Coming Soon
                        <div className="absolute left-0 top-1/2 transform -translate-x-1 -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-gray-900 dark:border-r-gray-700"></div>
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={module.id}
                to={module.path}
                className={cn(
                  'group flex items-center rounded-lg p-2 transition-all duration-200 hover:bg-[#64BC46]/5 dark:hover:bg-[#64BC46]/10 hover:translate-x-1',
                  isCurrentModule && 'bg-[#64BC46]/15 dark:bg-[#64BC46]/20',
                  !sidebarOpen && 'justify-center'
                )}
                title={sidebarOpen ? undefined : module.name}
              >
                <div className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-full transition-colors duration-200',
                  isCurrentModule 
                    ? 'bg-[#64BC46] text-white shadow-lg ring-2 ring-offset-2 ring-[#64BC46]' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 group-hover:bg-[#64BC46] group-hover:text-white'
                )}>
                  <Icon className="h-5 w-5" />
                </div>
                
                {sidebarOpen && (
                  <span className={cn(
                    'ml-3 text-sm font-medium transition-colors duration-200',
                    isCurrentModule ? 'text-[#64BC46]' : 'text-gray-700 dark:text-gray-300 group-hover:text-[#64BC46]'
                  )}>
                    {module.name}
                  </span>
                )}

                {/* Active indicator */}
                {isCurrentModule && (
                  <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-[#64BC46] rounded-r-full"></div>
                )}

                {/* Tooltip for collapsed sidebar */}
                {!sidebarOpen && (
                  <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                    <div className="bg-gray-900 dark:bg-gray-700 text-white dark:text-gray-100 text-xs rounded py-2 px-3 whitespace-nowrap">
                      {module.name}
                      <div className="absolute left-0 top-1/2 transform -translate-x-1 -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-gray-900 dark:border-r-gray-700"></div>
                    </div>
                  </div>
                )}
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}