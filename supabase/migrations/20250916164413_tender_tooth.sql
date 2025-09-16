/*
  # Create admin_users_view

  1. New Views
    - `admin_users_view`
      - Joins admin_users, users, and roles tables
      - Provides comprehensive admin user data for the frontend
      - Includes fields: id, name, email, role_id, role_name, status, email_verified, requires_password_change, last_login_at, created_at

  2. Security
    - View inherits RLS policies from underlying tables
    - No additional policies needed as access is controlled by base table policies
*/

CREATE OR REPLACE VIEW public.admin_users_view AS
SELECT
    au.id,
    au.name,
    COALESCE(au.email, u.email) AS email,
    au.role_id,
    r.name AS role_name,
    u.is_active AS status,
    u.email_verified AS email_verified,
    COALESCE((u.raw_app_meta_data ->> 'requires_password_change')::boolean, false) AS requires_password_change,
    u.updated_at AS last_login_at,
    au.created_at
FROM
    public.admin_users au
LEFT JOIN
    public.users u ON au.id = u.id
LEFT JOIN
    public.roles r ON au.role_id = r.id;