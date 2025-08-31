/**
 * File: /src/components/forms/ClassSectionFormItem.tsx
 * 
 * Individual Class Section Form Item Component
 * Renders input fields for a single class section within the grade level form
 */

import React from 'react';
import { Trash2, Users, Hash, Building2, MapPin } from 'lucide-react';
import { FormField, Input, Select } from '../shared/FormField';
import { Button } from '../shared/Button';
import { ToggleSwitch } from '../shared/ToggleSwitch';
import { cn } from '../../lib/utils';

export interface ClassSectionFormData {
  id?: string; // For existing sections
  section_name: string;
  section_code: string;
  max_capacity: number;
  room_number: string;
  building: string;
  floor: number;
  status: 'active' | 'inactive';
  class_section_order: number;
  _isNew?: boolean; // Flag to identify new sections
}

interface ClassSectionFormItemProps {
  data: ClassSectionFormData;
  index: number;
  onChange: (index: number, field: keyof ClassSectionFormData, value: any) => void;
  onRemove: (index: number) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
  showRemoveButton?: boolean;
}

export function ClassSectionFormItem({
  data,
  index,
  onChange,
  onRemove,
  errors = {},
  disabled = false,
  showRemoveButton = true
}: ClassSectionFormItemProps) {
  
  const handleFieldChange = (field: keyof ClassSectionFormData, value: any) => {
    onChange(index, field, value);
  };

  const getFieldError = (field: string) => {
    return errors[`sections.${index}.${field}`] || errors[`section_${index}_${field}`];
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
      {/* Header with Remove Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <h4 className="font-medium text-gray-900 dark:text-white">
            Section {index + 1}
            {data.section_name && (
              <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                ({data.section_name})
              </span>
            )}
          </h4>
        </div>
        
        {showRemoveButton && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onRemove(index)}
            disabled={disabled}
            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            leftIcon={<Trash2 className="w-4 h-4" />}
          >
            Remove
          </Button>
        )}
      </div>

      {/* Form Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Section Name */}
        <FormField
          id={`section_name_${index}`}
          label="Section Name"
          required
          error={getFieldError('section_name')}
        >
          <Input
            id={`section_name_${index}`}
            value={data.section_name}
            onChange={(e) => handleFieldChange('section_name', e.target.value)}
            placeholder="e.g., Section A, Blue House"
            disabled={disabled}
            leftIcon={<Users className="h-5 w-5 text-gray-400" />}
          />
        </FormField>

        {/* Section Code */}
        <FormField
          id={`section_code_${index}`}
          label="Section Code"
          error={getFieldError('section_code')}
        >
          <Input
            id={`section_code_${index}`}
            value={data.section_code}
            onChange={(e) => handleFieldChange('section_code', e.target.value)}
            placeholder="e.g., SEC-A, BH-01"
            disabled={disabled}
            leftIcon={<Hash className="h-5 w-5 text-gray-400" />}
          />
        </FormField>

        {/* Max Capacity */}
        <FormField
          id={`max_capacity_${index}`}
          label="Max Students"
          required
          error={getFieldError('max_capacity')}
        >
          <Input
            id={`max_capacity_${index}`}
            type="number"
            min="1"
            max="100"
            value={data.max_capacity.toString()}
            onChange={(e) => handleFieldChange('max_capacity', parseInt(e.target.value) || 30)}
            placeholder="30"
            disabled={disabled}
          />
        </FormField>

        {/* Section Order */}
        <FormField
          id={`class_section_order_${index}`}
          label="Display Order"
          required
          error={getFieldError('class_section_order')}
        >
          <Input
            id={`class_section_order_${index}`}
            type="number"
            min="1"
            value={data.class_section_order.toString()}
            onChange={(e) => handleFieldChange('class_section_order', parseInt(e.target.value) || index + 1)}
            placeholder={(index + 1).toString()}
            disabled={disabled}
          />
        </FormField>

        {/* Room Number */}
        <FormField
          id={`room_number_${index}`}
          label="Room Number"
          error={getFieldError('room_number')}
        >
          <Input
            id={`room_number_${index}`}
            value={data.room_number}
            onChange={(e) => handleFieldChange('room_number', e.target.value)}
            placeholder="e.g., Room 101, Lab A"
            disabled={disabled}
            leftIcon={<MapPin className="h-5 w-5 text-gray-400" />}
          />
        </FormField>

        {/* Building */}
        <FormField
          id={`building_${index}`}
          label="Building"
          error={getFieldError('building')}
        >
          <Input
            id={`building_${index}`}
            value={data.building}
            onChange={(e) => handleFieldChange('building', e.target.value)}
            placeholder="e.g., Main Building, Science Block"
            disabled={disabled}
            leftIcon={<Building2 className="h-5 w-5 text-gray-400" />}
          />
        </FormField>

        {/* Floor */}
        <FormField
          id={`floor_${index}`}
          label="Floor"
          error={getFieldError('floor')}
        >
          <Input
            id={`floor_${index}`}
            type="number"
            min="0"
            max="20"
            value={data.floor.toString()}
            onChange={(e) => handleFieldChange('floor', parseInt(e.target.value) || 1)}
            placeholder="1"
            disabled={disabled}
          />
        </FormField>

        {/* Status Toggle */}
        <FormField
          id={`status_${index}`}
          label="Status"
          error={getFieldError('status')}
        >
          <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Section Status
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {data.status === 'active' 
                  ? 'Section is currently active' 
                  : 'Section is currently inactive'}
              </p>
            </div>
            <ToggleSwitch
              checked={data.status === 'active'}
              onChange={(checked) => handleFieldChange('status', checked ? 'active' : 'inactive')}
              disabled={disabled}
              size="sm"
            />
          </div>
        </FormField>
      </div>

      {/* Section Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            Section Summary:
          </span>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              Capacity: {data.max_capacity}
            </span>
            {data.room_number && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Room: {data.room_number}
              </span>
            )}
            {data.building && (
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {data.building}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ClassSectionFormItem;