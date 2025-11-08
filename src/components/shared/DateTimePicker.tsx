import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Clock, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import dayjs from 'dayjs';

interface DateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
  placeholder?: string;
  minDate?: string;
  usePortal?: boolean;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function DateTimePicker({
  value,
  onChange,
  disabled = false,
  error = false,
  placeholder = 'Select date and time',
  minDate,
  usePortal = true
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'date' | 'time'>('date');
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(
    value ? dayjs(value) : null
  );
  const [viewMonth, setViewMonth] = useState(
    value ? dayjs(value) : dayjs()
  );
  const [selectedHour, setSelectedHour] = useState(
    value ? dayjs(value).hour() : 9
  );
  const [selectedMinute, setSelectedMinute] = useState(
    value ? dayjs(value).minute() : 0
  );
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });

  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  };

  const handleOpen = () => {
    if (disabled) return;
    updatePosition();
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const handleScroll = () => updatePosition();
      const handleResize = () => updatePosition();

      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isOpen]);

  const getDaysInMonth = () => {
    const startOfMonth = viewMonth.startOf('month');
    const endOfMonth = viewMonth.endOf('month');
    const startDay = startOfMonth.day();
    const daysInMonth = endOfMonth.date();

    const days: (dayjs.Dayjs | null)[] = [];

    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(viewMonth.date(i));
    }

    return days;
  };

  const handleDateSelect = (date: dayjs.Dayjs) => {
    setSelectedDate(date);
    setActiveTab('time');
  };

  const handleApply = () => {
    if (selectedDate) {
      const combined = selectedDate
        .hour(selectedHour)
        .minute(selectedMinute)
        .second(0);
      onChange(combined.format('YYYY-MM-DDTHH:mm'));
      handleClose();
    }
  };

  const handleToday = () => {
    const now = dayjs();
    setSelectedDate(now);
    setViewMonth(now);
    setSelectedHour(now.hour());
    setSelectedMinute(now.minute());
  };

  const handleClear = () => {
    setSelectedDate(null);
    onChange('');
    handleClose();
  };

  const isDateDisabled = (date: dayjs.Dayjs) => {
    if (!minDate) return false;
    return date.isBefore(dayjs(minDate), 'day');
  };

  const isToday = (date: dayjs.Dayjs) => {
    return date.isSame(dayjs(), 'day');
  };

  const isSelected = (date: dayjs.Dayjs) => {
    return selectedDate ? date.isSame(selectedDate, 'day') : false;
  };

  const formatDisplayValue = () => {
    if (!selectedDate) return '';
    return selectedDate
      .hour(selectedHour)
      .minute(selectedMinute)
      .format('DD/MM/YYYY HH:mm');
  };

  const renderCalendar = () => (
    <div className="p-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => setViewMonth(viewMonth.subtract(1, 'month'))}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
        <div className="text-sm font-semibold text-gray-900 dark:text-white">
          {MONTHS[viewMonth.month()]} {viewMonth.year()}
        </div>
        <button
          type="button"
          onClick={() => setViewMonth(viewMonth.add(1, 'month'))}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAYS.map(day => (
          <div
            key={day}
            className="text-xs font-medium text-gray-500 dark:text-gray-400 text-center py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {getDaysInMonth().map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} className="aspect-square" />;
          }

          const disabled = isDateDisabled(date);
          const today = isToday(date);
          const selected = isSelected(date);

          return (
            <button
              key={date.format('YYYY-MM-DD')}
              type="button"
              disabled={disabled}
              onClick={() => handleDateSelect(date)}
              className={cn(
                'aspect-square rounded-lg text-sm font-medium transition-all',
                'hover:bg-[#8CC63F]/10 focus:outline-none focus:ring-2 focus:ring-[#8CC63F]',
                disabled && 'text-gray-300 dark:text-gray-600 cursor-not-allowed hover:bg-transparent',
                today && !selected && 'border-2 border-[#8CC63F] text-[#8CC63F]',
                selected && 'bg-[#8CC63F] text-white hover:bg-[#7AB635]',
                !selected && !today && !disabled && 'text-gray-700 dark:text-gray-300'
              )}
            >
              {date.date()}
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderTimePicker = () => (
    <div className="p-4">
      <div className="text-sm font-semibold text-gray-900 dark:text-white mb-4 text-center">
        {selectedDate ? selectedDate.format('dddd, MMMM D, YYYY') : 'Select time'}
      </div>

      <div className="flex items-center justify-center gap-4">
        {/* Hour Picker */}
        <div className="flex flex-col items-center">
          <label className="text-xs text-gray-500 dark:text-gray-400 mb-2">Hour</label>
          <div className="flex flex-col items-center bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
            <button
              type="button"
              onClick={() => setSelectedHour((selectedHour + 1) % 24)}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            >
              <ChevronRight className="w-4 h-4 rotate-[-90deg] text-gray-600 dark:text-gray-400" />
            </button>
            <div className="py-3 px-4 text-2xl font-bold text-[#8CC63F] min-w-[60px] text-center">
              {selectedHour.toString().padStart(2, '0')}
            </div>
            <button
              type="button"
              onClick={() => setSelectedHour((selectedHour - 1 + 24) % 24)}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            >
              <ChevronRight className="w-4 h-4 rotate-90 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        <div className="text-2xl font-bold text-gray-400 mt-6">:</div>

        {/* Minute Picker */}
        <div className="flex flex-col items-center">
          <label className="text-xs text-gray-500 dark:text-gray-400 mb-2">Minute</label>
          <div className="flex flex-col items-center bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
            <button
              type="button"
              onClick={() => setSelectedMinute((selectedMinute + 15) % 60)}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            >
              <ChevronRight className="w-4 h-4 rotate-[-90deg] text-gray-600 dark:text-gray-400" />
            </button>
            <div className="py-3 px-4 text-2xl font-bold text-[#8CC63F] min-w-[60px] text-center">
              {selectedMinute.toString().padStart(2, '0')}
            </div>
            <button
              type="button"
              onClick={() => setSelectedMinute((selectedMinute - 15 + 60) % 60)}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            >
              <ChevronRight className="w-4 h-4 rotate-90 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Time Selection */}
      <div className="mt-4 grid grid-cols-4 gap-2">
        {[
          { label: '09:00', hour: 9, minute: 0 },
          { label: '10:00', hour: 10, minute: 0 },
          { label: '13:00', hour: 13, minute: 0 },
          { label: '14:00', hour: 14, minute: 0 },
        ].map(time => (
          <button
            key={time.label}
            type="button"
            onClick={() => {
              setSelectedHour(time.hour);
              setSelectedMinute(time.minute);
            }}
            className={cn(
              'px-3 py-2 text-xs font-medium rounded-lg transition-colors',
              'border border-gray-200 dark:border-gray-700',
              selectedHour === time.hour && selectedMinute === time.minute
                ? 'bg-[#8CC63F] text-white border-[#8CC63F]'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-[#8CC63F]'
            )}
          >
            {time.label}
          </button>
        ))}
      </div>
    </div>
  );

  const renderDropdown = () => {
    if (!isOpen) return null;

    const dropdownContent = (
      <div
        ref={dropdownRef}
        className="z-[150] rounded-lg border border-theme shadow-xl dark:shadow-gray-900/40 overflow-hidden bg-card"
        style={
          usePortal
            ? {
                position: 'absolute',
                top: `${position.top}px`,
                left: `${position.left}px`,
                width: '360px',
                zIndex: 150,
              }
            : {
                position: 'absolute',
                top: '100%',
                left: 0,
                width: '360px',
                zIndex: 150,
                marginTop: '4px',
              }
        }
      >
        {/* Tabs */}
        <div className="flex border-b border-theme bg-card">
          <button
            type="button"
            onClick={() => setActiveTab('date')}
            className={cn(
              'flex-1 px-4 py-3 text-sm font-medium transition-colors',
              'flex items-center justify-center gap-2',
              activeTab === 'date'
                ? 'text-[#8CC63F] border-b-2 border-[#8CC63F] bg-[#8CC63F]/5'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700/50'
            )}
          >
            <Calendar className="w-4 h-4" />
            Date
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('time')}
            disabled={!selectedDate}
            className={cn(
              'flex-1 px-4 py-3 text-sm font-medium transition-colors',
              'flex items-center justify-center gap-2',
              !selectedDate && 'opacity-50 cursor-not-allowed',
              activeTab === 'time'
                ? 'text-[#8CC63F] border-b-2 border-[#8CC63F] bg-[#8CC63F]/5'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700/50'
            )}
          >
            <Clock className="w-4 h-4" />
            Time
          </button>
        </div>

        {/* Content */}
        <div className="min-h-[320px]">
          {activeTab === 'date' ? renderCalendar() : renderTimePicker()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-theme bg-card-elevated">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleToday}
              className="px-3 py-1.5 text-xs font-medium text-[#8CC63F] hover:bg-[#8CC63F]/10 rounded-md transition-colors"
            >
              Today
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
            >
              Clear
            </button>
          </div>
          <button
            type="button"
            onClick={handleApply}
            disabled={!selectedDate}
            className={cn(
              'px-4 py-1.5 text-xs font-medium rounded-md transition-all',
              selectedDate
                ? 'bg-[#8CC63F] text-white hover:bg-[#7AB635] shadow-sm'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
            )}
          >
            Apply
          </button>
        </div>
      </div>
    );

    return usePortal ? createPortal(dropdownContent, document.body) : dropdownContent;
  };

  return (
    <div className="relative">
      <div
        ref={triggerRef}
        onClick={handleOpen}
        className={cn(
          'w-full px-3 py-2 border rounded-md shadow-sm text-sm transition-colors duration-200 cursor-pointer',
          'flex items-center justify-between',
          'focus-within:outline-none focus-within:ring-2 focus-within:ring-[#8CC63F] focus-within:border-[#8CC63F]',
          'bg-theme-surface',
          disabled && 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed opacity-60',
          error
            ? 'border-red-300 dark:border-red-600'
            : 'border-gray-300 dark:border-gray-600',
          isOpen && 'ring-2 ring-[#8CC63F] border-[#8CC63F]'
        )}
      >
        <div className="flex items-center gap-2 flex-1">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span className={cn(
            'text-sm',
            formatDisplayValue()
              ? 'text-gray-900 dark:text-white'
              : 'text-gray-400 dark:text-gray-500'
          )}>
            {formatDisplayValue() || placeholder}
          </span>
        </div>
        {formatDisplayValue() && !disabled && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <X className="w-3.5 h-3.5 text-gray-400" />
          </button>
        )}
      </div>

      {renderDropdown()}
    </div>
  );
}
