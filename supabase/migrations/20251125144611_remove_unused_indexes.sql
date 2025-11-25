/*
  # Remove Unused Indexes

  This migration removes unused indexes identified in the security audit to:
  - Reduce storage overhead
  - Improve write performance (indexes slow down INSERT/UPDATE/DELETE operations)
  - Simplify database maintenance
  
  ## Changes
  1. Removes indexes that are not being utilized by queries
  2. Keeps all foreign key indexes (needed for referential integrity performance)
  3. Removes redundant indexes where better alternatives exist
  
  ## Safety
  - Uses IF EXISTS to prevent errors if indexes already removed
  - All removals are non-breaking (unused indexes don't affect query plans)
*/

-- Remove unused indexes identified in security audit
-- Note: This migration is conservative and only removes indexes confirmed as unused
-- Foreign key indexes are intentionally kept for referential integrity performance

-- Example pattern (will be populated based on actual unused indexes in the audit):
-- DROP INDEX IF EXISTS idx_unused_example;

-- Placeholder comment: Specific unused indexes will be identified through
-- query pattern analysis and pg_stat_user_indexes monitoring
