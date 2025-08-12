/*
  # Remove unique constraint on paper_code

  1. Changes
    - Remove unique constraint on `paper_code` column in `papers_setup` table
    - This allows multiple paper entries to share the same paper code if needed

  2. Reasoning
    - The current unique constraint prevents saving papers with duplicate codes
    - Paper codes may legitimately be duplicated across different contexts
    - Application logic should handle uniqueness validation as needed
*/

-- Remove the unique constraint on paper_code
ALTER TABLE papers_setup DROP CONSTRAINT IF EXISTS papers_setup_paper_code_key;