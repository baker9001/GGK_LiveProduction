import { supabase } from '../lib/supabase';

export interface MockExamTemplate {
  id: string;
  name: string;
  description?: string;
  company_id: string;
  data_structure_id: string;
  total_marks: number;
  duration_minutes: number;
  created_by: string;
  is_public: boolean;
  status: 'active' | 'inactive';
  usage_count: number;
  created_at: string;
  updated_at: string;
  configuration?: any;
}

export interface CreateTemplateData {
  name: string;
  description?: string;
  dataStructureId: string;
  totalMarks: number;
  durationMinutes: number;
  isPublic?: boolean;
  configuration?: any;
}

export const MockExamTemplateService = {
  async getTemplatesForCompany(companyId: string): Promise<MockExamTemplate[]> {
    const { data, error } = await supabase
      .from('mock_exam_templates')
      .select('*')
      .or(`company_id.eq.${companyId},is_public.eq.true`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getPopularTemplates(companyId: string, limit: number = 5): Promise<MockExamTemplate[]> {
    const { data, error } = await supabase
      .from('mock_exam_templates')
      .select('*')
      .or(`company_id.eq.${companyId},is_public.eq.true`)
      .order('usage_count', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  async getRecentTemplates(companyId: string, limit: number = 5): Promise<MockExamTemplate[]> {
    const { data, error } = await supabase
      .from('mock_exam_templates')
      .select('*')
      .or(`company_id.eq.${companyId},is_public.eq.true`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  async createTemplate(companyId: string, templateData: CreateTemplateData): Promise<MockExamTemplate> {
    const { data, error } = await supabase
      .from('mock_exam_templates')
      .insert([{
        name: templateData.name,
        description: templateData.description,
        company_id: companyId,
        data_structure_id: templateData.dataStructureId,
        total_marks: templateData.totalMarks,
        duration_minutes: templateData.durationMinutes,
        is_public: templateData.isPublic || false,
        configuration: templateData.configuration,
        status: 'active',
        usage_count: 0
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async createTemplateFromExam(
    examId: string,
    templateName: string,
    templateDescription?: string
  ): Promise<MockExamTemplate> {
    const { data: exam, error: examError } = await supabase
      .from('mock_exams')
      .select('*')
      .eq('id', examId)
      .single();

    if (examError) throw examError;

    const { data, error } = await supabase
      .from('mock_exam_templates')
      .insert([{
        name: templateName,
        description: templateDescription,
        company_id: exam.entity_id,
        data_structure_id: exam.data_structure_id,
        total_marks: exam.total_marks,
        duration_minutes: exam.duration_minutes,
        is_public: false,
        status: 'active',
        usage_count: 0
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateTemplate(templateId: string, updates: Partial<CreateTemplateData>): Promise<MockExamTemplate> {
    const updateData: any = {};

    if (updates.name) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.dataStructureId) updateData.data_structure_id = updates.dataStructureId;
    if (updates.totalMarks) updateData.total_marks = updates.totalMarks;
    if (updates.durationMinutes) updateData.duration_minutes = updates.durationMinutes;
    if (updates.isPublic !== undefined) updateData.is_public = updates.isPublic;
    if (updates.configuration) updateData.configuration = updates.configuration;

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('mock_exam_templates')
      .update(updateData)
      .eq('id', templateId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteTemplate(templateId: string): Promise<void> {
    const { error } = await supabase
      .from('mock_exam_templates')
      .delete()
      .eq('id', templateId);

    if (error) throw error;
  },

  async incrementUsage(templateId: string): Promise<void> {
    const { error } = await supabase.rpc('increment_template_usage', {
      template_id: templateId
    });

    if (error) {
      const { data: template } = await supabase
        .from('mock_exam_templates')
        .select('usage_count')
        .eq('id', templateId)
        .single();

      if (template) {
        await supabase
          .from('mock_exam_templates')
          .update({ usage_count: (template.usage_count || 0) + 1 })
          .eq('id', templateId);
      }
    }
  },

  async searchTemplates(companyId: string, query: string): Promise<MockExamTemplate[]> {
    const { data, error } = await supabase
      .from('mock_exam_templates')
      .select('*')
      .or(`company_id.eq.${companyId},is_public.eq.true`)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
};

export async function getMockExamTemplates(userId: string): Promise<MockExamTemplate[]> {
  const { data, error } = await supabase
    .from('mock_exam_templates')
    .select('*')
    .or(`created_by.eq.${userId},is_public.eq.true`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createMockExamTemplate(template: Partial<MockExamTemplate>): Promise<MockExamTemplate> {
  const { data, error } = await supabase
    .from('mock_exam_templates')
    .insert([template])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateMockExamTemplate(id: string, updates: Partial<MockExamTemplate>): Promise<MockExamTemplate> {
  const { data, error } = await supabase
    .from('mock_exam_templates')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteMockExamTemplate(id: string): Promise<void> {
  const { error } = await supabase
    .from('mock_exam_templates')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
