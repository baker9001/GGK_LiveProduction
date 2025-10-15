/*
  # Fix Paper Status History - Allow NULL for changed_by
  
  ## Problem
  The `track_paper_status_change()` trigger function tries to insert the string 'system'
  into the UUID column `changed_by` when `last_status_change_by` is NULL, causing error:
  "invalid input syntax for type uuid: 'system'"
  
  ## Solution
  1. Make the `changed_by` column nullable in `paper_status_history` table
  2. Update the trigger function to use NULL instead of 'system' string
  3. This allows proper tracking of status changes even when no user is logged in
  
  ## Changes
  - Modify `paper_status_history.changed_by` to allow NULL
  - Update `track_paper_status_change()` function to use NULL instead of 'system'
*/

-- Step 1: Make changed_by column nullable
ALTER TABLE paper_status_history 
ALTER COLUMN changed_by DROP NOT NULL;

-- Step 2: Update the trigger function to handle NULL properly
CREATE OR REPLACE FUNCTION public.track_paper_status_change()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Only track if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO paper_status_history (
      paper_id,
      previous_status,
      new_status,
      changed_by,
      reason
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      NEW.last_status_change_by,  -- This can now be NULL
      'Status changed via update'
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- Add a comment to document the change
COMMENT ON COLUMN paper_status_history.changed_by IS 
'UUID of the user who changed the status. NULL indicates system-initiated change or change when no user was authenticated.';
