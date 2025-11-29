# Table Completion - Quick Test Guide

**Purpose**: Verify table completion data persistence works end-to-end
**Time**: 10-15 minutes

---

## Test 1: Admin Creates Table Completion Question

### Steps:
1. **Go to**: System Admin → Learning → Practice Management → Papers Setup
2. **Create new import session** or use existing
3. **Go to Questions tab**
4. **Add/Edit a question** with `answer_format = "table_completion"`
5. **Edit the table**:
   - Click "Edit Table" button
   - Add rows/columns if needed
   - Click cells to toggle between:
     - 🟢 **Green** = Locked (pre-filled)
     - 🔵 **Blue** = Editable (student fills)
   - Enter values in locked cells
   - Enter expected answers in editable cells
6. **Save** and **navigate away**
7. **Return to question** - verify table structure restored

### Expected Results:
- ✅ Table structure persists (rows, columns, headers)
- ✅ Cell types persist (locked vs editable)
- ✅ Values persist (locked values, expected answers)
- ✅ Console shows: `✅ Loading preview data`

### Check Database:
```sql
-- Should see working_json with answer_text
SELECT
  working_json->'questions'->0->'correct_answers'->0->>'answer_text' as template
FROM past_paper_import_sessions
WHERE id = '<session-id>';
```

---

## Test 2: Import Question to Production

### Steps:
1. **Click "Import Questions"**
2. **Wait for success message**
3. **Check database**:

```sql
SELECT
  qma.question_number,
  qca.answer_type,
  LENGTH(qca.answer_text) as template_size,
  LEFT(qca.answer_text, 200) as template_preview
FROM questions_master_admin qma
JOIN question_correct_answers qca ON qca.question_id = qma.id
WHERE qma.answer_format = 'table_completion'
ORDER BY qma.created_at DESC
LIMIT 3;
```

### Expected Results:
- ✅ Row exists with `answer_type = 'table_template'`
- ✅ `answer_text` contains JSON (100+ characters)
- ✅ Preview shows: `{"rows":5,"columns":3,"headers":[...]...}`

### Verify Template Statistics:
```sql
SELECT * FROM get_table_template_stats();
```

Expected:
- `total_templates`: 1 (or more)
- `templates_with_answer_text`: 1 (or more)
- `templates_with_validation_errors`: 0 ✅

---

## Test 3: Student Attempts Question (Practice Mode)

### Steps:
1. **Go to**: Student Module → Practice
2. **Start practice session** with table completion question
3. **Verify table displays**:
   - Locked cells have pre-filled values (disabled)
   - Editable cells are empty (enabled)
4. **Fill in answers** in editable cells
5. **Wait 2 seconds** (auto-save delay)
6. **Submit answer**
7. **View results**

### Expected Results:
- ✅ Table structure loads correctly
- ✅ Correct cells are editable
- ✅ Console shows: `✅ Loaded template from correct_answers[0].answer_text`
- ✅ Console shows: `✅ Loaded student answers from value prop`
- ✅ After submit: Correct answers highlighted green
- ✅ After submit: Incorrect answers highlighted red

### Check Database:
```sql
SELECT
  pa.raw_answer_json->'value'->'studentAnswers' as student_answers,
  pa.raw_answer_json->'value'->'completedCells' as completed,
  pa.raw_answer_json->'value'->'requiredCells' as required,
  pa.marks_earned,
  pa.is_correct,
  pa.auto_mark_json
FROM practice_answers pa
ORDER BY pa.submitted_at DESC
LIMIT 1;
```

### Expected Results:
- ✅ `student_answers`: `{"0-0": "value1", "0-1": "value2", ...}`
- ✅ `completed`: Number (2, 3, etc.)
- ✅ `required`: Number (matches editable cells count)
- ✅ `marks_earned`: Numeric value
- ✅ `auto_mark_json`: Has marking breakdown

---

## Test 4: Teacher Reviews Submission

### Steps:
1. **Go to**: Teacher Module → Students → View Practice Results
2. **Select student submission** with table completion
3. **View answer details**

### Expected Results:
- ✅ Table displays with student answers
- ✅ Correct answers shown in green
- ✅ Incorrect answers shown in red
- ✅ Marks breakdown visible
- ✅ Console shows: `✅ Loaded template from correct_answers[0].answer_text`
- ✅ Console shows: `✅ Loaded preview data` (if review mode)

---

## Test 5: Validation & Performance

### Test Invalid Template:
```sql
-- Should fail with constraint violation
INSERT INTO question_correct_answers (question_id, answer_text, answer_type)
VALUES (
  '<existing-question-id>',
  '{"invalid": "template"}',  -- Missing required fields
  'table_template'
);
```

Expected: **ERROR: check_table_template_valid constraint violation** ✅

