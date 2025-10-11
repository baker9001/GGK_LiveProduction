// src/app/system-admin/learning/practice-management/questions-setup/components/EditableField.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Edit, Save, X, Check, ChevronDown, Trash2 } from 'lucide-react';
import { Button } from '../../../../../../components/shared/Button';
import { cn } from '../../../../../../lib/utils';
import { toast } from '../../../../../../components/shared/Toast';

interface EditableFieldProps {
  value: any;
  onSave: (value: any) => void;
  type?: 'text' | 'number' | 'textarea' | 'select' | 'multiselect';
  options?: { value: string; label: string }[];
  placeholder?: string;
  displayValue?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  rows?: number;
}

export function EditableField({
  value,
  onSave,
  type = 'text',
  options = [],
  placeholder = 'Click to edit...',
  displayValue,
  className,
  disabled = false,
  required = false,
  min,
  max,
  minLength,
  maxLength,
  rows = 3
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (type === 'multiselect' && Array.isArray(value)) {
      setSelectedValues(value);
    }
  }, [value, type]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if ('select' in inputRef.current) {
        inputRef.current.select();
      }
    }
  }, [isEditing]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSave = async () => {
    if (type === 'multiselect') {
      if (required && selectedValues.length === 0) {
        toast.error('Please select at least one option');
        return;
      }
      try {
        await onSave(selectedValues);
        setIsEditing(false);
        setShowDropdown(false);
        toast.success('Updated successfully');
      } catch (error) {
        console.error('Error saving:', error);
        toast.error('Failed to update');
      }
      return;
    }

    // Validation
    if (required && !editValue) {
      toast.error('This field is required');
      return;
    }

    if (type === 'number') {
      const numValue = Number(editValue);
      if (min !== undefined && numValue < min) {
        toast.error(`Value must be at least ${min}`);
        return;
      }
      if (max !== undefined && numValue > max) {
        toast.error(`Value must be at most ${max}`);
        return;
      }
    }

    if (type === 'text' || type === 'textarea') {
      const strValue = String(editValue);
      if (minLength !== undefined && strValue.length < minLength) {
        toast.error(`Must be at least ${minLength} characters`);
        return;
      }
      if (maxLength !== undefined && strValue.length > maxLength) {
        toast.error(`Must be at most ${maxLength} characters`);
        return;
      }
    }

    try {
      await onSave(editValue);
      setIsEditing(false);
      toast.success('Updated successfully');
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Failed to update');
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setSelectedValues(Array.isArray(value) ? value : []);
    setIsEditing(false);
    setShowDropdown(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && type !== 'textarea') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const toggleSelection = (optionValue: string) => {
    setSelectedValues(prev => {
      if (prev.includes(optionValue)) {
        return prev.filter(v => v !== optionValue);
      } else {
        return [...prev, optionValue];
      }
    });
  };

  const getSelectedLabels = () => {
    return options
      .filter(opt => selectedValues.includes(opt.value))
      .map(opt => opt.label)
      .join(', ');
  };

  if (isEditing && !disabled) {
    if (type === 'multiselect') {
      return (
        <div className="relative" ref={dropdownRef}>
          <div
            className={cn(
              "flex items-center justify-between px-3 py-2 rounded-lg border cursor-pointer",
              "bg-white dark:bg-gray-800 border-[#99C93B] dark:border-blue-400",
              className
            )}
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <span className={cn(
              "text-sm",
              selectedValues.length > 0 ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"
            )}>
              {selectedValues.length > 0 ? getSelectedLabels() : placeholder}
            </span>
            <ChevronDown className={cn(
              "h-4 w-4 transition-transform",
              showDropdown && "rotate-180"
            )} />
          </div>

          {showDropdown && (
            <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-auto">
              {options.map(option => (
                <div
                  key={option.value}
                  className={cn(
                    "flex items-center px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer",
                    selectedValues.includes(option.value) && "bg-[#E8F5DC] dark:bg-[#5D7E23]/20"
                  )}
                  onClick={() => toggleSelection(option.value)}
                >
                  <div className={cn(
                    "w-4 h-4 border rounded mr-3 flex items-center justify-center",
                    selectedValues.includes(option.value)
                      ? "bg-[#99C93B] border-[#99C93B]"
                      : "border-gray-300 dark:border-gray-600"
                  )}>
                    {selectedValues.includes(option.value) && (
                      <Check className="h-3 w-3 text-white" />
                    )}
                  </div>
                  <span className="text-sm text-gray-900 dark:text-white">
                    {option.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center space-x-2 mt-2">
            <Button
              size="sm"
              variant="primary"
              onClick={handleSave}
              leftIcon={<Save className="h-3 w-3" />}
            >
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancel}
              leftIcon={<X className="h-3 w-3" />}
            >
              Cancel
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-2">
        {type === 'textarea' ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={rows}
            className={cn(
              "flex-1 px-3 py-2 rounded-lg border resize-none",
              "border-[#99C93B] dark:border-blue-400",
              "bg-white dark:bg-gray-800",
              "text-gray-900 dark:text-white",
              "focus:outline-none focus:ring-2 focus:ring-[#99C93B]",
              className
            )}
          />
        ) : type === 'select' ? (
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className={cn(
              "flex-1 px-3 py-2 rounded-lg border",
              "border-[#99C93B] dark:border-blue-400",
              "bg-white dark:bg-gray-800",
              "text-gray-900 dark:text-white",
              "focus:outline-none focus:ring-2 focus:ring-[#99C93B]",
              className
            )}
          >
            <option value="">{placeholder}</option>
            {options.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type={type}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            min={min}
            max={max}
            className={cn(
              "flex-1 px-3 py-2 rounded-lg border",
              "border-[#99C93B] dark:border-blue-400",
              "bg-white dark:bg-gray-800",
              "text-gray-900 dark:text-white",
              "focus:outline-none focus:ring-2 focus:ring-[#99C93B]",
              className
            )}
          />
        )}
        <Button
          size="sm"
          variant="primary"
          onClick={handleSave}
          leftIcon={<Save className="h-3 w-3" />}
        >
          Save
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCancel}
          leftIcon={<X className="h-3 w-3" />}
        >
          Cancel
        </Button>
      </div>
    );
  }

  // Display mode
  const displayContent = displayValue || (
    type === 'multiselect' 
      ? (Array.isArray(value) && value.length > 0 
          ? options.filter(opt => value.includes(opt.value)).map(opt => opt.label).join(', ') 
          : placeholder)
      : (value || placeholder)
  );

  return (
    <div
      className={cn(
        "group relative inline-flex items-center",
        !disabled && "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg transition-colors",
        className
      )}
      onClick={() => !disabled && setIsEditing(true)}
    >
      <span className={cn(
        "text-gray-900 dark:text-white",
        !value && "text-gray-500 dark:text-gray-400 italic"
      )}>
        {displayContent}
      </span>
      {!disabled && (
        <Edit className="ml-2 h-3 w-3 text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </div>
  );
}

// EditableOption Component for MCQ options
interface EditableOptionProps {
  option: {
    id: string;
    label: string;
    text: string;
    is_correct: boolean;
  };
  index: number;
  onUpdateText: (text: string) => void;
  onToggleCorrect: () => void;
  onDelete: () => void;
  disabled?: boolean;
  showDelete?: boolean;
}

export function EditableOption({
  option,
  index,
  onUpdateText,
  onToggleCorrect,
  onDelete,
  disabled = false,
  showDelete = true
}: EditableOptionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(option.text);

  const handleSave = () => {
    onUpdateText(editText);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditText(option.text);
    setIsEditing(false);
  };

  return (
    <div className={cn(
      "flex items-center space-x-3 p-3 rounded-lg border bg-white dark:bg-gray-800",
      option.is_correct 
        ? "border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/20" 
        : "border-gray-200 dark:border-gray-600"
    )}>
      <div className="flex items-center justify-center w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full font-semibold text-sm">
        {option.label}
      </div>
      
      {isEditing && !disabled ? (
        <div className="flex-1 flex items-center space-x-2">
          <input
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="flex-1 px-3 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            autoFocus
          />
          <Button size="sm" variant="primary" onClick={handleSave}>
            <Save className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" onClick={handleCancel}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div
          className={cn(
            "flex-1",
            !disabled && "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded px-2 py-1 -mx-2 -my-1"
          )}
          onClick={() => !disabled && setIsEditing(true)}
        >
          <span className="text-gray-900 dark:text-white">{option.text}</span>
        </div>
      )}
      
      {!disabled && (
        <div className="flex items-center space-x-2">
          <button
            onClick={onToggleCorrect}
            className={cn(
              "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
              option.is_correct
                ? "bg-green-500 border-green-500"
                : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:border-green-500"
            )}
          >
            {option.is_correct && <Check className="h-3 w-3 text-white" />}
          </button>
          
          {showDelete && (
            <button
              onClick={onDelete}
              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}