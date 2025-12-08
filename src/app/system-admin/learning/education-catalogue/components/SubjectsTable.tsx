///home/project/src/app/system-admin/learning/education-catalogue/components/SubjectsTable.tsx

import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { Plus, ImageOff } from 'lucide-react';
import { supabase } from '../../../../../lib/supabase';
import { DataTable } from '../../../../../components/shared/DataTable';
import { FilterCard } from '../../../../../components/shared/FilterCard';
import { SlideInForm } from '../../../../../components/shared/SlideInForm';
import { FormField, Input, Select } from '../../../../../components/shared/FormField';
import { StatusBadge } from '../../../../../components/shared/StatusBadge';
import { Button } from '../../../../../components/shared/Button';
import { ImageUpload } from '../../../../../components/shared/ImageUpload';
import { SearchableMultiSelect } from '../../../../../components/shared/SearchableMultiSelect';
import { ConfirmationDialog } from '../../../../../components/shared/ConfirmationDialog';
import { toast } from '../../../../../components/shared/Toast';
import {
  getPublicUrl,
  deleteFileFromStorage,
  deleteFileViaEdgeFunction,
} from '../../../../../lib/storageHelpers';

const subjectSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  code: z.string().min(1, 'Code is required'),
  logo_url: z.union([z.string(), z.null()]).optional(),
  status: z.enum(['active', 'inactive'])
});

type Subject = {
  id: string;
  name: string;
  code?: string | null;
  logo_url?: string | null;
  status: 'active' | 'inactive';
  created_at: string;
};

