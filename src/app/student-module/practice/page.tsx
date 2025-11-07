import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';
import {
  PracticeSet,
  PracticeSetItem,
  PracticeSessionCreationResponse,
  PracticeAnswerResponse,
  PracticeReportOverview,
  SessionSummary,
  AnswerSubmissionPayload,
  GamificationProgress
} from '@/types/practice';
import {
  createSession,
  submitAnswer,
  finishSession,
  getReport,
  fetchQuestionWithMarkScheme
} from '@/services/practiceService';
import { getLeaderboardSnapshot } from '@/services/leaderboardService';
import { QuestionMasterAdmin } from '@/types/questions';
import { cn } from '@/lib/utils';
import { getDyslexiaPreference, setDyslexiaPreference } from '@/lib/accessibility';
import { BookOpen, Clock, Target, Trophy, Zap, Flame, ChevronRight, ChevronLeft, Brain, Award, Filter, Sparkles, BarChart3, ShieldCheck, HelpCircle, Accessibility, Highlighter } from 'lucide-react';
import dayjs from 'dayjs';
import { PracticeResultsAnalytics } from '@/components/practice/PracticeResultsAnalytics';

interface PracticeSetWithMeta extends PracticeSet {
  subject_name?: string | null;
  topic_name?: string | null;
  subtopic_name?: string | null;
  item_count?: number;
  xp_potential?: number;
  estimated_time?: number;
}

type PracticeSetRow = PracticeSet & {
  subject?: { name?: string | null } | null;
  topic?: { name?: string | null } | null;
  subtopic?: { name?: string | null } | null;
  practice_set_items?: { id: string }[] | null;
};

type ProgressRow = {
  subject_id: string | null;
  aggregates_json: {
    subjectName?: string;
    sessions?: number;
    accuracy?: number;
    xpTotal?: number;
    streak?: number;
  } | null;
};

interface PracticeProgressCard {
  subjectId: string | null;
  subjectName: string;
  sessions: number;
  accuracy: number;
  xpTotal: number;
  streak: number;
}

const HIGH_CONTRAST_CLASS = 'hc-mode';

