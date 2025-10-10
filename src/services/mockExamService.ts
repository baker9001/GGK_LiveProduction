/**
 * Mock Exam Service
 *
 * Handles all data retrieval operations for the mock exam system
 * including fetching exams, dropdown options, student cohorts, and analytics
 */

import { supabase } from '@/lib/supabase';

export type MockExamLifecycleStatus =
  | 'draft'
  | 'planned'
  | 'scheduled'
  | 'materials_ready'
  | 'in_progress'
  | 'grading'
  | 'moderation'
  | 'analytics_released'
  | 'completed'
  | 'cancelled';

export interface MockExam {
  id: string;
  company_id: string;
  title: string;
  status: MockExamLifecycleStatus;
  exam_board: string;
  programme: string;
  subject: string;
  paper_type: string;
  paper_number: number | null;
  scheduled_date: string;
  scheduled_time: string | null;
  duration_minutes: number;
  delivery_mode: 'In-person' | 'Digital (exam hall)' | 'Remote proctored';
  exam_window: string;
  total_marks: number | null;
  readiness_score: number;
  ai_proctoring_enabled: boolean;
  release_analytics: boolean;
  allow_retakes: boolean;
  notes: string | null;
  schools: Array<{ id: string; name: string }>;
  branches: Array<{ id: string; name: string }>;
  grade_levels: Array<{ id: string; name: string }>;
  sections: Array<{ id: string; name: string }>;
  teachers: Array<{ id: string; name: string; role: string; email: string }>;
  registered_students_count: number;
  flagged_students_count: number;
  created_at: string;
}

export interface DataStructureOption {
  id: string;
  provider_id: string;
  provider_name: string;
  program_id: string;
  program_name: string;
  subject_id: string;
  subject_name: string;
  region_id: string;
  region_name: string;
}

export interface School {
  id: string;
  name: string;
  code: string | null;
  student_count: number;
}

export interface GradeLevel {
  id: string;
  name: string;
  description: string | null;
}

export interface ClassSection {
  id: string;
  name: string;
  grade_level_id: string;
  grade_level_name: string;
  school_id: string;
  student_count: number;
}

export interface Teacher {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: string;
}

