/*
  # Rename order_index to order in question_options and sub_questions tables

  1. Changes
    - Rename order_index column to order in question_options table
    - Rename order_index column to order in sub_questions table
    - Update any references to order_index in views or functions

  2. Purpose
    - Fix column naming inconsistency
    - Ensure all code references the correct column name
*/

-- Rename order_index to order in question_options table
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'question_options' 
    AND column_name = 'order_index'
  ) THEN
    ALTER TABLE question_options RENAME COLUMN order_index TO "order";
  END IF;
END $$;

-- Rename order_index to order in sub_questions table
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'sub_questions' 
    AND column_name = 'order_index'
  ) THEN
    ALTER TABLE sub_questions RENAME COLUMN order_index TO "order";
  END IF;
END $$;

-- Update any indexes that might reference the old column name
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_indexes 
    WHERE indexname = 'idx_question_options_order_index'
  ) THEN
    DROP INDEX idx_question_options_order_index;
    CREATE INDEX idx_question_options_order ON question_options("order");
  END IF;
  
  IF EXISTS (
    SELECT 1 
    FROM pg_indexes 
    WHERE indexname = 'idx_sub_questions_order_index'
  ) THEN
    DROP INDEX idx_sub_questions_order_index;
    CREATE INDEX idx_sub_questions_order ON sub_questions("order");
  END IF;
END $$;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';