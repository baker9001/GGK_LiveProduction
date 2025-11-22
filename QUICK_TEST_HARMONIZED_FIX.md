# Quick Test Guide: Harmonized Session Expiry Fix

## Fast Tests (2 minutes total)

### Test 1: Refresh Button (30 seconds)

**Steps:**
1. Sign in to the system
2. Navigate to: System Admin → Learning → Practice Management → Papers Setup
3. Upload a paper JSON file (or resume existing session)
4. Click the **"Refresh"** button (green refresh icon)

**Expected Result:**
✅ Page reloads smoothly
✅ NO "Session expired" message appears
✅ Returns to Papers Setup page

**Console Should Show:**
```
[UploadTab] Cleared session expired flags from all storages before reload
[SessionManager] Detected deliberate reload: refresh_session
[SessionManager] Using extended grace period for deliberate reload
[Auth] Skipping session expired notice - extended grace period just activated
```

**If You See "Session expired":** ❌ Bug - Report immediately!

---

### Test 2: Start New Import Button (30 seconds)

**Steps:**
1. On Papers Setup page with active import session
2. Click **"Start New Import"** button (red trash icon)
3. Confirm deletion in modal
4. Wait for page reload

**Expected Result:**
✅ Page reloads smoothly
✅ NO "Session expired" message appears
✅ Returns to Papers Setup with clean state

**Console Should Show:**
```
[UploadTab] Cleared session expired flags from all storages before reload
[Auth] Skipping session expired notice - deliberate reload marker found
```

**If You See "Session expired":** ❌ Bug - Report immediately!

---

### Test 3: Real Session Expiry (30 seconds)

**Steps:**
1. Open DevTools → Console
2. Force session expiry:
   ```javascript
   localStorage.removeItem('ggk_auth_token');
   window.location.reload();
   ```
3. Observe behavior

**Expected Result:**
✅ Redirected to sign-in page
✅ Blue banner shows: "Session expired - Your session has expired..."
✅ Clear explanation visible

**Console Should Show:**
```
[Auth] Marking session as expired: Your session has expired...
[Auth] Session expired notice found in localStorage
[Auth] Session expired notice consumed: Your session has expired...
[SignIn] Session expired message found, will display to user
```

**If NO Message Shows:** ❌ Bug - Report immediately!

---

### Test 4: Multiple Rapid Reloads (30 seconds)

**Steps:**
1. On Papers Setup page
2. Click "Refresh" button 5 times rapidly (as fast as possible)
3. Watch behavior

**Expected Result:**
✅ Each reload completes successfully
✅ NO "Session expired" message at any point
✅ System remains stable

**If Any Reload Shows "Session expired":** ❌ Bug - Report immediately!

---

## Visual Verification

### What You Should See (Deliberate Reload)

```
┌─────────────────────────────────────────┐
│  Past Papers Import Wizard             │
│                                         │
│  [Upload JSON] [Structure] [Metadata]  │
│                                         │
│  Your Import Session In Progress       │
│  [Continue] [🔄 Refresh] [🗑️ Start New] │
└─────────────────────────────────────────┘

Click Refresh → Page reloads → SAME SCREEN (no error)
```

### What You Should See (Real Session Expiry)

```
┌─────────────────────────────────────────┐
│  Sign In                                │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ ⓘ Session expired                │ │
│  │ Your session has expired. Please │ │
│  │ sign in again to continue.       │ │
│  └───────────────────────────────────┘ │
│                                         │
│  Email: [________________]             │
│  Password: [________________]          │
│  [Sign in]                             │
└─────────────────────────────────────────┘
```

---

## Automated Console Checks

Run this in DevTools console to verify protection is active:

```javascript
// Check for protection markers after clicking Refresh
console.log('Deliberate reload:', localStorage.getItem('ggk_deliberate_reload'));
console.log('Extended grace:', localStorage.getItem('ggk_extended_grace_period'));
console.log('Session expired notice:',
  localStorage.getItem('ggk_session_expired_notice'),
  sessionStorage.getItem('ggk_session_expired_notice')
);

// Should see:
// Deliberate reload: null (cleaned up after detection)
// Extended grace: [recent timestamp]
// Session expired notice: null null (both cleared)
```

---

## Common Issues & Solutions

### Issue 1: Message Still Appears on Refresh

**Symptoms:**
- Click "Refresh" → See "Session expired" message
- Console shows: "[Auth] Session expired notice consumed: ..."

**Debug:**
```javascript
// Check if markers are being set
localStorage.getItem('ggk_deliberate_reload') // Should exist right before reload
localStorage.getItem('ggk_extended_grace_period') // Should exist after reload
```

**Solution:** Check that UploadTab is clearing BOTH storages:
- Line ~283: `sessionStorage.removeItem('ggk_session_expired_notice')`

---

### Issue 2: No Message on Real Expiry

**Symptoms:**
- Real session expires → No message on sign-in page
- Should see message but don't

**Debug:**
```javascript
// Before reload, check if message was stored
localStorage.getItem('ggk_session_expired_notice')
sessionStorage.getItem('ggk_session_expired_notice')
// Both should have the message
```

**Solution:** Verify `markSessionExpired()` is storing to both:
- Lines 264-265 in auth.ts

---

### Issue 3: Stale Markers Interfering

