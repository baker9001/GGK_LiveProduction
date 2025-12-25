# Session Preferences Design: Minimal Notifications + User Control

**Date:** December 25, 2025
**Goal:** Minimize session-related interruptions while maintaining security and allowing user customization

---

## 🎯 Design Philosophy

### Core Principles

1. **Silent by Default** - Active users should NEVER see session warnings
2. **User Control** - Allow users to customize their session duration within security bounds
3. **Security First** - Enforce minimum/maximum limits regardless of user preference
4. **Progressive Disclosure** - Only show warnings when truly necessary

---

## 📋 User Session Preferences

### Preference Options for Users

| Setting | Options | Default | Security Bounds |
|---------|---------|---------|-----------------|
| **Session Duration** | 15 min, 30 min, 1 hour, 2 hours, 4 hours | 1 hour | Min: 15 min, Max: 8 hours |
| **Remember Me Duration** | 7 days, 14 days, 30 days | 30 days | Max: 30 days |
| **Warning Preference** | Silent (auto-extend), Subtle toast, Banner | Silent | - |
| **Auto-Extend** | On/Off | On | Recommended On |

### Role-Based Security Overrides

| Role | Max Session | Max Remember Me | Can Disable Auto-Extend |
|------|-------------|-----------------|------------------------|
| SSA (Super Admin) | 4 hours | 7 days | No |
| SUPPORT | 4 hours | 14 days | No |
| ENTITY_ADMIN | 8 hours | 30 days | Yes |
| TEACHER | 8 hours | 30 days | Yes |
| STUDENT | 8 hours | 30 days | Yes |

---

## 🗄️ Database Schema

### New Table: `user_session_preferences`

```sql
CREATE TABLE user_session_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Session Duration Preferences
  idle_timeout_minutes INTEGER NOT NULL DEFAULT 60,
  remember_me_days INTEGER NOT NULL DEFAULT 30,

  -- Notification Preferences
  warning_style VARCHAR(20) NOT NULL DEFAULT 'silent',  -- 'silent', 'toast', 'banner'
  warning_threshold_minutes INTEGER NOT NULL DEFAULT 2,

  -- Behavior Preferences
  auto_extend_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  extend_on_activity BOOLEAN NOT NULL DEFAULT TRUE,

  -- Audio/Visual Preferences
  sound_enabled BOOLEAN NOT NULL DEFAULT FALSE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_idle_timeout CHECK (idle_timeout_minutes >= 15 AND idle_timeout_minutes <= 480),
  CONSTRAINT valid_remember_me CHECK (remember_me_days >= 1 AND remember_me_days <= 30),
  CONSTRAINT valid_warning_style CHECK (warning_style IN ('silent', 'toast', 'banner')),
  CONSTRAINT valid_warning_threshold CHECK (warning_threshold_minutes >= 1 AND warning_threshold_minutes <= 10),

  UNIQUE(user_id)
);

-- Index for fast lookups
CREATE INDEX idx_user_session_preferences_user_id ON user_session_preferences(user_id);

-- RLS Policies
ALTER TABLE user_session_preferences ENABLE ROW LEVEL SECURITY;

-- Users can read/update their own preferences
CREATE POLICY "Users can manage own session preferences" ON user_session_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Admins can view all preferences (for support)
CREATE POLICY "Admins can view all preferences" ON user_session_preferences
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('SSA', 'SUPPORT')
    )
  );
```

### Update Function for `updated_at`

```sql
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

## 🔧 TypeScript Types

### Add to `src/types/session.ts` (new file)

```typescript
/**
 * User Session Preferences
 */
export interface UserSessionPreferences {
  id: string;
  userId: string;

  // Duration settings
  idleTimeoutMinutes: number;      // 15-480 (15 min to 8 hours)
  rememberMeDays: number;          // 1-30 days

  // Warning preferences
  warningStyle: 'silent' | 'toast' | 'banner';
  warningThresholdMinutes: number; // 1-10 minutes

  // Behavior
  autoExtendEnabled: boolean;
  extendOnActivity: boolean;

