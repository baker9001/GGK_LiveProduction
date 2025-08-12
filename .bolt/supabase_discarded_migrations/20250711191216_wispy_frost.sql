/*
  # Add unit_id column to materials table

  1. Changes
    - Add unit_id column to materials table
    - Add foreign key constraint to edu_units table
    - Add index for better query performance

  2. Security
    - No changes to RLS policies needed
*/

-- Add unit_id column to materials table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'materials' AND column_name = 'unit_id'
  ) THEN
    ALTER TABLE materials ADD COLUMN unit_id uuid;
    
    -- Add foreign key constraint
    ALTER TABLE materials 
    ADD CONSTRAINT materials_unit_id_fkey 
    FOREIGN KEY (unit_id) REFERENCES edu_units(id) ON DELETE SET NULL;
    
    -- Add index for better performance
    CREATE INDEX idx_materials_unit_id ON materials(unit_id);
    
    RAISE NOTICE 'Added unit_id column to materials table';
  ELSE
    RAISE NOTICE 'unit_id column already exists in materials table';
  END IF;
END $$;

-- Notify PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';