export interface MockExamStageProgressRecord {
  id: string;
  mock_exam_id: string;
  stage: MockExamLifecycleStatus;
  requirements: Record<string, any>;
  completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface MockExamInstructionRecord {
  id: string;
  mock_exam_id: string;
  audience: 'students' | 'invigilators' | 'markers' | 'teachers' | 'admins' | 'other';
  instructions: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MockExamQuestionSelectionRecord {
  id: string;
  mock_exam_id: string;
  source_type: 'bank' | 'custom';
  question_id: string | null;
  custom_question: Record<string, any> | null;
  marks: number | null;
  sequence: number;
  is_optional: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  question_bank_item?: {
    id: string;
    question_number?: number | null;
    question_text?: string | null;
    question_description?: string | null;
    type?: string | null;
    marks?: number | null;
    status?: string | null;
  } | null;
}

export interface SubQuestionItem {
  id: string;
  question_id: string;
  parent_id: string | null;
  sub_question_number: string | null;
  description: string | null;
  marks: number | null;
  type: string | null;
  level: number;
}

export interface QuestionBankItem {
  id: string;
  question_number: number | null;
  question_description: string | null;
  type: string | null;
  marks: number | null;
  status: string | null;
  exam_year: number | null;
  year: number | null;
  topic_id: string | null;
  topic_name: string | null;
  subtopic_id: string | null;
  subtopic_name: string | null;
  difficulty_level: string | null;
  board_name: string | null;
  programme_name: string | null;
  subject_name: string | null;
  sub_parts_count: number;
  sub_questions?: SubQuestionItem[];
  category: 'direct' | 'complex' | null;
}

export interface MockExamStatusWizardContext {
  exam: {
    id: string;
    title: string;
    status: MockExamLifecycleStatus;
    data_structure_id: string | null;
    subject_id: string | null;
    subject_name: string | null;
    board_name: string | null;
    programme_name: string | null;
    scheduled_date: string | null;
    scheduled_time: string | null;
    duration_minutes: number | null;
  };
  stageProgress: MockExamStageProgressRecord[];
  instructions: MockExamInstructionRecord[];
  questionSelections: MockExamQuestionSelectionRecord[];
  questionBank: QuestionBankItem[];
}

export interface SelectedQuestionSubmission {
  id?: string;
  sourceType: 'bank' | 'custom';
  questionId?: string;
  customQuestion?: Record<string, any> | null;
  marks?: number | null;
  sequence: number;
  isOptional?: boolean;
}

export interface StageTransitionDataPayload {
  formData?: Record<string, any>;
  notes?: string | null;
  completed?: boolean;
  instructions?: Array<{
    id?: string;
    audience: MockExamInstructionRecord['audience'];
    instructions: string;
  }>;
  removedInstructionIds?: string[];
  questionSelections?: {
    selectedQuestions: SelectedQuestionSubmission[];
    removedQuestionIds?: string[];
  };
}

export interface StageTransitionPayload {
  examId: string;
  currentStatus: MockExamLifecycleStatus;
  targetStatus: MockExamLifecycleStatus;
  reason?: string;
  stageData?: StageTransitionDataPayload;
}

export class MockExamService {
  /**
   * Get mock exams for a specific scope (company/schools/branches)
   */
  static async getMockExamsForScope(
    companyId: string,
    schoolIds?: string[],
    branchIds?: string[]
  ): Promise<MockExam[]> {
    try {
      let query = supabase
        .from('mock_exams')
        .select(`
          id,
          company_id,
          title,
          status,
          data_structure_id,
          paper_type,
          paper_number,
          scheduled_date,
          scheduled_time,
          duration_minutes,
          delivery_mode,
          exam_window,
          total_marks,
          readiness_score,
          ai_proctoring_enabled,
          release_analytics,
          allow_retakes,
          notes,
          created_at,
          data_structures!mock_exams_data_structure_id_fkey (
            providers!data_structures_provider_id_fkey (name),
            programs!data_structures_program_id_fkey (name),
            edu_subjects!data_structures_subject_id_fkey (name)
          ),
          mock_exam_schools (
            school_id,
            schools!mock_exam_schools_school_id_fkey (id, name)
          ),
          mock_exam_branches (
            branch_id,
            branches!mock_exam_branches_branch_id_fkey (id, name)
          ),
          mock_exam_grade_levels (
            grade_level_id,
            grade_levels!mock_exam_grade_levels_grade_level_id_fkey (id, grade_name)
          ),
          mock_exam_teachers (
            role,
            entity_users!mock_exam_teachers_entity_user_id_fkey (
              id,
              users!entity_users_user_id_fkey (email, raw_user_meta_data)
            )
          ),
          mock_exam_students (count),
          mock_exam_results (flagged_for_intervention)
        `)
        .eq('company_id', companyId)
        .order('scheduled_date', { ascending: false });

      if (schoolIds && schoolIds.length > 0) {
        query = query.in('mock_exam_schools.school_id', schoolIds);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((exam: any) => ({
        id: exam.id,
        company_id: exam.company_id,
        title: exam.title,
        status: exam.status,
        exam_board: exam.data_structures?.providers?.name || 'Unknown',
        programme: exam.data_structures?.programs?.name || 'Unknown',
        subject: exam.data_structures?.edu_subjects?.name || 'Unknown',
        paper_type: exam.paper_type || '',
        paper_number: exam.paper_number,
        scheduled_date: exam.scheduled_date,
        scheduled_time: exam.scheduled_time,
        duration_minutes: exam.duration_minutes,
        delivery_mode: exam.delivery_mode,
        exam_window: exam.exam_window,
        total_marks: exam.total_marks,
        readiness_score: exam.readiness_score,
        ai_proctoring_enabled: exam.ai_proctoring_enabled,
        release_analytics: exam.release_analytics,
        allow_retakes: exam.allow_retakes,
        notes: exam.notes,
        schools: exam.mock_exam_schools?.map((s: any) => ({
          id: s.schools?.id,
          name: s.schools?.name
        })) || [],
        branches: exam.mock_exam_branches?.map((b: any) => ({
          id: b.branches?.id,
          name: b.branches?.name
        })) || [],
        grade_levels: exam.mock_exam_grade_levels?.map((g: any) => ({
          id: g.grade_levels?.id,
          name: g.grade_levels?.grade_name
        })) || [],
        sections: [],
        teachers: exam.mock_exam_teachers?.map((t: any) => {
          const userName = t.entity_users?.users?.raw_user_meta_data?.name ||
                          t.entity_users?.users?.email?.split('@')[0] ||
                          'Unknown Teacher';
          return {
            id: t.entity_users?.id,
            name: userName,
            role: t.role || 'teacher',
            email: t.entity_users?.users?.email || ''
          };
        }).filter((t: any) => t.id) || [],
        registered_students_count: exam.mock_exam_students?.length || 0,
        flagged_students_count: exam.mock_exam_results?.filter((r: any) => r.flagged_for_intervention).length || 0,
        created_at: exam.created_at
      }));
    } catch (error) {
      console.error('Error fetching mock exams:', error);
      throw error;
    }
  }

  /**
   * Get region for entity/company
   */
  static async getRegionForEntity(companyId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('region_id')
        .eq('id', companyId)
        .maybeSingle();

      if (error) throw error;
      return data?.region_id || null;
    } catch (error) {
      console.error('Error fetching entity region:', error);
      return null;
    }
  }

  /**
   * Get available data structures (exam board/programme/subject combinations)
   * Filtered by entity's region to prevent duplicates
   */
  static async getAvailableDataStructures(companyId: string): Promise<DataStructureOption[]> {
    try {
      const regionId = await this.getRegionForEntity(companyId);

      let query = supabase
        .from('data_structures')
        .select(`
          id,
          provider_id,
          providers!data_structures_provider_id_fkey (id, name),
          program_id,
          programs!data_structures_program_id_fkey (id, name),
          subject_id,
          edu_subjects!data_structures_subject_id_fkey (id, name),
          region_id,
          regions!data_structures_region_id_fkey (id, name)
        `)
        .eq('status', 'active');

      if (regionId) {
        query = query.eq('region_id', regionId);
      }

      const { data, error } = await query.order('provider_id, program_id, subject_id');

      if (error) throw error;

      const uniqueDataStructures = new Map();
      (data || []).forEach((ds: any) => {
        const key = `${ds.provider_id}-${ds.program_id}-${ds.subject_id}`;
        if (!uniqueDataStructures.has(key)) {
          uniqueDataStructures.set(key, {
            id: ds.id,
            provider_id: ds.provider_id,
            provider_name: ds.providers?.name || 'Unknown',
            program_id: ds.program_id,
            program_name: ds.programs?.name || 'Unknown',
            subject_id: ds.subject_id,
            subject_name: ds.edu_subjects?.name || 'Unknown',
            region_id: ds.region_id,
            region_name: ds.regions?.name || 'Unknown'
          });
        }
      });

      return Array.from(uniqueDataStructures.values());
    } catch (error) {
      console.error('Error fetching data structures:', error);
      throw error;
    }
  }

  /**
   * Get schools for a company
   */
  static async getSchoolsForCompany(companyId: string): Promise<School[]> {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select(`
          id,
          name,
          code,
          students (count)
        `)
        .eq('company_id', companyId)
        .eq('status', 'active');

      if (error) throw error;

      return (data || []).map((school: any) => ({
        id: school.id,
        name: school.name,
        code: school.code,
        student_count: school.students?.[0]?.count || 0
      }));
    } catch (error) {
      console.error('Error fetching schools:', error);
      throw error;
    }
  }

  /**
   * Get branches for schools with school names
   */
  static async getBranchesForSchools(schoolIds: string[]) {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select(`
          id,
          name,
          school_id,
          schools!branches_school_id_fkey (
            id,
            name
          )
        `)
        .in('school_id', schoolIds)
        .eq('status', 'active');

      if (error) throw error;

      return (data || []).map((branch: any) => ({
        id: branch.id,
        name: branch.name,
        school_id: branch.school_id,
        school_name: branch.schools?.name || 'Unknown School'
      }));
    } catch (error) {
      console.error('Error fetching branches:', error);
      throw error;
    }
  }

