/**
 * File: /src/app/entity-module/configuration/tabs/GradeLevelsTab.tsx
 * 
 * COMPLETE VERSION - Original + Bulk Creation Features
 * - Preserves all original functionality (tree view, CRUD operations)
 * - Adds template-based bulk creation wizard
 * - Maintains full compatibility with existing system
 * - Combines best of both approaches
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
  Package
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

// Original types preserved
interface FilterState {
  search: string;
  school_ids: string[];
  education_level: string[];
  status: string[];
}

interface FormState {
  school_ids: string[];
  grade_name: string;
  grade_code: string;
  grade_order: number;
  education_level: 'kindergarten' | 'primary' | 'middle' | 'secondary' | 'senior';
  status: 'active' | 'inactive';
  class_sections: ClassSectionFormData[];
}

// New bulk creation types
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
  school_ids: z.array(z.string().uuid()).min(1, 'Please select at least one school'),
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
  const [selectedSchoolsForBulk, setSelectedSchoolsForBulk] = useState<string[]>([]);
  const [isApplyingBulk, setIsApplyingBulk] = useState(false);
  
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

  // ===== ORIGINAL QUERIES (PRESERVED) =====
  
  // Fetch schools for dropdown
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

      // Step 1: Fetch schools
      let schoolsQuery = supabase
        .from('schools')
        .select('id, name, code, status')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('name');

      if (!canAccessAll && scopeFilters.school_ids && scopeFilters.school_ids.length > 0) {
        schoolsQuery = schoolsQuery.in('id', scopeFilters.school_ids);
      }

      if (filters.school_ids.length > 0) {
        schoolsQuery = schoolsQuery.in('id', filters.school_ids);
      }

      const { data: schoolsData, error: schoolsError } = await schoolsQuery;
      if (schoolsError) throw schoolsError;

      if (!schoolsData || schoolsData.length === 0) {
        return { schools: [] };
      }

      // Step 2: Fetch grade levels for these schools
      let gradeLevelsQuery = supabase
        .from('grade_levels')
        .select('id, school_id, grade_name, grade_code, grade_order, education_level, status, created_at')
        .in('school_id', schoolsData.map(s => s.id))
        .order('grade_order');

      // Apply filters
      if (filters.search) {
        gradeLevelsQuery = gradeLevelsQuery.or(`grade_name.ilike.%${filters.search}%,grade_code.ilike.%${filters.search}%`);
      }

      if (filters.education_level.length > 0) {
        gradeLevelsQuery = gradeLevelsQuery.in('education_level', filters.education_level);
      }

      if (filters.status.length > 0) {
        gradeLevelsQuery = gradeLevelsQuery.in('status', filters.status);
      }

      const { data: gradeLevelsData, error: gradeLevelsError } = await gradeLevelsQuery;
      if (gradeLevelsError) throw gradeLevelsError;

      // Step 3: Fetch class sections for these grade levels
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

      // Step 4: Build hierarchical structure
      const schools: SchoolNode[] = schoolsData.map(school => {
        const schoolGrades = (gradeLevelsData || [])
          .filter(grade => grade.school_id === school.id)
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
                current_students: 0 // TODO: Calculate from actual enrollment
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

  // ===== ORIGINAL FORM EFFECTS (PRESERVED) =====
  
  // Populate formState when editing
  useEffect(() => {
    if (isFormOpen) {
      if (editingGradeLevel) {
        // Fetch existing class sections for this grade level
        const fetchClassSections = async () => {
          try {
            const { data: classSections, error } = await supabase
              .from('class_sections')
              .select('id, section_name, section_code, max_capacity, status, class_section_order')
              .eq('grade_level_id', editingGradeLevel.id)
              .order('class_section_order');
            
            if (error) throw error;
            
            setFormState({
              school_ids: [contextSchoolId],
              grade_name: editingGradeLevel.grade_name || '',
              grade_code: editingGradeLevel.grade_code || '',
              grade_order: editingGradeLevel.grade_order || 1,
              education_level: editingGradeLevel.education_level || 'primary',
              status: editingGradeLevel.status || 'active',
              class_sections: classSections || []
            });
          } catch (error) {
            console.error('Error fetching class sections:', error);
            setFormState({
              school_ids: [contextSchoolId],
              grade_name: editingGradeLevel.grade_name || '',
              grade_code: editingGradeLevel.grade_code || '',
              grade_order: editingGradeLevel.grade_order || 1,
              education_level: editingGradeLevel.education_level || 'primary',
              status: editingGradeLevel.status || 'active',
              class_sections: []
            });
          }
        };
        
        fetchClassSections();
      } else if (editingSection) {
        // Editing a class section
        setFormState({
          school_ids: [contextSchoolId],
          grade_name: '',
          grade_code: '',
          grade_order: 1,
          education_level: 'primary',
          status: 'active',
          class_sections: [{
            id: editingSection.id,
            section_name: editingSection.section_name,
            section_code: editingSection.section_code || '',
            max_capacity: editingSection.max_capacity,
            status: editingSection.status,
            class_section_order: editingSection.class_section_order
          }]
        });
      } else {
        setFormState({
          school_ids: contextSchoolId ? [contextSchoolId] : [],
          grade_name: '',
          grade_code: '',
          grade_order: 1,
          education_level: 'primary',
          status: 'active',
          class_sections: []
        });
      }
      setFormErrors({});
      setIsSectionsExpanded(true);
    }
  }, [isFormOpen, editingGradeLevel, editingSection, contextSchoolId]);

  // ===== ORIGINAL MUTATIONS (PRESERVED) =====
  
  // Create/update mutation
  const gradeLevelMutation = useMutation(
    async (data: FormState) => {
      const validatedData = gradeLevelSchema.parse(data);

      let gradeLevelId: string;

      if (editingGradeLevel) {
        // Update existing grade level
        const { error } = await supabase
          .from('grade_levels')
          .update({
            grade_name: validatedData.grade_name,
            grade_code: validatedData.grade_code,
            grade_order: validatedData.grade_order,
            education_level: validatedData.education_level,
            status: validatedData.status
          })
          .eq('id', editingGradeLevel.id);
        if (error) throw error;
        gradeLevelId = editingGradeLevel.id;
      } else {
        // Create new grade level
        const { data: newGradeLevel, error } = await supabase
          .from('grade_levels')
          .insert([{
            school_id: contextSchoolId || validatedData.school_ids[0],
            grade_name: validatedData.grade_name,
            grade_code: validatedData.grade_code,
            grade_order: validatedData.grade_order,
            education_level: validatedData.education_level,
            status: validatedData.status
          }])
          .select()
          .single();
        if (error) throw error;
        
        gradeLevelId = newGradeLevel.id;
      }
      
      // Handle class sections
      if (validatedData.class_sections && validatedData.class_sections.length > 0) {
        // Get existing class sections if editing
        let existingClassSectionIds: string[] = [];
        if (editingGradeLevel) {
          const { data: existingSections } = await supabase
            .from('class_sections')
            .select('id')
            .eq('grade_level_id', gradeLevelId);
          existingClassSectionIds = existingSections?.map(s => s.id) || [];
        }
        
        // Process each class section
        const processedSectionIds: string[] = [];
        
        for (const section of validatedData.class_sections) {
          if (section.id && existingClassSectionIds.includes(section.id)) {
            // Update existing class section
            const { error: updateError } = await supabase
              .from('class_sections')
              .update({
                section_name: section.section_name,
                section_code: section.section_code || null,
                max_capacity: section.max_capacity,
                status: section.status,
                class_section_order: section.class_section_order
              })
              .eq('id', section.id);
            
            if (updateError) throw updateError;
            processedSectionIds.push(section.id);
          } else {
            // Create new class section
            const { data: newSection, error: insertError } = await supabase
              .from('class_sections')
              .insert([{
                grade_level_id: gradeLevelId,
                section_name: section.section_name,
                section_code: section.section_code || null,
                max_capacity: section.max_capacity,
                status: section.status,
                class_section_order: section.class_section_order
              }])
              .select('id')
              .single();
            
            if (insertError) throw insertError;
            if (newSection) processedSectionIds.push(newSection.id);
          }
        }
        
        // Delete removed class sections
        const sectionsToDelete = existingClassSectionIds.filter(id => !processedSectionIds.includes(id));
        if (sectionsToDelete.length > 0) {
          const { error: deleteError } = await supabase
            .from('class_sections')
            .delete()
            .in('id', sectionsToDelete);
          
          if (deleteError) throw deleteError;
        }
      }
      
      return validatedData;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['grade-hierarchy']);
        queryClient.invalidateQueries(['class-sections']);
        setIsFormOpen(false);
        setEditingGradeLevel(null);
        setEditingSection(null);
        setFormErrors({});
        const sectionsCount = formState.class_sections.length;
        const sectionsText = sectionsCount > 0 ? ` with ${sectionsCount} section${sectionsCount > 1 ? 's' : ''}` : '';
        toast.success(`Grade level ${editingGradeLevel ? 'updated' : 'created'} successfully${sectionsText}`);
      },
      onError: (error) => {
        if (error instanceof z.ZodError) {
          const errors: Record<string, string> = {};
          error.errors.forEach((err) => {
            const path = err.path.join('.');
            if (path) {
              errors[path] = err.message;
            }
          });
          setFormErrors(errors);
        } else {
          console.error('Error saving grade level:', error);
          setFormErrors({ form: 'Failed to save grade level. Please try again.' });
          toast.error(`Failed to save ${formType === 'grade' ? 'grade level' : 'class section'}`);
        }
      }
    }
  );

  // Delete mutation
  const deleteMutation = useMutation(
    async ({ type, items }: { type: 'grade' | 'section'; items: any[] }) => {
      if (type === 'grade') {
        const { error } = await supabase
          .from('grade_levels')
          .delete()
          .in('id', items.map(g => g.id));
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('class_sections')
          .delete()
          .in('id', items.map(s => s.id));
        if (error) throw error;
      }

      return { type, items };
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['grade-hierarchy']);
        setIsConfirmDialogOpen(false);
        setItemsToDelete({ type: 'grade', items: [] });
        toast.success(`${itemsToDelete.type === 'grade' ? 'Grade level(s)' : 'Class section(s)'} deleted successfully`);
      },
      onError: (error) => {
        console.error('Error deleting items:', error);
        toast.error(`Failed to delete ${itemsToDelete.type === 'grade' ? 'grade level(s)' : 'class section(s)'}`);
        setIsConfirmDialogOpen(false);
        setItemsToDelete({ type: 'grade', items: [] });
      }
    }
  );

  // ===== NEW BULK CREATION FUNCTIONS =====
  
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
    
    const addGradeToBulkTemplate = () => {
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
    };
    
    const updateGradeInBulkTemplate = (index: number, field: keyof GradeTemplate, value: any) => {
      const updatedGrades = [...bulkGradeTemplate.grades];
      updatedGrades[index] = { ...updatedGrades[index], [field]: value };
      setBulkGradeTemplate({ ...bulkGradeTemplate, grades: updatedGrades });
    };
    
    const removeGradeFromBulkTemplate = (index: number) => {
      const updatedGrades = bulkGradeTemplate.grades.filter((_, i) => i !== index);
      setBulkGradeTemplate({ ...bulkGradeTemplate, grades: updatedGrades });
    };
    
    const addSectionToBulkGrade = (gradeIndex: number, sectionName: string) => {
      const updatedGrades = [...bulkGradeTemplate.grades];
      updatedGrades[gradeIndex].sections.push(sectionName);
      setBulkGradeTemplate({ ...bulkGradeTemplate, grades: updatedGrades });
    };
    
    const removeSectionFromBulkGrade = (gradeIndex: number, sectionIndex: number) => {
      const updatedGrades = [...bulkGradeTemplate.grades];
      updatedGrades[gradeIndex].sections = updatedGrades[gradeIndex].sections.filter((_, i) => i !== sectionIndex);
      setBulkGradeTemplate({ ...bulkGradeTemplate, grades: updatedGrades });
    };
    
    const applyBulkTemplate = async () => {
      try {
        setIsApplyingBulk(true);
        
        for (const schoolId of selectedSchoolsForBulk) {
          for (const grade of bulkGradeTemplate.grades) {
            // Create grade level for each school
            const { data: gradeLevel, error: gradeError } = await supabase
              .from('grade_levels')
              .insert([{
                school_id: schoolId,
                grade_name: grade.name,
                grade_code: grade.code,
                grade_order: grade.order,
                education_level: grade.education_level,
                status: 'active'
              }])
              .select()
              .single();
            
            if (gradeError) throw gradeError;
            
            // Create sections for each grade
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
                
                if (sectionError) throw sectionError;
              }
            }
          }
        }
        
        queryClient.invalidateQueries(['grade-hierarchy']);
        toast.success(`Template applied to ${selectedSchoolsForBulk.length} school(s) successfully!`);
        setShowBulkWizard(false);
        resetBulkWizard();
      } catch (error) {
        console.error('Error applying template:', error);
        toast.error('Failed to apply template. Please try again.');
      } finally {
        setIsApplyingBulk(false);
      }
    };
    
    const resetBulkWizard = () => {
      setWizardStep(1);
      setSelectedTemplate(null);
      setSelectedSchoolsForBulk([]);
      setBulkGradeTemplate({ name: '', description: '', grades: [] });
    };
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Bulk Grade Structure Setup</h2>
                <p className="text-blue-100 mt-1">Create and apply grade structures to multiple schools at once</p>
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
                    ${wizardStep >= step.id ? 'bg-white text-blue-600' : 'bg-blue-500 text-blue-200'}
                  `}>
                    {wizardStep > step.id ? <Check className="w-5 h-5" /> : step.icon}
                  </div>
                  <div className="ml-3 flex-1">
                    <p className={`text-sm font-medium ${wizardStep >= step.id ? 'text-white' : 'text-blue-200'}`}>
                      {step.name}
                    </p>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`
                      h-1 flex-1 mx-4
                      ${wizardStep > step.id ? 'bg-white' : 'bg-blue-500'}
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
                    className="p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                        <Plus className="w-6 h-6 text-blue-600 dark:text-blue-400" />
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
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                          : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md'
                        }
                      `}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg flex items-center justify-center">
                          <GraduationCap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
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
            
            {/* Step 2: Customize Structure */}
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
                    onClick={addGradeToBulkTemplate}
                    leftIcon={<Plus className="w-4 h-4" />}
                    variant="outline"
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
                    {bulkGradeTemplate.grades.map((grade, gradeIndex) => (
                      <div key={gradeIndex} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex items-start gap-4">
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                            <FormField label="Grade Name">
                              <Input
                                value={grade.name}
                                onChange={(e) => updateGradeInBulkTemplate(gradeIndex, 'name', e.target.value)}
                                placeholder="e.g., Grade 1"
                              />
                            </FormField>
                            
                            <FormField label="Code">
                              <Input
                                value={grade.code}
                                onChange={(e) => updateGradeInBulkTemplate(gradeIndex, 'code', e.target.value)}
                                placeholder="e.g., G1"
                              />
                            </FormField>
                            
                            <FormField label="Order">
                              <Input
                                type="number"
                                value={grade.order}
                                onChange={(e) => updateGradeInBulkTemplate(gradeIndex, 'order', parseInt(e.target.value))}
                                min="1"
                              />
                            </FormField>
                            
                            <FormField label="Education Level">
                              <Select
                                value={grade.education_level}
                                onChange={(value) => updateGradeInBulkTemplate(gradeIndex, 'education_level', value)}
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
                            onClick={() => removeGradeFromBulkTemplate(gradeIndex)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        
                        {/* Sections */}
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Class Sections ({grade.sections.length})
                            </label>
                            <button
                              onClick={() => {
                                const nextLetter = String.fromCharCode(65 + grade.sections.length);
                                addSectionToBulkGrade(gradeIndex, nextLetter);
                              }}
                              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                            >
                              + Add Section
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {grade.sections.map((section, sectionIndex) => (
                              <div
                                key={sectionIndex}
                                className="flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg"
                              >
                                <span className="text-sm text-gray-900 dark:text-white">Section {section}</span>
                                <button
                                  onClick={() => removeSectionFromBulkGrade(gradeIndex, sectionIndex)}
                                  className="ml-1 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* Step 3: Select Schools */}
            {wizardStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Select Schools</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Choose which schools should receive this grade structure
                  </p>
                </div>
                
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setSelectedSchoolsForBulk(schools.map(s => s.id))}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700"
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => setSelectedSchoolsForBulk([])}
                      className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-700"
                    >
                      Clear Selection
                    </button>
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedSchoolsForBulk.length} of {schools.length} selected
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {schools.map((school) => (
                    <div
                      key={school.id}
                      onClick={() => {
                        if (selectedSchoolsForBulk.includes(school.id)) {
                          setSelectedSchoolsForBulk(selectedSchoolsForBulk.filter(id => id !== school.id));
                        } else {
                          setSelectedSchoolsForBulk([...selectedSchoolsForBulk, school.id]);
                        }
                      }}
                      className={`
                        p-4 border-2 rounded-lg cursor-pointer transition-all
                        ${selectedSchoolsForBulk.includes(school.id)
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`
                          w-5 h-5 rounded border-2 flex items-center justify-center
                          ${selectedSchoolsForBulk.includes(school.id)
                            ? 'bg-blue-600 border-blue-600'
                            : 'border-gray-300 dark:border-gray-600'
                          }
                        `}>
                          {selectedSchoolsForBulk.includes(school.id) && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 dark:text-white">{school.name}</h4>
                          {school.code && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">{school.code}</p>
                          )}
                        </div>
                        <StatusBadge status={school.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Step 4: Review & Apply */}
            {wizardStep === 4 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Review & Apply</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Review your configuration before applying it to the selected schools
                  </p>
                </div>
                
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                        <GraduationCap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm text-blue-600 dark:text-blue-400">Grade Levels</p>
                        <p className="text-2xl font-semibold text-blue-900 dark:text-blue-100">
                          {bulkGradeTemplate.grades.length}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                        <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm text-green-600 dark:text-green-400">Total Sections</p>
                        <p className="text-2xl font-semibold text-green-900 dark:text-green-100">
                          {bulkGradeTemplate.grades.reduce((sum, g) => sum + g.sections.length, 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                        <School className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="text-sm text-purple-600 dark:text-purple-400">Schools</p>
                        <p className="text-2xl font-semibold text-purple-900 dark:text-purple-100">
                          {selectedSchoolsForBulk.length}
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
                        <li>• {bulkGradeTemplate.grades.length * selectedSchoolsForBulk.length} grade levels</li>
                        <li>• {bulkGradeTemplate.grades.reduce((sum, g) => sum + g.sections.length, 0) * selectedSchoolsForBulk.length} class sections</li>
                        <li>• All items will be created with "Active" status</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Footer */}
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
                  disabled={selectedSchoolsForBulk.length === 0 || bulkGradeTemplate.grades.length === 0 || isApplyingBulk}
                >
                  {isApplyingBulk ? 'Applying...' : `Apply to ${selectedSchoolsForBulk.length} School${selectedSchoolsForBulk.length !== 1 ? 's' : ''}`}
                </Button>
              ) : (
                <Button
                  onClick={() => setWizardStep(wizardStep + 1)}
                  disabled={
                    (wizardStep === 2 && bulkGradeTemplate.grades.length === 0) ||
                    (wizardStep === 3 && selectedSchoolsForBulk.length === 0)
                  }
                  rightIcon={<ChevronRight className="w-4 h-4" />}
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

  // ===== ORIGINAL HANDLER FUNCTIONS (PRESERVED) =====
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (formType === 'section') {
      handleSectionSubmit();
    } else {
      handleGradeSubmit();
    }
  };

  const handleGradeSubmit = () => {
    gradeLevelMutation.mutate(formState);
  };

  const handleSectionSubmit = async () => {
    // Validate class section data
    const sectionData = formState.class_sections[0];
    if (!sectionData) {
      setFormErrors({ section_name: 'Section data is missing' });
      return;
    }

    const errors: Record<string, string> = {};
    if (!sectionData.section_name.trim()) {
      errors.section_name = 'Section name is required';
    }
    if (sectionData.max_capacity < 1) {
      errors.max_capacity = 'Max capacity must be at least 1';
    }
    if (sectionData.class_section_order < 1) {
      errors.class_section_order = 'Display order must be at least 1';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      if (editingSection) {
        // Update existing class section
        const { error } = await supabase
          .from('class_sections')
          .update({
            section_name: sectionData.section_name,
            section_code: sectionData.section_code || null,
            max_capacity: sectionData.max_capacity,
            status: sectionData.status,
            class_section_order: sectionData.class_section_order
          })
          .eq('id', editingSection.id);
        
        if (error) throw error;
      } else {
        // Create new class section
        const { error } = await supabase
          .from('class_sections')
          .insert([{
            grade_level_id: contextGradeId,
            section_name: sectionData.section_name,
            section_code: sectionData.section_code || null,
            max_capacity: sectionData.max_capacity,
            status: sectionData.status,
            class_section_order: sectionData.class_section_order
          }]);
        
        if (error) throw error;
      }

      queryClient.invalidateQueries(['grade-hierarchy']);
      setIsFormOpen(false);
      setEditingSection(null);
      setFormErrors({});
      toast.success(`Class section ${editingSection ? 'updated' : 'created'} successfully`);
    } catch (error) {
      console.error('Error saving class section:', error);
      setFormErrors({ form: 'Failed to save class section. Please try again.' });
      toast.error('Failed to save class section');
    }
  };

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

  const confirmDelete = () => {
    deleteMutation.mutate(itemsToDelete);
  };

  const cancelDelete = () => {
    setIsConfirmDialogOpen(false);
    setItemsToDelete({ type: 'grade', items: [] });
  };
  
  // Class sections handlers
  const handleAddSectionForm = () => {
    const newSection: ClassSectionFormData = {
      section_name: '',
      section_code: '',
      max_capacity: 30,
      room_number: '',
      building: '',
      floor: 1,
      status: 'active',
      class_section_order: formState.class_sections.length + 1,
      _isNew: true
    };
    
    setFormState(prev => ({
      ...prev,
      class_sections: [...prev.class_sections, newSection]
    }));
  };

  const handleSectionChange = (index: number, field: keyof ClassSectionFormData, value: any) => {
    setFormState(prev => ({
      ...prev,
      class_sections: prev.class_sections.map((section, i) => 
        i === index ? { ...section, [field]: value } : section
      )
    }));
    
    // Clear section-specific errors
    const errorKey = `sections.${index}.${field}`;
    if (formErrors[errorKey]) {
      const newErrors = { ...formErrors };
      delete newErrors[errorKey];
      setFormErrors(newErrors);
    }
  };

  const handleRemoveSection = (index: number) => {
    setFormState(prev => ({
      ...prev,
      class_sections: prev.class_sections.filter((_, i) => i !== index)
    }));
    
    // Clear errors for removed section
    const newErrors = { ...formErrors };
    Object.keys(newErrors).forEach(key => {
      if (key.startsWith(`sections.${index}.`)) {
        delete newErrors[key];
      }
    });
    setFormErrors(newErrors);
  };

  // ===== LOADING AND ERROR STATES (PRESERVED) =====
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
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

  // ===== MAIN RENDER (COMBINED ORIGINAL + NEW) =====
  
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
          {/* NEW: Bulk Creation Button */}
          <Button
            onClick={() => setShowBulkWizard(true)}
            leftIcon={<Sparkles className="h-4 w-4" />}
            variant="secondary"
          >
            Bulk Create
          </Button>
          
          {/* ORIGINAL: Add Grade Level Button */}
          <Button
            onClick={() => {
              setFormType('grade');
              setContextSchoolId('');
              setEditingGradeLevel(null);
              setEditingSection(null);
              setIsFormOpen(true);
            }}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Add Grade Level
          </Button>
        </div>
      </div>

      {/* ORIGINAL: Summary Statistics */}
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
              <GraduationCap className="w-5 h-5 text-green-600 dark:text-green-400" />
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

      {/* ORIGINAL: Filters */}
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

      {/* ORIGINAL: Hierarchical Tree View */}
      <GradeHierarchyTree
        data={hierarchyData || { schools: [] }}
        onAddGrade={handleAddGrade}
        onEditGrade={handleEditGrade}
        onDeleteGrade={handleDeleteGrade}
        onAddSection={handleAddSection}
        onEditSection={handleEditSection}
        onDeleteSection={handleDeleteSection}
      />

      {/* ORIGINAL: SlideIn Form for Individual Creation/Editing */}
      <SlideInForm
        key={editingGradeLevel?.id || editingSection?.id || 'new'}
        title={
          formType === 'grade' 
            ? (editingGradeLevel ? 'Edit Grade Level' : 'Create Grade Level')
            : (editingSection ? 'Edit Class Section' : 'Create Class Section')
        }
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingGradeLevel(null);
          setEditingSection(null);
          setFormErrors({});
        }}
        onSave={() => {
          const form = document.querySelector('form');
          if (form) form.requestSubmit();
        }}
        loading={gradeLevelMutation.isPending}
        width="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formErrors.form && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
              {formErrors.form}
            </div>
          )}

          {formType === 'grade' && (
            <>
              <FormField
                id="school_ids"
                label="School"
                required
                error={formErrors.school_ids}
              >
                <SearchableMultiSelect
                  label=""
                  options={schools.map(school => ({
                    value: school.id,
                    label: school.name
                  }))}
                  selectedValues={formState.school_ids}
                  onChange={(values) => setFormState(prev => ({ ...prev, school_ids: values }))}
                  placeholder="Select schools..."
                  isMulti={false}
                />
              </FormField>

              <FormField
                id="grade_name"
                label="Grade Name"
                required
                error={formErrors.grade_name}
              >
                <Input
                  id="grade_name"
                  name="grade_name"
                  placeholder="e.g., Grade 1, Year 7, Kindergarten"
                  value={formState.grade_name}
                  onChange={(e) => setFormState(prev => ({ ...prev, grade_name: e.target.value }))}
                  leftIcon={<GraduationCap className="h-5 w-5 text-gray-400" />}
                />
              </FormField>

              <FormField
                id="grade_code"
                label="Grade Code"
                error={formErrors.grade_code}
              >
                <Input
                  id="grade_code"
                  name="grade_code"
                  placeholder="e.g., G1, Y7, KG"
                  value={formState.grade_code}
                  onChange={(e) => setFormState(prev => ({ ...prev, grade_code: e.target.value }))}
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
                    name="grade_order"
                    type="number"
                    min="1"
                    placeholder="1"
                    value={formState.grade_order.toString()}
                    onChange={(e) => setFormState(prev => ({ ...prev, grade_order: parseInt(e.target.value) || 1 }))}
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
                    name="education_level"
                    options={[
                      { value: 'kindergarten', label: 'Kindergarten' },
                      { value: 'primary', label: 'Primary' },
                      { value: 'middle', label: 'Middle' },
                      { value: 'secondary', label: 'Secondary' },
                      { value: 'senior', label: 'Senior' }
                    ]}
                    value={formState.education_level}
                    onChange={(value) => setFormState(prev => ({ ...prev, education_level: value as any }))}
                  />
                </FormField>
              </div>

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
                      {formState.status === 'active'
                        ? 'Grade level is currently active' 
                        : 'Grade level is currently inactive'}
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={formState.status === 'active'}
                    onChange={(checked) => {
                      setFormState(prev => ({ ...prev, status: checked ? 'active' : 'inactive' }));
                    }}
                    label="Active"
                  />
                </div>
              </FormField>

              {/* Class Sections */}
              <CollapsibleSection
                id="class-sections"
                title={`Class Sections (${formState.class_sections.length})`}
                isOpen={isSectionsExpanded}
                onToggle={() => setIsSectionsExpanded(!isSectionsExpanded)}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Add class sections for this grade level. Each section represents a class group within the grade.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddSectionForm}
                      leftIcon={<Plus className="w-4 h-4" />}
                    >
                      Add Section
                    </Button>
                  </div>
                  
                  {formState.class_sections.length === 0 ? (
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
                        onClick={handleAddSectionForm}
                        leftIcon={<Plus className="w-4 h-4" />}
                      >
                        Add First Section
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {formState.class_sections.map((section, index) => (
                        <ClassSectionFormItem
                          key={section.id || `new-${index}`}
                          data={section}
                          index={index}
                          onChange={handleSectionChange}
                          onRemove={handleRemoveSection}
                          errors={formErrors}
                          disabled={gradeLevelMutation.isPending}
                          showRemoveButton={formState.class_sections.length > 1}
                        />
                      ))}
                      
                      {/* Add Another Section Button */}
                      <div className="text-center pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleAddSectionForm}
                          leftIcon={<Plus className="w-4 h-4" />}
                          className="border-dashed"
                        >
                          Add Another Section
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CollapsibleSection>
            </>
          )}

          {formType === 'section' && (
            <>
              <FormField
                id="section_name"
                label="Section Name"
                required
                error={formErrors.section_name}
              >
                <Input
                  id="section_name"
                  name="section_name"
                  placeholder="e.g., Section A, Blue House"
                  value={formState.class_sections[0]?.section_name || ''}
                  onChange={(e) => {
                    const newSections = [...formState.class_sections];
                    if (newSections.length === 0) {
                      newSections.push({
                        section_name: e.target.value,
                        section_code: '',
                        max_capacity: 30,
                        status: 'active',
                        class_section_order: 1
                      });
                    } else {
                      newSections[0].section_name = e.target.value;
                    }
                    setFormState(prev => ({ ...prev, class_sections: newSections }));
                  }}
                  leftIcon={<Users className="h-5 w-5 text-gray-400" />}
                />
              </FormField>

              <FormField
                id="section_code"
                label="Section Code"
                error={formErrors.section_code}
              >
                <Input
                  id="section_code"
                  name="section_code"
                  placeholder="e.g., A, BH"
                  value={formState.class_sections[0]?.section_code || ''}
                  onChange={(e) => {
                    const newSections = [...formState.class_sections];
                    if (newSections.length === 0) {
                      newSections.push({
                        section_name: '',
                        section_code: e.target.value,
                        max_capacity: 30,
                        status: 'active',
                        class_section_order: 1
                      });
                    } else {
                      newSections[0].section_code = e.target.value;
                    }
                    setFormState(prev => ({ ...prev, class_sections: newSections }));
                  }}
                />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  id="max_capacity"
                  label="Max Capacity"
                  required
                  error={formErrors.max_capacity}
                >
                  <Input
                    id="max_capacity"
                    name="max_capacity"
                    type="number"
                    min="1"
                    placeholder="30"
                    value={formState.class_sections[0]?.max_capacity?.toString() || '30'}
                    onChange={(e) => {
                      const newSections = [...formState.class_sections];
                      if (newSections.length === 0) {
                        newSections.push({
                          section_name: '',
                          section_code: '',
                          max_capacity: parseInt(e.target.value) || 30,
                          status: 'active',
                          class_section_order: 1
                        });
                      } else {
                        newSections[0].max_capacity = parseInt(e.target.value) || 30;
                      }
                      setFormState(prev => ({ ...prev, class_sections: newSections }));
                    }}
                  />
                </FormField>

                <FormField
                  id="class_section_order"
                  label="Display Order"
                  required
                  error={formErrors.class_section_order}
                >
                  <Input
                    id="class_section_order"
                    name="class_section_order"
                    type="number"
                    min="1"
                    placeholder="1"
                    value={formState.class_sections[0]?.class_section_order?.toString() || '1'}
                    onChange={(e) => {
                      const newSections = [...formState.class_sections];
                      if (newSections.length === 0) {
                        newSections.push({
                          section_name: '',
                          section_code: '',
                          max_capacity: 30,
                          status: 'active',
                          class_section_order: parseInt(e.target.value) || 1
                        });
                      } else {
                        newSections[0].class_section_order = parseInt(e.target.value) || 1;
                      }
                      setFormState(prev => ({ ...prev, class_sections: newSections }));
                    }}
                  />
                </FormField>
              </div>

              <FormField
                id="section_status"
                label="Section Status"
              >
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Section Status
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {(formState.class_sections[0]?.status || 'active') === 'active'
                        ? 'Section is currently active' 
                        : 'Section is currently inactive'}
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={(formState.class_sections[0]?.status || 'active') === 'active'}
                    onChange={(checked) => {
                      const newSections = [...formState.class_sections];
                      if (newSections.length === 0) {
                        newSections.push({
                          section_name: '',
                          section_code: '',
                          max_capacity: 30,
                          status: checked ? 'active' : 'inactive',
                          class_section_order: 1
                        });
                      } else {
                        newSections[0].status = checked ? 'active' : 'inactive';
                      }
                      setFormState(prev => ({ ...prev, class_sections: newSections }));
                    }}
                    label="Active"
                  />
                </div>
              </FormField>
            </>
          )}
        </form>
      </SlideInForm>

      {/* ORIGINAL: Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isConfirmDialogOpen}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        title={`Delete ${itemsToDelete.type === 'grade' ? 'Grade Level' : 'Class Section'}`}
        message={`Are you sure you want to delete ${itemsToDelete.items.length} ${itemsToDelete.type === 'grade' ? 'grade level(s)' : 'class section(s)'}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        loading={deleteMutation.isPending}
      />

      {/* NEW: Bulk Creation Wizard */}
      {showBulkWizard && <BulkCreationWizard />}
    </div>
  );
}