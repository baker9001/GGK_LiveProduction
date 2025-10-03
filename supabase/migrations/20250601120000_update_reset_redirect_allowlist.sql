-- Ensure Supabase Auth redirect allowlist uses the /reset-password route
DO $$
DECLARE
  current_urls text[];
  sanitized_urls text[];
  target_url constant text := 'https://ggknowledge.com/reset-password';
  legacy_url constant text := 'https://ggknowledge.com/auth/reset-password';
BEGIN
  SELECT additional_redirect_urls
  INTO current_urls
  FROM auth.config
  LIMIT 1;

  IF current_urls IS NULL THEN
    current_urls := ARRAY[]::text[];
  END IF;

  sanitized_urls := ARRAY(
    SELECT DISTINCT url
    FROM unnest(current_urls) AS url
    WHERE url IS NOT NULL
  );

  sanitized_urls := array_remove(sanitized_urls, legacy_url);

  IF NOT sanitized_urls @> ARRAY[target_url] THEN
    sanitized_urls := sanitized_urls || target_url;
  END IF;

  UPDATE auth.config
  SET additional_redirect_urls = sanitized_urls;
END $$;
