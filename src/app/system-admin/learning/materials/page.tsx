///home/project/src/app/system-admin/learning/materials/page.tsx

import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import { Plus, FileText, Upload, Download, Eye, Trash2, Edit2 } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { useUser } from '../../../../contexts/UserContext';
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
  data_structure_id: z.string().uuid('Please select a data structure'),
  unit_id: z.union([z.string().uuid('Please select a valid unit'), z.literal('')]).nullable().optional(),
  topic_id: z.union([z.string().uuid('Please select a valid topic'), z.literal('')]).nullable().optional(),
  subtopic_id: z.union([z.string().uuid('Please select a valid subtopic'), z.literal('')]).nullable().optional(),
  type: z.enum(['video', 'ebook', 'audio', 'assignment']),
  status: z.enum(['active', 'inactive'])
});

type Material = {
  id: string;
  title: string;
  description: string | null;
  data_structure_id: string;
  subtopic_id: string | null;
  type: 'video' | 'ebook' | 'audio' | 'assignment';
  file_path: string;
  file_url: string;
  mime_type: string;
  size: number;
  status: 'active' | 'inactive';
  created_at: string;
  data_structure_name: string;
  region_name: string;
  program_name: string;
  provider_name: string;
  subject_name: string;
  topic_id: string | null;
  unit_id: string | null;
  topic_name: string;
  unit_name: string;
  subtopic_name: string;
};

type DataStructureOption = {
  id: string;
  name: string;
  region_name: string;
  program_name: string;
  provider_name: string;
  subject_name: string;
};

type UnitOption = {
  id: string;
  name: string;
  subject_id: string;
};

type TopicOption = {
  id: string;
  name: string;
  unit_id: string;
};

interface FormState {
  title: string;
  description: string;
  data_structure_id: string;
  unit_id: string;
  topic_id: string;
  subtopic_id: string;
  type: 'video' | 'ebook' | 'audio' | 'assignment';
  status: 'active' | 'inactive';
}

