/**
 * File: /src/app/entity-module/organisation/tabs/admins/services/index.ts
 * 
 * Admin Services Barrel Export
 * Provides centralized access to all admin management services
 * 
 * Usage:
 *   import { adminService, hierarchyService, scopeService, permissionService, auditService } from './services';
 */

export { hierarchyService } from './hierarchyService';
export { scopeService } from './scopeService';
export { permissionService } from './permissionService';
export { adminService } from './adminService';
export { auditService } from './auditService';

// Re-export types for convenience
export type {
  AdminLevel,
  AdminPermissions,
  EntityAdminHierarchy,
  EntityAdminScope,
  AdminAuditLog
} from '../types/admin.types';