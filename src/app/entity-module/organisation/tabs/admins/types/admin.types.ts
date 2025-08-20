// Admin level types
export type AdminLevel = 'entity_admin' | 'sub_entity_admin' | 'school_admin' | 'branch_admin';

// Admin permissions interface
export interface AdminPermissions {
  users: {
    create_entity_admin: boolean;
    create_sub_admin: boolean;
    create_school_admin: boolean;
    create_branch_admin: boolean;
    create_teacher: boolean;
    create_student: boolean;
    modify_entity_admin: boolean;
    modify_sub_admin: boolean;
    modify_school_admin: boolean;
    modify_branch_admin: boolean;
    modify_teacher: boolean;
    modify_student: boolean;
    delete_users: boolean;
    view_all_users: boolean;
  };
  organization: {
    create_school: boolean;
    modify_school: boolean;
    delete_school: boolean;
    create_branch: boolean;
    modify_branch: boolean;
    delete_branch: boolean;
    view_all_schools: boolean;
    view_all_branches: boolean;
    manage_departments: boolean;
  };
  settings: {
    manage_company_settings: boolean;
    manage_school_settings: boolean;
    manage_branch_settings: boolean;
    view_audit_logs: boolean;
    export_data: boolean;
  };
}

// Database table interfaces
export interface EntityAdminHierarchy {
  id: string;
  company_id: string;
  parent_admin_id: string;
  child_admin_id: string;
  admin_type: AdminLevel;
  relationship_type: 'direct' | 'inherited';
  created_at: string;
  updated_at: string;
  created_by: string | null;
  is_active: boolean;
  metadata: Record<string, any>;
}

export interface EntityAdminScope {
  id: string;
  company_id: string;
  user_id: string;
  scope_type: 'company' | 'school' | 'branch';
  scope_id: string;
  permissions: Partial<AdminPermissions>;
  can_create_users: boolean;
  can_modify_users: boolean;
  can_delete_users: boolean;
  can_view_all: boolean;
  can_export_data: boolean;
  can_manage_settings: boolean;
  assigned_at: string;
  assigned_by: string | null;
  expires_at: string | null;
  is_active: boolean;
  notes: string | null;
}

export interface AdminAuditLog {
  id: string;
  company_id: string;
  action_type: 'admin_created' | 'admin_modified' | 'admin_deleted' | 'permission_granted' | 'permission_revoked' | 'scope_assigned' | 'scope_removed' | 'hierarchy_changed';
  actor_id: string;
  target_id: string | null;
  target_type: string | null;
  changes: Record<string, any>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  metadata: Record<string, any>;
}