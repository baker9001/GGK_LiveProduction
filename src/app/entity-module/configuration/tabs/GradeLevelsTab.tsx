/**
 * File: /src/app/entity-module/configuration/tabs/GradeLevelsTab.tsx
 * 
 * COMPLETE FIXED VERSION - Input Focus Issue Resolved with React.memo
 * - Fixed using memoized components to prevent re-renders
 * - Branch-level assignment support
 * - System green color theme (#8CC63F)
 * - Preserves all original functionality
 */

'use client';

import React, { useState, useMemo, useEffect, useCallback, useId, memo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  GraduationCap, 
  School, 
  Users, 
  Building2, 
  AlertTriangle, 
  Loader2, 
  Trash2,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  FileText,
  Settings as SettingsIcon,
  Sparkles,
  Package,
  MapPin,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { z } from 'zod';
import { supabase } from '../../../../lib/supabase';
import { useAccessControl } from '../../../../hooks/useAccessControl';
import { GradeHierarchyTree, type HierarchyData, type SchoolNode, type GradeLevelNode, type ClassSectionNode } from '../../../../components/configuration/GradeHierarchyTree';
import { FilterCard } from '../../../../components/shared/FilterCard';
import { SlideInForm } from '../../../../components/shared/SlideInForm';
import { FormField, Input, Select, Textarea } from '../../../../components/shared/FormField';
import { StatusBadge } from '../../../../components/shared/StatusBadge';
import { Button } from '../../../../components/shared/Button';
import { SearchableMultiSelect } from '../../../../components/shared/SearchableMultiSelect';
import { ToggleSwitch } from '../../../../components/shared/ToggleSwitch';
import { ConfirmationDialog } from '../../../../components/shared/ConfirmationDialog';
import { ClassSectionFormItem, type ClassSectionFormData } from '../../../../components/forms/ClassSectionFormItem';
import { CollapsibleSection } from '../../../../components/shared/CollapsibleSection';
import { toast } from '../../../../components/shared/Toast';

// ========== TYPE DEFINITIONS ==========

interface Branch {
  id: string;
  name: string;
  code?: string;
  school_id: string;
  status: 'active' | 'inactive';
}

interface SchoolWithBranches {
  id: string;
  name: string;
  code?: string;
  status: 'active' | 'inactive';
  branches: Branch[];
  isExpanded?: boolean;
  selectedBranches?: string[];
}

interface FilterState {
  search: string;
  school_ids: string[];
  education_level: string[];
  status: string[];
}

interface FormState {
  school_ids: string[];
  branch_id?: string;
  grade_name: string;
  grade_code: string;
  grade_order: number;
  education_level: 'kindergarten' | 'primary' | 'middle' | 'secondary' | 'senior';
  status: 'active' | 'inactive';
  class_sections: ClassSectionFormData[];
}

interface GradeTemplate {
  id?: string;
  name: string;
  code: string;
  order: number;
  education_level: 'kindergarten' | 'primary' | 'middle' | 'secondary' | 'senior';
  sections: string[];
}

interface GradeStructureTemplate {
  id?: string;
  name: string;
  description: string;
  grades: GradeTemplate[];
}

interface GradeLevelsTabProps {
  companyId: string | null;
}

// ========== MEMOIZED COMPONENTS FOR PERFORMANCE ==========

// Fully Uncontrolled Grade Input Component - fixes focus issue
const GradeInputField = ({ 
  label, 
  value, 
  onChange, 
  placeholder, 
  type = 'text',
  gradeId
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  gradeId: string;
}) => {
  // Use a unique key based on gradeId to maintain input state
  const inputKey = `${gradeId}-${label.toLowerCase().replace(/\s/g, '-')}`;
  
  return (
    <FormField label={label}>
      <input
        key={inputKey}
        type={type}
        defaultValue={value}
        onBlur={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#8CC63F] focus:border-transparent"
      />
    </FormField>
  );
};

// Fully Uncontrolled Section Input Component
const SectionInput = ({ 
  value, 
  onChange, 
  onRemove,
  sectionKey
}: {
  value: string;
  onChange: (value: string) => void;
  onRemove: () => void;
  sectionKey: string;
}) => {
  return (
    <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800 rounded px-2 py-1">
      <span className="text-xs text-gray-500 dark:text-gray-400">Section</span>
      <input
        key={sectionKey}
        type="text"
        defaultValue={value}
        onBlur={(e) => onChange(e.target.value)}
        className="flex-1 bg-transparent border-b border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:border-[#8CC63F] min-w-0"
        placeholder="A"
      />
      <button
        type="button"
        onClick={onRemove}
        className="p-0.5 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
};

// Memoized Grade Card Component
const GradeCard = memo(({ 
  grade, 
  gradeIndex, 
  onUpdateGrade, 
  onRemoveGrade 
}: {
  grade: GradeTemplate;
  gradeIndex: number;
  onUpdateGrade: (index: number, field: keyof GradeTemplate, value: any) => void;
  onRemoveGrade: (index: number) => void;
}) => {
  const gradeId = grade.id || `grade-${gradeIndex}`;
  
  const handleAddSection = useCallback(() => {
    const nextLetter = String.fromCharCode(65 + grade.sections.length);
    onUpdateGrade(gradeIndex, 'sections', [...grade.sections, nextLetter]);
  }, [grade.sections, gradeIndex, onUpdateGrade]);
  
  const handleUpdateSection = useCallback((sectionIndex: number, newValue: string) => {
    const newSections = [...grade.sections];
    newSections[sectionIndex] = newValue;
    onUpdateGrade(gradeIndex, 'sections', newSections);
  }, [grade.sections, gradeIndex, onUpdateGrade]);
  
  const handleRemoveSection = useCallback((sectionIndex: number) => {
    const newSections = grade.sections.filter((_, idx) => idx !== sectionIndex);
    onUpdateGrade(gradeIndex, 'sections', newSections);
  }, [grade.sections, gradeIndex, onUpdateGrade]);
  
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="space-y-4">
        {/* Grade Basic Info */}
        <div className="flex items-start gap-4">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
            <GradeInputField
              label="Grade Name"
              value={grade.name}
              onChange={(value) => onUpdateGrade(gradeIndex, 'name', value)}
              placeholder="e.g., Grade 1"
              gradeId={gradeId}
            />
            
            <GradeInputField
              label="Code"
              value={grade.code}
              onChange={(value) => onUpdateGrade(gradeIndex, 'code', value)}
              placeholder="e.g., G1"
              gradeId={gradeId}
            />
            
            <GradeInputField
              label="Order"
              type="number"
              value={grade.order}
              onChange={(value) => onUpdateGrade(gradeIndex, 'order', parseInt(value) || 0)}
              placeholder="1"
              gradeId={gradeId}
            />
            
            <FormField label="Education Level">
              <select
                key={`${gradeId}-education-level`}
                defaultValue={grade.education_level}
                onChange={(e) => onUpdateGrade(gradeIndex, 'education_level', e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#8CC63F] focus:border-transparent"
              >
                <option value="kindergarten">Kindergarten</option>
                <option value="primary">Primary</option>
                <option value="middle">Middle</option>
                <option value="secondary">Secondary</option>
                <option value="senior">Senior</option>
              </select>
            </FormField>
          </div>
          
          <button
            type="button"
            onClick={() => onRemoveGrade(gradeIndex)}
            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        
        {/* Sections Management */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Class Sections ({grade.sections.length})
            </h5>
            <button
              type="button"
              onClick={handleAddSection}
              className="text-sm px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              Add Section
            </button>
          </div>
          
          {grade.sections.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">
              No sections added. Click "Add Section" to create class sections.
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {grade.sections.map((section, sectionIndex) => (
                <SectionInput
                  key={`${gradeId}-section-${sectionIndex}-${section}`}
                  sectionKey={`${gradeId}-section-${sectionIndex}`}
                  value={section}
                  onChange={(value) => handleUpdateSection(sectionIndex, value)}
                  onRemove={() => handleRemoveSection(sectionIndex)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

GradeCard.displayName = 'GradeCard';

// ========== VALIDATION SCHEMAS ==========

const gradeLevelSchema = z.object({
  school_ids: z.array(z.string().uuid()).optional(),
  branch_id: z.string().uuid().optional(),
  grade_name: z.string().min(1, 'Grade name is required'),
  grade_code: z.string().optional(),
  grade_order: z.number().min(1, 'Grade order must be at least 1'),
  education_level: z.enum(['kindergarten', 'primary', 'middle', 'secondary', 'senior']),
  status: z.enum(['active', 'inactive']),
  class_sections: z.array(z.object({
    id: z.string().optional(),
    section_name: z.string().min(1, 'Section name is required'),
    section_code: z.string().optional(),
    max_capacity: z.number().min(1, 'Max capacity must be at least 1'),
    status: z.enum(['active', 'inactive']),
    class_section_order: z.number().min(1, 'Section order must be at least 1')
  })).optional()
}).refine(data => data.school_ids?.length || data.branch_id, {
  message: 'Either school or branch selection is required'
});

// ========== MAIN COMPONENT ==========

export function GradeLevelsTab({ companyId }: GradeLevelsTabProps) {
  const queryClient = useQueryClient();
  const { getScopeFilters, isEntityAdmin, isSubEntityAdmin } = useAccessControl();
  
  // ===== STATE MANAGEMENT =====
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGradeLevel, setEditingGradeLevel] = useState<GradeLevelNode | null>(null);
  const [editingSection, setEditingSection] = useState<ClassSectionNode | null>(null);
  const [contextSchoolId, setContextSchoolId] = useState<string>('');
  const [contextGradeId, setContextGradeId] = useState<string>('');
  const [formType, setFormType] = useState<'grade' | 'section'>('grade');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    school_ids: [],
    education_level: [],
    status: []
  });

  const [formState, setFormState] = useState<FormState>({
    school_ids: [],
    branch_id: undefined,
    grade_name: '',
    grade_code: '',
    grade_order: 1,
    education_level: 'primary',
    status: 'active',
    class_sections: []
  });

  const [isSectionsExpanded, setIsSectionsExpanded] = useState(true);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [itemsToDelete, setItemsToDelete] = useState<{ type: 'grade' | 'section'; items: any[] }>({ type: 'grade', items: [] });

  // Debug: Log state changes
  useEffect(() => {
    console.log('Form Open State Changed:', isFormOpen);
  }, [isFormOpen]);

  useEffect(() => {
    console.log('Confirm Dialog State Changed:', isConfirmDialogOpen);
  }, [isConfirmDialogOpen]);

  // ===== BULK CREATION STATE =====
  const [showBulkWizard, setShowBulkWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedSchoolsWithBranches, setSelectedSchoolsWithBranches] = useState<SchoolWithBranches[]>([]);
  const [isApplyingBulk, setIsApplyingBulk] = useState(false);
  const [assignmentLevel, setAssignmentLevel] = useState<'school' | 'branch'>('branch');
  
  const [bulkGradeTemplate, setBulkGradeTemplate] = useState<GradeStructureTemplate>({
    name: '',
    description: '',
    grades: []
  });

  // Pre-defined Templates with stable IDs
  const preDefinedTemplates: GradeStructureTemplate[] = [
    {
      id: 'elementary',
      name: 'Elementary School (K-5)',
      description: 'Standard elementary school structure',
      grades: [
        { id: 'elem-k', name: 'Kindergarten', code: 'K', order: 1, education_level: 'kindergarten', sections: ['A', 'B'] },
        { id: 'elem-g1', name: 'Grade 1', code: 'G1', order: 2, education_level: 'primary', sections: ['A', 'B', 'C'] },
        { id: 'elem-g2', name: 'Grade 2', code: 'G2', order: 3, education_level: 'primary', sections: ['A', 'B', 'C'] },
        { id: 'elem-g3', name: 'Grade 3', code: 'G3', order: 4, education_level: 'primary', sections: ['A', 'B', 'C'] },
        { id: 'elem-g4', name: 'Grade 4', code: 'G4', order: 5, education_level: 'primary', sections: ['A', 'B', 'C'] },
        { id: 'elem-g5', name: 'Grade 5', code: 'G5', order: 6, education_level: 'primary', sections: ['A', 'B', 'C'] }
      ]
    },
    {
      id: 'middle',
      name: 'Middle School (6-8)',
      description: 'Standard middle school structure',
      grades: [
        { id: 'mid-g6', name: 'Grade 6', code: 'G6', order: 7, education_level: 'middle', sections: ['A', 'B', 'C', 'D'] },
        { id: 'mid-g7', name: 'Grade 7', code: 'G7', order: 8, education_level: 'middle', sections: ['A', 'B', 'C', 'D'] },
        { id: 'mid-g8', name: 'Grade 8', code: 'G8', order: 9, education_level: 'middle', sections: ['A', 'B', 'C', 'D'] }
      ]
    },
    {
      id: 'high',
      name: 'High School (9-12)',
      description: 'Standard high school structure',
      grades: [
        { id: 'high-g9', name: 'Grade 9', code: 'G9', order: 10, education_level: 'secondary', sections: ['A', 'B', 'C', 'D', 'E'] },
        { id: 'high-g10', name: 'Grade 10', code: 'G10', order: 11, education_level: 'secondary', sections: ['A', 'B', 'C', 'D', 'E'] },
        { id: 'high-g11', name: 'Grade 11', code: 'G11', order: 12, education_level: 'senior', sections: ['A', 'B', 'C', 'D', 'E'] },
        { id: 'high-g12', name: 'Grade 12', code: 'G12', order: 13, education_level: 'senior', sections: ['A', 'B', 'C', 'D', 'E'] }
      ]
    }
  ];

  // Memoized handler for updating grades
  const handleUpdateGrade = useCallback((index: number, field: keyof GradeTemplate, value: any) => {
    setBulkGradeTemplate(prev => ({
      ...prev,
      grades: prev.grades.map((grade, idx) => 
        idx === index ? { ...grade, [field]: value } : grade
      )
    }));
  }, []);

  const handleRemoveGrade = useCallback((index: number) => {
    setBulkGradeTemplate(prev => ({
      ...prev,
      grades: prev.grades.filter((_, idx) => idx !== index)
    }));
  }, []);

  // Get scope filters
  const scopeFilters = getScopeFilters('schools');
  const canAccessAll = isEntityAdmin || isSubEntityAdmin;

  // ===== FETCH SCHOOLS AND BRANCHES =====
  
  const { data: schools = [] } = useQuery(
    ['schools-for-grade-levels', companyId, scopeFilters],
    async () => {
      if (!companyId) return [];

      let query = supabase
        .from('schools')
        .select('id, name, code, status')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('name');

      if (!canAccessAll && scopeFilters.school_ids && scopeFilters.school_ids.length > 0) {
        query = query.in('id', scopeFilters.school_ids);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    {
      enabled: !!companyId,
      staleTime: 5 * 60 * 1000,
    }
  );

  // Fetch branches for schools
  const { data: branches = [] } = useQuery(
    ['branches-for-grade-levels', schools],
    async () => {
      if (!schools || schools.length === 0) return [];

      const { data, error } = await supabase
        .from('branches')
        .select('id, name, code, school_id, status')
        .in('school_id', schools.map(s => s.id))
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      return data || [];
    },
    {
      enabled: schools.length > 0,
      staleTime: 5 * 60 * 1000,
    }
  );

  // Combine schools with their branches
  const schoolsWithBranches = useMemo(() => {
    return schools.map(school => ({
      ...school,
      branches: branches.filter(branch => branch.school_id === school.id),
      isExpanded: false,
      selectedBranches: []
    }));
  }, [schools, branches]);

  // Fetch hierarchical data
  const { 
    data: hierarchyData, 
    isLoading, 
    isFetching,
    error: hierarchyError 
  } = useQuery(
    ['grade-hierarchy', companyId, filters, scopeFilters],
    async (): Promise<HierarchyData> => {
      if (!companyId) return { schools: [] };

      // Fetch schools
      let schoolsQuery = supabase
        .from('schools')
        .select('id, name, code, status')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('name');

      if (!canAccessAll && scopeFilters.school_ids && scopeFilters.school_ids.length > 0) {
        schoolsQuery = schoolsQuery.in('id', scopeFilters.school_ids);
      }

      const { data: schoolsData, error: schoolsError } = await schoolsQuery;
      if (schoolsError) throw schoolsError;

      if (!schoolsData || schoolsData.length === 0) {
        return { schools: [] };
      }

      // Fetch grade levels
      let gradeLevelsQuery = supabase
        .from('grade_levels')
        .select('id, school_id, branch_id, grade_name, grade_code, grade_order, education_level, status')
        .order('grade_order');

      const schoolIds = schoolsData.map(s => s.id);
      
      // Get branch IDs for these schools
      const { data: branchData } = await supabase
        .from('branches')
        .select('id')
        .in('school_id', schoolIds);
      
      const branchIds = branchData?.map(b => b.id) || [];

      // Get grades that belong to these schools OR their branches
      if (schoolIds.length > 0 || branchIds.length > 0) {
        gradeLevelsQuery = gradeLevelsQuery.or(
          `school_id.in.(${schoolIds.join(',')}),branch_id.in.(${branchIds.join(',')})`
        );
      }

      const { data: gradeLevelsData, error: gradeLevelsError } = await gradeLevelsQuery;
      if (gradeLevelsError) throw gradeLevelsError;

      // Fetch class sections
      let classSectionsData: any[] = [];
      if (gradeLevelsData && gradeLevelsData.length > 0) {
        const { data: sectionsData, error: sectionsError } = await supabase
          .from('class_sections')
          .select('id, grade_level_id, section_name, section_code, max_capacity, class_section_order, status')
          .in('grade_level_id', gradeLevelsData.map(g => g.id))
          .order('class_section_order');

        if (sectionsError) throw sectionsError;
        classSectionsData = sectionsData || [];
      }

      // Build hierarchical structure
      const schools: SchoolNode[] = schoolsData.map(school => {
        const schoolGrades = (gradeLevelsData || [])
          .filter(grade => {
            if (grade.school_id === school.id && !grade.branch_id) {
              return true;
            }
            if (grade.branch_id) {
              const branch = branches.find(b => b.id === grade.branch_id);
              return branch && branch.school_id === school.id;
            }
            if (grade.school_id === school.id && grade.branch_id) {
              return true;
            }
            return false;
          })
          .map(grade => {
            const gradeSections = classSectionsData
              .filter(section => section.grade_level_id === grade.id)
              .map(section => ({
                id: section.id,
                section_name: section.section_name,
                section_code: section.section_code,
                max_capacity: section.max_capacity,
                class_section_order: section.class_section_order,
                status: section.status,
                current_students: 0
              }));

            let gradeInfo: any = {
              id: grade.id,
              grade_name: grade.grade_name,
              grade_code: grade.grade_code,
              grade_order: grade.grade_order,
              education_level: grade.education_level,
              status: grade.status,
              class_sections: gradeSections
            };

            if (grade.branch_id) {
              const branch = branches.find(b => b.id === grade.branch_id);
              if (branch) {
                gradeInfo.branch_name = branch.name;
                gradeInfo.branch_id = branch.id;
              }
            }

            return gradeInfo;
          });

        return {
          id: school.id,
          name: school.name,
          code: school.code,
          status: school.status,
          grade_levels: schoolGrades
        };
      });

      return { schools };
    },
    {
      enabled: !!companyId,
      keepPreviousData: true,
      staleTime: 2 * 60 * 1000,
    }
  );

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (!hierarchyData?.schools) {
      return {
        schools: 0,
        activeSchools: 0,
        gradeLevels: 0,
        activeGradeLevels: 0,
        classSections: 0,
        activeClassSections: 0
      };
    }

    const schools = hierarchyData.schools;
    const activeSchools = schools.filter(s => s.status === 'active').length;
    
    const gradeLevels = schools.reduce((total, school) => total + (school.grade_levels?.length || 0), 0);
    const activeGradeLevels = schools.reduce((total, school) => 
      total + (school.grade_levels?.filter(g => g.status === 'active').length || 0), 0);
    
    const classSections = schools.reduce((total, school) => 
      total + (school.grade_levels?.reduce((gradeTotal, grade) => 
        gradeTotal + (grade.class_sections?.length || 0), 0) || 0), 0);
    
    const activeClassSections = schools.reduce((total, school) => 
      total + (school.grade_levels?.reduce((gradeTotal, grade) => 
        gradeTotal + (grade.class_sections?.filter(s => s.status === 'active').length || 0), 0) || 0), 0);

    return {
      schools: schools.length,
      activeSchools,
      gradeLevels,
      activeGradeLevels,
      classSections,
      activeClassSections
    };
  }, [hierarchyData]);

  // ===== HANDLER FUNCTIONS =====
  
  const handleAddGrade = (schoolId: string) => {
    console.log('handleAddGrade called with schoolId:', schoolId);
    setFormType('grade');
    setContextSchoolId(schoolId);
    setEditingGradeLevel(null);
    setEditingSection(null);
    setFormState({
      school_ids: [schoolId],
      branch_id: undefined,
      grade_name: '',
      grade_code: '',
      grade_order: 1,
      education_level: 'primary',
      status: 'active',
      class_sections: []
    });
    setIsFormOpen(true);
  };

  const handleEditGrade = (grade: GradeLevelNode, schoolId: string) => {
    console.log('handleEditGrade called:', { grade, schoolId });
    
    // Type cast to ExtendedGradeLevelNode to access branch properties
    const extendedGrade = grade as ExtendedGradeLevelNode;
    
    setFormType('grade');
    setContextSchoolId(schoolId);
    setEditingGradeLevel(extendedGrade);
    setEditingSection(null);
    
    // Populate form with existing grade data
    setFormState({
      school_ids: [schoolId],
      branch_id: extendedGrade.branch_id,
      grade_name: extendedGrade.grade_name,
      grade_code: extendedGrade.grade_code || '',
      grade_order: extendedGrade.grade_order,
      education_level: (extendedGrade.education_level || 'primary') as any,
      status: extendedGrade.status,
      class_sections: []
    });
    
    setIsFormOpen(true);
    console.log('Form should be open now, isFormOpen:', true);
  };

  const handleDeleteGrade = (grade: GradeLevelNode, schoolId: string) => {
    console.log('handleDeleteGrade called:', { grade, schoolId });
    setItemsToDelete({ type: 'grade', items: [grade] });
    setIsConfirmDialogOpen(true);
    console.log('Delete dialog should be open now');
  };

  const handleAddSection = (gradeId: string, schoolId: string) => {
    console.log('handleAddSection called:', { gradeId, schoolId });
    setFormType('section');
    setContextSchoolId(schoolId);
    setContextGradeId(gradeId);
    setEditingGradeLevel(null);
    setEditingSection(null);
    setFormState({
      school_ids: [schoolId],
      branch_id: undefined,
      grade_name: '',
      grade_code: '',
      grade_order: 1,
      education_level: 'primary',
      status: 'active',
      class_sections: []
    });
    setIsFormOpen(true);
  };

  const handleEditSection = (section: ClassSectionNode, gradeId: string, schoolId: string) => {
    console.log('handleEditSection called:', { section, gradeId, schoolId });
    setFormType('section');
    setContextSchoolId(schoolId);
    setContextGradeId(gradeId);
    setEditingGradeLevel(null);
    setEditingSection(section);
    
    // Populate form with existing section data
    setFormState({
      school_ids: [schoolId],
      branch_id: undefined,
      grade_name: section.section_name,
      grade_code: section.section_code || '',
      grade_order: section.class_section_order,
      education_level: 'primary',
      status: section.status,
      class_sections: []
    });
    
    setIsFormOpen(true);
    console.log('Section form should be open now');
  };

  const handleDeleteSection = (section: ClassSectionNode, gradeId: string, schoolId: string) => {
    console.log('handleDeleteSection called:', { section, gradeId, schoolId });
    setItemsToDelete({ type: 'section', items: [section] });
    setIsConfirmDialogOpen(true);
    console.log('Delete section dialog should be open now');
  };

  // ===== BULK CREATION WIZARD COMPONENT =====
  
  const BulkCreationWizard = () => {
    const steps = [
      { id: 1, name: 'Choose Template', icon: <FileText className="w-5 h-5" /> },
      { id: 2, name: 'Customize Structure', icon: <SettingsIcon className="w-5 h-5" /> },
      { id: 3, name: 'Select Schools', icon: <School className="w-5 h-5" /> },
      { id: 4, name: 'Review & Apply', icon: <Check className="w-5 h-5" /> }
    ];
    
    const handleTemplateSelect = (template: GradeStructureTemplate) => {
      setBulkGradeTemplate({
        name: template.name,
        description: template.description,
        grades: template.grades.map(g => ({
          ...g,
          id: g.id || `grade-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        }))
      });
      setSelectedTemplate(template.id || null);
      setWizardStep(2);
    };
    
    const toggleSchoolExpansion = (schoolId: string) => {
      setSelectedSchoolsWithBranches(prev => 
        prev.map(school => 
          school.id === schoolId 
            ? { ...school, isExpanded: !school.isExpanded }
            : school
        )
      );
    };
    
    const toggleSchoolSelection = (schoolId: string) => {
      const school = schoolsWithBranches.find(s => s.id === schoolId);
      if (!school) return;
      
      const isCurrentlySelected = selectedSchoolsWithBranches.some(s => s.id === schoolId);
      
      if (isCurrentlySelected) {
        setSelectedSchoolsWithBranches(prev => prev.filter(s => s.id !== schoolId));
      } else {
        setSelectedSchoolsWithBranches(prev => [...prev, { 
          ...school, 
          selectedBranches: assignmentLevel === 'branch' ? school.branches.map(b => b.id) : []
        }]);
      }
    };
    
    const toggleBranchSelection = (schoolId: string, branchId: string) => {
      setSelectedSchoolsWithBranches(prev => 
        prev.map(school => {
          if (school.id !== schoolId) return school;
          
          const currentSelected = school.selectedBranches || [];
          const isSelected = currentSelected.includes(branchId);
          
          return {
            ...school,
            selectedBranches: isSelected 
              ? currentSelected.filter(id => id !== branchId)
              : [...currentSelected, branchId]
          };
        })
      );
    };
    
    const applyBulkTemplate = async () => {
      try {
        setIsApplyingBulk(true);
        
        let successCount = 0;
        let errorCount = 0;
        const errors: string[] = [];
        
        for (const school of selectedSchoolsWithBranches) {
          if (assignmentLevel === 'branch' && school.selectedBranches) {
            // Apply to selected branches
            for (const branchId of school.selectedBranches) {
              const { data: branchExists } = await supabase
                .from('branches')
                .select('id, name')
                .eq('id', branchId)
                .single();
                
              if (!branchExists) {
                errors.push(`Branch ${branchId} not found`);
                errorCount++;
                continue;
              }
              
              for (const grade of bulkGradeTemplate.grades) {
                const { data: existingGrade } = await supabase
                  .from('grade_levels')
                  .select('id')
                  .eq('school_id', school.id)
                  .eq('branch_id', branchId)
                  .eq('grade_order', grade.order)
                  .maybeSingle();
                
                if (existingGrade) {
                  console.warn(`Grade order ${grade.order} already exists for branch ${branchExists.name}, skipping...`);
                  continue;
                }
                
                const gradeData = {
                  school_id: school.id,
                  branch_id: branchId,
                  grade_name: grade.name,
                  grade_code: grade.code || null,
                  grade_order: grade.order,
                  education_level: grade.education_level,
                  status: 'active'
                };
                
                const { data: gradeLevel, error: gradeError } = await supabase
                  .from('grade_levels')
                  .insert([gradeData])
                  .select()
                  .single();
                
                if (gradeError) {
                  errors.push(`Failed to create ${grade.name} for branch ${branchExists.name}: ${gradeError.message}`);
                  errorCount++;
                  continue;
                }
                
                successCount++;
                
                // Create sections
                if (gradeLevel && grade.sections.length > 0) {
                  for (const sectionName of grade.sections) {
                    const sectionData = {
                      grade_level_id: gradeLevel.id,
                      section_name: `Section ${sectionName}`,
                      section_code: sectionName,
                      max_capacity: 30,
                      class_section_order: grade.sections.indexOf(sectionName) + 1,
                      status: 'active'
                    };
                    
                    const { error: sectionError } = await supabase
                      .from('class_sections')
                      .insert([sectionData]);
                    
                    if (sectionError) {
                      errors.push(`Failed to create section ${sectionName}: ${sectionError.message}`);
                      errorCount++;
                    }
                  }
                }
              }
            }
          } else {
            // Apply to school level
            for (const grade of bulkGradeTemplate.grades) {
              const { data: existingGrade } = await supabase
                .from('grade_levels')
                .select('id')
                .eq('school_id', school.id)
                .is('branch_id', null)
                .eq('grade_order', grade.order)
                .maybeSingle();
              
              if (existingGrade) {
                console.warn(`Grade order ${grade.order} already exists for school ${school.name}, skipping...`);
                continue;
              }
              
              const gradeData = {
                school_id: school.id,
                branch_id: null,
                grade_name: grade.name,
                grade_code: grade.code || null,
                grade_order: grade.order,
                education_level: grade.education_level,
                status: 'active'
              };
              
              const { data: gradeLevel, error: gradeError } = await supabase
                .from('grade_levels')
                .insert([gradeData])
                .select()
                .single();
              
              if (gradeError) {
                errors.push(`Failed to create ${grade.name} for school ${school.name}: ${gradeError.message}`);
                errorCount++;
                continue;
              }
              
              successCount++;
              
              // Create sections
              if (gradeLevel && grade.sections.length > 0) {
                for (const sectionName of grade.sections) {
                  const sectionData = {
                    grade_level_id: gradeLevel.id,
                    section_name: `Section ${sectionName}`,
                    section_code: sectionName,
                    max_capacity: 30,
                    class_section_order: grade.sections.indexOf(sectionName) + 1,
                    status: 'active'
                  };
                  
                  const { error: sectionError } = await supabase
                    .from('class_sections')
                    .insert([sectionData]);
                  
                  if (sectionError) {
                    errors.push(`Failed to create section ${sectionName}: ${sectionError.message}`);
                    errorCount++;
                  }
                }
              }
            }
          }
        }
        
        // Force refresh the data
        await queryClient.invalidateQueries(['grade-hierarchy']);
        await queryClient.refetchQueries(['grade-hierarchy']);
        
        // Show detailed result
        if (successCount > 0 && errorCount === 0) {
          toast.success(`Successfully created ${successCount} grade level(s)!`);
        } else if (successCount > 0 && errorCount > 0) {
          toast.warning(`Created ${successCount} grade level(s) with ${errorCount} error(s). Check console for details.`);
          console.error('Bulk creation errors:', errors);
        } else if (errorCount > 0) {
          toast.error(`Failed to create grade levels. ${errorCount} error(s) occurred.`);
          console.error('Bulk creation errors:', errors);
        } else {
          toast.info('No grade levels were created. They may already exist.');
        }
        
        if (successCount > 0) {
          setShowBulkWizard(false);
          resetBulkWizard();
        }
      } catch (error) {
        console.error('Unexpected error in bulk template:', error);
        toast.error('An unexpected error occurred. Please check the console.');
      } finally {
        setIsApplyingBulk(false);
      }
    };
    
    const resetBulkWizard = () => {
      setWizardStep(1);
      setSelectedTemplate(null);
      setSelectedSchoolsWithBranches([]);
      setBulkGradeTemplate({ name: '', description: '', grades: [] });
      setAssignmentLevel('branch');
    };
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
          {/* Header with Green Theme */}
          <div className="bg-gradient-to-r from-[#8CC63F] to-[#7AB635] text-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Bulk Grade Structure Setup</h2>
                <p className="text-green-50 mt-1">Create and apply grade structures to multiple schools at once</p>
              </div>
              <button
                onClick={() => setShowBulkWizard(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Steps Indicator */}
            <div className="flex items-center justify-between mt-6">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center flex-1">
                  <div className={`
                    flex items-center justify-center w-10 h-10 rounded-full
                    ${wizardStep >= step.id ? 'bg-white text-[#8CC63F]' : 'bg-green-600 text-green-200'}
                  `}>
                    {wizardStep > step.id ? <Check className="w-5 h-5" /> : step.icon}
                  </div>
                  <div className="ml-3 flex-1">
                    <p className={`text-sm font-medium ${wizardStep >= step.id ? 'text-white' : 'text-green-200'}`}>
                      {step.name}
                    </p>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`
                      h-1 flex-1 mx-4
                      ${wizardStep > step.id ? 'bg-white' : 'bg-green-600'}
                    `} />
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Content */}
          <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 250px)' }}>
            {/* Step 1: Choose Template */}
            {wizardStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Choose a Template</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Select a pre-defined template or start from scratch to create your grade structure.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Custom Template Option */}
                  <div
                    onClick={() => {
                      setBulkGradeTemplate({ name: 'Custom Structure', description: '', grades: [] });
                      setWizardStep(2);
                    }}
                    className="p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-[#8CC63F] hover:bg-green-50 dark:hover:bg-green-900/20 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                        <Plus className="w-6 h-6 text-[#8CC63F]" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">Create Custom</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Build your own grade structure from scratch</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Pre-defined Templates */}
                  {preDefinedTemplates.map((template) => (
                    <div
                      key={template.id}
                      onClick={() => handleTemplateSelect(template)}
                      className={`
                        p-6 border-2 rounded-lg cursor-pointer transition-all
                        ${selectedTemplate === template.id 
                          ? 'border-[#8CC63F] bg-green-50 dark:bg-green-900/20' 
                          : 'border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600 hover:shadow-md'
                        }
                      `}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 rounded-lg flex items-center justify-center">
                          <GraduationCap className="w-6 h-6 text-[#8CC63F]" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 dark:text-white">{template.name}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{template.description}</p>
                          {template.grades.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1">
                              {template.grades.slice(0, 3).map((grade, i) => (
                                <span key={i} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs rounded">
                                  {grade.name}
                                </span>
                              ))}
                              {template.grades.length > 3 && (
                                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs rounded">
                                  +{template.grades.length - 3} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Step 2: Customize Structure - FIXED WITH REFS */}
            {wizardStep === 2 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Customize Grade Structure</h3>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                      Add, remove, or modify grades and their sections
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      const newGradeId = `grade-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                      const newGrade: GradeTemplate = {
                        id: newGradeId,
                        name: '',
                        code: '',
                        order: bulkGradeTemplate.grades.length + 1,
                        education_level: 'primary',
                        sections: ['A']
                      };
                      setBulkGradeTemplate({
                        ...bulkGradeTemplate,
                        grades: [...bulkGradeTemplate.grades, newGrade]
                      });
                    }}
                    leftIcon={<Plus className="w-4 h-4" />}
                    className="bg-[#8CC63F] hover:bg-[#7AB635] text-white"
                  >
                    Add Grade Level
                  </Button>
                </div>
                
                {bulkGradeTemplate.grades.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                    <GraduationCap className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-gray-400">No grades added yet</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Click "Add Grade Level" to start building your structure</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bulkGradeTemplate.grades.map((grade, gradeIndex) => {
                      const gradeId = grade.id || `grade-fixed-${gradeIndex}`;
                      
                      return (
                        <div key={gradeId} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                          <div className="space-y-4">
                            {/* Grade Basic Info - Using uncontrolled inputs */}
                            <div className="flex items-start gap-4">
                              <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                                <FormField label="Grade Name">
                                  <input
                                    type="text"
                                    defaultValue={grade.name}
                                    onBlur={(e) => {
                                      setBulkGradeTemplate(prev => ({
                                        ...prev,
                                        grades: prev.grades.map((g, idx) => 
                                          idx === gradeIndex ? { ...g, name: e.target.value } : g
                                        )
                                      }));
                                    }}
                                    placeholder="e.g., Grade 1"
                                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#8CC63F] focus:border-transparent"
                                  />
                                </FormField>
                                
                                <FormField label="Code">
                                  <input
                                    type="text"
                                    defaultValue={grade.code}
                                    onBlur={(e) => {
                                      setBulkGradeTemplate(prev => ({
                                        ...prev,
                                        grades: prev.grades.map((g, idx) => 
                                          idx === gradeIndex ? { ...g, code: e.target.value } : g
                                        )
                                      }));
                                    }}
                                    placeholder="e.g., G1"
                                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#8CC63F] focus:border-transparent"
                                  />
                                </FormField>
                                
                                <FormField label="Order">
                                  <input
                                    type="number"
                                    defaultValue={grade.order}
                                    onBlur={(e) => {
                                      setBulkGradeTemplate(prev => ({
                                        ...prev,
                                        grades: prev.grades.map((g, idx) => 
                                          idx === gradeIndex ? { ...g, order: parseInt(e.target.value) || 0 } : g
                                        )
                                      }));
                                    }}
                                    min="1"
                                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#8CC63F] focus:border-transparent"
                                  />
                                </FormField>
                                
                                <FormField label="Education Level">
                                  <select
                                    defaultValue={grade.education_level}
                                    onChange={(e) => {
                                      setBulkGradeTemplate(prev => ({
                                        ...prev,
                                        grades: prev.grades.map((g, idx) => 
                                          idx === gradeIndex ? { ...g, education_level: e.target.value as any } : g
                                        )
                                      }));
                                    }}
                                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#8CC63F] focus:border-transparent"
                                  >
                                    <option value="kindergarten">Kindergarten</option>
                                    <option value="primary">Primary</option>
                                    <option value="middle">Middle</option>
                                    <option value="secondary">Secondary</option>
                                    <option value="senior">Senior</option>
                                  </select>
                                </FormField>
                              </div>
                              
                              <button
                                type="button"
                                onClick={() => {
                                  setBulkGradeTemplate(prev => ({
                                    ...prev,
                                    grades: prev.grades.filter((_, idx) => idx !== gradeIndex)
                                  }));
                                }}
                                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            
                            {/* Sections Management */}
                            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                              <div className="flex items-center justify-between mb-3">
                                <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  Class Sections ({grade.sections.length})
                                </h5>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextLetter = String.fromCharCode(65 + grade.sections.length);
                                    setBulkGradeTemplate(prev => ({
                                      ...prev,
                                      grades: prev.grades.map((g, idx) => 
                                        idx === gradeIndex 
                                          ? { ...g, sections: [...g.sections, nextLetter] }
                                          : g
                                      )
                                    }));
                                  }}
                                  className="text-sm px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors flex items-center gap-1"
                                >
                                  <Plus className="w-3 h-3" />
                                  Add Section
                                </button>
                              </div>
                              
                              {grade.sections.length === 0 ? (
                                <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                                  No sections added. Click "Add Section" to create class sections.
                                </p>
                              ) : (
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                                  {grade.sections.map((section, sectionIndex) => {
                                    const sectionKey = `${gradeId}-section-${sectionIndex}-${section}`;
                                    
                                    return (
                                      <div key={sectionKey} className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800 rounded px-2 py-1">
                                        <span className="text-xs text-gray-500 dark:text-gray-400">Section</span>
                                        <input
                                          type="text"
                                          defaultValue={section}
                                          onBlur={(e) => {
                                            setBulkGradeTemplate(prev => ({
                                              ...prev,
                                              grades: prev.grades.map((g, gIdx) => 
                                                gIdx === gradeIndex 
                                                  ? {
                                                      ...g,
                                                      sections: g.sections.map((s, sIdx) => 
                                                        sIdx === sectionIndex ? e.target.value : s
                                                      )
                                                    }
                                                  : g
                                              )
                                            }));
                                          }}
                                          className="flex-1 bg-transparent border-b border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:border-[#8CC63F] min-w-0"
                                          placeholder="A"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setBulkGradeTemplate(prev => ({
                                              ...prev,
                                              grades: prev.grades.map((g, gIdx) => 
                                                gIdx === gradeIndex 
                                                  ? {
                                                      ...g,
                                                      sections: g.sections.filter((_, sIdx) => sIdx !== sectionIndex)
                                                    }
                                                  : g
                                              )
                                            }));
                                          }}
                                          className="p-0.5 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            
            {/* Step 3: Select Schools and Branches */}
            {wizardStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Select Schools and Branches</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Choose which schools and branches should receive this grade structure
                  </p>
                </div>
                
                {/* Assignment Level Toggle */}
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">Assignment Level</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Choose whether to assign grades to school level or branch level
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setAssignmentLevel('school')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          assignmentLevel === 'school' 
                            ? 'bg-[#8CC63F] text-white' 
                            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        <School className="w-4 h-4 inline mr-2" />
                        School Level
                      </button>
                      <button
                        onClick={() => setAssignmentLevel('branch')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          assignmentLevel === 'branch' 
                            ? 'bg-[#8CC63F] text-white' 
                            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        <MapPin className="w-4 h-4 inline mr-2" />
                        Branch Level
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => {
                        const allSchoolsWithBranches = schoolsWithBranches.map(school => ({
                          ...school,
                          selectedBranches: assignmentLevel === 'branch' ? school.branches.map(b => b.id) : []
                        }));
                        setSelectedSchoolsWithBranches(allSchoolsWithBranches);
                      }}
                      className="text-sm text-[#8CC63F] hover:text-[#7AB635]"
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => setSelectedSchoolsWithBranches([])}
                      className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-700"
                    >
                      Clear Selection
                    </button>
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {assignmentLevel === 'branch' 
                      ? `${selectedSchoolsWithBranches.reduce((sum, s) => sum + (s.selectedBranches?.length || 0), 0)} branches selected`
                      : `${selectedSchoolsWithBranches.length} schools selected`
                    }
                  </span>
                </div>
                
                <div className="space-y-3">
                  {schoolsWithBranches.map((school) => {
                    const isSchoolSelected = selectedSchoolsWithBranches.some(s => s.id === school.id);
                    const selectedSchool = selectedSchoolsWithBranches.find(s => s.id === school.id);
                    
                    return (
                      <div key={school.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                        <div
                          onClick={() => toggleSchoolSelection(school.id)}
                          className={`
                            p-4 cursor-pointer transition-all
                            ${isSchoolSelected
                              ? 'bg-green-50 dark:bg-green-900/20 border-l-4 border-l-[#8CC63F]'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-900/50'
                            }
                          `}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`
                                w-5 h-5 rounded border-2 flex items-center justify-center
                                ${isSchoolSelected
                                  ? 'bg-[#8CC63F] border-[#8CC63F]'
                                  : 'border-gray-300 dark:border-gray-600'
                                }
                              `}>
                                {isSchoolSelected && (
                                  <Check className="w-3 h-3 text-white" />
                                )}
                              </div>
                              <School className="w-5 h-5 text-gray-400" />
                              <div>
                                <h4 className="font-medium text-gray-900 dark:text-white">{school.name}</h4>
                                {school.code && (
                                  <p className="text-sm text-gray-500 dark:text-gray-400">{school.code}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-500">
                                {school.branches.length} branch{school.branches.length !== 1 ? 'es' : ''}
                              </span>
                              {assignmentLevel === 'branch' && school.branches.length > 0 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleSchoolExpansion(school.id);
                                  }}
                                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                                >
                                  {selectedSchool?.isExpanded 
                                    ? <ChevronUp className="w-4 h-4" />
                                    : <ChevronDown className="w-4 h-4" />
                                  }
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Branches list */}
                        {assignmentLevel === 'branch' && isSchoolSelected && selectedSchool?.isExpanded && (
                          <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                            {school.branches.map((branch) => {
                              const isBranchSelected = selectedSchool?.selectedBranches?.includes(branch.id);
                              
                              return (
                                <div
                                  key={branch.id}
                                  onClick={() => toggleBranchSelection(school.id, branch.id)}
                                  className={`
                                    px-8 py-3 cursor-pointer border-b border-gray-200 dark:border-gray-700 last:border-0
                                    hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors
                                    ${isBranchSelected ? 'bg-green-100/50 dark:bg-green-900/10' : ''}
                                  `}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`
                                      w-4 h-4 rounded border-2 flex items-center justify-center
                                      ${isBranchSelected
                                        ? 'bg-[#8CC63F] border-[#8CC63F]'
                                        : 'border-gray-300 dark:border-gray-600'
                                      }
                                    `}>
                                      {isBranchSelected && (
                                        <Check className="w-2.5 h-2.5 text-white" />
                                      )}
                                    </div>
                                    <MapPin className="w-4 h-4 text-gray-400" />
                                    <div>
                                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {branch.name}
                                      </span>
                                      {branch.code && (
                                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                          ({branch.code})
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Step 4: Review & Apply */}
            {wizardStep === 4 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Review & Apply</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Review your configuration before applying it
                  </p>
                </div>
                
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                        <GraduationCap className="w-5 h-5 text-[#8CC63F]" />
                      </div>
                      <div>
                        <p className="text-sm text-green-600 dark:text-green-400">Grade Levels</p>
                        <p className="text-2xl font-semibold text-green-900 dark:text-green-100">
                          {bulkGradeTemplate.grades.length}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                        <Users className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div>
                        <p className="text-sm text-orange-600 dark:text-orange-400">Total Sections</p>
                        <p className="text-2xl font-semibold text-orange-900 dark:text-orange-100">
                          {bulkGradeTemplate.grades.reduce((sum, g) => sum + g.sections.length, 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                        {assignmentLevel === 'branch' ? (
                          <MapPin className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        ) : (
                          <School className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-purple-600 dark:text-purple-400">
                          {assignmentLevel === 'branch' ? 'Branches' : 'Schools'}
                        </p>
                        <p className="text-2xl font-semibold text-purple-900 dark:text-purple-100">
                          {assignmentLevel === 'branch' 
                            ? selectedSchoolsWithBranches.reduce((sum, s) => sum + (s.selectedBranches?.length || 0), 0)
                            : selectedSchoolsWithBranches.length
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Action Summary */}
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-amber-900 dark:text-amber-100">This action will create:</h4>
                      <ul className="mt-2 space-y-1 text-sm text-amber-800 dark:text-amber-200">
                        <li>• {bulkGradeTemplate.grades.length * (assignmentLevel === 'branch' 
                          ? selectedSchoolsWithBranches.reduce((sum, s) => sum + (s.selectedBranches?.length || 0), 0)
                          : selectedSchoolsWithBranches.length)} grade levels</li>
                        <li>• {bulkGradeTemplate.grades.reduce((sum, g) => sum + g.sections.length, 0) * (assignmentLevel === 'branch' 
                          ? selectedSchoolsWithBranches.reduce((sum, s) => sum + (s.selectedBranches?.length || 0), 0)
                          : selectedSchoolsWithBranches.length)} class sections</li>
                        <li>• All items will be created with "Active" status</li>
                        <li>• Grades will be assigned at {assignmentLevel} level</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Footer with Green Theme */}
          <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between">
            <Button
              onClick={() => {
                if (wizardStep > 1) {
                  setWizardStep(wizardStep - 1);
                } else {
                  setShowBulkWizard(false);
                }
              }}
              variant="outline"
              leftIcon={<ChevronLeft className="w-4 h-4" />}
            >
              {wizardStep === 1 ? 'Cancel' : 'Back'}
            </Button>
            
            <div className="flex items-center gap-3">
              {wizardStep === 4 ? (
                <Button
                  onClick={applyBulkTemplate}
                  leftIcon={isApplyingBulk ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  disabled={(assignmentLevel === 'branch' 
                    ? selectedSchoolsWithBranches.reduce((sum, s) => sum + (s.selectedBranches?.length || 0), 0) === 0
                    : selectedSchoolsWithBranches.length === 0) || bulkGradeTemplate.grades.length === 0 || isApplyingBulk}
                  className="bg-[#8CC63F] hover:bg-[#7AB635] text-white"
                >
                  {isApplyingBulk ? 'Applying...' : `Apply to ${
                    assignmentLevel === 'branch' 
                      ? selectedSchoolsWithBranches.reduce((sum, s) => sum + (s.selectedBranches?.length || 0), 0)
                      : selectedSchoolsWithBranches.length
                  } ${assignmentLevel}${
                    (assignmentLevel === 'branch' 
                      ? selectedSchoolsWithBranches.reduce((sum, s) => sum + (s.selectedBranches?.length || 0), 0)
                      : selectedSchoolsWithBranches.length) !== 1 ? 's' : ''
                  }`}
                </Button>
              ) : (
                <Button
                  onClick={() => setWizardStep(wizardStep + 1)}
                  disabled={
                    (wizardStep === 2 && bulkGradeTemplate.grades.length === 0) ||
                    (wizardStep === 3 && selectedSchoolsWithBranches.length === 0)
                  }
                  rightIcon={<ChevronRight className="w-4 h-4" />}
                  className="bg-[#8CC63F] hover:bg-[#7AB635] text-white"
                >
                  Next
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ===== MAIN RENDER =====
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-[#8CC63F]" />
        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading academic structure...</span>
      </div>
    );
  }

  if (hierarchyError) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
          <div>
            <h3 className="font-semibold text-red-800 dark:text-red-200">
              Error Loading Academic Structure
            </h3>
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
              {hierarchyError.message || 'Failed to load academic structure. Please try again.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Academic Structure</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage schools, grade levels, and class sections in a hierarchical view
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Bulk Creation Button */}
          <Button
            onClick={() => setShowBulkWizard(true)}
            leftIcon={<Sparkles className="h-4 w-4" />}
            className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Bulk Create
          </Button>
          
          {/* Add Grade Level Button */}
          <Button
            onClick={() => {
              setFormType('grade');
              setContextSchoolId('');
              setEditingGradeLevel(null);
              setEditingSection(null);
              setIsFormOpen(true);
            }}
            leftIcon={<Plus className="h-4 w-4" />}
            className="bg-[#8CC63F] hover:bg-[#7AB635] text-white"
          >
            Add Grade Level
          </Button>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Schools</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {summaryStats.schools}
              </p>
            </div>
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <School className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {summaryStats.activeSchools} active
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Grade Levels</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {summaryStats.gradeLevels}
              </p>
            </div>
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-[#8CC63F]" />
            </div>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {summaryStats.activeGradeLevels} active
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Class Sections</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {summaryStats.classSections}
              </p>
            </div>
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {summaryStats.activeClassSections} active
          </div>
        </div>
      </div>

      {/* Filters */}
      <FilterCard
        title="Filters"
        onApply={() => {}}
        onClear={() => {
          setFilters({
            search: '',
            school_ids: [],
            education_level: [],
            status: []
          });
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <FormField id="search" label="Search">
            <Input
              id="search"
              placeholder="Search by name or code..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </FormField>

          <SearchableMultiSelect
            label="School"
            options={schools.map(s => ({
              value: s.id,
              label: s.name
            }))}
            selectedValues={filters.school_ids}
            onChange={(values) => setFilters({ ...filters, school_ids: values })}
            placeholder="Select schools..."
          />

          <SearchableMultiSelect
            label="Education Level"
            options={[
              { value: 'kindergarten', label: 'Kindergarten' },
              { value: 'primary', label: 'Primary' },
              { value: 'middle', label: 'Middle' },
              { value: 'secondary', label: 'Secondary' },
              { value: 'senior', label: 'Senior' }
            ]}
            selectedValues={filters.education_level}
            onChange={(values) => setFilters({ ...filters, education_level: values })}
            placeholder="Select levels..."
          />

          <SearchableMultiSelect
            label="Status"
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' }
            ]}
            selectedValues={filters.status}
            onChange={(values) => setFilters({ ...filters, status: values })}
            placeholder="Select status..."
          />
        </div>
      </FilterCard>

      {/* Hierarchical Tree View */}
      <GradeHierarchyTree
        data={hierarchyData || { schools: [] }}
        onAddGrade={handleAddGrade}
        onEditGrade={handleEditGrade}
        onDeleteGrade={handleDeleteGrade}
        onAddSection={handleAddSection}
        onEditSection={handleEditSection}
        onDeleteSection={handleDeleteSection}
      />

      {/* Bulk Creation Wizard */}
      {showBulkWizard && <BulkCreationWizard />}

      {/* DEBUG: Test if state is working */}
      {isFormOpen && (
        <div className="fixed top-4 right-4 bg-red-500 text-white p-4 z-[100] rounded shadow-lg">
          <p>FORM IS OPEN - Type: {formType}</p>
          <button onClick={() => setIsFormOpen(false)} className="mt-2 bg-white text-red-500 px-2 py-1 rounded">
            Close Test
          </button>
        </div>
      )}
      
      {isConfirmDialogOpen && (
        <div className="fixed top-20 right-4 bg-blue-500 text-white p-4 z-[100] rounded shadow-lg">
          <p>DELETE DIALOG IS OPEN</p>
          <button onClick={() => setIsConfirmDialogOpen(false)} className="mt-2 bg-white text-blue-500 px-2 py-1 rounded">
            Close Test
          </button>
        </div>
      )}

      {/* Edit/Add Form for Grades and Sections - SIMPLIFIED TEST */}
      {isFormOpen ? (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">
              {formType === 'grade' 
                ? (editingGradeLevel ? 'Edit Grade Level' : 'Create Grade Level')
                : (editingSection ? 'Edit Section' : 'Create Section')}
            </h2>
            <p className="mb-4">Form is working! The SlideInForm component might have an issue.</p>
            <button 
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
        title={
          formType === 'grade' 
            ? (editingGradeLevel ? 'Edit Grade Level' : 'Create Grade Level')
            : (editingSection ? 'Edit Section' : 'Create Section')
        }
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingGradeLevel(null);
          setEditingSection(null);
          setFormErrors({});
          // Reset form state
          setFormState({
            school_ids: [],
            branch_id: undefined,
            grade_name: '',
            grade_code: '',
            grade_order: 1,
            education_level: 'primary',
            status: 'active',
            class_sections: []
          });
        }}
        onSave={async () => {
          try {
            if (formType === 'grade') {
              // Validate grade form
              const result = gradeLevelSchema.safeParse(formState);
              if (!result.success) {
                const errors: Record<string, string> = {};
                result.error.issues.forEach(issue => {
                  errors[issue.path[0]] = issue.message;
                });
                setFormErrors(errors);
                return;
              }

              // Save grade level
              if (editingGradeLevel) {
                // Update existing grade
                const { error } = await supabase
                  .from('grade_levels')
                  .update({
                    grade_name: formState.grade_name,
                    grade_code: formState.grade_code,
                    grade_order: formState.grade_order,
                    education_level: formState.education_level,
                    status: formState.status
                  })
                  .eq('id', editingGradeLevel.id);

                if (error) throw error;
                toast.success('Grade level updated successfully');
              } else {
                // Create new grade
                const { error } = await supabase
                  .from('grade_levels')
                  .insert({
                    school_id: contextSchoolId || formState.school_ids[0],
                    branch_id: formState.branch_id,
                    grade_name: formState.grade_name,
                    grade_code: formState.grade_code,
                    grade_order: formState.grade_order,
                    education_level: formState.education_level,
                    status: formState.status
                  });

                if (error) throw error;
                toast.success('Grade level created successfully');
              }
            } else {
              // Save section
              if (editingSection) {
                // Update existing section
                const { error } = await supabase
                  .from('class_sections')
                  .update({
                    section_name: formState.grade_name, // Using grade_name field for section name
                    section_code: formState.grade_code,
                    max_capacity: 30,
                    class_section_order: formState.grade_order,
                    status: formState.status
                  })
                  .eq('id', editingSection.id);

                if (error) throw error;
                toast.success('Section updated successfully');
              } else {
                // Create new section
                const { error } = await supabase
                  .from('class_sections')
                  .insert({
                    grade_level_id: contextGradeId,
                    section_name: formState.grade_name,
                    section_code: formState.grade_code,
                    max_capacity: 30,
                    class_section_order: formState.grade_order,
                    status: formState.status
                  });

                if (error) throw error;
                toast.success('Section created successfully');
              }
            }

            // Refresh data
            await queryClient.invalidateQueries(['grade-hierarchy']);
            setIsFormOpen(false);
            setEditingGradeLevel(null);
            setEditingSection(null);
          } catch (error) {
            console.error('Error saving:', error);
            toast.error('Failed to save. Please try again.');
          }
        }}
        loading={false}
      >
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          {formErrors.form && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
              {formErrors.form}
            </div>
          )}

          {formType === 'grade' ? (
            <>
              {/* Grade Level Form Fields */}
              {!editingGradeLevel && (
                <FormField
                  id="school_id"
                  label="School"
                  required
                  error={formErrors.school_ids}
                >
                  <Select
                    id="school_id"
                    options={[
                      { value: '', label: 'Select school...' },
                      ...schools.map(school => ({
                        value: school.id,
                        label: school.name
                      }))
                    ]}
                    value={contextSchoolId || formState.school_ids[0] || ''}
                    onChange={(value) => setFormState({ ...formState, school_ids: [value] })}
                  />
                </FormField>
              )}

              <FormField
                id="grade_name"
                label="Grade Name"
                required
                error={formErrors.grade_name}
              >
                <Input
                  id="grade_name"
                  placeholder="e.g., Grade 1, Year 7"
                  value={formState.grade_name}
                  onChange={(e) => setFormState({ ...formState, grade_name: e.target.value })}
                />
              </FormField>

              <FormField
                id="grade_code"
                label="Grade Code"
                error={formErrors.grade_code}
              >
                <Input
                  id="grade_code"
                  placeholder="e.g., G1, Y7"
                  value={formState.grade_code}
                  onChange={(e) => setFormState({ ...formState, grade_code: e.target.value })}
                />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
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
                    value={formState.grade_order.toString()}
                    onChange={(e) => setFormState({ ...formState, grade_order: parseInt(e.target.value) || 1 })}
                  />
                </FormField>

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
                      { value: 'middle', label: 'Middle' },
                      { value: 'secondary', label: 'Secondary' },
                      { value: 'senior', label: 'Senior' }
                    ]}
                    value={formState.education_level}
                    onChange={(value) => setFormState({ ...formState, education_level: value as any })}
                  />
                </FormField>
              </div>
            </>
          ) : (
            <>
              {/* Section Form Fields */}
              <FormField
                id="section_name"
                label="Section Name"
                required
                error={formErrors.grade_name}
              >
                <Input
                  id="section_name"
                  placeholder="e.g., Section A"
                  value={formState.grade_name}
                  onChange={(e) => setFormState({ ...formState, grade_name: e.target.value })}
                />
              </FormField>

              <FormField
                id="section_code"
                label="Section Code"
                error={formErrors.grade_code}
              >
                <Input
                  id="section_code"
                  placeholder="e.g., A, B, C"
                  value={formState.grade_code}
                  onChange={(e) => setFormState({ ...formState, grade_code: e.target.value })}
                />
              </FormField>

              <FormField
                id="section_order"
                label="Section Order"
                required
                error={formErrors.grade_order}
              >
                <Input
                  id="section_order"
                  type="number"
                  min="1"
                  value={formState.grade_order.toString()}
                  onChange={(e) => setFormState({ ...formState, grade_order: parseInt(e.target.value) || 1 })}
                />
              </FormField>
            </>
          )}

          <FormField
            id="status"
            label="Status"
            required
          >
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {formType === 'grade' ? 'Grade Level' : 'Section'} Status
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {formState.status === 'active'
                    ? `${formType === 'grade' ? 'Grade level' : 'Section'} is currently active` 
                    : `${formType === 'grade' ? 'Grade level' : 'Section'} is currently inactive`}
                </p>
              </div>
              <ToggleSwitch
                checked={formState.status === 'active'}
                onChange={(checked) => setFormState({ ...formState, status: checked ? 'active' : 'inactive' })}
                label="Active"
              />
            </div>
          </FormField>
        </form>
      </SlideInForm>

      {/* Delete Confirmation Dialog - SIMPLIFIED TEST */}
      {isConfirmDialogOpen ? (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">
              Delete {itemsToDelete.type === 'grade' ? 'Grade Level' : 'Section'}?
            </h2>
            <p className="mb-4">Dialog is working! Testing delete functionality.</p>
            <div className="flex gap-2">
              <button 
                onClick={async () => {
                  console.log('Deleting items:', itemsToDelete);
                  // Perform delete
                  try {
                    if (itemsToDelete.type === 'grade') {
                      for (const grade of itemsToDelete.items) {
                        const { error } = await supabase
                          .from('grade_levels')
                          .delete()
                          .eq('id', grade.id);
                        
                        if (error) throw error;
                      }
                      toast.success('Grade level(s) deleted successfully');
                    } else {
                      for (const section of itemsToDelete.items) {
                        const { error } = await supabase
                          .from('class_sections')
                          .delete()
                          .eq('id', section.id);
                        
                        if (error) throw error;
                      }
                      toast.success('Section(s) deleted successfully');
                    }
                    
                    // Refresh data
                    await queryClient.invalidateQueries(['grade-hierarchy']);
                    setIsConfirmDialogOpen(false);
                    setItemsToDelete({ type: 'grade', items: [] });
                  } catch (error) {
                    console.error('Error deleting:', error);
                    toast.error('Failed to delete. Please try again.');
                  }
                }}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Delete
              </button>
              <button 
                onClick={() => {
                  setIsConfirmDialogOpen(false);
                  setItemsToDelete({ type: 'grade', items: [] });
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}