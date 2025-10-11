import { supabase } from '../lib/supabase';

export interface Material {
  id: string;
  title: string;
  description?: string;
  data_structure_id: string;
  unit_id?: string | null;
  topic_id?: string | null;
  subtopic_id?: string | null;
  grade_id?: string | null;
  type: 'video' | 'ebook' | 'audio' | 'assignment';
  file_url?: string;
  file_size?: number;
  file_type?: string;
  thumbnail_url?: string;
  duration?: number;
  status: 'active' | 'inactive';
  created_by: string;
  created_at: string;
  updated_at: string;
  subject_name?: string;
  unit_name?: string;
  topic_name?: string;
  subtopic_name?: string;
  grade_name?: string;
}

export interface StudentMaterial extends Material {
  access_count?: number;
  last_accessed?: string;
}

export async function getMaterialsForTeacher(teacherId: string): Promise<Material[]> {
  const { data, error } = await supabase
    .from('teacher_materials')
    .select(`
      id,
      title,
      description,
      data_structure_id,
      unit_id,
      topic_id,
      subtopic_id,
      grade_id,
      type,
      file_url,
      file_size,
      file_type,
      thumbnail_url,
      duration,
      status,
      created_by,
      created_at,
      updated_at,
      data_structures(
        edu_subjects(name)
      ),
      edu_units(name),
      topics(name),
      subtopics(name),
      grade_levels(name)
    `)
    .eq('created_by', teacherId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map(item => ({
    id: item.id,
    title: item.title,
    description: item.description,
    data_structure_id: item.data_structure_id,
    unit_id: item.unit_id,
    topic_id: item.topic_id,
    subtopic_id: item.subtopic_id,
    grade_id: item.grade_id,
    type: item.type,
    file_url: item.file_url,
    file_size: item.file_size,
    file_type: item.file_type,
    thumbnail_url: item.thumbnail_url,
    duration: item.duration,
    status: item.status,
    created_by: item.created_by,
    created_at: item.created_at,
    updated_at: item.updated_at,
    subject_name: item.data_structures?.edu_subjects?.name,
    unit_name: item.edu_units?.name,
    topic_name: item.topics?.name,
    subtopic_name: item.subtopics?.name,
    grade_name: item.grade_levels?.name,
  }));
}

export async function uploadTeacherMaterialFile(file: File, materialId: string): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${materialId}.${fileExt}`;
  const filePath = `teacher-materials/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('materials')
    .upload(filePath, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('materials')
    .getPublicUrl(filePath);

  return publicUrl;
}

export async function createTeacherMaterial(material: Partial<Material>): Promise<Material> {
  const { data, error } = await supabase
    .from('teacher_materials')
    .insert([material])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTeacherMaterial(id: string, updates: Partial<Material>): Promise<Material> {
  const { data, error } = await supabase
    .from('teacher_materials')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTeacherMaterial(id: string): Promise<void> {
  const { error } = await supabase
    .from('teacher_materials')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getMaterialsForStudent(studentId: string): Promise<StudentMaterial[]> {
  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('grade_level_id, school_id, company_id')
    .eq('id', studentId)
    .single();

  if (studentError) throw studentError;

  const { data, error } = await supabase
    .from('teacher_materials')
    .select(`
      id,
      title,
      description,
      data_structure_id,
      unit_id,
      topic_id,
      subtopic_id,
      grade_id,
      type,
      file_url,
      file_size,
      file_type,
      thumbnail_url,
      duration,
      status,
      created_by,
      created_at,
      updated_at,
      data_structures(
        edu_subjects(name)
      ),
      edu_units(name),
      topics(name),
      subtopics(name),
      grade_levels(name)
    `)
    .eq('status', 'active')
    .or(`grade_id.eq.${student.grade_level_id},grade_id.is.null`)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map(item => ({
    id: item.id,
    title: item.title,
    description: item.description,
    data_structure_id: item.data_structure_id,
    unit_id: item.unit_id,
    topic_id: item.topic_id,
    subtopic_id: item.subtopic_id,
    grade_id: item.grade_id,
    type: item.type,
    file_url: item.file_url,
    file_size: item.file_size,
    file_type: item.file_type,
    thumbnail_url: item.thumbnail_url,
    duration: item.duration,
    status: item.status,
    created_by: item.created_by,
    created_at: item.created_at,
    updated_at: item.updated_at,
    subject_name: item.data_structures?.edu_subjects?.name,
    unit_name: item.edu_units?.name,
    topic_name: item.topics?.name,
    subtopic_name: item.subtopics?.name,
    grade_name: item.grade_levels?.name,
  }));
}

export async function logMaterialAccess(studentId: string, materialId: string): Promise<void> {
  const { error } = await supabase
    .from('material_access_logs')
    .insert([{
      student_id: studentId,
      material_id: materialId,
      accessed_at: new Date().toISOString()
    }]);

  if (error) {
    console.error('Error logging material access:', error);
  }
}