  /**
   * Get grade levels for schools with school and branch context
   */
  static async getGradeLevelsForSchools(schoolIds: string[]): Promise<GradeLevel[]> {
    try {
      const { data: schoolGradeLevels, error: schoolError } = await supabase
        .from('grade_level_schools')
        .select(`
          grade_level_id,
          school_id,
          schools!grade_level_schools_school_id_fkey (
            id,
            name
          ),
          grade_levels!grade_level_schools_grade_level_id_fkey (
            id,
            grade_name,
            education_level
          )
        `)
        .in('school_id', schoolIds);

      if (schoolError) {
        console.error('Error fetching grade_level_schools:', schoolError);
        throw schoolError;
      }

      const { data: branches, error: branchesError } = await supabase
        .from('branches')
        .select('id, school_id')
        .in('school_id', schoolIds);

      if (branchesError) {
        console.error('Error fetching branches:', branchesError);
        throw branchesError;
      }

      const branchIds = (branches || []).map((b: any) => b.id);

      let branchGradeLevels: any[] = [];
      if (branchIds.length > 0) {
        const { data, error: branchError } = await supabase
          .from('grade_level_branches')
          .select(`
            grade_level_id,
            branch_id,
            branches!grade_level_branches_branch_id_fkey (
              id,
              name,
              school_id,
              schools!branches_school_id_fkey (
                id,
                name
              )
            ),
            grade_levels!grade_level_branches_grade_level_id_fkey (
              id,
              grade_name,
              education_level
            )
          `)
          .in('branch_id', branchIds);

        if (branchError) {
          console.error('Error fetching grade_level_branches:', branchError);
        }
        branchGradeLevels = data || [];
      }

      const gradeNameMap = new Map<string, any>();

      (schoolGradeLevels || []).forEach((item: any) => {
        if (item.grade_levels) {
          const gradeName = item.grade_levels.grade_name;
          if (!gradeNameMap.has(gradeName)) {
            gradeNameMap.set(gradeName, {
              ids: new Set(),
              name: gradeName,
              description: item.grade_levels.education_level,
              associations: []
            });
          }
          gradeNameMap.get(gradeName).ids.add(item.grade_levels.id);
          gradeNameMap.get(gradeName).associations.push({
            type: 'school',
            school_id: item.school_id,
            school_name: item.schools?.name || 'Unknown School',
            branch_id: null,
            branch_name: null
          });
        }
      });

      branchGradeLevels.forEach((item: any) => {
        if (item.grade_levels) {
          const gradeName = item.grade_levels.grade_name;
          if (!gradeNameMap.has(gradeName)) {
            gradeNameMap.set(gradeName, {
              ids: new Set(),
              name: gradeName,
              description: item.grade_levels.education_level,
              associations: []
            });
          }
          gradeNameMap.get(gradeName).ids.add(item.grade_levels.id);
          gradeNameMap.get(gradeName).associations.push({
            type: 'branch',
            school_id: item.branches?.school_id,
            school_name: item.branches?.schools?.name || 'Unknown School',
            branch_id: item.branch_id,
            branch_name: item.branches?.name || 'Unknown Branch'
          });
        }
      });

      return Array.from(gradeNameMap.values()).map(gl => {
        const uniqueAssociations = gl.associations.reduce((acc: any[], curr: any) => {
          const exists = acc.find(a =>
            a.school_id === curr.school_id && a.branch_id === curr.branch_id
          );
          if (!exists) {
            acc.push(curr);
          }
          return acc;
        }, []);

        const contextParts = uniqueAssociations
          .map((assoc: any) => {
            if (assoc.type === 'branch' && assoc.branch_name) {
              return `${assoc.school_name}, ${assoc.branch_name}`;
            }
            return assoc.school_name;
          })
          .filter((part: string, index: number, self: string[]) => self.indexOf(part) === index);

        return {
          id: Array.from(gl.ids)[0],
          name: gl.name,
          description: contextParts.length > 0 ? contextParts.join(' | ') : gl.description
        };
      });
    } catch (error) {
      console.error('Error fetching grade levels:', error);
      throw error;
    }
  }

