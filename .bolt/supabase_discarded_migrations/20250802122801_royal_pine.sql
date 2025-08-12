-- Add json_hash column to past_paper_import_sessions table
ALTER TABLE past_paper_import_sessions 
ADD COLUMN IF NOT EXISTS json_hash TEXT;

-- Add index for faster duplicate detection
CREATE INDEX IF NOT EXISTS idx_past_paper_import_sessions_json_hash 
ON past_paper_import_sessions(json_hash) 
WHERE status = 'in_progress';

-- Optional: Add composite index for paper code + year lookups
CREATE INDEX IF NOT EXISTS idx_past_paper_import_sessions_paper_lookup
ON past_paper_import_sessions((raw_json->>'paper_code'), (raw_json->>'exam_year'))
WHERE status = 'in_progress';