import { supabase } from '../lib/supabase';

export interface MockExam {
  id: string;
  name: string;
  description?: string;
  data_structure_id: string;
  total_marks: number;
  duration_minutes: number;
  start_date: string;
  end_date: string;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface MockExamStatusWizardContext {
  exam: MockExam;
  currentStatus: string;
  availableTransitions: string[];
  statusHistory: any[];
}

export interface StageTransitionPayload {
  examId: string;
  toStatus: string;
  notes?: string;
  metadata?: any;
}

export interface QuestionBankItem {
  id: string;
  question_number: number | null;
  question_description: string | null;
  marks: number | null;
  type: string | null;
  difficulty: string | null;
  scope: 'global' | 'custom';
  school_id: string | null;
  school_name: string | null;
  is_shared: boolean;
  question_bank_tag: string | null;
  year: number | null;
  topic_id: string | null;
  topic_name: string | null;
  subtopic_id: string | null;
  subtopic_name: string | null;
  subject_name: string | null;
  sub_questions_count: number;
  attachments_count: number;
  sub_questions?: Array<{
    id: string;
    description: string | null;
    marks: number | null;
    level: number;
    sub_question_number: string | null;
  }>;
}

export const MockExamService = {
  async getMockExams(filters?: any): Promise<MockExam[]> {
    let query = supabase
      .from('mock_exams')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters) {
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.data_structure_id) {
        query = query.eq('data_structure_id', filters.data_structure_id);
      }
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  async getMockExamsForScope(
    companyId: string,
    schoolIds?: string[],
    branchIds?: string[]
  ): Promise<MockExam[]> {
    let query = supabase
      .from('mock_exams')
      .select('*')
      .eq('entity_id', companyId)
      .order('created_at', { ascending: false });

    if (schoolIds && schoolIds.length > 0) {
      query = query.in('school_id', schoolIds);
    }

    if (branchIds && branchIds.length > 0) {
      query = query.in('branch_id', branchIds);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  async getMockExamById(id: string): Promise<MockExam> {
    const { data, error } = await supabase
      .from('mock_exams')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Mock exam not found');
    return data;
  },

  async getExamStatistics(companyId: string, schoolIds?: string[]): Promise<any> {
    let query = supabase
      .from('mock_exams')
      .select('status, count')
      .eq('entity_id', companyId);

    if (schoolIds && schoolIds.length > 0) {
      query = query.in('school_id', schoolIds);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  async getAvailableDataStructures(companyId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('data_structures')
      .select('*')
      .eq('company_id', companyId)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async getBranchesForSchools(schoolIds: string[]): Promise<any[]> {
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .in('school_id', schoolIds)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async getSchoolsForCompany(companyId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('schools')
      .select('*')
      .eq('company_id', companyId)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async getGradeLevelsForSchools(schoolIds: string[]): Promise<any[]> {
    const { data, error } = await supabase
      .from('grade_levels')
      .select('*')
      .in('school_id', schoolIds)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async getClassSectionsForScope(
    schoolIds: string[],
    gradeLevelIds: string[]
  ): Promise<any[]> {
    let query = supabase
      .from('class_sections')
      .select('*')
      .order('name');

    if (schoolIds.length > 0) {
      query = query.in('school_id', schoolIds);
    }

    if (gradeLevelIds.length > 0) {
      query = query.in('grade_level_id', gradeLevelIds);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  async getTeachersForSchools(schoolIds: string[], subjectId?: string): Promise<any[]> {
    let query = supabase
      .from('entity_users')
      .select('*, users(*)')
      .in('school_id', schoolIds)
      .eq('role', 'teacher');

    if (subjectId) {
      query = query.eq('subject_id', subjectId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  async getStatusWizardContext(examId: string): Promise<MockExamStatusWizardContext> {
    const exam = await this.getMockExamById(examId);
    const statusHistory = await this.getStatusHistory(examId);

    const availableTransitions = this.getAvailableTransitions(exam.status);

    return {
      exam,
      currentStatus: exam.status,
      availableTransitions,
      statusHistory
    };
  },

  getAvailableTransitions(currentStatus: string): string[] {
    const transitions: Record<string, string[]> = {
      'draft': ['under_review', 'cancelled'],
      'under_review': ['questions_ready', 'draft'],
      'questions_ready': ['scheduled', 'under_review'],
      'scheduled': ['in_progress', 'cancelled'],
      'in_progress': ['completed', 'cancelled'],
      'completed': ['results_ready'],
      'results_ready': ['archived'],
      'cancelled': [],
      'archived': []
    };

    return transitions[currentStatus] || [];
  },

  async transitionMockExamStatus(payload: StageTransitionPayload): Promise<MockExam> {
    const { examId, toStatus, notes, metadata } = payload;

    const { data: exam, error: examError } = await supabase
      .from('mock_exams')
      .update({ status: toStatus, updated_at: new Date().toISOString() })
      .eq('id', examId)
      .select()
      .single();

    if (examError) throw examError;

    const { error: historyError } = await supabase
      .from('mock_exam_status_history')
      .insert([{
        mock_exam_id: examId,
        from_status: exam.status,
        to_status: toStatus,
        notes,
        metadata,
        changed_at: new Date().toISOString()
      }]);

    if (historyError) throw historyError;

    return exam;
  },

  async getStatusHistory(examId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('mock_exam_status_history')
      .select('*')
      .eq('mock_exam_id', examId)
      .order('changed_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createMockExam(exam: Partial<MockExam>): Promise<MockExam> {
    const { data, error } = await supabase
      .from('mock_exams')
      .insert([exam])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateMockExam(id: string, updates: Partial<MockExam>): Promise<MockExam> {
    const { data, error } = await supabase
      .from('mock_exams')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteMockExam(id: string): Promise<void> {
    const { error } = await supabase
      .from('mock_exams')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

export async function getMockExams(filters?: any): Promise<MockExam[]> {
  return MockExamService.getMockExams(filters);
}

export async function getMockExam(id: string): Promise<MockExam> {
  return MockExamService.getMockExamById(id);
}

export async function createMockExam(exam: Partial<MockExam>): Promise<MockExam> {
  return MockExamService.createMockExam(exam);
}

export async function updateMockExam(id: string, updates: Partial<MockExam>): Promise<MockExam> {
  return MockExamService.updateMockExam(id, updates);
}

export async function deleteMockExam(id: string): Promise<void> {
  return MockExamService.deleteMockExam(id);
}

export default MockExamService;
