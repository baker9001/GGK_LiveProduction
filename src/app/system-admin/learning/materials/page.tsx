///home/project/src/app/system-admin/learning/materials/page.tsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { z } from 'zod';
import { Plus, FileText, Upload, Download, Eye, Trash2, CreditCard as Edit2, FolderUp } from 'lucide-react';
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
import { FilePreviewModal } from '../../../../components/shared/FilePreviewModal';
import { toast } from '../../../../components/shared/Toast';
import { MaterialTypeSelector } from '../../../../components/shared/MaterialTypeSelector';
import { DragDropFileUpload } from '../../../../components/shared/DragDropFileUpload';
import { FormWizard, WizardStep } from '../../../../components/shared/FormWizard';
import { CurriculumTreeSelector } from '../../../../components/shared/CurriculumTreeSelector';
import { BulkUploadModal } from '../../../../components/shared/BulkUploadModal';
import { detectFileType, getMimeTypeFromExtension, formatFileSize as utilFormatFileSize, getMaxFileSizeForType } from '../../../../lib/utils/fileTypeDetector';
import { MaterialFileService } from '../../../../services/materialFileService';

const MATERIAL_TYPES = ['video', 'document', 'ebook', 'audio', 'assignment', 'interactive'] as const;
type MaterialType = typeof MATERIAL_TYPES[number];

const materialSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  description: z.string().optional(),
  data_structure_id: z.string().uuid('Please select a data structure'),
  unit_id: z.union([z.string().uuid('Please select a valid unit'), z.literal('')]).nullable().optional(),
  topic_id: z.union([z.string().uuid('Please select a valid topic'), z.literal('')]).nullable().optional(),
  subtopic_id: z.union([z.string().uuid('Please select a valid subtopic'), z.literal('')]).nullable().optional(),
  type: z.enum(MATERIAL_TYPES),
  status: z.enum(['active', 'inactive'])
});

type Material = {
  id: string;
  title: string;
  description: string | null;
  data_structure_id: string;
  subtopic_id: string | null;
  type: MaterialType;
  file_path: string;
  file_url: string;
  mime_type: string;
  size: number;
  status: 'active' | 'inactive';
  created_at: string;
  thumbnail_url?: string | null;
  thumbnail_public_url?: string | null;
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
  type: MaterialType;
  status: 'active' | 'inactive';
}

const ACCEPTED_FILE_TYPES: Record<string, string[]> = {
  video: ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.wmv', '.flv', '.mkv'],
  audio: ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.wma', '.flac'],
  document: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.odt', '.ods', '.odp', '.rtf'],
  image: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico'],
  text: ['.txt', '.json', '.csv', '.md', '.xml', '.html', '.css', '.js'],
  ebook: ['.pdf', '.epub', '.mobi', '.azw', '.azw3'],
  assignment: ['.pdf', '.doc', '.docx', '.txt', '.md', '.xls', '.xlsx'],
  interactive: ['.html', '.zip', '.json']
};

