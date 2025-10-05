'use client';

import React, { useState } from 'react';
import { Save, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button, IconButton } from '../../../../components/shared/Button';
import { FormField, Input, Textarea } from '../../../../components/shared/FormField';
import { ToggleSwitch } from '../../../../components/shared/ToggleSwitch';

interface SaveTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, description: string, isShared: boolean) => Promise<void>;
  defaultName?: string;
  isSaving?: boolean;
}

export function SaveTemplateModal({
  isOpen,
  onClose,
  onSave,
  defaultName = '',
  isSaving = false,
}: SaveTemplateModalProps) {
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState('');
  const [isShared, setIsShared] = useState(true);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Template name is required');
      return;
    }

    try {
      await onSave(name.trim(), description.trim(), isShared);
      setName('');
      setDescription('');
      setIsShared(true);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    }
  };

  const handleClose = () => {
    if (!isSaving) {
      setName('');
      setDescription('');
      setIsShared(true);
      setError('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={handleClose} />

        <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-2xl">
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#8CC63F]/20 to-[#7AB635]/20 flex items-center justify-center">
                  <Save className="w-6 h-6 text-[#8CC63F]" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Save as Template</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Reuse this configuration for future exams
                  </p>
                </div>
              </div>
              <IconButton
                variant="ghost"
                size="icon-sm"
                onClick={handleClose}
                aria-label="Close"
                disabled={isSaving}
                type="button"
              >
                <X className="w-5 h-5" />
              </IconButton>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              )}

              <FormField
                id="template-name"
                label="Template Name"
                required
                error={!name.trim() && error ? 'Template name is required' : undefined}
              >
                <Input
                  id="template-name"
                  placeholder="E.g., Year 11 Mathematics Mock - Paper 4"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isSaving}
                  autoFocus
                />
              </FormField>

              <FormField
                id="template-description"
                label="Description (optional)"
              >
                <Textarea
                  id="template-description"
                  rows={3}
                  placeholder="Describe when to use this template, what it's configured for, or any special notes..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isSaving}
                />
              </FormField>

              <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700">
                <ToggleSwitch
                  checked={isShared}
                  onChange={setIsShared}
                  label="Share with all entity users"
                  description="Allow school and branch admins to use this template"
                  disabled={isSaving}
                />
              </div>

              <div className="p-4 rounded-lg bg-[#8CC63F]/5 border border-[#8CC63F]/20">
                <div className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <CheckCircle2 className="w-5 h-5 text-[#8CC63F] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium mb-1">What gets saved?</p>
                    <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                      <li>• Programme, board, subject, and paper type</li>
                      <li>• Schools, branches, and year groups</li>
                      <li>• Duration and delivery mode</li>
                      <li>• Settings (AI proctoring, analytics, retakes)</li>
                      <li>• Notes and briefing information</li>
                    </ul>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                      Date, time, and specific teachers are not saved to allow flexibility.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isSaving}
                type="button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                leftIcon={<Save className="w-4 h-4" />}
                disabled={isSaving || !name.trim()}
                isLoading={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Template'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
