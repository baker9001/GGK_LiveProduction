/*
  # Allow Cancelled to Draft Status Transition

  ## Overview
  Updates the status transition validation to allow moving cancelled mock exams back to draft status.
  This provides flexibility for users who want to revise and reschedule cancelled exams.

  ## Changes
  - Updates `validate_status_transition` function to allow cancelled → draft transition
  - Maintains all other existing transition rules
  - Completed exams still cannot be changed (final state)

  ## Rationale
  Users may cancel exams by mistake or want to reuse a cancelled exam configuration.
  Allowing transition back to draft enables them to revise and reschedule without data loss.
*/

-- Update the validate_status_transition function
CREATE OR REPLACE FUNCTION validate_status_transition(
  current_status text,
  new_status text
) RETURNS boolean AS $$
BEGIN
  -- Cancelled can be set from any status
  IF new_status = 'cancelled' THEN
    RETURN true;
  END IF;

  -- Allow moving from cancelled back to draft
  IF current_status = 'cancelled' AND new_status = 'draft' THEN
    RETURN true;
  END IF;

  -- Cannot change from cancelled (except to draft, handled above) or completed
  IF current_status IN ('cancelled', 'completed') THEN
    RETURN false;
  END IF;

  -- Define valid transitions
  CASE current_status
    WHEN 'draft' THEN
      RETURN new_status IN ('planned', 'cancelled');
    WHEN 'planned' THEN
      RETURN new_status IN ('draft', 'scheduled', 'cancelled');
    WHEN 'scheduled' THEN
      RETURN new_status IN ('planned', 'materials_ready', 'in_progress', 'cancelled');
    WHEN 'materials_ready' THEN
      RETURN new_status IN ('scheduled', 'in_progress', 'cancelled');
    WHEN 'in_progress' THEN
      RETURN new_status IN ('grading', 'cancelled');
    WHEN 'grading' THEN
      RETURN new_status IN ('moderation', 'analytics_released', 'cancelled');
    WHEN 'moderation' THEN
      RETURN new_status IN ('grading', 'analytics_released', 'cancelled');
    WHEN 'analytics_released' THEN
      RETURN new_status IN ('completed', 'cancelled');
    ELSE
      RETURN false;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
