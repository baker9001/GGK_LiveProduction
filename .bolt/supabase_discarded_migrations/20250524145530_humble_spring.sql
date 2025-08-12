/*
  # Add address column to schools table

  1. Changes
    - Add `address` column to `schools` table
    - Notify PostgREST to refresh schema cache

  2. Purpose
    - Enable storing of school address information
    - Fix schema cache errors in the frontend application
*/

ALTER TABLE schools 
ADD COLUMN IF NOT EXISTS address text;

-- Notify PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';