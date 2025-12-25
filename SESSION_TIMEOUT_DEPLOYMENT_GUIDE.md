# Session Timeout Feature - Deployment Guide

## Overview

This guide covers the deployment steps for the session timeout improvements implemented across three phases:

- **Phase 1**: Critical bug fixes (race conditions, cleanup)
- **Phase 2**: Minimal notification system (silent mode, toast notifications)
- **Phase 3**: User session preferences (customizable settings per user)

## Pre-Deployment Checklist

- [x] All TypeScript compilation passes
- [x] SessionPreferencesCard integrated into all profile pages
- [x] Database migration file created
- [ ] Database migration applied
- [ ] Production build verified
- [ ] End-to-end testing completed

---

## Step 1: Apply Database Migration

### Option A: Using Supabase Dashboard (Recommended)

1. Navigate to your Supabase project dashboard
2. Go to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of:
   ```
   supabase/migrations/20251225120000_add_user_session_preferences.sql
   ```
5. Click **Run** to execute the migration

### Option B: Using Supabase CLI

```bash
# If you have Supabase CLI installed:
supabase db push

# Or apply specific migration:
supabase migration up
```

### Migration Details

The migration creates:
- `user_session_preferences` table with columns:
  - `idle_timeout_minutes` (15-480 minutes)
  - `warning_style` ('silent', 'toast', 'banner')
  - `auto_extend_enabled` (boolean)
  - `extend_on_activity` (boolean)
  - `sound_enabled` (boolean)
  - `warning_threshold_minutes` (1-10 minutes)
  - `remember_me_days` (1-30 days)

- Row Level Security policies:
  - Users can manage their own preferences
  - Admins (SSA, SUPPORT) can view all preferences

- Index on `user_id` for fast lookups
- Trigger for auto-updating `updated_at` timestamp

---

## Step 2: Build and Deploy

### Local Build Verification

```bash
# Install dependencies
npm install

# Run TypeScript check
npx tsc --noEmit

# Build for production
npm run build

# Preview production build
npm run preview
```

### Deploy to Production

Follow your standard deployment process. The changes affect:

**Modified Files:**
- `src/lib/sessionManager.ts` - Core session logic
- `src/types/session.ts` - TypeScript types
- `src/services/sessionPreferencesService.ts` - Preferences service
- `src/components/shared/SessionPreferencesCard.tsx` - UI component
- `src/app/system-admin/profile/page.tsx` - Admin profile
- `src/app/student-module/profile/page.tsx` - Student profile
- `src/app/teachers-module/profile/page.tsx` - Teacher profile
- `src/app/entity-module/profile/page.tsx` - Entity admin profile

---

## Step 3: Post-Deployment Testing

### Test 1: Session Preferences UI

1. Log in as each role type (SSA, TEACHER, STUDENT, ENTITY_ADMIN)
2. Navigate to Profile page
3. Verify Session Settings card appears
4. Test each preset (Minimal, Balanced, Secure)
5. Test individual settings changes
6. Verify save functionality works

### Test 2: Warning Styles

| Style | Expected Behavior |
|-------|-------------------|
| Silent | No visible warnings, session auto-extends on activity |
| Toast | Small toast notification when session is extended |
| Banner | Prominent warning banner before session expires |

### Test 3: Role-Based Limits

| Role | Max Idle Time | Can Disable Auto-Extend |
|------|--------------|------------------------|
| SSA | 4 hours | No |
| SUPPORT | 4 hours | No |
| VIEWER | 8 hours | Yes |
| ENTITY_ADMIN | 8 hours | Yes |
| TEACHER | 8 hours | Yes |
| STUDENT | 8 hours | Yes |

### Test 4: Session Extension

1. Set idle timeout to 15 minutes
2. Stay active (mouse movements, clicks)
3. Verify session extends without logout
4. Verify behavior matches selected warning style

---

## Rollback Procedure

If issues occur, rollback database changes:

```sql
-- Drop the user_session_preferences table
DROP TABLE IF EXISTS user_session_preferences CASCADE;

-- Drop the trigger function
DROP FUNCTION IF EXISTS update_session_preferences_timestamp();
```

For code rollback, revert to the previous commit:

```bash
git log --oneline -5  # Find previous commit
git revert HEAD       # Revert last commit
```

---

## Feature Summary

### Default Behavior (No User Action Required)

- **Warning Style**: Silent (no interruptions)
- **Auto-Extend**: Enabled (session extends on activity)
- **Idle Timeout**: 60 minutes
- Users only see the logout modal if they've been truly idle

### User-Customizable Options

Users can access Session Settings in their Profile to:

1. **Quick Presets**:
   - Minimal: 4 hours, silent, auto-extend
   - Balanced: 1 hour, toast notifications
   - Secure: 15 minutes, banner warnings

2. **Session Duration**: 15 min to 8 hours (role-limited)

3. **Notification Style**:
   - Silent: No warnings, automatic extension
   - Toast: Subtle notification on extension
   - Banner: Prominent warning before expiry

4. **Auto-Extend Toggle**: Enable/disable (role-limited)

---

## Monitoring

Watch for these in production logs:

```
[Session] - Session lifecycle events
[SessionPreferences] - Preference loading/saving
[Auth] - Authentication events
```

Common log patterns:
- `[SessionPreferences] Loaded preferences: silent` - Normal preference load
- `[SessionPreferences] Cache cleared` - On logout or preference change
- `[Session] Session extended silently` - Auto-extension working

---

## Support

For issues or questions about this implementation, refer to:

- `SESSION_TIMEOUT_REVIEW_REPORT.md` - Original issues identified
- `SESSION_PREFERENCES_DESIGN.md` - Design decisions
- `SESSION_TIMEOUT_IMPLEMENTATION_PLAN.md` - Implementation details

---

*Last Updated: December 25, 2025*
