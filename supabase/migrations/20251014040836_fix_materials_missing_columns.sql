/*
  # Fix Missing Columns in Materials Table
  
  ## Problem
  The materials table is missing required columns that were supposed to be added by the
  teacher materials migration but were never actually created. This is causing insertion
  errors when trying to create materials.
  
  ## Missing Columns
  - school_id (uuid, nullable) - for school-specific materials
  - created_by_role (text, NOT NULL, default 'system_admin') - tracks uploader role
  - visibility_scope (text, NOT NULL, default 'global') - access scope
  - grade_id (uuid, nullable) - for grade-level filtering
  - teacher_id (uuid, nullable) - tracks which teacher uploaded
  
  ## Changes
  1. Add all missing columns to materials table with proper constraints
  2. Create necessary foreign key relationships
  3. Create indexes for optimized queries
  4. Backfill existing materials with default values
  
  ## Security
  All columns are optional or have sensible defaults. Existing RLS policies will continue
  to work with these new columns.
*/

-- ============================================================================
-- STEP 1: Add missing columns to materials table
-- ============================================================================

-- Add school_id column for school-specific materials
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'materials' AND column_name = 'school_id'
  ) THEN
    ALTER TABLE materials ADD COLUMN school_id uuid;
    ALTER TABLE materials ADD CONSTRAINT materials_school_id_fkey
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_materials_school_id ON materials(school_id);
  END IF;
END $$;

-- Add created_by_role column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'materials' AND column_name = 'created_by_role'
  ) THEN
    ALTER TABLE materials ADD COLUMN created_by_role text DEFAULT 'system_admin' NOT NULL;
    ALTER TABLE materials ADD CONSTRAINT materials_created_by_role_check
      CHECK (created_by_role IN ('system_admin', 'teacher'));
  END IF;
END $$;

-- Add visibility_scope column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'materials' AND column_name = 'visibility_scope'
  ) THEN
    ALTER TABLE materials ADD COLUMN visibility_scope text DEFAULT 'global' NOT NULL;
    ALTER TABLE materials ADD CONSTRAINT materials_visibility_scope_check
      CHECK (visibility_scope IN ('global', 'school', 'branch'));
  END IF;
END $$;

-- Add grade_id column for teacher materials
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'materials' AND column_name = 'grade_id'
  ) THEN
    ALTER TABLE materials ADD COLUMN grade_id uuid;
    ALTER TABLE materials ADD CONSTRAINT materials_grade_id_fkey
      FOREIGN KEY (grade_id) REFERENCES grade_levels(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_materials_grade_id ON materials(grade_id);
  END IF;
END $$;

-- Add teacher_id column to track which teacher uploaded the material
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'materials' AND column_name = 'teacher_id'
  ) THEN
    ALTER TABLE materials ADD COLUMN teacher_id uuid;
    ALTER TABLE materials ADD CONSTRAINT materials_teacher_id_fkey
      FOREIGN KEY (teacher_id) REFERENCES entity_users(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_materials_teacher_id ON materials(teacher_id);
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Create composite indexes for optimized queries
-- ============================================================================

-- Index for student material access queries (by subject and visibility)
CREATE INDEX IF NOT EXISTS idx_materials_student_access
  ON materials(data_structure_id, visibility_scope, status)
  WHERE status = 'active';

-- Index for school-specific material queries
CREATE INDEX IF NOT EXISTS idx_materials_school_subject
  ON materials(school_id, data_structure_id, status)
  WHERE school_id IS NOT NULL;

-- Index for teacher's own materials
CREATE INDEX IF NOT EXISTS idx_materials_teacher_active
  ON materials(teacher_id, status)
  WHERE teacher_id IS NOT NULL AND status = 'active';

-- Index for visibility scope filtering
CREATE INDEX IF NOT EXISTS idx_materials_visibility
  ON materials(visibility_scope, status)
  WHERE status = 'active';

-- ============================================================================
-- STEP 3: Backfill existing data
-- ============================================================================

-- Update existing materials to have global visibility and system admin role
UPDATE materials
SET
  visibility_scope = COALESCE(visibility_scope, 'global'),
  created_by_role = COALESCE(created_by_role, 'system_admin'),
  school_id = NULL,
  teacher_id = NULL
WHERE visibility_scope IS NULL OR created_by_role IS NULL;

-- ============================================================================
-- STEP 4: Add helpful comments
-- ============================================================================

COMMENT ON COLUMN materials.school_id IS 'References schools table. NULL for global materials, populated for school-specific materials';
COMMENT ON COLUMN materials.created_by_role IS 'Indicates who uploaded: system_admin (global) or teacher (school-specific)';
COMMENT ON COLUMN materials.visibility_scope IS 'Access scope: global (all students), school (same school only), branch (same branch only)';
COMMENT ON COLUMN materials.grade_id IS 'Optional grade level association for teacher materials';
COMMENT ON COLUMN materials.teacher_id IS 'References entity_users. Tracks which teacher uploaded the material';
COMMENT ON COLUMN materials.thumbnail_url IS 'URL or path to the thumbnail/preview image for the material';
