'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Clock,
  Users,
  MapPin,
  Calendar,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Loader2,
} from 'lucide-react';
import { Button } from '../../../../components/shared/Button';
import type { Conflict, Warning } from '../../../../services/calendarConflictService';
import dayjs from 'dayjs';

interface ConflictDetectionPanelProps {
  conflicts: Conflict[];
  warnings: Warning[];
  isChecking: boolean;
  onCheckAgain?: () => void;
  onViewAlternatives?: () => void;
  className?: string;
}

export function ConflictDetectionPanel({
  conflicts,
  warnings,
  isChecking,
  onCheckAgain,
  onViewAlternatives,
  className = '',
}: ConflictDetectionPanelProps) {
  const [expandedConflicts, setExpandedConflicts] = useState<Set<number>>(new Set());
  const [expandedWarnings, setExpandedWarnings] = useState<Set<number>>(new Set());

  const toggleConflict = (index: number) => {
    const newSet = new Set(expandedConflicts);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setExpandedConflicts(newSet);
  };

  const toggleWarning = (index: number) => {
    const newSet = new Set(expandedWarnings);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setExpandedWarnings(newSet);
  };

  const getConflictIcon = (type: Conflict['type']) => {
    switch (type) {
      case 'exam_overlap':
        return Calendar;
      case 'teacher_busy':
        return Users;
      case 'venue_busy':
        return MapPin;
      case 'holiday':
        return Clock;
      default:
        return AlertCircle;
    }
  };

  const getSeverityColor = (severity: Conflict['severity']) => {
    switch (severity) {
      case 'critical':
        return {
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-800',
          icon: 'text-red-600 dark:text-red-400',
          text: 'text-red-700 dark:text-red-300',
        };
      case 'high':
        return {
          bg: 'bg-orange-50 dark:bg-orange-900/20',
          border: 'border-orange-200 dark:border-orange-800',
          icon: 'text-orange-600 dark:text-orange-400',
          text: 'text-orange-700 dark:text-orange-300',
        };
      case 'medium':
        return {
          bg: 'bg-amber-50 dark:bg-amber-900/20',
          border: 'border-amber-200 dark:border-amber-800',
          icon: 'text-amber-600 dark:text-amber-400',
          text: 'text-amber-700 dark:text-amber-300',
        };
    }
  };

  const hasConflicts = conflicts.length > 0;
  const hasWarnings = warnings.length > 0;
  const criticalConflicts = conflicts.filter((c) => c.severity === 'critical');

  if (isChecking) {
    return (
      <div className={`p-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 ${className}`}>
        <div className="flex items-center justify-center gap-3">
          <Loader2 className="w-5 h-5 text-[#8CC63F] animate-spin" />
          <span className="text-sm text-gray-600 dark:text-gray-400">Checking for conflicts...</span>
        </div>
      </div>
    );
  }

  if (!hasConflicts && !hasWarnings) {
    return (
      <div className={`p-6 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 ${className}`}>
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-green-700 dark:text-green-300 mb-1">
              No conflicts detected
            </h4>
            <p className="text-sm text-green-600 dark:text-green-400">
              This time slot is available for scheduling.
            </p>
          </div>
          {onCheckAgain && (
            <Button variant="ghost" size="sm" onClick={onCheckAgain}>
              Check again
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Summary */}
      <div className={`
        p-4 rounded-lg border
        ${hasConflicts
          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
        }
      `}>
        <div className="flex items-start gap-3">
          {hasConflicts ? (
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          ) : (
            <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <h4 className={`text-sm font-semibold mb-1 ${hasConflicts ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300'}`}>
              {hasConflicts
                ? `${conflicts.length} conflict${conflicts.length !== 1 ? 's' : ''} detected`
                : `${warnings.length} warning${warnings.length !== 1 ? 's' : ''}`
              }
            </h4>
            <p className={`text-sm ${hasConflicts ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {criticalConflicts.length > 0
                ? `${criticalConflicts.length} critical conflict${criticalConflicts.length !== 1 ? 's' : ''} must be resolved before scheduling.`
                : hasConflicts
                ? 'Review conflicts below and adjust your scheduling.'
                : 'Review warnings below for scheduling recommendations.'
              }
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onViewAlternatives && hasConflicts && (
              <Button variant="outline" size="sm" leftIcon={<Lightbulb className="w-3.5 h-3.5" />} onClick={onViewAlternatives}>
                Suggest times
              </Button>
            )}
            {onCheckAgain && (
              <Button variant="ghost" size="sm" onClick={onCheckAgain}>
                Refresh
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Conflicts */}
      {conflicts.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-sm font-semibold text-gray-900 dark:text-white">Conflicts</h5>
          {conflicts.map((conflict, index) => {
            const Icon = getConflictIcon(conflict.type);
            const colors = getSeverityColor(conflict.severity);
            const isExpanded = expandedConflicts.has(index);

            return (
              <div
                key={index}
                className={`rounded-lg border ${colors.bg} ${colors.border}`}
              >
                <button
                  onClick={() => toggleConflict(index)}
                  className="w-full p-4 text-left flex items-start gap-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <Icon className={`w-5 h-5 ${colors.icon} flex-shrink-0 mt-0.5`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium uppercase ${colors.bg} ${colors.text}`}>
                        {conflict.severity}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {conflict.type.replace('_', ' ')}
                      </span>
                    </div>
                    <p className={`text-sm font-medium ${colors.text}`}>
                      {conflict.message}
                    </p>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  )}
                </button>

                {isExpanded && conflict.details && (
                  <div className="px-4 pb-4 pl-12 border-t border-black/10 dark:border-white/10 pt-3">
                    <dl className="space-y-2 text-sm">
                      {Object.entries(conflict.details).map(([key, value]) => {
                        if (key === 'examStart' || key === 'examEnd') {
                          return (
                            <div key={key} className="flex gap-2">
                              <dt className={`font-medium ${colors.text} capitalize`}>
                                {key.replace(/([A-Z])/g, ' $1').trim()}:
                              </dt>
                              <dd className={colors.text}>{value as string}</dd>
                            </div>
                          );
                        }
                        if (Array.isArray(value)) {
                          return (
                            <div key={key} className="flex gap-2">
                              <dt className={`font-medium ${colors.text} capitalize`}>
                                {key.replace(/([A-Z])/g, ' $1').trim()}:
                              </dt>
                              <dd className={colors.text}>{value.length} items</dd>
                            </div>
                          );
                        }
                        if (typeof value === 'string' && !key.toLowerCase().includes('id')) {
                          return (
                            <div key={key} className="flex gap-2">
                              <dt className={`font-medium ${colors.text} capitalize`}>
                                {key.replace(/([A-Z])/g, ' $1').trim()}:
                              </dt>
                              <dd className={colors.text}>{value}</dd>
                            </div>
                          );
                        }
                        return null;
                      })}
                    </dl>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-sm font-semibold text-gray-900 dark:text-white">Recommendations</h5>
          {warnings.map((warning, index) => {
            const isExpanded = expandedWarnings.has(index);

            return (
              <div
                key={index}
                className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20"
              >
                <button
                  onClick={() => toggleWarning(index)}
                  className="w-full p-4 text-left flex items-start gap-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                      {warning.message}
                    </p>
                  </div>
                  {warning.suggestion && (
                    isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    )
                  )}
                </button>

                {isExpanded && warning.suggestion && (
                  <div className="px-4 pb-4 pl-12 border-t border-amber-200/50 dark:border-amber-800/50 pt-3">
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      <span className="font-medium">Suggestion:</span> {warning.suggestion}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
