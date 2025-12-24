/*
  # Fix Function Search Path Security Vulnerabilities

  1. Issue
    - Functions update_file_metadata and can_user_create_materials have mutable search paths
    - This creates security risks where malicious users could manipulate search_path
    - Can lead to privilege escalation or unexpected behavior

  2. Solution
    - Use CREATE OR REPLACE to update functions with explicit SET search_path configuration
    - Lock search_path to 'pg_catalog, public' for security
    - Maintains all existing functionality while improving security

  3. Security Impact
    - Prevents search_path manipulation attacks
    - Ensures functions always resolve schema-qualified objects correctly
    - Best practice for SECURITY DEFINER functions

  4. Functions Fixed
    - update_file_metadata() - Trigger function for materials table
    - can_user_create_materials(uuid) - Diagnostic function for permissions
*/

-- Recreate update_file_metadata with fixed search_path
CREATE OR REPLACE FUNCTION public.update_file_metadata()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $function$
BEGIN
  -- Extract file extension from file_path
  NEW.file_extension := LOWER(SUBSTRING(NEW.file_path FROM '\.([^.]+)$'));
  
  -- Set file category based on mime_type
  IF NEW.mime_type LIKE 'video/%' THEN
    NEW.file_category := 'video';
    NEW.viewer_type := 'video';
  ELSIF NEW.mime_type LIKE 'audio/%' THEN
    NEW.file_category := 'audio';
    NEW.viewer_type := 'audio';
  ELSIF NEW.mime_type LIKE 'image/%' THEN
    NEW.file_category := 'image';
    NEW.viewer_type := 'image';
  ELSIF NEW.mime_type = 'application/pdf' THEN
    NEW.file_category := 'document';
    NEW.viewer_type := 'pdf';
  ELSIF NEW.mime_type IN (
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.oasis.opendocument.text'
  ) THEN
    NEW.file_category := 'document';
    NEW.viewer_type := 'word';
  ELSIF NEW.mime_type IN (
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.oasis.opendocument.spreadsheet'
  ) THEN
    NEW.file_category := 'document';
    NEW.viewer_type := 'excel';
  ELSIF NEW.mime_type IN (
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
    'application/vnd.oasis.opendocument.presentation'
  ) THEN
    NEW.file_category := 'document';
    NEW.viewer_type := 'powerpoint';
  ELSIF NEW.mime_type LIKE 'text/%' OR NEW.mime_type = 'application/json' THEN
    NEW.file_category := 'text';
    IF NEW.mime_type IN ('text/html', 'text/css', 'text/javascript', 'application/javascript', 'application/json', 'text/xml', 'application/xml') THEN
      NEW.viewer_type := 'code';
    ELSE
      NEW.viewer_type := 'text';
    END IF;
  ELSIF NEW.mime_type IN ('application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed') THEN
    NEW.file_category := 'archive';
    NEW.viewer_type := 'generic';
  ELSE
    NEW.file_category := 'other';
    NEW.viewer_type := 'generic';
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recreate can_user_create_materials with fixed search_path
CREATE OR REPLACE FUNCTION public.can_user_create_materials(test_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  result jsonb;
  is_admin boolean;
  user_exists boolean;
  admin_record_exists boolean;
  user_active boolean;
BEGIN
  -- Check if user exists
  SELECT EXISTS(SELECT 1 FROM public.users WHERE auth_user_id = test_user_id)
  INTO user_exists;
  
  -- Check if user is active
  SELECT is_active INTO user_active
  FROM public.users 
  WHERE auth_user_id = test_user_id;
  
  -- Check if admin record exists
  SELECT EXISTS(SELECT 1 FROM public.admin_users WHERE id = test_user_id)
  INTO admin_record_exists;
  
  -- Check if passes is_system_admin
  SELECT EXISTS(SELECT 1 FROM public.admin_users WHERE id = test_user_id)
  INTO is_admin;
  
  result := jsonb_build_object(
    'user_exists', user_exists,
    'user_active', user_active,
    'admin_record_exists', admin_record_exists,
    'passes_is_system_admin', is_admin,
    'can_create_materials', (user_exists AND user_active AND admin_record_exists AND is_admin)
  );
  
  RETURN result;
END;
$function$;
