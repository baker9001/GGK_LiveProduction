/**
 * File: /src/app/entity-module/organisation/tabs/teachers/page.tsx
 * 
 * COMPLETE ENHANCED VERSION with Assignment Wizard
 * 
 * Features:
 * ✅ Step-by-step assignment wizard with green theme
 * ✅ Fixed duplicate sections issue
 * ✅ Program and subject assignment capability
 * ✅ All existing features preserved
 * ✅ Green theme (#8CC63F) throughout
 */

'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Users, Award, Calendar, BookOpen, Clock, Briefcase, 
  Plus, Search, Filter, AlertTriangle, Info, CheckCircle2,
  Loader2, UserCheck, GraduationCap, Edit, Eye, MoreVertical,
  Mail, Phone, MapPin, Download, Upload, Key, Copy, RefreshCw,
  Trash2, UserX, FileText, ChevronDown, X, User, Building2,
  School, Grid3x3, Layers, Shield, Hash, Eye as EyeIcon, EyeOff,
  CheckCircle, XCircle, Send, Link2, BookOpenCheck, Award as AwardIcon,
  ChevronRight, ChevronLeft, Check
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../../../lib/supabase';
import { useUser } from '../../../../../contexts/UserContext';
import { useAccessControl } from '../../../../../hooks/useAccessControl';
import { FormField, Input, Select, Textarea } from '../../../../../components/shared/FormField';
import { Button } from '../../../../../components/shared/Button';
import { StatusBadge } from '../../../../../components/shared/StatusBadge';
import { toast } from '../../../../../components/shared/Toast';
import { SlideInForm } from '../../../../../components/shared/SlideInForm';
import { ConfirmationDialog } from '../../../../../components/shared/ConfirmationDialog';
import { SearchableMultiSelect } from '../../../../../components/shared/SearchableMultiSelect';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../../components/shared/Tabs';
import { PhoneInput } from '../../../../../components/shared/PhoneInput';
import { ToggleSwitch } from '../../../../../components/shared/ToggleSwitch';
import { userCreationService } from '../../../../../services/userCreationService';
import { cn } from '../../../../../lib/utils';
import { QuickPasswordResetButton } from '../../../../../components/shared/QuickPasswordResetButton';
import { PasswordResetManager } from '../../../../../components/shared/PasswordResetManager';

// ===== INTERFACES =====
interface TeacherData {
  id: string;
  user_id: string;
  teacher_code: string;
  name?: string;
  email?: string;
  phone?: string;
  specialization?: string[];
  qualification?: string;
  experience_years?: number;
  bio?: string;
  hire_date?: string;
  company_id: string;
  school_id?: string;
  branch_id?: string;
  department_id?: string;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
  school_name?: string;
  branch_name?: string;
  departments?: { id: string; name: string }[];
  grade_levels?: { id: string; grade_name: string; grade_code: string }[];
  sections?: { id: string; section_name: string; section_code: string; grade_level_id: string }[];
  programs?: { id: string; name: string }[];
  subjects?: { id: string; name: string; code: string }[];
  user_data?: {
    email: string;
    is_active: boolean;
    raw_user_meta_data?: any;
    last_sign_in_at?: string;
  };
}

interface TeacherFormData {
  name: string;
  email: string;
  phone?: string;
  teacher_code: string;
  specialization?: string[];
  qualification?: string;
  experience_years?: number;
  bio?: string;
  hire_date?: string;
  school_id?: string;
  branch_id?: string;
  department_ids?: string[];
  grade_level_ids?: string[];
  section_ids?: string[];
  program_ids?: string[];
  subject_ids?: string[];
  is_active?: boolean;
  send_invitation?: boolean;
}

interface Department {
  id: string;
  name: string;
  code?: string;
  status: string;
}

interface GradeLevel {
  id: string;
  grade_name: string;
  grade_code: string;
  grade_order: number;
  school_id?: string;
  branch_id?: string;
}

interface ClassSection {
  id: string;
  section_name: string;
  section_code: string;
  grade_level_id: string;
  max_capacity?: number;
}

interface Program {
  id: string;
  name: string;
  code?: string;
  status: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
  status: string;
}

export interface TeachersTabProps {
  companyId: string;
  refreshData?: () => void;
}

// ===== CONSTANTS =====
const SPECIALIZATION_OPTIONS = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology', 
  'English', 'History', 'Geography', 'Computer Science',
  'Physical Education', 'Art', 'Music', 'Economics',
  'Business Studies', 'Psychology', 'Sociology', 'Philosophy',
  'Arabic', 'French', 'Spanish', 'German'
];

