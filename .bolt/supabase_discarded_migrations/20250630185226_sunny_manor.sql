/*
  # Make subject_code column nullable in papers_setup table

  1. Changes
    - Modify the subject_code column in papers_setup table to allow NULL values
    - This fixes the error when inserting records without a subject_code value

  2. Reason
    - The application is attempting to insert records without providing a subject_code
    - This is likely because the code now uses subject_id instead of subject_code
*/

-- Alter the subject_code column to allow NULL values
ALTER TABLE papers_setup ALTER COLUMN subject_code DROP NOT NULL;

-- Notify PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';