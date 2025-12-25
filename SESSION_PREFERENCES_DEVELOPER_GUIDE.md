# Session Preferences Developer Guide

**Quick Reference for Using the Session Preferences System**

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Basic Operations](#basic-operations)
3. [Advanced Features](#advanced-features)
4. [Admin Operations](#admin-operations)
5. [Database Queries](#database-queries)
6. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Import the Service
```typescript
import {
  getUserSessionPreferences,
  updateSessionPreferences,
  applyPresetByName,
  getRecommendedPresets,
  exportPreferences,
  importPreferences,
} from '@/services/sessionPreferencesService';
```

### Get User's Preferences
```typescript
const preferences = await getUserSessionPreferences();
console.log(preferences.idleTimeoutMinutes); // e.g., 60
console.log(preferences.warningStyle); // e.g., 'toast'
```

### Update Preferences
```typescript
const result = await updateSessionPreferences({
  idleTimeoutMinutes: 90,
  warningStyle: 'banner',
});

if (result.success) {
  console.log('Preferences saved!');
} else {
  console.error('Error:', result.error);
}
```

---

## Basic Operations

### 1. Loading Preferences

**Async (with caching)**:
```typescript
const prefs = await getUserSessionPreferences();
```

**Sync (cached only)**:
```typescript
const warningStyle = getWarningStyleSync();
const soundEnabled = isSoundEnabledSync();
```

**Preload on App Start**:
```typescript
// In your app initialization
await preloadPreferences();
```

### 2. Updating Preferences

**Partial updates** (only changed fields):
```typescript
await updateSessionPreferences({
  warningStyle: 'banner', // Only update this
});
```

**Multiple fields**:
```typescript
await updateSessionPreferences({
  idleTimeoutMinutes: 120,
  rememberMeDays: 14,
  warningStyle: 'toast',
  soundEnabled: true,
});
```

### 3. Applying Presets

**Get available presets**:
```typescript
const { data: presets } = await getAvailablePresets();
// Returns array of all presets

const { data: recommended } = await getRecommendedPresets();
// Returns presets recommended for current user type
```

**Apply a preset**:
```typescript
const result = await applyPresetByName('Focus Mode');
if (result.success) {
  console.log(result.message); // "Applied preset: Focus Mode"
}
```

### 4. Backup & Restore

**Export (backup)**:
```typescript
const { data: backup } = await exportPreferences();
// Save to localStorage, file, etc.
localStorage.setItem('prefs-backup', JSON.stringify(backup));
```

**Import (restore)**:
```typescript
const backup = JSON.parse(localStorage.getItem('prefs-backup'));
const result = await importPreferences(backup);
if (result.success) {
  console.log('Preferences restored!');
}
```

### 5. View Change History

**Get recent changes**:
```typescript
const { data: history } = await getPreferenceHistory(20);
// Returns last 20 changes

history.forEach(change => {
  console.log(`${change.field_name}: ${change.old_value} → ${change.new_value}`);
  console.log(`Changed by: ${change.changed_by} at ${change.changed_at}`);
});
```

---

## Advanced Features

### Role-Based Limits

The system automatically enforces limits based on user type:

```typescript
// Student tries to set 180min timeout
await updateSessionPreferences({ idleTimeoutMinutes: 180 });
// Automatically capped to 60min (student max)
// Database returns notice: "Idle timeout capped to 60 minutes for user type student"
```

**Check limits programmatically** (admin only):
```typescript
const { data } = await checkUserLimits('student@example.com');
console.log(data);
// {
//   user_email: 'student@example.com',
//   user_type: 'student',
//   current_idle_timeout: 30,
//   max_idle_timeout: 60,
//   is_within_limits: true
// }
```

### Preset Management

**System presets available**:
- `Focus Mode` - 120min, silent, for deep work
- `Quick Sessions` - 15min, banner, for public computers
- `Balanced` - 60min, toast, standard use
- `Extended Access` - 240min, banner, for admins
- `Maximum Security` - 30min, banner, high security

**Preset structure**:
```typescript
interface Preset {
  id: string;
  name: string;
  description: string;
  idle_timeout_minutes: number;
  remember_me_days: number;
  warning_style: 'silent' | 'toast' | 'banner';
  warning_threshold_minutes: number;
  auto_extend_enabled: boolean;
  extend_on_activity: boolean;
  sound_enabled: boolean;
  is_system_preset: boolean;
  recommended_for: string[]; // User types
}
```

---

## Admin Operations

**All admin functions require `system_admin` user type.**

### 1. Bulk Reset to Defaults

Reset all users of a type to their defaults:

```typescript
import { bulkResetPreferences } from '@/services/sessionPreferencesService';

const result = await bulkResetPreferences(
  'student',
  'New semester: resetting all student preferences'
);

console.log(`Reset ${result.usersAffected} students`);
```

### 2. Bulk Apply Preset

Apply configuration to specific users:

```typescript
import { bulkApplyPreset } from '@/services/sessionPreferencesService';

const result = await bulkApplyPreset(
  ['user1@example.com', 'user2@example.com', 'user3@example.com'],
  {
    idleTimeoutMinutes: 90,
    warningStyle: 'banner',
  },
  'Special event: extended session times'
);

console.log(`Applied to ${result.usersAffected}, failed: ${result.usersFailed}`);
```

### 3. Bulk Update Single Field

Update one field for all users (or filtered by type):

```typescript
import { bulkUpdateField } from '@/services/sessionPreferencesService';

// Update all teachers
const result = await bulkUpdateField(
  'warning_style',
  'banner',
  'teacher',
  'Making warnings more visible for teachers'
);

// Update everyone
const result2 = await bulkUpdateField(
  'sound_enabled',
  'true',
  undefined, // No filter = all users
  'Enabling sound for all users'
);
```

### 4. View Statistics

Track bulk operations and admin activity:

```typescript
import { getBulkOperationsStats } from '@/services/sessionPreferencesService';

const { data: stats } = await getBulkOperationsStats(30); // Last 30 days

stats.forEach(stat => {
  console.log(`${stat.operation_date}: ${stat.change_type}`);
  console.log(`${stat.total_operations} operations on ${stat.unique_users} users`);
  console.log(`By: ${stat.changed_by_email}`);
});
```

---

## Database Queries

### Useful Admin Queries

**Check for limit violations** (should always be empty):
```sql
SELECT * FROM session_preferences_limit_violations;
```

**View all preferences**:
```sql
SELECT
  u.email,
  u.user_type,
  p.idle_timeout_minutes,
  p.warning_style,
  p.remember_me_days,
  p.updated_at
FROM users u
JOIN user_session_preferences p ON p.user_id = u.auth_user_id
WHERE u.is_active = TRUE
ORDER BY u.user_type, u.email;
```

**Recent preference changes**:
```sql
SELECT
  u.email,
  h.field_name,
  h.old_value,
  h.new_value,
  h.change_type,
  h.changed_at
FROM user_session_preferences_history h
JOIN users u ON u.auth_user_id = h.user_id
WHERE h.changed_at >= NOW() - INTERVAL '7 days'
ORDER BY h.changed_at DESC
LIMIT 100;
```

**Preset usage statistics**:
```sql
SELECT
  h.new_value as preset_name,
  COUNT(*) as times_applied,
  COUNT(DISTINCT h.user_id) as unique_users
FROM user_session_preferences_history h
WHERE h.field_name LIKE '%preset%'
AND h.changed_at >= NOW() - INTERVAL '30 days'
GROUP BY h.new_value
ORDER BY times_applied DESC;
```

**Average timeout by user type**:
```sql
SELECT
  u.user_type,
  AVG(p.idle_timeout_minutes)::INTEGER as avg_timeout,
  MIN(p.idle_timeout_minutes) as min_timeout,
  MAX(p.idle_timeout_minutes) as max_timeout,
  COUNT(*) as user_count
FROM users u
JOIN user_session_preferences p ON p.user_id = u.auth_user_id
WHERE u.is_active = TRUE
GROUP BY u.user_type
ORDER BY u.user_type;
```

---

## Troubleshooting

### Issue: Preferences not saving

**Symptoms**: Updates don't persist or return error

**Debug**:
```typescript
const result = await updateSessionPreferences({ idleTimeoutMinutes: 90 });
console.log('Result:', result);

if (!result.success) {
  console.error('Error details:', result.error);
}
```

**Common Causes**:
1. Value exceeds role limits (check error message)
2. Not authenticated (result.error: 'Not authenticated')
3. RLS policy blocking (check admin_users table)

**Fix**:
```typescript
// Check current limits
const user = getCurrentUser();
console.log('User type:', user?.role);

// Try with smaller value
await updateSessionPreferences({ idleTimeoutMinutes: 30 });
```

### Issue: Cache not refreshing

**Symptoms**: Old values returned after update

**Fix**:
```typescript
import { clearPreferencesCache } from '@/services/sessionPreferencesService';

// Force clear cache
clearPreferencesCache();

// Reload preferences
const fresh = await getUserSessionPreferences();
```

**Note**: Cache auto-clears on update, but you can force it if needed.

### Issue: History not showing changes

**Symptoms**: `getPreferenceHistory()` returns empty array

**Debug**:
```sql
-- Check if history table has data
SELECT COUNT(*) FROM user_session_preferences_history
WHERE user_id = 'YOUR_USER_AUTH_ID';

-- Check if trigger is active
SELECT trigger_name, event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'user_session_preferences';
```

**Common Causes**:
1. Trigger not firing (check if exists)
2. RLS blocking view (check if you can see as admin)
3. No changes made yet (history only logs actual changes)

### Issue: Bulk operation fails

**Symptoms**: Admin bulk function returns error

**Debug**:
```typescript
const result = await bulkResetPreferences('student', 'Test');
console.log('Full result:', result);
```

**Common Causes**:
1. Not system_admin user type
2. Invalid user type parameter
3. Database connection issue

**Fix**:
```typescript
// Verify admin status
const user = getCurrentUser();
console.log('User type:', user?.userType); // Should be 'system_admin'

// Test with valid user type
await bulkResetPreferences('student', 'Test reason');
```

### Issue: Preset not applying

**Symptoms**: `applyPresetByName` returns success but nothing changes

**Debug**:
```typescript
// Check if preset exists
const { data: presets } = await getAvailablePresets();
console.log('Available presets:', presets.map(p => p.name));

// Try applying with logging
const result = await applyPresetByName('Focus Mode');
console.log('Result:', result);

// Check if preferences actually changed
const prefs = await getUserSessionPreferences();
console.log('Current timeout:', prefs.idleTimeoutMinutes);
```

**Common Causes**:
1. Typo in preset name (case-sensitive)
2. Cache showing old values (clear it)
3. Role limits capping preset values

---

## Best Practices

### 1. Always Check Results
```typescript
const result = await updateSessionPreferences({ ... });
if (!result.success) {
  // Handle error
  toast.error(result.error);
  return;
}
// Continue with success case
```

### 2. Use Type Safety
```typescript
import type { UserSessionPreferences } from '@/types/session';

const updates: Partial<UserSessionPreferences> = {
  idleTimeoutMinutes: 90,
  warningStyle: 'toast', // TypeScript ensures valid value
};
```

### 3. Provide User Feedback
```typescript
const result = await updateSessionPreferences(updates);
if (result.success) {
  toast.success('Preferences saved successfully');
} else {
  toast.error(`Failed to save: ${result.error}`);
}
```

### 4. Cache Awareness
```typescript
// For real-time updates, clear cache after external changes
clearPreferencesCache();

// For read-only operations, sync functions are faster
const style = getWarningStyleSync(); // No await needed
```

### 5. Admin Operations Logging
```typescript
// Always provide meaningful reasons for audit trail
await bulkResetPreferences(
  'student',
  'Q4 2025: Reset per new security policy #2025-04'
);
```

---

## Code Examples

### Complete User Settings Component

```typescript
import { useState, useEffect } from 'react';
import {
  getUserSessionPreferences,
  updateSessionPreferences,
  getRecommendedPresets,
  applyPresetByName,
} from '@/services/sessionPreferencesService';
import { toast } from 'react-hot-toast';

export function SessionPreferencesSettings() {
  const [preferences, setPreferences] = useState(null);
  const [presets, setPresets] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPreferences();
    loadPresets();
  }, []);

  const loadPreferences = async () => {
    const prefs = await getUserSessionPreferences();
    setPreferences(prefs);
  };

  const loadPresets = async () => {
    const { data } = await getRecommendedPresets();
    setPresets(data || []);
  };

  const handleUpdate = async (updates) => {
    setLoading(true);
    const result = await updateSessionPreferences(updates);
    setLoading(false);

    if (result.success) {
      toast.success('Preferences saved!');
      await loadPreferences(); // Refresh
    } else {
      toast.error(result.error);
    }
  };

  const handlePresetClick = async (presetName) => {
    setLoading(true);
    const result = await applyPresetByName(presetName);
    setLoading(false);

    if (result.success) {
      toast.success(result.message);
      await loadPreferences();
    } else {
      toast.error(result.error);
    }
  };

  if (!preferences) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <h2>Session Preferences</h2>

      {/* Presets */}
      <div>
        <h3>Quick Presets</h3>
        <div className="grid grid-cols-3 gap-4">
          {presets.map(preset => (
            <button
              key={preset.id}
              onClick={() => handlePresetClick(preset.name)}
              disabled={loading}
              className="p-4 border rounded hover:bg-gray-50"
            >
              <div className="font-semibold">{preset.name}</div>
              <div className="text-sm text-gray-600">{preset.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Manual Settings */}
      <div>
        <h3>Custom Settings</h3>
        <label>
          Idle Timeout (minutes):
          <input
            type="number"
            value={preferences.idleTimeoutMinutes}
            onChange={(e) =>
              handleUpdate({ idleTimeoutMinutes: parseInt(e.target.value) })
            }
            disabled={loading}
          />
        </label>

        <label>
          Warning Style:
          <select
            value={preferences.warningStyle}
            onChange={(e) => handleUpdate({ warningStyle: e.target.value })}
            disabled={loading}
          >
            <option value="silent">Silent</option>
            <option value="toast">Toast</option>
            <option value="banner">Banner</option>
          </select>
        </label>
      </div>
    </div>
  );
}
```

---

## API Reference

### User Functions

| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `getUserSessionPreferences()` | - | `Promise<UserSessionPreferences>` | Get current user's preferences (cached) |
| `updateSessionPreferences(updates)` | `Partial<UserSessionPreferences>` | `Promise<Result>` | Update user's preferences |
| `getPreferenceHistory(limit?)` | `number` | `Promise<Result>` | Get change history |
| `getAvailablePresets()` | - | `Promise<Result>` | Get all presets |
| `getRecommendedPresets()` | - | `Promise<Result>` | Get presets for current user type |
| `applyPresetByName(name)` | `string` | `Promise<Result>` | Apply named preset |
| `exportPreferences()` | - | `Promise<Result>` | Export to JSON |
| `importPreferences(json)` | `any` | `Promise<Result>` | Import from JSON |

### Admin Functions

| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `bulkResetPreferences(type, reason?)` | `string, string?` | `Promise<Result>` | Reset all users of type |
| `bulkApplyPreset(emails, config, reason?)` | `string[], any, string?` | `Promise<Result>` | Apply to specific users |
| `bulkUpdateField(field, value, type?, reason?)` | `string, string, string?, string?` | `Promise<Result>` | Update one field |
| `getBulkOperationsStats(days?)` | `number` | `Promise<Result>` | Get operation statistics |
| `checkUserLimits(email)` | `string` | `Promise<Result>` | Check user's limits |

### Sync Functions

| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `getWarningStyleSync()` | - | `'silent' \| 'toast' \| 'banner'` | Get cached warning style |
| `isSoundEnabledSync()` | - | `boolean` | Get cached sound setting |
| `getCachedPreferences()` | - | `UserSessionPreferences \| null` | Get all cached preferences |
| `clearPreferencesCache()` | - | `void` | Force clear cache |

---

## Support & Resources

- **Main Docs**: `SESSION_PREFERENCES_PHASE_2_3_COMPLETE.md`
- **Quick Ref**: `SESSION_PREFERENCES_PHASE_1_QUICK_REFERENCE.md`
- **Test Guide**: `QUICK_TEST_SESSION_PREFERENCES_PHASE_1.md`

For issues or questions, check the troubleshooting section or review the comprehensive documentation.

---

**Last Updated**: December 25, 2025
**Version**: 1.0 (Phase 1-3 Complete)
