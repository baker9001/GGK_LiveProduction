/*
  # Fix missing importSession variable in ReviewTab

  1. Problem
    - The ReviewTab component is missing the importSession variable
    - This causes the import process to fail when clicking "Import Paper"
    - The error occurs because importSession is undefined in the handleFinalImport function

  2. Solution
    - Add importSession parameter to ReviewTab component props
    - Pass importSession from PapersSetupPage to ReviewTab
    - Ensure all references to importSession are properly handled

  3. Changes
    - Update ReviewTab component to accept importSession prop
    - Update PapersSetupPage to pass importSession to ReviewTab
    - Fix any related issues in the import process
*/

-- This migration is a placeholder to document the JavaScript changes
-- No actual database changes are needed

-- Force schema cache refresh to ensure all relationships are recognized
NOTIFY pgrst, 'reload schema';