async function loadPracticeSets(): Promise<PracticeSetWithMeta[]> {
  const { data, error } = await supabase
    .from('practice_sets')
    .select('*, subject:edu_subjects(name), topic:edu_topics(name), subtopic:edu_subtopics(name), practice_set_items(id)')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Unable to load practice sets: ${error.message}`);
  }

  const rows = ((data ?? []) as PracticeSetRow[]);
  return rows.map((row) => ({
    ...row,
    subject_name: row.subject?.name ?? null,
    topic_name: row.topic?.name ?? null,
    subtopic_name: row.subtopic?.name ?? null,
    item_count: row.practice_set_items?.length ?? 0,
    xp_potential: (row.practice_set_items?.length ?? 0) * 120,
    estimated_time: (row.practice_set_items?.length ?? 0) * 90
  }));
}

async function loadPracticeProgress(studentId: string | null): Promise<PracticeProgressCard[]> {
  if (!studentId) {
    return [];
  }

  const month = dayjs().startOf('month').format('YYYY-MM-DD');
  const { data, error } = await supabase
    .from('reports_cache_student')
    .select('subject_id, aggregates_json')
    .eq('student_id', studentId)
    .eq('month', month);

  if (error) {
    throw new Error(`Unable to load practice progress: ${error.message}`);
  }

  const rows = ((data ?? []) as ProgressRow[]);
  return rows.map((row) => ({
    subjectId: row.subject_id ?? null,
    subjectName: row.aggregates_json?.subjectName ?? 'Subject',
    sessions: row.aggregates_json?.sessions ?? 0,
    accuracy: row.aggregates_json?.accuracy ?? 0,
    xpTotal: row.aggregates_json?.xpTotal ?? 0,
    streak: row.aggregates_json?.streak ?? 0
  }));
}

async function loadActiveGamification(studentId: string | null): Promise<GamificationProgress | null> {
  if (!studentId) {
    return null;
  }
  const { data } = await supabase
    .from('student_gamification')
    .select('*')
    .eq('student_id', studentId)
    .maybeSingle();
  return (data as GamificationProgress | null) ?? null;
}

interface QuestionSessionState {
  sessionId: string;
  items: PracticeSetItem[];
  currentIndex: number;
  answers: Record<string, PracticeAnswerResponse>;
  startedAt: string;
  practiceSet: PracticeSetWithMeta | null;
}

const PracticePage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useUser();
  const studentId = user?.id ?? null;

  const [mode, setMode] = useState<'hub' | 'picker' | 'session' | 'results'>('hub');
  const [selectedSet, setSelectedSet] = useState<PracticeSetWithMeta | null>(null);
  const [sessionState, setSessionState] = useState<QuestionSessionState | null>(null);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  const [report, setReport] = useState<PracticeReportOverview | null>(null);
  const [assistOpen, setAssistOpen] = useState(true);
  const [highContrast, setHighContrast] = useState(false);
  const [dyslexiaFriendly, setDyslexiaFriendly] = useState(() => getDyslexiaPreference());

  const practiceSetsQuery = useQuery({
    queryKey: ['practice-sets'],
    queryFn: loadPracticeSets
  });
  const practiceProgressQuery = useQuery({
    queryKey: ['practice-progress', studentId],
    queryFn: () => loadPracticeProgress(studentId),
    enabled: !!studentId
  });
  const gamificationQuery = useQuery({
    queryKey: ['practice-gamification', studentId],
    queryFn: () => loadActiveGamification(studentId),
    enabled: !!studentId
  });

  const createSessionMutation = useMutation<PracticeSessionCreationResponse, Error, PracticeSetWithMeta>({
    mutationFn: async (practiceSet) => {
      try {
        const response = await createSession(practiceSet.id);
        return response;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to start practice session';
        throw new Error(errorMessage);
      }
    },
    onSuccess: (data, variables) => {
      setSessionState({
        sessionId: data.sessionId,
        items: data.itemsSnapshot,
        currentIndex: 0,
        answers: {},
        startedAt: dayjs().toISOString(),
        practiceSet: variables
      });
      setMode('session');
    },
    onError: (error) => {
      alert(`Unable to start practice: ${error.message}\n\nThis practice set may contain questions without correct answers. Please contact support.`);
      setMode('picker');
    }
  });

  const submitAnswerMutation = useMutation<PracticeAnswerResponse, Error, { payload: AnswerSubmissionPayload; item: PracticeSetItem }>(
    async ({ payload, item }) => submitAnswer({ sessionId: sessionState!.sessionId, itemId: item.id, rawAnswer: payload }),
    {
      onSuccess: (data, { item }) => {
        setSessionState((prev) => {
          if (!prev) {
            return prev;
          }
          return {
            ...prev,
            answers: {
              ...prev.answers,
              [item.id]: data
            }
          };
        });
      },
      onError: (error) => {
        console.error('Failed to submit answer:', error);
        alert(`Error submitting answer: ${error.message}`);
      }
    }
  );

  const finishSessionMutation = useMutation<SessionSummary, Error, void>(
    async () => finishSession(sessionState!.sessionId),
    {
      onSuccess: async (summary) => {
        setSessionSummary(summary);
        const overview = await getReport(summary.sessionId);
        setReport(overview);
        await queryClient.invalidateQueries({ queryKey: ['practice-progress', studentId] });
        await queryClient.invalidateQueries({ queryKey: ['practice-gamification', studentId] });
        setMode('results');
      }
    }
  );

  const leaderboardQuery = useQuery({
    queryKey: ['practice-leaderboard'],
    queryFn: () => getLeaderboardSnapshot({ scope: 'global', period: 'weekly', subjectId: null }),
    staleTime: 5 * 60 * 1000
  });

  const activeItem = useMemo(() => {
    if (!sessionState) {
      return null;
    }
    return sessionState.items[sessionState.currentIndex] ?? null;
  }, [sessionState]);

  const questionDetailQuery = useQuery({
    queryKey: ['practice-question', activeItem?.question_id],
    queryFn: () => (activeItem ? fetchQuestionWithMarkScheme(activeItem.question_id) : Promise.resolve(null)),
    enabled: !!activeItem?.question_id,
    retry: false,
    onError: (error) => {
      console.error('Failed to load question:', error);
    }
  });

  const questionDetails = questionDetailQuery.data ?? null;

  const handleCreateSession = (practiceSet: PracticeSetWithMeta) => {
    setSelectedSet(practiceSet);
    createSessionMutation.mutate(practiceSet);
  };

  const handleSubmitAnswer = async (payload: AnswerSubmissionPayload) => {
    if (!sessionState || !activeItem) {
      return;
    }
    await submitAnswerMutation.mutateAsync({ payload, item: activeItem });

    setSessionState((prev) => {
      if (!prev) {
        return prev;
      }
      const nextIndex = prev.currentIndex + 1;
      if (nextIndex >= prev.items.length) {
        finishSessionMutation.mutate();
        return prev;
      }
      return {
        ...prev,
        currentIndex: nextIndex
      };
    });
  };

  const handlePrev = useCallback(() => {
    setSessionState((prev) => {
      if (!prev) {
        return prev;
      }
      return {
        ...prev,
        currentIndex: Math.max(0, prev.currentIndex - 1)
      };
    });
  }, []);

  const handleNext = useCallback(() => {
    setSessionState((prev) => {
      if (!prev) {
        return prev;
      }
      return {
        ...prev,
        currentIndex: Math.min(prev.items.length - 1, prev.currentIndex + 1)
      };
    });
  }, []);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (mode !== 'session') {
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        handleNext();
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        handlePrev();
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [mode, handleNext, handlePrev]);

  useEffect(() => {
    if (highContrast) {
      document.body.classList.add(HIGH_CONTRAST_CLASS);
    } else {
      document.body.classList.remove(HIGH_CONTRAST_CLASS);
    }
  }, [highContrast]);

  useEffect(() => {
    setDyslexiaPreference(dyslexiaFriendly);
  }, [dyslexiaFriendly]);

  useEffect(() => {
    const handleDyslexiaChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ enabled: boolean }>;
      setDyslexiaFriendly(customEvent.detail.enabled);
    };

    window.addEventListener('dyslexia-support-change', handleDyslexiaChange);
    return () => window.removeEventListener('dyslexia-support-change', handleDyslexiaChange);
  }, []);

  const renderHub = () => (
    <div className="space-y-8">
      <header className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <Target className="w-8 h-8 text-blue-500" /> Practice Arena
        </h1>
        <p className="text-gray-600 dark:text-gray-400 max-w-3xl">
          Sharpen your skills with adaptive drills drawn from our curated question bank. Earn XP, climb the leaderboards, and unlock powerful study boosts.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className={cn('inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-500/30 text-blue-600 dark:text-blue-300 transition', highContrast && 'bg-blue-900 text-white')}
            onClick={() => setMode('picker')}
          >
            <Sparkles className="w-4 h-4" /> Start a Quick Drill
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 transition"
            onClick={() => setAssistOpen((value) => !value)}
          >
            <HelpCircle className="w-4 h-4" /> {assistOpen ? 'Hide Assist Panel' : 'Show Assist Panel'}
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {practiceProgressQuery.data?.map((card) => (
          <article key={card.subjectId ?? 'general'} className="bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <BookOpen className="w-6 h-6 text-indigo-500" />
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{card.subjectName}</h3>
                  <p className="text-xs text-gray-500">{card.sessions} sessions this month</p>
                </div>
              </div>
              <Trophy className="w-6 h-6 text-amber-400" />
            </div>
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-gray-500">Accuracy</dt>
                <dd className="font-semibold text-gray-900 dark:text-gray-100">{Math.round(card.accuracy * 100)}%</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-gray-500">XP Earned</dt>
                <dd className="font-semibold text-blue-600 dark:text-blue-400">{card.xpTotal}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-gray-500">Current Streak</dt>
                <dd className="font-semibold text-emerald-600 dark:text-emerald-400">{card.streak} days</dd>
              </div>
            </dl>
          </article>
        ))}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-500" /> Leaderboard Highlights
            </h2>
            <button
              type="button"
              onClick={() => setMode('picker')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              View Sets <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-2xl p-6">
            {leaderboardQuery.data?.rows?.length ? (
              <ul className="space-y-3">
                {leaderboardQuery.data.rows.slice(0, 5).map((row) => (
                  <li key={row.studentId} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-white flex items-center justify-center font-semibold">
                        {row.studentName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">{row.studentName}</p>
                        <p className="text-xs text-gray-500">XP {row.xp} · {Math.round(row.accuracy * 100)}% accuracy</p>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-amber-500">#{row.rank}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">Start a session to join the leaderboard!</p>
            )}
          </div>
        </div>
        <aside className="space-y-4">
          <div className="bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-2xl p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-500" /> Accessibility
            </h3>
            <div className="mt-4 space-y-3 text-sm">
              <button
                type="button"
                onClick={() => setHighContrast((prev) => !prev)}
                className="w-full inline-flex items-center justify-between px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <span className="flex items-center gap-2"><Highlighter className="w-4 h-4" /> High Contrast</span>
                <span className="text-xs font-medium text-gray-500">{highContrast ? 'On' : 'Off'}</span>
              </button>
              <button
                type="button"
                onClick={() => setDyslexiaFriendly((prev) => !prev)}
                className="w-full inline-flex items-center justify-between px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <span className="flex items-center gap-2"><Accessibility className="w-4 h-4" /> Dyslexia Support</span>
                <span className="text-xs font-medium text-gray-500">{dyslexiaFriendly ? 'On' : 'Off'}</span>
              </button>
            </div>
          </div>
          <div className={cn('bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 space-y-3', !assistOpen && 'opacity-60 pointer-events-none')}>
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Brain className="w-5 h-5 text-indigo-500" /> Assist Panel
            </h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <li>Hints cost 50 XP but refresh daily.</li>
              <li>Formula sheets unlocked at level 3.</li>
              <li>Use the periodic table tab for chemistry sets.</li>
            </ul>
          </div>
        </aside>
      </section>
    </div>
  );

  const filteredSets = useMemo(() => {
    if (!practiceSetsQuery.data) {
      return [];
    }
    return practiceSetsQuery.data;
  }, [practiceSetsQuery.data]);

  const renderPicker = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Filter className="w-5 h-5 text-blue-500" /> Choose a Practice Set
        </h2>
        <button
          type="button"
          onClick={() => setMode('hub')}
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          <ChevronLeft className="w-4 h-4" /> Back to hub
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredSets.map((practiceSet) => (
          <article key={practiceSet.id} className="bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm flex flex-col justify-between">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{practiceSet.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">{practiceSet.description ?? 'Adaptive practice set generated from question bank.'}</p>
              <dl className="grid grid-cols-2 gap-3 text-xs text-gray-500">
                <div>
                  <dt className="uppercase tracking-wide">Subject</dt>
                  <dd className="font-semibold text-gray-800 dark:text-gray-200">{practiceSet.subject_name ?? 'General'}</dd>
                </div>
                <div>
                  <dt className="uppercase tracking-wide">Questions</dt>
                  <dd className="font-semibold text-gray-800 dark:text-gray-200">{practiceSet.item_count ?? 0}</dd>
                </div>
                <div>
                  <dt className="uppercase tracking-wide">XP Potential</dt>
                  <dd className="font-semibold text-blue-600">{practiceSet.xp_potential ?? 0}</dd>
                </div>
                <div>
                  <dt className="uppercase tracking-wide">Est. Time</dt>
                  <dd className="font-semibold text-emerald-600">{Math.round((practiceSet.estimated_time ?? 0) / 60)} mins</dd>
                </div>
              </dl>
            </div>
            <button
              type="button"
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-semibold shadow hover:bg-blue-700 transition"
              onClick={() => handleCreateSession(practiceSet)}
              disabled={createSessionMutation.isPending}
            >
              {createSessionMutation.isPending && selectedSet?.id === practiceSet.id ? 'Starting…' : 'Start Practice'}
            </button>
          </article>
        ))}
      </div>
    </div>
  );

  const renderAnswerInput = () => {
    if (!questionDetails) {
      return null;
    }
    const answerFormat = questionDetails.answer_format ?? 'single_line';
    switch (answerFormat) {
      case 'single_word':
      case 'single_line':
        return (
          <SingleLineAnswer onSubmit={handleSubmitAnswer} disabled={submitAnswerMutation.isPending} />
        );
      case 'multi_line':
      case 'multi_line_labeled':
      case 'calculation':
        return (
          <MultiLineAnswer onSubmit={handleSubmitAnswer} disabled={submitAnswerMutation.isPending} />
        );
      case 'equation':
        return (
          <EquationAnswer onSubmit={handleSubmitAnswer} disabled={submitAnswerMutation.isPending} />
        );
      default:
        return (
          <MultiLineAnswer onSubmit={handleSubmitAnswer} disabled={submitAnswerMutation.isPending} />
        );
    }
  };

  const renderSession = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Clock className="w-6 h-6 text-emerald-500" /> Session in Progress
          </h2>
          <p className="text-sm text-gray-500">
            Question {sessionState ? sessionState.currentIndex + 1 : 0} of {sessionState?.items.length ?? 0}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm" onClick={handlePrev} disabled={!sessionState || sessionState.currentIndex === 0}>
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>
          <button type="button" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm" onClick={handleNext} disabled={!sessionState || sessionState.currentIndex === (sessionState.items.length - 1)}>
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
        <div className="bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 space-y-4">
          {questionDetails ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                  <Award className="w-4 h-4" /> {questionDetails.answer_format ?? 'Response'}
                </span>
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                  Marks {questionDetails.marks}
                </span>
              </div>
              <div className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap leading-relaxed">
                {questionDetails.question_description}
              </div>
              {questionDetails.explanation && (
                <details className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-4 text-sm text-gray-600 dark:text-gray-300">
                  <summary className="cursor-pointer font-medium text-gray-700 dark:text-gray-200">Command Guidance</summary>
                  <p className="mt-2">{questionDetails.explanation}</p>
                </details>
              )}
              {renderAnswerInput()}
            </div>
          ) : questionDetailQuery.isError ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md">
                <div className="text-red-600 dark:text-red-400 font-semibold mb-2">Unable to Load Question</div>
                <p className="text-sm text-red-700 dark:text-red-300">
                  This question cannot be loaded. It may be missing required data such as correct answers.
                </p>
                <button
                  type="button"
                  className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
                  onClick={() => {
                    setMode('hub');
                    setSessionState(null);
                  }}
                >
                  Return to Hub
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500">
              <Clock className="w-10 h-10 mb-3" />
              Loading question…
            </div>
          )}
        </div>
        <aside className={cn('space-y-4', !assistOpen && 'opacity-50 pointer-events-none')}>
          <AssistCard question={questionDetails} gamification={gamificationQuery.data} />
        </aside>
      </div>
    </div>
  );

  const renderResults = () => {
    if (!sessionSummary) {
      return null;
    }

    return (
      <PracticeResultsAnalytics
        sessionId={sessionSummary.sessionId}
        onClose={() => {
          setMode('hub');
          setSessionState(null);
          setSessionSummary(null);
          setReport(null);
        }}
      />
    );
  };

  return (
    <div className="p-6 space-y-6">
      {mode === 'hub' && renderHub()}
      {mode === 'picker' && renderPicker()}
      {mode === 'session' && renderSession()}
      {mode === 'results' && renderResults()}
    </div>
  );
};

interface AnswerComponentProps {
  onSubmit: (payload: AnswerSubmissionPayload) => void;
  disabled?: boolean;
}

const SingleLineAnswer: React.FC<AnswerComponentProps> = ({ onSubmit, disabled }) => {
  const [value, setValue] = useState('');
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ value });
        setValue('');
      }}
      className="space-y-3"
    >
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Type your answer"
        disabled={disabled}
      />
      <button
        type="submit"
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-semibold shadow hover:bg-blue-700 transition disabled:opacity-60"
        disabled={disabled}
      >
        Submit Answer
      </button>
    </form>
  );
};

const MultiLineAnswer: React.FC<AnswerComponentProps> = ({ onSubmit, disabled }) => {
  const [value, setValue] = useState('');
  const [working, setWorking] = useState('');
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ value, working });
        setValue('');
        setWorking('');
      }}
      className="space-y-3"
    >
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        rows={4}
        className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Enter your response"
        disabled={disabled}
      />
      <textarea
        value={working}
        onChange={(event) => setWorking(event.target.value)}
        rows={3}
        className="w-full rounded-lg border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 px-3 py-2 text-sm"
        placeholder="Optional: show your working or reasoning"
        disabled={disabled}
      />
      <button
        type="submit"
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-semibold shadow hover:bg-blue-700 transition disabled:opacity-60"
        disabled={disabled}
      >
        Submit Answer
      </button>
    </form>
  );
};

const EquationAnswer: React.FC<AnswerComponentProps> = ({ onSubmit, disabled }) => {
  const [value, setValue] = useState('');
  const [units, setUnits] = useState('');
  const [working, setWorking] = useState('');
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ value, working, units });
        setValue('');
        setWorking('');
        setUnits('');
      }}
      className="space-y-3"
    >
      <textarea
        value={working}
        onChange={(event) => setWorking(event.target.value)}
        rows={3}
        className="w-full rounded-lg border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 px-3 py-2 text-sm"
        placeholder="Working / derivation"
        disabled={disabled}
      />
      <div className="flex flex-col md:flex-row gap-3">
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 px-3 py-2"
          placeholder="Final value"
          disabled={disabled}
        />
        <input
          value={units}
          onChange={(event) => setUnits(event.target.value)}
          className="md:w-32 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 px-3 py-2"
          placeholder="Units"
          disabled={disabled}
        />
      </div>
      <button
        type="submit"
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-semibold shadow hover:bg-blue-700 transition disabled:opacity-60"
        disabled={disabled}
      >
        Submit Answer
      </button>
    </form>
  );
};

interface AssistCardProps {
  question: QuestionMasterAdmin | null;
  gamification: GamificationProgress | null;
}

const AssistCard: React.FC<AssistCardProps> = ({ question, gamification }) => (
  <div className="bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 space-y-4">
    <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">Assist</h3>
    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-3">
      <p>Hints available: {Math.max(0, 3 - (gamification?.hints_used ?? 0))}</p>
      {question?.hint && (
        <details className="border border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-3">
          <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-200">Show hint (-50 XP)</summary>
          <p className="mt-2 text-gray-600 dark:text-gray-300 text-sm">{question.hint}</p>
        </details>
      )}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
          <p className="font-semibold text-gray-700 dark:text-gray-200">Formula Sheet</p>
          <p className="text-gray-500">Unlocked at level 3</p>
        </div>
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
          <p className="font-semibold text-gray-700 dark:text-gray-200">Power-Ups</p>
          <p className="text-gray-500">50/50 and Reveal Unit at level 5</p>
        </div>
      </div>
    </div>
  </div>
);

interface StatLineProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

const StatLine: React.FC<StatLineProps> = ({ icon, label, value }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3 text-gray-500">
      {icon}
      <span className="text-sm">{label}</span>
    </div>
    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{value}</span>
  </div>
);

export default PracticePage;
