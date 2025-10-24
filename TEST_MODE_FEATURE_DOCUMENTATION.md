# Test Mode Feature - Complete Technical Documentation

## Overview

The Test Mode feature allows Super System Admins (SSA) to safely impersonate other users in the system to test permissions, module access, and user experience without affecting real data or requiring actual user credentials.

## Architecture

### Frontend Components

#### 1. **TestAnyUserModal** (`src/components/admin/TestAnyUserModal.tsx`)
- User selection interface for initiating test mode
- Fetches users from multiple tables (admin_users, entity_users, teachers, students)
- Provides search and filter capabilities
- Validates user selection before starting test mode
- Logs impersonation start activity

**Key Features:**
- Search by name or email
- Filter by user type (admin, entity, teacher, student)
- Display user metadata (role, company, position)
- Prevent self-impersonation
- Confirmation dialog before activation

#### 2. **TestModeBar** (`src/components/admin/TestModeBar.tsx`)
- Persistent header bar visible during test mode
- Shows test user information and remaining time
- Auto-expires after 5 minutes
- Visual warnings at 1 minute and 30 seconds remaining
- Manual exit with confirmation

**Key Features:**
- Countdown timer with visual color coding
- Real-time expiration checking (every second)
- Auto-exit on expiration
- Toast notifications for warnings
- Displays both test user and real admin identity

#### 3. **Auth Library** (`src/lib/auth.ts`)
- Core authentication and test mode state management
- Handles test mode activation/deactivation
- Session monitoring and expiration
- Metadata storage and retrieval

**Key Functions:**
- `startTestMode(testUser)` - Initiates test mode session
- `exitTestMode()` - Ends test mode and restores admin session
- `isInTestMode()` - Returns current test mode status
- `getTestModeUser()` - Returns test user object
- `getRealAdminUser()` - Returns real admin user object
- `getTestModeMetadata()` - Returns session metadata
- `isTestModeExpired()` - Checks if session has expired
- `getCurrentUser()` - Returns effective user (test user or real user)

#### 4. **UserContext** (`src/contexts/UserContext.tsx`)
- Manages user state across the application
- Listens for test mode changes
- Automatically refreshes on test mode transitions
- Provides `user`, `realAdminUser`, and `isTestMode` to components

**Event Listeners:**
- `storage` - Detects localStorage changes
- `auth-change` - Custom event for auth state changes
- `test-mode-change` - Custom event for test mode changes

#### 5. **PermissionContext** (`src/contexts/PermissionContext.tsx`)
- Fetches and caches user permissions
- Test mode aware - loads test user's permissions
- Provides permission checking functions
- Automatically refreshes on test mode changes

**Test Mode Behavior:**
- Detects test mode via `isInTestMode()`
- Fetches permissions for test user's role
- Falls back to minimal permissions if user not found
- Handles different user types (admin, entity, teacher, student)

#### 6. **AdminLayout** (`src/components/layout/AdminLayout.tsx`)
- Main layout wrapper for admin interfaces
- Validates module access permissions
- Re-validates when test mode changes
- Distinguishes test mode access denials from real violations

### Backend Components

#### 1. **Test Mode Helper Functions** (Migration: `20251003120000_add_test_mode_support_functions.sql`)

**Functions:**
- `is_in_test_mode()` - Checks if session is in test mode
- `get_effective_user_id()` - Returns test user ID or real user ID
- `get_real_admin_id()` - Always returns the authenticated admin ID
- `is_super_admin()` - Checks if user is a Super System Admin
- `log_test_mode_activity()` - Logs test mode actions to audit table

**Audit Table:**
- `test_mode_audit_log` - Records all test mode activities
  - real_admin_id
  - test_user_id
  - test_user_email
  - test_user_type
  - action
  - table_name
  - record_id
  - details (JSONB)
  - ip_address
  - user_agent
  - created_at

#### 2. **RLS Policy Updates** (Migration: `20251003120001_update_rls_policies_for_test_mode.sql`)

**Updated Tables:**
- users
- admin_users
- entity_users
- teachers
- students
- companies
- schools
- branches
- entity_admin_scope

**Policy Strategy:**
- Policies use `get_effective_user_id()` instead of `auth.uid()`
- Super admins can access all data regardless of test mode
- Test users see data within their normal scope
- Circular RLS dependencies eliminated
- Security violations properly distinguished from test mode access

## Workflow

### Starting Test Mode

1. **User Action:** SSA clicks "Test as User" button on dashboard
2. **Modal Opens:** TestAnyUserModal displays user selection interface
3. **User Selection:** Admin searches and selects target user
4. **Validation:** System validates selection (not self, not inactive)
5. **Confirmation:** Admin confirms test mode activation
6. **Activation:**
   - Test user stored in localStorage (`test_mode_user`)
   - Metadata stored with expiration time (5 minutes)
   - Auth change event dispatched
   - User redirected to appropriate module
