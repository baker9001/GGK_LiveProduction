/**
 * File: /src/components/forms/SchoolFormContent.tsx
 * 
 * Unified School Form Content Component
 * Uses standard system shared components for consistency
 * 
 * Dependencies:
 *   - @/components/shared/* (FormField, Input, Select, Textarea, ImageUpload)
 *   - External: react, lucide-react
 * 
 * Database Tables:
 *   - schools (main table)
 *   - schools_additional (additional data)
 */

'use client';

import React from 'react';
import { 
  BookOpen, FlaskConical, Dumbbell, Coffee, 
  User, Mail, Phone, MapPin, Calendar
} from 'lucide-react';
import { FormField, Input, Select, Textarea } from '../shared/FormField';
import { ImageUpload } from '../shared/ImageUpload';

// ===== TYPE DEFINITIONS =====
interface SchoolFormData {
  // Main school fields
  name: string;
  code: string;
  company_id: string;
  description: string;
  status: 'active' | 'inactive';
  address: string;
  notes: string;
  logo: string;
  
  // Additional fields
  school_type: string;
  curriculum_type: string[];
  total_capacity: number;
  teachers_count: number;
  student_count: number;
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
  setActiveTab: (tab: 'basic' | 'additional' | 'contact') => void;
  companyId: string;
  isEditing?: boolean;
}

