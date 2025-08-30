/**
 * File: /src/app/entity-module/configuration/tabs/GradeLevelsTab.tsx
 * 
 * HIERARCHICAL VERSION - Refactored for Tree View
 * - Implements hierarchical data fetching (schools -> grades -> sections)
 * - Uses new GradeHierarchyTree component instead of DataTable
 * - Supports nested structure with proper ordering
 */

'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, GraduationCap, School, Users, Building2, AlertTriangle, Loader2, Trash2 } from 'lucide-react';
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
import { CollapsibleSection } from '../../../../components/shared/CollapsibleSection';
import { toast } from '../../../../components/shared/Toast';

// Class Section interface
interface ClassSectionFormData {
  id?: string;
  section_name: string;
  section_code: string;
  max_capacity: number;
  status: 'active' | 'inactive';
  class_section_order: number;
}

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

interface GradeLevelsTabProps {
  companyId: string | null;
}

export function GradeLevelsTab({ companyId }: GradeLevelsTabProps) {
  const queryClient = useQueryClient();
  const { getScopeFilters, isEntityAdmin, isSubEntityAdmin } = useAccessControl();
  
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
    class_sections: [],
  });

  // State for class sections UI
  const [classSectionsExpanded, setClassSectionsExpanded] = useState(false);

  // Confirmation dialog state
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [itemsToDelete, setItemsToDelete] = useState<{ type: 'grade' | 'section'; items: any[] }>({ type: 'grade', items: [] });

  // Get scope filters
  const scopeFilters = getScopeFilters('schools');
  const canAccessAll = isEntityAdmin || isSubEntityAdmin;

  // Fetch schools for dropdown
  const { data: schools = [] } = useQuery(
    ['schools-for-grade-levels', companyId, scopeFilters],
    async () => {
      if (!companyId) return [];

      let query = supabase
        .from('schools')
        .select('id, name, status')
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
                room_number: section.room_number,
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

  // Populate formState when editing
  React.useEffect(() => {
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
              class_sections: editingGradeLevel.class_sections || []
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
          class_sections: [],
        });
      }
      setFormErrors({});
    }
  }, [isFormOpen, editingGradeLevel, editingSection, contextSchoolId]);

  // Create/update mutation
  const gradeLevelMutation = useMutation(
    async (data: FormState) => {
      const validatedData = gradeLevelSchema.parse({
        school_ids: data.school_ids,
        grade_name: data.grade_name,
        grade_code: data.grade_code || undefined,
        grade_order: data.grade_order,
        education_level: data.education_level,
        status: data.status,
        class_sections: data.class_sections
      });

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

        // Update school associations
        // Note: School associations are handled differently in hierarchical mode
        // The grade level belongs to a specific school (contextSchoolId)

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
          if (section.id) {
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
            processedSectionIds.push(newSection.id);
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
      
      return editingGradeLevel ? { ...editingGradeLevel, ...validatedData } : validatedData;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['grade-hierarchy']);
        setIsFormOpen(false);
        setEditingGradeLevel(null);
        setEditingSection(null);
        setFormErrors({});
        toast.success(`${formType === 'grade' ? 'Grade level' : 'Class section'} ${editingGradeLevel || editingSection ? 'updated' : 'created'} successfully`);
      },
      onError: (error) => {
        if (error instanceof z.ZodError) {
          const errors: Record<string, string> = {};
          error.errors.forEach((err) => {
            if (err.path.length > 0) {
              errors[err.path[0]] = err.message;
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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (formType === 'section') {
      // Handle class section creation/editing
      handleSectionSubmit();
    } else {
      // Handle grade level creation/editing
      handleGradeSubmit();
    }
  };

  const handleGradeSubmit = () => {
    // Client-side validation for grade level
    handleGradeSubmitWithValidation();
  };

  const handleGradeSubmitWithValidation = async () => {
    // First validate the form data structure
    const validationData = {
      school_ids: formState.school_ids,
      grade_name: formState.grade_name,
      grade_code: formState.grade_code || undefined,
      grade_order: formState.grade_order,
      education_level: formState.education_level,
      status: formState.status,
      class_sections: formState.class_sections
    };
    
    const validation = gradeLevelSchema.safeParse(validationData);
    
    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        if (err.path.length > 0) {
          errors[err.path[0]] = err.message;
        }
      });
      setFormErrors(errors);
      return;
    }

    // Check for duplicate grade_order within the same school
    try {
      const schoolId = contextSchoolId || formState.school_ids[0];
      if (schoolId) {
        const { data: existingGrades, error: queryError } = await supabase
          .from('grade_levels')
          .select('id, grade_order')
          .eq('school_id', schoolId)
          .eq('grade_order', formState.grade_order);

        if (queryError) {
          console.error('Error checking for duplicate grade order:', queryError);
          setFormErrors({ form: 'Failed to validate grade order. Please try again.' });
          return;
        }

        // Check if there's a duplicate (excluding current grade level if editing)
        const duplicateGrade = existingGrades?.find(grade => 
          editingGradeLevel ? grade.id !== editingGradeLevel.id : true
        );

        if (duplicateGrade) {
          setFormErrors({ 
            grade_order: `Grade order ${formState.grade_order} already exists for this school. Please choose a different order.` 
          });
          return;
        }
      }
    } catch (error) {
      console.error('Error validating grade order:', error);
      setFormErrors({ form: 'Failed to validate grade order. Please try again.' });
      return;
    }
    
    // Clear any previous errors and proceed with mutation
    setFormErrors({});
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
  
  // Class section management functions
  const addClassSection = () => {
    const newSection: ClassSectionFormData = {
      section_name: '',
      section_code: '',
      max_capacity: 30,
      status: 'active',
      class_section_order: formState.class_sections.length + 1
    };
    
    setFormState(prev => ({
      ...prev,
      class_sections: [...prev.class_sections, newSection]
    }));
  };
  
  const removeClassSection = (index: number) => {
    setFormState(prev => ({
      ...prev,
      class_sections: prev.class_sections.filter((_, i) => i !== index)
    }));
  };
  
  const updateClassSection = (index: number, field: keyof ClassSectionFormData, value: any) => {
    setFormState(prev => ({
      ...prev,
      class_sections: prev.class_sections.map((section, i) => 
        i === index ? { ...section, [field]: value } : section
      )
    }));
  };

  // Loading and error states
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

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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

      <SlideInForm
        key={editingGradeLevel?.id || 'new'}
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

          {/* Class Sections Section - Only show for grade form type */}
          {formType === 'grade' && (
            <div className="space-y-4">
              <CollapsibleSection
                id="class-sections"
                title={`Class Sections (${formState.class_sections.length})`}
                isOpen={classSectionsExpanded}
                onToggle={() => setClassSectionsExpanded(!classSectionsExpanded)}
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
                      onClick={addClassSection}
                      leftIcon={<Plus className="h-4 w-4" />}
                    >
                      Add Section
                    </Button>
                  </div>
                  
                  {formState.class_sections.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <Users className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm">No class sections added yet</p>
                      <p className="text-xs mt-1">Click "Add Section" to create class sections for this grade</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {formState.class_sections.map((section, index) => (
                        <div key={index} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                              Section {index + 1}
                            </h4>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeClassSection(index)}
                              leftIcon={<Trash2 className="h-4 w-4" />}
                              className="text-red-600 hover:text-red-700 dark:text-red-400"
                            >
                              Remove
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              id={`section_name_${index}`}
                              label="Section Name"
                              required
                              error={formErrors[`class_sections.${index}.section_name`]}
                            >
                              <Input
                                id={`section_name_${index}`}
                                value={section.section_name}
                                onChange={(e) => updateClassSection(index, 'section_name', e.target.value)}
                                placeholder="e.g., Section A, Blue House"
                                leftIcon={<Users className="h-4 w-4 text-gray-400" />}
                              />
                            </FormField>
                            
                            <FormField
                              id={`section_code_${index}`}
                              label="Section Code"
                              error={formErrors[`class_sections.${index}.section_code`]}
                            >
                              <Input
                                id={`section_code_${index}`}
                                value={section.section_code}
                                onChange={(e) => updateClassSection(index, 'section_code', e.target.value)}
                                placeholder="e.g., A, BH"
                              />
                            </FormField>
                            
                            <FormField
                              id={`max_capacity_${index}`}
                              label="Max Capacity"
                              required
                              error={formErrors[`class_sections.${index}.max_capacity`]}
                            >
                              <Input
                                id={`max_capacity_${index}`}
                                type="number"
                                min="1"
                                value={section.max_capacity.toString()}
                                onChange={(e) => updateClassSection(index, 'max_capacity', parseInt(e.target.value) || 30)}
                                placeholder="30"
                              />
                            </FormField>
                            
                            <FormField
                              id={`class_section_order_${index}`}
                              label="Display Order"
                              required
                              error={formErrors[`class_sections.${index}.class_section_order`]}
                            >
                              <Input
                                id={`class_section_order_${index}`}
                                type="number"
                                min="1"
                                value={section.class_section_order.toString()}
                                onChange={(e) => updateClassSection(index, 'class_section_order', parseInt(e.target.value) || 1)}
                                placeholder="1"
                              />
                            </FormField>
                          </div>
                          
                          <div className="mt-4">
                            <FormField
                              id={`section_status_${index}`}
                              label="Status"
                            >
                              <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                                <div>
                                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Section Status
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {section.status === 'active'
                                      ? 'Section is currently active' 
                                      : 'Section is currently inactive'}
                                  </p>
                                </div>
                                <ToggleSwitch
                                  checked={section.status === 'active'}
                                  onChange={(checked) => updateClassSection(index, 'status', checked ? 'active' : 'inactive')}
                                  label="Active"
                                />
                              </div>
                            </FormField>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CollapsibleSection>
            </div>
          )}
        </form>
      </SlideInForm>

      {/* Confirmation Dialog */}
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
    </div>
  );
}