export default function SubjectsTable() {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [logoPath, setLogoPath] = useState<string | null>(null);
  
  // Confirmation dialog state
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [subjectsToDelete, setSubjectsToDelete] = useState<Subject[]>([]);
  
  const [filters, setFilters] = useState({
    search: '',
    status: [] as string[]
  });

  // Simple direct query to fetch subjects
  const { 
    data: subjects = [], 
    isLoading, 
    isFetching,
    refetch 
  } = useQuery<Subject[]>(
    ['subjects-debug'],
    async () => {
      console.log('Fetching subjects directly...');
      const { data, error } = await supabase
        .from('edu_subjects')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching subjects:', error);
        throw error;
      }
      
      console.log('Subjects data:', data);
      return data || [];
    },
    {
      staleTime: 0, // Don't cache for debugging
    }
  );
  
  // Mutation for creating/updating subjects
  const mutation = useMutation(
    async (formData: FormData) => {
      const data = {
        name: (formData.get('name') as string).trim(),
        code: (formData.get('code') as string).trim(),
        logo_url: logoPath,
        status: (formData.get('status') as 'active' | 'inactive')
      };

      const validatedData = subjectSchema.parse(data);
      
      // Ensure the name doesn't already contain the code format
      let subjectName = validatedData.name;
      if (!subjectName.includes(' - ')) {
        subjectName = validatedData.code ? `${subjectName} - ${validatedData.code}` : subjectName;
      }
      
      if (editingSubject) {
        const { error } = await supabase
          .from('edu_subjects')
          .update({
            ...validatedData,
            name: subjectName,
            logo_url: logoPath,
          })
          .eq('id', editingSubject.id);

        if (error) {
          if (error.code === '23505') {
            throw new Error('This subject already exists');
          }
          throw error;
        }
        return { ...editingSubject, ...validatedData, name: subjectName };
      } else {
        const { data: newSubject, error } = await supabase
          .from('edu_subjects')
          .insert([{
            ...validatedData,
            name: subjectName,
            logo_url: logoPath,
          }])
          .select()
          .single();

        if (error) {
          if (error.code === '23505') {
            throw new Error('This subject already exists');
          }
          throw error;
        }
        return newSubject;
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['subjects']);
        refetch();
        setIsFormOpen(false);
        setEditingSubject(null);
        setFormErrors({});
        setLogoPath(null);
        toast.success(`Subject ${editingSubject ? 'updated' : 'created'} successfully`);
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
          console.error('Error saving subject:', error);
          setFormErrors({ form: 'Failed to save subject. Please try again.' });
          toast.error('Failed to save subject');
        }
      }
    }
  );

  // Delete subject mutation
  const deleteMutation = useMutation(
    async (subjects: Subject[]) => {
      // Delete associated logo files from storage using Edge Function
      for (const subject of subjects) {
        if (subject.logo_url) {
          try {
            // Try Edge Function first for secure deletion
            const result = await deleteFileViaEdgeFunction('subject-logos', subject.logo_url);

            if (!result.success) {
              // Fallback to direct delete if Edge Function fails
              console.warn('Edge Function delete failed, trying direct delete');
              await deleteFileFromStorage('subject-logos', subject.logo_url);
            }
          } catch (error) {
            console.warn('Failed to delete logo file:', error);
          }
        }
      }

      const { error } = await supabase
        .from('edu_subjects')
        .delete()
        .in('id', subjects.map(s => s.id));

      if (error) throw error;
      return subjects;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['subjects']);
        refetch();
        setIsConfirmDialogOpen(false);
        setSubjectsToDelete([]);
        toast.success('Subject(s) deleted successfully');
      },
      onError: (error) => {
        console.error('Error deleting subjects:', error);
        toast.error('Failed to delete subject(s)');
        setIsConfirmDialogOpen(false);
        setSubjectsToDelete([]);
      }
    }
  );

  // Extract subject name without code for display in the form
  const extractSubjectName = (fullName: string): string => {
    if (fullName.includes(' - ')) {
      return fullName.split(' - ')[0];
    }
    return fullName;
  };

  // Extract code from subject name
  const extractSubjectCode = (fullName: string): string => {
    if (fullName.includes(' - ')) {
      return fullName.split(' - ')[1];
    }
    return '';
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    mutation.mutate(new FormData(e.currentTarget));
  };

  const handleDelete = (subjects: Subject[]) => {
    setSubjectsToDelete(subjects);
    setIsConfirmDialogOpen(true);
  };

  const confirmDelete = () => {
    deleteMutation.mutate(subjectsToDelete);
  };

  const cancelDelete = () => {
    setIsConfirmDialogOpen(false);
    setSubjectsToDelete([]);
  };

  // Helper function to get logo public URL
  const getLogoUrl = (path: string | null | undefined) => {
    if (!path) return null;
    return getPublicUrl('subject-logos', path);
  };

  const columns = [
    {
      id: 'logo',
      header: 'Logo',
      cell: (row: Subject) => (
        <div className="w-10 h-10 flex items-center justify-center">
          {row.logo_url ? (
            <img
              src={getLogoUrl(row.logo_url) || ''}
              alt={`${row.name} logo`}
              className="w-10 h-10 object-cover rounded-lg"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                const parent = (e.target as HTMLElement).parentElement;
                if (parent) {
                  const icon = document.createElement('div');
                  icon.className = 'text-gray-400';
                  icon.innerHTML = '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>';
                  parent.appendChild(icon);
                }
              }}
            />
          ) : (
            <ImageOff className="w-6 h-6 text-gray-400" />
          )}
        </div>
      ),
    },
    {
      id: 'name',
      header: 'Name',
      accessorKey: 'name',
      enableSorting: true,
    },
    {
      id: 'code',
      header: 'Code',
      accessorKey: 'code',
      enableSorting: true,
    },
    {
      id: 'status',
      header: 'Status',
      enableSorting: true,
      cell: (row: Subject) => (
        <StatusBadge status={row.status} />
      ),
    },
    {
      id: 'created_at',
      header: 'Created At',
      accessorKey: 'created_at',
      enableSorting: true,
      cell: (row: Subject) => (
        <span className="text-sm text-gray-900 dark:text-gray-100">
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      ),
    },
  ];

  const filteredSubjects = useMemo(() => {
    const searchTerm = filters.search.trim().toLowerCase();

    return subjects.filter(subject => {
      const matchesSearch = searchTerm
        ? ((subject.name || '').toLowerCase().includes(searchTerm) ||
           (subject.code || '').toLowerCase().includes(searchTerm))
        : true;

      const matchesStatus = filters.status.length > 0
        ? filters.status.includes(subject.status)
        : true;

      return matchesSearch && matchesStatus;
    });
  }, [subjects, filters]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Subjects</h2>
        <Button
          onClick={() => {
            setEditingSubject(null);
            setLogoPath(null);
            setIsFormOpen(true);
          }}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Add Subject
        </Button>
      </div>

      <FilterCard
        title="Filters"
        onApply={() => {}}
        onClear={() => {
          setFilters({
            search: '',
            status: []
          });
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            id="search"
            label="Search"
          >
            <Input
              id="search"
              placeholder="Search by name or code..."
              value={filters.search}
              onChange={(e) =>
                setFilters(prev => ({
                  ...prev,
                  search: e.target.value
                }))
              }
            />
          </FormField>

          <SearchableMultiSelect
            label="Status"
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' }
            ]}
            selectedValues={filters.status}
            onChange={(values) =>
              setFilters(prev => ({
                ...prev,
                status: values
              }))
            }
            placeholder="Select status..."
          />
        </div>
      </FilterCard>

      <DataTable
        data={filteredSubjects}
        columns={columns}
        keyField="id"
        caption="List of educational subjects with their codes and status"
        ariaLabel="Educational subjects data table"
        loading={isLoading}
        isFetching={isFetching}
        onEdit={(subject) => {
          setEditingSubject(subject);
          setLogoPath(subject.logo_url || null);
          setIsFormOpen(true);
        }}
        onDelete={handleDelete}
        emptyMessage="No subjects found"
      />

      <SlideInForm
        key={editingSubject?.id || `new-${Date.now()}`}
        title={editingSubject ? 'Edit Subject' : 'Create Subject'}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingSubject(null);
          setFormErrors({});
          setLogoPath(null);
        }}
        onSave={() => {
          const form = document.querySelector('form');
          if (form) form.requestSubmit();
        }}
        loading={mutation.isLoading}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formErrors.form && (
            <div className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200 dark:border-red-800">
              {formErrors.form}
            </div>
          )}

          <FormField
            id="name"
            label="Name"
            required
            error={formErrors.name}
            description="Subject name without code (e.g., Physics)"
          >
            <Input
              id="name"
              name="name"
              placeholder="Enter subject name"
              defaultValue={editingSubject ? extractSubjectName(editingSubject.name) : ''}
              key={editingSubject?.id || `name-${Date.now()}`}
            />
          </FormField>

          <FormField
            id="code"
            label="Code"
            required
            error={formErrors.code}
            description="Subject code (e.g., 0625)"
          >
            <Input
              id="code"
              name="code"
              placeholder="Enter subject code"
              defaultValue={editingSubject ? (editingSubject.code || extractSubjectCode(editingSubject.name)) : ''}
              key={editingSubject?.id || `code-${Date.now()}`}
            />
          </FormField>

          <div className="p-3 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
            <p>The subject will be saved as: <strong>[Name] - [Code]</strong> (e.g., Physics - 0625)</p>
          </div>

          <FormField
            id="logo"
            label="Subject Logo"
            description="Upload a logo image for this subject (PNG, JPG, JPEG or SVG, max 2MB)"
          >
            <ImageUpload
              id="logo"
              bucket="subject-logos"
              value={logoPath}
              publicUrl={logoPath ? getLogoUrl(logoPath) : null}
              onChange={(path) => setLogoPath(path)}
            />
          </FormField>

          <FormField
            id="status"
            label="Status"
            required
            error={formErrors.status}
          >
            <Select
              id="status"
              name="status"
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' }
              ]}
              defaultValue={editingSubject?.status || 'active'}
              key={editingSubject?.id || `status-${Date.now()}`}
            />
          </FormField>
        </form>
      </SlideInForm>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isConfirmDialogOpen}
        title="Delete Subject"
        message={`Are you sure you want to delete ${subjectsToDelete.length} subject(s)? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}