// /src/contexts/StudentContext.tsx

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useUser } from './UserContext';

interface StudentProfile {
  id: string;
  userId: string;
  studentCode: string;
  schoolId: string;
  branchId?: string;
  companyId: string;
  gradeLevel: string;
  enrolledPrograms: string[];
}

interface GameStats {
  level: number;
  xp: number;
  xpToNextLevel: number;
  coins: number;
  gems?: number;
  streak: number;
  longestStreak: number;
  rank: string;
  rankIcon: string;
  totalPoints: number;
  lastLoginDate: string;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: Date;
  progress: number;
  maxProgress: number;
  category: 'academic' | 'engagement' | 'social' | 'special';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  coinReward: number;
  completed: boolean;
  expiresAt: Date;
}

interface StudentContextType {
  // Profile
  profile: StudentProfile | null;
  setProfile: (profile: StudentProfile) => void;
  
  // Game Stats
  gameStats: GameStats;
  updateGameStats: (stats: Partial<GameStats>) => void;
  addXP: (amount: number) => Promise<void>;
  addCoins: (amount: number) => Promise<void>;
  
  // Achievements
  achievements: Achievement[];
  unlockedAchievements: Achievement[];
  checkAchievement: (achievementId: string) => Promise<void>;
  
  // Daily Challenges
  dailyChallenges: DailyChallenge[];
  completeDailyChallenge: (challengeId: string) => Promise<void>;
  
  // Streak Management
  updateStreak: () => Promise<void>;
  
  // Loading States
  loading: boolean;
  error: string | null;
}

const StudentContext = createContext<StudentContextType | undefined>(undefined);

// Rank calculation based on level
const getRankInfo = (level: number): { rank: string; rankIcon: string } => {
  if (level < 5) return { rank: 'Novice', rankIcon: '🌱' };
  if (level < 10) return { rank: 'Explorer', rankIcon: '🔍' };
  if (level < 20) return { rank: 'Scholar', rankIcon: '🎓' };
  if (level < 30) return { rank: 'Expert', rankIcon: '⭐' };
  if (level < 50) return { rank: 'Master', rankIcon: '🏆' };
  if (level < 75) return { rank: 'Champion', rankIcon: '👑' };
  if (level < 100) return { rank: 'Legend', rankIcon: '🔥' };
  return { rank: 'Mythic', rankIcon: '✨' };
};

// XP required for next level (exponential growth)
const calculateXPForLevel = (level: number): number => {
  return Math.floor(100 * Math.pow(1.5, level - 1));
};

