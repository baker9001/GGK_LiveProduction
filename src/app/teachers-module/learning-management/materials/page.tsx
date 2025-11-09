import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import { Plus, Download, Eye, Trash2, CreditCard as Edit2, FileText } from 'lucide-react';
import { iconColors } from '../../../../lib/constants/iconConfig';
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
import { PageHeader } from '../../../../components/shared/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../../components/shared/Card';
import { Badge } from '../../../../components/shared/Badge';
import { FilterPanel } from '../../../../components/shared/FilterPanel';
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

  // Step 1: Get entity_user record for the logged-in teacher
  const { data: entityUser, error: entityUserError, isLoading: isLoadingEntityUser } = useQuery({
    queryKey: ['entity-user', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      console.log('[Materials] Fetching entity user for:', user.id);

      const { data, error } = await supabase
        .from('entity_users')
        .select('id, user_id, is_active, admin_level')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('[Materials] Error fetching entity user:', error);
        throw error;
      }

      if (!data) {
        console.warn('[Materials] No entity user found for user:', user.id);
        return null;
      }

      console.log('[Materials] Entity user found:', data.id);
      return data;
    },
    enabled: !!user?.id,
    retry: 1,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    onError: (error: any) => {
      console.error('[Materials] Entity user query failed:', error);
    }
  });

  // Step 2: Get teacher's assigned school from entity_user_schools junction table
  const { data: teacherInfo, error: teacherInfoError, isLoading: isLoadingTeacherInfo } = useQuery({
    queryKey: ['teacher-schools', entityUser?.id],
    queryFn: async () => {
      if (!entityUser?.id) {
        console.warn('[Materials] No entity user ID available');
        return null;
      }

      console.log('[Materials] Fetching school assignments for entity user:', entityUser.id);

      const { data, error } = await supabase
        .from('entity_user_schools')
        .select(`
          school_id,
          schools!entity_user_schools_school_id_fkey (
            id,
            name,
            status
          )
        `)
        .eq('entity_user_id', entityUser.id);

      if (error) {
        console.error('[Materials] Error fetching school assignments:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.warn('[Materials] No school assignments found for entity user:', entityUser.id);
        return null;
      }

      console.log('[Materials] School assignments found:', data.length);

      // Prefer active schools, but fall back to first school if none are active
      const activeSchool = data.find(s => s.schools?.status === 'active');
      const selectedSchool = activeSchool || data[0];

      if (!selectedSchool?.school_id) {
        console.warn('[Materials] No valid school found in assignments');
        return null;
      }

      const result = {
        teacherId: entityUser.id,
        schoolId: selectedSchool.school_id,
        schoolName: selectedSchool.schools?.name || 'Unknown School'
      };

      console.log('[Materials] Teacher info resolved:', result);
      return result;
    },
    enabled: !!entityUser?.id,
    retry: 1,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    onError: (error: any) => {
      console.error('[Materials] Teacher info query failed:', error);
    }
  });

  // Fetch teacher's materials
  const { data: materials = [], isLoading: isLoadingMaterials, error: materialsError } = useQuery({
    queryKey: ['teacher-materials', teacherInfo?.teacherId, teacherInfo?.schoolId, filters],
    queryFn: async () => {
      if (!teacherInfo?.teacherId || !teacherInfo?.schoolId) {
        console.warn('[Materials] Cannot fetch materials - missing teacher info');
        return [];
      }

      console.log('[Materials] Fetching materials for teacher:', teacherInfo.teacherId, 'school:', teacherInfo.schoolId);

      return getMaterialsForTeacher(
        teacherInfo.teacherId,
        teacherInfo.schoolId,
        filters
      );
    },
    enabled: !!teacherInfo?.teacherId && !!teacherInfo?.schoolId,
    retry: 1,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    onSuccess: (data) => {
      console.log('[Materials] Materials fetched successfully:', data.length, 'items');
    },
    onError: (error: any) => {
      console.error('[Materials] Failed to fetch materials:', error);
    }
  });

  // Compute overall loading state
  const isLoading = isLoadingEntityUser || isLoadingTeacherInfo || isLoadingMaterials;

  // Compute error state
  const hasError = entityUserError || teacherInfoError || materialsError;
  const errorMessage = entityUserError
    ? 'Failed to load your teacher profile. Please try refreshing the page.'
    : teacherInfoError
    ? 'Failed to load your school assignment. Please contact your administrator.'
    : materialsError
    ? 'Failed to load materials. Please try again.'
    : null;

  // Fetch data structure options (subjects) for teacher's school
  const { data: dataStructureOptions = [] } = useQuery({
    queryKey: ['data-structures'],
    queryFn: async () => {
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
  });

  // Fetch grade levels
  const { data: gradeLevels = [] } = useQuery({
    queryKey: ['grade-levels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('grade_levels')
        .select('id, grade_name')
        .eq('status', 'active')
        .order('grade_name');

      if (error) {
        console.error('[Materials] Error fetching grade levels:', error);
        throw error;
      }
      return data.map(g => ({ id: g.id, name: g.grade_name }));
    },
    retry: 1,
    staleTime: 5 * 60 * 1000
  });

  // Create material mutation
  const createMutation = useMutation({
    mutationFn: async (materialData: any) => {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-materials'] });
      toast.success('Material uploaded successfully');
      setIsFormOpen(false);
      setUploadedFile(null);
      setFormErrors({});
    },
    onError: (error: any) => {
      console.error('Error creating material:', error);
      toast.error('Failed to upload material');
    }
  });

  // Update material mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      await updateTeacherMaterial(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-materials'] });
      toast.success('Material updated successfully');
      setIsFormOpen(false);
      setEditingMaterial(null);
    },
    onError: (error: any) => {
      console.error('Error updating material:', error);
      toast.error('Failed to update material');
    }
  });

  // Delete material mutation
  const deleteMutation = useMutation({
    mutationFn: async (materials: Material[]) => {
      await Promise.all(
        materials.map(m => deleteTeacherMaterial(m.id, m.file_path))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-materials'] });
      toast.success(`Material(s) deleted successfully`);
      setIsConfirmDialogOpen(false);
      setMaterialsToDelete([]);
    },
    onError: (error: any) => {
      console.error('Error deleting materials:', error);
      toast.error('Failed to delete material(s)');
    }
  });

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
            <div className="font-medium text-ggk-neutral-900 dark:text-ggk-neutral-50">{row.title}</div>
            {row.description && (
              <div className="text-sm text-ggk-neutral-500 dark:text-ggk-neutral-400 truncate max-w-xs">
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
        <span className="text-sm text-ggk-neutral-900 dark:text-ggk-neutral-50">
          {row.data_structure?.edu_subjects?.name || 'N/A'}
        </span>
      )
    },
    {
      id: 'grade',
      header: 'Grade',
      cell: (row: Material) => (
        <span className="text-sm text-ggk-neutral-900 dark:text-ggk-neutral-50">
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
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-ggk-primary-100 text-ggk-primary-700 dark:bg-ggk-primary-900/40 dark:text-ggk-primary-200 capitalize">
          {row.type}
        </span>
      )
    },
    {
      id: 'size',
      header: 'Size',
      cell: (row: Material) => (
        <span className="text-sm text-ggk-neutral-600 dark:text-ggk-neutral-400">
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
        <span className="text-sm text-ggk-neutral-600 dark:text-ggk-neutral-400">
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      )
    }
  ];

  const renderActions = (row: Material) => (
    <div className="flex items-center justify-end gap-2">
      <button
        onClick={() => setPreviewMaterial(row)}
        className={`${iconColors.view.full} ${iconColors.view.bg} p-1 rounded transition-colors`}
        title={row.type === 'video' ? 'Stream Video' : 'Preview'}
      >
        <Eye className="h-4 w-4" />
      </button>
      {/* Hide download button for videos - security requirement */}
      {row.type !== 'video' && row.file_url && (
        <a
          href={row.file_url}
          download
          className={`${iconColors.create.full} ${iconColors.create.bg} p-1 rounded transition-colors`}
          title="Download"
        >
          <Download className="h-4 w-4" />
        </a>
      )}
      {row.type === 'video' && (
        <span className="text-xs text-ggk-neutral-500 dark:text-ggk-neutral-400 italic px-2">
          Stream only
        </span>
      )}
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
        className={`${iconColors.edit.full} ${iconColors.edit.bg} p-1 rounded transition-colors`}
        title="Edit"
      >
        <Edit2 className="h-4 w-4" />
      </button>
      <button
        onClick={() => handleDelete([row])}
        className={`${iconColors.delete.full} ${iconColors.delete.bg} p-1 rounded transition-colors`}
        title="Delete"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );

  const totalMaterials = materials.length;
  const activeMaterialCount = materials.filter(material => material.status === 'active').length;
  const inactiveMaterialCount = materials.filter(material => material.status === 'inactive').length;
  const activeFilterCount = (filters.search ? 1 : 0)
    + (filters.data_structure_ids.length ? 1 : 0)
    + (filters.types.length ? 1 : 0)
    + (filters.grade_ids.length ? 1 : 0);
  const canManageMaterials = !!teacherInfo?.schoolId && !hasError;
  const subtitle = `Upload and manage learning materials${teacherInfo?.schoolName ? ` for ${teacherInfo.schoolName}` : ''}`;

  const handleOpenForm = () => {
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
    setUploadedFile(null);
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      data_structure_ids: [],
      types: [],
      status: [],
      grade_ids: []
    });
  };

  return (
    <div className="mx-auto max-w-7xl px-20 py-20 space-y-24">
      <PageHeader
        title="Learning Materials"
        subtitle={subtitle}
        actions={(
          <Button
            onClick={handleOpenForm}
            leftIcon={<Plus className="h-4 w-4" />}
            disabled={!canManageMaterials || isLoading}
          >
            Upload material
          </Button>
        )}
      />

      <Card variant="elevated" className="relative overflow-hidden bg-gradient-to-br from-ggk-primary-50 via-ggk-neutral-0 to-ggk-neutral-50">
        <div className="absolute -right-20 top-8 h-80 w-80 rounded-full bg-ggk-primary-200/50 blur-3xl" aria-hidden="true" />
        <CardContent className="grid gap-24 md:grid-cols-[1.4fr_1fr] items-start">
          <div className="space-y-12">
            <Badge variant="primary" size="sm" className="uppercase tracking-wide">Learning resources hub</Badge>
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-ggk-neutral-900 dark:text-ggk-neutral-50">Curate engaging digital experiences</h2>
              <p className="text-sm leading-relaxed text-ggk-neutral-600 dark:text-ggk-neutral-300">
                The refreshed materials workspace embraces the GGK design system for calm navigation, consistent typography, and streamlined workflows across upload, tagging, and streaming.
              </p>
              {teacherInfo?.schoolName && (
                <Badge variant="outline" size="sm" className="mt-4">{teacherInfo.schoolName}</Badge>
              )}
            </div>

            <div className="grid gap-12 sm:grid-cols-3">
              <div className="rounded-ggk-xl border border-ggk-neutral-200/70 bg-white/80 p-16 shadow-ggk-sm dark:border-ggk-neutral-800/80 dark:bg-ggk-neutral-900/50">
                <p className="text-xs font-semibold uppercase tracking-wide text-ggk-neutral-500">Total resources</p>
                <p className="mt-4 text-2xl font-semibold text-ggk-neutral-900 dark:text-ggk-neutral-50">{totalMaterials}</p>
              </div>
              <div className="rounded-ggk-xl border border-ggk-neutral-200/70 bg-white/80 p-16 shadow-ggk-sm dark:border-ggk-neutral-800/80 dark:bg-ggk-neutral-900/50">
                <p className="text-xs font-semibold uppercase tracking-wide text-ggk-neutral-500">Active</p>
                <p className="mt-4 text-2xl font-semibold text-emerald-600 dark:text-emerald-300">{activeMaterialCount}</p>
              </div>
              <div className="rounded-ggk-xl border border-ggk-neutral-200/70 bg-white/80 p-16 shadow-ggk-sm dark:border-ggk-neutral-800/80 dark:bg-ggk-neutral-900/50">
                <p className="text-xs font-semibold uppercase tracking-wide text-ggk-neutral-500">Archived</p>
                <p className="mt-4 text-2xl font-semibold text-ggk-neutral-700 dark:text-ggk-neutral-300">{inactiveMaterialCount}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-12 rounded-ggk-2xl border border-ggk-neutral-200/70 bg-white/90 p-20 shadow-ggk-lg dark:border-ggk-neutral-800/80 dark:bg-ggk-neutral-900/60">
            <div className="flex items-center gap-10">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ggk-primary-500/10 text-ggk-primary-600">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ggk-neutral-500">What&apos;s improved</p>
                <h3 className="text-lg font-semibold text-ggk-neutral-900 dark:text-ggk-neutral-50">Consistent authoring surfaces</h3>
              </div>
            </div>
            <ul className="space-y-8 text-sm text-ggk-neutral-600 dark:text-ggk-neutral-300">
              <li className="flex items-start gap-8">
                <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-ggk-primary-500" />
                <span>Slide-in forms, tables, and filters now use shared tokens for predictable interactions.</span>
              </li>
              <li className="flex items-start gap-8">
                <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-ggk-primary-500" />
                <span>Dark mode receives balanced contrast, helping you review media in low-light settings.</span>
              </li>
              <li className="flex items-start gap-8">
                <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-ggk-primary-500" />
                <span>Upcoming releases add AI tagging and quick lesson alignment suggestions.</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {hasError && (
        <Card variant="outlined" className="border-red-200 bg-red-50/80 text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200">
          <div className="flex items-start gap-12">
            <div className="mt-1 h-10 w-10 flex-shrink-0 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center">
              <span className="text-lg font-semibold">!</span>
            </div>
            <div className="space-y-6">
              <h3 className="text-sm font-semibold">Error loading materials</h3>
              <p className="text-sm leading-relaxed">
                {errorMessage}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ['entity-user'] });
                  queryClient.invalidateQueries({ queryKey: ['teacher-schools'] });
                  queryClient.invalidateQueries({ queryKey: ['teacher-materials'] });
                }}
              >
                Try again
              </Button>
            </div>
          </div>
        </Card>
      )}

      {!hasError && !isLoading && entityUser && !teacherInfo?.schoolId && (
        <Card variant="outlined" className="border-amber-200 bg-amber-50/80 text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
          <div className="space-y-6">
            <h3 className="text-sm font-semibold">No school assignment</h3>
            <p className="text-sm leading-relaxed">
              You are not currently assigned to any school. Please contact your administrator to assign you to a school before uploading materials.
            </p>
          </div>
        </Card>
      )}

      {canManageMaterials && (
        <FilterPanel
          title="Refine materials"
          activeFilterCount={activeFilterCount}
          onClear={activeFilterCount > 0 ? handleClearFilters : undefined}
        >
          <div className="grid grid-cols-1 gap-16 md:grid-cols-2 xl:grid-cols-4">
            <FormField id="search" label="Search">
              <Input
                id="search"
                placeholder="Search by title..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                disabled={isLoading}
              />
            </FormField>

            <div className="space-y-6">
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
            </div>

            <div className="space-y-6">
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
            </div>

            <div className="space-y-6">
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
          </div>
        </FilterPanel>
      )}

      {canManageMaterials && (
        <DataTable
          data={materials}
          columns={columns}
          keyField="id"
          caption="List of your uploaded learning materials"
          ariaLabel="Teacher materials table"
          loading={isLoading}
          renderActions={renderActions}
          onDelete={handleDelete}
          emptyMessage="No materials uploaded yet. Click 'Upload material' to get started."
          className="border border-ggk-neutral-200 shadow-ggk-lg dark:border-ggk-neutral-800"
        />
      )}

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
                className="block w-full text-sm text-ggk-neutral-600 dark:text-ggk-neutral-300 file:mr-4 file:py-2 file:px-4 file:rounded-ggk-lg file:border-0 file:text-sm file:font-semibold file:bg-ggk-primary-50 file:text-ggk-primary-700 hover:file:bg-ggk-primary-100 dark:file:bg-ggk-primary-900/40 dark:file:text-ggk-primary-200 dark:hover:file:bg-ggk-primary-900/60"
              />
              {uploadedFile && (
                <p className="mt-2 text-xs text-ggk-primary-600 dark:text-ggk-primary-300">
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
          materialId={previewMaterial.id}
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
