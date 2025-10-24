import dayjs from 'dayjs';
import { supabase } from '@/lib/supabase';
import { GamificationProgress, GamificationBadge, LeaderboardSnapshot } from '@/types/practice';

interface GamificationRequest {
  sessionId: string;
  studentId: string;
  practiceSetId: string;
  marksEarned: number;
  marksAvailable: number;
  accuracy: number;
}

interface GamificationResult {
  xpAwarded: number;
  streakDelta: number;
  progress: GamificationProgress;
  newBadges: GamificationBadge[];
  leaderboardSnapshot?: LeaderboardSnapshot | null;
}

const BASE_XP_PER_MARK = 10;
const ACCURACY_BONUS_THRESHOLD = 0.8;
const STREAK_BREAK_THRESHOLD = 0.5;

export async function applyGamificationRewards(request: GamificationRequest): Promise<GamificationResult> {
  const { studentId, marksEarned, accuracy } = request;
  const { data: existing } = await supabase
    .from('student_gamification')
    .select('*')
    .eq('student_id', studentId)
    .maybeSingle();

  const current: GamificationProgress = existing ?? {
    student_id: studentId,
    xp_total: 0,
    level: 1,
    longest_streak_days: 0,
    current_streak_days: 0,
    badges: [],
    last_active_at: null
  };

  const baseXp = Math.round(marksEarned * BASE_XP_PER_MARK);
  const accuracyBonus = accuracy >= ACCURACY_BONUS_THRESHOLD ? Math.round(baseXp * 0.25) : 0;
  const perfectionBonus = accuracy >= 0.99 ? Math.round(baseXp * 0.5) : 0;

  const totalBonus = accuracyBonus + perfectionBonus;
  const xpAwarded = baseXp + totalBonus;

  const streakDelta = calculateStreakDelta(current, accuracy);
  const updatedStreak = Math.max(0, current.current_streak_days + streakDelta);
  const longestStreak = Math.max(current.longest_streak_days, updatedStreak);

  const updatedXpTotal = current.xp_total + xpAwarded;
  const updatedLevel = calculateLevel(updatedXpTotal);
  const lastActiveAt = dayjs().toISOString();

  const newProgress: GamificationProgress = {
    student_id: studentId,
    xp_total: updatedXpTotal,
    level: updatedLevel,
    longest_streak_days: longestStreak,
    current_streak_days: updatedStreak,
    badges: Array.isArray(current.badges) ? current.badges : [],
    last_active_at: lastActiveAt
  };

  const newBadges = determineBadges(newProgress, accuracy, marksEarned, xpAwarded);
  if (newBadges.length) {
    newProgress.badges = [...newProgress.badges, ...newBadges];
  }

  await supabase
    .from('student_gamification')
    .upsert({
      student_id: studentId,
      xp_total: newProgress.xp_total,
      level: newProgress.level,
      longest_streak_days: newProgress.longest_streak_days,
      current_streak_days: newProgress.current_streak_days,
      badges: newProgress.badges,
      last_active_at: newProgress.last_active_at
    });

  return {
    xpAwarded,
    streakDelta,
    progress: newProgress,
    newBadges,
    leaderboardSnapshot: null
  };
}

function calculateStreakDelta(progress: GamificationProgress, accuracy: number): number {
  if (!progress.last_active_at) {
    return accuracy >= STREAK_BREAK_THRESHOLD ? 1 : 0;
  }

  const lastActive = dayjs(progress.last_active_at);
  const today = dayjs();

  if (today.diff(lastActive, 'day') > 1) {
    return accuracy >= STREAK_BREAK_THRESHOLD ? 1 - progress.current_streak_days : -progress.current_streak_days;
  }

  if (accuracy >= STREAK_BREAK_THRESHOLD) {
    return 1;
  }

  return -progress.current_streak_days;
}

function calculateLevel(xpTotal: number): number {
  const levelThresholds = [0, 200, 500, 900, 1400, 2000, 2700, 3500, 4400, 5400];
  for (let level = levelThresholds.length - 1; level >= 0; level -= 1) {
    if (xpTotal >= levelThresholds[level]) {
      return level + 1;
    }
  }
  return 1;
}

function determineBadges(
  progress: GamificationProgress,
  accuracy: number,
  marksEarned: number,
  xpAwarded: number
): GamificationBadge[] {
  const badges: GamificationBadge[] = [];
  const timestamp = dayjs().toISOString();

  if (accuracy >= 0.95) {
    badges.push({
      id: `accuracy-master-${timestamp}`,
      name: 'Accuracy Master',
      description: 'Achieved over 95% accuracy in a session.',
      earned_at: timestamp,
      icon: 'target'
    });
  }

  if (progress.current_streak_days !== undefined && progress.current_streak_days % 5 === 0 && progress.current_streak_days > 0) {
    badges.push({
      id: `streak-${progress.current_streak_days}-${timestamp}`,
      name: `${progress.current_streak_days}-Day Streak`,
      description: `Maintained a ${progress.current_streak_days}-day streak.`,
      earned_at: timestamp,
      icon: 'flame'
    });
  }

  if (xpAwarded >= 1000) {
    badges.push({
      id: `xp-surge-${timestamp}`,
      name: 'XP Surge',
      description: 'Earned over 1000 XP in one session.',
      earned_at: timestamp,
      icon: 'zap'
    });
  }

  if (marksEarned === 0) {
    badges.push({
      id: `bounceback-${timestamp}`,
      name: 'Bounce Back',
      description: 'Opportunity to learn from a challenging session.',
      earned_at: timestamp,
      icon: 'refresh'
    });
  }

  return badges;
}
