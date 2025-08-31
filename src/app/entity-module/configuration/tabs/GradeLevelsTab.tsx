/**
 * File: /src/app/entity-module/configuration/tabs/GradeLevelsTab.tsx
 * 
 * HIERARCHICAL VERSION - Refactored for Tree View
 * - Implements hierarchical data fetching (schools -> grades -> sections)
 * - Uses new GradeHierarchyTree component instead of DataTable
 * - Supports nested structure with proper ordering
 * - Fixed: Single stats section positioned above filters
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
import { ClassSectionFormItem, type ClassSectionFormData } from '../../../../components/forms/ClassSectionFormItem';
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
    section_name: z.string().min(1, 'Section name is required'),
    section_code: z.string().optional(),
    max_capacity: z.number().min(1, 'Capacity must be at least 1'),
    room_number: z.string().optional(),
    building: z.string().optional(),
    floor: z.number().min(0, 'Floor must be 0 or higher'),
    status: z.enum(['active', 'inactive']),
    class_section_order: z.number().min(1, 'Order must be at least 1')
  })).optional(),
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
    class_sections: []
  });

  // UI state for class sections
  const [isSectionsExpanded, setIsSectionsExpanded] = useState(true);

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
        const fetchExistingSections = async () => {
          try {
            const { data: sections, error } = await supabase
              .from('class_sections')
              .select('*')
              .eq('grade_level_id', editingGradeLevel.id)
              .order('class_section_order');
            
            if (error) {
              console.error('Error fetching class sections:', error);
            }
            
            const existingSections: ClassSectionFormData[] = (sections || []).map(section => ({
              id: section.id,
              section_name: section.section_name || '',
              section_code: section.section_code || '',
              max_capacity: section.max_capacity || 30,
              room_number: section.room_number || '',
              building: section.building || '',
              floor: section.floor || 1,
              status: section.status || 'active',
              class_section_order: section.class_section_order || 1,
              _isNew: false
            }));
            
            setFormState({
              school_ids: [contextSchoolId],
              grade_name: editingGradeLevel.grade_name || '',
              grade_code: editingGradeLevel.grade_code || '',
              grade_order: editingGradeLevel.grade_order || 1,
              education_level: editingGradeLevel.education_level || 'primary',
              status: editingGradeLevel.status || 'active',
              class_sections: existingSections
            });
          } catch (error) {
            console.error('Error in fetchExistingSections:', error);
            // Set form state without sections if fetch fails
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
        
        fetchExistingSections();
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
          class_sections: []
        });
      }
      setFormErrors({});
      setIsSectionsExpanded(true);
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

      let gradeId: string;
      
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
        gradeId = editingGradeLevel.id;
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
        
        gradeId = newGradeLevel.id;
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
      
      // Handle class sections if any are provided
      if (validatedData.class_sections && validatedData.class_sections.length > 0) {
        // Get the academic year for the first school (required for class_sections)
        const firstSchoolId = validatedData.school_ids[0];
        const { data: academicYear } = await supabase
          .from('academic_years')
          .select('id')
          .eq('school_id', firstSchoolId)
          .eq('is_current', true)
          .maybeSingle();
        
        // Process each class section
        for (const section of validatedData.class_sections) {
          const sectionData = {
            grade_level_id: gradeId,
            academic_year_id: academicYear?.id || null,
            section_name: section.section_name,
            section_code: section.section_code || null,
            max_capacity: section.max_capacity,
            room_number: section.room_number || null,
            building: section.building || null,
            floor: section.floor || null,
            status: section.status,
            class_section_order: section.class_section_order
          };
          
          // Check if this is an existing section (has id) or new section
          const existingSection = data.class_sections.find(s => s.id === section.id);
          
          if (existingSection && existingSection.id && !existingSection._isNew) {
            // Update existing section
            const { error: updateError } = await supabase
              .from('class_sections')
              .update(sectionData)
              .eq('id', existingSection.id);
            
            if (updateError) {
              console.error('Error updating class section:', updateError);
              throw new Error(`Failed to update section "${section.section_name}": ${updateError.message}`);
            }
          } else {
            // Create new section
            const { error: insertError } = await supabase
              .from('class_sections')
              .insert([sectionData]);
            
            if (insertError) {
              console.error('Error creating class section:', insertError);
              throw new Error(`Failed to create section "${section.section_name}": ${insertError.message}`);
            }
          }
        }
        
        // Delete sections that were removed from the form (only when editing)
        if (editingGradeLevel) {
          const currentSectionIds = data.class_sections
            .filter(s => s.id && !s._isNew)
            .map(s => s.id);
          
          const formSectionIds = validatedData.class_sections
            .filter(s => s.id && !s._isNew)
            .map(s => s.id);
          
          const sectionsToDelete = currentSectionIds.filter(id => !formSectionIds.includes(id));
          
          if (sectionsToDelete.length > 0) {
            const { error: deleteError } = await supabase
              .from('class_sections')
              .delete()
              .in('id', sectionsToDelete);
            
            if (deleteError) {
              console.error('Error deleting removed sections:', deleteError);
              // Don't throw - allow the main operation to succeed
            }
          }
        }
      }
      
      return { gradeId, sectionsCreated: validatedData.class_sections?.length || 0 };
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

          {/* Class Sections */}
          {formType === 'grade' && (
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
}/**
 * File: /src/app/entity-module/configuration/tabs/GradeLevelsTab.tsx
 * 
 * IMPROVED VERSION - Template-Based Bulk Creation System
 * - Template-based grade structure creation
 * - Bulk assignment to multiple schools
 * - Wizard-style workflow
 * - Branch-level support preparation
 * - Efficient data management
 */

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
  Copy,
  Save,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  FileText,
  Settings,
  Layers,
  Target,
  Sparkles,
  Package,
  Edit,
  Eye,
  Download,
  Upload
} from 'lucide-react';
import { z } from 'zod';

