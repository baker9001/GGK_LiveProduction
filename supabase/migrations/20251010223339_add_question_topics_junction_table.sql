/*
  # Add Question Topics Junction Table for Many-to-Many Relationship
  
  ## Problem Statement
  The UI allows selecting multiple topics for a question, but the database only stores ONE topic_id.
  This causes the "Related Topics" display to not show all selected topics because only the first
  topic is saved to the database.
  
  ## Solution
  Create a `question_topics` junction table to store many-to-many relationships between questions and topics,
  similar to the existing `question_subtopics` table.
  
  ## Changes Made
  
  1. **New Junction Table: `question_topics`**
     - Links questions to multiple topics
     - Supports both main questions and sub-questions
     - Includes created_at timestamp for auditing
  
  2. **Foreign Key Constraints**
     - question_id → questions_master_admin.id (CASCADE on delete)
     - sub_question_id → sub_questions.id (CASCADE on delete)
     - topic_id → edu_topics.id (CASCADE on delete)
  
  3. **Indexes for Performance**
     - Composite index on (question_id, topic_id)
     - Composite index on (sub_question_id, topic_id)
     - Index on topic_id for reverse lookups
  
  4. **Data Integrity**
     - CHECK constraint: Either question_id OR sub_question_id must be set, not both
     - UNIQUE constraint: Prevents duplicate topic assignments
  
  5. **Row Level Security (RLS)**
     - Enables RLS on the table
     - Authenticated users can SELECT
     - System admins can perform all operations
  
  ## Migration Strategy
  
  This is a NON-BREAKING change:
  - Existing `topic_id` column on questions_master_admin remains unchanged
  - New junction table allows storing additional topics
  - Applications can gradually migrate to use the junction table
  - The primary topic_id continues to work for backward compatibility
  
  ## Notes
  - This follows the same pattern as question_subtopics table
  - RLS policies match existing question-related tables
  - No data migration needed - existing topic assignments remain in topic_id column
*/

-- Create question_topics junction table
CREATE TABLE IF NOT EXISTS question_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid REFERENCES questions_master_admin(id) ON DELETE CASCADE,
  sub_question_id uuid REFERENCES sub_questions(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES edu_topics(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  
  -- Ensure either question_id OR sub_question_id is set, not both
  CHECK (
    (question_id IS NOT NULL AND sub_question_id IS NULL) OR 
    (question_id IS NULL AND sub_question_id IS NOT NULL)
  ),
  
  -- Prevent duplicate topic assignments
  UNIQUE(question_id, topic_id),
  UNIQUE(sub_question_id, topic_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_question_topics_question_id 
ON question_topics(question_id) 
WHERE question_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_question_topics_sub_question_id 
ON question_topics(sub_question_id) 
WHERE sub_question_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_question_topics_topic_id 
ON question_topics(topic_id);

-- Create composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_question_topics_question_topic 
ON question_topics(question_id, topic_id) 
WHERE question_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_question_topics_sub_question_topic 
ON question_topics(sub_question_id, topic_id) 
WHERE sub_question_id IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE question_topics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies matching existing question-related tables
CREATE POLICY "Authenticated users can view question topics"
  ON question_topics FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "System admins can manage question topics"
  ON question_topics FOR ALL 
  TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

-- Add comment to document the table purpose
COMMENT ON TABLE question_topics IS 
'Junction table for many-to-many relationship between questions and topics. 
Allows a question to be associated with multiple topics beyond the primary topic_id.
Follows the same pattern as question_subtopics table.';

COMMENT ON COLUMN question_topics.question_id IS 
'Reference to the main question. Mutually exclusive with sub_question_id.';

COMMENT ON COLUMN question_topics.sub_question_id IS 
'Reference to a sub-question/part. Mutually exclusive with question_id.';

COMMENT ON COLUMN question_topics.topic_id IS 
'Reference to the topic being assigned to the question.';