// ===== MAIN COMPONENT =====
export function SchoolFormContent({
  formData,
  setFormData,
  formErrors,
  setFormErrors,
  activeTab,
  setActiveTab,
  companyId,
  isEditing = false
}: SchoolFormContentProps) {
  
  // Helper to update form data
  const updateFormData = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
    
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors({ ...formErrors, [field]: '' });
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

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex space-x-4 border-b dark:border-gray-700">
        <button
          type="button"
          onClick={() => setActiveTab('basic')}
          className={`pb-2 px-1 ${activeTab === 'basic' 
            ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' 
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
        >
          Basic Info
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('additional')}
          className={`pb-2 px-1 ${activeTab === 'additional' 
            ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' 
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
        >
          Additional
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('contact')}
          className={`pb-2 px-1 ${activeTab === 'contact' 
            ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' 
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
        >
          Contact
        </button>
      </div>

      {/* Form Content */}
      <div className="mt-4">
        {activeTab === 'basic' && (
          <div className="space-y-4">
            <FormField id="name" label="School Name" required error={formErrors.name}>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e) => updateFormData('name', e.target.value)}
                placeholder="Enter school name"
              />
            </FormField>

            <FormField id="code" label="School Code" required error={formErrors.code}>
              <Input
                id="code"
                value={formData.code || ''}
                onChange={(e) => updateFormData('code', e.target.value)}
                placeholder="e.g., SCH-001"
              />
            </FormField>

            <FormField id="status" label="Status" required error={formErrors.status}>
              <Select
                id="status"
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' }
                ]}
                value={formData.status || 'active'}
                onChange={(value) => updateFormData('status', value)}
              />
            </FormField>

            <FormField id="school_type" label="School Type">
              <Select
                id="school_type"
                options={[
                  { value: 'primary', label: 'Primary School' },
                  { value: 'secondary', label: 'Secondary School' },
                  { value: 'other', label: 'Other' }
                ]}
                value={formData.school_type || ''}
                onChange={(value) => updateFormData('school_type', value)}
                placeholder="Select school type"
              />
            </FormField>

            <FormField id="description" label="Description">
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => updateFormData('description', e.target.value)}
                placeholder="Enter school description"
                rows={3}
              />
            </FormField>

            <FormField id="logo" label="School Logo">
              <ImageUpload
                id="logo"
                bucket="school-logos"
                value={formData.logo}
                publicUrl={formData.logo ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/logos/${formData.logo}` : null}
                onChange={(path) => updateFormData('logo', path)}
              />
            </FormField>

            <FormField id="curriculum_type" label="Curriculum Types">
              <div className="space-y-2">
                {['national', 'cambridge', 'ib', 'american', 'other'].map(type => (
                  <label key={type} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={(formData.curriculum_type || []).includes(type)}
                      onChange={(e) => handleCurriculumTypeChange(type, e.target.checked)}
                      className="rounded border-gray-300 dark:border-gray-600"
                    />
                    <span className="text-sm capitalize">{type}</span>
                  </label>
                ))}
              </div>
            </FormField>
          </div>
        )}

        {activeTab === 'additional' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField id="total_capacity" label="Total Capacity">
                <Input
                  id="total_capacity"
                  type="number"
                  value={formData.total_capacity || ''}
                  onChange={(e) => updateFormData('total_capacity', parseInt(e.target.value) || 0)}
                  placeholder="Maximum student capacity"
                />
              </FormField>

              <FormField id="student_count" label="Current Students">
                <Input
                  id="student_count"
                  type="number"
                  value={formData.student_count || ''}
                  onChange={(e) => updateFormData('student_count', parseInt(e.target.value) || 0)}
                  placeholder="Current number of students"
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField id="teachers_count" label="Total Teachers">
                <Input
                  id="teachers_count"
                  type="number"
                  value={formData.teachers_count || ''}
                  onChange={(e) => updateFormData('teachers_count', parseInt(e.target.value) || 0)}
                  placeholder="Number of teachers"
                />
              </FormField>

              <FormField id="active_teachers_count" label="Active Teachers">
                <Input
                  id="active_teachers_count"
                  type="number"
                  value={formData.active_teachers_count || ''}
                  onChange={(e) => updateFormData('active_teachers_count', parseInt(e.target.value) || 0)}
                  placeholder="Number of active teachers"
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
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField id="campus_city" label="Campus City">
                <Input
                  id="campus_city"
                  value={formData.campus_city || ''}
                  onChange={(e) => updateFormData('campus_city', e.target.value)}
                  placeholder="Enter city"
                />
              </FormField>

              <FormField id="campus_state" label="Campus State">
                <Input
                  id="campus_state"
                  value={formData.campus_state || ''}
                  onChange={(e) => updateFormData('campus_state', e.target.value)}
                  placeholder="Enter state/province"
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField id="campus_postal_code" label="Postal Code">
                <Input
                  id="campus_postal_code"
                  value={formData.campus_postal_code || ''}
                  onChange={(e) => updateFormData('campus_postal_code', e.target.value)}
                  placeholder="Enter postal code"
                />
              </FormField>

              <FormField id="established_date" label="Established Date">
                <Input
                  id="established_date"
                  type="date"
                  value={formData.established_date || ''}
                  onChange={(e) => updateFormData('established_date', e.target.value)}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField id="academic_year_start" label="Academic Year Start">
                <Select
                  id="academic_year_start"
                  options={[
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
                  onChange={(value) => updateFormData('academic_year_start', parseInt(value) || 1)}
                  placeholder="Select start month"
                />
              </FormField>

              <FormField id="academic_year_end" label="Academic Year End">
                <Select
                  id="academic_year_end"
                  options={[
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
                  onChange={(value) => updateFormData('academic_year_end', parseInt(value) || 12)}
                  placeholder="Select end month"
                />
              </FormField>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Facilities</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.has_library || false}
                    onChange={(e) => handleFacilityChange('has_library', e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  <BookOpen className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">Has Library</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.has_laboratory || false}
                    onChange={(e) => handleFacilityChange('has_laboratory', e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  <FlaskConical className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">Has Laboratory</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.has_sports_facilities || false}
                    onChange={(e) => handleFacilityChange('has_sports_facilities', e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  <Dumbbell className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">Has Sports Facilities</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.has_cafeteria || false}
                    onChange={(e) => handleFacilityChange('has_cafeteria', e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  <Coffee className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">Has Cafeteria</span>
                </label>
              </div>
            </div>

            <FormField id="notes" label="Notes">
              <Textarea
                id="notes"
                value={formData.notes || ''}
                onChange={(e) => updateFormData('notes', e.target.value)}
                placeholder="Additional notes"
                rows={3}
              />
            </FormField>
          </div>
        )}

        {activeTab === 'contact' && (
          <div className="space-y-4">
            <FormField id="principal_name" label="Principal Name">
              <Input
                id="principal_name"
                value={formData.principal_name || ''}
                onChange={(e) => updateFormData('principal_name', e.target.value)}
                placeholder="Enter principal name"
                leftIcon={<User className="h-5 w-5 text-gray-400" />}
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
              />
            </FormField>

            <FormField id="address" label="School Address">
              <Textarea
                id="address"
                value={formData.address || ''}
                onChange={(e) => updateFormData('address', e.target.value)}
                placeholder="Enter school address"
                rows={3}
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField id="latitude" label="Latitude">
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  value={formData.latitude || ''}
                  onChange={(e) => updateFormData('latitude', parseFloat(e.target.value) || 0)}
                  placeholder="e.g., 29.3759"
                />
              </FormField>

              <FormField id="longitude" label="Longitude">
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  value={formData.longitude || ''}
                  onChange={(e) => updateFormData('longitude', parseFloat(e.target.value) || 0)}
                  placeholder="e.g., 47.9774"
                />
              </FormField>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SchoolFormContent;