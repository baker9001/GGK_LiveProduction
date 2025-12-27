# Quick Test Guide: Session Preferences Phase 1 Fixes

**Purpose**: Verify that all Phase 1 fixes are working correctly
**Time Required**: 10-15 minutes

---

## Prerequisites

✅ Both migrations have been applied
✅ Application has been built successfully
✅ You have access to:
  - Database query tool (Supabase Dashboard)
  - Application UI
  - System admin account
  - Test user credentials

---

## Test 1: Auto-Initialization for New Users ⭐ CRITICAL

### Objective
Verify that new users automatically get session preferences with role-based defaults.

### Steps

1. **Create a new student user** (via your user creation workflow)
   - Note the user's `auth_user_id`

2. **Check the database**:
   ```sql
   SELECT
     user_id,
     idle_timeout_minutes,
     warning_style,
     remember_me_days,
     auto_extend_enabled,
     created_at
   FROM user_session_preferences
   WHERE user_id = 'YOUR_NEW_USER_AUTH_ID'::uuid;
   ```

3. **Verify the defaults**:
   - ✅ Record exists (not empty)
   - ✅ `idle_timeout_minutes` = 30 (for student)
   - ✅ `warning_style` = 'silent'
   - ✅ `remember_me_days` = 7
   - ✅ `auto_extend_enabled` = true
   - ✅ `created_at` matches user creation time

### Expected Result
```
 user_id | idle_timeout_minutes | warning_style | remember_me_days | auto_extend_enabled | created_at
---------+---------------------+---------------+-----------------+--------------------+------------
 abc...  |                  30 | silent        |               7 | t                  | 2025-12-25...
```

### Test Other User Types

**Teacher** (should get 60min, toast, 14 days):
```sql
-- After creating a teacher user
SELECT idle_timeout_minutes, warning_style, remember_me_days
FROM user_session_preferences
WHERE user_id = 'TEACHER_AUTH_ID'::uuid;
-- Expected: 60, 'toast', 14
```

**Entity Admin** (should get 120min, banner, 30 days):
```sql
-- After creating an entity admin
SELECT idle_timeout_minutes, warning_style, remember_me_days
FROM user_session_preferences
WHERE user_id = 'ADMIN_AUTH_ID'::uuid;
-- Expected: 120, 'banner', 30
```

---

## Test 2: Admin RLS Policy Fix ⭐ CRITICAL

### Objective
Verify that system administrators can view all user session preferences.

### Steps

1. **Login as a system admin**
   - User type must be 'system_admin'
   - Must be active

2. **Query all preferences** (via Supabase client or UI):
   ```typescript
   const { data, error } = await supabase
     .from('user_session_preferences')
     .select('*')
     .limit(10);

   console.log('Admin can see:', data?.length, 'records');
   console.log('Error:', error);
   ```

3. **Verify**:
   - ✅ `error` is null (no RLS violation)
   - ✅ `data` contains multiple user preference records
   - ✅ Can see preferences for users other than self

### Expected Result
```typescript
// Success
{
  data: [
    { user_id: '...', idle_timeout_minutes: 30, ... },
    { user_id: '...', idle_timeout_minutes: 60, ... },
    { user_id: '...', idle_timeout_minutes: 120, ... }
  ],
  error: null
}
```

### Test Non-Admin Access

**As a regular user** (student/teacher):
```typescript
const { data, error } = await supabase
  .from('user_session_preferences')
  .select('*');

// Should only see own preferences (1 record max)
console.log('Non-admin sees:', data?.length, 'records'); // Expected: 1
```

---

## Test 3: Cache TTL Reduction

### Objective
Verify that preference changes are reflected within 1 minute.

### Steps

1. **Login as any user**

2. **Load preferences** (first load):
   ```typescript
   const prefs1 = await getUserSessionPreferences();
   console.log('Initial warning style:', prefs1.warningStyle);
   ```

3. **Update preferences**:
   ```typescript
   await updateSessionPreferences({
     warningStyle: 'banner' // Change from current value
   });
   ```

4. **Wait 30 seconds**

5. **Load preferences again**:
   ```typescript
   const prefs2 = await getUserSessionPreferences();
   console.log('After 30s warning style:', prefs2.warningStyle);
   // Should show NEW value (cache expired or invalidated)
   ```

### Expected Result
- After update, cache is cleared immediately
- On next load, fresh data from database is returned
- Changes are visible within 1 minute even if cache isn't cleared

---

## Test 4: Integration Test - Complete User Flow

### Objective
Test the entire flow from user creation to preference customization.

### Steps

1. **Create new student user**
   - Use your normal user creation workflow

2. **Login as that student**
   - Should work normally

3. **Navigate to session preferences** (if UI exists)
   - Should see pre-populated defaults, not empty form

4. **Verify initial values in console**:
   ```typescript
   // In browser console after login
   const prefs = await window._supabaseDebug.getUserSessionPreferences();
   console.log('Student defaults:', prefs);
   ```

5. **Modify preferences**:
   ```typescript
   await window._supabaseDebug.updateSessionPreferences({
     idleTimeoutMinutes: 45,
     warningStyle: 'toast'
   });
   ```

6. **Reload page**

7. **Verify changes persisted**:
   ```typescript
   const updatedPrefs = await window._supabaseDebug.getUserSessionPreferences();
   console.log('Updated prefs:', updatedPrefs);
   // Should show 45 minutes, 'toast'
   ```

