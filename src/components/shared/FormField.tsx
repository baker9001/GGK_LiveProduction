/**
 * File: /src/components/shared/FormField.tsx
 * Updated to support green theme (#8CC63F) instead of blue
 */

import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Select as EnhancedSelect } from './Select';

interface FormFieldProps {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: React.ReactNode;
  description?: string;
  labelClassName?: string;
}

export function FormField({
  id,
  label,
  required = false,
  error,
  className,
  children,
  description,
  labelClassName,
}: FormFieldProps) {
  return (
    <div className={cn('mb-4', className)}>
      <label
        htmlFor={id}
        className={cn(
          'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1',
          labelClassName
        )}
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      {/* Render description only if provided, removing unnecessary space */}
      {description && (
        <div className="mb-1">
          <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
        </div>
      )}
      
      {children}
      
      {error && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  hideNativeCalendarIcon?: boolean;
}

export function Input({ className, error, leftIcon, rightIcon, hideNativeCalendarIcon, ...props }: InputProps) {
  return (
    <div className="relative">
      {leftIcon && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {leftIcon}
        </div>
      )}
      <input
        className={cn(
          'w-full px-3 py-2 border rounded-md shadow-sm text-sm transition-colors duration-200',
          'focus:outline-none focus:ring-2 focus:ring-[#8CC63F] focus:border-[#8CC63F]',
          '!bg-white dark:!bg-gray-800 text-gray-900 dark:text-gray-100',
          leftIcon && 'pl-10',
          rightIcon && 'pr-10',
          props.type === 'date' && rightIcon && 'date-input-with-icon',
          hideNativeCalendarIcon && 'hide-native-calendar-icon',
          props.disabled && '!bg-gray-100 dark:!bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed',
          error
            ? 'border-red-300 dark:border-red-600 placeholder-red-300 dark:placeholder-red-400'
            : 'border-gray-300 dark:border-gray-600 placeholder-gray-400 dark:placeholder-gray-500',
          className
        )}
        {...props}
      />
      {rightIcon && (
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          {rightIcon}
        </div>
      )}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
  options: Array<{ value: string; label: string }>;
  searchable?: boolean;
  usePortal?: boolean;
}

export function Select({ 
  className, 
  error, 
  options, 
  searchable = true, 
  value, 
  onChange, 
  disabled, 
  defaultValue, 
  usePortal = true,
  ...props 
}: SelectProps) {
  const handleChange = (newValue: string) => {
    if (onChange) {
      // Pass the string value directly to onChange
      onChange(newValue);
    }
  };

  return (
    <EnhancedSelect
      className={className}
      error={error}
      options={options}
      searchable={searchable}
      value={value as string}
      onChange={handleChange}
      disabled={disabled}
      defaultValue={defaultValue as string}
      usePortal={usePortal}
      {...props}
    />
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export function Textarea({ className, error, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        'w-full px-3 py-2 border rounded-md shadow-sm text-sm transition-colors duration-200',
        'focus:outline-none focus:ring-2 focus:ring-[#8CC63F] focus:border-[#8CC63F]',
        '!bg-white dark:!bg-gray-800 text-gray-900 dark:text-gray-100',
        props.disabled && '!bg-gray-100 dark:!bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed',
        error
          ? 'border-red-300 dark:border-red-600 placeholder-red-300 dark:placeholder-red-400'
          : 'border-gray-300 dark:border-gray-600 placeholder-gray-400 dark:placeholder-gray-500',
        className
      )}
      {...props}
    />
  );
}