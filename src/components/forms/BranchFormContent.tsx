/**
 * File: /src/components/forms/BranchFormContent.tsx
 * 
 * Unified Branch Form Content Component
 * Uses standard system shared components for consistency
 * 
 * Dependencies:
 *   - @/components/shared/* (FormField, Input, Select, Textarea, ImageUpload)
 *   - External: react, lucide-react
 * 
 * Database Tables:
 *   - branches (main table)
 *   - branches_additional (additional data)
 */

'use client';

import React from 'react';
import { 
  MapPin, Building, Clock, Phone, Mail, User, Hash, Navigation
} from 'lucide-react';
import { FormField, Input, Select, Textarea } from '../shared/FormField';
import { ImageUpload } from '../shared/ImageUpload';
import { ToggleSwitch } from '../shared/ToggleSwitch';

// ===== TYPE DEFINITIONS =====
interface BranchFormData {
  // Main branch fields
  name: string;
  code: string;
  school_id: string;
  status: 'active' | 'inactive';
  address: string;
  notes: string;
  logo: string;
  
  // Additional fields
  student_capacity: number;
  current_students: number;
  teachers_count: number;
  active_teachers_count: number;
  branch_head_name: string;
  branch_head_email: string;
  branch_head_phone: string;
  building_name: string;
  floor_details: string;
  opening_time: string;
  closing_time: string;
  working_days: string[];
}

interface BranchFormContentProps {
  formData: Partial<BranchFormData>;
  setFormData: (data: Partial<BranchFormData>) => void;
  formErrors: Record<string, string>;
  setFormErrors: (errors: Record<string, string>) => void;
  activeTab: 'basic' | 'additional' | 'contact';
  setActiveTab: (tab: 'basic' | 'additional' | 'contact') => void;
  schools: Array<{ id: string; name: string }>;
  isEditing?: boolean;
}

