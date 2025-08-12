-- Rename sort_order column to sort in topics table
ALTER TABLE topics 
RENAME COLUMN sort_order TO sort;

-- Update indexes
DROP INDEX IF EXISTS idx_topics_sort_order;
CREATE INDEX idx_topics_sort ON topics(sort);

-- Notify PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';