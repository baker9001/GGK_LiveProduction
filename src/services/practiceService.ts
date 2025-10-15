import dayjs from 'dayjs';
import { supabase } from '@/lib/supabase';
import { PracticeSet, PracticeSetItem, PracticeAnswer, PracticeSessionCreationResponse, PracticeAnswerRequest, PracticeAnswerResponse, PracticeReportOverview, PracticeAnswerReview, TaxonomyBreakdown, RecommendationItem, SessionSummary } from '@/types/practice';
import { QuestionMasterAdmin } from '@/types/questions';
import { autoMarkQuestion, detectBoard, detectSubjectArea, RawCorrectAnswerRow, RawAnswerComponentRow, RawQuestionOptionRow, calculateSpeedBonus } from './practice/autoMarkingEngine';
import { applyGamificationRewards } from './gamificationService';
import { updateLeaderboards } from './leaderboardService';
import { AnswerSubmissionPayload, AutoMarkResult } from '@/types/practice';
import { v4 as uuidv4 } from 'uuid';

interface QuestionWithMarkScheme extends QuestionMasterAdmin {
  paper_code?: string | null;
  subject?: { name: string } | null;
  correct_answers: RawCorrectAnswerRow[];
  answer_components: RawAnswerComponentRow[];
  options: RawQuestionOptionRow[];
}

async function getCurrentStudentId(): Promise<string> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error('Unable to resolve authenticated user for practice session');
  }

  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (studentError || !student) {
    throw new Error('Student profile not found for current user');
  }

  return student.id;
}

async function fetchPracticeSet(practiceSetId: string): Promise<PracticeSet> {
  const { data, error } = await supabase
    .from('practice_sets')
    .select('*')
    .eq('id', practiceSetId)
    .maybeSingle();

  if (error || !data) {
    throw new Error('Practice set not found');
  }

  return data as PracticeSet;
}

async function fetchPracticeItems(practiceSetId: string): Promise<PracticeSetItem[]> {
  const { data, error } = await supabase
    .from('practice_set_items')
    .select('*, question:questions_master_admin(*, paper:papers_setup(paper_code), subject:edu_subjects(name))')
    .eq('practice_set_id', practiceSetId)
    .eq('question.status', 'active')
    .order('order_index', { ascending: true });

  if (error) {
    throw new Error(`Unable to load practice items: ${error.message}`);
  }

  const questionIds = (data ?? []).map((row) => row.question_id).filter(Boolean);

  const { data: answersData } = await supabase
    .from('question_correct_answers')
    .select('question_id')
    .in('question_id', questionIds);

  const questionsWithAnswers = new Set(
    (answersData ?? []).map((row) => row.question_id)
  );

  const items: PracticeSetItem[] = (data ?? [])
    .map((row) => {
      const typedRow = row as PracticeSetItem & { question?: QuestionMasterAdmin };

      if (typedRow.question && typedRow.question.status !== 'active') {
        return null;
      }

      if (!questionsWithAnswers.has(typedRow.question_id)) {
        console.warn(`Question ${typedRow.question_id} has no correct answers and will be skipped from practice set`);
        return null;
      }

      return {
        id: typedRow.id,
        practice_set_id: typedRow.practice_set_id,
        question_id: typedRow.question_id,
        weight: typedRow.weight,
        time_limit_sec: typedRow.time_limit_sec,
        order_index: typedRow.order_index,
        question: typedRow.question
      } as PracticeSetItem;
    })
    .filter((item): item is PracticeSetItem => item !== null);

  if (items.length === 0) {
    throw new Error('No valid questions found in this practice set. All questions may be missing correct answers.');
  }

  return items;
}

export async function createSession(practiceSetId: string): Promise<PracticeSessionCreationResponse> {
  const [studentId, practiceSet, items] = await Promise.all([
    getCurrentStudentId(),
    fetchPracticeSet(practiceSetId),
    fetchPracticeItems(practiceSetId)
  ]);

  const totalMarks = items.reduce((sum, item) => sum + (item.question?.marks ?? 0) * item.weight, 0);
  const difficultyMix = items.reduce<Record<string, number>>((acc, item) => {
    const difficulty = item.question?.difficulty ?? 'Unknown';
    acc[difficulty] = (acc[difficulty] ?? 0) + 1;
    return acc;
  }, {});

  const { data, error } = await supabase
    .from('practice_sessions')
    .insert({
      student_id: studentId,
      practice_set_id: practiceSet.id,
      total_marks_available: totalMarks,
      difficulty_mix: difficultyMix
    })
    .select('*')
    .maybeSingle();

  if (error || !data) {
    throw new Error(`Failed to create practice session: ${error?.message ?? 'Unknown error'}`);
  }

  return {
    sessionId: data.id,
    itemsSnapshot: items
  };
}

