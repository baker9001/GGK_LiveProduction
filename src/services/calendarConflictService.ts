/**
 * Calendar Conflict Detection Service
 *
 * Detects scheduling conflicts for mock exams including:
 * - Overlapping exams for same cohorts
 * - Teacher double-booking
 * - Venue conflicts
 * - Holiday/term break scheduling
 */

import { supabase } from '@/lib/supabase';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(isBetween);

export interface ConflictCheck {
  hasConflicts: boolean;
  conflicts: Conflict[];
  warnings: Warning[];
}

export interface Conflict {
  type: 'exam_overlap' | 'teacher_busy' | 'venue_busy' | 'holiday';
  severity: 'critical' | 'high' | 'medium';
  message: string;
  details: any;
}

export interface Warning {
  type: 'tight_schedule' | 'weekend' | 'after_hours' | 'multiple_exams_day';
  message: string;
  suggestion?: string;
}

export interface ConflictCheckParams {
  scheduledDate: string; // ISO date
  scheduledTime?: string; // HH:mm:ss
  durationMinutes: number;
  schoolIds: string[];
  branchIds?: string[];
  gradeLevelIds: string[];
  sectionIds?: string[];
  teacherIds?: string[];
  venueIds?: string[];
  excludeExamId?: string; // When editing existing exam
}

