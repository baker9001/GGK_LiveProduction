import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import { Plus, Upload, Download, Eye, Trash2, CreditCard as Edit2, FileText } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../../lib/supabase';
import { useUser } from '../../../../contexts/UserContext';
import {
  getMaterialsForTeacher,
  uploadTeacherMaterialFile,
  createTeacherMaterial,
  updateTeacherMaterial,
  deleteTeacherMaterial,
  Material
} from '../../../../services/materialsService';
import { DataTable } from '../../../../components/shared/DataTable';
import { FilterCard } from '../../../../components/shared/FilterCard';
import { SlideInForm } from '../../../../components/shared/SlideInForm';
import { FormField, Input, Select, Textarea } from '../../../../components/shared/FormField';
import { StatusBadge } from '../../../../components/shared/StatusBadge';
import { Button } from '../../../../components/shared/Button';
import { SearchableMultiSelect } from '../../../../components/shared/SearchableMultiSelect';
import { MaterialPreview } from '../../../../components/shared/MaterialPreview';
import { ConfirmationDialog } from '../../../../components/shared/ConfirmationDialog';
import { toast } from '../../../../components/shared/Toast';

const materialSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  description: z.string().optional(),
  data_structure_id: z.string().uuid('Please select a subject'),
  unit_id: z.union([z.string().uuid(), z.literal('')]).nullable().optional(),
  topic_id: z.union([z.string().uuid(), z.literal('')]).nullable().optional(),
  subtopic_id: z.union([z.string().uuid(), z.literal('')]).nullable().optional(),
  grade_id: z.union([z.string().uuid(), z.literal('')]).nullable().optional(),
  type: z.enum(['video', 'ebook', 'audio', 'assignment']),
  status: z.enum(['active', 'inactive'])
});

interface FormState {
  title: string;
  description: string;
  data_structure_id: string;
  unit_id: string;
  topic_id: string;
  subtopic_id: string;
  grade_id: string;
  type: 'video' | 'ebook' | 'audio' | 'assignment';
  status: 'active' | 'inactive';
}

const ACCEPTED_FILE_TYPES = {
  video: ['.mp4', '.webm', '.ogg', '.mov', '.avi'],
  audio: ['.mp3', '.wav', '.ogg', '.m4a', '.aac'],
  ebook: ['.pdf', '.epub', '.doc', '.docx'],
  assignment: ['.pdf', '.doc', '.docx', '.txt']
};

