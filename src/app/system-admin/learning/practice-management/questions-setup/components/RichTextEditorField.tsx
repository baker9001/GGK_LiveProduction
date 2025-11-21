// src/app/system-admin/learning/practice-management/questions-setup/components/RichTextEditorField.tsx

import React, { useEffect, useMemo, useState } from 'react';
import { RichTextEditor } from '../../../../../../components/shared/RichTextEditor';
import { Button } from '../../../../../../components/shared/Button';
import { toast } from '../../../../../../components/shared/Toast';
import { cn } from '../../../../../../lib/utils';
import { getPlainTextFromRichText, sanitizeRichText } from '../../../../../../utils/richText';

interface RichTextEditorFieldProps {
  value?: string | null;
  onSave: (value: string) => Promise<void> | void;
  disabled?: boolean;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  className?: string;
  label?: string;
  description?: string;
  ariaLabel?: string;
  saveLabel?: string;
  cancelLabel?: string;
}

export function RichTextEditorField({
  value,
  onSave,
  disabled = false,
  placeholder = 'Start typing...',
  required = false,
  minLength,
  maxLength,
  className,
  label,
  description,
  ariaLabel,
  saveLabel = 'Save changes',
  cancelLabel = 'Reset',
}: RichTextEditorFieldProps) {
  const [draft, setDraft] = useState<string>(() => sanitizeRichText(value || ''));
  const [savedValue, setSavedValue] = useState<string>(() => sanitizeRichText(value || ''));
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    // Only sync from parent when not actively editing
    if (!isEditing) {
      const sanitized = sanitizeRichText(value || '');
      setDraft(sanitized);
      setSavedValue(sanitized);
    }
  }, [value, isEditing]);

  const sanitizedDraft = useMemo(() => sanitizeRichText(draft || ''), [draft]);
  const sanitizedSaved = useMemo(() => sanitizeRichText(savedValue || ''), [savedValue]);
  const hasChanges = sanitizedDraft !== sanitizedSaved;

  const plainText = useMemo(() => getPlainTextFromRichText(sanitizedDraft).trim(), [sanitizedDraft]);

  const handleSave = async () => {
    if (disabled) return;

    if (required && plainText.length === 0) {
      toast.error('This field is required');
      return;
    }

    if (minLength !== undefined && plainText.length < minLength) {
      toast.error(`Must be at least ${minLength} characters`);
      return;
    }

    if (maxLength !== undefined && plainText.length > maxLength) {
      toast.error(`Must be at most ${maxLength} characters`);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(sanitizedDraft);
      setSavedValue(sanitizedDraft);
    } catch (error) {
      console.error('Failed to save rich text field:', error);
      if (!(error instanceof Error)) {
        toast.error('Failed to update field');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setDraft(savedValue);
  };

  if (disabled) {
    const hasContent = plainText.length > 0;

    return (
      <div className="space-y-2">
        {label && (
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{label}</p>
        )}
        {description && (
          <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
        )}
        {hasContent ? (
          <div
            className={cn('rich-text-display text-gray-900 dark:text-white leading-relaxed', className)}
            dangerouslySetInnerHTML={{ __html: sanitizedDraft }}
          />
        ) : (
          <p className="text-sm italic text-gray-500 dark:text-gray-400">{placeholder}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {label && (
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{label}</p>
          {description && (
            <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
          )}
        </div>
      )}
      <div
        onFocus={() => setIsEditing(true)}
        onBlur={() => setIsEditing(false)}
      >
        <RichTextEditor
          value={draft}
          onChange={setDraft}
          placeholder={placeholder}
          ariaLabel={ariaLabel}
          className={className}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={handleSave}
          disabled={!hasChanges}
          loading={isSaving}
        >
          {saveLabel}
        </Button>
        <Button
          variant="ghost"
          onClick={handleReset}
          disabled={!hasChanges || isSaving}
        >
          {cancelLabel}
        </Button>
      </div>
    </div>
  );
}
