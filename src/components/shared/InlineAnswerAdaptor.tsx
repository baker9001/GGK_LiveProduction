// src/components/shared/InlineAnswerAdaptor.tsx

import React from 'react';
import { Info, X, CheckCircle, AlertCircle, Undo } from 'lucide-react';
import Button from './Button';
import { cn } from '@/lib/utils';
import { CompatibilityCheck } from '../../services/answerFieldMigrationService';

interface InlineAnswerAdaptorProps {
  isVisible: boolean;
  formatChange?: {
    oldFormat: string | null;
    newFormat: string | null;
    compatibility: CompatibilityCheck;
  } | null;
  requirementChange?: {
    oldRequirement: string | null;
    newRequirement: string | null;
    compatibility: CompatibilityCheck;
  } | null;
  canUndo: boolean;
  onDismiss: () => void;
  onUndo: () => void;
  onReview?: () => void;
}

export function InlineAnswerAdaptor({
  isVisible,
  formatChange,
  requirementChange,
  canUndo,
  onDismiss,
  onUndo,
  onReview
}: InlineAnswerAdaptorProps) {
  if (!isVisible || (!formatChange && !requirementChange)) return null;

  const change = formatChange || requirementChange;
  const changeType = formatChange ? 'format' : 'requirement';
  const compatibility = change!.compatibility;

  const formatDisplay = (value: string | null) => {
    if (!value) return 'None';
    return value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getIcon = () => {
    if (!compatibility.isCompatible) {
      return <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />;
    }
    if (compatibility.warnings.length > 0) {
      return <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
    }
    return <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />;
  };

  const getBackgroundColor = () => {
    if (!compatibility.isCompatible) {
      return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
    }
    if (compatibility.warnings.length > 0) {
      return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    }
    return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
  };

  const getTitle = () => {
    if (!compatibility.isCompatible) {
      return `${changeType === 'format' ? 'Format' : 'Requirement'} Change Requires Action`;
    }
    if (compatibility.warnings.length > 0) {
      return `${changeType === 'format' ? 'Format' : 'Requirement'} Updated Successfully`;
    }
    return `${changeType === 'format' ? 'Format' : 'Requirement'} Changed`;
  };

  return (
    <div className={cn(
      "rounded-lg border p-4 mb-6 animate-in slide-in-from-top-2 duration-300",
      getBackgroundColor()
    )}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {getTitle()}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {formatChange && (
                  <>
                    {formatDisplay(formatChange.oldFormat)} → {formatDisplay(formatChange.newFormat)}
                  </>
                )}
                {requirementChange && (
                  <>
                    {formatDisplay(requirementChange.oldRequirement)} → {formatDisplay(requirementChange.newRequirement)}
                  </>
                )}
              </p>
            </div>
            <button
              onClick={onDismiss}
              className="flex-shrink-0 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {compatibility.warnings.length > 0 && (
            <ul className="text-xs text-gray-700 dark:text-gray-300 space-y-1 mb-3">
              {compatibility.warnings.map((warning, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-gray-400 dark:text-gray-500 mt-0.5">•</span>
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            {canUndo && (
              <Button
                size="sm"
                variant="outline"
                onClick={onUndo}
                className="text-xs"
              >
                <Undo className="h-3 w-3 mr-1" />
                Undo Change
              </Button>
            )}
            {onReview && compatibility.requiresConfirmation && (
              <Button
                size="sm"
                variant="primary"
                onClick={onReview}
                className="text-xs"
              >
                Review Changes
              </Button>
            )}
            {!compatibility.isCompatible && (
              <span className="text-xs text-yellow-700 dark:text-yellow-300 font-medium">
                Action Required
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
