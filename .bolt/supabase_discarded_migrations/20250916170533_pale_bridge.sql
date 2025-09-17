/*
  # Create admin_users_view

  Creates a view that combines admin_users, users, roles, and admin_invitations tables
  to provide all necessary data for the admin users interface.

  ## Tables joined:
  - admin_users: Core admin user data
  - users: Authentication and status data  
  - roles: Role information
  - admin_invitations: Invitation status tracking

  ## Fields provided:
  - Basic user info (id, name, email, role)
  - Status information (active/inactive, email verification)
  - Timestamps (created_at, last_login_at)
  - Invitation status tracking
*/

CREATE OR REPLACE VIEW public.admin_users_view AS
SELECT
    au.id,
    au.name,
    COALESCE(u.email, au.email) as email,
    au.role_id,
    COALESCE(r.name, 'Unknown Role') AS role_name,
    CASE
        WHEN u.is_active = TRUE THEN 'active'::text
        ELSE 'inactive'::text
    END AS status,
    au.created_at,
    COALESCE(u.email_verified, false) AS email_verified,
    false AS requires_password_change, -- Not available in current schema
    NULL::timestamp with time zone AS last_login_at, -- Not available in current schema
    CASE
        WHEN inv.status = 'pending' AND inv.expires_at > NOW() THEN 'pending'::text
        WHEN inv.status = 'accepted' THEN 'accepted'::text
        WHEN inv.status = 'pending' AND inv.expires_at <= NOW() THEN 'expired'::text
        ELSE NULL::text
    END AS invitation_status
FROM
    public.admin_users au
LEFT JOIN
    public.users u ON au.id = u.id
LEFT JOIN
    public.roles r ON au.role_id = r.id
LEFT JOIN
    public.admin_invitations inv ON au.id = inv.user_id
ORDER BY au.created_at DESC;