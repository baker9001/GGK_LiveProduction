/*
  # Mock Exam Templates

  ## Overview
  Add support for saving and cloning mock exam templates to speed up repetitive exam creation.

  ## New Tables
  - `mock_exam_templates` - Stores reusable exam configurations
    - `id` (uuid, primary key)
    - `company_id` (uuid, references companies) - Owner of the template
    - `name` (text) - Template name
    - `description` (text) - What this template is for
    - `template_data` (jsonb) - Serialized exam configuration
    - `usage_count` (integer) - How many times this template was used
    - `is_shared` (boolean) - Whether template is shared across company
    - `created_by` (uuid, references users)
    - `created_at` (timestamp)
    - `updated_at` (timestamp)

  ## Security
  - Enable RLS on templates table
  - Entity admins can create, view, and use templates for their company
  - School admins can view and use company templates
  - Templates are scoped to company

  ## Indexes
  - company_id for filtering
  - created_by for ownership tracking
  - usage_count for popular templates
*/

-- Create mock_exam_templates table
CREATE TABLE IF NOT EXISTS mock_exam_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  template_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  usage_count integer DEFAULT 0 NOT NULL CHECK (usage_count >= 0),
  is_shared boolean DEFAULT true NOT NULL,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_mock_exam_templates_company 
  ON mock_exam_templates(company_id);

CREATE INDEX IF NOT EXISTS idx_mock_exam_templates_created_by 
  ON mock_exam_templates(created_by);

CREATE INDEX IF NOT EXISTS idx_mock_exam_templates_usage 
  ON mock_exam_templates(company_id, usage_count DESC);

CREATE INDEX IF NOT EXISTS idx_mock_exam_templates_shared 
  ON mock_exam_templates(company_id, is_shared) WHERE is_shared = true;

-- Enable RLS
ALTER TABLE mock_exam_templates ENABLE ROW LEVEL SECURITY;

-- Entity admins can manage templates for their company
CREATE POLICY "Entity admins can manage templates"
  ON mock_exam_templates
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id 
      FROM entity_users 
      WHERE user_id = auth.uid() 
        AND is_active = true
        AND admin_level IN ('entity_admin', 'sub_entity_admin')
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM entity_users 
      WHERE user_id = auth.uid() 
        AND is_active = true
        AND admin_level IN ('entity_admin', 'sub_entity_admin')
    )
  );

-- School and branch admins can view and use shared templates
CREATE POLICY "School admins can view shared templates"
  ON mock_exam_templates
  FOR SELECT
  TO authenticated
  USING (
    is_shared = true
    AND company_id IN (
      SELECT company_id 
      FROM entity_users 
      WHERE user_id = auth.uid() 
        AND is_active = true
    )
  );

-- System admins can view all templates
CREATE POLICY "System admins can view all templates"
  ON mock_exam_templates
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid()
    )
  );

-- Trigger to update updated_at
CREATE TRIGGER update_mock_exam_templates_updated_at
  BEFORE UPDATE ON mock_exam_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to increment usage count
CREATE OR REPLACE FUNCTION increment_template_usage(template_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE mock_exam_templates
  SET usage_count = usage_count + 1
  WHERE id = template_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION increment_template_usage TO authenticated;
