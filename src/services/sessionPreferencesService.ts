/**
 * File: /src/services/sessionPreferencesService.ts
 *
 * Service for managing user session preferences
 * Handles loading, saving, and caching of preferences
 *
 * Features:
 *   - In-memory caching with TTL
 *   - Role-based limit enforcement
 *   - Preset application
 *   - Validation before save
 */

import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import {
  UserSessionPreferences,
  UserSessionPreferencesRow,
  SessionPreset,
  SESSION_PRESETS,
  DEFAULT_SESSION_PREFERENCES,
  mapDbToPreferences,
  mapPreferencesToDb,
  applyRoleLimits,
  validatePreferences,
} from '@/types/session';

// In-memory cache
let cachedPreferences: UserSessionPreferences | null = null;
let cacheExpiry = 0;
const CACHE_DURATION_MS = 1 * 60 * 1000; // 1 minute - reduced to minimize stale data

/**
 * Get user's session preferences with caching
 */
export async function getUserSessionPreferences(): Promise<UserSessionPreferences> {
  const user = getCurrentUser();
  if (!user) {
    console.log('[SessionPreferences] No authenticated user, returning defaults');
    return DEFAULT_SESSION_PREFERENCES;
  }

  // Check cache
  if (cachedPreferences && cachedPreferences.userId === user.id && Date.now() < cacheExpiry) {
    console.log('[SessionPreferences] Returning cached preferences');
    return cachedPreferences;
  }

  try {
    const { data, error } = await supabase
      .from('user_session_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      // PGRST116 = no rows returned (user has no preferences yet)
      if (error.code === 'PGRST116') {
        console.log('[SessionPreferences] No preferences found, returning defaults');
        const defaults = applyRoleLimits(
          { ...DEFAULT_SESSION_PREFERENCES, userId: user.id },
          user.role
        );
        return defaults;
      }
      throw error;
    }

    // Map and apply role limits
    const preferences = applyRoleLimits(
      mapDbToPreferences(data as UserSessionPreferencesRow),
      user.role
    );

    // Update cache
    cachedPreferences = preferences;
    cacheExpiry = Date.now() + CACHE_DURATION_MS;

    console.log('[SessionPreferences] Loaded preferences:', preferences.warningStyle);
    return preferences;
  } catch (error) {
    console.error('[SessionPreferences] Error loading preferences:', error);
    return applyRoleLimits(
      { ...DEFAULT_SESSION_PREFERENCES, userId: user.id },
      user.role
    );
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

  // Validate against role limits
  const validation = validatePreferences(updates, user.role);
  if (!validation.valid) {
    return { success: false, error: validation.errors.join('. ') };
  }

  // Apply role-based limits to any values that exceed them
  const limits = applyRoleLimits(
    { ...DEFAULT_SESSION_PREFERENCES, ...updates },
    user.role
  );

  const validated = {
    ...updates,
    idleTimeoutMinutes: updates.idleTimeoutMinutes !== undefined
      ? Math.min(Math.max(15, updates.idleTimeoutMinutes), limits.idleTimeoutMinutes)
      : undefined,
    rememberMeDays: updates.rememberMeDays !== undefined
      ? Math.min(Math.max(1, updates.rememberMeDays), limits.rememberMeDays)
      : undefined,
    autoExtendEnabled: !limits.autoExtendEnabled ? true : updates.autoExtendEnabled,
  };

  try {
    const dbData = mapPreferencesToDb(validated, user.id);

    const { error } = await supabase
      .from('user_session_preferences')
      .upsert({
        ...dbData,
        user_id: user.id,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (error) throw error;

    // Clear cache to force reload on next access
    cachedPreferences = null;
    cacheExpiry = 0;

    console.log('[SessionPreferences] Preferences updated successfully');
    return { success: true };
  } catch (error) {
    console.error('[SessionPreferences] Error updating preferences:', error);
    return { success: false, error: 'Failed to save preferences. Please try again.' };
  }
}

/**
 * Apply a preset configuration
 */
export async function applyPreset(
  preset: SessionPreset
): Promise<{ success: boolean; error?: string }> {
  if (preset === 'custom') {
    // Custom preset means no changes
    return { success: true };
  }

  const presetValues = SESSION_PRESETS[preset];
  if (!presetValues) {
    return { success: false, error: `Unknown preset: ${preset}` };
  }

  console.log(`[SessionPreferences] Applying preset: ${preset}`);
  return updateSessionPreferences(presetValues as Partial<UserSessionPreferences>);
}

/**
 * Clear preferences cache
 * Call this on logout to ensure fresh preferences on next login
 */
export function clearPreferencesCache(): void {
  cachedPreferences = null;
  cacheExpiry = 0;
  console.log('[SessionPreferences] Cache cleared');
}

/**
 * Get cached preferences synchronously (for session manager)
 * Returns null if cache is empty or expired
 */
export function getCachedPreferences(): UserSessionPreferences | null {
  if (cachedPreferences && Date.now() < cacheExpiry) {
    return cachedPreferences;
  }
  return null;
}

/**
 * Get the effective idle timeout in milliseconds
 * Considers user preferences and role limits
 */
export async function getEffectiveIdleTimeoutMs(): Promise<number> {
  const preferences = await getUserSessionPreferences();
  return preferences.idleTimeoutMinutes * 60 * 1000;
}

/**
 * Get the effective warning threshold in minutes
 */
export async function getEffectiveWarningThreshold(): Promise<number> {
  const preferences = await getUserSessionPreferences();
  return preferences.warningThresholdMinutes;
}

/**
 * Check if auto-extend is enabled for the current user
 */
export async function isAutoExtendEnabled(): Promise<boolean> {
  const preferences = await getUserSessionPreferences();
  return preferences.autoExtendEnabled;
}

/**
 * Get the warning style preference
 */
export async function getWarningStyle(): Promise<'silent' | 'toast' | 'banner'> {
  const preferences = await getUserSessionPreferences();
  return preferences.warningStyle;
}

/**
 * Synchronous version that uses cached value
 * Falls back to 'silent' if cache is empty
 */
export function getWarningStyleSync(): 'silent' | 'toast' | 'banner' {
  const cached = getCachedPreferences();
  return cached?.warningStyle ?? 'silent';
}

/**
 * Check if sound notifications are enabled
 */
export function isSoundEnabledSync(): boolean {
  const cached = getCachedPreferences();
  return cached?.soundEnabled ?? false;
}

/**
 * Preload preferences (call on app initialization)
 */
export async function preloadPreferences(): Promise<void> {
  try {
    await getUserSessionPreferences();
  } catch (error) {
    console.warn('[SessionPreferences] Failed to preload preferences:', error);
  }
}

// ============================================================================
// PHASE 2 & 3: Advanced Features
// ============================================================================

/**
 * Get preference change history for current user
 */
export async function getPreferenceHistory(limit = 50): Promise<{
  success: boolean;
  data?: any[];
  error?: string;
}> {
  const user = getCurrentUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const { data, error } = await supabase
      .from('user_session_preferences_history')
      .select('*')
      .eq('user_id', user.id)
      .order('changed_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('[SessionPreferences] Error loading history:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all available presets
 */
export async function getAvailablePresets(): Promise<{
  success: boolean;
  data?: any[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('session_preference_presets')
      .select('*')
      .order('is_system_preset', { ascending: false })
      .order('name');

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('[SessionPreferences] Error loading presets:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get presets recommended for current user
 */
export async function getRecommendedPresets(): Promise<{
  success: boolean;
  data?: any[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc('get_recommended_presets');

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('[SessionPreferences] Error loading recommended presets:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Apply a preset by name
 */
export async function applyPresetByName(
  presetName: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('apply_session_preset', {
      p_preset_name: presetName,
    });

    if (error) throw error;

    // Clear cache after applying preset
    clearPreferencesCache();

    const result = data?.[0];
    return {
      success: result?.success ?? false,
      message: result?.message,
      error: result?.success ? undefined : result?.message,
    };
  } catch (error: any) {
    console.error('[SessionPreferences] Error applying preset:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Export current preferences to JSON
 */
export async function exportPreferences(): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc('export_session_preferences');

    if (error) throw error;

    if (data?.error) {
      return { success: false, error: data.error };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('[SessionPreferences] Error exporting preferences:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Import preferences from JSON
 */
export async function importPreferences(
  preferencesJson: any
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('import_session_preferences', {
      p_preferences_json: preferencesJson,
    });

    if (error) throw error;

    // Clear cache after importing
    clearPreferencesCache();

    const result = data?.[0];
    return {
      success: result?.success ?? false,
      message: result?.message,
      error: result?.success ? undefined : result?.message,
    };
  } catch (error: any) {
    console.error('[SessionPreferences] Error importing preferences:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// ADMIN-ONLY FUNCTIONS (Phase 2)
// ============================================================================

/**
 * Bulk reset preferences for all users of a specific type
 * Admin only
 */
export async function bulkResetPreferences(
  userType: string,
  reason?: string
): Promise<{
  success: boolean;
  usersAffected?: number;
  message?: string;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc('bulk_reset_session_preferences', {
      p_user_type: userType,
      p_reason: reason,
    });

    if (error) throw error;

    const result = data?.[0];
    return {
      success: result?.success ?? false,
      usersAffected: result?.users_affected,
      message: result?.message,
      error: result?.success ? undefined : result?.message,
    };
  } catch (error: any) {
    console.error('[SessionPreferences] Error in bulk reset:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Bulk apply preset to multiple users by email
 * Admin only
 */
export async function bulkApplyPreset(
  userEmails: string[],
  presetConfig: any,
  reason?: string
): Promise<{
  success: boolean;
  usersAffected?: number;
  usersFailed?: number;
  message?: string;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc('bulk_apply_preset', {
      p_user_emails: userEmails,
      p_preset_config: presetConfig,
      p_reason: reason,
    });

    if (error) throw error;

    const result = data?.[0];
    return {
      success: result?.success ?? false,
      usersAffected: result?.users_affected,
      usersFailed: result?.users_failed,
      message: result?.message,
      error: result?.success ? undefined : result?.message,
    };
  } catch (error: any) {
    console.error('[SessionPreferences] Error in bulk apply:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Bulk update a single field for users
 * Admin only
 */
export async function bulkUpdateField(
  fieldName: string,
  newValue: string,
  userType?: string,
  reason?: string
): Promise<{
  success: boolean;
  usersAffected?: number;
  message?: string;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc('bulk_update_preference_field', {
      p_field_name: fieldName,
      p_new_value: newValue,
      p_user_type: userType,
      p_reason: reason,
    });

    if (error) throw error;

    const result = data?.[0];
    return {
      success: result?.success ?? false,
      usersAffected: result?.users_affected,
      message: result?.message,
      error: result?.success ? undefined : result?.message,
    };
  } catch (error: any) {
    console.error('[SessionPreferences] Error in bulk update:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get bulk operations statistics
 * Admin only
 */
export async function getBulkOperationsStats(
  daysBack = 30
): Promise<{
  success: boolean;
  data?: any[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc('get_bulk_operations_stats', {
      p_days_back: daysBack,
    });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('[SessionPreferences] Error loading stats:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check user session limits (for debugging/support)
 * Admin only
 */
export async function checkUserLimits(
  userEmail: string
): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc('check_user_session_limits', {
      p_user_email: userEmail,
    });

    if (error) throw error;

    return { success: true, data: data?.[0] };
  } catch (error: any) {
    console.error('[SessionPreferences] Error checking limits:', error);
    return { success: false, error: error.message };
  }
}