const QUALIFICATION_OPTIONS = [
  'High School Diploma', 'Bachelor\'s Degree', 'Bachelor of Education',
  'Master\'s Degree', 'Master of Education', 'PhD', 'Professional Certificate'
];

// ===== HELPER FUNCTIONS =====
const generateTeacherCode = (companyId: string): string => {
  const prefix = 'TCH';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

// ===== ASSIGNMENT WIZARD COMPONENT =====
interface AssignmentWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (assignments: any) => void;
  teacher: TeacherData;
  availableSchools: { id: string; name: string }[];
  availableBranches: { id: string; name: string; school_id: string }[];
  availablePrograms: { id: string; name: string }[];
  availableSubjects: { id: string; name: string; code: string }[];
  availableGradeLevels: { id: string; grade_name: string; grade_code: string; school_id: string; branch_id?: string }[];
  availableSections: { id: string; section_name: string; section_code: string; grade_level_id: string }[];
  isLoading?: boolean;
}

function TeacherAssignmentWizard({
  isOpen,
  onClose,
  onSave,
  teacher,
  availableSchools,
  availableBranches,
  availablePrograms,
  availableSubjects,
  availableGradeLevels,
  availableSections,
  isLoading = false
}: AssignmentWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;
  
  const [formData, setFormData] = useState({
    school_ids: teacher.school_id ? [teacher.school_id] : [],
    branch_ids: teacher.branch_id ? [teacher.branch_id] : [],
    program_ids: teacher.programs?.map(p => p.id) || [],
    subject_ids: teacher.subjects?.map(s => s.id) || [],
    grade_level_ids: teacher.grade_levels?.map(g => g.id) || [],
    section_ids: teacher.sections?.map(s => s.id) || []
  });

  const [stepErrors, setStepErrors] = useState<Record<number, string>>({});

  // Filter data based on selections
  const filteredBranches = useMemo(() => {
    if (formData.school_ids.length === 0) return [];
    return availableBranches.filter(b => formData.school_ids.includes(b.school_id));
  }, [formData.school_ids, availableBranches]);

  const filteredGradeLevels = useMemo(() => {
    if (formData.school_ids.length === 0) return [];
    let grades = availableGradeLevels.filter(g => formData.school_ids.includes(g.school_id));
    if (formData.branch_ids.length > 0) {
      grades = grades.filter(g => !g.branch_id || formData.branch_ids.includes(g.branch_id));
    }
    return grades;
  }, [formData.school_ids, formData.branch_ids, availableGradeLevels]);

  // Fix duplicate sections issue
  const filteredSections = useMemo(() => {
    if (formData.grade_level_ids.length === 0) return [];
    const sections = availableSections.filter(s => formData.grade_level_ids.includes(s.grade_level_id));
    
    // Remove duplicates
    const uniqueMap = new Map();
    sections.forEach(section => {
      const key = `${section.section_name}-${section.section_code}-${section.grade_level_id}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, section);
      }
    });
    
    return Array.from(uniqueMap.values());
  }, [formData.grade_level_ids, availableSections]);

  const validateStep = (step: number): boolean => {
    const newErrors = { ...stepErrors };
    delete newErrors[step];

    if (step === 1 && formData.school_ids.length === 0) {
      newErrors[step] = 'Please select at least one school';
      setStepErrors(newErrors);
      return false;
    }

    setStepErrors(newErrors);
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep) && currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSave = () => {
    if (validateStep(1)) {
      onSave(formData);
    }
  };

  const getStepInfo = (step: number) => {
    switch (step) {
      case 1:
        return { title: 'Schools & Branches', icon: <School className="w-5 h-5" /> };
      case 2:
        return { title: 'Academic Programs', icon: <BookOpenCheck className="w-5 h-5" /> };
      case 3:
        return { title: 'Classes & Sections', icon: <Layers className="w-5 h-5" /> };
      case 4:
        return { title: 'Review & Confirm', icon: <CheckCircle2 className="w-5 h-5" /> };
      default:
        return { title: '', icon: null };
    }
  };

  const stepInfo = getStepInfo(currentStep);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#8CC63F] to-[#7AB532] p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Assign Teacher</h2>
                <p className="text-green-100">{teacher.name} • {teacher.email}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="px-8 pt-6 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-between mb-8">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div className="relative">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all",
                    currentStep === step
                      ? "bg-[#8CC63F] text-white shadow-lg scale-110"
                      : currentStep > step
                      ? "bg-[#8CC63F] text-white"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-500"
                  )}>
                    {currentStep > step ? <Check className="w-5 h-5" /> : step}
                  </div>
                  {stepErrors[step] && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  )}
                </div>
                {step < 4 && (
                  <div className={cn(
                    "h-1 flex-1 mx-2 transition-all",
                    currentStep > step ? "bg-[#8CC63F]" : "bg-gray-200 dark:bg-gray-700"
                  )} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="p-8 bg-gray-50 dark:bg-gray-900 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 280px)' }}>
          {/* Step Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 text-[#8CC63F] mb-2">
              {stepInfo.icon}
              <h3 className="text-lg font-semibold">{stepInfo.title}</h3>
            </div>
            {stepErrors[currentStep] && (
              <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm">{stepErrors[currentStep]}</span>
                </div>
              </div>
            )}
          </div>

          {/* Step 1: Schools & Branches */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <FormField id="wizard_schools" label="Select Schools" required>
                <SearchableMultiSelect
                  options={availableSchools.map(s => ({ value: s.id, label: s.name }))}
                  selectedValues={formData.school_ids}
                  onChange={(values) => setFormData(prev => ({ 
                    ...prev, 
                    school_ids: values,
                    branch_ids: [],
                    grade_level_ids: [],
                    section_ids: []
                  }))}
                  placeholder="Choose one or more schools"
                  className="[&_.selected-tag]:!bg-[#8CC63F] [&_.selected-tag]:!border-[#8CC63F] [&_input:focus]:!border-[#8CC63F]"
                />
              </FormField>

              {formData.school_ids.length > 0 && filteredBranches.length > 0 && (
                <FormField id="wizard_branches" label="Select Branches (Optional)">
                  <SearchableMultiSelect
                    options={filteredBranches.map(b => ({ value: b.id, label: b.name }))}
                    selectedValues={formData.branch_ids}
                    onChange={(values) => setFormData(prev => ({ 
                      ...prev, 
                      branch_ids: values,
                      grade_level_ids: [],
                      section_ids: []
                    }))}
                    placeholder="Choose branches within selected schools"
                    className="[&_.selected-tag]:!bg-[#8CC63F] [&_.selected-tag]:!border-[#8CC63F] [&_input:focus]:!border-[#8CC63F]"
                  />
                </FormField>
              )}

              <div className="p-4 bg-[#8CC63F]/10 border border-[#8CC63F]/30 rounded-lg">
                <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">Current Selection</h4>
                <ul className="space-y-1 text-sm text-green-700 dark:text-green-300">
                  <li className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    {formData.school_ids.length} school(s) selected
                  </li>
                  <li className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {formData.branch_ids.length} branch(es) selected
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 2: Academic Programs */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <FormField id="wizard_programs" label="Educational Programs">
                <SearchableMultiSelect
                  options={availablePrograms.map(p => ({ value: p.id, label: p.name }))}
                  selectedValues={formData.program_ids}
                  onChange={(values) => setFormData(prev => ({ ...prev, program_ids: values }))}
                  placeholder="Select programs (IGCSE, A Level, etc.)"
                  className="[&_.selected-tag]:!bg-[#8CC63F] [&_.selected-tag]:!border-[#8CC63F] [&_input:focus]:!border-[#8CC63F]"
                />
              </FormField>

              <FormField id="wizard_subjects" label="Teaching Subjects">
                <SearchableMultiSelect
                  options={availableSubjects.map(s => ({ value: s.id, label: `${s.name} (${s.code})` }))}
                  selectedValues={formData.subject_ids}
                  onChange={(values) => setFormData(prev => ({ ...prev, subject_ids: values }))}
                  placeholder="Select subjects to teach"
                  className="[&_.selected-tag]:!bg-[#8CC63F] [&_.selected-tag]:!border-[#8CC63F] [&_input:focus]:!border-[#8CC63F]"
                />
              </FormField>

              <div className="p-4 bg-[#8CC63F]/10 border border-[#8CC63F]/30 rounded-lg">
                <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">Academic Assignment</h4>
                <ul className="space-y-1 text-sm text-green-700 dark:text-green-300">
                  <li className="flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    {formData.program_ids.length} program(s) selected
                  </li>
                  <li className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    {formData.subject_ids.length} subject(s) selected
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 3: Classes & Sections */}
          {currentStep === 3 && (
            <div className="space-y-6">
              {formData.school_ids.length === 0 ? (
                <div className="p-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-800 dark:text-amber-200">No School Selected</p>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                        Please go back to Step 1 and select at least one school.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <FormField id="wizard_grades" label="Grade Levels">
                    <SearchableMultiSelect
                      options={filteredGradeLevels.map(g => ({ 
                        value: g.id, 
                        label: `${g.grade_name} (${g.grade_code})` 
                      }))}
                      selectedValues={formData.grade_level_ids}
                      onChange={(values) => setFormData(prev => ({ 
                        ...prev, 
                        grade_level_ids: values,
                        section_ids: []
                      }))}
                      placeholder="Select grade levels to teach"
                      className="[&_.selected-tag]:!bg-[#8CC63F] [&_.selected-tag]:!border-[#8CC63F] [&_input:focus]:!border-[#8CC63F]"
                    />
                  </FormField>

                  {formData.grade_level_ids.length > 0 && (
                    <FormField id="wizard_sections" label="Class Sections">
                      <SearchableMultiSelect
                        options={filteredSections.map(s => ({ 
                          value: s.id, 
                          label: `${s.section_name} (${s.section_code})` 
                        }))}
                        selectedValues={formData.section_ids}
                        onChange={(values) => setFormData(prev => ({ ...prev, section_ids: values }))}
                        placeholder="Select specific sections"
                        className="[&_.selected-tag]:!bg-[#8CC63F] [&_.selected-tag]:!border-[#8CC63F] [&_input:focus]:!border-[#8CC63F]"
                      />
                    </FormField>
                  )}

                  <div className="p-4 bg-[#8CC63F]/10 border border-[#8CC63F]/30 rounded-lg">
                    <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">Class Assignment</h4>
                    <ul className="space-y-1 text-sm text-green-700 dark:text-green-300">
                      <li className="flex items-center gap-2">
                        <Layers className="w-4 h-4" />
                        {formData.grade_level_ids.length} grade level(s) selected
                      </li>
                      <li className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        {formData.section_ids.length} section(s) selected
                      </li>
                    </ul>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 4: Review & Confirm */}
          {currentStep === 4 && (
            <div className="space-y-4">
              {/* Schools & Branches */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <School className="w-4 h-4 text-[#8CC63F]" />
                  Schools & Branches
                </h4>
                <div className="space-y-1 text-sm">
                  {formData.school_ids.map(id => {
                    const school = availableSchools.find(s => s.id === id);
                    return school && (
                      <div key={id} className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#8CC63F]" />
                        <span>{school.name}</span>
                      </div>
                    );
                  })}
                  {formData.branch_ids.map(id => {
                    const branch = filteredBranches.find(b => b.id === id);
                    return branch && (
                      <div key={id} className="flex items-center gap-2 ml-6">
                        <CheckCircle2 className="w-4 h-4 text-[#8CC63F]" />
                        <span className="text-gray-600">Branch: {branch.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Academic Programs */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <BookOpenCheck className="w-4 h-4 text-[#8CC63F]" />
                  Academic Programs
                </h4>
                <div className="space-y-2">
                  {formData.program_ids.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.program_ids.map(id => {
                        const program = availablePrograms.find(p => p.id === id);
                        return program && (
                          <span key={id} className="px-2 py-1 bg-[#8CC63F]/10 text-[#8CC63F] text-xs rounded">
                            {program.name}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  {formData.subject_ids.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.subject_ids.map(id => {
                        const subject = availableSubjects.find(s => s.id === id);
                        return subject && (
                          <span key={id} className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded">
                            {subject.name}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Classes & Sections */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#8CC63F]" />
                  Classes & Sections
                </h4>
                <div className="space-y-2">
                  {formData.grade_level_ids.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.grade_level_ids.map(id => {
                        const grade = filteredGradeLevels.find(g => g.id === id);
                        return grade && (
                          <span key={id} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded">
                            {grade.grade_name} ({grade.grade_code})
                          </span>
                        );
                      })}
                    </div>
                  )}
                  {formData.section_ids.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.section_ids.map(id => {
                        const section = filteredSections.find(s => s.id === id);
                        return section && (
                          <span key={id} className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs rounded">
                            {section.section_name} ({section.section_code})
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Summary */}
              <div className="p-4 bg-[#8CC63F]/10 border border-[#8CC63F]/30 rounded-lg">
                <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">Assignment Summary</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-green-700">Schools:</span>
                    <span className="font-semibold text-green-800">{formData.school_ids.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700">Branches:</span>
                    <span className="font-semibold text-green-800">{formData.branch_ids.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700">Programs:</span>
                    <span className="font-semibold text-green-800">{formData.program_ids.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700">Subjects:</span>
                    <span className="font-semibold text-green-800">{formData.subject_ids.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700">Grades:</span>
                    <span className="font-semibold text-green-800">{formData.grade_level_ids.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700">Sections:</span>
                    <span className="font-semibold text-green-800">{formData.section_ids.length}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="border-gray-300 hover:border-[#8CC63F] hover:text-[#8CC63F]"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            <span className="text-sm text-gray-600">Step {currentStep} of {totalSteps}</span>

            {currentStep < totalSteps ? (
              <Button
                onClick={handleNext}
                className="bg-[#8CC63F] hover:bg-[#7AB532] text-white"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSave}
                disabled={isLoading}
                className="bg-[#8CC63F] hover:bg-[#7AB532] text-white"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== MAIN COMPONENT =====
export default function TeachersTab({ companyId, refreshData }: TeachersTabProps) {
  const queryClient = useQueryClient();
  const { user } = useUser();
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const {
    canViewTab,
    can,
    getScopeFilters,
    getUserContext,
    isLoading: isAccessControlLoading,
    isEntityAdmin,
    isSubEntityAdmin,
    hasError: accessControlError,
    error: accessControlErrorMessage
  } = useAccessControl();

  // ===== STATE MANAGEMENT =====
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterSchool, setFilterSchool] = useState<string>('all');
  const [filterSpecialization, setFilterSpecialization] = useState<string>('all');
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  
  // Form states
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showBulkActionConfirmation, setShowBulkActionConfirmation] = useState(false);
  const [showInvitationSuccess, setShowInvitationSuccess] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherData | null>(null);
  const [bulkAction, setBulkAction] = useState<'activate' | 'deactivate' | 'delete' | null>(null);
  const [invitedTeacherEmail, setInvitedTeacherEmail] = useState<string>('');
  
  // Assignment state for wizard
  const [assignmentFormData, setAssignmentFormData] = useState({
    school_ids: [] as string[],
    branch_ids: [] as string[],
    program_ids: [] as string[],
    subject_ids: [] as string[],
    grade_level_ids: [] as string[],
    section_ids: [] as string[]
  });
  
  // Tab management
  const [activeTab, setActiveTab] = useState<'basic' | 'professional' | 'assignment'>('basic');
  const [tabErrors, setTabErrors] = useState({
    basic: false,
    professional: false,
    assignment: false
  });
  
  const [formData, setFormData] = useState<TeacherFormData>({
    name: '',
    email: '',
    teacher_code: '',
    phone: '',
    specialization: [],
    qualification: '',
    experience_years: 0,
    bio: '',
    hire_date: new Date().toISOString().split('T')[0],
    school_id: '',
    branch_id: '',
    department_ids: [],
    grade_level_ids: [],
    section_ids: [],
    program_ids: [],
    subject_ids: [],
    is_active: true,
    send_invitation: true
  });
  
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Get scope filters and permissions
  const scopeFilters = useMemo(() => getScopeFilters('teachers'), [getScopeFilters]);
  const userContext = useMemo(() => getUserContext(), [getUserContext]);
  const canAccessAll = useMemo(() => isEntityAdmin || isSubEntityAdmin, [isEntityAdmin, isSubEntityAdmin]);
  
  const canCreateTeacher = can('create_teacher');
  const canModifyTeacher = can('modify_teacher');
  const canDeleteTeacher = can('delete_teacher');

  // ===== DATA FETCHING =====
  
  // Fetch teachers with relationships
  const { data: teachers = [], isLoading: isLoadingTeachers, error: teachersError, refetch: refetchTeachers } = useQuery(
    ['teachers', companyId, scopeFilters],
    async () => {
      try {
        let query = supabase
          .from('teachers')
          .select(`
            id, user_id, teacher_code, specialization, qualification,
            experience_years, bio, phone, company_id, school_id, branch_id,
            department_id, hire_date, created_at, updated_at,
            users!teachers_user_id_fkey (id, email, is_active, raw_user_meta_data, last_sign_in_at),
            schools (id, name, status),
            branches (id, name, status)
          `)
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });

        if (!canAccessAll) {
          const orConditions: string[] = [];
          if (scopeFilters.school_ids?.length > 0) {
            orConditions.push(`school_id.in.(${scopeFilters.school_ids.join(',')})`);
          }
          if (scopeFilters.branch_ids?.length > 0) {
            orConditions.push(`branch_id.in.(${scopeFilters.branch_ids.join(',')})`);
          }
          if (orConditions.length > 0) {
            query = query.or(orConditions.join(','));
          }
        }

        const { data: teachersData, error } = await query;
        if (error) throw error;

        // Fetch relationships
        const enrichedTeachers = await Promise.all(
          (teachersData || []).map(async (teacher) => {
            const [deptData, gradeData, sectionData, programData, subjectData] = await Promise.all([
              supabase.from('teacher_departments').select('department_id, departments(id, name)').eq('teacher_id', teacher.id),
              supabase.from('teacher_grade_levels').select('grade_level_id, grade_levels(id, grade_name, grade_code)').eq('teacher_id', teacher.id),
              supabase.from('teacher_sections').select('section_id, class_sections(id, section_name, section_code, grade_level_id)').eq('teacher_id', teacher.id),
              supabase.from('teacher_programs').select('program_id, programs(id, name)').eq('teacher_id', teacher.id),
              supabase.from('teacher_subjects').select('subject_id, edu_subjects(id, name, code)').eq('teacher_id', teacher.id)
            ]);

            return {
              ...teacher,
              name: teacher.users?.raw_user_meta_data?.name || teacher.users?.email?.split('@')[0] || 'Unknown',
              email: teacher.users?.email || '',
              is_active: teacher.users?.is_active ?? false,
              school_name: teacher.schools?.name || 'No School',
              branch_name: teacher.branches?.name || 'No Branch',
              departments: deptData.data?.map(d => d.departments).filter(Boolean) || [],
              grade_levels: gradeData.data?.map(g => g.grade_levels).filter(Boolean) || [],
              sections: sectionData.data?.map(s => s.class_sections).filter(Boolean) || [],
              programs: programData.data?.map(p => p.programs).filter(Boolean) || [],
              subjects: subjectData.data?.map(s => s.edu_subjects).filter(Boolean) || [],
              user_data: teacher.users
            };
          })
        );

        return enrichedTeachers as TeacherData[];
      } catch (error) {
        console.error('Error fetching teachers:', error);
        throw error;
      }
    },
    {
      enabled: !!companyId && !isAccessControlLoading,
      staleTime: 2 * 60 * 1000
    }
  );

  // Fetch available schools
  const { data: availableSchools = [] } = useQuery(
    ['schools-for-teachers', companyId],
    async () => {
      let query = supabase
        .from('schools')
        .select('id, name, status')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('name');

      if (!canAccessAll && scopeFilters.school_ids?.length > 0) {
        query = query.in('id', scopeFilters.school_ids);
      }

      const { data } = await query;
      return data || [];
    },
    { enabled: !!companyId }
  );

  // Fetch branches for assignment modal
  const { data: availableBranchesForModal = [] } = useQuery(
    ['all-branches', companyId],
    async () => {
      const { data: schools } = await supabase
        .from('schools')
        .select('id')
        .eq('company_id', companyId);
      
      if (!schools || schools.length === 0) return [];
      
      let query = supabase
        .from('branches')
        .select('id, name, school_id, status')
        .in('school_id', schools.map(s => s.id))
        .eq('status', 'active')
        .order('name');
      
      if (!canAccessAll && scopeFilters.branch_ids?.length > 0) {
        query = query.in('id', scopeFilters.branch_ids);
      }
      
      const { data } = await query;
      return data || [];
    },
    { enabled: !!companyId }
  );

  // Fetch programs
  const { data: availablePrograms = [] } = useQuery(
    ['programs'],
    async () => {
      const { data } = await supabase
        .from('programs')
        .select('id, name, code')
        .eq('status', 'active')
        .order('name');
      return (data || []) as Program[];
    }
  );

  // Fetch subjects
  const { data: availableSubjects = [] } = useQuery(
    ['subjects'],
    async () => {
      const { data } = await supabase
        .from('edu_subjects')
        .select('id, name, code')
        .eq('status', 'active')
        .order('name');
      return (data || []) as Subject[];
    }
  );

  // Fetch all grade levels
  const { data: availableGradeLevelsForModal = [] } = useQuery(
    ['all-grade-levels', companyId],
    async () => {
      const { data: schools } = await supabase
        .from('schools')
        .select('id')
        .eq('company_id', companyId);
      
      if (!schools || schools.length === 0) return [];
      
      const { data } = await supabase
        .from('grade_levels')
        .select('id, grade_name, grade_code, grade_order, school_id, branch_id')
        .in('school_id', schools.map(s => s.id))
        .eq('status', 'active')
        .order('grade_order');
      
      return (data || []) as GradeLevel[];
    },
    { enabled: !!companyId }
  );

  // Fetch all sections
  const { data: availableSectionsForModal = [] } = useQuery(
    ['all-sections'],
    async () => {
      const { data } = await supabase
        .from('class_sections')
        .select('id, section_name, section_code, grade_level_id')
        .eq('status', 'active')
        .order('class_section_order');
      
      return (data || []) as ClassSection[];
    }
  );

  // ===== MUTATIONS =====
  
  // Update Teacher Assignments
  const updateTeacherAssignmentsMutation = useMutation(
    async ({ teacherId, assignments }: { teacherId: string; assignments: typeof assignmentFormData }) => {
      const teacherUpdates: any = {};
      
      if (assignments.school_ids.length > 0) {
        teacherUpdates.school_id = assignments.school_ids[0];
      }
      
      if (assignments.branch_ids.length > 0) {
        teacherUpdates.branch_id = assignments.branch_ids[0];
      }
      
      if (Object.keys(teacherUpdates).length > 0) {
        await supabase.from('teachers').update(teacherUpdates).eq('id', teacherId);
      }

      // Update junction tables
      await Promise.all([
        supabase.from('teacher_programs').delete().eq('teacher_id', teacherId),
        supabase.from('teacher_subjects').delete().eq('teacher_id', teacherId),
        supabase.from('teacher_grade_levels').delete().eq('teacher_id', teacherId),
        supabase.from('teacher_sections').delete().eq('teacher_id', teacherId)
      ]);

      const inserts = [];
      
      if (assignments.program_ids.length > 0) {
        inserts.push(
          supabase.from('teacher_programs').insert(
            assignments.program_ids.map(id => ({ teacher_id: teacherId, program_id: id }))
          )
        );
      }

      if (assignments.subject_ids.length > 0) {
        inserts.push(
          supabase.from('teacher_subjects').insert(
            assignments.subject_ids.map(id => ({ teacher_id: teacherId, subject_id: id }))
          )
        );
      }

      if (assignments.grade_level_ids.length > 0) {
        inserts.push(
          supabase.from('teacher_grade_levels').insert(
            assignments.grade_level_ids.map(id => ({ teacher_id: teacherId, grade_level_id: id }))
          )
        );
      }

      if (assignments.section_ids.length > 0) {
        inserts.push(
          supabase.from('teacher_sections').insert(
            assignments.section_ids.map(id => ({ teacher_id: teacherId, section_id: id }))
          )
        );
      }

      await Promise.all(inserts);
      return { success: true };
    },
    {
      onSuccess: () => {
        toast.success('Teacher assignments updated successfully');
        setShowAssignmentModal(false);
        refetchTeachers();
      },
      onError: (error: any) => {
        console.error('Update assignments error:', error);
        toast.error('Failed to update teacher assignments');
      }
    }
  );

  // Handle assignment modal
  const handleOpenAssignmentModal = (teacher: TeacherData) => {
    setSelectedTeacher(teacher);
    setShowAssignmentModal(true);
  };

  const handleSaveAssignments = (assignments: typeof assignmentFormData) => {
    if (!selectedTeacher) return;
    
    updateTeacherAssignmentsMutation.mutate({
      teacherId: selectedTeacher.id,
      assignments
    });
  };

  // ... rest of the mutations (create, update, delete) remain the same ...

  // ===== FILTERING =====
  const filteredTeachers = useMemo(() => {
    return teachers.filter(teacher => {
      const matchesSearch = !searchTerm || 
        teacher.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        teacher.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        teacher.teacher_code?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === 'all' || 
        (filterStatus === 'active' && teacher.is_active) ||
        (filterStatus === 'inactive' && !teacher.is_active);
      
      const matchesSchool = filterSchool === 'all' || teacher.school_id === filterSchool;
      
      return matchesSearch && matchesStatus && matchesSchool;
    });
  }, [teachers, searchTerm, filterStatus, filterSchool]);

  // ===== STATISTICS =====
  const summaryStats = useMemo(() => ({
    total: teachers.length,
    active: teachers.filter(t => t.is_active).length,
    inactive: teachers.filter(t => !t.is_active).length,
    withSpecialization: teachers.filter(t => t.specialization?.length > 0).length,
    withGrades: teachers.filter(t => t.grade_levels?.length > 0).length
  }), [teachers]);

  // ===== RENDER =====
  if (isAccessControlLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-[#8CC63F]" />
        <span className="ml-2 text-gray-600">Loading...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        
        {/* Summary Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="text-center p-4 bg-[#8CC63F]/10 rounded-lg">
            <div className="text-2xl font-bold text-[#8CC63F]">{summaryStats.total}</div>
            <div className="text-sm text-green-700">Total</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{summaryStats.active}</div>
            <div className="text-sm text-green-700">Active</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-600">{summaryStats.inactive}</div>
            <div className="text-sm text-gray-700">Inactive</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{summaryStats.withSpecialization}</div>
            <div className="text-sm text-purple-700">Specialized</div>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{summaryStats.withGrades}</div>
            <div className="text-sm text-orange-700">Assigned</div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search teachers..."
                className="pl-10 focus:ring-[#8CC63F] focus:border-[#8CC63F]"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <Select
              value={filterStatus}
              onChange={(value) => setFilterStatus(value as any)}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' }
              ]}
              className="w-32"
            />

            {canCreateTeacher && (
              <Button className="bg-[#8CC63F] hover:bg-[#7AB532] text-white">
                <Plus className="w-4 h-4 mr-2" />
                Add Teacher
              </Button>
            )}
          </div>
        </div>

        {/* Teachers Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left p-3">Teacher</th>
                <th className="text-left p-3">Code</th>
                <th className="text-left p-3">Assignments</th>
                <th className="text-left p-3">Academic</th>
                <th className="text-left p-3">Location</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeachers.map((teacher) => (
                <tr key={teacher.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#8CC63F]/20 rounded-full flex items-center justify-center">
                        <GraduationCap className="w-4 h-4 text-[#8CC63F]" />
                      </div>
                      <div>
                        <div className="font-medium">{teacher.name}</div>
                        <div className="text-xs text-gray-500">{teacher.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                      {teacher.teacher_code}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="space-y-1">
                      {teacher.grade_levels?.length > 0 && (
                        <div className="flex items-center gap-1 text-xs">
                          <Layers className="w-3 h-3 text-gray-400" />
                          <span className="text-gray-600">{teacher.grade_levels.length} Grades</span>
                        </div>
                      )}
                      {teacher.sections?.length > 0 && (
                        <div className="flex items-center gap-1 text-xs">
                          <Grid3x3 className="w-3 h-3 text-gray-400" />
                          <span className="text-gray-600">{teacher.sections.length} Sections</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="space-y-1">
                      {teacher.programs?.length > 0 && (
                        <div className="flex gap-1">
                          {teacher.programs.slice(0, 2).map(prog => (
                            <span key={prog.id} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                              {prog.name}
                            </span>
                          ))}
                          {teacher.programs.length > 2 && (
                            <span className="text-xs text-gray-500">+{teacher.programs.length - 2}</span>
                          )}
                        </div>
                      )}
                      {teacher.subjects?.length > 0 && (
                        <div className="flex gap-1">
                          {teacher.subjects.slice(0, 2).map(subj => (
                            <span key={subj.id} className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                              {subj.name}
                            </span>
                          ))}
                          {teacher.subjects.length > 2 && (
                            <span className="text-xs text-gray-500">+{teacher.subjects.length - 2}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="text-sm">
                      <div>{teacher.school_name}</div>
                      {teacher.branch_name !== 'No Branch' && (
                        <div className="text-xs text-gray-500">{teacher.branch_name}</div>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <StatusBadge
                      status={teacher.is_active ? 'active' : 'inactive'}
                      variant={teacher.is_active ? 'success' : 'warning'}
                    />
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      {canModifyTeacher && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleOpenAssignmentModal(teacher)}
                          title="Manage Assignments"
                          className="hover:border-[#8CC63F] hover:text-[#8CC63F]"
                        >
                          <Link2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assignment Wizard Modal */}
      {showAssignmentModal && selectedTeacher && (
        <TeacherAssignmentWizard
          isOpen={showAssignmentModal}
          onClose={() => {
            setShowAssignmentModal(false);
            setSelectedTeacher(null);
          }}
          onSave={handleSaveAssignments}
          teacher={selectedTeacher}
          availableSchools={availableSchools}
          availableBranches={availableBranchesForModal}
          availablePrograms={availablePrograms}
          availableSubjects={availableSubjects}
          availableGradeLevels={availableGradeLevelsForModal}
          availableSections={availableSectionsForModal}
          isLoading={updateTeacherAssignmentsMutation.isLoading}
        />
      )}
    </div>
  );
}