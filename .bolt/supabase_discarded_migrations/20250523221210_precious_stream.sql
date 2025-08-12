-- Rename sort_order column to sort in chapters table
ALTER TABLE chapters 
RENAME COLUMN sort_order TO sort;

-- Update indexes
DROP INDEX IF EXISTS idx_chapters_sort_order;
CREATE INDEX idx_chapters_sort ON chapters(sort);

-- Notify PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';