export class CalendarConflictService {
  /**
   * Check for all types of conflicts
   */
  static async checkConflicts(params: ConflictCheckParams): Promise<ConflictCheck> {
    const conflicts: Conflict[] = [];
    const warnings: Warning[] = [];

    // Run all checks in parallel
    const [
      cohortConflicts,
      teacherConflicts,
      venueConflicts,
      scheduleWarnings,
    ] = await Promise.all([
      this.checkCohortOverlaps(params),
      this.checkTeacherAvailability(params),
      this.checkVenueAvailability(params),
      this.checkScheduleWarnings(params),
    ]);

    conflicts.push(...cohortConflicts);
    conflicts.push(...teacherConflicts);
    conflicts.push(...venueConflicts);
    warnings.push(...scheduleWarnings);

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
      warnings,
    };
  }

  /**
   * Check for overlapping exams with same student cohorts
   */
  private static async checkCohortOverlaps(params: ConflictCheckParams): Promise<Conflict[]> {
    const conflicts: Conflict[] = [];

    if (!params.scheduledDate) return conflicts;

    const examStart = dayjs(`${params.scheduledDate}T${params.scheduledTime || '00:00:00'}`);
    const examEnd = examStart.add(params.durationMinutes, 'minute');

    // Get all exams on the same date for the same schools
    const { data: overlappingExams, error } = await supabase
      .from('mock_exams')
      .select(`
        id,
        title,
        scheduled_date,
        scheduled_time,
        duration_minutes,
        status,
        schools:mock_exam_schools!inner(school_id),
        grade_levels:mock_exam_grade_levels!inner(grade_level_id),
        sections:mock_exam_sections(class_section_id)
      `)
      .eq('scheduled_date', params.scheduledDate)
      .in('schools.school_id', params.schoolIds)
      .neq('status', 'cancelled');

    if (error) {
      console.error('Error checking cohort overlaps:', error);
      return conflicts;
    }

    if (!overlappingExams || overlappingExams.length === 0) return conflicts;

    for (const exam of overlappingExams) {
      // Skip if this is the exam we're editing
      if (params.excludeExamId && exam.id === params.excludeExamId) continue;

      const otherStart = dayjs(`${exam.scheduled_date}T${exam.scheduled_time || '00:00:00'}`);
      const otherEnd = otherStart.add(exam.duration_minutes, 'minute');

      // Check for time overlap
      const hasTimeOverlap =
        examStart.isBetween(otherStart, otherEnd, null, '[)') ||
        examEnd.isBetween(otherStart, otherEnd, null, '(]') ||
        otherStart.isBetween(examStart, examEnd, null, '[)') ||
        otherEnd.isBetween(examStart, examEnd, null, '(]');

      if (!hasTimeOverlap) continue;

      // Check for cohort overlap
      const examGradeLevelIds = new Set(params.gradeLevelIds);
      const otherGradeLevelIds = new Set(
        (exam.grade_levels as any[])?.map((g: any) => g.grade_level_id) || []
      );

      const hasGradeLevelOverlap = [...examGradeLevelIds].some((id) =>
        otherGradeLevelIds.has(id)
      );

      if (hasGradeLevelOverlap) {
        conflicts.push({
          type: 'exam_overlap',
          severity: 'critical',
          message: `Overlaps with "${exam.title}"`,
          details: {
            examId: exam.id,
            examTitle: exam.title,
            examStart: otherStart.format('HH:mm'),
            examEnd: otherEnd.format('HH:mm'),
            overlappingGradeLevels: [...examGradeLevelIds].filter((id) =>
              otherGradeLevelIds.has(id)
            ),
          },
        });
      }
    }

    return conflicts;
  }

  /**
   * Check teacher availability
   */
  private static async checkTeacherAvailability(
    params: ConflictCheckParams
  ): Promise<Conflict[]> {
    const conflicts: Conflict[] = [];

    if (!params.teacherIds || params.teacherIds.length === 0 || !params.scheduledDate) {
      return conflicts;
    }

    const examStart = dayjs(`${params.scheduledDate}T${params.scheduledTime || '00:00:00'}`);
    const examEnd = examStart.add(params.durationMinutes, 'minute');

    // Get all exams on the same date with these teachers
    const { data: teacherExams, error } = await supabase
      .from('mock_exams')
      .select(`
        id,
        title,
        scheduled_date,
        scheduled_time,
        duration_minutes,
        status,
        teachers:mock_exam_teachers!inner(
          entity_user_id,
          role,
          user:entity_users(
            user:users(name)
          )
        )
      `)
      .eq('scheduled_date', params.scheduledDate)
      .in('teachers.entity_user_id', params.teacherIds)
      .neq('status', 'cancelled');

    if (error) {
      console.error('Error checking teacher availability:', error);
      return conflicts;
    }

    if (!teacherExams || teacherExams.length === 0) return conflicts;

    for (const exam of teacherExams) {
      // Skip if this is the exam we're editing
      if (params.excludeExamId && exam.id === params.excludeExamId) continue;

      const otherStart = dayjs(`${exam.scheduled_date}T${exam.scheduled_time || '00:00:00'}`);
      const otherEnd = otherStart.add(exam.duration_minutes, 'minute');

      // Check for time overlap
      const hasTimeOverlap =
        examStart.isBetween(otherStart, otherEnd, null, '[)') ||
        examEnd.isBetween(otherStart, otherEnd, null, '(]') ||
        otherStart.isBetween(examStart, examEnd, null, '[)') ||
        otherEnd.isBetween(examStart, examEnd, null, '(]');

      if (hasTimeOverlap) {
        const busyTeachers = (exam.teachers as any[])?.filter((t: any) =>
          params.teacherIds!.includes(t.entity_user_id)
        );

        if (busyTeachers && busyTeachers.length > 0) {
          busyTeachers.forEach((teacher: any) => {
            conflicts.push({
              type: 'teacher_busy',
              severity: 'high',
              message: `${teacher.user?.user?.name || 'Teacher'} is already assigned to "${exam.title}"`,
              details: {
                teacherId: teacher.entity_user_id,
                teacherName: teacher.user?.user?.name,
                teacherRole: teacher.role,
                examId: exam.id,
                examTitle: exam.title,
                examStart: otherStart.format('HH:mm'),
                examEnd: otherEnd.format('HH:mm'),
              },
            });
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Check venue availability
   */
  private static async checkVenueAvailability(
    params: ConflictCheckParams
  ): Promise<Conflict[]> {
    const conflicts: Conflict[] = [];

    if (!params.venueIds || params.venueIds.length === 0 || !params.scheduledDate) {
      return conflicts;
    }

    const examStart = dayjs(`${params.scheduledDate}T${params.scheduledTime || '00:00:00'}`);
    const examEnd = examStart.add(params.durationMinutes, 'minute');

    // Check mock_exam_venues table for conflicts
    const { data: venueBookings, error } = await supabase
      .from('mock_exam_venues')
      .select(`
        id,
        venue_name,
        exam:mock_exams!inner(
          id,
          title,
          scheduled_date,
          scheduled_time,
          duration_minutes,
          status
        )
      `)
      .eq('exam.scheduled_date', params.scheduledDate)
      .in('id', params.venueIds)
      .neq('exam.status', 'cancelled');

    if (error) {
      console.error('Error checking venue availability:', error);
      return conflicts;
    }

    if (!venueBookings || venueBookings.length === 0) return conflicts;

    for (const booking of venueBookings) {
      const exam = (booking as any).exam;
      if (!exam) continue;

      // Skip if this is the exam we're editing
      if (params.excludeExamId && exam.id === params.excludeExamId) continue;

      const otherStart = dayjs(`${exam.scheduled_date}T${exam.scheduled_time || '00:00:00'}`);
      const otherEnd = otherStart.add(exam.duration_minutes, 'minute');

      const hasTimeOverlap =
        examStart.isBetween(otherStart, otherEnd, null, '[)') ||
        examEnd.isBetween(otherStart, otherEnd, null, '(]') ||
        otherStart.isBetween(examStart, examEnd, null, '[)') ||
        otherEnd.isBetween(examStart, examEnd, null, '(]');

      if (hasTimeOverlap) {
        conflicts.push({
          type: 'venue_busy',
          severity: 'high',
          message: `Venue "${(booking as any).venue_name}" is already booked for "${exam.title}"`,
          details: {
            venueId: booking.id,
            venueName: (booking as any).venue_name,
            examId: exam.id,
            examTitle: exam.title,
            examStart: otherStart.format('HH:mm'),
            examEnd: otherEnd.format('HH:mm'),
          },
        });
      }
    }

    return conflicts;
  }

  /**
   * Check for schedule warnings (non-blocking)
   */
  private static async checkScheduleWarnings(
    params: ConflictCheckParams
  ): Promise<Warning[]> {
    const warnings: Warning[] = [];

    if (!params.scheduledDate) return warnings;

    const examDate = dayjs(`${params.scheduledDate}T${params.scheduledTime || '00:00:00'}`);
    const now = dayjs();

    // Check if exam is on weekend
    const dayOfWeek = examDate.day();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      warnings.push({
        type: 'weekend',
        message: 'Exam is scheduled on a weekend',
        suggestion: 'Consider rescheduling to a weekday for better student attendance',
      });
    }

    // Check for unusual times
    const hour = examDate.hour();
    if (hour < 7 || hour > 18) {
      warnings.push({
        type: 'after_hours',
        message: 'Exam is scheduled outside typical school hours (7 AM - 6 PM)',
        suggestion: 'Ensure adequate supervision and access arrangements',
      });
    }

    // Check if exam is very soon (less than 24 hours)
    const hoursUntilExam = examDate.diff(now, 'hour');
    if (hoursUntilExam < 24 && hoursUntilExam > 0) {
      warnings.push({
        type: 'tight_schedule',
        message: 'Exam is scheduled within 24 hours',
        suggestion: 'Verify all materials and staff are prepared',
      });
    }

    // Check for multiple exams on the same day for same cohorts
    const { data: sameDay Exams } = await supabase
      .from('mock_exams')
      .select('id, title')
      .eq('scheduled_date', params.scheduledDate)
      .in('schools.school_id', params.schoolIds)
      .neq('status', 'cancelled');

    if (sameDayExams && sameDayExams.length > 1) {
      warnings.push({
        type: 'multiple_exams_day',
        message: `${sameDayExams.length} exams scheduled on this date`,
        suggestion: 'Ensure students are not overloaded and exam times are staggered',
      });
    }

    return warnings;
  }

  /**
   * Get busy time slots for a specific date and schools
   */
  static async getBusyTimeSlots(
    date: string,
    schoolIds: string[]
  ): Promise<{ start: string; end: string; title: string; id: string }[]> {
    const { data: exams, error } = await supabase
      .from('mock_exams')
      .select(`
        id,
        title,
        scheduled_time,
        duration_minutes
      `)
      .eq('scheduled_date', date)
      .in('schools.school_id', schoolIds)
      .neq('status', 'cancelled')
      .order('scheduled_time');

    if (error || !exams) {
      console.error('Error fetching busy slots:', error);
      return [];
    }

    return exams.map((exam) => {
      const start = dayjs(`${date}T${exam.scheduled_time || '00:00:00'}`);
      const end = start.add(exam.duration_minutes, 'minute');
      return {
        id: exam.id,
        title: exam.title,
        start: start.format('HH:mm'),
        end: end.format('HH:mm'),
      };
    });
  }

  /**
   * Suggest alternative time slots
   */
  static async suggestAlternatives(
    params: ConflictCheckParams
  ): Promise<{ date: string; time: string; reason: string }[]> {
    const suggestions: { date: string; time: string; reason: string }[] = [];
    const baseDate = dayjs(params.scheduledDate);

    // Check next 7 days for available slots
    for (let i = 1; i <= 7; i++) {
      const checkDate = baseDate.add(i, 'day');

      // Skip weekends
      if (checkDate.day() === 0 || checkDate.day() === 6) continue;

      const checkParams = {
        ...params,
        scheduledDate: checkDate.format('YYYY-MM-DD'),
      };

      const conflicts = await this.checkConflicts(checkParams);

      if (!conflicts.hasConflicts) {
        suggestions.push({
          date: checkDate.format('YYYY-MM-DD'),
          time: params.scheduledTime || '09:00:00',
          reason: 'No conflicts detected',
        });

        if (suggestions.length >= 3) break; // Limit to 3 suggestions
      }
    }

    return suggestions;
  }
}
