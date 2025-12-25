# Session Timeout Implementation Plan

**Version:** 1.0
**Date:** December 25, 2025
**Status:** Pending Approval

---

## 📋 Executive Summary

This plan addresses session timeout improvements in three phases:
1. **Phase 1:** Fix critical bugs and configuration issues
2. **Phase 2:** Implement minimal notification system
3. **Phase 3:** Add user session preferences in profile

**Estimated Total Effort:** 2-3 days
**Risk Level:** Low-Medium (most changes are additive)

---

## 🎯 Goals

1. ✅ **Eliminate false session expiration warnings** for active users
2. ✅ **Minimize user interruptions** - active users should never see warnings
3. ✅ **Add user control** - session preferences in profile settings
4. ✅ **Maintain security** - enforce role-based limits and absolute timeout
5. ✅ **Fix existing bugs** - configuration mismatches and duplicate code

---

## 📊 Current State Summary

### Issues Identified

| # | Issue | Severity | Phase |
|---|-------|----------|-------|
| 1 | AUTO_EXTEND_INTERVAL mismatch (10 vs 15 min) | 🔴 Critical | 1 |
| 2 | Duplicate grace period logic in auth.ts | 🔴 Critical | 1 |
| 3 | Test mode exit flag blocks session indefinitely | 🔴 Critical | 1 |
| 4 | Hardcoded 180s grace period in auth.ts | 🔴 Critical | 1 |
| 5 | Warning shows even when user is active | 🟡 High | 2 |
| 6 | No user control over session duration | 🟡 High | 3 |
| 7 | Grace period stacking allows bypass | 🟡 Medium | 1 |
| 8 | No rate limiting on session extension | 🟡 Medium | 2 |
| 9 | Public paths defined in 4+ files | 🟢 Low | 1 |
| 10 | Warning can be dismissed without re-warning | 🟢 Low | 2 |

---

# Phase 1: Critical Bug Fixes

**Effort:** 4-6 hours
**Risk:** Low

## 1.1 Fix Configuration Mismatch

### File: `src/lib/sessionManager.ts`

**Current (line 33):**
```typescript
const AUTO_EXTEND_INTERVAL = 15 * 60 * 1000; // 15 minutes
```

**Change to:**
```typescript
import { AUTO_EXTEND_INTERVAL_MS } from './sessionConfig';

// Remove local constant, use imported value
// AUTO_EXTEND_INTERVAL_MS = 10 * 60 * 1000 (10 minutes)
```

**Files affected:** `sessionManager.ts`

---

## 1.2 Remove Duplicate Grace Period Logic

### File: `src/lib/auth.ts`

**Current (lines 863-910):** Duplicate `isWithinGracePeriod()` function

**Action:** Remove the local function and use imported version

**Before:**
```typescript
export function isWithinGracePeriod(): boolean {
  // 50+ lines of duplicate logic
}
```

**After:**
```typescript
// Import at top of file (already imported at line 20)
import { isWithinGracePeriod } from './sessionGracePeriod';

// Remove lines 863-910 entirely
// The import at line 20 already provides this function
```

**Files affected:** `auth.ts`

---

## 1.3 Fix Hardcoded Grace Period Values

### File: `src/lib/auth.ts`

**Current (lines 885-887):**
```typescript
if (timeSinceExtendedGrace < 180000) { // HARDCODED 180s
  gracePeriodMs = 180000;
```

**Change to:**
```typescript
import {
  getGracePeriodDuration,
  DELIBERATE_RELOAD_GRACE_PERIOD_MS
} from './sessionConfig';

// Use config value
if (timeSinceExtendedGrace < DELIBERATE_RELOAD_GRACE_PERIOD_MS) {
  gracePeriodMs = DELIBERATE_RELOAD_GRACE_PERIOD_MS; // 90s from config
```

**Files affected:** `auth.ts`

---

## 1.4 Add Test Mode Exit Flag Auto-Cleanup

### File: `src/lib/sessionManager.ts`

**Add to `handleSessionExpired()` function (around line 584):**

