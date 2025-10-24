# Critical Bug: Session Expired Notice on Landing Page - Full Diagnosis

## Bug Report
**Issue:** Session expired notice appears on the landing page for users who have never logged in.
**Severity:** CRITICAL
**Impact:** Poor user experience, confusing messaging, potential loss of new users

## Root Cause Analysis

### Problem 1: Session Manager Runs on ALL Pages (Including Public Pages)

**Location:** `src/App.tsx` lines 130-156

The session manager is initialized in the App component's `useEffect` without any authentication check:

```typescript
React.useEffect(() => {
  console.log('[App] Initializing session management system');
  initializeSessionManager(); // ❌ RUNS ON ALL PAGES

  // ...event handlers...

  return () => {
    cleanupSessionManager();
  };
}, []);
```

**Issue:** The session manager starts monitoring immediately, even on public pages where no session should exist.

### Problem 2: Session Monitoring Checks for Expired Sessions Too Aggressively

**Location:** `src/lib/sessionManager.ts` lines 296-349

```typescript
function checkSessionStatus(): void {
  if (isRedirecting) return;

  const currentPath = window.location.pathname;
  if (isPublicPage(currentPath)) return; // ✅ This check exists BUT...

  const user = getAuthenticatedUser();
  if (!user) {
    handleSessionExpired('...'); // ❌ TRIGGERS EVEN ON PUBLIC PAGES
    return;
  }
  // ...
}
```

**Issue:** While `isPublicPage()` check exists, there's a timing issue. The session check runs every 30 seconds, and if a user hasn't logged in yet, `getAuthenticatedUser()` returns null, triggering the expiration handler.

### Problem 3: SessionExpiredNotice Component Reads from localStorage on Mount

**Location:** `src/components/shared/SessionExpiredNotice.tsx` lines 28-34

```typescript
useEffect(() => {
  // ...event listener setup...

  if (typeof window !== 'undefined') {
    const storedMessage = consumeSessionExpiredNotice(); // ❌ READS STALE DATA
    if (storedMessage) {
      setMessage(storedMessage);
      setIsVisible(true); // Shows notice even on landing page
    }
  }
}, []);
```

**Issue:** The component checks localStorage for a stored session expiration message on mount. If the user previously had a session expire and didn't clear localStorage (e.g., closed the browser), this stale message will show on the landing page on next visit.

### Problem 4: No Path Check in SessionExpiredNotice Component

**Location:** `src/components/shared/SessionExpiredNotice.tsx` lines 13-42

The component only checks if the current path is `/signin` before showing the notice from events:

```typescript
const handleSessionExpired = (event: Event) => {
  if (typeof window !== 'undefined') {
    const path = window.location.pathname;
    if (path === '/signin' || path.startsWith('/signin')) {
      return; // ✅ Good
    }
  }
  // Show notice
};
```

But the initial localStorage check (lines 30-34) has NO path validation at all.

### Problem 5: Session Manager Doesn't Respect Public Page Status Initially

**Location:** `src/lib/sessionManager.ts` lines 61-110

When the session manager initializes:
1. It sets up activity tracking immediately
2. It starts session monitoring immediately
3. The first check runs after 30 seconds

During this window, if there's stale localStorage data from a previous session, it can trigger false positives.

## Why This Happens

### User Journey That Triggers the Bug:

1. User logs in → Session created → User works in app
2. Session expires naturally (24 hours pass)
3. Session expiration notice is stored in localStorage: `ggk_session_expired_notice`
4. User closes browser WITHOUT clicking "Go to sign in"
5. User returns to the landing page later
6. SessionExpiredNotice component mounts
7. Component reads stale data from localStorage
8. **BUG: Session expired notice shows on landing page**

### Additional Trigger:

1. User visits landing page (never logged in)
2. App.tsx mounts → Session manager initializes
3. Session manager starts checking every 30 seconds
4. First check: `getAuthenticatedUser()` returns null
5. Session manager calls `handleSessionExpired()`
6. Notice is stored in localStorage
7. **BUG: Session expired notice shows immediately**

## Impact Analysis

### User Experience Impact: HIGH
- New visitors see confusing "session expired" message
- Landing page becomes unusable
- Trust in application is damaged
- Conversion rate likely decreases

### Technical Impact: MEDIUM
- Session management system firing on wrong pages
- localStorage pollution with stale data
- Unnecessary event listeners on public pages

### Security Impact: LOW
- No actual security vulnerability
- False positive, not false negative

## Recommended Fixes (Priority Order)

