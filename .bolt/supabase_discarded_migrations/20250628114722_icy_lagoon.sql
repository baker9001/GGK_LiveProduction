-- Add a migration to map board to provider
DO $$
DECLARE
  column_exists BOOLEAN;
BEGIN
  -- Check if board column exists in papers_setup table
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'papers_setup' AND column_name = 'board'
  ) INTO column_exists;
  
  -- If board column exists, we need to migrate data to provider_id
  IF column_exists THEN
    -- First, ensure all boards have corresponding providers
    INSERT INTO providers (name, code, status)
    SELECT DISTINCT 
      board, 
      SUBSTRING(REGEXP_REPLACE(LOWER(board), '[^a-z0-9]', '', 'g'), 1, 10), 
      'active'
    FROM papers_setup
    WHERE board IS NOT NULL AND board != ''
    AND NOT EXISTS (
      SELECT 1 FROM providers WHERE LOWER(name) = LOWER(papers_setup.board)
    );
    
    -- Update papers_setup to use provider_id based on board name
    UPDATE papers_setup ps
    SET provider_id = p.id
    FROM providers p
    WHERE LOWER(ps.board) = LOWER(p.name)
    AND ps.provider_id IS NULL;
    
    -- Now we can drop the board column
    ALTER TABLE papers_setup DROP COLUMN IF EXISTS board;
  END IF;
END $$;

-- Add duration column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'papers_setup' AND column_name = 'duration'
  ) THEN
    ALTER TABLE papers_setup ADD COLUMN duration text;
  END IF;
END $$;