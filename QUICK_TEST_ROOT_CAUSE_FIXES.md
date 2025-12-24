# Quick Test Guide - Root Cause Fixes

## 🔴 CRITICAL: Test These First

### Test 1: Dialog Buttons Work (Z-Index Fix)

**Steps:**
1. Login as admin → Test as User → Select student → Click Test
2. In test mode, click "Exit Test Mode" button
3. **Try ALL close methods:**
   - Click "Cancel" button
   - Click "X" button
   - Click outside dialog (backdrop)
   - Press ESC key

**Expected:** All 4 methods close the dialog without exiting test mode

**If it fails:** Dialog is still covered by orange banner (z-index issue not fixed)

---

### Test 2: No Session Expired After Exit (Flag Persistence Fix)

**Steps:**
1. Login as admin → Test as User → Browse student interface
2. Click "Exit Test Mode" → Confirm
3. **Watch for:**
   - Redirects to `/app/system-admin/dashboard`
   - **NO session expired message**
   - Can immediately use dashboard

**Expected:** Smooth return to dashboard, no login required

**If it fails:** Still seeing session expired = flag cleanup timing issue

---

## Console Debug Checks

### What You Should See

```
[TestMode] Ended
[TestMode] Duration: 45 seconds
[TestMode] Test user: student@example.com
[Auth] Skipping session expired mark - test mode exit in progress
[App] Initializing session management system on protected page
[TestMode] Cleaning up exit flag after successful navigation
```

### What You Should NOT See

```
❌ [Auth] Marking session expired
❌ [Supabase] Auth error...
❌ Your session has expired
```

---

## Browser DevTools Check

### Before Exiting Test Mode
```javascript
localStorage.getItem('test_mode_exiting')
// Should be: null
```

### Immediately After Clicking "Exit Test Mode"
```javascript
localStorage.getItem('test_mode_exiting')
// Should be: "true"

localStorage.getItem('test_mode_exit_timestamp')
// Should be: "1735059600000" (timestamp)
```

### After Dashboard Loads
```javascript
localStorage.getItem('test_mode_exiting')
// Should be: null (cleaned up)

localStorage.getItem('test_mode_exit_timestamp')
// Should be: null (cleaned up)
```

---

## Z-Index Visual Check

**How to verify z-index fix:**

1. Activate test mode (orange banner appears)
2. Click "Exit Test Mode"
3. **Visually confirm:**
   - Dialog appears ABOVE orange banner ✅
   - Can see Cancel and Exit buttons clearly ✅
   - Clicking Cancel works ✅

**If dialog is behind banner:**
- Z-index fix didn't apply
- Check ConfirmationDialog.tsx line 88
- Should be `z-[10000]` not `z-50`

---

## Edge Case Tests

### Rapid Clicks
1. Click "Exit Test Mode"
2. Rapidly click Cancel → Exit → Cancel → Exit
3. Verify no crashes or stuck states

### Multiple Cycles
1. Test Mode → Exit → Test Mode → Exit → Test Mode → Exit
2. Verify each cycle works correctly
3. No session expiration after any exit

### Stale Flags
```javascript
// Manually set old flag
localStorage.setItem('test_mode_exiting', 'true');
localStorage.setItem('test_mode_exit_timestamp', (Date.now() - 20000).toString());

// Reload page
location.reload();

// Check console - should see "Clearing stale exit flag"
```

---

## Troubleshooting

### Issue: Cancel button still doesn't work

**Check:**
1. Open DevTools → Elements
2. Find the ConfirmationDialog div
3. Check if `z-index: 10000` is applied
4. If not, clear browser cache and reload

### Issue: Session still expires

**Check Console For:**
- `[Auth] Skipping session expired mark` ← Should see this
- `[TestMode] Cleaning up exit flag` ← Should see this

**Check localStorage:**
```javascript
// During redirect, flag should exist
localStorage.getItem('test_mode_exiting') === 'true'
```

**If flag is null during redirect:**
- Timing issue, check auth.ts exitTestMode function
- Ensure flag removal is NOT in setTimeout

### Issue: Flag not cleaned up

**Symptoms:**
- Flag still present after 5 minutes
- Multiple entries in localStorage

**Fix:**
```javascript
// Manually cleanup
localStorage.removeItem('test_mode_exiting');
localStorage.removeItem('test_mode_exit_timestamp');
```

**Root cause:** App.tsx cleanup not running, check useEffect

---

## Success Checklist

All must pass:

- [ ] Cancel button closes dialog
- [ ] X button closes dialog
- [ ] ESC key closes dialog
- [ ] Backdrop click closes dialog
- [ ] Exit returns to dashboard
- [ ] No session expired message
- [ ] No re-login required
- [ ] Console shows cleanup message
- [ ] Flags are removed after navigation
- [ ] Works on multiple cycles

**When all checked:** ✅ Root cause fixes working correctly

---

## Quick Manual Test Script

Copy and run in browser console:

```javascript
// Test flag lifecycle
console.log('=== Flag Lifecycle Test ===');

// Check initial state
console.log('Initial flag:', localStorage.getItem('test_mode_exiting'));

// Simulate exit (don't actually run, just for reference)
console.log('\nWhen you click Exit Test Mode, watch for:');
console.log('1. Flag should be "true"');
console.log('2. Timestamp should be set');
console.log('3. After redirect, both should be null');

// Check z-index
const dialog = document.querySelector('[class*="z-[10000]"]');
console.log('\nDialog z-index check:', dialog ? 'Found z-10000 ✅' : 'Not found ❌');

console.log('\n=== Test Complete ===');
```

---

## Common Mistakes to Avoid

1. ❌ Don't test in incognito mode (localStorage issues)
2. ❌ Don't skip cache clearing between tests
3. ❌ Don't test with stale code (rebuild first)
4. ❌ Don't click too fast (give 1 second between actions)
5. ❌ Don't test on public pages (session logic doesn't run)

---

## When to Report Issues

Report if:
- Dialog buttons don't work after clicking 3 times
- Session expires more than once after exit
- Console shows error messages
- Flags remain after 30 seconds post-exit
- Any TypeScript errors in console

Don't report if:
- First click sometimes doesn't register (network delay)
- Console shows warnings (not errors)
- Build takes long time (normal)

---

**Last Updated:** December 24, 2025
**Test on:** Latest build after root cause fixes
**Expected Duration:** 5 minutes for full test
