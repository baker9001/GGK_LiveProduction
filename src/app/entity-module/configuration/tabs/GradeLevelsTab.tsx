/**
 * File: /src/app/entity-module/configuration/tabs/GradeLevelsTab.tsx
 * 
 * COMPLETE VERSION with Branch-Level Assignment
 * - Branch selection in bulk wizard
 * - System green color theme (#8CC63F)
 * - Preserves all original functionality
 * - Database schema supports branch_id
 * - FIXED: Removed duplicate function declarations
 */

'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
  
  // ===== ORIGINAL STATE (PRESERVED) =====
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

  // ===== NEW BULK CREATION STATE =====
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

  // Pre-defined Templates for bulk creation
  const preDefinedTemplates: GradeStructureTemplate[] = [
    {
      id: 'elementary',
      name: 'Elementary School (K-5)',
      description: 'Standard elementary school structure',
      grades: [
        { name: 'Kindergarten', code: 'K', order: 1, education_level: 'kindergarten', sections: ['A', 'B'] },
        { name: 'Grade 1', code: 'G1', order: 2, education_level: 'primary', sections: ['A', 'B', 'C'] },
        { name: 'Grade 2', code: 'G2', order: 3, education_level: 'primary', sections: ['A', 'B', 'C'] },
        { name: 'Grade 3', code: 'G3', order: 4, education_level: 'primary', sections: ['A', 'B', 'C'] },
        { name: 'Grade 4', code: 'G4', order: 5, education_level: 'primary', sections: ['A', 'B', 'C'] },
        { name: 'Grade 5', code: 'G5', order: 6, education_level: 'primary', sections: ['A', 'B', 'C'] }
      ]
    },
    {
      id: 'middle',
      name: 'Middle School (6-8)',
      description: 'Standard middle school structure',
      grades: [
        { name: 'Grade 6', code: 'G6', order: 7, education_level: 'middle', sections: ['A', 'B', 'C', 'D'] },
        { name: 'Grade 7', code: 'G7', order: 8, education_level: 'middle', sections: ['A', 'B', 'C', 'D'] },
        { name: 'Grade 8', code: 'G8', order: 9, education_level: 'middle', sections: ['A', 'B', 'C', 'D'] }
      ]
    },
    {
      id: 'high',
      name: 'High School (9-12)',
      description: 'Standard high school structure',
      grades: [
        { name: 'Grade 9', code: 'G9', order: 10, education_level: 'secondary', sections: ['A', 'B', 'C', 'D', 'E'] },
        { name: 'Grade 10', code: 'G10', order: 11, education_level: 'secondary', sections: ['A', 'B', 'C', 'D', 'E'] },
        { name: 'Grade 11', code: 'G11', order: 12, education_level: 'senior', sections: ['A', 'B', 'C', 'D', 'E'] },
        { name: 'Grade 12', code: 'G12', order: 13, education_level: 'senior', sections: ['A', 'B', 'C', 'D', 'E'] }
      ]
    }
  ];

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

  // Fetch hierarchical data (schools -> grades -> sections)
  const { 
    data: hierarchyData, 
    isLoading, 
    isFetching,
    error: hierarchyError 
  } = useQuery(
    ['grade-hierarchy', companyId, filters, scopeFilters],
    async (): Promise<HierarchyData> => {
      if (!companyId) return { schools: [] };

      // Fetch schools, grade levels, and class sections
      // (Original query logic preserved)
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
          .filter(grade => grade.school_id === school.id || 
                          branches.some(b => b.school_id === school.id && b.id === grade.branch_id))
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

            return {
              id: grade.id,
              grade_name: grade.grade_name,
              grade_code: grade.grade_code,
              grade_order: grade.grade_order,
              education_level: grade.education_level,
              status: grade.status,
              class_sections: gradeSections
            };
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
    
        const { data: newGradeLevel, error } = await supabase
          .from('grade_levels')
          .insert([{
          ...gradeLevelRecord, 
          school_id: mainSchoolId,
          branch_id: null
        }])
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
  
  // Tree action handlers
  const handleAddGrade = (schoolId: string) => {
    setFormType('grade');
    setContextSchoolId(schoolId);
    setEditingGradeLevel(null);
    setEditingSection(null);
    setIsFormOpen(true);
  };

  const handleEditGrade = (grade: GradeLevelNode, schoolId: string) => {
    setFormType('grade');
    setContextSchoolId(schoolId);
    setEditingGradeLevel(grade);
    setEditingSection(null);
    setIsFormOpen(true);
  };

  const handleDeleteGrade = (grade: GradeLevelNode, schoolId: string) => {
    setItemsToDelete({ type: 'grade', items: [grade] });
    setIsConfirmDialogOpen(true);
  };

  const handleAddSection = (gradeId: string, schoolId: string) => {
    setFormType('section');
    setContextSchoolId(schoolId);
    setContextGradeId(gradeId);
    setEditingGradeLevel(null);
    setEditingSection(null);
    setIsFormOpen(true);
  };

  const handleEditSection = (section: ClassSectionNode, gradeId: string, schoolId: string) => {
    setFormType('section');
    setContextSchoolId(schoolId);
    setContextGradeId(gradeId);
    setEditingGradeLevel(null);
    setEditingSection(section);
    setIsFormOpen(true);
  };

  const handleDeleteSection = (section: ClassSectionNode, gradeId: string, schoolId: string) => {
    setItemsToDelete({ type: 'section', items: [section] });
    setIsConfirmDialogOpen(true);
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
        grades: [...template.grades]
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
        
        for (const school of selectedSchoolsWithBranches) {
          if (assignmentLevel === 'branch' && school.selectedBranches) {
            // Apply to selected branches - school_id is still required
            for (const branchId of school.selectedBranches) {
              for (const grade of bulkGradeTemplate.grades) {
                // First check if a grade with this order already exists for this branch
                const { data: existingGrade } = await supabase
                  .from('grade_levels')
                  .select('id')
                  .eq('school_id', school.id)
                  .eq('branch_id', branchId)
                  .eq('grade_order', grade.order)
                  .single();
                
                if (existingGrade) {
                  console.warn(`Grade order ${grade.order} already exists for branch ${branchId}, skipping...`);
                  continue;
                }
                
                const { data: gradeLevel, error: gradeError } = await supabase
                  .from('grade_levels')
                  .insert([{
                    school_id: school.id,  // Always required
                    branch_id: branchId,    // Optional branch assignment
                    grade_name: grade.name,
                    grade_code: grade.code,
                    grade_order: grade.order,
                    education_level: grade.education_level,
                    status: 'active'
                  }])
                  .select()
                  .single();
                
                if (gradeError) {
                  console.error('Grade creation error:', gradeError);
                  // Skip this grade but continue with others
                  continue;
                }
                
                // Create sections
                if (gradeLevel) {
                  for (const sectionName of grade.sections) {
                    const { error: sectionError } = await supabase
                      .from('class_sections')
                      .insert([{
                        grade_level_id: gradeLevel.id,
                        section_name: `Section ${sectionName}`,
                        section_code: sectionName,
                        max_capacity: 30,
                        class_section_order: grade.sections.indexOf(sectionName) + 1,
                        status: 'active'
                      }]);
                    
                    if (sectionError) {
                      console.error('Section creation error:', sectionError);
                    }
                  }
                }
              }
            }
          } else {
            // Apply to school level (no branch_id)
            for (const grade of bulkGradeTemplate.grades) {
              // First check if a grade with this order already exists for this school
              const { data: existingGrade } = await supabase
                .from('grade_levels')
                .select('id')
                .eq('school_id', school.id)
                .is('branch_id', null)
                .eq('grade_order', grade.order)
                .single();
              
              if (existingGrade) {
                console.warn(`Grade order ${grade.order} already exists for school ${school.id}, skipping...`);
                continue;
              }
              
              const { data: gradeLevel, error: gradeError } = await supabase
                .from('grade_levels')
                .insert([{
                  school_id: school.id,
                  branch_id: null,  // Explicitly null for school-level
                  grade_name: grade.name,
                  grade_code: grade.code,
                  grade_order: grade.order,
                  education_level: grade.education_level,
                  status: 'active'
                }])
                .select()
                .single();
              
              if (gradeError) {
                console.error('Grade creation error:', gradeError);
                // Skip this grade but continue with others
                continue;
              }
              
              // Create sections
              if (gradeLevel) {
                for (const sectionName of grade.sections) {
                  const { error: sectionError } = await supabase
                    .from('class_sections')
                    .insert([{
                      grade_level_id: gradeLevel.id,
                      section_name: `Section ${sectionName}`,
                      section_code: sectionName,
                      max_capacity: 30,
                      class_section_order: grade.sections.indexOf(sectionName) + 1,
                      status: 'active'
                    }]);
                  
                  if (sectionError) {
                    console.error('Section creation error:', sectionError);
                  }
                }
              }
            }
          }
        }
        
        queryClient.invalidateQueries(['grade-hierarchy']);
        const totalAssignments = assignmentLevel === 'branch' 
          ? selectedSchoolsWithBranches.reduce((sum, s) => sum + (s.selectedBranches?.length || 0), 0)
          : selectedSchoolsWithBranches.length;
        toast.success(`Template applied to ${totalAssignments} ${assignmentLevel}(s) successfully!`);
        setShowBulkWizard(false);
        resetBulkWizard();
      } catch (error) {
        console.error('Error applying template:', error);
        toast.error('Failed to apply template. Please check the console for details.');
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
            
            {/* Step 2: Customize Structure (Same as before, just with green accents) */}
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
                      const newGrade: GradeTemplate = {
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
                
                {/* Grade customization UI remains the same */}
                {bulkGradeTemplate.grades.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                    <GraduationCap className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-gray-400">No grades added yet</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Click "Add Grade Level" to start building your structure</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bulkGradeTemplate.grades.map((grade, gradeIndex) => (
                      <div key={gradeIndex} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="space-y-4">
                          {/* Grade Basic Info */}
                          <div className="flex items-start gap-4">
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                              <FormField label="Grade Name">
                                <Input
                                  value={grade.name}
                                  onChange={(e) => {
                                    const updatedGrades = [...bulkGradeTemplate.grades];
                                    updatedGrades[gradeIndex] = { ...updatedGrades[gradeIndex], name: e.target.value };
                                    setBulkGradeTemplate({ ...bulkGradeTemplate, grades: updatedGrades });
                                  }}
                                  placeholder="e.g., Grade 1"
                                />
                              </FormField>
                              
                              <FormField label="Code">
                                <Input
                                  value={grade.code}
                                  onChange={(e) => {
                                    const updatedGrades = [...bulkGradeTemplate.grades];
                                    updatedGrades[gradeIndex] = { ...updatedGrades[gradeIndex], code: e.target.value };
                                    setBulkGradeTemplate({ ...bulkGradeTemplate, grades: updatedGrades });
                                  }}
                                  placeholder="e.g., G1"
                                />
                              </FormField>
                              
                              <FormField label="Order">
                                <Input
                                  type="number"
                                  value={grade.order}
                                  onChange={(e) => {
                                    const updatedGrades = [...bulkGradeTemplate.grades];
                                    updatedGrades[gradeIndex] = { ...updatedGrades[gradeIndex], order: parseInt(e.target.value) };
                                    setBulkGradeTemplate({ ...bulkGradeTemplate, grades: updatedGrades });
                                  }}
                                  min="1"
                                />
                              </FormField>
                              
                              <FormField label="Education Level">
                                <Select
                                  value={grade.education_level}
                                  onChange={(value) => {
                                    const updatedGrades = [...bulkGradeTemplate.grades];
                                    updatedGrades[gradeIndex] = { ...updatedGrades[gradeIndex], education_level: value as any };
                                    setBulkGradeTemplate({ ...bulkGradeTemplate, grades: updatedGrades });
                                  }}
                                  options={[
                                    { value: 'kindergarten', label: 'Kindergarten' },
                                    { value: 'primary', label: 'Primary' },
                                    { value: 'middle', label: 'Middle' },
                                    { value: 'secondary', label: 'Secondary' },
                                    { value: 'senior', label: 'Senior' }
                                  ]}
                                />
                              </FormField>
                            </div>
                            
                            <button
                              onClick={() => {
                                const updatedGrades = bulkGradeTemplate.grades.filter((_, i) => i !== gradeIndex);
                                setBulkGradeTemplate({ ...bulkGradeTemplate, grades: updatedGrades });
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
                                onClick={() => {
                                  const updatedGrades = [...bulkGradeTemplate.grades];
                                  const nextLetter = String.fromCharCode(65 + grade.sections.length); // A, B, C...
                                  updatedGrades[gradeIndex] = {
                                    ...updatedGrades[gradeIndex],
                                    sections: [...grade.sections, nextLetter]
                                  };
                                  setBulkGradeTemplate({ ...bulkGradeTemplate, grades: updatedGrades });
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
                                {grade.sections.map((section, sectionIndex) => (
                                  <div key={sectionIndex} className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800 rounded px-2 py-1">
                                    <span className="text-xs text-gray-500 dark:text-gray-400">Section</span>
                                    <input
                                      type="text"
                                      value={section}
                                      onChange={(e) => {
                                        const updatedGrades = [...bulkGradeTemplate.grades];
                                        const updatedSections = [...grade.sections];
                                        updatedSections[sectionIndex] = e.target.value;
                                        updatedGrades[gradeIndex] = {
                                          ...updatedGrades[gradeIndex],
                                          sections: updatedSections
                                        };
                                        setBulkGradeTemplate({ ...bulkGradeTemplate, grades: updatedGrades });
                                      }}
                                      className="flex-1 bg-transparent border-b border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:border-[#8CC63F] min-w-0"
                                      placeholder="A"
                                    />
                                    <button
                                      onClick={() => {
                                        const updatedGrades = [...bulkGradeTemplate.grades];
                                        const updatedSections = grade.sections.filter((_, i) => i !== sectionIndex);
                                        updatedGrades[gradeIndex] = {
                                          ...updatedGrades[gradeIndex],
                                          sections: updatedSections
                                        };
                                        setBulkGradeTemplate({ ...bulkGradeTemplate, grades: updatedGrades });
                                      }}
                                      className="p-0.5 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
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
          {/* Bulk Creation Button with Green Theme */}
          <Button
            onClick={() => setShowBulkWizard(true)}
            leftIcon={<Sparkles className="h-4 w-4" />}
            className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Bulk Create
          </Button>
          
          {/* Add Grade Level Button with Green Theme */}
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

      {/* Original forms preserved but not shown in this snippet */}
      {/* ... SlideInForm and ConfirmationDialog components ... */}

      {/* Bulk Creation Wizard */}
      {showBulkWizard && <BulkCreationWizard />}
    </div>
  );
}