### Test Valid Template:
```sql
-- Should succeed
INSERT INTO question_correct_answers (question_id, answer, answer_text, answer_type, marks)
VALUES (
  '<existing-question-id>',
  'Table completion answer',
  '{
    "rows": 3,
    "columns": 2,
    "headers": ["Col1", "Col2"],
    "cells": [
      {"rowIndex": 0, "colIndex": 0, "cellType": "locked", "lockedValue": "A"},
      {"rowIndex": 0, "colIndex": 1, "cellType": "editable", "expectedAnswer": "B"}
    ]
  }',
  'table_template',
  1
);
```

Expected: **SUCCESS** ✅

### Check Index Usage:
```sql
EXPLAIN ANALYZE
SELECT *
FROM question_correct_answers
WHERE answer_type = 'table_template'
AND (answer_text::jsonb)->>'rows' = '5';
```

Expected output should include:
- `Index Scan using idx_question_correct_answers_template_gin` ✅
- Or `Bitmap Index Scan` with GIN index ✅

---

## Debug Checklist

### If Template Doesn't Load:

**1. Check browser console:**
```
Look for: "[DynamicAnswerField] ✅ Loaded template from correct_answers[0].answer_text"
```
- ❌ **Not found**: Template not in database
- ✅ **Found**: Template loaded successfully

**2. Check database:**
```sql
SELECT
  qca.answer_text IS NOT NULL as has_template,
  qca.answer_type,
  LENGTH(qca.answer_text) as size
FROM question_correct_answers qca
WHERE qca.question_id = '<question-id>';
```
- ❌ `has_template = false`: Template not saved
- ❌ `answer_type != 'table_template'`: Wrong type
- ✅ `has_template = true` AND `size > 100`: Template exists

**3. Validate template:**
```sql
SELECT validate_table_template_json(answer_text)
FROM question_correct_answers
WHERE question_id = '<question-id>'
AND answer_type = 'table_template';
```
- ❌ `false`: Invalid template structure
- ✅ `true`: Template is valid

### If Student Answers Don't Save:

**1. Check browser console:**
```
Look for: "[DynamicAnswerField] ✅ Loaded student answers from value prop"
Look for: "[TableCompletion] Triggering debounced onChange"
```

**2. Check network tab:**
- Look for POST to `/rest/v1/practice_answers`
- Check response status (should be 200 or 201)
- Check request payload has `raw_answer_json`

**3. Check database:**
```sql
SELECT
  pa.raw_answer_json,
  pa.submitted_at
FROM practice_answers pa
WHERE pa.session_id = '<session-id>'
ORDER BY pa.submitted_at DESC
LIMIT 1;
```

---

## Performance Benchmarks

### Expected Query Times:

**Load template with question:**
- Before fix: ~100-150ms (3-table JOIN)
- After fix: ~50-80ms (single row)
- Improvement: **40-50% faster** ✅

**Filter by table_completion type:**
- Before fix: ~200ms (full table scan)
- After fix: ~40ms (index scan)
- Improvement: **80% faster** ✅

### Measure actual performance:
```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM question_correct_answers
WHERE answer_type = 'table_template';
```

Look for:
- Execution time < 50ms ✅
- Index usage (not Seq Scan) ✅
- Shared buffers hit (not read) ✅

---

## Success Criteria

### ✅ All Must Pass:

1. **Admin Workflow**:
   - [ ] Create table in review mode
   - [ ] Template saves to `working_json`
   - [ ] Import to production
   - [ ] Template in `answer_text` column

2. **Student Workflow**:
   - [ ] Template loads in practice mode
   - [ ] Correct cells editable
   - [ ] Answers save on submit
   - [ ] Data in `practice_answers` table

3. **Teacher Workflow**:
   - [ ] Can view student submission
   - [ ] Template and student data both display
   - [ ] Correct/incorrect highlighting works

4. **Database**:
   - [ ] Validation constraint active
   - [ ] GIN indexes created
   - [ ] Invalid templates rejected
   - [ ] Valid templates accepted
   - [ ] Stats function returns data

5. **Performance**:
   - [ ] Queries use indexes
   - [ ] Query time < 100ms
   - [ ] No full table scans

---

## Quick Commands

### View All Templates:
```sql
SELECT
  qma.question_number,
  (qca.answer_text::jsonb)->>'rows' || 'x' || (qca.answer_text::jsonb)->>'columns' as size,
  jsonb_array_length((qca.answer_text::jsonb)->'cells') as cells
FROM question_correct_answers qca
JOIN questions_master_admin qma ON qma.id = qca.question_id
WHERE qca.answer_type = 'table_template';
```

### View Recent Student Submissions:
```sql
SELECT
  qma.question_number,
  pa.marks_earned,
  pa.is_correct,
  pa.submitted_at
FROM practice_answers pa
JOIN questions_master_admin qma ON qma.id = pa.question_id
WHERE pa.question_id IN (
  SELECT question_id FROM question_correct_answers WHERE answer_type = 'table_template'
)
ORDER BY pa.submitted_at DESC
LIMIT 10;
```

### Check System Health:
```sql
SELECT * FROM get_table_template_stats();
```

---

**Status**: Ready for testing
**Estimated Time**: 10-15 minutes
**Required Access**: System Admin + Student account
