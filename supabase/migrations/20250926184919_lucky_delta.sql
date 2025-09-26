/*
  # Add user_types column to users table

  1. Changes
    - Add `user_types` column to `users` table as TEXT[] (array of text)
    - Set default value to empty array for compatibility
    - Update existing records to have empty array as default

  2. Notes
    - This column appears to be used for storing multiple user type classifications
    - The existing `user_type` column (singular) remains unchanged for backward compatibility
*/

-- Add the user_types column as an array of text with default empty array
ALTER TABLE users 
ADD COLUMN user_types TEXT[] DEFAULT '{}';

-- Update existing records to have the default empty array value
UPDATE users 
SET user_types = '{}' 
WHERE user_types IS NULL;