### Expected Result
✅ User starts with proper defaults
✅ Can modify preferences
✅ Changes persist across sessions
✅ No errors in console

---

## Test 5: Database Trigger Verification

### Objective
Verify triggers fire correctly in various scenarios.

### Test A: Normal User Creation
```sql
-- Insert test user into users table
INSERT INTO users (id, email, user_type, auth_user_id)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'test-trigger@example.com',
  'student',
  '00000000-0000-0000-0000-000000000002'
) RETURNING *;

-- Check if preferences were created
SELECT * FROM user_session_preferences
WHERE user_id = '00000000-0000-0000-0000-000000000002';
-- Should return 1 row with student defaults
```

### Test B: Late auth_user_id Assignment
```sql
-- Insert user without auth_user_id
INSERT INTO users (id, email, user_type)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  'test-late-auth@example.com',
  'teacher'
) RETURNING *;

-- No preferences yet (auth_user_id is null)
SELECT COUNT(*) FROM user_session_preferences
WHERE user_id IS NULL; -- Should be 0

-- Update with auth_user_id
UPDATE users
SET auth_user_id = '00000000-0000-0000-0000-000000000004'
WHERE id = '00000000-0000-0000-0000-000000000003';

-- Now preferences should exist
SELECT * FROM user_session_preferences
WHERE user_id = '00000000-0000-0000-0000-000000000004';
-- Should return 1 row with teacher defaults
```

### Test C: Duplicate Prevention
```sql
-- Try to create same user twice (should not create duplicate preferences)
INSERT INTO users (id, email, user_type, auth_user_id)
VALUES (
  '00000000-0000-0000-0000-000000000005',
  'test-duplicate@example.com',
  'student',
  '00000000-0000-0000-0000-000000000006'
);

-- Check count
SELECT COUNT(*) FROM user_session_preferences
WHERE user_id = '00000000-0000-0000-0000-000000000006';
-- Should be exactly 1, not 2
```

---

## Troubleshooting

### Issue: No preferences created for new user

**Possible Causes**:
1. Trigger not firing
2. auth_user_id is null
3. RLS preventing insert

**Debug**:
```sql
-- Check if trigger exists
SELECT
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users'
AND trigger_name LIKE '%session_preferences%';

-- Check user record
SELECT id, auth_user_id, user_type, is_active
FROM users
WHERE email = 'problem-user@example.com';

-- Try manual insert
INSERT INTO user_session_preferences (
  user_id, idle_timeout_minutes, warning_style, remember_me_days
) VALUES (
  'USER_AUTH_ID'::uuid, 60, 'silent', 7
);
-- If this fails, check RLS policies
```

### Issue: Admin can't view preferences

**Possible Causes**:
1. User is not actually system_admin type
2. User is not active
3. RLS policy not applied

**Debug**:
```sql
-- Check admin user details
SELECT
  u.id,
  u.email,
  u.user_type,
  u.is_active,
  u.auth_user_id
FROM users u
WHERE u.email = 'admin@example.com';

-- Check if policy exists
SELECT
  polname,
  polcmd,
  polpermissive
FROM pg_policies
WHERE tablename = 'user_session_preferences'
AND polname = 'Admins can view all preferences';

-- Test policy directly
SET ROLE authenticated;
SET request.jwt.claims.sub = 'ADMIN_AUTH_USER_ID';
SELECT * FROM user_session_preferences;
RESET ROLE;
```

### Issue: Cache not refreshing

**Possible Causes**:
1. Code not redeployed
2. Service worker caching old code
3. Browser cache

**Debug**:
```typescript
// Check current cache duration
import { CACHE_DURATION_MS } from '@/services/sessionPreferencesService';
console.log('Cache duration:', CACHE_DURATION_MS, 'ms'); // Should be 60000

// Force cache clear
clearPreferencesCache();

// Clear service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(reg => reg.unregister());
  });
}
```

---

## Success Criteria

All tests pass if:

- ✅ New users get automatic preferences with correct defaults
- ✅ Different user types get appropriate timeout values
- ✅ System admins can view all preferences without errors
- ✅ Regular users can only see their own preferences
- ✅ Preference updates are reflected within 1 minute
- ✅ Triggers fire for both INSERT and UPDATE operations
- ✅ No duplicate preference records created
- ✅ Build completes without errors
- ✅ No console errors during user flows

---

## Cleanup After Testing

```sql
-- Remove test users (optional)
DELETE FROM user_session_preferences
WHERE user_id IN (
  SELECT auth_user_id FROM users
  WHERE email LIKE 'test-%@example.com'
);

DELETE FROM users
WHERE email LIKE 'test-%@example.com';
```

---

## Report Template

**Test Date**: _______________
**Tester**: _______________

| Test | Status | Notes |
|------|--------|-------|
| Auto-initialization | ⬜ Pass ⬜ Fail | |
| Admin RLS Policy | ⬜ Pass ⬜ Fail | |
| Cache TTL | ⬜ Pass ⬜ Fail | |
| Integration Flow | ⬜ Pass ⬜ Fail | |
| Database Triggers | ⬜ Pass ⬜ Fail | |

**Overall Result**: ⬜ All tests passed ⬜ Issues found

**Issues Encountered**:
_______________________________________________
_______________________________________________

**Recommendations**:
_______________________________________________
_______________________________________________
