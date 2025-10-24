# Test Mode - Quick Reference Guide

## For System Administrators

### How to Use Test Mode

1. **Activate**
   - Go to System Admin Dashboard
   - Click "Test as User" button (orange)
   - Search for user by name or email
   - Select user and click "Test"
   - Confirm activation

2. **During Session**
   - Orange bar at top shows test user and countdown
   - Navigate normally - you'll see what the test user sees
   - Timer shows remaining time (starts at 5:00)
   - Warnings at 1 minute and 30 seconds

3. **Exit**
   - Click "Exit Test Mode" button in orange bar
   - Confirm exit
   - You'll return to System Admin Dashboard

### Important Notes

- **Only Super Admins** can use test mode
- **Maximum 5 minutes** per session
- **No extensions** - start new session if needed
- **Auto-expires** at 5:00 countdown
- **All activity logged** for security

---

## For Developers

### Quick Integration

**Check if in test mode:**
```typescript
import { isInTestMode, getTestModeUser, getRealAdminUser } from '@/lib/auth';

const inTestMode = isInTestMode();
const testUser = getTestModeUser();
const realAdmin = getRealAdminUser();
```

**Use current user (test or real):**
```typescript
import { getCurrentUser } from '@/lib/auth';

const user = getCurrentUser(); // Returns test user if active, otherwise real user
```

**Listen for test mode changes:**
```typescript
useEffect(() => {
  const handleTestModeChange = () => {
    // Refresh your data or UI
  };

  window.addEventListener('test-mode-change', handleTestModeChange);
  window.addEventListener('auth-change', handleTestModeChange);

  return () => {
    window.removeEventListener('test-mode-change', handleTestModeChange);
    window.removeEventListener('auth-change', handleTestModeChange);
  };
}, []);
```

**Check permissions:**
```typescript
import { usePermissions } from '@/contexts/PermissionContext';

const { permissions, hasPermission } = usePermissions();
// Automatically uses test user's permissions when in test mode
```

### Database Queries

**RLS policies automatically handle test mode** - no code changes needed!

**How it works:**
- Policies use `get_effective_user_id()` instead of `auth.uid()`
- Returns test user ID when in test mode
- Returns real user ID in normal mode

**Example:**
```sql
CREATE POLICY "Users can view their own data"
  ON users FOR SELECT
  TO authenticated
  USING (id = get_effective_user_id()); -- ← Uses test user ID if in test mode
```

### Audit Logging

**Automatic logging:**
- Test mode start/end logged automatically
- Session metadata stored in `test_mode_audit_log`

**Manual logging:**
```typescript
import { logImpersonationActivity } from '@/lib/auth';

await logImpersonationActivity(
  'action',
  adminId,
  testUserId,
  'Optional reason'
);
```

---

## Troubleshooting

### Issue: Test mode won't activate
**Fix:** Verify you're logged in as Super Admin (SSA role)

### Issue: Permission denied errors
**Fix:** Apply migrations:
- `20251003120000_add_test_mode_support_functions.sql`
- `20251003120001_update_rls_policies_for_test_mode.sql`

### Issue: Context not refreshing
**Fix:** Ensure components are wrapped in UserProvider and PermissionProvider

### Issue: Timer not working
**Fix:** Check browser console for errors in TestModeBar component

### Enable Debug Mode
```javascript
// In browser console:
localStorage.setItem('debug_test_mode', 'true');

// Then refresh page and check console for detailed logs
```

---

## Security Checklist

- [x] Only SSA can activate test mode
- [x] Cannot test as yourself
- [x] Session auto-expires after 5 minutes
- [x] All activity logged to database
- [x] Real admin ID preserved in logs
- [x] RLS policies enforce proper scoping
- [x] Test user cannot escalate privileges

---

## Key Files

### Frontend
- `src/lib/auth.ts` - Core test mode logic
- `src/contexts/UserContext.tsx` - User state management
- `src/contexts/PermissionContext.tsx` - Permission handling
- `src/components/admin/TestAnyUserModal.tsx` - User selection
- `src/components/admin/TestModeBar.tsx` - Session display

### Backend
- `supabase/migrations/20251003120000_*.sql` - Helper functions
- `supabase/migrations/20251003120001_*.sql` - RLS policies

### Documentation
- `TEST_MODE_FEATURE_DOCUMENTATION.md` - Complete guide
- `TEST_MODE_FIX_SUMMARY.md` - Implementation details
- `TEST_MODE_QUICK_REFERENCE.md` - This file

---

## API Reference

### Core Functions

**startTestMode(testUser)**
- Activates test mode for specified user
- Stores metadata with 5-minute expiration
- Dispatches auth change event
- Redirects to appropriate module

**exitTestMode()**
- Deactivates test mode
- Cleans up all test mode data
- Logs session end
- Restores admin session

**isInTestMode()**
- Returns: boolean
- True if currently in test mode

**getTestModeUser()**
- Returns: User object or null
- Test user if active, null otherwise

**getRealAdminUser()**
- Returns: User object or null
- Real admin user (even during test mode)

**getCurrentUser()**
- Returns: User object or null
- Test user if in test mode, otherwise real user

**getTestModeMetadata()**
- Returns: Metadata object or null
- Includes: realAdminId, testUserId, startTime, expirationTime

**isTestModeExpired()**
- Returns: boolean
- True if session has expired

### Database Functions

**is_in_test_mode()**
- Returns: boolean
- Detects test mode from session

**get_effective_user_id()**
- Returns: UUID
- Test user ID if in test mode, auth.uid() otherwise

**get_real_admin_id()**
- Returns: UUID
- Always returns authenticated admin ID

**is_super_admin()**
- Returns: boolean
- True if user is Super System Admin

**log_test_mode_activity(action, table_name, record_id, details)**
- Logs activity to test_mode_audit_log
- Auto-captures session metadata

---

## Common Patterns

### Conditional UI Based on Test Mode

```typescript
import { isInTestMode, getTestModeUser } from '@/lib/auth';

function MyComponent() {
  const inTestMode = isInTestMode();
  const testUser = getTestModeUser();

  if (inTestMode) {
    return (
      <div className="bg-orange-100 p-4">
        <p>Testing as: {testUser?.email}</p>
        {/* Show test mode specific UI */}
      </div>
    );
  }

  return (
    <div>
      {/* Normal UI */}
    </div>
  );
}
```

### Permission-Based Rendering

```typescript
import { usePermissions } from '@/contexts/PermissionContext';

function AdminPanel() {
  const { hasPermission } = usePermissions();

  if (!hasPermission('users', 'manage_users')) {
    return <div>Access denied</div>;
  }

  return <div>Admin Panel Content</div>;
}
```

### Module Access Guard

```typescript
import { getCurrentUser } from '@/lib/auth';
import { Navigate } from 'react-router-dom';

function EntityModule() {
  const user = getCurrentUser();

  if (!user || !['SSA', 'ENTITY_ADMIN'].includes(user.role)) {
    return <Navigate to="/signin" />;
  }

  return <div>Entity Module Content</div>;
}
```

---

## Performance Tips

1. **Use React Context** - Don't call `getCurrentUser()` repeatedly
2. **Cache Permission Checks** - PermissionContext has built-in caching
3. **Avoid Polling** - Use event listeners instead of setInterval
4. **Lazy Load** - Only load test mode UI when needed

---

**Last Updated:** 2025-10-03
**For Questions:** Check TEST_MODE_FEATURE_DOCUMENTATION.md
