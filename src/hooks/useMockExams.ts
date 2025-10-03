import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MockExamService } from '../services/mockExamService';
import { supabase } from '../lib/supabase';
import type {
  MockExam,
  MockExamStatusWizardContext,
  StageTransitionPayload,
} from '../services/mockExamService';

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

export function useBranches(schoolIds?: string[]) {
  return useQuery({
    queryKey: ['branches', schoolIds],
    queryFn: async () => {
      if (!schoolIds || schoolIds.length === 0) {
        return [];
      }
      return MockExamService.getBranchesForSchools(schoolIds);
    },
    enabled: !!schoolIds && schoolIds.length > 0,
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

export function useTeachers(schoolIds?: string[], subjectId?: string) {
  return useQuery({
    queryKey: ['teachers', schoolIds, subjectId],
    queryFn: async () => {
      if (!schoolIds || schoolIds.length === 0) {
        return [];
      }
      return MockExamService.getTeachersForSchools(schoolIds, subjectId);
    },
    enabled: !!schoolIds && schoolIds.length > 0,
    staleTime: 300000,
  });
}

export function useMockExamById(examId?: string) {
  return useQuery({
    queryKey: ['mockExam', examId],
    queryFn: async () => {
      if (!examId) return null;
      return MockExamService.getMockExamById(examId);
    },
    enabled: !!examId,
    staleTime: 30000,
  });
}

export function useMockExamStatusWizard(examId?: string) {
  return useQuery<MockExamStatusWizardContext | null>({
    queryKey: ['mockExamStatusWizard', examId],
    queryFn: async () => {
      if (!examId) return null;
      return MockExamService.getStatusWizardContext(examId);
    },
    enabled: !!examId,
    staleTime: 30000,
  });
}

export function useMockExamStatusTransition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: StageTransitionPayload) => {
      return MockExamService.transitionMockExamStatus(payload);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['mockExams'] });
      queryClient.invalidateQueries({ queryKey: ['mockExamStats'] });
      queryClient.invalidateQueries({ queryKey: ['mockExam', variables.examId] });
      queryClient.invalidateQueries({ queryKey: ['mockExamStatusHistory', variables.examId] });
      queryClient.invalidateQueries({ queryKey: ['mockExamStatusWizard', variables.examId] });
    },
  });
}

export function useStatusHistory(examId?: string) {
  return useQuery({
    queryKey: ['mockExamStatusHistory', examId],
    queryFn: async () => {
      if (!examId) return [];
      return MockExamService.getStatusHistory(examId);
    },
    enabled: !!examId,
    staleTime: 30000,
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
        // The teacher IDs coming in are actually from the teachers table
        // We need to get the user_id from teachers, then find the entity_user_id
        const teacherIdsList = data.teacherIds.map(t => t.entityUserId);

        console.log('Teacher IDs to assign:', teacherIdsList);

        // Get teacher records to find user_ids
        const { data: teachers, error: fetchTeachersError } = await supabase
          .from('teachers')
          .select('id, user_id')
          .in('id', teacherIdsList);

        if (fetchTeachersError) {
          console.error('Error fetching teachers:', fetchTeachersError);
          throw new Error('Failed to fetch teacher records');
        }

        console.log('Found teachers:', teachers);

        if (!teachers || teachers.length === 0) {
          console.warn('No teacher records found for IDs:', teacherIdsList);
          throw new Error('Could not find teacher records. Please ensure teachers are properly assigned to the selected schools.');
        }

        // Get entity_users for these user_ids
        const userIds = teachers.map(t => t.user_id);
        const { data: entityUsers, error: entityUsersError } = await supabase
          .from('entity_users')
          .select('id, user_id')
          .in('user_id', userIds);

        if (entityUsersError) {
          console.error('Error fetching entity users:', entityUsersError);
          throw new Error('Failed to fetch entity user records');
        }

        console.log('Found entity users:', entityUsers);

        // Create a map of user_id -> entity_user_id
        const userIdToEntityUserId = new Map(
          (entityUsers || []).map((eu: any) => [eu.user_id, eu.id])
        );

        // Build teacher assignments
        const teacherAssignments = data.teacherIds
          .map((teacher) => {
            const teacherRecord = teachers.find(t => t.id === teacher.entityUserId);
            if (!teacherRecord) {
              console.warn('Teacher record not found for ID:', teacher.entityUserId);
              return null;
            }

            const entityUserId = userIdToEntityUserId.get(teacherRecord.user_id);
            if (!entityUserId) {
              console.warn('Entity user not found for teacher:', teacherRecord);
              return null;
            }

            return {
              mock_exam_id: mockExam.id,
              entity_user_id: entityUserId,
              role: teacher.role || 'lead_teacher',
              school_id: teacher.schoolId,
            };
          })
          .filter(Boolean);

        console.log('Teacher assignments to insert:', teacherAssignments);

        if (teacherAssignments.length > 0) {
          const { error: teachersError } = await supabase
            .from('mock_exam_teachers')
            .insert(teacherAssignments);

          if (teachersError) {
            console.error('Error inserting teacher assignments:', teachersError);
            throw new Error(`Failed to assign teachers: ${teachersError.message}`);
          }

          console.log('Successfully assigned teachers');
        } else {
          console.warn('No valid teacher assignments created');
        }
      }

      return mockExam;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['mockExams'] });
      queryClient.invalidateQueries({ queryKey: ['mockExamStats'] });
    },
  });
}