export default function MaterialManagementPage() {
  const { user } = useUser();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [dataStructureOptions, setDataStructureOptions] = useState<DataStructureOption[]>([]);
  const [unitOptions, setUnitOptions] = useState<UnitOption[]>([]);
  const [topicOptions, setTopicOptions] = useState<TopicOption[]>([]);
  const [subtopicOptions, setSubtopicOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
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
    type: 'video',
    status: 'active'
  });

  const [filters, setFilters] = useState({
    search: '',
    data_structure_ids: [] as string[],
    types: [] as string[],
    status: [] as string[]
  });

  useEffect(() => {
    fetchMaterials();
    fetchDataStructureOptions();
  }, [filters]);

  useEffect(() => {
    if (editingMaterial) {
      // Fetch unit, topic, and subtopic data for the editing material
      const fetchEditingData = async () => {
        try {
          // Get the subject_id from the data structure
          const { data: dataStructure, error: dsError } = await supabase
            .from('data_structures')
            .select('subject_id')
            .eq('id', editingMaterial.data_structure_id)
            .single();

          if (dsError) throw dsError;

          // Fetch units for the subject
          await fetchUnitOptions(editingMaterial.data_structure_id);
          
          // If unit_id exists, fetch topics
          if (editingMaterial.unit_id) {
            await fetchTopicOptions(editingMaterial.unit_id);
            
            // If topic_id exists, fetch subtopics
            if (editingMaterial.topic_id) {
              await fetchSubtopicOptions(editingMaterial.topic_id);
            }
          }
        } catch (error) {
          console.error('Error fetching editing data:', error);
        }
      };

      setFormState({
        title: editingMaterial.title,
        description: editingMaterial.description || '',
        data_structure_id: editingMaterial.data_structure_id,
        unit_id: editingMaterial.unit_id || '',
        topic_id: editingMaterial.topic_id || '',
        subtopic_id: editingMaterial.subtopic_id || '',
        type: editingMaterial.type,
        status: editingMaterial.status
      });

      // Fetch related data for editing
      fetchEditingData();

    } else {
      setFormState({
        title: '',
        description: '',
        data_structure_id: '',
        unit_id: '',
        topic_id: '',
        subtopic_id: '',
        type: 'video',
        status: 'active'
      });
      setUnitOptions([]);
      setTopicOptions([]);
      setSubtopicOptions([]);
    }
  }, [editingMaterial]);

  // Add effect for unit_id changes
  useEffect(() => {
    if (formState.unit_id) {
      fetchTopicOptions(formState.unit_id);
    } else {
      setTopicOptions([]);
      setFormState(prev => ({ ...prev, topic_id: '', subtopic_id: '' }));
    }
  }, [formState.unit_id]);

  // Add effect for topic_id changes
  useEffect(() => {
    if (formState.topic_id) {
      fetchSubtopicOptions(formState.topic_id);
    } else {
      setSubtopicOptions([]);
      setFormState(prev => ({ ...prev, subtopic_id: '' }));
    }
  }, [formState.topic_id]);
  const fetchMaterials = async () => {
    try {
      let query = supabase
        .from('materials')
        .select(`
          id,
          title,
          description,
          data_structure_id,
          unit_id,
          topic_id,
          subtopic_id,
          type,
          file_path,
          mime_type,
          size,
          status,
          created_at,
          data_structures (
            id,
            regions (name),
            programs (name),
            providers (name),
            edu_subjects (name)
          ),
          edu_units (id, name),
          edu_topics (id, name),
          edu_subtopics (id, name)
        `)
        .order('created_at', { ascending: false });

      if (filters.search) {
        query = query.ilike('title', `%${filters.search}%`);
      }

      if (filters.data_structure_ids.length > 0) {
        query = query.in('data_structure_id', filters.data_structure_ids);
      }

      if (filters.types.length > 0) {
        query = query.in('type', filters.types);
      }

      if (filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedData = data.map(material => ({
        ...material,
        data_structure_name: `${material.data_structures?.regions?.name || 'Unknown'} - ${material.data_structures?.programs?.name || 'Unknown'} - ${material.data_structures?.providers?.name || 'Unknown'} - ${material.data_structures?.edu_subjects?.name || 'Unknown'}`,
        region_name: material.data_structures?.regions?.name || 'Unknown',
        program_name: material.data_structures?.programs?.name || 'Unknown',
        provider_name: material.data_structures?.providers?.name || 'Unknown',
        subject_name: material.data_structures?.edu_subjects?.name || 'Unknown',
        unit_name: material.edu_units?.name || '-',
        topic_name: material.edu_topics?.name || '-',
        subtopic_name: material.edu_subtopics?.name || '-'
      }));

      setMaterials(formattedData);
    } catch (error) {
      console.error('Error fetching materials:', error);
      toast.error('Failed to fetch materials');
    } finally {
      setLoading(false);
    }
  };

  const fetchDataStructureOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('data_structures')
        .select(`
          id,
          regions (name),
          programs (name),
          providers (name),
          edu_subjects (name)
        `)
        .eq('status', 'active')
        .order('id');

      if (error) throw error;

      const formattedOptions = data.map(ds => ({
        id: ds.id,
        name: `${ds.regions?.name || 'Unknown'} - ${ds.programs?.name || 'Unknown'} - ${ds.providers?.name || 'Unknown'} - ${ds.edu_subjects?.name || 'Unknown'}`,
        region_name: ds.regions?.name || 'Unknown',
        program_name: ds.programs?.name || 'Unknown',
        provider_name: ds.providers?.name || 'Unknown',
        subject_name: ds.edu_subjects?.name || 'Unknown'
      }));

      setDataStructureOptions(formattedOptions);
    } catch (error) {
      console.error('Error fetching data structure options:', error);
      // Add more detailed error logging
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
      // Show a more informative error message
      toast.error('Failed to fetch data structure options. Please check your network connection and Supabase configuration.');
    }
  };

  const fetchUnitOptions = async (dataStructureId: string) => {
    try {
      // Get the subject_id from the data structure
      const { data: dataStructure, error: dsError } = await supabase
        .from('data_structures')
        .select('subject_id')
        .eq('id', dataStructureId)
        .single();

      if (dsError) throw dsError;

      const { data, error } = await supabase
        .from('edu_units')
        .select('id, name, subject_id')
        .eq('subject_id', dataStructure.subject_id)
        .eq('status', 'active')
        .order('name', { ascending: true });

      if (error) throw error;
      setUnitOptions(data || []);
    } catch (error) {
      console.error('Error fetching unit options:', error);
      setUnitOptions([]);
    }
  };

  const fetchTopicOptions = async (unitId: string) => {
    try {
      const { data, error } = await supabase
        .from('edu_topics')
        .select('id, name, unit_id')
        .eq('unit_id', unitId)
        .eq('status', 'active')
        .order('name', { ascending: true });

      if (error) throw error;
      setTopicOptions(data || []);
    } catch (error) {
      console.error('Error fetching topic options:', error);
      setTopicOptions([]);
    }
  };

  const fetchSubtopicOptions = async (topicId: string) => {
    try {
      const { data, error } = await supabase
        .from('edu_subtopics')
        .select('id, name, topic_id')
        .eq('topic_id', topicId)
        .eq('status', 'active')
        .order('name', { ascending: true });

      if (error) throw error;
      setSubtopicOptions(data || []);
    } catch (error) {
      console.error('Error fetching subtopic options:', error);
      setSubtopicOptions([]);
    }
  };
  const handleFileUpload = async (file: File): Promise<string> => {
    const originalName = file.name;
    const uniquePrefix = Math.random().toString(36).slice(2);
    const fileName = `AdminMaterials/${uniquePrefix}_${originalName}`;
    
    // Log file details for debugging - including MIME type
    console.log('Uploading file with details:', {
      name: file.name,
      type: file.type,
      size: formatFileSize(file.size),
      sizeBytes: file.size
    });

    const { data, error } = await supabase.storage
      .from('materials_files')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type // Explicitly set content type to ensure correct MIME type in storage
      });

    if (error) throw error;
    return data.path;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormErrors({});
    setUploading(true);

    try {
      const validatedData = materialSchema.parse(formState);

      let filePath = editingMaterial?.file_path;
      let fileUrl = editingMaterial?.file_url || '';
      let mimeType = editingMaterial?.mime_type || '';
      let fileSize = editingMaterial?.size || 0;

      // Handle file upload if a new file is selected - preserve MIME type
      if (uploadedFile) {
        // Store the file's MIME type and size before upload
        mimeType = uploadedFile.type;
        fileSize = uploadedFile.size;
        
        console.log('File details before upload:', {
          name: uploadedFile.name,
          type: mimeType,
          size: fileSize
        });
        
        // Delete old file if editing
        if (editingMaterial?.file_path) {
          await supabase.storage
            .from('materials_files')
            .remove([editingMaterial.file_path]);
        }

        filePath = await handleFileUpload(uploadedFile);
        // Generate public URL for the file
        const { data } = supabase.storage
          .from('materials_files')
          .getPublicUrl(filePath);
        fileUrl = data.publicUrl;
      }

      if (!filePath) {
        throw new Error('File is required');
      }

      const materialData = {
        ...validatedData,
        file_path: filePath,
        file_url: fileUrl,
        mime_type: mimeType,
        size: fileSize,
        created_by: user?.id,
        unit_id: validatedData.unit_id && validatedData.unit_id !== '' ? validatedData.unit_id : null,
        topic_id: validatedData.topic_id && validatedData.topic_id !== '' ? validatedData.topic_id : null,
        subtopic_id: validatedData.subtopic_id && validatedData.subtopic_id !== '' ? validatedData.subtopic_id : null,
      };

      if (editingMaterial) {
        const { error } = await supabase
          .from('materials')
          .update({
            ...materialData,
            // Don't update created_by when editing
            created_by: undefined
          })
          .eq('id', editingMaterial.id);

        if (error) throw error;
        toast.success('Material updated successfully');
      } else {
        const { error } = await supabase
          .from('materials')
          .insert([materialData]);

        if (error) throw error;
        toast.success('Material created successfully');
      }

      await fetchMaterials();
      setIsFormOpen(false);
      setEditingMaterial(null);
      setUploadedFile(null);
      setFormErrors({});
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path.length > 0) {
            errors[err.path[0]] = err.message;
          }
        });
        setFormErrors(errors);
      } else {
        console.error('Error saving material:', error);
        setFormErrors({ form: 'Failed to save material. Please try again.' });
        toast.error('Failed to save material');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (materials: Material[]) => {
    setMaterialsToDelete(materials);
    setIsConfirmDialogOpen(true);
  };

  const confirmDelete = async () => {
    try {
      // Delete files from storage
      const filePaths = materialsToDelete.map(m => m.file_path);
      if (filePaths.length > 0) {
        await supabase.storage
          .from('materials_files')
          .remove(filePaths);
      }

      // Delete records from database
      const { error } = await supabase
        .from('materials')
        .delete()
        .in('id', materialsToDelete.map(m => m.id));

      if (error) throw error;
      await fetchMaterials();
      toast.success(`${materialsToDelete.length} material(s) deleted successfully`);
      setIsConfirmDialogOpen(false);
      setMaterialsToDelete([]);
    } catch (error) {
      console.error('Error deleting materials:', error);
      toast.error('Failed to delete material(s)');
      setIsConfirmDialogOpen(false);
      setMaterialsToDelete([]);
    }
  };

  const cancelDelete = () => {
    setIsConfirmDialogOpen(false);
    setMaterialsToDelete([]);
  };

  const handleDataStructureChange = (dataStructureId: string) => {
    setFormState(prev => ({
      ...prev,
      data_structure_id: dataStructureId,
      unit_id: '',
      topic_id: '',
      subtopic_id: ''
    }));
    setUnitOptions([]);
    if (dataStructureId) {
      fetchUnitOptions(dataStructureId);
    } else {
      setUnitOptions([]);
      setTopicOptions([]);
      setSubtopicOptions([]);
    }
  };

  const handleUnitChange = (unitId: string) => {
    setFormState(prev => ({
      ...prev,
      unit_id: unitId,
      topic_id: '',
      subtopic_id: ''
    }));
    if (unitId) {
      fetchTopicOptions(unitId);
    } else {
      setTopicOptions([]);
      setSubtopicOptions([]);
    }
  };

  const handleTopicChange = (topicId: string) => {
    setFormState(prev => ({
      ...prev,
      topic_id: topicId,
      subtopic_id: ''
    }));
    if (topicId) {
      fetchSubtopicOptions(topicId);
    } else {
      setSubtopicOptions([]);
    }
  };

  const getFileUrl = (filePath: string) => {
    const { data } = supabase.storage
      .from('materials_files')
      .getPublicUrl(filePath); 
    return data.publicUrl;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return '🎥';
      case 'ebook': return '📚';
      case 'audio': return '🎵';
      case 'assignment': return '📝';
      default: return '📄';
    }
  };

  const columns = [
    {
      id: 'title',
      header: 'Title',
      accessorKey: 'title',
      enableSorting: true,
      cell: (row: Material) => (
        <div className="flex items-center">
          <span className="mr-2 text-lg">{getTypeIcon(row.type)}</span>
          <div>
            <div className="font-medium text-gray-900 dark:text-white">{row.title}</div>
            {row.description && (
              <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                {row.description}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      id: 'data_structure',
      header: 'Data Structure',
      accessorKey: 'data_structure_name',
      enableSorting: true,
      cell: (row: Material) => (
        <div className="text-sm">
          <div className="font-medium text-gray-900 dark:text-white">{row.subject_name}</div>
          <div className="text-gray-500 dark:text-gray-400">{row.region_name} - {row.program_name}</div>
          <div className="text-gray-500 dark:text-gray-400">{row.provider_name}</div>
        </div>
      ),
    },
    {
      id: 'unit',
      header: 'Unit',
      accessorKey: 'unit_name',
      enableSorting: true,
      cell: (row: Material) => (
        <span className="text-sm text-gray-900 dark:text-gray-100">
          {row.unit_name}
        </span>
      ),
    },
    {
      id: 'topic',
      header: 'Topic',
      accessorKey: 'topic_name',
      enableSorting: true
    },
    {
      id: 'subtopic',
      header: 'Subtopic',
      accessorKey: 'subtopic_name', 
      enableSorting: true,
      cell: (row: Material) => (
        <span className="text-sm text-gray-900 dark:text-gray-100">
          {row.subtopic_name}
        </span>
      ),
    },
    {
      id: 'type',
      header: 'Type',
      accessorKey: 'type',
      enableSorting: true,
      cell: (row: Material) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
          {row.type}
        </span>
      ),
    },
    {
      id: 'size',
      header: 'Size',
      accessorKey: 'size',
      enableSorting: true,
      cell: (row: Material) => (
        <span className="text-sm text-gray-900 dark:text-gray-100">
          {formatFileSize(row.size)}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      enableSorting: true,
      cell: (row: Material) => (
        <StatusBadge status={row.status} />
      ),
    },
    {
      id: 'created_at',
      header: 'Created At',
      accessorKey: 'created_at',
      enableSorting: true,
      cell: (row: Material) => (
        <span className="text-sm text-gray-900 dark:text-gray-100">
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      ),
    },
  ];

  const renderActions = (row: Material) => (
    <div className="flex items-center justify-end space-x-2">
      <button
        onClick={() => setPreviewMaterial(row)}
        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 p-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
        title="Preview"
      >
        <Eye className="h-4 w-4" />
      </button>
      <a
        href={getFileUrl(row.file_path)}
        download
        className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 p-1 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-full transition-colors"
        title="Download"
      >
        <Download className="h-4 w-4" />
      </a>
      <button
        onClick={() => {
          setEditingMaterial(row);
          setIsFormOpen(true);
        }}
        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 p-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
        title="Edit"
      >
        <Edit2 className="h-4 w-4" />
      </button>
      <button
        onClick={() => handleDelete([row])}
        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
        title="Delete"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Learning Materials Management</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">Manage educational content and resources</p>
      </div>

      <div className="flex justify-between items-center">
        <div />
        <Button
          onClick={() => {
            setEditingMaterial(null);
            setIsFormOpen(true);
          }}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Add Material
        </Button>
      </div>

      <FilterCard
        title="Filters"
        onApply={fetchMaterials}
        onClear={() => {
          setFilters({
            search: '',
            data_structure_ids: [],
            unit_ids: [],
            types: [],
            status: []
          });
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <FormField
            id="search"
            label="Search"
          >
            <Input
              id="search"
              placeholder="Search by title..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </FormField>

          <SearchableMultiSelect
            label="Data Structure"
            options={dataStructureOptions.map(ds => ({
              value: ds.id,
              label: ds.name
            }))}
            selectedValues={filters.data_structure_ids}
            onChange={(values) => setFilters({ ...filters, data_structure_ids: values })}
            placeholder="Select data structures..."
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

      <DataTable
        data={materials}
        columns={columns}
        keyField="id"
        caption="List of learning materials with their types, sizes, and status"
        ariaLabel="Learning materials data table"
        loading={loading}
        renderActions={renderActions}
        onDelete={handleDelete}
        emptyMessage="No materials found"
      />

      <SlideInForm
        key={editingMaterial?.id || 'new'}
        title={editingMaterial ? 'Edit Material' : 'Create Material'}
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
        loading={uploading}
        width="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formErrors.form && (
            <div className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200 dark:border-red-800">
              {formErrors.form}
            </div>
          )}

          <FormField
            id="title"
            label="Title"
            required
            error={formErrors.title}
          >
            <Input
              id="title"
              name="title"
              placeholder="Enter material title"
              value={formState.title}
              onChange={(e) => setFormState(prev => ({ ...prev, title: e.target.value }))}
            />
          </FormField>

          <FormField
            id="description"
            label="Description"
            error={formErrors.description}
          >
            <Textarea
              id="description"
              name="description"
              placeholder="Enter material description"
              value={formState.description}
              onChange={(e) => setFormState(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </FormField>

          <FormField
            id="data_structure_id"
            label="Data Structure"
            required
            error={formErrors.data_structure_id}
          >
            <Select
              id="data_structure_id"
              name="data_structure_id"
              options={dataStructureOptions.map(ds => ({
                value: ds.id,
                label: ds.name
              }))}
              value={formState.data_structure_id}
              onChange={(value) => handleDataStructureChange(value)}
            />
          </FormField>

          <FormField
            id="unit_id"
            label="Unit (Optional)"
            error={formErrors.unit_id}
          >
            <Select
              id="unit_id"
              name="unit_id"
              options={unitOptions.map(unit => ({
                value: unit.id,
                label: unit.name
              }))}
              value={formState.unit_id}
              onChange={(value) => handleUnitChange(value)}
              disabled={!formState.data_structure_id}
            />
          </FormField>

          <FormField
            id="topic_id"
            label="Topic (Optional)"
            error={formErrors.topic_id}
          >
            <Select
              id="topic_id"
              name="topic_id"
              options={topicOptions.map(topic => ({
                value: topic.id,
                label: topic.name
              }))}
              value={formState.topic_id}
              onChange={(value) => handleTopicChange(value)}
              disabled={!formState.unit_id}
            />
          </FormField>
          <FormField
            id="subtopic_id"
            label="Subtopic (Optional)"
            error={formErrors.subtopic_id || ''}
          >
            <Select
              id="subtopic_id"
              name="subtopic_id"
              options={subtopicOptions.map(subtopic => ({
                value: subtopic.id,
                label: subtopic.name
              }))}
              value={formState.subtopic_id}
              onChange={(value) => setFormState(prev => ({ ...prev, subtopic_id: value }))}
              disabled={!formState.topic_id}
            />
          </FormField>


          <FormField
            id="type"
            label="Type"
            required
            error={formErrors.type}
          >
            <Select
              id="type"
              name="type"
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

          <FormField
            id="file"
            label={editingMaterial ? "Replace File (Optional)" : "File"}
            required={!editingMaterial}
            error={formErrors.file}
          >
            <div className="space-y-2">
              <input
                type="file"
                id="file"
                accept=".pdf,.epub,.mp4,.mp3,.doc,.docx"
                onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Supported formats: PDF, EPUB, MP4, MP3, DOC, DOCX (Max 100MB)
              </p>
              {editingMaterial && !uploadedFile && (
                <p className="text-xs text-green-600 dark:text-green-400">
                  Current file: {editingMaterial.file_path.split('/').pop()}
                </p>
              )}
            </div>
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
              value={formState.status}
              onChange={(value) => setFormState(prev => ({ ...prev, status: value as any }))}
            />
          </FormField>
        </form>
      </SlideInForm>

      {previewMaterial && (
        <MaterialPreview
          fileType={previewMaterial.type}
          fileUrl={getFileUrl(previewMaterial.file_path)}
          mimeType={previewMaterial.mime_type}
          title={previewMaterial.title}
          isOpen={!!previewMaterial}
          onClose={() => setPreviewMaterial(null)}
        />
      )}

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isConfirmDialogOpen}
        title="Delete Material"
        message={`Are you sure you want to delete ${materialsToDelete.length} material(s)? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}