```typescript
// BEFORE checking test_mode_exiting flag, validate its age
try {
  const testModeExiting = localStorage.getItem('test_mode_exiting');
  const exitTimestamp = localStorage.getItem('test_mode_exit_timestamp');

  if (testModeExiting && exitTimestamp) {
    const timeSinceExit = Date.now() - parseInt(exitTimestamp, 10);

    // Auto-cleanup stale flag (older than 10 seconds)
    if (timeSinceExit > 10000) {
      console.log('[SessionManager] Cleaning up stale test mode exit flag');
      localStorage.removeItem('test_mode_exiting');
      localStorage.removeItem('test_mode_exit_timestamp');
    } else {
      console.log('[SessionManager] Skipping expiration - test mode exit in progress');
      return;
    }
  }
} catch (error) {
  console.warn('[SessionManager] Error checking test mode exit flag:', error);
}
```

**Files affected:** `sessionManager.ts`

---

## 1.5 Add Grace Period Stacking Prevention

### File: `src/lib/sessionGracePeriod.ts`

**Add new storage key and validation:**

```typescript
// Add to STORAGE_KEYS in sessionConfig.ts
TOTAL_GRACE_TIME: 'ggk_total_grace_time',
GRACE_PERIOD_COUNT: 'ggk_grace_period_count',

// Add constant
export const MAX_TOTAL_GRACE_TIME_MS = 5 * 60 * 1000; // 5 minutes max cumulative
export const MAX_GRACE_PERIODS_PER_SESSION = 10;

// Add to startGracePeriod() function
export function startGracePeriod(reason: GracePeriodReason): void {
  // ... existing code ...

  // NEW: Check cumulative grace time
  const totalGraceTime = parseInt(
    localStorage.getItem(STORAGE_KEYS.TOTAL_GRACE_TIME) || '0',
    10
  );
  const graceCount = parseInt(
    localStorage.getItem(STORAGE_KEYS.GRACE_PERIOD_COUNT) || '0',
    10
  );

  if (totalGraceTime >= MAX_TOTAL_GRACE_TIME_MS) {
    console.warn('[GracePeriod] Maximum cumulative grace time reached - denying new grace period');
    return;
  }

  if (graceCount >= MAX_GRACE_PERIODS_PER_SESSION) {
    console.warn('[GracePeriod] Maximum grace period count reached - denying new grace period');
    return;
  }

  // Update cumulative tracking
  localStorage.setItem(
    STORAGE_KEYS.TOTAL_GRACE_TIME,
    (totalGraceTime + validatedDuration).toString()
  );
  localStorage.setItem(
    STORAGE_KEYS.GRACE_PERIOD_COUNT,
    (graceCount + 1).toString()
  );

  // ... rest of existing code ...
}
```

**Files affected:** `sessionConfig.ts`, `sessionGracePeriod.ts`

---

## 1.6 Centralize Public Paths

### File: `src/lib/sessionConfig.ts`

**Add centralized public paths:**

```typescript
// Add to sessionConfig.ts
export const PUBLIC_PATHS = [
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
  '/cookies',
  '/cambridge-igcse',
  '/cambridge-o-level',
  '/cambridge-a-level',
  '/edexcel-igcse',
  '/edexcel-a-level',
  '/mock-exams',
  '/video-lessons'
] as const;

export function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.some(publicPath =>
    path === publicPath || (publicPath !== '/' && path.startsWith(publicPath + '/'))
  );
}
```

**Update all files to use centralized function:**
- `sessionManager.ts` - replace local `isPublicPage()`
- `auth.ts` - replace local `isPublicPage()`
- `SessionWarningBanner.tsx` - import and use `isPublicPath()`
- `SessionExpiredNotice.tsx` - import and use `isPublicPath()`

**Files affected:** `sessionConfig.ts`, `sessionManager.ts`, `auth.ts`, `SessionWarningBanner.tsx`, `SessionExpiredNotice.tsx`

---

## Phase 1 Checklist

- [ ] 1.1 Fix AUTO_EXTEND_INTERVAL mismatch
- [ ] 1.2 Remove duplicate grace period logic from auth.ts
- [ ] 1.3 Replace hardcoded 180s with config value
- [ ] 1.4 Add test mode exit flag auto-cleanup
- [ ] 1.5 Add grace period stacking prevention
- [ ] 1.6 Centralize public paths definition
- [ ] Run build and verify no TypeScript errors
- [ ] Test session timeout flow manually
- [ ] Commit Phase 1 changes

---

# Phase 2: Minimal Notification System

**Effort:** 4-6 hours
**Risk:** Low

## 2.1 Add Activity-Aware Session Check

