# SQL Test Queries for MCQ Options

## Quick Diagnosis Queries

### 1. Check RLS Policy Count
```sql
-- Should return 4 after fix (0 indicates bug)
SELECT COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'question_options';
```

### 2. List All Policies
```sql
SELECT
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'question_options'
ORDER BY cmd, policyname;
```

### 3. Test Data Access
```sql
-- Will fail with RLS error if policies missing
SELECT COUNT(*) as total_options
FROM question_options;
```

## Data Verification Queries

### 4. Count Options Per Question
```sql
SELECT
  q.question_number,
  q.question_text,
  COUNT(qo.id) as option_count,
  STRING_AGG(qo.label, ', ' ORDER BY qo.order) as option_labels,
  MAX(CASE WHEN qo.is_correct THEN qo.label END) as correct_answer
FROM questions_master_admin q
LEFT JOIN question_options qo ON qo.question_id = q.id
WHERE q.type = 'mcq'
  AND q.created_at > NOW() - INTERVAL '7 days'
GROUP BY q.id, q.question_number, q.question_text
ORDER BY q.question_number::integer
LIMIT 10;
```

**Expected Output:**
```
question_number | question_text                   | option_count | option_labels | correct_answer
1               | Which process causes...         | 4            | A, B, C, D    | C
2               | Which name is given...          | 4            | A, B, C, D    | C
```

### 5. View All Options for Specific Question
```sql
SELECT
  qo.label,
  qo.option_text,
  qo.is_correct,
  qo.order,
  qo.created_at
FROM question_options qo
JOIN questions_master_admin q ON q.id = qo.question_id
WHERE q.question_number = '1'
  AND q.created_at > NOW() - INTERVAL '7 days'
ORDER BY qo.order;
```

**Expected Output:**
```
label | option_text     | is_correct | order | created_at
A     | growth          | false      | 0     | 2025-10-19...
B     | reproduction    | false      | 1     | 2025-10-19...
C     | respiration     | true       | 2     | 2025-10-19...
D     | sensitivity     | false      | 3     | 2025-10-19...
```

### 6. Check Data Completeness
```sql
SELECT
  COUNT(DISTINCT question_id) as questions_with_options,
  COUNT(*) as total_options,
  COUNT(*) FILTER (WHERE is_correct) as correct_options,
  COUNT(*) FILTER (WHERE option_text IS NOT NULL AND option_text != '') as options_with_text,
  COUNT(*) FILTER (WHERE explanation IS NOT NULL) as options_with_explanation,
  ROUND(AVG(LENGTH(option_text)), 1) as avg_option_length
FROM question_options;
```

**Expected Output (after importing 40 MCQ questions):**
```
questions_with_options | total_options | correct_options | options_with_text | options_with_explanation | avg_option_length
40                     | 160           | 40              | 160               | 40                       | 25.5
```

## Testing Imported Data

### 7. Verify First 3 Questions from JSON
```sql
SELECT
  q.question_number,
  qo.label,
  qo.option_text,
  qo.is_correct
FROM questions_master_admin q
JOIN question_options qo ON qo.question_id = q.id
WHERE q.question_number IN ('1', '2', '3')
  AND q.created_at > NOW() - INTERVAL '7 days'
ORDER BY q.question_number::integer, qo.order;
```

**Expected Output:**
```
question_number | label | option_text                    | is_correct
1               | A     | growth                         | false
1               | B     | reproduction                   | false
1               | C     | respiration                    | true
1               | D     | sensitivity                    | false
2               | A     | a genus                        | false
2               | B     | a kingdom                      | false
2               | C     | a species                      | true
2               | D     | an organ system                | false
3               | A     | Hexagenia                      | false
3               | B     | Dytiscus                       | false
3               | C     | Argyroneta                     | true
3               | D     | Asellus                        | false
```

### 8. Find Questions Missing Options
```sql
SELECT
  q.question_number,
  q.question_text,
  q.type,
  COUNT(qo.id) as option_count
FROM questions_master_admin q
LEFT JOIN question_options qo ON qo.question_id = q.id
WHERE q.type = 'mcq'
GROUP BY q.id, q.question_number, q.question_text, q.type
HAVING COUNT(qo.id) != 4
ORDER BY q.question_number::integer;
```

