/**
 * File: /src/components/forms/GradeLevelFormContent.tsx
 * 
 * Grade Level Form Content Component
 * Handles the form fields for creating and editing grade levels with class sections
 * 
 * This component is now simplified as the main logic has been moved to GradeLevelsTab.tsx
 * for better integration with the class sections functionality.
 */

import React from 'react';
import { GraduationCap, Hash, Users, Plus } from 'lucide-react';
import { FormField, Input, Select } from '../shared/FormField';
import { ToggleSwitch } from '../shared/ToggleSwitch';
import { SearchableMultiSelect } from '../shared/SearchableMultiSelect';
import { Button } from '../shared/Button';
import { CollapsibleSection } from '../shared/CollapsibleSection';
import { ClassSectionFormItem, type ClassSectionFormData } from './ClassSectionFormItem';

interface GradeLevelFormData {
  school_ids: string[];
  grade_name: string;
  grade_code: string;
  grade_order: number;
  education_level: 'kindergarten' | 'primary' | 'middle' | 'secondary' | 'senior';
  status: 'active' | 'inactive';
  class_sections: ClassSectionFormData[];
}

interface GradeLevelFormContentProps {
  formData: Partial<GradeLevelFormData>;
  setFormData: (data: Partial<GradeLevelFormData>) => void;
  formErrors: Record<string, string>;
  setFormErrors: (errors: Record<string, string>) => void;
  schools: Array<{ id: string; name: string }>;
  isEditing?: boolean;
  isLoadingSchools?: boolean;
  schoolsError?: Error | null;
  disabled?: boolean;
}