export function StudentProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [gameStats, setGameStats] = useState<GameStats>({
    level: 1,
    xp: 0,
    xpToNextLevel: 100,
    coins: 0,
    gems: 0,
    streak: 0,
    longestStreak: 0,
    rank: 'Novice',
    rankIcon: '🌱',
    totalPoints: 0,
    lastLoginDate: new Date().toISOString()
  });
  
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [dailyChallenges, setDailyChallenges] = useState<DailyChallenge[]>([]);

  // Load student profile and stats
  useEffect(() => {
    if (user?.id) {
      loadStudentData();
    }
  }, [user]);

  const loadStudentData = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      // Load student profile
      const { data: studentProfile, error: profileError } = await supabase
        .from('students')
        .select(`
          *,
          schools(name, company_id),
          branches(name)
        `)
        .eq('user_id', user.id)
        .single();
      
      if (profileError) throw profileError;
      
      // Load game stats
      const { data: stats, error: statsError } = await supabase
        .from('student_game_stats')
        .select('*')
        .eq('student_id', studentProfile.id)
        .single();
      
      if (statsError && statsError.code !== 'PGRST116') throw statsError;
      
      // If no stats exist, create default stats
      if (!stats) {
        const defaultStats = {
          student_id: studentProfile.id,
          level: 1,
          xp: 0,
          coins: 100, // Starting bonus
          streak: 0,
          longest_streak: 0,
          total_points: 0,
          last_login: new Date().toISOString()
        };
        
        const { data: newStats } = await supabase
          .from('student_game_stats')
          .insert([defaultStats])
          .select()
          .single();
        
        if (newStats) {
          updateGameStatsFromDB(newStats);
        }
      } else {
        updateGameStatsFromDB(stats);
      }
      
      // Load achievements
      await loadAchievements(studentProfile.id);
      
      // Load daily challenges
      await loadDailyChallenges(studentProfile.id);
      
      // Update streak
      await updateStreak();
      
      setProfile(studentProfile);
    } catch (err: any) {
      console.error('Error loading student data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateGameStatsFromDB = (dbStats: any) => {
    const level = dbStats.level || 1;
    const rankInfo = getRankInfo(level);
    
    setGameStats({
      level,
      xp: dbStats.xp || 0,
      xpToNextLevel: calculateXPForLevel(level + 1),
      coins: dbStats.coins || 0,
      gems: dbStats.gems || 0,
      streak: dbStats.streak || 0,
      longestStreak: dbStats.longest_streak || 0,
      rank: rankInfo.rank,
      rankIcon: rankInfo.rankIcon,
      totalPoints: dbStats.total_points || 0,
      lastLoginDate: dbStats.last_login || new Date().toISOString()
    });
  };

  const updateGameStats = (updates: Partial<GameStats>) => {
    setGameStats(prev => ({ ...prev, ...updates }));
  };

  const addXP = async (amount: number) => {
    if (!profile?.id) return;
    
    const newXP = gameStats.xp + amount;
    const newTotalPoints = gameStats.totalPoints + amount;
    let newLevel = gameStats.level;
    let remainingXP = newXP;
    
    // Check for level up
    while (remainingXP >= gameStats.xpToNextLevel) {
      remainingXP -= gameStats.xpToNextLevel;
      newLevel++;
    }
    
    const rankInfo = getRankInfo(newLevel);
    
    // Update database
    await supabase
      .from('student_game_stats')
      .update({
        xp: remainingXP,
        level: newLevel,
        total_points: newTotalPoints
      })
      .eq('student_id', profile.id);
    
    // Update local state
    updateGameStats({
      xp: remainingXP,
      level: newLevel,
      xpToNextLevel: calculateXPForLevel(newLevel + 1),
      totalPoints: newTotalPoints,
      rank: rankInfo.rank,
      rankIcon: rankInfo.rankIcon
    });
    
    // Check for level-based achievements
    if (newLevel > gameStats.level) {
      await checkAchievement('level_up');
    }
  };

  const addCoins = async (amount: number) => {
    if (!profile?.id) return;
    
    const newCoins = gameStats.coins + amount;
    
    // Update database
    await supabase
      .from('student_game_stats')
      .update({ coins: newCoins })
      .eq('student_id', profile.id);
    
    // Update local state
    updateGameStats({ coins: newCoins });
  };

  const loadAchievements = async (studentId: string) => {
    // Load all achievements and student's unlocked achievements
    const { data: allAchievements } = await supabase
      .from('achievements')
      .select('*')
      .order('category', { ascending: true });
    
    const { data: unlockedData } = await supabase
      .from('student_achievements')
      .select('achievement_id, unlocked_at, progress')
      .eq('student_id', studentId);
    
    if (allAchievements) {
      const achievementsWithProgress = allAchievements.map(achievement => {
        const unlocked = unlockedData?.find(u => u.achievement_id === achievement.id);
        return {
          ...achievement,
          unlockedAt: unlocked?.unlocked_at,
          progress: unlocked?.progress || 0,
          maxProgress: achievement.max_progress || 1
        };
      });
      
      setAchievements(achievementsWithProgress);
    }
  };

  const checkAchievement = async (achievementId: string) => {
    // Implementation for checking and unlocking achievements
    // This would involve checking conditions and updating the database
  };

  const loadDailyChallenges = async (studentId: string) => {
    const today = new Date().toISOString().split('T')[0];
    
    const { data: challenges } = await supabase
      .from('daily_challenges')
      .select(`
        *,
        student_daily_challenges(completed)
      `)
      .eq('date', today)
      .eq('student_daily_challenges.student_id', studentId);
    
    if (challenges) {
      setDailyChallenges(challenges.map(c => ({
        id: c.id,
        title: c.title,
        description: c.description,
        xpReward: c.xp_reward,
        coinReward: c.coin_reward,
        completed: c.student_daily_challenges?.[0]?.completed || false,
        expiresAt: new Date(c.expires_at)
      })));
    }
  };

  const completeDailyChallenge = async (challengeId: string) => {
    if (!profile?.id) return;
    
    const challenge = dailyChallenges.find(c => c.id === challengeId);
    if (!challenge || challenge.completed) return;
    
    // Mark as completed in database
    await supabase
      .from('student_daily_challenges')
      .insert([{
        student_id: profile.id,
        challenge_id: challengeId,
        completed: true,
        completed_at: new Date().toISOString()
      }]);
    
    // Add rewards
    await addXP(challenge.xpReward);
    await addCoins(challenge.coinReward);
    
    // Update local state
    setDailyChallenges(prev => 
      prev.map(c => c.id === challengeId ? { ...c, completed: true } : c)
    );
  };

  const updateStreak = async () => {
    if (!profile?.id) return;
    
    const lastLogin = new Date(gameStats.lastLoginDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    lastLogin.setHours(0, 0, 0, 0);
    
    const daysSinceLastLogin = Math.floor((today.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24));
    
    let newStreak = gameStats.streak;
    
    if (daysSinceLastLogin === 1) {
      // Continue streak
      newStreak = gameStats.streak + 1;
    } else if (daysSinceLastLogin > 1) {
      // Break streak
      newStreak = 1;
    }
    // If daysSinceLastLogin === 0, user already logged in today, keep current streak
    
    const newLongestStreak = Math.max(newStreak, gameStats.longestStreak);
    
    if (daysSinceLastLogin >= 1) {
      await supabase
        .from('student_game_stats')
        .update({
          streak: newStreak,
          longest_streak: newLongestStreak,
          last_login: new Date().toISOString()
        })
        .eq('student_id', profile.id);
      
      updateGameStats({
        streak: newStreak,
        longestStreak: newLongestStreak,
        lastLoginDate: new Date().toISOString()
      });
    }
  };

  const unlockedAchievements = achievements.filter(a => a.unlockedAt);

  return (
    <StudentContext.Provider
      value={{
        profile,
        setProfile,
        gameStats,
        updateGameStats,
        addXP,
        addCoins,
        achievements,
        unlockedAchievements,
        checkAchievement,
        dailyChallenges,
        completeDailyChallenge,
        updateStreak,
        loading,
        error
      }}
    >
      {children}
    </StudentContext.Provider>
  );
}

export function useStudent() {
  const context = useContext(StudentContext);
  if (context === undefined) {
    throw new Error('useStudent must be used within a StudentProvider');
  }
  return context;
}