/*
  # Rename logo_path column to logo in subjects table

  1. Changes
    - Rename logo_path column to logo
    - Update storage bucket name to match
*/

-- Rename logo_path column to logo
ALTER TABLE subjects 
RENAME COLUMN logo_path TO logo;

-- Notify PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';