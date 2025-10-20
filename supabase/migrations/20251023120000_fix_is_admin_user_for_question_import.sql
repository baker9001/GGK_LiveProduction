/*
  # Harden is_admin_user lookup for question import workflow

  ## Summary
  - Ensure the is_admin_user() helper works regardless of whether admin_users
    stores the auth user id in user_id or relies on the legacy id linkage
  - Prevents false negatives when RLS policies check admin permissions during
    question review/import inserts
  - Re-grants execution permissions after redefining the helper
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'admin_users'
      AND column_name = 'user_id'
  ) THEN
    EXECUTE $$
      CREATE OR REPLACE FUNCTION is_admin_user(user_id uuid)
      RETURNS boolean
      LANGUAGE plpgsql
      STABLE
      SECURITY DEFINER
      AS $$
      DECLARE
        result boolean;
      BEGIN
        IF user_id IS NULL THEN
          RETURN false;
        END IF;

        SELECT EXISTS (
          SELECT 1
          FROM admin_users au
          LEFT JOIN users u ON u.id = au.user_id
          WHERE (
            au.user_id = user_id
            OR u.auth_user_id = user_id
          )
            AND COALESCE(au.is_active, true)
            AND COALESCE(u.is_active, true)
        )
        INTO result;

        RETURN COALESCE(result, false);
      END;
      $$;
    $$;
  ELSE
    EXECUTE $$
      CREATE OR REPLACE FUNCTION is_admin_user(user_id uuid)
      RETURNS boolean
      LANGUAGE plpgsql
      STABLE
      SECURITY DEFINER
      AS $$
      DECLARE
        result boolean;
      BEGIN
        IF user_id IS NULL THEN
          RETURN false;
        END IF;

        SELECT EXISTS (
          SELECT 1
          FROM admin_users au
          JOIN users u ON u.id = au.id
          WHERE u.auth_user_id = user_id
            AND COALESCE(au.is_active, true)
            AND COALESCE(u.is_active, true)
        )
        INTO result;

        RETURN COALESCE(result, false);
      END;
      $$;
    $$;
  END IF;
END $$;

COMMENT ON FUNCTION is_admin_user(uuid) IS
  'Checks if the supplied auth user id belongs to an active admin user. Supports both legacy admin_users.id linkage and newer admin_users.user_id column.';

GRANT EXECUTE ON FUNCTION is_admin_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_user(uuid) TO anon;
GRANT EXECUTE ON FUNCTION is_admin_user(uuid) TO service_role;