// ===== MAIN COMPONENT =====
export function BranchFormContent({
  formData,
  setFormData,
  formErrors,
  setFormErrors,
  activeTab,
  setActiveTab,
  schools,
  isEditing = false
}: BranchFormContentProps) {
  
  // Helper to update form data
  const updateFormData = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
    
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors({ ...formErrors, [field]: '' });
    }
  };

  // Helper to handle working days checkbox array
  const handleWorkingDaysChange = (day: string, checked: boolean) => {
    const current = formData.working_days || [];
    if (checked) {
      updateFormData('working_days', [...current, day]);
    } else {
      updateFormData('working_days', current.filter(d => d !== day));
    }
  };

  // Helper to get branch logo URL
  const getBranchLogoUrl = (path: string | null | undefined) => {
    if (!path) return null;
    
    // If it's already a full URL, return as is
    if (path.startsWith('http')) {
      return path;
    }
    
    // Construct Supabase storage URL
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      console.warn('VITE_SUPABASE_URL is not defined');
      return null;
    }
    
    return `${supabaseUrl}/storage/v1/object/public/branch-logos/${path}`;
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
            <FormField id="school_id" label="School" required error={formErrors.school_id}>
              <Select
                id="school_id"
                options={schools.map(s => ({ value: s.id, label: s.name }))}
                value={formData.school_id || ''}
                onChange={(value) => updateFormData('school_id', value)}
                placeholder="Select school"
              />
            </FormField>

            <FormField id="name" label="Branch Name" required error={formErrors.name}>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e) => updateFormData('name', e.target.value)}
                placeholder="Enter branch name"
              />
            </FormField>

            <FormField id="code" label="Branch Code" required error={formErrors.code}>
              <Input
                id="code"
                value={formData.code || ''}
                onChange={(e) => updateFormData('code', e.target.value)}
                placeholder="e.g., BR-001"
              />
            </FormField>

            <FormField id="status" label="Status" required error={formErrors.status}>
              <ToggleSwitch
                checked={formData.status === 'active'}
                onChange={(checked) => updateFormData('status', checked ? 'active' : 'inactive')}
                label="Branch Status"
                description={formData.status === 'active' ? 'Branch is currently active' : 'Branch is currently inactive'}
                activeLabel="Active"
                inactiveLabel="Inactive"
                showStateLabel={true}
              />
            </FormField>

            <FormField id="building_name" label="Building Name">
              <Input
                id="building_name"
                value={formData.building_name || ''}
                onChange={(e) => updateFormData('building_name', e.target.value)}
                placeholder="Enter building name"
                leftIcon={<Building className="h-5 w-5 text-gray-400" />}
              />
            </FormField>

            <FormField id="floor_details" label="Floor Details">
              <Input
                id="floor_details"
                value={formData.floor_details || ''}
                onChange={(e) => updateFormData('floor_details', e.target.value)}
                placeholder="e.g., 2nd Floor, Wing A"
                leftIcon={<Hash className="h-5 w-5 text-gray-400" />}
              />
            </FormField>

            <FormField id="address" label="Address">
              <Textarea
                id="address"
                value={formData.address || ''}
                onChange={(e) => updateFormData('address', e.target.value)}
                placeholder="Enter branch address"
                rows={3}
              />
            </FormField>

            <FormField id="logo" label="Branch Logo">
              <ImageUpload
                id="branch-logo"
                bucket="branch-logos"
                value={formData.logo}
                publicUrl={formData.logo ? getBranchLogoUrl(formData.logo) : null}
                onChange={(path) => updateFormData('logo', path || '')}
              />
            </FormField>
          </div>
        )}

        {activeTab === 'additional' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField id="student_capacity" label="Student Capacity">
                <Input
                  id="student_capacity"
                  type="number"
                  value={formData.student_capacity || ''}
                  onChange={(e) => updateFormData('student_capacity', parseInt(e.target.value) || 0)}
                  placeholder="Maximum students"
                />
              </FormField>

              <FormField id="current_students" label="Current Students">
                <Input
                  id="current_students"
                  type="number"
                  value={formData.current_students || ''}
                  onChange={(e) => updateFormData('current_students', parseInt(e.target.value) || 0)}
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

            <div className="grid grid-cols-2 gap-4">
              <FormField id="opening_time" label="Opening Time">
                <Input
                  id="opening_time"
                  type="time"
                  value={formData.opening_time || ''}
                  onChange={(e) => updateFormData('opening_time', e.target.value)}
                  leftIcon={<Clock className="h-5 w-5 text-gray-400" />}
                />
              </FormField>

              <FormField id="closing_time" label="Closing Time">
                <Input
                  id="closing_time"
                  type="time"
                  value={formData.closing_time || ''}
                  onChange={(e) => updateFormData('closing_time', e.target.value)}
                  leftIcon={<Clock className="h-5 w-5 text-gray-400" />}
                />
              </FormField>
            </div>

            <FormField id="working_days" label="Working Days">
              <div className="space-y-2">
                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                  <label key={day} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={(formData.working_days || []).includes(day)}
                      onChange={(e) => handleWorkingDaysChange(day, e.target.checked)}
                      className="rounded border-gray-300 dark:border-gray-600"
                    />
                    <span className="text-sm capitalize">{day}</span>
                  </label>
                ))}
              </div>
            </FormField>

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
            <FormField id="branch_head_name" label="Branch Head Name">
              <Input
                id="branch_head_name"
                value={formData.branch_head_name || ''}
                onChange={(e) => updateFormData('branch_head_name', e.target.value)}
                placeholder="Enter branch head name"
                leftIcon={<User className="h-5 w-5 text-gray-400" />}
              />
            </FormField>

            <FormField id="branch_head_email" label="Branch Head Email" error={formErrors.branch_head_email}>
              <Input
                id="branch_head_email"
                type="email"
                value={formData.branch_head_email || ''}
                onChange={(e) => updateFormData('branch_head_email', e.target.value)}
                placeholder="branchhead@school.com"
                leftIcon={<Mail className="h-5 w-5 text-gray-400" />}
              />
            </FormField>

            <FormField id="branch_head_phone" label="Branch Head Phone">
              <Input
                id="branch_head_phone"
                type="tel"
                value={formData.branch_head_phone || ''}
                onChange={(e) => updateFormData('branch_head_phone', e.target.value)}
                placeholder="+1 (555) 123-4567"
                leftIcon={<Phone className="h-5 w-5 text-gray-400" />}
              />
            </FormField>
          </div>
        )}
      </div>
    </div>
  );
}

export default BranchFormContent;