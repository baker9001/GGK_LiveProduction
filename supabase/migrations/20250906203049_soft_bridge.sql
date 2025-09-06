/*
  # License Used Quantity Trigger Function

  1. Function
    - `update_license_used_quantity()` - Updates license used_quantity when student assignments change

  2. Triggers
    - AFTER INSERT ON student_licenses
    - AFTER DELETE ON student_licenses  
    - AFTER UPDATE OF is_active ON student_licenses

  3. Logic
    - Increment used_quantity when student license is assigned (INSERT or UPDATE to active)
    - Decrement used_quantity when student license is removed (DELETE or UPDATE to inactive)
    - Ensure used_quantity never goes below 0 or above total_quantity
*/

-- Create function to update license used quantity
CREATE OR REPLACE FUNCTION update_license_used_quantity()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT (new assignment)
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_active = true THEN
      UPDATE licenses 
      SET used_quantity = LEAST(used_quantity + 1, total_quantity)
      WHERE id = NEW.license_id;
    END IF;
    RETURN NEW;
  END IF;

  -- Handle DELETE (remove assignment)
  IF TG_OP = 'DELETE' THEN
    IF OLD.is_active = true THEN
      UPDATE licenses 
      SET used_quantity = GREATEST(used_quantity - 1, 0)
      WHERE id = OLD.license_id;
    END IF;
    RETURN OLD;
  END IF;

  -- Handle UPDATE (status change)
  IF TG_OP = 'UPDATE' THEN
    -- If activation status changed
    IF OLD.is_active != NEW.is_active THEN
      IF NEW.is_active = true AND OLD.is_active = false THEN
        -- Activating assignment
        UPDATE licenses 
        SET used_quantity = LEAST(used_quantity + 1, total_quantity)
        WHERE id = NEW.license_id;
      ELSIF NEW.is_active = false AND OLD.is_active = true THEN
        -- Deactivating assignment
        UPDATE licenses 
        SET used_quantity = GREATEST(used_quantity - 1, 0)
        WHERE id = NEW.license_id;
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_update_license_used_quantity_insert ON student_licenses;
CREATE TRIGGER trigger_update_license_used_quantity_insert
  AFTER INSERT ON student_licenses
  FOR EACH ROW
  EXECUTE FUNCTION update_license_used_quantity();

DROP TRIGGER IF EXISTS trigger_update_license_used_quantity_delete ON student_licenses;
CREATE TRIGGER trigger_update_license_used_quantity_delete
  AFTER DELETE ON student_licenses
  FOR EACH ROW
  EXECUTE FUNCTION update_license_used_quantity();

DROP TRIGGER IF EXISTS trigger_update_license_used_quantity_update ON student_licenses;
CREATE TRIGGER trigger_update_license_used_quantity_update
  AFTER UPDATE OF is_active ON student_licenses
  FOR EACH ROW
  EXECUTE FUNCTION update_license_used_quantity();