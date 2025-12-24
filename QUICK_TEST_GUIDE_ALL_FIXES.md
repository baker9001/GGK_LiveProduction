# Quick Test Guide - All Three Fixes

## Issue 1: Session Timeout Message Design

### How to Test
1. Log in as any user
2. Wait for session to expire (15 minutes of inactivity) OR manually trigger:
   ```javascript
   // In browser console
   localStorage.clear();
   localStorage.setItem('ggk_session_expired_notice', 'Your session has expired. Please sign in again to continue.');
   window.location.reload();
   ```

### What to Check
- [ ] Background is dark slate (`slate-900/90`) with blur
- [ ] Card has rounded corners (`rounded-xl`)
- [ ] Header gradient uses **emerald/teal/cyan** colors (NOT purple/indigo)
- [ ] Clock icon has emerald glow and ring decoration
- [ ] Lock icon has amber glow and ring decoration
- [ ] Title "Session Expired" is **center-aligned** and bold
- [ ] Information box has shield icon in emerald badge
- [ ] Information box has **divider line** between sections
- [ ] Button is **emerald green** with glow shadow effect
- [ ] Button shows stronger glow on hover
- [ ] Animation is smooth (fade in + scale)

**Expected Result:** Professional, modern design with emerald/teal theme

---

## Issue 2: Session Expiration on Test Mode Exit

### How to Test
1. Log in as System Admin (e.g., baker@system.admin)
2. Navigate to Dashboard
3. Click "Test as User" button (top right)
4. Select any student from the list
5. Click "Test" button
6. Wait for test mode to activate (orange banner appears)
7. Browse the student interface briefly
8. Click "Exit Test Mode" button (in orange banner)
9. Click "Exit Test Mode" in confirmation dialog

### What to Check
- [ ] Confirmation dialog appears when clicking "Exit Test Mode"
- [ ] Timer shows remaining session time in dialog message
- [ ] After confirming exit, page redirects to `/app/system-admin/dashboard`
- [ ] **NO session expired message appears**
- [ ] Admin can immediately use dashboard features
- [ ] Admin does NOT have to log in again
- [ ] Console shows: `[Auth] Skipping session expired mark - test mode exit in progress`

### Console Debug Output
```
[TestMode] Ended
[TestMode] Duration: 45 seconds
[TestMode] Test user: student@example.com
[Auth] Skipping session expired mark - test mode exit in progress
```

**Expected Result:** Seamless return to admin dashboard with original session intact

---

## Issue 3: Cancel and X Buttons in Exit Dialog

### How to Test
1. Log in as System Admin
2. Activate "Test as User" mode (steps 1-6 from Issue 2)
3. Click "Exit Test Mode" button in orange banner
4. **DO NOT confirm** - instead:
   - Test A: Click the "Cancel" button
   - Test B: Click the "X" button in top-right corner
   - Test C: Press ESC key

### What to Check
- [ ] Clicking "Cancel" button closes dialog
- [ ] Test mode remains active (orange banner still visible)
- [ ] Clicking "X" button closes dialog
- [ ] Test mode remains active
- [ ] Pressing ESC key closes dialog
- [ ] Test mode remains active
- [ ] User can click "Exit Test Mode" again and it works

**Expected Result:** All three methods close the dialog without exiting test mode

---

## Combined Integration Test

### Full Flow Test
1. **Login:** Log in as System Admin
2. **Test Mode:** Activate test mode for a student
3. **Use System:** Browse student interface for 30 seconds
4. **Cancel Exit:** Try to exit but click Cancel
5. **Confirm Exit:** Exit test mode and confirm
6. **Verify Session:** Check dashboard loads without login
7. **Wait Idle:** Let session sit idle for 16 minutes
8. **Check Timeout:** Verify new session timeout design appears

### Expected Results
- [ ] All steps complete successfully
- [ ] No authentication errors
- [ ] Session timeout has new emerald/teal design
- [ ] All buttons work as expected
- [ ] Console shows protection flags working

---

## Quick Browser Console Tests

