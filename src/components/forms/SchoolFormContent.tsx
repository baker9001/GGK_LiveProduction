/**
 * File: /src/components/forms/SchoolFormContent.tsx
 * 
 * UNIFIED School Form Content Component
 * Standardized UI/UX matching branches implementation
 * 
 * Improvements:
 * 1. Consistent field naming (student_count throughout)
 * 2. Unified spacing (mt-2 for all field content)
 * 3. Same validation patterns
 * 4. Green theme throughout (#8CC63F)
 * 5. Tab error calculation for parent component
 */

'use client';

import React, { useEffect } from 'react';
import { 
  BookOpen, FlaskConical, Dumbbell, Coffee, 
  User, Mail, Phone, MapPin, Calendar, School, Hash
} from 'lucide-react';
import { FormField, Input, Select, Textarea } from '../shared/FormField';
import { ImageUpload } from '../shared/ImageUpload';
import { ToggleSwitch } from '../shared/ToggleSwitch';
import { getPublicUrl } from '../../lib/storageHelpers';

// ===== TYPE DEFINITIONS =====
interface SchoolFormData {
  // Main school fields (from schools table)
  name: string;
  code: string;
  company_id: string;
  description: string;
  status: 'active' | 'inactive';
  address: string;
  notes: string;
  logo: string;
  
  // Additional fields (from schools_additional table)
  school_type: string;
  curriculum_type: string[];
  total_capacity: number;
  teachers_count: number;
  student_count: number; // Standardized name
  active_teachers_count: number;
  principal_name: string;
  principal_email: string;
  principal_phone: string;
  campus_address: string;
  campus_city: string;
  campus_state: string;
  campus_postal_code: string;
  latitude: number;
  longitude: number;
  established_date: string;
  academic_year_start: number;
  academic_year_end: number;
  has_library: boolean;
  has_laboratory: boolean;
  has_sports_facilities: boolean;
  has_cafeteria: boolean;
}

interface SchoolFormContentProps {
  formData: Partial<SchoolFormData>;
  setFormData: (data: Partial<SchoolFormData>) => void;
  formErrors: Record<string, string>;
  setFormErrors: (errors: Record<string, string>) => void;
  activeTab: 'basic' | 'additional' | 'contact';
  companyId: string;
  isEditing?: boolean;
  onTabErrorsChange?: (errors: { basic: boolean; additional: boolean; contact: boolean }) => void;
}

