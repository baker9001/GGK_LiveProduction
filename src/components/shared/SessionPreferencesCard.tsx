/**
 * File: /src/components/shared/SessionPreferencesCard.tsx
 *
 * Session Preferences UI Component
 * Allows users to customize their session management preferences
 *
 * Features:
 *   - Quick presets (Minimal, Balanced, Secure)
 *   - Session duration selection
 *   - Warning style selection
 *   - Auto-extend toggle
 *   - Role-based limit enforcement
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Bell, Shield, Check, Loader2, AlertTriangle, X } from 'lucide-react';
import { Button } from './Button';
import {
  getUserSessionPreferences,
  updateSessionPreferences,
} from '@/services/sessionPreferencesService';
import {
  UserSessionPreferences,
  SessionPreset,
  SESSION_PRESETS,
  ROLE_SESSION_LIMITS,
  DURATION_OPTIONS,
  WARNING_STYLE_OPTIONS,
  PRESET_OPTIONS,
} from '@/types/session';
import { getCurrentUser } from '@/lib/auth';

interface SessionPreferencesCardProps {
  onClose?: () => void;
  showCloseButton?: boolean;
}

export function SessionPreferencesCard({ onClose, showCloseButton = false }: SessionPreferencesCardProps) {
  const [preferences, setPreferences] = useState<UserSessionPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const user = getCurrentUser();
  const roleLimits = user ? ROLE_SESSION_LIMITS[user.role] : ROLE_SESSION_LIMITS.STUDENT;

  const loadPreferences = useCallback(async () => {
    setLoading(true);
    try {
      const prefs = await getUserSessionPreferences();
      setPreferences(prefs);
    } catch (error) {
      console.error('[SessionPreferencesCard] Error loading preferences:', error);
      setMessage({ type: 'error', text: 'Failed to load preferences' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const handleSave = async () => {
    if (!preferences) return;

    setSaving(true);
    setMessage(null);

    const result = await updateSessionPreferences(preferences);

    if (result.success) {
      setMessage({ type: 'success', text: 'Preferences saved successfully' });
      setHasChanges(false);
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to save preferences' });
    }

    setSaving(false);

    // Clear success message after 3 seconds
    if (result.success) {
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handlePresetClick = (preset: SessionPreset) => {
    const presetValues = SESSION_PRESETS[preset];
    if (presetValues && preferences) {
      setPreferences(prev => prev ? { ...prev, ...presetValues } : null);
      setHasChanges(true);
    }
  };

  const updatePreference = <K extends keyof UserSessionPreferences>(
    key: K,
    value: UserSessionPreferences[K]
  ) => {
    setPreferences(prev => prev ? { ...prev, [key]: value } : null);
    setHasChanges(true);
    setMessage(null);
  };

  if (loading || !preferences) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
          <span className="ml-3 text-slate-600 dark:text-slate-400">Loading preferences...</span>
        </div>
      </div>
    );
  }

  const availableDurations = DURATION_OPTIONS.filter(opt => opt.value <= roleLimits.maxIdleMinutes);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Session Settings
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Control how your session behaves and when you receive notifications
              </p>
            </div>
          </div>
          {showCloseButton && onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5 text-slate-500" />
            </button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Quick Presets */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
            Quick Presets
          </label>
          <div className="grid grid-cols-3 gap-3">
            {PRESET_OPTIONS.map(preset => (
              <button
                key={preset.key}
                onClick={() => handlePresetClick(preset.key)}
                className="p-3 rounded-lg border border-slate-200 dark:border-slate-600
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
              <span className="text-amber-600 dark:text-amber-400 ml-1">
                (Max {roleLimits.maxIdleMinutes / 60} hours for your role)
              </span>
            )}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {availableDurations.map(option => (
              <button
                key={option.value}
                onClick={() => updatePreference('idleTimeoutMinutes', option.value)}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors
                  ${preferences.idleTimeoutMinutes === option.value
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-500'
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
            {WARNING_STYLE_OPTIONS.map(style => (
              <label
                key={style.value}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                  ${preferences.warningStyle === style.value
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                    : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                  }`}
              >
                <input
                  type="radio"
                  name="warningStyle"
                  value={style.value}
                  checked={preferences.warningStyle === style.value}
                  onChange={() => updatePreference('warningStyle', style.value)}
                  className="mt-1 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="flex-1">
                  <div className="font-medium text-slate-900 dark:text-white">{style.label}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">{style.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Auto-Extend Toggle */}
        {roleLimits.canDisableAutoExtend ? (
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <div>
              <div className="font-medium text-slate-900 dark:text-white">Auto-extend session</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Automatically extend your session while you're active
              </div>
            </div>
            <button
              onClick={() => updatePreference('autoExtendEnabled', !preferences.autoExtendEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                ${preferences.autoExtendEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
              role="switch"
              aria-checked={preferences.autoExtendEnabled}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform
                  ${preferences.autoExtendEnabled ? 'translate-x-6' : 'translate-x-1'}`}
              />
            </button>
          </div>
        ) : (
          <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-amber-800 dark:text-amber-300">Auto-extend required</div>
              <div className="text-sm text-amber-700 dark:text-amber-400">
                For security, auto-extend is always enabled for your role ({user?.role})
              </div>
            </div>
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
            {message.type === 'success' ? (
              <Check className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            {message.text}
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          {onClose && (
            <Button
              onClick={onClose}
              className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-4"
            >
              Cancel
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className={`px-6 ${
              hasChanges
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
            }`}
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

export default SessionPreferencesCard;
