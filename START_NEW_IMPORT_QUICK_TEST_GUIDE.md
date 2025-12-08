# Start New Import - Quick Test Guide

## Quick Verification Steps

### Test 1: Normal Flow (5 minutes)
```
1. Login to system
2. Navigate to: System Admin → Learning → Practice Management → Papers Setup
3. Upload a JSON file OR resume an existing session
4. Click "Start New Import" button
5. Confirm deletion in dialog
6. ✓ VERIFY: Page reloads WITHOUT logging out
7. ✓ VERIFY: You see the upload page in clean state
```

**Expected Console Logs:**
```
[UploadTab] Critical operation flag set
[UploadTab] Validating session before delete operation
[UploadTab] Session valid for XX minutes
[UploadTab] Reload markers set and verified successfully
[UploadTab] Initiating page reload with session protection
[SessionManager] Using extended grace period (180s) for: start_new_import
```

---

### Test 2: Refresh Button (2 minutes)
```
1. Same as Test 1, but click "Refresh" instead
2. ✓ VERIFY: Page reloads WITHOUT logging out
```

**Expected Console Logs:**
```
[UploadTab] Session valid for XX minutes
[SessionManager] Using extended grace period (120s) for: refresh_session
```

---

### Test 3: Session Expiring Soon (10 minutes)
```
1. Login and wait until session has < 5 minutes remaining
   (Check console: session monitors log remaining time)
2. Click "Start New Import"
3. ✓ VERIFY: Console shows "Session expiring in X minutes, refreshing..."
4. ✓ VERIFY: Page reloads successfully without logout
```

**Expected Console Logs:**
```
[UploadTab] Session expiring in 3.5 minutes, refreshing...
[UploadTab] Session refreshed successfully
```

---

### Test 4: Error Handling (3 minutes)
```
1. Let session expire completely (wait ~1 hour or force expire)
2. Try to click "Start New Import"
3. ✓ VERIFY: Error message shows
4. ✓ VERIFY: "Your session has expired. Please refresh and sign in again."
5. ✓ VERIFY: No page reload occurs
```

---

## What to Look For

### ✅ Success Indicators
- Page reloads smoothly
- No redirect to login page
- Session remains active after reload
- Console shows protection flow logs
- No errors in console

### ❌ Failure Indicators
- Redirected to /signin page
- Session expired notice appears
- Console shows errors
- User needs to re-authenticate

---

## Quick Troubleshooting

### If Test Fails:

**Problem**: Still getting logged out
- Check console for errors
- Verify localStorage is enabled
- Check if session was already expired before click
- Verify grace period logs appear

**Problem**: Database operation fails
- Check network tab for 401 errors
- Verify Supabase connection
- Check if RLS policies are correct

**Problem**: No console logs appear
- Verify you're in development mode
- Check browser console settings
- Ensure source maps are enabled

---

## Browser Console Shortcuts

**Check Session Status:**
```javascript
// Run in console
localStorage.getItem('ggk_sb_token')
sessionStorage.getItem('ggk_critical_operation')
```

**Force Session Check:**
```javascript
// Run in console
import { checkSessionStatus } from './src/lib/sessionManager'
checkSessionStatus()
```

---

## Expected Timings

| Action | Time | Notes |
|--------|------|-------|
| Session validation | ~50ms | Supabase check |
| Session refresh | ~300ms | Only if needed |
| Reload preparation | ~100ms | Marker setting |
| Persistence delay | 100ms | Guaranteed writes |
| Total reload time | ~500ms | Acceptable |

---

## Rollback Instructions

If issues found:
```bash
git checkout HEAD~1 src/app/system-admin/learning/practice-management/papers-setup/tabs/UploadTab.tsx
git checkout HEAD~1 src/lib/sessionManager.ts
npm run build
```

---

## Production Deployment Checklist

Before deploying:
- ✅ All 4 tests pass
- ✅ Build completes successfully
- ✅ Console logs show protection flow
- ✅ Error handling works correctly
- ✅ Performance is acceptable

---

**Quick Reference**: See `START_NEW_IMPORT_SESSION_FIX_COMPLETE.md` for full details.