// ===== MAIN COMPONENT =====
export function SchoolFormContent({
  formData,
  setFormData,
  formErrors,
  setFormErrors,
  activeTab,
  companyId,
  isEditing = false,
  onTabErrorsChange
}: SchoolFormContentProps) {
  
  // Initialize status to active if not set
  useEffect(() => {
    if (!formData.status) {
      updateFormData('status', 'active');
    }
  }, []);

  // Helper to update form data
  const updateFormData = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
    
    // Clear error when user starts typing
    if (formErrors[field]) {
      const newErrors = { ...formErrors };
      delete newErrors[field];
      setFormErrors(newErrors);
    }
  };

  // Helper to handle checkbox arrays (curriculum types)
  const handleCurriculumTypeChange = (type: string, checked: boolean) => {
    const current = formData.curriculum_type || [];
    if (checked) {
      updateFormData('curriculum_type', [...current, type]);
    } else {
      updateFormData('curriculum_type', current.filter(t => t !== type));
    }
  };

  // Helper to handle facility checkboxes
  const handleFacilityChange = (facility: string, checked: boolean) => {
    updateFormData(facility, checked);
  };

  // Get logo URL helper
  const getLogoUrl = (path: string | null) => {
    return getPublicUrl('school-logos', path);
  };

  // Calculate which tabs have errors and notify parent
  useEffect(() => {
    const errors = {
      basic: false,
      additional: false,
      contact: false
    };

    // Basic tab mandatory fields
    if (!formData.name || formData.name.trim() === '') {
      errors.basic = true;
    }
    if (!formData.code || formData.code.trim() === '') {
      errors.basic = true;
    }
    if (formErrors.name || formErrors.code) {
      errors.basic = true;
    }

    // Contact tab - check for email format errors
    if (formErrors.principal_email) {
      errors.contact = true;
    }

    // Notify parent component about tab errors
    if (onTabErrorsChange) {
      onTabErrorsChange(errors);
    }
  }, [formData, formErrors, onTabErrorsChange]);

  // Render content based on active tab
  if (activeTab === 'basic') {
    return (
      <div className="space-y-4">
        {/* School Name */}
        <FormField id="name" label="School Name" required error={formErrors.name}>
          <Input
            id="name"
            value={formData.name || ''}
            onChange={(e) => updateFormData('name', e.target.value)}
            placeholder="Enter school name"
            leftIcon={<School className="h-5 w-5 text-gray-400" />}
            className="mt-2 focus:border-[#8CC63F] focus:ring-[#8CC63F]"
          />
        </FormField>

        {/* School Code */}
        <FormField id="code" label="School Code" required error={formErrors.code}>
          <Input
            id="code"
            value={formData.code || ''}
            onChange={(e) => updateFormData('code', e.target.value)}
            placeholder="e.g., SCH-001"
            leftIcon={<Hash className="h-5 w-5 text-gray-400" />}
            className="mt-2 focus:border-[#8CC63F] focus:ring-[#8CC63F]"
          />
        </FormField>

        {/* Status */}
        <FormField id="status" label="Status" required>
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg mt-2">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                School Status
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {formData.status === 'active' 
                  ? 'School is currently active' 
                  : 'School is currently inactive'}
              </p>
            </div>
            <ToggleSwitch
              checked={formData.status === 'active'}
              onChange={(checked) => updateFormData('status', checked ? 'active' : 'inactive')}
              label="Active"
            />
          </div>
        </FormField>

        {/* Description */}
        <FormField id="description" label="Description">
          <Textarea
            id="description"
            value={formData.description || ''}
            onChange={(e) => updateFormData('description', e.target.value)}
            placeholder="Enter school description"
            rows={3}
            className="mt-2 focus:border-[#8CC63F] focus:ring-[#8CC63F]"
          />
        </FormField>

        {/* Address */}
        <FormField id="address" label="Address">
          <Textarea
            id="address"
            value={formData.address || ''}
            onChange={(e) => updateFormData('address', e.target.value)}
            placeholder="Enter school address"
            rows={3}
            className="mt-2 focus:border-[#8CC63F] focus:ring-[#8CC63F]"
          />
        </FormField>

        {/* School Logo */}
        <FormField id="logo" label="School Logo">
          <div className="mt-2">
            <ImageUpload
              id="logo"
              bucket="school-logos"
              value={formData.logo}
              publicUrl={formData.logo ? getLogoUrl(formData.logo) : null}
              onChange={(path) => updateFormData('logo', path)}
            />
          </div>
        </FormField>

        {/* School Type */}
        <FormField id="school_type" label="School Type">
          <Select
            id="school_type"
            options={[
              { value: '', label: 'Select type' },
              { value: 'primary', label: 'Primary School' },
              { value: 'secondary', label: 'Secondary School' },
              { value: 'k12', label: 'K-12 School' },
              { value: 'higher_secondary', label: 'Higher Secondary' },
              { value: 'other', label: 'Other' }
            ]}
            value={formData.school_type || ''}
            onChange={(value) => updateFormData('school_type', value)}
            className="mt-2 focus:border-[#8CC63F] focus:ring-[#8CC63F]"
          />
        </FormField>

        {/* Curriculum Types */}
        <FormField id="curriculum_type" label="Curriculum Types">
          <div className="space-y-2 mt-2">
            {['national', 'cambridge', 'ib', 'american', 'montessori', 'other'].map(type => (
              <label key={type} className="flex items-center gap-2 cursor-pointer hover:text-[#8CC63F]">
                <input
                  type="checkbox"
                  checked={(formData.curriculum_type || []).includes(type)}
                  onChange={(e) => handleCurriculumTypeChange(type, e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600 text-[#8CC63F] focus:ring-[#8CC63F] focus:ring-offset-0"
                />
                <span className="text-sm capitalize">{type}</span>
              </label>
            ))}
          </div>
        </FormField>

        {/* Notes */}
        <FormField id="notes" label="Notes">
          <Textarea
            id="notes"
            value={formData.notes || ''}
            onChange={(e) => updateFormData('notes', e.target.value)}
            placeholder="Additional notes about the school"
            rows={3}
            className="mt-2 focus:border-[#8CC63F] focus:ring-[#8CC63F]"
          />
        </FormField>
      </div>
    );
  }

  if (activeTab === 'additional') {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField id="total_capacity" label="Total Capacity">
            <Input
              id="total_capacity"
              type="number"
              value={formData.total_capacity || ''}
              onChange={(e) => updateFormData('total_capacity', parseInt(e.target.value) || undefined)}
              placeholder="0"
              className="mt-2 focus:border-[#8CC63F] focus:ring-[#8CC63F]"
            />
          </FormField>

          <FormField id="student_count" label="Current Students">
            <Input
              id="student_count"
              type="number"
              value={formData.student_count || ''}
              onChange={(e) => updateFormData('student_count', parseInt(e.target.value) || undefined)}
              placeholder="0"
              className="mt-2 focus:border-[#8CC63F] focus:ring-[#8CC63F]"
            />
          </FormField>

          <FormField id="teachers_count" label="Total Teachers">
            <Input
              id="teachers_count"
              type="number"
              value={formData.teachers_count || ''}
              onChange={(e) => updateFormData('teachers_count', parseInt(e.target.value) || undefined)}
              placeholder="0"
              className="mt-2 focus:border-[#8CC63F] focus:ring-[#8CC63F]"
            />
          </FormField>

          <FormField id="active_teachers_count" label="Active Teachers">
            <Input
              id="active_teachers_count"
              type="number"
              value={formData.active_teachers_count || ''}
              onChange={(e) => updateFormData('active_teachers_count', parseInt(e.target.value) || undefined)}
              placeholder="0"
              className="mt-2 focus:border-[#8CC63F] focus:ring-[#8CC63F]"
            />
          </FormField>
        </div>

        <FormField id="campus_address" label="Campus Address">
          <Textarea
            id="campus_address"
            value={formData.campus_address || ''}
            onChange={(e) => updateFormData('campus_address', e.target.value)}
            placeholder="Enter campus address"
            rows={3}
            className="mt-2 focus:border-[#8CC63F] focus:ring-[#8CC63F]"
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField id="campus_city" label="Campus City">
            <Input
              id="campus_city"
              value={formData.campus_city || ''}
              onChange={(e) => updateFormData('campus_city', e.target.value)}
              placeholder="Enter city"
              className="mt-2 focus:border-[#8CC63F] focus:ring-[#8CC63F]"
            />
          </FormField>

          <FormField id="campus_state" label="Campus State">
            <Input
              id="campus_state"
              value={formData.campus_state || ''}
              onChange={(e) => updateFormData('campus_state', e.target.value)}
              placeholder="Enter state/province"
              className="mt-2 focus:border-[#8CC63F] focus:ring-[#8CC63F]"
            />
          </FormField>

          <FormField id="campus_postal_code" label="Postal Code">
            <Input
              id="campus_postal_code"
              value={formData.campus_postal_code || ''}
              onChange={(e) => updateFormData('campus_postal_code', e.target.value)}
              placeholder="Enter postal code"
              className="mt-2 focus:border-[#8CC63F] focus:ring-[#8CC63F]"
            />
          </FormField>

          <FormField id="established_date" label="Established Date">
            <Input
              id="established_date"
              type="date"
              value={formData.established_date || ''}
              onChange={(e) => updateFormData('established_date', e.target.value)}
              className="mt-2 focus:border-[#8CC63F] focus:ring-[#8CC63F]"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField id="academic_year_start" label="Academic Year Start">
            <Select
              id="academic_year_start"
              options={[
                { value: '', label: 'Select month' },
                { value: '1', label: 'January' },
                { value: '2', label: 'February' },
                { value: '3', label: 'March' },
                { value: '4', label: 'April' },
                { value: '5', label: 'May' },
                { value: '6', label: 'June' },
                { value: '7', label: 'July' },
                { value: '8', label: 'August' },
                { value: '9', label: 'September' },
                { value: '10', label: 'October' },
                { value: '11', label: 'November' },
                { value: '12', label: 'December' }
              ]}
              value={formData.academic_year_start?.toString() || ''}
              onChange={(value) => updateFormData('academic_year_start', parseInt(value) || undefined)}
              className="mt-2 focus:border-[#8CC63F] focus:ring-[#8CC63F]"
            />
          </FormField>

          <FormField id="academic_year_end" label="Academic Year End">
            <Select
              id="academic_year_end"
              options={[
                { value: '', label: 'Select month' },
                { value: '1', label: 'January' },
                { value: '2', label: 'February' },
                { value: '3', label: 'March' },
                { value: '4', label: 'April' },
                { value: '5', label: 'May' },
                { value: '6', label: 'June' },
                { value: '7', label: 'July' },
                { value: '8', label: 'August' },
                { value: '9', label: 'September' },
                { value: '10', label: 'October' },
                { value: '11', label: 'November' },
                { value: '12', label: 'December' }
              ]}
              value={formData.academic_year_end?.toString() || ''}
              onChange={(value) => updateFormData('academic_year_end', parseInt(value) || undefined)}
              className="mt-2 focus:border-[#8CC63F] focus:ring-[#8CC63F]"
            />
          </FormField>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Facilities</label>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <label className="flex items-center gap-3 cursor-pointer hover:text-[#8CC63F]">
              <input
                type="checkbox"
                checked={formData.has_library || false}
                onChange={(e) => handleFacilityChange('has_library', e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600 text-[#8CC63F] focus:ring-[#8CC63F] focus:ring-offset-0"
              />
              <BookOpen className="w-4 h-4 text-gray-500" />
              <span className="text-sm">Library</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer hover:text-[#8CC63F]">
              <input
                type="checkbox"
                checked={formData.has_laboratory || false}
                onChange={(e) => handleFacilityChange('has_laboratory', e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600 text-[#8CC63F] focus:ring-[#8CC63F] focus:ring-offset-0"
              />
              <FlaskConical className="w-4 h-4 text-gray-500" />
              <span className="text-sm">Laboratory</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer hover:text-[#8CC63F]">
              <input
                type="checkbox"
                checked={formData.has_sports_facilities || false}
                onChange={(e) => handleFacilityChange('has_sports_facilities', e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600 text-[#8CC63F] focus:ring-[#8CC63F] focus:ring-offset-0"
              />
              <Dumbbell className="w-4 h-4 text-gray-500" />
              <span className="text-sm">Sports Facilities</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer hover:text-[#8CC63F]">
              <input
                type="checkbox"
                checked={formData.has_cafeteria || false}
                onChange={(e) => handleFacilityChange('has_cafeteria', e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600 text-[#8CC63F] focus:ring-[#8CC63F] focus:ring-offset-0"
              />
              <Coffee className="w-4 h-4 text-gray-500" />
              <span className="text-sm">Cafeteria</span>
            </label>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'contact') {
    return (
      <div className="space-y-4">
        <FormField id="principal_name" label="Principal Name">
          <Input
            id="principal_name"
            value={formData.principal_name || ''}
            onChange={(e) => updateFormData('principal_name', e.target.value)}
            placeholder="Enter principal name"
            leftIcon={<User className="h-5 w-5 text-gray-400" />}
            className="mt-2 focus:border-[#8CC63F] focus:ring-[#8CC63F]"
          />
        </FormField>

        <FormField id="principal_email" label="Principal Email" error={formErrors.principal_email}>
          <Input
            id="principal_email"
            type="email"
            value={formData.principal_email || ''}
            onChange={(e) => updateFormData('principal_email', e.target.value)}
            placeholder="principal@school.com"
            leftIcon={<Mail className="h-5 w-5 text-gray-400" />}
            className="mt-2 focus:border-[#8CC63F] focus:ring-[#8CC63F]"
          />
        </FormField>

        <FormField id="principal_phone" label="Principal Phone">
          <Input
            id="principal_phone"
            type="tel"
            value={formData.principal_phone || ''}
            onChange={(e) => updateFormData('principal_phone', e.target.value)}
            placeholder="+1 (555) 123-4567"
            leftIcon={<Phone className="h-5 w-5 text-gray-400" />}
            className="mt-2 focus:border-[#8CC63F] focus:ring-[#8CC63F]"
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField id="latitude" label="Latitude">
            <Input
              id="latitude"
              type="number"
              step="any"
              value={formData.latitude || ''}
              onChange={(e) => updateFormData('latitude', parseFloat(e.target.value) || undefined)}
              placeholder="e.g., 29.3759"
              leftIcon={<MapPin className="h-5 w-5 text-gray-400" />}
              className="mt-2 focus:border-[#8CC63F] focus:ring-[#8CC63F]"
            />
          </FormField>

          <FormField id="longitude" label="Longitude">
            <Input
              id="longitude"
              type="number"
              step="any"
              value={formData.longitude || ''}
              onChange={(e) => updateFormData('longitude', parseFloat(e.target.value) || undefined)}
              placeholder="e.g., 47.9774"
              leftIcon={<MapPin className="h-5 w-5 text-gray-400" />}
              className="mt-2 focus:border-[#8CC63F] focus:ring-[#8CC63F]"
            />
          </FormField>
        </div>
      </div>
    );
  }

  return null;
}

export default SchoolFormContent;