**Symptoms:**
- Real session expiry doesn't trigger message
- Console shows: "[Auth] Skipping session expired mark - extended grace period active"

**Debug:**
```javascript
// Check marker age
const graceTime = parseInt(localStorage.getItem('ggk_extended_grace_period'), 10);
const age = Date.now() - graceTime;
console.log('Grace period age (ms):', age);
// Should be > 10000 (10 seconds) for real expiry to work
```

**Solution:** Time-bounded checks should auto-expire old markers

---

## Storage State Matrix

| Scenario | localStorage notice | sessionStorage notice | extended_grace | Behavior |
|----------|---------------------|----------------------|----------------|----------|
| **Deliberate Reload** | null (cleared) | null (cleared) | timestamp | No message |
| **Real Expiry** | message | message | null or old | Shows message |
| **After Consume** | null | null | timestamp or null | No message |
| **Stale State** | message | message | old timestamp | Shows message |

---

## Performance Check

All operations should be imperceptible to users:

| Operation | Expected Time | Acceptable Max |
|-----------|---------------|----------------|
| Set markers | < 10ms | 50ms |
| Clear storages | < 10ms | 50ms |
| Check markers | < 1ms | 10ms |
| Page reload | Normal | Normal + 200ms |

---

## Browser DevTools Checklist

### Application Tab → Local Storage

**Before Clicking Refresh:**
```
ggk_auth_token: [some token]
ggk_deliberate_reload: (not present yet)
ggk_session_expired_notice: (should be empty)
```

**Right After Clicking Refresh (< 100ms):**
```
ggk_auth_token: [some token]
ggk_deliberate_reload: [timestamp] ← SET
ggk_reload_reason: "refresh_session" ← SET
ggk_session_expired_notice: (empty) ← CLEARED
```

**After Page Reload:**
```
ggk_auth_token: [some token]
ggk_deliberate_reload: (cleaned up)
ggk_extended_grace_period: [timestamp] ← SET
ggk_session_expired_notice: (empty) ← STAYS EMPTY
```

### Application Tab → Session Storage

**Should ALWAYS be empty after deliberate reload:**
```
ggk_session_expired_notice: (empty) ✅
```

---

## Success Criteria

### All Tests Must Pass:

- [ ] Test 1: Refresh button → No message
- [ ] Test 2: Start New Import → No message
- [ ] Test 3: Real expiry → Message appears
- [ ] Test 4: Multiple reloads → No messages

### Console Logs Must Show:

- [ ] "Cleared session expired flags from all storages" (on refresh)
- [ ] "Skipping session expired notice - extended grace period" (after reload)
- [ ] "Session expired notice consumed" (only on real expiry)

### Storage Must Be Clean:

- [ ] Both storages empty after deliberate reload
- [ ] Both storages have message after real expiry
- [ ] Extended grace period active after deliberate reload

---

## Quick Regression Test Script

Copy and paste into browser console:

```javascript
// Test storage clearing mechanism
(async function testStorageClear() {
  console.log('=== Testing Storage Clear ===');

  // Set test messages
  localStorage.setItem('ggk_session_expired_notice', 'test message');
  sessionStorage.setItem('ggk_session_expired_notice', 'test message');

  console.log('Before clear:', {
    local: localStorage.getItem('ggk_session_expired_notice'),
    session: sessionStorage.getItem('ggk_session_expired_notice')
  });

  // Simulate UploadTab clearing
  localStorage.removeItem('ggk_session_expired_notice');
  sessionStorage.removeItem('ggk_session_expired_notice');

  console.log('After clear:', {
    local: localStorage.getItem('ggk_session_expired_notice'),
    session: sessionStorage.getItem('ggk_session_expired_notice')
  });

  if (!localStorage.getItem('ggk_session_expired_notice') &&
      !sessionStorage.getItem('ggk_session_expired_notice')) {
    console.log('✅ PASS: Both storages cleared correctly');
  } else {
    console.error('❌ FAIL: Storages not cleared properly');
  }
})();
```

---

## Emergency Rollback

If tests fail and need to rollback:

```bash
# Revert the 3 modified files:
git checkout HEAD -- src/app/system-admin/learning/practice-management/papers-setup/tabs/UploadTab.tsx
git checkout HEAD -- src/lib/auth.ts
git checkout HEAD -- src/lib/sessionManager.ts

# Rebuild
npm run build
```

---

## Contact & Reporting

If any test fails:

1. **Capture console logs** (copy all console output)
2. **Note which test failed** (Test 1, 2, 3, or 4)
3. **Check storage state** (DevTools → Application → Storage)
4. **Report with all above information**

---

## Expected Timeline

- Test 1: 30 seconds
- Test 2: 30 seconds
- Test 3: 30 seconds
- Test 4: 30 seconds
- **Total: 2 minutes**

All tests should pass on first attempt with correct implementation.

---

## Final Verification

**Run all 4 tests in sequence:**

1. ✅ Refresh → No message
2. ✅ Start New Import → No message
3. ✅ Real Expiry → Message shows
4. ✅ Multiple Reloads → No messages

**If all pass:** ✅ **FIX VERIFIED - READY FOR PRODUCTION**

**If any fail:** ❌ **DO NOT DEPLOY - INVESTIGATE IMMEDIATELY**
