/**
 * File: /src/components/forms/BranchFormContent.tsx
 * 
 * FIXED: Added Company dropdown before School dropdown
 * - Company must be selected first to load schools
 * - Schools are filtered based on selected company
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
  company_id: string;  // Added company_id
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
  companies: Array<{ id: string; name: string; region_name?: string }>;
  isEditing?: boolean;
  onCompanyChange?: (companyId: string) => void;
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
  companies,
  isEditing = false,
  onCompanyChange
}: BranchFormContentProps) {
  
  const updateFormData = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
    
    // Clear error for this field when user starts typing
    if (formErrors[field]) {
      const newErrors = { ...formErrors };
      delete newErrors[field];
      setFormErrors(newErrors);
    }
  };

  const handleCompanyChange = (companyId: string) => {
    updateFormData('company_id', companyId);
    // Reset school when company changes
    updateFormData('school_id', '');
    // Call the parent's company change handler to fetch schools
    if (onCompanyChange) {
      onCompanyChange(companyId);
    }
  };

  // Get logo URL helper
  const getLogoUrl = (path: string | null) => {
    if (!path) return null;
    
    // If path is already a full URL, return it
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    
    // Get public URL from Supabase (assuming supabase is available via import)
    // For now, return null if not a full URL
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex space-x-1 border-b border-gray-200 dark:border-gray-700">
        <button
          type="button"
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'basic'
              ? 'text-[#8CC63F] border-b-2 border-[#8CC63F]'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('basic')}
        >
          Basic Info
        </button>
        <button
          type="button"
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'additional'
              ? 'text-[#8CC63F] border-b-2 border-[#8CC63F]'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('additional')}
        >
          Additional
        </button>
        <button
          type="button"
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'contact'
              ? 'text-[#8CC63F] border-b-2 border-[#8CC63F]'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('contact')}
        >
          Contact
        </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'basic' && (
          <div className="space-y-4">
            {/* Company Dropdown - ADDED */}
            <FormField 
              id="company_id" 
              label="Company" 
              required 
              error={formErrors.company_id}
              description="Select a company first to load schools"
            >
              <Select
                id="company_id"
                value={formData.company_id || ''}
                onChange={(value) => handleCompanyChange(value)}
                options={[
                  { value: '', label: 'Select company' },
                  ...(companies || []).map(company => ({
                    value: company.id,
                    label: `${company.name}${company.region_name ? ` (${company.region_name})` : ''}`
                  }))
                ]}
                placeholder="Select company"
              >
              </Select>
            </FormField>

            {/* School Dropdown - Now depends on Company */}
            <FormField 
              id="school_id" 
              label="School" 
              required 
              error={formErrors.school_id}
              description={!formData.company_id ? "Please select a company first" : undefined}
            >
              <Select
                id="school_id"
                value={formData.school_id || ''}
                onChange={(value) => updateFormData('school_id', value)}
                disabled={!formData.company_id}
                options={[
                  { value: '', label: 'Select school' },
                  ...schools.map(school => ({
                    value: school.id,
                    label: school.name
                  }))
                ]}
                placeholder="Select school"
              >
              </Select>
            </FormField>

            {/* Branch Name */}
            <FormField id="name" label="Branch Name" required error={formErrors.name}>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e) => updateFormData('name', e.target.value)}
                placeholder="Enter branch name"
                leftIcon={<MapPin className="h-5 w-5 text-gray-400" />}
              />
            </FormField>

            {/* Branch Code */}
            <FormField id="code" label="Branch Code" error={formErrors.code}>
              <Input
                id="code"
                value={formData.code || ''}
                onChange={(e) => updateFormData('code', e.target.value)}
                placeholder="e.g., BR-001"
                leftIcon={<Hash className="h-5 w-5 text-gray-400" />}
              />
            </FormField>

            {/* Status */}
            <FormField id="status" label="Status" required>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Branch Status
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {formData.status === 'active' 
                      ? 'Branch is currently active' 
                      : 'Branch is currently inactive'}
                  </p>
                </div>
                <ToggleSwitch
                  checked={formData.status === 'active'}
                  onChange={(checked) => updateFormData('status', checked ? 'active' : 'inactive')}
                  label="Active"
                />
              </div>
            </FormField>

            {/* Building Name */}
            <FormField id="building_name" label="Building Name">
              <Input
                id="building_name"
                value={formData.building_name || ''}
                onChange={(e) => updateFormData('building_name', e.target.value)}
                placeholder="Enter building name"
                leftIcon={<Building className="h-5 w-5 text-gray-400" />}
              />
            </FormField>

            {/* Floor Details */}
            <FormField id="floor_details" label="Floor Details">
              <Input
                id="floor_details"
                value={formData.floor_details || ''}
                onChange={(e) => updateFormData('floor_details', e.target.value)}
                placeholder="e.g., 2nd Floor, Wing A"
                leftIcon={<Navigation className="h-5 w-5 text-gray-400" />}
              />
            </FormField>

            {/* Address */}
            <FormField id="address" label="Address">
              <Textarea
                id="address"
                value={formData.address || ''}
                onChange={(e) => updateFormData('address', e.target.value)}
                placeholder="Enter branch address"
                rows={3}
              />
            </FormField>

            {/* Branch Logo */}
            <FormField id="logo" label="Branch Logo">
              <ImageUpload
                id="branch-logo"
                bucket="branch-logos"
                value={formData.logo}
                publicUrl={formData.logo ? getLogoUrl(formData.logo) : null}
                onChange={(path) => updateFormData('logo', path)}
              />
            </FormField>

            {/* Notes */}
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

        {activeTab === 'additional' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField id="student_capacity" label="Student Capacity">
                <Input
                  id="student_capacity"
                  type="number"
                  value={formData.student_capacity || ''}
                  onChange={(e) => updateFormData('student_capacity', parseInt(e.target.value) || undefined)}
                  placeholder="0"
                />
              </FormField>

              <FormField id="current_students" label="Current Students">
                <Input
                  id="current_students"
                  type="number"
                  value={formData.current_students || ''}
                  onChange={(e) => updateFormData('current_students', parseInt(e.target.value) || undefined)}
                  placeholder="0"
                />
              </FormField>

              <FormField id="teachers_count" label="Total Teachers">
                <Input
                  id="teachers_count"
                  type="number"
                  value={formData.teachers_count || ''}
                  onChange={(e) => updateFormData('teachers_count', parseInt(e.target.value) || undefined)}
                  placeholder="0"
                />
              </FormField>

              <FormField id="active_teachers_count" label="Active Teachers">
                <Input
                  id="active_teachers_count"
                  type="number"
                  value={formData.active_teachers_count || ''}
                  onChange={(e) => updateFormData('active_teachers_count', parseInt(e.target.value) || undefined)}
                  placeholder="0"
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
              <div className="grid grid-cols-7 gap-2">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                  <label key={day} className="flex items-center space-x-1">
                    <input
                      type="checkbox"
                      checked={(formData.working_days || []).includes(day)}
                      onChange={(e) => {
                        const days = formData.working_days || [];
                        if (e.target.checked) {
                          updateFormData('working_days', [...days, day]);
                        } else {
                          updateFormData('working_days', days.filter(d => d !== day));
                        }
                      }}
                      className="rounded border-gray-300 text-[#8CC63F] focus:ring-[#8CC63F]"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{day}</span>
                  </label>
                ))}
              </div>
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