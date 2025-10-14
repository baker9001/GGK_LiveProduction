-- Migration: Ensure paper status history trigger bypasses RLS
-- Context: Archiving papers from Questions Setup failed due to the
--          log_paper_status_change trigger running under the caller's
--          privileges. When RLS policies deny inserts into
--          paper_status_history, the trigger aborted the parent update.
--          Mark the trigger as SECURITY DEFINER and harden actor/timestamp
--          fallbacks so status transitions always log safely.

SET check_function_bodies = off;

CREATE OR REPLACE FUNCTION log_paper_status_change()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid;
  change_timestamp timestamp;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    actor := COALESCE(NEW.last_status_change_by, OLD.last_status_change_by, auth.uid());
    change_timestamp := COALESCE(NEW.last_status_change_at, (NOW() AT TIME ZONE 'UTC'));

    IF actor IS NULL THEN
      RAISE NOTICE 'log_paper_status_change: missing actor for paper %', NEW.id;
      -- Skip history entry if we cannot resolve an actor to avoid null constraint errors
      RETURN NEW;
    END IF;

    INSERT INTO paper_status_history (
      paper_id,
      previous_status,
      new_status,
      changed_by,
      changed_at,
      reason,
      metadata
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      actor,
      change_timestamp,
      format('Status changed from %s to %s', OLD.status, NEW.status),
      jsonb_build_object(
        'qa_status', NEW.qa_status,
        'questions_imported', NEW.questions_imported,
        'timestamp', change_timestamp
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- No trigger recreation needed; existing trigger will now use the updated
-- SECURITY DEFINER function.
