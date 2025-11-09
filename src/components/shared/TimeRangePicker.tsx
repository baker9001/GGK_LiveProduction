import React, { useState } from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '../../lib/utils';

export type TimeRangePreset = '7d' | '30d' | '90d' | 'ytd' | 'custom';

export interface TimeRange {
  start: Date;
  end: Date;
  preset: TimeRangePreset;
}

interface TimeRangePickerProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
  className?: string;
}

const PRESETS: Array<{ value: TimeRangePreset; label: string }> = [
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: 'ytd', label: 'Year to Date' }
];

function getPresetRange(preset: TimeRangePreset): { start: Date; end: Date } {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  switch (preset) {
    case '7d':
      start.setDate(start.getDate() - 7);
      break;
    case '30d':
      start.setDate(start.getDate() - 30);
      break;
    case '90d':
      start.setDate(start.getDate() - 90);
      break;
    case 'ytd':
      start.setMonth(0, 1);
      break;
    default:
      break;
  }

  return { start, end };
}

export function TimeRangePicker({ value, onChange, className }: TimeRangePickerProps) {
  const [showCustom, setShowCustom] = useState(false);

  const handlePresetClick = (preset: TimeRangePreset) => {
    const range = getPresetRange(preset);
    onChange({ ...range, preset });
    setShowCustom(false);
  };

  const handleCustomClick = () => {
    setShowCustom(!showCustom);
  };

  const handleCustomDateChange = (field: 'start' | 'end', dateStr: string) => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return;

    onChange({
      ...value,
      [field]: date,
      preset: 'custom'
    });
  };

  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Time Range
      </label>

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            onClick={() => handlePresetClick(preset.value)}
            className={cn(
              'px-3 py-2 text-sm font-medium rounded-lg border transition-all duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8CC63F] focus-visible:ring-offset-1',
              value.preset === preset.value
                ? 'bg-gradient-to-r from-[#8CC63F] to-[#7AB635] text-white border-transparent shadow-md'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-[#8CC63F] hover:bg-gray-50 dark:hover:bg-gray-700'
            )}
          >
            {preset.label}
          </button>
        ))}

        <button
          type="button"
          onClick={handleCustomClick}
          className={cn(
            'px-3 py-2 text-sm font-medium rounded-lg border transition-all duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8CC63F] focus-visible:ring-offset-1',
            'inline-flex items-center gap-2',
            value.preset === 'custom'
              ? 'bg-gradient-to-r from-[#8CC63F] to-[#7AB635] text-white border-transparent shadow-md'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-[#8CC63F] hover:bg-gray-50 dark:hover:bg-gray-700'
          )}
        >
          <Calendar className="h-4 w-4" />
          Custom
        </button>
      </div>

      {showCustom && (
        <div className="flex flex-wrap gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex-1 min-w-[180px]">
            <label htmlFor="start-date" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Start Date
            </label>
            <input
              id="start-date"
              type="date"
              value={formatDate(value.start)}
              onChange={(e) => handleCustomDateChange('start', e.target.value)}
              max={formatDate(value.end)}
              className={cn(
                'w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600',
                'bg-white dark:bg-gray-900 text-gray-900 dark:text-white',
                'focus:outline-none focus:ring-2 focus:ring-[#8CC63F] focus:border-transparent',
                'transition-all duration-200'
              )}
            />
          </div>

          <div className="flex-1 min-w-[180px]">
            <label htmlFor="end-date" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              End Date
            </label>
            <input
              id="end-date"
              type="date"
              value={formatDate(value.end)}
              onChange={(e) => handleCustomDateChange('end', e.target.value)}
              min={formatDate(value.start)}
              max={formatDate(new Date())}
              className={cn(
                'w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600',
                'bg-white dark:bg-gray-900 text-gray-900 dark:text-white',
                'focus:outline-none focus:ring-2 focus:ring-[#8CC63F] focus:border-transparent',
                'transition-all duration-200'
              )}
            />
          </div>
        </div>
      )}
    </div>
  );
}