### File: `src/lib/sessionManager.ts`

**Update `checkSessionStatus()` function:**

```typescript
function checkSessionStatus(): void {
  // ... existing grace period checks ...

  const remainingMinutes = getEffectiveRemainingMinutes();

  // Check if session is in warning zone
  if (remainingMinutes > 0 && remainingMinutes <= WARNING_THRESHOLD_MINUTES) {

    // NEW: Check if user is currently active
    if (isUserActive()) {
      // User is active - silently extend instead of showing warning
      console.log('[SessionManager] User active in warning zone - silently extending');
      silentExtendSession();
      return;
    }

    // User is INACTIVE - show warning (existing behavior)
    if (!warningShown) {
      showSessionWarning(remainingMinutes);
    }
  }

  // ... rest of existing code ...
}
```

---

## 2.2 Add Silent Session Extension

### File: `src/lib/sessionManager.ts`

**Add new function:**

```typescript
// Rate limiting constant
const MIN_SILENT_EXTEND_INTERVAL = 3 * 60 * 1000; // 3 minutes

/**
 * Silently extend session without any UI notification
 * Used when user is active but session is running low
 */
function silentExtendSession(): void {
  const user = getAuthenticatedUser();
  if (!user) return;

  // Rate limiting - prevent abuse
  const lastExtend = localStorage.getItem(LAST_AUTO_EXTEND_KEY);
  const lastExtendTime = lastExtend ? parseInt(lastExtend, 10) : 0;
  const timeSinceExtend = Date.now() - lastExtendTime;

  if (timeSinceExtend < MIN_SILENT_EXTEND_INTERVAL) {
    console.log('[SessionManager] Silent extend rate limited - skipping');
    return;
  }

  // Extend the session
  setAuthenticatedUser(user);

  // Refresh Supabase token
  void supabase.auth.refreshSession().catch(error => {
    console.warn('[SessionManager] Failed to refresh Supabase session:', error);
  });

  // Update tracking
  const now = Date.now();
  localStorage.setItem(LAST_AUTO_EXTEND_KEY, now.toString());

  // Clear warning state
  warningShown = false;
  localStorage.removeItem(SESSION_WARNING_SHOWN_KEY);

  console.log('[SessionManager] Session silently extended');

  // Dispatch event (for tracking, but components should ignore silent extends)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SESSION_EXTENDED_EVENT, {
      detail: { timestamp: now, auto: true, silent: true }
    }));
  }

  // Broadcast to other tabs
  broadcastMessage({ type: 'extended', timestamp: now, silent: true });
}

// Export for use by other modules
export { silentExtendSession };
```

---

## 2.3 Update Warning Banner to Respect Silent Mode

### File: `src/components/shared/SessionWarningBanner.tsx`

**Update to ignore silent extensions:**

```typescript
useEffect(() => {
  // ... existing code ...

  const handleExtended = (event: Event) => {
    const customEvent = event as CustomEvent<{ silent?: boolean }>;

    // If this was a silent extension, don't change UI state
    if (customEvent.detail?.silent) {
      console.log('[SessionWarningBanner] Ignoring silent extension');
      return;
    }

    setIsVisible(false);
    setIsDismissed(false);
  };

  // ... rest of existing code ...
}, []);
```

---

## 2.4 Add Re-Warning for Dismissed Banners

### File: `src/components/shared/SessionWarningBanner.tsx`

**Update countdown interval logic:**

```typescript
// Update countdown every 10 seconds
const countdownInterval = setInterval(() => {
  if (isVisible || !isDismissed) {
    const current = resolveRemainingMinutes();
    setRemainingMinutes(current);

    // Hide if session was extended or expired
    if (current === 0 || current > 5) {
      setIsVisible(false);
      setIsDismissed(false); // Reset dismissed state
    }
  }

  // NEW: Re-show warning at critical thresholds even if dismissed
  if (isDismissed) {
    const current = resolveRemainingMinutes();

    // Re-warn at 2 minutes and 1 minute regardless of dismissal
    if (current <= 2 && current > 0) {
      console.log('[SessionWarningBanner] Re-showing warning at critical threshold');
      setRemainingMinutes(current);
      setIsVisible(true);
      setIsDismissed(false);
    }
  }
}, 10000);
```

---

## 2.5 Add Subtle Toast Component