export async function fetchQuestionWithMarkScheme(questionId: string): Promise<QuestionWithMarkScheme> {
  const { data, error } = await supabase
    .from('questions_master_admin')
    .select(`*, paper:papers_setup(paper_code), subject:edu_subjects(name), correct_answers:question_correct_answers(*), answer_components:answer_components(*), options:question_options(*)`)
    .eq('id', questionId)
    .eq('status', 'active')
    .maybeSingle();

  if (error || !data) {
    throw new Error('Unable to fetch question metadata for auto-marking');
  }

  const questionWithDefaults: QuestionWithMarkScheme = {
    ...data,
    correct_answers: data.correct_answers ?? [],
    answer_components: data.answer_components ?? [],
    options: data.options ?? []
  } as QuestionWithMarkScheme;

  if (questionWithDefaults.correct_answers.length === 0 && questionWithDefaults.answer_components.length === 0) {
    throw new Error(`Question ${questionId} has no correct answers defined. This question cannot be used for practice.`);
  }

  return questionWithDefaults;
}

async function upsertPracticeAnswer(
  sessionId: string,
  itemId: string,
  questionId: string,
  rawPayload: AnswerSubmissionPayload,
  autoMarkResult: AutoMarkResult,
  marksAwarded: number,
  isCorrect: boolean
): Promise<void> {
  const { data: existing, error: fetchError } = await supabase
    .from('practice_answers')
    .select('id')
    .eq('session_id', sessionId)
    .eq('item_id', itemId)
    .maybeSingle();

  if (fetchError) {
    throw new Error(`Unable to load existing answer: ${fetchError.message}`);
  }

  if (existing) {
    const { error: updateError } = await supabase
      .from('practice_answers')
      .update({
        raw_answer_json: rawPayload,
        auto_mark_json: autoMarkResult,
        marks_earned: marksAwarded,
        is_correct: isCorrect,
        submitted_at: dayjs().toISOString()
      })
      .eq('id', existing.id);

    if (updateError) {
      throw new Error(`Failed to update practice answer: ${updateError.message}`);
    }
  } else {
    const { error: insertError } = await supabase
      .from('practice_answers')
      .insert({
        session_id: sessionId,
        item_id: itemId,
        question_id: questionId,
        raw_answer_json: rawPayload,
        auto_mark_json: autoMarkResult,
        marks_earned: marksAwarded,
        is_correct: isCorrect
      });

    if (insertError) {
      throw new Error(`Failed to save practice answer: ${insertError.message}`);
    }
  }
}

async function recordSessionEvent(
  sessionId: string,
  itemId: string | null,
  eventType: string,
  payload: Record<string, unknown>
): Promise<void> {
  await supabase
    .from('practice_session_events')
    .insert({
      session_id: sessionId,
      item_id: itemId,
      event_type: eventType,
      payload
    });
}

export async function submitAnswer(request: PracticeAnswerRequest): Promise<PracticeAnswerResponse> {
  const { sessionId, itemId, rawAnswer } = request;

  const { data: item, error: itemError } = await supabase
    .from('practice_set_items')
    .select('*, session:practice_sessions(student_id, started_at), question:questions_master_admin(id, marks, paper_id, subject_id, difficulty, paper:papers_setup(paper_code), subject:edu_subjects(name))')
    .eq('id', itemId)
    .eq('question.status', 'active')
    .maybeSingle();

  if (itemError || !item) {
    throw new Error('Practice set item not found for submission');
  }

  const question = await fetchQuestionWithMarkScheme(item.question_id);
  const board = detectBoard(question.paper?.paper_code ?? null);
  const subjectArea = detectSubjectArea(question.subject?.name ?? null);

  const autoMarkResult = autoMarkQuestion({
    question,
    correctAnswers: question.correct_answers,
    answerComponents: question.answer_components,
    options: question.options,
    rawAnswer,
    board,
    subjectArea
  });

  const marksAwarded = Math.min(autoMarkResult.totalAwarded, question.marks ?? autoMarkResult.totalAvailable);
  const isCorrect = marksAwarded >= (question.marks ?? autoMarkResult.totalAvailable);

  await upsertPracticeAnswer(sessionId, itemId, question.id, rawAnswer, autoMarkResult, marksAwarded, isCorrect);

  const sessionStart = item.session?.started_at ?? dayjs().toISOString();
  const speedBonus = calculateSpeedBonus(sessionStart, dayjs().toISOString(), item.time_limit_sec ?? 90);

  await recordSessionEvent(sessionId, itemId, 'answer_submitted', {
    marksAwarded,
    isCorrect,
    speedBonus,
    autoMark: autoMarkResult
  });

  return {
    marksEarned: marksAwarded,
    isCorrect,
    autoMarkJson: autoMarkResult
  };
}

