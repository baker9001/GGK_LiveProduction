# Quick Test Guide: Session Expired Message

## Fast Testing (30 seconds)

### Method 1: Force Token Expiration
1. Sign in to the application
2. Open Browser DevTools (F12) → Console tab
3. Paste and run:
   ```javascript
   localStorage.removeItem('ggk_auth_token');
   window.location.reload();
   ```
4. **Expected:** Redirected to sign-in with blue banner showing "Session expired"

### Method 2: Check Storage Directly
1. Sign in to the application
2. Open DevTools → Console
3. Manually expire session:
   ```javascript
   localStorage.setItem('ggk_session_expired_notice', 'Your session has expired. Please sign in again to continue.');
   window.location.href = '/signin';
   ```
4. **Expected:** Blue banner appears at top of sign-in form

### Method 3: Delete Auth and Navigate
1. Sign in to application
2. Open DevTools → Application → Local Storage
3. Delete `ggk_auth_token` entry
4. Try to navigate to any protected page
5. **Expected:** Redirected to sign-in with session expired message

## What You Should See

### On Sign-in Page
```
┌────────────────────────────────────────────────────┐
│  ⓘ Session expired                                 │
│  Your session has expired. Please sign in again   │
│  to continue.                                      │
└────────────────────────────────────────────────────┘

Email address *
[________________________________]

Password *
[________________________________]

□ Remember me          Forgot password?

[        Sign in        ]
```

### In Console
You should see logs like:
```
[SessionManager] Session expired, initiating logout
[Auth] Marking session as expired: Your session has expired...
[Auth] Session expired message stored successfully
[SessionManager] Session expired message verified in storage
[SignIn] Sign-in page mounted
[Auth] Checking for session expired notice...
[Auth] Session expired notice found in localStorage
[SignIn] Session expired message found, will display to user
```

## Verification Checklist

- [ ] Blue banner appears above sign-in form
- [ ] Banner shows "Session expired" title
- [ ] Banner shows full message
- [ ] Banner has AlertCircle icon
- [ ] Banner has blue background with border
- [ ] Console shows storage verification logs
- [ ] No errors in console
- [ ] Message disappears after successful sign-in

## Troubleshooting

### Message Not Appearing?
1. Check console for errors
2. Verify storage:
   ```javascript
   localStorage.getItem('ggk_session_expired_notice')
   sessionStorage.getItem('ggk_session_expired_notice')
   ```
3. Check if message was stored:
   - Should see "[Auth] Session expired message stored successfully"
4. Check if message was found:
   - Should see "[Auth] Session expired notice found"

### Common Issues

**Issue:** Message appears but console shows warnings
- **Cause:** Storage write failed
- **Check:** Look for "[Auth] WARNING:" messages
- **Impact:** Message still works via sessionStorage fallback

**Issue:** No console logs at all
- **Cause:** Session not actually expired
- **Fix:** Force expiration using Method 1 above

**Issue:** Message appears multiple times
- **Cause:** Message not being cleared
- **Check:** Verify consumeSessionExpiredNotice() is called
- **Fix:** Should auto-clear after first display

## Browser Storage View

### Check in DevTools → Application → Storage

**Before Expiration:**
- `ggk_auth_token`: [some token]
- `ggk_session_expired_notice`: (empty)

**After Expiration (before sign-in page loads):**
- `ggk_auth_token`: (removed)
- `ggk_session_expired_notice`: "Your session has expired..."
- sessionStorage also has same message

**After Sign-in Page Loads:**
- `ggk_auth_token`: (removed)
- `ggk_session_expired_notice`: (cleared)
- Message now in component state, displaying in UI

## Testing Different Scenarios

### Scenario A: Natural Expiration
Wait 24 hours (or modify session duration for testing)

### Scenario B: Manual Token Delete
Delete auth token manually and navigate

### Scenario C: Session Manager Triggers
Let session manager detect expired session

### Scenario D: Multiple Tabs
Open two tabs, expire in one, check message appears

## Success Criteria

✅ Message ALWAYS appears when session expires
✅ Message is clear and professional
✅ No console errors
✅ Storage cleaned up after display
✅ User can sign in again normally
✅ Works across all browsers
✅ Works in multiple tabs
✅ Works after page refresh

## Performance Check

- Message should appear within 300ms of page load
- No visible delay in redirect
- No blocking operations
- Smooth user experience

## Quick Debug Commands

```javascript
// Force session expiration
localStorage.setItem('ggk_session_expired_notice', 'Test message');
window.location.href = '/signin';

// Check if message is stored
console.log('localStorage:', localStorage.getItem('ggk_session_expired_notice'));
console.log('sessionStorage:', sessionStorage.getItem('ggk_session_expired_notice'));

// Clear message manually (if stuck)
localStorage.removeItem('ggk_session_expired_notice');
sessionStorage.removeItem('ggk_session_expired_notice');
window.location.reload();

// Verify storage mechanism
console.log('Storage test:',
  localStorage.setItem('test', '1') || 'localStorage works',
  sessionStorage.setItem('test', '1') || 'sessionStorage works'
);
```

## Expected Results Summary

| Test Method | Expected Time | Success Indicator |
|-------------|---------------|-------------------|
| Force token deletion | < 1 second | Blue banner appears |
| Manual storage set | Immediate | Banner on page load |
| Navigation attempt | < 2 seconds | Redirect + banner |
| Multiple tabs | < 3 seconds | All tabs show message |
| Natural expiration | 24 hours | Banner after redirect |

## Contact

If message still doesn't appear after following this guide:
1. Check console for specific error messages
2. Verify browser supports localStorage and sessionStorage
3. Check if browser extensions are blocking storage
4. Try in incognito/private window to rule out extensions
