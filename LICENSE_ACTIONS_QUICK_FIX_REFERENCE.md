# License Actions Fix - Quick Reference

## What Was Fixed

**Problem:** License actions (EXPAND, EXTEND, RENEW) failed with "Failed to record the action history"

**Root Cause:** Foreign key constraint referenced wrong table (`users` instead of `admin_users`)

**Solution:** Changed foreign key to reference `admin_users(id)` where system admins are stored

## Files Changed

### New Migration
- `supabase/migrations/20251013185000_fix_license_actions_foreign_key.sql`

### Updated Frontend
- `src/app/system-admin/license-management/page.tsx`

## Quick Test

1. **Login** as system admin
2. **Navigate** to License Management
3. **Expand** a license row
4. **Click** actions menu (•••) on any license
5. **Select** "Expand License"
6. **Enter** quantity (e.g., 10)
7. **Click** Save

**Expected:** Success toast, quantity increases, no errors

## Verification Checklist

- [ ] Build completes: `npm run build` ✅
- [ ] Migration created ✅
- [ ] Frontend updated ✅
- [ ] Test EXPAND action
- [ ] Test EXTEND action
- [ ] Test RENEW action
- [ ] Verify history records actions
- [ ] Check no console errors

## If It Still Fails

### Check Database
```sql
-- Verify foreign key is correct
SELECT constraint_name, column_name
FROM information_schema.key_column_usage
WHERE table_name = 'license_actions'
AND column_name = 'performed_by';
```

Should reference `admin_users(id)`, not `users(id)`

### Check Authentication
```sql
-- Verify your admin user ID matches auth
SELECT id, email FROM admin_users WHERE email = 'your-email@example.com';
```

### Check Console Logs
Look for:
```
Inserting license action: {
  performed_by: "your-uuid-here",
  user_email: "your-email@example.com"
}
```

## Error Messages

| Error | Meaning | Solution |
|-------|---------|----------|
| "User authentication required" | Not logged in | Log in as admin |
| "Failed to identify current user" | Session expired | Re-login |
| "You do not have permission" | Not a system admin | Check role |
| Foreign key constraint violation | Migration not applied | Run `npx supabase db push` |

## Full Documentation

See `LICENSE_ACTIONS_FOREIGN_KEY_FIX.md` for complete technical details.