export async function finishSession(sessionId: string): Promise<SessionSummary> {
  const { data: session, error } = await supabase
    .from('practice_sessions')
    .select(
      '*, practice_set:practice_sets(*), answers:practice_answers(*), items:practice_set_items(*, question:questions_master_admin(*))'
    )
    .eq('id', sessionId)
    .maybeSingle();

  if (error || !session) {
    throw new Error('Unable to load practice session for completion');
  }

  const answers: PracticeAnswer[] = session.answers ?? [];
  const totalEarned = answers.reduce((sum, answer) => sum + (answer.marks_earned ?? 0), 0);
  const totalAvailable = session.total_marks_available || answers.reduce((sum, answer) => sum + (answer.auto_mark_json?.totalAvailable ?? 0), 0);
  const accuracy = totalAvailable > 0 ? totalEarned / totalAvailable : 0;

  const completionPayload = await applyGamificationRewards({
    sessionId,
    studentId: session.student_id,
    practiceSetId: session.practice_set_id,
    marksEarned: totalEarned,
    marksAvailable: totalAvailable,
    accuracy
  });

  await supabase
    .from('practice_sessions')
    .update({
      status: 'completed',
      ended_at: dayjs().toISOString(),
      total_marks_earned: totalEarned,
      xp_earned: completionPayload.xpAwarded,
      streak_delta: completionPayload.streakDelta
    })
    .eq('id', sessionId);

  await updateLeaderboards({
    studentId: session.student_id,
    sessionId,
    marksEarned: totalEarned,
    marksAvailable: totalAvailable,
    accuracy,
    xpAwarded: completionPayload.xpAwarded,
    subjectId: session.practice_set?.subject_id ?? null
  });

  await updateReportsCache(session.student_id, session.practice_set?.subject_id ?? null, session.practice_set?.topic_id ?? null, totalEarned, totalAvailable);

  await recordSessionEvent(sessionId, null, 'session_completed', {
    marksEarned: totalEarned,
    marksAvailable: totalAvailable,
    xpAwarded: completionPayload.xpAwarded,
    streakDelta: completionPayload.streakDelta
  });

  return {
    sessionId,
    totals: {
      marksEarned: totalEarned,
      marksAvailable: totalAvailable,
      accuracy,
      xpEarned: completionPayload.xpAwarded,
      streakDelta: completionPayload.streakDelta
    },
    xp: completionPayload.progress,
    badges: completionPayload.newBadges,
    leaderboard: completionPayload.leaderboardSnapshot ?? null
  };
}

export async function getReport(sessionId: string): Promise<PracticeReportOverview> {
  const { data: session, error } = await supabase
    .from('practice_sessions')
    .select(
      `*, practice_set:practice_sets(*), answers:practice_answers(*, item:practice_set_items(*, question:questions_master_admin(*, subject:edu_subjects(name)))), items:practice_set_items(*, question:questions_master_admin(*, subject:edu_subjects(name)))`
    )
    .eq('id', sessionId)
    .maybeSingle();

  if (error || !session) {
    throw new Error('Unable to load practice session report');
  }

  const answers: PracticeAnswer[] = session.answers ?? [];
  const items: PracticeSetItem[] = session.items ?? [];
  const totals = {
    marksEarned: session.total_marks_earned ?? answers.reduce((sum, answer) => sum + (answer.marks_earned ?? 0), 0),
    marksAvailable: session.total_marks_available ?? answers.reduce((sum, answer) => sum + (answer.auto_mark_json?.totalAvailable ?? 0), 0)
  };
  const accuracy = totals.marksAvailable > 0 ? totals.marksEarned / totals.marksAvailable : 0;

  const taxonomyBreakdown = buildTaxonomyBreakdown(answers, items);
  const recommendations = buildRecommendations(taxonomyBreakdown);
  const answerReviews = buildAnswerReviews(answers, items);

  return {
    session,
    totals: {
      marksEarned: totals.marksEarned,
      marksAvailable: totals.marksAvailable,
      accuracy,
      xpEarned: session.xp_earned ?? 0,
      streakDelta: session.streak_delta ?? 0
    },
    taxonomyBreakdown,
    recommendations,
    answers: answerReviews
  };
}

