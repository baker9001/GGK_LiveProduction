import dayjs from 'dayjs';
import { supabase } from '@/lib/supabase';
import { LeaderboardPeriod, LeaderboardScope, LeaderboardSnapshot, LeaderboardRow } from '@/types/practice';

interface LeaderboardUpdateRequest {
  studentId: string;
  sessionId: string;
  marksEarned: number;
  marksAvailable: number;
  accuracy: number;
  xpAwarded: number;
  subjectId: string | null;
}

interface LeaderboardQueryParams {
  scope: LeaderboardScope;
  period: LeaderboardPeriod;
  subjectId?: string | null;
}

export async function updateLeaderboards(request: LeaderboardUpdateRequest): Promise<void> {
  const studentProfile = await fetchStudentProfile(request.studentId);
  const studentName = studentProfile?.name ?? 'Student';
  const avatarUrl = studentProfile?.avatarUrl ?? null;
  const streak = studentProfile?.currentStreak ?? 0;

  const scopes: LeaderboardScope[] = ['global'];
  if (studentProfile?.branchId) {
    scopes.push('school');
  }
  if (studentProfile?.classKey) {
    scopes.push('class');
  }

  const periods: LeaderboardPeriod[] = ['daily', 'weekly', 'monthly'];

  await Promise.all(
    scopes.flatMap((scope) =>
      periods.map(async (period) => {
        const { start, end } = resolvePeriodRange(period);
        let query = supabase
          .from('leaderboards_periodic')
          .select('id, rows')
          .eq('scope', scope)
          .eq('period', period)
          .eq('period_start', start)
          .limit(1);

        query = request.subjectId ? query.eq('subject_id', request.subjectId) : query.is('subject_id', null);

        const { data } = await query.maybeSingle();

        const existingRows: LeaderboardRow[] = (data?.rows as LeaderboardRow[]) ?? [];
        const updatedRows = upsertLeaderboardRow(existingRows, {
          studentId: request.studentId,
          studentName,
          avatarUrl,
          xp: request.xpAwarded,
          accuracy: request.accuracy,
          streak,
          medianTimeSec: estimateMedianTime(request.marksEarned, request.marksAvailable)
        });

        if (data?.id) {
          await supabase
            .from('leaderboards_periodic')
            .update({ rows: updatedRows })
            .eq('id', data.id);
        } else {
          await supabase
            .from('leaderboards_periodic')
            .insert({
              scope,
              period,
              period_start: start,
              period_end: end,
              subject_id: request.subjectId,
              rows: updatedRows
            });
        }
      })
    )
  );
}

export async function getLeaderboardSnapshot(params: LeaderboardQueryParams): Promise<LeaderboardSnapshot | null> {
  const { scope, period, subjectId } = params;
  const { start } = resolvePeriodRange(period);

  let query = supabase
    .from('leaderboards_periodic')
    .select('*')
    .eq('scope', scope)
    .eq('period', period)
    .eq('period_start', start)
    .limit(1);

  query = subjectId ? query.eq('subject_id', subjectId) : query.is('subject_id', null);

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(`Unable to load leaderboard snapshot: ${error.message}`);
  }

  return data as LeaderboardSnapshot | null;
}

async function fetchStudentProfile(studentId: string) {
  const { data } = await supabase
    .from('students')
    .select('id, branch_id, grade_level, section, user:users(name, avatar_url, raw_user_meta_data), game:student_gamification(current_streak_days)')
    .eq('id', studentId)
    .maybeSingle();

  if (!data) {
    return null;
  }

  const userMeta = (data.user?.raw_user_meta_data as { name?: string; avatar_url?: string | null } | null) ?? {};

  return {
    name: data.user?.name ?? userMeta.name ?? 'Student',
    avatarUrl: data.user?.avatar_url ?? userMeta.avatar_url ?? null,
    branchId: data.branch_id as string | null,
    classKey: data.grade_level && data.section ? `${data.grade_level}-${data.section}` : null,
    currentStreak: data.game?.current_streak_days ?? 0
  };
}

function resolvePeriodRange(period: LeaderboardPeriod): { start: string; end: string } {
  const now = dayjs();
  switch (period) {
    case 'daily':
      return { start: now.startOf('day').format('YYYY-MM-DD'), end: now.endOf('day').format('YYYY-MM-DD') };
    case 'weekly':
      return { start: now.startOf('week').format('YYYY-MM-DD'), end: now.endOf('week').format('YYYY-MM-DD') };
    case 'monthly':
      return { start: now.startOf('month').format('YYYY-MM-DD'), end: now.endOf('month').format('YYYY-MM-DD') };
    case 'seasonal':
    default:
      return { start: now.startOf('quarter').format('YYYY-MM-DD'), end: now.endOf('quarter').format('YYYY-MM-DD') };
  }
}

function upsertLeaderboardRow(existing: LeaderboardRow[], row: Omit<LeaderboardRow, 'rank'>): LeaderboardRow[] {
  const rows = existing.map((entry) => ({ ...entry }));
  const index = rows.findIndex((entry) => entry.studentId === row.studentId);
  if (index >= 0) {
    rows[index].xp += row.xp;
    rows[index].accuracy = (rows[index].accuracy + row.accuracy) / 2;
    rows[index].medianTimeSec = (rows[index].medianTimeSec + row.medianTimeSec) / 2;
    rows[index].streak = row.streak;
  } else {
    rows.push({ ...row, rank: rows.length + 1 });
  }

  rows.sort((a, b) => {
    if (b.xp === a.xp) {
      return b.accuracy - a.accuracy;
    }
    return b.xp - a.xp;
  });

  return rows.map((entry, position) => ({ ...entry, rank: position + 1 }));
}

function estimateMedianTime(marksEarned: number, marksAvailable: number): number {
  if (marksAvailable <= 0) {
    return 0;
  }
  const ratio = marksEarned / marksAvailable;
  return Math.max(10, Math.round(120 - ratio * 60));
}