export function GradeLevelFormContent({
  formData,
  setFormData,
  formErrors,
  setFormErrors,
  schools,
  isEditing = false,
  isLoadingSchools = false,
  schoolsError = null,
  disabled = false
}: GradeLevelFormContentProps) {
  
  const updateFormData = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
    
    // Clear error for this field when user starts typing
    if (formErrors[field]) {
      const newErrors = { ...formErrors };
      delete newErrors[field];
      setFormErrors(newErrors);
    }
  };

  // Class sections handlers
  const handleAddSection = () => {
    const newSection: ClassSectionFormData = {
      section_name: '',
      section_code: '',
      max_capacity: 30,
      room_number: '',
      building: '',
      floor: 1,
      status: 'active',
      class_section_order: (formData.class_sections?.length || 0) + 1,
      _isNew: true
    };
    
    const currentSections = formData.class_sections || [];
    updateFormData('class_sections', [...currentSections, newSection]);
  };

  const handleSectionChange = (index: number, field: keyof ClassSectionFormData, value: any) => {
    const currentSections = formData.class_sections || [];
    const updatedSections = currentSections.map((section, i) => 
      i === index ? { ...section, [field]: value } : section
    );
    updateFormData('class_sections', updatedSections);
    
    // Clear section-specific errors
    const errorKey = `sections.${index}.${field}`;
    if (formErrors[errorKey]) {
      const newErrors = { ...formErrors };
      delete newErrors[errorKey];
      setFormErrors(newErrors);
    }
  };

  const handleRemoveSection = (index: number) => {
    const currentSections = formData.class_sections || [];
    const updatedSections = currentSections.filter((_, i) => i !== index);
    updateFormData('class_sections', updatedSections);
    
    // Clear errors for removed section
    const newErrors = { ...formErrors };
    Object.keys(newErrors).forEach(key => {
      if (key.startsWith(`sections.${index}.`)) {
        delete newErrors[key];
      }
    });
    setFormErrors(newErrors);
  };

  return (
    <div className="space-y-6">
      {/* Basic Grade Information */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
          <GraduationCap className="h-5 w-5 text-[#8CC63F]" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Grade Level Information
          </h3>
        </div>

        {/* School Selection */}
        <FormField
          id="school_ids"
          label="School"
          required
          error={formErrors.school_ids}
        >
          {isLoadingSchools ? (
            <div className="p-3 text-sm text-gray-600 dark:text-gray-400">
              Loading schools...
            </div>
          ) : schoolsError ? (
            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded">
              Failed to load schools. Please refresh the page.
            </div>
          ) : schools.length === 0 ? (
            <div className="space-y-2">
              <Select id="school_ids" disabled options={[]}>
                <option value="">No schools available</option>
              </Select>
              <div className="p-2 text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded">
                No schools found. Schools must be created first.
              </div>
            </div>
          ) : (
            <SearchableMultiSelect
              label=""
              options={schools.map(school => ({
                value: school.id,
                label: school.name
              }))}
              selectedValues={formData.school_ids || []}
              onChange={(values) => updateFormData('school_ids', values)}
              isMulti={false}
              placeholder="Select school..."
              disabled={disabled}
            />
          )}
        </FormField>

        {/* Grade Name */}
        <FormField
          id="grade_name"
          label="Grade Name"
          required
          error={formErrors.grade_name}
        >
          <Input
            id="grade_name"
            value={formData.grade_name || ''}
            onChange={(e) => updateFormData('grade_name', e.target.value)}
            placeholder="e.g., Grade 1, Year 7, Kindergarten"
            disabled={disabled}
            leftIcon={<GraduationCap className="h-5 w-5 text-gray-400" />}
          />
        </FormField>

        {/* Grade Code and Order */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            id="grade_code"
            label="Grade Code"
            error={formErrors.grade_code}
          >
            <Input
              id="grade_code"
              value={formData.grade_code || ''}
              onChange={(e) => updateFormData('grade_code', e.target.value)}
              placeholder="e.g., G1, Y7, KG"
              disabled={disabled}
              leftIcon={<Hash className="h-5 w-5 text-gray-400" />}
            />
          </FormField>

          <FormField
            id="grade_order"
            label="Grade Order"
            required
            error={formErrors.grade_order}
          >
            <Input
              id="grade_order"
              type="number"
              min="1"
              value={formData.grade_order?.toString() || '1'}
              onChange={(e) => updateFormData('grade_order', parseInt(e.target.value) || 1)}
              placeholder="1"
              disabled={disabled}
            />
          </FormField>
        </div>

        {/* Education Level */}
        <FormField
          id="education_level"
          label="Education Level"
          required
          error={formErrors.education_level}
        >
          <Select
            id="education_level"
            options={[
              { value: 'kindergarten', label: 'Kindergarten' },
              { value: 'primary', label: 'Primary' },
              { value: 'middle', label: 'Middle School' },
              { value: 'secondary', label: 'Secondary' },
              { value: 'senior', label: 'Senior Secondary' }
            ]}
            value={formData.education_level || 'primary'}
            onChange={(value) => updateFormData('education_level', value)}
            disabled={disabled}
          />
        </FormField>

        {/* Status */}
        <FormField
          id="status"
          label="Status"
          required
          error={formErrors.status}
        >
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Grade Level Status
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {formData.status === 'active'
                  ? 'Grade level is currently active' 
                  : 'Grade level is currently inactive'}
              </p>
            </div>
            <ToggleSwitch
              checked={formData.status === 'active'}
              onChange={(checked) => updateFormData('status', checked ? 'active' : 'inactive')}
              disabled={disabled}
            />
          </div>
        </FormField>
      </div>

      {/* Class Sections */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
          <Users className="h-5 w-5 text-[#8CC63F]" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Class Sections ({formData.class_sections?.length || 0})
          </h3>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Class Sections Management
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Add multiple class sections for this grade level. Each section represents a class group within the grade.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddSection}
              disabled={disabled}
              leftIcon={<Plus className="w-4 h-4" />}
              className="border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-600 dark:text-blue-300 dark:hover:bg-blue-900/30"
            >
              Add Section
            </Button>
          </div>
        </div>
        
        {(formData.class_sections?.length || 0) === 0 ? (
          <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No class sections added yet
            </h4>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Click "Add Section" to create class sections for this grade level
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={handleAddSection}
              disabled={disabled}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add First Section
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {formData.class_sections?.map((section, index) => (
              <ClassSectionFormItem
                key={section.id || `new-${index}`}
                data={section}
                index={index}
                onChange={handleSectionChange}
                onRemove={handleRemoveSection}
                errors={formErrors}
                disabled={disabled}
                showRemoveButton={(formData.class_sections?.length || 0) > 1}
              />
            ))}
            
            {/* Add Another Section Button */}
            <div className="text-center pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleAddSection}
                disabled={disabled}
                leftIcon={<Plus className="w-4 h-4" />}
                className="border-dashed border-[#8CC63F] text-[#8CC63F] hover:bg-[#8CC63F]/10"
              >
                Add Another Section
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default GradeLevelFormContent;