import React, { useState } from 'react';
import { z } from 'zod';
import { Save, X, Edit2 } from 'lucide-react';
import { Button } from './Button';
import { Input } from './FormField';
import { Select } from './Select';
import { Textarea } from './FormField';
import { cn } from '../../lib/utils';

interface EditableFieldProps {
  value: string | number;
  onSave: (value: string | number) => void;
  onCancel: () => void;
  validationSchema?: z.ZodType<any>;
  isLoading?: boolean;
  className?: string;
  placeholder?: string;
}

export function EditableTextarea({
  value,
  onSave,
  onCancel,
  validationSchema,
  isLoading = false,
  className,
  placeholder = 'Enter text...'
}: EditableFieldProps) {
  const [editValue, setEditValue] = useState(value);
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    if (validationSchema) {
      try {
        validationSchema.parse(editValue);
        setError(null);
      } catch (err) {
        if (err instanceof z.ZodError) {
          setError(err.errors[0].message);
          return;
        }
      }
    }
    onSave(editValue);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Textarea
        value={editValue}
        onChange={(e) => {
          setEditValue(e.target.value);
          setError(null);
        }}
        placeholder={placeholder}
        rows={3}
        className="w-full"
        autoFocus
      />
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
      <div className="flex justify-end space-x-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          <X className="h-3 w-3 mr-1" /> Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={isLoading || !!error}
        >
          {isLoading ? (
            <span className="flex items-center">
              <span className="h-3 w-3 mr-1 rounded-full border-2 border-t-transparent border-white animate-spin" />
              Saving...
            </span>
          ) : (
            <>
              <Save className="h-3 w-3 mr-1" /> Save
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export function EditableInput({
  value,
  onSave,
  onCancel,
  validationSchema,
  isLoading = false,
  className,
  placeholder = 'Enter value...',
  type = 'text'
}: EditableFieldProps & { type?: string }) {
  const [editValue, setEditValue] = useState(value);
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    if (validationSchema) {
      try {
        validationSchema.parse(editValue);
        setError(null);
      } catch (err) {
        if (err instanceof z.ZodError) {
          setError(err.errors[0].message);
          return;
        }
      }
    }
    onSave(editValue);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Input
        type={type}
        value={editValue}
        onChange={(e) => {
          setEditValue(type === 'number' ? Number(e.target.value) : e.target.value);
          setError(null);
        }}
        placeholder={placeholder}
        className="w-full"
        autoFocus
      />
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
      <div className="flex justify-end space-x-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          <X className="h-3 w-3 mr-1" /> Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={isLoading || !!error}
        >
          {isLoading ? (
            <span className="flex items-center">
              <span className="h-3 w-3 mr-1 rounded-full border-2 border-t-transparent border-white animate-spin" />
              Saving...
            </span>
          ) : (
            <>
              <Save className="h-3 w-3 mr-1" /> Save
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export function EditableSelect({
  value,
  onSave,
  onCancel,
  options,
  isLoading = false,
  className
}: EditableFieldProps & { options: Array<{ value: string; label: string }> }) {
  const [editValue, setEditValue] = useState(value);

  return (
    <div className={cn("space-y-2", className)}>
      <Select
        options={options}
        value={editValue as string}
        onChange={(value) => setEditValue(value)}
        className="w-full"
      />
      <div className="flex justify-end space-x-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          <X className="h-3 w-3 mr-1" /> Cancel
        </Button>
        <Button
          size="sm"
          onClick={() => onSave(editValue)}
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="flex items-center">
              <span className="h-3 w-3 mr-1 rounded-full border-2 border-t-transparent border-white animate-spin" />
              Saving...
            </span>
          ) : (
            <>
              <Save className="h-3 w-3 mr-1" /> Save
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

interface EditableDisplayProps {
  value: string | number;
  onEdit: () => void;
  className?: string;
  displayValue?: React.ReactNode;
}

export function EditableDisplay({
  value,
  onEdit,
  className,
  displayValue
}: EditableDisplayProps) {
  return (
    <div 
      className={cn(
        "group flex items-center justify-between p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/50 cursor-pointer transition-colors",
        className
      )}
      onClick={onEdit}
    >
      <div className="flex-1">
        {displayValue || value}
      </div>
      <Edit2 className="h-4 w-4 text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

interface EditableFieldProps {
  type?: 'text' | 'textarea' | 'number' | 'select';
  value: string | number;
  onSave: (value: string | number) => void;
  onCancel: () => void;
  validationSchema?: z.ZodType<any>;
  isLoading?: boolean;
  className?: string;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
}

export function EditableField({
  type = 'text',
  value,
  onSave,
  onCancel,
  validationSchema,
  isLoading = false,
  className,
  placeholder,
  options
}: EditableFieldProps) {
  switch (type) {
    case 'textarea':
      return (
        <EditableTextarea
          value={value}
          onSave={onSave}
          onCancel={onCancel}
          validationSchema={validationSchema}
          isLoading={isLoading}
          className={className}
          placeholder={placeholder}
        />
      );
    case 'select':
      if (!options) {
        throw new Error('Options are required for select type');
      }
      return (
        <EditableSelect
          value={value}
          onSave={onSave}
          onCancel={onCancel}
          options={options}
          isLoading={isLoading}
          className={className}
        />
      );
    case 'number':
      return (
        <EditableInput
          type="number"
          value={value}
          onSave={onSave}
          onCancel={onCancel}
          validationSchema={validationSchema}
          isLoading={isLoading}
          className={className}
          placeholder={placeholder}
        />
      );
    case 'text':
    default:
      return (
        <EditableInput
          type="text"
          value={value}
          onSave={onSave}
          onCancel={onCancel}
          validationSchema={validationSchema}
          isLoading={isLoading}
          className={className}
          placeholder={placeholder}
        />
      );
  }
}