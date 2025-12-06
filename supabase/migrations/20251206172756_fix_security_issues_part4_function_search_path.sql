/*
  # Fix Function Search Path Security Issues
  
  1. Security Enhancement
    - Add explicit `SET search_path = public` to 3 functions to prevent search_path manipulation attacks
    - Functions affected:
      - `update_table_templates_import_review_updated_at()` - Trigger function for timestamp updates
      - `validate_table_template_json()` - Validates table template JSON structure
      - `get_table_template_stats()` - Returns analytics on table templates
  
  2. Changes Made
    - Drop and recreate each function with same logic
    - Add `SET search_path = public` to each function definition
    - Preserve all function properties (IMMUTABLE, STABLE, LANGUAGE, etc.)
  
  3. Security Impact
    - Prevents malicious users from manipulating search_path to inject malicious functions
    - Ensures functions only reference objects in the public schema
    - No functional changes to existing behavior
*/

-- Fix 1: update_table_templates_import_review_updated_at()
-- Trigger function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_table_templates_import_review_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix 2: validate_table_template_json()
-- Validates table template JSON structure and required fields
CREATE OR REPLACE FUNCTION public.validate_table_template_json(template_text text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $function$
DECLARE
  template JSONB;
BEGIN
  -- Null or empty is invalid
  IF template_text IS NULL OR trim(template_text) = '' THEN
    RETURN FALSE;
  END IF;

  -- Must be valid JSON
  BEGIN
    template := template_text::jsonb;
  EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
  END;

  -- Must have required fields
  IF NOT (
    template ? 'rows' AND
    template ? 'columns' AND
    template ? 'headers' AND
    template ? 'cells'
  ) THEN
    RETURN FALSE;
  END IF;

  -- Rows and columns must be numbers
  IF NOT (
    jsonb_typeof(template->'rows') = 'number' AND
    jsonb_typeof(template->'columns') = 'number'
  ) THEN
    RETURN FALSE;
  END IF;

  -- Headers must be array
  IF jsonb_typeof(template->'headers') != 'array' THEN
    RETURN FALSE;
  END IF;

  -- Cells must be array with at least one cell
  IF jsonb_typeof(template->'cells') != 'array' OR
     jsonb_array_length(template->'cells') = 0 THEN
    RETURN FALSE;
  END IF;

  -- Each cell must have required fields
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(template->'cells') AS cell
    WHERE NOT (
      cell ? 'rowIndex' AND
      cell ? 'colIndex' AND
      cell ? 'cellType' AND
      cell->>'cellType' IN ('locked', 'editable')
    )
  ) THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$function$;

-- Fix 3: get_table_template_stats()
-- Returns comprehensive analytics on table templates
CREATE OR REPLACE FUNCTION public.get_table_template_stats()
RETURNS TABLE(
  total_templates bigint,
  templates_with_answer_text bigint,
  avg_cells_per_template numeric,
  avg_editable_cells numeric,
  avg_rows numeric,
  avg_columns numeric,
  templates_with_validation_errors bigint
)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_templates,
    COUNT(CASE WHEN answer_text IS NOT NULL AND LENGTH(answer_text) > 10 THEN 1 END) as templates_with_answer_text,
    AVG(
      CASE
        WHEN answer_text IS NOT NULL THEN
          jsonb_array_length((answer_text::jsonb)->'cells')
        ELSE NULL
      END
    ) as avg_cells_per_template,
    AVG(
      CASE
        WHEN answer_text IS NOT NULL THEN
          (
            SELECT COUNT(*)
            FROM jsonb_array_elements((answer_text::jsonb)->'cells') AS cell
            WHERE cell->>'cellType' = 'editable'
          )
        ELSE NULL
      END
    ) as avg_editable_cells,
    AVG(
      CASE
        WHEN answer_text IS NOT NULL THEN
          ((answer_text::jsonb)->>'rows')::NUMERIC
        ELSE NULL
      END
    ) as avg_rows,
    AVG(
      CASE
        WHEN answer_text IS NOT NULL THEN
          ((answer_text::jsonb)->>'columns')::NUMERIC
        ELSE NULL
      END
    ) as avg_columns,
    COUNT(
      CASE
        WHEN answer_type = 'table_template' AND NOT validate_table_template_json(answer_text) THEN 1
        ELSE NULL
      END
    ) as templates_with_validation_errors
  FROM question_correct_answers
  WHERE answer_type = 'table_template';
END;
$function$;