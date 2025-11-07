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
    <div className={cn('space-y-3', className)}>
      {sidebarOpen && (
        <div className="px-2">
          <h3 className="text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-theme-muted">
            Modules
          </h3>
        </div>
      )}

      <div className="space-y-2 px-1">
        {visibleModules.length === 0 ? (
          <div className="surface-glass surface-glass--strong rounded-xl px-3 py-2 text-sm text-theme-muted">
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
                  className={cn(
                    'module-tile relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-theme-muted',
                    sidebarOpen ? 'bg-theme-subtle/60' : 'justify-center'
                  )}
                  title={sidebarOpen ? undefined : `${module.name} · Coming soon`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-theme-subtle text-theme-muted">
                    <Icon className="h-5 w-5" />
                  </div>
                  {sidebarOpen && (
                    <>
                      <span className="text-sm font-medium">{module.name}</span>
                      <span className="ml-auto rounded-full bg-theme-muted/30 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-theme-muted">
                        Soon
                      </span>
                    </>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={module.id}
                to={module.path}
                className={cn(
                  'module-tile group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-theme',
                  isCurrentModule
                    ? 'bg-[color:var(--color-action-primary-soft)] text-theme-primary shadow-theme-elevated ring-1 ring-[color:var(--color-action-primary)]/30'
                    : 'text-theme-secondary hover:bg-white/55 hover:text-theme-primary dark:hover:bg-white/10',
                  !sidebarOpen && 'justify-center'
                )}
                title={sidebarOpen ? undefined : module.name}
              >
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-xl transition-theme',
                    isCurrentModule
                      ? 'bg-[color:var(--color-action-primary)] text-action-contrast shadow-theme-elevated'
                      : 'bg-theme-subtle text-theme-muted dark:bg-white/5'
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>

                {sidebarOpen && (
                  <span className="text-sm font-semibold">{module.name}</span>
                )}

                {isCurrentModule && sidebarOpen && (
                  <span className="ml-auto rounded-full bg-[color:var(--color-action-primary)]/15 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[color:var(--color-action-primary)]">
                    Active
                  </span>
                )}
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}