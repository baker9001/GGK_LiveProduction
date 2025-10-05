/*
  # Fix Foreign Key Relationships for Questions and Topics

  ## Summary
  This migration adds missing foreign key constraints between questions_master_admin 
  and the education taxonomy tables (edu_topics, edu_subtopics). These relationships 
  are essential for Supabase's schema cache to recognize the connections and allow 
  proper join queries.

  ## Changes Made
  
  1. Foreign Key Constraints
     - Add FK: questions_master_admin.topic_id → edu_topics.id (SET NULL on delete)
     - Add FK: questions_master_admin.subtopic_id → edu_subtopics.id (SET NULL on delete)
  
  2. Performance Indexes
     - Create index on questions_master_admin.topic_id for efficient lookups
     - Create index on questions_master_admin.subtopic_id for efficient lookups
  
  3. Data Integrity
     - Uses ON DELETE SET NULL to preserve questions when topics are deleted
     - Uses ON UPDATE CASCADE to maintain referential integrity on ID changes
  
  ## Impact
  - Enables Supabase relationship syntax in queries: edu_topics(id, name)
  - Fixes "Could not find a relationship" error in schema cache
  - Improves query performance with proper indexes
  - Maintains data integrity with proper cascading rules
*/

-- Add foreign key constraint from questions_master_admin.topic_id to edu_topics.id
ALTER TABLE questions_master_admin
DROP CONSTRAINT IF EXISTS questions_master_admin_topic_id_fkey;

ALTER TABLE questions_master_admin
ADD CONSTRAINT questions_master_admin_topic_id_fkey 
FOREIGN KEY (topic_id) 
REFERENCES edu_topics(id) 
ON DELETE SET NULL 
ON UPDATE CASCADE;

-- Add foreign key constraint from questions_master_admin.subtopic_id to edu_subtopics.id
ALTER TABLE questions_master_admin
DROP CONSTRAINT IF EXISTS questions_master_admin_subtopic_id_fkey;

ALTER TABLE questions_master_admin
ADD CONSTRAINT questions_master_admin_subtopic_id_fkey 
FOREIGN KEY (subtopic_id) 
REFERENCES edu_subtopics(id) 
ON DELETE SET NULL 
ON UPDATE CASCADE;

-- Create indexes on foreign key columns for performance
CREATE INDEX IF NOT EXISTS idx_questions_master_admin_topic_id 
ON questions_master_admin(topic_id) 
WHERE topic_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_questions_master_admin_subtopic_id 
ON questions_master_admin(subtopic_id) 
WHERE subtopic_id IS NOT NULL;

-- Add comment to document the relationships
COMMENT ON CONSTRAINT questions_master_admin_topic_id_fkey ON questions_master_admin IS 
'Links questions to their primary topic in the education taxonomy. SET NULL on delete to preserve questions.';

COMMENT ON CONSTRAINT questions_master_admin_subtopic_id_fkey ON questions_master_admin IS 
'Links questions to their primary subtopic in the education taxonomy. SET NULL on delete to preserve questions.';