const ALL_ACCEPTED_TYPES = Object.values(ACCEPTED_FILE_TYPES).flat().join(',');

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
  const [uploadedThumbnail, setUploadedThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [materialsToDelete, setMaterialsToDelete] = useState<Material[]>([]);
  const [previewMaterial, setPreviewMaterial] = useState<Material | null>(null);
  const [showFilePreview, setShowFilePreview] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [curriculumSelection, setCurriculumSelection] = useState({
    dataStructureId: null as string | null,
    dataStructureName: undefined as string | undefined,
    unitId: null as string | null,
    unitName: undefined as string | undefined,
    topicId: null as string | null,
    topicName: undefined as string | undefined,
    subtopicId: null as string | null,
    subtopicName: undefined as string | undefined
  });

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

  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    fetchMaterials();
    fetchDataStructureOptions();
  }, [filters]);

  useEffect(() => {
    if (editingMaterial) {
      const fetchEditingData = async () => {
        try {
          const { data: dataStructure, error: dsError } = await supabase
            .from('data_structures')
            .select('subject_id')
            .eq('id', editingMaterial.data_structure_id)
            .single();

          if (dsError) throw dsError;

          await fetchUnitOptions(editingMaterial.data_structure_id);
          
          if (editingMaterial.unit_id) {
            await fetchTopicOptions(editingMaterial.unit_id);
            
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

  useEffect(() => {
    if (formState.unit_id) {
      fetchTopicOptions(formState.unit_id);
    } else {
      setTopicOptions([]);
      setFormState(prev => ({ ...prev, topic_id: '', subtopic_id: '' }));
    }
  }, [formState.unit_id]);

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
          thumbnail_url,
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

      const formattedData = data.map(material => {
        const thumbnailStoragePath = material.thumbnail_url;
        let thumbnailPublicUrl = null;
        if (thumbnailStoragePath) {
          const { data: thumbData } = supabase.storage
            .from('thumbnails')
            .getPublicUrl(thumbnailStoragePath);
          thumbnailPublicUrl = thumbData.publicUrl;
        }

        return {
          ...material,
          file_url: material.file_path,
          thumbnail_public_url: thumbnailPublicUrl,
          thumbnail_url: thumbnailStoragePath,
          data_structure_name: `${material.data_structures?.regions?.name || 'Unknown'} - ${material.data_structures?.programs?.name || 'Unknown'} - ${material.data_structures?.providers?.name || 'Unknown'} - ${material.data_structures?.edu_subjects?.name || 'Unknown'}`,
          region_name: material.data_structures?.regions?.name || 'Unknown',
          program_name: material.data_structures?.programs?.name || 'Unknown',
          provider_name: material.data_structures?.providers?.name || 'Unknown',
          subject_name: material.data_structures?.edu_subjects?.name || 'Unknown',
          unit_name: material.edu_units?.name || '-',
          topic_name: material.edu_topics?.name || '-',
          subtopic_name: material.edu_subtopics?.name || '-'
        };
      });

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
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
      toast.error('Failed to fetch data structure options. Please check your network connection and Supabase configuration.');
    }
  };

  const fetchUnitOptions = async (dataStructureId: string) => {
    try {
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
        contentType: file.type // Explicitly set content type
      });

    if (error) throw error;
    return data.path;
  };

  const handleThumbnailUpload = async (file: File): Promise<string> => {
    const uniquePrefix = Math.random().toString(36).slice(2);
    const timestamp = Date.now();
    const ext = file.name.split('.').pop();
    const fileName = `material_${uniquePrefix}_${timestamp}.${ext}`;

    const { data, error } = await supabase.storage
      .from('thumbnails')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      });

    if (error) throw error;
    return data.path;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('[Materials] handleSubmit called');
    console.log('[Materials] Form state:', formState);
    console.log('[Materials] Uploaded file:', uploadedFile?.name, uploadedFile?.size);
    console.log('[Materials] User:', user?.id, user?.email);

    setFormErrors({});
    setUploading(true);

    try {
      console.log('[Materials] Validating form data with Zod...');
      const validatedData = materialSchema.parse(formState);
      console.log('[Materials] Validation passed:', validatedData);

      let filePath = editingMaterial?.file_path;
      let fileUrl = editingMaterial?.file_url || '';
      let mimeType = editingMaterial?.mime_type || '';
      let fileSize = editingMaterial?.size || 0;
      let thumbnailPath = editingMaterial?.thumbnail_url || null;

      if (uploadedFile) {
        const fileTypeInfo = detectFileType(uploadedFile.name, uploadedFile.type);
        mimeType = fileTypeInfo.mimeType;
        fileSize = uploadedFile.size;

        console.log('[Materials] File details before upload:', {
          name: uploadedFile.name,
          type: mimeType,
          category: fileTypeInfo.category,
          viewerType: fileTypeInfo.viewerType,
          size: fileSize
        });

        if (editingMaterial?.file_path) {
          console.log('[Materials] Removing old file:', editingMaterial.file_path);
          await supabase.storage
            .from('materials_files')
            .remove([editingMaterial.file_path]);
        }

        console.log('[Materials] Starting file upload to storage...');
        filePath = await handleFileUpload(uploadedFile);
        console.log('[Materials] File upload complete, path:', filePath);
        fileUrl = filePath;
      }

      if (uploadedThumbnail) {
        if (editingMaterial?.thumbnail_url) {
          await supabase.storage
            .from('thumbnails')
            .remove([editingMaterial.thumbnail_url]);
        }
        thumbnailPath = await handleThumbnailUpload(uploadedThumbnail);
      }

      if (!filePath) {
        console.error('[Materials] No file path - file is required');
        throw new Error('File is required');
      }

      // CRITICAL FIX: Get the actual Supabase auth user ID instead of localStorage user ID
      const { data: { session } } = await supabase.auth.getSession();
      const authUserId = session?.user?.id;

      console.log('[Materials] User IDs comparison:', {
        localStorageUserId: user?.id,
        supabaseAuthUserId: authUserId,
        match: user?.id === authUserId
      });

      const materialData = {
        ...validatedData,
        file_path: filePath,
        file_url: fileUrl,
        mime_type: mimeType,
        size: fileSize,
        thumbnail_url: thumbnailPath,
        created_by: authUserId, // Use Supabase auth user ID instead of localStorage
        created_by_role: 'system_admin',
        visibility_scope: 'global',
        school_id: null,
        grade_id: null,
        teacher_id: null,
        unit_id: validatedData.unit_id && validatedData.unit_id !== '' ? validatedData.unit_id : null,
        topic_id: validatedData.topic_id && validatedData.topic_id !== '' ? validatedData.topic_id : null,
        subtopic_id: validatedData.subtopic_id && validatedData.subtopic_id !== '' ? validatedData.subtopic_id : null,
      };

      console.log('[Materials] Material data to save:', materialData);

      if (editingMaterial) {
        console.log('[Materials] Updating existing material:', editingMaterial.id);
        const { error } = await supabase
          .from('materials')
          .update({
            ...materialData,
            created_by: undefined
          })
          .eq('id', editingMaterial.id);

        if (error) {
          console.error('[Materials] Update error:', error);
          throw error;
        }
        console.log('[Materials] Update successful');
        toast.success('Material updated successfully');
      } else {
        console.log('[Materials] Inserting new material...');

        // DIAGNOSTIC: Check Supabase auth session
        const { data: { session } } = await supabase.auth.getSession();
        console.log('[Materials] Auth session:', {
          userId: session?.user?.id,
          email: session?.user?.email,
          hasSession: !!session
        });

        // DIAGNOSTIC: Check if user is in admin_users table
        const { data: adminCheck, error: adminCheckError } = await supabase
          .from('admin_users')
          .select('id')
          .eq('id', session?.user?.id)
          .maybeSingle();

        console.log('[Materials] Admin check:', {
          isAdmin: !!adminCheck,
          adminCheckError,
          sessionUserId: session?.user?.id
        });

        console.log('[Materials] Material data to insert:', {
          ...materialData,
          created_by: materialData.created_by,
          created_by_role: materialData.created_by_role
        });

        const { data: insertData, error } = await supabase
          .from('materials')
          .insert([materialData])
          .select();

        if (error) {
          console.error('[Materials] Insert error:', error);
          console.error('[Materials] Error details:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
          });

          // Provide user-friendly error messages
          let errorMessage = 'Failed to save material';

          if (error.message?.includes('new row violates row-level security policy') ||
              error.code === '42501' ||
              error.code === 'PGRST301') {
            errorMessage = 'Permission denied: You do not have permission to create materials. Please ensure you are logged in as a system administrator.';
            console.error('[Materials] RLS POLICY VIOLATION - User is not authorized');
          } else if (error.message?.includes('violates foreign key constraint')) {
            errorMessage = 'Database constraint error: Please ensure all required fields are valid.';
            console.error('[Materials] FOREIGN KEY VIOLATION');
          } else {
            errorMessage = `Failed to save material: ${error.message}`;
          }

          throw new Error(errorMessage);
        }
        console.log('[Materials] Insert successful:', insertData);
        toast.success('Material created successfully');
      }

      await fetchMaterials();
      setIsFormOpen(false);
      setEditingMaterial(null);
      setUploadedFile(null);
      setUploadedThumbnail(null);
      setThumbnailPreview(null);
      setFormErrors({});
    } catch (error) {
      console.error('[Materials] Caught error in handleSubmit:', error);
      if (error instanceof z.ZodError) {
        console.log('[Materials] Zod validation error:', error.errors);
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path.length > 0) {
            errors[err.path[0]] = err.message;
          }
        });
        setFormErrors(errors);
        toast.error('Please fix the validation errors');
      } else {
        console.error('[Materials] Non-Zod error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setFormErrors({ form: `Failed to save material: ${errorMessage}` });
        toast.error(`Failed to save material: ${errorMessage}`);
      }
    } finally {
      console.log('[Materials] handleSubmit complete, setting uploading=false');
      setUploading(false);
    }
  };

  const handleDelete = async (materials: Material[]) => {
    setMaterialsToDelete(materials);
    setIsConfirmDialogOpen(true);
  };

  const confirmDelete = async () => {
    try {
      const filePaths = materialsToDelete.map(m => m.file_path);
      if (filePaths.length > 0) {
        await supabase.storage
          .from('materials_files')
          .remove(filePaths);
      }

      const thumbnailPaths = materialsToDelete
        .map(m => m.thumbnail_url)
        .filter((path): path is string => !!path);
      if (thumbnailPaths.length > 0) {
        await supabase.storage
          .from('thumbnails')
          .remove(thumbnailPaths);
      }

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
    return filePath;
  };

  const handleDownload = async (filePath: string, fileName: string) => {
    try {
      await MaterialFileService.downloadFile(filePath, fileName);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    }
  };

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;

    const maxSize = getMaxFileSizeForType(formState.type);
    if (file.size > maxSize) {
      toast.error(`File size exceeds maximum allowed (${utilFormatFileSize(maxSize)})`);
      return;
    }

    setPendingFile(file);
    setShowFilePreview(true);
  };

  const confirmFileUpload = () => {
    if (pendingFile) {
      setUploadedFile(pendingFile);
      setPendingFile(null);
    }
  };

  const handleBulkUpload = useCallback(async (
    file: File,
    metadata: {
      title: string;
      type: MaterialType;
      dataStructureId: string;
      unitId?: string;
      topicId?: string;
      subtopicId?: string;
    }
  ) => {
    const fileTypeInfo = detectFileType(file.name, file.type);
    const mimeType = fileTypeInfo.mimeType;

    const originalName = file.name;
    const uniquePrefix = Math.random().toString(36).slice(2);
    const fileName = `AdminMaterials/${uniquePrefix}_${originalName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('materials_files')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: mimeType
      });

    if (uploadError) throw uploadError;

    const materialData = {
      title: metadata.title,
      description: '',
      data_structure_id: metadata.dataStructureId,
      unit_id: metadata.unitId || null,
      topic_id: metadata.topicId || null,
      subtopic_id: metadata.subtopicId || null,
      type: metadata.type,
      file_path: uploadData.path,
      file_url: uploadData.path,
      mime_type: mimeType,
      size: file.size,
      status: 'active',
      created_by: user?.id,
      created_by_role: 'system_admin',
      visibility_scope: 'global',
      school_id: null,
      grade_id: null,
      teacher_id: null
    };

    const { error: insertError } = await supabase
      .from('materials')
      .insert([materialData]);

    if (insertError) throw insertError;
  }, [user?.id]);

  const handleBulkUploadComplete = useCallback((results: { success: number; failed: number }) => {
    if (results.success > 0) {
      toast.success(`Successfully uploaded ${results.success} material${results.success !== 1 ? 's' : ''}`);
      fetchMaterials();
    }
    if (results.failed > 0) {
      toast.error(`${results.failed} file${results.failed !== 1 ? 's' : ''} failed to upload`);
    }
  }, []);

  const formatFileSize = (bytes: number) => {
    return utilFormatFileSize(bytes);
  };

  const getMimeTypeFromExtensionOld = (filename: string): string => {
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    const mimeTypes: Record<string, string> = {
      // Video
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'ogg': 'video/ogg',
      'mov': 'video/quicktime',
      'avi': 'video/x-msvideo',
      'wmv': 'video/x-ms-wmv',
      'flv': 'video/x-flv',
      'mkv': 'video/x-matroska',
      // Audio
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'm4a': 'audio/mp4',
      'aac': 'audio/aac',
      'wma': 'audio/x-ms-wma',
      'flac': 'audio/flac',
      // Documents
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      // Images
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
      'bmp': 'image/bmp',
      'ico': 'image/x-icon',
      // Text
      'txt': 'text/plain',
      'json': 'application/json',
      'csv': 'text/csv',
      'md': 'text/markdown',
      'xml': 'text/xml',
      'html': 'text/html',
      // E-books
      'epub': 'application/epub+zip',
      'mobi': 'application/x-mobipocket-ebook',
      'azw': 'application/vnd.amazon.ebook',
      'azw3': 'application/vnd.amazon.ebook',
    };
    return mimeTypes[extension] || 'application/octet-stream';
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return '🎥';
      case 'document': return '📄';
      case 'ebook': return '📚';
      case 'audio': return '🎵';
      case 'assignment': return '📝';
      case 'interactive': return '🎮';
      default: return '📄';
    }
  };

  const getFileTypeHints = (type: string) => {
    switch (type) {
      case 'video':
        return 'Supported: MP4, WebM, OGG, MOV, AVI (Max 500MB)';
      case 'document':
        return 'Supported: PDF, Word, Excel, PowerPoint, ODT (Max 100MB)';
      case 'audio':
        return 'Supported: MP3, WAV, OGG, M4A, AAC (Max 100MB)';
      case 'ebook':
        return 'Supported: PDF, EPUB, MOBI (Max 100MB)';
      case 'assignment':
        return 'Supported: PDF, DOC, DOCX, TXT, MD, XLS, XLSX (Max 50MB)';
      case 'interactive':
        return 'Supported: HTML, ZIP packages, JSON configs (Max 100MB)';
      default:
        return 'Supported: Most common file formats (Max 100MB)';
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
        title={row.type === 'video' ? 'Stream Video' : 'Preview'}
      >
        <Eye className="h-4 w-4" />
      </button>
      {/* Hide download button for videos - security requirement */}
      {row.type !== 'video' && (
        <button
          onClick={() => handleDownload(row.file_path, row.title)}
          className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 p-1 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-full transition-colors"
          title="Download"
        >
          <Download className="h-4 w-4" />
        </button>
      )}
      {row.type === 'video' && (
        <span className="text-xs text-gray-500 dark:text-gray-400 italic px-2">
          Stream only
        </span>
      )}
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
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => setIsBulkUploadOpen(true)}
            leftIcon={<FolderUp className="h-4 w-4" />}
          >
            Bulk Upload
          </Button>
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
      </div>

      <FilterCard
        title="Filters"
        onApply={fetchMaterials}
        onClear={() => {
          setFilters({
            search: '',
            data_structure_ids: [],
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
              { value: 'document', label: 'Document' },
              { value: 'ebook', label: 'E-book' },
              { value: 'audio', label: 'Audio' },
              { value: 'assignment', label: 'Assignment' },
              { value: 'interactive', label: 'Interactive' }
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
          console.log('[Materials] Save button clicked, formRef.current:', formRef.current);
          if (formRef.current) {
            console.log('[Materials] Triggering form submit via ref');
            formRef.current.requestSubmit();
          } else {
            console.error('[Materials] Form ref is null - form not found!');
            toast.error('Form not ready. Please try again.');
          }
        }}
        loading={uploading}
        width="lg"
      >
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          {formErrors.form && (
            <div className="p-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 flex items-start gap-3">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-medium">Error saving material</p>
                <p className="mt-1">{formErrors.form}</p>
              </div>
            </div>
          )}

          {Object.keys(formErrors).filter(k => k !== 'form').length > 0 && !formErrors.form && (
            <div className="p-4 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-medium">Please fix the following errors:</p>
                <ul className="mt-1 list-disc list-inside">
                  {Object.entries(formErrors).filter(([k]) => k !== 'form').map(([field, error]) => (
                    <li key={field}>{error}</li>
                  ))}
                </ul>
              </div>
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

          <MaterialTypeSelector
            selectedType={formState.type}
            onTypeChange={(type) => setFormState(prev => ({ ...prev, type }))}
            error={formErrors.type}
            disabled={uploading}
          />

          <DragDropFileUpload
            onFileSelect={(file) => {
              setPendingFile(file);
              setShowFilePreview(true);
            }}
            acceptedTypes={ACCEPTED_FILE_TYPES[formState.type] || []}
            maxSize={getMaxFileSizeForType(formState.type)}
            selectedFile={uploadedFile}
            onClear={() => setUploadedFile(null)}
            error={formErrors.file}
            disabled={uploading}
            materialType={formState.type}
            existingFileName={editingMaterial ? editingMaterial.file_path.split('/').pop() : undefined}
          />

          {uploadedFile && !editingMaterial && (
            <div className="p-3 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>File selected: <strong>{uploadedFile.name}</strong>. Click <strong>Save</strong> to upload and create the material.</span>
            </div>
          )}

          <FormField
            id="thumbnail"
            label="Thumbnail (Optional)"
            error={formErrors.thumbnail}
          >
            <div className="space-y-3">
              <input
                type="file"
                id="thumbnail"
                accept=".jpg,.jpeg,.png,.webp,.gif"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setUploadedThumbnail(file);
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setThumbnailPreview(reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  } else {
                    setThumbnailPreview(null);
                  }
                }}
                className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 dark:file:bg-emerald-900/30 file:text-emerald-700 dark:file:text-emerald-300 hover:file:bg-emerald-100 dark:hover:file:bg-emerald-900/50"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Upload a preview image (JPG, PNG, WEBP - Max 5MB). Recommended for videos and visual content.
              </p>
              {editingMaterial?.thumbnail_public_url && !thumbnailPreview && !uploadedThumbnail && (
                <div className="mt-2">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Current thumbnail:</p>
                  <img
                    src={editingMaterial.thumbnail_public_url}
                    alt="Current thumbnail"
                    className="w-32 h-20 object-cover rounded-lg border-2 border-gray-200 dark:border-gray-700"
                  />
                </div>
              )}
              {thumbnailPreview && (
                <div className="mt-2">
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-2">New thumbnail preview:</p>
                  <img
                    src={thumbnailPreview}
                    alt="Thumbnail preview"
                    className="w-32 h-20 object-cover rounded-lg border-2 border-emerald-300 dark:border-emerald-700"
                  />
                </div>
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

      {/* Enhanced Material Preview */}
      {previewMaterial && (
        <MaterialPreview
          materialId={previewMaterial.id}
          fileType={previewMaterial.type}
          fileUrl={getFileUrl(previewMaterial.file_path)}
          mimeType={previewMaterial.mime_type}
          title={previewMaterial.title}
          isOpen={!!previewMaterial}
          onClose={() => setPreviewMaterial(null)}
        />
      )}

      {/* File Preview Modal */}
      <FilePreviewModal
        isOpen={showFilePreview}
        onClose={() => {
          setShowFilePreview(false);
          setPendingFile(null);
        }}
        file={pendingFile}
        onConfirm={confirmFileUpload}
        maxFileSize={getMaxFileSizeForType(formState.type)}
      />

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

      {/* Bulk Upload Modal */}
      <BulkUploadModal
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        onUploadComplete={handleBulkUploadComplete}
        uploadHandler={handleBulkUpload}
      />
    </div>
  );
}