  // Audio
  soundEnabled: boolean;

  // Metadata
  createdAt: string;
  updatedAt: string;
}

/**
 * Session Preference Presets
 */
export type SessionPreset = 'minimal' | 'balanced' | 'secure' | 'custom';

export const SESSION_PRESETS: Record<SessionPreset, Partial<UserSessionPreferences>> = {
  minimal: {
    idleTimeoutMinutes: 240,      // 4 hours
    warningStyle: 'silent',
    autoExtendEnabled: true,
    extendOnActivity: true,
    warningThresholdMinutes: 1,
  },
  balanced: {
    idleTimeoutMinutes: 60,       // 1 hour
    warningStyle: 'toast',
    autoExtendEnabled: true,
    extendOnActivity: true,
    warningThresholdMinutes: 3,
  },
  secure: {
    idleTimeoutMinutes: 15,       // 15 minutes
    warningStyle: 'banner',
    autoExtendEnabled: false,
    extendOnActivity: false,
    warningThresholdMinutes: 5,
  },
  custom: {}
};

/**
 * Security bounds by role
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
```

---

## 🎨 UI Design: Profile Settings Section

### Session Settings Card

```
┌─────────────────────────────────────────────────────────────────┐
│  🔐 Session & Security Settings                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Session Duration                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ○ 15 minutes    ○ 30 minutes    ● 1 hour              │   │
│  │  ○ 2 hours       ○ 4 hours       ○ Custom: [___] min   │   │
│  └─────────────────────────────────────────────────────────┘   │
│  How long before you're logged out due to inactivity            │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Session Notifications                                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ● Silent (Recommended)                                 │   │
│  │    Automatically extends your session while active.     │   │
│  │    No interruptions.                                    │   │
│  │                                                         │   │
│  │  ○ Subtle Toast                                         │   │
│  │    Shows a small notification when session is extended  │   │
│  │                                                         │   │
│  │  ○ Warning Banner                                       │   │
│  │    Shows a prominent warning before session expires     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Quick Presets                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                      │
│  │ Minimal  │  │ Balanced │  │  Secure  │                      │
│  │ 4 hours  │  │ 1 hour   │  │ 15 min   │                      │
│  │ Silent   │  │ Toast    │  │ Banner   │                      │
│  └──────────┘  └──────────┘  └──────────┘                      │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Remember Me Duration                                           │
│  When "Remember me" is checked at login:                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ○ 7 days    ● 14 days    ○ 30 days                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│                                            [ Save Preferences ] │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Updated Session Manager Flow

### New Flow with User Preferences

```
┌─────────────────────────────────────────────────────────────────┐
│                    SESSION CHECK (every 30s)                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                 ┌────────────────────────┐
                 │ Load User Preferences  │
                 │ (cached in memory)     │
                 └────────────────────────┘
                              │
                              ▼
                 ┌────────────────────────┐
                 │ Calculate remaining    │
                 │ time based on user's   │
                 │ idleTimeoutMinutes     │
                 └────────────────────────┘
                              │
                              ▼
            ┌─────────────────────────────────┐
            │ Is remaining < warningThreshold? │
            └─────────────────────────────────┘
                    │                │
                   YES               NO
                    │                │
                    ▼                └──► Continue monitoring
         ┌──────────────────┐
         │ Is user active?  │
         │ (last 2 minutes) │
         └──────────────────┘
              │         │
            YES         NO
              │         │
              ▼         ▼
    ┌─────────────┐  ┌─────────────────────────┐
    │ autoExtend  │  │ Check warningStyle      │
    │ enabled?    │  └─────────────────────────┘
    └─────────────┘           │
         │    │               ▼
        YES   NO    ┌─────────────────────────┐
         │    │     │ 'silent': Extend anyway │
         │    │     │ 'toast': Show toast     │
         │    │     │ 'banner': Show banner   │
         ▼    │     └─────────────────────────┘
    ┌─────────┴────┐
    │ SILENT       │
    │ EXTEND       │
    │ (no UI)      │
    └──────────────┘
```

---

## 📝 Implementation Code

### `src/services/sessionPreferencesService.ts`

```typescript
import { supabase } from '@/lib/supabase';
import { UserSessionPreferences, ROLE_SESSION_LIMITS, SESSION_PRESETS } from '@/types/session';
import { getCurrentUser } from '@/lib/auth';

// In-memory cache
let cachedPreferences: UserSessionPreferences | null = null;
let cacheExpiry: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get user's session preferences (with caching)
 */