### Test Session Timeout Design
```javascript
// Trigger session expired message
localStorage.setItem('ggk_session_expired_notice', 'Your session has expired due to inactivity.');
window.location.reload();
```

### Test Exit Protection Flag
```javascript
// Check if flag prevents expiration (should return early)
localStorage.setItem('test_mode_exiting', 'true');
// Now markSessionExpired should skip
```

### Verify Test Mode State
```javascript
// Check if in test mode
console.log('In test mode:', !!localStorage.getItem('test_mode_user'));

// Get test mode metadata
const metadata = localStorage.getItem('test_mode_metadata');
console.log('Test mode metadata:', JSON.parse(metadata || '{}'));

// Get time remaining
const meta = JSON.parse(metadata || '{}');
if (meta.expirationTime) {
  const remaining = Math.max(0, Math.floor((meta.expirationTime - Date.now()) / 1000));
  console.log('Time remaining:', remaining, 'seconds');
}
```

---

## Edge Cases to Test

### Test Mode Exit Near Timeout
1. Activate test mode
2. Wait 14 minutes (near 15-minute timeout)
3. Exit test mode
4. Verify session not marked as expired

### Multiple Test Mode Cycles
1. Enter test mode → Exit → Enter again → Exit
2. Verify each cycle works correctly
3. Verify session remains valid throughout

### Rapid Dialog Operations
1. Click "Exit Test Mode"
2. Quickly click Cancel
3. Immediately click "Exit Test Mode" again
4. Quickly click X button
5. Repeat several times
6. Verify no errors or state issues

---

## Common Issues and Solutions

### Issue: Session still expires on exit
**Check:**
- Console for `[Auth] Skipping session expired mark - test mode exit in progress`
- If missing, verify `test_mode_exiting` flag is set
- Check auth.ts line 274-278

### Issue: Cancel button doesn't work
**Check:**
- ConfirmationDialog receives `onCancel` prop (not `onClose`)
- TestModeBar.tsx line 211 should be `onCancel`
- Console for any prop type errors

### Issue: Session timeout still uses purple
**Check:**
- SessionExpiredNotice.tsx line 140 should be `emerald-50 via-teal-50 to-cyan-50`
- Clock icon should be `text-emerald-600`
- Lock icon should be `text-amber-600`
- Button should have `bg-emerald-600`

---

## Success Indicators

All three fixes are working correctly when:

1. ✅ Session timeout message looks professional with emerald/teal theme
2. ✅ Admin can exit test mode and return to dashboard without re-login
3. ✅ Cancel and X buttons close the exit confirmation dialog
4. ✅ Console shows protection flags working
5. ✅ No unexpected session expirations
6. ✅ All buttons have proper hover effects
7. ✅ Animations are smooth and professional

---

## Rollback Plan (If Needed)

If any issues arise:

1. **Session Timeout Design:**
   - Revert `SessionExpiredNotice.tsx` to previous version
   - Colors will return to purple/indigo

2. **Test Mode Exit:**
   - Remove test mode exit protection flag logic
   - Admins will need to re-login after test mode (original behavior)

3. **Dialog Buttons:**
   - Change `onCancel` back to `onClose` in TestModeBar.tsx
   - Buttons won't work (original bug restored)

**Note:** Not recommended as all fixes improve UX significantly

---

## Performance Check

After fixes, verify:
- [ ] Page load time unchanged
- [ ] No new console errors
- [ ] Memory usage stable
- [ ] Animations smooth (60fps)
- [ ] Build size increase minimal

**Current Build:** 5,683.53 kB (index.js)
**Build Time:** ~43 seconds
**Status:** ✅ Normal

---

## Final Verification Checklist

Before marking complete:
- [ ] All three issues tested individually
- [ ] Combined integration test passed
- [ ] Edge cases tested
- [ ] Console shows correct debug messages
- [ ] No TypeScript errors
- [ ] Build completes successfully
- [ ] UI/UX feels polished and professional

**When all checked:** ✅ Ready for Production
