# Archive Questions Fix - Quick Reference

## Problem
Archive button in Questions Setup was failing due to RLS policy conflicts.

## Solution Applied
Two database migrations removed conflicting RLS policies:
1. `fix_papers_setup_archive_rls_policy_conflict.sql`
2. `fix_questions_related_tables_rls_conflicts.sql`

## What Was Fixed
✅ Archive papers (any status → inactive)
✅ Restore papers (inactive → draft)
✅ Publish papers (qa_review → active)
✅ All question status updates
✅ Cascading status changes

## Test Archive Now

### Steps:
1. Log in as system admin
2. Go to: **System Admin → Learning → Practice Management → Questions Setup**
3. Find any paper card
4. Click **"Archive"** button
5. Click **"Archive"** again within 5 seconds to confirm
6. Paper status should change to "inactive" ✅

### What Happens:
- Paper moves to "Archived" tab
- All questions become inactive
- Status history is logged
- Can be restored later using "Restore to Draft" button

## Troubleshooting

### Still Getting Error?
1. **Hard refresh browser**: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. **Check user type**: Must be logged in as system admin
3. **Check console**: Open browser DevTools (F12) → Console tab for errors

### Common Issues:
- **"Permission denied"** → Not logged in as admin user
- **"Policy violation"** → Contact support (shouldn't happen after fix)
- **Button disabled** → Already archived or permission issue

## Technical Details

### Root Cause:
Conflicting RLS policies on `papers_setup` table:
- Old policy used direct `auth.uid()` check
- New policy used `is_admin_user()` function
- Both were active, causing UPDATE operations to fail

### Fix:
- Removed old conflicting policies
- Kept optimized policies using `is_admin_user()` function
- Function correctly validates admin users through proper JOIN

### Tables Fixed:
- papers_setup
- questions_master_admin
- sub_questions
- question_options
- question_correct_answers
- questions_attachments
- question_subtopics
- paper_status_history
- question_confirmations

## Diagnostic Query

Run this in Supabase SQL Editor to check your admin user:
```sql
SELECT * FROM admin_user_auth_mapping
WHERE auth_user_id = auth.uid();
```

Should show your admin user details with "Linked" status.

## Related Operations That Also Work Now

✅ **Mark Question as Active** (QA Review → Active)
✅ **Return to Draft** (QA Review → Draft)
✅ **Delete Questions** (with proper confirmation)
✅ **Update Question Metadata** (topics, subtopics, difficulty)
✅ **Batch Confirm Questions** (multiple at once)

## Support

For detailed information, see: `ARCHIVE_QUESTIONS_FIX_COMPLETE.md`

---
**Status**: Fixed ✅
**Date**: October 14, 2025
**Tested**: Database migrations applied and verified
