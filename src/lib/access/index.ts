```typescript
// src/lib/access/index.ts

// Canonical Definitions
export type UserType = 'system' | 'entity' | 'teacher' | 'student' | 'parent';
export type AdminLevel = 'entity_admin' | 'sub_entity_admin' | 'school_admin' | 'branch_admin';

// User context for AccessControl
export interface UserContext {
  userId: string;
  userType: UserType;
  adminLevel?: AdminLevel; // Only applicable for 'entity' userType
  companyId?: string; // Applicable for entity, teacher, student
}

// Scope definition
export interface UserScope {
  schools: string[];
  branches: string[];
}

// Permission matrix structure
export interface PermissionMatrix {
  [category: string]: {
    [permission: string]: boolean;
  };
}

// AccessControl Class
export class AccessControl {
  private userContext: UserContext;
  private userScope: UserScope = { schools: [], branches: [] }; // Default empty scope
  private permissions: PermissionMatrix;

  // Define module access map based on userType
  private moduleAccessMap: Record<UserType, string[]> = {
    system: ['/app/system-admin', '/app/entity-module', '/app/teachers-module', '/app/student-module', '/app/parent-module'], // System can access all
    entity: ['/app/entity-module'],
    teacher: ['/app/teachers-module'],
    student: ['/app/student-module'],
    parent: ['/app/parent-module'],
  };

  // Define tab visibility matrix based on adminLevel
  // This is a simplified example; a real matrix might be more complex
  private tabVisibilityMatrix: Record<AdminLevel, string[]> = {
    entity_admin: ['structure', 'schools', 'branches', 'admins', 'teachers', 'students'],
    sub_entity_admin: ['structure', 'schools', 'branches', 'admins', 'teachers', 'students'], // Future differentiation
    school_admin: ['schools', 'branches', 'teachers', 'students'], // No 'structure' or 'admins' tab
    branch_admin: ['branches', 'teachers', 'students'], // Only 'branches', 'teachers', 'students'
  };

  // Define action permission matrix (simplified for demonstration)
  // In a real system, this would be more granular and potentially loaded from DB
  private actionPermissionMatrix: Record<AdminLevel, PermissionMatrix> = {
    entity_admin: {
      school: { create: true, modify: true, delete: true, view: true },
      branch: { create: true, modify: true, delete: true, view: true },
      user: { create: true, modify: true, delete: true, view: true },
      settings: { manage: true, view_audit: true, export: true },
    },
    sub_entity_admin: {
      school: { create: true, modify: true, delete: true, view: true },
      branch: { create: true, modify: true, delete: true, view: true },
      user: { create: true, modify: true, delete: true, view: true },
      settings: { manage: true, view_audit: true, export: true },
    },
    school_admin: {
      school: { create: false, modify: true, delete: false, view: true },
      branch: { create: true, modify: true, delete: true, view: true },
      user: { create: true, modify: true, delete: false, view: true },
      settings: { manage: true, view_audit: false, export: false },
    },
    branch_admin: {
      school: { create: false, modify: false, delete: false, view: false },
      branch: { create: false, modify: true, delete: false, view: true },
      user: { create: true, modify: true, delete: false, view: true },
      settings: { manage: true, view_audit: false, export: false },
    },
  };

  constructor(userContext: UserContext) {
    this.userContext = userContext;
    // Initialize permissions based on adminLevel, or minimal if not an admin
    this.permissions = userContext.adminLevel 
      ? this.actionPermissionMatrix[userContext.adminLevel] 
      : this.getMinimalPermissions();
  }

  // --- Core Access Methods ---

  /**
   * Checks if the user has access to a specific module.
   * @param modulePath The base path of the module (e.g., '/app/entity-module').
   * @returns True if the user can access the module, false otherwise.
   */
  canAccessModule(modulePath: string): boolean {
    const allowedPaths = this.moduleAccessMap[this.userContext.userType];
    return allowedPaths.some(path => modulePath.startsWith(path));
  }

  /**
   * Checks if the user can view a specific tab within a module.
   * This is primarily for UI visibility.
   * @param tabName The name of the tab (e.g., 'schools', 'admins').
   * @returns True if the user can view the tab, false otherwise.
   */
  canViewTab(tabName: string): boolean {
    if (this.userContext.userType !== 'entity' || !this.userContext.adminLevel) {
      return false; // Only entity users with an admin level can view admin tabs
    }
    const allowedTabs = this.tabVisibilityMatrix[this.userContext.adminLevel];
    return allowedTabs.includes(tabName);
  }

  /**
   * Checks if the user can perform a specific action on a given context.
   * This is for granular permission checks (e.g., create a school, edit a teacher).
   * @param action The action to check ('create', 'modify', 'delete', 'view').
   * @param context The resource context ('school', 'branch', 'user', 'settings').
   * @param entityId Optional: The ID of the specific entity for scoped permissions.
   * @returns True if the user can perform the action, false otherwise.
   */
  can(action: 'create' | 'modify' | 'delete' | 'view' | 'manage' | 'view_audit' | 'export', context: 'school' | 'branch' | 'user' | 'settings'): boolean {
    if (!this.userContext.adminLevel) {
      return false; // Non-admin users cannot perform admin actions
    }
    
    const categoryPermissions = this.permissions[context];
    if (!categoryPermissions) {
      return false; // Category not defined in permissions
    }

    return categoryPermissions[action] === true;
  }

  /**
   * Fetches the user's assigned scope (schools and branches).
   * In a real application, this would call a Supabase RPC or query a scope table.
   * For Phase 1, this is a mock implementation.
   * @param userId The ID of the user.
   * @returns A promise resolving to the user's scope.
   */
  async getUserScope(userId: string): Promise<UserScope> {
    // Mock implementation for Phase 1
    // In Phase 5, this will be replaced by an actual Supabase RPC call
    console.log(`[AccessControl] Fetching scope for user: ${userId}`);
    
    // Example mock scopes:
    if (this.userContext.adminLevel === 'school_admin') {
      return { schools: ['school-id-1', 'school-id-2'], branches: [] };
    }
    if (this.userContext.adminLevel === 'branch_admin') {
      return { schools: [], branches: ['branch-id-1'] };
    }
    return { schools: [], branches: [] }; // Default empty scope
  }

  /**
   * Generates Supabase query filters based on the user's scope and admin level.
   * @param entityType The type of entity to filter ('school' or 'branch').
   * @returns An object containing Supabase filters, or null for full access.
   */
  getScopeFilters(entityType: 'school' | 'branch'): Record<string, any> | null {
    // System users and Entity Admins have full access, no filters needed
    if (this.userContext.userType === 'system' || this.userContext.adminLevel === 'entity_admin') {
      return null;
    }

    // Apply filters based on assigned scope
    if (entityType === 'school' && this.userScope.schools.length > 0) {
      return { school_id: { in: this.userScope.schools } };
    }
    if (entityType === 'branch' && this.userScope.branches.length > 0) {
      return { branch_id: { in: this.userScope.branches } };
    }
    
    // If no specific scope, but not entity admin, return filter that yields no results
    // This prevents accidental full access for scoped admins without assigned scopes
    if (this.userContext.adminLevel && this.userContext.adminLevel !== 'entity_admin') {
        return { id: { in: [] } }; // Return empty array to restrict access
    }

    return null; // No specific filters needed or no scope applies
  }

  /**
   * Enforces module isolation by returning a redirect path if the user is unauthorized.
   * @param userType The user's type.
   * @param currentPath The current path the user is trying to access.
   * @returns The redirect path if unauthorized, otherwise null.
   */
  enforceModuleIsolation(userType: UserType, currentPath: string): string | null {
    const allowedPaths = this.moduleAccessMap[userType];
    const isAllowed = allowedPaths.some(path => currentPath.startsWith(path));

    if (!isAllowed) {
      // Redirect to their default module dashboard
      const defaultRedirectMap: Record<UserType, string> = {
        system: '/app/system-admin/dashboard',
        entity: '/app/entity-module/dashboard',
        teacher: '/app/teachers-module/dashboard',
        student: '/app/student-module/dashboard',
        parent: '/app/parent-module/dashboard', // Future module
      };
      return defaultRedirectMap[userType] || '/signin'; // Fallback to signin
    }
    return null; // User is allowed
  }

  // --- Helper Methods ---

  /**
   * Sets the user's scope after it has been fetched.
   * This method should be called after `getUserScope` has resolved.
   * @param scope The fetched user scope.
   */
  setUserScope(scope: UserScope) {
    this.userScope = scope;
  }

  /**
   * Returns a minimal set of permissions for non-admin users or as a fallback.
   */
  private getMinimalPermissions(): PermissionMatrix {
    return {
      school: { create: false, modify: false, delete: false, view: false },
      branch: { create: false, modify: false, delete: false, view: false },
      user: { create: false, modify: false, delete: false, view: false },
      settings: { manage: false, view_audit: false, export: false },
    };
  }
}
```