function buildTaxonomyBreakdown(answers: PracticeAnswer[], items: PracticeSetItem[]): TaxonomyBreakdown[] {
  const map = new Map<string, TaxonomyBreakdown>();

  answers.forEach((answer) => {
    const item = items.find((entry) => entry.id === answer.item_id);
    if (!item || !item.question) {
      return;
    }
    const key = [item.question.subject_id ?? 'none', item.question.topic_id ?? 'none', item.question.subtopic_id ?? 'none'].join('::');
    const aggregate = map.get(key) ?? {
      subjectId: item.question.subject_id ?? null,
      topicId: item.question.topic_id ?? null,
      subtopicId: item.question.subtopic_id ?? null,
      accuracy: 0,
      avgTimeSeconds: 0,
      attempts: 0,
      marksEarned: 0,
      marksAvailable: 0
    };

    aggregate.attempts += 1;
    aggregate.marksEarned += answer.marks_earned ?? 0;
    aggregate.marksAvailable += answer.auto_mark_json?.totalAvailable ?? item.question.marks ?? 0;
    aggregate.accuracy = aggregate.marksAvailable > 0 ? aggregate.marksEarned / aggregate.marksAvailable : 0;

    map.set(key, aggregate);
  });

  return Array.from(map.values());
}

function buildRecommendations(breakdown: TaxonomyBreakdown[]): RecommendationItem[] {
  return breakdown
    .filter((entry) => entry.accuracy < 0.7)
    .map((entry) => ({
      id: uuidv4(),
      title: 'Targeted practice recommended',
      description: `Focus on ${entry.subtopicId ?? entry.topicId ?? 'this topic'} to improve mastery.`,
      actionLabel: 'Start drill',
      actionUrl: `/app/student-module/practice?subject=${entry.subjectId ?? ''}&topic=${entry.topicId ?? ''}`
    }));
}

function buildAnswerReviews(answers: PracticeAnswer[], items: PracticeSetItem[]): PracticeAnswerReview[] {
  return answers
    .map((answer) => {
      const item = items.find((entry) => entry.id === answer.item_id);
      if (!item) {
        return null;
      }

      const acceptedAlternatives = (answer.auto_mark_json?.awarded ?? [])
        .map((award) => award.pointId);

      return {
        item,
        answer,
        marking: answer.auto_mark_json,
        acceptedAlternatives,
        explanation: item.question?.explanation ?? null
      } as PracticeAnswerReview;
    })
    .filter((entry): entry is PracticeAnswerReview => Boolean(entry));
}

async function updateReportsCache(
  studentId: string,
  subjectId: string | null,
  topicId: string | null,
  marksEarned: number,
  marksAvailable: number
): Promise<void> {
  const month = dayjs().startOf('month').format('YYYY-MM-DD');

  let existingQuery = supabase
    .from('reports_cache_student')
    .select('aggregates_json')
    .eq('student_id', studentId)
    .eq('month', month)
    .limit(1);

  existingQuery = subjectId ? existingQuery.eq('subject_id', subjectId) : existingQuery.is('subject_id', null);
  existingQuery = topicId ? existingQuery.eq('topic_id', topicId) : existingQuery.is('topic_id', null);

  const { data: existing } = await existingQuery.maybeSingle();

  const aggregate = existing?.aggregates_json ?? { sessions: 0, marksEarned: 0, marksAvailable: 0 };
  aggregate.sessions = (aggregate.sessions ?? 0) + 1;
  aggregate.marksEarned = (aggregate.marksEarned ?? 0) + marksEarned;
  aggregate.marksAvailable = (aggregate.marksAvailable ?? 0) + marksAvailable;
  aggregate.accuracy = aggregate.marksAvailable > 0 ? aggregate.marksEarned / aggregate.marksAvailable : 0;

  const { error } = await supabase
    .from('reports_cache_student')
    .upsert({
      student_id: studentId,
      subject_id: subjectId,
      topic_id: topicId,
      month,
      aggregates_json: aggregate
    });

  if (error) {
    throw new Error(`Failed to update reports cache: ${error.message}`);
  }
}