### File: `src/components/shared/SubtleSessionToast.tsx` (NEW FILE)

```typescript
import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';

interface ToastEvent {
  message: string;
  duration?: number;
}

export function SubtleSessionToast() {
  const [isVisible, setIsVisible] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleToast = (event: Event) => {
      const customEvent = event as CustomEvent<ToastEvent>;
      const { message: msg, duration = 2000 } = customEvent.detail;

      setMessage(msg);
      setIsVisible(true);

      setTimeout(() => {
        setIsVisible(false);
      }, duration);
    };

    window.addEventListener('show-session-toast', handleToast as EventListener);

    return () => {
      window.removeEventListener('show-session-toast', handleToast as EventListener);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-2 fade-in duration-200">
      <div className="flex items-center gap-2 bg-slate-800 text-white text-sm px-4 py-2 rounded-lg shadow-lg">
        <Check className="h-4 w-4 text-emerald-400" />
        <span>{message}</span>
      </div>
    </div>
  );
}
```

---

## Phase 2 Checklist

- [ ] 2.1 Add activity-aware session check
- [ ] 2.2 Add silent session extension function
- [ ] 2.3 Update warning banner to respect silent mode
- [ ] 2.4 Add re-warning at critical thresholds
- [ ] 2.5 Create subtle toast component
- [ ] Add SubtleSessionToast to App.tsx
- [ ] Test active user scenario (should never see warning)
- [ ] Test inactive user scenario (should see warning)
- [ ] Commit Phase 2 changes

---

# Phase 3: User Session Preferences

**Effort:** 8-12 hours
**Risk:** Medium (new database table, new UI)

## 3.1 Database Migration

### File: `supabase/migrations/XXXXXX_add_user_session_preferences.sql`

```sql
-- Create user session preferences table
CREATE TABLE IF NOT EXISTS user_session_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Session Duration (minutes)
  idle_timeout_minutes INTEGER NOT NULL DEFAULT 60
    CHECK (idle_timeout_minutes >= 15 AND idle_timeout_minutes <= 480),

  -- Remember Me Duration (days)
  remember_me_days INTEGER NOT NULL DEFAULT 30
    CHECK (remember_me_days >= 1 AND remember_me_days <= 30),

  -- Warning Style
  warning_style VARCHAR(20) NOT NULL DEFAULT 'silent'
    CHECK (warning_style IN ('silent', 'toast', 'banner')),

  -- Warning Threshold (minutes before expiry to warn)
  warning_threshold_minutes INTEGER NOT NULL DEFAULT 2
    CHECK (warning_threshold_minutes >= 1 AND warning_threshold_minutes <= 10),

  -- Behavior Settings
  auto_extend_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  extend_on_activity BOOLEAN NOT NULL DEFAULT TRUE,

  -- Notification Settings
  sound_enabled BOOLEAN NOT NULL DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one preference record per user
  UNIQUE(user_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_session_preferences_user_id
  ON user_session_preferences(user_id);

-- Enable RLS
ALTER TABLE user_session_preferences ENABLE ROW LEVEL SECURITY;

-- Users can manage their own preferences
CREATE POLICY "Users can manage own session preferences"
  ON user_session_preferences
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all (for support)
CREATE POLICY "Admins can view all preferences"
  ON user_session_preferences
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('SSA', 'SUPPORT')
    )
  );

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_session_preferences_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_session_preferences_timestamp
  BEFORE UPDATE ON user_session_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_session_preferences_timestamp();
```

---

## 3.2 TypeScript Types

### File: `src/types/session.ts` (NEW FILE)

