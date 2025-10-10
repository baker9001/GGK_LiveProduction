# Quick Test Guide: Related Topics Fix

## What Was Fixed

The Academic Mapping system now correctly saves and displays **multiple topics** for each question. Previously, only the first selected topic was saved to the database.

---

## Quick Test Steps

### 1. Test Multiple Topic Selection (2 minutes)

1. **Navigate to Papers Setup**
   - Go to: System Admin → Learning → Practice Management → Papers Setup
   - Select any paper and click "Questions" tab

2. **Select Multiple Topics**
   - Expand any question card
   - In the "Academic Mapping" section:
     - Select a Unit/Chapter
     - Select **2 or 3 topics** from the Topics dropdown
     - Optionally select subtopics
   - ✅ **Expected:** "Mapped to:" box shows all selected topics

3. **Import and Verify**
   - Click "Import Questions" button
   - Wait for import to complete
   - ✅ **Expected:** Success message, no errors

---

## Verify the Fix

### Check Browser Console

Open Developer Tools (F12) and look for this log:
```
QuestionMappingControls Debug: {
  normalizedTopicIds: ['uuid1', 'uuid2', 'uuid3'],
  selectedTopicsForDisplay: ['Topic A', 'Topic B', 'Topic C']
}
```

✅ **Expected:** All selected topic IDs and names appear

### Check Database

Run this query in Supabase SQL Editor:
```sql
-- Get the question ID first
SELECT id, question_number, topic_id
FROM questions_master_admin
ORDER BY created_at DESC
LIMIT 5;

-- Then check additional topics (replace <question_id>)
SELECT
  qt.topic_id,
  t.name as topic_name
FROM question_topics qt
JOIN edu_topics t ON t.id = qt.topic_id
WHERE qt.question_id = '<question_id>';
```

✅ **Expected:**
- First query shows primary topic in `topic_id` column
- Second query shows additional topics (if more than 1 was selected)

---

## What Changed

### Database
- ✅ New `question_topics` junction table created
- ✅ Supports many-to-many relationship between questions and topics
- ✅ Primary topic still stored in `topic_id` column (backward compatible)
- ✅ Additional topics stored in `question_topics` table

### Backend
- ✅ Import function now saves all selected topics
- ✅ Works for both main questions and sub-questions
- ✅ Enhanced error logging

### Frontend
- ✅ Enhanced debug logging
- ✅ Display logic unchanged (it was already correct)

---

## Common Issues & Solutions

### Issue: Topics not showing in "Mapped to:" box

**Cause:** The `topics` prop array doesn't contain the selected topics

**Solution:**
1. Check console for debug log: `selectedTopicsForDisplay`
2. Verify `normalizedTopicIds` matches your selection
3. Ensure topics were properly loaded from database

### Issue: Import fails with foreign key error

**Cause:** Database migration not applied

**Solution:**
1. Check if migration ran: `SELECT * FROM question_topics LIMIT 1;`
2. If error, manually apply migration from Supabase dashboard
3. Check RLS policies are enabled: `SELECT * FROM pg_policies WHERE tablename = 'question_topics';`

### Issue: Only first topic saved

**Cause:** Old code still running (cache issue)

**Solution:**
1. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. Clear browser cache
3. Verify build timestamp in Network tab

---

## Expected Behavior

### Before Fix ❌
```
Selected: [Topic A, Topic B, Topic C]
Saved:    Topic A only
Display:  Empty (after reload)
```

### After Fix ✅
```
Selected: [Topic A, Topic B, Topic C]
Saved:    - Topic A (in topic_id column)
          - Topic B, Topic C (in question_topics table)
Display:  Topic A, Topic B, Topic C
```

---

## Rollback Plan (If Needed)

If you need to rollback:

1. **Database:** Drop the junction table
```sql
DROP TABLE IF EXISTS question_topics CASCADE;
```

2. **Code:** Revert changes in:
   - `src/lib/data-operations/questionsDataOperations.ts`
   - `src/app/system-admin/learning/practice-management/papers-setup/tabs/components/QuestionMappingControls.tsx`

3. **Rebuild:** Run `npm run build`

**Note:** Rollback is safe - no data loss will occur. Existing questions will continue to work with their primary topic.

---

## Success Criteria

✅ Multiple topics can be selected in UI
✅ All selected topics are saved to database
✅ "Mapped to:" box displays all selected topics
✅ Topics persist after page reload
✅ Import completes without errors
✅ Build succeeds with no TypeScript errors

---

## Next Steps

After testing:
1. Test with real paper import workflow
2. Verify sub-questions also support multiple topics
3. Check that existing questions (imported before fix) still work
4. Consider adding UI to show primary vs additional topics

For detailed information, see: `RELATED_TOPICS_FIX_COMPLETE.md`