// Mock imports (replace with actual imports)
const supabase = {
  from: (table) => ({
    select: () => ({ 
      eq: () => ({ 
        order: () => Promise.resolve({ data: [], error: null }) 
      }),
      in: () => ({ 
        order: () => Promise.resolve({ data: [], error: null }) 
      })
    }),
    insert: () => Promise.resolve({ data: null, error: null }),
    update: () => ({ 
      eq: () => Promise.resolve({ data: null, error: null }) 
    }),
    delete: () => ({ 
      in: () => Promise.resolve({ error: null }) 
    })
  })
};

const useAccessControl = () => ({
  getScopeFilters: () => ({}),
  isEntityAdmin: true,
  isSubEntityAdmin: false
});

const toast = {
  success: (msg) => console.log('Success:', msg),
  error: (msg) => console.error('Error:', msg)
};

// Components (simplified versions)
const Button = ({ children, onClick, leftIcon, variant = 'primary', size = 'md', disabled = false, className = '' }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`
      inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
      ${variant === 'primary' ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
      ${variant === 'secondary' ? 'bg-gray-200 text-gray-900 hover:bg-gray-300' : ''}
      ${variant === 'outline' ? 'border border-gray-300 text-gray-700 hover:bg-gray-50' : ''}
      ${variant === 'danger' ? 'bg-red-600 text-white hover:bg-red-700' : ''}
      ${size === 'sm' ? 'text-sm px-3 py-1' : ''}
      ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      ${className}
    `}
  >
    {leftIcon}
    {children}
  </button>
);

const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
    {children}
  </div>
);

const StatusBadge = ({ status }) => (
  <span className={`
    inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
    ${status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
  `}>
    {status}
  </span>
);

const ToggleSwitch = ({ checked, onChange, label }) => (
  <label className="flex items-center cursor-pointer">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="sr-only"
    />
    <div className={`
      relative w-10 h-6 rounded-full transition-colors
      ${checked ? 'bg-blue-600' : 'bg-gray-300'}
    `}>
      <div className={`
        absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform
        ${checked ? 'transform translate-x-4' : ''}
      `} />
    </div>
    {label && <span className="ml-2 text-sm">{label}</span>}
  </label>
);