```typescript
/**
 * User Session Preferences
 */
export interface UserSessionPreferences {
  id: string;
  userId: string;
  idleTimeoutMinutes: number;
  rememberMeDays: number;
  warningStyle: 'silent' | 'toast' | 'banner';
  warningThresholdMinutes: number;
  autoExtendEnabled: boolean;
  extendOnActivity: boolean;
  soundEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Session preset types
 */
export type SessionPreset = 'minimal' | 'balanced' | 'secure' | 'custom';

export const SESSION_PRESETS: Record<SessionPreset, Partial<UserSessionPreferences>> = {
  minimal: {
    idleTimeoutMinutes: 240,
    warningStyle: 'silent',
    autoExtendEnabled: true,
    extendOnActivity: true,
    warningThresholdMinutes: 1,
  },
  balanced: {
    idleTimeoutMinutes: 60,
    warningStyle: 'toast',
    autoExtendEnabled: true,
    extendOnActivity: true,
    warningThresholdMinutes: 3,
  },
  secure: {
    idleTimeoutMinutes: 15,
    warningStyle: 'banner',
    autoExtendEnabled: false,
    extendOnActivity: false,
    warningThresholdMinutes: 5,
  },
  custom: {},
};

/**
 * Role-based security limits
 */
export const ROLE_SESSION_LIMITS: Record<string, {
  maxIdleMinutes: number;
  maxRememberDays: number;
  canDisableAutoExtend: boolean;
}> = {
  SSA: { maxIdleMinutes: 240, maxRememberDays: 7, canDisableAutoExtend: false },
  SUPPORT: { maxIdleMinutes: 240, maxRememberDays: 14, canDisableAutoExtend: false },
  VIEWER: { maxIdleMinutes: 480, maxRememberDays: 30, canDisableAutoExtend: true },
  ENTITY_ADMIN: { maxIdleMinutes: 480, maxRememberDays: 30, canDisableAutoExtend: true },
  TEACHER: { maxIdleMinutes: 480, maxRememberDays: 30, canDisableAutoExtend: true },
  STUDENT: { maxIdleMinutes: 480, maxRememberDays: 30, canDisableAutoExtend: true },
};

/**
 * Default preferences
 */
export const DEFAULT_SESSION_PREFERENCES: UserSessionPreferences = {
  id: '',
  userId: '',
  idleTimeoutMinutes: 60,
  rememberMeDays: 30,
  warningStyle: 'silent',
  warningThresholdMinutes: 2,
  autoExtendEnabled: true,
  extendOnActivity: true,
  soundEnabled: false,
  createdAt: '',
  updatedAt: '',
};
```

---

## 3.3 Session Preferences Service

### File: `src/services/sessionPreferencesService.ts` (NEW FILE)

```typescript
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import {
  UserSessionPreferences,
  ROLE_SESSION_LIMITS,
  DEFAULT_SESSION_PREFERENCES,
  SessionPreset,
  SESSION_PRESETS,
} from '@/types/session';

// In-memory cache
let cachedPreferences: UserSessionPreferences | null = null;
let cacheExpiry = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get user's session preferences with caching
 */
export async function getUserSessionPreferences(): Promise<UserSessionPreferences> {
  const user = getCurrentUser();
  if (!user) {
    return DEFAULT_SESSION_PREFERENCES;
  }

  // Check cache
  if (cachedPreferences && Date.now() < cacheExpiry) {
    return cachedPreferences;
  }

  try {
    const { data, error } = await supabase
      .from('user_session_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error || !data) {
      // No preferences yet - return defaults
      return applyRoleLimits(DEFAULT_SESSION_PREFERENCES, user.role);
    }

    const preferences = applyRoleLimits(mapDbToPreferences(data), user.role);

    // Update cache
    cachedPreferences = preferences;
    cacheExpiry = Date.now() + CACHE_DURATION;

    return preferences;
  } catch (error) {
    console.error('[SessionPreferences] Error loading:', error);
    return DEFAULT_SESSION_PREFERENCES;
  }
}

/**
 * Update user's session preferences
 */
export async function updateSessionPreferences(
  updates: Partial<UserSessionPreferences>
): Promise<{ success: boolean; error?: string }> {
  const user = getCurrentUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Apply role-based limits
  const roleLimits = ROLE_SESSION_LIMITS[user.role] || ROLE_SESSION_LIMITS.STUDENT;

  const validated = { ...updates };

  if (validated.idleTimeoutMinutes !== undefined) {
    validated.idleTimeoutMinutes = Math.min(
      Math.max(15, validated.idleTimeoutMinutes),
      roleLimits.maxIdleMinutes
    );
  }

  if (validated.rememberMeDays !== undefined) {
    validated.rememberMeDays = Math.min(
      Math.max(1, validated.rememberMeDays),
      roleLimits.maxRememberDays
    );
  }

  if (validated.autoExtendEnabled === false && !roleLimits.canDisableAutoExtend) {
    return { success: false, error: 'Your role requires auto-extend to remain enabled for security' };
  }

  try {
    const { error } = await supabase
      .from('user_session_preferences')
      .upsert({
        user_id: user.id,
        idle_timeout_minutes: validated.idleTimeoutMinutes,
        remember_me_days: validated.rememberMeDays,
        warning_style: validated.warningStyle,
        warning_threshold_minutes: validated.warningThresholdMinutes,
        auto_extend_enabled: validated.autoExtendEnabled,
        extend_on_activity: validated.extendOnActivity,
        sound_enabled: validated.soundEnabled,
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;

    // Clear cache to force reload
    cachedPreferences = null;

    return { success: true };
  } catch (error) {
    console.error('[SessionPreferences] Error updating:', error);
    return { success: false, error: 'Failed to save preferences' };
  }
}

/**
 * Apply a preset configuration
 */
export async function applyPreset(preset: SessionPreset): Promise<{ success: boolean; error?: string }> {
  if (preset === 'custom') {
    return { success: true }; // No changes for custom
  }

  const presetValues = SESSION_PRESETS[preset];
  return updateSessionPreferences(presetValues as Partial<UserSessionPreferences>);
}

/**
 * Clear preferences cache (call on logout)
 */
export function clearPreferencesCache(): void {
  cachedPreferences = null;
  cacheExpiry = 0;
}

// Helper functions
function mapDbToPreferences(data: any): UserSessionPreferences {
  return {
    id: data.id,
    userId: data.user_id,
    idleTimeoutMinutes: data.idle_timeout_minutes,
    rememberMeDays: data.remember_me_days,
    warningStyle: data.warning_style,
    warningThresholdMinutes: data.warning_threshold_minutes,
    autoExtendEnabled: data.auto_extend_enabled,
    extendOnActivity: data.extend_on_activity,
    soundEnabled: data.sound_enabled,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

function applyRoleLimits(
  preferences: UserSessionPreferences,
  role: string
): UserSessionPreferences {
  const limits = ROLE_SESSION_LIMITS[role] || ROLE_SESSION_LIMITS.STUDENT;

  return {
    ...preferences,
    idleTimeoutMinutes: Math.min(preferences.idleTimeoutMinutes, limits.maxIdleMinutes),
    rememberMeDays: Math.min(preferences.rememberMeDays, limits.maxRememberDays),
    autoExtendEnabled: limits.canDisableAutoExtend ? preferences.autoExtendEnabled : true,
  };
}
```