export default function TeacherMaterialsPage() {
  const { user } = useUser();
  const queryClient = useQueryClient();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [materialsToDelete, setMaterialsToDelete] = useState<Material[]>([]);
  const [previewMaterial, setPreviewMaterial] = useState<Material | null>(null);

  const [formState, setFormState] = useState<FormState>({
    title: '',
    description: '',
    data_structure_id: '',
    unit_id: '',
    topic_id: '',
    subtopic_id: '',
    grade_id: '',
    type: 'video',
    status: 'active'
  });

  const [filters, setFilters] = useState({
    search: '',
    data_structure_ids: [] as string[],
    types: [] as string[],
    status: [] as string[],
    grade_ids: [] as string[]
  });

  // Get teacher entity user ID and school
  const { data: teacherInfo } = useQuery(
    ['teacher-info', user?.id],
    async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('entity_users')
        .select(`
          id,
          entity_user_schools!inner (
            school_id,
            schools (id, name)
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (error) throw error;

      return {
        teacherId: data.id,
        schoolId: data.entity_user_schools[0]?.school_id,
        schoolName: data.entity_user_schools[0]?.schools?.name
      };
    },
    { enabled: !!user?.id }
  );

  // Fetch teacher's materials
  const { data: materials = [], isLoading } = useQuery(
    ['teacher-materials', teacherInfo?.teacherId, teacherInfo?.schoolId, filters],
    async () => {
      if (!teacherInfo?.teacherId || !teacherInfo?.schoolId) return [];
      return getMaterialsForTeacher(
        teacherInfo.teacherId,
        teacherInfo.schoolId,
        filters
      );
    },
    {
      enabled: !!teacherInfo?.teacherId && !!teacherInfo?.schoolId,
      staleTime: 2 * 60 * 1000
    }
  );

  // Fetch data structure options (subjects) for teacher's school
  const { data: dataStructureOptions = [] } = useQuery(
    ['data-structures'],
    async () => {
      const { data, error } = await supabase
        .from('data_structures')
        .select(`
          id,
          regions (name),
          programs (name),
          providers (name),
          edu_subjects (id, name)
        `)
        .eq('status', 'active')
        .order('id');

      if (error) throw error;

      return data.map(ds => ({
        id: ds.id,
        name: `${ds.edu_subjects?.name} - ${ds.programs?.name} - ${ds.providers?.name}`,
        subject_id: ds.edu_subjects?.id,
        subject_name: ds.edu_subjects?.name
      }));
    }
  );

  // Fetch grade levels
  const { data: gradeLevels = [] } = useQuery(
    ['grade-levels'],
    async () => {
      const { data, error } = await supabase
        .from('grade_levels')
        .select('id, name')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      return data;
    }
  );

  // Create material mutation
  const createMutation = useMutation(
    async (materialData: any) => {
      if (!teacherInfo) throw new Error('Teacher info not available');
      if (!uploadedFile) throw new Error('File is required');

      // Upload file
      const filePath = await uploadTeacherMaterialFile(uploadedFile, teacherInfo.schoolId);

      // Create material record
      return createTeacherMaterial({
        ...materialData,
        file_path: filePath,
        mime_type: uploadedFile.type || 'application/octet-stream',
        size: uploadedFile.size,
        school_id: teacherInfo.schoolId,
        teacher_id: teacherInfo.teacherId
      });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['teacher-materials']);
        toast.success('Material uploaded successfully');
        setIsFormOpen(false);
        setUploadedFile(null);
        setFormErrors({});
      },
      onError: (error: any) => {
        console.error('Error creating material:', error);
        toast.error('Failed to upload material');
      }
    }
  );

  // Update material mutation
  const updateMutation = useMutation(
    async ({ id, updates }: { id: string; updates: any }) => {
      await updateTeacherMaterial(id, updates);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['teacher-materials']);
        toast.success('Material updated successfully');
        setIsFormOpen(false);
        setEditingMaterial(null);
      },
      onError: (error: any) => {
        console.error('Error updating material:', error);
        toast.error('Failed to update material');
      }
    }
  );

  // Delete material mutation
  const deleteMutation = useMutation(
    async (materials: Material[]) => {
      await Promise.all(
        materials.map(m => deleteTeacherMaterial(m.id, m.file_path))
      );
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['teacher-materials']);
        toast.success(`Material(s) deleted successfully`);
        setIsConfirmDialogOpen(false);
        setMaterialsToDelete([]);
      },
      onError: (error: any) => {
        console.error('Error deleting materials:', error);
        toast.error('Failed to delete material(s)');
      }
    }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    try {
      const validatedData = materialSchema.parse(formState);

      if (editingMaterial) {
        // Update existing material
        await updateMutation.mutateAsync({
          id: editingMaterial.id,
          updates: {
            title: validatedData.title,
            description: validatedData.description,
            unit_id: validatedData.unit_id || null,
            topic_id: validatedData.topic_id || null,
            subtopic_id: validatedData.subtopic_id || null,
            grade_id: validatedData.grade_id || null,
            status: validatedData.status
          }
        });
      } else {
        // Create new material
        await createMutation.mutateAsync(validatedData);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path.length > 0) {
            errors[err.path[0].toString()] = err.message;
          }
        });
        setFormErrors(errors);
      } else {
        console.error('Error submitting form:', error);
        toast.error('Failed to save material');
      }
    }
  };

  const handleDelete = (materials: Material[]) => {
    setMaterialsToDelete(materials);
    setIsConfirmDialogOpen(true);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      video: '🎥',
      ebook: '📚',
      audio: '🎵',
      assignment: '📝'
    };
    return icons[type as keyof typeof icons] || '📄';
  };

  const columns = [
    {
      id: 'title',
      header: 'Title',
      accessorKey: 'title',
      enableSorting: true,
      cell: (row: Material) => (
        <div className="flex items-center gap-2">
          <span className="text-lg">{getTypeIcon(row.type)}</span>
          <div>
            <div className="font-medium text-gray-900 dark:text-white">{row.title}</div>
            {row.description && (
              <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                {row.description}
              </div>
            )}
          </div>
        </div>
      )
    },
    {
      id: 'subject',
      header: 'Subject',
      cell: (row: Material) => (
        <span className="text-sm text-gray-900 dark:text-white">
          {row.data_structure?.edu_subjects?.name || 'N/A'}
        </span>
      )
    },
    {
      id: 'grade',
      header: 'Grade',
      cell: (row: Material) => (
        <span className="text-sm text-gray-900 dark:text-white">
          {row.grade_levels?.name || '-'}
        </span>
      )
    },
    {
      id: 'type',
      header: 'Type',
      accessorKey: 'type',
      enableSorting: true,
      cell: (row: Material) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 capitalize">
          {row.type}
        </span>
      )
    },
    {
      id: 'size',
      header: 'Size',
      cell: (row: Material) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {formatFileSize(row.size)}
        </span>
      )
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row: Material) => <StatusBadge status={row.status} />
    },
    {
      id: 'created_at',
      header: 'Uploaded',
      accessorKey: 'created_at',
      enableSorting: true,
      cell: (row: Material) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      )
    }
  ];

  const renderActions = (row: Material) => (
    <div className="flex items-center justify-end gap-2">
      <button
        onClick={() => setPreviewMaterial(row)}
        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 p-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
        title="Preview"
      >
        <Eye className="h-4 w-4" />
      </button>
      <a
        href={row.file_url}
        download
        className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 p-1 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
        title="Download"
      >
        <Download className="h-4 w-4" />
      </a>
      <button
        onClick={() => {
          setEditingMaterial(row);
          setFormState({
            title: row.title,
            description: row.description || '',
            data_structure_id: row.data_structure_id,
            unit_id: row.unit_id || '',
            topic_id: row.topic_id || '',
            subtopic_id: row.subtopic_id || '',
            grade_id: row.grade_id || '',
            type: row.type,
            status: row.status
          });
          setIsFormOpen(true);
        }}
        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 p-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
        title="Edit"
      >
        <Edit2 className="h-4 w-4" />
      </button>
      <button
        onClick={() => handleDelete([row])}
        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
        title="Delete"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Learning Materials</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          Upload and manage learning materials for your students
          {teacherInfo?.schoolName && ` at ${teacherInfo.schoolName}`}
        </p>
      </div>

      <div className="flex justify-between items-center">
        <div />
        <Button
          onClick={() => {
            setEditingMaterial(null);
            setFormState({
              title: '',
              description: '',
              data_structure_id: '',
              unit_id: '',
              topic_id: '',
              subtopic_id: '',
              grade_id: '',
              type: 'video',
              status: 'active'
            });
            setIsFormOpen(true);
          }}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Upload Material
        </Button>
      </div>

      <FilterCard
        title="Filters"
        onApply={() => {}}
        onClear={() => {
          setFilters({
            search: '',
            data_structure_ids: [],
            types: [],
            status: [],
            grade_ids: []
          });
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <FormField id="search" label="Search">
            <Input
              id="search"
              placeholder="Search by title..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </FormField>

          <SearchableMultiSelect
            label="Subject"
            options={dataStructureOptions.map(ds => ({
              value: ds.id,
              label: ds.subject_name || ds.name
            }))}
            selectedValues={filters.data_structure_ids}
            onChange={(values) => setFilters({ ...filters, data_structure_ids: values })}
            placeholder="Select subjects..."
          />

          <SearchableMultiSelect
            label="Grade"
            options={gradeLevels.map(g => ({
              value: g.id,
              label: g.name
            }))}
            selectedValues={filters.grade_ids}
            onChange={(values) => setFilters({ ...filters, grade_ids: values })}
            placeholder="Select grades..."
          />

          <SearchableMultiSelect
            label="Type"
            options={[
              { value: 'video', label: 'Video' },
              { value: 'ebook', label: 'E-book' },
              { value: 'audio', label: 'Audio' },
              { value: 'assignment', label: 'Assignment' }
            ]}
            selectedValues={filters.types}
            onChange={(values) => setFilters({ ...filters, types: values })}
            placeholder="Select types..."
          />
        </div>
      </FilterCard>

      <DataTable
        data={materials}
        columns={columns}
        keyField="id"
        caption="List of your uploaded learning materials"
        ariaLabel="Teacher materials table"
        loading={isLoading}
        renderActions={renderActions}
        onDelete={handleDelete}
        emptyMessage="No materials uploaded yet. Click 'Upload Material' to get started."
      />

      {/* Upload/Edit Form */}
      <SlideInForm
        title={editingMaterial ? 'Edit Material' : 'Upload Material'}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingMaterial(null);
          setUploadedFile(null);
          setFormErrors({});
        }}
        onSave={() => {
          const form = document.querySelector('form');
          if (form) form.requestSubmit();
        }}
        loading={createMutation.isLoading || updateMutation.isLoading}
        width="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField id="title" label="Title" required error={formErrors.title}>
            <Input
              id="title"
              placeholder="Enter material title"
              value={formState.title}
              onChange={(e) => setFormState(prev => ({ ...prev, title: e.target.value }))}
            />
          </FormField>

          <FormField id="description" label="Description" error={formErrors.description}>
            <Textarea
              id="description"
              placeholder="Enter material description"
              value={formState.description}
              onChange={(e) => setFormState(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </FormField>

          <FormField id="data_structure_id" label="Subject" required error={formErrors.data_structure_id}>
            <Select
              id="data_structure_id"
              options={dataStructureOptions.map(ds => ({
                value: ds.id,
                label: ds.name
              }))}
              value={formState.data_structure_id}
              onChange={(value) => setFormState(prev => ({ ...prev, data_structure_id: value }))}
            />
          </FormField>

          <FormField id="grade_id" label="Grade (Optional)" error={formErrors.grade_id}>
            <Select
              id="grade_id"
              options={gradeLevels.map(g => ({
                value: g.id,
                label: g.name
              }))}
              value={formState.grade_id}
              onChange={(value) => setFormState(prev => ({ ...prev, grade_id: value }))}
            />
          </FormField>

          <FormField id="type" label="Type" required error={formErrors.type}>
            <Select
              id="type"
              options={[
                { value: 'video', label: 'Video' },
                { value: 'ebook', label: 'E-book' },
                { value: 'audio', label: 'Audio' },
                { value: 'assignment', label: 'Assignment' }
              ]}
              value={formState.type}
              onChange={(value) => setFormState(prev => ({ ...prev, type: value as any }))}
            />
          </FormField>

          {!editingMaterial && (
            <FormField id="file" label="File" required error={formErrors.file}>
              <input
                type="file"
                id="file"
                accept={Object.values(ACCEPTED_FILE_TYPES).flat().join(',')}
                onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 dark:file:bg-emerald-900/30 file:text-emerald-700 dark:file:text-emerald-300 hover:file:bg-emerald-100 dark:hover:file:bg-emerald-900/50"
              />
              {uploadedFile && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">
                  Selected: {uploadedFile.name} ({formatFileSize(uploadedFile.size)})
                </p>
              )}
            </FormField>
          )}

          <FormField id="status" label="Status" required error={formErrors.status}>
            <Select
              id="status"
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' }
              ]}
              value={formState.status}
              onChange={(value) => setFormState(prev => ({ ...prev, status: value as any }))}
            />
          </FormField>
        </form>
      </SlideInForm>

      {/* Preview Modal */}
      {previewMaterial && (
        <MaterialPreview
          fileType={previewMaterial.type}
          fileUrl={previewMaterial.file_url}
          mimeType={previewMaterial.mime_type}
          title={previewMaterial.title}
          isOpen={!!previewMaterial}
          onClose={() => setPreviewMaterial(null)}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmationDialog
        isOpen={isConfirmDialogOpen}
        title="Delete Material"
        message={`Are you sure you want to delete ${materialsToDelete.length} material(s)? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={() => deleteMutation.mutate(materialsToDelete)}
        onCancel={() => {
          setIsConfirmDialogOpen(false);
          setMaterialsToDelete([]);
        }}
      />
    </div>
  );
}
