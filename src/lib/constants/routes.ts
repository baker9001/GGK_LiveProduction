import { Building2, Users, Settings, BookOpen, Network, Key, BookOpenCheck } from 'lucide-react';

export const SYSTEM_ROUTES = [
  {
    path: '/app/system-admin/dashboard',
    name: 'Dashboard',
    description: 'System overview and analytics',
  },
  {
    path: '/app/system-admin/admin-users',
    name: 'Admin Users',
    description: 'Manage system administrators',
    children: [
      {
        path: '/app/system-admin/admin-users/roles',
        name: 'Roles & Permissions',
        description: 'Manage access control',
      }
    ]
  },
  {
    path: '/app/system-admin/tenants',
    name: 'Tenants',
    description: 'Manage companies and schools',
  },
  {
    path: '/app/system-admin/license-management',
    name: 'License Management',
    description: 'Manage licenses and allocations',
  },
  {
    path: '/app/system-admin/learning/materials',
    name: 'Learning Materials',
    description: 'Manage educational content',
  },
  {
    path: '/app/system-admin/learning/education-catalogue',
    name: 'Education Catalogue',
    description: 'Manage educational structure',
  },
  {
    path: '/app/system-admin/settings/locations',
    name: 'Locations',
    description: 'Manage geographical locations',
  },
  {
    path: '/app/system-admin/settings/data-structure',
    name: 'Data Structure',
    description: 'Configure system data relationships',
  }
] as const;