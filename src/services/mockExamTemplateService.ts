/**
 * Mock Exam Template Service
 *
 * Handles saving, loading, and managing exam templates for quick cloning
 */

import { supabase } from '@/lib/supabase';

export interface MockExamTemplate {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  template_data: TemplateData;
  usage_count: number;
  is_shared: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TemplateData {
  // Basic Info
  program?: string;
  board?: string;
  subject?: string;
  subjectId?: string;
  paper?: string;
  examWindow?: string;

  // Scope (IDs will be filtered/validated when used)
  schoolIds?: string[];
  branchIds?: string[];
  gradeLevelIds?: string[];

  // Schedule
  durationMinutes?: number;
  deliveryMode?: 'In-person' | 'Digital (exam hall)' | 'Remote proctored';

  // Settings
  aiProctoringEnabled?: boolean;
  releaseAnalyticsToStudents?: boolean;
  allowRetakes?: boolean;

  // Metadata
  titlePattern?: string; // e.g., "Year {grade} {subject} Mock – {paper}"
  notes?: string;
}

export interface CreateTemplateData {
  name: string;
  description?: string;
  templateData: TemplateData;
  isShared?: boolean;
}

export class MockExamTemplateService {
  /**
   * Get all templates for a company
   */
  static async getTemplatesForCompany(companyId: string): Promise<MockExamTemplate[]> {
    const { data, error } = await supabase
      .from('mock_exam_templates')
      .select('*')
      .eq('company_id', companyId)
      .order('usage_count', { ascending: false });

    if (error) {
      console.error('Error fetching templates:', error);
      throw new Error(`Failed to fetch templates: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get popular templates (most used)
   */
  static async getPopularTemplates(companyId: string, limit: number = 5): Promise<MockExamTemplate[]> {
    const { data, error } = await supabase
      .from('mock_exam_templates')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_shared', true)
      .gt('usage_count', 0)
      .order('usage_count', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching popular templates:', error);
      throw new Error(`Failed to fetch popular templates: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get recent templates (last created/updated)
   */
  static async getRecentTemplates(companyId: string, limit: number = 5): Promise<MockExamTemplate[]> {
    const { data, error } = await supabase
      .from('mock_exam_templates')
      .select('*')
      .eq('company_id', companyId)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent templates:', error);
      throw new Error(`Failed to fetch recent templates: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Create a new template from exam data
   */
  static async createTemplate(
    companyId: string,
    templateData: CreateTemplateData
  ): Promise<MockExamTemplate> {
    const { data: user } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('mock_exam_templates')
      .insert({
        company_id: companyId,
        name: templateData.name,
        description: templateData.description || null,
        template_data: templateData.templateData,
        is_shared: templateData.isShared !== undefined ? templateData.isShared : true,
        created_by: user?.user?.id || null,
        usage_count: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating template:', error);
      throw new Error(`Failed to create template: ${error.message}`);
    }

    return data;
  }

  /**
   * Create template from existing exam
   */
  static async createTemplateFromExam(
    examId: string,
    templateName: string,
    templateDescription?: string
  ): Promise<MockExamTemplate> {
    // Fetch the exam
    const { data: exam, error: examError } = await supabase
      .from('mock_exams')
      .select(`
        *,
        schools:mock_exam_schools(school_id),
        branches:mock_exam_branches(branch_id),
        grade_levels:mock_exam_grade_levels(grade_level_id)
      `)
      .eq('id', examId)
      .single();

    if (examError || !exam) {
      console.error('Error fetching exam:', examError);
      throw new Error('Failed to fetch exam for template creation');
    }

    // Get data structure info
    const { data: dataStructure } = await supabase
      .from('data_structures')
      .select('provider_name, program_name, subject_name, subject_id')
      .eq('id', exam.data_structure_id)
      .single();

    // Build template data
    const templateData: TemplateData = {
      program: dataStructure?.program_name,
      board: dataStructure?.provider_name,
      subject: dataStructure?.subject_name,
      subjectId: dataStructure?.subject_id,
      paper: exam.paper_type,
      examWindow: exam.exam_window,
      schoolIds: exam.schools?.map((s: any) => s.school_id) || [],
      branchIds: exam.branches?.map((b: any) => b.branch_id) || [],
      gradeLevelIds: exam.grade_levels?.map((g: any) => g.grade_level_id) || [],
      durationMinutes: exam.duration_minutes,
      deliveryMode: exam.delivery_mode,
      aiProctoringEnabled: exam.ai_proctoring_enabled,
      releaseAnalyticsToStudents: exam.release_analytics,
      allowRetakes: exam.allow_retakes,
      titlePattern: exam.title,
      notes: exam.notes,
    };

    return this.createTemplate(exam.company_id, {
      name: templateName,
      description: templateDescription,
      templateData,
      isShared: true,
    });
  }

  /**
   * Update an existing template
   */
  static async updateTemplate(
    templateId: string,
    updates: Partial<CreateTemplateData>
  ): Promise<MockExamTemplate> {
    const updateData: any = {};

    if (updates.name) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.templateData) updateData.template_data = updates.templateData;
    if (updates.isShared !== undefined) updateData.is_shared = updates.isShared;

    const { data, error } = await supabase
      .from('mock_exam_templates')
      .update(updateData)
      .eq('id', templateId)
      .select()
      .single();

    if (error) {
      console.error('Error updating template:', error);
      throw new Error(`Failed to update template: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete a template
   */
  static async deleteTemplate(templateId: string): Promise<void> {
    const { error } = await supabase
      .from('mock_exam_templates')
      .delete()
      .eq('id', templateId);

    if (error) {
      console.error('Error deleting template:', error);
      throw new Error(`Failed to delete template: ${error.message}`);
    }
  }

  /**
   * Increment template usage count
   */
  static async incrementUsage(templateId: string): Promise<void> {
    const { error } = await supabase.rpc('increment_template_usage', {
      template_id: templateId,
    });

    if (error) {
      console.error('Error incrementing usage:', error);
      // Don't throw - this is not critical
    }
  }

  /**
   * Apply template to create new exam data
   */
  static applyTemplate(template: MockExamTemplate, overrides?: Partial<TemplateData>): any {
    const data = { ...template.template_data, ...overrides };

    return {
      title: data.titlePattern || '',
      board: data.board || '',
      program: data.program || '',
      subject: data.subject || '',
      subjectId: data.subjectId || '',
      paper: data.paper || 'Paper 1',
      schools: data.schoolIds || [],
      branches: data.branchIds || [],
      gradeBands: data.gradeLevelIds || [],
      sections: [],
      examWindow: data.examWindow || 'Term 2',
      scheduledStart: '', // User must set
      durationMinutes: String(data.durationMinutes || 120),
      deliveryMode: data.deliveryMode || 'In-person',
      teachers: [], // User must assign
      aiProctoringEnabled: data.aiProctoringEnabled || false,
      releaseAnalyticsToStudents: data.releaseAnalyticsToStudents || false,
      allowRetakes: data.allowRetakes || false,
      notes: data.notes || '',
    };
  }

  /**
   * Search templates by name or description
   */
  static async searchTemplates(companyId: string, query: string): Promise<MockExamTemplate[]> {
    const { data, error } = await supabase
      .from('mock_exam_templates')
      .select('*')
      .eq('company_id', companyId)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .order('usage_count', { ascending: false });

    if (error) {
      console.error('Error searching templates:', error);
      throw new Error(`Failed to search templates: ${error.message}`);
    }

    return data || [];
  }
}
