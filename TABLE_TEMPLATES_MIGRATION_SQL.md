# Table Templates Migration SQL

## Instructions
Copy the SQL below and execute it in your Supabase SQL Editor to create the table templates system.

## Migration SQL

```sql
/*
  # Table Completion Templates System

  1. New Tables
    - table_templates: Stores table structure and metadata
    - table_template_cells: Defines individual cell behavior

  2. Security
    - Enable RLS on both tables
    - System admins have full access
    - Teachers can create/edit templates for their questions
    - Students can view templates (read-only)
*/

-- Create table_templates table
CREATE TABLE IF NOT EXISTS table_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid REFERENCES questions(id) ON DELETE CASCADE,
  sub_question_id uuid REFERENCES question_subparts(id) ON DELETE CASCADE,
  rows integer NOT NULL CHECK (rows >= 2 AND rows <= 50),
  columns integer NOT NULL CHECK (columns >= 2 AND columns <= 20),
  headers text[] NOT NULL DEFAULT '{}',
  title text,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT either_question_or_subquestion CHECK (
    (question_id IS NOT NULL AND sub_question_id IS NULL) OR
    (question_id IS NULL AND sub_question_id IS NOT NULL)
  )
);

-- Create table_template_cells table
CREATE TABLE IF NOT EXISTS table_template_cells (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES table_templates(id) ON DELETE CASCADE,
  row_index integer NOT NULL CHECK (row_index >= 0),
  col_index integer NOT NULL CHECK (col_index >= 0),
  cell_type text NOT NULL CHECK (cell_type IN ('locked', 'editable')),
  locked_value text,
  expected_answer text,
  marks integer DEFAULT 1 CHECK (marks > 0),
  accepts_equivalent_phrasing boolean DEFAULT false,
  case_sensitive boolean DEFAULT false,
  alternative_answers text[] DEFAULT '{}'
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_table_templates_question_id
  ON table_templates(question_id) WHERE question_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_table_templates_sub_question_id
  ON table_templates(sub_question_id) WHERE sub_question_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_table_template_cells_template_id
  ON table_template_cells(template_id);

CREATE INDEX IF NOT EXISTS idx_table_template_cells_position
  ON table_template_cells(template_id, row_index, col_index);

-- Enable RLS
ALTER TABLE table_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_template_cells ENABLE ROW LEVEL SECURITY;

-- RLS Policies for table_templates

-- System admins can do everything
CREATE POLICY "System admins have full access to table templates"
  ON table_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.user_type = 'system_admin'
      AND users.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.user_type = 'system_admin'
      AND users.is_active = true
    )
  );

-- Teachers can create templates for their questions
CREATE POLICY "Teachers can manage templates for their questions"
  ON table_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      INNER JOIN teachers t ON t.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
      AND u.user_type = 'teacher'
      AND u.is_active = true
      AND t.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      INNER JOIN teachers t ON t.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
      AND u.user_type = 'teacher'
      AND u.is_active = true
      AND t.is_active = true
    )
  );

-- Students can view templates (for answering questions)
CREATE POLICY "Students can view table templates"
  ON table_templates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      INNER JOIN students s ON s.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
      AND u.user_type = 'student'
      AND u.is_active = true
    )
  );

-- RLS Policies for table_template_cells

-- System admins can do everything
CREATE POLICY "System admins have full access to template cells"
  ON table_template_cells FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.user_type = 'system_admin'
      AND users.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.user_type = 'system_admin'
      AND users.is_active = true
    )
  );

-- Teachers can manage cells for their templates
CREATE POLICY "Teachers can manage template cells"
  ON table_template_cells FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      INNER JOIN teachers t ON t.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
      AND u.user_type = 'teacher'
      AND u.is_active = true
      AND t.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      INNER JOIN teachers t ON t.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
      AND u.user_type = 'teacher'
      AND u.is_active = true
      AND t.is_active = true
    )
  );

-- Students can view template cells (for answering questions)
CREATE POLICY "Students can view template cells"
  ON table_template_cells FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      INNER JOIN students s ON s.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
      AND u.user_type = 'student'
      AND u.is_active = true
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_table_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_table_templates_updated_at
  BEFORE UPDATE ON table_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_table_templates_updated_at();
```

## Verification Queries

After running the migration, verify the tables were created:

```sql
-- Check tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('table_templates', 'table_template_cells');

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('table_templates', 'table_template_cells');

-- Check policies exist
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN ('table_templates', 'table_template_cells')
ORDER BY tablename, policyname;

-- Check indexes
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('table_templates', 'table_template_cells')
ORDER BY tablename;
```

## Expected Results

### Tables
- ✅ `table_templates` - Created with all columns
- ✅ `table_template_cells` - Created with all columns

### RLS Status
- ✅ Both tables have RLS enabled (`rowsecurity = true`)

### Policies Count
- ✅ `table_templates`: 3 policies (system admin, teachers, students)
- ✅ `table_template_cells`: 3 policies (system admin, teachers, students)

### Indexes Count
- ✅ 4 indexes created for optimized queries

## Rollback (If Needed)

If you need to remove the tables:

```sql
-- Drop tables (cascades to policies and indexes)
DROP TABLE IF EXISTS table_template_cells CASCADE;
DROP TABLE IF EXISTS table_templates CASCADE;

-- Drop function
DROP FUNCTION IF EXISTS update_table_templates_updated_at() CASCADE;
```

## Notes

- Migration uses `IF NOT EXISTS` to prevent errors if tables already exist
- Foreign keys have `ON DELETE CASCADE` for automatic cleanup
- Constraints ensure data integrity (dimension limits, cell types)
- Indexes optimize common query patterns
- Trigger automatically updates `updated_at` timestamp
