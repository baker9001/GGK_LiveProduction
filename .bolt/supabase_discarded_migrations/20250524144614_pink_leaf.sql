/*
  # Add address column to companies table

  1. Changes
    - Add address column to companies table
    - Refresh PostgREST schema cache

  2. Details
    - Add text column for storing company addresses
    - Ensure schema cache is updated to prevent 404 errors
*/

-- Add address column to companies table
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS address text;

-- Notify PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';