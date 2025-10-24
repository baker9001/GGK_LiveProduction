// /home/project/src/lib/constants/moduleSubmenus.ts

export interface SubMenuItem {
  id: string;
  label: string;
  path: string;
  icon: string;
  moduleKey: string;
  children?: SubMenuItem[];
  badge?: {
    text: string;
    variant: 'default' | 'success' | 'warning' | 'error';
  };
  disabled?: boolean;
}

export const MODULE_SUBMENUS: SubMenuItem[] = [
  // System Admin Module
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/app/system-admin/dashboard',
    icon: 'LayoutDashboard',
    moduleKey: 'system-admin'
  },
  {
    id: 'admin-users',
    label: 'Admin Users',
    path: '/app/system-admin/admin-users',
    icon: 'Users',
    moduleKey: 'system-admin'
  },
  {
    id: 'tenants',
    label: 'Tenants',
    path: '/app/system-admin/tenants',
    icon: 'Building2',
    moduleKey: 'system-admin'
  },
  {
    id: 'license-management',
    label: 'License Management',
    path: '/app/system-admin/license-management',
    icon: 'Key',
    moduleKey: 'system-admin'
  },
  {
    id: 'learning-management',
    label: 'Learning Management',
    path: '/app/system-admin/learning',
    icon: 'BookOpen',
    moduleKey: 'system-admin',
    children: [
      {
        id: 'materials',
        label: 'Materials',
        path: '/app/system-admin/learning/materials',
        icon: 'FileText',
        moduleKey: 'system-admin'
      },
      {
        id: 'education-catalogue',
        label: 'Education Catalogue',
        path: '/app/system-admin/learning/education-catalogue',
        icon: 'Library',
        moduleKey: 'system-admin'
      },
      {
        id: 'practice-management',
        label: 'Practice Management',
        path: '/app/system-admin/learning/practice-management',
        icon: 'Target',
        moduleKey: 'system-admin',
        children: [
          {
            id: 'papers-setup',
            label: 'Papers Setup',
            path: '/app/system-admin/learning/practice-management/papers-setup',
            icon: 'FileText',
            moduleKey: 'system-admin'
          },
          {
            id: 'questions-setup',
            label: 'Questions Setup',
            path: '/app/system-admin/learning/practice-management/questions-setup',
            icon: 'ClipboardList',
            moduleKey: 'system-admin'
          }
        ]
      }
    ]
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/app/system-admin/settings',
    icon: 'Settings',
    moduleKey: 'system-admin',
    children: [
      {
        id: 'locations',
        label: 'Locations',
        path: '/app/system-admin/settings/locations',
        icon: 'MapPin',
        moduleKey: 'system-admin'
      },
      {
        id: 'data-structure',
        label: 'Data Structure',
        path: '/app/system-admin/settings/data-structure',
        icon: 'Database',
        moduleKey: 'system-admin'
      }
    ]
  },

  // Entity Module
  {
    id: 'entity-dashboard',
    label: 'Dashboard',
    path: '/app/entity-module/dashboard',
    icon: 'LayoutDashboard',
    moduleKey: 'entity-module'
  },
  {
    id: 'entity-configuration',
    label: 'Configuration',
    path: '/app/entity-module/configuration',
    icon: 'Settings',
    moduleKey: 'entity-module'
  },
  {
    id: 'entity-organisation',
    label: 'Organisation',
    path: '/app/entity-module/organisation',
    icon: 'Building2',
    moduleKey: 'entity-module'
  },
  {
    id: 'entity-license-management',
    label: 'License Management',
    path: '/app/entity-module/license-management',
    icon: 'Key',
    moduleKey: 'entity-module'
  },
  {
    id: 'entity-mock-exams',
    label: 'Mock Exams',
    path: '/app/entity-module/mock-exams',
    icon: 'ClipboardList',
    moduleKey: 'entity-module'
  },
  {
    id: 'entity-analytics',
    label: 'Analytics',
    path: '/app/entity-module/analytics',
    icon: 'BarChart3',
    moduleKey: 'entity-module'
  },

  // Student Module
  {
    id: 'student-dashboard',
    label: 'Dashboard',
    path: '/app/student-module/dashboard',
    icon: 'LayoutDashboard',
    moduleKey: 'student-module'
  },
  {
    id: 'learning-pathway',
    label: 'Learning Pathway',
    path: '/app/student-module/pathways',
    icon: 'Route',
    moduleKey: 'student-module'
  },
  {
    id: 'student-performance',
    label: 'Performance',
    path: '/app/student-module/performance',
    icon: 'TrendingUp',
    moduleKey: 'student-module'
  },
  {
    id: 'student-assignment',
    label: 'Assignment',
    path: '/app/student-module/assignment',
    icon: 'ClipboardList',
    moduleKey: 'student-module'
  },
  {
    id: 'student-practice',
    label: 'Practice',
    path: '/app/student-module/practice',
    icon: 'Target',
    moduleKey: 'student-module'
  },

  // Teachers Module
  {
    id: 'teachers-dashboard',
    label: 'Dashboard',
    path: '/app/teachers-module/dashboard',
    icon: 'LayoutDashboard',
    moduleKey: 'teachers-module'
  },
  {
    id: 'students',
    label: 'Students',
    path: '/app/teachers-module/students',
    icon: 'Users',
    moduleKey: 'teachers-module'
  },
  {
    id: 'learning-management',
    label: 'Learning Management',
    path: '/app/teachers-module/learning-management',
    icon: 'BookOpen',
    moduleKey: 'teachers-module',
    children: [
      {
        id: 'materials',
        label: 'Materials',
        path: '/app/teachers-module/learning-management/materials',
        icon: 'FileText',
        moduleKey: 'teachers-module'
      }
    ]
  },
  {
    id: 'study-calendar',
    label: 'Study Calendar',
    path: '/app/teachers-module/study-calendar',
    icon: 'Calendar',
    moduleKey: 'teachers-module'
  },
  {
    id: 'teacher-performance',
    label: 'Performance Analytics',
    path: '/app/teachers-module/performance',
    icon: 'BarChart3',
    moduleKey: 'teachers-module'
  }
];

export function getSubmenusForModule(moduleKey: string): SubMenuItem[] {
  return MODULE_SUBMENUS.filter(item => item.moduleKey === moduleKey);
}

export type ModuleKey = 'system-admin' | 'entity-module' | 'student-module' | 'teachers-module';