/*
  # Fix is_admin_user Function for License Management

  ## Summary
  - Updates the is_admin_user(uuid) helper to handle both legacy and current admin_users schemas
  - Ensures the function recognises admin records stored in either id or user_id columns
  - Treats only active admin records as valid

  ## Rationale
  System admin operations (like creating licenses) rely on the is_admin_user() helper. The previous
  implementation only matched admin_users.id, which fails in environments where admin_users.user_id
  stores the auth user reference. This caused RLS policies to reject legitimate admin actions.
*/

-- Replace the helper so it works with both id and user_id storage patterns
DROP FUNCTION IF EXISTS is_admin_user(UUID);

CREATE OR REPLACE FUNCTION is_admin_user(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  has_user_id_column BOOLEAN;
  sql TEXT;
  result BOOLEAN;
BEGIN
  -- Detect whether the admin_users table has a separate user_id column
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'admin_users'
      AND column_name = 'user_id'
  ) INTO has_user_id_column;

  -- Build a query that checks both id and user_id when available
  sql := 'SELECT EXISTS (
            SELECT 1
            FROM admin_users
            WHERE (id = $1';

  IF has_user_id_column THEN
    sql := sql || ' OR user_id = $1';
  END IF;

  sql := sql || ')
              AND COALESCE(status, ''active'') = ''active''
          )';

  EXECUTE sql INTO result USING p_user_id;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION is_admin_user(UUID) IS
  'Returns true when the supplied user has an active admin_users record. Supports schemas that store the auth user reference in either id or user_id.';

GRANT EXECUTE ON FUNCTION is_admin_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_user(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION is_admin_user(UUID) TO anon;