  /**
   * Get class sections for scope
   */
  static async getClassSectionsForScope(
    schoolIds: string[],
    gradeLevelIds?: string[]
  ): Promise<ClassSection[]> {
    try {
      // First, get grade levels for the selected schools to filter sections
      let gradeLevelIdsForSchools: string[] = [];

      const { data: gradeLevelSchools, error: glsError } = await supabase
        .from('grade_level_schools')
        .select('grade_level_id')
        .in('school_id', schoolIds);

      if (glsError) {
        console.error('Error fetching grade_level_schools for sections:', glsError);
        throw glsError;
      }

      gradeLevelIdsForSchools = (gradeLevelSchools || []).map((gls: any) => gls.grade_level_id);

      // If specific grade levels are requested, use those; otherwise use all for the schools
      const targetGradeLevelIds = gradeLevelIds && gradeLevelIds.length > 0
        ? gradeLevelIds
        : gradeLevelIdsForSchools;

      if (targetGradeLevelIds.length === 0) {
        return [];
      }

      let query = supabase
        .from('class_sections')
        .select(`
          id,
          section_name,
          grade_level_id,
          grade_levels!class_sections_grade_level_id_fkey (
            id,
            grade_name,
            school_id
          )
        `)
        .in('grade_level_id', targetGradeLevelIds)
        .eq('status', 'active');

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching class sections:', error);
        throw error;
      }

      // Get student counts separately since there's no direct FK relationship
      const sectionIds = (data || []).map((s: any) => s.id);
      let studentCounts: Record<string, number> = {};

      if (sectionIds.length > 0) {
        const { data: countData } = await supabase
          .from('students')
          .select('class_section_id', { count: 'exact', head: false })
          .in('class_section_id', sectionIds)
          .eq('is_active', true);

        // Count students per section
        (countData || []).forEach((student: any) => {
          const sectionId = student.class_section_id;
          if (sectionId) {
            studentCounts[sectionId] = (studentCounts[sectionId] || 0) + 1;
          }
        });
      }

      return (data || []).map((section: any) => ({
        id: section.id,
        name: section.section_name,
        grade_level_id: section.grade_level_id,
        grade_level_name: section.grade_levels?.grade_name || 'Unknown',
        school_id: section.grade_levels?.school_id || null,
        student_count: studentCounts[section.id] || 0
      }));
    } catch (error) {
      console.error('Error fetching class sections:', error);
      throw error;
    }
  }

  /**
   * Get teachers for schools, optionally filtered by subject
   */
  static async getTeachersForSchools(schoolIds: string[], subjectId?: string): Promise<Teacher[]> {
    try {
      let query = supabase
        .from('teachers')
        .select(`
          id,
          user_id,
          school_id,
          is_active,
          users!teachers_user_id_fkey (
            email,
            raw_user_meta_data
          )
        `)
        .in('school_id', schoolIds)
        .eq('is_active', true);

      const { data, error } = await query;

      if (error) throw error;

      let filteredData = data || [];

      if (subjectId && filteredData.length > 0) {
        const teacherIds = filteredData.map((teacher: any) => teacher.id).filter(Boolean);

        if (teacherIds.length > 0) {
          const { data: teacherSubjects, error: tsError } = await supabase
            .from('teacher_subjects')
            .select('teacher_id')
            .in('teacher_id', teacherIds)
            .eq('subject_id', subjectId);

          if (tsError) {
            console.error('Error fetching teacher subjects:', tsError);
          } else if (teacherSubjects) {
            const qualifiedTeacherIds = new Set(teacherSubjects.map(ts => ts.teacher_id));
            filteredData = filteredData.filter((teacher: any) =>
              qualifiedTeacherIds.has(teacher.id)
            );
          }
        }
      }

      const uniqueTeachers = new Map();
      filteredData.forEach((teacher: any) => {
        if (teacher.id && !uniqueTeachers.has(teacher.id)) {
          uniqueTeachers.set(teacher.id, {
            id: teacher.id,
            user_id: teacher.user_id,
            name: teacher.users?.raw_user_meta_data?.name ||
                  teacher.users?.email?.split('@')[0] ||
                  'Unknown',
            email: teacher.users?.email || '',
            role: 'teacher'
          });
        }
      });

      return Array.from(uniqueTeachers.values());
    } catch (error) {
      console.error('Error fetching teachers:', error);
      throw error;
    }
  }

  /**
   * Get student count for sections
   */
  static async getStudentCountForSections(sectionIds: string[]): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('students')
        .select('id', { count: 'exact', head: true })
        .in('class_section_id', sectionIds)
        .eq('is_active', true);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error fetching student count:', error);
      return 0;
    }
  }

  /**
   * Update mock exam status
   */
  static async updateMockExamStatus(
    examId: string,
    newStatus: string,
    reason?: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('mock_exams')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', examId);

      if (error) {
        console.error('Supabase error updating status:', error);
        throw new Error(error.message || 'Failed to update mock exam status');
      }
    } catch (error: any) {
      console.error('Error updating mock exam status:', error);
      throw new Error(error?.message || 'Failed to update mock exam status');
    }
  }

  /**
   * Get mock exam by ID
   */
  static async getMockExamById(examId: string): Promise<MockExam | null> {
    try {
      const { data, error } = await supabase
        .from('mock_exams')
        .select(`
          id,
          company_id,
          title,
          status,
          data_structure_id,
          paper_type,
          paper_number,
          scheduled_date,
          scheduled_time,
          duration_minutes,
          delivery_mode,
          exam_window,
          total_marks,
          readiness_score,
          ai_proctoring_enabled,
          release_analytics,
          allow_retakes,
          notes,
          created_at,
          data_structures!mock_exams_data_structure_id_fkey (
            providers!data_structures_provider_id_fkey (name),
            programs!data_structures_program_id_fkey (name),
            edu_subjects!data_structures_subject_id_fkey (name)
          ),
          mock_exam_schools (
            school_id,
            schools!mock_exam_schools_school_id_fkey (id, name)
          ),
          mock_exam_branches (
            branch_id,
            branches!mock_exam_branches_branch_id_fkey (id, name)
          ),
          mock_exam_grade_levels (
            grade_level_id,
            grade_levels!mock_exam_grade_levels_grade_level_id_fkey (id, grade_name)
          ),
          mock_exam_sections (
            class_section_id
          ),
          mock_exam_teachers (
            role,
            entity_users!mock_exam_teachers_entity_user_id_fkey (
              id,
              users!entity_users_user_id_fkey (email, raw_user_meta_data)
            )
          )
        `)
        .eq('id', examId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        company_id: data.company_id,
        title: data.title,
        status: data.status as any,
        exam_board: data.data_structures?.providers?.name || 'Unknown',
        programme: data.data_structures?.programs?.name || 'Unknown',
        subject: data.data_structures?.edu_subjects?.name || 'Unknown',
        paper_type: data.paper_type || '',
        paper_number: data.paper_number,
        scheduled_date: data.scheduled_date,
        scheduled_time: data.scheduled_time,
        duration_minutes: data.duration_minutes,
        delivery_mode: data.delivery_mode,
        exam_window: data.exam_window,
        total_marks: data.total_marks,
        readiness_score: data.readiness_score,
        ai_proctoring_enabled: data.ai_proctoring_enabled,
        release_analytics: data.release_analytics,
        allow_retakes: data.allow_retakes,
        notes: data.notes,
        schools: data.mock_exam_schools?.map((s: any) => ({
          id: s.schools?.id,
          name: s.schools?.name
        })) || [],
        branches: data.mock_exam_branches?.map((b: any) => ({
          id: b.branches?.id,
          name: b.branches?.name
        })) || [],
        grade_levels: data.mock_exam_grade_levels?.map((g: any) => ({
          id: g.grade_levels?.id,
          name: g.grade_levels?.grade_name
        })) || [],
        sections: [],
        teachers: data.mock_exam_teachers?.map((t: any) => {
          const userName = t.entity_users?.users?.raw_user_meta_data?.name ||
                          t.entity_users?.users?.email?.split('@')[0] ||
                          'Unknown Teacher';
          return {
            id: t.entity_users?.id,
            name: userName,
            role: t.role || 'teacher',
            email: t.entity_users?.users?.email || ''
          };
        }).filter((t: any) => t.id) || [],
        registered_students_count: 0,
        flagged_students_count: 0,
        created_at: data.created_at
      };
    } catch (error) {
      console.error('Error fetching mock exam by ID:', error);
      throw error;
    }
  }

  /**
   * Get consolidated data required for the status transition wizard
   */
  static async getStatusWizardContext(examId: string): Promise<MockExamStatusWizardContext | null> {
    try {
      console.log('[MockExamService] Fetching wizard context for exam:', examId);

      const { data: examData, error: examError } = await supabase
        .from('mock_exams')
        .select(`
          id,
          title,
          status,
          data_structure_id,
          scheduled_date,
          scheduled_time,
          duration_minutes,
          data_structures!mock_exams_data_structure_id_fkey (
            subject_id,
            edu_subjects!data_structures_subject_id_fkey (name),
            programs!data_structures_program_id_fkey (name),
            providers!data_structures_provider_id_fkey (name)
          )
        `)
        .eq('id', examId)
        .maybeSingle();

      if (examError) {
        console.error('[MockExamService] Error fetching exam data:', examError);
        if (examError.code === 'PGRST116') {
          throw new Error('Exam not found. It may have been deleted.');
        } else if (examError.code === 'PGRST301' || examError.message?.includes('JWT')) {
          throw new Error('Authentication error. Please sign in again.');
        } else if (examError.message?.includes('policy') || examError.message?.includes('permission')) {
          throw new Error('Permission denied. You do not have access to this exam. Please contact your administrator.');
        } else if (examError.message?.includes('network') || examError.message?.includes('fetch')) {
          throw new Error('Network error. Please check your connection and try again.');
        }
        throw new Error(`Failed to load exam data: ${examError.message || 'Unknown error'}`);
      }

      if (!examData) {
        console.warn('[MockExamService] No exam data returned for ID:', examId);
        throw new Error('Exam not found or you do not have permission to access it.');
      }

      console.log('[MockExamService] Exam data fetched successfully:', examData.title);

      const [stageProgressRes, instructionsRes, questionSelectionsRes] = await Promise.all([
        supabase
          .from('mock_exam_stage_progress')
          .select('*')
          .eq('mock_exam_id', examId)
          .order('stage', { ascending: true }),
        supabase
          .from('mock_exam_instructions')
          .select('*')
          .eq('mock_exam_id', examId)
          .order('audience', { ascending: true }),
        supabase
          .from('mock_exam_questions')
          .select(`
            id,
            mock_exam_id,
            source_type,
            question_id,
            custom_question,
            marks,
            sequence,
            is_optional,
            created_by,
            created_at,
            updated_at,
            questions_master_admin!mock_exam_questions_question_id_fkey (
              id,
              question_number,
              question_description,
              type,
              marks,
              status
            )
          `)
          .eq('mock_exam_id', examId)
          .order('sequence', { ascending: true })
      ]);

      if (stageProgressRes.error) {
        console.error('[MockExamService] Error fetching stage progress:', stageProgressRes.error);
        throw new Error('Failed to load stage progress data: ' + stageProgressRes.error.message);
      }
      if (instructionsRes.error) {
        console.error('[MockExamService] Error fetching instructions:', instructionsRes.error);
        throw new Error('Failed to load instructions data: ' + instructionsRes.error.message);
      }
      if (questionSelectionsRes.error) {
        console.error('[MockExamService] Error fetching question selections:', questionSelectionsRes.error);
        throw new Error('Failed to load question selections: ' + questionSelectionsRes.error.message);
      }

      const subjectId = examData.data_structures?.subject_id || null;
      const dataStructureId = examData.data_structure_id || null;

      // Query question bank with proper joins to edu_topics and edu_subtopics
      // Now using the foreign key relationships established in the database
      let questionBankQuery = supabase
        .from('questions_master_admin')
        .select(`
          id,
          question_number,
          question_description,
          type,
          category,
          marks,
          status,
          data_structure_id,
          subject_id,
          year,
          topic_id,
          subtopic_id,
          edu_topics:topic_id (id, name),
          edu_subtopics:subtopic_id (id, name),
          data_structures:data_structure_id (
            id,
            subject_id,
            providers:provider_id (name),
            programs:program_id (name),
            edu_subjects:subject_id (name)
          )
        `)
        .eq('status', 'active');

      if (dataStructureId) {
        questionBankQuery = questionBankQuery.eq('data_structure_id', dataStructureId);
      } else if (subjectId) {
        questionBankQuery = questionBankQuery.eq('subject_id', subjectId);
      }

      const { data: questionBankData, error: questionBankError } = await questionBankQuery.order('question_number', { ascending: true });

      console.log('[MockExamService] Question bank query result:', {
        count: questionBankData?.length || 0,
        error: questionBankError,
        sample: questionBankData?.[0]
      });
      if (questionBankError) {
        console.error('[MockExamService] Error fetching question bank:', questionBankError);
        // Don't throw error for question bank - it's optional
        console.warn('[MockExamService] Continuing without question bank data');
      }

      const stageProgress: MockExamStageProgressRecord[] = (stageProgressRes.data || []).map((record: any) => ({
        id: record.id,
        mock_exam_id: record.mock_exam_id,
        stage: record.stage,
        requirements: record.requirements || {},
        completed: record.completed ?? false,
        completed_at: record.completed_at || null,
        completed_by: record.completed_by || null,
        notes: record.notes || null,
        created_at: record.created_at,
      }));

      const instructions: MockExamInstructionRecord[] = (instructionsRes.data || []).map((record: any) => ({
        id: record.id,
        mock_exam_id: record.mock_exam_id,
        audience: record.audience,
        instructions: record.instructions,
        created_by: record.created_by || null,
        created_at: record.created_at,
        updated_at: record.updated_at,
      }));

      const questionSelections: MockExamQuestionSelectionRecord[] = (questionSelectionsRes.data || []).map((record: any) => ({
        id: record.id,
        mock_exam_id: record.mock_exam_id,
        source_type: record.source_type,
        question_id: record.question_id,
        custom_question: record.custom_question,
        marks: record.marks !== null && record.marks !== undefined ? Number(record.marks) : null,
        sequence: record.sequence,
        is_optional: record.is_optional ?? false,
        created_by: record.created_by || null,
        created_at: record.created_at,
        updated_at: record.updated_at,
        question_bank_item: record.questions_master_admin
          ? {
              id: record.questions_master_admin.id,
              question_number: record.questions_master_admin.question_number ?? null,
              question_description: record.questions_master_admin.question_description ?? null,
              type: record.questions_master_admin.type ?? null,
              marks: record.questions_master_admin.marks !== null && record.questions_master_admin.marks !== undefined
                ? Number(record.questions_master_admin.marks)
                : null,
              status: record.questions_master_admin.status ?? null,
            }
          : null,
      }));

      // Fetch ALL sub-questions with hierarchy for all questions
      const questionIds = (questionBankData || []).map(q => q.id);
      let subQuestionsMap = new Map<string, SubQuestionItem[]>();

      if (questionIds.length > 0) {
        const { data: allSubQuestions, error: subQuestionsError } = await supabase
          .from('sub_questions')
          .select('id, question_id, parent_id, sub_question_number, description, marks, type')
          .in('question_id', questionIds)
          .order('sub_question_number', { ascending: true });

        if (!subQuestionsError && allSubQuestions) {
          // Build hierarchical structure for each question
          questionIds.forEach(questionId => {
            const questionsSubParts = allSubQuestions.filter(sq => sq.question_id === questionId);

            if (questionsSubParts.length > 0) {
              // Build hierarchy
              const subQuestionsHierarchy: any[] = [];
              const subQuestionsById = new Map<string, any>();

              // First pass: create map of all sub-questions
              questionsSubParts.forEach(sq => {
                subQuestionsById.set(sq.id, {
                  ...sq,
                  level: 0,
                  children: []
                });
              });

              // Second pass: build hierarchy and calculate levels
              questionsSubParts.forEach(sq => {
                const subQuestion = subQuestionsById.get(sq.id);
                if (sq.parent_id && subQuestionsById.has(sq.parent_id)) {
                  const parent = subQuestionsById.get(sq.parent_id);
                  subQuestion.level = parent.level + 1;
                  parent.children.push(subQuestion);
                } else if (!sq.parent_id) {
                  // Root level sub-question
                  subQuestion.level = 1;
                  subQuestionsHierarchy.push(subQuestion);
                }
              });

              // Flatten hierarchy for display
              const flattenSubQuestions = (items: any[]): SubQuestionItem[] => {
                const result: SubQuestionItem[] = [];
                items.forEach(item => {
                  result.push({
                    id: item.id,
                    question_id: item.question_id,
                    parent_id: item.parent_id,
                    sub_question_number: item.sub_question_number,
                    description: item.description,
                    marks: item.marks !== null && item.marks !== undefined ? Number(item.marks) : null,
                    type: item.type,
                    level: item.level
                  });
                  if (item.children && item.children.length > 0) {
                    result.push(...flattenSubQuestions(item.children));
                  }
                });
                return result;
              };

              subQuestionsMap.set(questionId, flattenSubQuestions(subQuestionsHierarchy));
            }
          });
        }
      }

      const questionBank: QuestionBankItem[] = (questionBankData || []).map((item: any) => {
        const subQuestions = subQuestionsMap.get(item.id) || [];
        const subPartsCount = subQuestions.filter(sq => sq.level === 1).length; // Count only first-level

        return {
          id: item.id,
          question_number: item.question_number ?? null,
          question_description: item.question_description ?? null,
          type: item.type ?? null,
          category: item.category ?? null,
          marks: item.marks !== null && item.marks !== undefined ? Number(item.marks) : null,
          status: item.status ?? null,
          exam_year: item.year ?? null,
          year: item.year ?? null,
          topic_id: item.topic_id ?? null,
          topic_name: item.edu_topics?.name ?? null,
          subtopic_id: item.subtopic_id ?? null,
          subtopic_name: item.edu_subtopics?.name ?? null,
          difficulty_level: null,
          board_name: item.data_structures?.providers?.name ?? null,
          programme_name: item.data_structures?.programs?.name ?? null,
          subject_name: item.data_structures?.edu_subjects?.name ?? null,
          sub_parts_count: subPartsCount,
          sub_questions: subQuestions.length > 0 ? subQuestions : undefined,
        };
      });

      const context = {
        exam: {
          id: examData.id,
          title: examData.title,
          status: examData.status,
          data_structure_id: examData.data_structure_id || null,
          subject_id: subjectId,
          subject_name: examData.data_structures?.edu_subjects?.name || null,
          board_name: examData.data_structures?.providers?.name || null,
          programme_name: examData.data_structures?.programs?.name || null,
          scheduled_date: examData.scheduled_date || null,
          scheduled_time: examData.scheduled_time || null,
          duration_minutes: examData.duration_minutes ?? null,
        },
        stageProgress,
        instructions,
        questionSelections,
        questionBank,
      };

      console.log('[MockExamService] Wizard context built successfully:', {
        examId: context.exam.id,
        title: context.exam.title,
        stageProgressCount: stageProgress.length,
        instructionsCount: instructions.length,
        questionSelectionsCount: questionSelections.length,
        questionBankCount: questionBank.length
      });

      return context;
    } catch (error: any) {
      console.error('[MockExamService] Fatal error in getStatusWizardContext:', error);
      // Re-throw with more context
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to load wizard context: ' + (error?.message || 'Unknown error'));
    }
  }

  /**
   * Persist status transition data, update related artefacts, and move the exam to a new status
   */
  static async transitionMockExamStatus(payload: StageTransitionPayload): Promise<void> {
    const { examId, targetStatus, stageData, reason } = payload;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error('Error fetching authenticated user:', authError);
      throw authError;
    }

    if (!user) {
      throw new Error('User not authenticated');
    }

    const nowIso = new Date().toISOString();

    try {
      if (stageData) {
        const { formData, notes, completed, instructions, removedInstructionIds, questionSelections } = stageData;

        const stageProgressPayload: Record<string, any> = {
          mock_exam_id: examId,
          stage: targetStatus,
          requirements: formData ?? {},
        };

        if (notes !== undefined) {
          stageProgressPayload.notes = notes;
        }

        if (completed !== undefined) {
          stageProgressPayload.completed = completed;
          stageProgressPayload.completed_at = completed ? nowIso : null;
          stageProgressPayload.completed_by = completed ? user.id : null;
        }

        if (Object.keys(stageProgressPayload.requirements).length > 0 || notes !== undefined || completed !== undefined) {
          const { error: stageProgressError } = await supabase
            .from('mock_exam_stage_progress')
            .upsert(stageProgressPayload, { onConflict: 'mock_exam_id,stage' });

          if (stageProgressError) throw stageProgressError;
        }

        if (instructions || (removedInstructionIds && removedInstructionIds.length > 0)) {
          const instructionsToProcess = instructions?.filter(instr => instr.instructions.trim().length > 0) ?? [];
          const explicitRemovals = removedInstructionIds ?? [];

          const additionalRemovals: string[] = [];

          for (const instruction of instructions || []) {
            if ((!instruction.instructions || !instruction.instructions.trim()) && instruction.id) {
              additionalRemovals.push(instruction.id);
            }
          }

          const idsToRemove = [...new Set([...explicitRemovals, ...additionalRemovals])];

          if (idsToRemove.length > 0) {
            const { error: deleteInstructionsError } = await supabase
              .from('mock_exam_instructions')
              .delete()
              .in('id', idsToRemove);

            if (deleteInstructionsError) throw deleteInstructionsError;
          }

          for (const instruction of instructionsToProcess) {
            if (instruction.id) {
              const { error: updateInstructionError } = await supabase
                .from('mock_exam_instructions')
                .update({
                  audience: instruction.audience,
                  instructions: instruction.instructions,
                  updated_at: nowIso,
                })
                .eq('id', instruction.id);

              if (updateInstructionError) throw updateInstructionError;
            } else {
              const { error: insertInstructionError } = await supabase
                .from('mock_exam_instructions')
                .insert({
                  mock_exam_id: examId,
                  audience: instruction.audience,
                  instructions: instruction.instructions,
                  created_by: user.id,
                });

              if (insertInstructionError) throw insertInstructionError;
            }
          }
        }

        if (questionSelections) {
          const { selectedQuestions = [], removedQuestionIds = [] } = questionSelections;

          if (removedQuestionIds && removedQuestionIds.length > 0) {
            const { error: deleteSelectionError } = await supabase
              .from('mock_exam_questions')
              .delete()
              .in('id', removedQuestionIds);

            if (deleteSelectionError) throw deleteSelectionError;
          }

          for (const selection of selectedQuestions) {
            const basePayload: Record<string, any> = {
              mock_exam_id: examId,
              source_type: selection.sourceType,
              question_id: selection.sourceType === 'bank' ? selection.questionId ?? null : null,
              custom_question: selection.sourceType === 'custom' ? selection.customQuestion ?? {} : null,
              marks: selection.marks !== undefined && selection.marks !== null ? Number(selection.marks) : null,
              sequence: selection.sequence,
              is_optional: selection.isOptional ?? false,
            };

            if (selection.id) {
              const { error: updateSelectionError } = await supabase
                .from('mock_exam_questions')
                .update({
                  ...basePayload,
                  updated_at: nowIso,
                })
                .eq('id', selection.id);

              if (updateSelectionError) throw updateSelectionError;
            } else {
              const { error: insertSelectionError } = await supabase
                .from('mock_exam_questions')
                .insert({
                  ...basePayload,
                  created_by: user.id,
                });

              if (insertSelectionError) throw insertSelectionError;
            }
          }
        }
      }

      const { error: updateStatusError } = await supabase
        .from('mock_exams')
        .update({
          status: targetStatus,
          updated_at: nowIso,
        })
        .eq('id', examId);

      if (updateStatusError) throw updateStatusError;

      if (reason) {
        const { data: latestHistory, error: historyFetchError } = await supabase
          .from('mock_exam_status_history')
          .select('id')
          .eq('mock_exam_id', examId)
          .eq('new_status', targetStatus)
          .order('created_at', { ascending: false })
          .limit(1);

        if (historyFetchError) {
          throw historyFetchError;
        }

        const historyRecordId = latestHistory?.[0]?.id;

        if (historyRecordId) {
          const { error: updateHistoryError } = await supabase
            .from('mock_exam_status_history')
            .update({ change_reason: reason })
            .eq('id', historyRecordId);

          if (updateHistoryError) throw updateHistoryError;
        }
      }
    } catch (error) {
      console.error('Error transitioning mock exam status:', error);
      throw error;
    }
  }

  /**
   * Get status history for a mock exam
   */
  static async getStatusHistory(examId: string) {
    try {
      const { data, error } = await supabase
        .from('mock_exam_status_history')
        .select(`
          id,
          old_status,
          new_status,
          change_reason,
          created_at,
          users!mock_exam_status_history_changed_by_fkey (
            email,
            raw_user_meta_data
          )
        `)
        .eq('mock_exam_id', examId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((record: any) => ({
        id: record.id,
        oldStatus: record.old_status,
        newStatus: record.new_status,
        changeReason: record.change_reason,
        createdAt: record.created_at,
        changedBy: record.users?.raw_user_meta_data?.name || record.users?.email || 'Unknown'
      }));
    } catch (error) {
      console.error('Error fetching status history:', error);
      return [];
    }
  }

  /**
   * Get exam statistics
   */
  static async getExamStatistics(companyId: string, schoolIds?: string[]) {
    try {
      const exams = await this.getMockExamsForScope(companyId, schoolIds);

      const upcoming = exams.filter(exam =>
        new Date(exam.scheduled_date) >= new Date() && exam.status !== 'cancelled'
      ).length;

      const totalStudents = exams.reduce((sum, exam) => sum + exam.registered_students_count, 0);
      const totalFlagged = exams.reduce((sum, exam) => sum + exam.flagged_students_count, 0);
      const aiEnabled = exams.filter(exam => exam.ai_proctoring_enabled).length;
      const avgReadiness = exams.length > 0
        ? Math.round(exams.reduce((sum, exam) => sum + exam.readiness_score, 0) / exams.length)
        : 0;

      return {
        total: exams.length,
        upcoming,
        totalStudents,
        totalFlagged,
        aiEnabled,
        avgReadiness
      };
    } catch (error) {
      console.error('Error calculating exam statistics:', error);
      return {
        total: 0,
        upcoming: 0,
        totalStudents: 0,
        totalFlagged: 0,
        aiEnabled: 0,
        avgReadiness: 0
      };
    }
  }

  /**
   * Fetch questions for mock exam creation with filters
   * Includes global questions and school-specific custom questions
   */
  static async fetchQuestionsForMockExam(params: {
    subjectId: string | null;
    schoolIds: string[];
    companyId: string | null;
    scope?: 'all' | 'global' | 'custom';
    years?: string[];
    topics?: string[];
    subtopics?: string[];
    types?: string[];
    difficulties?: string[];
    search?: string;
  }): Promise<QuestionBankItem[]> {
    try {
      const { subjectId, schoolIds, companyId, scope = 'all', years, topics, subtopics, types, search } = params;

      if (!subjectId) {
        console.warn('No subject ID provided for question fetch');
        return [];
      }

      let query = supabase
        .from('questions_master_admin')
        .select(`
          id,
          question_number,
          question_description,
          type,
          category,
          marks,
          status,
          year,
          topic_id,
          subtopic_id,
          difficulty,
          data_structure_id,
          edu_topics:topic_id (id, name),
          edu_subtopics:subtopic_id (id, name),
          data_structures:data_structure_id (
            subject_id,
            edu_subjects:subject_id (id, name)
          )
        `)
        .eq('status', 'active')
        .eq('subject_id', subjectId);

      // Note: scope and school_id columns don't exist in questions_master_admin
      // All questions in this table are global questions from the question bank
      // Custom questions would be in a different table if needed

      if (years && years.length > 0) {
        query = query.in('year', years.map(y => parseInt(y)));
      }

      if (topics && topics.length > 0) {
        query = query.in('topic_id', topics);
      }

      if (subtopics && subtopics.length > 0) {
        query = query.in('subtopic_id', subtopics);
      }

      if (types && types.length > 0) {
        query = query.in('type', types);
      }

      if (search && search.trim()) {
        query = query.or(`question_description.ilike.%${search}%,question_number.eq.${parseInt(search) || -1}`);
      }

      const { data, error } = await query.order('question_number', { ascending: true });

      if (error) {
        console.error('Error fetching questions:', error);
        throw error;
      }

      const questionIds = (data || []).map(q => q.id);
      let subQuestionsMap = new Map<string, SubQuestionItem[]>();

      if (questionIds.length > 0) {
        const { data: allSubQuestions } = await supabase
          .from('sub_questions')
          .select('id, question_id, parent_id, part_label, description, marks, type, level, order_index')
          .in('question_id', questionIds)
          .order('order_index', { ascending: true });

        if (allSubQuestions) {
          questionIds.forEach(questionId => {
            const subParts = allSubQuestions.filter(sq => sq.question_id === questionId);
            if (subParts.length > 0) {
              subQuestionsMap.set(questionId, subParts.map(sq => ({
                id: sq.id,
                question_id: sq.question_id,
                parent_id: sq.parent_id,
                sub_question_number: sq.part_label,
                description: sq.description,
                marks: sq.marks !== null ? Number(sq.marks) : null,
                type: sq.type,
                level: sq.level || 1
              })));
            }
          });
        }
      }

      const questions: QuestionBankItem[] = (data || []).map((item: any) => {
        const subQuestions = subQuestionsMap.get(item.id) || [];
        return {
          id: item.id,
          question_number: item.question_number ?? null,
          question_description: item.question_description ?? null,
          type: item.type ?? null,
          category: item.category ?? null,
          marks: item.marks !== null && item.marks !== undefined ? Number(item.marks) : null,
          status: item.status ?? null,
          exam_year: item.year ?? null,
          year: item.year ?? null,
          topic_id: item.topic_id ?? null,
          topic_name: item.edu_topics?.name ?? null,
          subtopic_id: item.subtopic_id ?? null,
          subtopic_name: item.edu_subtopics?.name ?? null,
          difficulty_level: item.difficulty ?? null,
          board_name: null,
          programme_name: null,
          subject_name: item.data_structures?.edu_subjects?.name ?? null,
          sub_parts_count: subQuestions.filter(sq => sq.level === 1).length,
          sub_questions: subQuestions.length > 0 ? subQuestions : undefined
        };
      });

      console.log(`Fetched ${questions.length} questions for subject ${subjectId}`);
      return questions;
    } catch (error) {
      console.error('Error in fetchQuestionsForMockExam:', error);
      throw error;
    }
  }

  /**
   * Generate random question selection based on criteria
   */
  static async generateRandomQuestionSelection(params: {
    subjectId: string;
    schoolIds: string[];
    totalQuestions: number;
    topicDistribution?: Record<string, number>;
    difficultyDistribution?: { easy?: number; medium?: number; hard?: number };
    includeGlobal?: boolean;
    includeCustom?: boolean;
  }): Promise<QuestionBankItem[]> {
    try {
      const { subjectId, schoolIds, totalQuestions, topicDistribution, difficultyDistribution, includeGlobal = true, includeCustom = true } = params;

      let scope: 'all' | 'global' | 'custom' = 'all';
      if (includeGlobal && !includeCustom) scope = 'global';
      if (!includeGlobal && includeCustom) scope = 'custom';

      const allQuestions = await this.fetchQuestionsForMockExam({
        subjectId,
        schoolIds,
        companyId: null,
        scope
      });

      if (allQuestions.length === 0) {
        return [];
      }

      let selectedQuestions: QuestionBankItem[] = [];

      if (topicDistribution && Object.keys(topicDistribution).length > 0) {
        for (const [topicId, count] of Object.entries(topicDistribution)) {
          const topicQuestions = allQuestions.filter(q => q.topic_id === topicId);
          const shuffled = topicQuestions.sort(() => Math.random() - 0.5);
          selectedQuestions.push(...shuffled.slice(0, count));
        }
      } else if (difficultyDistribution) {
        const { easy = 0, medium = 0, hard = 0 } = difficultyDistribution;

        if (easy > 0) {
          const easyQuestions = allQuestions.filter(q => q.difficulty_level?.toLowerCase() === 'easy');
          selectedQuestions.push(...easyQuestions.sort(() => Math.random() - 0.5).slice(0, easy));
        }
        if (medium > 0) {
          const mediumQuestions = allQuestions.filter(q => q.difficulty_level?.toLowerCase() === 'medium');
          selectedQuestions.push(...mediumQuestions.sort(() => Math.random() - 0.5).slice(0, medium));
        }
        if (hard > 0) {
          const hardQuestions = allQuestions.filter(q => q.difficulty_level?.toLowerCase() === 'hard');
          selectedQuestions.push(...hardQuestions.sort(() => Math.random() - 0.5).slice(0, hard));
        }
      } else {
        const shuffled = allQuestions.sort(() => Math.random() - 0.5);
        selectedQuestions = shuffled.slice(0, totalQuestions);
      }

      return selectedQuestions.slice(0, totalQuestions);
    } catch (error) {
      console.error('Error generating random question selection:', error);
      throw error;
    }
  }
}

export default MockExamService;