export async function getUserSessionPreferences(): Promise<UserSessionPreferences> {
  const user = getCurrentUser();
  if (!user) {
    return getDefaultPreferences();
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
      // Create default preferences for user
      return await createDefaultPreferences(user.id);
    }

    // Apply role-based limits
    const preferences = applyRoleLimits(mapDbToPreferences(data), user.role);

    // Update cache
    cachedPreferences = preferences;
    cacheExpiry = Date.now() + CACHE_DURATION;

    return preferences;
  } catch (error) {
    console.error('[SessionPreferences] Error loading preferences:', error);
    return getDefaultPreferences();
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
  const roleLimits = ROLE_SESSION_LIMITS[user.role];

  if (updates.idleTimeoutMinutes) {
    updates.idleTimeoutMinutes = Math.min(
      updates.idleTimeoutMinutes,
      roleLimits.maxIdleMinutes
    );
  }

  if (updates.rememberMeDays) {
    updates.rememberMeDays = Math.min(
      updates.rememberMeDays,
      roleLimits.maxRememberDays
    );
  }

  if (updates.autoExtendEnabled === false && !roleLimits.canDisableAutoExtend) {
    return { success: false, error: 'Your role requires auto-extend to remain enabled' };
  }

  try {
    const { error } = await supabase
      .from('user_session_preferences')
      .upsert({
        user_id: user.id,
        idle_timeout_minutes: updates.idleTimeoutMinutes,
        remember_me_days: updates.rememberMeDays,
        warning_style: updates.warningStyle,
        warning_threshold_minutes: updates.warningThresholdMinutes,
        auto_extend_enabled: updates.autoExtendEnabled,
        extend_on_activity: updates.extendOnActivity,
        sound_enabled: updates.soundEnabled,
      });

    if (error) throw error;

    // Clear cache
    cachedPreferences = null;

    return { success: true };
  } catch (error) {
    console.error('[SessionPreferences] Error updating:', error);
    return { success: false, error: 'Failed to save preferences' };
  }
}

/**
 * Apply a preset
 */
export async function applyPreset(preset: 'minimal' | 'balanced' | 'secure'): Promise<boolean> {
  const presetValues = SESSION_PRESETS[preset];
  const result = await updateSessionPreferences(presetValues as Partial<UserSessionPreferences>);
  return result.success;
}

// Helper functions
function getDefaultPreferences(): UserSessionPreferences {
  return {
    id: '',
    userId: '',
    idleTimeoutMinutes: 60,
    rememberMeDays: 30,
    warningStyle: 'silent',
    warningThresholdMinutes: 2,
    autoExtendEnabled: true,
    extendOnActivity: true,
    soundEnabled: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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
    autoExtendEnabled: limits.canDisableAutoExtend
      ? preferences.autoExtendEnabled
      : true,
  };
}
```

---

## 🔔 Minimal Notification System

### Updated `sessionManager.ts` Logic

```typescript
import { getUserSessionPreferences } from '@/services/sessionPreferencesService';

// Cached preferences (refreshed every 5 min)
let userPrefs: UserSessionPreferences | null = null;

