import { supabase } from '../lib/supabase';

export interface Material {
  id: string;
  title: string;
  description: string | null;
  data_structure_id: string;
  unit_id: string | null;
  topic_id: string | null;
  subtopic_id: string | null;
  type: 'video' | 'ebook' | 'audio' | 'assignment';
  file_path: string;
  file_url: string;
  mime_type: string;
  size: number;
  status: 'active' | 'inactive';
  created_at: string;
  created_by?: string | null;
  thumbnail_url?: string | null;
  created_by_role?: 'system_admin' | 'teacher';
  visibility_scope?: 'global' | 'school' | 'branch';
  school_id?: string | null;
  grade_id?: string | null;
  teacher_id?: string | null;
  data_structure?: {
    id: string;
    regions: { name: string } | null;
    programs: { name: string } | null;
    providers: { name: string } | null;
    edu_subjects: { id: string; name: string } | null;
  } | null;
  edu_units?: { id: string; name: string } | null;
  edu_topics?: { id: string; name: string } | null;
  edu_subtopics?: { id: string; name: string } | null;
}

export interface StudentMaterial extends Material {
  source_type: 'global' | 'school';
  subject_name: string;
  subject_id: string;
}

/**
 * Fetches materials accessible to a student for a specific subject
 */
export async function getMaterialsForStudent(
  studentId: string,
  subjectId: string
): Promise<StudentMaterial[]> {
  try {
    console.log('[MaterialsService] Fetching materials for student:', studentId, 'subject:', subjectId);

    const { data, error } = await supabase
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
        created_by,
        thumbnail_url,
        data_structures!inner (
          id,
          subject_id,
          regions (name),
          programs (name),
          providers (name),
          edu_subjects!inner (id, name)
        ),
        edu_units (id, name),
        edu_topics (id, name),
        edu_subtopics (id, name)
      `)
      .eq('data_structures.edu_subjects.id', subjectId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[MaterialsService] Error fetching materials:', error);
      throw error;
    }

    console.log('[MaterialsService] Materials found:', data?.length || 0);

    // Generate public URLs and format data
    const formattedMaterials: StudentMaterial[] = data.map(material => {
      // Use materials_files bucket for system/global materials
      const bucketName = 'materials_files';

      // CRITICAL SECURITY: Do NOT expose direct URLs for video materials
      // Videos must only be accessed via signed URLs through the edge function
      let fileUrl = '';

      if (material.type !== 'video') {
        const { data: urlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(material.file_path);
        fileUrl = urlData.publicUrl;
      } else {
        // For videos, return empty string - frontend will use signed URL via edge function
        fileUrl = '';
      }

      // Get thumbnail URL if exists
      let thumbnailUrl = null;
      if (material.thumbnail_url) {
        const { data: thumbData } = supabase.storage
          .from('thumbnails')
          .getPublicUrl(material.thumbnail_url);
        thumbnailUrl = thumbData.publicUrl;
      }

      return {
        ...material,
        file_url: fileUrl,
        thumbnail_url: thumbnailUrl,
        source_type: 'global',
        subject_name: material.data_structures?.edu_subjects?.name || 'Unknown',
        subject_id: material.data_structures?.edu_subjects?.id || ''
      };
    });

    return formattedMaterials;
  } catch (error) {
    console.error('Error fetching student materials:', error);
    throw error;
  }
}

/**
 * Fetches materials accessible to system admins (all materials)
 */
export async function getMaterialsForTeacher(
  teacherId: string,
  schoolId: string,
  filters?: {
    search?: string;
    data_structure_ids?: string[];
    types?: string[];
    status?: string[];
  }
): Promise<Material[]> {
  try {
    console.log('[MaterialsService] Fetching materials for admin/teacher:', teacherId);

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
        created_by,
        thumbnail_url,
        data_structures (
          id,
          regions (name),
          programs (name),
          providers (name),
          edu_subjects (id, name)
        ),
        edu_units (id, name),
        edu_topics (id, name),
        edu_subtopics (id, name)
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.search) {
      query = query.ilike('title', `%${filters.search}%`);
    }

    if (filters?.data_structure_ids && filters.data_structure_ids.length > 0) {
      query = query.in('data_structure_id', filters.data_structure_ids);
    }

    if (filters?.types && filters.types.length > 0) {
      query = query.in('type', filters.types);
    }

    if (filters?.status && filters.status.length > 0) {
      query = query.in('status', filters.status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[MaterialsService] Error fetching teacher materials:', error);
      throw error;
    }

    console.log('[MaterialsService] Teacher materials found:', data?.length || 0);

    // Generate public URLs
    const formattedMaterials: Material[] = data.map(material => {
      // CRITICAL SECURITY: Do NOT expose direct URLs for video materials
      let fileUrl = '';

      if (material.type !== 'video') {
        const { data: urlData } = supabase.storage
          .from('materials_files')
          .getPublicUrl(material.file_path);
        fileUrl = urlData.publicUrl;
      } else {
        // For videos, return empty string - must use signed URLs
        fileUrl = '';
      }

      // Get thumbnail URL if exists
      let thumbnailUrl = null;
      if (material.thumbnail_url) {
        const { data: thumbData } = supabase.storage
          .from('thumbnails')
          .getPublicUrl(material.thumbnail_url);
        thumbnailUrl = thumbData.publicUrl;
      }

      return {
        ...material,
        file_url: fileUrl,
        thumbnail_url: thumbnailUrl
      };
    });

    return formattedMaterials;
  } catch (error) {
    console.error('Error fetching teacher materials:', error);
    throw error;
  }
}

/**
 * Uploads a thumbnail image to storage
 */
export async function uploadThumbnail(
  file: File,
  materialId?: string
): Promise<string> {
  try {
    const uniquePrefix = Math.random().toString(36).slice(2);
    const timestamp = Date.now();
    const ext = file.name.split('.').pop();
    const fileName = materialId
      ? `material_${materialId}_${timestamp}.${ext}`
      : `temp_${uniquePrefix}_${timestamp}.${ext}`;

    const { data, error } = await supabase.storage
      .from('thumbnails')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      });

    if (error) throw error;
    return data.path;
  } catch (error) {
    console.error('Error uploading thumbnail:', error);
    throw error;
  }
}

/**
 * Deletes a thumbnail from storage
 */
export async function deleteThumbnail(thumbnailPath: string): Promise<void> {
  try {
    const { error } = await supabase.storage
      .from('thumbnails')
      .remove([thumbnailPath]);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting thumbnail:', error);
    throw error;
  }
}

/**
 * Uploads a teacher material file to storage
 */
export async function uploadTeacherMaterialFile(
  file: File,
  schoolId: string
): Promise<string> {
  try {
    const uniquePrefix = Math.random().toString(36).slice(2);
    const fileName = `${schoolId}/${uniquePrefix}_${file.name}`;

    const { data, error } = await supabase.storage
      .from('materials_files_teachers')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      });

    if (error) throw error;
    return data.path;
  } catch (error) {
    console.error('Error uploading teacher material file:', error);
    throw error;
  }
}

/**
 * Creates a new material record (for teachers or admins)
 */
export async function createTeacherMaterial(materialData: {
  title: string;
  description?: string;
  data_structure_id: string;
  unit_id?: string | null;
  topic_id?: string | null;
  subtopic_id?: string | null;
  type: 'video' | 'ebook' | 'audio' | 'assignment';
  file_path: string;
  mime_type: string;
  size: number;
  status: 'active' | 'inactive';
  created_by: string;
  thumbnail_url?: string | null;
  created_by_role?: 'system_admin' | 'teacher';
  visibility_scope?: 'global' | 'school' | 'branch';
  school_id?: string | null;
  grade_id?: string | null;
  teacher_id?: string | null;
}): Promise<Material> {
  try {
    // Ensure required fields have default values
    const insertData = {
      ...materialData,
      created_by_role: materialData.created_by_role || 'system_admin',
      visibility_scope: materialData.visibility_scope || 'global',
      school_id: materialData.school_id || null,
      grade_id: materialData.grade_id || null,
      teacher_id: materialData.teacher_id || null,
    };

    const { data, error } = await supabase
      .from('materials')
      .insert([insertData])
      .select()
      .single();

    if (error) throw error;

    // Generate public URL
    const { data: urlData } = supabase.storage
      .from('materials_files')
      .getPublicUrl(data.file_path);

    return {
      ...data,
      file_url: urlData.publicUrl
    };
  } catch (error) {
    console.error('Error creating material:', error);
    throw error;
  }
}

/**
 * Updates a material record
 */
export async function updateTeacherMaterial(
  materialId: string,
  updates: Partial<{
    title: string;
    description: string;
    unit_id: string | null;
    topic_id: string | null;
    subtopic_id: string | null;
    status: 'active' | 'inactive';
    thumbnail_url: string | null;
  }>
): Promise<void> {
  try {
    const { error } = await supabase
      .from('materials')
      .update(updates)
      .eq('id', materialId);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating material:', error);
    throw error;
  }
}

/**
 * Deletes a material and its file
 */
export async function deleteTeacherMaterial(
  materialId: string,
  filePath: string
): Promise<void> {
  try {
    // Delete file from storage
    const { error: storageError } = await supabase.storage
      .from('materials_files')
      .remove([filePath]);

    if (storageError) throw storageError;

    // Delete record from database
    const { error: dbError } = await supabase
      .from('materials')
      .delete()
      .eq('id', materialId);

    if (dbError) throw dbError;
  } catch (error) {
    console.error('Error deleting material:', error);
    throw error;
  }
}

/**
 * Logs student material access for analytics
 */
export async function logMaterialAccess(
  materialId: string,
  studentId: string,
  accessType: 'view' | 'download' | 'preview'
): Promise<void> {
  try {
    const { error } = await supabase
      .from('material_access_log')
      .insert([{
        material_id: materialId,
        student_id: studentId,
        access_type: accessType
      }]);

    if (error) {
      // Log error but don't throw - access logging shouldn't block user actions
      console.error('Error logging material access:', error);
    }
  } catch (error) {
    console.error('Error logging material access:', error);
  }
}

/**
 * Gets material access analytics for a teacher's materials
 */
export async function getMaterialAccessAnalytics(
  teacherId: string,
  schoolId: string
): Promise<{
  materialId: string;
  materialTitle: string;
  viewCount: number;
  downloadCount: number;
  previewCount: number;
  uniqueStudents: number;
}[]> {
  try {
    const { data, error } = await supabase
      .from('material_access_log')
      .select(`
        material_id,
        access_type,
        student_id,
        materials!inner (
          id,
          title,
          created_by
        )
      `)
      .eq('materials.created_by', teacherId);

    if (error) throw error;

    // Aggregate the data
    const analytics = data.reduce((acc, log) => {
      const key = log.material_id;
      if (!acc[key]) {
        acc[key] = {
          materialId: log.material_id,
          materialTitle: log.materials.title,
          viewCount: 0,
          downloadCount: 0,
          previewCount: 0,
          uniqueStudents: new Set()
        };
      }

      if (log.access_type === 'view') acc[key].viewCount++;
      if (log.access_type === 'download') acc[key].downloadCount++;
      if (log.access_type === 'preview') acc[key].previewCount++;
      acc[key].uniqueStudents.add(log.student_id);

      return acc;
    }, {} as Record<string, any>);

    return Object.values(analytics).map(item => ({
      ...item,
      uniqueStudents: item.uniqueStudents.size
    }));
  } catch (error) {
    console.error('Error fetching material access analytics:', error);
    throw error;
  }
}
