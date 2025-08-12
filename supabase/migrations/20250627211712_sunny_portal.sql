/*
  # Add subtopic_id column to materials table

  1. Changes
    - Add `subtopic_id` column to `materials` table
    - Add foreign key constraint to `edu_subtopics` table

  2. Security
    - No changes to RLS policies needed
*/

-- Add subtopic_id column to materials table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'materials' AND column_name = 'subtopic_id'
  ) THEN
    ALTER TABLE materials ADD COLUMN subtopic_id uuid;
  END IF;
END $$;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'materials_subtopic_id_fkey'
  ) THEN
    ALTER TABLE materials 
    ADD CONSTRAINT materials_subtopic_id_fkey 
    FOREIGN KEY (subtopic_id) REFERENCES edu_subtopics(id) ON DELETE SET NULL;
  END IF;
END $$;