async function checkSessionStatus(): void {
  // Load preferences (cached)
  if (!userPrefs) {
    userPrefs = await getUserSessionPreferences();
  }

  const remainingMinutes = getSessionRemainingTimeFromAuth();

  // Check if in warning zone based on USER'S preference
  if (remainingMinutes > 0 && remainingMinutes <= userPrefs.warningThresholdMinutes) {

    // Is user active?
    if (isUserActive() && userPrefs.extendOnActivity) {
      // SILENT EXTEND - no UI interruption
      silentExtendSession();
      return;
    }

    // User is inactive - handle based on their warning preference
    switch (userPrefs.warningStyle) {
      case 'silent':
        // Still extend silently even for inactive users
        silentExtendSession();
        break;

      case 'toast':
        // Show subtle toast, then extend
        showSubtleToast(`Session extended (${remainingMinutes}m remaining)`);
        silentExtendSession();
        break;

      case 'banner':
        // Traditional banner warning
        if (!warningShown) {
          showSessionWarning(remainingMinutes);
        }
        break;
    }
  }
}

/**
 * Silent session extension - no UI
 */
function silentExtendSession(): void {
  const user = getAuthenticatedUser();
  if (!user) return;

  // Check rate limit (prevent abuse)
  const lastExtend = localStorage.getItem(LAST_AUTO_EXTEND_KEY);
  const timeSinceExtend = Date.now() - (parseInt(lastExtend || '0', 10));

  if (timeSinceExtend < 180000) { // 3 minute cooldown
    return;
  }

  // Extend session
  setAuthenticatedUser(user);
  void supabase.auth.refreshSession();

  localStorage.setItem(LAST_AUTO_EXTEND_KEY, Date.now().toString());

  // Clear any warning state
  warningShown = false;
  localStorage.removeItem(SESSION_WARNING_SHOWN_KEY);

  console.log('[SessionManager] Session silently extended');

  // Dispatch event (for any listeners, but no UI)
  window.dispatchEvent(new CustomEvent(SESSION_EXTENDED_EVENT, {
    detail: { timestamp: Date.now(), auto: true, silent: true }
  }));
}

/**
 * Subtle toast notification
 */
function showSubtleToast(message: string): void {
  window.dispatchEvent(new CustomEvent('show-toast', {
    detail: {
      message,
      type: 'info',
      duration: 2000,
      position: 'bottom-right',
      subtle: true
    }
  }));
}
```

---

## 📊 Summary: Before vs After

### User Experience Comparison

| Scenario | BEFORE | AFTER (Silent Mode) |
|----------|--------|---------------------|
| Active user at 5 min remaining | ⚠️ Warning banner shown | ✅ Silent extend, no interruption |
| Active user at 2 min remaining | ⚠️ Warning banner shown | ✅ Silent extend, no interruption |
| Inactive user at 5 min remaining | ⚠️ Warning banner shown | ✅ Silent extend (per preference) |
| Inactive user at 1 min remaining | ⚠️ Warning banner shown | ⚠️ Toast (if preferred) or silent |
| Session actually expires | ❌ Sudden logout | ❌ Logout (only for truly inactive) |

### Notification Reduction

| Warning Style | Notifications per Day (8hr session) |
|---------------|-------------------------------------|
| **Banner (old)** | ~6-8 warnings |
| **Silent (new default)** | 0 warnings |
| **Toast (optional)** | ~2-3 subtle toasts |

---

## 🔒 Security Considerations

1. **Minimum Idle Timeout**: 15 minutes (cannot be set lower)
2. **Maximum Idle Timeout**: 8 hours for regular users, 4 hours for admins
3. **Rate Limiting**: 3-minute cooldown between extensions
4. **Absolute Timeout**: Still enforced at 8 hours regardless of preference
5. **Admin Override**: SSA/SUPPORT cannot disable auto-extend
6. **Audit Trail**: All preference changes logged

---

## 📋 Implementation Checklist

- [ ] Create database migration for `user_session_preferences` table
- [ ] Create `src/types/session.ts` with type definitions
- [ ] Create `src/services/sessionPreferencesService.ts`
- [ ] Update `sessionManager.ts` with preference-aware logic
- [ ] Create UI component `SessionPreferencesCard.tsx`
- [ ] Add to user profile/settings page
- [ ] Add toast notification component for subtle mode
- [ ] Update `sessionConfig.ts` to use preferences as defaults
- [ ] Add unit tests for preference validation
- [ ] Add E2E tests for session behavior