### Fix 1: CRITICAL - Add Public Page Check to SessionExpiredNotice Component

Prevent the notice from showing on public pages entirely:

```typescript
// In SessionExpiredNotice.tsx useEffect
useEffect(() => {
  // ✅ Check if we're on a public page FIRST
  const isPublic = isPublicPage(window.location.pathname);
  if (isPublic) {
    // Clear any stale data
    consumeSessionExpiredNotice();
    return;
  }

  // Rest of the logic...
}, []);
```

### Fix 2: CRITICAL - Conditional Session Manager Initialization

Only initialize session manager when user is authenticated:

```typescript
// In App.tsx
React.useEffect(() => {
  const user = getCurrentUser();
  const currentPath = window.location.pathname;
  const isPublic = isPublicPage(currentPath);

  // ✅ Only initialize if user exists OR on protected pages
  if (user || !isPublic) {
    initializeSessionManager();
  }

  return () => {
    if (user || !isPublic) {
      cleanupSessionManager();
    }
  };
}, []);
```

### Fix 3: HIGH - Enhanced Public Page Detection

Add helper function to SessionExpiredNotice:

```typescript
function isPublicPage(path: string): boolean {
  const publicPaths = [
    '/',
    '/landing',
    '/signin',
    '/login',
    '/forgot-password',
    '/reset-password',
    '/about',
    '/contact',
    '/subjects',
    '/resources',
    '/pricing',
    '/privacy',
    '/terms',
    '/cookies'
  ];

  return publicPaths.some(publicPath =>
    path === publicPath || (publicPath !== '/' && path.startsWith(publicPath + '/'))
  );
}
```

### Fix 4: MEDIUM - Clear Stale Data on Public Pages

Add cleanup logic in App.tsx for public pages:

```typescript
React.useEffect(() => {
  const currentPath = window.location.pathname;
  if (isPublicPage(currentPath)) {
    // Clear any stale session data
    clearSessionExpiredNotice();
  }
}, []);
```

### Fix 5: LOW - Add Expiration Timestamp to Session Expired Notice

Store timestamp with notice to auto-expire stale messages:

```typescript
export function markSessionExpired(message: string): void {
  const data = {
    message,
    timestamp: Date.now()
  };
  localStorage.setItem(SESSION_EXPIRED_NOTICE_KEY, JSON.stringify(data));
}

export function consumeSessionExpiredNotice(): string | null {
  const stored = localStorage.getItem(SESSION_EXPIRED_NOTICE_KEY);
  if (!stored) return null;

  try {
    const data = JSON.parse(stored);
    const age = Date.now() - (data.timestamp || 0);

    // Ignore notices older than 1 hour
    if (age > 3600000) {
      localStorage.removeItem(SESSION_EXPIRED_NOTICE_KEY);
      return null;
    }

    localStorage.removeItem(SESSION_EXPIRED_NOTICE_KEY);
    return data.message;
  } catch {
    localStorage.removeItem(SESSION_EXPIRED_NOTICE_KEY);
    return null;
  }
}
```

## Testing Checklist

After implementing fixes, test these scenarios:

- [ ] Fresh visit to landing page (never logged in) - NO notice should appear
- [ ] Login → Logout → Return to landing page - NO notice should appear
- [ ] Login → Session expires → Close browser → Reopen landing page - NO notice should appear
- [ ] Login → Session expires → Stay on protected page - Notice SHOULD appear
- [ ] Login → Session expires → Navigate to landing page - NO notice should appear
- [ ] Login → Session expires → Click "Go to sign in" → Notice clears properly
- [ ] Multiple tabs: Session expires in one tab → Landing page in another tab - NO notice

## Implementation Priority

1. **IMMEDIATE (Fix 1)**: Add public page check to SessionExpiredNotice component
2. **IMMEDIATE (Fix 3)**: Add isPublicPage helper to SessionExpiredNotice
3. **HIGH (Fix 2)**: Conditional session manager initialization
4. **HIGH (Fix 4)**: Clear stale data on public pages
5. **OPTIONAL (Fix 5)**: Add expiration timestamp (nice to have)

## Best Practices Going Forward

1. **Always check page context** before showing authentication-related UI
2. **Clean up localStorage** when navigating to public pages
3. **Add timestamps** to stored data for auto-expiration
4. **Test edge cases** like browser close without acknowledgment
5. **Separate public and protected logic** more clearly
6. **Consider session scope** - don't track sessions on public pages

---

**Diagnosed by:** Senior Full-Stack Developer & QA Expert
**Date:** October 21, 2025
**Status:** Ready for Implementation