**Expected Output:**
- Empty result (all MCQs should have 4 options)
- If showing results: Options were not imported correctly

### 9. Validate Option Labels
```sql
SELECT
  q.question_number,
  COUNT(*) as option_count,
  STRING_AGG(DISTINCT qo.label, ', ' ORDER BY qo.label) as unique_labels
FROM questions_master_admin q
JOIN question_options qo ON qo.question_id = q.id
WHERE q.type = 'mcq'
GROUP BY q.id, q.question_number
HAVING STRING_AGG(DISTINCT qo.label, ', ' ORDER BY qo.label) != 'A, B, C, D'
ORDER BY q.question_number::integer;
```

**Expected Output:**
- Empty result (all MCQs should have labels A, B, C, D)
- If showing results: Invalid or missing labels

### 10. Check Correct Answer Distribution
```sql
SELECT
  qo.label as correct_answer,
  COUNT(*) as frequency
FROM question_options qo
WHERE qo.is_correct = true
  AND EXISTS (
    SELECT 1 FROM questions_master_admin q
    WHERE q.id = qo.question_id AND q.type = 'mcq'
  )
GROUP BY qo.label
ORDER BY qo.label;
```

**Expected Output (from sample JSON):**
```
correct_answer | frequency
A              | 8-12
B              | 8-12
C              | 8-12
D              | 8-12
```
(Distribution should be relatively even across all options)

## Insert Test (Manual)

### 11. Test Manual Insert
```sql
-- Create a test question
INSERT INTO questions_master_admin (
  question_number,
  type,
  question_text,
  answer_format,
  marks,
  status
) VALUES (
  'TEST-' || EXTRACT(EPOCH FROM NOW())::TEXT,
  'mcq',
  'Test question for RLS verification',
  'selection',
  1,
  'draft'
)
RETURNING id;

-- Use the returned ID in the next query
-- Replace 'YOUR_QUESTION_ID' with actual ID from above

INSERT INTO question_options (
  question_id,
  label,
  option_text,
  is_correct,
  "order"
) VALUES
  ('YOUR_QUESTION_ID', 'A', 'Option A text', false, 0),
  ('YOUR_QUESTION_ID', 'B', 'Option B text', true, 1),
  ('YOUR_QUESTION_ID', 'C', 'Option C text', false, 2),
  ('YOUR_QUESTION_ID', 'D', 'Option D text', false, 3)
RETURNING id, label, option_text, is_correct;
```

**Expected:**
- Both INSERT statements succeed
- Returns 4 rows with all option data

**If RLS blocking:**
- ERROR: new row violates row-level security policy

### 12. Cleanup Test Data
```sql
-- Delete test question (will cascade to options)
DELETE FROM questions_master_admin
WHERE question_number LIKE 'TEST-%';
```

## Interpretation Guide

### ✅ All Tests Pass If:
1. Policy count = 4
2. Can SELECT from question_options
3. Each MCQ has 4 options (A, B, C, D)
4. Each question has exactly 1 correct answer
5. All options have text
6. Can INSERT new options

### ❌ RLS Issue If:
1. Policy count = 0
2. SELECT queries return permission denied error
3. No options retrieved even though questions exist

### ⚠️ Data Import Issue If:
1. Policy count = 4
2. SELECT queries work
3. But option count per question < 4
4. This means import process failed, not RLS

## Next Steps

### If RLS Issue (Policy count = 0):
1. Apply migration `20251019190000_fix_question_options_missing_rls_policies.sql`
2. Re-run queries 1-3 to verify
3. Test application UI

### If Data Import Issue (Options missing):
1. Check import logs in browser console
2. Verify JSON file structure
3. Re-import the JSON file
4. Check `past_paper_import_sessions` table for errors

### If All Tests Pass:
1. Clear browser cache
2. Sign out and sign in again
3. Navigate to Questions Setup
4. Verify all options display in UI
