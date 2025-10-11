import { supabase } from '../lib/supabase';

export interface ConflictCheck {
  hasConflicts?: boolean;
  hasConflict?: boolean;
  conflicts: any[];
  warnings?: any[];
}

export interface ConflictCheckParams {
  startDate?: string;
  endDate?: string;
  entityId?: string;
  schoolIds?: string[];
  branchIds?: string[];
  gradeLevelIds?: string[];
  teacherIds?: string[];
  excludeExamId?: string;
}

export const CalendarConflictService = {
  async checkConflicts(params: ConflictCheckParams): Promise<ConflictCheck> {
    const conflicts: any[] = [];
    const warnings: any[] = [];

    if (params.startDate && params.endDate && params.entityId) {
      const examConflicts = await this.checkMockExamConflicts(
        params.startDate,
        params.endDate,
        params.entityId,
        params.excludeExamId
      );
      conflicts.push(...examConflicts.conflicts);
    }

    if (params.teacherIds && params.teacherIds.length > 0 && params.startDate && params.endDate) {
      for (const teacherId of params.teacherIds) {
        const teacherConflicts = await this.checkTeacherScheduleConflicts(
          teacherId,
          params.startDate,
          params.endDate
        );
        conflicts.push(...teacherConflicts.conflicts);
      }
    }

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
      warnings
    };
  },

  async checkMockExamConflicts(
    startDate: string,
    endDate: string,
    entityId: string,
    excludeExamId?: string
  ): Promise<ConflictCheck> {
    let query = supabase
      .from('mock_exams')
      .select('*')
      .eq('entity_id', entityId)
      .or(`start_date.lte.${endDate},end_date.gte.${startDate}`);

    if (excludeExamId) {
      query = query.neq('id', excludeExamId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return {
      hasConflict: (data || []).length > 0,
      conflicts: data || []
    };
  },

  async checkTeacherScheduleConflicts(
    teacherId: string,
    startDate: string,
    endDate: string
  ): Promise<ConflictCheck> {
    const { data, error } = await supabase
      .from('teacher_schedules')
      .select('*')
      .eq('teacher_id', teacherId)
      .or(`start_time.lte.${endDate},end_time.gte.${startDate}`);

    if (error) throw error;

    return {
      hasConflict: (data || []).length > 0,
      conflicts: data || []
    };
  },

  async getBusyTimeSlots(date: string, schoolIds: string[]): Promise<any[]> {
    const { data, error } = await supabase
      .from('mock_exams')
      .select('*')
      .in('school_id', schoolIds)
      .gte('start_date', date)
      .lte('start_date', date);

    if (error) throw error;
    return data || [];
  }
};

export async function checkMockExamConflicts(
  startDate: string,
  endDate: string,
  entityId: string,
  excludeExamId?: string
): Promise<ConflictCheck> {
  return CalendarConflictService.checkMockExamConflicts(startDate, endDate, entityId, excludeExamId);
}

export async function checkTeacherScheduleConflicts(
  teacherId: string,
  startDate: string,
  endDate: string
): Promise<ConflictCheck> {
  return CalendarConflictService.checkTeacherScheduleConflicts(teacherId, startDate, endDate);
}
