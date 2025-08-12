/*
  # Add code column to edu_topics table

  1. Changes
    - Add `code` column to `edu_topics` table
    - This fixes the error when querying the non-existent code column

  2. Security
    - No changes to RLS policies needed
*/

-- Add code column to edu_topics table if it doesn't exist
ALTER TABLE edu_topics
ADD COLUMN IF NOT EXISTS code TEXT;

-- Notify PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';