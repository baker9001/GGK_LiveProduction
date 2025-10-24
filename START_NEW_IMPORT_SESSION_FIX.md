# Start New Import Session Fix - Session Expiration Issue

## Problem

When users clicked "Start New Import" in the Papers Setup wizard, the system was clearing the import session but causing the user session to expire, forcing them to login again.

**Root Cause**: The `handleDeleteSession` function in `UploadTab.tsx` was calling `window.location.reload()`, which performed a hard browser refresh. This disrupted the authentication session management, causing the session to appear expired upon reload.

## Solution

Replaced the hard page reload with a React state-based refresh that clears all session-related state without disrupting the authentication context.

### Changes Made

#### 1. UploadTab Component (`src/app/system-admin/learning/practice-management/papers-setup/tabs/UploadTab.tsx`)

**Added**:
- New optional prop `onClearSession?: () => void` to allow parent component to clear state
- Modified `handleDeleteSession`:
  - Keeps the database update to mark session as 'failed'
  - Calls `onClearSession()` callback instead of `window.location.reload()`
  - Shows success toast to user
  - No longer forces a full page reload
- Modified `handleRefreshSession`:
  - Attempts to use `onClearSession()` callback first
  - Falls back to `window.location.reload()` only if callback not provided

**Before**:
```typescript
const handleDeleteSession = async () => {
  // ... database update
  window.location.reload(); // ❌ Causes session disruption
};
```

**After**:
```typescript
const handleDeleteSession = async () => {
  // ... database update
  if (onClearSession) {
    onClearSession(); // ✅ React state update, no reload
  }
  toast.success('Session cleared. You can now start a new import.');
};
```

#### 2. Papers Setup Page Component (`src/app/system-admin/learning/practice-management/papers-setup/page.tsx`)

**Added**:
- New `handleClearSession` function that:
  - Resets all import-related state variables
  - Clears import session, uploaded file, parsed data
  - Resets all tab statuses to 'pending'
  - Navigates back to 'upload' tab
  - Clears URL query parameters
  - Uses React Router's `navigate()` instead of page reload
- Passed `onClearSession={handleClearSession}` prop to `UploadTab` component

**Implementation**:
```typescript
const handleClearSession = useCallback(() => {
  // Reset all state to initial values
  setImportSession(null);
  setUploadedFile(null);
  setParsedData(null);
  setError(null);
  setUploadProgress(0);
  setStructureComplete(false);
  setStructureCompleteCalled(false);
  setExistingPaperId(null);
  setSavedPaperDetails(null);
  setStagedAttachments({});

  // Reset tab statuses
  setTabStatuses({
    upload: 'pending',
    structure: 'pending',
    metadata: 'pending',
    questions: 'pending',
  });

  // Navigate to upload tab
  setActiveTab('upload');
  const params = new URLSearchParams(location.search);
  params.delete('session');
  params.set('tab', 'upload');
  navigate({ search: params.toString() }, { replace: true });
}, [location.search, navigate]);
```

## Benefits

### 1. **Session Persistence**
- Authentication session remains active
- No forced logout
- User stays logged in throughout the process

### 2. **Better User Experience**
- Instant UI update (no page reload delay)
- Smooth transition back to upload tab
- Clear success feedback via toast notification
- No disruption to user's workflow

### 3. **Cleaner Architecture**
- Uses React state management properly
- Follows React best practices (avoid page reloads)
- Better separation of concerns
- Parent component controls state lifecycle

### 4. **Consistent Behavior**
- Matches modern SPA (Single Page Application) patterns
- No unexpected browser refreshes
- Predictable state management

## Testing Scenarios

### Test Case 1: Start New Import
1. Begin an import with a JSON file
2. Progress through some steps (structure, metadata)
3. Return to Upload tab
4. Click "Start New Import"
5. Confirm deletion
6. **Expected**: Session cleared, back on upload tab, still logged in
7. **Verify**: No login prompt, toast shows success message

### Test Case 2: Multiple Sessions
1. User A starts import session
2. User B (different browser/tab) starts their own session
3. User A clicks "Start New Import"
4. **Expected**: Only User A's session cleared
5. **Verify**: User B's session unaffected

### Test Case 3: Refresh Button
1. Have an active import session
2. Click "Refresh" button
3. **Expected**: Session data refreshed without logout
4. **Verify**: Still logged in, session data reloaded

## Technical Details

### Why Page Reload Caused Session Issues

1. **Hard Refresh Disrupts Auth Context**: `window.location.reload()` forces browser to reload all JavaScript, including auth context
2. **Session Token Timing**: During reload, session token validation might fail or timeout
3. **Storage Access**: localStorage/sessionStorage reads during reload can be inconsistent
4. **React Context Loss**: All React context (including UserContext, PermissionContext) is destroyed and must be rebuilt

### How React State Update Solves It

1. **No Browser Reload**: JavaScript context stays intact
2. **Auth Preserved**: User context remains in memory
3. **Instant Update**: React re-renders affected components
4. **Predictable Flow**: State changes follow React lifecycle

## Related Files Modified

```
src/app/system-admin/learning/practice-management/papers-setup/tabs/UploadTab.tsx
src/app/system-admin/learning/practice-management/papers-setup/page.tsx
```

## Database Changes

None required. The existing database schema supports this fix.

## Migration Notes

- **Backward Compatible**: Works with existing import sessions
- **No Breaking Changes**: All existing functionality preserved
- **Safe to Deploy**: No database migrations needed

## Build Verification

✅ Build completed successfully
✅ No TypeScript errors
✅ No runtime warnings
✅ All imports resolved correctly

## Summary

This fix eliminates the session expiration issue by replacing disruptive page reloads with proper React state management. Users can now clear their import sessions and start fresh without being forced to log in again, providing a seamless and frustration-free experience.
