'use client';

import React, { useMemo } from 'react';
import {
  Check,
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  ChevronRight,
  Lock,
} from 'lucide-react';
import dayjs from 'dayjs';

export interface TimelineStage {
  id: string;
  label: string;
  description?: string;
  status: 'completed' | 'current' | 'upcoming' | 'locked' | 'skipped';
  completedAt?: string | null;
  completedBy?: string | null;
  requirements?: string[];
  isOptional?: boolean;
  estimatedDuration?: string;
}

interface StatusTimelineProps {
  stages: TimelineStage[];
  onStageClick?: (stageId: string) => void;
  orientation?: 'horizontal' | 'vertical';
  showDetails?: boolean;
  compact?: boolean;
  className?: string;
}

export function StatusTimeline({
  stages,
  onStageClick,
  orientation = 'horizontal',
  showDetails = true,
  compact = false,
  className = '',
}: StatusTimelineProps) {
  const completedCount = useMemo(() => {
    return stages.filter((s) => s.status === 'completed').length;
  }, [stages]);

  const currentStage = useMemo(() => {
    return stages.find((s) => s.status === 'current');
  }, [stages]);

  const completionPercentage = useMemo(() => {
    return Math.round((completedCount / stages.length) * 100);
  }, [completedCount, stages.length]);

  const getStageIcon = (stage: TimelineStage) => {
    switch (stage.status) {
      case 'completed':
        return <CheckCircle2 className="w-full h-full text-white" />;
      case 'current':
        return <Circle className="w-full h-full text-white fill-current" />;
      case 'skipped':
        return <AlertCircle className="w-full h-full text-white" />;
      case 'locked':
        return <Lock className="w-full h-full text-gray-400" />;
      default:
        return <Circle className="w-full h-full text-gray-400" />;
    }
  };

  const getStageColors = (stage: TimelineStage) => {
    switch (stage.status) {
      case 'completed':
        return {
          bg: 'bg-green-500',
          border: 'border-green-500',
          text: 'text-green-700 dark:text-green-400',
          line: 'bg-green-500',
        };
      case 'current':
        return {
          bg: 'bg-[#8CC63F]',
          border: 'border-[#8CC63F]',
          text: 'text-[#7AB635] dark:text-[#8CC63F]',
          line: 'bg-gray-300 dark:bg-gray-600',
        };
      case 'skipped':
        return {
          bg: 'bg-amber-500',
          border: 'border-amber-500',
          text: 'text-amber-700 dark:text-amber-400',
          line: 'bg-gray-300 dark:bg-gray-600',
        };
      case 'locked':
        return {
          bg: 'bg-gray-300 dark:bg-gray-700',
          border: 'border-gray-300 dark:border-gray-700',
          text: 'text-gray-500 dark:text-gray-400',
          line: 'bg-gray-300 dark:bg-gray-600',
        };
      default:
        return {
          bg: 'bg-gray-200 dark:bg-gray-700',
          border: 'border-gray-300 dark:border-gray-600',
          text: 'text-gray-600 dark:text-gray-400',
          line: 'bg-gray-300 dark:bg-gray-600',
        };
    }
  };

  const isStageClickable = (stage: TimelineStage) => {
    return (
      onStageClick &&
      (stage.status === 'completed' || stage.status === 'current')
    );
  };

  if (orientation === 'vertical') {
    return (
      <div className={`space-y-4 ${className}`}>
        {/* Progress summary */}
        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Overall Progress
            </span>
            <span className="text-sm font-semibold text-[#8CC63F]">
              {completionPercentage}%
            </span>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#8CC63F] to-[#7AB635] transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
            {completedCount} of {stages.length} stages completed
          </div>
        </div>

        {/* Vertical timeline */}
        <div className="relative">
          {stages.map((stage, index) => {
            const colors = getStageColors(stage);
            const isClickable = isStageClickable(stage);
            const isLast = index === stages.length - 1;

            return (
              <div key={stage.id} className="relative">
                {/* Connection line */}
                {!isLast && (
                  <div
                    className={`absolute left-6 top-12 w-0.5 h-full ${colors.line}`}
                    style={{ height: 'calc(100% - 3rem)' }}
                  />
                )}

                {/* Stage item */}
                <div className="flex gap-4 pb-8">
                  {/* Icon */}
                  <button
                    onClick={() => isClickable && onStageClick(stage.id)}
                    disabled={!isClickable}
                    className={`
                      relative z-10 flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center
                      ${colors.bg} ${colors.border} border-2
                      ${isClickable ? 'cursor-pointer hover:scale-110' : 'cursor-default'}
                      transition-transform duration-200
                    `}
                  >
                    <div className="w-6 h-6">{getStageIcon(stage)}</div>
                  </button>

                  {/* Content */}
                  <div className="flex-1 pt-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4 className={`text-base font-semibold ${colors.text} mb-1`}>
                          {stage.label}
                          {stage.isOptional && (
                            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                              Optional
                            </span>
                          )}
                        </h4>
                        {stage.description && !compact && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {stage.description}
                          </p>
                        )}

                        {/* Completion details */}
                        {stage.completedAt && (
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-2">
                            <Clock className="w-3.5 h-3.5" />
                            <span>
                              Completed {dayjs(stage.completedAt).format('DD MMM YYYY, HH:mm')}
                            </span>
                            {stage.completedBy && (
                              <>
                                <span>•</span>
                                <span>{stage.completedBy}</span>
                              </>
                            )}
                          </div>
                        )}

                        {/* Requirements */}
                        {showDetails &&
                          !compact &&
                          stage.requirements &&
                          stage.requirements.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {stage.requirements.map((req, i) => (
                                <div
                                  key={i}
                                  className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400"
                                >
                                  <Check className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                                  <span>{req}</span>
                                </div>
                              ))}
                            </div>
                          )}

                        {/* Estimated duration */}
                        {stage.estimatedDuration && stage.status === 'current' && (
                          <div className="mt-2 inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                            <Clock className="w-3.5 h-3.5" />
                            Est. {stage.estimatedDuration}
                          </div>
                        )}
                      </div>

                      {isClickable && (
                        <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-600 flex-shrink-0 mt-1" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Horizontal orientation
  return (
    <div className={`${className}`}>
      {/* Progress summary */}
      <div className="mb-6 p-4 rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            {currentStage ? `Current: ${currentStage.label}` : 'All Stages Completed'}
          </span>
          <span className="text-sm font-semibold text-[#8CC63F]">
            {completionPercentage}% Complete
          </span>
        </div>
        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#8CC63F] to-[#7AB635] transition-all duration-300"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      {/* Horizontal timeline */}
      <div className="relative overflow-x-auto pb-4">
        <div className="flex items-start gap-4 min-w-max px-4">
          {stages.map((stage, index) => {
            const colors = getStageColors(stage);
            const isClickable = isStageClickable(stage);
            const isLast = index === stages.length - 1;

            return (
              <React.Fragment key={stage.id}>
                {/* Stage item */}
                <div className="flex flex-col items-center" style={{ minWidth: compact ? '120px' : '180px' }}>
                  <button
                    onClick={() => isClickable && onStageClick(stage.id)}
                    disabled={!isClickable}
                    className={`
                      relative w-12 h-12 rounded-full flex items-center justify-center mb-3
                      ${colors.bg} ${colors.border} border-2
                      ${isClickable ? 'cursor-pointer hover:scale-110' : 'cursor-default'}
                      transition-transform duration-200
                    `}
                  >
                    <div className="w-6 h-6">{getStageIcon(stage)}</div>
                  </button>

                  <h4 className={`text-sm font-semibold text-center ${colors.text} mb-1`}>
                    {stage.label}
                  </h4>

                  {!compact && stage.description && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 text-center mb-2">
                      {stage.description}
                    </p>
                  )}

                  {stage.completedAt && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                      {dayjs(stage.completedAt).format('DD MMM')}
                    </div>
                  )}

                  {stage.estimatedDuration && stage.status === 'current' && (
                    <div className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                      {stage.estimatedDuration}
                    </div>
                  )}
                </div>

                {/* Connection line */}
                {!isLast && (
                  <div className="flex items-center pt-6" style={{ width: compact ? '60px' : '80px' }}>
                    <div className={`w-full h-0.5 ${colors.line}`} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Current stage details */}
      {showDetails && currentStage && !compact && (
        <div className="mt-6 p-4 rounded-lg bg-[#8CC63F]/5 border border-[#8CC63F]/20">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
            Current Stage: {currentStage.label}
          </h4>
          {currentStage.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {currentStage.description}
            </p>
          )}
          {currentStage.requirements && currentStage.requirements.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Requirements:
              </p>
              {currentStage.requirements.map((req, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Check className="w-4 h-4 text-[#8CC63F] mt-0.5 flex-shrink-0" />
                  <span>{req}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
