/**
 * File: /src/hooks/usePermissionGuard.tsx
 * 
 * PERMISSION GUARDS & HOOKS
 * Reusable components and hooks for permission checking
 * Works with the existing PermissionContext
 */

import React, { useEffect, ReactNode, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/contexts/PermissionContext';
import { toast } from '@/components/shared/Toast';
import { Shield, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { AdminPermissions } from '@/app/entity-module/organisation/tabs/admins/types/admin.types';
import { cn } from '@/lib/utils';

/**
 * Type definitions for permission checks
 */
type PermissionCheck = {
  category: keyof AdminPermissions;
  permission: string;
};

/**
 * Hook to check permissions and redirect if unauthorized
 */
export const usePermissionGuard = (
  requiredPermissions: PermissionCheck[],
  requireAll: boolean = false,
  redirectTo: string = '/unauthorized'
) => {
  const router = useRouter();
  const { hasAllPermissions, hasAnyPermission, isLoading } = usePermissions();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isLoading) {
      const access = requireAll 
        ? hasAllPermissions(requiredPermissions)
        : hasAnyPermission(requiredPermissions);

      setHasAccess(access);

      if (!access) {
        toast.error('You do not have permission to access this resource');
        router.push(redirectTo);
      }
    }
  }, [isLoading, hasAllPermissions, hasAnyPermission, requiredPermissions, requireAll, router, redirectTo]);

  return { isLoading, hasAccess };
};

/**
 * Component wrapper that hides/shows content based on permissions
 */
interface PermissionGateProps {
  children: ReactNode;
  permissions: PermissionCheck[];
  requireAll?: boolean;
  fallback?: ReactNode;
  showError?: boolean;
  className?: string;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  children,
  permissions,
  requireAll = false,
  fallback = null,
  showError = false,
  className
}) => {
  const { hasAllPermissions, hasAnyPermission, isLoading } = usePermissions();

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center p-4", className)}>
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const hasAccess = requireAll 
    ? hasAllPermissions(permissions)
    : hasAnyPermission(permissions);

  if (!hasAccess) {
    if (showError) {
      return (
        <div className={cn(
          "flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-900 rounded-lg",
          className
        )}>
          <Lock className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Access Denied
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            You don't have permission to view this content.
          </p>
        </div>
      );
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

/**
 * Button wrapper that disables based on permissions
 */
interface PermissionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  permissions: PermissionCheck[];
  requireAll?: boolean;
  showTooltip?: boolean;
  children: ReactNode;
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
}

export const PermissionButton: React.FC<PermissionButtonProps> = ({
  permissions,
  requireAll = false,
  showTooltip = true,
  children,
  onClick,
  className,
  variant = 'default',
  size = 'md',
  ...props
}) => {
  const { hasAllPermissions, hasAnyPermission, isLoading } = usePermissions();

  const hasAccess = requireAll 
    ? hasAllPermissions(permissions)
    : hasAnyPermission(permissions);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!hasAccess) {
      e.preventDefault();
      e.stopPropagation();
      if (showTooltip) {
        toast.error('You do not have permission to perform this action');
      }
      return;
    }
    onClick?.(e);
  };

  // Style variants
  const variantStyles = {
    default: 'bg-blue-600 hover:bg-blue-700 text-white',
    outline: 'border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800',
    ghost: 'hover:bg-gray-100 dark:hover:bg-gray-800',
    destructive: 'bg-red-600 hover:bg-red-700 text-white'
  };

  const sizeStyles = {
    sm: 'px-2 py-1 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg'
  };

  return (
    <button
      {...props}
      onClick={handleClick}
      disabled={!hasAccess || props.disabled || isLoading}
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        variantStyles[variant],
        sizeStyles[size],
        (!hasAccess || props.disabled) && 'opacity-50 cursor-not-allowed',
        className
      )}
      title={!hasAccess ? 'You do not have permission for this action' : props.title}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : null}
      {children}
    </button>
  );
};

/**
 * Link wrapper that disables based on permissions
 */
interface PermissionLinkProps {
  href: string;
  permissions: PermissionCheck[];
  requireAll?: boolean;
  children: ReactNode;
  className?: string;
}

export const PermissionLink: React.FC<PermissionLinkProps> = ({
  href,
  permissions,
  requireAll = false,
  children,
  className
}) => {
  const router = useRouter();
  const { hasAllPermissions, hasAnyPermission } = usePermissions();

  const hasAccess = requireAll 
    ? hasAllPermissions(permissions)
    : hasAnyPermission(permissions);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!hasAccess) {
      toast.error('You do not have permission to access this page');
      return;
    }
    router.push(href);
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      className={cn(
        'cursor-pointer',
        !hasAccess && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {children}
    </a>
  );
};

/**
 * Hook to check if user can perform CRUD operations
 */
export const useCrudPermissions = (resource: 'school' | 'branch' | 'teacher' | 'student' | 'admin') => {
  const { canCreate, canModify, canDelete, canView } = usePermissions();

  return {
    canCreate: canCreate(resource),
    canModify: canModify(resource),
    canDelete: canDelete(resource),
    canViewAll: canView(
      resource === 'school' ? 'schools' :
      resource === 'branch' ? 'branches' :
      'users'
    )
  };
};