---

## 3.4 Session Preferences UI Component

### File: `src/components/shared/SessionPreferencesCard.tsx` (NEW FILE)

```typescript
import React, { useState, useEffect } from 'react';
import { Clock, Bell, Shield, Check, Loader2 } from 'lucide-react';
import { Button } from './Button';
import {
  getUserSessionPreferences,
  updateSessionPreferences,
  applyPreset,
} from '@/services/sessionPreferencesService';
import {
  UserSessionPreferences,
  SessionPreset,
  SESSION_PRESETS,
  ROLE_SESSION_LIMITS,
} from '@/types/session';
import { getCurrentUser } from '@/lib/auth';

const DURATION_OPTIONS = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 240, label: '4 hours' },
  { value: 480, label: '8 hours' },
];

const WARNING_STYLES = [
  {
    value: 'silent' as const,
    label: 'Silent (Recommended)',
    description: 'Automatically extends your session while active. No interruptions.',
  },
  {
    value: 'toast' as const,
    label: 'Subtle Toast',
    description: 'Shows a small notification when session is extended.',
  },
  {
    value: 'banner' as const,
    label: 'Warning Banner',
    description: 'Shows a prominent warning before session expires.',
  },
];

const PRESETS: { key: SessionPreset; label: string; description: string }[] = [
  { key: 'minimal', label: 'Minimal', description: '4 hours, silent' },
  { key: 'balanced', label: 'Balanced', description: '1 hour, toast' },
  { key: 'secure', label: 'Secure', description: '15 min, banner' },
];

export function SessionPreferencesCard() {
  const [preferences, setPreferences] = useState<UserSessionPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const user = getCurrentUser();
  const roleLimits = user ? ROLE_SESSION_LIMITS[user.role] : ROLE_SESSION_LIMITS.STUDENT;

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    setLoading(true);
    const prefs = await getUserSessionPreferences();
    setPreferences(prefs);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!preferences) return;

    setSaving(true);
    setMessage(null);

    const result = await updateSessionPreferences(preferences);

    if (result.success) {
      setMessage({ type: 'success', text: 'Preferences saved successfully' });
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to save' });
    }

    setSaving(false);

    // Clear message after 3 seconds
    setTimeout(() => setMessage(null), 3000);
  };

  const handlePresetClick = async (preset: SessionPreset) => {
    const presetValues = SESSION_PRESETS[preset];
    setPreferences(prev => prev ? { ...prev, ...presetValues } : null);
  };

  if (loading || !preferences) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
            <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Session & Security Settings
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Control how your session behaves and when you receive notifications
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Quick Presets */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
            Quick Presets
          </label>
          <div className="flex gap-3">
            {PRESETS.map(preset => (
              <button
                key={preset.key}
                onClick={() => handlePresetClick(preset.key)}
                className="flex-1 p-3 rounded-lg border border-slate-200 dark:border-slate-600
                           hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20
                           transition-colors text-left"
              >
                <div className="font-medium text-slate-900 dark:text-white">{preset.label}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{preset.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Session Duration */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            <Clock className="h-4 w-4 inline mr-2" />
            Session Duration
          </label>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            How long before you're logged out due to inactivity
            {roleLimits.maxIdleMinutes < 480 && (
              <span className="text-amber-600 dark:text-amber-400">
                {' '}(Max {roleLimits.maxIdleMinutes / 60} hours for your role)
              </span>
            )}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {DURATION_OPTIONS.filter(opt => opt.value <= roleLimits.maxIdleMinutes).map(option => (
              <button
                key={option.value}
                onClick={() => setPreferences(prev => prev ? { ...prev, idleTimeoutMinutes: option.value } : null)}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors
                  ${preferences.idleTimeoutMinutes === option.value
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Warning Style */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            <Bell className="h-4 w-4 inline mr-2" />
            Session Notifications
          </label>
          <div className="space-y-2">
            {WARNING_STYLES.map(style => (
              <label
                key={style.value}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                  ${preferences.warningStyle === style.value
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                    : 'border-slate-200 dark:border-slate-600 hover:border-slate-300'
                  }`}
              >
                <input
                  type="radio"
                  name="warningStyle"
                  value={style.value}
                  checked={preferences.warningStyle === style.value}
                  onChange={() => setPreferences(prev => prev ? { ...prev, warningStyle: style.value } : null)}
                  className="mt-1 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="font-medium text-slate-900 dark:text-white">{style.label}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">{style.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Auto-Extend Toggle */}
        {roleLimits.canDisableAutoExtend && (
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <div>
              <div className="font-medium text-slate-900 dark:text-white">Auto-extend session</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Automatically extend your session while you're active
              </div>
            </div>
            <button
              onClick={() => setPreferences(prev => prev ? { ...prev, autoExtendEnabled: !prev.autoExtendEnabled } : null)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                ${preferences.autoExtendEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform
                  ${preferences.autoExtendEnabled ? 'translate-x-6' : 'translate-x-1'}`}
              />
            </button>
          </div>
        )}

        {/* Message */}
        {message && (
          <div className={`flex items-center gap-2 p-3 rounded-lg text-sm
            ${message.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
              : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}
          >
            <Check className="h-4 w-4" />
            {message.text}
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Save Preferences'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

---

## 3.5 Integrate Preferences into Session Manager

### File: `src/lib/sessionManager.ts`

**Add preference loading:**

```typescript
import { getUserSessionPreferences, clearPreferencesCache } from '@/services/sessionPreferencesService';
import { UserSessionPreferences, DEFAULT_SESSION_PREFERENCES } from '@/types/session';

// Cached preferences
let userPrefs: UserSessionPreferences = DEFAULT_SESSION_PREFERENCES;

/**
 * Load user preferences (called on init and periodically)
 */
async function loadUserPreferences(): Promise<void> {
  try {
    userPrefs = await getUserSessionPreferences();
    console.log('[SessionManager] Loaded user preferences:', userPrefs.warningStyle);
  } catch (error) {
    console.warn('[SessionManager] Failed to load preferences, using defaults');
    userPrefs = DEFAULT_SESSION_PREFERENCES;
  }
}

// Update initializeSessionManager to load preferences
export function initializeSessionManager(): void {
  // ... existing init code ...

  // Load user preferences
  void loadUserPreferences();

  // Refresh preferences every 5 minutes
  setInterval(() => {
    void loadUserPreferences();
  }, 5 * 60 * 1000);

  // ... rest of existing code ...
}

// Update checkSessionStatus to use preferences
function checkSessionStatus(): void {
  // ... existing checks ...

  // Use user's preferred warning threshold
  const warningThreshold = userPrefs.warningThresholdMinutes;

  if (remainingMinutes > 0 && remainingMinutes <= warningThreshold) {
    // Check user's preference for handling warnings
    if (isUserActive() && userPrefs.extendOnActivity) {
      silentExtendSession();
      return;
    }

    // Handle based on warning style preference
    switch (userPrefs.warningStyle) {
      case 'silent':
        if (userPrefs.autoExtendEnabled) {
          silentExtendSession();
        }
        break;

      case 'toast':
        showSubtleToast('Session extended');
        silentExtendSession();
        break;

      case 'banner':
        if (!warningShown) {
          showSessionWarning(remainingMinutes);
        }
        break;
    }
  }
}

// Update cleanup to clear preferences cache
export function cleanupSessionManager(): void {
  // ... existing cleanup ...
  clearPreferencesCache();
}
```

---

## Phase 3 Checklist

- [ ] 3.1 Create and run database migration
- [ ] 3.2 Create `src/types/session.ts`
- [ ] 3.3 Create `src/services/sessionPreferencesService.ts`
- [ ] 3.4 Create `src/components/shared/SessionPreferencesCard.tsx`
- [ ] 3.5 Integrate preferences into sessionManager.ts
- [ ] Add SessionPreferencesCard to user profile/settings page
- [ ] Add SubtleSessionToast to App.tsx
- [ ] Clear preferences cache on logout
- [ ] Test all warning styles
- [ ] Test role-based limits
- [ ] Test preset application
- [ ] Commit Phase 3 changes

---

# Testing Plan

## Unit Tests

```typescript
describe('Session Preferences', () => {
  describe('Role Limits', () => {
    it('should enforce max idle timeout for SSA role');
    it('should enforce max remember me days for SUPPORT role');
    it('should prevent SSA from disabling auto-extend');
    it('should allow STUDENT to disable auto-extend');
  });

  describe('Grace Period', () => {
    it('should prevent grace period stacking beyond 5 minutes');
    it('should limit grace periods to 10 per session');
    it('should auto-cleanup stale test mode flags');
  });

  describe('Warning Behavior', () => {
    it('should silently extend for active users in silent mode');
    it('should show toast for active users in toast mode');
    it('should show banner for inactive users in banner mode');
    it('should re-warn at 2 minutes even if dismissed');
  });
});
```

## Manual Test Scenarios

| # | Scenario | Expected Behavior |
|---|----------|-------------------|
| 1 | Active user, silent mode, 3 min remaining | No warning, silent extend |
| 2 | Active user, toast mode, 3 min remaining | Toast shown, session extended |
| 3 | Inactive user, banner mode, 3 min remaining | Banner warning shown |
| 4 | Dismiss warning at 4 min, wait to 2 min | Warning re-appears |
| 5 | SSA tries to set 8hr timeout | Limited to 4hr max |
| 6 | SSA tries to disable auto-extend | Rejected with error |
| 7 | Apply "Minimal" preset | 4hr timeout, silent mode applied |
| 8 | Rapid F5 refresh (10 times) | Grace period blocked after limit |

---

# Rollback Plan

If issues occur after deployment:

1. **Phase 3 Issues:** Disable new preferences UI, revert to defaults
2. **Phase 2 Issues:** Revert to banner-only warnings
3. **Phase 1 Issues:** Revert specific file changes

All changes are additive and backward-compatible.

---

# Summary

| Phase | Description | Effort | Risk |
|-------|-------------|--------|------|
| 1 | Critical bug fixes | 4-6 hrs | Low |
| 2 | Minimal notifications | 4-6 hrs | Low |
| 3 | User preferences | 8-12 hrs | Medium |
| **Total** | | **16-24 hrs** | |

## Key Benefits

1. ✅ **No more false warnings** - Active users never interrupted
2. ✅ **User control** - Customize session behavior in profile
3. ✅ **Security maintained** - Role-based limits enforced
4. ✅ **Cleaner code** - Centralized configuration, no duplicates

---

**Awaiting Approval**

Please confirm to proceed with implementation.