// Main Component
export function GradeLevelsTab({ companyId }) {
  const queryClient = useQueryClient();
  const { getScopeFilters, isEntityAdmin, isSubEntityAdmin } = useAccessControl();
  
  // State Management
  const [activeView, setActiveView] = useState('templates'); // 'templates' | 'assignments' | 'hierarchy'
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedSchools, setSelectedSchools] = useState([]);
  const [showWizard, setShowWizard] = useState(false);
  
  // Template State
  const [gradeTemplate, setGradeTemplate] = useState({
    name: '',
    description: '',
    grades: []
  });
  
  // Pre-defined Templates
  const preDefinedTemplates = [
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
    },
    {
      id: 'k12',
      name: 'Complete K-12',
      description: 'Full K-12 education structure',
      grades: [] // Combination of all above
    }
  ];
  
  // Fetch schools
  const { data: schools = [] } = useQuery(
    ['schools', companyId],
    async () => {
      const { data, error } = await supabase
        .from('schools')
        .select('id, name, code, status')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
    { enabled: !!companyId }
  );
  
  // Wizard Component
  const GradeTemplateWizard = () => {
    const steps = [
      { id: 1, name: 'Choose Template', icon: <FileText className="w-5 h-5" /> },
      { id: 2, name: 'Customize Structure', icon: <Settings className="w-5 h-5" /> },
      { id: 3, name: 'Select Schools', icon: <School className="w-5 h-5" /> },
      { id: 4, name: 'Review & Apply', icon: <Check className="w-5 h-5" /> }
    ];
    
    const handleTemplateSelect = (template) => {
      setGradeTemplate({
        name: template.name,
        description: template.description,
        grades: [...template.grades]
      });
      setSelectedTemplate(template.id);
      setWizardStep(2);
    };
    
    const addGradeToTemplate = () => {
      const newGrade = {
        name: '',
        code: '',
        order: gradeTemplate.grades.length + 1,
        education_level: 'primary',
        sections: ['A']
      };
      setGradeTemplate({
        ...gradeTemplate,
        grades: [...gradeTemplate.grades, newGrade]
      });
    };
    
    const updateGradeInTemplate = (index, field, value) => {
      const updatedGrades = [...gradeTemplate.grades];
      updatedGrades[index] = { ...updatedGrades[index], [field]: value };
      setGradeTemplate({ ...gradeTemplate, grades: updatedGrades });
    };
    
    const removeGradeFromTemplate = (index) => {
      const updatedGrades = gradeTemplate.grades.filter((_, i) => i !== index);
      setGradeTemplate({ ...gradeTemplate, grades: updatedGrades });
    };
    
    const addSectionToGrade = (gradeIndex, sectionName) => {
      const updatedGrades = [...gradeTemplate.grades];
      updatedGrades[gradeIndex].sections.push(sectionName);
      setGradeTemplate({ ...gradeTemplate, grades: updatedGrades });
    };
    
    const removeSectionFromGrade = (gradeIndex, sectionIndex) => {
      const updatedGrades = [...gradeTemplate.grades];
      updatedGrades[gradeIndex].sections = updatedGrades[gradeIndex].sections.filter((_, i) => i !== sectionIndex);
      setGradeTemplate({ ...gradeTemplate, grades: updatedGrades });
    };
    
    const applyTemplateToSchools = async () => {
      try {
        // Show loading state
        toast.success('Applying template to selected schools...');
        
        for (const schoolId of selectedSchools) {
          for (const grade of gradeTemplate.grades) {
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
        
        queryClient.invalidateQueries(['grade-hierarchy']);
        toast.success(`Template applied to ${selectedSchools.length} school(s) successfully!`);
        setShowWizard(false);
        resetWizard();
      } catch (error) {
        console.error('Error applying template:', error);
        toast.error('Failed to apply template. Please try again.');
      }
    };
    
    const resetWizard = () => {
      setWizardStep(1);
      setSelectedTemplate(null);
      setSelectedSchools([]);
      setGradeTemplate({ name: '', description: '', grades: [] });
    };
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Grade Structure Setup Wizard</h2>
                <p className="text-blue-100 mt-1">Create and apply grade structures to multiple schools at once</p>
              </div>
              <button
                onClick={() => setShowWizard(false)}
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
                  <h3 className="text-lg font-semibold mb-4">Choose a Template</h3>
                  <p className="text-gray-600 mb-6">
                    Select a pre-defined template or start from scratch to create your grade structure.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Custom Template Option */}
                  <div
                    onClick={() => {
                      setGradeTemplate({ name: 'Custom Structure', description: '', grades: [] });
                      setWizardStep(2);
                    }}
                    className="p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Plus className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Create Custom</h4>
                        <p className="text-sm text-gray-600">Build your own grade structure from scratch</p>
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
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
                        }
                      `}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
                          <GraduationCap className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{template.name}</h4>
                          <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                          {template.grades.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1">
                              {template.grades.slice(0, 3).map((grade, i) => (
                                <span key={i} className="px-2 py-1 bg-gray-100 text-xs rounded">
                                  {grade.name}
                                </span>
                              ))}
                              {template.grades.length > 3 && (
                                <span className="px-2 py-1 bg-gray-100 text-xs rounded">
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
                    <h3 className="text-lg font-semibold">Customize Grade Structure</h3>
                    <p className="text-gray-600 mt-1">
                      Add, remove, or modify grades and their sections
                    </p>
                  </div>
                  <Button
                    onClick={addGradeToTemplate}
                    leftIcon={<Plus className="w-4 h-4" />}
                    variant="outline"
                  >
                    Add Grade Level
                  </Button>
                </div>
                
                {gradeTemplate.grades.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <GraduationCap className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No grades added yet</p>
                    <p className="text-sm text-gray-500 mt-1">Click "Add Grade Level" to start building your structure</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {gradeTemplate.grades.map((grade, gradeIndex) => (
                      <div key={gradeIndex} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start gap-4">
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Grade Name
                              </label>
                              <input
                                type="text"
                                value={grade.name}
                                onChange={(e) => updateGradeInTemplate(gradeIndex, 'name', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="e.g., Grade 1"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Code
                              </label>
                              <input
                                type="text"
                                value={grade.code}
                                onChange={(e) => updateGradeInTemplate(gradeIndex, 'code', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="e.g., G1"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Order
                              </label>
                              <input
                                type="number"
                                value={grade.order}
                                onChange={(e) => updateGradeInTemplate(gradeIndex, 'order', parseInt(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                min="1"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Education Level
                              </label>
                              <select
                                value={grade.education_level}
                                onChange={(e) => updateGradeInTemplate(gradeIndex, 'education_level', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              >
                                <option value="kindergarten">Kindergarten</option>
                                <option value="primary">Primary</option>
                                <option value="middle">Middle</option>
                                <option value="secondary">Secondary</option>
                                <option value="senior">Senior</option>
                              </select>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => removeGradeFromTemplate(gradeIndex)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        
                        {/* Sections */}
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-gray-700">
                              Class Sections ({grade.sections.length})
                            </label>
                            <button
                              onClick={() => {
                                const nextLetter = String.fromCharCode(65 + grade.sections.length);
                                addSectionToGrade(gradeIndex, nextLetter);
                              }}
                              className="text-sm text-blue-600 hover:text-blue-700"
                            >
                              + Add Section
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {grade.sections.map((section, sectionIndex) => (
                              <div
                                key={sectionIndex}
                                className="flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-lg"
                              >
                                <span className="text-sm">Section {section}</span>
                                <button
                                  onClick={() => removeSectionFromGrade(gradeIndex, sectionIndex)}
                                  className="ml-1 text-gray-500 hover:text-red-600"
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
                  <h3 className="text-lg font-semibold mb-2">Select Schools</h3>
                  <p className="text-gray-600">
                    Choose which schools should receive this grade structure
                  </p>
                </div>
                
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setSelectedSchools(schools.map(s => s.id))}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => setSelectedSchools([])}
                      className="text-sm text-gray-600 hover:text-gray-700"
                    >
                      Clear Selection
                    </button>
                  </div>
                  <span className="text-sm text-gray-600">
                    {selectedSchools.length} of {schools.length} selected
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {schools.map((school) => (
                    <div
                      key={school.id}
                      onClick={() => {
                        if (selectedSchools.includes(school.id)) {
                          setSelectedSchools(selectedSchools.filter(id => id !== school.id));
                        } else {
                          setSelectedSchools([...selectedSchools, school.id]);
                        }
                      }}
                      className={`
                        p-4 border-2 rounded-lg cursor-pointer transition-all
                        ${selectedSchools.includes(school.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`
                          w-5 h-5 rounded border-2 flex items-center justify-center
                          ${selectedSchools.includes(school.id)
                            ? 'bg-blue-600 border-blue-600'
                            : 'border-gray-300'
                          }
                        `}>
                          {selectedSchools.includes(school.id) && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{school.name}</h4>
                          {school.code && (
                            <p className="text-sm text-gray-500">{school.code}</p>
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
                  <h3 className="text-lg font-semibold mb-2">Review & Apply</h3>
                  <p className="text-gray-600">
                    Review your configuration before applying it to the selected schools
                  </p>
                </div>
                
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <GraduationCap className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-blue-600">Grade Levels</p>
                        <p className="text-2xl font-semibold text-blue-900">
                          {gradeTemplate.grades.length}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <Users className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-green-600">Total Sections</p>
                        <p className="text-2xl font-semibold text-green-900">
                          {gradeTemplate.grades.reduce((sum, g) => sum + g.sections.length, 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <School className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-purple-600">Schools</p>
                        <p className="text-2xl font-semibold text-purple-900">
                          {selectedSchools.length}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Structure Preview */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Grade Structure Preview</h4>
                  <div className="space-y-2">
                    {gradeTemplate.grades.map((grade, index) => (
                      <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-gray-700">
                            {grade.name} ({grade.code})
                          </span>
                          <span className="px-2 py-1 bg-gray-100 text-xs rounded">
                            {grade.education_level}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {grade.sections.map((section, i) => (
                            <span key={i} className="px-2 py-1 bg-blue-100 text-xs text-blue-700 rounded">
                              Section {section}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Selected Schools */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Selected Schools</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedSchools.map(schoolId => {
                      const school = schools.find(s => s.id === schoolId);
                      return school ? (
                        <span key={schoolId} className="px-3 py-1 bg-gray-100 text-sm rounded-lg">
                          {school.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
                
                {/* Action Summary */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-amber-900">This action will create:</h4>
                      <ul className="mt-2 space-y-1 text-sm text-amber-800">
                        <li>• {gradeTemplate.grades.length * selectedSchools.length} grade levels</li>
                        <li>• {gradeTemplate.grades.reduce((sum, g) => sum + g.sections.length, 0) * selectedSchools.length} class sections</li>
                        <li>• All items will be created with "Active" status</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-between">
            <Button
              onClick={() => {
                if (wizardStep > 1) {
                  setWizardStep(wizardStep - 1);
                } else {
                  setShowWizard(false);
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
                  onClick={applyTemplateToSchools}
                  leftIcon={<Check className="w-4 h-4" />}
                  disabled={selectedSchools.length === 0 || gradeTemplate.grades.length === 0}
                >
                  Apply to {selectedSchools.length} School{selectedSchools.length !== 1 ? 's' : ''}
                </Button>
              ) : (
                <Button
                  onClick={() => setWizardStep(wizardStep + 1)}
                  disabled={
                    (wizardStep === 2 && gradeTemplate.grades.length === 0) ||
                    (wizardStep === 3 && selectedSchools.length === 0)
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
  
  // Main Render
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Grade Levels Management</h2>
          <p className="text-gray-600 mt-1">
            Create and manage grade structures across your schools efficiently
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setShowWizard(true)}
            leftIcon={<Sparkles className="w-4 h-4" />}
            variant="primary"
          >
            Setup Wizard
          </Button>
        </div>
      </div>
      
      {/* View Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex items-center gap-1 p-1">
            <button
              onClick={() => setActiveView('templates')}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
                ${activeView === 'templates' 
                  ? 'bg-blue-50 text-blue-600' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
              `}
            >
              <Package className="w-4 h-4" />
              Templates
            </button>
            <button
              onClick={() => setActiveView('assignments')}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
                ${activeView === 'assignments' 
                  ? 'bg-blue-50 text-blue-600' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
              `}
            >
              <Target className="w-4 h-4" />
              Assignments
            </button>
            <button
              onClick={() => setActiveView('hierarchy')}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
                ${activeView === 'hierarchy' 
                  ? 'bg-blue-50 text-blue-600' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
              `}
            >
              <Layers className="w-4 h-4" />
              Hierarchy View
            </button>
          </div>
        </div>
        
        <div className="p-6">
          {/* Templates View */}
          {activeView === 'templates' && (
            <div className="space-y-6">
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Grade Structure Templates
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Create reusable grade structures that can be applied to multiple schools at once
                </p>
                <Button
                  onClick={() => setShowWizard(true)}
                  leftIcon={<Plus className="w-4 h-4" />}
                  size="lg"
                >
                  Create New Template
                </Button>
              </div>
            </div>
          )}
          
          {/* Assignments View */}
          {activeView === 'assignments' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">School Grade Assignments</h3>
                <Button
                  onClick={() => setShowWizard(true)}
                  leftIcon={<Plus className="w-4 h-4" />}
                  variant="outline"
                >
                  Bulk Assign
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {schools.map((school) => (
                  <Card key={school.id} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-gray-900">{school.name}</h4>
                        <p className="text-sm text-gray-500">{school.code}</p>
                      </div>
                      <StatusBadge status={school.status} />
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                      <span className="text-sm text-gray-600">No grades assigned</span>
                      <Button
                        onClick={() => {
                          setSelectedSchools([school.id]);
                          setShowWizard(true);
                        }}
                        size="sm"
                        variant="outline"
                      >
                        Assign
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
          
          {/* Hierarchy View */}
          {activeView === 'hierarchy' && (
            <div className="space-y-6">
              <div className="text-center py-12">
                <Layers className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Academic Hierarchy
                </h3>
                <p className="text-gray-600 mb-6">
                  View and manage the complete academic structure
                </p>
                <Button
                  onClick={() => setShowWizard(true)}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Setup Grade Structure
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Wizard Modal */}
      {showWizard && <GradeTemplateWizard />}
    </div>
  );
}