/**
 * HOC for protecting pages with permissions
 */
export function withPermissions<P extends object>(
  Component: React.ComponentType<P>,
  requiredPermissions: PermissionCheck[],
  requireAll: boolean = false
) {
  return function ProtectedComponent(props: P) {
    const { hasAllPermissions, hasAnyPermission, isLoading } = usePermissions();
    const router = useRouter();
    const [hasAccess, setHasAccess] = useState<boolean | null>(null);

    useEffect(() => {
      if (!isLoading) {
        const access = requireAll 
          ? hasAllPermissions(requiredPermissions)
          : hasAnyPermission(requiredPermissions);

        setHasAccess(access);

        if (!access) {
          toast.error('You do not have permission to access this page');
          router.push('/unauthorized');
        }
      }
    }, [isLoading, hasAllPermissions, hasAnyPermission, requiredPermissions, requireAll, router]);

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
        </div>
      );
    }

    if (hasAccess === false) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen">
          <Shield className="h-16 w-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-center max-w-md">
            You don't have the required permissions to access this page.
            Please contact your administrator if you believe this is an error.
          </p>
        </div>
      );
    }

    return <Component {...props} />;
  };
}

/**
 * Hook for menu/navigation visibility
 */
export const useNavigationPermissions = () => {
  const { canView, canCreate, hasPermission } = usePermissions();

  return {
    showSchools: canView('schools') || canCreate('school'),
    showBranches: canView('branches') || canCreate('branch'),
    showAdmins: hasPermission('users', 'view_all_users') || 
                hasPermission('users', 'create_entity_admin') ||
                hasPermission('users', 'create_sub_admin') ||
                hasPermission('users', 'create_school_admin') ||
                hasPermission('users', 'create_branch_admin'),
    showTeachers: hasPermission('users', 'view_all_users') || hasPermission('users', 'create_teacher'),
    showStudents: hasPermission('users', 'view_all_users') || hasPermission('users', 'create_student'),
    showSettings: canView('settings'),
    showAuditLogs: canView('audit_logs'),
    showReports: hasPermission('settings', 'export_data'),
    showOrganizationStructure: canView('schools') || canView('branches')
  };
};

/**
 * Hook to check multiple permissions at once
 */
export const usePermissionChecks = (checks: PermissionCheck[]) => {
  const { hasPermission, isLoading } = usePermissions();
  const [results, setResults] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isLoading) {
      const newResults: Record<string, boolean> = {};
      checks.forEach(check => {
        const key = `${check.category}.${check.permission}`;
        newResults[key] = hasPermission(check.category, check.permission);
      });
      setResults(newResults);
    }
  }, [checks, hasPermission, isLoading]);

  return { results, isLoading };
};

/**
 * Permission check for form fields
 */
interface PermissionFieldProps {
  children: ReactNode;
  permissions: PermissionCheck[];
  requireAll?: boolean;
  disabledMessage?: string;
}

export const PermissionField: React.FC<PermissionFieldProps> = ({
  children,
  permissions,
  requireAll = false,
  disabledMessage = 'You do not have permission to edit this field'
}) => {
  const { hasAllPermissions, hasAnyPermission } = usePermissions();

  const hasAccess = requireAll 
    ? hasAllPermissions(permissions)
    : hasAnyPermission(permissions);

  if (!hasAccess) {
    return (
      <div className="relative">
        <div className="opacity-50 pointer-events-none">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50/80 dark:bg-gray-900/80">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Lock className="h-4 w-4" />
            <span>{disabledMessage}</span>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

/**
 * Batch permission checker for performance
 */
export const useBatchPermissions = () => {
  const { permissions } = usePermissions();

  const checkBatch = useCallback((checks: PermissionCheck[]): Record<string, boolean> => {
    const results: Record<string, boolean> = {};
    
    if (!permissions) {
      checks.forEach(check => {
        results[`${check.category}.${check.permission}`] = false;
      });
      return results;
    }

    checks.forEach(check => {
      const key = `${check.category}.${check.permission}`;
      results[key] = (permissions[check.category] as any)?.[check.permission] === true;
    });

    return results;
  }, [permissions]);

  return { checkBatch };
};

/**
 * Permission-based visibility wrapper
 */
interface ShowIfPermittedProps {
  permissions: PermissionCheck[];
  requireAll?: boolean;
  children: ReactNode;
}

export const ShowIfPermitted: React.FC<ShowIfPermittedProps> = ({
  permissions,
  requireAll = false,
  children
}) => {
  const { hasAllPermissions, hasAnyPermission, isLoading } = usePermissions();

  if (isLoading) return null;

  const hasAccess = requireAll 
    ? hasAllPermissions(permissions)
    : hasAnyPermission(permissions);

  return hasAccess ? <>{children}</> : null;
};

/**
 * Hook for admin level checks
 */
export const useAdminLevel = () => {
  const { adminLevel } = usePermissions();

  return {
    isEntityAdmin: adminLevel === 'entity_admin',
    isSubEntityAdmin: adminLevel === 'sub_entity_admin',
    isSchoolAdmin: adminLevel === 'school_admin',
    isBranchAdmin: adminLevel === 'branch_admin',
    adminLevel
  };
};

// Re-export usePermissions for convenience
export { usePermissions } from '@/contexts/PermissionContext';