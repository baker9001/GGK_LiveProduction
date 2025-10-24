import { QuestionMasterAdmin } from './questions';

export type PracticeSessionStatus = 'in_progress' | 'completed' | 'abandoned';
export type LeaderboardScope = 'class' | 'school' | 'global';
export type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly' | 'seasonal';

export interface PracticeSet {
  id: string;
  title: string;
  description: string | null;
  subject_id: string | null;
  topic_id: string | null;
  subtopic_id: string | null;
  difficulty_range: [number, number] | null;
  source: string | null;
  created_by: string | null;
  created_at: string;
}

export interface PracticeSetItem {
  id: string;
  practice_set_id: string;
  question_id: string;
  weight: number;
  time_limit_sec: number | null;
  order_index: number;
  question?: QuestionMasterAdmin;
}

export interface PracticeSession {
  id: string;
  student_id: string;
  practice_set_id: string;
  started_at: string;
  ended_at: string | null;
  status: PracticeSessionStatus;
  total_marks_available: number;
  total_marks_earned: number;
  xp_earned: number;
  streak_delta: number;
  board: string | null;
  difficulty_mix: Record<string, unknown> | null;
  created_at: string;
  practice_set?: PracticeSet;
  items?: PracticeSetItem[];
}

export interface PracticeAnswer {
  id: string;
  session_id: string;
  item_id: string;
  question_id: string;
  raw_answer_json: Record<string, unknown>;
  auto_mark_json: AutoMarkResult | null;
  is_correct: boolean | null;
  marks_earned: number;
  submitted_at: string;
}

export interface PracticeSessionEvent {
  id: string;
  session_id: string;
  item_id: string | null;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface GamificationProgress {
  student_id: string;
  xp_total: number;
  level: number;
  longest_streak_days: number;
  current_streak_days: number;
  badges: GamificationBadge[];
  last_active_at: string | null;
}

export interface GamificationBadge {
  id: string;
  name: string;
  description: string;
  earned_at: string;
  icon?: string;
}

export interface LeaderboardRow {
  studentId: string;
  studentName: string;
  avatarUrl?: string | null;
  xp: number;
  accuracy: number;
  medianTimeSec: number;
  rank: number;
  streak: number;
}

export interface LeaderboardSnapshot {
  id: string;
  scope: LeaderboardScope;
  period: LeaderboardPeriod;
  period_start: string;
  period_end: string;
  subject_id: string | null;
  rows: LeaderboardRow[];
  created_at: string;
}

export interface PracticeReportOverview {
  session: PracticeSession;
  totals: {
    marksEarned: number;
    marksAvailable: number;
    accuracy: number;
    xpEarned: number;
    streakDelta: number;
  };
  taxonomyBreakdown: TaxonomyBreakdown[];
  recommendations: RecommendationItem[];
  answers: PracticeAnswerReview[];
}

export interface TaxonomyBreakdown {
  subjectId: string | null;
  topicId: string | null;
  subtopicId: string | null;
  accuracy: number;
  avgTimeSeconds: number;
  attempts: number;
  marksEarned: number;
  marksAvailable: number;
}

export interface RecommendationItem {
  id: string;
  title: string;
  description: string;
  actionLabel: string;
  actionUrl?: string;
}

export interface PracticeAnswerReview {
  item: PracticeSetItem;
  answer: PracticeAnswer;
  marking: AutoMarkResult | null;
  acceptedAlternatives: string[];
  explanation?: string | null;
}

export interface AutoMarkPointAward {
  pointId: string;
  marks: number;
  notes?: string;
}

export interface AutoMarkPointDenied {
  pointId: string;
  reason: string;
  expected?: string;
}

export interface AutoMarkResult {
  awarded: AutoMarkPointAward[];
  denied: AutoMarkPointDenied[];
  ecf: boolean;
  notes: string[];
  explanationId?: string;
  totalAwarded: number;
  totalAvailable: number;
}

export interface AnswerSubmissionPayload {
  value: string | string[] | number | Record<string, unknown>;
  working?: string;
  units?: string;
  attachments?: string[];
}

export interface PracticeAnswerRequest {
  sessionId: string;
  itemId: string;
  rawAnswer: AnswerSubmissionPayload;
}

export interface PracticeAnswerResponse {
  marksEarned: number;
  isCorrect: boolean;
  autoMarkJson: AutoMarkResult;
}

export interface SessionSummary {
  sessionId: string;
  totals: PracticeReportOverview['totals'];
  xp: GamificationProgress;
  badges: GamificationBadge[];
  leaderboard?: LeaderboardSnapshot | null;
}

export interface PracticeSessionCreationResponse {
  sessionId: string;
  itemsSnapshot: PracticeSetItem[];
}
