/**
 * File: /src/hooks/useConfigurationMutations.ts
 * 
 * Centralized mutation logic with proper error handling
 * Fixes the multi-school vs single-school inconsistencies
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { toast } from '../components/shared/Toast';
import {
  AcademicYearForm,
  GradeLevelForm,
  DepartmentForm,
  ClassSectionForm,
  validateFormData,
  academicYearFormSchema,
  gradeLevelFormSchema,
  departmentFormSchema,
  classSectionFormSchema
} from '../schemas/configurationSchemas';

export interface MutationOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  successMessage?: string;
  errorMessage?: string;
}

// Academic Year Mutations
export function useAcademicYearMutations(options?: MutationOptions<any>) {
  const queryClient = useQueryClient();

  const createMutation = useMutation(
    async (data: AcademicYearForm) => {
      // Validate data
      const validation = validateFormData(academicYearFormSchema, data);
      if (!validation.success) {
        throw new Error(Object.values(validation.errors)[0]);
      }

      const validatedData = validation.data;

      // Check if setting as current - unset other current years for same school
      if (validatedData.is_current) {
        await supabase
          .from('academic_years')
          .update({ is_current: false })
          .eq('school_id', validatedData.school_id);
      }

      // Create the academic year
      const { data: newYear, error } = await supabase
        .from('academic_years')
        .insert([validatedData])
        .select()
        .single();

      if (error) throw error;
      return newYear;
    },
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries(['configuration-data']);
        queryClient.invalidateQueries(['academic-years']);
        toast.success(options?.successMessage || 'Academic year created successfully');
        options?.onSuccess?.(data);
      },
      onError: (error) => {
        const message = error instanceof Error ? error.message : 'Failed to create academic year';
        toast.error(options?.errorMessage || message);
        options?.onError?.(error instanceof Error ? error : new Error(message));
      }
    }
  );

  const updateMutation = useMutation(
    async ({ id, data }: { id: string; data: Partial<AcademicYearForm> }) => {
      // Validate data
      const validation = validateFormData(academicYearFormSchema.partial(), data);
      if (!validation.success) {
        throw new Error(Object.values(validation.errors)[0]);
      }

      const validatedData = validation.data;

      // Check if setting as current
      if (validatedData.is_current && validatedData.school_id) {
        await supabase
          .from('academic_years')
          .update({ is_current: false })
          .eq('school_id', validatedData.school_id)
          .neq('id', id);
      }

      // Update the academic year
      const { data: updatedYear, error } = await supabase
        .from('academic_years')
        .update(validatedData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updatedYear;
    },
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries(['configuration-data']);
        queryClient.invalidateQueries(['academic-years']);
        toast.success(options?.successMessage || 'Academic year updated successfully');
        options?.onSuccess?.(data);
      },
      onError: (error) => {
        const message = error instanceof Error ? error.message : 'Failed to update academic year';
        toast.error(options?.errorMessage || message);
        options?.onError?.(error instanceof Error ? error : new Error(message));
      }
    }
  );

  const deleteMutation = useMutation(
    async (ids: string[]) => {
      const { error } = await supabase
        .from('academic_years')
        .delete()
        .in('id', ids);

      if (error) throw error;
      return ids;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['configuration-data']);
        queryClient.invalidateQueries(['academic-years']);
        toast.success('Academic year(s) deleted successfully');
        options?.onSuccess?.(undefined);
      },
      onError: (error) => {
        const message = error instanceof Error ? error.message : 'Failed to delete academic year(s)';
        toast.error(message);
        options?.onError?.(error instanceof Error ? error : new Error(message));
      }
    }
  );

  return { createMutation, updateMutation, deleteMutation };
}

// Grade Level Mutations
export function useGradeLevelMutations(options?: MutationOptions<any>) {
  const queryClient = useQueryClient();

  const createMutation = useMutation(
    async (data: GradeLevelForm) => {
      // Validate data
      const validation = validateFormData(gradeLevelFormSchema, data);
      if (!validation.success) {
        throw new Error(Object.values(validation.errors)[0]);
      }

      const validatedData = validation.data;

      // Create the grade level
      const { data: newGradeLevel, error } = await supabase
        .from('grade_levels')
        .insert([validatedData])
        .select()
        .single();

      if (error) throw error;
      return newGradeLevel;
    },
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries(['configuration-data']);
        queryClient.invalidateQueries(['grade-levels']);
        toast.success(options?.successMessage || 'Grade level created successfully');
        options?.onSuccess?.(data);
      },
      onError: (error) => {
        const message = error instanceof Error ? error.message : 'Failed to create grade level';
        toast.error(options?.errorMessage || message);
        options?.onError?.(error instanceof Error ? error : new Error(message));
      }
    }
  );

  const updateMutation = useMutation(
    async ({ id, data }: { id: string; data: Partial<GradeLevelForm> }) => {
      // Validate data
      const validation = validateFormData(gradeLevelFormSchema.partial(), data);
      if (!validation.success) {
        throw new Error(Object.values(validation.errors)[0]);
      }

      const validatedData = validation.data;

      // Update the grade level
      const { data: updatedGradeLevel, error } = await supabase
        .from('grade_levels')
        .update(validatedData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updatedGradeLevel;
    },
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries(['configuration-data']);
        queryClient.invalidateQueries(['grade-levels']);
        toast.success(options?.successMessage || 'Grade level updated successfully');
        options?.onSuccess?.(data);
      },
      onError: (error) => {
        const message = error instanceof Error ? error.message : 'Failed to update grade level';
        toast.error(options?.errorMessage || message);
        options?.onError?.(error instanceof Error ? error : new Error(message));
      }
    }
  );

  const deleteMutation = useMutation(
    async (ids: string[]) => {
      const { error } = await supabase
        .from('grade_levels')
        .delete()
        .in('id', ids);

      if (error) throw error;
      return ids;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['configuration-data']);
        queryClient.invalidateQueries(['grade-levels']);
        toast.success('Grade level(s) deleted successfully');
        options?.onSuccess?.(undefined);
      },
      onError: (error) => {
        const message = error instanceof Error ? error.message : 'Failed to delete grade level(s)';
        toast.error(message);
        options?.onError?.(error instanceof Error ? error : new Error(message));
      }
    }
  );

  return { createMutation, updateMutation, deleteMutation };
}

// Department Mutations
export function useDepartmentMutations(options?: MutationOptions<any>) {
  const queryClient = useQueryClient();

  const createMutation = useMutation(
    async (data: DepartmentForm) => {
      // Validate data
      const validation = validateFormData(departmentFormSchema, data);
      if (!validation.success) {
        throw new Error(Object.values(validation.errors)[0]);
      }

      const validatedData = validation.data;

      // Create the department
      const { data: newDepartment, error } = await supabase
        .from('departments')
        .insert([validatedData])
        .select()
        .single();

      if (error) throw error;
      return newDepartment;
    },
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries(['configuration-data']);
        queryClient.invalidateQueries(['departments']);
        toast.success(options?.successMessage || 'Department created successfully');
        options?.onSuccess?.(data);
      },
      onError: (error) => {
        const message = error instanceof Error ? error.message : 'Failed to create department';
        toast.error(options?.errorMessage || message);
        options?.onError?.(error instanceof Error ? error : new Error(message));
      }
    }
  );

  const updateMutation = useMutation(
    async ({ id, data }: { id: string; data: Partial<DepartmentForm> }) => {
      // Validate data
      const validation = validateFormData(departmentFormSchema.partial(), data);
      if (!validation.success) {
        throw new Error(Object.values(validation.errors)[0]);
      }

      const validatedData = validation.data;

      // Update the department
      const { data: updatedDepartment, error } = await supabase
        .from('departments')
        .update(validatedData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updatedDepartment;
    },
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries(['configuration-data']);
        queryClient.invalidateQueries(['departments']);
        toast.success(options?.successMessage || 'Department updated successfully');
        options?.onSuccess?.(data);
      },
      onError: (error) => {
        const message = error instanceof Error ? error.message : 'Failed to update department';
        toast.error(options?.errorMessage || message);
        options?.onError?.(error instanceof Error ? error : new Error(message));
      }
    }
  );

  const deleteMutation = useMutation(
    async (ids: string[]) => {
      const { error } = await supabase
        .from('departments')
        .delete()
        .in('id', ids);

      if (error) throw error;
      return ids;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['configuration-data']);
        queryClient.invalidateQueries(['departments']);
        toast.success('Department(s) deleted successfully');
        options?.onSuccess?.(undefined);
      },
      onError: (error) => {
        const message = error instanceof Error ? error.message : 'Failed to delete department(s)';
        toast.error(message);
        options?.onError?.(error instanceof Error ? error : new Error(message));
      }
    }
  );

  return { createMutation, updateMutation, deleteMutation };
}

// Class Section Mutations
export function useClassSectionMutations(options?: MutationOptions<any>) {
  const queryClient = useQueryClient();

  const createMutation = useMutation(
    async (data: ClassSectionForm) => {
      // Validate data
      const validation = validateFormData(classSectionFormSchema, data);
      if (!validation.success) {
        throw new Error(Object.values(validation.errors)[0]);
      }

      const validatedData = validation.data;

      // Get the current academic year for the grade level's school
      const { data: gradeLevel } = await supabase
        .from('grade_levels')
        .select('school_id')
        .eq('id', validatedData.grade_level_id)
        .single();

      if (gradeLevel) {
        const { data: currentAcademicYear } = await supabase
          .from('academic_years')
          .select('id')
          .eq('school_id', gradeLevel.school_id)
          .eq('is_current', true)
          .maybeSingle();

        if (currentAcademicYear) {
          validatedData.academic_year_id = currentAcademicYear.id;
        }
      }

      // Create the class section
      const { data: newSection, error } = await supabase
        .from('class_sections')
        .insert([validatedData])
        .select()
        .single();

      if (error) throw error;
      return newSection;
    },
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries(['configuration-data']);
        queryClient.invalidateQueries(['class-sections']);
        toast.success(options?.successMessage || 'Class section created successfully');
        options?.onSuccess?.(data);
      },
      onError: (error) => {
        const message = error instanceof Error ? error.message : 'Failed to create class section';
        toast.error(options?.errorMessage || message);
        options?.onError?.(error instanceof Error ? error : new Error(message));
      }
    }
  );

  const updateMutation = useMutation(
    async ({ id, data }: { id: string; data: Partial<ClassSectionForm> }) => {
      // Validate data
      const validation = validateFormData(classSectionFormSchema.partial(), data);
      if (!validation.success) {
        throw new Error(Object.values(validation.errors)[0]);
      }

      const validatedData = validation.data;

      // Update the class section
      const { data: updatedSection, error } = await supabase
        .from('class_sections')
        .update(validatedData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updatedSection;
    },
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries(['configuration-data']);
        queryClient.invalidateQueries(['class-sections']);
        toast.success(options?.successMessage || 'Class section updated successfully');
        options?.onSuccess?.(data);
      },
      onError: (error) => {
        const message = error instanceof Error ? error.message : 'Failed to update class section';
        toast.error(options?.errorMessage || message);
        options?.onError?.(error instanceof Error ? error : new Error(message));
      }
    }
  );

  const deleteMutation = useMutation(
    async (ids: string[]) => {
      const { error } = await supabase
        .from('class_sections')
        .delete()
        .in('id', ids);

      if (error) throw error;
      return ids;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['configuration-data']);
        queryClient.invalidateQueries(['class-sections']);
        toast.success('Class section(s) deleted successfully');
        options?.onSuccess?.(undefined);
      },
      onError: (error) => {
        const message = error instanceof Error ? error.message : 'Failed to delete class section(s)';
        toast.error(message);
        options?.onError?.(error instanceof Error ? error : new Error(message));
      }
    }
  );

  return { createMutation, updateMutation, deleteMutation };
}