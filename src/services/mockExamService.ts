/**
 * Mock Exam Service
 *
 * Handles all data retrieval operations for the mock exam system
 * including fetching exams, dropdown options, student cohorts, and analytics
 */

import { supabase } from '@/lib/supabase';

export interface MockExam {
  id: string;
  company_id: string;
  title: string;
  status: 'planned' | 'scheduled' | 'in_progress' | 'grading' | 'completed' | 'cancelled';
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
        teachers: exam.mock_exam_teachers?.map((t: any) => ({
          id: t.entity_users?.id,
          name: t.entity_users?.users?.raw_user_meta_data?.name || t.entity_users?.users?.email,
          role: t.role,
          email: t.entity_users?.users?.email
        })) || [],
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
   * Get branches for schools
   */
  static async getBranchesForSchools(schoolIds: string[]) {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name, school_id')
        .in('school_id', schoolIds)
        .eq('status', 'active');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching branches:', error);
      throw error;
    }
  }

  /**
   * Get grade levels for schools
   */
  static async getGradeLevelsForSchools(schoolIds: string[]): Promise<GradeLevel[]> {
    try {
      const { data: schoolGradeLevels, error: schoolError } = await supabase
        .from('grade_level_schools')
        .select(`
          grade_level_id,
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
        .select('id')
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

      const uniqueGradeLevels = new Map();

      (schoolGradeLevels || []).forEach((item: any) => {
        if (item.grade_levels && !uniqueGradeLevels.has(item.grade_levels.id)) {
          uniqueGradeLevels.set(item.grade_levels.id, {
            id: item.grade_levels.id,
            name: item.grade_levels.grade_name,
            description: item.grade_levels.education_level
          });
        }
      });

      branchGradeLevels.forEach((item: any) => {
        if (item.grade_levels && !uniqueGradeLevels.has(item.grade_levels.id)) {
          uniqueGradeLevels.set(item.grade_levels.id, {
            id: item.grade_levels.id,
            name: item.grade_levels.grade_name,
            description: item.grade_levels.education_level
          });
        }
      });

      return Array.from(uniqueGradeLevels.values());
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
}

export default MockExamService;