7. **Context Refresh:** UserContext and PermissionContext update
8. **TestModeBar Appears:** Persistent header shows test session info

### During Test Mode

1. **Permission Checks:** All permission queries use test user's ID
2. **RLS Enforcement:** Database policies apply test user's scope
3. **Navigation:** User sees menus and features for test user's role
4. **Timer:** Countdown visible in TestModeBar
5. **Warnings:** Toasts appear at 1 minute and 30 seconds
6. **Module Access:** AdminLayout validates based on test user role

### Exiting Test Mode

#### Manual Exit
1. **User Action:** Admin clicks "Exit Test Mode" button
2. **Confirmation:** Dialog confirms exit intention
3. **Logging:** Impersonation end logged
4. **Cleanup:** Test mode data removed from localStorage
5. **Auth Event:** Dispatch to trigger context refresh
6. **Redirect:** Return to System Admin Dashboard
7. **Context Restore:** Original admin session restored

#### Auto-Expiration
1. **Timer Reaches Zero:** TestModeBar detects expiration
2. **Auto-Exit:** System automatically calls exitTestMode()
3. **Notification:** Toast shows "Test mode session expired"
4. **Same Cleanup:** Same process as manual exit

## Security Features

### Access Control
- **Only Super System Admins** can activate test mode
- **Role-based restrictions** enforced in test mode
- **Module access** validated against test user's permissions
- **RLS policies** ensure data isolation

### Audit Trail
- **Start/End logging** for all test sessions
- **Session metadata** includes:
  - Real admin ID and email
  - Test user ID and email
  - Start time and expiration time
  - Duration on exit
- **Activity logging** for sensitive operations
- **Violation tracking** separates test mode from real violations

### Time Limits
- **5-minute maximum** session duration
- **Auto-expiration** enforced
- **No extension** mechanism (must start new session)
- **Graceful warnings** before expiration

