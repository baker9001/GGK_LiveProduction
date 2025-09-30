import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MockExamService } from '../services/mockExamService';
import { supabase } from '../lib/supabase';
import type { MockExam } from '../services/mockExamService';

interface CreateMockExamData {
  title: string;
  companyId: string;
  dataStructureId: string;
  paperType: string;
  paperNumber?: number;
  scheduledDate: string;
  scheduledTime?: string;
  durationMinutes: number;
  deliveryMode: 'In-person' | 'Digital (exam hall)' | 'Remote proctored';
  examWindow: string;
  totalMarks?: number;
  readinessScore: number;
  aiProctoringEnabled: boolean;
  releaseAnalytics: boolean;
  allowRetakes: boolean;
  notes?: string;
  schoolIds: string[];
  branchIds?: string[];
  gradeLevelIds: string[];
  sectionIds?: string[];
  teacherIds: Array<{ entityUserId: string; role: string; schoolId?: string }>;
}

export function useMockExams(companyId?: string, schoolIds?: string[], branchIds?: string[]) {
  return useQuery({
    queryKey: ['mockExams', companyId, schoolIds, branchIds],
    queryFn: async () => {
      if (!companyId) {
        return [];
      }
      return MockExamService.getMockExamsForScope(companyId, schoolIds, branchIds);
    },
    enabled: !!companyId,
    staleTime: 30000,
  });
}

export function useMockExamStats(companyId?: string, schoolIds?: string[]) {
  return useQuery({
    queryKey: ['mockExamStats', companyId, schoolIds],
    queryFn: async () => {
      if (!companyId) {
        return {
          total: 0,
          upcoming: 0,
          totalStudents: 0,
          totalFlagged: 0,
          aiEnabled: 0,
          avgReadiness: 0,
        };
      }
      return MockExamService.getExamStatistics(companyId, schoolIds);
    },
    enabled: !!companyId,
    staleTime: 30000,
  });
}

export function useDataStructures(companyId?: string) {
  return useQuery({
    queryKey: ['dataStructures', companyId],
    queryFn: async () => {
      if (!companyId) {
        return [];
      }
      return MockExamService.getAvailableDataStructures(companyId);
    },
    enabled: !!companyId,
    staleTime: 300000,
  });
}

export function useSchools(companyId?: string) {
  return useQuery({
    queryKey: ['schools', companyId],
    queryFn: async () => {
      if (!companyId) {
        return [];
      }
      return MockExamService.getSchoolsForCompany(companyId);
    },
    enabled: !!companyId,
    staleTime: 300000,
  });
}

export function useGradeLevels(schoolIds?: string[]) {
  return useQuery({
    queryKey: ['gradeLevels', schoolIds],
    queryFn: async () => {
      if (!schoolIds || schoolIds.length === 0) {
        return [];
      }
      return MockExamService.getGradeLevelsForSchools(schoolIds);
    },
    enabled: !!schoolIds && schoolIds.length > 0,
    staleTime: 300000,
  });
}

export function useClassSections(schoolIds?: string[], gradeLevelIds?: string[]) {
  return useQuery({
    queryKey: ['classSections', schoolIds, gradeLevelIds],
    queryFn: async () => {
      if (!schoolIds || schoolIds.length === 0) {
        return [];
      }
      return MockExamService.getClassSectionsForScope(schoolIds, gradeLevelIds);
    },
    enabled: !!schoolIds && schoolIds.length > 0,
    staleTime: 300000,
  });
}

export function useTeachers(schoolIds?: string[]) {
  return useQuery({
    queryKey: ['teachers', schoolIds],
    queryFn: async () => {
      if (!schoolIds || schoolIds.length === 0) {
        return [];
      }
      return MockExamService.getTeachersForSchools(schoolIds);
    },
    enabled: !!schoolIds && schoolIds.length > 0,
    staleTime: 300000,
  });
}

export function useCreateMockExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateMockExamData) => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data: mockExam, error: examError } = await supabase
        .from('mock_exams')
        .insert({
          company_id: data.companyId,
          title: data.title,
          data_structure_id: data.dataStructureId,
          paper_type: data.paperType,
          paper_number: data.paperNumber,
          scheduled_date: data.scheduledDate,
          scheduled_time: data.scheduledTime,
          duration_minutes: data.durationMinutes,
          delivery_mode: data.deliveryMode,
          exam_window: data.examWindow,
          total_marks: data.totalMarks,
          readiness_score: data.readinessScore,
          ai_proctoring_enabled: data.aiProctoringEnabled,
          release_analytics: data.releaseAnalytics,
          allow_retakes: data.allowRetakes,
          notes: data.notes,
          created_by: user.id,
          status: 'planned',
        })
        .select()
        .single();

      if (examError) throw examError;
      if (!mockExam) throw new Error('Failed to create mock exam');

      if (data.schoolIds.length > 0) {
        const { error: schoolsError } = await supabase
          .from('mock_exam_schools')
          .insert(
            data.schoolIds.map((schoolId) => ({
              mock_exam_id: mockExam.id,
              school_id: schoolId,
            }))
          );

        if (schoolsError) throw schoolsError;
      }

      if (data.branchIds && data.branchIds.length > 0) {
        const { error: branchesError } = await supabase
          .from('mock_exam_branches')
          .insert(
            data.branchIds.map((branchId) => ({
              mock_exam_id: mockExam.id,
              branch_id: branchId,
            }))
          );

        if (branchesError) throw branchesError;
      }

      if (data.gradeLevelIds.length > 0) {
        const { error: gradeLevelsError } = await supabase
          .from('mock_exam_grade_levels')
          .insert(
            data.gradeLevelIds.map((gradeLevelId) => ({
              mock_exam_id: mockExam.id,
              grade_level_id: gradeLevelId,
            }))
          );

        if (gradeLevelsError) throw gradeLevelsError;
      }

      if (data.sectionIds && data.sectionIds.length > 0) {
        const { error: sectionsError } = await supabase
          .from('mock_exam_sections')
          .insert(
            data.sectionIds.map((sectionId) => ({
              mock_exam_id: mockExam.id,
              class_section_id: sectionId,
            }))
          );

        if (sectionsError) throw sectionsError;
      }

      if (data.teacherIds.length > 0) {
        const { error: teachersError } = await supabase
          .from('mock_exam_teachers')
          .insert(
            data.teacherIds.map((teacher) => ({
              mock_exam_id: mockExam.id,
              entity_user_id: teacher.entityUserId,
              role: teacher.role,
              school_id: teacher.schoolId,
            }))
          );

        if (teachersError) throw teachersError;
      }

      return mockExam;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['mockExams'] });
      queryClient.invalidateQueries({ queryKey: ['mockExamStats'] });
    },
  });
}