### Data Protection
- **Read-only by default** (configurable)
- **Real admin identity preserved** in all logs
- **Session isolation** prevents data leakage
- **Automatic cleanup** on expiration

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     Test Mode Activation                        │
└─────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│  localStorage                                                   │
│  ├── test_mode_user (User object)                              │
│  ├── test_mode_metadata (Session info)                         │
│  └── test_mode_logs (Activity log)                             │
└─────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│  Event: 'auth-change' / 'test-mode-change'                     │
└─────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│  UserContext.refreshUser()                                      │
│  └── getCurrentUser() → returns test_mode_user                 │
└─────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│  PermissionContext.fetchPermissions()                           │
│  ├── Detects test mode via isInTestMode()                      │
│  ├── Fetches test user's permissions from DB                   │
│  └── Sets permissions based on test user's role                │
└─────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│  Application Components                                         │
│  ├── Use test user's identity via useUser()                    │
│  ├── Check test user's permissions via usePermissions()        │
│  └── Navigate to test user's allowed modules                   │
└─────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│  Database Queries (Supabase)                                   │
│  ├── RLS policies use get_effective_user_id()                  │
│  ├── Returns test user's ID when in test mode                  │
│  └── Filters data based on test user's scope                   │
└─────────────────────────────────────────────────────────────────┘
```

## Error Handling

### Common Issues and Solutions

#### Issue: Test mode doesn't activate
**Cause:** User is not SSA or test user data invalid
**Solution:**
- Verify realAdmin.role === 'SSA'
- Check test user object has valid id, name, email, role
- Review browser console for errors

#### Issue: Permission denied errors during test mode
**Cause:** RLS policies not updated or user lacks permissions
**Solution:**
- Apply migration `20251003120001_update_rls_policies_for_test_mode.sql`
- Verify `get_effective_user_id()` function exists
- Check test user has appropriate role in database

#### Issue: Test mode doesn't expire
**Cause:** Expiration metadata not set or timer not running
**Solution:**
- Verify `test_mode_metadata` in localStorage has expirationTime
- Check TestModeBar is mounted and useEffect running
- Look for errors in browser console

#### Issue: Contexts don't refresh on test mode change
**Cause:** Event listeners not registered or auth-change not dispatched
**Solution:**
- Verify `dispatchAuthChange()` called in startTestMode() and exitTestMode()
- Check UserContext and PermissionContext have event listeners
- Ensure components are wrapped in providers

## Configuration

### Session Duration
Default: 5 minutes (300 seconds)

To change, update in `auth.ts`:
```typescript
const testModeMetadata = {
  // ...
  expirationTime: Date.now() + (5 * 60 * 1000) // Change multiplier
};
```

### Warning Thresholds
- 1 minute warning: Toast notification
- 30 seconds warning: Visual pulse in TestModeBar

To change, update in `TestModeBar.tsx`:
```typescript
if (timeLeft === 60 && !showExpiryWarning) { // Change threshold
  setShowExpiryWarning(true);
  toast.warning('Test mode will expire in 1 minute');
}
```

### User Type Filters
Available filters in TestAnyUserModal:
- all (default)
- admin
- entity
- teacher
- student

To add new types, update fetch logic in TestAnyUserModal query.

## Testing Checklist

### Functional Tests
- [ ] SSA can open TestAnyUserModal
- [ ] Non-SSA cannot see test mode features
- [ ] User search works correctly
- [ ] User type filter works
- [ ] Cannot select self for testing
- [ ] Test mode activates successfully
- [ ] Redirect to correct module occurs
- [ ] TestModeBar appears with correct info
- [ ] Timer counts down correctly
- [ ] Warnings appear at correct times
- [ ] Auto-expiration works
- [ ] Manual exit works
- [ ] Confirmation dialogs appear
- [ ] Real admin session restored on exit

### Permission Tests
- [ ] Test as Entity Admin - see entity data only
- [ ] Test as Teacher - see teacher features only
- [ ] Test as Student - see student features only
- [ ] Test as System Admin - see admin features
- [ ] Cannot access unauthorized modules
- [ ] RLS filters data correctly
- [ ] Permission checks work for all resources

### Security Tests
- [ ] Only SSA can activate test mode
- [ ] Test mode audit log created
- [ ] Activity logged correctly
- [ ] Cannot escalate privileges
- [ ] Session expires automatically
- [ ] Cannot extend session beyond 5 minutes
- [ ] Real admin ID preserved in logs
- [ ] Test mode flagged in security events

### Edge Cases
- [ ] Rapid test mode switching
- [ ] Test mode with expired real admin session
- [ ] Browser refresh during test mode
- [ ] Multiple tabs with different test users
- [ ] Network errors during test mode
- [ ] Database unavailable during test mode

## Maintenance

### Regular Tasks
1. **Review audit logs** - Check for suspicious activity
2. **Monitor session durations** - Ensure no extended sessions
3. **Verify RLS policies** - Confirm test mode access is scoped
4. **Test with new user types** - When adding roles, test impersonation
5. **Update documentation** - Keep this guide current

### Performance Monitoring
- **Context refresh frequency** - Should not exceed 1-2 times per test session
- **Permission query time** - Should complete under 500ms
- **Timer accuracy** - Should be within 1-2 seconds of actual time
- **Event listener overhead** - Monitor for memory leaks

## Troubleshooting

### Debug Mode
Enable detailed logging:
```typescript
// In browser console
localStorage.setItem('debug_test_mode', 'true');
```

This will log:
- Test mode activation/deactivation
- Context refresh events
- Permission fetch operations
- RLS policy evaluations
- Timer updates

### Common Console Messages

**Normal:**
```
[TestMode] Started for user: john@example.com (ENTITY_ADMIN)
[UserContext] Test mode event received, refreshing user
[PermissionContext] Test mode active, fetching permissions for test user
[TestMode] Duration: 125 seconds
```

**Warning:**
```
[TestModeBar] No expiration metadata found
[PermissionContext] Using minimal permissions for test entity user
```

**Error:**
```
[TestMode] SECURITY: Invalid test user selection
[RLS] Permission denied for test user on table: schools
```

## Future Enhancements

### Planned Features
1. **Configurable session duration** - Allow admins to set custom timeouts
2. **Session extension** - Allow one-time 5-minute extension
3. **Activity recording** - Capture specific actions taken during test mode
4. **Read-only enforcement** - Prevent write operations in test mode
5. **Multi-factor confirmation** - Require additional auth for sensitive users
6. **Role simulation** - Test multiple roles without full user impersonation
7. **Batch testing** - Test as multiple users sequentially
8. **Test mode history** - View past test sessions and activities

### Known Limitations
1. **No write protection** - Test users can modify data (by design)
2. **Single session** - Cannot test multiple users simultaneously
3. **Fixed duration** - Cannot adjust timeout mid-session
4. **No role override** - Must test as actual user, cannot simulate different role
5. **Frontend only** - Test mode state not stored in database

## Support

### Contact
For issues with the test mode feature:
1. Check this documentation first
2. Review console logs for errors
3. Verify migrations are applied
4. Check browser compatibility (Chrome 90+, Firefox 88+, Safari 14+)
5. Report bugs with reproduction steps

### Resources
- Migration files: `supabase/migrations/20251003120000_*.sql`
- Frontend code: `src/components/admin/Test*.tsx`
- Auth library: `src/lib/auth.ts`
- Contexts: `src/contexts/UserContext.tsx`, `PermissionContext.tsx`

---

**Last Updated:** 2025-10-03
**Version:** 1.0.0
**Author:** System Development Team
